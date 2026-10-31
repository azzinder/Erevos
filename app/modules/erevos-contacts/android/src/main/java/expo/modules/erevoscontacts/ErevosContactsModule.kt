// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscontacts

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val RINGTONE = 7301

/**
 * JS API for the phone's contacts (ContactsStore). Events are posted to the main looper.
 */
class ErevosContactsModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var observer: ContentObserver? = null
  private var picking: Promise? = null
  private var pickingFor = 0L

  private fun context(): Context = appContext.reactContext ?: throw IllegalStateException("No app context")

  @Suppress("DEPRECATION")
  private fun pickedUri(data: Intent): Uri? =
    if (Build.VERSION.SDK_INT >= 33) data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI, Uri::class.java) else data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)

  override fun definition() = ModuleDefinition {
    Name("ErevosContacts")
    Events("onContactsChanged")

    OnDestroy {
      observer?.let { appContext.reactContext?.contentResolver?.unregisterContentObserver(it) }
      observer = null
    }

    // The ringtone picked for a contact is kept as its own at once: its address, '' for the
    // phone's own (the picker's Default), or null if the owner went back.
    OnActivityResult { _, payload ->
      if (payload.requestCode != RINGTONE) return@OnActivityResult
      val promise = picking ?: return@OnActivityResult
      picking = null
      if (payload.resultCode != Activity.RESULT_OK) {
        promise.resolve(null)
        return@OnActivityResult
      }
      val uri = payload.data?.let { pickedUri(it) }
      val chosen = if (uri == null || RingtoneManager.isDefault(uri)) "" else uri.toString()
      try {
        ContactsStore.setRingtone(context(), pickingFor, chosen)
        promise.resolve(chosen)
      } catch (e: Exception) {
        promise.reject("ERR_RINGTONE", e.message, e)
      }
    }

    Function("status") {
      val context = appContext.reactContext
      val granted = { permission: String -> context?.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED }
      mapOf(
        "read" to granted(Manifest.permission.READ_CONTACTS),
        "write" to granted(Manifest.permission.WRITE_CONTACTS),
        "birthdays" to (context != null && Birthdays.isOn(context)),
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
    // Android's own ringtone picker, its sounds and those added to it, for one contact.
    AsyncFunction("pickRingtone") { id: Double, promise: Promise ->
      val activity = appContext.currentActivity ?: throw IllegalStateException("No activity")
      if (picking != null) throw IllegalStateException("A ringtone is being picked already")
      val now = ContactsStore.ringtone(context(), id.toLong())?.let(Uri::parse)
      val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_RINGTONE)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI, Settings.System.DEFAULT_RINGTONE_URI)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, now ?: Settings.System.DEFAULT_RINGTONE_URI)
      picking = promise
      pickingFor = id.toLong()
      try {
        activity.startActivityForResult(intent, RINGTONE)
      } catch (e: Exception) {
        picking = null
        promise.reject("ERR_RINGTONE", e.message, e)
      }
    }
    AsyncFunction("ringtoneName") { uri: String -> ContactsStore.ringtoneName(context(), uri) }
    AsyncFunction("readQr") { uri: String -> QrReader.read(context(), uri) }
    AsyncFunction("readQrBytes") { uri: String -> QrReader.readBytes(context(), uri) }
    AsyncFunction("setBirthdays") { on: Boolean -> Birthdays.setOn(context(), on) }
    AsyncFunction("simContacts") { SimContacts.all(context()) }
    AsyncFunction("groups") { ContactsStore.groups(context()) }
    AsyncFunction("createGroup") { title: String, type: String, name: String -> ContactsStore.createGroup(context(), title, type, name).toDouble() }
    AsyncFunction("renameGroup") { id: Double, title: String -> ContactsStore.renameGroup(context(), id.toLong(), title) }
    AsyncFunction("deleteGroup") { id: Double -> ContactsStore.deleteGroup(context(), id.toLong()) }
    AsyncFunction("addToGroup") { group: Double, contact: Double -> ContactsStore.addToGroup(context(), group.toLong(), contact.toLong()) }
    AsyncFunction("removeFromGroup") { group: Double, contact: Double -> ContactsStore.removeFromGroup(context(), group.toLong(), contact.toLong()) }
    AsyncFunction("takeOver") { keeper: Double, others: List<Double> -> ContactsStore.takeOver(context(), keeper.toLong(), others.map { it.toLong() }) }
  }
}
