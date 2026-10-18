package expo.modules.erevoscall

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.PowerManager
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The phone's side of a call that WebRTC leaves to the app: the sound set up for talking, through
// the earpiece or the loudspeaker, the screen off while the phone is at the ear, and on while a
// call shows. Everything goes back as it was when the call ends.
class ErevosCallModule : Module() {
  private var modeBefore: Int? = null
  private var proximity: PowerManager.WakeLock? = null

  private val context: Context?
    get() = appContext.reactContext

  private val audio: AudioManager?
    get() = context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("ErevosCall")

    Function("start") { speaker: Boolean ->
      val manager = audio ?: return@Function
      if (modeBefore == null) modeBefore = manager.mode
      manager.mode = AudioManager.MODE_IN_COMMUNICATION
      route(manager, speaker)
      keepScreenOn(true)
    }

    Function("setSpeaker") { speaker: Boolean ->
      audio?.let { route(it, speaker) }
    }

    Function("stop") {
      audio?.let { manager ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          manager.clearCommunicationDevice()
        } else {
          @Suppress("DEPRECATION")
          manager.isSpeakerphoneOn = false
        }
        modeBefore?.let { manager.mode = it }
      }
      modeBefore = null
      atEar(false)
      keepScreenOn(false)
    }
  }

  // The loudspeaker, or the earpiece (a headset when one is plugged in or paired). With the
  // earpiece, the screen goes off while something is close to it, so a cheek presses nothing.
  private fun route(manager: AudioManager, speaker: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val device = if (speaker) {
        manager.availableCommunicationDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
      } else {
        null
      }
      if (device != null) manager.setCommunicationDevice(device) else manager.clearCommunicationDevice()
    } else {
      @Suppress("DEPRECATION")
      manager.isSpeakerphoneOn = speaker
    }
    atEar(!speaker)
  }

  private fun atEar(on: Boolean) {
    if (on) {
      if (proximity?.isHeld == true) return
      val power = context?.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
      if (!power.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) return
      proximity = power.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "erevos:call").also {
        it.setReferenceCounted(false)
        it.acquire(4 * 60 * 60 * 1000L)
      }
    } else {
      proximity?.let { if (it.isHeld) it.release() }
      proximity = null
    }
  }

  private fun keepScreenOn(on: Boolean) {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      if (on) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      } else {
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      }
    }
  }
}
