package expo.modules.erevoscall

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build

// The notices Erevos shows: that it keeps receiving while in the background, or that it stopped,
// as Android closed it or its space locked, a call that rings, and that messages came. None says who: no name, no message,
// only what kind of call, or how many messages. Tapping one opens Erevos, which shows the rest
// only once it is open. On a locked phone the messages notice says only "Erevos".
object Notices {
  const val RECEIVING_ID = 7101
  const val RINGING_ID = 7102
  const val MESSAGES_ID = 7103
  private const val STOPPED_ID = 7104
  private const val RECEIVING_CHANNEL = "erevos-receiving"
  const val CALLS_CHANNEL = "erevos-calls"
  const val MESSAGES_CHANNEL = "erevos-messages"
  // The same notice, for messages sent without sound: a channel that never sounds.
  private const val QUIET_CHANNEL = "erevos-messages-quiet"
  // That Erevos stopped receiving in the background, closed by Android or locked: shows, without sound.
  private const val STOPPED_CHANNEL = "erevos-stopped"

  // The app's language, as the app last set it: "el" for Greek, English otherwise. The SMS
  // module reads the same (erevos-sms SmsStore.kt).
  private const val LANG_PREFS = "erevos-lang"

  fun setLanguage(context: Context, lang: String) {
    context.getSharedPreferences(LANG_PREFS, Context.MODE_PRIVATE).edit().putString("lang", lang).apply()
    // The channels' names follow, in the phone's notification settings.
    named = null
    channels(context)
  }

  private fun greek(context: Context) =
    context.getSharedPreferences(LANG_PREFS, Context.MODE_PRIVATE).getString("lang", null) == "el"

  private fun say(context: Context, en: String, el: String) = if (greek(context)) el else en

  // The language the channels were named in at this start.
  private var named: Boolean? = null

  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /** Whether the call notice may show: its channel not turned off. A channel not made yet is made as it should be. */
  fun callsShown(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
    val channel = manager(context).getNotificationChannel(CALLS_CHANNEL) ?: return true
    return channel.importance != NotificationManager.IMPORTANCE_NONE
  }

  /** A channel's settings as the owner left them, for the permissions check; made first if it is
   *  not yet, so its screen in the settings opens. Null before Android 8, which has no channels. */
  fun channelState(context: Context, id: String): Map<String, Any>? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    channels(context)
    val channel = manager(context).getNotificationChannel(id) ?: return null
    return mapOf(
      "importance" to channel.importance,
      "sound" to (channel.sound != null),
      "lockScreen" to channel.lockscreenVisibility,
      "bypassDnd" to channel.canBypassDnd(),
    )
  }

  private fun channels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = manager(context)
    val greek = greek(context)
    if (named != greek) {
      named = greek
      // A channel made again under its id keeps its settings and takes the new name.
      manager.getNotificationChannel(RECEIVING_CHANNEL)?.let { it.name = say(context, "Receiving in the background", "Λήψη στο παρασκήνιο"); manager.createNotificationChannel(it) }
      manager.getNotificationChannel(CALLS_CHANNEL)?.let { it.name = say(context, "Calls", "Κλήσεις"); manager.createNotificationChannel(it) }
      manager.getNotificationChannel(MESSAGES_CHANNEL)?.let { it.name = say(context, "Messages", "Μηνύματα"); manager.createNotificationChannel(it) }
      manager.getNotificationChannel(QUIET_CHANNEL)?.let { it.name = say(context, "Messages without sound", "Μηνύματα χωρίς ήχο"); manager.createNotificationChannel(it) }
      manager.getNotificationChannel(STOPPED_CHANNEL)?.let { it.name = say(context, "Not receiving", "Χωρίς λήψη"); manager.createNotificationChannel(it) }
    }
    if (manager.getNotificationChannel(RECEIVING_CHANNEL) == null) {
      manager.createNotificationChannel(
        NotificationChannel(RECEIVING_CHANNEL, say(context, "Receiving in the background", "Λήψη στο παρασκήνιο"), NotificationManager.IMPORTANCE_MIN).apply {
          setShowBadge(false)
          lockscreenVisibility = Notification.VISIBILITY_SECRET
        },
      )
    }
    if (manager.getNotificationChannel(CALLS_CHANNEL) == null) {
      // The ringtone plays from the app itself (ErevosCallModule), so the channel stays silent and
      // the sound stops the moment the call is answered or ends.
      manager.createNotificationChannel(
        NotificationChannel(CALLS_CHANNEL, say(context, "Calls", "Κλήσεις"), NotificationManager.IMPORTANCE_HIGH).apply {
          setSound(null, null as AudioAttributes?)
          enableVibration(false)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        },
      )
    }
    if (manager.getNotificationChannel(MESSAGES_CHANNEL) == null) {
      manager.createNotificationChannel(
        NotificationChannel(MESSAGES_CHANNEL, say(context, "Messages", "Μηνύματα"), NotificationManager.IMPORTANCE_DEFAULT).apply {
          setShowBadge(true)
          lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        },
      )
    }
    if (manager.getNotificationChannel(QUIET_CHANNEL) == null) {
      manager.createNotificationChannel(
        NotificationChannel(QUIET_CHANNEL, say(context, "Messages without sound", "Μηνύματα χωρίς ήχο"), NotificationManager.IMPORTANCE_LOW).apply {
          setSound(null, null as AudioAttributes?)
          enableVibration(false)
          setShowBadge(true)
          lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        },
      )
    }
    if (manager.getNotificationChannel(STOPPED_CHANNEL) == null) {
      manager.createNotificationChannel(
        NotificationChannel(STOPPED_CHANNEL, say(context, "Not receiving", "Χωρίς λήψη"), NotificationManager.IMPORTANCE_LOW).apply {
          setSound(null, null as AudioAttributes?)
          enableVibration(false)
          setShowBadge(false)
          lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        },
      )
    }
  }

  // Opens Erevos where it was, or starts it.
  private fun opening(context: Context, request: Int): PendingIntent? {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
    return PendingIntent.getActivity(context, request, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  @Suppress("DEPRECATION")
  private fun builder(context: Context, channel: String): Notification.Builder =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, channel) else Notification.Builder(context)

  fun receiving(context: Context): Notification {
    channels(context)
    @Suppress("DEPRECATION")
    return builder(context, RECEIVING_CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Erevos")
      .setContentText(say(context, "Ready for calls and messages", "Έτοιμο για κλήσεις και μηνύματα"))
      .setOngoing(true)
      .setShowWhen(false)
      .setPriority(Notification.PRIORITY_MIN)
      .setVisibility(Notification.VISIBILITY_SECRET)
      .setContentIntent(opening(context, 1))
      .build()
  }

  // Android closed Erevos while it received in the background (ReceiveService), or, `locked`, its
  // space locked and Erevos left the screen with the password asked (lib/background.ts): until it
  // is open again, no call rings and no message comes. On a locked phone it says only "Erevos".
  fun stopped(context: Context, locked: Boolean = false) {
    channels(context)
    @Suppress("DEPRECATION")
    val shown = builder(context, STOPPED_CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Erevos")
      .setShowWhen(false)
      .build()
    @Suppress("DEPRECATION")
    val notification = builder(context, STOPPED_CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Erevos")
      .setContentText(
        if (locked) say(context, "Locked. Open it to receive calls and messages again.", "Κλειδωμένο. Άνοιξέ το για να λαμβάνεις ξανά κλήσεις και μηνύματα.")
        else say(context, "Closed by Android. Open it to receive calls and messages again.", "Το έκλεισε το Android. Άνοιξέ το για να λαμβάνεις ξανά κλήσεις και μηνύματα."),
      )
      .setPriority(Notification.PRIORITY_LOW)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setPublicVersion(shown)
      .setAutoCancel(true)
      .setContentIntent(opening(context, 4))
      .build()
    runCatching { manager(context).notify(STOPPED_ID, notification) }
  }

  fun clearStopped(context: Context) {
    manager(context).cancel(STOPPED_ID)
  }

  fun ring(context: Context, video: Boolean) {
    channels(context)
    val open = opening(context, 2)
    @Suppress("DEPRECATION")
    val notification = builder(context, CALLS_CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(if (video) say(context, "Incoming video call", "Εισερχόμενη βιντεοκλήση") else say(context, "Incoming call", "Εισερχόμενη κλήση"))
      .setContentText(say(context, "Open Erevos to answer", "Άνοιξε το Erevos για να απαντήσεις"))
      .setCategory(Notification.CATEGORY_CALL)
      .setPriority(Notification.PRIORITY_MAX)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(true)
      .setContentIntent(open)
      .setFullScreenIntent(open, true)
      .build()
    manager(context).notify(RINGING_ID, notification)
  }

  fun stopRinging(context: Context) {
    manager(context).cancel(RINGING_ID)
  }

  // Whether the messages notice that shows now has sounded.
  private var sounded = false

  // `count` messages came: each one sounds, as the channel says. While only messages sent without
  // sound (`quiet`) came, it shows on the silent channel; one sent without sound only counts.
  fun messages(context: Context, count: Int, quiet: Boolean) {
    channels(context)
    val manager = manager(context)
    // Swiped away, it shows anew.
    val showing = showing(manager, count)
    if (!showing) sounded = false
    val loud = !quiet || sounded
    // A notice that showed silently is taken away first, or the one that should sound would not.
    if (loud && !sounded && showing) manager.cancel(MESSAGES_ID)
    show(context, count, if (loud) MESSAGES_CHANNEL else QUIET_CHANNEL, quiet)
    if (loud) sounded = true
    Widget.messages(context, count)
  }

  // Some of the messages it counted were read in Erevos: the notice says how many are left, without
  // sound. One that was swiped away stays away.
  fun recountMessages(context: Context, count: Int) {
    if (count <= 0) return clearMessages(context)
    channels(context)
    if (showing(manager(context), count)) show(context, count, if (sounded) MESSAGES_CHANNEL else QUIET_CHANNEL, true)
    Widget.messages(context, count)
  }

  private fun showing(manager: NotificationManager, count: Int) =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) manager.activeNotifications.any { it.id == MESSAGES_ID } else count > 1

  // `silent`: it shows or counts on without sound.
  private fun show(context: Context, count: Int, channel: String, silent: Boolean) {
    val text = if (count == 1) say(context, "New message", "Νέο μήνυμα") else say(context, "$count new messages", "$count νέα μηνύματα")
    @Suppress("DEPRECATION")
    val locked = builder(context, channel)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Erevos")
      .setShowWhen(false)
      .build()
    @Suppress("DEPRECATION")
    val notification = builder(context, channel)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Erevos")
      .setContentText(text)
      .setNumber(count)
      .setCategory(Notification.CATEGORY_MESSAGE)
      .setPriority(Notification.PRIORITY_DEFAULT)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setPublicVersion(locked)
      .setOnlyAlertOnce(silent)
      .setAutoCancel(true)
      .setContentIntent(opening(context, 3))
      .build()
    manager(context).notify(MESSAGES_ID, notification)
  }

  // What plays for a message that came where Erevos shows it.
  private var chiming: Ringtone? = null

  // A message came in the chat or group that shows on the screen: no notice, only the messages
  // channel's own sound, as the owner left it; none while the phone is on silent or vibrate, in
  // Do not disturb, or with Erevos's notices or that channel turned off.
  fun chime(context: Context) {
    channels(context)
    val manager = manager(context)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !manager.areNotificationsEnabled()) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val filter = manager.currentInterruptionFilter
      if (filter != NotificationManager.INTERRUPTION_FILTER_ALL && filter != NotificationManager.INTERRUPTION_FILTER_UNKNOWN) return
    }
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
    if (audio.ringerMode != AudioManager.RINGER_MODE_NORMAL) return
    val sound = (
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = manager.getNotificationChannel(MESSAGES_CHANNEL) ?: return
        if (channel.importance < NotificationManager.IMPORTANCE_DEFAULT) return
        channel.sound
      } else {
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      }
    ) ?: return
    runCatching {
      chiming?.stop()
      chiming = RingtoneManager.getRingtone(context, sound)?.apply {
        audioAttributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        play()
      }
    }
  }

  fun clearMessages(context: Context) {
    sounded = false
    manager(context).cancel(MESSAGES_ID)
    Widget.messages(context, 0)
  }
}
