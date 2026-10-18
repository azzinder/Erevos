//! WebAssembly entry points, with the names the Android module uses, for the
//! app's web build and for its checks under Node. An error becomes a thrown
//! JavaScript Error with the core's message.

use wasm_bindgen::prelude::*;

fn js<T>(result: crate::Result<T>) -> Result<T, JsError> {
    result.map_err(|message| JsError::new(&message))
}

#[wasm_bindgen(js_name = accountNew)]
pub fn account_new() -> Vec<u8> {
    crate::account_new()
}

#[wasm_bindgen(js_name = accountBundle)]
pub fn account_bundle(account: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::account_bundle(account))
}

#[wasm_bindgen(js_name = accountIdentity)]
pub fn account_identity(account: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::account_identity(account))
}

#[wasm_bindgen(js_name = bundleIdentity)]
pub fn bundle_identity(bundle: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::bundle_identity(bundle))
}

#[wasm_bindgen(js_name = conversationStart)]
pub fn conversation_start(account: &[u8], bundle: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_start(account, bundle, plaintext))
}

#[wasm_bindgen(js_name = conversationAccept)]
pub fn conversation_accept(account: &[u8], packet: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_accept(account, packet))
}

#[wasm_bindgen(js_name = conversationSeal)]
pub fn conversation_seal(conversation: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_seal(conversation, plaintext))
}

#[wasm_bindgen(js_name = conversationOpen)]
pub fn conversation_open(conversation: &[u8], packet: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_open(conversation, packet))
}

#[wasm_bindgen(js_name = conversationPeer)]
pub fn conversation_peer(conversation: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_peer(conversation))
}

#[wasm_bindgen(js_name = packetKind)]
pub fn packet_kind(packet: &[u8]) -> u8 {
    crate::packet_kind(packet)
}

#[wasm_bindgen(js_name = firstMessageId)]
pub fn first_message_id(packet: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::first_message_id(packet))
}

#[wasm_bindgen(js_name = safetyNumber)]
pub fn safety_number(ours: &[u8], theirs: &[u8]) -> Result<String, JsError> {
    js(crate::safety_number(ours, theirs))
}

#[wasm_bindgen(js_name = importChats)]
pub fn import_chats(name: &[u8], data: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::import_chats(name, data))
}

#[wasm_bindgen(js_name = relaySeal)]
pub fn relay_seal(relay_key: &[u8], sender_id: &[u8], message: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::relay_seal(relay_key, sender_id, message))
}

#[wasm_bindgen(js_name = sealPublic)]
pub fn seal_public(secret: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::seal_public(secret))
}

#[wasm_bindgen(js_name = sealOpen)]
pub fn seal_open(secret: &[u8], sealed: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::seal_open(secret, sealed))
}
