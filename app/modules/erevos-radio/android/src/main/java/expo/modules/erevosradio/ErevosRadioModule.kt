package expo.modules.erevosradio

import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS API for the phone radio. Events are posted to the main looper, so JS
 * always receives them on its own thread. Not compiled or run yet.
 */
class ErevosRadioModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var ble: BleLink? = null
  private var link: WifiAwareLink? = null

  override fun definition() = ModuleDefinition {
    Name("ErevosRadio")
    Events("onStatus", "onPeer", "onText")

    Function("status") {
      val context = appContext.reactContext
      mapOf(
        "sdk" to Build.VERSION.SDK_INT,
        "wifiAware" to (context != null && WifiAwareLink.isAvailable(context)),
        "ble" to (context != null && BleBeacon.isAvailable(context)),
        "running" to (ble != null || link != null),
      )
    }

    Function("start") {
      val context = appContext.reactContext ?: throw IllegalStateException("No app context")
      stopRadio()
      val log: (String) -> Unit = { text ->
        main.post { sendEvent("onStatus", mapOf("text" to text)) }
      }
      ble = BleLink(
        context,
        onPresence = { address ->
          main.post { sendEvent("onPeer", mapOf("id" to "ble-$address", "kind" to "ble")) }
        },
        onLink = { id ->
          main.post { sendEvent("onPeer", mapOf("id" to id, "kind" to "ble-link")) }
        },
        onFrame = { id, payload ->
          val text = String(payload, Charsets.UTF_8)
          main.post { sendEvent("onText", mapOf("peer" to id, "text" to text)) }
        },
        onLog = log,
      ).also { it.start() }
      link = WifiAwareLink(
        context,
        onLink = { id ->
          main.post { sendEvent("onPeer", mapOf("id" to id, "kind" to "wifi-aware")) }
        },
        onFrame = { id, payload ->
          val text = String(payload, Charsets.UTF_8)
          main.post { sendEvent("onText", mapOf("peer" to id, "text" to text)) }
        },
        onLog = log,
      ).also { it.start() }
    }

    Function("stop") {
      stopRadio()
    }

    Function("sendText") { peer: String, text: String ->
      val bytes = text.toByteArray(Charsets.UTF_8)
      if (peer.startsWith(BleLink.LINK_PREFIX)) {
        ble?.send(peer, bytes) ?: false
      } else {
        link?.send(peer, bytes) ?: false
      }
    }

    OnDestroy {
      stopRadio()
    }
  }

  private fun stopRadio() {
    ble?.stop()
    ble = null
    link?.stop()
    link = null
  }
}
