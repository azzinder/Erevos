// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.ParcelFileDescriptor
import android.os.ProxyFileDescriptorCallback
import android.os.storage.StorageManager
import android.provider.OpenableColumns
import android.system.ErrnoException
import android.system.OsConstants
import android.util.Log
import androidx.annotation.RequiresApi
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * The files of the Collection handed to another app to open (lib/collection-out.ts), with no
 * plain copy anywhere: each is named by a link, content://<package>.collection/<token>/<name>,
 * whose token is random. From Android 8 on the other app gets a file descriptor that Android serves
 * from this side (StorageManager.openProxyFileDescriptor): each read it makes, at any place in the
 * file, decrypts only the chunk that holds it (SealedFile.kt), so it can seek, as a video player
 * or a PDF reader does. Before Android 8 it gets a pipe that this side fills from start to end,
 * chunk after chunk.
 *
 * The provider is not exported: another app reaches a link only through the permission Android
 * gives with the intent that opens it (grantUriPermissions), for that link alone. A link works
 * while its token is known here: JavaScript forgets it when the Collection's screen closes, all
 * of them when the space locks or closes, and so does the panic button; nothing is known when
 * Erevos starts, as the tokens and keys are only in memory. Once a token is forgotten, a read
 * through a file descriptor already handed out fails (EBADF), and the chunk it held is wiped.
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
    cursor.addRow(columns.map { if (it == OpenableColumns.DISPLAY_NAME) open.name else open.size }.toTypedArray<Any?>())
    return cursor
  }

  override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
    if (mode != "r") throw FileNotFoundException("Only reading")
    val open = OpenFiles.find(uri) ?: throw FileNotFoundException("Not open")
    val folder = context?.filesDir ?: throw FileNotFoundException("No folder")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val storage = context?.getSystemService(StorageManager::class.java) ?: throw FileNotFoundException("No storage")
      return try {
        storage.openProxyFileDescriptor(ParcelFileDescriptor.MODE_READ_ONLY, Served(open, folder), OpenFiles.handler())
      } catch (e: IOException) {
        throw FileNotFoundException(e.message ?: "Not served")
      }
    }
    val pipe = ParcelFileDescriptor.createReliablePipe()
    val sealed = open.file
    Thread({ if (sealed != null) fill(sealed, folder, pipe[1]) else fillBytes(open, pipe[1]) }, "erevos-collection-open").start()
    return pipe[0]
  }

  /**
   * One file descriptor handed to another app, read through Android on OpenFiles' own thread:
   * every read is answered from the chunks it covers, decrypted one at a time. Its reader keeps
   * the last chunk it decrypted, wiped when the descriptor is let go of or the token forgotten.
   */
  @RequiresApi(Build.VERSION_CODES.O)
  private class Served(private val open: OpenFiles.Open, folder: File) : ProxyFileDescriptorCallback() {
    private val reader = open.file?.let { SealedFile.Reader(it, folder) }
    private val wipe = Runnable { reader?.close() }

    init {
      open.readers.add(wipe)
    }

    override fun onGetSize(): Long {
      if (open.isClosed) throw ErrnoException("onGetSize", OsConstants.EBADF)
      return open.size
    }

    // Fills what was asked, all of it but at the file's end, as a short read means the end to many
    // apps. A token forgotten answers EBADF; a chunk damaged or gone, EIO.
    override fun onRead(offset: Long, size: Int, data: ByteArray): Int {
      if (open.isClosed) {
        reader?.close()
        throw ErrnoException("onRead", OsConstants.EBADF)
      }
      // Bytes held in memory (a chat's file, OpenFiles.addBytes): copied from where asked.
      val held = open.bytes
      if (reader == null || held != null) {
        val all = held ?: throw ErrnoException("onRead", OsConstants.EBADF)
        if (offset >= all.size) return 0
        val count = minOf(size.toLong(), all.size - offset).toInt()
        System.arraycopy(all, offset.toInt(), data, 0, count)
        return count
      }
      var done = 0
      try {
        while (done < size) {
          val got = reader.read(offset + done, data, done, size - done)
          if (got <= 0) break
          done += got
        }
      } catch (e: IOException) {
        reader.close()
        val forgotten = open.isClosed
        if (!forgotten) Log.i(TAG, "A file opened with another app could not be read")
        throw ErrnoException("onRead", if (forgotten) OsConstants.EBADF else OsConstants.EIO)
      }
      return done
    }

    override fun onRelease() {
      open.readers.remove(wipe)
      reader?.close()
    }
  }

  // Before Android 8: writes the file into the pipe, chunk after chunk, each checked. A chunk that is damaged or
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

  // Before Android 8, bytes held in memory: written into the pipe whole.
  private fun fillBytes(open: OpenFiles.Open, write: ParcelFileDescriptor) {
    val out = ParcelFileDescriptor.AutoCloseOutputStream(write)
    val all = open.bytes
    if (all == null || open.isClosed) {
      runCatching { write.closeWithError("closed") }
      return
    }
    try {
      out.write(all)
      out.flush()
      runCatching { out.close() }
    } catch (e: Exception) {
      Log.i(TAG, "A file opened with another app was not read whole")
      runCatching { write.closeWithError(e.message ?: "read failed") }
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
  /**
   * A file handed out: one of the Collection, read from its sealed chunks (`file`), or a chat's,
   * held in memory as it came (`bytes`), wiped when forgotten. And what wipes the chunks its file
   * descriptors hold (CollectionProvider).
   */
  class Open(val file: SealedFile?, val bytes: ByteArray?, val name: String, val mime: String) {
    val readers = CopyOnWriteArrayList<Runnable>()
    @Volatile var closed = false
    val size: Long get() = file?.size ?: (bytes?.size?.toLong() ?: 0L)
    val isClosed: Boolean get() = closed || file?.isClosed == true
  }

  private val open = ConcurrentHashMap<String, Open>()
  private val random = SecureRandom()
  private var reading: Handler? = null

  /** The one thread that answers every read of the files handed out, started when first needed. */
  @Synchronized
  fun handler(): Handler {
    reading?.let { return it }
    val thread = HandlerThread("erevos-collection-open").also { it.start() }
    return Handler(thread.looper).also { reading = it }
  }

  /** The provider's authority: the app's package and ".collection" (AndroidManifest.xml). */
  fun authority(packageName: String) = "$packageName.collection"

  /** Makes a link for the file; its token is returned with it, to forget it later. */
  fun add(packageName: String, file: SealedFile, name: String, mime: String): Pair<String, Uri> = link(packageName, Open(file, null, name, mime))

  /** Makes a link for bytes held in memory (a chat's file), wiped when the link is forgotten. */
  fun addBytes(packageName: String, data: ByteArray, name: String, mime: String): Pair<String, Uri> = link(packageName, Open(null, data, name, mime))

  private fun link(packageName: String, file: Open): Pair<String, Uri> {
    val bytes = ByteArray(16).also(random::nextBytes)
    val token = bytes.joinToString("") { "%02x".format(it) }
    val name = file.name
    open[token] = file
    val uri = Uri.Builder().scheme("content").authority(authority(packageName)).appendPath(token).appendPath(name).build()
    return Pair(token, uri)
  }

  fun find(uri: Uri): Open? {
    val segments = uri.pathSegments
    if (segments.size != 2) return null
    val found = open[segments[0]] ?: return null
    return if (segments[1] == found.name && !found.isClosed) found else null
  }

  /**
   * Forgets one link and its key; a read going on stops with an error, and the chunks still held
   * for it are wiped on the reading thread, where they are used.
   */
  fun forget(token: String) {
    val gone = open.remove(token) ?: return
    gone.closed = true
    gone.file?.close()
    val wipes = gone.readers.toList()
    val held = gone.bytes
    val reader = synchronized(this) { reading }
    if (reader != null) reader.post { wipes.forEach { it.run() }; held?.fill(0) } else held?.fill(0)
  }

  /** Forgets every link and key: the space locked or closed, or the panic button. */
  fun forgetAll() {
    for (token in open.keys.toList()) forget(token)
  }
}
