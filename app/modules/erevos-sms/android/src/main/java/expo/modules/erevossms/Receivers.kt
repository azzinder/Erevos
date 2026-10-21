package expo.modules.erevossms

import android.app.Activity
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.IBinder
import android.provider.Telephony

// The parts Android looks for in a default SMS app.

/** A text that came. Only the default SMS app gets SMS_DELIVER, and it keeps the message. */
class SmsDeliverReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_DELIVER_ACTION) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (parts.isEmpty()) return
    val address = parts[0].originatingAddress ?: return
    val text = parts.joinToString("") { it.messageBody ?: "" }
    SmsStore.received(context, address, text, parts[0].timestampMillis, simOf(intent))
  }
}

/** A piece of an SMS invite from another Erevos phone, on the invite port. */
class InviteReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    for (part in parts) {
      val address = part.originatingAddress ?: continue
      val data = part.userData ?: continue
      SmsStore.invite(context, address, data)
    }
  }
}

/** Whether a text went. */
class SentReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    SmsStore.sent(context, intent.getLongExtra("id", -1L), resultCode == Activity.RESULT_OK)
  }
}

/** The network's delivery report of a text that went. */
class DeliveredReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    SmsStore.delivered(context, intent.getLongExtra("id", -1L), intent.getByteArrayExtra("pdu"), intent.getStringExtra("format"))
  }
}

/** "Reply with a message" from the incoming call screen. */
class RespondViaSmsService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val text = intent?.getStringExtra(Intent.EXTRA_TEXT)
    val address = intent?.data?.let(::recipients)
    if (!text.isNullOrEmpty() && !address.isNullOrEmpty()) {
      try {
        SmsStore.send(this, address, text)
      } catch (_: Exception) {
        // Nothing to tell: the call screen has gone.
      }
    }
    stopSelf(startId)
    return START_NOT_STICKY
  }
}

/** Another app asks to write an SMS: the app opens on that number's conversation. */
class ComposeActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val to = intent.data?.let(::recipients) ?: ""
    val text = intent.getStringExtra("sms_body") ?: intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
    val link = Uri.Builder().scheme("erevos").authority("sms")
      .appendQueryParameter("to", to)
      .appendQueryParameter("text", text)
      .build()
    try {
      startActivity(Intent(Intent.ACTION_VIEW, link).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      packageManager.getLaunchIntentForPackage(packageName)?.let(::startActivity)
    }
    finish()
  }
}

/** The number in an sms:, smsto:, mms: or mmsto: address, the first one if there are several. */
internal fun recipients(uri: Uri): String =
  Uri.decode(uri.schemeSpecificPart ?: "").substringBefore('?').split(',', ';').first().trim()
