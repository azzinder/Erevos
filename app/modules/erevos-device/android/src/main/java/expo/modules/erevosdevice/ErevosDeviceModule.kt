package expo.modules.erevosdevice

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// What a chat asks of the phone itself and React Native does not give: the clipboard, for Copy in
// a message's menu. What is copied is marked sensitive, so Android's notice of a copy (Android 13
// and later) does not show the words. Plain Android, no other library.
class ErevosDeviceModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("ErevosDevice")

    // Puts the text on the clipboard, on the main thread, as Android's clipboard wants. False when
    // there is no app context to reach it from.
    Function("copyText") { text: String ->
      val app = context?.applicationContext ?: return@Function false
      main.post {
        runCatching {
          val clip = ClipData.newPlainText("Erevos", text)
          clip.description.extras = PersistableBundle().apply {
            if (Build.VERSION.SDK_INT >= 33) putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
            else putBoolean("android.content.extra.IS_SENSITIVE", true)
          }
          app.getSystemService(ClipboardManager::class.java)?.setPrimaryClip(clip)
        }
      }
      true
    }
  }
}
