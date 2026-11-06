// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! An account's X25519 identity saying that its bundle's Ed25519 key is its
//! own (docs/multi-device.md, phase S5). A bundle's own signature shows only
//! that its Ed25519 key signed its X25519 keys, not that whoever made it holds
//! the X25519 identity's secret, so a contact takes the bundle from a contact
//! link or a linked device only with this: an XEdDSA signature (Signal's, with
//! the Curve25519 key as an Edwards key whose sign bit is 0) by the X25519
//! identity, of a statement that names both keys. Safety numbers cover the
//! X25519 identity, so whoever matches them can trust the bundle, and the
//! device list its Ed25519 key signs, through it.
//!
//! Verification is strict: the key's u is below p with its top bit clear, the
//! sign bit is 0, `s` is canonical, the key and `R` are not of small order.
//! Not audited.

use curve25519_dalek::edwards::{CompressedEdwardsY, EdwardsPoint};
use curve25519_dalek::montgomery::MontgomeryPoint;
use curve25519_dalek::scalar::Scalar;
use rand_core::{OsRng, RngCore};
use sha2::{Digest, Sha512};
use subtle::ConstantTimeEq;
use x25519_dalek::StaticSecret;
use zeroize::{Zeroize, Zeroizing};

use crate::pqxdh::{signed_statement, Identity, PrekeyBundle};
use crate::Error;

/// The context of the statement: no other signed statement uses it.
const CONTEXT: &[u8] = b"bind";

// What the X25519 identity `dh` signs: that `verify` is its Ed25519 key.
fn statement(dh: &[u8; 32], verify: &[u8; 32]) -> Vec<u8> {
    let mut keys = Vec::with_capacity(64);
    keys.extend_from_slice(dh);
    keys.extend_from_slice(verify);
    // The context is fixed and holds no zero byte.
    signed_statement(CONTEXT, &keys).expect("fixed context")
}

fn clamp(mut secret: [u8; 32]) -> [u8; 32] {
    secret[0] &= 248;
    secret[31] &= 127;
    secret[31] |= 64;
    secret
}

/// Signs `message` with a Curve25519 secret, as XEdDSA does.
pub fn xeddsa_sign(secret: &StaticSecret, message: &[u8]) -> [u8; 64] {
    let clamped = Zeroizing::new(clamp(secret.to_bytes()));
    let mut k = Scalar::from_bytes_mod_order(*clamped);
    let big_a = EdwardsPoint::mul_base(&k).compress();
    // The Edwards key with sign bit 0: the secret negated when it is 1.
    let (mut a, big_a) = if big_a.as_bytes()[31] & 0x80 != 0 { (-k, EdwardsPoint::mul_base(&-k).compress()) } else { (k, big_a) };
    k.zeroize();
    let mut z = Zeroizing::new([0u8; 64]);
    OsRng.fill_bytes(z.as_mut());
    let mut hash = Sha512::new();
    hash.update([0xfe]);
    hash.update([0xff; 31]);
    hash.update(a.as_bytes());
    hash.update(message);
    hash.update(*z);
    let mut wide = Zeroizing::new([0u8; 64]);
    wide.copy_from_slice(&hash.finalize());
    let mut r = Scalar::from_bytes_mod_order_wide(&wide);
    let big_r = EdwardsPoint::mul_base(&r).compress();
    let h = Scalar::from_bytes_mod_order_wide(&Sha512::new().chain_update(big_r.as_bytes()).chain_update(big_a.as_bytes()).chain_update(message).finalize().into());
    let s = r + h * a;
    r.zeroize();
    a.zeroize();
    let mut signature = [0u8; 64];
    signature[..32].copy_from_slice(big_r.as_bytes());
    signature[32..].copy_from_slice(s.as_bytes());
    signature
}

/// Checks an XEdDSA signature by the Curve25519 key `public`, strictly.
pub fn xeddsa_verify(public: &[u8; 32], message: &[u8], signature: &[u8; 64]) -> bool {
    // The key's u in its one encoding: below p = 2^255 - 19, the top bit clear.
    if !canonical_u(public) {
        return false;
    }
    let Some(big_a) = MontgomeryPoint(*public).to_edwards(0) else {
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
    let mut r = [0u8; 32];
    r.copy_from_slice(&signature[..32]);
    match CompressedEdwardsY(r).decompress() {
        Some(point) if !point.is_small_order() => {}
        _ => return false,
    }
    let big_a = big_a.compress();
    let h = Scalar::from_bytes_mod_order_wide(&Sha512::new().chain_update(r).chain_update(big_a.as_bytes()).chain_update(message).finalize().into());
    let check = EdwardsPoint::vartime_double_scalar_mul_basepoint(&h, &-big_a.decompress().expect("decompressed above"), &s);
    check.compress().as_bytes().ct_eq(&r).into()
}

// Whether a Curve25519 u, little-endian, is below p = 2^255 - 19, and so in its one encoding.
fn canonical_u(u: &[u8; 32]) -> bool {
    if u[31] & 0x80 != 0 {
        return false;
    }
    // At or above p only as 0x7f, then thirty 0xff, then 0xed or above at the lowest byte.
    !(u[31] == 0x7f && u[1..31].iter().all(|&b| b == 0xff) && u[0] >= 0xed)
}

impl Identity {
    /// This identity's X25519 key saying that its Ed25519 key is its own.
    pub fn bind(&self) -> [u8; 64] {
        let dh = x25519_dalek::PublicKey::from(&self.dh).to_bytes();
        xeddsa_sign(&self.dh, &statement(&dh, &self.signing.verifying_key().to_bytes()))
    }
}

impl PrekeyBundle {
    /// Checks the bundle, then that its X25519 identity said its Ed25519 key
    /// is its own (`Identity::bind`).
    pub fn verify_bound(&self, signature: &[u8]) -> Result<(), Error> {
        self.verify()?;
        let signature = <[u8; 64]>::try_from(signature).map_err(|_| Error::Malformed)?;
        let dh = self.identity_dh.to_bytes();
        if xeddsa_verify(&dh, &statement(&dh, &self.identity_verify), &signature) {
            Ok(())
        } else {
            Err(Error::BadSignature)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::conversation::Account;

    #[test]
    fn a_bundle_is_bound_only_by_its_own_identity() {
        let account = Account::generate();
        let other = Account::generate();
        let bundle = account.bundle();
        let bound = account.bind();
        assert!(bundle.verify_bound(&bound).is_ok());
        // Another identity's word, or one changed, does not bind it.
        assert!(matches!(bundle.verify_bound(&other.bind()), Err(Error::BadSignature)));
        let mut changed = bound;
        changed[5] ^= 1;
        assert!(bundle.verify_bound(&changed).is_err());
        // With the sign bit set, or `s` not canonical: refused.
        let mut flipped = bound;
        flipped[63] |= 0x80;
        assert!(bundle.verify_bound(&flipped).is_err());
        // An `R` of small order, or not a point: refused.
        let mut small = bound;
        let mut neutral = [0u8; 32];
        neutral[0] = 1;
        small[..32].copy_from_slice(&neutral);
        assert!(bundle.verify_bound(&small).is_err());
        assert!(bundle.verify_bound(&bound[..63]).is_err());
        // Someone else's Ed25519 key in a bundle with this identity: not bound by it.
        let mut forged = other.bundle();
        forged.identity_dh = bundle.identity_dh;
        assert!(forged.verify_bound(&bound).is_err());
    }

    #[test]
    fn xeddsa_signs_and_checks() {
        let secret = StaticSecret::random_from_rng(OsRng);
        let public = x25519_dalek::PublicKey::from(&secret).to_bytes();
        for message in [&b""[..], b"one", &[7u8; 300]] {
            let signature = xeddsa_sign(&secret, message);
            assert!(xeddsa_verify(&public, message, &signature));
            assert!(!xeddsa_verify(&public, b"other", &signature));
        }
        // The key with its top bit set, or as u + p, is not in its one encoding; one of small order is none.
        let signature = xeddsa_sign(&secret, b"one");
        let mut high = public;
        high[31] |= 0x80;
        assert!(!xeddsa_verify(&high, b"one", &signature));
        let mut p = [0xffu8; 32];
        p[0] = 0xed;
        p[31] = 0x7f;
        assert!(!canonical_u(&p));
        p[0] = 0xec;
        assert!(canonical_u(&p));
        assert!(!xeddsa_verify(&[0u8; 32], b"one", &signature));
    }
}
