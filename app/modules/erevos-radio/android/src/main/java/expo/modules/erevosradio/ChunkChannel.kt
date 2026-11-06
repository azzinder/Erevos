// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import java.io.DataInputStream
import java.io.EOFException
import java.io.File
import java.io.IOException
import java.io.OutputStream
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * The chunks of large files between the account's own devices on the same Wi-Fi or hotspot, fast:
 * a TCP connection of its own, apart from LanLink's frames. The same protocol as desktop/chunks.js,
 * which says it in full:
 *
 * - `EVC1` and a 16-byte challenge from the one giving; `EVC1`, HMAC-SHA256(key, "EVC1 client" ‖
 *   challenge) and a challenge of its own from the one taking; HMAC-SHA256(key, "EVC1 server" ‖
 *   that ‖ the first) back. No key, no chunks.
 * - Each ask: 1 (1 byte), the file's id (16 bytes), the chunk's number (4 bytes, big endian). Each
 *   answer: the length (4 bytes, 0 for none) and the chunk as kept, encrypted with the file's key.
 * - The one taking keeps a chunk under its name only once it opened with the file's key (AES-GCM,
 *   its number inside), written beside it first and moved in place: never a chunk half or changed.
 *
 * The chunks never go through the app's JavaScript.
 */
class ChunkChannel(private val folder: File, private val log: (String) -> Unit = {}) {
  companion object {
    private val MAGIC = "EVC1".toByteArray(Charsets.ISO_8859_1)
    private const val ASK = 1
    private const val MOST_CHUNK = 1024 * 1024
    private val CHUNK_SIZES = setOf(64 * 1024, 256 * 1024, 1024 * 1024)
    private const val HELLO_WITHIN = 5000
    private const val IDLE = 30_000
    private const val MOST_TAKERS = 8
    private val ID = Regex("^[0-9a-f]{32}$")
    private val KEY = Regex("^[0-9a-f]{64}$")

    fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

    fun unhex(text: String): ByteArray = ByteArray(text.length / 2) { text.substring(it * 2, it * 2 + 2).toInt(16).toByte() }

    fun mac(key: ByteArray, vararg parts: ByteArray): ByteArray {
      val m = Mac.getInstance("HmacSHA256")
      m.init(SecretKeySpec(key, "HmacSHA256"))
      for (p in parts) m.update(p)
      return m.doFinal()
    }

    private fun chunkName(id: String, n: Long) = "erevos-file-$id-$n"

    /** Whether `sealed` is the `n`th chunk of the file with `fileKey`, whole: as lib/attachments.ts openChunk. */
    fun opens(fileKey: ByteArray, n: Long, sealed: ByteArray, size: Int): Boolean {
      if (sealed.size != size || size < 12 + 16 + 8) return false
      return try {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(fileKey, "AES"), GCMParameterSpec(128, sealed, 0, 12))
        val plain = cipher.doFinal(sealed, 12, sealed.size - 12)
        val index = readU32(plain, 0)
        val length = readU32(plain, 4)
        index == n && length <= plain.size - 8
      } catch (e: Exception) {
        false
      }
    }

    private fun readU32(b: ByteArray, at: Int): Long =
      ((b[at].toLong() and 0xff) shl 24) or ((b[at + 1].toLong() and 0xff) shl 16) or ((b[at + 2].toLong() and 0xff) shl 8) or (b[at + 3].toLong() and 0xff)

    private fun u32(v: Long): ByteArray = byteArrayOf((v shr 24).toByte(), (v shr 16).toByte(), (v shr 8).toByte(), v.toByte())

    /** This phone's IPv4 addresses on its networks, for the devices to reach it at. */
    fun addresses(): List<String> =
      try {
        NetworkInterface.getNetworkInterfaces().toList().filter { it.isUp && !it.isLoopback }.flatMap { i ->
          i.inetAddresses.toList().filterIsInstance<Inet4Address>().mapNotNull { it.hostAddress }
        }
      } catch (e: Exception) {
        emptyList()
      }
  }

  private val random = SecureRandom()
  private val keys = ConcurrentHashMap<String, Set<String>>()
  private val takers = ConcurrentHashMap.newKeySet<Socket>()
  private val keyOf = ConcurrentHashMap<Socket, String>()
  private val pool = Executors.newCachedThreadPool()
  @Volatile private var server: ServerSocket? = null

  /** Listens, once; answers the port it listens on. */
  @Synchronized
  fun start(): Int {
    server?.let { return it.localPort }
    val socket = ServerSocket(0)
    server = socket
    pool.execute {
      while (!socket.isClosed) {
        val taker = try {
          socket.accept()
        } catch (e: IOException) {
          break
        }
        if (takers.size >= MOST_TAKERS) {
          taker.close()
          continue
        }
        takers.add(taker)
        pool.execute { serve(taker) }
      }
    }
    return socket.localPort
  }

  @Synchronized
  fun stop() {
    try {
      server?.close()
    } catch (e: IOException) {
      // Closed already.
    }
    server = null
    for (s in takers) closeQuietly(s)
    takers.clear()
    keys.clear()
  }

  /** Lets `key` (hex) take the chunks of the files `ids` from now on, in place of what it could before. */
  fun allow(key: String, ids: List<String>) {
    if (!KEY.matches(key)) return
    keys[key] = ids.filter { ID.matches(it) }.toSet()
  }

  /** `key` takes nothing more, and its connections are cut. */
  fun forget(key: String) {
    keys.remove(key)
    for ((s, k) in keyOf) if (k == key) closeQuietly(s)
  }

  private fun serve(socket: Socket) {
    try {
      socket.tcpNoDelay = true
      socket.soTimeout = HELLO_WITHIN
      val input = DataInputStream(socket.getInputStream())
      val output = socket.getOutputStream()
      val challenge = ByteArray(16).also { random.nextBytes(it) }
      output.write(MAGIC + challenge)
      output.flush()
      val hello = ByteArray(4 + 32 + 16)
      input.readFully(hello)
      if (!hello.copyOfRange(0, 4).contentEquals(MAGIC)) return
      val proof = hello.copyOfRange(4, 36)
      val theirs = hello.copyOfRange(36, 52)
      var key: String? = null
      for (k in keys.keys) {
        if (MessageDigest.isEqual(mac(unhex(k), "EVC1 client".toByteArray(), challenge), proof)) key = k
      }
      if (key == null) return
      keyOf[socket] = key
      output.write(mac(unhex(key), "EVC1 server".toByteArray(), theirs, challenge))
      output.flush()
      socket.soTimeout = IDLE
      val ask = ByteArray(1 + 16 + 4)
      while (true) {
        input.readFully(ask)
        if (ask[0].toInt() != ASK) return
        val id = hex(ask.copyOfRange(1, 17))
        val n = readU32(ask, 17)
        val allowed = keys[key]
        var chunk: ByteArray? = null
        if (allowed != null && allowed.contains(id)) {
          val file = File(folder, chunkName(id, n))
          if (file.isFile && file.length() in 1..MOST_CHUNK.toLong()) chunk = try {
            file.readBytes()
          } catch (e: IOException) {
            null
          }
        }
        output.write(u32((chunk?.size ?: 0).toLong()))
        if (chunk != null) output.write(chunk)
        output.flush()
      }
    } catch (e: EOFException) {
      // The other went.
    } catch (e: IOException) {
      // Cut off, or quiet too long.
    } finally {
      keyOf.remove(socket)
      takers.remove(socket)
      closeQuietly(socket)
    }
  }

  /** One connection to a device that gives chunks, once both showed they hold the key. */
  class Taker(private val socket: Socket) {
    private val input = DataInputStream(socket.getInputStream())
    private val output: OutputStream = socket.getOutputStream()

    /**
     * Takes the `n`th chunk of the file `id`, of `size` bytes, into `folder` once it opens with
     * `fileKey` (hex): true once kept, false when the other does not have it whole. Throws IOException when cut off.
     */
    @Synchronized
    fun take(folder: File, id: String, n: Long, fileKey: String, size: Int): Boolean {
      if (!ID.matches(id) || !KEY.matches(fileKey) || !CHUNK_SIZES.contains(size) || n < 0 || n > 0xffffffffL) return false
      output.write(byteArrayOf(ASK.toByte()) + unhex(id) + u32(n))
      output.flush()
      val head = ByteArray(4)
      input.readFully(head)
      val length = readU32(head, 0)
      if (length > MOST_CHUNK) {
        close()
        throw IOException("too long")
      }
      if (length == 0L) return false
      val sealed = ByteArray(length.toInt())
      input.readFully(sealed)
      if (!opens(unhex(fileKey), n, sealed, size)) return false
      folder.mkdirs()
      val target = File(folder, chunkName(id, n))
      val part = File(folder, "${target.name}.part")
      part.writeBytes(sealed)
      if (!part.renameTo(target)) {
        part.delete()
        throw IOException("not kept")
      }
      return true
    }

    fun close() = closeQuietly(socket)
  }

  /** Connects to the first of `hosts` that answers at `port`, with `key` (hex). Throws IOException when none does, or it holds another key. */
  fun open(hosts: List<String>, port: Int, key: String): Taker {
    var last: IOException = IOException("no address")
    for (host in hosts) {
      val socket = Socket()
      try {
        socket.connect(InetSocketAddress(host, port), HELLO_WITHIN)
        socket.tcpNoDelay = true
        socket.soTimeout = HELLO_WITHIN
        val input = DataInputStream(socket.getInputStream())
        val output = socket.getOutputStream()
        val hello = ByteArray(4 + 16)
        input.readFully(hello)
        if (!hello.copyOfRange(0, 4).contentEquals(MAGIC)) throw IOException("not chunks")
        val challenge = hello.copyOfRange(4, 20)
        val mine = ByteArray(16).also { random.nextBytes(it) }
        val k = unhex(key)
        output.write(MAGIC + mac(k, "EVC1 client".toByteArray(), challenge) + mine)
        output.flush()
        val answer = ByteArray(32)
        input.readFully(answer)
        if (!MessageDigest.isEqual(answer, mac(k, "EVC1 server".toByteArray(), mine, challenge))) throw IOException("another key")
        socket.soTimeout = IDLE
        return Taker(socket)
      } catch (e: IOException) {
        closeQuietly(socket)
        last = e
      }
    }
    throw last
  }
}

private fun closeQuietly(socket: Socket) {
  try {
    socket.close()
  } catch (e: IOException) {
    // Closed already.
  }
}
