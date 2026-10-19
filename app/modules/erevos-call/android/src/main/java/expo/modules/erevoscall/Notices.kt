package expo.modules.erevoscall

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build

// The notices Erevos shows: that it keeps receiving while in the background, a call that rings,
// and that messages came while it was in the background. None says who: no name, no message,
// only what kind of call, or how many messages. Tapping one opens Erevos, which shows the rest
// only once it is open. On a locked phone the messages notice says only "Erevos".
object Notices {
  const val RECEIVING_ID = 7101
  const val RINGING_ID = 7102
  const val MESSAGES_ID = 7103
  private const val RECEIVING_CHANNEL = "erevos-receiving"
  private const val CALLS_CHANNEL = "erevos-calls"
  private const val MESSAGES_CHANNEL = "erevos-messages"

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

  // `count` messages came while Erevos was in the background. Sounds once, as the channel says,
  // and stays quiet as the count goes up.
  fun messages(context: Context, count: Int) {
    channels(context)
    val text = if (count == 1) say(context, "New message", "Νέο μήνυμα") else say(context, "$count new messages", "$count νέα μηνύματα")
    @Suppress("DEPRECATION")
    val locked = builder(context, MESSAGES_CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Erevos")
      .setShowWhen(false)
      .build()
    @Suppress("DEPRECATION")
    val notification = builder(context, MESSAGES_CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Erevos")
      .setContentText(text)
      .setNumber(count)
      .setCategory(Notification.CATEGORY_MESSAGE)
      .setPriority(Notification.PRIORITY_DEFAULT)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setPublicVersion(locked)
      .setOnlyAlertOnce(true)
      .setAutoCancel(true)
      .setContentIntent(opening(context, 3))
      .build()
    manager(context).notify(MESSAGES_ID, notification)
  }

  fun clearMessages(context: Context) {
    manager(context).cancel(MESSAGES_ID)
  }
}
