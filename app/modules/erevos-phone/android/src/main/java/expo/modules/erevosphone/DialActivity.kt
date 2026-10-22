package expo.modules.erevosphone

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.CallLog

/**
 * What Android opens for the phone app: a tel: link to call, the phone's call button, the call
 * history from a missed-call notice. Erevos opens on its Phone screen (app/phone.tsx), with the
 * number typed in or on its history, once it is unlocked. Android asks this of a phone app.
 */
class DialActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val link = Uri.Builder().scheme("erevos").authority("phone")
    val data = intent.data
    if (data?.scheme == "tel") {
      val number = Uri.decode(data.schemeSpecificPart ?: "").substringBefore('?').trim()
      if (number.isNotEmpty()) link.appendQueryParameter("number", number)
    } else if (intent.type == CallLog.Calls.CONTENT_TYPE) {
      link.appendQueryParameter("tab", "recents")
    }
    try {
      startActivity(Intent(Intent.ACTION_VIEW, link.build()).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      packageManager.getLaunchIntentForPackage(packageName)?.let(::startActivity)
    }
    finish()
  }
}

/**
 * Erevos's Phone as an app of its own in the phone's launcher, with an icon of its own: it opens
 * the keypad (erevos://phone), behind Erevos's lock, and closes at once.
 */
class PhoneOpenActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    try {
      startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("erevos://phone")).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      packageManager.getLaunchIntentForPackage(packageName)?.let(::startActivity)
    }
    finish()
  }
}
