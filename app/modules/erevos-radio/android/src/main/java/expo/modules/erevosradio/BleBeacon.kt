package expo.modules.erevosradio

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.ParcelUuid
import java.nio.ByteBuffer
import java.util.UUID

/**
 * Advertises the Erevos service UUID and reports phones that advertise it. The scan
 * response carries a random nonce chosen for each start. BleLink uses it so only one
 * phone of a pair dials. The nonce is a short-lived pseudo-identifier, not an identity.
 * Not compiled or run yet.
 */
@SuppressLint("MissingPermission")
class BleBeacon(
  context: Context,
  private val onScan: (device: BluetoothDevice, nonce: Int?) -> Unit,
  private val onLog: (text: String) -> Unit,
) {
  private val adapter: BluetoothAdapter? =
    (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

  private val advertiseCallback = object : AdvertiseCallback() {
    override fun onStartSuccess(settingsInEffect: AdvertiseSettings) = onLog("BLE advertising started")
    override fun onStartFailure(errorCode: Int) = onLog("BLE advertising failed: $errorCode")
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      val record = result.scanRecord ?: return
      val data = record.getServiceData(ParcelUuid(SERVICE_UUID))
      val advertised = record.serviceUuids?.any { it.uuid == SERVICE_UUID } == true
      if (data == null && !advertised) return
      val nonce = data?.takeIf { it.size == 4 }?.let { ByteBuffer.wrap(it).int }
      onScan(result.device, nonce)
    }

    override fun onScanFailed(errorCode: Int) = onLog("BLE scan failed: $errorCode")
  }

  fun start(nonce: Int) = guarded("Starting BLE") {
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
        .setConnectable(true)
        .build(),
      AdvertiseData.Builder()
        .addServiceUuid(ParcelUuid(SERVICE_UUID))
        .setIncludeDeviceName(false)
        .build(),
      AdvertiseData.Builder()
        .addServiceData(ParcelUuid(SERVICE_UUID), ByteBuffer.allocate(4).putInt(nonce).array())
        .setIncludeDeviceName(false)
        .build(),
      advertiseCallback,
    )
    // No scan filter: a filter on the service UUID would not match the scan response,
    // which carries the nonce. onScanResult drops everything that is not Erevos.
    scanner.startScan(
      emptyList<android.bluetooth.le.ScanFilter>(),
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

    fun isAvailable(context: Context): Boolean =
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
  }
}
