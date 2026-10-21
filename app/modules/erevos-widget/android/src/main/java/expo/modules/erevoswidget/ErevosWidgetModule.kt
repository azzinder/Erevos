package expo.modules.erevoswidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS API for the home-screen widget (ErevosWidget): counting again. */
class ErevosWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ErevosWidget")

    Function("refresh") {
      appContext.reactContext?.applicationContext?.let { ErevosWidget.refreshAll(it) }
    }
  }
}
