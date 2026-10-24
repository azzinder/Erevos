package expo.modules.erevoscall

import android.app.Activity
import android.app.ActivityManager
import android.app.Application
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.ConnectivityManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
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
  // The screen kept on a while for a call that rings (wakeForRing).
  private var ringWake: PowerManager.WakeLock? = null

  // Whether the phone shows its screen saver (Android's "dream", as while charging): Erevos's
  // screen, under it, cannot be seen, and Android shows no notice over it, so a call that rings
  // then shows its notice, and wakes the screen, which ends the screen saver.
  private var dreaming = false
  private val dreams = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      dreaming = intent.action == Intent.ACTION_DREAMING_STARTED
    }
  }

  // Whether a call shows over the lock screen. Erevos swiped away from the recent apps has no
  // screen when a call rings: the one the call notice brings up then shows over it too.
  private var overLock = false
  private val created = object : Application.ActivityLifecycleCallbacks {
    override fun onActivityCreated(activity: Activity, saved: Bundle?) {
      if (overLock) setOverLock(activity, true)
    }
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityResumed(activity: Activity) {}
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {}
  }

  private val context: Context?
    get() = appContext.reactContext

  private val audio: AudioManager?
    get() = context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("ErevosCall")

    OnCreate {
      (context?.applicationContext as? Application)?.registerActivityLifecycleCallbacks(created)
      runCatching {
        val filter = IntentFilter().apply {
          addAction(Intent.ACTION_DREAMING_STARTED)
          addAction(Intent.ACTION_DREAMING_STOPPED)
        }
        val app = context?.applicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) app?.registerReceiver(dreams, filter, Context.RECEIVER_NOT_EXPORTED)
        else app?.registerReceiver(dreams, filter)
      }
    }

    OnDestroy {
      (context?.applicationContext as? Application)?.unregisterActivityLifecycleCallbacks(created)
      runCatching { context?.applicationContext?.unregisterReceiver(dreams) }
    }

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

    // Before the first connection to the relay: no cookies, and so no WebView in Erevos (NoCookies).
    Function("noCookies") {
      NoCookies.apply(appContext.reactContext)
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

    // The space that received closed and Erevos left the screen locked: a quiet notice says it
    // receives nothing until it is open again; gone when it shows again or receives.
    Function("setLocked") { on: Boolean ->
      context?.let { if (on) Notices.stopped(it, locked = true) else Notices.clearStopped(it) }
      null
    }

    // A call rings here: the phone's ringtone, as the phone's ring volume and silent mode allow,
    // and with `notice` the call notice too, shown over the lock screen; also while the screen
    // saver shows, over Erevos too. A screen that is off, or shows the screen saver, wakes.
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
      if (notice || dreaming) Notices.ring(context, video)
      showOverLock(true)
      wakeForRing(context)
    }

    Function("stopRinging") {
      ringtone?.stop()
      ringtone = null
      ringWake?.let { if (it.isHeld) it.release() }
      ringWake = null
      context?.let { Notices.stopRinging(it) }
      null
    }

    // Messages came: a notice that says how many, no more, without sound when the last came
    // without (`quiet`).
    Function("tellMessages") { count: Int, quiet: Boolean? ->
      context?.let { Notices.messages(it, count, quiet == true) }
      null
    }

    // Some were read in Erevos: the notice, if it shows, says how many are left, without sound.
    Function("recountMessages") { count: Int ->
      context?.let { Notices.recountMessages(it, count) }
      null
    }

    // A message came where Erevos shows it on the screen: the messages sound, and no notice.
    Function("chime") {
      context?.let { Notices.chime(it) }
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

    // What Android lets Erevos do for ringing in the background: show notices, the call notice
    // among them, show a call over the lock screen, keep running when the battery saver would stop
    // it, and use mobile data while in the background (Data Saver). Also exact alarms, and who made
    // the phone, whose own settings may stop apps in the background too (lib/permissions.ts).
    // Then how the call and message notices are set (off, silent, hidden on the lock screen, through
    // Do Not Disturb), battery use set to Restricted, "Pause app activity if unused", and battery
    // saver, Do Not Disturb and the ringer as they are now. What this Android cannot tell is left out.
    Function("backgroundState") {
      val context = context ?: return@Function mapOf("notices" to false, "fullScreen" to false, "battery" to false)
      val notices = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      val network = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val sdk = Build.VERSION.SDK_INT
      val state = mutableMapOf<String, Any>(
        "notices" to (sdk < Build.VERSION_CODES.N || notices.areNotificationsEnabled()),
        "calls" to Notices.callsShown(context),
        "fullScreen" to (sdk < Build.VERSION_CODES.UPSIDE_DOWN_CAKE || notices.canUseFullScreenIntent()),
        "battery" to (sdk < Build.VERSION_CODES.M || power.isIgnoringBatteryOptimizations(context.packageName)),
        "data" to (sdk < Build.VERSION_CODES.N || network.restrictBackgroundStatus != ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED),
        "alarms" to (sdk < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()),
        "maker" to Build.MANUFACTURER.lowercase(),
        "saver" to power.isPowerSaveMode,
      )
      Notices.channelState(context, Notices.CALLS_CHANNEL)?.let { state["callChannel"] = it }
      Notices.channelState(context, Notices.MESSAGES_CHANNEL)?.let { state["messageChannel"] = it }
      lockScreenShown(context)?.let { state["lockScreen"] = it }
      if (sdk >= Build.VERSION_CODES.M) state["dnd"] = notices.currentInterruptionFilter > NotificationManager.INTERRUPTION_FILTER_ALL
      if (sdk >= Build.VERSION_CODES.P) {
        (context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager)?.let { state["restricted"] = it.isBackgroundRestricted }
      }
      if (sdk >= Build.VERSION_CODES.R) {
        state["unusedExempt"] = context.packageManager.isAutoRevokeWhitelisted
      }
      audio?.let {
        state["ringer"] = it.ringerMode
        state["ringVolume"] = it.getStreamVolume(AudioManager.STREAM_RING)
      }
      state
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

    // Android's screen for one of the settings backgroundState reads: Erevos's notices, its call
    // or message notice, its mobile data in the background, its exact alarms, "Remove permissions
    // if app isn't used" (on Android 11; later it is on Erevos's page), battery saver, the sound
    // settings; anything else, or a phone without that screen, opens Erevos's page in Android's
    // settings ("app"), where Restricted battery use is too. False if none opened.
    Function("openSettings") { which: String ->
      val context = context ?: return@Function false
      val app = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      val sdk = Build.VERSION.SDK_INT
      val intent = when {
        which == "notices" && sdk >= Build.VERSION_CODES.O ->
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        (which == "calls" || which == "messages") && sdk >= Build.VERSION_CODES.O ->
          Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            .putExtra(Settings.EXTRA_CHANNEL_ID, if (which == "calls") Notices.CALLS_CHANNEL else Notices.MESSAGES_CHANNEL)
        which == "unused" && sdk == Build.VERSION_CODES.R ->
          Intent(Intent.ACTION_AUTO_REVOKE_PERMISSIONS, Uri.parse("package:${context.packageName}"))
        which == "saver" -> Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
        which == "sound" -> Intent(Settings.ACTION_SOUND_SETTINGS)
        which == "data" && sdk >= Build.VERSION_CODES.N ->
          Intent(Settings.ACTION_IGNORE_BACKGROUND_DATA_RESTRICTIONS_SETTINGS, Uri.parse("package:${context.packageName}"))
        which == "alarms" && sdk >= Build.VERSION_CODES.S ->
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
        else -> app
      }
      open(context, intent) || open(context, app)
    }

    // The phone maker's own screen for apps that may run in the background, where it has one that
    // is known (dontkillmyapp.com): Huawei's App launch, Xiaomi's Autostart and the like. False
    // when none opened; lib/permissions.ts then opens Erevos's page in Android's settings.
    Function("openMaker") {
      val context = context ?: return@Function false
      makerScreens(Build.MANUFACTURER.lowercase()).any { open(context, Intent().setComponent(it)) }
    }
  }

  // Whether the phone shows notices on its lock screen at all, a setting of the whole phone that
  // not every Android lets an app read: then null, and the check goes by the channels alone.
  private fun lockScreenShown(context: Context): Boolean? =
    try {
      Settings.Secure.getInt(context.contentResolver, "lock_screen_show_notifications", 1) != 0
    } catch (e: Exception) {
      null
    }

  private fun open(context: Context, intent: Intent): Boolean =
    try {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    } catch (e: Exception) {
      // Not on this phone, or not open to other apps.
      false
    }

  // Each maker's screens, newest first; a phone has at most one of them.
  private fun makerScreens(maker: String): List<ComponentName> = when (maker) {
    "huawei", "honor" -> listOf(
      ComponentName("com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
      ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
      ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"),
      ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
    )
    "xiaomi", "redmi", "poco" -> listOf(
      ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
    )
    "oppo", "realme", "oneplus" -> listOf(
      ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
      ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
      ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
      ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"),
    )
    "vivo", "iqoo" -> listOf(
      ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
      ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"),
      ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
    )
    "samsung" -> listOf(
      ComponentName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity"),
      ComponentName("com.samsung.android.sm", "com.samsung.android.sm.battery.ui.BatteryActivity"),
    )
    "asus" -> listOf(
      ComponentName("com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity"),
      ComponentName("com.asus.mobilemanager", "com.asus.mobilemanager.entry.FunctionActivity"),
    )
    else -> emptyList()
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

  // Turns the screen on, if it is off or shows the screen saver, for as long as a call rings at
  // most: Android ends the screen saver as the screen wakes, and shows the call notice, or
  // Erevos's own call screen when it was in front.
  @Suppress("DEPRECATION")
  private fun wakeForRing(context: Context) {
    val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
    if (power.isInteractive && !dreaming) return
    runCatching {
      ringWake?.let { if (it.isHeld) it.release() }
      ringWake = power.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP, "erevos:ring").also {
        it.setReferenceCounted(false)
        it.acquire(RING_WAKE_MS)
      }
    }
  }

  private fun showOverLock(on: Boolean) {
    overLock = on
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread { setOverLock(activity, on) }
  }

  private fun setOverLock(activity: Activity, on: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(on)
      activity.setTurnScreenOn(on)
    } else {
      @Suppress("DEPRECATION")
      val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      if (on) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
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
    // As long as a call rings (lib/call.ts RING_MS).
    const val RING_WAKE_MS = 45_000L
  }
}
