package expo.modules.erevosphone

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.CallLog

/**
 * What Android opens for the phone app: a tel: link to call, the phone's call button, the call
 * history from a missed-call notice. Erevos opens on its Phone screen (app/phone.tsx), with the
 * number typed in or on its history, once it is unlocked. Android asks this of a phone app. Not
 * compiled or run yet.
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
