// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscall

import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.util.concurrent.ConcurrentHashMap

// Where a call's sound goes: the earpiece, the loudspeaker, a wired headset or a Bluetooth one.
// As the call starts, a headset connected takes it, Bluetooth first, as in a phone call; else the
// loudspeaker or the earpiece, as asked. One connected during the call takes it too, and as the
// one in use goes, the sound goes to another headset, or back to the loudspeaker or the earpiece.
// The owner can choose any of them on the call screen (components/call-sound.tsx). Each change is
// told (`tell`), so the screen shows where the sound goes; `atEar` turns the screen off while
// something is close to it, with the earpiece only, so a cheek presses nothing.
class CallOutputs(private val tell: () -> Unit, private val atEar: (Boolean) -> Unit) {
  // Its id for choose, what it is ("earpiece", "speaker", "wired" or "bluetooth"), the name of a
  // Bluetooth one, and the device itself (Android 12 and later; before, the way goes by what it is).
  class Output(val id: String, val kind: String, val name: String, val device: AudioDeviceInfo?)

  // While a call has the sound (start to stop).
  @Volatile private var inCall = false
  // What the sound goes to, as last chosen: before Android 12 none can be read back.
  @Volatile private var chosen: String? = null
  // The loudspeaker asked for, as the call started or since: where the sound goes back to when
  // the headset in use goes.
  @Volatile private var speakerWanted = false
  private var watch: AudioDeviceCallback? = null
  // The devices connected as the call started, or since: a new one is told apart from them.
  private val known: MutableSet<Int> = ConcurrentHashMap.newKeySet()

  fun start(manager: AudioManager, speaker: Boolean) {
    inCall = true
    speakerWanted = speaker
    watch(manager)
    // A headset connected takes the call's sound from the start, in a video call too.
    val output = preferred(list(manager), speaker)
    if (output != null) use(manager, output) else atEar(!speaker)
  }

  /** The loudspeaker, or not: then a headset when one is connected, else the earpiece. */
  fun setSpeaker(manager: AudioManager, speaker: Boolean) {
    speakerWanted = speaker
    val outputs = list(manager)
    val output = if (speaker) outputs.firstOrNull { it.kind == SPEAKER } else preferred(outputs, false)
    if (output != null) use(manager, output) else atEar(!speaker)
  }

  /** The owner's choice, by its id in `list`. */
  fun choose(manager: AudioManager, id: String) {
    val output = list(manager).firstOrNull { it.id == id } ?: return
    if (output.kind == SPEAKER || output.kind == EARPIECE) speakerWanted = output.kind == SPEAKER
    use(manager, output)
  }

  fun stop(manager: AudioManager) {
    inCall = false
    watch?.let { manager.unregisterAudioDeviceCallback(it) }
    watch = null
    known.clear()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      manager.clearCommunicationDevice()
    } else {
      @Suppress("DEPRECATION")
      if (manager.isBluetoothScoOn) {
        manager.isBluetoothScoOn = false
        manager.stopBluetoothSco()
      }
      @Suppress("DEPRECATION")
      manager.isSpeakerphoneOn = false
    }
    chosen = null
  }

  /** Where the sound can go now: one of each kind, and each Bluetooth headset once. */
  fun list(manager: AudioManager): List<Output> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val seen = mutableSetOf<String>()
      return manager.availableCommunicationDevices.mapNotNull { device ->
        val kind = kindOf(device.type) ?: return@mapNotNull null
        val name = if (kind == BLUETOOTH) device.productName?.toString()?.trim().orEmpty() else ""
        // A Bluetooth headset that both its ways show (SCO and LE Audio) is one.
        if (!seen.add(if (kind == BLUETOOTH) "$kind/$name" else kind)) return@mapNotNull null
        Output(device.id.toString(), kind, name, device)
      }
    }
    // Before Android 12 a wired headset takes the earpiece's place, and Bluetooth goes by SCO.
    val devices = manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    val outputs = mutableListOf<Output>()
    if (devices.any { kindOf(it.type) == WIRED }) outputs += Output(WIRED, WIRED, "", null)
    else if (devices.any { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }) outputs += Output(EARPIECE, EARPIECE, "", null)
    outputs += Output(SPEAKER, SPEAKER, "", null)
    devices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }?.let {
      outputs += Output(BLUETOOTH, BLUETOOTH, it.productName?.toString()?.trim().orEmpty(), null)
    }
    return outputs
  }

  /** The one the sound goes to now. */
  fun current(manager: AudioManager): Output? {
    val outputs = list(manager)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val device = manager.communicationDevice ?: return outputs.firstOrNull { it.kind == EARPIECE }
      return outputs.firstOrNull { it.id == device.id.toString() } ?: kindOf(device.type)?.let { kind -> outputs.firstOrNull { it.kind == kind } }
    }
    return outputs.firstOrNull { it.kind == chosen } ?: outputs.firstOrNull()
  }

  private fun use(manager: AudioManager, output: Output) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val device = output.device
      if (device == null || !manager.setCommunicationDevice(device)) manager.clearCommunicationDevice()
    } else {
      @Suppress("DEPRECATION")
      if (output.kind == BLUETOOTH) {
        manager.isSpeakerphoneOn = false
        manager.startBluetoothSco()
        manager.isBluetoothScoOn = true
      } else {
        if (manager.isBluetoothScoOn) {
          manager.isBluetoothScoOn = false
          manager.stopBluetoothSco()
        }
        manager.isSpeakerphoneOn = output.kind == SPEAKER
      }
    }
    chosen = output.kind
    atEar(output.kind == EARPIECE)
    tell()
  }

  private fun watch(manager: AudioManager) {
    if (watch != null) return
    known.clear()
    manager.getDevices(AudioManager.GET_DEVICES_ALL).forEach { known.add(it.id) }
    val callback = object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) {
        // Those connected already are told of as it starts: only the new ones count.
        val fresh = added.filter { known.add(it.id) }
        if (!inCall || fresh.isEmpty()) return
        val headset = fresh.lastOrNull { kindOf(it.type).let { kind -> kind == BLUETOOTH || kind == WIRED } }
        val outputs = if (headset != null) list(manager) else emptyList()
        val output = headset?.let { found -> outputs.firstOrNull { it.id == found.id.toString() } ?: outputs.lastOrNull { it.kind == kindOf(found.type) } }
        if (output != null) use(manager, output) else tell()
      }

      override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) {
        removed.forEach { known.remove(it.id) }
        if (!inCall) return
        val was = chosen
        val outputs = list(manager)
        val gone = (was == BLUETOOTH || was == WIRED) && removed.any { kindOf(it.type) == was } && outputs.none { it.kind == was }
        val output = if (gone) preferred(outputs, speakerWanted) else null
        if (output != null) use(manager, output) else tell()
      }
    }
    watch = callback
    manager.registerAudioDeviceCallback(callback, Handler(Looper.getMainLooper()))
  }

  companion object {
    const val EARPIECE = "earpiece"
    const val SPEAKER = "speaker"
    const val WIRED = "wired"
    const val BLUETOOTH = "bluetooth"

    // Of later Androids than some phones Erevos runs on, by their numbers.
    private const val TYPE_USB_HEADSET = 22
    private const val TYPE_HEARING_AID = 23
    private const val TYPE_BLE_HEADSET = 26
    private const val TYPE_BLE_SPEAKER = 27

    fun kindOf(type: Int): String? = when (type) {
      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> EARPIECE
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> SPEAKER
      AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES, TYPE_USB_HEADSET -> WIRED
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO, TYPE_HEARING_AID, TYPE_BLE_HEADSET, TYPE_BLE_SPEAKER -> BLUETOOTH
      else -> null
    }

    // A headset connected, Bluetooth first, as in a phone call; else the loudspeaker or the earpiece as asked.
    fun preferred(outputs: List<Output>, speaker: Boolean): Output? =
      outputs.firstOrNull { it.kind == BLUETOOTH } ?: outputs.firstOrNull { it.kind == WIRED }
        ?: outputs.firstOrNull { it.kind == if (speaker) SPEAKER else EARPIECE } ?: outputs.firstOrNull { it.kind == SPEAKER }
  }
}
