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
 * Each connected socket then carries frames (see Framing). Not compiled or run yet.
 */
@SuppressLint("NewApi", "MissingPermission")
class WifiAwareLink(
  private val context: Context,
  private val onLink: (linkId: String) -> Unit,
  private val onFrame: (linkId: String, payload: ByteArray) -> Unit,
  private val onLog: (text: String) -> Unit,
) {
  class Link(val id: String, val socket: Socket, val out: DataOutputStream)

  private val main = Handler(Looper.getMainLooper())
  private val io = Executors.newCachedThreadPool()
  private val connectivity = context.getSystemService(ConnectivityManager::class.java)
  private val links = ConcurrentHashMap<String, Link>()
  private val networkCallbacks = CopyOnWriteArrayList<ConnectivityManager.NetworkCallback>()
  private val linkCounter = AtomicInteger(0)
  private val messageIds = AtomicInteger(1)

  // Discovery callbacks run on the main looper, so these maps need no lock.
  private val lastKnockSent = HashMap<PeerHandle, Long>()
  private val lastKnockSeen = HashMap<PeerHandle, Long>()
  private var session: WifiAwareSession? = null
  @Volatile private var publish: PublishDiscoverySession? = null
  @Volatile private var subscribe: SubscribeDiscoverySession? = null

  fun start() {
    if (!isAvailable(context)) {
      onLog("Wi-Fi Aware is off or not supported on this phone")
      return
    }
    val manager = context.getSystemService(Context.WIFI_AWARE_SERVICE) as WifiAwareManager
    manager.attach(object : AttachCallback() {
      override fun onAttached(attached: WifiAwareSession) {
        session = attached
        onLog("Wi-Fi Aware attached")
        attached.publish(
          PublishConfig.Builder().setServiceName(SERVICE_NAME).build(),
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
        onLog("Wi-Fi Aware attach failed")
      }
    }, main)
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
      }
    }
    return true
  }

  fun stop() {
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
      if (throttled(lastKnockSent, peer)) return
      subscribe?.sendMessage(peer, nextMessageId(), byteArrayOf(KNOCK))
    }

    override fun onMessageReceived(peer: PeerHandle, message: ByteArray) {
      if (message.size == 3 && message[0] == READY) {
        val port = ((message[1].toInt() and 0xFF) shl 8) or (message[2].toInt() and 0xFF)
        connectTo(peer, port)
      }
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
    val spec = WifiAwareNetworkSpecifier.Builder(publisher, peer).setPort(port).build()
    val callback = object : ConnectivityManager.NetworkCallback() {}
    networkCallbacks.add(callback)
    connectivity.requestNetwork(awareRequest(spec), callback)
    publisher.sendMessage(
      peer,
      nextMessageId(),
      byteArrayOf(READY, (port shr 8).toByte(), port.toByte()),
    )
    onLog("Knock received, listening on port $port")
    io.execute { acceptOne(server) }
  }

  private fun acceptOne(server: ServerSocket) {
    server.use { s ->
      try {
        s.soTimeout = ACCEPT_TIMEOUT_MS
        startLink(s.accept())
      } catch (e: IOException) {
        onLog("No connection on port ${s.localPort}: ${e.message}")
      }
    }
  }

  /** Subscriber side: request the network to the publisher, then connect to the port it gave. */
  private fun connectTo(peer: PeerHandle, port: Int) {
    val subscriber = subscribe ?: return
    val connected = AtomicBoolean(false)
    val callback = object : ConnectivityManager.NetworkCallback() {
      override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
        val info = capabilities.transportInfo as? WifiAwareNetworkInfo ?: return
        val address = info.peerIpv6Addr ?: return
        if (!connected.compareAndSet(false, true)) return
        io.execute {
          try {
            startLink(network.socketFactory.createSocket(address, port))
          } catch (e: IOException) {
            onLog("Connect to $address port $port failed: ${e.message}")
          }
        }
      }
    }
    networkCallbacks.add(callback)
    val spec = WifiAwareNetworkSpecifier.Builder(subscriber, peer).build()
    connectivity.requestNetwork(awareRequest(spec), callback)
  }

  private fun startLink(socket: Socket) {
    socket.tcpNoDelay = true
    val id = "aware-${linkCounter.incrementAndGet()}"
    links[id] = Link(id, socket, DataOutputStream(socket.getOutputStream().buffered()))
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

    fun isAvailable(context: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
      if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_AWARE)) return false
      val manager = context.getSystemService(Context.WIFI_AWARE_SERVICE) as? WifiAwareManager
      return manager?.isAvailable == true
    }
  }
}
