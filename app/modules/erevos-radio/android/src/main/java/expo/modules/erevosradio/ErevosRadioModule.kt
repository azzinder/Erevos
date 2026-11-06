// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS API for the phone radio. Events are posted to the main looper, so JS
 * always receives them on its own thread.
 */
class ErevosRadioModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var ble: BleLink? = null
  private var link: WifiAwareLink? = null
  private var lan: LanLink? = null
  private var direct: WifiDirectLink? = null
  private var quiet = false
  private var mesh: MeshtasticLink? = null
  // The chunks of large files to and from the account's devices on the same Wi-Fi (ChunkChannel).
  private var chunks: ChunkChannel? = null
  private val chunkTakers = java.util.concurrent.ConcurrentHashMap<String, ChunkChannel.Taker>()

  override fun definition() = ModuleDefinition {
    Name("ErevosRadio")
    Events("onStatus", "onPeer", "onText", "onMesh")

    Function("status") {
      val context = appContext.reactContext
      mapOf(
        "sdk" to Build.VERSION.SDK_INT,
        "wifiAware" to (context != null && WifiAwareLink.isAvailable(context)),
        "ble" to (context != null && BleBeacon.isAvailable(context)),
        "running" to (ble != null || link != null),
        "lan" to (lan != null),
        "direct" to (direct != null),
      )
    }

    // Bluetooth, and with `aware` (left out: on) Wi-Fi Aware too.
    Function("start") { aware: Boolean? ->
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
      ).also {
        it.start()
        it.setQuiet(quiet)
      }
      if (aware == false) return@Function
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
      ).also {
        it.start()
        it.setQuiet(quiet)
      }
    }

    Function("stop") {
      stopRadio()
    }

    // The same Wi-Fi or hotspot (LanLink), on its own: it needs no radio permission.
    Function("startLan") {
      val context = appContext.reactContext ?: throw IllegalStateException("No app context")
      lan?.stop()
      lan = LanLink(
        context,
        onLink = { id ->
          main.post { sendEvent("onPeer", mapOf("id" to id, "kind" to "lan")) }
        },
        onFrame = { id, payload ->
          val text = String(payload, Charsets.UTF_8)
          main.post { sendEvent("onText", mapOf("peer" to id, "text" to text)) }
        },
        onLog = { text -> main.post { sendEvent("onStatus", mapOf("text" to text)) } },
      ).also {
        it.start()
        it.setQuiet(quiet)
      }
    }

    Function("stopLan") {
      direct?.stop()
      direct = null
      lan?.stop()
      lan = null
    }

    // Wi-Fi Direct with Erevos phones that share no Wi-Fi (WifiDirectLink), on which the same
    // Wi-Fi link (startLan) links them. False without it running.
    Function("startDirect") {
      val context = appContext.reactContext ?: throw IllegalStateException("No app context")
      val sameWifi = lan ?: return@Function false
      direct?.stop()
      direct = WifiDirectLink(context, sameWifi) { text -> main.post { sendEvent("onStatus", mapOf("text" to text)) } }.also {
        it.start()
        it.setQuiet(quiet)
      }
      true
    }

    Function("stopDirect") {
      direct?.stop()
      direct = null
    }

    // While Erevos is in the background: Bluetooth at low power, found with the screen off too, the
    // same Wi-Fi said and heard less often, and Wi-Fi Direct and Wi-Fi Aware looking now and then.
    // The links that are up stay up.
    Function("setQuiet") { on: Boolean ->
      quiet = on
      ble?.setQuiet(on)
      link?.setQuiet(on)
      lan?.setQuiet(on)
      direct?.setQuiet(on)
    }

    // A Meshtastic LoRa radio (MeshtasticLink): bytes to and from it go as base64, on onMesh.
    Function("meshScan") {
      meshLink().scan()
    }

    Function("meshConnect") { address: String ->
      meshLink().connect(address)
    }

    Function("meshDisconnect") {
      mesh?.disconnect()
    }

    Function("meshSend") { data: String ->
      val bytes = try {
        Base64.decode(data, Base64.NO_WRAP)
      } catch (e: IllegalArgumentException) {
        null
      }
      bytes != null && mesh?.send(bytes) == true
    }

    // Gives chunks from the app's files (on) or stops: answers the port and this phone's addresses.
    AsyncFunction("chunksServe") { on: Boolean ->
      if (!on) {
        chunks?.stop()
        chunks = null
        for (t in chunkTakers.values) t.close()
        chunkTakers.clear()
        return@AsyncFunction mapOf("port" to 0, "hosts" to emptyList<String>())
      }
      val channel = chunkChannel()
      mapOf("port" to channel.start(), "hosts" to ChunkChannel.addresses())
    }

    Function("chunksAllow") { key: String, ids: List<String> ->
      chunks?.allow(key, ids)
    }

    Function("chunksForget") { key: String ->
      chunks?.forget(key)
    }

    // Takes one chunk into the app's files, kept only once it opens: true, false when the other does
    // not have it whole; rejects when cut off.
    AsyncFunction("chunksTake") { hosts: List<String>, port: Int, key: String, id: String, n: Double, fileKey: String, size: Int ->
      val context = appContext.reactContext ?: throw IllegalStateException("No app context")
      val at = "${hosts.joinToString(",")} $port $key"
      try {
        val taker = chunkTakers[at] ?: chunkChannel().open(hosts, port, key).also { chunkTakers[at] = it }
        taker.take(context.filesDir, id, n.toLong(), fileKey, size)
      } catch (e: java.io.IOException) {
        chunkTakers.remove(at)?.close()
        throw e
      }
    }

    Function("sendText") { peer: String, text: String ->
      val bytes = text.toByteArray(Charsets.UTF_8)
      if (peer.startsWith(BleLink.LINK_PREFIX)) {
        ble?.send(peer, bytes) ?: false
      } else if (peer.startsWith(LanLink.LINK_PREFIX)) {
        lan?.send(peer, bytes) ?: false
      } else {
        link?.send(peer, bytes) ?: false
      }
    }

    OnDestroy {
      stopRadio()
      direct?.stop()
      direct = null
      lan?.stop()
      lan = null
      mesh?.disconnect()
      mesh = null
      chunks?.stop()
      chunks = null
    }
  }

  private fun chunkChannel(): ChunkChannel {
    chunks?.let { return it }
    val context = appContext.reactContext ?: throw IllegalStateException("No app context")
    return ChunkChannel(context.filesDir).also { chunks = it }
  }

  private fun meshLink(): MeshtasticLink {
    mesh?.let { return it }
    val context = appContext.reactContext ?: throw IllegalStateException("No app context")
    return MeshtasticLink(
      context,
      onFound = { address, name ->
        main.post { sendEvent("onMesh", mapOf("kind" to "found", "address" to address, "name" to name)) }
      },
      onState = { state, detail ->
        main.post { sendEvent("onMesh", mapOf("kind" to "state", "state" to state, "detail" to detail)) }
      },
      onData = { bytes ->
        val data = Base64.encodeToString(bytes, Base64.NO_WRAP)
        main.post { sendEvent("onMesh", mapOf("kind" to "data", "data" to data)) }
      },
      onLog = { text -> main.post { sendEvent("onStatus", mapOf("text" to text)) } },
    ).also { mesh = it }
  }

  private fun stopRadio() {
    ble?.stop()
    ble = null
    link?.stop()
    link = null
  }
}
