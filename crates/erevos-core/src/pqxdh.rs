// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Session setup: PQXDH, the handshake Signal specifies, with X25519 and
//! ML-KEM-768 (FIPS 203) in place of the classical-only X3DH. The result
//! seeds the double ratchet, so a session is post-quantum from its first
//! message as long as the ML-KEM half holds.
//!
//! Each user publishes prekey bundles signed by their Ed25519 identity key:
//! the X25519 identity key, a signed X25519 prekey, an ML-KEM-768
//! encapsulation key and, optionally, a one-time X25519 prekey. The signature
//! covers all of them, so a relay cannot swap any key without breaking it.
//! A one-time prekey is used once and then deleted, so an initial message
//! cannot be replayed to the same session.
//!
//! Not audited. Spec: https://signal.org/docs/specifications/pqxdh/

use std::collections::HashMap;

use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey};
use hkdf::Hkdf;
use ml_kem::{
    Ciphertext, Decapsulate, DecapsulationKey, Encapsulate, EncapsulationKey, Generate, KeyExport, MlKem768,
    TryKeyInit,
};
use rand_core::OsRng;
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};
use zeroize::Zeroize;

use crate::ratchet::Session;
use crate::Error;

/// Prefix that keeps the KDF input distinct from any X25519 output (0xFF
/// repeated, as in the spec).
const F: [u8; 32] = [0xFF; 32];
const INFO: &[u8] = b"Erevos PQXDH v1";

/// ML-KEM-768 encapsulation key and ciphertext sizes, in bytes.
pub const PQ_PUBLIC_LEN: usize = 1184;
pub const PQ_CIPHERTEXT_LEN: usize = 1088;

/// Long-term keys. Keep the identity secrets on the device only.
pub struct Identity {
    pub signing: SigningKey,
    pub dh: StaticSecret,
}

/// Private half of the prekeys a user advertises.
pub struct Prekeys {
    pub signed: StaticSecret,
    pub pq: DecapsulationKey<MlKem768>,
    pub(crate) one_time: HashMap<u32, StaticSecret>,
}

/// A one-time X25519 prekey, public part.
#[derive(Clone)]
pub struct OneTimePrekey {
    pub id: u32,
    pub public: PublicKey,
}

/// Public part of a user's keys, fetched by whoever wants to start a session.
/// Each bundle carries at most one one-time prekey.
#[derive(Clone)]
pub struct PrekeyBundle {
    pub identity_verify: [u8; 32],
    pub identity_dh: PublicKey,
    pub signed_prekey: PublicKey,
    pub pq_prekey: Vec<u8>,
    pub one_time: Option<OneTimePrekey>,
    pub signature: [u8; 64],
}

/// What the initiator sends with its first message so the responder can
/// finish the handshake.
#[derive(Clone)]
pub struct InitialMessage {
    pub identity_dh: PublicKey,
    pub ephemeral: PublicKey,
    pub pq_ciphertext: Vec<u8>,
    pub one_time_id: Option<u32>,
}

impl Identity {
    pub fn generate() -> Self {
        Identity {
            signing: SigningKey::generate(&mut OsRng),
            dh: StaticSecret::random_from_rng(OsRng),
        }
    }
}

impl Prekeys {
    /// Creates the signed and ML-KEM prekeys plus `one_time_count` one-time
    /// prekeys, and returns one signed bundle per one-time prekey. With zero,
    /// a single bundle without one.
    pub fn generate(identity: &Identity, one_time_count: u32) -> (Self, Vec<PrekeyBundle>) {
        let signed = StaticSecret::random_from_rng(OsRng);
        let pq = DecapsulationKey::<MlKem768>::generate();

        let mut one_time = HashMap::new();
        let mut slots: Vec<Option<OneTimePrekey>> = Vec::new();
        for id in 0..one_time_count {
            let secret = StaticSecret::random_from_rng(OsRng);
            slots.push(Some(OneTimePrekey {
                id,
                public: PublicKey::from(&secret),
            }));
            one_time.insert(id, secret);
        }
        if slots.is_empty() {
            slots.push(None);
        }

        let keys = Prekeys { signed, pq, one_time };
        let bundles = slots.into_iter().map(|slot| keys.signed_bundle(identity, slot)).collect();
        (keys, bundles)
    }

    /// The bundle without a one-time prekey, signed again. Ed25519 signatures are
    /// deterministic, so it is the same bytes every time: what a contact link carries.
    pub fn bundle(&self, identity: &Identity) -> PrekeyBundle {
        self.signed_bundle(identity, None)
    }

    fn signed_bundle(&self, identity: &Identity, one_time: Option<OneTimePrekey>) -> PrekeyBundle {
        let identity_dh = PublicKey::from(&identity.dh);
        let signed_pub = PublicKey::from(&self.signed);
        let pq_pub = self.pq.encapsulation_key().to_bytes().as_slice().to_vec();
        let signature = identity
            .signing
            .sign(&transcript(&identity_dh, &signed_pub, &pq_pub, one_time.as_ref()))
            .to_bytes();
        PrekeyBundle {
            identity_verify: identity.signing.verifying_key().to_bytes(),
            identity_dh,
            signed_prekey: signed_pub,
            pq_prekey: pq_pub,
            one_time,
            signature,
        }
    }

    /// Number of one-time prekeys still unused.
    pub fn one_time_left(&self) -> usize {
        self.one_time.len()
    }
}

/// Starts a session as the sender. Returns the session and the message to
/// send with the first ciphertext.
pub fn initiate(me: &Identity, bundle: &PrekeyBundle) -> Result<(Session, InitialMessage), Error> {
    bundle.verify()?;
    let pq_ek = EncapsulationKey::<MlKem768>::new_from_slice(&bundle.pq_prekey).map_err(|_| Error::Malformed)?;

    let ephemeral = StaticSecret::random_from_rng(OsRng);
    let dh1 = me.dh.diffie_hellman(&bundle.signed_prekey);
    let dh2 = ephemeral.diffie_hellman(&bundle.identity_dh);
    let dh3 = ephemeral.diffie_hellman(&bundle.signed_prekey);
    let dh4 = bundle.one_time.as_ref().map(|o| ephemeral.diffie_hellman(&o.public));
    let (ct, pq_ss) = pq_ek.encapsulate();

    let mut parts: Vec<&[u8]> = vec![dh1.as_bytes(), dh2.as_bytes(), dh3.as_bytes()];
    if let Some(d) = &dh4 {
        parts.push(d.as_bytes());
    }
    parts.push(pq_ss.as_slice());
    let secret = kdf(&parts);

    let session = Session::initiator(secret, bundle.signed_prekey);
    let message = InitialMessage {
        identity_dh: PublicKey::from(&me.dh),
        ephemeral: PublicKey::from(&ephemeral),
        pq_ciphertext: ct.as_slice().to_vec(),
        one_time_id: bundle.one_time.as_ref().map(|o| o.id),
    };
    Ok((session, message))
}

/// Finishes a session as the receiver. Consumes the one-time prekey the
/// message names, so the same message cannot start a second session.
pub fn respond(me: &Identity, keys: &mut Prekeys, message: &InitialMessage) -> Result<Session, Error> {
    let ct = Ciphertext::<MlKem768>::try_from(message.pq_ciphertext.as_slice()).map_err(|_| Error::Malformed)?;
    let pq_ss = keys.pq.decapsulate(&ct);

    let dh1 = keys.signed.diffie_hellman(&message.identity_dh);
    let dh2 = me.dh.diffie_hellman(&message.ephemeral);
    let dh3 = keys.signed.diffie_hellman(&message.ephemeral);
    let dh4 = match message.one_time_id {
        Some(id) => {
            let secret = keys.one_time.remove(&id).ok_or(Error::UnknownPrekey)?;
            Some(secret.diffie_hellman(&message.ephemeral))
        }
        None => None,
    };

    let mut parts: Vec<&[u8]> = vec![dh1.as_bytes(), dh2.as_bytes(), dh3.as_bytes()];
    if let Some(d) = &dh4 {
        parts.push(d.as_bytes());
    }
    parts.push(pq_ss.as_slice());
    let secret = kdf(&parts);

    Ok(Session::responder(secret, keys.signed.clone()))
}

impl PrekeyBundle {
    /// Checks that the identity key signed every other key in the bundle.
    pub fn verify(&self) -> Result<(), Error> {
        let vk = VerifyingKey::from_bytes(&self.identity_verify).map_err(|_| Error::Malformed)?;
        let sig = Signature::from_bytes(&self.signature);
        vk.verify_strict(
            &transcript(&self.identity_dh, &self.signed_prekey, &self.pq_prekey, self.one_time.as_ref()),
            &sig,
        )
        .map_err(|_| Error::BadSignature)
    }
}

impl PrekeyBundle {
    /// Checks the bundle, then that its identity key signed `message` under
    /// `context` ([`signed_statement`]), as [`crate::conversation::Account::sign`] does.
    ///
    /// The bundle's signature does not prove that whoever made it holds the
    /// X25519 identity it names: anyone can sign a bundle naming someone
    /// else's. So take a bundle to check statements with only from inside a
    /// conversation with that identity, never from a contact link alone.
    pub fn verify_signed(&self, context: &[u8], message: &[u8], signature: &[u8]) -> Result<(), Error> {
        self.verify()?;
        let signature = <[u8; 64]>::try_from(signature).map_err(|_| Error::Malformed)?;
        let vk = VerifyingKey::from_bytes(&self.identity_verify).map_err(|_| Error::Malformed)?;
        vk.verify_strict(&signed_statement(context, message)?, &Signature::from_bytes(&signature))
            .map_err(|_| Error::BadSignature)
    }
}

/// What an account's identity key signs for a statement other than its own
/// bundle: a prefix no bundle transcript starts with, the context (which names
/// what the statement is, and holds no zero byte), a zero, then the message.
pub fn signed_statement(context: &[u8], message: &[u8]) -> Result<Vec<u8>, Error> {
    if context.is_empty() || context.contains(&0) {
        return Err(Error::Malformed);
    }
    let mut out = Vec::with_capacity(SIGNED_PREFIX.len() + context.len() + 1 + message.len());
    out.extend_from_slice(SIGNED_PREFIX);
    out.extend_from_slice(context);
    out.push(0);
    out.extend_from_slice(message);
    Ok(out)
}

const SIGNED_PREFIX: &[u8] = b"erevos signed v1\0";

fn transcript(identity_dh: &PublicKey, signed: &PublicKey, pq: &[u8], one_time: Option<&OneTimePrekey>) -> Vec<u8> {
    let mut out = Vec::with_capacity(128 + pq.len());
    out.extend_from_slice(b"erevos prekey bundle v1");
    out.extend_from_slice(identity_dh.as_bytes());
    out.extend_from_slice(signed.as_bytes());
    out.extend_from_slice(pq);
    match one_time {
        Some(o) => {
            out.push(1);
            out.extend_from_slice(&o.id.to_be_bytes());
            out.extend_from_slice(o.public.as_bytes());
        }
        None => out.push(0),
    }
    out
}

fn kdf(parts: &[&[u8]]) -> [u8; 32] {
    let mut ikm = Vec::with_capacity(32 + parts.iter().map(|p| p.len()).sum::<usize>());
    ikm.extend_from_slice(&F);
    for p in parts {
        ikm.extend_from_slice(p);
    }
    let mut out = [0u8; 32];
    Hkdf::<Sha256>::new(Some(&[0u8; 32]), &ikm)
        .expand(INFO, &mut out)
        .expect("32 bytes is a valid hkdf length");
    ikm.zeroize();
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bob(one_time: u32) -> (Identity, Prekeys, Vec<PrekeyBundle>) {
        let id = Identity::generate();
        let (keys, bundles) = Prekeys::generate(&id, one_time);
        (id, keys, bundles)
    }

    #[test]
    fn handshake_then_messages_both_ways() {
        let alice = Identity::generate();
        let (bob_id, mut bob_keys, bundles) = bob(1);
        let ad = b"alice|bob";

        let (mut a, first) = initiate(&alice, &bundles[0]).unwrap();
        let mut b = respond(&bob_id, &mut bob_keys, &first).unwrap();

        let (h, c) = a.encrypt(b"hello bob", ad).unwrap();
        assert_eq!(b.decrypt(&h, &c, ad).unwrap(), b"hello bob");
        let (h, c) = b.encrypt(b"hi alice", ad).unwrap();
        assert_eq!(a.decrypt(&h, &c, ad).unwrap(), b"hi alice");
    }

    #[test]
    fn works_without_a_one_time_prekey() {
        let alice = Identity::generate();
        let (bob_id, mut bob_keys, bundles) = bob(0);
        assert!(bundles[0].one_time.is_none());
        let (mut a, first) = initiate(&alice, &bundles[0]).unwrap();
        let mut b = respond(&bob_id, &mut bob_keys, &first).unwrap();
        let (h, c) = a.encrypt(b"no opk", b"ad").unwrap();
        assert_eq!(b.decrypt(&h, &c, b"ad").unwrap(), b"no opk");
    }

    #[test]
    fn one_time_prekey_cannot_be_reused() {
        let alice = Identity::generate();
        let (bob_id, mut bob_keys, bundles) = bob(1);
        let (_, first) = initiate(&alice, &bundles[0]).unwrap();
        respond(&bob_id, &mut bob_keys, &first).unwrap();
        assert_eq!(bob_keys.one_time_left(), 0);
        assert!(matches!(
            respond(&bob_id, &mut bob_keys, &first),
            Err(Error::UnknownPrekey)
        ));
    }

    #[test]
    fn each_bundle_has_its_own_one_time_prekey() {
        let (_, _, bundles) = bob(3);
        let ids: Vec<u32> = bundles.iter().map(|b| b.one_time.as_ref().unwrap().id).collect();
        assert_eq!(ids, [0, 1, 2]);
    }

    #[test]
    fn rejects_swapped_prekey() {
        let alice = Identity::generate();
        let (_, _, mut bundles) = bob(0);
        let (_, other) = Prekeys::generate(&Identity::generate(), 0);
        bundles[0].signed_prekey = other[0].signed_prekey;
        assert!(matches!(initiate(&alice, &bundles[0]), Err(Error::BadSignature)));
    }

    #[test]
    fn rejects_swapped_pq_key() {
        let alice = Identity::generate();
        let (_, _, mut bundles) = bob(0);
        let (_, other) = Prekeys::generate(&Identity::generate(), 0);
        bundles[0].pq_prekey = other[0].pq_prekey.clone();
        assert!(matches!(initiate(&alice, &bundles[0]), Err(Error::BadSignature)));
    }

    #[test]
    fn rejects_swapped_one_time_prekey() {
        let alice = Identity::generate();
        let (_, _, mut bundles) = bob(1);
        let (_, other) = Prekeys::generate(&Identity::generate(), 1);
        bundles[0].one_time = other[0].one_time.clone();
        assert!(matches!(initiate(&alice, &bundles[0]), Err(Error::BadSignature)));
    }

    #[test]
    fn wrong_responder_cannot_decrypt() {
        let alice = Identity::generate();
        let (_, _, bundles) = bob(0);
        let (mallory_id, mut mallory_keys, _) = bob(0);
        let (mut a, first) = initiate(&alice, &bundles[0]).unwrap();
        let mut m = respond(&mallory_id, &mut mallory_keys, &first).unwrap();
        let (h, c) = a.encrypt(b"secret", b"ad").unwrap();
        assert!(m.decrypt(&h, &c, b"ad").is_err());
    }

    #[test]
    fn bad_pq_ciphertext_length_is_malformed() {
        let (bob_id, mut bob_keys, _) = bob(0);
        let msg = InitialMessage {
            identity_dh: PublicKey::from(&Identity::generate().dh),
            ephemeral: PublicKey::from(&StaticSecret::random_from_rng(OsRng)),
            pq_ciphertext: vec![0; 10],
            one_time_id: None,
        };
        assert!(matches!(
            respond(&bob_id, &mut bob_keys, &msg),
            Err(Error::Malformed)
        ));
    }
}
