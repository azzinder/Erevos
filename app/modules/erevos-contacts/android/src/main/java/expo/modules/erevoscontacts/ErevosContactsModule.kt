package expo.modules.erevoscontacts

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS API for the phone's contacts (ContactsStore). Events are posted to the main looper. Compiled
 * against Android's classes only; not run yet.
 */
class ErevosContactsModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var observer: ContentObserver? = null

  private fun context(): Context = appContext.reactContext ?: throw IllegalStateException("No app context")

  override fun definition() = ModuleDefinition {
    Name("ErevosContacts")
    Events("onContactsChanged")

    OnDestroy {
      observer?.let { appContext.reactContext?.contentResolver?.unregisterContentObserver(it) }
      observer = null
    }

    Function("status") {
      val context = appContext.reactContext
      val granted = { permission: String -> context?.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED }
      mapOf(
        "read" to granted(Manifest.permission.READ_CONTACTS),
        "write" to granted(Manifest.permission.WRITE_CONTACTS),
        "calls" to granted(Manifest.permission.READ_CALL_LOG),
        "birthdays" to false,
      )
    }

    // Tells the app each time Android's contacts change, a moment after, once it may read them.
    Function("watch") {
      val context = context()
      if (observer != null || !ContactsStore.canRead(context)) return@Function null
      val watching = object : ContentObserver(main) {
        private var due = false

        override fun onChange(selfChange: Boolean) {
          if (due) return
          due = true
          main.postDelayed({
            due = false
            sendEvent("onContactsChanged", mapOf())
          }, 500)
        }
      }
      try {
        context.contentResolver.registerContentObserver(ContactsContract.Contacts.CONTENT_URI, true, watching)
        observer = watching
      } catch (_: SecurityException) {
        // Not allowed yet: watched once it is.
      }
    }

    AsyncFunction("all") { ContactsStore.all(context()) }
    AsyncFunction("one") { id: Double -> ContactsStore.one(context(), id.toLong()) }
    AsyncFunction("save") { contact: String -> ContactsStore.save(context(), contact).toDouble() }
    AsyncFunction("remove") { ids: List<Double> -> ContactsStore.remove(context(), ids.map { it.toLong() }) }
    AsyncFunction("setStarred") { id: Double, starred: Boolean -> ContactsStore.setStarred(context(), id.toLong(), starred) }
    AsyncFunction("accounts") { ContactsStore.accounts(context()) }
    AsyncFunction("photo") { id: Double, large: Boolean -> ContactsStore.photo(context(), id.toLong(), large) }
    AsyncFunction("setPhoto") { id: Double, data: ByteArray -> ContactsStore.setPhoto(context(), id.toLong(), data) }
    AsyncFunction("groups") { ContactsStore.groups(context()) }
    AsyncFunction("createGroup") { title: String, type: String, name: String -> ContactsStore.createGroup(context(), title, type, name).toDouble() }
    AsyncFunction("renameGroup") { id: Double, title: String -> ContactsStore.renameGroup(context(), id.toLong(), title) }
    AsyncFunction("deleteGroup") { id: Double -> ContactsStore.deleteGroup(context(), id.toLong()) }
    AsyncFunction("addToGroup") { group: Double, contact: Double -> ContactsStore.addToGroup(context(), group.toLong(), contact.toLong()) }
    AsyncFunction("removeFromGroup") { group: Double, contact: Double -> ContactsStore.removeFromGroup(context(), group.toLong(), contact.toLong()) }
  }
}
