package expo.modules.erevosdevice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log

/**
 * A new Erevos is out (lib/release-notice.ts): a notice from Erevos itself, as a message from a
 * contact comes, that says which, and tapped opens Updates, after the password. Its name is no
 * secret: every phone with Erevos is told the same one.
 */
internal object Updates {
  private const val TAG = "ErevosDevice"
  private const val CHANNEL = "erevos-updates"
  private const val NOTICE = 7302

  fun tell(context: Context, name: String) {
    val notifications = context.getSystemService(NotificationManager::class.java) ?: return
    // In the app's language, as the call module keeps it (erevos-call Notices.kt).
    val greek = context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) == "el"
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(CHANNEL, if (greek) "Νέες εκδόσεις" else "New versions", NotificationManager.IMPORTANCE_DEFAULT))
    }
    val title = if (greek) "Βγήκε το Erevos $name" else "Erevos $name is out"
    val text = if (greek) "Πάτα για να δεις τι νέο έχει και να ενημερώσεις" else "Tap to see what is new and update"
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("erevos://updates")).setPackage(context.packageName)
    val launch = if (open.resolveActivity(context.packageManager) != null) open else context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    val tap = PendingIntent.getActivity(context, NOTICE, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(context)
    val notice = builder
      .setSmallIcon(R.drawable.erevos_device_notice)
      .setContentTitle(title)
      .setContentText(text)
      .setCategory(Notification.CATEGORY_RECOMMENDATION)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(tap)
      .setAutoCancel(true)
      .build()
    try {
      notifications.notify(NOTICE, notice)
    } catch (_: SecurityException) {
      // Notifications are not allowed: the new version shows at the top of the chats.
      Log.i(TAG, "A new version notice was not allowed")
    }
  }
}
