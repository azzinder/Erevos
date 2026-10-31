// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoswebcall

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Element Call's window for Erevos's Matrix calls (lib/matrix-calls.ts, lib/element-call-window.ts):
// opens it, hands it the Widget API's messages, and tells what it says. Plain Android, no other
// library; Element Call itself comes from its npm package (build.gradle).
class ErevosWebCallModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ErevosWebCall")

    // A message of the Widget API from Element Call (JSON); where it asks the sound to go
    // ("earpiece", "speaker"); and its window closed without Erevos closing it.
    Events("onMessage", "onAudioDevice", "onClosed")

    OnCreate {
      CallWindow.told = { kind, value ->
        when (kind) {
          "message" -> sendEvent("onMessage", mapOf("message" to value))
          "audio" -> sendEvent("onAudioDevice", mapOf("id" to value))
          "closed" -> sendEvent("onClosed", mapOf<String, Any>())
        }
      }
    }

    OnDestroy {
      CallWindow.told = null
    }

    // Opens Element Call at `url` (its page in the assets, and nothing else), with the ways the
    // sound can go (JSON, as Element Call's controls take them) and the one it goes now. False
    // with nothing to open it from.
    Function("open") { url: String, devices: String, chosen: String ->
      if (!url.startsWith(ElementCallActivity.PAGE)) return@Function false
      val from = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
      val intent = Intent(from, ElementCallActivity::class.java)
        .putExtra(ElementCallActivity.EXTRA_URL, url)
        .putExtra(ElementCallActivity.EXTRA_DEVICES, devices)
        .putExtra(ElementCallActivity.EXTRA_CHOSEN, chosen)
      if (appContext.currentActivity == null) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      from.startActivity(intent)
      true
    }

    Function("post") { message: String ->
      CallWindow.shown?.post(message)
    }

    Function("devices") { devices: String, chosen: String ->
      CallWindow.shown?.setDevices(devices, chosen)
    }

    Function("close") {
      CallWindow.shown?.leave()
    }
  }
}
