package expo.modules.erevosradio

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.ParcelUuid
import java.util.UUID

/**
 * Presence only. Advertises the Erevos service UUID and reports other phones
 * that advertise it. It carries no identity and no messages; data moves over
 * Wi-Fi Aware (see WifiAwareLink). Not compiled or run yet.
 */
@SuppressLint("MissingPermission")
class BleBeacon(
  context: Context,
  private val onSeen: (address: String, rssi: Int) -> Unit,
  private val onLog: (text: String) -> Unit,
) {
  private val adapter: BluetoothAdapter? =
    (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

  // Only touched from the scan callback, which runs on one thread.
  private val lastSeenAt = HashMap<String, Long>()

  private val advertiseCallback = object : AdvertiseCallback() {
    override fun onStartSuccess(settingsInEffect: AdvertiseSettings) = onLog("BLE advertising started")
    override fun onStartFailure(errorCode: Int) = onLog("BLE advertising failed: $errorCode")
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      val address = result.device.address
      val now = System.currentTimeMillis()
      val last = lastSeenAt[address]
      if (last != null && now - last < SEEN_INTERVAL_MS) return
      lastSeenAt[address] = now
      onSeen(address, result.rssi)
    }

    override fun onScanFailed(errorCode: Int) = onLog("BLE scan failed: $errorCode")
  }

  fun start() = guarded("Starting BLE") {
    val bluetooth = adapter
    if (bluetooth == null || !bluetooth.isEnabled) {
      onLog("Bluetooth is off or missing")
      return@guarded
    }
    val advertiser = bluetooth.bluetoothLeAdvertiser
    val scanner = bluetooth.bluetoothLeScanner
    if (advertiser == null || scanner == null) {
      onLog("This phone cannot advertise over BLE")
      return@guarded
    }
    advertiser.startAdvertising(
      AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setConnectable(false)
        .build(),
      AdvertiseData.Builder()
        .addServiceUuid(ParcelUuid(SERVICE_UUID))
        .setIncludeDeviceName(false)
        .build(),
      advertiseCallback,
    )
    scanner.startScan(
      listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()),
      ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(),
      scanCallback,
    )
  }

  fun stop() = guarded("Stopping BLE") {
    adapter?.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
    adapter?.bluetoothLeScanner?.stopScan(scanCallback)
  }

  private inline fun guarded(what: String, block: () -> Unit) {
    try {
      block()
    } catch (e: SecurityException) {
      onLog("$what needs a Bluetooth permission: ${e.message}")
    }
  }

  companion object {
    // A custom 128-bit UUID, so it needs no registration. Anyone scanning for it
    // sees Erevos phones nearby, which is why it carries no identity.
    val SERVICE_UUID: UUID = UUID.fromString("6e8f0c1a-3b5d-4f2e-9a7c-5d1e0b2f8a41")
    private const val SEEN_INTERVAL_MS = 10_000L

    fun isAvailable(context: Context): Boolean =
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
  }
}
