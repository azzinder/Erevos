package expo.modules.erevosradio

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.wifi.WifiManager
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * Erevos phones and computers on the same Wi-Fi or a phone's hotspot, with no internet. The same
 * protocol as desktop/lan.js:
 *
 * - Each one says it is there every few seconds, by UDP broadcast on port 47905: `EVL1 <nonce>
 *   <port>`, a random nonce for each start and the TCP port it listens on (47905 when free).
 * - On hearing another, the one with the lower nonce connects, or either does when no link came
 *   after a few seconds. A link is a TCP connection carrying frames (see Framing). The first frame
 *   each way is `EVL1 <nonce>`, the one connecting first.
 * - Then each frame is UTF-8 text, or `EVL1` alone, sent every few seconds to say the link is still
 *   there. A link nothing came on for a while is closed. When two links come up to one, both keep
 *   the one the lower nonce opened.
 *
 * Android sends to a Wi-Fi with no internet only through that network, not the mobile data the
 * phone may use meanwhile, so each socket goes on the network whose addresses hold the other's.
 * Link ids start with `lan-`.
 */
class LanLink(
  private val context: Context,
  private val onLink: (linkId: String) -> Unit,
  private val onFrame: (linkId: String, payload: ByteArray) -> Unit,
  private val onLog: (text: String) -> Unit,
) {
  private class Link(
    val id: String,
    val nonce: String,
    val socket: Socket,
    val out: DataOutputStream,
    val mine: Boolean,
  ) {
    @Volatile var at = System.currentTimeMillis()
  }

  private class Heard(val first: Long) {
    @Volatile var at = first
  }

  private val connectivity: ConnectivityManager? = context.getSystemService(ConnectivityManager::class.java)
  private val links = ConcurrentHashMap<String, Link>()
  private val heard = ConcurrentHashMap<String, Heard>()
  private val dialing = ConcurrentHashMap.newKeySet<String>()
  private val counter = AtomicInteger(0)
  private val lock = Any()
  @Volatile private var running = false
  @Volatile private var nonce = ""
  // While Erevos is in the background, this phone says it is here less often (QUIET_EVERY_MS).
  @Volatile private var quiet = false
  @Volatile private var announcedAt = 0L
  private var io: ExecutorService? = null
  private var timer: ScheduledExecutorService? = null
  private var listener: DatagramSocket? = null
  private var server: ServerSocket? = null
  private var multicast: WifiManager.MulticastLock? = null

  fun start() {
    if (running) return
    running = true
    nonce = ByteArray(8).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
    // Many phones drop broadcasts on Wi-Fi to save power, unless an app holds this.
    multicast = (context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager)
      ?.createMulticastLock("erevos-lan")
      ?.apply {
        setReferenceCounted(false)
        acquire()
      }
    val pool = Executors.newCachedThreadPool().also { io = it }
    pool.execute {
      try {
        val socket = openServer()
        server = socket
        val udp = DatagramSocket(null).apply {
          reuseAddress = true
          broadcast = true
          bind(InetSocketAddress(PORT))
        }
        listener = udp
        pool.execute { acceptLoop(socket) }
        pool.execute { listenLoop(udp) }
        onLog("Same Wi-Fi: listening on port ${socket.localPort}")
      } catch (e: IOException) {
        onLog("Same Wi-Fi cannot start: ${e.message}")
      }
    }
    timer = Executors.newSingleThreadScheduledExecutor().also {
      it.scheduleWithFixedDelay({ runCatching { announceNow(); sweep() } }, 500, ANNOUNCE_EVERY_MS, TimeUnit.MILLISECONDS)
    }
  }

  /** This phone's nonce while it runs, as its broadcasts say it. */
  fun ownNonce(): String? = nonce.takeIf { running && it.isNotEmpty() }

  /** Whether a link to the phone whose nonce this is is up. */
  fun linkedTo(theirs: String): Boolean = linkTo(theirs) != null

  /** Says it is here less often, as when Erevos is in the background, or as before. Links stay up. */
  fun setQuiet(on: Boolean) {
    quiet = on
  }

  private fun announceNow() {
    val now = System.currentTimeMillis()
    if (quiet && now - announcedAt < QUIET_EVERY_MS) return
    announcedAt = now
    announce()
  }

  fun stop() {
    if (!running) return
    running = false
    timer?.shutdownNow()
    timer = null
    runCatching { listener?.close() }
    runCatching { server?.close() }
    listener = null
    server = null
    links.values.forEach { runCatching { it.socket.close() } }
    links.clear()
    heard.clear()
    dialing.clear()
    io?.shutdownNow()
    io = null
    runCatching { multicast?.release() }
    multicast = null
  }

  /** Sends one payload on a link. False if there is no such link. */
  fun send(linkId: String, payload: ByteArray): Boolean {
    val link = links[linkId] ?: return false
    if (payload.size > Framing.MAX_FRAME) return false
    io?.execute {
      try {
        synchronized(link) { Framing.write(link.out, payload) }
      } catch (e: IOException) {
        runCatching { link.socket.close() }
      }
    } ?: return false
    return true
  }

  private fun openServer(): ServerSocket =
    try {
      ServerSocket().apply {
        reuseAddress = true
        bind(InetSocketAddress(PORT))
      }
    } catch (e: IOException) {
      // Taken, as by another app: any free port will do, as it is said in the broadcast.
      ServerSocket(0)
    }

  private fun acceptLoop(socket: ServerSocket) {
    while (running) {
      val accepted = try {
        socket.accept()
      } catch (e: IOException) {
        return
      }
      if (links.size >= MAX_LINKS) {
        runCatching { accepted.close() }
        continue
      }
      io?.execute { greet(accepted, mine = false, expected = null) }
    }
  }

  private fun listenLoop(socket: DatagramSocket) {
    val buffer = ByteArray(128)
    while (running) {
      val packet = DatagramPacket(buffer, buffer.size)
      try {
        socket.receive(packet)
      } catch (e: IOException) {
        return
      }
      announced(String(packet.data, 0, packet.length, Charsets.ISO_8859_1), packet.address)
    }
  }

  private fun announce() {
    val port = server?.localPort ?: return
    if (!running || port <= 0) return
    val bytes = "EVL1 $nonce $port".toByteArray(Charsets.ISO_8859_1)
    for (target in broadcasts()) {
      try {
        DatagramSocket().use { socket ->
          socket.broadcast = true
          networkFor(target)?.bindSocket(socket)
          socket.send(DatagramPacket(bytes, bytes.size, target, PORT))
        }
      } catch (e: IOException) {
        // A network that is gone, or refuses broadcasts: the others still go.
      }
    }
  }

  /** Everywhere on each IPv4 network the phone is on: a Wi-Fi it joined, or its own hotspot. */
  private fun broadcasts(): List<InetAddress> {
    val out = LinkedHashSet<InetAddress>()
    val interfaces = runCatching { NetworkInterface.getNetworkInterfaces()?.toList() }.getOrNull() ?: emptyList()
    for (nif in interfaces) {
      if (runCatching { !nif.isUp || nif.isLoopback }.getOrDefault(true)) continue
      for (address in nif.interfaceAddresses) address.broadcast?.let { out.add(it) }
    }
    return out.toList()
  }

  /** The network (as Android has them) whose addresses hold `address`, or null to let the system choose. */
  @Suppress("DEPRECATION")
  private fun networkFor(address: InetAddress): Network? {
    val target = (address as? Inet4Address)?.address ?: return null
    val connectivity = connectivity ?: return null
    for (network in connectivity.allNetworks) {
      val properties = connectivity.getLinkProperties(network) ?: continue
      for (link in properties.linkAddresses) {
        val own = (link.address as? Inet4Address)?.address ?: continue
        if (samePrefix(own, target, link.prefixLength)) return network
      }
    }
    return null
  }

  private fun samePrefix(a: ByteArray, b: ByteArray, bits: Int): Boolean {
    for (i in 0 until 32) {
      if (i >= bits) return true
      val mask = 0x80 ushr (i % 8)
      if ((a[i / 8].toInt() and mask) != (b[i / 8].toInt() and mask)) return false
    }
    return true
  }

  private fun announced(text: String, address: InetAddress) {
    val match = ANNOUNCE.matchEntire(text) ?: return
    val theirs = match.groupValues[1]
    val port = match.groupValues[2].toIntOrNull() ?: return
    if (!running || theirs == nonce || port !in 1..65535) return
    val now = System.currentTimeMillis()
    val seen = heard.getOrPut(theirs) { Heard(now) }
    seen.at = now
    if (linkTo(theirs) != null || links.size >= MAX_LINKS) return
    if (nonce < theirs || now - seen.first > DIAL_ANYWAY_AFTER_MS) {
      if (dialing.add(theirs)) io?.execute { dial(theirs, address, port) }
    }
  }

  private fun dial(theirs: String, address: InetAddress, port: Int) {
    try {
      val factory = networkFor(address)?.socketFactory ?: javax.net.SocketFactory.getDefault()
      val socket = factory.createSocket()
      socket.connect(InetSocketAddress(address, port), HELLO_WITHIN_MS)
      greet(socket, mine = true, expected = theirs)
    } catch (e: IOException) {
      onLog("Same Wi-Fi: cannot connect to $address: ${e.message}")
    } finally {
      dialing.remove(theirs)
    }
  }

  // The one connecting says its nonce first; the one connected to answers with its own. Then the
  // link is up, and this thread reads its frames until it closes.
  private fun greet(socket: Socket, mine: Boolean, expected: String?) {
    var link: Link? = null
    try {
      socket.tcpNoDelay = true
      socket.soTimeout = HELLO_WITHIN_MS
      val out = DataOutputStream(socket.getOutputStream().buffered())
      val input = DataInputStream(socket.getInputStream().buffered())
      if (mine) Framing.write(out, "EVL1 $nonce".toByteArray(Charsets.ISO_8859_1))
      val hello = HELLO.matchEntire(String(Framing.read(input), Charsets.ISO_8859_1))
      val theirs = hello?.groupValues?.get(1)
      if (theirs == null || theirs == nonce || (expected != null && theirs != expected)) return
      if (!mine) Framing.write(out, "EVL1 $nonce".toByteArray(Charsets.ISO_8859_1))
      socket.soTimeout = 0
      link = up(Link("lan-${counter.incrementAndGet()}", theirs, socket, out, mine)) ?: return
      while (running) {
        val payload = Framing.read(input)
        link.at = System.currentTimeMillis()
        if (!payload.contentEquals(STILL_HERE)) onFrame(link.id, payload)
      }
    } catch (e: IOException) {
      // Closed, or not an Erevos link.
    } finally {
      link?.let { links.remove(it.id, it) }
      runCatching { socket.close() }
    }
  }

  // Two links to one: both ends keep the one the lower nonce opened. Null when this one goes.
  private fun up(link: Link): Link? {
    synchronized(lock) {
      val other = linkTo(link.nonce)
      if (other != null) {
        val keepNew = link.mine == (nonce < link.nonce)
        if (!keepNew) return null
        links.remove(other.id)
        runCatching { other.socket.close() }
      }
      links[link.id] = link
      dialing.remove(link.nonce)
    }
    onLink(link.id)
    return link
  }

  private fun linkTo(theirs: String): Link? = links.values.firstOrNull { it.nonce == theirs }

  // Each link says it is still there; one nothing came on for a while goes, as do those not heard.
  private fun sweep() {
    val now = System.currentTimeMillis()
    for (link in links.values) {
      if (now - link.at > GONE_AFTER_MS) {
        runCatching { link.socket.close() }
      } else {
        send(link.id, STILL_HERE)
      }
    }
    heard.entries.removeIf { now - it.value.at > GONE_AFTER_MS }
  }

  companion object {
    const val LINK_PREFIX = "lan-"
    const val PORT = 47905
    private const val ANNOUNCE_EVERY_MS = 3_000L
    private const val QUIET_EVERY_MS = 15_000L
    private const val GONE_AFTER_MS = 15_000L
    private const val DIAL_ANYWAY_AFTER_MS = 6_000L
    private const val HELLO_WITHIN_MS = 5_000
    private const val MAX_LINKS = 16
    private val STILL_HERE = "EVL1".toByteArray(Charsets.ISO_8859_1)
    private val ANNOUNCE = Regex("EVL1 ([0-9a-f]{16}) ([0-9]{1,5})")
    private val HELLO = Regex("EVL1 ([0-9a-f]{16})")
  }
}
