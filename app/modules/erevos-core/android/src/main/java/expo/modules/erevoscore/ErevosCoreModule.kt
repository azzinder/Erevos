package expo.modules.erevoscore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

// The Erevos core (Rust, crates/erevos-ffi in the repository) for JavaScript. Every call runs
// off the JavaScript thread, as the post-quantum key exchange takes a moment on a phone. A
// failing call rejects its promise with the core's message.
class ErevosCoreModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ErevosCore")

    AsyncFunction("accountNew") { ErevosCoreNative.accountNew() }
    AsyncFunction("accountBundle") { account: ByteArray -> ErevosCoreNative.accountBundle(account) }
    AsyncFunction("accountIdentity") { account: ByteArray -> ErevosCoreNative.accountIdentity(account) }
    AsyncFunction("bundleIdentity") { bundle: ByteArray -> ErevosCoreNative.bundleIdentity(bundle) }
    AsyncFunction("conversationStart") { account: ByteArray, bundle: ByteArray, plaintext: ByteArray ->
      ErevosCoreNative.conversationStart(account, bundle, plaintext)
    }
    AsyncFunction("conversationAccept") { account: ByteArray, packet: ByteArray ->
      ErevosCoreNative.conversationAccept(account, packet)
    }
    AsyncFunction("conversationSeal") { conversation: ByteArray, plaintext: ByteArray ->
      ErevosCoreNative.conversationSeal(conversation, plaintext)
    }
    AsyncFunction("conversationOpen") { conversation: ByteArray, packet: ByteArray ->
      ErevosCoreNative.conversationOpen(conversation, packet)
    }
    AsyncFunction("conversationPeer") { conversation: ByteArray -> ErevosCoreNative.conversationPeer(conversation) }
    AsyncFunction("conversationRestored") { conversation: ByteArray -> ErevosCoreNative.conversationRestored(conversation) }
    AsyncFunction("packetKind") { packet: ByteArray -> ErevosCoreNative.packetKind(packet) }
    AsyncFunction("firstMessageId") { packet: ByteArray -> ErevosCoreNative.firstMessageId(packet) }
    AsyncFunction("safetyNumber") { ours: ByteArray, theirs: ByteArray -> ErevosCoreNative.safetyNumber(ours, theirs) }
    AsyncFunction("importChats") { name: ByteArray, data: ByteArray -> ErevosCoreNative.importChats(name, data) }
    AsyncFunction("relaySeal") { relayKey: ByteArray, senderId: ByteArray, message: ByteArray ->
      ErevosCoreNative.relaySeal(relayKey, senderId, message)
    }
    AsyncFunction("sealPublic") { secret: ByteArray -> ErevosCoreNative.sealPublic(secret) }
    AsyncFunction("sealOpen") { secret: ByteArray, sealed: ByteArray -> ErevosCoreNative.sealOpen(secret, sealed) }
    AsyncFunction("hardKey") { input: ByteArray, salt: ByteArray, cost: ByteArray -> ErevosCoreNative.hardKey(input, salt, cost) }
    AsyncFunction("signatureVerify") { key: ByteArray, message: ByteArray, signature: ByteArray -> ErevosCoreNative.signatureVerify(key, message, signature) }
    // Group chats (crates/erevos-group).
    AsyncFunction("groupNew") { about: ByteArray -> ErevosCoreNative.groupNew(about) }
    AsyncFunction("groupKeyPackage") { state: ByteArray -> ErevosCoreNative.groupKeyPackage(state) }
    AsyncFunction("groupSetAbout") { state: ByteArray, about: ByteArray -> ErevosCoreNative.groupSetAbout(state, about) }
    AsyncFunction("groupCreate") { state: ByteArray -> ErevosCoreNative.groupCreate(state) }
    AsyncFunction("groupAdd") { state: ByteArray, id: ByteArray, keyPackage: ByteArray -> ErevosCoreNative.groupAdd(state, id, keyPackage) }
    AsyncFunction("groupRemove") { state: ByteArray, id: ByteArray, leaf: ByteArray -> ErevosCoreNative.groupRemove(state, id, leaf) }
    AsyncFunction("groupCommitPending") { state: ByteArray, id: ByteArray -> ErevosCoreNative.groupCommitPending(state, id) }
    AsyncFunction("groupJoin") { state: ByteArray, welcome: ByteArray -> ErevosCoreNative.groupJoin(state, welcome) }
    AsyncFunction("groupSeal") { state: ByteArray, id: ByteArray, text: ByteArray -> ErevosCoreNative.groupSeal(state, id, text) }
    AsyncFunction("groupLeave") { state: ByteArray, id: ByteArray -> ErevosCoreNative.groupLeave(state, id) }
    AsyncFunction("groupForget") { state: ByteArray, id: ByteArray -> ErevosCoreNative.groupForget(state, id) }
    AsyncFunction("groupMembers") { state: ByteArray, id: ByteArray -> ErevosCoreNative.groupMembers(state, id) }
    AsyncFunction("groupOf") { message: ByteArray -> ErevosCoreNative.groupOf(message) }
    AsyncFunction("groupOpen") { state: ByteArray, message: ByteArray -> ErevosCoreNative.groupOpen(state, message) }
    // Public groups (docs/public-groups.md).
    AsyncFunction("groupNewSigner") { state: ByteArray -> ErevosCoreNative.groupNewSigner(state) }
    AsyncFunction("groupKeyPackageAs") { state: ByteArray, key: ByteArray, about: ByteArray -> ErevosCoreNative.groupKeyPackageAs(state, key, about) }
    AsyncFunction("groupCreatePublic") { state: ByteArray, key: ByteArray, about: ByteArray, rules: ByteArray ->
      ErevosCoreNative.groupCreatePublic(state, key, about, rules)
    }
    AsyncFunction("groupRules") { state: ByteArray, id: ByteArray -> ErevosCoreNative.groupRules(state, id) }
    AsyncFunction("groupCommit") { state: ByteArray, id: ByteArray, keyPackages: ByteArray, removes: ByteArray, rules: ByteArray ->
      ErevosCoreNative.groupCommit(state, id, keyPackages, removes, rules)
    }
    AsyncFunction("groupPackageAbout") { keyPackage: ByteArray -> ErevosCoreNative.groupPackageAbout(keyPackage) }
    AsyncFunction("groupEpoch") { message: ByteArray -> ErevosCoreNative.groupEpoch(message) }

    // Relay requests through Tor (crates/erevos-tor), through the bridges given one per line, if
    // any. Tor keeps its state in the app's own folders. The pluggable transports for bridges
    // (lyrebird) come as a program named like a native library, as Android runs a program only
    // from where it unpacks those (this module's build.gradle); a build without it has only
    // plain bridges, and Tor says so rather than going without them.
    AsyncFunction("torStart") { bridges: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("No app context")
      val state = File(context.filesDir, "tor").apply { mkdirs() }
      val cache = File(context.cacheDir, "tor").apply { mkdirs() }
      val lyrebird = File(context.applicationInfo.nativeLibraryDir, "liblyrebird.so")
      val transports = if (lyrebird.canExecute()) lyrebird.path else ""
      tor {
        ErevosCoreNative.torStart(state.path.toByteArray(), cache.path.toByteArray(), bridges.toByteArray(), transports.toByteArray())
      }
      Unit
    }
    AsyncFunction("torStatus") { tor { ErevosCoreNative.torStatus() } }
    AsyncFunction("torStop") { tor { ErevosCoreNative.torStop() } }
    AsyncFunction("torRequest") { url: String, token: String, message: ByteArray ->
      tor { ErevosCoreNative.torRequest(url.toByteArray(), token.toByteArray(), message) }
    }
    AsyncFunction("torOpen") { url: String, token: String -> tor { ErevosCoreNative.torOpen(url.toByteArray(), token.toByteArray()) } }
    AsyncFunction("torCall") { id: ByteArray, message: ByteArray -> tor { ErevosCoreNative.torCall(id, message) } }
    AsyncFunction("torClose") { id: ByteArray -> tor { ErevosCoreNative.torClose(id) } }
  }
}

// A core built without Tor has none of its functions.
private inline fun <T> tor(call: () -> T): T =
  try {
    call()
  } catch (_: UnsatisfiedLinkError) {
    throw IllegalStateException("This build of Erevos has no Tor.")
  }

// The JNI functions in crates/erevos-ffi/src/android.rs. The library is built into the app by
// this module's build.gradle.
internal object ErevosCoreNative {
  init {
    System.loadLibrary("erevos_ffi")
  }

  @JvmStatic external fun accountNew(): ByteArray
  @JvmStatic external fun accountBundle(account: ByteArray): ByteArray
  @JvmStatic external fun accountIdentity(account: ByteArray): ByteArray
  @JvmStatic external fun bundleIdentity(bundle: ByteArray): ByteArray
  @JvmStatic external fun conversationStart(account: ByteArray, bundle: ByteArray, plaintext: ByteArray): ByteArray
  @JvmStatic external fun conversationAccept(account: ByteArray, packet: ByteArray): ByteArray
  @JvmStatic external fun conversationSeal(conversation: ByteArray, plaintext: ByteArray): ByteArray
  @JvmStatic external fun conversationOpen(conversation: ByteArray, packet: ByteArray): ByteArray
  @JvmStatic external fun conversationPeer(conversation: ByteArray): ByteArray
  @JvmStatic external fun conversationRestored(conversation: ByteArray): ByteArray
  @JvmStatic external fun packetKind(packet: ByteArray): Int
  @JvmStatic external fun firstMessageId(packet: ByteArray): ByteArray
  @JvmStatic external fun safetyNumber(ours: ByteArray, theirs: ByteArray): String
  @JvmStatic external fun importChats(name: ByteArray, data: ByteArray): ByteArray
  @JvmStatic external fun relaySeal(relayKey: ByteArray, senderId: ByteArray, message: ByteArray): ByteArray
  @JvmStatic external fun sealPublic(secret: ByteArray): ByteArray
  @JvmStatic external fun sealOpen(secret: ByteArray, sealed: ByteArray): ByteArray
  @JvmStatic external fun hardKey(input: ByteArray, salt: ByteArray, cost: ByteArray): ByteArray
  @JvmStatic external fun signatureVerify(key: ByteArray, message: ByteArray, signature: ByteArray): ByteArray
  @JvmStatic external fun groupNew(about: ByteArray): ByteArray
  @JvmStatic external fun groupKeyPackage(state: ByteArray): ByteArray
  @JvmStatic external fun groupSetAbout(state: ByteArray, about: ByteArray): ByteArray
  @JvmStatic external fun groupCreate(state: ByteArray): ByteArray
  @JvmStatic external fun groupAdd(state: ByteArray, id: ByteArray, keyPackage: ByteArray): ByteArray
  @JvmStatic external fun groupRemove(state: ByteArray, id: ByteArray, leaf: ByteArray): ByteArray
  @JvmStatic external fun groupCommitPending(state: ByteArray, id: ByteArray): ByteArray
  @JvmStatic external fun groupJoin(state: ByteArray, welcome: ByteArray): ByteArray
  @JvmStatic external fun groupSeal(state: ByteArray, id: ByteArray, text: ByteArray): ByteArray
  @JvmStatic external fun groupLeave(state: ByteArray, id: ByteArray): ByteArray
  @JvmStatic external fun groupForget(state: ByteArray, id: ByteArray): ByteArray
  @JvmStatic external fun groupMembers(state: ByteArray, id: ByteArray): ByteArray
  @JvmStatic external fun groupOf(message: ByteArray): ByteArray
  @JvmStatic external fun groupOpen(state: ByteArray, message: ByteArray): ByteArray
  @JvmStatic external fun groupNewSigner(state: ByteArray): ByteArray
  @JvmStatic external fun groupKeyPackageAs(state: ByteArray, key: ByteArray, about: ByteArray): ByteArray
  @JvmStatic external fun groupCreatePublic(state: ByteArray, key: ByteArray, about: ByteArray, rules: ByteArray): ByteArray
  @JvmStatic external fun groupRules(state: ByteArray, id: ByteArray): ByteArray
  @JvmStatic external fun groupCommit(state: ByteArray, id: ByteArray, keyPackages: ByteArray, removes: ByteArray, rules: ByteArray): ByteArray
  @JvmStatic external fun groupPackageAbout(keyPackage: ByteArray): ByteArray
  @JvmStatic external fun groupEpoch(message: ByteArray): ByteArray
  @JvmStatic external fun torStart(stateDir: ByteArray, cacheDir: ByteArray, bridges: ByteArray, transports: ByteArray): ByteArray
  @JvmStatic external fun torStatus(): String
  @JvmStatic external fun torStop()
  @JvmStatic external fun torRequest(url: ByteArray, token: ByteArray, message: ByteArray): ByteArray
  @JvmStatic external fun torOpen(url: ByteArray, token: ByteArray): ByteArray
  @JvmStatic external fun torCall(id: ByteArray, message: ByteArray): ByteArray
  @JvmStatic external fun torClose(id: ByteArray): ByteArray
}
