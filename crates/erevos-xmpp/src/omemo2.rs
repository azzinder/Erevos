// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! OMEMO 2: version 0.8 of XEP-0384, namespace `urn:xmpp:omemo:2`, as Kaidan,
//! QXmpp and python-twomemo speak it. The ratchet is the one of OMEMO 0.3
//! (lib.rs's State), with its own derivations and messages:
//!
//! - an identity is said as an Ed25519 key: ours is the Edwards form of our
//!   Curve25519 identity with its sign bit 0, as XEdDSA signs with it, so one
//!   identity serves both versions, and our signatures are plain Ed25519 ones;
//! - X3DH says "OMEMO X3DH", and its secret is the ratchet's first root key;
//! - the root chain says "OMEMO Root Chain", a message's keys "OMEMO Message
//!   Key Material";
//! - a message is OMEMOAuthenticatedMessage { mac, OMEMOMessage { n, pn,
//!   dh_pub, ciphertext } }, its MAC (16 bytes) over the identity of the side
//!   that began the session, the other's, and the OMEMOMessage; the first ones
//!   are wrapped in OMEMOKeyExchange { pk_id, spk_id, ik, ek, message };
//! - the payload is AES-256-CBC with an HMAC of 16 bytes, both from one key of
//!   32 bytes through HKDF ("OMEMO Payload"); each device gets that key and the
//!   HMAC. What it encrypts is the app's: the SCE envelope (XEP-0420).
//!
//! Checked against python-twomemo both ways (docs/xmpp-checks/twomemo-cross.py).

use super::*;
use curve25519_dalek::edwards::CompressedEdwardsY;

/// The Ed25519 key our Curve25519 identity signs as (XEdDSA's, sign bit 0).
fn ed25519_public(secret: &[u8; 32]) -> [u8; 32] {
    let k = Scalar::from_bytes_mod_order(clamp(*secret));
    let big_a = EdwardsPoint::mul_base(&k).compress();
    if big_a.as_bytes()[31] & 0x80 != 0 {
        EdwardsPoint::mul_base(&-k).compress().to_bytes()
    } else {
        big_a.to_bytes()
    }
}

/// Checks a plain Ed25519 signature, as OMEMO 2's bundles carry them.
fn ed25519_verify(public: &[u8; 32], message: &[u8], signature: &[u8]) -> bool {
    let Ok(signature): std::result::Result<[u8; 64], _> = signature.try_into() else {
        return false;
    };
    let Some(big_a) = CompressedEdwardsY(*public).decompress() else {
        return false;
    };
    if big_a.is_small_order() {
        return false;
    }
    let mut s = [0u8; 32];
    s.copy_from_slice(&signature[32..]);
    let Some(s) = Option::<Scalar>::from(Scalar::from_canonical_bytes(s)) else {
        return false;
    };
    let big_r = &signature[..32];
    let h = Scalar::from_bytes_mod_order_wide(&Sha512::new().chain_update(big_r).chain_update(public).chain_update(message).finalize().into());
    let check = EdwardsPoint::vartime_double_scalar_mul_basepoint(&h, &-big_a, &s);
    check.compress().as_bytes().ct_eq(big_r).into()
}

/// Their Ed25519 identity as the Curve25519 key X3DH takes.
fn montgomery_of(ed: &[u8; 32]) -> Result<[u8; 32]> {
    let point = CompressedEdwardsY(*ed).decompress().ok_or("their identity is not a key")?;
    if point.is_small_order() {
        return Err("their identity is not usable".into());
    }
    Ok(point.to_montgomery().to_bytes())
}

/// A key of 32 bytes as OMEMO 2 sends it: the bytes alone (lib.rs's `public` also takes them so).
fn raw(pair: &Pair) -> Value {
    json!({ "secret": b64(&pair.secret), "public": b64(&pair.public) })
}

/// Our identity as OMEMO 2 says it, for our bundle.
pub(crate) fn identity(request: &Value) -> Result<Value> {
    let identity = Pair::from_json(field(request, "identity")?)?;
    Ok(json!({ "ik": b64(&ed25519_public(&identity.secret)) }))
}

/// A signed pre-key: `id`, its key signed as it is (32 bytes) with the identity.
pub(crate) fn signed_pre_key_new(request: &Value) -> Result<Value> {
    let identity = Pair::from_json(field(request, "identity")?)?;
    let id = number(request, "id")?;
    let pair = Pair::new();
    let mut out = raw(&pair);
    out["id"] = json!(id);
    out["signature"] = json!(b64(&xeddsa_sign(&identity.secret, &pair.public)));
    Ok(out)
}

/// `count` one-time pre-keys, numbered from `start`.
pub(crate) fn pre_keys_new(request: &Value) -> Result<Value> {
    let start = number(request, "start")?;
    let count = number(request, "count")?.min(1000);
    let keys: Vec<Value> = (0..count)
        .map(|i| {
            let mut key = raw(&Pair::new());
            key["id"] = json!(start.wrapping_add(i).max(1));
            key
        })
        .collect();
    Ok(json!({ "pre_keys": keys }))
}

/// X3DH's secret, from the four DHs in the order both sides take them.
fn x3dh(dhs: [[u8; 32]; 4]) -> [u8; 32] {
    let mut master = vec![0xffu8; 32];
    for dh in dhs {
        master.extend_from_slice(&dh);
    }
    hkdf(&master, Some(&[0u8; 32]), b"OMEMO X3DH", 32).try_into().expect("32 bytes")
}

fn ad(first: &[u8; 32], second: &[u8; 32]) -> [u8; 64] {
    let mut ad = [0u8; 64];
    ad[..32].copy_from_slice(first);
    ad[32..].copy_from_slice(second);
    ad
}

/// Begins a session with one of their devices from its bundle (`ik`, `spk`
/// with its signature, one `pk`), after checking the signature. Answers the session.
pub(crate) fn session_start(request: &Value) -> Result<Value> {
    let identity = Pair::from_json(field(request, "identity")?)?;
    let bundle = field(request, "bundle")?;
    let their_identity = key32(bundle, "ik")?;
    let spk = field(bundle, "spk")?;
    let spk_public = public(spk, "public")?;
    if !ed25519_verify(&their_identity, &spk_public, &bytes(spk, "signature")?) {
        return Err("their signed pre-key is not signed by their identity".into());
    }
    let pk = field(bundle, "pk")?;
    let pk_public = public(pk, "public")?;
    let base = Pair::new();
    let their_dh = montgomery_of(&their_identity)?;
    let root = x3dh([dh(&identity.secret, &spk_public)?, dh(&base.secret, &their_dh)?, dh(&base.secret, &spk_public)?, dh(&base.secret, &pk_public)?]);
    let ours = ed25519_public(&identity.secret);
    let send = Pair::new();
    let (root, send_chain) = root_step(&root, &spk_public, &send.secret, true)?;
    let state = State {
        ours,
        theirs: their_identity,
        root,
        send,
        send_chain,
        send_n: 0,
        previous: 0,
        // Nothing comes on their signed pre-key: their first answer brings a ratchet key of its own.
        chains: Vec::new(),
        pending: Some(Pending { pre_key: number(pk, "id")?, signed_pre_key: number(spk, "id")?, base: base.public }),
        base: None,
        two: Some(ad(&ours, &their_identity)),
    };
    Ok(json!({ "session": session_json(&[state]) }))
}

/// An OMEMOAuthenticatedMessage: the OMEMOMessage, and its MAC.
pub(crate) fn seal(ad: &[u8; 64], mac_key: &[u8; 32], ratchet: &[u8; 32], n: u32, pn: u32, ciphertext: &[u8]) -> Vec<u8> {
    let mut message = Vec::new();
    put_number(&mut message, 1, n);
    put_number(&mut message, 2, pn);
    put_bytes(&mut message, 3, ratchet);
    put_bytes(&mut message, 4, ciphertext);
    let mac = hmac(mac_key, &[ad, &message]);
    let mut out = Vec::new();
    put_bytes(&mut out, 1, &mac[..16]);
    put_bytes(&mut out, 2, &message);
    out
}

/// A first message, with what lets them begin the session too: an OMEMOKeyExchange.
pub(crate) fn key_exchange(pending: &Pending, ours: &[u8; 32], sealed: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();
    put_number(&mut out, 1, pending.pre_key);
    put_number(&mut out, 2, pending.signed_pre_key);
    put_bytes(&mut out, 3, ours);
    put_bytes(&mut out, 4, &pending.base);
    put_bytes(&mut out, 5, sealed);
    out
}

/// One of their messages, read but not yet checked.
pub(crate) struct Opened {
    pub message: Vec<u8>,
    pub mac: Vec<u8>,
    pub their: [u8; 32],
    pub n: u32,
    pub ciphertext: Vec<u8>,
}

pub(crate) fn opened(data: &[u8]) -> Result<Opened> {
    let outer = fields(data)?;
    let mac = field_bytes(&outer, 1).ok_or("a message without its MAC")?.to_vec();
    let message = field_bytes(&outer, 2).ok_or("a message without its message")?.to_vec();
    let inner = fields(&message)?;
    let n = field_number(&inner, 1).ok_or("a message without its number")?;
    let their = public_of(field_bytes(&inner, 3).ok_or("a message without its ratchet key")?)?;
    let ciphertext = field_bytes(&inner, 4).ok_or("a message without its text")?.to_vec();
    Ok(Opened { message, mac, their, n, ciphertext })
}

/// The keys of a payload, from the 32 bytes each device gets.
fn payload_keys(key: &[u8]) -> ([u8; 32], [u8; 32], [u8; 16]) {
    let out = hkdf(key, Some(&[0u8; 32]), b"OMEMO Payload", 80);
    (out[..32].try_into().expect("32"), out[32..64].try_into().expect("32"), out[64..80].try_into().expect("16"))
}

/// Encrypts a message for several devices: `text` (the SCE envelope; none
/// for a message that only moves the ratchets on) with AES-256-CBC under a
/// new key, and that key with the payload's HMAC for each device in its
/// session. Answers the payload, and each device's key with its session after.
pub(crate) fn encrypt(request: &Value) -> Result<Value> {
    let (payload, plain) = match request.get("text").and_then(Value::as_str) {
        Some(text) => {
            let mut key = [0u8; 32];
            OsRng.fill_bytes(&mut key);
            let (aes_key, mac_key, iv) = payload_keys(&key);
            let ciphertext = cbc::Encryptor::<aes::Aes256>::new(&aes_key.into(), &iv.into()).encrypt_padded_vec::<Pkcs7>(text.as_bytes());
            let mut plain = key.to_vec();
            plain.extend_from_slice(&hmac(&mac_key, &[&ciphertext])[..16]);
            (Some(ciphertext), plain)
        }
        None => {
            let mut plain = vec![0u8; 48];
            OsRng.fill_bytes(&mut plain);
            (None, plain)
        }
    };
    let mut keys = Vec::new();
    for session in field(request, "sessions")?.as_array().ok_or("sessions is not a list")? {
        let mut states = states_of(Some(session))?;
        let state = states.first_mut().ok_or("a session without a state")?;
        if state.two.is_none() {
            return Err("an OMEMO 0.3 session".into());
        }
        let (message, kex) = state.encrypt(&plain);
        keys.push(json!({ "key": b64(&message), "kex": kex, "session": session_json(&states) }));
    }
    Ok(json!({ "payload": payload.map(|p| b64(&p)), "keys": keys }))
}

/// Reads the key of a message sent to this device, and the message with it.
///
/// `session` is the one with the sending device, if any; `kex` says the key
/// is an OMEMOKeyExchange (`<key kex='true'>`), which begins a session, for
/// which `signed_pre_keys` and `pre_keys` are ours, with their secrets. Answers
/// the session after, the text (null for a message without one), their
/// identity (Ed25519), and the pre-key the message used up.
pub(crate) fn decrypt(request: &Value) -> Result<Value> {
    let key = bytes(request, "key")?;
    let kex = request.get("kex").and_then(Value::as_bool).unwrap_or(false);
    let mut states: Vec<State> = states_of(request.get("session"))?.into_iter().filter(|s| s.two.is_some()).collect();
    let mut used = None;
    let (state, plain, at) = if kex {
        let fields = fields(&key)?;
        let base = public_of(field_bytes(&fields, 4).ok_or("a first message without its base key")?)?;
        let their_identity: [u8; 32] = field_bytes(&fields, 3).ok_or("a first message without their identity")?.try_into().map_err(|_| "their identity is not 32 bytes")?;
        let inner = field_bytes(&fields, 5).ok_or("a first message without its message")?;
        match states.iter().position(|s| s.base == Some(base)) {
            // Their first message again: the session it began reads it.
            Some(at) => {
                let (state, plain) = states[at].decrypt(inner)?;
                (state, plain, Some(at))
            }
            None => {
                let identity = Pair::from_json(field(request, "identity")?)?;
                let pk_id = field_number(&fields, 1).ok_or("a first message without its pre-key")?;
                let spk_id = field_number(&fields, 2).ok_or("a first message without its signed pre-key")?;
                let find = |name: &str, id: u32| -> Result<Pair> {
                    let list = field(request, name)?.as_array().ok_or_else(|| format!("{name} is not a list"))?;
                    let found = list.iter().find(|k| k.get("id").and_then(Value::as_u64) == Some(u64::from(id)));
                    Pair::from_json(found.ok_or_else(|| format!("no {name} {id}: it was used up, or is not ours"))?)
                };
                let spk = find("signed_pre_keys", spk_id)?;
                let pk = find("pre_keys", pk_id)?;
                let their_dh = montgomery_of(&their_identity)?;
                let root = x3dh([dh(&spk.secret, &their_dh)?, dh(&identity.secret, &base)?, dh(&spk.secret, &base)?, dh(&pk.secret, &base)?]);
                let ours = ed25519_public(&identity.secret);
                let fresh = State {
                    ours,
                    theirs: their_identity,
                    root,
                    send: spk,
                    // Made anew as their first message moves the ratchet on.
                    send_chain: [0u8; 32],
                    send_n: 0,
                    previous: 0,
                    chains: Vec::new(),
                    pending: None,
                    base: Some(base),
                    two: Some(ad(&their_identity, &ours)),
                };
                let (state, plain) = fresh.decrypt(inner)?;
                used = Some(pk_id);
                (state, plain, None)
            }
        }
    } else {
        let mut found = None;
        let mut last = String::from("no session with this device");
        for (at, state) in states.iter().enumerate() {
            match state.decrypt(&key) {
                Ok((state, plain)) => {
                    found = Some((state, plain, Some(at)));
                    break;
                }
                Err(e) => last = e,
            }
        }
        found.ok_or(last)?
    };
    if let Some(at) = at {
        states.remove(at);
    }
    states.insert(0, state);
    states.truncate(MOST_STATES);
    let text = match request.get("payload").and_then(Value::as_str) {
        Some(payload) if !payload.is_empty() => Some(open(&plain, &unb64(payload)?)?),
        _ => None,
    };
    Ok(json!({
        "session": session_json(&states),
        "text": text,
        "identity": b64(&states[0].theirs),
        "used_pre_key": used,
    }))
}

/// Opens a payload with the key and HMAC its sender sent this device.
fn open(plain: &[u8], payload: &[u8]) -> Result<String> {
    if plain.len() != 48 {
        return Err("a key of the wrong length for its message".into());
    }
    let (aes_key, mac_key, iv) = payload_keys(&plain[..32]);
    if !bool::from(hmac(&mac_key, &[payload])[..16].ct_eq(&plain[32..])) {
        return Err("a message that is not theirs".into());
    }
    let opened = cbc::Decryptor::<aes::Aes256>::new(&aes_key.into(), &iv.into()).decrypt_padded_vec::<Pkcs7>(payload).map_err(|_| "a message that does not open")?;
    String::from_utf8(opened).map_err(|_| "a message that is not text".into())
}
