package expo.modules.erevosradio

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.random.Random

/**
 * Data over BLE GATT, for phones without Wi-Fi Aware. Each pair of phones opens one
 * connection. The phone with the lower random nonce dials and writes to RX; the other
 * accepts and sends TX notifications. Frames keep the 4-byte length layout of Framing,
 * cut into chunks that fit the negotiated MTU. Only one write or notification is in
 * flight per link. All state lives on the main looper. Not compiled or run yet.
 */
@SuppressLint("MissingPermission")
class BleLink(
  private val context: Context,
  private val onPresence: (address: String) -> Unit,
  private val onLink: (linkId: String) -> Unit,
  private val onFrame: (linkId: String, payload: ByteArray) -> Unit,
  private val onLog: (text: String) -> Unit,
) {
  private class Pipe(
    val id: String,
    val address: String,
    val chunkSize: Int,
    val write: (chunk: ByteArray) -> Boolean,
    val close: () -> Unit,
  ) {
    val queue = ArrayDeque<ByteArray>()
    val inbox = ByteArrayOutputStream()
    var busy = false
  }

  private val main = Handler(Looper.getMainLooper())
  private val ownNonce = Random.nextInt()

  // Read from any thread (send), changed only on the main looper.
  private val pipes = ConcurrentHashMap<String, Pipe>()

  // Main looper only from here down.
  private val dialing = HashMap<String, BluetoothGatt>()
  private val lastDialAt = HashMap<String, Long>()
  private val lastPresence = HashMap<String, Long>()
  private val mtus = HashMap<String, Int>()
  private var beacon: BleBeacon? = null
  private var tx: BluetoothGattCharacteristic? = null

  @Volatile private var server: BluetoothGattServer? = null

  fun start() {
    main.post { startOnMain() }
  }

  fun stop() {
    main.post { stopOnMain() }
  }

  /** Sends one payload over a link. Returns false if the link is unknown or the payload is too big. */
  fun send(linkId: String, payload: ByteArray): Boolean {
    if (payload.size > Framing.MAX_FRAME || !pipes.containsKey(linkId)) return false
    main.post {
      val pipe = pipes[linkId] ?: return@post
      val bytes = ByteBuffer.allocate(4).putInt(payload.size).array() + payload
      var offset = 0
      while (offset < bytes.size) {
        val end = minOf(offset + pipe.chunkSize, bytes.size)
        pipe.queue.addLast(bytes.copyOfRange(offset, end))
        offset = end
      }
      pump(pipe)
    }
    return true
  }

  private fun startOnMain() {
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    if (manager == null || manager.adapter?.isEnabled != true) {
      onLog("Bluetooth is off or missing")
      return
    }
    try {
      val opened = manager.openGattServer(context, serverCallback)
      if (opened == null) {
        onLog("Cannot open a BLE GATT server")
        return
      }
      server = opened
      opened.addService(erevosService())
    } catch (e: SecurityException) {
      onLog("BLE needs a Bluetooth permission: ${e.message}")
    }
  }

  private fun stopOnMain() {
    beacon?.stop()
    beacon = null
    pipes.values.toList().forEach { drop(it) }
    dialing.values.forEach { gatt -> runCatching { gatt.disconnect() }; runCatching { gatt.close() } }
    dialing.clear()
    val gattServer = server
    server = null
    runCatching { gattServer?.clearServices() }
    runCatching { gattServer?.close() }
    tx = null
    mtus.clear()
    lastPresence.clear()
    lastDialAt.clear()
  }

  private fun erevosService(): BluetoothGattService {
    val service = BluetoothGattService(BleBeacon.SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
    service.addCharacteristic(
      BluetoothGattCharacteristic(
        RX_UUID,
        BluetoothGattCharacteristic.PROPERTY_WRITE,
        BluetoothGattCharacteristic.PERMISSION_WRITE,
      ),
    )
    val notify = BluetoothGattCharacteristic(
      TX_UUID,
      BluetoothGattCharacteristic.PROPERTY_NOTIFY,
      BluetoothGattCharacteristic.PERMISSION_READ,
    )
    notify.addDescriptor(
      BluetoothGattDescriptor(
        CCCD_UUID,
        BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE,
      ),
    )
    service.addCharacteristic(notify)
    tx = notify
    return service
  }

  private fun startBeacon() {
    beacon = BleBeacon(
      context,
      onScan = { device, nonce -> main.post { onScanned(device, nonce) } },
      onLog = { text -> main.post { onLog(text) } },
    ).also { it.start(ownNonce) }
  }

  private fun onScanned(device: BluetoothDevice, nonce: Int?) {
    val address = device.address
    val now = System.currentTimeMillis()
    val last = lastPresence[address]
    if (last == null || now - last >= PRESENCE_INTERVAL_MS) {
      lastPresence[address] = now
      onPresence(address)
    }
    // The lower nonce dials, so each pair opens exactly one link.
    if (nonce != null && ownNonce.toUInt() < nonce.toUInt()) dial(device)
  }

  private fun dial(device: BluetoothDevice) {
    val address = device.address
    val now = System.currentTimeMillis()
    if (dialing.containsKey(address) || pipes.containsKey(linkId(address))) return
    if (now - (lastDialAt[address] ?: 0L) < DIAL_INTERVAL_MS) return
    lastDialAt[address] = now
    onLog("BLE dialing $address")
    try {
      dialing[address] = device.connectGatt(context, false, clientCallback, BluetoothDevice.TRANSPORT_LE)
    } catch (e: SecurityException) {
      onLog("BLE connect needs a Bluetooth permission: ${e.message}")
    }
  }

  private fun register(pipe: Pipe) {
    pipes[pipe.id] = pipe
    onLog("BLE link ready: ${pipe.address}")
    onLink(pipe.id)
  }

  private fun drop(pipe: Pipe) {
    if (pipes.remove(pipe.id) == null) return
    pipe.queue.clear()
    pipe.close()
    onLog("BLE link closed: ${pipe.address}")
  }

  private fun pump(pipe: Pipe) {
    if (pipe.busy) return
    val chunk = pipe.queue.removeFirstOrNull() ?: return
    pipe.busy = true
    if (!pipe.write(chunk)) {
      onLog("BLE write to ${pipe.address} refused")
      drop(pipe)
    }
  }

  private fun writeDone(pipe: Pipe, ok: Boolean) {
    pipe.busy = false
    if (!ok) {
      onLog("BLE write to ${pipe.address} failed")
      drop(pipe)
      return
    }
    pump(pipe)
  }

  private fun receive(pipe: Pipe, bytes: ByteArray) {
    pipe.inbox.write(bytes)
    val data = pipe.inbox.toByteArray()
    var start = 0
    while (data.size - start >= 4) {
      val length = ByteBuffer.wrap(data, start, 4).int
      if (length < 0 || length > Framing.MAX_FRAME) {
        onLog("Bad frame from ${pipe.address}")
        drop(pipe)
        return
      }
      if (data.size - start - 4 < length) break
      val payload = data.copyOfRange(start + 4, start + 4 + length)
      start += 4 + length
      onFrame(pipe.id, payload)
    }
    pipe.inbox.reset()
    pipe.inbox.write(data, start, data.size - start)
  }

  /** Dialer side: the GATT link is ready once TX notifications are on. */
  private fun dialerReady(gatt: BluetoothGatt, rx: BluetoothGattCharacteristic) {
    val address = gatt.device.address
    register(
      Pipe(
        id = linkId(address),
        address = address,
        chunkSize = chunkSizeFor(address),
        write = { chunk -> writeRx(gatt, rx, chunk) },
        close = { gatt.disconnect() },
      ),
    )
  }

  /** Acceptor side: the link is ready once the central has turned notifications on. */
  private fun acceptorReady(device: BluetoothDevice) {
    val address = device.address
    val notify = tx ?: return
    if (pipes.containsKey(linkId(address))) return
    register(
      Pipe(
        id = linkId(address),
        address = address,
        chunkSize = chunkSizeFor(address),
        write = { chunk -> notifyTx(device, notify, chunk) },
        close = { server?.cancelConnection(device) },
      ),
    )
  }

  private val clientCallback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
      main.post {
        val address = gatt.device.address
        if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
          if (!gatt.requestMtu(REQUESTED_MTU)) gatt.discoverServices()
        } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
          if (dialing[address] === gatt) dialing.remove(address)
          pipes[linkId(address)]?.let { drop(it) }
          gatt.close()
        }
      }
    }

    override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
      main.post {
        mtus[gatt.device.address] = mtu
        gatt.discoverServices()
      }
    }

    override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
      main.post {
        val txChar = gatt.getService(BleBeacon.SERVICE_UUID)?.getCharacteristic(TX_UUID)
        val cccd = txChar?.getDescriptor(CCCD_UUID)
        if (status != BluetoothGatt.GATT_SUCCESS || txChar == null || cccd == null) {
          onLog("BLE service missing on ${gatt.device.address}")
          gatt.disconnect()
          return@post
        }
        gatt.setCharacteristicNotification(txChar, true)
        if (!writeDescriptor(gatt, cccd, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)) {
          onLog("BLE could not enable notifications on ${gatt.device.address}")
          gatt.disconnect()
        }
      }
    }

    override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
      main.post {
        if (descriptor.uuid != CCCD_UUID) return@post
        val rx = gatt.getService(BleBeacon.SERVICE_UUID)?.getCharacteristic(RX_UUID)
        if (status != BluetoothGatt.GATT_SUCCESS || rx == null) {
          onLog("BLE notifications refused by ${gatt.device.address}")
          gatt.disconnect()
          return@post
        }
        dialerReady(gatt, rx)
      }
    }

    override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
      main.post {
        pipes[linkId(gatt.device.address)]?.let { writeDone(it, status == BluetoothGatt.GATT_SUCCESS) }
      }
    }

    override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
      if (characteristic.uuid != TX_UUID) return
      val bytes = value.copyOf()
      main.post { pipes[linkId(gatt.device.address)]?.let { receive(it, bytes) } }
    }

    // Android 12 and older call this one. Android 13 and later call the overload above.
    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return
      if (characteristic.uuid != TX_UUID) return
      val bytes = characteristic.value?.copyOf() ?: return
      main.post { pipes[linkId(gatt.device.address)]?.let { receive(it, bytes) } }
    }
  }

  private val serverCallback = object : BluetoothGattServerCallback() {
    override fun onServiceAdded(status: Int, service: BluetoothGattService) {
      if (status != BluetoothGatt.GATT_SUCCESS || service.uuid != BleBeacon.SERVICE_UUID) return
      main.post { startBeacon() }
    }

    override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
      if (newState != BluetoothProfile.STATE_DISCONNECTED) return
      main.post {
        mtus.remove(device.address)
        pipes[linkId(device.address)]?.let { drop(it) }
      }
    }

    override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
      main.post { mtus[device.address] = mtu }
    }

    override fun onDescriptorWriteRequest(
      device: BluetoothDevice,
      requestId: Int,
      descriptor: BluetoothGattDescriptor,
      preparedWrite: Boolean,
      responseNeeded: Boolean,
      offset: Int,
      value: ByteArray?,
    ) {
      if (responseNeeded) server?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
      val enabled = descriptor.uuid == CCCD_UUID &&
        value?.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) == true
      if (enabled) main.post { acceptorReady(device) }
    }

    override fun onCharacteristicWriteRequest(
      device: BluetoothDevice,
      requestId: Int,
      characteristic: BluetoothGattCharacteristic,
      preparedWrite: Boolean,
      responseNeeded: Boolean,
      offset: Int,
      value: ByteArray?,
    ) {
      if (responseNeeded) server?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
      if (characteristic.uuid != RX_UUID) return
      val bytes = value?.copyOf() ?: return
      main.post { pipes[linkId(device.address)]?.let { receive(it, bytes) } }
    }

    override fun onNotificationSent(device: BluetoothDevice, status: Int) {
      main.post {
        pipes[linkId(device.address)]?.let { writeDone(it, status == BluetoothGatt.GATT_SUCCESS) }
      }
    }
  }

  @Suppress("DEPRECATION")
  private fun writeRx(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, chunk: ByteArray): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return gatt.writeCharacteristic(
        characteristic,
        chunk,
        BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT,
      ) == BluetoothStatusCodes.SUCCESS
    }
    characteristic.value = chunk
    characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
    return gatt.writeCharacteristic(characteristic)
  }

  @Suppress("DEPRECATION")
  private fun notifyTx(device: BluetoothDevice, characteristic: BluetoothGattCharacteristic, chunk: ByteArray): Boolean {
    val gattServer = server ?: return false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return gattServer.notifyCharacteristicChanged(device, characteristic, false, chunk) ==
        BluetoothStatusCodes.SUCCESS
    }
    characteristic.value = chunk
    return gattServer.notifyCharacteristicChanged(device, characteristic, false)
  }

  @Suppress("DEPRECATION")
  private fun writeDescriptor(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, value: ByteArray): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return gatt.writeDescriptor(descriptor, value) == BluetoothStatusCodes.SUCCESS
    }
    descriptor.value = value
    return gatt.writeDescriptor(descriptor)
  }

  /** The chunk size for a peer: its negotiated MTU minus the 3-byte ATT header. */
  private fun chunkSizeFor(address: String): Int =
    ((mtus[address] ?: DEFAULT_MTU) - ATT_HEADER).coerceAtLeast(DEFAULT_MTU - ATT_HEADER)

  private fun linkId(address: String): String = LINK_PREFIX + address

  companion object {
    const val LINK_PREFIX = "ble-link-"
    val RX_UUID: UUID = UUID.fromString("6e8f0c1a-3b5d-4f2e-9a7c-5d1e0b2f8a42")
    val TX_UUID: UUID = UUID.fromString("6e8f0c1a-3b5d-4f2e-9a7c-5d1e0b2f8a43")
    private val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    private const val REQUESTED_MTU = 517
    private const val DEFAULT_MTU = 23
    private const val ATT_HEADER = 3
    private const val PRESENCE_INTERVAL_MS = 10_000L
    private const val DIAL_INTERVAL_MS = 5_000L
  }
}
