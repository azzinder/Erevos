package expo.modules.erevoscontacts

import android.app.Activity
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.ContactsContract
import android.provider.ContactsContract.CommonDataKinds.Email
import android.provider.ContactsContract.CommonDataKinds.Event
import android.provider.ContactsContract.CommonDataKinds.Note
import android.provider.ContactsContract.CommonDataKinds.Organization
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.provider.ContactsContract.CommonDataKinds.StructuredName
import android.provider.ContactsContract.CommonDataKinds.StructuredPostal
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import java.text.Normalizer
import org.json.JSONArray
import org.json.JSONObject

// Other apps' requests about contacts, as Android sends them to a contacts app: to add one (with
// what they know of it), to add to one, to change one, to show one, and to pick one. Not built
// into the app or run yet.

private const val TAG = "ErevosContacts"

/** Whether the app shows in Greek, as the call module keeps it (erevos-call Notices.kt). */
private fun greek(context: Context): Boolean =
  context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) == "el"

/**
 * Opens what another app asks for in Erevos, behind its lock: a new contact with the fields it
 * gave (INSERT), the contacts to choose one to add them to (INSERT_OR_EDIT), or a contact to
 * change (EDIT) or show (VIEW, QUICK_CONTACT). Erevos's own screens are opened by link (erevos://),
 * and this closes at once. Whoever asked gets no answer back.
 */
class ContactIntentActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val link = try {
      linkFor(intent)
    } catch (e: Exception) {
      Log.w(TAG, "A contact request could not be read", e)
      Uri.parse("erevos://contacts")
    }
    try {
      startActivity(Intent(Intent.ACTION_VIEW, link).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      packageManager.getLaunchIntentForPackage(packageName)?.let(::startActivity)
    }
    finish()
  }

  private fun linkFor(intent: Intent): Uri {
    val screen = Uri.Builder().scheme("erevos")
    return when (intent.action) {
      Intent.ACTION_INSERT -> screen.authority("contact-edit").appendQueryParameter("fill", ContactIntents.fields(intent).toString()).build()
      Intent.ACTION_INSERT_OR_EDIT -> screen.authority("contacts").appendQueryParameter("add", ContactIntents.fields(intent).toString()).build()
      Intent.ACTION_EDIT -> {
        val id = intent.data?.let { ContactIntents.contactFor(this, it) }
        if (id != null) screen.authority("contact-edit").appendQueryParameter("id", id.toString()).build() else screen.authority("contacts").build()
      }
      else -> {
        val id = intent.data?.let { ContactIntents.contactFor(this, it) }
        if (id != null) screen.authority("contact-card").appendQueryParameter("id", id.toString()).build() else screen.authority("contacts").build()
      }
    }
  }
}

/**
 * Erevos's Contacts as an app of its own in the phone's launcher, with an icon of its own: it
 * opens them (erevos://contacts), behind Erevos's lock, and closes at once.
 */
class ContactsLauncherActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    try {
      startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("erevos://contacts")).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      packageManager.getLaunchIntentForPackage(packageName)?.let(::startActivity)
    }
    finish()
  }
}

internal object ContactIntents {
  /** The contact (its id) a contacts address names: a contact's (by lookup key or id), a raw contact's or a row's. */
  fun contactFor(context: Context, uri: Uri): Long? =
    try {
      val first = uri.pathSegments.firstOrNull()
      when {
        uri.authority != ContactsContract.AUTHORITY -> null
        first == "raw_contacts" -> idOf(context, ContactsContract.RawContacts.CONTENT_URI, ContactsContract.RawContacts.CONTACT_ID, ContentUris.parseId(uri))
        first == "data" -> idOf(context, ContactsContract.Data.CONTENT_URI, ContactsContract.Data.CONTACT_ID, ContentUris.parseId(uri))
        else -> ContactsContract.Contacts.lookupContact(context.contentResolver, uri)?.let(ContentUris::parseId)
      }
    } catch (e: Exception) {
      // Not allowed to read the contacts yet, or not an address of one.
      Log.w(TAG, "No contact for $uri", e)
      null
    }

  private fun idOf(context: Context, table: Uri, column: String, row: Long): Long? =
    context.contentResolver.query(ContentUris.withAppendedId(table, row), arrayOf(column), null, null, null)?.use { c ->
      if (c.moveToFirst()) c.getLong(0) else null
    }

  private fun entry(value: String?, type: Any?, label: String?): JSONObject? {
    val v = value?.trim().orEmpty()
    if (v.isEmpty()) return null
    val e = JSONObject().put("value", v)
    when (type) {
      is Int -> e.put("type", type).put("label", label.orEmpty())
      // A type given as text is the owner's own label.
      is String -> e.put("type", 0).put("label", type)
      else -> if (!label.isNullOrEmpty()) e.put("type", 0).put("label", label)
    }
    return e
  }

  @Suppress("DEPRECATION")
  private fun dataRows(intent: Intent): List<ContentValues> =
    (if (Build.VERSION.SDK_INT >= 33) intent.getParcelableArrayListExtra(ContactsContract.Intents.Insert.DATA, ContentValues::class.java)
    else intent.getParcelableArrayListExtra<ContentValues>(ContactsContract.Intents.Insert.DATA)) ?: emptyList()

  /**
   * What another app gave of a contact, as the contact screen takes it (lib/contacts.ts
   * askedFields): its extras (a name, three numbers and emails, an address, company, job title,
   * note), and its rows (DATA) of the kinds Erevos shows. Android's types go as they are.
   */
  @Suppress("DEPRECATION")
  fun fields(intent: Intent): JSONObject {
    val extras = intent.extras ?: Bundle()
    val out = JSONObject()
    val phones = JSONArray()
    val emails = JSONArray()
    val addresses = JSONArray()
    val text = { key: String -> extras.get(key)?.toString()?.trim().orEmpty() }
    out.put("name", text(ContactsContract.Intents.Insert.NAME))
    out.put("company", text(ContactsContract.Intents.Insert.COMPANY))
    out.put("title", text(ContactsContract.Intents.Insert.JOB_TITLE))
    out.put("note", text(ContactsContract.Intents.Insert.NOTES))
    listOf(
      ContactsContract.Intents.Insert.PHONE to ContactsContract.Intents.Insert.PHONE_TYPE,
      ContactsContract.Intents.Insert.SECONDARY_PHONE to ContactsContract.Intents.Insert.SECONDARY_PHONE_TYPE,
      ContactsContract.Intents.Insert.TERTIARY_PHONE to ContactsContract.Intents.Insert.TERTIARY_PHONE_TYPE,
    ).forEach { (value, type) -> entry(text(value), extras.get(type), null)?.let(phones::put) }
    listOf(
      ContactsContract.Intents.Insert.EMAIL to ContactsContract.Intents.Insert.EMAIL_TYPE,
      ContactsContract.Intents.Insert.SECONDARY_EMAIL to ContactsContract.Intents.Insert.SECONDARY_EMAIL_TYPE,
      ContactsContract.Intents.Insert.TERTIARY_EMAIL to ContactsContract.Intents.Insert.TERTIARY_EMAIL_TYPE,
    ).forEach { (value, type) -> entry(text(value), extras.get(type), null)?.let(emails::put) }
    entry(text(ContactsContract.Intents.Insert.POSTAL), extras.get(ContactsContract.Intents.Insert.POSTAL_TYPE), null)?.let(addresses::put)
    for (row in dataRows(intent)) {
      val type = row.getAsInteger(ContactsContract.Data.DATA2)
      val label = row.getAsString(ContactsContract.Data.DATA3)
      when (row.getAsString(ContactsContract.Data.MIMETYPE)) {
        Phone.CONTENT_ITEM_TYPE -> entry(row.getAsString(Phone.NUMBER), type, label)?.let(phones::put)
        Email.CONTENT_ITEM_TYPE -> entry(row.getAsString(Email.ADDRESS), type, label)?.let(emails::put)
        StructuredPostal.CONTENT_ITEM_TYPE -> {
          val whole = row.getAsString(StructuredPostal.FORMATTED_ADDRESS)?.takeIf { it.isNotBlank() }
            ?: listOf(StructuredPostal.STREET, StructuredPostal.POSTCODE, StructuredPostal.CITY, StructuredPostal.REGION, StructuredPostal.COUNTRY)
              .mapNotNull { row.getAsString(it)?.trim()?.takeIf(String::isNotEmpty) }
              .joinToString("\n")
          entry(whole, type, label)?.let(addresses::put)
        }
        StructuredName.CONTENT_ITEM_TYPE -> {
          row.getAsString(StructuredName.GIVEN_NAME)?.let { out.put("given", it) }
          row.getAsString(StructuredName.FAMILY_NAME)?.let { out.put("family", it) }
          if (out.optString("name").isEmpty()) row.getAsString(StructuredName.DISPLAY_NAME)?.let { out.put("name", it) }
        }
        Organization.CONTENT_ITEM_TYPE -> {
          row.getAsString(Organization.COMPANY)?.let { out.put("company", it) }
          row.getAsString(Organization.TITLE)?.let { out.put("title", it) }
        }
        Note.CONTENT_ITEM_TYPE -> row.getAsString(Note.NOTE)?.let { out.put("note", it) }
        Event.CONTENT_ITEM_TYPE -> if (type == Event.TYPE_BIRTHDAY) row.getAsString(Event.START_DATE)?.let { out.put("birthday", it) }
      }
    }
    out.put("phones", phones).put("emails", emails).put("addresses", addresses)
    return out
  }
}

/** What a pick asks for: a contact, or one of its numbers, emails or addresses. */
private enum class Picked { CONTACT, PHONE, EMAIL, POSTAL }

private class Choice(val name: String, val detail: String, val uri: Uri, val words: String)

/**
 * Another app's request to pick a contact (PICK, GET_CONTENT), or one of its numbers, emails or
 * addresses: the phone's contacts, from Android's contacts, to search and tap. Only the phone's:
 * those kept only in Erevos are sealed, and never shown here. The one tapped goes back to the app
 * as its address in Android's contacts, which that app may then read, that row only.
 */
class PickContactActivity : Activity() {
  private var all: List<Choice> = emptyList()
  private var shown: List<Choice> = emptyList()
  private lateinit var adapter: BaseAdapter

  private fun plain(text: String): String =
    Normalizer.normalize(text.lowercase(), Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "")

  override fun onCreate(savedInstanceState: Bundle?) {
    // The phone's light or dark, as the rest of its screens.
    val night = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    setTheme(if (night) android.R.style.Theme_DeviceDefault else android.R.style.Theme_DeviceDefault_Light)
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)
    val el = greek(this)
    val type = intent.type ?: intent.resolveType(this).orEmpty()
    val picked = when {
      type.endsWith("/phone_v2") -> Picked.PHONE
      type.endsWith("/email_v2") -> Picked.EMAIL
      type.endsWith("/postal-address_v2") -> Picked.POSTAL
      else -> Picked.CONTACT
    }
    title = when (picked) {
      Picked.PHONE -> if (el) "Διάλεξε αριθμό" else "Choose a number"
      Picked.EMAIL -> if (el) "Διάλεξε email" else "Choose an email"
      Picked.POSTAL -> if (el) "Διάλεξε διεύθυνση" else "Choose an address"
      Picked.CONTACT -> if (el) "Διάλεξε επαφή" else "Choose a contact"
    }
    val pad = (16 * resources.displayMetrics.density).toInt()
    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(pad, pad / 2, pad, 0)
    }
    if (!ContactsStore.canRead(this)) {
      layout.addView(TextView(this).apply {
        text = if (el) "Το Erevos δεν μπορεί ακόμα να διαβάσει τις επαφές του τηλεφώνου. Άνοιξε τις Επαφές στο Erevos για να το επιτρέψεις."
          else "Erevos may not read the phone's contacts yet. Open Contacts in Erevos to allow it."
        setPadding(0, pad, 0, pad)
      })
      setContentView(layout)
      return
    }
    val search = EditText(this).apply {
      hint = if (el) "Αναζήτηση" else "Search"
      inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_FILTER
      isSingleLine = true
    }
    val list = ListView(this)
    adapter = object : BaseAdapter() {
      override fun getCount() = shown.size
      override fun getItem(position: Int) = shown[position]
      override fun getItemId(position: Int) = position.toLong()
      override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
        val view = convertView ?: layoutInflater.inflate(android.R.layout.simple_list_item_2, parent, false)
        val choice = shown[position]
        view.findViewById<TextView>(android.R.id.text1).text = choice.name
        view.findViewById<TextView>(android.R.id.text2).apply {
          text = choice.detail
          visibility = if (choice.detail.isEmpty()) View.GONE else View.VISIBLE
        }
        return view
      }
    }
    list.adapter = adapter
    list.setOnItemClickListener { _, _, position, _ ->
      val choice = shown.getOrNull(position) ?: return@setOnItemClickListener
      setResult(RESULT_OK, Intent().setData(choice.uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
      finish()
    }
    search.addTextChangedListener(object : TextWatcher {
      override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
      override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
      override fun afterTextChanged(s: Editable?) {
        val words = plain(s?.toString().orEmpty()).split(Regex("\\s+")).filter(String::isNotEmpty)
        val digits = s?.toString().orEmpty().filter { it.isDigit() }
        shown = all.filter { c -> words.all { c.words.contains(it) } || (digits.length >= 3 && c.detail.filter { it.isDigit() }.contains(digits)) }
        adapter.notifyDataSetChanged()
      }
    })
    layout.addView(search)
    layout.addView(list, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
    setContentView(layout)
    Thread {
      val found = try {
        load(picked)
      } catch (e: Exception) {
        Log.w(TAG, "The contacts to pick from could not be read", e)
        emptyList()
      }
      runOnUiThread {
        all = found
        shown = found
        adapter.notifyDataSetChanged()
      }
    }.start()
  }

  private fun load(picked: Picked): List<Choice> {
    val resolver = contentResolver
    val found = mutableListOf<Choice>()
    if (picked == Picked.CONTACT) {
      val projection = arrayOf(ContactsContract.Contacts._ID, ContactsContract.Contacts.LOOKUP_KEY, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY)
      resolver.query(ContactsContract.Contacts.CONTENT_URI, projection, null, null, "${ContactsContract.Contacts.DISPLAY_NAME_PRIMARY} COLLATE LOCALIZED ASC")?.use { c ->
        while (c.moveToNext()) {
          val name = c.getString(2).orEmpty()
          found.add(Choice(name, "", ContactsContract.Contacts.getLookupUri(c.getLong(0), c.getString(1)), plain(name)))
        }
      }
      return found
    }
    val (table, column) = when (picked) {
      Picked.PHONE -> Phone.CONTENT_URI to Phone.NUMBER
      Picked.EMAIL -> Email.CONTENT_URI to Email.ADDRESS
      else -> StructuredPostal.CONTENT_URI to StructuredPostal.FORMATTED_ADDRESS
    }
    val projection = arrayOf(ContactsContract.Data._ID, ContactsContract.Data.DISPLAY_NAME_PRIMARY, column)
    resolver.query(table, projection, null, null, "${ContactsContract.Data.DISPLAY_NAME_PRIMARY} COLLATE LOCALIZED ASC")?.use { c ->
      while (c.moveToNext()) {
        val name = c.getString(1).orEmpty()
        val detail = c.getString(2).orEmpty()
        if (detail.isBlank()) continue
        found.add(Choice(name.ifEmpty { detail }, detail, ContentUris.withAppendedId(ContactsContract.Data.CONTENT_URI, c.getLong(0)), plain("$name $detail")))
      }
    }
    return found
  }
}
