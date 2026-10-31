// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import android.content.Context
import android.content.ContextWrapper
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

// LanLink on a plain JVM, as the phone runs it, linked to desktop/lan.js (echo.cjs) on this
// computer: they find each other, link, and pass texts both ways, the longest a frame holds.
// Run with run.sh.

// A context with no system services: as a phone that has no Wi-Fi manager to ask.
class Bare : ContextWrapper(null) {
  override fun getApplicationContext(): Context = this
  override fun getSystemService(name: String): Any? = null
  override fun getSystemServiceName(serviceClass: Class<*>): String? = null
}

class LanInteropTest {
  @Test
  fun phoneAndComputerLinkAndTalk() {
    val node = ProcessBuilder("node", System.getProperty("echo.script")).redirectErrorStream(true).start()
    val out = StringBuilder()
    Thread { node.inputStream.bufferedReader().forEachLine { synchronized(out) { out.append(it).append('\n') } } }.start()
    val links = LinkedBlockingQueue<String>()
    val texts = LinkedBlockingQueue<String>()
    val lan = LanLink(Bare(), { links.put(it) }, { _, payload -> texts.put(String(payload, Charsets.UTF_8)) }, { println("phone: $it") })
    try {
      lan.start()
      val id = links.poll(20, TimeUnit.SECONDS)
      assertTrue("no link; computer said:\n$out", id != null && id.startsWith("lan-"))
      val long = "x".repeat(16000)
      assertTrue(lan.send(id!!, "ping".toByteArray()))
      assertTrue(lan.send(id, long.toByteArray()))
      assertEquals("echo ping", texts.poll(10, TimeUnit.SECONDS))
      assertEquals("echo $long", texts.poll(10, TimeUnit.SECONDS))
      // Keep-alives pass both ways and are not texts.
      Thread.sleep(7000)
      assertEquals(null, texts.poll())
      assertTrue(lan.send(id, "still".toByteArray()))
      assertEquals("echo still", texts.poll(10, TimeUnit.SECONDS))
      synchronized(out) { assertTrue(out.toString(), out.contains("link lan-") && !out.contains("gone")) }
    } finally {
      lan.stop()
      node.destroy()
    }
  }
}
