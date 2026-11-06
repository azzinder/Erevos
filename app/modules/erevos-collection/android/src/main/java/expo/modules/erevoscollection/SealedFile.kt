// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * One file of the Collection read where it lies, encrypted, in its chunks in the app's files
 * folder (lock/attachment-files.ts names them erevos-file-<id>-<n>), as lib/attachments.ts wrote
 * them. Nothing here is Android's, so the checks can run it on a computer.
 *
 * Each chunk is exactly `chunk` bytes: a 12-byte nonce, then what AES-256-GCM sealed, then its
 * 16-byte tag (lib/crypto.ts encryptBytes). Opened, it holds the chunk's place in the file (uint32,
 * big-endian), how many of its bytes are the file (uint32, big-endian), those bytes, and zeros to
 * its size. So the file's byte at `offset` is in chunk offset / room, room = chunk - 28 - 8.
 *
 * A chunk is taken only as lib/attachments.ts openChunk takes it, and more strictly: whole, opened
 * by the key, at its own place, and holding exactly the bytes the file's size says it must (every
 * chunk but the last is full). Anything else is FileDamaged: never bytes that may be wrong.
 *
 * The key is kept only in memory, in this object's own copy, and zeroed by close(). The cipher
 * takes it into a key object of its own for each chunk opened, which Java cannot zero; that copy
 * lives only as long as the chunk is being opened.
 */
class SealedFile(id: String, key: ByteArray, val chunk: Int, val count: Int, val size: Long) {
  val id: String = id
  private val key: ByteArray = key.copyOf()
  @Volatile private var closed = false

  init {
    require(ID.matches(id)) { "bad file id" }
    require(key.size == 32) { "bad key" }
    require(chunk in CHUNK_SIZES) { "bad chunk size" }
    require(count in 1..MOST_CHUNKS) { "bad chunk count" }
    require(size >= 0 && count.toLong() == countFor(size, chunk)) { "size and chunks do not agree" }
  }

  /** How many of the file's bytes each chunk holds. */
  val room: Int get() = room(chunk)

  /** How many of the file's bytes chunk `n` must hold. */
  fun pieceLength(n: Int): Int = if (n < count - 1) room else (size - (count - 1).toLong() * room).toInt()

  /** The file's bytes in chunk `n`, checked. Throws FileDamaged, or FileMissing when the chunk is not there. */
  fun piece(folder: File, n: Int): ByteArray {
    if (closed) throw FileClosed()
    if (n < 0 || n >= count) throw FileDamaged("no chunk $n")
    val sealed = readChunk(File(folder, chunkName(id, n)))
    return open(sealed, n)
  }

  /** Opens one chunk as it was kept: exactly `chunk` bytes, nonce first, tag last. */
  fun open(sealed: ByteArray, n: Int): ByteArray {
    if (sealed.size != chunk) throw FileDamaged("chunk $n is not whole")
    val plain = try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG * 8, sealed, 0, NONCE))
      cipher.doFinal(sealed, NONCE, sealed.size - NONCE)
    } catch (e: Exception) {
      throw FileDamaged("chunk $n does not open")
    }
    try {
      if (plain.size != chunk - SEALING) throw FileDamaged("chunk $n has the wrong size")
      val index = uint32(plain, 0)
      val length = uint32(plain, 4)
      if (index != n.toLong()) throw FileDamaged("chunk $n is in the wrong place")
      if (length > plain.size - HEAD || length != pieceLength(n).toLong()) throw FileDamaged("chunk $n has the wrong length")
      return plain.copyOfRange(HEAD, HEAD + length.toInt())
    } finally {
      plain.fill(0)
    }
  }

  /** Forgets the key. Reading after this throws. */
  fun close() {
    closed = true
    key.fill(0)
  }

  val isClosed: Boolean get() = closed

  /** A reader of this file at any place, which keeps the chunk it opened last. */
  fun reader(folder: File): Reader = Reader(this, folder)

  /**
   * Reads the file's bytes at any place, opening only the chunks that hold them, one at a time.
   * Not for more than one thread at once; each user takes its own. close() zeroes what it holds.
   */
  class Reader(private val file: SealedFile, private val folder: File) {
    private var at = -1
    private var held: ByteArray? = null

    val size: Long get() = file.size

    /**
     * Up to `length` of the file's bytes from `position` into `buffer` at `offset`: how many, at
     * least one, or -1 at the file's end. Never more than the chunk that holds `position` has
     * from there; read again for the rest.
     */
    fun read(position: Long, buffer: ByteArray, offset: Int, length: Int): Int {
      if (position < 0 || offset < 0 || length < 0 || offset + length > buffer.size) throw IndexOutOfBoundsException()
      if (position >= file.size) return -1
      if (length == 0) return 0
      val (n, within) = place(position, file.chunk)
      val piece = pieceAt(n)
      val count = minOf(length.toLong(), piece.size.toLong() - within).toInt()
      if (count <= 0) throw FileDamaged("nothing at $position")
      System.arraycopy(piece, within, buffer, offset, count)
      return count
    }

    /** Exactly `length` bytes from `position`, or fewer only at the file's end. */
    fun readFully(position: Long, length: Int): ByteArray {
      val end = minOf(file.size, position + length)
      val out = ByteArray(maxOf(0L, end - position).toInt())
      var done = 0
      while (done < out.size) {
        val got = read(position + done, out, done, out.size - done)
        if (got <= 0) throw FileDamaged("the file ends early")
        done += got
      }
      return out
    }

    private fun pieceAt(n: Int): ByteArray {
      val kept = held
      if (kept != null && at == n) return kept
      kept?.fill(0)
      held = null
      at = -1
      val piece = file.piece(folder, n)
      held = piece
      at = n
      return piece
    }

    fun close() {
      held?.fill(0)
      held = null
      at = -1
    }
  }

  companion object {
    const val NONCE = 12
    const val TAG = 16
    const val SEALING = NONCE + TAG
    const val HEAD = 8
    const val MOST_CHUNKS = 4096
    const val PREFIX = "erevos-file-"
    val CHUNK_SIZES = setOf(64 * 1024, 256 * 1024, 1024 * 1024)
    private val ID = Regex("^[0-9a-f]{32}$")
    private val KEY = Regex("^[0-9a-f]{64}$")

    /** How many of a file's bytes a chunk of `chunk` bytes holds (lib/attachments.ts room). */
    fun room(chunk: Int): Int = chunk - SEALING - HEAD

    /** How many chunks a file of `size` bytes takes in chunks of `chunk` bytes: at least one. */
    fun countFor(size: Long, chunk: Int): Long = maxOf(1L, (size + room(chunk) - 1) / room(chunk))

    /** The chunk that holds the file's byte at `position`, and where in its piece. */
    fun place(position: Long, chunk: Int): Pair<Int, Int> {
      val room = room(chunk).toLong()
      return Pair((position / room).toInt(), (position % room).toInt())
    }

    fun chunkName(id: String, n: Int): String = "$PREFIX$id-$n"

    /** The key from its hex, as the catalogue keeps it. */
    fun keyFromHex(hex: String): ByteArray {
      require(KEY.matches(hex)) { "bad key" }
      return ByteArray(32) { ((Character.digit(hex[it * 2], 16) shl 4) or Character.digit(hex[it * 2 + 1], 16)).toByte() }
    }

    /** A file from what JavaScript says of it; the hex key's bytes are zeroed once copied. */
    fun of(id: String, keyHex: String, chunk: Int, count: Int, size: Long): SealedFile {
      val key = keyFromHex(keyHex)
      try {
        return SealedFile(id, key, chunk, count, size)
      } finally {
        key.fill(0)
      }
    }

    private fun uint32(bytes: ByteArray, at: Int): Long =
      ((bytes[at].toLong() and 0xff) shl 24) or ((bytes[at + 1].toLong() and 0xff) shl 16) or
        ((bytes[at + 2].toLong() and 0xff) shl 8) or (bytes[at + 3].toLong() and 0xff)

    private fun readChunk(file: File): ByteArray {
      if (!file.isFile) throw FileMissing()
      RandomAccessFile(file, "r").use { raf ->
        val length = raf.length()
        if (length > 2L * 1024 * 1024) throw FileDamaged("a chunk is too large")
        val bytes = ByteArray(length.toInt())
        raf.readFully(bytes)
        return bytes
      }
    }
  }
}

/** A chunk that is not whole, not opened by the file's key, or not the one expected. */
class FileDamaged(message: String) : IOException("The file is damaged: $message")

/** A chunk is not on the phone (a backup restored without it). */
class FileMissing : IOException("The file is not on this phone")

/** The file's key was forgotten (the list stopped, the space locked, the panic button). */
class FileClosed : IOException("The file was closed")
