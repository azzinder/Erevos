// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FilterInputStream
import java.io.InputStream

// Another app shares words, a link, a photo or a file with Erevos, from its Share: Erevos opens on
// Send to (app/share.tsx), once a space is open, by a link (erevos://share). Android lets Erevos
// read a shared photo or file only while this screen is open, so it is read here at once, and
// encrypted as it is read into the Collection's chunks (Sealer.kt), with a key made at random and
// kept in memory only (SharedIn.kt): no plain copy is written anywhere. The link says only the
// file's id, its name and its type. Send to's Collection then takes the chunks as they are; a chat
// reads the file from them (lib/share-in.ts), and they go once it is sent, with the next share,
// or with the panic button. A photo's size and a small picture of it are made here too, in memory,
// for the Collection, as the photo cannot be read again later. Nothing is decrypted while no space
// is open: the file waits, encrypted, as the link waits for the password.
//
// It lives in the Collection's module, beside the Sealer, though Send to takes a file to a chat
// with the Collection off too.
class ShareActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val shared = intent
    // A big file takes a while to encrypt: not on the screen's own thread.
    Thread {
      val link = try {
        linkOf(shared)
      } catch (_: Exception) {
        null
      }
      runOnUiThread {
        open(link)
        finish()
      }
    }.start()
  }

  private fun open(link: Uri?) {
    try {
      if (link == null) throw IllegalStateException()
      startActivity(Intent(Intent.ACTION_VIEW, link).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      packageManager.getLaunchIntentForPackage(packageName)?.let(::startActivity)
    }
  }

  private fun linkOf(intent: Intent): Uri? {
    if (intent.action != Intent.ACTION_SEND) return null
    val link = Uri.Builder().scheme("erevos").authority("share")
    val text = (intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() ?: "").take(MOST_TEXT)
    val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT) ?: ""
    // A page from the browser: its address, and its title if the address alone was shared.
    link.appendQueryParameter("text", if (text.isBlank()) subject.take(MOST_TEXT) else text)
    val stream = streamOf(intent) ?: return link.build()
    clearOld()
    var name = ""
    var size = -1L
    contentResolver.query(stream, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { row ->
      if (row.moveToFirst()) {
        name = row.getString(0) ?: ""
        if (!row.isNull(1)) size = row.getLong(1)
      }
    }
    if (size > MOST_FILE) return link.appendQueryParameter("large", "1").build()
    val mime = intent.type?.takeIf { !it.contains('*') } ?: contentResolver.getType(stream) ?: ""
    val panics = SharedIn.panics
    val input = contentResolver.openInputStream(stream) ?: return link.build()
    val sealed = try {
      input.use { Sealer(filesDir).seal(Most(it), size.coerceAtLeast(0), cancelled = { SharedIn.panics != panics }) }
    } catch (_: Sealer.TooLarge) {
      return link.appendQueryParameter("large", "1").build()
    }
    // A photo: its size as it shows, and its small picture, while it can still be read.
    val photo = if (mime in PHOTOS) runCatching { photoOf(stream) }.getOrNull() else null
    val waiting = SharedIn.Waiting(sealed.id, sealed.key, sealed.chunk, sealed.count, sealed.size, photo?.w ?: 0, photo?.h ?: 0, photo?.thumb)
    synchronized(SharedIn) {
      if (SharedIn.panics != panics) {
        // The panic button while it was encrypted: nothing stays.
        sealed.key.fill(0)
        for (n in 0 until sealed.count) File(filesDir, SealedFile.chunkName(sealed.id, n)).delete()
        return null
      }
      SharedIn.put(applicationContext, waiting)
    }
    return link
      .appendQueryParameter("sealed", sealed.id)
      .appendQueryParameter("name", name.ifBlank { stream.lastPathSegment ?: "" }.take(200))
      .appendQueryParameter("mime", mime.take(100))
      .build()
  }

  private class Photo(val w: Int, val h: Int, val thumb: ByteArray?)

  // The photo's size as it shows (turned as its EXIF says, as lib/photo.ts photoSize tells it), and
  // a JPEG of it whose shorter side is THUMB_SIDE pixels, drawn anew (as lib/collection-import.ts
  // draws one), all in memory.
  private fun photoOf(stream: Uri): Photo? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    contentResolver.openInputStream(stream)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    val (w, h) = bounds.outWidth to bounds.outHeight
    if (w <= 0 || h <= 0) return null
    val orientation = runCatching {
      contentResolver.openInputStream(stream)?.use { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) }
    }.getOrNull() ?: ExifInterface.ORIENTATION_NORMAL
    val turned = orientation >= 5
    val thumb = runCatching { thumbOf(stream, w, h, orientation) }.getOrNull()
    return if (turned) Photo(h, w, thumb) else Photo(w, h, thumb)
  }

  private fun thumbOf(stream: Uri, w: Int, h: Int, orientation: Int): ByteArray? {
    var sample = 1
    while (minOf(w, h) / (sample * 2) >= THUMB_SIDE) sample *= 2
    val options = BitmapFactory.Options().apply { inSampleSize = sample }
    val decoded = contentResolver.openInputStream(stream)?.use { BitmapFactory.decodeStream(it, null, options) } ?: return null
    val scale = THUMB_SIDE.toFloat() / minOf(decoded.width, decoded.height)
    val matrix = Matrix()
    if (scale < 1f) matrix.postScale(scale, scale)
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.postRotate(90f); matrix.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.postRotate(-90f); matrix.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(-90f)
    }
    val drawn = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    try {
      val out = ByteArrayOutputStream()
      drawn.compress(Bitmap.CompressFormat.JPEG, 70, out)
      return out.toByteArray()
    } finally {
      if (drawn !== decoded) drawn.recycle()
      decoded.recycle()
    }
  }

  @Suppress("DEPRECATION")
  private fun streamOf(intent: Intent): Uri? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    else intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri

  // What an Erevos before this left: a plain copy from a share that was never sent. And the file
  // of a share before this one, still waiting, encrypted: one share waits at a time.
  private fun clearOld() {
    cacheDir.listFiles { file -> file.name.startsWith(OLD_COPY) }?.forEach { it.delete() }
    SharedIn.dropAll(applicationContext)
  }

  // The file, read up to MOST_FILE bytes: longer, Sealer.TooLarge, and what was encrypted goes.
  private class Most(input: InputStream) : FilterInputStream(input) {
    private var total = 0L

    override fun read(): Int {
      val byte = super.read()
      if (byte >= 0) count(1)
      return byte
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
      val got = super.read(buffer, offset, length)
      if (got > 0) count(got)
      return got
    }

    private fun count(read: Int) {
      total += read
      if (total > MOST_FILE) throw Sealer.TooLarge()
    }
  }

  private companion object {
    // As an Erevos before this named its plain copies, and lib/collection-out.ts names a photo's.
    const val OLD_COPY = "erevos-shared-"
    // As the Collection keeps at most (MOST_CHUNKS chunks of 1 MiB, lib/collection-data.ts
    // MAX_COLLECTION_FILE), and the words a message holds. A chat sends at most 100 MB
    // (lib/attachments.ts MAX_FILE): Send to offers a larger file only to the Collection.
    val MOST_FILE = SealedFile.MOST_CHUNKS.toLong() * SealedFile.room(1 shl 20)
    const val MOST_TEXT = 64 * 1024
    // As lib/collection-import.ts THUMB_SIDE and isPhotoType.
    const val THUMB_SIDE = 256
    val PHOTOS = setOf("image/jpeg", "image/png", "image/gif", "image/webp")
  }
}
