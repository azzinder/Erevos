// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.aware.AttachCallback
import android.net.wifi.aware.DiscoverySessionCallback
import android.net.wifi.aware.PeerHandle
import android.net.wifi.aware.PublishConfig
import android.net.wifi.aware.PublishDiscoverySession
import android.net.wifi.aware.SubscribeConfig
import android.net.wifi.aware.SubscribeDiscoverySession
import android.net.wifi.aware.WifiAwareManager
import android.net.wifi.aware.WifiAwareNetworkInfo
import android.net.wifi.aware.WifiAwareNetworkSpecifier
import android.net.wifi.aware.WifiAwareSession
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Wi-Fi Aware link between two phones running the app. Needs Android 12 (API 31).
 *
 * Handshake, per discovery:
 * 1. The subscriber finds the publisher and sends KNOCK.
 * 2. The publisher opens a TCP server socket, requests a Wi-Fi Aware network
 *    on that port, and replies READY with the port.
 * 3. The subscriber requests a Wi-Fi Aware network to the publisher and
 *    connects to its IPv6 address on that port.
 *
 * Each connected socket then carries frames (see Framing). The Wi-Fi Aware network asked for
 * stays only while its socket does, or until it came in time or not (NETWORK_WITHIN_MS): an
 * unused one keeps the Wi-Fi awake.
 *
 * `quiet`, while Erevos is in the background: with no link up, it looks for QUIET_LOOK_MS, then
 * rests QUIET_REST_MS, out of Wi-Fi Aware altogether, as being in it wakes the Wi-Fi every half
 * second. A phone that shows finds it the next time it looks, and two in the background find
 * each other in a while.
 *
 * Each says in its publish the nonce of its same Wi-Fi link (LanLink, `lanNonce`), as LanLink's
 * broadcasts and WifiDirectLink do. A phone found that is linked on the same Wi-Fi already
 * (`lanLinked`) is not knocked on: a Wi-Fi Aware network beside the Wi-Fi's takes the Wi-Fi off
 * its network for moments, slowing all else, the relay too, while the phone is near. Should that
 * link go, it is knocked on then (RECHECK_MS). A send that fails closes its link, so it is known
 * gone at the next send, not used on while it no longer carries anything.
 */
@SuppressLint("NewApi", "MissingPermission")
class WifiAwareLink(
  private val context: Context,
  private val onLink: (linkId: String) -> Unit,
  private val onFrame: (linkId: String, payload: ByteArray) -> Unit,
  private val onLog: (text: String) -> Unit,
  private val lanNonce: () -> String? = { null },
  private val lanLinked: (String) -> Boolean = { false },
) {
  // `nonce`: the same Wi-Fi nonce the phone said, on the side that knocked, when it said one.
  class Link(val id: String, val socket: Socket, val out: DataOutputStream, val nonce: String? = null)

  private val main = Handler(Looper.getMainLooper())
  private val io = Executors.newCachedThreadPool()
  private val connectivity = context.getSystemService(ConnectivityManager::class.java)
  private val links = ConcurrentHashMap<String, Link>()
  // The Wi-Fi Aware networks asked for, one for each link or handshake under way.
  private val networkCallbacks = CopyOnWriteArrayList<ConnectivityManager.NetworkCallback>()
  private val linkCounter = AtomicInteger(0)
  private val messageIds = AtomicInteger(1)

  // Discovery callbacks run on the main looper, so these maps need no lock.
  private val lastKnockSent = HashMap<PeerHandle, Long>()
  private val lastKnockSeen = HashMap<PeerHandle, Long>()
  // Phones found but linked on the same Wi-Fi, by the nonce they said: knocked on once they are not.
  private val sameWifi = HashMap<PeerHandle, String>()
  // The same Wi-Fi nonce each phone found said, for the link made to it.
  private val nonces = HashMap<PeerHandle, String>()
  @Volatile private var session: WifiAwareSession? = null
  @Volatile private var publish: PublishDiscoverySession? = null
  @Volatile private var subscribe: SubscribeDiscoverySession? = null
  // Whether it runs; and, on the main looper only, whether it is attaching, quiet, and since when it
  // is in Wi-Fi Aware or had a link or a handshake.
  @Volatile private var running = false
  private var attaching = false
  private var quiet = false
  private var busyAt = 0L

  fun start() {
    if (!isAvailable(context)) {
      onLog("Wi-Fi Aware is off or not supported on this phone")
      return
    }
    running = true
    main.post { attach() }
    main.postDelayed(recheck, RECHECK_MS)
  }

  /** Looks now and then, with no link up, as while Erevos is in the background; or all the time, as before. Links stay up. */
  fun setQuiet(on: Boolean) {
    main.post {
      if (quiet == on) return@post
      quiet = on
      main.removeCallbacks(cycle)
      if (on) main.postDelayed(cycle, CHECK_MS) else attach()
    }
  }

  private val cycle = object : Runnable {
    override fun run() {
      if (!running || !quiet) return
      val now = System.currentTimeMillis()
      if (links.isNotEmpty() || networkCallbacks.isNotEmpty()) busyAt = now
      when {
        session == null && !attaching -> attach()
        session != null && now - busyAt >= QUIET_LOOK_MS -> {
          rest()
          main.postDelayed(this, QUIET_REST_MS)
          return
        }
      }
      main.postDelayed(this, CHECK_MS)
    }
  }

  private fun attach() {
    if (!running || session != null || attaching) return
    val manager = context.getSystemService(Context.WIFI_AWARE_SERVICE) as? WifiAwareManager ?: return
    attaching = true
    manager.attach(object : AttachCallback() {
      override fun onAttached(attached: WifiAwareSession) {
        attaching = false
        if (!running || session != null) {
          attached.close()
          return
        }
        session = attached
        busyAt = System.currentTimeMillis()
        // Who knocked or was knocked on is known by handles of the sessions before.
        lastKnockSent.clear()
        lastKnockSeen.clear()
        sameWifi.clear()
        nonces.clear()
        onLog("Wi-Fi Aware attached")
        val said = lanNonce()?.toByteArray(Charsets.ISO_8859_1) ?: ByteArray(0)
        attached.publish(
          PublishConfig.Builder().setServiceName(SERVICE_NAME).setServiceSpecificInfo(said).build(),
          publishCallback,
          main,
        )
        attached.subscribe(
          SubscribeConfig.Builder().setServiceName(SERVICE_NAME).build(),
          subscribeCallback,
          main,
        )
      }

      override fun onAttachFailed() {
        attaching = false
        onLog("Wi-Fi Aware attach failed")
      }
    }, main)
  }

  // Out of Wi-Fi Aware until the next look, with no link up.
  private fun rest() {
    publish?.close()
    subscribe?.close()
    session?.close()
    publish = null
    subscribe = null
    session = null
    onLog("Wi-Fi Aware rests a while")
  }

  /** Sends one payload to a connected link. Returns false if the link is unknown. */
  fun send(linkId: String, payload: ByteArray): Boolean {
    val link = links[linkId] ?: return false
    if (payload.size > Framing.MAX_FRAME) return false
    io.execute {
      try {
        synchronized(link) { Framing.write(link.out, payload) }
      } catch (e: IOException) {
        onLog("Send to $linkId failed: ${e.message}")
        // Gone: its reader ends and lets it go, so the next send says so.
        links.remove(linkId, link)
        runCatching { link.socket.close() }
      }
    }
    return true
  }

  fun stop() {
    running = false
    main.removeCallbacks(cycle)
    main.removeCallbacks(recheck)
    networkCallbacks.forEach { runCatching { connectivity.unregisterNetworkCallback(it) } }
    networkCallbacks.clear()
    publish?.close()
    subscribe?.close()
    session?.close()
    publish = null
    subscribe = null
    session = null
    links.values.forEach { runCatching { it.socket.close() } }
    links.clear()
  }

  private val publishCallback = object : DiscoverySessionCallback() {
    override fun onPublishStarted(started: PublishDiscoverySession) {
      publish = started
      onLog("Publishing $SERVICE_NAME")
    }

    override fun onMessageReceived(peer: PeerHandle, message: ByteArray) {
      if (message.size == 1 && message[0] == KNOCK && !throttled(lastKnockSeen, peer)) {
        answerKnock(peer)
      }
    }
  }

  private val subscribeCallback = object : DiscoverySessionCallback() {
    override fun onSubscribeStarted(started: SubscribeDiscoverySession) {
      subscribe = started
      onLog("Looking for $SERVICE_NAME phones")
    }

    override fun onServiceDiscovered(
      peer: PeerHandle,
      serviceSpecificInfo: ByteArray,
      matchFilter: List<ByteArray>,
    ) {
      val theirs = String(serviceSpecificInfo, Charsets.ISO_8859_1)
      if (NONCE.matches(theirs)) nonces[peer] = theirs else nonces.remove(peer)
      if (NONCE.matches(theirs) && lanLinked(theirs)) {
        sameWifi[peer] = theirs
        return
      }
      sameWifi.remove(peer)
      knock(peer)
    }

    override fun onMessageReceived(peer: PeerHandle, message: ByteArray) {
      if (message.size == 3 && message[0] == READY) {
        val port = ((message[1].toInt() and 0xFF) shl 8) or (message[2].toInt() and 0xFF)
        connectTo(peer, port)
      }
    }
  }

  private fun knock(peer: PeerHandle) {
    if (throttled(lastKnockSent, peer)) return
    runCatching { subscribe?.sendMessage(peer, nextMessageId(), byteArrayOf(KNOCK)) }
  }

  // A phone left alone as linked on the same Wi-Fi, no longer linked so: knocked on now. And a link
  // made before the same Wi-Fi linked the two too is let go.
  private val recheck = object : Runnable {
    override fun run() {
      if (!running) return
      for (link in links.values) {
        val theirs = link.nonce ?: continue
        if (lanLinked(theirs)) {
          onLog("Link ${link.id}: linked on the same Wi-Fi, let go")
          runCatching { link.socket.close() }
          // Knocked on again, should the same Wi-Fi link go.
          for ((peer, nonce) in nonces) if (nonce == theirs) sameWifi[peer] = nonce
        }
      }
      val gone = sameWifi.entries.filter { !lanLinked(it.value) }.map { it.key }
      for (peer in gone) {
        sameWifi.remove(peer)
        if (subscribe != null) knock(peer)
      }
      main.postDelayed(this, RECHECK_MS)
    }
  }

  /** Publisher side: listen on a fresh port, request the network, then tell the subscriber. */
  private fun answerKnock(peer: PeerHandle) {
    val publisher = publish ?: return
    val server = try {
      ServerSocket(0)
    } catch (e: IOException) {
      onLog("Cannot open a server socket: ${e.message}")
      return
    }
    val port = server.localPort
    // The port goes to the subscriber in READY. Android takes a port in the network specifier only
    // on a link with a passphrase, and throws on an open one.
    val callback = object : ConnectivityManager.NetworkCallback() {
      override fun onUnavailable() = letGo(this)
    }
    try {
      val spec = WifiAwareNetworkSpecifier.Builder(publisher, peer).build()
      networkCallbacks.add(callback)
      connectivity.requestNetwork(awareRequest(spec), callback, NETWORK_WITHIN_MS)
      publisher.sendMessage(
        peer,
        nextMessageId(),
        byteArrayOf(READY, (port shr 8).toByte(), port.toByte()),
      )
    } catch (e: RuntimeException) {
      onLog("Cannot answer a knock: ${e.message}")
      letGo(callback)
      runCatching { server.close() }
      return
    }
    onLog("Knock received, listening on port $port")
    io.execute { acceptOne(server, callback) }
  }

  private fun acceptOne(server: ServerSocket, callback: ConnectivityManager.NetworkCallback) {
    server.use { s ->
      try {
        s.soTimeout = ACCEPT_TIMEOUT_MS
        startLink(s.accept(), callback)
      } catch (e: IOException) {
        letGo(callback)
        onLog("No connection on port ${s.localPort}: ${e.message}")
      }
    }
  }

  /** Subscriber side: request the network to the publisher, then connect to the port it gave. */
  private fun connectTo(peer: PeerHandle, port: Int) {
    val subscriber = subscribe ?: return
    val theirs = nonces[peer]
    val connected = AtomicBoolean(false)
    val callback = object : ConnectivityManager.NetworkCallback() {
      override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
        val info = capabilities.transportInfo as? WifiAwareNetworkInfo ?: return
        val address = info.peerIpv6Addr ?: return
        if (!connected.compareAndSet(false, true)) return
        val asked = this
        io.execute {
          try {
            startLink(network.socketFactory.createSocket(address, port), asked, theirs)
          } catch (e: IOException) {
            letGo(asked)
            onLog("Connect to $address port $port failed: ${e.message}")
          }
        }
      }

      override fun onUnavailable() = letGo(this)
    }
    try {
      val spec = WifiAwareNetworkSpecifier.Builder(subscriber, peer).build()
      networkCallbacks.add(callback)
      connectivity.requestNetwork(awareRequest(spec), callback, NETWORK_WITHIN_MS)
    } catch (e: RuntimeException) {
      letGo(callback)
      onLog("Cannot reach a phone that answered: ${e.message}")
    }
  }

  // The Wi-Fi Aware network asked for with `callback`, no longer needed.
  private fun letGo(callback: ConnectivityManager.NetworkCallback) {
    if (networkCallbacks.remove(callback)) runCatching { connectivity.unregisterNetworkCallback(callback) }
  }

  private fun startLink(socket: Socket, callback: ConnectivityManager.NetworkCallback, nonce: String? = null) {
    socket.tcpNoDelay = true
    val id = "aware-${linkCounter.incrementAndGet()}"
    links[id] = Link(id, socket, DataOutputStream(socket.getOutputStream().buffered()), nonce)
    main.post { onLink(id) }
    io.execute {
      try {
        val input = DataInputStream(socket.getInputStream().buffered())
        while (true) {
          val payload = Framing.read(input)
          main.post { onFrame(id, payload) }
        }
      } catch (e: IOException) {
        onLog("Link $id closed: ${e.message}")
      } finally {
        links.remove(id)
        runCatching { socket.close() }
        letGo(callback)
      }
    }
  }

  private fun awareRequest(spec: WifiAwareNetworkSpecifier): NetworkRequest =
    NetworkRequest.Builder()
      .addTransportType(NetworkCapabilities.TRANSPORT_WIFI_AWARE)
      .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      .setNetworkSpecifier(spec)
      .build()

  /** True if this peer was handled less than KNOCK_INTERVAL_MS ago. Main thread only. */
  private fun throttled(seen: MutableMap<PeerHandle, Long>, peer: PeerHandle): Boolean {
    val now = System.currentTimeMillis()
    val last = seen[peer]
    if (last != null && now - last < KNOCK_INTERVAL_MS) return true
    seen[peer] = now
    return false
  }

  private fun nextMessageId(): Int = messageIds.updateAndGet { it % 255 + 1 }

  companion object {
    const val SERVICE_NAME = "erevos"
    const val KNOCK: Byte = 1
    const val READY: Byte = 2
    private const val KNOCK_INTERVAL_MS = 5_000L
    private const val ACCEPT_TIMEOUT_MS = 60_000
    private const val NETWORK_WITHIN_MS = 60_000
    private const val CHECK_MS = 10_000L
    private const val QUIET_LOOK_MS = 60_000L
    private const val QUIET_REST_MS = 4 * 60_000L
    private const val RECHECK_MS = 10_000L
    private val NONCE = Regex("[0-9a-f]{16}")

    fun isAvailable(context: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
      if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_AWARE)) return false
      val manager = context.getSystemService(Context.WIFI_AWARE_SERVICE) as? WifiAwareManager
      return manager?.isAvailable == true
    }
  }
}
