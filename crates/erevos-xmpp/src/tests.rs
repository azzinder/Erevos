use super::*;

fn ask(request: Value) -> Value {
    serde_json::from_slice(&call(request.to_string().as_bytes()).expect("the call works")).expect("JSON")
}

fn ask_err(request: Value) -> String {
    call(request.to_string().as_bytes()).expect_err("the call fails")
}

/// One device: its identity, signed pre-key, pre-keys and sessions by peer.
struct Device {
    identity: Value,
    spk: Value,
    pre_keys: Vec<Value>,
}

impl Device {
    fn new() -> Device {
        let identity = ask(json!({ "op": "identity_new" }))["identity"].clone();
        let spk = ask(json!({ "op": "signed_pre_key_new", "identity": identity, "id": 1 }));
        let pre_keys = ask(json!({ "op": "pre_keys_new", "start": 1, "count": 3 }))["pre_keys"].as_array().unwrap().clone();
        Device { identity, spk, pre_keys }
    }

    fn bundle(&self, pre_key: usize) -> Value {
        let k = &self.pre_keys[pre_key];
        json!({
            "identity": self.identity["public"],
            "signed_pre_key": { "id": self.spk["id"], "public": self.spk["public"], "signature": self.spk["signature"] },
            "pre_key": { "id": k["id"], "public": k["public"] },
        })
    }

    fn decrypt(&self, session: &Value, sent: &Value, at: usize) -> Value {
        let key = &sent["keys"][at];
        ask(json!({
            "op": "decrypt",
            "identity": self.identity,
            "signed_pre_keys": [self.spk],
            "pre_keys": self.pre_keys,
            "session": session,
            "key": key["key"],
            "prekey": key["prekey"],
            "payload": sent["payload"],
            "iv": sent["iv"],
        }))
    }
}

fn send(session: &Value, text: Option<&str>) -> (Value, Value) {
    let mut request = json!({ "op": "encrypt", "sessions": [session] });
    if let Some(text) = text {
        request["text"] = json!(text);
    }
    let sent = ask(request);
    let session = sent["keys"][0]["session"].clone();
    (sent, session)
}

#[test]
fn signatures_are_checked() {
    let alice = Device::new();
    let message = b64(b"a signed pre-key");
    let signature = ask(json!({ "op": "sign", "identity": alice.identity, "message": message }))["signature"].clone();
    assert_eq!(ask(json!({ "op": "verify", "public": alice.identity["public"], "message": message, "signature": signature }))["ok"], true);
    let other = b64(b"another");
    assert_eq!(ask(json!({ "op": "verify", "public": alice.identity["public"], "message": other, "signature": signature }))["ok"], false);
    let bob = Device::new();
    assert_eq!(ask(json!({ "op": "verify", "public": bob.identity["public"], "message": message, "signature": signature }))["ok"], false);
    // The sign bit libsignal's older signatures carry in their last bit is honoured.
    let mut raw = unb64(signature.as_str().unwrap()).unwrap();
    raw[63] |= 0x80;
    assert_eq!(ask(json!({ "op": "verify", "public": alice.identity["public"], "message": message, "signature": b64(&raw) }))["ok"], false);
}

#[test]
fn a_bundle_with_a_wrong_signature_is_refused() {
    let alice = Device::new();
    let bob = Device::new();
    let mut bundle = bob.bundle(0);
    bundle["signed_pre_key"]["signature"] = alice.spk["signature"].clone();
    assert!(ask_err(json!({ "op": "session_start", "identity": alice.identity, "bundle": bundle })).contains("not signed"));
}

#[test]
fn two_devices_talk_both_ways() {
    let alice = Device::new();
    let bob = Device::new();
    let mut a = ask(json!({ "op": "session_start", "identity": alice.identity, "bundle": bob.bundle(1) }))["session"].clone();
    assert_eq!(a["identity"], bob.identity["public"]);

    // Alice's first two messages both carry what Bob needs to begin.
    let (first, a2) = send(&a, Some("Γεια σου Bob"));
    a = a2;
    assert_eq!(first["keys"][0]["prekey"], true);
    let (second, a2) = send(&a, Some("δεύτερο"));
    a = a2;
    assert_eq!(second["keys"][0]["prekey"], true);

    let got = bob.decrypt(&Value::Null, &first, 0);
    assert_eq!(got["text"], "Γεια σου Bob");
    assert_eq!(got["identity"], alice.identity["public"]);
    assert_eq!(got["used_pre_key"], bob.pre_keys[1]["id"]);
    let mut b = got["session"].clone();
    // The second, also a first message, is read by the session the first began: no pre-key needed again.
    let got = bob.decrypt(&b, &second, 0);
    assert_eq!(got["text"], "δεύτερο");
    assert!(got["used_pre_key"].is_null());
    b = got["session"].clone();
    // And the first, read again (from the archive), opens no more: its key was used.
    assert!(call(json!({ "op": "decrypt", "identity": bob.identity, "signed_pre_keys": [bob.spk], "pre_keys": [], "session": b, "key": first["keys"][0]["key"], "prekey": true }).to_string().as_bytes()).is_err());

    // Bob answers; then Alice no longer sends first messages.
    let (answer, b2) = send(&b, Some("Γεια σου Alice"));
    b = b2;
    assert_eq!(answer["keys"][0]["prekey"], false);
    let got = alice.decrypt(&a, &answer, 0);
    assert_eq!(got["text"], "Γεια σου Alice");
    a = got["session"].clone();
    let (third, a2) = send(&a, Some("τρίτο"));
    a = a2;
    assert_eq!(third["keys"][0]["prekey"], false);
    let got = bob.decrypt(&b, &third, 0);
    assert_eq!(got["text"], "τρίτο");
    b = got["session"].clone();

    // Messages that come late, and out of order, open; once only.
    let (m1, a2) = send(&a, Some("1"));
    let (m2, a2) = send(&a2, Some("2"));
    let (m3, _) = send(&a2, Some("3"));
    let got = bob.decrypt(&b, &m3, 0);
    assert_eq!(got["text"], "3");
    b = got["session"].clone();
    let got = bob.decrypt(&b, &m1, 0);
    assert_eq!(got["text"], "1");
    b = got["session"].clone();
    let got = bob.decrypt(&b, &m2, 0);
    assert_eq!(got["text"], "2");
    b = got["session"].clone();
    assert!(call(json!({ "op": "decrypt", "identity": bob.identity, "session": b, "key": m2["keys"][0]["key"], "payload": m2["payload"], "iv": m2["iv"] }).to_string().as_bytes()).is_err());

    // A message without text only moves the ratchet on.
    let (empty, _) = send(&b, None);
    assert!(empty["payload"].is_null());
    let got = alice.decrypt(&a, &empty, 0);
    assert!(got["text"].is_null());
}

#[test]
fn a_changed_message_is_refused() {
    let alice = Device::new();
    let bob = Device::new();
    let a = ask(json!({ "op": "session_start", "identity": alice.identity, "bundle": bob.bundle(0) }))["session"].clone();
    let (first, _) = send(&a, Some("hello"));
    // A changed key.
    let mut changed = first.clone();
    let mut raw = unb64(first["keys"][0]["key"].as_str().unwrap()).unwrap();
    let last = raw.len() - 1;
    raw[last] ^= 1;
    changed["keys"][0]["key"] = json!(b64(&raw));
    assert!(call(json!({ "op": "decrypt", "identity": bob.identity, "signed_pre_keys": [bob.spk], "pre_keys": bob.pre_keys, "key": changed["keys"][0]["key"], "prekey": true, "payload": first["payload"], "iv": first["iv"] }).to_string().as_bytes()).is_err());
    // A changed payload.
    let mut raw = unb64(first["payload"].as_str().unwrap()).unwrap();
    raw[0] ^= 1;
    assert!(call(json!({ "op": "decrypt", "identity": bob.identity, "signed_pre_keys": [bob.spk], "pre_keys": bob.pre_keys, "key": first["keys"][0]["key"], "prekey": true, "payload": b64(&raw), "iv": first["iv"] }).to_string().as_bytes()).is_err());
    // Sent to Bob, read by someone else with Bob's pre-keys' ids: no.
    let carol = Device::new();
    assert!(call(json!({ "op": "decrypt", "identity": carol.identity, "signed_pre_keys": [carol.spk], "pre_keys": carol.pre_keys, "key": first["keys"][0]["key"], "prekey": true }).to_string().as_bytes()).is_err());
}

#[test]
fn a_new_session_from_them_keeps_the_old_one_for_late_messages() {
    let alice = Device::new();
    let bob = Device::new();
    let a = ask(json!({ "op": "session_start", "identity": alice.identity, "bundle": bob.bundle(0) }))["session"].clone();
    let (first, a) = send(&a, Some("old"));
    let (late, _) = send(&a, Some("late"));
    let b = bob.decrypt(&Value::Null, &first, 0)["session"].clone();
    // Alice starts again (a new install of her app, with the same identity).
    let a_new = ask(json!({ "op": "session_start", "identity": alice.identity, "bundle": bob.bundle(2) }))["session"].clone();
    let (fresh, _) = send(&a_new, Some("new"));
    let got = bob.decrypt(&b, &fresh, 0);
    assert_eq!(got["text"], "new");
    let b = got["session"].clone();
    assert_eq!(b["states"].as_array().unwrap().len(), 2);
    let got = bob.decrypt(&b, &late, 0);
    assert_eq!(got["text"], "late");
}

#[test]
fn files_open_with_their_link() {
    let data = b64("a photo".as_bytes());
    let sealed = ask(json!({ "op": "file_encrypt", "data": data }));
    assert_eq!(sealed["fragment"].as_str().unwrap().len(), 88);
    let opened = ask(json!({ "op": "file_decrypt", "data": sealed["data"], "fragment": sealed["fragment"] }));
    assert_eq!(opened["data"], data);
}

/// A first message python-oldmemo 2.1.0 made to a bundle of fixed keys
/// (docs/xmpp.md says how), so this crate reads what Gajim's OMEMO sends.
#[test]
fn reads_what_python_oldmemo_sends() {
    let fixed = |n: u8| b64(&[n; 32]);
    let identity = json!({ "secret": fixed(1) });
    let spk = json!({ "id": 1, "secret": fixed(2) });
    let pre_key = json!({ "id": 7, "secret": fixed(3) });
    let got = ask(json!({
        "op": "decrypt",
        "identity": identity,
        "signed_pre_keys": [spk],
        "pre_keys": [pre_key],
        "key": PYTHON_KEY,
        "prekey": true,
        "payload": PYTHON_PAYLOAD,
        "iv": PYTHON_IV,
    }));
    assert_eq!(got["text"], "Γεια από το python-oldmemo");
    assert_eq!(got["used_pre_key"], 7);
}

const PYTHON_KEY: &str = "MwgHEiEFvxQE+Lba/ymYfNgccjuTxNUMGphvtedk3aKp8AgM10YaIQWBfD0h71w2ruvIAKdz/JJzgBAMFJ3ItaIxVcPmtR2DJCJiMwohBfjV9otKhRmisYKD9bLHzSag5+YZpJDUWOn/J9dimaY6EAAYACIwWxEb6HD/phivVu+p9a1CjwIUovhMFVo6vp8CHdji94c7aqkwRhRn85bxiSp/NDUPaoh6KBKmMqMwAQ==";
const PYTHON_PAYLOAD: &str = "+Kg9wKXJfIQgl5rJuyqO/PPhUOJCIN2wkcg+uFlJ9qvkKUM=";
const PYTHON_IV: &str = "Nhipx0k0OQe3FurN";

// ---- OMEMO 2 ----

/// One device speaking OMEMO 2: the same identity, its own signed pre-key and pre-keys.
struct Two {
    identity: Value,
    ik: Value,
    spk: Value,
    pre_keys: Vec<Value>,
}

impl Two {
    fn new() -> Two {
        let identity = ask(json!({ "op": "identity_new" }))["identity"].clone();
        let ik = ask(json!({ "op": "two_identity", "identity": identity }))["ik"].clone();
        let spk = ask(json!({ "op": "two_signed_pre_key_new", "identity": identity, "id": 1 }));
        let pre_keys = ask(json!({ "op": "two_pre_keys_new", "start": 1, "count": 3 }))["pre_keys"].as_array().unwrap().clone();
        Two { identity, ik, spk, pre_keys }
    }

    fn bundle(&self, pre_key: usize) -> Value {
        let k = &self.pre_keys[pre_key];
        json!({
            "ik": self.ik,
            "spk": { "id": self.spk["id"], "public": self.spk["public"], "signature": self.spk["signature"] },
            "pk": { "id": k["id"], "public": k["public"] },
        })
    }

    fn decrypt(&self, session: &Value, sent: &Value) -> std::result::Result<Value, String> {
        let key = &sent["keys"][0];
        call(
            json!({
                "op": "two_decrypt",
                "identity": self.identity,
                "signed_pre_keys": [self.spk],
                "pre_keys": self.pre_keys,
                "session": session,
                "key": key["key"],
                "kex": key["kex"],
                "payload": sent["payload"],
            })
            .to_string()
            .as_bytes(),
        )
        .map(|bytes| serde_json::from_slice(&bytes).expect("JSON"))
    }
}

fn send_two(session: &Value, text: Option<&str>) -> (Value, Value) {
    let mut request = json!({ "op": "two_encrypt", "sessions": [session] });
    if let Some(text) = text {
        request["text"] = json!(text);
    }
    let sent = ask(request);
    let session = sent["keys"][0]["session"].clone();
    (sent, session)
}

#[test]
fn omemo_2_keys_are_ed25519_and_bundles_are_checked() {
    let alice = Two::new();
    let bob = Two::new();
    // Plain 32-byte keys, and the identity as an Ed25519 key whose sign bit is 0.
    assert_eq!(unb64(alice.ik.as_str().unwrap()).unwrap().len(), 32);
    assert_eq!(unb64(alice.ik.as_str().unwrap()).unwrap()[31] & 0x80, 0);
    assert_eq!(unb64(alice.spk["public"].as_str().unwrap()).unwrap().len(), 32);
    assert_eq!(unb64(alice.pre_keys[0]["public"].as_str().unwrap()).unwrap().len(), 32);
    let mut bundle = bob.bundle(0);
    bundle["spk"]["signature"] = alice.spk["signature"].clone();
    assert!(ask_err(json!({ "op": "two_session_start", "identity": alice.identity, "bundle": bundle })).contains("not signed"));
    // An OMEMO 0.3 session is not one to encrypt with here.
    let old = Device::new();
    let three = ask(json!({ "op": "session_start", "identity": alice.identity, "bundle": old.bundle(0) }))["session"].clone();
    assert!(ask_err(json!({ "op": "two_encrypt", "text": "x", "sessions": [three] })).contains("0.3"));
}

#[test]
fn omemo_2_devices_talk_both_ways() {
    let alice = Two::new();
    let bob = Two::new();
    let mut a = ask(json!({ "op": "two_session_start", "identity": alice.identity, "bundle": bob.bundle(1) }))["session"].clone();
    assert_eq!(a["identity"], bob.ik);

    let (first, a2) = send_two(&a, Some("<envelope>Γεια σου Bob</envelope>"));
    a = a2;
    assert_eq!(first["keys"][0]["kex"], true);
    let (second, a2) = send_two(&a, Some("δεύτερο"));
    a = a2;
    assert_eq!(second["keys"][0]["kex"], true);

    let got = bob.decrypt(&Value::Null, &first).unwrap();
    assert_eq!(got["text"], "<envelope>Γεια σου Bob</envelope>");
    assert_eq!(got["identity"], alice.ik);
    assert_eq!(got["used_pre_key"], bob.pre_keys[1]["id"]);
    let mut b = got["session"].clone();
    let got = bob.decrypt(&b, &second).unwrap();
    assert_eq!(got["text"], "δεύτερο");
    assert!(got["used_pre_key"].is_null());
    b = got["session"].clone();
    // Read again, the first opens no more.
    assert!(bob.decrypt(&b, &first).is_err());

    let (answer, b2) = send_two(&b, Some("Γεια σου Alice"));
    b = b2;
    assert_eq!(answer["keys"][0]["kex"], false);
    let got = alice.decrypt(&a, &answer).unwrap();
    assert_eq!(got["text"], "Γεια σου Alice");
    a = got["session"].clone();
    let (third, a2) = send_two(&a, Some("τρίτο"));
    a = a2;
    assert_eq!(third["keys"][0]["kex"], false);
    let got = bob.decrypt(&b, &third).unwrap();
    assert_eq!(got["text"], "τρίτο");
    b = got["session"].clone();

    // Late and out of order, once only.
    let (m1, a2) = send_two(&a, Some("1"));
    let (m2, a2) = send_two(&a2, Some("2"));
    let (m3, a2) = send_two(&a2, Some("3"));
    for (m, text) in [(&m3, "3"), (&m1, "1"), (&m2, "2")] {
        let got = bob.decrypt(&b, m).unwrap();
        assert_eq!(got["text"], text);
        b = got["session"].clone();
    }
    assert!(bob.decrypt(&b, &m2).is_err());

    // Changed on the way: refused.
    let (m4, _) = send_two(&a2, Some("4"));
    let mut changed = m4.clone();
    let mut raw = unb64(m4["payload"].as_str().unwrap()).unwrap();
    raw[0] ^= 1;
    changed["payload"] = json!(b64(&raw));
    assert!(bob.decrypt(&b, &changed).is_err());
    let mut changed = m4.clone();
    let mut raw = unb64(m4["keys"][0]["key"].as_str().unwrap()).unwrap();
    let last = raw.len() - 1;
    raw[last] ^= 1;
    changed["keys"][0]["key"] = json!(b64(&raw));
    assert!(bob.decrypt(&b, &changed).is_err());
    assert_eq!(bob.decrypt(&b, &m4).unwrap()["text"], "4");

    // A message without text only moves the ratchet on.
    let (empty, _) = send_two(&b, None);
    assert!(empty["payload"].is_null());
    assert!(alice.decrypt(&a2, &empty).unwrap()["text"].is_null());
}
