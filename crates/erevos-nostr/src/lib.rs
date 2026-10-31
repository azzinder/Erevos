// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Nostr for Erevos message text: a second road beside the space's own relay.
//!
//! What a contact writes is sealed end to end by the core already
//! (erevos-core's conversation); here those sealed bytes travel once more,
//! as a Nostr event to public Nostr relays (NIP-01).
//!
//! - Each contact gets keys of its own for it ([`new_secret`],
//!   [`public_key`]), so no Nostr relay can tell from the keys that two
//!   contacts reach the same person, or who a person's contacts are.
//! - An event to a contact ([`wrap`]) is a gift wrap (kind 1059, NIP-59):
//!   signed by a key made for that one event, addressed to the contact's key
//!   with a `p` tag, its content the sealed bytes encrypted to that key with
//!   NIP-44 v2, its time set back by up to an hour, and an expiration (NIP-40)
//!   asking relays to drop it two days after it was made at the earliest, told
//!   from the time it says. The relay sees neither who sent it nor what it
//!   says, only the key it is for.
//! - [`unwrap`] checks the event's id and signature, that it is for the key
//!   given, and decrypts it.
//!
//! The keys are secp256k1, as Nostr's are: BIP-340 signatures, and for NIP-44
//! the x coordinate of their Diffie-Hellman point.
//!
//! Not audited.

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use k256::schnorr::{Signature, SigningKey, VerifyingKey};
use rand_core::{OsRng, RngCore};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

pub type Result<T> = std::result::Result<T, String>;

pub mod chat;

/// A gift wrap's kind (NIP-59).
pub const WRAP_KIND: u64 = 1059;
/// How far back, at most, a wrap's time is set, so the relay does not learn when it was sent.
pub const WRAP_BACKDATE: u64 = 3600;
/// How long after it is made a wrap asks relays to keep it (NIP-40), in seconds.
pub const WRAP_LIFETIME: u64 = 2 * 24 * 3600;
/// The longest text NIP-44 encrypts, in bytes.
pub const MAX_PLAINTEXT: usize = 65535;
/// The most sealed bytes one wrap carries: their base64 must fit [`MAX_PLAINTEXT`].
pub const MAX_BYTES: usize = MAX_PLAINTEXT / 4 * 3;

/// A new secret key, for one contact's events or one wrap.
pub fn new_secret() -> [u8; 32] {
    loop {
        let mut secret = [0u8; 32];
        OsRng.fill_bytes(&mut secret);
        if SigningKey::from_bytes(&secret).is_ok() {
            return secret;
        }
    }
}

fn signing_key(secret: &[u8]) -> Result<SigningKey> {
    if secret.len() != 32 {
        return Err("not a Nostr secret key".to_string());
    }
    SigningKey::from_bytes(secret).map_err(|_| "not a Nostr secret key".to_string())
}

fn verifying_key(public: &[u8]) -> Result<VerifyingKey> {
    if public.len() != 32 {
        return Err("not a Nostr public key".to_string());
    }
    VerifyingKey::from_bytes(public).map_err(|_| "not a Nostr public key".to_string())
}

/// The public key of `secret`: its x coordinate, as Nostr writes keys.
pub fn public_key(secret: &[u8]) -> Result<[u8; 32]> {
    Ok(signing_key(secret)?.verifying_key().to_bytes().into())
}

// NIP-44 v2.

/// The key two Nostr keys share, either way round (NIP-44 v2).
pub fn conversation_key(secret: &[u8], public: &[u8]) -> Result<[u8; 32]> {
    let secret = signing_key(secret)?;
    let public = verifying_key(public)?;
    let secret = k256::SecretKey::from_bytes(&secret.to_bytes()).map_err(|_| "not a Nostr secret key".to_string())?;
    let shared = k256::ecdh::diffie_hellman(secret.to_nonzero_scalar(), public.as_affine());
    let (key, _) = Hkdf::<Sha256>::extract(Some(b"nip44-v2"), shared.raw_secret_bytes());
    Ok(key.into())
}

/// The keys of one message: for ChaCha20, its nonce, and for the HMAC.
pub struct MessageKeys {
    pub chacha_key: Zeroizing<[u8; 32]>,
    pub chacha_nonce: [u8; 12],
    pub hmac_key: Zeroizing<[u8; 32]>,
}

/// The keys of the message with `nonce` (NIP-44 v2).
pub fn message_keys(conversation_key: &[u8], nonce: &[u8; 32]) -> Result<MessageKeys> {
    let hkdf = Hkdf::<Sha256>::from_prk(conversation_key).map_err(|_| "not a conversation key".to_string())?;
    let mut okm = Zeroizing::new([0u8; 76]);
    hkdf.expand(nonce, okm.as_mut()).map_err(|_| "not a conversation key".to_string())?;
    let mut keys = MessageKeys {
        chacha_key: Zeroizing::new([0u8; 32]),
        chacha_nonce: [0u8; 12],
        hmac_key: Zeroizing::new([0u8; 32]),
    };
    keys.chacha_key.copy_from_slice(&okm[..32]);
    keys.chacha_nonce.copy_from_slice(&okm[32..44]);
    keys.hmac_key.copy_from_slice(&okm[44..]);
    Ok(keys)
}

/// How long a text of `len` bytes is once padded, so its length tells little (NIP-44 v2).
pub fn padded_len(len: usize) -> usize {
    if len <= 32 {
        return 32;
    }
    let next_power = 1usize << (usize::BITS - (len - 1).leading_zeros());
    let chunk = if next_power <= 256 { 32 } else { next_power / 8 };
    chunk * ((len - 1) / chunk + 1)
}

fn mac(hmac_key: &[u8], nonce: &[u8], ciphertext: &[u8]) -> Hmac<Sha256> {
    let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(hmac_key).expect("HMAC takes any key");
    mac.update(nonce);
    mac.update(ciphertext);
    mac
}

/// Encrypts `plaintext` with `conversation_key` and a random nonce (NIP-44 v2).
pub fn encrypt(conversation_key: &[u8], plaintext: &str) -> Result<String> {
    let mut nonce = [0u8; 32];
    OsRng.fill_bytes(&mut nonce);
    encrypt_with_nonce(conversation_key, plaintext, &nonce)
}

/// [`encrypt`] with the nonce given: for checks against NIP-44's own vectors, never to send.
#[doc(hidden)]
pub fn encrypt_with_nonce(conversation_key: &[u8], plaintext: &str, nonce: &[u8; 32]) -> Result<String> {
    let text = plaintext.as_bytes();
    if text.is_empty() || text.len() > MAX_PLAINTEXT {
        return Err("Nostr encrypts 1 to 65535 bytes of text".to_string());
    }
    let keys = message_keys(conversation_key, nonce)?;
    let mut padded = vec![0u8; 2 + padded_len(text.len())];
    padded[..2].copy_from_slice(&(text.len() as u16).to_be_bytes());
    padded[2..2 + text.len()].copy_from_slice(text);
    ChaCha20::new(keys.chacha_key.as_ref().into(), &keys.chacha_nonce.into()).apply_keystream(&mut padded);
    let tag = mac(keys.hmac_key.as_ref(), nonce, &padded).finalize().into_bytes();
    let mut payload = Vec::with_capacity(1 + 32 + padded.len() + 32);
    payload.push(2);
    payload.extend_from_slice(nonce);
    payload.extend_from_slice(&padded);
    payload.extend_from_slice(&tag);
    Ok(BASE64.encode(payload))
}

/// Decrypts what [`encrypt`] made with the same `conversation_key` (NIP-44 v2).
pub fn decrypt(conversation_key: &[u8], payload: &str) -> Result<String> {
    if payload.starts_with('#') {
        return Err("a Nostr encryption Erevos does not know".to_string());
    }
    if payload.len() < 132 || payload.len() > 87472 {
        return Err("not a Nostr encrypted text".to_string());
    }
    let data = BASE64.decode(payload).map_err(|_| "not a Nostr encrypted text".to_string())?;
    if data.len() < 99 || data.len() > 65603 {
        return Err("not a Nostr encrypted text".to_string());
    }
    if data[0] != 2 {
        return Err("a Nostr encryption Erevos does not know".to_string());
    }
    let nonce: [u8; 32] = data[1..33].try_into().expect("32 bytes");
    let (ciphertext, tag) = data[33..].split_at(data.len() - 33 - 32);
    let keys = message_keys(conversation_key, &nonce)?;
    mac(keys.hmac_key.as_ref(), &nonce, ciphertext)
        .verify_slice(tag)
        .map_err(|_| "the Nostr text failed to authenticate".to_string())?;
    let mut padded = Zeroizing::new(ciphertext.to_vec());
    ChaCha20::new(keys.chacha_key.as_ref().into(), &keys.chacha_nonce.into()).apply_keystream(&mut padded);
    let len = u16::from_be_bytes([padded[0], padded[1]]) as usize;
    if len == 0 || padded.len() != 2 + padded_len(len) {
        return Err("the Nostr text is padded wrong".to_string());
    }
    String::from_utf8(padded[2..2 + len].to_vec()).map_err(|_| "the Nostr text is not UTF-8".to_string())
}

// NIP-01 events.

/// A Nostr event, as relays carry it (NIP-01).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Event {
    pub id: String,
    pub pubkey: String,
    pub created_at: u64,
    pub kind: u64,
    pub tags: Vec<Vec<String>>,
    pub content: String,
    pub sig: String,
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn unhex(text: &str, len: usize) -> Result<Vec<u8>> {
    let lower = text.bytes().all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c));
    if text.len() != len * 2 || !lower {
        return Err(format!("not {len} bytes of lowercase hex"));
    }
    (0..len).map(|i| u8::from_str_radix(&text[i * 2..i * 2 + 2], 16).map_err(|e| e.to_string())).collect()
}

/// An event's id: the SHA-256 of what it says, written as NIP-01 says.
fn event_id(pubkey: &str, created_at: u64, kind: u64, tags: &[Vec<String>], content: &str) -> [u8; 32] {
    let serialized = json!([0, pubkey, created_at, kind, tags, content]).to_string();
    Sha256::digest(serialized.as_bytes()).into()
}

impl Event {
    /// The event signed with `secret` (BIP-340).
    pub fn sign(secret: &[u8], created_at: u64, kind: u64, tags: Vec<Vec<String>>, content: String) -> Result<Event> {
        let key = signing_key(secret)?;
        let pubkey = hex(&key.verifying_key().to_bytes());
        let id = event_id(&pubkey, created_at, kind, &tags, &content);
        let mut aux = [0u8; 32];
        OsRng.fill_bytes(&mut aux);
        let sig = key.sign_raw(&id, &aux).map_err(|_| "the event could not be signed".to_string())?;
        Ok(Event { id: hex(&id), pubkey, created_at, kind, tags, content, sig: hex(&sig.to_bytes()) })
    }

    /// Whether its id is what it says and its signature is its key's.
    pub fn verify(&self) -> Result<()> {
        let id = event_id(&self.pubkey, self.created_at, self.kind, &self.tags, &self.content);
        if hex(&id) != self.id {
            return Err("the event's id is not what it says".to_string());
        }
        let key = verifying_key(&unhex(&self.pubkey, 32)?)?;
        let sig = Signature::try_from(unhex(&self.sig, 64)?.as_slice()).map_err(|_| "not a signature".to_string())?;
        key.verify_raw(&id, &sig).map_err(|_| "the event's signature is wrong".to_string())
    }

    pub fn to_json(&self) -> String {
        json!({
            "id": self.id,
            "pubkey": self.pubkey,
            "created_at": self.created_at,
            "kind": self.kind,
            "tags": self.tags,
            "content": self.content,
            "sig": self.sig,
        })
        .to_string()
    }

    pub fn from_json(text: &str) -> Result<Event> {
        let value: Value = serde_json::from_str(text).map_err(|_| "not a Nostr event".to_string())?;
        Event::from_value(&value)
    }

    pub fn from_value(value: &Value) -> Result<Event> {
        let bad = || "not a Nostr event".to_string();
        let text = |name: &str| value.get(name).and_then(Value::as_str).map(str::to_string).ok_or_else(bad);
        let number = |name: &str| value.get(name).and_then(Value::as_u64).ok_or_else(bad);
        let tags = value
            .get("tags")
            .and_then(Value::as_array)
            .ok_or_else(bad)?
            .iter()
            .map(|tag| {
                tag.as_array()
                    .ok_or_else(bad)?
                    .iter()
                    .map(|part| part.as_str().map(str::to_string).ok_or_else(bad))
                    .collect::<Result<Vec<String>>>()
            })
            .collect::<Result<Vec<Vec<String>>>>()?;
        Ok(Event {
            id: text("id")?,
            pubkey: text("pubkey")?,
            created_at: number("created_at")?,
            kind: number("kind")?,
            tags,
            content: text("content")?,
            sig: text("sig")?,
        })
    }
}

// Wraps.

/// A wrap for the contact whose key is `to`, carrying `bytes`, made at `now`
/// (seconds since 1970): the event's JSON, for a relay's `["EVENT", …]`.
pub fn wrap(to: &[u8], bytes: &[u8], now: u64) -> Result<String> {
    verifying_key(to)?;
    if bytes.is_empty() || bytes.len() > MAX_BYTES {
        return Err(format!("Nostr carries 1 to {MAX_BYTES} bytes in one event"));
    }
    let once = Zeroizing::new(new_secret());
    let content = encrypt(&conversation_key(once.as_ref(), to)?, &BASE64.encode(bytes))?;
    let created_at = now.saturating_sub(OsRng.next_u64() % (WRAP_BACKDATE + 1));
    let tags = vec![
        vec!["p".to_string(), hex(to)],
        // From the time it says, not the time it was made, which it would tell.
        vec!["expiration".to_string(), (created_at + WRAP_BACKDATE + WRAP_LIFETIME).to_string()],
    ];
    Ok(Event::sign(once.as_ref(), created_at, WRAP_KIND, tags, content)?.to_json())
}

/// What a wrap carried.
#[derive(Debug, PartialEq, Eq)]
pub struct Unwrapped {
    /// The event's id, the same on every relay that has it.
    pub id: String,
    pub created_at: u64,
    pub bytes: Vec<u8>,
}

/// Opens a wrap for the key whose secret is `secret`.
pub fn unwrap(secret: &[u8], event: &str) -> Result<Unwrapped> {
    let event = Event::from_json(event)?;
    if event.kind != WRAP_KIND {
        return Err("not a Nostr gift wrap".to_string());
    }
    event.verify()?;
    let me = hex(&public_key(secret)?);
    if !event.tags.iter().any(|tag| tag.len() >= 2 && tag[0] == "p" && tag[1] == me) {
        return Err("the wrap is not for this key".to_string());
    }
    let text = Zeroizing::new(decrypt(&conversation_key(secret, &unhex(&event.pubkey, 32)?)?, &event.content)?);
    let bytes = BASE64.decode(text.as_bytes()).map_err(|_| "the wrap carries no Erevos message".to_string())?;
    Ok(Unwrapped { id: event.id, created_at: event.created_at, bytes })
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: u64 = 1_792_800_000;

    #[test]
    fn a_wrap_opens_only_for_its_key() {
        let secret = new_secret();
        let to = public_key(&secret).unwrap();
        let json = wrap(&to, b"sealed bytes", NOW).unwrap();
        let opened = unwrap(&secret, &json).unwrap();
        assert_eq!(opened.bytes, b"sealed bytes");

        let event = Event::from_json(&json).unwrap();
        assert_eq!(event.kind, WRAP_KIND);
        assert_eq!(opened.id, event.id);
        assert!(event.created_at <= NOW && event.created_at >= NOW - WRAP_BACKDATE);
        assert_eq!(event.tags[0], vec!["p".to_string(), hex(&to)]);
        // Two days at least, told from its time, so it does not say when it was made.
        assert_eq!(event.tags[1], vec!["expiration".to_string(), (event.created_at + WRAP_BACKDATE + WRAP_LIFETIME).to_string()]);
        // Signed by a key of its own, never the contact's.
        assert_ne!(event.pubkey, hex(&to));
        assert_ne!(Event::from_json(&wrap(&to, b"sealed bytes", NOW).unwrap()).unwrap().pubkey, event.pubkey);

        let other = new_secret();
        assert!(unwrap(&other, &json).unwrap_err().contains("not for this key"));
    }

    #[test]
    fn a_changed_wrap_does_not_open() {
        let secret = new_secret();
        let to = public_key(&secret).unwrap();
        let event = Event::from_json(&wrap(&to, b"sealed bytes", NOW).unwrap()).unwrap();

        let mut later = event.clone();
        later.created_at += 1;
        assert!(unwrap(&secret, &later.to_json()).unwrap_err().contains("id"));

        // Another key's signature over the same id.
        let mut forged = event.clone();
        forged.pubkey = hex(&public_key(&new_secret()).unwrap());
        forged.id = hex(&event_id(&forged.pubkey, forged.created_at, forged.kind, &forged.tags, &forged.content));
        assert!(unwrap(&secret, &forged.to_json()).unwrap_err().contains("signature"));

        // Re-signed by whoever, with the content changed: it no longer authenticates.
        let mut content = event.content.clone().into_bytes();
        content[60] = if content[60] == b'A' { b'B' } else { b'A' };
        let resigned =
            Event::sign(&new_secret(), event.created_at, WRAP_KIND, event.tags.clone(), String::from_utf8(content).unwrap())
                .unwrap();
        assert!(unwrap(&secret, &resigned.to_json()).is_err());

        let mut kind = event.clone();
        kind.kind = 4;
        assert!(unwrap(&secret, &kind.to_json()).unwrap_err().contains("gift wrap"));
        assert!(unwrap(&secret, "{}").is_err());
    }

    #[test]
    fn sizes() {
        let to = public_key(&new_secret()).unwrap();
        assert!(wrap(&to, &vec![1u8; MAX_BYTES], NOW).is_ok());
        assert!(wrap(&to, &vec![1u8; MAX_BYTES + 1], NOW).is_err());
        assert!(wrap(&to, b"", NOW).is_err());
        assert!(wrap(&[0u8; 32], b"x", NOW).is_err());
        assert!(public_key(&[0u8; 32]).is_err());
        assert!(public_key(&[1u8; 31]).is_err());
    }

    #[test]
    fn events_sign_and_verify() {
        let secret = new_secret();
        let event = Event::sign(&secret, NOW, 1, vec![vec!["t".to_string(), "x\"y\n".to_string()]], "a\\b\"c\n".to_string()).unwrap();
        event.verify().unwrap();
        assert_eq!(event.pubkey, hex(&public_key(&secret).unwrap()));
        let again = Event::from_json(&event.to_json()).unwrap();
        assert_eq!(again, event);
        again.verify().unwrap();
        // Uppercase hex is not how Nostr writes it.
        let mut upper = event.clone();
        upper.sig = upper.sig.to_uppercase();
        assert!(upper.verify().is_err());
    }
}
