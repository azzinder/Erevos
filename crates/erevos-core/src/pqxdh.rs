//! Session setup: PQXDH, the handshake Signal specifies, with X25519 and
//! ML-KEM-768 (FIPS 203) in place of the classical-only X3DH. The result
//! seeds the double ratchet, so a session is post-quantum from its first
//! message as long as the ML-KEM half holds.
//!
//! Each user publishes a prekey bundle signed by their Ed25519 identity key:
//! the X25519 identity key, a signed X25519 prekey and an ML-KEM-768
//! encapsulation key. Signing the whole bundle means a relay that swaps any
//! key invalidates the signature.
//!
//! Not audited. Spec: https://signal.org/docs/specifications/pqxdh/

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

pub const PQ_PUBLIC_LEN: usize = 1184;
pub const PQ_CIPHERTEXT_LEN: usize = 1088;

/// Long-term keys. Keep the identity secret on the device only.
pub struct Identity {
    pub signing: SigningKey,
    pub dh: StaticSecret,
}

/// Private half of the prekeys that a bundle advertises.
pub struct Prekeys {
    pub signed: StaticSecret,
    pub pq: DecapsulationKey<MlKem768>,
}

/// Public part of a user's keys, fetched by whoever wants to start a session.
#[derive(Clone)]
pub struct PrekeyBundle {
    pub identity_verify: [u8; 32],
    pub identity_dh: PublicKey,
    pub signed_prekey: PublicKey,
    pub pq_prekey: Vec<u8>,
    pub signature: [u8; 64],
}

/// What the initiator sends with its first message so the responder can
/// finish the handshake.
#[derive(Clone)]
pub struct InitialMessage {
    pub identity_dh: PublicKey,
    pub ephemeral: PublicKey,
    pub pq_ciphertext: Vec<u8>,
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
    pub fn generate(identity: &Identity) -> (Self, PrekeyBundle) {
        let signed = StaticSecret::random_from_rng(OsRng);
        let pq = DecapsulationKey::<MlKem768>::generate();
        let ek = pq.encapsulation_key();
        let pq_pub = ek.to_bytes().as_slice().to_vec();
        let signed_pub = PublicKey::from(&signed);
        let identity_dh = PublicKey::from(&identity.dh);
        let signature = identity
            .signing
            .sign(&transcript(&identity_dh, &signed_pub, &pq_pub))
            .to_bytes();
        let bundle = PrekeyBundle {
            identity_verify: identity.signing.verifying_key().to_bytes(),
            identity_dh,
            signed_prekey: signed_pub,
            pq_prekey: pq_pub,
            signature,
        };
        (Prekeys { signed, pq }, bundle)
    }
}

/// Starts a session as the sender. Returns the session and the message to
/// send with the first ciphertext.
pub fn initiate(me: &Identity, bundle: &PrekeyBundle) -> Result<(Session, InitialMessage), Error> {
    verify_bundle(bundle)?;
    let pq_ek = encapsulation_key(&bundle.pq_prekey)?;

    let ephemeral = StaticSecret::random_from_rng(OsRng);
    let my_dh = PublicKey::from(&me.dh);

    let dh1 = me.dh.diffie_hellman(&bundle.signed_prekey);
    let dh2 = ephemeral.diffie_hellman(&bundle.identity_dh);
    let dh3 = ephemeral.diffie_hellman(&bundle.signed_prekey);
    let (ct, pq_ss) = pq_ek.encapsulate();

    let secret = kdf(&[dh1.as_bytes(), dh2.as_bytes(), dh3.as_bytes(), pq_ss.as_slice()]);
    let session = Session::initiator(secret, bundle.signed_prekey);
    let message = InitialMessage {
        identity_dh: my_dh,
        ephemeral: PublicKey::from(&ephemeral),
        pq_ciphertext: ct.as_slice().to_vec(),
    };
    Ok((session, message))
}

/// Finishes a session as the receiver, from the sender's first message.
pub fn respond(me: &Identity, keys: Prekeys, message: &InitialMessage) -> Result<Session, Error> {
    let ct = Ciphertext::<MlKem768>::try_from(message.pq_ciphertext.as_slice())
        .map_err(|_| Error::Malformed)?;
    let pq_ss = keys.pq.decapsulate(&ct);

    let dh1 = keys.signed.diffie_hellman(&message.identity_dh);
    let dh2 = me.dh.diffie_hellman(&message.ephemeral);
    let dh3 = keys.signed.diffie_hellman(&message.ephemeral);

    let secret = kdf(&[dh1.as_bytes(), dh2.as_bytes(), dh3.as_bytes(), pq_ss.as_slice()]);
    Ok(Session::responder(secret, keys.signed))
}

fn verify_bundle(bundle: &PrekeyBundle) -> Result<(), Error> {
    let vk = VerifyingKey::from_bytes(&bundle.identity_verify).map_err(|_| Error::Malformed)?;
    let sig = Signature::from_bytes(&bundle.signature);
    vk.verify_strict(
        &transcript(&bundle.identity_dh, &bundle.signed_prekey, &bundle.pq_prekey),
        &sig,
    )
    .map_err(|_| Error::BadSignature)
}

fn transcript(identity_dh: &PublicKey, signed: &PublicKey, pq: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(64 + pq.len() + 16);
    out.extend_from_slice(b"erevos prekey bundle v1");
    out.extend_from_slice(identity_dh.as_bytes());
    out.extend_from_slice(signed.as_bytes());
    out.extend_from_slice(pq);
    out
}

fn encapsulation_key(bytes: &[u8]) -> Result<EncapsulationKey<MlKem768>, Error> {
    EncapsulationKey::<MlKem768>::new_from_slice(bytes).map_err(|_| Error::Malformed)
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

    fn bob() -> (Identity, Prekeys, PrekeyBundle) {
        let id = Identity::generate();
        let (keys, bundle) = Prekeys::generate(&id);
        (id, keys, bundle)
    }

    #[test]
    fn handshake_then_messages_both_ways() {
        let alice = Identity::generate();
        let (bob_id, bob_keys, bundle) = bob();
        let ad = b"alice|bob";

        let (mut a, first) = initiate(&alice, &bundle).unwrap();
        let mut b = respond(&bob_id, bob_keys, &first).unwrap();

        let (h, c) = a.encrypt(b"hello bob", ad).unwrap();
        assert_eq!(b.decrypt(&h, &c, ad).unwrap(), b"hello bob");
        let (h, c) = b.encrypt(b"hi alice", ad).unwrap();
        assert_eq!(a.decrypt(&h, &c, ad).unwrap(), b"hi alice");
    }

    #[test]
    fn rejects_swapped_prekey() {
        let alice = Identity::generate();
        let (_, _, mut bundle) = bob();
        let (_, other) = Prekeys::generate(&Identity::generate());
        bundle.signed_prekey = other.signed_prekey;
        assert!(matches!(initiate(&alice, &bundle), Err(Error::BadSignature)));
    }

    #[test]
    fn rejects_swapped_pq_key() {
        let alice = Identity::generate();
        let (_, _, mut bundle) = bob();
        let (_, other) = Prekeys::generate(&Identity::generate());
        bundle.pq_prekey = other.pq_prekey;
        assert!(matches!(initiate(&alice, &bundle), Err(Error::BadSignature)));
    }

    #[test]
    fn wrong_responder_cannot_decrypt() {
        let alice = Identity::generate();
        let (_, _, bundle) = bob();
        let (mallory_id, mallory_keys, _) = bob();
        let (mut a, first) = initiate(&alice, &bundle).unwrap();
        let mut m = respond(&mallory_id, mallory_keys, &first).unwrap();
        let (h, c) = a.encrypt(b"secret", b"ad").unwrap();
        assert!(m.decrypt(&h, &c, b"ad").is_err());
    }

    #[test]
    fn bad_pq_ciphertext_length_is_malformed() {
        let (bob_id, bob_keys, _) = bob();
        let msg = InitialMessage {
            identity_dh: PublicKey::from(&Identity::generate().dh),
            ephemeral: PublicKey::from(&StaticSecret::random_from_rng(OsRng)),
            pq_ciphertext: vec![0; 10],
        };
        assert!(matches!(respond(&bob_id, bob_keys, &msg), Err(Error::Malformed)));
    }
}
