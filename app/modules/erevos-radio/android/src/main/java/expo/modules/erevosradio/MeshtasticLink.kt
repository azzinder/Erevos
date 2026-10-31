// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import java.util.UUID

/**
 * A Meshtastic LoRa radio over Bluetooth, as Meshtastic's own apps talk to it: the phone writes
 * ToRadio protobufs, and reads FromRadio ones until one comes empty, after each write and
 * whenever FromNum notifies. The bytes go to and from JS as they are (lib/meshtastic.ts reads
 * them). One radio at a time. A radio not paired yet is paired first, with Android's own
 * dialog for its PIN. States told (onState): connecting, up, down (JS links again later) and
 * refused (it does not: the phone was not paired, or that is no Meshtastic radio). All state lives
 * on the main looper. Not run on a phone yet.
 */
@SuppressLint("MissingPermission")
class MeshtasticLink(
  private val context: Context,
  private val onFound: (address: String, name: String) -> Unit,
  private val onState: (state: String, detail: String) -> Unit,
  private val onData: (bytes: ByteArray) -> Unit,
  private val onLog: (text: String) -> Unit,
) {
  private val main = Handler(Looper.getMainLooper())

  @Volatile private var up = false

  // Main looper only from here down.
  private var gatt: BluetoothGatt? = null
  private var ops: MeshOps? = null
  private var bonding: BroadcastReceiver? = null
  private var scanning = false
  private val found = HashSet<String>()

  /** Looks for Meshtastic radios for a few seconds, and tells each once (onFound). */
  fun scan() {
    main.post { scanOnMain() }
  }

  /** Links to the radio at this address, after pairing with it if need be. */
  fun connect(address: String) {
    main.post { connectOnMain(address) }
  }

  /** Unlinks, telling nothing: it was asked. */
  fun disconnect() {
    main.post {
      stopScanOnMain()
      close()
    }
  }

  /** Writes a ToRadio. False when the radio is not linked, or it is too large. */
  fun send(bytes: ByteArray): Boolean {
    if (!up || bytes.isEmpty() || bytes.size > MAX_TO_RADIO) return false
    main.post { ops?.send(bytes) }
    return true
  }

  private fun scanOnMain() {
    val scanner = adapter()?.bluetoothLeScanner
    if (scanner == null) {
      onLog("Bluetooth is off or missing")
      return
    }
    stopScanOnMain()
    found.clear()
    try {
      scanner.startScan(
        listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()),
        ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(),
        scanCallback,
      )
      scanning = true
      main.postDelayed({ stopScanOnMain() }, SCAN_MS)
    } catch (e: SecurityException) {
      onLog("Looking for radios needs a Bluetooth permission: ${e.message}")
    }
  }

  private fun stopScanOnMain() {
    if (!scanning) return
    scanning = false
    runCatching { adapter()?.bluetoothLeScanner?.stopScan(scanCallback) }
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      val address = result.device.address
      val name = result.scanRecord?.deviceName ?: runCatching { result.device.name }.getOrNull() ?: ""
      main.post { if (found.add(address)) onFound(address, name) }
    }

    override fun onScanFailed(errorCode: Int) = onLog("Looking for radios failed: $errorCode")
  }

  private fun adapter() =
    (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter?.takeIf { it.isEnabled }

  private fun connectOnMain(address: String) {
    close()
    val device = try {
      adapter()?.getRemoteDevice(address)
    } catch (e: IllegalArgumentException) {
      null
    }
    if (device == null) {
      onState("down", "Bluetooth is off, or that is no radio's address.")
      return
    }
    onState("connecting", "")
    try {
      if (device.bondState == BluetoothDevice.BOND_BONDED) open(device) else pair(device)
    } catch (e: SecurityException) {
      onState("refused", "Erevos may not use Bluetooth: allow Nearby devices in the phone's settings for Erevos.")
    }
  }

  // Pairs first, as a Meshtastic radio lets only a paired phone read it. Android asks for its PIN.
  private fun pair(device: BluetoothDevice) {
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        @Suppress("DEPRECATION")
        val changed = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
        if (changed?.address != device.address) return
        when (intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR)) {
          BluetoothDevice.BOND_BONDED -> main.post {
            stopPairing()
            open(device)
          }
          BluetoothDevice.BOND_NONE -> main.post {
            stopPairing()
            onState("refused", "Not paired with the radio. Its PIN shows on its screen, or is 123456.")
          }
        }
      }
    }
    bonding = receiver
    val filter = IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      context.registerReceiver(receiver, filter)
    }
    // A radio that needs no pairing links as it is.
    if (!device.createBond()) {
      stopPairing()
      open(device)
    }
  }

  private fun stopPairing() {
    bonding?.let { runCatching { context.unregisterReceiver(it) } }
    bonding = null
  }

  private fun open(device: BluetoothDevice) {
    onLog("Linking to the radio ${device.address}")
    gatt = device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
  }

  private fun close() {
    up = false
    ops = null
    stopPairing()
    gatt?.let { runCatching { it.disconnect() }; runCatching { it.close() } }
    gatt = null
  }

  // The link dropped, or the radio is not what it should be (`again` false): tells JS, which
  // links again later if it may.
  private fun lost(detail: String, again: Boolean = true) {
    if (gatt == null && bonding == null) return
    close()
    onState(if (again) "down" else "refused", detail)
  }

  private val callback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
      main.post {
        if (g !== gatt) return@post
        if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
          if (!g.requestMtu(REQUESTED_MTU)) g.discoverServices()
        } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
          lost(if (up) "The radio is out of reach." else "Could not link to the radio (Bluetooth $status).")
        }
      }
    }

    override fun onMtuChanged(g: BluetoothGatt, mtu: Int, status: Int) {
      main.post { if (g === gatt) g.discoverServices() }
    }

    override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
      main.post {
        if (g !== gatt) return@post
        val service = g.getService(SERVICE_UUID)
        val toRadio = service?.getCharacteristic(TO_RADIO_UUID)
        val fromRadio = service?.getCharacteristic(FROM_RADIO_UUID)
        val fromNum = service?.getCharacteristic(FROM_NUM_UUID)
        val cccd = fromNum?.getDescriptor(CCCD_UUID)
        if (status != BluetoothGatt.GATT_SUCCESS || toRadio == null || fromRadio == null || cccd == null) {
          lost("That is not a Meshtastic radio, or its Meshtastic is too old.", again = false)
          return@post
        }
        ops = MeshOps(
          write = { bytes -> write(g, toRadio, bytes) },
          read = { g.readCharacteristic(fromRadio) },
          onData = onData,
          onFail = { what -> lost("The radio stopped answering ($what).") },
        )
        g.setCharacteristicNotification(fromNum, true)
        if (!writeDescriptor(g, cccd, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)) lost("The radio did not answer.")
      }
    }

    override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
      main.post {
        if (g !== gatt || descriptor.uuid != CCCD_UUID) return@post
        if (status != BluetoothGatt.GATT_SUCCESS) {
          lost("The radio refused this phone: pair it again in the phone's Bluetooth settings.", again = false)
          return@post
        }
        up = true
        onState("up", "")
      }
    }

    override fun onCharacteristicWrite(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
      main.post { if (g === gatt) ops?.written(status == BluetoothGatt.GATT_SUCCESS) }
    }

    override fun onCharacteristicRead(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray, status: Int) {
      val bytes = value.copyOf()
      main.post { if (g === gatt) ops?.read(status == BluetoothGatt.GATT_SUCCESS, bytes) }
    }

    // Android 12 and older call this one. Android 13 and later call the overload above.
    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun onCharacteristicRead(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return
      val bytes = characteristic.value?.copyOf() ?: ByteArray(0)
      main.post { if (g === gatt) ops?.read(status == BluetoothGatt.GATT_SUCCESS, bytes) }
    }

    override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
      if (characteristic.uuid == FROM_NUM_UUID) main.post { if (g === gatt) ops?.more() }
    }

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return
      if (characteristic.uuid == FROM_NUM_UUID) main.post { if (g === gatt) ops?.more() }
    }
  }

  @Suppress("DEPRECATION")
  private fun write(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, bytes: ByteArray): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return g.writeCharacteristic(characteristic, bytes, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT) ==
        BluetoothStatusCodes.SUCCESS
    }
    characteristic.value = bytes
    characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
    return g.writeCharacteristic(characteristic)
  }

  @Suppress("DEPRECATION")
  private fun writeDescriptor(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, value: ByteArray): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return g.writeDescriptor(descriptor, value) == BluetoothStatusCodes.SUCCESS
    }
    descriptor.value = value
    return g.writeDescriptor(descriptor)
  }

  companion object {
    // Meshtastic's (firmware src/BluetoothCommon.h).
    val SERVICE_UUID: UUID = UUID.fromString("6ba1b218-15a8-461f-9fa8-5dcae273eafd")
    val TO_RADIO_UUID: UUID = UUID.fromString("f75c76d2-129e-4dad-a1dd-7866124401e7")
    val FROM_RADIO_UUID: UUID = UUID.fromString("2c55e69e-4993-11ed-b878-0242ac120002")
    val FROM_NUM_UUID: UUID = UUID.fromString("ed9da18c-a800-4f66-a670-aa7547e34453")
    private val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    // The largest ToRadio a radio takes (MAX_TO_FROM_RADIO_SIZE).
    const val MAX_TO_RADIO = 512
    private const val REQUESTED_MTU = 512
    private const val SCAN_MS = 12_000L
  }
}

/**
 * What goes to and from a radio, in turn, as Bluetooth does one thing at a time: after each write,
 * and when the radio says it has more, FromRadio is read until it comes empty; writes wait for that.
 * Main looper only.
 */
class MeshOps(
  private val write: (bytes: ByteArray) -> Boolean,
  private val read: () -> Boolean,
  private val onData: (bytes: ByteArray) -> Unit,
  private val onFail: (what: String) -> Unit,
) {
  private val writes = ArrayDeque<ByteArray>()
  private var busy = false
  private var reading = false
  private var failed = false

  fun send(bytes: ByteArray) {
    writes.addLast(bytes)
    pump()
  }

  /** The radio has more to read (FromNum). */
  fun more() {
    reading = true
    pump()
  }

  fun written(ok: Boolean) {
    busy = false
    if (!ok) return fail("write")
    reading = true
    pump()
  }

  fun read(ok: Boolean, bytes: ByteArray) {
    busy = false
    if (!ok) return fail("read")
    // Empty: nothing more for now.
    if (bytes.isNotEmpty()) {
      onData(bytes)
      reading = true
    }
    pump()
  }

  private fun pump() {
    if (busy || failed) return
    if (reading) {
      reading = false
      busy = true
      if (!read()) fail("read")
      return
    }
    val next = writes.removeFirstOrNull() ?: return
    busy = true
    if (!write(next)) fail("write")
  }

  private fun fail(what: String) {
    if (failed) return
    failed = true
    writes.clear()
    onFail(what)
  }
}
