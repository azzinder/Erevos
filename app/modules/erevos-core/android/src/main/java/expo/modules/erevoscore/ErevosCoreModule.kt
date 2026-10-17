package expo.modules.erevoscore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

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
    AsyncFunction("packetKind") { packet: ByteArray -> ErevosCoreNative.packetKind(packet) }
    AsyncFunction("firstMessageId") { packet: ByteArray -> ErevosCoreNative.firstMessageId(packet) }
    AsyncFunction("safetyNumber") { ours: ByteArray, theirs: ByteArray -> ErevosCoreNative.safetyNumber(ours, theirs) }
    AsyncFunction("importChats") { name: ByteArray, data: ByteArray -> ErevosCoreNative.importChats(name, data) }
  }
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
  @JvmStatic external fun packetKind(packet: ByteArray): Int
  @JvmStatic external fun firstMessageId(packet: ByteArray): ByteArray
  @JvmStatic external fun safetyNumber(ours: ByteArray, theirs: ByteArray): String
  @JvmStatic external fun importChats(name: ByteArray, data: ByteArray): ByteArray
}
