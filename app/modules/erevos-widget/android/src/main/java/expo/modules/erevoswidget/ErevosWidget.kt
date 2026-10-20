package expo.modules.erevoswidget

import android.Manifest
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.CallLog
import android.provider.Telephony
import android.view.View
import android.widget.RemoteViews

/**
 * Erevos's widget on the home screen: Phone, SMS, Messages and Contacts, each opening Erevos at that
 * screen, behind its password like any link. Over the first three, how many are new: missed calls
 * (Android's call history), unread SMS and MMS (Android's own store) and Erevos messages (as the
 * messages notice counts them, erevos-call Notices.kt). Never who, or what they say. Counts again
 * on Android's update, and on REFRESH, which the other modules send it by class name. Compiled
 * against Android's classes only; not run yet.
 */
class ErevosWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    draw(context, manager, ids)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == REFRESH) refreshAll(context)
  }

  companion object {
    const val REFRESH = "expo.modules.erevoswidget.REFRESH"

    /** Where Erevos keeps how many messages its notice counts (erevos-call Notices.kt). */
    const val PREFS = "erevos-widget"
    const val MESSAGES = "messages"

    /** Draws every Erevos widget on the home screen again, if there is any. */
    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context) ?: return
      val ids = manager.getAppWidgetIds(ComponentName(context, ErevosWidget::class.java))
      if (ids.isNotEmpty()) draw(context, manager, ids)
    }

    private fun draw(context: Context, manager: AppWidgetManager, ids: IntArray) {
      val missed = missedCalls(context)
      val sms = unreadSms(context)
      val messages = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(MESSAGES, 0)
      val words = words(context)
      for (id in ids) {
        val views = RemoteViews(context.packageName, R.layout.erevos_widget)
        views.setTextViewText(R.id.erevos_widget_phone_label, words[0])
        views.setTextViewText(R.id.erevos_widget_sms_label, words[1])
        views.setTextViewText(R.id.erevos_widget_messages_label, words[2])
        views.setTextViewText(R.id.erevos_widget_contacts_label, words[3])
        count(views, R.id.erevos_widget_phone_count, missed)
        count(views, R.id.erevos_widget_sms_count, sms)
        count(views, R.id.erevos_widget_messages_count, messages)
        // With missed calls, the Phone opens on them.
        views.setOnClickPendingIntent(R.id.erevos_widget_phone, opening(context, if (missed > 0) "erevos://phone?tab=recents" else "erevos://phone", 1))
        views.setOnClickPendingIntent(R.id.erevos_widget_sms, opening(context, "erevos://?show=sms", 2))
        views.setOnClickPendingIntent(R.id.erevos_widget_messages, opening(context, "erevos://?show=erevos", 3))
        views.setOnClickPendingIntent(R.id.erevos_widget_contacts, opening(context, "erevos://contacts", 4))
        manager.updateAppWidget(id, views)
      }
    }

    private fun count(views: RemoteViews, id: Int, n: Int) {
      if (n <= 0) {
        views.setViewVisibility(id, View.GONE)
        return
      }
      views.setTextViewText(id, if (n > 99) "99+" else n.toString())
      views.setViewVisibility(id, View.VISIBLE)
    }

    private fun opening(context: Context, link: String, code: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      return PendingIntent.getActivity(context, code, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun may(context: Context, permission: String) = context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

    /** The missed calls Android's call history marks new; 0 while Erevos may not read it. */
    private fun missedCalls(context: Context): Int {
      if (!may(context, Manifest.permission.READ_CALL_LOG)) return 0
      return rows(context, CallLog.Calls.CONTENT_URI, "${CallLog.Calls.TYPE} = ? AND ${CallLog.Calls.NEW} = 1", arrayOf(CallLog.Calls.MISSED_TYPE.toString()))
    }

    /** The SMS and MMS not read yet; 0 while Erevos may not read them. */
    private fun unreadSms(context: Context): Int {
      if (!may(context, Manifest.permission.READ_SMS)) return 0
      return rows(context, Telephony.Sms.Inbox.CONTENT_URI, "${Telephony.Sms.READ} = 0", null) +
        rows(context, Telephony.Mms.Inbox.CONTENT_URI, "${Telephony.Mms.READ} = 0", null)
    }

    private fun rows(context: Context, uri: Uri, selection: String, args: Array<String>?): Int =
      try {
        context.contentResolver.query(uri, arrayOf("_id"), selection, args, null)?.use { it.count } ?: 0
      } catch (_: Exception) {
        0
      }

    /** The buttons' words, in Erevos's language (the call module keeps it, erevos-call Notices.kt). */
    private fun words(context: Context): List<String> =
      when (context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null)) {
        "el" -> listOf("Τηλέφωνο", "SMS", "Μηνύματα", "Επαφές")
        "de" -> listOf("Telefon", "SMS", "Nachrichten", "Kontakte")
        "es" -> listOf("Teléfono", "SMS", "Mensajes", "Contactos")
        "fr" -> listOf("Téléphone", "SMS", "Messages", "Contacts")
        "it" -> listOf("Telefono", "SMS", "Messaggi", "Contatti")
        "pt" -> listOf("Telefone", "SMS", "Mensagens", "Contatos")
        else -> listOf("Phone", "SMS", "Messages", "Contacts")
      }
  }
}
