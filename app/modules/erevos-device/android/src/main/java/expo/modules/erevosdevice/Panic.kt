// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.app.ActivityManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.DocumentsContract
import android.util.Log
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest

/**
 * The panic button (lib/panic.ts): wiping everything Erevos keeps on the phone, at once, from its
 * own Settings or from a panic app the owner trusts, through PanicKit's intents (PanicActivity.kt).
 *
 * What goes: Erevos's whole app data, by Android's own clearApplicationUserData, which is what
 * Settings → Apps → Erevos → Clear storage does: every space and hidden chats with their keys,
 * contacts, messages, photos, files and voice messages, the lock, the Matrix, XMPP and Nostr
 * accounts, the relay's tokens, automatic backups' key and settings, the backup server's address
 * and password, and the keys Erevos keeps in the Android Keystore, which Android deletes with the
 * data. Android then stops Erevos, with its notices and alarms. When the owner chose it, the
 * automatic backups in their folder go first (erevos-backup-*, the names Erevos gives them). The
 * Collection's music or video playing (modules/erevos-collection, PlayerService) is stopped first
 * too, so it does not play on for the moment the wipe takes.
 *
 * What stays: backups elsewhere (copied away, on a server: their password still guards them), what
 * a relay holds for this phone until it expires, what contacts' phones keep, and Erevos itself,
 * installed, as if just installed. Deleting on flash memory does not overwrite: what was deleted
 * stays unreadable because it was encrypted, with keys that are gone.
 *
 * The settings are kept apart from everything else, in SharedPreferences PREFS, as they have to be
 * read with no space open: whether a panic app may wipe (`on`), which one (its package and the
 * SHA-256 of its signing certificate, so another app installed later under its name is not
 * trusted), the one that asked last to be it, until the owner says yes or no, and when the
 * trusted app last asked to wipe and was refused (signed otherwise, or the switch off). They say
 * that the owner set a panic app, and which; nothing more.
 */
internal object Panic {
  private const val TAG = "ErevosDevice"
  private const val PREFS = "erevos-panic"
  private const val ON = "on"
  private const val TRIGGER = "trigger"
  private const val CERT = "cert"
  private const val PENDING = "pending"
  private const val PENDING_CERT = "pending-cert"
  private const val BACKUPS = "backups"
  private const val FOLDER = "folder"
  private const val REFUSED = "refused"
  private const val REFUSED_KEY = "refused-key"
  // The names Erevos gives backups (lock/backup.ts BACKUP_PREFIX).
  private const val BACKUP_PREFIX = "erevos-backup-"
  // The Collection's player service (modules/erevos-collection), named by its class, so this module does not depend on that one.
  private const val COLLECTION_PLAYER = "expo.modules.erevoscollection.PlayerService"

  // PanicKit's intents (info.guardianproject.panic.Panic).
  const val ACTION_TRIGGER = "info.guardianproject.panic.action.TRIGGER"
  const val ACTION_CONNECT = "info.guardianproject.panic.action.CONNECT"
  const val ACTION_DISCONNECT = "info.guardianproject.panic.action.DISCONNECT"

  private fun prefs(context: Context): SharedPreferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** The SHA-256 of the certificates `pkg` is signed with, hex, sorted and joined; null when not installed. */
  fun certOf(context: Context, pkg: String): String? = runCatching {
    val pm = context.packageManager
    val signatures = if (Build.VERSION.SDK_INT >= 28) {
      val info = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo ?: return@runCatching null
      if (info.hasMultipleSigners()) info.apkContentsSigners else info.signingCertificateHistory
    } else {
      @Suppress("DEPRECATION")
      pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES).signatures
    }
    signatures?.map { hex(MessageDigest.getInstance("SHA-256").digest(it.toByteArray())) }?.sorted()?.joinToString(",")?.ifEmpty { null }
  }.getOrNull()

  fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

  /** An app's name as the launcher shows it, or its package. */
  fun labelOf(context: Context, pkg: String): String = runCatching {
    val pm = context.packageManager
    pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
  }.getOrDefault(pkg)

  /**
   * Whether `pkg` is still signed as it was when the owner said yes. The same certificates, or,
   * from Android 9, a key the app moved to by APK key rotation: Android then keeps the old key in
   * the app's signing history, proved by the old key itself, and hasSigningCertificate finds it
   * there. A different app installed under the same name has neither.
   */
  private fun signedAsTrusted(context: Context, pkg: String, cert: String): Boolean {
    val now = certOf(context, pkg) ?: return false
    if (now == cert) return true
    if (Build.VERSION.SDK_INT < 28) return false
    return runCatching {
      val pm = context.packageManager
      cert.split(",").all { pm.hasSigningCertificate(pkg, unhex(it), PackageManager.CERT_INPUT_SHA256) }
    }.getOrDefault(false)
  }

  private fun unhex(text: String): ByteArray = ByteArray(text.length / 2) { text.substring(it * 2, it * 2 + 2).toInt(16).toByte() }

  /**
   * Whether `caller`, as Android names the app that started PanicActivity, is the panic app trusted
   * to wipe. When it is the trusted app but signed otherwise, or the switch is off, the time is
   * kept, so the panic screen can say it once the owner opens it; nothing else shows it.
   */
  fun trusted(context: Context, caller: String): Boolean {
    val prefs = prefs(context)
    val trigger = prefs.getString(TRIGGER, null) ?: return false
    val cert = prefs.getString(CERT, null) ?: return false
    if (caller != trigger) return false
    val on = prefs.getBoolean(ON, false)
    val signed = signedAsTrusted(context, caller, cert)
    if (!on || !signed) prefs.edit().putLong(REFUSED, System.currentTimeMillis()).putBoolean(REFUSED_KEY, !signed).apply()
    return on && signed
  }

  /** The owner trusts the panic app as it is signed now, after the panic screen said it changed. False when it is not installed. */
  fun renew(context: Context): Boolean {
    val prefs = prefs(context)
    val trigger = prefs.getString(TRIGGER, null) ?: return false
    val cert = certOf(context, trigger) ?: return false
    prefs.edit().putString(CERT, cert).remove(REFUSED).remove(REFUSED_KEY).apply()
    return true
  }

  /** The owner read that a wipe was refused. */
  fun seenRefused(context: Context) {
    prefs(context).edit().remove(REFUSED).remove(REFUSED_KEY).apply()
  }

  /** A panic app asked to be the one (PanicKit's CONNECT): kept until the owner answers in Erevos. */
  fun ask(context: Context, caller: String) {
    val cert = certOf(context, caller) ?: return
    prefs(context).edit().putString(PENDING, caller).putString(PENDING_CERT, cert).apply()
  }

  /** The owner said yes to the app that asked: it may wipe, while the panic setting is on. False when it is no longer the one that asked, or was changed since. */
  fun allow(context: Context, pkg: String): Boolean {
    val prefs = prefs(context)
    val cert = prefs.getString(PENDING_CERT, null)
    if (prefs.getString(PENDING, null) != pkg || cert == null || certOf(context, pkg) != cert) return false
    prefs.edit().putString(TRIGGER, pkg).putString(CERT, cert).remove(PENDING).remove(PENDING_CERT).remove(REFUSED).remove(REFUSED_KEY).apply()
    return true
  }

  fun refuse(context: Context) {
    prefs(context).edit().remove(PENDING).remove(PENDING_CERT).apply()
  }

  /** The panic app trusted, if any. */
  fun trigger(context: Context): String? = prefs(context).getString(TRIGGER, null)

  fun forget(context: Context) {
    prefs(context).edit().remove(TRIGGER).remove(CERT).remove(REFUSED).remove(REFUSED_KEY).apply()
  }

  /** Whether a panic app may wipe, and whether automatic backups in `folder` go too. */
  fun set(context: Context, on: Boolean, backups: Boolean, folder: String) {
    prefs(context).edit().putBoolean(ON, on).putBoolean(BACKUPS, backups && folder.isNotEmpty()).putString(FOLDER, folder).apply()
  }

  /** The settings, as lib/panic.ts reads them. */
  fun state(context: Context): Map<String, Any> {
    val prefs = prefs(context)
    val trigger = prefs.getString(TRIGGER, null).orEmpty()
    val pending = prefs.getString(PENDING, null).orEmpty()
    return mapOf(
      "on" to prefs.getBoolean(ON, false),
      "backups" to prefs.getBoolean(BACKUPS, false),
      "trigger" to trigger,
      "triggerLabel" to if (trigger.isEmpty()) "" else labelOf(context, trigger),
      "triggerThere" to (trigger.isNotEmpty() && signedAsTrusted(context, trigger, prefs.getString(CERT, null).orEmpty())),
      "triggerInstalled" to (trigger.isNotEmpty() && certOf(context, trigger) != null),
      "refused" to prefs.getLong(REFUSED, 0L).toDouble(),
      "refusedKey" to prefs.getBoolean(REFUSED_KEY, false),
      "pending" to pending,
      "pendingLabel" to if (pending.isEmpty()) "" else labelOf(context, pending),
    )
  }

  /**
   * Wipes everything Erevos keeps, on a thread of its own, as said above; Android then stops
   * Erevos. Nothing is asked and nothing is told.
   */
  fun wipe(context: Context) {
    val app = context.applicationContext
    Thread {
      Log.i(TAG, "Wiping")
      val prefs = prefs(app)
      runCatching { app.stopService(Intent().setClassName(app, COLLECTION_PLAYER)) }
      if (prefs.getBoolean(BACKUPS, false)) deleteBackups(app, prefs.getString(FOLDER, null).orEmpty())
      runCatching { app.getSystemService(NotificationManager::class.java)?.cancelAll() }
      val cleared = runCatching { app.getSystemService(ActivityManager::class.java)?.clearApplicationUserData() == true }.getOrDefault(false)
      if (!cleared) {
        // Android refused, as it should never: everything Erevos keeps is deleted here instead.
        wipeHere(app)
        Process.killProcess(Process.myPid())
      }
    }.start()
  }

  // The automatic backups in their folder (a tree Android's folder picker gave, lib/backup-place.ts).
  private fun deleteBackups(context: Context, folder: String) {
    if (folder.isEmpty()) return
    runCatching {
      val tree = Uri.parse(folder)
      val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
      val columns = arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME)
      val found = mutableListOf<String>()
      context.contentResolver.query(children, columns, null, null, null)?.use { rows ->
        while (rows.moveToNext()) {
          val id = rows.getString(0) ?: continue
          val name = rows.getString(1) ?: continue
          if (name.startsWith(BACKUP_PREFIX)) found += id
        }
      }
      for (id in found) runCatching { DocumentsContract.deleteDocument(context.contentResolver, DocumentsContract.buildDocumentUriUsingTree(tree, id)) }
    }.onFailure { Log.i(TAG, "The backups folder could not be read") }
  }

  // What clearApplicationUserData does, by hand: the app's own folders and its Keystore keys.
  private fun wipeHere(context: Context) {
    runCatching {
      val keys = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      for (alias in keys.aliases().toList()) runCatching { keys.deleteEntry(alias) }
    }
    val data = File(context.applicationInfo.dataDir)
    data.listFiles()?.forEach { if (it.name != "lib") it.deleteRecursively() }
    context.externalCacheDir?.deleteRecursively()
    context.getExternalFilesDirs(null).filterNotNull().forEach { it.deleteRecursively() }
  }
}
