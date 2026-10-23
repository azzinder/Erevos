package expo.modules.erevosicons

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

// Erevos's own icon in the launcher opens its chats, as SMS's opens the SMS and Phone's the keypad.
// Its aliases start MainActivity itself, with no link (plugins/with-launcher-icons.js), so Erevos
// already open showed whatever it showed last: the SMS after SMS's icon, the Phone after Phone's.
// A tap on it becomes the link to its chats (ICON_LINK in lib/open-link.ts), before React
// Native's linking reads it; the app leaves one of its chats open (app/_layout.tsx).
class ErevosIconsPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> {
    return listOf(IconTap)
  }
}

private object IconTap : ReactActivityLifecycleListener {
  // Erevos started by the tap. Brought back after Android stopped it, it shows what it showed.
  override fun onCreate(activity: Activity?, savedInstanceState: Bundle?) {
    if (savedInstanceState == null) activity?.intent?.let(::asLink)
  }

  // Erevos already running.
  override fun onNewIntent(intent: Intent?): Boolean {
    intent?.let(::asLink)
    return false
  }
}

private const val LINK = "erevos://?show=erevos&from=launcher"

/**
 * A launcher's tap: MAIN and LAUNCHER with no link, and the flag launchers add (Android's own
 * service for launchers too). What opens Erevos where it was, as a call's or an SMS's notice
 * (getLaunchIntentForPackage), has no such flag, and Android's recent apps sends no intent.
 */
private fun asLink(intent: Intent) {
  if (intent.action != Intent.ACTION_MAIN || intent.data != null || !intent.hasCategory(Intent.CATEGORY_LAUNCHER)) return
  if ((intent.flags and Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED) == 0) return
  if ((intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return
  intent.setAction(Intent.ACTION_VIEW)
  intent.setData(Uri.parse(LINK))
}
