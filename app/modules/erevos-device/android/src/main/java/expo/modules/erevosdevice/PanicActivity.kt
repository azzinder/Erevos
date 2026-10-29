package expo.modules.erevosdevice

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * Erevos as a PanicKit responder (Panic.kt): a panic app the owner chose (Ripple, PanicKit's
 * trigger apps) asks Erevos to wipe everything, with no screen of Erevos showing.
 *
 * Who asks is told by Android itself, not by the request: a panic app sends PanicKit's intents
 * with startActivityForResult, so getCallingActivity names its package, which a request cannot
 * fake. A request sent without it, as to responders not connected, names no one and does nothing.
 * - TRIGGER: wipes, only while the panic setting is on and the app is the one trusted, signed as
 *   it was when the owner said yes.
 * - CONNECT: a panic app asks to be the one. Nothing is trusted yet: Erevos opens its panic
 *   screen (erevos://panic), after the password, where the owner says yes or no.
 * - DISCONNECT: the trusted app lets go; from any other, nothing.
 * Nothing is shown and nothing is said back beyond the result, so a request from anyone else
 * learns nothing, not even whether a panic app is set.
 */
class PanicActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val caller = callingActivity?.packageName?.takeIf { it != packageName }
    var result = RESULT_CANCELED
    when (intent?.action) {
      Panic.ACTION_TRIGGER -> if (caller != null && Panic.trusted(this, caller)) {
        result = RESULT_OK
        Panic.wipe(this)
      }
      Panic.ACTION_CONNECT -> if (caller != null) {
        Panic.ask(this, caller)
        result = RESULT_OK
        val open = Intent(Intent.ACTION_VIEW, Uri.parse("erevos://panic")).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { startActivity(open) }
      }
      Panic.ACTION_DISCONNECT -> if (caller != null && caller == Panic.trigger(this)) {
        Panic.forget(this)
        result = RESULT_OK
      }
    }
    setResult(result)
    if (result == RESULT_OK && intent?.action == Panic.ACTION_TRIGGER) finishAndRemoveTask() else finish()
  }
}
