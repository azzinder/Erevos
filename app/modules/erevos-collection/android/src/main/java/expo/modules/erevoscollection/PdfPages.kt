// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.ParcelFileDescriptor
import android.system.Os
import android.system.OsConstants
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileDescriptor
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap

/**
 * A PDF of the Collection shown inside Erevos (components/collection-viewer.tsx), a page at a time,
 * with Android's own PdfRenderer. It reads from a file descriptor, so the PDF is decrypted into a
 * memory file (memfd, Android 11 and later): a file that lives in memory only, with no name in
 * any folder, gone once closed. Android before 11 has no memory file for an app: there the PDF is
 * not shown at all, rather than written out plain. Each page comes as a picture (PNG, or JPEG for
 * a smaller one) of the width asked for, in base64.
 *
 * A PDF stays open until JavaScript closes it, or the space locks or closes, or the panic button.
 * Its memory file is emptied before it is closed.
 */
internal object PdfPages {
  /** The largest PDF opened: it is held in memory whole. */
  const val MOST = 128L * 1024 * 1024
  /** The widest page drawn, in pixels. */
  private const val MOST_WIDTH = 2048

  val available: Boolean get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R

  private class Open(val fd: FileDescriptor, val pfd: ParcelFileDescriptor, val renderer: PdfRenderer)

  private val open = ConcurrentHashMap<String, Open>()
  private val random = SecureRandom()

  class Unavailable : Exception("PDF viewing needs Android 11 or later")
  class TooLarge : Exception("The PDF is too large to show here")

  /** Opens the PDF: a handle to its pages, and how many there are. */
  fun open(file: SealedFile, folder: File): Pair<String, Int> {
    if (!available) throw Unavailable()
    if (file.size > MOST) throw TooLarge()
    val fd = Os.memfd_create("erevos-pdf", 0)
    var pfd: ParcelFileDescriptor? = null
    try {
      for (n in 0 until file.count) {
        val piece = file.piece(folder, n)
        try {
          var done = 0
          while (done < piece.size) done += Os.write(fd, piece, done, piece.size - done)
        } finally {
          piece.fill(0)
        }
      }
      Os.lseek(fd, 0, OsConstants.SEEK_SET)
      pfd = ParcelFileDescriptor.dup(fd)
      val renderer = PdfRenderer(pfd)
      val handle = ByteArray(12).also(random::nextBytes).joinToString("") { "%02x".format(it) }
      open[handle] = Open(fd, pfd, renderer)
      return Pair(handle, renderer.pageCount)
    } catch (e: Exception) {
      runCatching { pfd?.close() }
      empty(fd)
      throw e
    }
  }

  /**
   * Page `index` drawn `width` pixels wide on white, as PNG or JPEG ("jpeg"), base64; with how
   * high it came out.
   */
  fun page(handle: String, index: Int, width: Int, format: String): Map<String, Any> {
    val doc = open[handle] ?: throw IllegalStateException("The PDF is closed")
    synchronized(doc) {
      if (index < 0 || index >= doc.renderer.pageCount) throw IllegalArgumentException("No such page")
      doc.renderer.openPage(index).use { page ->
        val w = width.coerceIn(16, MOST_WIDTH)
        val h = maxOf(1, (w.toLong() * page.height / maxOf(1, page.width)).toInt()).coerceAtMost(MOST_WIDTH * 2)
        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        try {
          bitmap.eraseColor(Color.WHITE)
          page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
          val out = ByteArrayOutputStream()
          if (format == "jpeg") bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out) else bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
          return mapOf("data" to Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP), "width" to w, "height" to h)
        } finally {
          bitmap.recycle()
        }
      }
    }
  }

  fun close(handle: String) {
    val doc = open.remove(handle) ?: return
    synchronized(doc) {
      runCatching { doc.renderer.close() }
      runCatching { doc.pfd.close() }
      empty(doc.fd)
    }
  }

  fun closeAll() {
    for (handle in open.keys.toList()) close(handle)
  }

  // Cuts the memory file to nothing before closing it, so its pages go now.
  private fun empty(fd: FileDescriptor) {
    runCatching { Os.ftruncate(fd, 0) }
    runCatching { Os.close(fd) }
  }
}
