// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscontacts

import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.SimPhonebookContract
import android.util.Log

/**
 * The contacts on the phone's SIM cards (the ADN, its phone book), read to be copied into Android's
 * contacts. Android 12 and later name every SIM's phone book (SimPhonebookContract), each with its
 * slot; before, only the main SIM's is read (content://icc/adn). Reading needs READ_CONTACTS.
 */
internal object SimContacts {
  private const val TAG = "ErevosContacts"

  fun all(context: Context): List<Map<String, Any?>> {
    if (!ContactsStore.canRead(context)) return emptyList()
    return try {
      if (Build.VERSION.SDK_INT >= 31) modern(context) else old(context)
    } catch (e: Exception) {
      // A phone without a SIM, or without a phone book on it.
      Log.w(TAG, "The SIM's contacts could not be read", e)
      emptyList()
    }
  }

  private fun record(name: String?, number: String?, sim: Int): Map<String, Any?>? {
    val n = number?.trim().orEmpty()
    val who = name?.trim().orEmpty()
    if (n.isEmpty() && who.isEmpty()) return null
    return mapOf("name" to who, "number" to n, "sim" to sim.toDouble())
  }

  private fun modern(context: Context): List<Map<String, Any?>> {
    val resolver = context.contentResolver
    val books = ArrayList<Pair<Int, Int>>()
    val files = arrayOf(SimPhonebookContract.ElementaryFiles.SUBSCRIPTION_ID, SimPhonebookContract.ElementaryFiles.SLOT_INDEX, SimPhonebookContract.ElementaryFiles.EF_TYPE)
    resolver.query(SimPhonebookContract.ElementaryFiles.CONTENT_URI, files, null, null, null)?.use { c ->
      while (c.moveToNext()) if (c.getInt(2) == SimPhonebookContract.ElementaryFiles.EF_ADN) books.add(c.getInt(0) to c.getInt(1))
    }
    val found = ArrayList<Map<String, Any?>>()
    val columns = arrayOf(SimPhonebookContract.SimRecords.NAME, SimPhonebookContract.SimRecords.PHONE_NUMBER)
    for ((subscription, slot) in books) {
      try {
        resolver.query(SimPhonebookContract.SimRecords.getContentUri(subscription, SimPhonebookContract.ElementaryFiles.EF_ADN), columns, null, null, null)?.use { c ->
          while (c.moveToNext()) record(c.getString(0), c.getString(1), slot)?.let(found::add)
        }
      } catch (e: Exception) {
        Log.w(TAG, "A SIM's contacts could not be read", e)
      }
    }
    return found
  }

  private fun old(context: Context): List<Map<String, Any?>> {
    val found = ArrayList<Map<String, Any?>>()
    context.contentResolver.query(Uri.parse("content://icc/adn"), null, null, null, null)?.use { c ->
      val name = c.getColumnIndex("name")
      val number = c.getColumnIndex("number")
      while (c.moveToNext()) record(if (name >= 0) c.getString(name) else null, if (number >= 0) c.getString(number) else null, 0)?.let(found::add)
    }
    return found
  }
}
