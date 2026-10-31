// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import java.io.File
import java.security.SecureRandom

// Another app shares words, a link, a photo or a file with Erevos, from its Share: Erevos opens on
// Send to (app/share.tsx), once a space is open, by a link (erevos://share). Android lets Erevos
// read a shared photo or file only while this screen is open, so it is copied first into Erevos's
// own cache, under a name made here at random, which the link says; the app takes only such a name
// (lib/share-in.ts), and deletes the copy once sent, or with the next share. Nothing is read while
// no space is open: the copy waits in the cache, as the link waits for the password.
class ShareActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val shared = intent
    // A big file takes a while to copy: not on the screen's own thread.
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
    val copy = File(cacheDir, PREFIX + random())
    try {
      val input = contentResolver.openInputStream(stream) ?: return link.build()
      input.use { from ->
        copy.outputStream().use { to ->
          val buffer = ByteArray(64 * 1024)
          var total = 0L
          while (true) {
            val read = from.read(buffer)
            if (read < 0) break
            total += read
            if (total > MOST_FILE) {
              to.close()
              copy.delete()
              return link.appendQueryParameter("large", "1").build()
            }
            to.write(buffer, 0, read)
          }
        }
      }
    } catch (e: Exception) {
      copy.delete()
      throw e
    }
    val mime = intent.type?.takeIf { !it.contains('*') } ?: contentResolver.getType(stream) ?: ""
    return link
      .appendQueryParameter("file", copy.name)
      .appendQueryParameter("name", name.ifBlank { stream.lastPathSegment ?: "" }.take(200))
      .appendQueryParameter("mime", mime.take(100))
      .build()
  }

  @Suppress("DEPRECATION")
  private fun streamOf(intent: Intent): Uri? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    else intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri

  // A copy from a share before that was never sent: one share waits at a time.
  private fun clearOld() {
    cacheDir.listFiles { file -> file.name.startsWith(PREFIX) }?.forEach { it.delete() }
  }

  private fun random(): String {
    val bytes = ByteArray(8)
    SecureRandom().nextBytes(bytes)
    return bytes.joinToString("") { "%02x".format(it) }
  }

  private companion object {
    // The same as lib/share-in.ts.
    const val PREFIX = "erevos-shared-"
    // As a chat sends at most (lib/attachments.ts MAX_FILE), and the words a message holds.
    const val MOST_FILE = 100L * 1000 * 1000
    const val MOST_TEXT = 64 * 1024
  }
}
