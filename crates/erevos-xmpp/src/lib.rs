//! OMEMO for Erevos's XMPP accounts (docs/xmpp.md): version 0.3 of XEP-0384,
//! namespace `eu.siacs.conversations.axolotl`, the one Conversations, Gajim,
//! Dino, Monal and Cheogram speak. It is the Signal protocol of 2016: X3DH to
//! begin, then the Double Ratchet, with libsignal's message format and keys.
//! The app does the talking to the XMPP server (app/lib/xmpp*.ts); this crate
//! only holds keys and does the cryptography.
//!
//! Like the rest of the core it keeps nothing between calls: identities,
//! pre-keys and sessions go out as JSON, the app keeps them sealed and passes
//! them in again. Everything crosses as one JSON request with an `op` and one
//! JSON answer.
//!
//! Our own code, not audited. Checked against python-oldmemo (Syndace's,
//! used by Gajim's and Slixmpp's OMEMO) both ways: see the tests.
//!
//! OMEMO 2 (`urn:xmpp:omemo:2`, XEP-0384 0.8, as Kaidan and python-twomemo
//! speak it) is in omemo2.rs: the same ratchet with its own derivations and
//! messages, and the same identity, said as an Ed25519 key.

use aes::cipher::{block_padding::Pkcs7, BlockModeDecrypt, BlockModeEncrypt, KeyIvInit};
use aes_gcm::aead::consts::U16;
use aes_gcm::aead::{Aead, KeyInit as _, Payload};
use aes_gcm::{Aes128Gcm, AesGcm};
use base64::engine::general_purpose::{STANDARD, STANDARD_NO_PAD};
use base64::Engine as _;
use curve25519_dalek::edwards::EdwardsPoint;
use curve25519_dalek::montgomery::MontgomeryPoint;
use curve25519_dalek::scalar::Scalar;
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use rand_core::{OsRng, RngCore};
use serde_json::{json, Value};
use sha2::{Digest, Sha256, Sha512};
use subtle::ConstantTimeEq;
use x25519_dalek::{PublicKey, StaticSecret};

/// Errors cross as their message.
pub type Result<T> = std::result::Result<T, String>;

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

/// libsignal's version byte: version 3, of messages and of the protocol.
const VERSION: u8 = 0x33;
/// A Curve25519 key on the wire starts with this byte (libsignal's DJB type).
const DJB: u8 = 0x05;
/// How many messages of one chain may be skipped, as libsignal allows.
const MOST_SKIPPED: u32 = 2000;
/// Receiving chains kept, for messages that come late; libsignal keeps as many.
const MOST_CHAINS: usize = 5;
/// Keys of skipped messages kept per session, the oldest let go first.
const MOST_KEPT: usize = 2000;
/// Earlier states of a session kept, for messages sent before a new one began.
const MOST_STATES: usize = 5;

/// One request from the app: `{"op": ..., ...}`. Answers JSON bytes.
pub fn call(request: &[u8]) -> Result<Vec<u8>> {
    let request: Value = serde_json::from_slice(request).map_err(err)?;
    let op = text(&request, "op")?;
    let answer = match op {
        "identity_new" => identity_new(),
        "signed_pre_key_new" => signed_pre_key_new(&request)?,
        "pre_keys_new" => pre_keys_new(&request)?,
        "session_start" => session_start(&request)?,
        "encrypt" => encrypt(&request)?,
        "decrypt" => decrypt(&request)?,
        "sign" => sign_op(&request)?,
        "verify" => json!({ "ok": verify_op(&request)? }),
        "file_decrypt" => file_decrypt(&request)?,
        "file_encrypt" => file_encrypt(&request)?,
        "two_identity" => omemo2::identity(&request)?,
        "two_signed_pre_key_new" => omemo2::signed_pre_key_new(&request)?,
        "two_pre_keys_new" => omemo2::pre_keys_new(&request)?,
        "two_session_start" => omemo2::session_start(&request)?,
        "two_encrypt" => omemo2::encrypt(&request)?,
        "two_decrypt" => omemo2::decrypt(&request)?,
        _ => return Err(format!("unknown XMPP call {op}")),
    };
    serde_json::to_vec(&answer).map_err(err)
}

// ---- JSON and base64 ----

fn field<'a>(request: &'a Value, name: &str) -> Result<&'a Value> {
    request.get(name).filter(|v| !v.is_null()).ok_or_else(|| format!("missing {name}"))
}

fn text<'a>(request: &'a Value, name: &str) -> Result<&'a str> {
    field(request, name)?.as_str().ok_or_else(|| format!("{name} is not text"))
}

fn number(request: &Value, name: &str) -> Result<u32> {
    field(request, name)?.as_u64().and_then(|n| u32::try_from(n).ok()).ok_or_else(|| format!("{name} is not a number"))
}

fn b64(bytes: &[u8]) -> String {
    STANDARD.encode(bytes)
}

/// Base64 as XMPP clients write it: padded or not, with line breaks or not.
fn unb64(text: &str) -> Result<Vec<u8>> {
    let clean: String = text.chars().filter(|c| !c.is_ascii_whitespace()).collect();
    STANDARD.decode(&clean).or_else(|_| STANDARD_NO_PAD.decode(clean.trim_end_matches('='))).map_err(|_| "not base64".to_string())
}

fn bytes(request: &Value, name: &str) -> Result<Vec<u8>> {
    unb64(text(request, name)?)
}

fn key32(request: &Value, name: &str) -> Result<[u8; 32]> {
    bytes(request, name)?.try_into().map_err(|_| format!("{name} is not 32 bytes"))
}

/// A public key as sent: 33 bytes starting with 0x05, or the 32 bytes alone.
fn public_of(raw: &[u8]) -> Result<[u8; 32]> {
    match raw.len() {
        33 if raw[0] == DJB => Ok(raw[1..].try_into().expect("32 bytes")),
        32 => Ok(raw.try_into().expect("32 bytes")),
        _ => Err("not a Curve25519 key".to_string()),
    }
}

fn public(request: &Value, name: &str) -> Result<[u8; 32]> {
    public_of(&bytes(request, name)?)
}

fn wire(public: &[u8; 32]) -> [u8; 33] {
    let mut out = [0u8; 33];
    out[0] = DJB;
    out[1..].copy_from_slice(public);
    out
}

// ---- keys ----

struct Pair {
    secret: [u8; 32],
    public: [u8; 32],
}

impl Pair {
    fn new() -> Pair {
        let secret = StaticSecret::random_from_rng(OsRng);
        Pair { public: *PublicKey::from(&secret).as_bytes(), secret: secret.to_bytes() }
    }

    fn of(secret: [u8; 32]) -> Pair {
        Pair { public: *PublicKey::from(&StaticSecret::from(secret)).as_bytes(), secret }
    }

    fn json(&self) -> Value {
        json!({ "secret": b64(&self.secret), "public": b64(&wire(&self.public)) })
    }

    fn from_json(value: &Value) -> Result<Pair> {
        let secret = key32(value, "secret")?;
        let pair = Pair::of(secret);
        if let Some(given) = value.get("public").and_then(Value::as_str) {
            if public_of(&unb64(given)?)? != pair.public {
                return Err("a key pair whose halves do not match".into());
            }
        }
        Ok(pair)
    }
}

/// X25519, refusing a key that would make everyone's answer the same.
fn dh(secret: &[u8; 32], their: &[u8; 32]) -> Result<[u8; 32]> {
    let shared = StaticSecret::from(*secret).diffie_hellman(&PublicKey::from(*their));
    if !shared.was_contributory() {
        return Err("their key is not usable".into());
    }
    Ok(shared.to_bytes())
}

fn identity_new() -> Value {
    let pair = Pair::new();
    // A device id: a random number from 1 to 2^31 - 1, as XEP-0384 asks.
    let device = (OsRng.next_u32() & 0x7fff_ffff).max(1);
    json!({ "identity": pair.json(), "device": device })
}

/// A signed pre-key: `id`, signed with the identity (`identity.secret`).
fn signed_pre_key_new(request: &Value) -> Result<Value> {
    let identity = Pair::from_json(field(request, "identity")?)?;
    let id = number(request, "id")?;
    let pair = Pair::new();
    let signature = xeddsa_sign(&identity.secret, &wire(&pair.public));
    let mut out = pair.json();
    out["id"] = json!(id);
    out["signature"] = json!(b64(&signature));
    Ok(out)
}

/// `count` one-time pre-keys, numbered from `start`.
fn pre_keys_new(request: &Value) -> Result<Value> {
    let start = number(request, "start")?;
    let count = number(request, "count")?.min(1000);
    let keys: Vec<Value> = (0..count)
        .map(|i| {
            let mut key = Pair::new().json();
            key["id"] = json!(start.wrapping_add(i).max(1));
            key
        })
        .collect();
    Ok(json!({ "pre_keys": keys }))
}

// ---- XEdDSA (Signal's signatures with Curve25519 keys) ----

fn clamp(mut secret: [u8; 32]) -> [u8; 32] {
    secret[0] &= 248;
    secret[31] &= 127;
    secret[31] |= 64;
    secret
}

/// Signs `message` with a Curve25519 secret key, as XEdDSA does: the Edwards
/// key's sign bit is made 0, so anyone can verify with the Curve25519 key alone.
pub fn xeddsa_sign(secret: &[u8; 32], message: &[u8]) -> [u8; 64] {
    let k = Scalar::from_bytes_mod_order(clamp(*secret));
    let big_a = EdwardsPoint::mul_base(&k).compress();
    let (a, big_a) = if big_a.as_bytes()[31] & 0x80 != 0 { (-k, EdwardsPoint::mul_base(&-k).compress()) } else { (k, big_a) };
    let mut z = [0u8; 64];
    OsRng.fill_bytes(&mut z);
    let mut hash = Sha512::new();
    hash.update([0xfe]);
    hash.update([0xff; 31]);
    hash.update(a.as_bytes());
    hash.update(message);
    hash.update(z);
    let r = Scalar::from_bytes_mod_order_wide(&hash.finalize().into());
    let big_r = EdwardsPoint::mul_base(&r).compress();
    let h = Scalar::from_bytes_mod_order_wide(&Sha512::new().chain_update(big_r.as_bytes()).chain_update(big_a.as_bytes()).chain_update(message).finalize().into());
    let s = r + h * a;
    let mut signature = [0u8; 64];
    signature[..32].copy_from_slice(big_r.as_bytes());
    signature[32..].copy_from_slice(s.as_bytes());
    signature
}

/// Checks a signature made with the secret of the Curve25519 key `public`.
/// The Edwards key's sign bit is read from the signature's last bit, as
/// libsignal does, so that signatures of older clients are taken too.
pub fn xeddsa_verify(public: &[u8; 32], message: &[u8], signature: &[u8]) -> bool {
    let Ok(signature): std::result::Result<[u8; 64], _> = signature.try_into() else {
        return false;
    };
    let sign = signature[63] >> 7;
    let Some(big_a) = MontgomeryPoint(*public).to_edwards(sign) else {
        return false;
    };
    if big_a.is_small_order() {
        return false;
    }
    let mut s = [0u8; 32];
    s.copy_from_slice(&signature[32..]);
    s[31] &= 0x7f;
    let Some(s) = Option::<Scalar>::from(Scalar::from_canonical_bytes(s)) else {
        return false;
    };
    let big_r = &signature[..32];
    let h = Scalar::from_bytes_mod_order_wide(&Sha512::new().chain_update(big_r).chain_update(big_a.compress().as_bytes()).chain_update(message).finalize().into());
    let check = EdwardsPoint::vartime_double_scalar_mul_basepoint(&h, &-big_a, &s);
    check.compress().as_bytes().ct_eq(big_r).into()
}

fn sign_op(request: &Value) -> Result<Value> {
    let identity = Pair::from_json(field(request, "identity")?)?;
    Ok(json!({ "signature": b64(&xeddsa_sign(&identity.secret, &bytes(request, "message")?)) }))
}

fn verify_op(request: &Value) -> Result<bool> {
    Ok(xeddsa_verify(&public(request, "public")?, &bytes(request, "message")?, &bytes(request, "signature")?))
}

// ---- libsignal's key derivations ----

fn hkdf(ikm: &[u8], salt: Option<&[u8]>, info: &[u8], len: usize) -> Vec<u8> {
    let mut out = vec![0u8; len];
    Hkdf::<Sha256>::new(salt, ikm).expand(info, &mut out).expect("a length HKDF can make");
    out
}

fn hmac(key: &[u8], parts: &[&[u8]]) -> [u8; 32] {
    let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(key).expect("HMAC takes any key");
    for part in parts {
        mac.update(part);
    }
    mac.finalize().into_bytes().into()
}

fn halves(bytes: &[u8]) -> ([u8; 32], [u8; 32]) {
    (bytes[..32].try_into().expect("32 bytes"), bytes[32..64].try_into().expect("32 bytes"))
}

/// A step of the root chain: the new root key and a chain key, from a new DH.
fn root_step(root: &[u8; 32], their: &[u8; 32], ours: &[u8; 32], two: bool) -> Result<([u8; 32], [u8; 32])> {
    let info: &[u8] = if two { b"OMEMO Root Chain" } else { b"WhisperRatchet" };
    Ok(halves(&hkdf(&dh(ours, their)?, Some(root), info, 64)))
}

/// A step of a message chain: this message's seed, and the chain key after it.
fn chain_step(chain: &[u8; 32]) -> ([u8; 32], [u8; 32]) {
    (hmac(chain, &[&[1]]), hmac(chain, &[&[2]]))
}

/// A message's AES key, MAC key and IV, from its seed.
fn message_keys(seed: &[u8; 32], two: bool) -> ([u8; 32], [u8; 32], [u8; 16]) {
    let info: &[u8] = if two { b"OMEMO Message Key Material" } else { b"WhisperMessageKeys" };
    let out = hkdf(seed, None, info, 80);
    (out[..32].try_into().expect("32"), out[32..64].try_into().expect("32"), out[64..80].try_into().expect("16"))
}

// ---- the few protobuf messages of libsignal ----

fn put_varint(out: &mut Vec<u8>, mut n: u64) {
    while n >= 0x80 {
        out.push((n as u8) | 0x80);
        n >>= 7;
    }
    out.push(n as u8);
}

fn put_number(out: &mut Vec<u8>, field: u64, n: u32) {
    put_varint(out, field << 3);
    put_varint(out, u64::from(n));
}

fn put_bytes(out: &mut Vec<u8>, field: u64, bytes: &[u8]) {
    put_varint(out, (field << 3) | 2);
    put_varint(out, bytes.len() as u64);
    out.extend_from_slice(bytes);
}

enum Field {
    Number(u64),
    Bytes(Vec<u8>),
}

/// A protobuf message's fields by number, the last of each counting; others skipped.
fn fields(mut data: &[u8]) -> Result<std::collections::BTreeMap<u64, Field>> {
    fn varint(data: &mut &[u8]) -> Result<u64> {
        let mut n = 0u64;
        for shift in (0..64).step_by(7) {
            let (&byte, rest) = data.split_first().ok_or("a message cut short")?;
            *data = rest;
            n |= u64::from(byte & 0x7f) << shift;
            if byte & 0x80 == 0 {
                return Ok(n);
            }
        }
        Err("a number too long".into())
    }
    let mut out = std::collections::BTreeMap::new();
    while !data.is_empty() {
        let key = varint(&mut data)?;
        let value = match key & 7 {
            0 => Field::Number(varint(&mut data)?),
            1 | 5 => {
                let len = if key & 7 == 1 { 8 } else { 4 };
                data = data.get(len..).ok_or("a message cut short")?;
                continue;
            }
            2 => {
                let len = usize::try_from(varint(&mut data)?).map_err(err)?;
                let bytes = data.get(..len).ok_or("a message cut short")?.to_vec();
                data = &data[len..];
                Field::Bytes(bytes)
            }
            _ => return Err("not a message".into()),
        };
        out.insert(key >> 3, value);
    }
    Ok(out)
}

fn field_number(fields: &std::collections::BTreeMap<u64, Field>, n: u64) -> Option<u32> {
    match fields.get(&n) {
        Some(Field::Number(v)) => u32::try_from(*v).ok(),
        _ => None,
    }
}

fn field_bytes(fields: &std::collections::BTreeMap<u64, Field>, n: u64) -> Option<&[u8]> {
    match fields.get(&n) {
        Some(Field::Bytes(v)) => Some(v),
        _ => None,
    }
}

// ---- sessions ----

#[derive(Clone)]
struct Chain {
    /// Their ratchet key of this chain.
    their: [u8; 32],
    key: [u8; 32],
    /// The number of the next message on it.
    n: u32,
    /// Seeds of messages that were skipped, by number.
    skipped: Vec<(u32, [u8; 32])>,
}

#[derive(Clone)]
struct Pending {
    pre_key: u32,
    signed_pre_key: u32,
    base: [u8; 32],
}

/// One Double Ratchet between this device and one of theirs.
#[derive(Clone)]
struct State {
    /// Our identity key and theirs, as each message's MAC takes them.
    ours: [u8; 32],
    theirs: [u8; 32],
    root: [u8; 32],
    send: Pair,
    send_chain: [u8; 32],
    send_n: u32,
    /// The length of our sending chain before this one.
    previous: u32,
    chains: Vec<Chain>,
    /// While they have not answered: what our first messages carry so they can begin too.
    pending: Option<Pending>,
    /// Their base key, when they began it, so their first message read again is known.
    base: Option<[u8; 32]>,
    /// OMEMO 2's, whose identities are Ed25519 keys and whose every MAC takes the identity of
    /// the side that began it, then the other's.
    two: Option<[u8; 64]>,
}

impl Clone for Pair {
    fn clone(&self) -> Pair {
        Pair { secret: self.secret, public: self.public }
    }
}

impl State {
    fn json(&self) -> Value {
        let chains: Vec<Value> = self
            .chains
            .iter()
            .map(|c| {
                let skipped: Vec<Value> = c.skipped.iter().map(|(n, seed)| json!([n, b64(seed)])).collect();
                json!({ "their": b64(&c.their), "key": b64(&c.key), "n": c.n, "skipped": skipped })
            })
            .collect();
        let mut out = json!({
            "ours": b64(&self.ours),
            "theirs": b64(&self.theirs),
            "root": b64(&self.root),
            "send": self.send.json(),
            "send_chain": b64(&self.send_chain),
            "send_n": self.send_n,
            "previous": self.previous,
            "chains": chains,
        });
        if let Some(p) = &self.pending {
            out["pending"] = json!({ "pre_key": p.pre_key, "signed_pre_key": p.signed_pre_key, "base": b64(&p.base) });
        }
        if let Some(base) = &self.base {
            out["base"] = json!(b64(base));
        }
        if let Some(ad) = &self.two {
            out["version"] = json!(2);
            out["ad"] = json!(b64(ad));
        }
        out
    }

    fn from_json(value: &Value) -> Result<State> {
        let chains = field(value, "chains")?
            .as_array()
            .ok_or("chains is not a list")?
            .iter()
            .map(|c| {
                let skipped = field(c, "skipped")?
                    .as_array()
                    .ok_or("skipped is not a list")?
                    .iter()
                    .map(|s| {
                        let n = s.get(0).and_then(Value::as_u64).and_then(|n| u32::try_from(n).ok()).ok_or("a skipped number")?;
                        let seed: [u8; 32] = unb64(s.get(1).and_then(Value::as_str).ok_or("a skipped key")?)?.try_into().map_err(|_| "a skipped key")?;
                        Ok((n, seed))
                    })
                    .collect::<Result<Vec<_>>>()?;
                Ok(Chain { their: key32(c, "their")?, key: key32(c, "key")?, n: number(c, "n")?, skipped })
            })
            .collect::<Result<Vec<_>>>()?;
        let pending = match value.get("pending").filter(|v| !v.is_null()) {
            Some(p) => Some(Pending { pre_key: number(p, "pre_key")?, signed_pre_key: number(p, "signed_pre_key")?, base: key32(p, "base")? }),
            None => None,
        };
        let base = match value.get("base").and_then(Value::as_str) {
            Some(b) => Some(unb64(b)?.try_into().map_err(|_| "base is not 32 bytes")?),
            None => None,
        };
        let two = match value.get("version").and_then(Value::as_u64) {
            Some(2) => Some(unb64(text(value, "ad")?)?.try_into().map_err(|_| "ad is not 64 bytes")?),
            _ => None,
        };
        Ok(State {
            ours: key32(value, "ours")?,
            theirs: key32(value, "theirs")?,
            root: key32(value, "root")?,
            send: Pair::from_json(field(value, "send")?)?,
            send_chain: key32(value, "send_chain")?,
            send_n: number(value, "send_n")?,
            previous: number(value, "previous")?,
            chains,
            pending,
            base,
            two,
        })
    }

    /// Encrypts `plain` (the payload's key and tag) as their next message.
    fn encrypt(&mut self, plain: &[u8]) -> (Vec<u8>, bool) {
        let (seed, next) = chain_step(&self.send_chain);
        let (aes_key, mac_key, iv) = message_keys(&seed, self.two.is_some());
        let ciphertext = cbc::Encryptor::<aes::Aes256>::new(&aes_key.into(), &iv.into()).encrypt_padded_vec::<Pkcs7>(plain);
        if let Some(ad) = &self.two {
            let sealed = omemo2::seal(ad, &mac_key, &self.send.public, self.send_n, self.previous, &ciphertext);
            self.send_chain = next;
            self.send_n += 1;
            return match &self.pending {
                Some(p) => (omemo2::key_exchange(p, &self.ours, &sealed), true),
                None => (sealed, false),
            };
        }
        let mut message = vec![VERSION];
        put_bytes(&mut message, 1, &wire(&self.send.public));
        put_number(&mut message, 2, self.send_n);
        put_number(&mut message, 3, self.previous);
        put_bytes(&mut message, 4, &ciphertext);
        let mac = hmac(&mac_key, &[&wire(&self.ours), &wire(&self.theirs), &message]);
        message.extend_from_slice(&mac[..8]);
        self.send_chain = next;
        self.send_n += 1;
        match &self.pending {
            Some(p) => {
                let mut out = vec![VERSION];
                put_number(&mut out, 1, p.pre_key);
                put_bytes(&mut out, 2, &wire(&p.base));
                put_bytes(&mut out, 3, &wire(&self.ours));
                put_bytes(&mut out, 4, &message);
                put_number(&mut out, 6, p.signed_pre_key);
                (out, true)
            }
            None => (message, false),
        }
    }

    /// Reads one of their messages (libsignal's SignalMessage), changing the
    /// state only when it is theirs.
    fn decrypt(&self, data: &[u8]) -> Result<(State, Vec<u8>)> {
        // OMEMO 2's: its MAC around its message, which has no version byte.
        let opened2;
        let (message, mac, their, n, ciphertext) = if self.two.is_some() {
            opened2 = omemo2::opened(data)?;
            (&opened2.message[..], &opened2.mac[..], opened2.their, opened2.n, opened2.ciphertext.clone())
        } else {
            if data.len() < 1 + 8 || data[0] >> 4 != 3 {
                return Err("not an OMEMO 0.3 message".into());
            }
            let (message, mac) = data.split_at(data.len() - 8);
            let fields = fields(&message[1..])?;
            let their = public_of(field_bytes(&fields, 1).ok_or("a message without its ratchet key")?)?;
            let n = field_number(&fields, 2).ok_or("a message without its number")?;
            let ciphertext = field_bytes(&fields, 4).ok_or("a message without its text")?.to_vec();
            (message, mac, their, n, ciphertext)
        };
        let two = self.two.is_some();
        let mut next = self.clone();
        let index = match next.chains.iter().position(|c| c.their == their) {
            Some(i) => i,
            None => {
                let (root, chain) = root_step(&next.root, &their, &next.send.secret, two)?;
                let send = Pair::new();
                let (root, send_chain) = root_step(&root, &their, &send.secret, two)?;
                next.chains.insert(0, Chain { their, key: chain, n: 0, skipped: Vec::new() });
                next.chains.truncate(MOST_CHAINS);
                next.root = root;
                next.previous = next.send_n;
                next.send = send;
                next.send_chain = send_chain;
                next.send_n = 0;
                0
            }
        };
        let chain = &mut next.chains[index];
        let seed = if n < chain.n {
            let at = chain.skipped.iter().position(|(m, _)| *m == n).ok_or("a message read before, or too old")?;
            chain.skipped.remove(at).1
        } else {
            if n - chain.n > MOST_SKIPPED {
                return Err("a message too far ahead".into());
            }
            while chain.n < n {
                let (seed, key) = chain_step(&chain.key);
                chain.skipped.push((chain.n, seed));
                chain.key = key;
                chain.n += 1;
            }
            let (seed, key) = chain_step(&chain.key);
            chain.key = key;
            chain.n += 1;
            seed
        };
        let (aes_key, mac_key, iv) = message_keys(&seed, two);
        let expected = match &next.two {
            Some(ad) => hmac(&mac_key, &[ad, message]),
            None => hmac(&mac_key, &[&wire(&next.theirs), &wire(&next.ours), message]),
        };
        if mac.len() != if two { 16 } else { 8 } || !bool::from(expected[..mac.len()].ct_eq(mac)) {
            return Err("a message that is not theirs".into());
        }
        let plain = cbc::Decryptor::<aes::Aes256>::new(&aes_key.into(), &iv.into()).decrypt_padded_vec::<Pkcs7>(&ciphertext).map_err(|_| "a message that does not open")?;
        // Only the newest seeds are kept.
        let kept: usize = next.chains.iter().map(|c| c.skipped.len()).sum();
        if kept > MOST_KEPT {
            let mut drop = kept - MOST_KEPT;
            for chain in next.chains.iter_mut().rev() {
                let take = drop.min(chain.skipped.len());
                chain.skipped.drain(..take);
                drop -= take;
            }
        }
        next.pending = None;
        Ok((next, plain))
    }
}

/// A session with one device: its current state first, then earlier ones.
fn states_of(value: Option<&Value>) -> Result<Vec<State>> {
    match value.filter(|v| !v.is_null()) {
        None => Ok(Vec::new()),
        Some(v) => field(v, "states")?.as_array().ok_or("states is not a list")?.iter().map(State::from_json).collect(),
    }
}

fn session_json(states: &[State]) -> Value {
    // Their identity as their version says it: OMEMO 2's Ed25519 key as it is.
    let identity = states.first().map(|s| if s.two.is_some() { b64(&s.theirs) } else { b64(&wire(&s.theirs)) });
    json!({ "states": states.iter().map(State::json).collect::<Vec<_>>(), "identity": identity })
}

/// Begins a session with one of their devices from its bundle, after checking
/// the signed pre-key's signature. Answers the session.
fn session_start(request: &Value) -> Result<Value> {
    let identity = Pair::from_json(field(request, "identity")?)?;
    let bundle = field(request, "bundle")?;
    let their_identity = public(bundle, "identity")?;
    let spk = field(bundle, "signed_pre_key")?;
    let spk_public = public(spk, "public")?;
    if !xeddsa_verify(&their_identity, &wire(&spk_public), &bytes(spk, "signature")?) {
        return Err("their signed pre-key is not signed by their identity".into());
    }
    let pre_key = field(bundle, "pre_key")?;
    let pre_key_public = public(pre_key, "public")?;
    let base = Pair::new();
    let mut master = vec![0xffu8; 32];
    master.extend_from_slice(&dh(&identity.secret, &spk_public)?);
    master.extend_from_slice(&dh(&base.secret, &their_identity)?);
    master.extend_from_slice(&dh(&base.secret, &spk_public)?);
    master.extend_from_slice(&dh(&base.secret, &pre_key_public)?);
    let (root, chain) = halves(&hkdf(&master, None, b"WhisperText", 64));
    let send = Pair::new();
    let (root, send_chain) = root_step(&root, &spk_public, &send.secret, false)?;
    let state = State {
        ours: identity.public,
        theirs: their_identity,
        root,
        send,
        send_chain,
        send_n: 0,
        previous: 0,
        chains: vec![Chain { their: spk_public, key: chain, n: 0, skipped: Vec::new() }],
        pending: Some(Pending { pre_key: number(pre_key, "id")?, signed_pre_key: number(spk, "id")?, base: base.public }),
        base: None,
        two: None,
    };
    Ok(json!({ "session": session_json(&[state]) }))
}

/// Encrypts a message for several devices: the text (or nothing, for a
/// message that only moves the ratchets on) with AES-128-GCM under a new key,
/// and that key with its tag for each device in its session. Answers the
/// payload, the IV, and each device's key with its session after.
fn encrypt(request: &Value) -> Result<Value> {
    let mut key = [0u8; 16];
    let mut iv = [0u8; 12];
    OsRng.fill_bytes(&mut key);
    OsRng.fill_bytes(&mut iv);
    let (payload, plain) = match request.get("text").and_then(Value::as_str) {
        Some(text) => {
            let sealed = Aes128Gcm::new(&key.into()).encrypt(&iv.into(), text.as_bytes()).map_err(|_| "cannot encrypt")?;
            let (payload, tag) = sealed.split_at(sealed.len() - 16);
            let mut plain = key.to_vec();
            plain.extend_from_slice(tag);
            (Some(payload.to_vec()), plain)
        }
        None => {
            let mut plain = vec![0u8; 32];
            OsRng.fill_bytes(&mut plain);
            (None, plain)
        }
    };
    let mut keys = Vec::new();
    for session in field(request, "sessions")?.as_array().ok_or("sessions is not a list")? {
        let mut states = states_of(Some(session))?;
        let state = states.first_mut().ok_or("a session without a state")?;
        let (message, prekey) = state.encrypt(&plain);
        keys.push(json!({ "key": b64(&message), "prekey": prekey, "session": session_json(&states) }));
    }
    Ok(json!({ "payload": payload.map(|p| b64(&p)), "iv": b64(&iv), "keys": keys }))
}

/// Reads the key of a message sent to this device, and the message with it.
///
/// `session` is the one with the sending device, if any; `prekey` says the
/// key began a session, as the message's `<key prekey='true'>` does. For it
/// `signed_pre_keys` and `pre_keys` are ours, with their secrets. Answers the
/// session after, the text (null for a message without one), their identity
/// key, and the pre-key the message used up, which the app replaces.
fn decrypt(request: &Value) -> Result<Value> {
    let key = bytes(request, "key")?;
    let prekey = request.get("prekey").and_then(Value::as_bool).unwrap_or(false);
    let mut states = states_of(request.get("session"))?;
    let mut used = None;
    let (state, plain, at) = if prekey {
        if key.is_empty() || key[0] >> 4 != 3 {
            return Err("not an OMEMO 0.3 message".into());
        }
        let fields = fields(&key[1..])?;
        let base = public_of(field_bytes(&fields, 2).ok_or("a first message without its base key")?)?;
        let their_identity = public_of(field_bytes(&fields, 3).ok_or("a first message without their identity")?)?;
        let inner = field_bytes(&fields, 4).ok_or("a first message without its message")?;
        match states.iter().position(|s| s.base == Some(base)) {
            // Their first message again (from the archive, or sent twice): the session it began reads it.
            Some(at) => {
                let (state, plain) = states[at].decrypt(inner)?;
                (state, plain, Some(at))
            }
            None => {
                let identity = Pair::from_json(field(request, "identity")?)?;
                let spk_id = field_number(&fields, 6).ok_or("a first message without its signed pre-key")?;
                let pk_id = field_number(&fields, 1).ok_or("a first message without its pre-key")?;
                let find = |name: &str, id: u32| -> Result<Pair> {
                    let list = field(request, name)?.as_array().ok_or_else(|| format!("{name} is not a list"))?;
                    let found = list.iter().find(|k| k.get("id").and_then(Value::as_u64) == Some(u64::from(id)));
                    Pair::from_json(found.ok_or_else(|| format!("no {name} {id}: it was used up, or is not ours"))?)
                };
                let spk = find("signed_pre_keys", spk_id)?;
                let pk = find("pre_keys", pk_id)?;
                let mut master = vec![0xffu8; 32];
                master.extend_from_slice(&dh(&spk.secret, &their_identity)?);
                master.extend_from_slice(&dh(&identity.secret, &base)?);
                master.extend_from_slice(&dh(&spk.secret, &base)?);
                master.extend_from_slice(&dh(&pk.secret, &base)?);
                let (root, chain) = halves(&hkdf(&master, None, b"WhisperText", 64));
                let fresh = State {
                    ours: identity.public,
                    theirs: their_identity,
                    root,
                    send: spk,
                    send_chain: chain,
                    send_n: 0,
                    previous: 0,
                    chains: Vec::new(),
                    pending: None,
                    base: Some(base),
                    two: None,
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
    // The state that read it comes first; a new one pushes the others back.
    if let Some(at) = at {
        states.remove(at);
    }
    states.insert(0, state);
    states.truncate(MOST_STATES);
    let text = match (request.get("payload").and_then(Value::as_str), request.get("iv").and_then(Value::as_str)) {
        (Some(payload), Some(iv)) if !payload.is_empty() => Some(open_payload(&plain, &unb64(payload)?, &unb64(iv)?)?),
        _ => None,
    };
    Ok(json!({
        "session": session_json(&states),
        "text": text,
        "identity": b64(&wire(&states[0].theirs)),
        "used_pre_key": used,
    }))
}

/// Opens a message's payload with the key and tag its sender sent this device.
fn open_payload(plain: &[u8], payload: &[u8], iv: &[u8]) -> Result<String> {
    if plain.len() < 32 {
        return Err("a key too short for its message".into());
    }
    let (key, tag) = (&plain[..16], &plain[16..32]);
    let mut sealed = payload.to_vec();
    sealed.extend_from_slice(tag);
    let opened = match iv.len() {
        12 => Aes128Gcm::new(key.into()).decrypt(iv.into(), Payload { msg: &sealed, aad: b"" }),
        16 => AesGcm::<aes_gcm::aes::Aes128, U16>::new(key.into()).decrypt(iv.into(), Payload { msg: &sealed, aad: b"" }),
        _ => return Err("an IV of an unknown length".into()),
    }
    .map_err(|_| "a message that does not open")?;
    String::from_utf8(opened).map_err(|_| "a message that is not text".into())
}

/// A file as Conversations shares it (aesgcm:// links): AES-256-GCM, the
/// key and IV in the link's fragment, the 16-byte tag after the file.
fn file_encrypt(request: &Value) -> Result<Value> {
    let data = bytes(request, "data")?;
    let mut key = [0u8; 32];
    let mut iv = [0u8; 12];
    OsRng.fill_bytes(&mut key);
    OsRng.fill_bytes(&mut iv);
    let sealed = aes_gcm::Aes256Gcm::new(&key.into()).encrypt(&iv.into(), data.as_slice()).map_err(|_| "cannot encrypt")?;
    let mut fragment = String::new();
    for b in iv.iter().chain(key.iter()) {
        fragment.push_str(&format!("{b:02x}"));
    }
    Ok(json!({ "data": b64(&sealed), "fragment": fragment }))
}

fn file_decrypt(request: &Value) -> Result<Value> {
    let data = bytes(request, "data")?;
    let fragment = text(request, "fragment")?;
    let raw: Vec<u8> = (0..fragment.len() / 2).map(|i| u8::from_str_radix(fragment.get(2 * i..2 * i + 2).unwrap_or("zz"), 16)).collect::<std::result::Result<_, _>>().map_err(|_| "not a file link")?;
    // 12 or 16 bytes of IV, then the 32-byte key.
    let (iv, key) = match raw.len() {
        44 => raw.split_at(12),
        48 => raw.split_at(16),
        _ => return Err("not a file link".into()),
    };
    let opened = match iv.len() {
        12 => aes_gcm::Aes256Gcm::new(key.into()).decrypt(iv.into(), data.as_slice()),
        _ => AesGcm::<aes_gcm::aes::Aes256, U16>::new(key.into()).decrypt(iv.into(), data.as_slice()),
    }
    .map_err(|_| "a file that does not open")?;
    Ok(json!({ "data": b64(&opened) }))
}

mod omemo2;

#[cfg(test)]
mod tests;
