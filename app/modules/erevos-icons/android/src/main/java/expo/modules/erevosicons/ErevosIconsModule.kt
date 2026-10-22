package expo.modules.erevosicons

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The colour of each of Erevos's launcher icons (Appearance → Launcher icons). Android draws an
// app's icons from its manifest only, so every colour of every icon is an activity-alias there,
// all but one turned off: Erevos's own in the app's manifest (plugins/with-launcher-icons.js), the
// others next to Phone's, SMS's and Contacts's activities in their modules. A colour is chosen by
// turning its alias on and the others off. The choice is the phone's, not a space's: the icons show
// before Erevos is unlocked.
class ErevosIconsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ErevosIcons")

    // Each icon's colour as the launcher shows it now, as { erevos: "red", phone: "green", … }.
    Function("colors") {
      val context = context() ?: return@Function null
      ICONS.mapValues { (icon, _) -> colorOf(context, icon) }
    }

    // Shows the icon in that colour: the new alias goes on before the old one goes off, so the
    // launcher always has one. False for an unknown icon or colour.
    Function("setColor") { icon: String, color: String ->
      val context = context() ?: return@Function false
      if (icon !in ICONS || color !in COLORS) return@Function false
      val packages = context.packageManager
      packages.setComponentEnabledSetting(component(context, icon, color), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
      for (other in COLORS) {
        if (other == color) continue
        packages.setComponentEnabledSetting(component(context, icon, other), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
      }
      true
    }
  }

  private fun context(): Context? = appContext.reactContext ?: appContext.currentActivity
}

/** The colours, in the order Appearance shows them; "dark" is the first look, a dark tile with a red mark. */
private val COLORS = listOf("red", "orange", "green", "blue", "violet", "dark")

/** Each icon: the colour its manifest turns on, and the alias names (the one on at first keeps the name the icon had before colours). */
private class Icon(val first: String, val name: (Context, String) -> String)

private val ICONS = mapOf(
  "erevos" to Icon("red") { context, color -> "${context.packageName}.ErevosIcon${color.replaceFirstChar(Char::uppercase)}" },
  "phone" to Icon("green") { _, color -> launcher("expo.modules.erevosphone.PhoneLauncher", color, "green") },
  "sms" to Icon("blue") { _, color -> launcher("expo.modules.erevossms.SmsLauncher", color, "blue") },
  "contacts" to Icon("violet") { _, color -> launcher("expo.modules.erevoscontacts.ContactsLauncher", color, "violet") },
)

private fun launcher(prefix: String, color: String, first: String) =
  if (color == first) "${prefix}Activity" else prefix + color.replaceFirstChar(Char::uppercase)

private fun component(context: Context, icon: String, color: String) =
  ComponentName(context.packageName, ICONS.getValue(icon).name(context, color))

/** The colour whose alias is on: turned on here, or on by the manifest and never changed. */
private fun colorOf(context: Context, icon: String): String {
  val packages = context.packageManager
  val first = ICONS.getValue(icon).first
  return COLORS.firstOrNull { color ->
    when (packages.getComponentEnabledSetting(component(context, icon, color))) {
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
      PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> color == first
      else -> false
    }
  } ?: first
}
