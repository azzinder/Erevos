// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import org.junit.Assert.assertEquals
import org.junit.Test

// MeshOps, the order of what goes to and from a Meshtastic radio (MeshtasticLink.kt), with a radio
// that answers when told: one Bluetooth operation at a time, FromRadio read until it comes empty
// after each write and each FromNum, and writes waiting for that. Run with run.sh.

class MeshOpsTest {
  private val done = mutableListOf<String>()
  private val data = mutableListOf<String>()
  private val failed = mutableListOf<String>()
  private var writable = true
  private val ops = MeshOps(
    write = { bytes -> done.add("write ${String(bytes)}"); writable },
    read = { done.add("read"); true },
    onData = { bytes -> data.add(String(bytes)) },
    onFail = { what -> failed.add(what) },
  )

  @Test
  fun readsUntilEmptyAfterEachWriteAndWritesWait() {
    ops.send("config".toByteArray())
    ops.send("packet".toByteArray())
    assertEquals(listOf("write config"), done)
    ops.written(true)
    assertEquals("read", done.last())
    for (said in listOf("myInfo", "nodeInfo", "complete")) {
      ops.read(true, said.toByteArray())
      assertEquals("read", done.last())
    }
    ops.read(true, ByteArray(0))
    assertEquals("write packet", done.last())
    ops.written(true)
    ops.read(true, "queueStatus".toByteArray())
    ops.read(true, ByteArray(0))
    assertEquals(listOf("myInfo", "nodeInfo", "complete", "queueStatus"), data)
    assertEquals(listOf("write config", "read", "read", "read", "read", "write packet", "read", "read"), done)
    assertEquals(emptyList<String>(), failed)
  }

  @Test
  fun aFromNumDuringAReadReadsAgain() {
    ops.more()
    ops.more()
    assertEquals(listOf("read"), done)
    ops.send("packet".toByteArray())
    ops.read(true, "heard".toByteArray())
    ops.more()
    ops.read(true, ByteArray(0))
    // More came meanwhile: read once more before the write.
    assertEquals(listOf("read", "read", "read"), done)
    ops.read(true, ByteArray(0))
    assertEquals("write packet", done.last())
  }

  @Test
  fun aFailureIsToldOnceAndEndsIt() {
    ops.send("a".toByteArray())
    ops.send("b".toByteArray())
    ops.written(false)
    ops.more()
    ops.send("c".toByteArray())
    assertEquals(listOf("write a"), done)
    assertEquals(listOf("write"), failed)
  }

  @Test
  fun aWriteBluetoothRefusesFails() {
    writable = false
    ops.send("a".toByteArray())
    ops.send("b".toByteArray())
    assertEquals(listOf("write a"), done)
    assertEquals(listOf("write"), failed)
  }
}
