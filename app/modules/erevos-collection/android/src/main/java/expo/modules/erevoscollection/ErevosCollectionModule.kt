// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.app.Activity
import android.content.Context
import android.content.IntentSender
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.DocumentsContract
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// What the Collection (lock/collection-data.ts) asks of Android itself, reading its files where
// they lie, encrypted (SealedFile.kt), never from a plain copy:
// - opening a file with another app through a link that streams it (CollectionProvider.kt);
// - showing a PDF a page at a time from a memory file (PdfPages.kt);
// - playing music and videos with Media3, the list going on with the screen off (Playing.kt,
//   PlayerService.kt), and the video shown in a view of its own (VideoView.kt);
// - asking Android to delete a photo or video from the phone's gallery once it is in the
//   Collection, which Android has the owner confirm (Android 11 and later).
// A file comes from JavaScript as the catalogue keeps it: its id, its key in hex, its chunk size,
// how many chunks and its size. JavaScript's string of the key cannot be zeroed; the bytes made
// from it here are kept only as long as the file is open, and zeroed then.
class ErevosCollectionModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  private val context: Context?
    get() = appContext.reactContext

  // The gallery's delete waiting for the owner's answer in Android's dialog.
  private var deleting: Promise? = null

  // The space locks a while after Erevos leaves the screen (app/_layout.tsx): then what it opened
  // here goes, even if JavaScript does not run then.
  private val lockLater = Runnable { lockNow() }

  private fun lockNow() {
    OpenFiles.forgetAll()
    PdfPages.closeAll()
    Playing.onMain { Playing.locked(context) }
  }

  override fun definition() = ModuleDefinition {
    Name("ErevosCollection")

    // The player's state as it changes (Playing.state): never a file's name.
    Events("onPlayer")

    OnCreate {
      Playing.onState = { state -> runCatching { sendEvent("onPlayer", state) } }
    }

    OnDestroy {
      Playing.onState = null
      main.removeCallbacks(lockLater)
    }

    // The owner's answer to Android's dialog: whether the gallery's originals were deleted.
    OnActivityResult { _, payload ->
      if (payload.requestCode != DELETE_REQUEST) return@OnActivityResult
      val promise = deleting ?: return@OnActivityResult
      deleting = null
      promise.resolve(if (payload.resultCode == Activity.RESULT_OK) "deleted" else "kept")
    }

    // A link another app can open the file by, streamed as it is decrypted, and its token, to
    // forget it. The link is the app's package and ".collection", the token, and the file's name.
    Function("openWith") { file: Map<String, Any?>, name: String, mime: String ->
      val app = context ?: throw IllegalStateException("No app")
      val (token, uri) = OpenFiles.add(app.packageName, sealed(file), name, mime)
      mapOf("token" to token, "uri" to uri.toString())
    }

    // Forgets one link: the other app can no longer read it.
    Function("forget") { token: String ->
      OpenFiles.forget(token)
    }

    // Forgets every link and closes every PDF: the Collection's screen closed.
    Function("forgetAll") {
      OpenFiles.forgetAll()
      PdfPages.closeAll()
    }

    // The space locked or closed: what forgetAll forgets, and the list playing stops only when
    // the owner chose so.
    Function("locked") {
      main.removeCallbacks(lockLater)
      lockNow()
    }

    // The space locks in `ms` unless Erevos shows again first (-1): what `locked` does happens then.
    Function("lockAfter") { ms: Double ->
      main.removeCallbacks(lockLater)
      if (ms >= 0) main.postDelayed(lockLater, ms.toLong())
    }

    // The panic button: everything stops and every key here goes, at once.
    Function("panic") {
      main.removeCallbacks(lockLater)
      OpenFiles.forgetAll()
      PdfPages.closeAll()
      Playing.onMain { Playing.stop(context) }
    }

    // Whether a PDF can be shown here: Android 11 and later, which have memory files.
    Function("pdfAvailable") { PdfPages.available }

    // Opens a PDF: a handle to its pages and how many there are.
    AsyncFunction("pdfOpen") { file: Map<String, Any?> ->
      val app = context ?: throw IllegalStateException("No app")
      // Its key goes as soon as the PDF is in its memory file.
      val sealed = sealed(file)
      try {
        val (handle, pages) = PdfPages.open(sealed, app.filesDir)
        mapOf("handle" to handle, "pages" to pages)
      } finally {
        sealed.close()
      }
    }

    // One page as a picture `width` pixels wide: base64 PNG, or JPEG ("jpeg"), and its size.
    AsyncFunction("pdfPage") { handle: String, index: Int, width: Int, format: String ->
      PdfPages.page(handle, index, width, format)
    }

    Function("pdfClose") { handle: String ->
      PdfPages.close(handle)
    }

    // Plays the list from `start`: each item a file as above with its name, type and whether it
    // is a video. `showTitle`: the notice shows the file's name, else `neutral`. `stopOnLock`:
    // the list stops when the space locks. `stopLabel`: the word on the notice's Stop.
    AsyncFunction("playList") { list: List<Map<String, Any?>>, start: Int, options: Map<String, Any?> ->
      val app = context ?: throw IllegalStateException("No app")
      val items = mutableListOf<Playing.Item>()
      try {
        for (entry in list) {
          val name = entry["name"] as? String ?: ""
          val mime = entry["mime"] as? String ?: ""
          items += Playing.Item(sealed(entry), name, mime, entry["video"] == true)
        }
      } catch (e: Exception) {
        for (item in items) item.file.close()
        throw e
      }
      Playing.stopOnLock = options["stopOnLock"] == true
      Playing.stopLabel = options["stopLabel"] as? String ?: ""
      Playing.play(app, items, start, options["showTitle"] == true, options["neutral"] as? String ?: "")
      Playing.state()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pause") { Playing.pause() }.runOnQueue(Queues.MAIN)
    AsyncFunction("resume") { Playing.resume() }.runOnQueue(Queues.MAIN)
    AsyncFunction("next") { Playing.next() }.runOnQueue(Queues.MAIN)
    AsyncFunction("previous") { Playing.previous() }.runOnQueue(Queues.MAIN)

    // To `index` in the list (-1 for the one playing), `ms` from its start.
    AsyncFunction("seek") { index: Int, ms: Double -> Playing.seek(index, ms.toLong()) }.runOnQueue(Queues.MAIN)

    AsyncFunction("stop") { Playing.stop(context) }.runOnQueue(Queues.MAIN)

    // Whether the player stops when the space locks, changed while a list plays.
    Function("setStopOnLock") { on: Boolean -> Playing.stopOnLock = on }

    AsyncFunction("playerState") { Playing.state() }.runOnQueue(Queues.MAIN)

    // Whether Android can delete a photo or video from the gallery for Erevos: Android 11 and later.
    Function("canDeleteFromGallery") { Build.VERSION.SDK_INT >= Build.VERSION_CODES.R }

    // Asks Android to delete from the gallery the photos and videos picked by these links, once
    // they are in the Collection; Android shows its own dialog, where the owner confirms.
    // "deleted", "kept" (the owner said no), "none" (no link is the gallery's own), or
    // "unavailable" (Android before 11).
    AsyncFunction("deleteFromGallery") { uris: List<String>, promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        promise.resolve("unavailable")
        return@AsyncFunction
      }
      val app = context ?: throw IllegalStateException("No app")
      val activity = appContext.currentActivity ?: throw IllegalStateException("No activity")
      if (deleting != null) throw IllegalStateException("A delete is being asked already")
      val media = uris.mapNotNull { galleryUri(app, Uri.parse(it)) }.distinct()
      if (media.isEmpty()) {
        promise.resolve("none")
        return@AsyncFunction
      }
      val request = MediaStore.createDeleteRequest(app.contentResolver, media)
      deleting = promise
      try {
        activity.startIntentSenderForResult(request.intentSender, DELETE_REQUEST, null, 0, 0, 0)
      } catch (e: IntentSender.SendIntentException) {
        deleting = null
        promise.reject("ERR_GALLERY", e.message, e)
      }
    }.runOnQueue(Queues.MAIN)

    // The video of the list playing (VideoView.kt).
    View(VideoView::class) {}
  }

  // A file as JavaScript gives it: checked, with its key copied into bytes of its own.
  private fun sealed(file: Map<String, Any?>): SealedFile {
    val id = file["id"] as? String ?: throw IllegalArgumentException("No id")
    val key = file["key"] as? String ?: throw IllegalArgumentException("No key")
    val chunk = (file["chunk"] as? Number)?.toInt() ?: throw IllegalArgumentException("No chunk size")
    val count = (file["count"] as? Number)?.toInt() ?: throw IllegalArgumentException("No count")
    val size = (file["size"] as? Number)?.toLong() ?: throw IllegalArgumentException("No size")
    return SealedFile.of(id, key, chunk, count, size)
  }

  // The gallery's own link for a picked photo or video: a MediaStore link as it is, or the
  // MediaStore link of a document the file picker gave (Android 10 and later); null for anything
  // else, which is not deleted.
  private fun galleryUri(context: Context, uri: Uri): Uri? {
    val media = when {
      uri.authority == MediaStore.AUTHORITY -> uri
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && DocumentsContract.isDocumentUri(context, uri) ->
        runCatching { MediaStore.getMediaUri(context, uri) }.getOrNull()
      else -> null
    } ?: return null
    if (media.authority != MediaStore.AUTHORITY) return null
    val path = media.pathSegments
    // The photo picker's own links (media/picker/...) are not the gallery's, and cannot be deleted.
    if (path.firstOrNull() == "picker") return null
    return if (path.contains("images") || path.contains("video")) media else null
  }

  companion object {
    private const val DELETE_REQUEST = 0x4572
  }
}
