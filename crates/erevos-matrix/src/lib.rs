//! Matrix end-to-end encryption for Erevos (docs/matrix.md): Olm between two
//! devices and Megolm for the messages of a room, through vodozemac, the
//! Matrix project's own Rust library. The app does the talking to the
//! homeserver (app/lib/matrix*.ts); this crate only holds keys and does the
//! cryptography.
//!
//! Like the rest of the core it keeps nothing between calls: every account
//! and session goes out as JSON (vodozemac's pickle), the app keeps it sealed
//! with its own storage and passes it in again. Everything crosses as one
//! JSON request with an `op` and one JSON answer, so the apps need a single
//! entry point for all of Matrix.
//!
//! Not audited (vodozemac itself was, in 2022).

use std::collections::BTreeMap;

use serde_json::{json, Map, Value};
use vodozemac::megolm::{
    ExportedSessionKey, GroupSession, GroupSessionPickle, InboundGroupSession, InboundGroupSessionPickle, MegolmMessage,
    SessionConfig as MegolmConfig, SessionKey,
};
use vodozemac::olm::{Account, AccountPickle, OlmMessage, PreKeyMessage, Session, SessionConfig, SessionPickle};
use vodozemac::{Curve25519PublicKey, Ed25519PublicKey, Ed25519SecretKey, Ed25519Signature};

/// Errors cross as their message.
pub type Result<T> = std::result::Result<T, String>;

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

/// One request from the app: `{"op": ..., ...}`. Answers JSON bytes.
pub fn call(request: &[u8]) -> Result<Vec<u8>> {
    let request: Value = serde_json::from_slice(request).map_err(err)?;
    let op = text(&request, "op")?;
    let answer = match op {
        "account_new" => account_new(),
        "account_keys" => account_keys(&request)?,
        "device_keys" => device_keys(&request)?,
        "one_time_keys" => one_time_keys(&request)?,
        "olm_encrypt" => olm_encrypt(&request)?,
        "olm_decrypt" => olm_decrypt(&request)?,
        "megolm_new" => megolm_new(),
        "megolm_encrypt" => megolm_encrypt(&request)?,
        "megolm_session_key" => json!({ "session_key": outbound(&request)?.session_key().to_base64() }),
        "megolm_inbound" => megolm_inbound(&request)?,
        "megolm_decrypt" => megolm_decrypt(&request)?,
        "megolm_export" => megolm_export(&request)?,
        "signing_key_new" => signing_key_new(),
        "sign_json" => sign_json(&request)?,
        "verify_json" => verify_json(&request)?,
        "canonical_json" => json!({ "text": canonical_json(field(&request, "json")?) }),
        _ => return Err(format!("unknown Matrix call {op}")),
    };
    serde_json::to_vec(&answer).map_err(err)
}

fn field<'a>(request: &'a Value, name: &str) -> Result<&'a Value> {
    request.get(name).filter(|v| !v.is_null()).ok_or_else(|| format!("missing {name}"))
}

fn text<'a>(request: &'a Value, name: &str) -> Result<&'a str> {
    field(request, name)?.as_str().ok_or_else(|| format!("{name} is not text"))
}

fn account(request: &Value) -> Result<Account> {
    let pickle: AccountPickle = serde_json::from_value(field(request, "account")?.clone()).map_err(err)?;
    Ok(Account::from_pickle(pickle))
}

fn account_out(account: &Account) -> Value {
    serde_json::to_value(account.pickle()).expect("an account pickle is JSON")
}

fn session_from(value: &Value) -> Result<Session> {
    let pickle: SessionPickle = serde_json::from_value(value.clone()).map_err(err)?;
    Ok(Session::from_pickle(pickle))
}

fn session_out(session: &Session) -> Value {
    serde_json::to_value(session.pickle()).expect("a session pickle is JSON")
}

fn curve(request: &Value, name: &str) -> Result<Curve25519PublicKey> {
    Curve25519PublicKey::from_base64(text(request, name)?).map_err(err)
}

/// Matrix's canonical JSON (spec: Appendices, Signing JSON): keys sorted,
/// no spaces, and without `signatures` and `unsigned`, which are not signed.
pub fn canonical_json(value: &Value) -> String {
    fn sorted(value: &Value) -> Value {
        match value {
            Value::Object(map) => {
                let ordered: BTreeMap<&String, Value> = map.iter().map(|(k, v)| (k, sorted(v))).collect();
                Value::Object(ordered.into_iter().map(|(k, v)| (k.clone(), v)).collect())
            }
            Value::Array(items) => Value::Array(items.iter().map(sorted).collect()),
            other => other.clone(),
        }
    }
    let mut value = sorted(value);
    if let Value::Object(map) = &mut value {
        map.remove("signatures");
        map.remove("unsigned");
    }
    value.to_string()
}

/// Adds `signature` under `signatures.<user_id>.<key_id>`, keeping the others.
fn add_signature(mut value: Value, user_id: &str, key_id: &str, signature: Ed25519Signature) -> Result<Value> {
    let map = value.as_object_mut().ok_or("only objects are signed")?;
    let signatures = map.entry("signatures").or_insert_with(|| Value::Object(Map::new()));
    let by_user = signatures
        .as_object_mut()
        .ok_or("damaged signatures")?
        .entry(user_id.to_string())
        .or_insert_with(|| Value::Object(Map::new()));
    by_user.as_object_mut().ok_or("damaged signatures")?.insert(key_id.to_string(), Value::String(signature.to_base64()));
    Ok(value)
}

/// A new device: its keys and nothing published yet.
fn account_new() -> Value {
    json!({ "account": account_out(&Account::new()) })
}

fn account_keys(request: &Value) -> Result<Value> {
    let account = account(request)?;
    Ok(json!({
        "curve25519": account.curve25519_key().to_base64(),
        "ed25519": account.ed25519_key().to_base64(),
    }))
}

/// The signed `device_keys` for /keys/upload.
fn device_keys(request: &Value) -> Result<Value> {
    let account = account(request)?;
    let user_id = text(request, "user_id")?;
    let device_id = text(request, "device_id")?;
    let keys = json!({
        "user_id": user_id,
        "device_id": device_id,
        "algorithms": ["m.olm.v1.curve25519-aes-sha2", "m.megolm.v1.aes-sha2"],
        "keys": {
            format!("curve25519:{device_id}"): account.curve25519_key().to_base64(),
            format!("ed25519:{device_id}"): account.ed25519_key().to_base64(),
        },
    });
    let signature = account.sign(canonical_json(&keys));
    Ok(json!({ "device_keys": add_signature(keys, user_id, &format!("ed25519:{device_id}"), signature)? }))
}

/// Up to `count` new signed one-time keys, and a fallback key when `fallback`
/// is true, ready for /keys/upload. They count as published from here on: the
/// app keeps the returned account only once the upload went through.
fn one_time_keys(request: &Value) -> Result<Value> {
    let mut account = account(request)?;
    let user_id = text(request, "user_id")?;
    let device_id = text(request, "device_id")?;
    let count = field(request, "count")?.as_u64().ok_or("count is not a number")? as usize;
    let count = count.min(account.max_number_of_one_time_keys());
    account.generate_one_time_keys(count);
    if request.get("fallback").and_then(Value::as_bool).unwrap_or(false) {
        account.generate_fallback_key();
    }
    let signed = |key: Curve25519PublicKey, fallback: bool| -> Result<Value> {
        let mut object = json!({ "key": key.to_base64() });
        if fallback {
            object["fallback"] = Value::Bool(true);
        }
        let signature = account.sign(canonical_json(&object));
        add_signature(object, user_id, &format!("ed25519:{device_id}"), signature)
    };
    let mut one_time = Map::new();
    for (id, key) in account.one_time_keys() {
        one_time.insert(format!("signed_curve25519:{}", id.to_base64()), signed(key, false)?);
    }
    let mut fallback = Map::new();
    for (id, key) in account.fallback_key() {
        fallback.insert(format!("signed_curve25519:{}", id.to_base64()), signed(key, true)?);
    }
    account.mark_keys_as_published();
    Ok(json!({ "account": account_out(&account), "one_time_keys": one_time, "fallback_keys": fallback }))
}

/// Encrypts `plaintext` (the JSON of an m.olm.v1 payload) for one device:
/// with `session` when there is one, else with a new session from the
/// device's `identity_key` and a claimed `one_time_key`.
fn olm_encrypt(request: &Value) -> Result<Value> {
    let mut session = match request.get("session").filter(|v| !v.is_null()) {
        Some(pickle) => session_from(pickle)?,
        None => account(request)?
            .create_outbound_session(SessionConfig::version_1(), curve(request, "identity_key")?, curve(request, "one_time_key")?)
            .map_err(err)?,
    };
    let message = session.encrypt(text(request, "plaintext")?).map_err(err)?;
    let (kind, body) = message.to_parts();
    Ok(json!({
        "session": session_out(&session),
        "session_id": session.session_id(),
        "type": kind,
        "body": vodozemac::base64_encode(body),
    }))
}

/// Decrypts one Olm message from the device whose Curve25519 key is
/// `sender_key`: with one of its known `sessions`, or for a first (pre-key)
/// message with a new session, which uses up one of our one-time keys.
/// Answers the session to keep, which known session it was (`index`, or -1
/// for a new one), the account to keep, and the plaintext.
fn olm_decrypt(request: &Value) -> Result<Value> {
    let mut account = account(request)?;
    let sender_key = curve(request, "sender_key")?;
    let kind = field(request, "type")?.as_u64().ok_or("type is not a number")? as usize;
    let body = vodozemac::base64_decode(text(request, "body")?).map_err(err)?;
    let message = OlmMessage::from_parts(kind, &body).map_err(err)?;
    let known = match request.get("sessions") {
        Some(Value::Array(items)) => items.clone(),
        _ => Vec::new(),
    };
    for (index, pickle) in known.iter().enumerate() {
        let mut session = session_from(pickle)?;
        if let OlmMessage::PreKey(pre_key) = &message {
            if pre_key.session_id() != session.session_id() {
                continue;
            }
        }
        if let Ok(plaintext) = session.decrypt(&message) {
            return Ok(json!({
                "account": account_out(&account),
                "session": session_out(&session),
                "session_id": session.session_id(),
                "index": index,
                "plaintext": String::from_utf8(plaintext).map_err(err)?,
            }));
        }
    }
    let OlmMessage::PreKey(pre_key) = message else {
        return Err("no session opens this message".into());
    };
    let created = account.create_inbound_session(SessionConfig::version_1(), sender_key, &pre_key).map_err(err)?;
    Ok(json!({
        "account": account_out(&account),
        "session": session_out(&created.session),
        "session_id": created.session.session_id(),
        "index": -1,
        "plaintext": String::from_utf8(created.plaintext).map_err(err)?,
    }))
}

/// The id of the session of a first (pre-key) message, to find it among the known ones.
pub fn pre_key_session_id(body: &str) -> Result<String> {
    Ok(PreKeyMessage::from_base64(body).map_err(err)?.session_id())
}

fn outbound(request: &Value) -> Result<GroupSession> {
    let pickle: GroupSessionPickle = serde_json::from_value(field(request, "session")?.clone()).map_err(err)?;
    Ok(GroupSession::from_pickle(pickle))
}

fn inbound(request: &Value) -> Result<InboundGroupSession> {
    let pickle: InboundGroupSessionPickle = serde_json::from_value(field(request, "session")?.clone()).map_err(err)?;
    Ok(InboundGroupSession::from_pickle(pickle))
}

/// A new outgoing Megolm session for a room, with the key that goes to every
/// member device in an m.room_key.
fn megolm_new() -> Value {
    let session = GroupSession::new(MegolmConfig::version_1());
    json!({
        "session": serde_json::to_value(session.pickle()).expect("a Megolm pickle is JSON"),
        "session_id": session.session_id(),
        "session_key": session.session_key().to_base64(),
    })
}

fn megolm_encrypt(request: &Value) -> Result<Value> {
    let mut session = outbound(request)?;
    let index = session.message_index();
    let ciphertext = session.encrypt(text(request, "plaintext")?).to_base64();
    Ok(json!({
        "session": serde_json::to_value(session.pickle()).map_err(err)?,
        "session_id": session.session_id(),
        "index": index,
        "ciphertext": ciphertext,
    }))
}

/// An incoming Megolm session from an m.room_key (`session_key`) or from an
/// m.forwarded_room_key or key backup (`exported_key`).
fn megolm_inbound(request: &Value) -> Result<Value> {
    let session = if let Some(key) = request.get("session_key").and_then(Value::as_str) {
        InboundGroupSession::new(&SessionKey::from_base64(key).map_err(err)?, MegolmConfig::version_1())
    } else {
        InboundGroupSession::import(&ExportedSessionKey::from_base64(text(request, "exported_key")?).map_err(err)?, MegolmConfig::version_1())
    };
    Ok(json!({
        "session": serde_json::to_value(session.pickle()).map_err(err)?,
        "session_id": session.session_id(),
        "first_index": session.first_known_index(),
    }))
}

fn megolm_decrypt(request: &Value) -> Result<Value> {
    let mut session = inbound(request)?;
    let message = MegolmMessage::from_base64(text(request, "ciphertext")?).map_err(err)?;
    let decrypted = session.decrypt(&message).map_err(err)?;
    Ok(json!({
        "session": serde_json::to_value(session.pickle()).map_err(err)?,
        "index": decrypted.message_index,
        "plaintext": String::from_utf8(decrypted.plaintext).map_err(err)?,
    }))
}

/// The key of an incoming session from its first known message, to hand on
/// to our own other devices.
fn megolm_export(request: &Value) -> Result<Value> {
    let session = inbound(request)?;
    Ok(json!({ "exported_key": session.export_at_first_known_index().to_base64(), "first_index": session.first_known_index() }))
}

/// A new Ed25519 key for cross-signing (master, self-signing, user-signing).
fn signing_key_new() -> Value {
    let key = Ed25519SecretKey::new();
    json!({ "secret": key.to_base64(), "public": key.public_key().to_base64() })
}

/// Signs a JSON object with a cross-signing `secret`, or with the device's
/// own key when `account` is given instead. The signature goes under
/// `signatures.<user_id>.<key_id>`.
fn sign_json(request: &Value) -> Result<Value> {
    let object = field(request, "json")?.clone();
    let user_id = text(request, "user_id")?;
    let key_id = text(request, "key_id")?;
    let message = canonical_json(&object);
    let signature = match request.get("secret").and_then(Value::as_str) {
        Some(secret) => Ed25519SecretKey::from_base64(secret).map_err(err)?.sign(message.as_bytes()),
        None => account(request)?.sign(&message),
    };
    Ok(json!({ "json": add_signature(object, user_id, key_id, signature)? }))
}

/// Whether `json` carries a good signature by the Ed25519 `key` under
/// `signatures.<user_id>.<key_id>`.
fn verify_json(request: &Value) -> Result<Value> {
    let object = field(request, "json")?;
    let key = Ed25519PublicKey::from_base64(text(request, "key")?).map_err(err)?;
    let signature = object
        .get("signatures")
        .and_then(|s| s.get(text(request, "user_id").ok()?))
        .and_then(|s| s.get(text(request, "key_id").ok()?))
        .and_then(Value::as_str)
        .and_then(|s| Ed25519Signature::from_base64(s).ok());
    let ok = signature.is_some_and(|s| key.verify(canonical_json(object).as_bytes(), &s).is_ok());
    Ok(json!({ "ok": ok }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(request: Value) -> Value {
        serde_json::from_slice(&call(request.to_string().as_bytes()).unwrap()).unwrap()
    }

    fn device(user: &str, id: &str) -> (Value, Value) {
        let account = run(json!({ "op": "account_new" }))["account"].clone();
        let otk = run(json!({ "op": "one_time_keys", "account": account, "user_id": user, "device_id": id, "count": 5, "fallback": true }));
        (otk["account"].clone(), otk)
    }

    #[test]
    fn canonical_json_sorts_and_drops_signatures() {
        let v = json!({ "b": 1, "a": { "z": "ζ", "c": [2, 1] }, "signatures": {}, "unsigned": { "x": 1 } });
        assert_eq!(canonical_json(&v), r#"{"a":{"c":[2,1],"z":"ζ"},"b":1}"#);
    }

    #[test]
    fn device_keys_are_signed_by_the_device() {
        let (account, _) = device("@a:example.org", "AAAA");
        let keys = run(json!({ "op": "device_keys", "account": account, "user_id": "@a:example.org", "device_id": "AAAA" }))["device_keys"].clone();
        let ed = keys["keys"]["ed25519:AAAA"].as_str().unwrap();
        let ok = run(json!({ "op": "verify_json", "json": keys, "key": ed, "user_id": "@a:example.org", "key_id": "ed25519:AAAA" }));
        assert_eq!(ok["ok"], true);
        let mut tampered = keys.clone();
        tampered["device_id"] = json!("BBBB");
        let ok = run(json!({ "op": "verify_json", "json": tampered, "key": ed, "user_id": "@a:example.org", "key_id": "ed25519:AAAA" }));
        assert_eq!(ok["ok"], false);
    }

    #[test]
    fn one_time_keys_are_signed_and_published() {
        let (account, otk) = device("@a:example.org", "AAAA");
        assert_eq!(otk["one_time_keys"].as_object().unwrap().len(), 5);
        assert_eq!(otk["fallback_keys"].as_object().unwrap().len(), 1);
        let ed = run(json!({ "op": "account_keys", "account": account }))["ed25519"].clone();
        for key in otk["one_time_keys"].as_object().unwrap().values() {
            let ok = run(json!({ "op": "verify_json", "json": key, "key": ed, "user_id": "@a:example.org", "key_id": "ed25519:AAAA" }));
            assert_eq!(ok["ok"], true);
        }
        let again = run(json!({ "op": "one_time_keys", "account": account, "user_id": "@a:example.org", "device_id": "AAAA", "count": 0 }));
        assert!(again["one_time_keys"].as_object().unwrap().is_empty());
    }

    #[test]
    fn olm_both_ways() {
        let (alice, _) = device("@alice:example.org", "A");
        let (bob, bob_otk) = device("@bob:example.org", "B");
        let bob_curve = run(json!({ "op": "account_keys", "account": bob }))["curve25519"].clone();
        let alice_curve = run(json!({ "op": "account_keys", "account": alice }))["curve25519"].clone();
        let otk = bob_otk["one_time_keys"].as_object().unwrap().values().next().unwrap()["key"].clone();

        let first = run(json!({ "op": "olm_encrypt", "account": alice, "identity_key": bob_curve, "one_time_key": otk, "plaintext": "γεια" }));
        assert_eq!(first["type"], 0);
        let opened = run(json!({ "op": "olm_decrypt", "account": bob, "sessions": [], "sender_key": alice_curve, "type": 0, "body": first["body"] }));
        assert_eq!(opened["plaintext"], "γεια");
        assert_eq!(opened["index"], -1);
        assert_eq!(pre_key_session_id(first["body"].as_str().unwrap()).unwrap(), opened["session_id"].as_str().unwrap());
        // The one-time key is used up: the same first message cannot make a second session.
        let replay = call(json!({ "op": "olm_decrypt", "account": opened["account"], "sessions": [], "sender_key": alice_curve, "type": 0, "body": first["body"] }).to_string().as_bytes());
        assert!(replay.is_err());

        let reply = run(json!({ "op": "olm_encrypt", "session": opened["session"], "plaintext": "χαίρε" }));
        assert_eq!(reply["type"], 1);
        let back = run(json!({ "op": "olm_decrypt", "account": alice, "sessions": [first["session"]], "sender_key": bob_curve, "type": 1, "body": reply["body"] }));
        assert_eq!(back["plaintext"], "χαίρε");
        assert_eq!(back["index"], 0);
    }

    #[test]
    fn megolm_room_messages() {
        let out = run(json!({ "op": "megolm_new" }));
        let inbound = run(json!({ "op": "megolm_inbound", "session_key": out["session_key"] }));
        assert_eq!(inbound["session_id"], out["session_id"]);
        let one = run(json!({ "op": "megolm_encrypt", "session": out["session"], "plaintext": "{\"body\":\"ένα\"}" }));
        let two = run(json!({ "op": "megolm_encrypt", "session": one["session"], "plaintext": "δύο" }));
        // A member who comes later gets the key as it is now, and reads from there on.
        let later_key = run(json!({ "op": "megolm_session_key", "session": two["session"] }));
        let later = run(json!({ "op": "megolm_inbound", "session_key": later_key["session_key"] }));
        assert_eq!(later["first_index"], 2);
        assert_eq!(two["index"], 1);
        let read_two = run(json!({ "op": "megolm_decrypt", "session": inbound["session"], "ciphertext": two["ciphertext"] }));
        assert_eq!(read_two["plaintext"], "δύο");
        let read_one = run(json!({ "op": "megolm_decrypt", "session": read_two["session"], "ciphertext": one["ciphertext"] }));
        assert_eq!(read_one["plaintext"], "{\"body\":\"ένα\"}");
        // A key handed on from index 1 cannot read message 0.
        let exported = run(json!({ "op": "megolm_export", "session": inbound["session"] }));
        let forwarded = run(json!({ "op": "megolm_inbound", "exported_key": exported["exported_key"] }));
        let read = run(json!({ "op": "megolm_decrypt", "session": forwarded["session"], "ciphertext": two["ciphertext"] }));
        assert_eq!(read["plaintext"], "δύο");
    }

    #[test]
    fn cross_signing_keys_sign_device_keys() {
        let (account, _) = device("@a:example.org", "AAAA");
        let keys = run(json!({ "op": "device_keys", "account": account, "user_id": "@a:example.org", "device_id": "AAAA" }))["device_keys"].clone();
        let ssk = run(json!({ "op": "signing_key_new" }));
        let key_id = format!("ed25519:{}", ssk["public"].as_str().unwrap());
        let signed = run(json!({ "op": "sign_json", "json": keys, "secret": ssk["secret"], "user_id": "@a:example.org", "key_id": key_id }))["json"].clone();
        // Both signatures hold: the device's own and the self-signing key's.
        for (key, id) in [(ssk["public"].clone(), key_id.clone()), (keys["keys"]["ed25519:AAAA"].clone(), "ed25519:AAAA".to_string())] {
            let ok = run(json!({ "op": "verify_json", "json": signed, "key": key, "user_id": "@a:example.org", "key_id": id }));
            assert_eq!(ok["ok"], true);
        }
    }

    #[test]
    fn unknown_calls_fail() {
        assert!(call(br#"{"op":"nothing"}"#).unwrap_err().contains("nothing"));
        assert!(call(b"not json").is_err());
    }
}
