//! JNI entry points for the Android app's ErevosCoreNative object
//! (app/modules/erevos-core). Each one converts the byte arrays, calls the
//! function of the same name in lib.rs, and turns an error, or a panic, into
//! an IllegalArgumentException, which reaches JavaScript as a rejected promise.

use std::panic::{catch_unwind, AssertUnwindSafe};

use jni::objects::{JByteArray, JClass};
use jni::sys::{jbyteArray, jint, jstring};
use jni::JNIEnv;

fn guarded<T>(call: impl FnOnce() -> crate::Result<T>) -> crate::Result<T> {
    catch_unwind(AssertUnwindSafe(call)).unwrap_or_else(|_| Err("the Erevos core failed".to_string()))
}

fn throw(env: &mut JNIEnv, message: String) {
    let _ = env.throw_new("java/lang/IllegalArgumentException", message);
}

fn hand_back(env: &mut JNIEnv, result: crate::Result<Vec<u8>>) -> jbyteArray {
    match result.and_then(|bytes| env.byte_array_from_slice(&bytes).map_err(|e| e.to_string())) {
        Ok(array) => array.into_raw(),
        Err(message) => {
            throw(env, message);
            std::ptr::null_mut()
        }
    }
}

macro_rules! bytes_call {
    ($java:ident => $call:path, $($arg:ident),*) => {
        #[no_mangle]
        pub extern "system" fn $java<'a>(mut env: JNIEnv<'a>, _class: JClass<'a>, $($arg: JByteArray<'a>),*) -> jbyteArray {
            let result = guarded(|| {
                $(let $arg = env.convert_byte_array(&$arg).map_err(|e| e.to_string())?;)*
                $call($(&$arg),*)
            });
            hand_back(&mut env, result)
        }
    };
}

#[no_mangle]
pub extern "system" fn Java_expo_modules_erevoscore_ErevosCoreNative_accountNew<'a>(
    mut env: JNIEnv<'a>,
    _class: JClass<'a>,
) -> jbyteArray {
    let result = guarded(|| Ok(crate::account_new()));
    hand_back(&mut env, result)
}

bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_accountBundle => crate::account_bundle, account);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_accountIdentity => crate::account_identity, account);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_bundleIdentity => crate::bundle_identity, bundle);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_accountSign => crate::account_sign, account, context, message);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_bundleVerify => crate::bundle_verify, bundle, context, message, signature);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationStart => crate::conversation_start, account, bundle, plaintext);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationAccept => crate::conversation_accept, account, packet);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationAcceptAny => crate::conversation_accept_any, account, prekeys, packet);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_accountPrekeys => crate::account_prekeys, account);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationSeal => crate::conversation_seal, conversation, plaintext);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationOpen => crate::conversation_open, conversation, packet);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationPeer => crate::conversation_peer, conversation);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationRestored => crate::conversation_restored, conversation);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_firstMessageId => crate::first_message_id, packet);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_importChats => crate::import_chats, name, data);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_relaySeal => crate::relay_seal, relay_key, sender_id, message);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_sealPublic => crate::seal_public, secret);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_sealOpen => crate::seal_open, secret, sealed);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_relayChannelKeys => crate::relay_channel_keys, relay_key, secret, answer);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_hardKey => crate::hard_key, input, salt, cost);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_signatureVerify => crate::signature_verify, key, message, signature);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupNew => crate::group_new, about);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupKeyPackage => crate::group_key_package, state);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupSetAbout => crate::group_set_about, state, about);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupCreate => crate::group_create, state);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupAdd => crate::group_add, state, id, key_package);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupRemove => crate::group_remove, state, id, leaf);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupCommitPending => crate::group_commit_pending, state, id);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupJoin => crate::group_join, state, welcome);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupSeal => crate::group_seal, state, id, text);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupLeave => crate::group_leave, state, id);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupForget => crate::group_forget, state, id);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupMembers => crate::group_members, state, id);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupOf => crate::group_of, message);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupOpen => crate::group_open, state, message);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupNewSigner => crate::group_new_signer, state);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupKeyPackageAs => crate::group_key_package_as, state, key, about);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupCreatePublic => crate::group_create_public, state, key, about, rules);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupRules => crate::group_rules, state, id);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupCommit => crate::group_commit, state, id, key_packages, removes, rules);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupPackageAbout => crate::group_package_about, key_package);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupEpoch => crate::group_epoch, message);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupRenewal => crate::group_renewal, state, id, about);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupRenew => crate::group_renew, state, id, leaf, key_package);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupSelfUpdate => crate::group_self_update, state, id);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupSelfUpdateAs => crate::group_self_update_as, state, id, about);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_groupRejoin => crate::group_rejoin, state, id, welcome);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torStart => crate::tor::start, state_dir, cache_dir, bridges, transports);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torOpen => crate::tor::open, url, token);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torOpenChannel => crate::tor::open_channel, url);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torOpenOn => crate::tor::open_on, url, token, way, channel);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torCall => crate::tor::call, id, message);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torClose => crate::tor::close, id);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torRequest => crate::tor::request, url, token, message);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torHttp => crate::tor::http, head, body);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torTextOpen => crate::tor::text_open, url);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torTextSend => crate::tor::text_send, id, frame);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torTextNext => crate::tor::text_next, id, wait);
#[cfg(feature = "tor")]
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_torTextClose => crate::tor::text_close, id);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_nostrSecret => crate::nostr::secret,);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_nostrPublic => crate::nostr::public, secret);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_nostrWrap => crate::nostr::wrap, to, bytes, now);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_nostrUnwrap => crate::nostr::unwrap, secret, event);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_matrix => crate::matrix, request);

#[cfg(feature = "tor")]
#[no_mangle]
pub extern "system" fn Java_expo_modules_erevoscore_ErevosCoreNative_torStatus<'a>(mut env: JNIEnv<'a>, _class: JClass<'a>) -> jstring {
    match guarded(|| Ok(crate::tor::status())).and_then(|text| env.new_string(text).map_err(|e| e.to_string())) {
        Ok(text) => text.into_raw(),
        Err(message) => {
            throw(&mut env, message);
            std::ptr::null_mut()
        }
    }
}

#[cfg(feature = "tor")]
#[no_mangle]
pub extern "system" fn Java_expo_modules_erevoscore_ErevosCoreNative_torStop<'a>(_env: JNIEnv<'a>, _class: JClass<'a>) {
    let _ = guarded(|| {
        crate::tor::stop();
        Ok(())
    });
}

#[no_mangle]
pub extern "system" fn Java_expo_modules_erevoscore_ErevosCoreNative_packetKind<'a>(
    env: JNIEnv<'a>,
    _class: JClass<'a>,
    packet: JByteArray<'a>,
) -> jint {
    let packet = env.convert_byte_array(&packet).unwrap_or_default();
    guarded(|| Ok(crate::packet_kind(&packet))).map_or(0, jint::from)
}

#[no_mangle]
pub extern "system" fn Java_expo_modules_erevoscore_ErevosCoreNative_safetyNumber<'a>(
    mut env: JNIEnv<'a>,
    _class: JClass<'a>,
    ours: JByteArray<'a>,
    theirs: JByteArray<'a>,
) -> jstring {
    let result = guarded(|| {
        let ours = env.convert_byte_array(&ours).map_err(|e| e.to_string())?;
        let theirs = env.convert_byte_array(&theirs).map_err(|e| e.to_string())?;
        crate::safety_number(&ours, &theirs)
    })
    .and_then(|text| env.new_string(text).map_err(|e| e.to_string()));
    match result {
        Ok(text) => text.into_raw(),
        Err(message) => {
            throw(&mut env, message);
            std::ptr::null_mut()
        }
    }
}
