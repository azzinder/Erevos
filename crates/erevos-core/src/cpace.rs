// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Pairing by a short code (app/lib/pair-code.ts): two phones that both know the
//! same few digits agree on a key no one else learns, the way CPace does
//! (draft-irtf-cfrg-cpace, on ristretto255 with SHA-512), so the contact links
//! they then swap are sealed to it.
//!
//! - The code makes the generator: `g = hash_to_ristretto(SHA-512(DSI, code,
//!   channel id, session id))`. Each phone picks a secret scalar `y` and sends
//!   `Y = y·g`; the key is `K = y·Y'`. Without the code, `g` is a random point
//!   to whoever watches, so what was sent says nothing of the code: each guess
//!   needs a run of the protocol with one of the phones (an online guess), never
//!   a computation at home (an offline one).
//! - The shared key `ISK = SHA-512(DSI_ISK, session id, K, Y of the one who
//!   started, Y of the one who answered)`; a share that is not a point, or the
//!   identity, is refused.
//! - Each side proves it holds ISK with its own tag (`confirm`), so a wrong code
//!   is found before anything is sealed; the app counts it as a try, and closes
//!   the pairing after `TRIES` of them.
//!
//! Not checked against the draft's test vectors (its padding of the code is not
//! done here), so it is CPace in design, not a conforming implementation of it.
//! Not audited.

use curve25519_dalek::ristretto::{CompressedRistretto, RistrettoPoint};
use curve25519_dalek::scalar::Scalar;
use curve25519_dalek::traits::Identity;
use hmac::{Hmac, Mac};
use rand_core::{OsRng, RngCore};
use sha2::{Digest, Sha512};
use subtle::ConstantTimeEq;
use zeroize::Zeroize;

use crate::Error;

const DSI: &[u8] = b"CPaceRistretto255";
const DSI_ISK: &[u8] = b"CPaceRistretto255_ISK";
const CONFIRM: &[u8] = b"erevos pair confirm v1";

/// How many wrong codes a pairing takes before it closes.
pub const TRIES: u8 = 3;

// Each part with its length before it, so no two lists of parts make the same bytes.
fn lv(hash: &mut Sha512, part: &[u8]) {
    hash.update((part.len() as u64).to_be_bytes());
    hash.update(part);
}

fn generator(code: &[u8], channel: &[u8], session: &[u8]) -> RistrettoPoint {
    let mut hash = Sha512::new();
    for part in [DSI, code, channel, session] {
        lv(&mut hash, part);
    }
    let mut wide: [u8; 64] = hash.finalize().into();
    let point = RistrettoPoint::from_uniform_bytes(&wide);
    wide.zeroize();
    point
}

/// One side's start: its secret scalar (32 bytes, kept only until `finish`) and
/// the share it sends (32 bytes), for the `code` both know, the pairing's
/// `channel` and its `session` id.
pub fn start(code: &[u8], channel: &[u8], session: &[u8]) -> ([u8; 32], [u8; 32]) {
    let mut wide = [0u8; 64];
    OsRng.fill_bytes(&mut wide);
    let secret = Scalar::from_bytes_mod_order_wide(&wide);
    wide.zeroize();
    let share = (secret * generator(code, channel, session)).compress().to_bytes();
    (secret.to_bytes(), share)
}

/// The shared key (64 bytes) from this side's `secret`, the `session` id, and
/// both shares, the one who started first. Malformed for a share that is not
/// a point or is the identity.
pub fn finish(secret: &[u8], session: &[u8], started: &[u8], answered: &[u8], own_started: bool) -> Result<[u8; 64], Error> {
    let secret = <[u8; 32]>::try_from(secret).map_err(|_| Error::Malformed)?;
    let secret = Option::<Scalar>::from(Scalar::from_canonical_bytes(secret)).ok_or(Error::Malformed)?;
    let theirs = if own_started { answered } else { started };
    let theirs = CompressedRistretto::from_slice(theirs).map_err(|_| Error::Malformed)?.decompress().ok_or(Error::Malformed)?;
    if theirs == RistrettoPoint::identity() {
        return Err(Error::Malformed);
    }
    let shared = secret * theirs;
    if shared == RistrettoPoint::identity() {
        return Err(Error::Malformed);
    }
    let mut hash = Sha512::new();
    for part in [DSI_ISK, session, shared.compress().as_bytes(), started, answered] {
        lv(&mut hash, part);
    }
    Ok(hash.finalize().into())
}

/// The tag a side sends to prove it holds `key` (`started`: the one who started's, else the other's).
pub fn confirm(key: &[u8], started: bool) -> [u8; 32] {
    let mut mac = <Hmac<sha2::Sha256> as Mac>::new_from_slice(key).expect("any key length");
    mac.update(CONFIRM);
    mac.update(&[u8::from(started)]);
    mac.finalize().into_bytes().into()
}

/// Whether `tag` is the other side's proof for `key`, in constant time.
pub fn confirmed(key: &[u8], started: bool, tag: &[u8]) -> bool {
    tag.len() == 32 && bool::from(confirm(key, started).ct_eq(tag))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(code_a: &[u8], code_b: &[u8]) -> ([u8; 64], [u8; 64]) {
        let (channel, session) = (b"123", b"session-1");
        let (secret_a, share_a) = start(code_a, channel, session);
        let (secret_b, share_b) = start(code_b, channel, session);
        let key_a = finish(&secret_a, session, &share_a, &share_b, true).unwrap();
        let key_b = finish(&secret_b, session, &share_a, &share_b, false).unwrap();
        (key_a, key_b)
    }

    #[test]
    fn the_same_code_gives_the_same_key_and_a_wrong_one_does_not() {
        let (a, b) = run(b"45678", b"45678");
        assert_eq!(a, b);
        assert!(confirmed(&b, true, &confirm(&a, true)));
        assert!(confirmed(&a, false, &confirm(&b, false)));
        assert!(!confirmed(&a, true, &confirm(&a, false)), "each side's tag is its own");
        let (a, b) = run(b"45678", b"45679");
        assert_ne!(a, b);
        assert!(!confirmed(&b, true, &confirm(&a, true)));
    }

    #[test]
    fn each_run_makes_a_new_key() {
        let (first, _) = run(b"11111", b"11111");
        let (second, _) = run(b"11111", b"11111");
        assert_ne!(first, second);
    }

    #[test]
    fn a_share_that_is_no_point_or_the_identity_is_refused() {
        let (secret, share) = start(b"1", b"2", b"3");
        let identity = RistrettoPoint::identity().compress().to_bytes();
        assert!(matches!(finish(&secret, b"3", &share, &identity, true), Err(Error::Malformed)));
        assert!(matches!(finish(&secret, b"3", &share, &[0xff; 32], true), Err(Error::Malformed)));
        assert!(matches!(finish(&secret, b"3", &share, &[1; 31], true), Err(Error::Malformed)));
        assert!(matches!(finish(&[0xff; 32], b"3", &share, &share, true), Err(Error::Malformed)));
    }

    #[test]
    fn the_generator_hangs_on_every_input() {
        let g = generator(b"code", b"ch", b"sid");
        assert_ne!(g, generator(b"codf", b"ch", b"sid"));
        assert_ne!(g, generator(b"code", b"ci", b"sid"));
        assert_ne!(g, generator(b"code", b"ch", b"sie"));
        // Lengths before the parts: moving a byte from one part to the next changes it.
        assert_ne!(generator(b"ab", b"c", b""), generator(b"a", b"bc", b""));
    }
}
