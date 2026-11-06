// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Coupons: what lets a phone take a token on a second relay without that
//! relay, or the first, being able to tell whose it is.
//!
//! A relay that issues coupons has an RSA key of its own for them alone. A
//! phone with a token on that relay picks a random nonce, blinds the coupon
//! message made of it (`blind`) and has the relay sign the blinded message
//! with its token (`Issuer::sign`), which the relay limits per phone. The
//! phone unblinds the signature (`finalize`), and later gives the nonce, the
//! message randomizer and the signature to the second relay, through Tor and
//! with no token, which checks them against the issuers it trusts (`verify`),
//! takes each nonce once, and gives a token in return. The first relay saw a
//! blinded message only, the second a signature the first never saw: neither
//! can tie the token to the phone that asked, nor to its token on the first.
//!
//! RSA blind signatures as RFC 9474 says them, RSABSSA-SHA384-PSS-Randomized,
//! through the `blind-rsa-signatures` crate. The key signs nothing else, as
//! the RFC asks. The phone takes the issuer's public key from the second
//! relay's list of the issuers it trusts (by `key_id`), not from the first
//! alone, so the first cannot give each phone a key of its own to tell them
//! apart, unless the second lists those keys too: a relay lists a few at
//! most (the relay's `MAX_ISSUERS`), which bounds how many groups two relays
//! working together could split phones into. Not audited.

use blind_rsa_signatures::{
    BlindSignature, BlindingResult, DefaultRng, MessageRandomizer, PublicKeySha384PSSRandomized,
    SecretKeySha384PSSRandomized, Secret, Signature, KeyPairSha384PSSRandomized,
};
use sha2::{Digest, Sha256};

use crate::Error;

/// The size of the key a relay makes for coupons.
pub const MODULUS_BITS: usize = 2048;
/// A coupon's nonce, and its message randomizer, bytes.
pub const NONCE: usize = 32;
pub const RANDOMIZER: usize = 32;
/// What a coupon's message starts with, so a signature for anything else is
/// never one for a coupon.
const CONTEXT: &[u8] = b"erevos coupon v1\0";

// The message the issuer signs, blind: the context, then the nonce.
fn message(nonce: &[u8; NONCE]) -> Vec<u8> {
    let mut m = Vec::with_capacity(CONTEXT.len() + NONCE);
    m.extend_from_slice(CONTEXT);
    m.extend_from_slice(nonce);
    m
}

/// What names an issuer's key in a relay's list: the SHA-256 of its public key
/// as SubjectPublicKeyInfo DER.
pub fn key_id(spki: &[u8]) -> [u8; 32] {
    Sha256::digest(spki).into()
}

fn public(spki: &[u8]) -> Result<PublicKeySha384PSSRandomized, Error> {
    PublicKeySha384PSSRandomized::from_spki(spki).map_err(|_| Error::Malformed)
}

/// A relay's key for coupons.
pub struct Issuer {
    secret: SecretKeySha384PSSRandomized,
    spki: Vec<u8>,
}

impl Issuer {
    /// A new key, of `MODULUS_BITS`.
    pub fn generate() -> Result<Issuer, Error> {
        let pair = KeyPairSha384PSSRandomized::generate(&mut DefaultRng, MODULUS_BITS)
            .map_err(|_| Error::Malformed)?;
        let spki = pair.pk.to_spki().map_err(|_| Error::Malformed)?;
        Ok(Issuer { secret: pair.sk, spki })
    }

    /// The key from its PEM (PKCS#8 or PKCS#1), as `to_pem` writes it.
    pub fn from_pem(pem: &str) -> Result<Issuer, Error> {
        let secret = SecretKeySha384PSSRandomized::from_pem(pem).map_err(|_| Error::Malformed)?;
        let spki = secret
            .public_key()
            .and_then(|pk| pk.to_spki())
            .map_err(|_| Error::Malformed)?;
        // A key the phones cannot use is refused here rather than at each coupon.
        public(&spki)?;
        Ok(Issuer { secret, spki })
    }

    /// The secret key, as PEM, to keep in a file only the relay reads.
    pub fn to_pem(&self) -> Result<String, Error> {
        self.secret.to_pem().map_err(|_| Error::Malformed)
    }

    /// The public key, as SubjectPublicKeyInfo DER.
    pub fn public_spki(&self) -> &[u8] {
        &self.spki
    }

    /// Signs a blinded message: the blind signature. Refuses one of the wrong
    /// size, or not below the modulus.
    pub fn sign(&self, blinded: &[u8]) -> Result<Vec<u8>, Error> {
        self.secret
            .blind_sign(blinded)
            .map(|signature| signature.0)
            .map_err(|_| Error::Malformed)
    }
}

/// What the phone keeps between asking for the signature and finishing the
/// coupon: the blinded message to send, and the secret and randomizer to
/// keep.
pub struct Blinded {
    pub message: Vec<u8>,
    pub secret: Vec<u8>,
    pub randomizer: [u8; RANDOMIZER],
}

/// Blinds the coupon message of `nonce` for the issuer whose public key is
/// `spki`.
pub fn blind(spki: &[u8], nonce: &[u8; NONCE]) -> Result<Blinded, Error> {
    let key = public(spki)?;
    let result = key.blind(&mut DefaultRng, message(nonce)).map_err(|_| Error::Malformed)?;
    let randomizer = result.msg_randomizer.ok_or(Error::Malformed)?.0;
    Ok(Blinded { message: result.blind_message.0, secret: result.secret.0, randomizer })
}

/// Unblinds the issuer's blind signature: the coupon's signature, checked
/// against the issuer's key before it is given.
pub fn finalize(
    spki: &[u8],
    blind_signature: &[u8],
    secret: &[u8],
    randomizer: &[u8; RANDOMIZER],
    nonce: &[u8; NONCE],
) -> Result<Vec<u8>, Error> {
    let key = public(spki)?;
    let result = BlindingResult {
        blind_message: blind_rsa_signatures::BlindMessage(Vec::new()),
        secret: Secret(secret.to_vec()),
        msg_randomizer: Some(MessageRandomizer(*randomizer)),
    };
    key.finalize(&BlindSignature(blind_signature.to_vec()), &result, message(nonce))
        .map(|signature| signature.0)
        .map_err(|_| Error::BadSignature)
}

/// Whether `signature` with `randomizer` is the issuer's for the coupon of
/// `nonce`.
pub fn verify(
    spki: &[u8],
    signature: &[u8],
    randomizer: &[u8; RANDOMIZER],
    nonce: &[u8; NONCE],
) -> Result<(), Error> {
    let key = public(spki)?;
    key.verify(
        &Signature(signature.to_vec()),
        Some(MessageRandomizer(*randomizer)),
        message(nonce),
    )
    .map_err(|_| Error::BadSignature)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::OnceLock;

    // Making a key takes a while: one for all the tests.
    fn issuer() -> &'static Issuer {
        static KEY: OnceLock<Issuer> = OnceLock::new();
        KEY.get_or_init(|| Issuer::generate().unwrap())
    }

    #[test]
    fn a_coupon_goes_round() {
        let issuer = issuer();
        let nonce = [7u8; NONCE];
        let blinded = blind(issuer.public_spki(), &nonce).unwrap();
        let signed = issuer.sign(&blinded.message).unwrap();
        let signature =
            finalize(issuer.public_spki(), &signed, &blinded.secret, &blinded.randomizer, &nonce).unwrap();
        verify(issuer.public_spki(), &signature, &blinded.randomizer, &nonce).unwrap();
        // The issuer never saw what the second relay sees.
        assert_ne!(signed, signature);
        assert_ne!(blinded.message, message(&nonce));
    }

    #[test]
    fn another_nonce_or_randomizer_is_refused() {
        let issuer = issuer();
        let nonce = [1u8; NONCE];
        let blinded = blind(issuer.public_spki(), &nonce).unwrap();
        let signed = issuer.sign(&blinded.message).unwrap();
        let signature =
            finalize(issuer.public_spki(), &signed, &blinded.secret, &blinded.randomizer, &nonce).unwrap();
        assert!(verify(issuer.public_spki(), &signature, &blinded.randomizer, &[2u8; NONCE]).is_err());
        assert!(verify(issuer.public_spki(), &signature, &[0u8; RANDOMIZER], &nonce).is_err());
        let mut bent = signature.clone();
        bent[10] ^= 1;
        assert!(verify(issuer.public_spki(), &bent, &blinded.randomizer, &nonce).is_err());
    }

    #[test]
    fn another_issuers_signature_is_refused() {
        let issuer = issuer();
        let other = Issuer::generate().unwrap();
        let nonce = [3u8; NONCE];
        let blinded = blind(other.public_spki(), &nonce).unwrap();
        let signed = other.sign(&blinded.message).unwrap();
        let signature =
            finalize(other.public_spki(), &signed, &blinded.secret, &blinded.randomizer, &nonce).unwrap();
        assert!(verify(issuer.public_spki(), &signature, &blinded.randomizer, &nonce).is_err());
        // Nor does a blind signature of the wrong key finish.
        let mine = blind(issuer.public_spki(), &nonce).unwrap();
        let theirs = other.sign(&mine.message);
        if let Ok(theirs) = theirs {
            assert!(finalize(issuer.public_spki(), &theirs, &mine.secret, &mine.randomizer, &nonce).is_err());
        }
    }

    #[test]
    fn the_key_keeps_through_pem() {
        let issuer = issuer();
        let again = Issuer::from_pem(&issuer.to_pem().unwrap()).unwrap();
        assert_eq!(again.public_spki(), issuer.public_spki());
        assert_eq!(key_id(again.public_spki()), key_id(issuer.public_spki()));
    }

    #[test]
    fn bad_input_is_refused() {
        let issuer = issuer();
        assert!(issuer.sign(&[1u8; 10]).is_err());
        assert!(issuer.sign(&vec![0xffu8; MODULUS_BITS / 8]).is_err());
        assert!(blind(b"not a key", &[0u8; NONCE]).is_err());
        assert!(Issuer::from_pem("nothing").is_err());
    }
}
