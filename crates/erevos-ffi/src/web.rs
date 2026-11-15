// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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

#[wasm_bindgen(js_name = accountSign)]
pub fn account_sign(account: &[u8], context: &[u8], message: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::account_sign(account, context, message))
}

#[wasm_bindgen(js_name = bundleVerify)]
pub fn bundle_verify(bundle: &[u8], context: &[u8], message: &[u8], signature: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::bundle_verify(bundle, context, message, signature))
}

#[wasm_bindgen(js_name = accountBind)]
pub fn account_bind(account: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::account_bind(account))
}

#[wasm_bindgen(js_name = bundleBound)]
pub fn bundle_bound(bundle: &[u8], signature: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::bundle_bound(bundle, signature))
}

#[wasm_bindgen(js_name = couponBlind)]
pub fn coupon_blind(spki: &[u8], nonce: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::coupon_blind(spki, nonce))
}

#[wasm_bindgen(js_name = couponFinalize)]
pub fn coupon_finalize(spki: &[u8], blind_signature: &[u8], secret: &[u8], randomizer: &[u8], nonce: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::coupon_finalize(spki, blind_signature, secret, randomizer, nonce))
}

#[wasm_bindgen(js_name = conversationStart)]
pub fn conversation_start(account: &[u8], bundle: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_start(account, bundle, plaintext))
}

#[wasm_bindgen(js_name = conversationAccept)]
pub fn conversation_accept(account: &[u8], packet: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_accept(account, packet))
}

#[wasm_bindgen(js_name = conversationAcceptAny)]
pub fn conversation_accept_any(account: &[u8], prekeys: &[u8], packet: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_accept_any(account, prekeys, packet))
}

#[wasm_bindgen(js_name = accountPrekeys)]
pub fn account_prekeys(account: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::account_prekeys(account))
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

#[wasm_bindgen(js_name = conversationRestored)]
pub fn conversation_restored(conversation: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::conversation_restored(conversation))
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

#[wasm_bindgen(js_name = hardKey)]
pub fn hard_key(input: &[u8], salt: &[u8], cost: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::hard_key(input, salt, cost))
}

#[wasm_bindgen(js_name = signatureVerify)]
pub fn signature_verify(key: &[u8], message: &[u8], signature: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::signature_verify(key, message, signature))
}

#[wasm_bindgen(js_name = pairStart)]
pub fn pair_start(code: &[u8], channel: &[u8], session: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::pair_start(code, channel, session))
}

#[wasm_bindgen(js_name = pairFinish)]
pub fn pair_finish(secret: &[u8], session: &[u8], started: &[u8], answered: &[u8], own_started: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::pair_finish(secret, session, started, answered, own_started))
}

#[wasm_bindgen(js_name = pairConfirm)]
pub fn pair_confirm(key: &[u8], started: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::pair_confirm(key, started))
}

#[wasm_bindgen(js_name = pairConfirmed)]
pub fn pair_confirmed(key: &[u8], started: &[u8], tag: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::pair_confirmed(key, started, tag))
}

#[wasm_bindgen(js_name = sealPublic)]
pub fn seal_public(secret: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::seal_public(secret))
}

#[wasm_bindgen(js_name = sealOpen)]
pub fn seal_open(secret: &[u8], sealed: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::seal_open(secret, sealed))
}

#[wasm_bindgen(js_name = relayChannelKeys)]
pub fn relay_channel_keys(relay_key: &[u8], secret: &[u8], answer: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::relay_channel_keys(relay_key, secret, answer))
}

#[wasm_bindgen(js_name = nostrSecret)]
pub fn nostr_secret() -> Result<Vec<u8>, JsError> {
    js(crate::nostr::secret())
}

#[wasm_bindgen(js_name = nostrPublic)]
pub fn nostr_public(secret: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::nostr::public(secret))
}

#[wasm_bindgen(js_name = nostrWrap)]
pub fn nostr_wrap(to: &[u8], bytes: &[u8], now: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::nostr::wrap(to, bytes, now))
}

#[wasm_bindgen(js_name = nostrUnwrap)]
pub fn nostr_unwrap(secret: &[u8], event: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::nostr::unwrap(secret, event))
}

#[wasm_bindgen]
pub fn matrix(request: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::matrix(request))
}

#[wasm_bindgen]
pub fn xmpp(request: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::xmpp(request))
}

#[wasm_bindgen(js_name = nostrChat)]
pub fn nostr_chat(request: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::nostr_chat(request))
}

#[wasm_bindgen(js_name = groupNew)]
pub fn group_new(about: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_new(about))
}

#[wasm_bindgen(js_name = groupKeyPackage)]
pub fn group_key_package(state: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_key_package(state))
}

#[wasm_bindgen(js_name = groupSetAbout)]
pub fn group_set_about(state: &[u8], about: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_set_about(state, about))
}

#[wasm_bindgen(js_name = groupCreate)]
pub fn group_create(state: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_create(state))
}

#[wasm_bindgen(js_name = groupAdd)]
pub fn group_add(state: &[u8], id: &[u8], key_package: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_add(state, id, key_package))
}

#[wasm_bindgen(js_name = groupRemove)]
pub fn group_remove(state: &[u8], id: &[u8], leaf: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_remove(state, id, leaf))
}

#[wasm_bindgen(js_name = groupCommitPending)]
pub fn group_commit_pending(state: &[u8], id: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_commit_pending(state, id))
}

#[wasm_bindgen(js_name = groupJoin)]
pub fn group_join(state: &[u8], welcome: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_join(state, welcome))
}

#[wasm_bindgen(js_name = groupSeal)]
pub fn group_seal(state: &[u8], id: &[u8], text: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_seal(state, id, text))
}

#[wasm_bindgen(js_name = groupLeave)]
pub fn group_leave(state: &[u8], id: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_leave(state, id))
}

#[wasm_bindgen(js_name = groupForget)]
pub fn group_forget(state: &[u8], id: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_forget(state, id))
}

#[wasm_bindgen(js_name = groupMembers)]
pub fn group_members(state: &[u8], id: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_members(state, id))
}

#[wasm_bindgen(js_name = groupOf)]
pub fn group_of(message: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_of(message))
}

#[wasm_bindgen(js_name = groupOpen)]
pub fn group_open(state: &[u8], message: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_open(state, message))
}

#[wasm_bindgen(js_name = groupNewSigner)]
pub fn group_new_signer(state: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_new_signer(state))
}

#[wasm_bindgen(js_name = groupKeyPackageAs)]
pub fn group_key_package_as(state: &[u8], key: &[u8], about: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_key_package_as(state, key, about))
}

#[wasm_bindgen(js_name = groupCreatePublic)]
pub fn group_create_public(state: &[u8], key: &[u8], about: &[u8], rules: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_create_public(state, key, about, rules))
}

#[wasm_bindgen(js_name = groupRules)]
pub fn group_rules(state: &[u8], id: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_rules(state, id))
}

#[wasm_bindgen(js_name = groupCommit)]
pub fn group_commit(state: &[u8], id: &[u8], key_packages: &[u8], removes: &[u8], rules: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_commit(state, id, key_packages, removes, rules))
}

#[wasm_bindgen(js_name = groupPackageAbout)]
pub fn group_package_about(key_package: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_package_about(key_package))
}

#[wasm_bindgen(js_name = groupEpoch)]
pub fn group_epoch(message: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_epoch(message))
}

#[wasm_bindgen(js_name = groupRenewal)]
pub fn group_renewal(state: &[u8], id: &[u8], about: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_renewal(state, id, about))
}

#[wasm_bindgen(js_name = groupRenew)]
pub fn group_renew(state: &[u8], id: &[u8], leaf: &[u8], key_package: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_renew(state, id, leaf, key_package))
}

#[wasm_bindgen(js_name = groupSelfUpdate)]
pub fn group_self_update(state: &[u8], id: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_self_update(state, id))
}

#[wasm_bindgen(js_name = groupSelfUpdateAs)]
pub fn group_self_update_as(state: &[u8], id: &[u8], about: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_self_update_as(state, id, about))
}

#[wasm_bindgen(js_name = groupRejoin)]
pub fn group_rejoin(state: &[u8], id: &[u8], welcome: &[u8]) -> Result<Vec<u8>, JsError> {
    js(crate::group_rejoin(state, id, welcome))
}
