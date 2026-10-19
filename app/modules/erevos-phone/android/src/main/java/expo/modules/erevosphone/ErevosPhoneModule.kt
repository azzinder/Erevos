package expo.modules.erevosphone

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telecom.TelecomManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS API for the phone's calls: being the phone app, making a call on a SIM, and what Erevos knows
 * of numbers while a space is open. The calls themselves are shown by the native call screen
 * (CallService, CallActivity), which works with Erevos locked. Events are posted to the main
 * looper. Not compiled or run yet.
 */
class ErevosPhoneModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  private fun context(): Context = appContext.reactContext ?: throw IllegalStateException("No app context")

  override fun definition() = ModuleDefinition {
    Name("ErevosPhone")
    Events("onCalls")

    OnCreate {
      Calls.onCount = { count -> main.post { sendEvent("onCalls", mapOf("count" to count)) } }
    }

    OnDestroy {
      Calls.onCount = null
    }

    Function("status") {
      val context = appContext.reactContext
      mapOf(
        "sdk" to Build.VERSION.SDK_INT,
        "phone" to (context?.packageManager?.hasSystemFeature("android.hardware.telephony") == true),
        "isDefault" to (context != null && isDefault(context)),
        "calls" to Calls.live().size,
        "slots" to (context?.let { Sims.slots(it) } ?: 0),
      )
    }

    // Shows Android's question whether Erevos should be the phone app. The answer shows in status().
    Function("requestDefault") {
      val context = context()
      val activity = appContext.currentActivity ?: throw IllegalStateException("No activity")
      val intent = if (Build.VERSION.SDK_INT >= 29) {
        val roles = context.getSystemService(RoleManager::class.java)
        if (roles == null || !roles.isRoleAvailable(RoleManager.ROLE_DIALER)) throw IllegalStateException("This phone has no phone app role")
        roles.createRequestRoleIntent(RoleManager.ROLE_DIALER)
      } else {
        Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, context.packageName)
      }
      activity.startActivityForResult(intent, 4243)
    }

    // The ways the phone can call: its SIMs, once Erevos may read the phone's state.
    AsyncFunction("accounts") {
      Sims.accounts(context()).map { mapOf("id" to it.id, "label" to it.label, "slot" to it.slot.toDouble(), "name" to Sims.label(it)) }
    }

    // Calls `number` on the SIM whose account id is `account`, or on the phone's default for "".
    AsyncFunction("placeCall") { number: String, account: String ->
      val context = context()
      val telecom = context.getSystemService(TelecomManager::class.java) ?: throw IllegalStateException("This phone cannot call")
      val extras = Bundle()
      if (account.isNotEmpty()) Sims.find(context, account)?.let { extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, it.handle) }
      telecom.placeCall(Uri.fromParts("tel", number, null), extras)
    }

    // Back to the call screen, while a call is on.
    Function("showCall") {
      val context = context()
      if (Calls.live().isNotEmpty()) CallActivity.show(context)
    }

    // Names Erevos knows for numbers, while a space is open (index.ts). Memory only.
    Function("setKnownNames") { names: Map<String, String> ->
      Calls.setKnownNames(names)
    }

    Function("clearKnownNames") {
      Calls.setKnownNames(emptyMap())
    }

    Function("forgetKnownNamesAfter") { ms: Double ->
      Calls.forgetKnownNamesAfter(ms.toLong())
    }
  }

  companion object {
    /** Whether Erevos holds the phone app role. */
    fun isDefault(context: Context): Boolean {
      if (Build.VERSION.SDK_INT >= 29) {
        val roles = context.getSystemService(RoleManager::class.java)
        if (roles != null && roles.isRoleAvailable(RoleManager.ROLE_DIALER)) return roles.isRoleHeld(RoleManager.ROLE_DIALER)
      }
      return context.getSystemService(TelecomManager::class.java)?.defaultDialerPackage == context.packageName
    }
  }
}
