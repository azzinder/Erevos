// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// NIP-44 v2 against its own vectors (tests/nip44.vectors.json, from
// github.com/paulmillr/nip44, MIT; SHA-256 269ed0f6…25040 as the NIP gives it).

use erevos_nostr::{conversation_key, decrypt, encrypt, encrypt_with_nonce, message_keys, padded_len, public_key};
use serde_json::Value;
use sha2::{Digest, Sha256};

const VECTORS: &str = include_str!("nip44.vectors.json");

fn vectors() -> Value {
    assert_eq!(
        hex(&Sha256::digest(VECTORS.as_bytes())),
        "269ed0f69e4c192512cc779e78c555090cebc7c785b609e338a62afc3ce25040",
        "the vectors are NIP-44's own"
    );
    serde_json::from_str::<Value>(VECTORS).unwrap()["v2"].clone()
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn unhex(text: &str) -> Vec<u8> {
    (0..text.len() / 2).map(|i| u8::from_str_radix(&text[i * 2..i * 2 + 2], 16).unwrap()).collect()
}

fn s<'a>(value: &'a Value, name: &str) -> &'a str {
    value[name].as_str().unwrap_or_else(|| panic!("{name} in {value}"))
}

fn list<'a>(value: &'a Value, path: &[&str]) -> &'a Vec<Value> {
    path.iter().fold(value, |v, name| &v[*name]).as_array().unwrap()
}

#[test]
fn conversation_keys() {
    let v = vectors();
    for case in list(&v, &["valid", "get_conversation_key"]) {
        let key = conversation_key(&unhex(s(case, "sec1")), &unhex(s(case, "pub2"))).unwrap();
        assert_eq!(hex(&key), s(case, "conversation_key"), "{case}");
    }
    for case in list(&v, &["invalid", "get_conversation_key"]) {
        assert!(conversation_key(&unhex(s(case, "sec1")), &unhex(s(case, "pub2"))).is_err(), "{case}");
    }
}

#[test]
fn message_keys_of_a_nonce() {
    let v = vectors();
    let keys = &v["valid"]["get_message_keys"];
    let conversation = unhex(s(keys, "conversation_key"));
    for case in keys["keys"].as_array().unwrap() {
        let nonce: [u8; 32] = unhex(s(case, "nonce")).try_into().unwrap();
        let got = message_keys(&conversation, &nonce).unwrap();
        assert_eq!(hex(got.chacha_key.as_ref()), s(case, "chacha_key"));
        assert_eq!(hex(&got.chacha_nonce), s(case, "chacha_nonce"));
        assert_eq!(hex(got.hmac_key.as_ref()), s(case, "hmac_key"));
    }
}

#[test]
fn padding() {
    let v = vectors();
    for case in list(&v, &["valid", "calc_padded_len"]) {
        let pair = case.as_array().unwrap();
        assert_eq!(padded_len(pair[0].as_u64().unwrap() as usize), pair[1].as_u64().unwrap() as usize, "{case}");
    }
}

#[test]
fn encrypts_and_decrypts() {
    let v = vectors();
    for case in list(&v, &["valid", "encrypt_decrypt"]) {
        let (sec1, sec2) = (unhex(s(case, "sec1")), unhex(s(case, "sec2")));
        let key = conversation_key(&sec1, &public_key(&sec2).unwrap()).unwrap();
        assert_eq!(hex(&key), s(case, "conversation_key"));
        assert_eq!(key, conversation_key(&sec2, &public_key(&sec1).unwrap()).unwrap(), "either way round");
        let nonce: [u8; 32] = unhex(s(case, "nonce")).try_into().unwrap();
        let payload = encrypt_with_nonce(&key, s(case, "plaintext"), &nonce).unwrap();
        assert_eq!(payload, s(case, "payload"));
        assert_eq!(decrypt(&key, &payload).unwrap(), s(case, "plaintext"));
        // A nonce of its own each time.
        let fresh = encrypt(&key, s(case, "plaintext")).unwrap();
        assert_ne!(fresh, payload);
        assert_eq!(decrypt(&key, &fresh).unwrap(), s(case, "plaintext"));
    }
    for case in list(&v, &["valid", "encrypt_decrypt_long_msg"]) {
        let key = unhex(s(case, "conversation_key"));
        let nonce: [u8; 32] = unhex(s(case, "nonce")).try_into().unwrap();
        let text = s(case, "pattern").repeat(case["repeat"].as_u64().unwrap() as usize);
        assert_eq!(hex(&Sha256::digest(text.as_bytes())), s(case, "plaintext_sha256"));
        let payload = encrypt_with_nonce(&key, &text, &nonce).unwrap();
        assert_eq!(hex(&Sha256::digest(payload.as_bytes())), s(case, "payload_sha256"));
        assert_eq!(decrypt(&key, &payload).unwrap(), text);
    }
}

#[test]
fn refuses_what_is_wrong() {
    let v = vectors();
    let key = [7u8; 32];
    for len in list(&v, &["invalid", "encrypt_msg_lengths"]) {
        let text = "a".repeat(len.as_u64().unwrap() as usize);
        assert!(encrypt(&key, &text).is_err(), "{len}");
    }
    for case in list(&v, &["invalid", "decrypt"]) {
        assert!(decrypt(&unhex(s(case, "conversation_key")), s(case, "payload")).is_err(), "{case}");
    }
}
