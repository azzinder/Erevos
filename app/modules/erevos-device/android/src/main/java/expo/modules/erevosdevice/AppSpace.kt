// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.content.Context
import java.io.File
import java.nio.file.Files

// How much room Erevos takes on the phone, and in what (app/backup.tsx, «What takes room»): the
// phone's settings show only one number for all of it. Its files are sealed and their names
// random, so they are told apart only by the kind their name starts with, never by whose they
// are: erevos-file- for the Collection's and the chats' photos and files, erevos-voice- for voice
// messages, erevos-page- for the chats' history, and so on. Each folder in the app's own space is
// one row, as files/tor/ for Tor's. A file still being written, or one a write left behind
// (.new, .part), is a row of its own. Nothing is read but names and sizes. Called off the thread
// React Native's screen answers on.
object AppSpace {
  private val HEX_RUN = Regex("[0-9a-f]{8,}.*$")
  private val DIGITS = Regex("[0-9]+.*$")

  /** The kind a file's name says: what comes before its random or numbered part. */
  fun kindOf(name: String): String {
    if (name.endsWith(".new") || name.endsWith(".part")) return "*.${name.substringAfterLast('.')}"
    val cut = HEX_RUN.replace(name, "").let { DIGITS.replace(it, "") }
    return cut.ifEmpty { "?" }
  }

  private fun isLink(file: File) = runCatching { Files.isSymbolicLink(file.toPath()) }.getOrDefault(true)

  // The bytes and the number of files in a folder, all the way down, links not followed.
  private fun folderSize(folder: File): LongArray {
    val total = longArrayOf(0, 0)
    val waiting = ArrayDeque<File>().apply { add(folder) }
    while (waiting.isNotEmpty()) {
      val next = waiting.removeFirst()
      for (child in next.listFiles() ?: continue) {
        if (isLink(child)) continue
        if (child.isDirectory) waiting.add(child)
        else {
          total[0] += child.length()
          total[1]++
        }
      }
    }
    return total
  }

  /** Rows of { kind, bytes, files }, the largest first. */
  fun measure(context: Context): List<Map<String, Any>> {
    val rows = linkedMapOf<String, LongArray>()
    fun add(kind: String, bytes: Long, files: Long) {
      val row = rows.getOrPut(kind) { longArrayOf(0, 0) }
      row[0] += bytes
      row[1] += files
    }
    val data = context.dataDir
    for (top in data.listFiles() ?: emptyArray()) {
      if (isLink(top)) continue
      if (top.name == "files" && top.isDirectory) {
        for (file in top.listFiles() ?: emptyArray()) {
          if (isLink(file)) continue
          if (file.isDirectory) folderSize(file).let { add("files/${file.name}/", it[0], it[1]) }
          else add(kindOf(file.name), file.length(), 1)
        }
      } else if (top.isDirectory) folderSize(top).let { add("${top.name}/", it[0], it[1]) }
      else add(top.name, top.length(), 1)
    }
    context.getExternalFilesDir(null)?.parentFile?.let { outside ->
      if (outside.isDirectory) folderSize(outside).let { if (it[1] > 0) add("external/", it[0], it[1]) }
    }
    return rows.entries
      .sortedByDescending { it.value[0] }
      .map { (kind, row) -> mapOf("kind" to kind, "bytes" to row[0].toDouble(), "files" to row[1].toDouble()) }
  }

  private val CHUNK = Regex("^erevos-file-([0-9a-f]{32})-([0-9]+)$")

  // The kinds of files in the app's own folder that hold no sealed values of the spaces.
  private val NOT_STORES = listOf("erevos-file-", "erevos-page-", "erevos-voice-", "erevos-avatar-", "erevos-backup-")

  /**
   * The files of photos and files, by the file they are chunks of (lib/leftovers.ts): its id, the
   * bytes and number of its chunks, and when the newest of them was written, in milliseconds.
   */
  fun chunkFiles(context: Context): List<Map<String, Any>> {
    val files = linkedMapOf<String, LongArray>()
    for (file in context.filesDir.listFiles() ?: emptyArray()) {
      val id = CHUNK.matchEntire(file.name)?.groupValues?.get(1) ?: continue
      val row = files.getOrPut(id) { longArrayOf(0, 0, 0) }
      row[0] += file.length()
      row[1]++
      row[2] = maxOf(row[2], file.lastModified())
    }
    return files.map { (id, row) -> mapOf("id" to id, "bytes" to row[0].toDouble(), "files" to row[1].toDouble(), "at" to row[2].toDouble()) }
  }

  /** The names of the other files in the app's own folder, where the spaces' sealed values may be. */
  fun storeNames(context: Context): List<String> =
    (context.filesDir.listFiles() ?: emptyArray())
      .filter { it.isFile && NOT_STORES.none { kind -> it.name.startsWith(kind) } && !it.name.endsWith(".new") && !it.name.endsWith(".part") }
      .map { it.name }

  /** Deletes every chunk of the files `ids`: the bytes that went. */
  fun deleteChunkFiles(context: Context, ids: List<String>): Double {
    val gone = ids.filter { Regex("^[0-9a-f]{32}$").matches(it) }.toHashSet()
    var bytes = 0L
    for (file in context.filesDir.listFiles() ?: emptyArray()) {
      val id = CHUNK.matchEntire(file.name)?.groupValues?.get(1) ?: continue
      if (id !in gone) continue
      val size = file.length()
      if (file.delete()) bytes += size
    }
    return bytes.toDouble()
  }
}

