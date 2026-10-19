package expo.modules.erevoscontacts

import android.Manifest
import android.content.ContentProviderOperation
import android.content.ContentResolver
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.ContactsContract
import android.provider.ContactsContract.CommonDataKinds.Email
import android.provider.ContactsContract.CommonDataKinds.Event
import android.provider.ContactsContract.CommonDataKinds.GroupMembership
import android.provider.ContactsContract.CommonDataKinds.Note
import android.provider.ContactsContract.CommonDataKinds.Organization
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.provider.ContactsContract.CommonDataKinds.Photo
import android.provider.ContactsContract.CommonDataKinds.StructuredName
import android.provider.ContactsContract.CommonDataKinds.StructuredPostal
import android.provider.ContactsContract.Contacts
import android.provider.ContactsContract.Data
import android.provider.ContactsContract.Groups
import android.provider.ContactsContract.RawContacts
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject

/**
 * The phone's contacts, in Android's own contacts (ContactsContract), where they stay for every
 * other app. A contact is Android's aggregate of raw contacts, one for each account it is kept in
 * (the phone itself, a Google account, a messenger's); what Erevos shows of it is read from all of
 * them, and a change is made row by row, so what Erevos does not show (another app's own rows, a
 * middle name) stays as it was. Reading needs READ_CONTACTS, changing WRITE_CONTACTS.
 */
internal object ContactsStore {
  private val KINDS = arrayOf(
    StructuredName.CONTENT_ITEM_TYPE,
    Phone.CONTENT_ITEM_TYPE,
    Email.CONTENT_ITEM_TYPE,
    StructuredPostal.CONTENT_ITEM_TYPE,
    Note.CONTENT_ITEM_TYPE,
    Event.CONTENT_ITEM_TYPE,
    Organization.CONTENT_ITEM_TYPE,
    GroupMembership.CONTENT_ITEM_TYPE,
  )
  private val DATA_COLUMNS = arrayOf(
    Data.CONTACT_ID, Data.RAW_CONTACT_ID, Data._ID, Data.MIMETYPE,
    Data.DATA1, Data.DATA2, Data.DATA3, Data.DATA4, Data.DATA5, Data.DATA6, Data.DATA7, Data.DATA8, Data.DATA9, Data.DATA10,
  )

  fun canRead(context: Context) = context.checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED

  fun canWrite(context: Context) = context.checkSelfPermission(Manifest.permission.WRITE_CONTACTS) == PackageManager.PERMISSION_GRANTED

  /** A value kept in one or more rows: the same number in two accounts shows once. */
  class Entry(val value: String, val type: Int, val label: String) {
    val ids = ArrayList<Long>()

    fun map(): Map<String, Any?> = mapOf("ids" to ids.map { it.toDouble() }, "value" to value, "type" to type.toDouble(), "label" to label)
  }

  class Account(val type: String, val name: String) {
    fun map(): Map<String, Any?> = mapOf("type" to type, "name" to name)

    fun same(otherType: String?, otherName: String?) = type == (otherType ?: "") && name == (otherName ?: "")
  }

  class Contact(val id: Long, val lookup: String, val name: String, val starred: Boolean, val photo: Long, val ringtone: String, val nameRaw: Long) {
    var given = ""
    var family = ""
    var nameFrom = -1L
    val phones = ArrayList<Entry>()
    val emails = ArrayList<Entry>()
    val addresses = ArrayList<Entry>()
    var note: Entry? = null
    var birthday: Entry? = null
    var company = ""
    var title = ""
    val org = ArrayList<Long>()
    val groups = LinkedHashSet<Long>()
    val raws = LinkedHashMap<Long, Account>()

    fun map(): Map<String, Any?> = mapOf(
      "id" to id.toDouble(),
      "lookup" to lookup,
      "name" to name,
      "given" to given,
      "family" to family,
      "starred" to starred,
      "photo" to photo.toDouble(),
      "ringtone" to ringtone,
      "phones" to phones.map { it.map() },
      "emails" to emails.map { it.map() },
      "addresses" to addresses.map { it.map() },
      "note" to note?.let { mapOf("ids" to it.ids.map { id -> id.toDouble() }, "value" to it.value) },
      "birthday" to birthday?.let { mapOf("ids" to it.ids.map { id -> id.toDouble() }, "value" to it.value) },
      "company" to company,
      "title" to title,
      "org" to org.map { it.toDouble() },
      "groups" to groups.map { it.toDouble() },
      "accounts" to raws.values.map { it.map() },
    )
  }

  private fun digits(number: String) = number.filter { it.isDigit() }

  // A value already there under another row: numbers by their digits, the rest without case or spaces.
  private fun add(list: MutableList<Entry>, row: Long, value: String, type: Int, label: String, number: Boolean) {
    val key = if (number) digits(value).ifEmpty { value } else value.trim().lowercase()
    val known = list.firstOrNull { (if (number) digits(it.value).ifEmpty { it.value } else it.value.trim().lowercase()) == key }
    if (known != null) known.ids.add(row) else list.add(Entry(value.trim(), type, label).also { it.ids.add(row) })
  }

  /** An address as one text: Android's own, or its parts on lines when it has none. */
  private fun address(formatted: String?, street: String?, city: String?, region: String?, postcode: String?, country: String?): String {
    if (!formatted.isNullOrBlank()) return formatted.trim()
    val town = listOfNotNull(postcode, city).filter { it.isNotBlank() }.joinToString(" ")
    return listOfNotNull(street, town, region, country).map { it.trim() }.filter { it.isNotEmpty() }.joinToString("\n")
  }

  /** The contacts `selection` names (all of them for null), read from every account they are kept in, by name. */
  private fun read(context: Context, selection: String?, args: Array<String>?): List<Contact> {
    val resolver = context.contentResolver
    val contacts = LinkedHashMap<Long, Contact>()
    val columns = arrayOf(Contacts._ID, Contacts.LOOKUP_KEY, Contacts.DISPLAY_NAME_PRIMARY, Contacts.STARRED, Contacts.PHOTO_ID, Contacts.CUSTOM_RINGTONE, Contacts.NAME_RAW_CONTACT_ID)
    resolver.query(Contacts.CONTENT_URI, columns, selection, args, Contacts.SORT_KEY_PRIMARY)?.use { c ->
      while (c.moveToNext()) {
        val id = c.getLong(0)
        contacts[id] = Contact(id, c.getString(1) ?: "", c.getString(2) ?: "", c.getInt(3) != 0, if (c.isNull(4)) 0L else c.getLong(4), c.getString(5) ?: "", if (c.isNull(6)) -1L else c.getLong(6))
      }
    }
    if (contacts.isEmpty()) return emptyList()
    val only = if (selection == null) null else contacts.keys.joinToString(",")
    val rawSelection = "${RawContacts.DELETED}=0" + (only?.let { " AND ${RawContacts.CONTACT_ID} IN ($it)" } ?: "")
    resolver.query(RawContacts.CONTENT_URI, arrayOf(RawContacts._ID, RawContacts.CONTACT_ID, RawContacts.ACCOUNT_TYPE, RawContacts.ACCOUNT_NAME), rawSelection, null, null)?.use { c ->
      while (c.moveToNext()) contacts[c.getLong(1)]?.raws?.put(c.getLong(0), Account(c.getString(2) ?: "", c.getString(3) ?: ""))
    }
    val kinds = KINDS.joinToString(",") { "?" }
    val dataSelection = "${Data.MIMETYPE} IN ($kinds)" + (only?.let { " AND ${Data.CONTACT_ID} IN ($it)" } ?: "")
    resolver.query(Data.CONTENT_URI, DATA_COLUMNS, dataSelection, KINDS, "${Data.IS_SUPER_PRIMARY} DESC, ${Data.IS_PRIMARY} DESC, ${Data._ID}")?.use { c ->
      while (c.moveToNext()) {
        val contact = contacts[c.getLong(0)] ?: continue
        val raw = c.getLong(1)
        val row = c.getLong(2)
        val text = { i: Int -> c.getString(i) ?: "" }
        val type = { if (c.isNull(5)) 0 else c.getInt(5) }
        when (c.getString(3)) {
          StructuredName.CONTENT_ITEM_TYPE -> {
            // The row Android shows the name from, else the first.
            if (contact.nameFrom == -1L || raw == contact.nameRaw) {
              contact.given = text(5)
              contact.family = text(6)
              contact.nameFrom = raw
            }
          }
          Phone.CONTENT_ITEM_TYPE -> if (text(4).isNotBlank()) add(contact.phones, row, text(4), type(), text(6), true)
          Email.CONTENT_ITEM_TYPE -> if (text(4).isNotBlank()) add(contact.emails, row, text(4), type(), text(6), false)
          StructuredPostal.CONTENT_ITEM_TYPE -> {
            val value = address(c.getString(4), c.getString(7), c.getString(10), c.getString(11), c.getString(12), c.getString(13))
            if (value.isNotBlank()) add(contact.addresses, row, value, type(), text(6), false)
          }
          Note.CONTENT_ITEM_TYPE -> if (text(4).isNotBlank()) {
            val note = contact.note
            if (note == null) contact.note = Entry(text(4).trim(), 0, "").also { it.ids.add(row) } else note.ids.add(row)
          }
          Event.CONTENT_ITEM_TYPE -> if (type() == Event.TYPE_BIRTHDAY && text(4).isNotBlank()) {
            val birthday = contact.birthday
            if (birthday == null) contact.birthday = Entry(text(4).trim(), 0, "").also { it.ids.add(row) } else birthday.ids.add(row)
          }
          Organization.CONTENT_ITEM_TYPE -> {
            if (contact.org.isEmpty()) {
              contact.company = text(4).trim()
              contact.title = text(7).trim()
            }
            contact.org.add(row)
          }
          GroupMembership.CONTENT_ITEM_TYPE -> if (!c.isNull(4)) contact.groups.add(c.getLong(4))
        }
      }
    }
    return contacts.values.toList()
  }

  fun all(context: Context): List<Map<String, Any?>> = if (canRead(context)) read(context, null, null).map { it.map() } else emptyList()

  fun one(context: Context, id: Long): Map<String, Any?>? =
    if (canRead(context)) read(context, "${Contacts._ID}=?", arrayOf(id.toString())).firstOrNull()?.map() else null

  private fun ids(array: JSONArray?): List<Long> = (0 until (array?.length() ?: 0)).map { array!!.getLong(it) }

  /** The raw contact a contact's new rows go into: the one Android shows its name from, else its first. */
  private fun target(contact: Contact): Long = contact.nameRaw.takeIf { contact.raws.containsKey(it) } ?: contact.raws.keys.firstOrNull() ?: -1L

  /**
   * Saves a contact as JSON (modules/erevos-contacts/index.ts ContactSave) in one batch: a new one
   * as a raw contact in the account named, or the changes to one there is. Returns its id.
   */
  fun save(context: Context, json: String): Long {
    val v = JSONObject(json)
    val resolver = context.contentResolver
    val id = v.optLong("id", 0L)
    val ops = ArrayList<ContentProviderOperation>()
    val existing = if (id > 0) read(context, "${Contacts._ID}=?", arrayOf(id.toString())).firstOrNull() ?: throw IllegalStateException("That contact is gone") else null
    // New rows go into this raw contact, or, for a new contact, the one inserted first in the batch.
    val raw = existing?.let(::target) ?: -1L
    if (existing == null) {
      val account = v.optJSONObject("account")
      val type = account?.optString("type").orEmpty()
      val name = account?.optString("name").orEmpty()
      ops.add(
        ContentProviderOperation.newInsert(RawContacts.CONTENT_URI)
          .withValue(RawContacts.ACCOUNT_TYPE, type.ifEmpty { null })
          .withValue(RawContacts.ACCOUNT_NAME, name.ifEmpty { null })
          .withValue(RawContacts.STARRED, if (v.optBoolean("starred")) 1 else 0)
          .build(),
      )
    } else if (raw < 0) {
      throw IllegalStateException("That contact cannot be changed")
    }
    fun insert(mime: String, values: ContentValues) {
      val op = ContentProviderOperation.newInsert(Data.CONTENT_URI).withValue(Data.MIMETYPE, mime).withValues(values)
      if (existing == null) op.withValueBackReference(Data.RAW_CONTACT_ID, 0) else op.withValue(Data.RAW_CONTACT_ID, raw)
      ops.add(op.build())
    }
    fun update(row: Long, values: ContentValues) {
      ops.add(ContentProviderOperation.newUpdate(ContentUris.withAppendedId(Data.CONTENT_URI, row)).withValues(values).build())
    }
    fun delete(row: Long) {
      ops.add(ContentProviderOperation.newDelete(ContentUris.withAppendedId(Data.CONTENT_URI, row)).build())
    }

    // The name: its given and family name; Android makes the whole name from them.
    val given = v.optString("given").trim()
    val family = v.optString("family").trim()
    if (existing == null) {
      if (given.isNotEmpty() || family.isNotEmpty()) insert(StructuredName.CONTENT_ITEM_TYPE, ContentValues().apply { put(StructuredName.GIVEN_NAME, given); put(StructuredName.FAMILY_NAME, family) })
    } else if (given != existing.given || family != existing.family) {
      val nameRow = nameRow(resolver, existing.nameFrom)
      val values = ContentValues().apply { put(StructuredName.GIVEN_NAME, given); put(StructuredName.FAMILY_NAME, family) }
      if (nameRow != null) update(nameRow, values) else insert(StructuredName.CONTENT_ITEM_TYPE, values)
    }

    // Numbers, emails and addresses: each entry updates the first of its rows and deletes the rest;
    // one without rows is new; the contact's rows no entry names are deleted.
    fun entries(key: String, mime: String, had: List<Entry>, values: (JSONObject) -> ContentValues) {
      val list = v.optJSONArray(key) ?: JSONArray()
      val named = HashSet<Long>()
      for (i in 0 until list.length()) {
        val e = list.getJSONObject(i)
        val rows = ids(e.optJSONArray("ids")).filter { row -> had.any { it.ids.contains(row) } }
        named.addAll(rows)
        val before = had.firstOrNull { it.ids.contains(rows.firstOrNull()) }
        val changed = before == null || before.value != e.optString("value").trim() || before.type != e.optInt("type") || before.label != e.optString("label")
        if (rows.isEmpty()) insert(mime, values(e)) else if (changed) update(rows.first(), values(e))
        rows.drop(1).forEach(::delete)
      }
      had.flatMap { it.ids }.filter { it !in named }.forEach(::delete)
    }
    fun typed(e: JSONObject, value: String, type: String, label: String) = ContentValues().apply {
      put(value, e.optString("value").trim())
      put(type, e.optInt("type"))
      put(label, if (e.optInt("type") == 0) e.optString("label") else null)
    }
    entries("phones", Phone.CONTENT_ITEM_TYPE, existing?.phones ?: emptyList()) { typed(it, Phone.NUMBER, Phone.TYPE, Phone.LABEL) }
    entries("emails", Email.CONTENT_ITEM_TYPE, existing?.emails ?: emptyList()) { typed(it, Email.ADDRESS, Email.TYPE, Email.LABEL) }
    // An address as written, whole: Android puts it in its parts itself, so apps that read only those show it too.
    entries("addresses", StructuredPostal.CONTENT_ITEM_TYPE, existing?.addresses ?: emptyList()) { typed(it, StructuredPostal.FORMATTED_ADDRESS, StructuredPostal.TYPE, StructuredPostal.LABEL) }

    // A note and a birthday: kept once; empty deletes them.
    fun single(key: String, mime: String, had: Entry?, values: (String) -> ContentValues) {
      val text = v.optJSONObject(key)?.optString("value")?.trim().orEmpty()
      val rows = had?.ids ?: emptyList<Long>()
      if (text.isEmpty()) rows.forEach(::delete)
      else if (rows.isEmpty()) insert(mime, values(text))
      else {
        if (text != had?.value) update(rows.first(), values(text))
        rows.drop(1).forEach(::delete)
      }
    }
    single("note", Note.CONTENT_ITEM_TYPE, existing?.note) { ContentValues().apply { put(Note.NOTE, it) } }
    single("birthday", Event.CONTENT_ITEM_TYPE, existing?.birthday) { ContentValues().apply { put(Event.START_DATE, it); put(Event.TYPE, Event.TYPE_BIRTHDAY) } }

    // The company and job title, in their first row.
    val company = v.optString("company").trim()
    val title = v.optString("title").trim()
    val orgRows = existing?.org ?: emptyList<Long>()
    if (company.isEmpty() && title.isEmpty()) orgRows.forEach(::delete)
    else {
      val values = ContentValues().apply { put(Organization.COMPANY, company); put(Organization.TITLE, title) }
      if (orgRows.isEmpty()) insert(Organization.CONTENT_ITEM_TYPE, values)
      else if (company != existing?.company || title != existing.title) update(orgRows.first(), values)
    }

    if (existing != null) {
      val starred = v.optBoolean("starred")
      if (starred != existing.starred) {
        ops.add(ContentProviderOperation.newUpdate(ContentUris.withAppendedId(Contacts.CONTENT_URI, id)).withValue(Contacts.STARRED, if (starred) 1 else 0).build())
      }
    }
    if (ops.isEmpty()) return id
    val results = resolver.applyBatch(ContactsContract.AUTHORITY, ops)
    if (existing != null) return id
    val rawId = results.firstOrNull()?.uri?.let(ContentUris::parseId) ?: throw IllegalStateException("The contact could not be saved")
    return contactOf(resolver, rawId) ?: throw IllegalStateException("The contact could not be saved")
  }

  private fun nameRow(resolver: ContentResolver, raw: Long): Long? {
    if (raw < 0) return null
    resolver.query(Data.CONTENT_URI, arrayOf(Data._ID), "${Data.RAW_CONTACT_ID}=? AND ${Data.MIMETYPE}=?", arrayOf(raw.toString(), StructuredName.CONTENT_ITEM_TYPE), null)?.use { c ->
      if (c.moveToFirst()) return c.getLong(0)
    }
    return null
  }

  fun contactOf(resolver: ContentResolver, raw: Long): Long? {
    resolver.query(ContentUris.withAppendedId(RawContacts.CONTENT_URI, raw), arrayOf(RawContacts.CONTACT_ID), null, null, null)?.use { c ->
      if (c.moveToFirst() && !c.isNull(0)) return c.getLong(0)
    }
    return null
  }

  /** Deletes contacts, with all their raw contacts: an account's sync deletes them there too. */
  fun remove(context: Context, ids: List<Long>) {
    val ops = ArrayList(ids.map { ContentProviderOperation.newDelete(ContentUris.withAppendedId(Contacts.CONTENT_URI, it)).build() })
    if (ops.isNotEmpty()) context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
  }

  fun setStarred(context: Context, id: Long, starred: Boolean) {
    val values = ContentValues().apply { put(Contacts.STARRED, if (starred) 1 else 0) }
    context.contentResolver.update(ContentUris.withAppendedId(Contacts.CONTENT_URI, id), values, null, null)
  }

  /** The account types whose contacts their app sends back to its server: a new contact can be kept there. */
  private fun writableTypes(): Set<String> =
    ContentResolver.getSyncAdapterTypes().filter { it.authority == ContactsContract.AUTHORITY && it.supportsUploading() }.map { it.accountType }.toSet()

  /** The accounts contacts are kept in now that take new ones, besides the phone itself. */
  fun accounts(context: Context): List<Map<String, Any?>> {
    if (!canRead(context)) return emptyList()
    val writable = writableTypes()
    val found = LinkedHashMap<String, Account>()
    context.contentResolver.query(RawContacts.CONTENT_URI, arrayOf(RawContacts.ACCOUNT_TYPE, RawContacts.ACCOUNT_NAME), "${RawContacts.DELETED}=0", null, null)?.use { c ->
      while (c.moveToNext()) {
        val type = c.getString(0) ?: continue
        val name = c.getString(1) ?: continue
        if (type in writable) found.getOrPut("$type\n$name") { Account(type, name) }
      }
    }
    return found.values.map { it.map() }
  }

  /** A contact's photo as base64: its thumbnail, or the largest Android has (`large`). Null when it has none. */
  fun photo(context: Context, id: Long, large: Boolean): String? {
    if (!canRead(context)) return null
    val uri = ContentUris.withAppendedId(Contacts.CONTENT_URI, id)
    val bytes = Contacts.openContactPhotoInputStream(context.contentResolver, uri, large)?.use { it.readBytes() } ?: return null
    return Base64.encodeToString(bytes, Base64.NO_WRAP)
  }

  /** The raw contact a change to the whole contact goes in: the one its name is from, or its first. */
  private fun mainRaw(resolver: ContentResolver, contact: Long): Long? {
    resolver.query(ContentUris.withAppendedId(Contacts.CONTENT_URI, contact), arrayOf(Contacts.NAME_RAW_CONTACT_ID), null, null, null)?.use { c ->
      if (c.moveToFirst() && !c.isNull(0)) return c.getLong(0)
    }
    return raws(resolver, contact).firstOrNull()?.first
  }

  /**
   * Gives a contact a photo (JPEG or PNG bytes) in its main raw contact, the one shown over those
   * other accounts give it; Android keeps it as the large photo and makes the thumbnail from it, at
   * once. With no bytes, its photos are taken away in every account.
   */
  fun setPhoto(context: Context, id: Long, data: ByteArray) {
    val resolver = context.contentResolver
    val rows = ArrayList<Pair<Long, Long>>()
    resolver.query(Data.CONTENT_URI, arrayOf(Data._ID, Data.RAW_CONTACT_ID), "${Data.CONTACT_ID}=? AND ${Data.MIMETYPE}=?", arrayOf(id.toString(), Photo.CONTENT_ITEM_TYPE), null)?.use { c ->
      while (c.moveToNext()) rows.add(c.getLong(0) to c.getLong(1))
    }
    val ops = ArrayList<ContentProviderOperation>()
    if (data.isEmpty()) {
      rows.forEach { ops.add(ContentProviderOperation.newDelete(ContentUris.withAppendedId(Data.CONTENT_URI, it.first)).build()) }
    } else {
      val raw = mainRaw(resolver, id) ?: throw IllegalStateException("This contact is gone")
      val values = ContentValues().apply {
        put(Photo.PHOTO, data)
        put(Data.IS_PRIMARY, 1)
        put(Data.IS_SUPER_PRIMARY, 1)
      }
      val row = rows.firstOrNull { it.second == raw }?.first
      ops.add(
        if (row != null) {
          ContentProviderOperation.newUpdate(ContentUris.withAppendedId(Data.CONTENT_URI, row)).withValues(values).build()
        } else {
          ContentProviderOperation.newInsert(Data.CONTENT_URI).withValue(Data.RAW_CONTACT_ID, raw).withValue(Data.MIMETYPE, Photo.CONTENT_ITEM_TYPE).withValues(values).build()
        },
      )
    }
    if (ops.isNotEmpty()) resolver.applyBatch(ContactsContract.AUTHORITY, ops)
  }

  /**
   * The groups (labels) contacts can be put in, with how many contacts are in each: Android's own,
   * in the account each belongs to. Those Android fills itself (an account's "My Contacts", the
   * starred) are left out.
   */
  fun groups(context: Context): List<Map<String, Any?>> {
    if (!canRead(context)) return emptyList()
    val resolver = context.contentResolver
    val counts = HashMap<Long, MutableSet<Long>>()
    resolver.query(Data.CONTENT_URI, arrayOf(GroupMembership.GROUP_ROW_ID, Data.CONTACT_ID), "${Data.MIMETYPE}=?", arrayOf(GroupMembership.CONTENT_ITEM_TYPE), null)?.use { c ->
      while (c.moveToNext()) if (!c.isNull(0)) counts.getOrPut(c.getLong(0)) { HashSet() }.add(c.getLong(1))
    }
    val groups = ArrayList<Map<String, Any?>>()
    val columns = arrayOf(Groups._ID, Groups.TITLE, Groups.ACCOUNT_TYPE, Groups.ACCOUNT_NAME, Groups.GROUP_IS_READ_ONLY, Groups.AUTO_ADD, Groups.FAVORITES)
    resolver.query(Groups.CONTENT_URI, columns, "${Groups.DELETED}=0", null, null)?.use { c ->
      while (c.moveToNext()) {
        if (c.getInt(5) != 0 || c.getInt(6) != 0) continue
        val id = c.getLong(0)
        groups.add(
          mapOf(
            "id" to id.toDouble(),
            "title" to (c.getString(1) ?: ""),
            "account" to Account(c.getString(2) ?: "", c.getString(3) ?: "").map(),
            "count" to (counts[id]?.size ?: 0).toDouble(),
            "readOnly" to (c.getInt(4) != 0),
          ),
        )
      }
    }
    return groups
  }

  fun createGroup(context: Context, title: String, type: String, name: String): Long {
    val values = ContentValues().apply {
      put(Groups.TITLE, title)
      put(Groups.ACCOUNT_TYPE, type.ifEmpty { null })
      put(Groups.ACCOUNT_NAME, name.ifEmpty { null })
      put(Groups.GROUP_VISIBLE, 1)
    }
    val uri = context.contentResolver.insert(Groups.CONTENT_URI, values) ?: throw IllegalStateException("The group could not be made")
    return ContentUris.parseId(uri)
  }

  fun renameGroup(context: Context, id: Long, title: String) {
    context.contentResolver.update(ContentUris.withAppendedId(Groups.CONTENT_URI, id), ContentValues().apply { put(Groups.TITLE, title) }, null, null)
  }

  /** Deletes a group, and with it who is in it; the contacts stay. */
  fun deleteGroup(context: Context, id: Long) {
    context.contentResolver.delete(ContentUris.withAppendedId(Groups.CONTENT_URI, id), null, null)
  }

  /** The group's account. */
  private fun groupAccount(resolver: ContentResolver, group: Long): Account? {
    resolver.query(ContentUris.withAppendedId(Groups.CONTENT_URI, group), arrayOf(Groups.ACCOUNT_TYPE, Groups.ACCOUNT_NAME), null, null, null)?.use { c ->
      if (c.moveToFirst()) return Account(c.getString(0) ?: "", c.getString(1) ?: "")
    }
    return null
  }

  /** The contact's raw contacts, with their accounts. */
  private fun raws(resolver: ContentResolver, contact: Long): List<Pair<Long, Account>> {
    val found = ArrayList<Pair<Long, Account>>()
    resolver.query(RawContacts.CONTENT_URI, arrayOf(RawContacts._ID, RawContacts.ACCOUNT_TYPE, RawContacts.ACCOUNT_NAME), "${RawContacts.CONTACT_ID}=? AND ${RawContacts.DELETED}=0", arrayOf(contact.toString()), null)?.use { c ->
      while (c.moveToNext()) found.add(c.getLong(0) to Account(c.getString(1) ?: "", c.getString(2) ?: ""))
    }
    return found
  }

  /** The rows that put a contact in a group. */
  private fun memberships(resolver: ContentResolver, group: Long, contact: Long): List<Long> {
    val rows = ArrayList<Long>()
    resolver.query(Data.CONTENT_URI, arrayOf(Data._ID), "${Data.MIMETYPE}=? AND ${GroupMembership.GROUP_ROW_ID}=? AND ${Data.CONTACT_ID}=?", arrayOf(GroupMembership.CONTENT_ITEM_TYPE, group.toString(), contact.toString()), null)?.use { c ->
      while (c.moveToNext()) rows.add(c.getLong(0))
    }
    return rows
  }

  /**
   * Puts a contact in a group, in its raw contact of the group's account, as an account's sync
   * keeps only its own groups. False when the contact is kept in no raw contact of that account.
   */
  fun addToGroup(context: Context, group: Long, contact: Long): Boolean {
    val resolver = context.contentResolver
    if (memberships(resolver, group, contact).isNotEmpty()) return true
    val account = groupAccount(resolver, group) ?: throw IllegalStateException("That group is gone")
    val raw = raws(resolver, contact).firstOrNull { account.same(it.second.type, it.second.name) }?.first ?: return false
    val values = ContentValues().apply {
      put(Data.RAW_CONTACT_ID, raw)
      put(Data.MIMETYPE, GroupMembership.CONTENT_ITEM_TYPE)
      put(GroupMembership.GROUP_ROW_ID, group)
    }
    resolver.insert(Data.CONTENT_URI, values)
    return true
  }

  fun removeFromGroup(context: Context, group: Long, contact: Long) {
    val resolver = context.contentResolver
    val ops = ArrayList(memberships(resolver, group, contact).map { ContentProviderOperation.newDelete(ContentUris.withAppendedId(Data.CONTENT_URI, it)).build() })
    if (ops.isNotEmpty()) resolver.applyBatch(ContactsContract.AUTHORITY, ops)
  }

  /** The contact a content:// address of Android's contacts names (a contact, a lookup, a raw contact or one of its rows). */
  fun contactFor(context: Context, uri: Uri): Long? {
    val resolver = context.contentResolver
    val path = uri.pathSegments
    return try {
      when {
        uri.authority != ContactsContract.AUTHORITY && uri.authority != "contacts" -> null
        path.firstOrNull() == "raw_contacts" -> uri.lastPathSegment?.toLongOrNull()?.let { contactOf(resolver, it) }
        path.firstOrNull() == "data" -> resolver.query(uri, arrayOf(Data.CONTACT_ID), null, null, null)?.use { c -> if (c.moveToFirst()) c.getLong(0) else null }
        path.firstOrNull() == "people" -> uri.lastPathSegment?.toLongOrNull()?.let { contactOf(resolver, it) }
        else -> Contacts.lookupContact(resolver, uri)?.let(ContentUris::parseId)
          ?: resolver.query(uri, arrayOf(Contacts._ID), null, null, null)?.use { c -> if (c.moveToFirst()) c.getLong(0) else null }
      }
    } catch (_: Exception) {
      null
    }
  }
}
