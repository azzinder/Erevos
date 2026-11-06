// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.content.Context
import java.io.File

/**
 * The photo or file another app shared, encrypted into the Collection's chunks as Android handed it
 * over (ShareActivity.kt), waiting for Send to (app/share.tsx): its id, its key, how its chunks
 * are, its size, and for a photo its size shown and a small picture of it (a JPEG), both in memory
 * only. One waits at a time; the next share deletes it.
 *
 * Send to's Collection takes its chunks as they are (keep), so the file never lies plain on the
 * disk; a chat reads it from them, and then it goes (drop). The key is only in memory: should
 * Erevos stop first, the chunks are noise, and NOTE, which names them (their id and how many, no
 * key), has the next share or the panic button delete them.
 */
internal object SharedIn {
  class Waiting(val id: String, val key: ByteArray, val chunk: Int, val count: Int, val size: Long, val w: Int, val h: Int, val thumb: ByteArray?)

  // In the cache: the id and count of the chunks waiting, for the next share to delete them.
  private const val NOTE = "erevos-sealed-share"
  private val ID = Regex("^[0-9a-f]{32}$")

  private var waiting: Waiting? = null

  /** Grows with each panic button: a share being encrypted then keeps nothing. */
  @Volatile
  var panics = 0
    private set

  /** Keeps `file` waiting, after deleting the one before; noted, so its chunks go even if Erevos stops first. */
  @Synchronized
  fun put(context: Context, file: Waiting) {
    dropAll(context)
    waiting = file
    runCatching { File(context.cacheDir, NOTE).writeText("${file.id} ${file.count}") }
  }

  /** The file waiting, if it is `id`. */
  @Synchronized
  fun get(id: String): Waiting? = waiting?.takeIf { it.id == id }

  /** The Collection takes the chunks of `id` as its own: they stay, and the key here goes. */
  @Synchronized
  fun keep(context: Context, id: String) {
    val file = waiting?.takeIf { it.id == id } ?: return
    waiting = null
    forget(file)
    File(context.cacheDir, NOTE).delete()
  }

  /** Deletes the file `id` waiting, its chunks and its key. */
  @Synchronized
  fun drop(context: Context, id: String) {
    if (waiting?.id == id) dropAll(context)
  }

  /** Deletes whatever waits, and the chunks NOTE names, left by an Erevos that stopped first. */
  @Synchronized
  fun dropAll(context: Context) {
    waiting?.let {
      forget(it)
      deleteChunks(context, it.id, it.count)
    }
    waiting = null
    val note = File(context.cacheDir, NOTE)
    runCatching {
      if (note.exists()) {
        val parts = note.readText().trim().split(" ")
        val count = parts.getOrNull(1)?.toIntOrNull() ?: 0
        if (parts.size == 2 && ID.matches(parts[0]) && count in 1..SealedFile.MOST_CHUNKS) deleteChunks(context, parts[0], count)
      }
    }
    note.delete()
  }

  /** The panic button: what waits goes, and a share being encrypted now keeps nothing. */
  @Synchronized
  fun panic(context: Context) {
    panics++
    dropAll(context)
  }

  private fun forget(file: Waiting) {
    file.key.fill(0)
    file.thumb?.fill(0)
  }

  private fun deleteChunks(context: Context, id: String, count: Int) {
    for (n in 0 until count) File(context.filesDir, SealedFile.chunkName(id, n)).delete()
  }
}
