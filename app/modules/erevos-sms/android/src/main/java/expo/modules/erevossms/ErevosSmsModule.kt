package expo.modules.erevossms

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS API for the phone's SMS: being the default SMS app, its conversations, sending, and the
 * hidden SMS invites between Erevos phones. Events are posted to the main looper. Not compiled
 * or run yet.
 */
class ErevosSmsModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  private fun context(): Context = appContext.reactContext ?: throw IllegalStateException("No app context")

  override fun definition() = ModuleDefinition {
    Name("ErevosSms")
    Events("onSms", "onSmsSent", "onSmsDelivered", "onSmsLaterSent", "onInvite")

    OnCreate {
      SmsStore.listener = { name, body -> main.post { sendEvent(name, body) } }
      // What is held for later and due goes now, and the alarm is set again, in case it was lost.
      appContext.reactContext?.applicationContext?.let { app -> Thread { runCatching { LaterSms.sendDue(app) } }.start() }
    }

    OnDestroy {
      SmsStore.listener = null
    }

    Function("status") {
      val context = appContext.reactContext
      mapOf(
        "sdk" to Build.VERSION.SDK_INT,
        "phone" to (context?.packageManager?.hasSystemFeature("android.hardware.telephony") == true),
        "isDefault" to (context != null && SmsStore.isDefault(context)),
        "slots" to (context?.let { SmsStore.slots(it) } ?: 0),
      )
    }

    // Shows Android's question whether Erevos should be the SMS app. The answer shows in status().
    Function("requestDefault") {
      val context = context()
      val activity = appContext.currentActivity ?: throw IllegalStateException("No activity")
      val intent = if (Build.VERSION.SDK_INT >= 29) {
        val roles = context.getSystemService(RoleManager::class.java)
        if (roles == null || !roles.isRoleAvailable(RoleManager.ROLE_SMS)) throw IllegalStateException("This phone has no SMS app role")
        roles.createRequestRoleIntent(RoleManager.ROLE_SMS)
      } else {
        Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, context.packageName)
      }
      activity.startActivityForResult(intent, 4242)
    }

    AsyncFunction("threads") { limit: Int -> SmsStore.threads(context(), limit) }
    AsyncFunction("messages") { address: String, limit: Int -> SmsStore.messages(context(), address, limit) }
    AsyncFunction("markRead") { address: String -> SmsStore.markRead(context(), address) }
    AsyncFunction("send") { address: String, text: String, sim: Int -> SmsStore.send(context(), address, text, sim).toDouble() }
    AsyncFunction("sendMms") { address: String, text: String, data: ByteArray, type: String, sim: Int ->
      MmsStore.send(context(), address, text, if (data.isEmpty()) null else data, type, sim).toDouble()
    }
    AsyncFunction("sims") { SmsStore.sims(context()) }
    AsyncFunction("contactNames") { numbers: List<String> -> SmsStore.contactNames(context(), numbers) }
    AsyncFunction("sendData") { address: String, data: ByteArray -> SmsStore.sendData(context(), address, data) }
    AsyncFunction("takeInvites") { SmsStore.takeInvites(context()) }
    // SMS sent for later, held by Android until their time (LaterSms.kt).
    AsyncFunction("scheduleLater") { id: String, to: String, text: String, sim: Int, at: Double ->
      LaterSms.schedule(context(), id, to, text, sim, at.toLong())
    }
    AsyncFunction("cancelLater") { id: String -> LaterSms.cancel(context(), id) }
    AsyncFunction("laterState") { ids: List<String> -> LaterSms.state(context(), ids) }
    // Deleting conversations from the phone (the space's Trash).
    AsyncFunction("deleteThread") { address: String, upTo: Double -> SmsStore.deleteThread(context(), address, upTo.toLong()).toDouble() }
  }
}
