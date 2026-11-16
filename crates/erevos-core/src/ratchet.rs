// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Double ratchet for 1:1 sessions, following the Signal specification
//! (https://signal.org/docs/specifications/doubleratchet/), without header
//! encryption for now.
//!
//! The shared secret that seeds a session comes from the handshake (PQXDH,
//! see pqxdh.rs). A failed decrypt leaves the session unchanged: every
//! decrypt works on a copy and only commits it once the message has
//! authenticated.

use std::collections::{HashMap, VecDeque};

use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use rand_core::OsRng;
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::Error;

/// Most message keys one chain may skip ahead, so a peer cannot make us
/// derive an unbounded number of keys.
pub const MAX_SKIP: u32 = 1000;

/// Most skipped message keys a session keeps. Past it the oldest go, so a
/// stored session stays small however many messages are lost on the way.
pub const MAX_STORED_SKIPPED: usize = 2000;

const RK_INFO: &[u8] = b"erevos ratchet root v1";
const MK_INFO: &[u8] = b"erevos ratchet message v1";

/// Clear header sent with every message.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Header {
    /// Sender's current ratchet public key.
    pub dh: [u8; 32],
    /// Length of the sender's previous sending chain.
    pub pn: u32,
    /// Index of this message in the current sending chain.
    pub n: u32,
}

impl Header {
    pub const LEN: usize = 40;

    pub fn to_bytes(&self) -> [u8; Self::LEN] {
        let mut out = [0u8; Self::LEN];
        out[..32].copy_from_slice(&self.dh);
        out[32..36].copy_from_slice(&self.pn.to_be_bytes());
        out[36..].copy_from_slice(&self.n.to_be_bytes());
        out
    }

    pub fn from_bytes(b: &[u8]) -> Result<Self, Error> {
        if b.len() != Self::LEN {
            return Err(Error::Malformed);
        }
        let mut dh = [0u8; 32];
        dh.copy_from_slice(&b[..32]);
        Ok(Header {
            dh,
            pn: u32::from_be_bytes(b[32..36].try_into().unwrap()),
            n: u32::from_be_bytes(b[36..].try_into().unwrap()),
        })
    }
}

#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub(crate) struct ChainKey(pub(crate) [u8; 32]);

#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub(crate) struct MessageKey(pub(crate) [u8; 32]);

#[derive(Clone)]
pub struct Session {
    pub(crate) dhs: StaticSecret,
    pub(crate) dhr: Option<PublicKey>,
    pub(crate) rk: ChainKey,
    pub(crate) cks: Option<ChainKey>,
    pub(crate) ckr: Option<ChainKey>,
    pub(crate) ns: u32,
    pub(crate) nr: u32,
    pub(crate) pn: u32,
    pub(crate) skipped: HashMap<([u8; 32], u32), MessageKey>,
    /// The keys of `skipped`, oldest first.
    pub(crate) skipped_order: VecDeque<([u8; 32], u32)>,
}

impl Session {
    /// The side that sends first. `their_ratchet` is the peer's signed
    /// ratchet key from the handshake.
    pub fn initiator(shared_secret: [u8; 32], their_ratchet: PublicKey) -> Self {
        let dhs = StaticSecret::random_from_rng(OsRng);
        let (rk, cks) = kdf_rk(&ChainKey(shared_secret), &dhs.diffie_hellman(&their_ratchet).to_bytes());
        Session {
            dhs,
            dhr: Some(their_ratchet),
            rk,
            cks: Some(cks),
            ckr: None,
            ns: 0,
            nr: 0,
            pn: 0,
            skipped: HashMap::new(),
            skipped_order: VecDeque::new(),
        }
    }

    /// The side that receives first, holding the ratchet key the initiator
    /// used.
    pub fn responder(shared_secret: [u8; 32], our_ratchet: StaticSecret) -> Self {
        Session {
            dhs: our_ratchet,
            dhr: None,
            rk: ChainKey(shared_secret),
            cks: None,
            ckr: None,
            ns: 0,
            nr: 0,
            pn: 0,
            skipped: HashMap::new(),
            skipped_order: VecDeque::new(),
        }
    }

    /// Moves the sending chain `n` keys on without using them. A session
    /// put back from a backup would otherwise seal with the keys it already
    /// sealed with after that backup, and since the key and nonce both come
    /// from the message key, two messages under one would give away both.
    /// The other side opens what comes next as after lost messages, so `n`
    /// stays below `MAX_SKIP`. A session that cannot send yet (no message
    /// from the other side) has nothing to move.
    pub fn skip_sending(&mut self, n: u32) -> Result<(), Error> {
        let Some(mut ck) = self.cks.clone() else {
            return Ok(());
        };
        let ns = self.ns.checked_add(n).ok_or(Error::ChainExhausted)?;
        for _ in 0..n {
            ck = kdf_ck(&ck).0;
        }
        self.cks = Some(ck);
        self.ns = ns;
        Ok(())
    }

    /// Encrypts `plaintext`, binding `ad` (both identities, from the
    /// handshake) and the header into the tag.
    pub fn encrypt(&mut self, plaintext: &[u8], ad: &[u8]) -> Result<(Header, Vec<u8>), Error> {
        self.encrypt_mixed(plaintext, ad, &|mk| *mk)
    }

    /// Encrypts as `encrypt` does, with the message key `mix` makes of the
    /// double ratchet's (the post-quantum ratchet's, crate::spqr).
    pub fn encrypt_mixed(&mut self, plaintext: &[u8], ad: &[u8], mix: &dyn Fn(&[u8; 32]) -> [u8; 32]) -> Result<(Header, Vec<u8>), Error> {
        let cks = self.cks.as_ref().ok_or(Error::NotReady)?;
        let (next, mk) = kdf_ck(cks);
        let mk = MessageKey(mix(&mk.0));
        self.cks = Some(next);
        let header = Header {
            dh: PublicKey::from(&self.dhs).to_bytes(),
            pn: self.pn,
            n: self.ns,
        };
        self.ns = self.ns.checked_add(1).ok_or(Error::ChainExhausted)?;
        let ct = seal(&mk, plaintext, &assoc(ad, &header))?;
        Ok((header, ct))
    }

    pub fn decrypt(&mut self, header: &Header, ciphertext: &[u8], ad: &[u8]) -> Result<Vec<u8>, Error> {
        self.decrypt_mixed(header, ciphertext, ad, &|mk| *mk)
    }

    /// Decrypts as `decrypt` does, with the message key `mix` makes of the
    /// double ratchet's, as the sender's `encrypt_mixed` did.
    pub fn decrypt_mixed(&mut self, header: &Header, ciphertext: &[u8], ad: &[u8], mix: &dyn Fn(&[u8; 32]) -> [u8; 32]) -> Result<Vec<u8>, Error> {
        let mut next = self.clone();
        let pt = next.decrypt_inner(header, ciphertext, ad, mix)?;
        *self = next;
        Ok(pt)
    }

    fn decrypt_inner(&mut self, header: &Header, ciphertext: &[u8], ad: &[u8], mix: &dyn Fn(&[u8; 32]) -> [u8; 32]) -> Result<Vec<u8>, Error> {
        let ad = assoc(ad, header);
        let open = |mk: &MessageKey| open(&MessageKey(mix(&mk.0)), ciphertext, &ad);
        if let Some(mk) = self.skipped.remove(&(header.dh, header.n)) {
            self.skipped_order.retain(|k| *k != (header.dh, header.n));
            return open(&mk);
        }
        if self.dhr.map(|k| k.to_bytes()) != Some(header.dh) {
            self.skip_until(header.pn)?;
            self.dh_ratchet(PublicKey::from(header.dh));
        }
        self.skip_until(header.n)?;
        let (next, mk) = kdf_ck(self.ckr.as_ref().ok_or(Error::NotReady)?);
        self.ckr = Some(next);
        self.nr = self.nr.checked_add(1).ok_or(Error::ChainExhausted)?;
        open(&mk)
    }

    fn skip_until(&mut self, until: u32) -> Result<(), Error> {
        let Some(mut ck) = self.ckr.clone() else {
            return Ok(());
        };
        if until.saturating_sub(self.nr) > MAX_SKIP {
            return Err(Error::TooManySkipped);
        }
        // A receiving chain implies a peer key; damaged state that says otherwise is refused.
        let dhr = self.dhr.ok_or(Error::Malformed)?.to_bytes();
        while self.nr < until {
            let (next, mk) = kdf_ck(&ck);
            self.keep_skipped((dhr, self.nr), mk);
            ck = next;
            self.nr += 1;
        }
        self.ckr = Some(ck);
        Ok(())
    }

    fn keep_skipped(&mut self, key: ([u8; 32], u32), mk: MessageKey) {
        self.skipped.insert(key, mk);
        self.skipped_order.push_back(key);
        while self.skipped_order.len() > MAX_STORED_SKIPPED {
            if let Some(oldest) = self.skipped_order.pop_front() {
                self.skipped.remove(&oldest);
            }
        }
    }

    fn dh_ratchet(&mut self, their: PublicKey) {
        self.pn = self.ns;
        self.ns = 0;
        self.nr = 0;
        self.dhr = Some(their);
        let (rk, ckr) = kdf_rk(&self.rk, &self.dhs.diffie_hellman(&their).to_bytes());
        self.rk = rk;
        self.ckr = Some(ckr);
        self.dhs = StaticSecret::random_from_rng(OsRng);
        let (rk, cks) = kdf_rk(&self.rk, &self.dhs.diffie_hellman(&their).to_bytes());
        self.rk = rk;
        self.cks = Some(cks);
    }
}

fn kdf_rk(rk: &ChainKey, dh_out: &[u8; 32]) -> (ChainKey, ChainKey) {
    let mut okm = [0u8; 64];
    Hkdf::<Sha256>::new(Some(&rk.0), dh_out)
        .expand(RK_INFO, &mut okm)
        .expect("64 bytes is a valid hkdf length");
    let mut a = [0u8; 32];
    let mut b = [0u8; 32];
    a.copy_from_slice(&okm[..32]);
    b.copy_from_slice(&okm[32..]);
    okm.zeroize();
    (ChainKey(a), ChainKey(b))
}

fn kdf_ck(ck: &ChainKey) -> (ChainKey, MessageKey) {
    let step = |byte: u8| -> [u8; 32] {
        let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(&ck.0).expect("hmac takes any key length");
        mac.update(&[byte]);
        mac.finalize().into_bytes().into()
    };
    (ChainKey(step(0x02)), MessageKey(step(0x01)))
}

fn assoc(ad: &[u8], header: &Header) -> Vec<u8> {
    let mut out = Vec::with_capacity(ad.len() + Header::LEN);
    out.extend_from_slice(ad);
    out.extend_from_slice(&header.to_bytes());
    out
}

fn message_cipher(mk: &MessageKey) -> (ChaCha20Poly1305, [u8; 12]) {
    let mut okm = [0u8; 44];
    Hkdf::<Sha256>::new(None, &mk.0)
        .expand(MK_INFO, &mut okm)
        .expect("44 bytes is a valid hkdf length");
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&okm[..32]));
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&okm[32..]);
    okm.zeroize();
    (cipher, nonce)
}

fn seal(mk: &MessageKey, pt: &[u8], ad: &[u8]) -> Result<Vec<u8>, Error> {
    let (cipher, nonce) = message_cipher(mk);
    cipher
        .encrypt(Nonce::from_slice(&nonce), Payload { msg: pt, aad: ad })
        .map_err(|_| Error::Crypto)
}

fn open(mk: &MessageKey, ct: &[u8], ad: &[u8]) -> Result<Vec<u8>, Error> {
    let (cipher, nonce) = message_cipher(mk);
    cipher
        .decrypt(Nonce::from_slice(&nonce), Payload { msg: ct, aad: ad })
        .map_err(|_| Error::Crypto)
}

#[cfg(test)]
mod tests {
    use super::*;

    const AD: &[u8] = b"alice-id|bob-id";

    fn pair() -> (Session, Session) {
        let sk = [7u8; 32];
        let bob_ratchet = StaticSecret::random_from_rng(OsRng);
        let alice = Session::initiator(sk, PublicKey::from(&bob_ratchet));
        let bob = Session::responder(sk, bob_ratchet);
        (alice, bob)
    }

    #[test]
    fn back_and_forth() {
        let (mut a, mut b) = pair();
        for i in 0..5 {
            let (h, c) = a.encrypt(format!("a{i}").as_bytes(), AD).unwrap();
            assert_eq!(b.decrypt(&h, &c, AD).unwrap(), format!("a{i}").as_bytes());
            let (h, c) = b.encrypt(format!("b{i}").as_bytes(), AD).unwrap();
            assert_eq!(a.decrypt(&h, &c, AD).unwrap(), format!("b{i}").as_bytes());
        }
    }

    #[test]
    fn responder_cannot_send_first() {
        let (_, mut b) = pair();
        assert!(matches!(b.encrypt(b"hi", AD), Err(Error::NotReady)));
    }

    #[test]
    fn out_of_order_across_ratchet_steps() {
        let (mut a, mut b) = pair();
        let m0 = a.encrypt(b"0", AD).unwrap();
        let m1 = a.encrypt(b"1", AD).unwrap();
        let m2 = a.encrypt(b"2", AD).unwrap();
        assert_eq!(b.decrypt(&m2.0, &m2.1, AD).unwrap(), b"2");
        let r = b.encrypt(b"r", AD).unwrap();
        assert_eq!(a.decrypt(&r.0, &r.1, AD).unwrap(), b"r");
        let m3 = a.encrypt(b"3", AD).unwrap();
        assert_eq!(b.decrypt(&m3.0, &m3.1, AD).unwrap(), b"3");
        assert_eq!(b.decrypt(&m0.0, &m0.1, AD).unwrap(), b"0");
        assert_eq!(b.decrypt(&m1.0, &m1.1, AD).unwrap(), b"1");
    }

    #[test]
    fn replay_is_rejected() {
        let (mut a, mut b) = pair();
        let (h, c) = a.encrypt(b"once", AD).unwrap();
        b.decrypt(&h, &c, AD).unwrap();
        assert!(b.decrypt(&h, &c, AD).is_err());
    }

    #[test]
    fn tampering_leaves_session_usable() {
        let (mut a, mut b) = pair();
        let (h, mut c) = a.encrypt(b"hello", AD).unwrap();
        c[0] ^= 1;
        assert!(matches!(b.decrypt(&h, &c, AD), Err(Error::Crypto)));
        c[0] ^= 1;
        assert!(b.decrypt(&h, &c, b"other-ad").is_err());
        let mut forged = h;
        forged.n = 5;
        assert!(b.decrypt(&forged, &c, AD).is_err());
        assert_eq!(b.decrypt(&h, &c, AD).unwrap(), b"hello");
    }

    #[test]
    fn skip_limit() {
        let (mut a, mut b) = pair();
        let first = a.encrypt(b"x", AD).unwrap();
        b.decrypt(&first.0, &first.1, AD).unwrap();
        let mut h = a.encrypt(b"y", AD).unwrap();
        h.0.n = MAX_SKIP + 2;
        assert!(matches!(b.decrypt(&h.0, &h.1, AD), Err(Error::TooManySkipped)));
    }

    #[test]
    fn stored_skipped_keys_stay_bounded() {
        let (mut a, mut b) = pair();
        let mut oldest = None;
        // Three sending chains from Alice, each with 999 messages lost and one delivered.
        for round in 0..3 {
            for i in 0..MAX_SKIP - 1 {
                let lost = a.encrypt(b"lost", AD).unwrap();
                if round == 0 && i == 0 {
                    oldest = Some(lost);
                }
            }
            let (h, c) = a.encrypt(b"arrives", AD).unwrap();
            assert_eq!(b.decrypt(&h, &c, AD).unwrap(), b"arrives");
            let (h, c) = b.encrypt(b"reply", AD).unwrap();
            a.decrypt(&h, &c, AD).unwrap();
        }
        assert_eq!(b.skipped.len(), MAX_STORED_SKIPPED);
        assert_eq!(b.skipped_order.len(), MAX_STORED_SKIPPED);
        // The oldest skipped key was dropped to make room.
        let (h, c) = oldest.unwrap();
        assert!(b.decrypt(&h, &c, AD).is_err());
    }

    #[test]
    fn header_roundtrip() {
        let h = Header { dh: [9; 32], pn: 3, n: 70000 };
        assert_eq!(Header::from_bytes(&h.to_bytes()).unwrap(), h);
        assert!(Header::from_bytes(&[0; 39]).is_err());
    }
}
