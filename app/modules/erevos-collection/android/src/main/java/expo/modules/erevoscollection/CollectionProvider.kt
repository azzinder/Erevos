// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import android.util.Log
import java.io.File
import java.io.FileNotFoundException
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap

/**
 * The files of the Collection handed to another app to open (lib/collection-out.ts), with no
 * plain copy anywhere: each is named by a link, content://<package>.collection/<token>/<name>,
 * whose token is random, and read by the other app through a pipe that this side fills as it
 * decrypts the chunks, one at a time (SealedFile.kt).
 *
 * The provider is not exported: another app reaches a link only through the permission Android
 * gives with the intent that opens it (grantUriPermissions), for that link alone. A link works
 * while its token is known here: JavaScript forgets it when the Collection's screen closes, all
 * of them when the space locks or closes, and so does the panic button; nothing is known when
 * Erevos starts, as the tokens and keys are only in memory.
 */
class CollectionProvider : ContentProvider() {
  override fun onCreate(): Boolean = true

  override fun getType(uri: Uri): String? = OpenFiles.find(uri)?.mime

  // Only a file's name and size, as OpenableColumns says; what else is asked is left out.
  override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor? {
    val open = OpenFiles.find(uri) ?: return null
    val asked = projection ?: arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)
    val columns = asked.filter { it == OpenableColumns.DISPLAY_NAME || it == OpenableColumns.SIZE }.distinct().toTypedArray()
    val cursor = MatrixCursor(columns, 1)
    cursor.addRow(columns.map { if (it == OpenableColumns.DISPLAY_NAME) open.name else open.file.size }.toTypedArray<Any?>())
    return cursor
  }

  override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
    if (mode != "r") throw FileNotFoundException("Only reading")
    val open = OpenFiles.find(uri) ?: throw FileNotFoundException("Not open")
    val folder = context?.filesDir ?: throw FileNotFoundException("No folder")
    val pipe = ParcelFileDescriptor.createReliablePipe()
    Thread({ fill(open.file, folder, pipe[1]) }, "erevos-collection-open").start()
    return pipe[0]
  }

  // Writes the file into the pipe, chunk after chunk, each checked. A chunk that is damaged or
  // gone, or a key forgotten meanwhile, closes the pipe with an error, so the other app sees that
  // the file did not come whole instead of taking what came for all of it.
  private fun fill(file: SealedFile, folder: File, write: ParcelFileDescriptor) {
    val out = ParcelFileDescriptor.AutoCloseOutputStream(write)
    var failed: String? = null
    try {
      for (n in 0 until file.count) {
        val piece = file.piece(folder, n)
        try {
          out.write(piece)
        } finally {
          piece.fill(0)
        }
      }
      out.flush()
    } catch (e: Exception) {
      failed = e.message ?: "read failed"
    }
    if (failed == null) {
      runCatching { out.close() }
    } else {
      // The other app stopped reading, or the file could not be read whole.
      Log.i(TAG, "A file opened with another app was not read whole")
      runCatching { write.closeWithError(failed) }
    }
  }

  override fun insert(uri: Uri, values: ContentValues?): Uri? = throw UnsupportedOperationException()

  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = throw UnsupportedOperationException()

  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = throw UnsupportedOperationException()

  companion object {
    private const val TAG = "ErevosCollection"
  }
}

/** The files handed to other apps now, by token: in memory only, so none when Erevos starts. */
internal object OpenFiles {
  class Open(val file: SealedFile, val name: String, val mime: String)

  private val open = ConcurrentHashMap<String, Open>()
  private val random = SecureRandom()

  /** The provider's authority: the app's package and ".collection" (AndroidManifest.xml). */
  fun authority(packageName: String) = "$packageName.collection"

  /** Makes a link for the file; its token is returned with it, to forget it later. */
  fun add(packageName: String, file: SealedFile, name: String, mime: String): Pair<String, Uri> {
    val bytes = ByteArray(16).also(random::nextBytes)
    val token = bytes.joinToString("") { "%02x".format(it) }
    open[token] = Open(file, name, mime)
    val uri = Uri.Builder().scheme("content").authority(authority(packageName)).appendPath(token).appendPath(name).build()
    return Pair(token, uri)
  }

  fun find(uri: Uri): Open? {
    val segments = uri.pathSegments
    if (segments.size != 2) return null
    val found = open[segments[0]] ?: return null
    return if (segments[1] == found.name && !found.file.isClosed) found else null
  }

  /** Forgets one link and its key; a read going on stops with an error. */
  fun forget(token: String) {
    open.remove(token)?.file?.close()
  }

  /** Forgets every link and key: the space locked or closed, or the panic button. */
  fun forgetAll() {
    for (token in open.keys.toList()) forget(token)
  }
}
