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
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationStart => crate::conversation_start, account, bundle, plaintext);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationAccept => crate::conversation_accept, account, packet);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationSeal => crate::conversation_seal, conversation, plaintext);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationOpen => crate::conversation_open, conversation, packet);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_conversationPeer => crate::conversation_peer, conversation);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_firstMessageId => crate::first_message_id, packet);
bytes_call!(Java_expo_modules_erevoscore_ErevosCoreNative_importChats => crate::import_chats, name, data);

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
