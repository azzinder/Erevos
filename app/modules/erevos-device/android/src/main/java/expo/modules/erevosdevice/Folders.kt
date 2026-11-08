// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document

// The folder automatic backups go to, one the owner picked with Android's folder picker
// (lib/backup-place.ts): its files listed with their names and sizes in one look, a file written
// into it, and files deleted. Called off the thread React Native's screen answers on. There,
// expo-file-system asked Android again for each file's name and size, one look each, and a backup
// into a folder of a few hundred files held the screen for minutes (7.0.0-rc.3).
object Folders {
  // The folder as picked, a tree uri, perhaps with a slash at its end.
  private fun tree(folder: String): Uri = Uri.parse(folder.trimEnd('/'))

  // The folder's own document: the tree's top, or the document a tree uri names inside it.
  private fun folderId(tree: Uri): String {
    val segments = tree.pathSegments
    return if (segments.size >= 4 && segments[2] == "document") DocumentsContract.getDocumentId(tree) else DocumentsContract.getTreeDocumentId(tree)
  }

  /** The folder's files (not its folders): name, size (-1 where the folder does not say it) and uri. Null where it cannot be read. */
  fun files(context: Context, folder: String): List<Map<String, Any>>? {
    val tree = runCatching { tree(folder) }.getOrNull() ?: return null
    val id = runCatching { folderId(tree) }.getOrNull() ?: return null
    val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, id)
    val columns = arrayOf(Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME, Document.COLUMN_SIZE, Document.COLUMN_MIME_TYPE)
    val cursor = runCatching { context.contentResolver.query(children, columns, null, null, null) }.getOrNull() ?: return null
    val out = mutableListOf<Map<String, Any>>()
    cursor.use {
      while (it.moveToNext()) {
        val child = it.getString(0) ?: continue
        val name = it.getString(1) ?: continue
        if (it.getString(3) == Document.MIME_TYPE_DIR) continue
        val size = if (it.isNull(2)) -1.0 else it.getLong(2).toDouble()
        out.add(mapOf("name" to name, "size" to size, "uri" to DocumentsContract.buildDocumentUriUsingTree(tree, child).toString()))
      }
    }
    return out
  }

  /**
   * Writes `bytes` as a new file named `name` in the folder: its name as the folder gave it (another
   * where that one is taken) and its uri. One that could not be written whole is deleted, and
   * this throws.
   */
  fun write(context: Context, folder: String, name: String, bytes: ByteArray): Map<String, Any> {
    val tree = tree(folder)
    val parent = DocumentsContract.buildDocumentUriUsingTree(tree, folderId(tree))
    val made = DocumentsContract.createDocument(context.contentResolver, parent, "application/octet-stream", name)
      ?: throw IllegalStateException("The folder made no file.")
    try {
      val stream = context.contentResolver.openOutputStream(made, "w") ?: throw IllegalStateException("The file could not be written.")
      stream.use { it.write(bytes) }
    } catch (e: Exception) {
      runCatching { DocumentsContract.deleteDocument(context.contentResolver, made) }
      throw e
    }
    return mapOf("name" to (nameOf(context, made) ?: name), "uri" to made.toString())
  }

  /** Deletes the files of these uris; says how many went. One that does not go is left. */
  fun delete(context: Context, uris: List<String>): Int =
    uris.count { uri -> runCatching { DocumentsContract.deleteDocument(context.contentResolver, Uri.parse(uri)) }.getOrDefault(false) }

  private fun nameOf(context: Context, document: Uri): String? =
    runCatching {
      context.contentResolver.query(document, arrayOf(Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { if (it.moveToFirst()) it.getString(0) else null }
    }.getOrNull()
}
