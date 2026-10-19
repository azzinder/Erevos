package expo.modules.erevosphone

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.CallLog
import android.provider.ContactsContract
import android.provider.ContactsContract.CommonDataKinds.GroupMembership
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.provider.ContactsContract.Groups
import android.telecom.TelecomManager

/**
 * Android's call history (CallLog.Calls), which Telecom writes for every call, the phone's
 * starred contacts, its favourites, and its contact groups. Erevos only reads them, for the Phone screen, which is behind
 * its password; it keeps no copy. Names come from the phone's contacts as they are now, and from
 * what Erevos knows of numbers while a space is open (Calls.knownName). Not compiled or run yet.
 */
internal object History {
  /** The most calls read at once, newest first. */
  private const val MOST = 500

  fun allowed(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED

  fun contactsAllowed(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED

  /** The newest calls, as the JS side takes them (index.ts's LoggedCall). */
  fun calls(context: Context): List<Map<String, Any?>> {
    if (!allowed(context)) return emptyList()
    val uri = CallLog.Calls.CONTENT_URI.buildUpon().appendQueryParameter(CallLog.Calls.LIMIT_PARAM_KEY, MOST.toString()).build()
    val columns = arrayListOf(
      CallLog.Calls._ID,
      CallLog.Calls.NUMBER,
      CallLog.Calls.DATE,
      CallLog.Calls.DURATION,
      CallLog.Calls.TYPE,
      CallLog.Calls.FEATURES,
      CallLog.Calls.PHONE_ACCOUNT_ID,
      CallLog.Calls.NUMBER_PRESENTATION,
      CallLog.Calls.CACHED_NAME,
      CallLog.Calls.NEW,
    )
    if (Build.VERSION.SDK_INT >= 29) columns.add(CallLog.Calls.BLOCK_REASON)
    val names = HashMap<String, Contact?>()
    val calls = ArrayList<Map<String, Any?>>()
    try {
      context.contentResolver.query(uri, columns.toTypedArray(), null, null, "${CallLog.Calls.DATE} DESC")?.use { c ->
        while (c.moveToNext() && calls.size < MOST) {
          val number = c.getString(1) ?: ""
          val presentation = c.getInt(7)
          val contact = if (number.isBlank()) null else names.getOrPut(number) { Callers.lookup(context, number) }
          val name = Calls.knownName(number) ?: contact?.name ?: c.getString(8) ?: ""
          calls.add(
            mapOf(
              "id" to c.getLong(0).toDouble(),
              "number" to number,
              "shown" to Callers.shown(context, number),
              "name" to name,
              "photo" to (contact?.thumb ?: ""),
              "at" to c.getLong(2).toDouble(),
              "duration" to c.getLong(3).toDouble(),
              "type" to c.getInt(4),
              "features" to c.getInt(5),
              "account" to (c.getString(6) ?: ""),
              "presentation" to presentation,
              "isNew" to (c.getInt(9) == 1),
              "blocked" to (if (columns.size > 10) c.getInt(10) else 0),
            ),
          )
        }
      }
    } catch (_: SecurityException) {
      return emptyList()
    }
    return calls
  }

  /** The phone's starred contacts with their numbers, by name (index.ts's Favourite). */
  fun favourites(context: Context): List<Map<String, Any?>> {
    if (!contactsAllowed(context)) return emptyList()
    val columns = arrayOf(Phone.CONTACT_ID, Phone.DISPLAY_NAME, Phone.PHOTO_THUMBNAIL_URI, Phone.NUMBER, Phone.TYPE, Phone.LABEL, Phone.IS_SUPER_PRIMARY)
    val byContact = LinkedHashMap<Long, MutableMap<String, Any?>>()
    try {
      context.contentResolver.query(Phone.CONTENT_URI, columns, "${Phone.STARRED} = 1", null, "${Phone.DISPLAY_NAME} COLLATE LOCALIZED ASC")?.use { c ->
        while (c.moveToNext()) {
          val number = c.getString(3)?.takeIf { it.isNotBlank() } ?: continue
          val id = c.getLong(0)
          val contact = byContact.getOrPut(id) {
            mutableMapOf("id" to id.toString(), "name" to (c.getString(1) ?: ""), "photo" to (c.getString(2) ?: ""), "numbers" to ArrayList<Map<String, Any?>>(), "primary" to "")
          }
          @Suppress("UNCHECKED_CAST")
          val numbers = contact["numbers"] as ArrayList<Map<String, Any?>>
          // The same number from two accounts' copies of the contact shows once.
          if (numbers.any { Calls.key(it["number"] as String) == Calls.key(number) }) continue
          val label = Phone.getTypeLabel(context.resources, c.getInt(4), c.getString(5))?.toString() ?: ""
          numbers.add(mapOf("number" to number, "shown" to Callers.shown(context, number), "label" to label))
          if (c.getInt(6) == 1) contact["primary"] = number
        }
      }
    } catch (_: SecurityException) {
      return emptyList()
    }
    return byContact.values.toList()
  }

  /** The phone's contact groups (its labels), by title, with how many contacts each has, for
   *  blocking a group's calls for a while. Only read: groups are made and changed elsewhere. */
  fun groups(context: Context): List<Map<String, Any?>> {
    if (!contactsAllowed(context)) return emptyList()
    val columns = arrayOf(Groups._ID, Groups.TITLE, Groups.ACCOUNT_NAME, Groups.SUMMARY_COUNT)
    val groups = ArrayList<Map<String, Any?>>()
    try {
      context.contentResolver.query(Groups.CONTENT_SUMMARY_URI, columns, "${Groups.DELETED} = 0", null, "${Groups.TITLE} COLLATE LOCALIZED ASC")?.use { c ->
        while (c.moveToNext()) {
          val title = c.getString(1)?.takeIf { it.isNotBlank() } ?: continue
          groups.add(mapOf("id" to c.getLong(0).toString(), "title" to title, "account" to (c.getString(2) ?: ""), "count" to c.getInt(3)))
        }
      }
    } catch (_: SecurityException) {
      return emptyList()
    }
    return groups
  }

  /** Whether the contact is in one of the groups. */
  fun inGroups(context: Context, contact: Long, ids: List<String>): Boolean {
    val plain = ids.filter { id -> id.isNotEmpty() && id.all { it.isDigit() } }
    if (plain.isEmpty() || !contactsAllowed(context)) return false
    val selection = "${ContactsContract.Data.CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ? AND " +
      "${GroupMembership.GROUP_ROW_ID} IN (${plain.joinToString(",") { "?" }})"
    val args = arrayOf(contact.toString(), GroupMembership.CONTENT_ITEM_TYPE) + plain
    return try {
      context.contentResolver.query(ContactsContract.Data.CONTENT_URI, arrayOf(ContactsContract.Data._ID), selection, args, null)?.use { it.count > 0 } ?: false
    } catch (_: SecurityException) {
      false
    }
  }

  /** Marks the missed calls as seen, which takes away Android's notice of them. Only the phone app may. */
  fun seenMissed(context: Context) {
    try {
      context.getSystemService(TelecomManager::class.java)?.cancelMissedCallsNotification()
    } catch (_: SecurityException) {
    }
  }

  /** Calls `changed` whenever the call history or the contacts change, until the returned function
   *  is called; once for many changes close together, as when the contacts sync. */
  fun watch(context: Context, changed: () -> Unit): () -> Unit {
    val main = Handler(Looper.getMainLooper())
    val tell = Runnable { changed() }
    val observer = object : ContentObserver(main) {
      override fun onChange(selfChange: Boolean) {
        main.removeCallbacks(tell)
        main.postDelayed(tell, 700)
      }
    }
    val resolver = context.contentResolver
    val uris: List<Uri> = listOf(CallLog.Calls.CONTENT_URI, ContactsContract.Contacts.CONTENT_URI)
    for (uri in uris) {
      try {
        resolver.registerContentObserver(uri, true, observer)
      } catch (_: SecurityException) {
      }
    }
    return {
      main.removeCallbacks(tell)
      resolver.unregisterContentObserver(observer)
    }
  }
}
