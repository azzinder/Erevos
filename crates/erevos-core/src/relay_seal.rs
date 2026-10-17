//! Sealing a relay request for the destination relay, so a forwarding relay
//! in between can carry it without reading it.
//!
//! Two-hop sending, as in SimpleX private routing: the phone gives the sealed
//! request to its own relay, which passes it on to the contact's relay. The
//! first relay sees the phone's address but not which queue the message is
//! for; the second sees the queue but only the first relay's address.
//!
//! A sealed request is: version, a fresh X25519 public key, then the queue's
//! sender id and the message, encrypted with ChaCha20-Poly1305 under a key
//! derived from the X25519 result and both public keys. Each key is used for
//! one request only, so the nonce is zero.
//!
//! Not audited.

use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::ChaCha20Poly1305;
use hkdf::Hkdf;
use rand_core::OsRng;
use sha2::Sha256;
use x25519_dalek::{EphemeralSecret, PublicKey, StaticSecret};
use zeroize::Zeroize;

use crate::Error;

const VERSION: u8 = 1;
pub const SENDER_ID_LEN: usize = 24;
const TAG_LEN: usize = 16;
/// Bytes a sealed request adds to the message.
pub const OVERHEAD: usize = 1 + 32 + SENDER_ID_LEN + TAG_LEN;

/// A relay's long-term key for opening sealed requests.
pub struct RelayKey(StaticSecret);

impl RelayKey {
    pub fn generate() -> Self {
        RelayKey(StaticSecret::random_from_rng(OsRng))
    }

    pub fn from_secret_bytes(bytes: [u8; 32]) -> Self {
        RelayKey(StaticSecret::from(bytes))
    }

    pub fn to_secret_bytes(&self) -> [u8; 32] {
        self.0.to_bytes()
    }

    /// What phones put in their contact links, so senders can seal to this relay.
    pub fn public(&self) -> [u8; 32] {
        PublicKey::from(&self.0).to_bytes()
    }

    /// Opens a sealed request: the queue's sender id, then the message.
    pub fn open(&self, sealed: &[u8]) -> Result<([u8; SENDER_ID_LEN], Vec<u8>), Error> {
        if sealed.len() < OVERHEAD || sealed[0] != VERSION {
            return Err(Error::Malformed);
        }
        let ephemeral: [u8; 32] = sealed[1..33].try_into().map_err(|_| Error::Malformed)?;
        let shared = self.0.diffie_hellman(&PublicKey::from(ephemeral));
        let cipher = cipher(shared.as_bytes(), &ephemeral, &self.public())?;
        let mut plain = cipher
            .decrypt(&[0u8; 12].into(), Payload { msg: &sealed[33..], aad: &sealed[..33] })
            .map_err(|_| Error::Crypto)?;
        let mut sender = [0u8; SENDER_ID_LEN];
        sender.copy_from_slice(&plain[..SENDER_ID_LEN]);
        let message = plain[SENDER_ID_LEN..].to_vec();
        plain.zeroize();
        Ok((sender, message))
    }
}

/// Seals a send to the relay whose public key is `relay`.
pub fn seal(relay: &[u8; 32], sender_id: &[u8; SENDER_ID_LEN], message: &[u8]) -> Result<Vec<u8>, Error> {
    let secret = EphemeralSecret::random_from_rng(OsRng);
    let ephemeral = PublicKey::from(&secret).to_bytes();
    let shared = secret.diffie_hellman(&PublicKey::from(*relay));
    if !shared.was_contributory() {
        return Err(Error::Malformed);
    }
    let cipher = cipher(shared.as_bytes(), &ephemeral, relay)?;
    let mut head = vec![VERSION];
    head.extend_from_slice(&ephemeral);
    let mut plain = Vec::with_capacity(SENDER_ID_LEN + message.len());
    plain.extend_from_slice(sender_id);
    plain.extend_from_slice(message);
    let body = cipher
        .encrypt(&[0u8; 12].into(), Payload { msg: &plain, aad: &head })
        .map_err(|_| Error::Crypto)?;
    plain.zeroize();
    head.extend_from_slice(&body);
    Ok(head)
}

fn cipher(shared: &[u8; 32], ephemeral: &[u8; 32], relay: &[u8; 32]) -> Result<ChaCha20Poly1305, Error> {
    let mut info = b"erevos relay seal v1".to_vec();
    info.extend_from_slice(ephemeral);
    info.extend_from_slice(relay);
    let mut key = [0u8; 32];
    Hkdf::<Sha256>::new(None, shared)
        .expand(&info, &mut key)
        .map_err(|_| Error::Crypto)?;
    let cipher = ChaCha20Poly1305::new(&key.into());
    key.zeroize();
    Ok(cipher)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_relay_opens_what_was_sealed_to_it() {
        let relay = RelayKey::generate();
        let sealed = seal(&relay.public(), &[7; 24], b"hello").unwrap();
        assert_eq!(sealed.len(), OVERHEAD + 5);
        let (sender, message) = relay.open(&sealed).unwrap();
        assert_eq!(sender, [7; 24]);
        assert_eq!(message, b"hello");
    }

    #[test]
    fn another_relay_cannot_open_it() {
        let sealed = seal(&RelayKey::generate().public(), &[7; 24], b"hello").unwrap();
        assert!(matches!(RelayKey::generate().open(&sealed), Err(Error::Crypto)));
    }

    #[test]
    fn a_changed_byte_is_refused() {
        let relay = RelayKey::generate();
        let sealed = seal(&relay.public(), &[7; 24], b"hello").unwrap();
        for at in [0, 5, sealed.len() - 1] {
            let mut bad = sealed.clone();
            bad[at] ^= 1;
            assert!(relay.open(&bad).is_err());
        }
        assert!(relay.open(&sealed[..OVERHEAD - 1]).is_err());
    }

    #[test]
    fn the_key_survives_saving() {
        let relay = RelayKey::generate();
        let again = RelayKey::from_secret_bytes(relay.to_secret_bytes());
        assert_eq!(again.public(), relay.public());
        let sealed = seal(&relay.public(), &[1; 24], b"x").unwrap();
        assert!(again.open(&sealed).is_ok());
    }

    #[test]
    fn a_low_order_relay_key_is_refused() {
        assert!(seal(&[0; 32], &[1; 24], b"x").is_err());
    }
}
