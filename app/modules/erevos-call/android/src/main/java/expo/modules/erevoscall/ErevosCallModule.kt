package expo.modules.erevoscall

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The phone's side of a call that WebRTC leaves to the app: the sound set up for talking, through
// the earpiece or the loudspeaker, the screen off while the phone is at the ear, and on while a
// call shows. Everything goes back as it was when the call ends. Also what lets a call ring while
// Erevos is in the background: the service that keeps it running (ReceiveService), the ringtone,
// the call notice over the lock screen and the notice that messages came (Notices), and the
// settings Android asks the user for.
class ErevosCallModule : Module() {
  private var modeBefore: Int? = null
  private var proximity: PowerManager.WakeLock? = null
  private var ringtone: Ringtone? = null
  private var keepTask: Int? = null

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

    Function("startReceiving") {
      context?.let { ReceiveService.start(it) }
      keepTimers(true)
      null
    }

    Function("stopReceiving") {
      keepTimers(false)
      context?.let { ReceiveService.stop(it) }
      null
    }

    // A call rings here: the phone's ringtone, as the phone's ring volume and silent mode allow,
    // and with `notice` the call notice too, shown over the lock screen.
    Function("ring") { video: Boolean, notice: Boolean ->
      val context = context ?: return@Function
      if (ringtone?.isPlaying != true) {
        val uri: Uri? = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_RINGTONE)
          ?: Settings.System.DEFAULT_RINGTONE_URI
        ringtone = uri?.let { RingtoneManager.getRingtone(context, it) }?.also {
          it.audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) it.isLooping = true
          it.play()
        }
      }
      if (notice) Notices.ring(context, video)
      showOverLock(true)
    }

    Function("stopRinging") {
      ringtone?.stop()
      ringtone = null
      context?.let { Notices.stopRinging(it) }
      null
    }

    // Messages came while Erevos was in the background: a notice that says how many, no more.
    Function("tellMessages") { count: Int ->
      context?.let { Notices.messages(it, count) }
      null
    }

    // The app's language (app/lib/i18n.ts), kept for the notices, which show while the app is closed.
    Function("setLanguage") { lang: String ->
      context?.let { Notices.setLanguage(it, lang) }
      null
    }

    Function("clearMessages") {
      context?.let { Notices.clearMessages(it) }
      null
    }

    // While a call shows, Erevos may show over the lock screen and wake the screen; only then.
    Function("showOverLock") { on: Boolean ->
      showOverLock(on)
    }

    // What Android lets Erevos do for ringing in the background: show notices, show a call over
    // the lock screen, and keep running when the battery saver would stop it.
    Function("backgroundState") {
      val context = context ?: return@Function mapOf("notices" to false, "fullScreen" to false, "battery" to false)
      val notices = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      mapOf(
        "notices" to (Build.VERSION.SDK_INT < Build.VERSION_CODES.N || notices.areNotificationsEnabled()),
        "fullScreen" to (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE || notices.canUseFullScreenIntent()),
        "battery" to (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || power.isIgnoringBatteryOptimizations(context.packageName)),
      )
    }

    // Asks Android to leave Erevos out of battery saving, or opens the setting to show calls over
    // the lock screen. Android shows its own question or screen; nothing changes without the user.
    Function("askBattery") {
      val context = context
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || context == null) return@Function null
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      null
    }

    Function("askFullScreen") {
      val context = context
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE || context == null) return@Function null
      val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      null
    }
  }

  // React Native stops the app's timers while it is in the background, unless a background task
  // runs: this one runs (lib/background.ts) while Erevos receives in the background, so it goes on
  // looking at the relay.
  private fun keepTimers(on: Boolean) {
    val react = appContext.reactContext as? ReactContext ?: return
    UiThreadUtil.runOnUiThread {
      val tasks = HeadlessJsTaskContext.getInstance(react)
      keepTask?.let { tasks.finishTask(it) }
      keepTask = null
      if (on) {
        keepTask = runCatching { tasks.startTask(HeadlessJsTaskConfig(KEEP_TASK, Arguments.createMap(), 0, true)) }.getOrNull()
      }
    }
  }

  private fun showOverLock(on: Boolean) {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(on)
        activity.setTurnScreenOn(on)
      } else {
        @Suppress("DEPRECATION")
        val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        if (on) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
      }
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

  companion object {
    const val KEEP_TASK = "ErevosReceive"
  }
}
