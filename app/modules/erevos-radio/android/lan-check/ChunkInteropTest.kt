// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// ChunkChannel on a plain JVM, as the phone runs it, against desktop/chunks.js (chunks.cjs): the
// computer takes a file's chunks from the phone, the phone from the computer, each kept only whole,
// and a wrong key gets nothing. Run with run.sh.
class ChunkInteropTest {
  private val random = SecureRandom()
  private val size = 64 * 1024

  // The `n`th chunk of a file as lib/attachments.ts sealChunk makes it.
  private fun seal(key: ByteArray, n: Int, data: ByteArray): ByteArray {
    val plain = ByteArray(size - 28)
    for ((i, b) in listOf(n shr 24, n shr 16, n shr 8, n, data.size shr 24, data.size shr 16, data.size shr 8, data.size).withIndex()) plain[i] = b.toByte()
    data.copyInto(plain, 8)
    val nonce = ByteArray(12).also { random.nextBytes(it) }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
    return nonce + cipher.doFinal(plain)
  }

  private fun fileIn(dir: File, id: String, key: ByteArray, count: Int) {
    for (n in 0 until count) File(dir, "erevos-file-$id-$n").writeBytes(seal(key, n, ByteArray(1000 + n).also { random.nextBytes(it) }))
  }

  private fun node(vararg args: String): Pair<Process, java.io.BufferedReader> {
    val p = ProcessBuilder(listOf("node", System.getProperty("chunks.script")) + args).redirectErrorStream(true).start()
    return p to p.inputStream.bufferedReader()
  }

  private fun bytes(n: Int) = ByteArray(n).also { random.nextBytes(it) }

  @Test
  fun phoneAndComputerHandEachOtherChunks() {
    val phone = Files.createTempDirectory("phone").toFile()
    val computer = Files.createTempDirectory("computer").toFile()
    val id = ChunkChannel.hex(bytes(16))
    val fileKey = bytes(32)
    val key = ChunkChannel.hex(bytes(32))
    fileIn(phone, id, fileKey, 5)

    // The computer takes from the phone.
    val channel = ChunkChannel(phone)
    val port = channel.start()
    channel.allow(key, listOf(id))
    val (taking, said) = node("take", "$port", key, computer.path, id, "5", ChunkChannel.hex(fileKey), "$size")
    assertEquals("kept 5", said.readLine())
    taking.waitFor()
    for (n in 0 until 5) assertArrayEquals(File(phone, "erevos-file-$id-$n").readBytes(), File(computer, "erevos-file-$id-$n").readBytes())
    // A wrong key gets nothing.
    var refused = false
    try {
      channel.open(listOf("127.0.0.1"), port, ChunkChannel.hex(bytes(32)))
    } catch (e: IOException) {
      refused = true
    }
    assertTrue(refused)
    channel.stop()

    // The phone takes from the computer, kept only whole.
    val again = Files.createTempDirectory("again").toFile()
    val (serving, heard) = node("serve", computer.path, key, id)
    try {
      val line = heard.readLine()
      assertTrue(line, line.startsWith("port "))
      val taker = ChunkChannel(again).open(listOf("127.0.0.1"), line.removePrefix("port ").toInt(), key)
      for (n in 0L until 5L) assertTrue(taker.take(again, id, n, ChunkChannel.hex(fileKey), size))
      assertFalse(taker.take(again, id, 7, ChunkChannel.hex(fileKey), size))
      assertFalse(taker.take(again, id, 0, ChunkChannel.hex(bytes(32)), size))
      taker.close()
      for (n in 0 until 5) assertArrayEquals(File(computer, "erevos-file-$id-$n").readBytes(), File(again, "erevos-file-$id-$n").readBytes())
      assertFalse(again.list()!!.any { it.endsWith(".part") })
    } finally {
      serving.destroy()
    }
  }
}
