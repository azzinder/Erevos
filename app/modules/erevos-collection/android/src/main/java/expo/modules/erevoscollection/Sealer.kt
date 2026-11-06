// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Encrypts a file into the Collection's chunks as it is read, from start to end, with no plain
 * copy anywhere: what lib/attachments.ts keepFile does, here for a file Android hands over by a
 * link (ErevosCollectionModule sealFromUri), which can be as large as the Collection takes. Nothing
 * here is Android's, so the checks can run it on a computer.
 *
 * The chunks are the same as keepFile's, byte for byte in their layout, so SealedFile.kt and
 * lib/attachments.ts openChunk open them alike: named erevos-file-<id>-<n> in the app's files
 * folder; each exactly `chunk` bytes, a random 12-byte nonce, then what AES-256-GCM sealed with
 * the file's key, then its 16-byte tag; opened, the chunk's place in the file (uint32, big-endian),
 * how many of its bytes are the file (uint32, big-endian), those bytes, and zeros to its size. The
 * chunk size is chosen as lib/attachments.ts chunkPlan does: one chunk of 64 or 256 KiB for a file
 * that fits in it, else chunks of 1 MiB, every one full but the last. As the size a link says may
 * be wrong or missing, it is not trusted: the first MiB is read before the size is chosen, and the
 * file is as long as what was read.
 *
 * The key and id are made here, at random. On any failure, a cancel, or a file longer than
 * MOST_CHUNKS chunks, every chunk written is deleted, and the key zeroed. What was read and
 * encrypted is zeroed in memory once written.
 */
class Sealer(private val folder: File, private val random: SecureRandom = SecureRandom()) {
  /** A file encrypted: its id, key, chunk size, how many chunks, and its size. Zero `key` once taken. */
  class Sealed(val id: String, val key: ByteArray, val chunk: Int, val count: Int, val size: Long)

  class Cancelled : IOException("Cancelled")
  class TooLarge : IOException("Too large for the Collection")

  /**
   * Encrypts all of `input` into chunks. `progress` is told how many chunks are written and how
   * many there will be by `expected` bytes (0 when that is not known). `cancelled` is asked
   * before each chunk.
   */
  fun seal(input: InputStream, expected: Long, progress: (done: Int, count: Int) -> Unit = { _, _ -> }, cancelled: () -> Boolean = { false }): Sealed {
    val key = ByteArray(32).also(random::nextBytes)
    val id = ByteArray(16).also(random::nextBytes).joinToString("") { "%02x".format(it) }
    val big = BIG
    val buffer = ByteArray(SealedFile.room(big))
    var written = 0
    try {
      val estimate = if (expected > 0) SealedFile.countFor(expected, big).coerceAtMost(SealedFile.MOST_CHUNKS.toLong()).toInt() else 0
      var length = fill(input, buffer)
      if (length < buffer.size) {
        // The whole file is in the first read: the smallest chunk it fits in, as chunkPlan.
        val chunk = SMALLER.firstOrNull { length <= SealedFile.room(it) } ?: big
        write(key, id, 0, buffer, length, chunk)
        written = 1
        progress(1, 1)
        return Sealed(id, key, chunk, 1, length.toLong())
      }
      var size = 0L
      var n = 0
      while (length > 0) {
        if (cancelled()) throw Cancelled()
        if (n >= SealedFile.MOST_CHUNKS) throw TooLarge()
        write(key, id, n, buffer, length, big)
        n++
        written = n
        size += length
        progress(n, maxOf(estimate, n))
        // Only a full chunk may have one after it.
        if (length < buffer.size) break
        length = fill(input, buffer)
      }
      return Sealed(id, key, big, n, size)
    } catch (e: Throwable) {
      key.fill(0)
      // The chunk being written may be there in part: it goes too.
      for (i in 0..written) File(folder, SealedFile.chunkName(id, i)).delete()
      throw e
    } finally {
      buffer.fill(0)
    }
  }

  // Reads until `buffer` is full or the file ends: how many bytes it holds.
  private fun fill(input: InputStream, buffer: ByteArray): Int {
    var at = 0
    while (at < buffer.size) {
      val got = input.read(buffer, at, buffer.size - at)
      if (got < 0) break
      at += got
    }
    return at
  }

  // Seals `length` bytes of `data` as the file's `n`th chunk, of `chunk` bytes, and writes it.
  private fun write(key: ByteArray, id: String, n: Int, data: ByteArray, length: Int, chunk: Int) {
    val plain = ByteArray(chunk - SealedFile.SEALING)
    var sealed: ByteArray? = null
    try {
      plain[0] = (n ushr 24).toByte()
      plain[1] = (n ushr 16).toByte()
      plain[2] = (n ushr 8).toByte()
      plain[3] = n.toByte()
      plain[4] = (length ushr 24).toByte()
      plain[5] = (length ushr 16).toByte()
      plain[6] = (length ushr 8).toByte()
      plain[7] = length.toByte()
      System.arraycopy(data, 0, plain, SealedFile.HEAD, length)
      val nonce = ByteArray(SealedFile.NONCE).also(random::nextBytes)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(SealedFile.TAG * 8, nonce))
      val out = ByteArray(chunk)
      System.arraycopy(nonce, 0, out, 0, SealedFile.NONCE)
      val made = cipher.doFinal(plain, 0, plain.size, out, SealedFile.NONCE)
      if (SealedFile.NONCE + made != chunk) throw IOException("bad chunk")
      sealed = out
      FileOutputStream(File(folder, SealedFile.chunkName(id, n))).use { it.write(out) }
    } finally {
      plain.fill(0)
      sealed?.fill(0)
    }
  }

  companion object {
    private val SIZES = SealedFile.CHUNK_SIZES.sorted()
    private val BIG = SIZES.last()
    private val SMALLER = SIZES.dropLast(1)

    /** The key as hex, for JavaScript; the bytes are zeroed. */
    fun handOver(key: ByteArray): String = try {
      key.joinToString("") { "%02x".format(it) }
    } finally {
      key.fill(0)
    }
  }
}
