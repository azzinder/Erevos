// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! A channel to a relay inside each connection, encrypted to the relay's own
//! key, so a phone knows its relay by that key rather than by the TLS
//! certificate for its name: certificate pinning that the certificate's
//! renewals do not break.
//!
//! The phone knows the relay's public key (`relay_seal::RelayKey::public`):
//! from a contact link, an invite, the app itself for the relay it starts on,
//! or what the relay said the first time. Its hello is `HELLO` and a fresh
//! X25519 public key. The relay answers with a fresh public key of its own and
//! a proof (32 bytes), made with a key derived from both X25519 results, the
//! one with the relay's long-term key and the one between the two fresh keys.
//! Only the holder of the relay's secret key can make it, so the phone stops
//! there when it does not match. From then on each message each way is
//! encrypted with ChaCha20-Poly1305, under a key of its own for each way, its
//! nonce the count of the messages before it that way. Someone in between with
//! a certificate for the relay's name sees only how long the messages are and
//! when they go, as on a network it does not control; the relay's long-term
//! key alone opens nothing that went before. As Noise's NK pattern.
//!
//! Not audited.

use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::ChaCha20Poly1305;
use hkdf::Hkdf;
use rand_core::OsRng;
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};
use zeroize::Zeroize;

use crate::relay_seal::RelayKey;
use crate::Error;

/// The first byte of a hello: no request's opcode, so a relay from before the
/// channel closes the connection on it.
pub const HELLO: u8 = 0xEC;
/// Bytes of a hello: `HELLO` and the phone's fresh public key.
pub const HELLO_LEN: usize = 1 + 32;
/// Bytes of the relay's answer: its fresh public key and the proof.
pub const ANSWER_LEN: usize = 32 + 32;
/// Bytes each message grows by.
pub const TAG_LEN: usize = 16;

/// One way's key and its count of messages.
struct Way {
    cipher: ChaCha20Poly1305,
    count: u64,
}

impl Way {
    fn new(key: &mut [u8; 32]) -> Way {
        let cipher = ChaCha20Poly1305::new(&(*key).into());
        key.zeroize();
        Way { cipher, count: 0 }
    }

    fn nonce(&mut self) -> Result<[u8; 12], Error> {
        let mut nonce = [0u8; 12];
        nonce[..8].copy_from_slice(&self.count.to_le_bytes());
        self.count = self.count.checked_add(1).ok_or(Error::ChainExhausted)?;
        Ok(nonce)
    }
}

/// Both ways of a channel, on the phone or on the relay.
pub struct Channel {
    send: Way,
    receive: Way,
}

impl Channel {
    /// Encrypts the next message this side sends.
    pub fn seal(&mut self, plain: &[u8]) -> Result<Vec<u8>, Error> {
        let nonce = self.send.nonce()?;
        self.send.cipher.encrypt(&nonce.into(), plain).map_err(|_| Error::Crypto)
    }

    /// Opens the next message the other side sent. One out of order, changed or
    /// from someone else fails, and the connection should end.
    pub fn open(&mut self, sealed: &[u8]) -> Result<Vec<u8>, Error> {
        let nonce = self.receive.nonce()?;
        self.receive.cipher.decrypt(&nonce.into(), sealed).map_err(|_| Error::Crypto)
    }
}

/// The phone's side while it waits for the relay's answer.
pub struct Opening {
    secret: StaticSecret,
    public: [u8; 32],
    relay: [u8; 32],
}

impl Opening {
    /// Starts a channel to the relay whose public key is `relay`, with a fresh
    /// key. Returns it and the hello to send.
    pub fn new(relay: &[u8; 32]) -> (Opening, [u8; HELLO_LEN]) {
        Opening::with_secret(relay, StaticSecret::random_from_rng(OsRng).to_bytes())
    }

    /// As `new`, with the fresh key's secret given: for an app that keeps it
    /// between the hello and the answer itself.
    pub fn with_secret(relay: &[u8; 32], secret: [u8; 32]) -> (Opening, [u8; HELLO_LEN]) {
        let secret = StaticSecret::from(secret);
        let public = PublicKey::from(&secret).to_bytes();
        let mut hello = [0u8; HELLO_LEN];
        hello[0] = HELLO;
        hello[1..].copy_from_slice(&public);
        (Opening { secret, public, relay: *relay }, hello)
    }

    /// The keys of both ways, phone to relay first, once the relay's answer
    /// proves it holds the relay's secret key: `Error::NotTheRelay` when it
    /// does not.
    pub fn keys(&self, answer: &[u8]) -> Result<([u8; 32], [u8; 32]), Error> {
        let answer: &[u8; ANSWER_LEN] = answer.try_into().map_err(|_| Error::Malformed)?;
        let fresh: [u8; 32] = answer[..32].try_into().expect("32 bytes");
        let with_relay = self.secret.diffie_hellman(&PublicKey::from(self.relay));
        let with_fresh = self.secret.diffie_hellman(&PublicKey::from(fresh));
        if !with_relay.was_contributory() || !with_fresh.was_contributory() {
            return Err(Error::Malformed);
        }
        let mut derived = derive(with_relay.as_bytes(), with_fresh.as_bytes(), &self.public, &fresh, &self.relay)?;
        // Compared to the end, so timing does not show how much of it matched.
        let proven = derived.proof.iter().zip(&answer[32..]).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0;
        derived.proof.zeroize();
        if !proven {
            derived.to_relay.zeroize();
            derived.to_phone.zeroize();
            return Err(Error::NotTheRelay);
        }
        Ok((derived.to_relay, derived.to_phone))
    }

    /// The channel, once the relay's answer proves it holds the relay's
    /// secret key.
    pub fn finish(self, answer: &[u8]) -> Result<Channel, Error> {
        let (mut to_relay, mut to_phone) = self.keys(answer)?;
        Ok(Channel { send: Way::new(&mut to_relay), receive: Way::new(&mut to_phone) })
    }
}

/// The relay's side: answers a phone's hello with `key`, the relay's own.
/// Returns the answer to send and the channel.
pub fn accept(key: &RelayKey, hello: &[u8]) -> Result<([u8; ANSWER_LEN], Channel), Error> {
    if hello.len() != HELLO_LEN || hello[0] != HELLO {
        return Err(Error::Malformed);
    }
    let phone: [u8; 32] = hello[1..].try_into().expect("32 bytes");
    let ours = StaticSecret::from(key.to_secret_bytes());
    let fresh = StaticSecret::random_from_rng(OsRng);
    let fresh_public = PublicKey::from(&fresh).to_bytes();
    let with_relay = ours.diffie_hellman(&PublicKey::from(phone));
    let with_fresh = fresh.diffie_hellman(&PublicKey::from(phone));
    if !with_relay.was_contributory() || !with_fresh.was_contributory() {
        return Err(Error::Malformed);
    }
    let mut derived = derive(with_relay.as_bytes(), with_fresh.as_bytes(), &phone, &fresh_public, &key.public())?;
    let mut answer = [0u8; ANSWER_LEN];
    answer[..32].copy_from_slice(&fresh_public);
    answer[32..].copy_from_slice(&derived.proof);
    derived.proof.zeroize();
    let channel = Channel { send: Way::new(&mut derived.to_phone), receive: Way::new(&mut derived.to_relay) };
    Ok((answer, channel))
}

struct Derived {
    proof: [u8; 32],
    to_relay: [u8; 32],
    to_phone: [u8; 32],
}

fn derive(
    with_relay: &[u8; 32],
    with_fresh: &[u8; 32],
    phone: &[u8; 32],
    fresh: &[u8; 32],
    relay: &[u8; 32],
) -> Result<Derived, Error> {
    let mut input = [0u8; 64];
    input[..32].copy_from_slice(with_relay);
    input[32..].copy_from_slice(with_fresh);
    let hkdf = Hkdf::<Sha256>::new(Some(b"erevos relay channel v1"), &input);
    input.zeroize();
    let mut out = Derived { proof: [0; 32], to_relay: [0; 32], to_phone: [0; 32] };
    for (label, key) in [
        (&b"proof"[..], &mut out.proof),
        (&b"phone to relay"[..], &mut out.to_relay),
        (&b"relay to phone"[..], &mut out.to_phone),
    ] {
        let mut info = Vec::with_capacity(96 + label.len());
        info.extend_from_slice(phone);
        info.extend_from_slice(fresh);
        info.extend_from_slice(relay);
        info.extend_from_slice(label);
        hkdf.expand(&info, key).map_err(|_| Error::Crypto)?;
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opened(key: &RelayKey) -> (Channel, Channel) {
        let (opening, hello) = Opening::new(&key.public());
        let (answer, relay) = accept(key, &hello).unwrap();
        (opening.finish(&answer).unwrap(), relay)
    }

    #[test]
    fn each_side_opens_what_the_other_sealed_in_turn() {
        let key = RelayKey::generate();
        let (mut phone, mut relay) = opened(&key);
        for round in 0..3u8 {
            let asked = phone.seal(&[round; 5]).unwrap();
            assert_eq!(asked.len(), 5 + TAG_LEN);
            assert_eq!(relay.open(&asked).unwrap(), [round; 5]);
            let answered = relay.seal(b"ok").unwrap();
            assert_eq!(phone.open(&answered).unwrap(), b"ok");
        }
    }

    #[test]
    fn a_relay_without_the_key_cannot_prove_it() {
        let (opening, hello) = Opening::new(&RelayKey::generate().public());
        let (answer, _) = accept(&RelayKey::generate(), &hello).unwrap();
        assert!(matches!(opening.finish(&answer), Err(Error::NotTheRelay)));
    }

    #[test]
    fn a_changed_answer_or_message_is_refused() {
        let key = RelayKey::generate();
        let (opening, hello) = Opening::new(&key.public());
        let (answer, mut relay) = accept(&key, &hello).unwrap();
        for at in [0, 40, ANSWER_LEN - 1] {
            let mut bad = answer;
            bad[at] ^= 1;
            assert!(opening.keys(&bad).is_err());
        }
        assert!(opening.keys(&answer[..ANSWER_LEN - 1]).is_err());
        let mut phone = opening.finish(&answer).unwrap();
        let mut asked = phone.seal(b"hi").unwrap();
        asked[0] ^= 1;
        assert!(relay.open(&asked).is_err());
    }

    #[test]
    fn a_message_out_of_turn_is_refused() {
        let key = RelayKey::generate();
        let (mut phone, mut relay) = opened(&key);
        let first = phone.seal(b"one").unwrap();
        let second = phone.seal(b"two").unwrap();
        assert!(relay.open(&second).is_err());
        // Its own message comes back as nothing the other side sent.
        let (mut phone, _) = opened(&key);
        let mine = phone.seal(b"one").unwrap();
        assert!(phone.open(&mine).is_err());
        let _ = first;
    }

    #[test]
    fn a_hello_that_is_none_and_a_low_order_key_are_refused() {
        let key = RelayKey::generate();
        let (_, hello) = Opening::new(&key.public());
        let mut other = hello;
        other[0] = 1;
        assert!(accept(&key, &other).is_err());
        assert!(accept(&key, &hello[..HELLO_LEN - 1]).is_err());
        let mut zero = [0u8; HELLO_LEN];
        zero[0] = HELLO;
        assert!(accept(&key, &zero).is_err());
        let (opening, _) = Opening::new(&[0; 32]);
        assert!(opening.keys(&[0; ANSWER_LEN]).is_err());
    }

    #[test]
    fn a_given_secret_makes_the_same_hello() {
        let key = RelayKey::generate();
        let (_, one) = Opening::with_secret(&key.public(), [9; 32]);
        let (opening, two) = Opening::with_secret(&key.public(), [9; 32]);
        assert_eq!(one, two);
        let (answer, _) = accept(&key, &two).unwrap();
        let (to_relay, to_phone) = opening.keys(&answer).unwrap();
        assert_ne!(to_relay, to_phone);
    }
}
