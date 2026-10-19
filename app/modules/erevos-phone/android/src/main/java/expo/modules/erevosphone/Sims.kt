package expo.modules.erevosphone

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager

/** A way the phone can call: a SIM, as Telecom names it. `id` is what the call history keeps
 *  (CallLog.Calls.PHONE_ACCOUNT_ID); `slot` counts from 0, -1 when it is no SIM's. */
internal class Account(val handle: PhoneAccountHandle, val id: String, val label: String, val slot: Int)

/**
 * The SIMs the phone can call on, for choosing one per call. Telecom shows them only once Erevos
 * may read the phone's state; without that, the list is empty and calls go on the phone's default.
 * Not compiled or run yet.
 */
internal object Sims {
  fun accounts(context: Context): List<Account> {
    if (context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return emptyList()
    val telecom = context.getSystemService(TelecomManager::class.java) ?: return emptyList()
    val handles = try {
      telecom.callCapablePhoneAccounts
    } catch (_: SecurityException) {
      emptyList()
    }
    return handles.map { handle ->
      val label = runCatching { telecom.getPhoneAccount(handle)?.label?.toString() }.getOrNull() ?: ""
      Account(handle, handle.id, label, slot(context, handle))
    }.sortedBy { if (it.slot < 0) Int.MAX_VALUE else it.slot }
  }

  /** How many SIMs the phone can hold, without asking for any permission. */
  fun slots(context: Context): Int {
    val phone = context.getSystemService(TelephonyManager::class.java) ?: return 0
    return if (Build.VERSION.SDK_INT >= 30) phone.activeModemCount else @Suppress("DEPRECATION") phone.phoneCount
  }

  /** The account with this id, if the phone still has it. */
  fun find(context: Context, id: String): Account? = accounts(context).firstOrNull { it.id == id }

  /** "SIM 1", "SIM 2", or the account's own name when it is no SIM's. */
  fun label(account: Account): String = if (account.slot >= 0) "SIM ${account.slot + 1}" else account.label

  /** The SIM slot of an account, or -1. */
  private fun slot(context: Context, handle: PhoneAccountHandle): Int {
    val sub = if (Build.VERSION.SDK_INT >= 30) {
      runCatching { context.getSystemService(TelephonyManager::class.java)?.getSubscriptionId(handle) }.getOrNull()
    } else {
      // Before Android 11, a SIM's account is named by its subscription id on most phones.
      handle.id.toIntOrNull()
    } ?: return -1
    if (sub == SubscriptionManager.INVALID_SUBSCRIPTION_ID) return -1
    return try {
      context.getSystemService(SubscriptionManager::class.java)?.getActiveSubscriptionInfo(sub)?.simSlotIndex ?: -1
    } catch (_: SecurityException) {
      -1
    }
  }
}
