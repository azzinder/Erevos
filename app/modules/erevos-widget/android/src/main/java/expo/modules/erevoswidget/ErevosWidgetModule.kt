package expo.modules.erevoswidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS API for the home-screen widget (ErevosWidget): counting again, and the order of its buttons. */
class ErevosWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ErevosWidget")

    Function("refresh") {
      appContext.reactContext?.applicationContext?.let { ErevosWidget.refreshAll(it) }
    }

    // The buttons from left to right, as ["phone", "sms", "messages", "contacts"].
    Function("order") {
      appContext.reactContext?.applicationContext?.let { ErevosWidget.order(it) }
    }

    Function("setOrder") { order: List<String> ->
      appContext.reactContext?.applicationContext?.let { ErevosWidget.setOrder(it, order) } ?: false
    }
  }
}
