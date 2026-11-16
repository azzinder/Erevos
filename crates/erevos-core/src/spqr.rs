// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! A post-quantum ratchet beside the double ratchet (docs/spqr.md): the two
//! sides agree a new ML-KEM-768 secret now and then, an epoch at a time, and
//! each message key is mixed with the key of the epoch its sender was in. So
//! one who records the conversation and later breaks X25519 still cannot read
//! what came after the epoch began, as with the PQXDH handshake at its start,
//! but again and again, not only once.
//!
//! An epoch's keys are too big to send at once (an encapsulation key of 1184
//! bytes, a ciphertext of 1088), so each goes in pieces of `PIECE` bytes, one
//! with every message, over and over until the other side has them all; a
//! lost message only means waiting for its piece to come round again. The
//! pieces go in the double ratchet's associated data, so the other side alone
//! could have made them.
//!
//! Who sends the key alternates. For epoch e + 1, one side (the initiator for
//! the first) makes a key pair and sends the encapsulation key. The other,
//! once it has it whole, encapsulates, knows the new epoch's key at once, and
//! sends the ciphertext, still sealing in epoch e, as the first side cannot
//! open epoch e + 1 before it has the ciphertext. The first side, once it has
//! it whole, decapsulates and seals in epoch e + 1 from then on, and waits for
//! the next key. The other, on the first message it opens in epoch e + 1,
//! seals in it too and makes the key pair for epoch e + 2.
//!
//! Epoch 0 has no key: a message key in it is the double ratchet's alone, as
//! from an Erevos before this.
//!
//! A conversation put back from a backup has lost the epochs after it, and
//! could never open what the other side seals in them. So it starts over, in
//! a later generation ([`Spqr::restart`]), and the other side, on the first
//! message of it that opens, starts over in it too. Not audited.

use std::collections::VecDeque;

use hkdf::Hkdf;
use ml_kem::{
    Ciphertext, Decapsulate, DecapsulationKey, Encapsulate, EncapsulationKey, Generate, KeyExport, MlKem768, Seed,
    TryKeyInit,
};
use sha2::Sha256;
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

use crate::pqxdh::{PQ_CIPHERTEXT_LEN, PQ_PUBLIC_LEN};
use crate::wire::{Reader, VERSION};
use crate::Error;

/// Bytes of a key in each piece: small enough that a text padded to 1,024
/// bytes still goes in 10 SMS (app/lib/sms-packets.ts) with the field.
pub const PIECE: usize = 96;

/// Epoch keys kept to open late messages: the newest and those before it.
pub const KEPT_EPOCHS: usize = 8;

const EPOCH_INFO: &[u8] = b"erevos spqr epoch v1";
const MESSAGE_INFO: &[u8] = b"erevos spqr message v1";

/// Bytes of what goes with each message ([`Outgoing::to_bytes`]): the
/// generation, the epoch, then a piece of a key padded to one length, so the
/// length of a message never tells what step its sender is at.
pub const FIELD: usize = 4 + 4 + PIECE_LEN;
const PIECE_LEN: usize = 1 + 4 + 1 + PIECE;

const NOTHING: u8 = 0;
const KEY_PIECE: u8 = 1;
const CIPHERTEXT_PIECE: u8 = 2;

#[derive(Clone, Zeroize, ZeroizeOnDrop)]
struct EpochKey([u8; 32]);

/// What one side is doing towards the next epoch.
#[derive(Clone)]
enum Step {
    /// Sends the encapsulation key of epoch `next` in pieces, holding its
    /// decapsulation key (as a seed), and gathers the ciphertext's.
    SendingKey { seed: Zeroizing<[u8; 64]>, key: Vec<u8>, at: usize, got: Pieces },
    /// Gathers the pieces of the encapsulation key of epoch `next`.
    AwaitingKey { got: Pieces },
    /// Has the key of epoch `next` and sends its ciphertext in pieces, till
    /// a message sealed in epoch `next` comes.
    SendingCiphertext { ciphertext: Vec<u8>, at: usize, key: EpochKey },
}

/// The pieces of one key gathered so far.
#[derive(Clone, Default)]
struct Pieces {
    parts: Vec<Option<Vec<u8>>>,
}

impl Pieces {
    fn new(total: usize) -> Self {
        Pieces { parts: vec![None; pieces_of(total)] }
    }

    fn put(&mut self, index: usize, data: &[u8], total: usize) -> Result<(), Error> {
        let want = piece(total, index).ok_or(Error::Malformed)?;
        if data.len() != want.len() {
            return Err(Error::Malformed);
        }
        self.parts[index] = Some(data.to_vec());
        Ok(())
    }

    fn whole(&self) -> Option<Vec<u8>> {
        let mut out = Vec::new();
        for p in &self.parts {
            out.extend_from_slice(p.as_ref()?);
        }
        Some(out)
    }
}

fn pieces_of(total: usize) -> usize {
    total.div_ceil(PIECE)
}

// Where piece `index` of a key `total` bytes long lies.
fn piece(total: usize, index: usize) -> Option<std::ops::Range<usize>> {
    let start = index.checked_mul(PIECE)?;
    (start < total).then(|| start..(start + PIECE).min(total))
}

/// One side's post-quantum ratchet in one conversation.
#[derive(Clone)]
pub struct Spqr {
    /// Which start this is: a later one begins when a side is put back from a
    /// backup.
    generation: u32,
    /// The epoch this side seals in.
    sending: u32,
    /// The epoch being made next: `sending` + 1.
    step: Step,
    /// The keys of the newest epochs known, newest last, with their numbers.
    keys: VecDeque<(u32, EpochKey)>,
}

/// What goes with one message: its generation, the epoch it was sealed in,
/// and a piece of a key for the next, as bytes for the associated data.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Outgoing {
    pub generation: u32,
    pub epoch: u32,
    pub piece: [u8; PIECE_LEN],
}

impl Outgoing {
    pub fn to_bytes(&self) -> [u8; FIELD] {
        let mut out = [0u8; FIELD];
        out[..4].copy_from_slice(&self.generation.to_be_bytes());
        out[4..8].copy_from_slice(&self.epoch.to_be_bytes());
        out[8..].copy_from_slice(&self.piece);
        out
    }

    /// Reads what came with a message; whether its piece makes sense is
    /// checked once the message has opened ([`Spqr::received`]).
    pub fn from_bytes(b: &[u8]) -> Result<Self, Error> {
        if b.len() != FIELD {
            return Err(Error::Malformed);
        }
        Ok(Outgoing {
            generation: u32::from_be_bytes(b[..4].try_into().unwrap()),
            epoch: u32::from_be_bytes(b[4..8].try_into().unwrap()),
            piece: b[8..].try_into().unwrap(),
        })
    }
}

impl Spqr {
    /// A side starting out, at epoch 0. The conversation's initiator sends the
    /// first key.
    pub fn new(initiator: bool) -> Self {
        Self::starting(initiator, 0)
    }

    /// A side starting out in `generation`.
    pub fn starting(initiator: bool, generation: u32) -> Self {
        let step = if initiator { sending_key() } else { Step::AwaitingKey { got: Pieces::new(PQ_PUBLIC_LEN) } };
        Spqr { generation, sending: 0, step, keys: VecDeque::from([(0, EpochKey([0; 32]))]) }
    }

    /// Starts over, put back from a backup, in a later generation than any
    /// the other side is likely to be in: one past this one by a chance
    /// number up to 65536, so two backups put back one after the other do
    /// not land in the same.
    pub fn restart(&mut self, initiator: bool) {
        use rand_core::{OsRng, RngCore};
        let jump = 1 + (OsRng.next_u32() & 0xffff);
        *self = Self::starting(initiator, self.generation.saturating_add(jump));
    }

    /// The generation this side is in.
    pub fn generation(&self) -> u32 {
        self.generation
    }

    /// The epoch this side seals in now.
    pub fn epoch(&self) -> u32 {
        self.sending
    }

    /// What goes with the next message, moving on to the next piece.
    pub fn outgoing(&mut self) -> Outgoing {
        let next = self.sending + 1;
        let piece = match &mut self.step {
            Step::SendingKey { key, at, .. } => {
                let p = encode(KEY_PIECE, next, *at, key);
                *at = (*at + 1) % pieces_of(key.len());
                p
            }
            Step::SendingCiphertext { ciphertext, at, .. } => {
                let p = encode(CIPHERTEXT_PIECE, next, *at, ciphertext);
                *at = (*at + 1) % pieces_of(ciphertext.len());
                p
            }
            Step::AwaitingKey { .. } => [0; PIECE_LEN],
        };
        Outgoing { generation: self.generation, epoch: self.sending, piece }
    }

    /// The key a message sealed in `epoch` was mixed with, if this side knows
    /// it: to try opening the message with, before `received`.
    pub fn key_for(&self, epoch: u32) -> Option<[u8; 32]> {
        if let Step::SendingCiphertext { key, .. } = &self.step {
            if epoch == self.sending + 1 {
                return Some(key.0);
            }
        }
        self.keys.iter().find(|(e, _)| *e == epoch).map(|(_, k)| k.0)
    }

    /// The key to open a message that came with `came`, and this side as it
    /// is to be once the message opens and [`Spqr::received`] takes it in:
    /// started over in the other side's generation, when that is later. A
    /// message of an earlier generation opens only from its epoch 0.
    pub fn opening(&self, came: &Outgoing, initiator: bool) -> Option<([u8; 32], Spqr)> {
        match came.generation.cmp(&self.generation) {
            std::cmp::Ordering::Equal => Some((self.key_for(came.epoch)?, self.clone())),
            std::cmp::Ordering::Greater => {
                let fresh = Self::starting(initiator, came.generation);
                Some((fresh.key_for(came.epoch)?, fresh))
            }
            std::cmp::Ordering::Less => (came.epoch == 0).then(|| ([0; 32], self.clone())),
        }
    }

    /// Takes in what came with a message that opened. What came in another
    /// generation changes nothing.
    pub fn received(&mut self, came: &Outgoing) -> Result<(), Error> {
        let (epoch, piece) = (came.epoch, &came.piece);
        let (kind, of, index, data) = decode(piece)?;
        if came.generation != self.generation {
            return Ok(());
        }
        let next = self.sending + 1;
        // The other side seals in the epoch this side made the ciphertext of:
        // it has it whole, and this side seals in it too and sends the next key.
        if epoch == next {
            if let Step::SendingCiphertext { key, .. } = &self.step {
                let key = key.clone();
                self.begin(next, key);
                self.step = sending_key();
            }
        }
        if kind == NOTHING || of != self.sending + 1 {
            return Ok(());
        }
        let next = self.sending + 1;
        match (&mut self.step, kind) {
            (Step::AwaitingKey { got }, KEY_PIECE) => {
                got.put(index, data, PQ_PUBLIC_LEN)?;
                let Some(whole) = got.whole() else { return Ok(()) };
                let ek = EncapsulationKey::<MlKem768>::new_from_slice(&whole).map_err(|_| Error::Malformed)?;
                let (ct, ss) = ek.encapsulate();
                let key = self.derive(next, ss.as_slice());
                self.step = Step::SendingCiphertext { ciphertext: ct.as_slice().to_vec(), at: 0, key };
            }
            (Step::SendingKey { seed, got, .. }, CIPHERTEXT_PIECE) => {
                got.put(index, data, PQ_CIPHERTEXT_LEN)?;
                let Some(whole) = got.whole() else { return Ok(()) };
                let dk = DecapsulationKey::<MlKem768>::from_seed(Seed::try_from(&seed[..]).map_err(|_| Error::Malformed)?);
                let ct = Ciphertext::<MlKem768>::try_from(whole.as_slice()).map_err(|_| Error::Malformed)?;
                let ss = dk.decapsulate(&ct);
                let key = self.derive(next, ss.as_slice());
                self.begin(next, key);
                self.step = Step::AwaitingKey { got: Pieces::new(PQ_PUBLIC_LEN) };
            }
            // A piece of a step this side is past, or not at yet: nothing to do.
            _ => {}
        }
        Ok(())
    }

    // The key of `epoch`, from the newest known and the new secret.
    fn derive(&self, epoch: u32, secret: &[u8]) -> EpochKey {
        let newest = &self.keys.back().expect("always one").1;
        let mut info = EPOCH_INFO.to_vec();
        info.extend_from_slice(&epoch.to_be_bytes());
        let mut out = [0u8; 32];
        Hkdf::<Sha256>::new(Some(&newest.0), secret)
            .expand(&info, &mut out)
            .expect("32 bytes is a valid hkdf length");
        EpochKey(out)
    }

    fn begin(&mut self, epoch: u32, key: EpochKey) {
        self.sending = epoch;
        self.keys.push_back((epoch, key));
        while self.keys.len() > KEPT_EPOCHS {
            self.keys.pop_front();
        }
    }

    /// Everything, to keep with the conversation.
    pub fn to_secret_bytes(&self) -> Zeroizing<Vec<u8>> {
        let mut out = Zeroizing::new(vec![VERSION]);
        out.extend_from_slice(&self.generation.to_be_bytes());
        out.extend_from_slice(&self.sending.to_be_bytes());
        out.push(self.keys.len() as u8);
        for (e, k) in &self.keys {
            out.extend_from_slice(&e.to_be_bytes());
            out.extend_from_slice(&k.0);
        }
        let put_pieces = |out: &mut Vec<u8>, p: &Pieces| {
            out.push(p.parts.len() as u8);
            for part in &p.parts {
                match part {
                    Some(d) => {
                        out.push(1);
                        out.extend_from_slice(d);
                    }
                    None => out.push(0),
                }
            }
        };
        match &self.step {
            Step::SendingKey { seed, at, got, .. } => {
                out.push(1);
                out.extend_from_slice(&seed[..]);
                out.push(*at as u8);
                put_pieces(&mut out, got);
            }
            Step::AwaitingKey { got } => {
                out.push(2);
                put_pieces(&mut out, got);
            }
            Step::SendingCiphertext { ciphertext, at, key } => {
                out.push(3);
                out.extend_from_slice(ciphertext);
                out.push(*at as u8);
                out.extend_from_slice(&key.0);
            }
        }
        out
    }

    pub fn from_secret_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let generation = r.u32()?;
        let sending = r.u32()?;
        let count = r.u8()? as usize;
        if count == 0 || count > KEPT_EPOCHS {
            return Err(Error::Malformed);
        }
        let mut keys = VecDeque::with_capacity(count);
        for _ in 0..count {
            let e = r.u32()?;
            if keys.back().is_some_and(|(last, _): &(u32, EpochKey)| e <= *last) {
                return Err(Error::Malformed);
            }
            keys.push_back((e, EpochKey(r.array::<32>()?)));
        }
        if keys.back().map(|(e, _)| *e) != Some(sending) {
            return Err(Error::Malformed);
        }
        let read_pieces = |r: &mut Reader, total: usize| -> Result<Pieces, Error> {
            let n = r.u8()? as usize;
            if n != pieces_of(total) {
                return Err(Error::Malformed);
            }
            let mut p = Pieces::new(total);
            for i in 0..n {
                match r.u8()? {
                    0 => {}
                    1 => {
                        let len = piece(total, i).ok_or(Error::Malformed)?.len();
                        p.parts[i] = Some(r.take(len)?.to_vec());
                    }
                    _ => return Err(Error::Malformed),
                }
            }
            Ok(p)
        };
        let step = match r.u8()? {
            1 => {
                let seed = Zeroizing::new(r.array::<64>()?);
                let dk = DecapsulationKey::<MlKem768>::from_seed(Seed::try_from(&seed[..]).map_err(|_| Error::Malformed)?);
                let key = dk.encapsulation_key().to_bytes().as_slice().to_vec();
                let at = r.u8()? as usize;
                if at >= pieces_of(PQ_PUBLIC_LEN) {
                    return Err(Error::Malformed);
                }
                Step::SendingKey { seed, key, at, got: read_pieces(&mut r, PQ_CIPHERTEXT_LEN)? }
            }
            2 => Step::AwaitingKey { got: read_pieces(&mut r, PQ_PUBLIC_LEN)? },
            3 => {
                let ciphertext = r.take(PQ_CIPHERTEXT_LEN)?.to_vec();
                let at = r.u8()? as usize;
                if at >= pieces_of(PQ_CIPHERTEXT_LEN) {
                    return Err(Error::Malformed);
                }
                Step::SendingCiphertext { ciphertext, at, key: EpochKey(r.array::<32>()?) }
            }
            _ => return Err(Error::Malformed),
        };
        r.finish()?;
        Ok(Spqr { generation, sending, step, keys })
    }
}

fn sending_key() -> Step {
    let dk = DecapsulationKey::<MlKem768>::generate();
    let seed = Zeroizing::new(dk.to_bytes().into());
    let key = dk.encapsulation_key().to_bytes().as_slice().to_vec();
    Step::SendingKey { seed, key, at: 0, got: Pieces::new(PQ_CIPHERTEXT_LEN) }
}

// kind, the epoch it is for (u32), the piece's index (u8), then its bytes,
// and zeros to the one length; nothing at all is all zeros.
fn encode(kind: u8, epoch: u32, index: usize, whole: &[u8]) -> [u8; PIECE_LEN] {
    let range = piece(whole.len(), index).expect("index within the key");
    let mut out = [0u8; PIECE_LEN];
    out[0] = kind;
    out[1..5].copy_from_slice(&epoch.to_be_bytes());
    out[5] = index as u8;
    out[6..6 + range.len()].copy_from_slice(&whole[range]);
    out
}

// The piece's bytes, as long as its key's piece at its index is: the zeros
// after them, and all of nothing, must be zeros, so a piece has one encoding.
fn decode(b: &[u8; PIECE_LEN]) -> Result<(u8, u32, usize, &[u8]), Error> {
    let (kind, total) = match b[0] {
        NOTHING => {
            return if b.iter().all(|x| *x == 0) { Ok((NOTHING, 0, 0, &[])) } else { Err(Error::Malformed) };
        }
        KEY_PIECE => (KEY_PIECE, PQ_PUBLIC_LEN),
        CIPHERTEXT_PIECE => (CIPHERTEXT_PIECE, PQ_CIPHERTEXT_LEN),
        _ => return Err(Error::Malformed),
    };
    let epoch = u32::from_be_bytes(b[1..5].try_into().unwrap());
    let index = b[5] as usize;
    let len = piece(total, index).ok_or(Error::Malformed)?.len();
    let (data, rest) = b[6..].split_at(len);
    if rest.iter().any(|x| *x != 0) {
        return Err(Error::Malformed);
    }
    Ok((kind, epoch, index, data))
}

/// A double-ratchet message key mixed with the key of the epoch it was sealed
/// in; epoch 0's leaves it as it is.
pub fn mix(message_key: &[u8; 32], epoch: u32, epoch_key: &[u8; 32]) -> [u8; 32] {
    if epoch == 0 {
        return *message_key;
    }
    let mut out = [0u8; 32];
    Hkdf::<Sha256>::new(Some(epoch_key), message_key)
        .expand(MESSAGE_INFO, &mut out)
        .expect("32 bytes is a valid hkdf length");
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    // Sends one message from `a` to `b`: the key `a` mixes with, and whether `b`
    // finds the same.
    fn send(a: &mut Spqr, b: &mut Spqr) -> (u32, bool) {
        let out = a.outgoing();
        let ours = a.key_for(out.epoch).unwrap();
        let theirs = b.key_for(out.epoch);
        let same = theirs == Some(ours);
        if same {
            b.received(&out).unwrap();
        }
        (out.epoch, same)
    }

    #[test]
    fn epochs_move_on_and_both_sides_agree() {
        let (mut a, mut b) = (Spqr::new(true), Spqr::new(false));
        for _ in 0..200 {
            assert!(send(&mut a, &mut b).1);
            assert!(send(&mut b, &mut a).1);
        }
        assert!(a.epoch() >= 8 && b.epoch() >= 8, "{} {}", a.epoch(), b.epoch());
        assert!(a.epoch().abs_diff(b.epoch()) <= 1);
    }

    #[test]
    fn one_side_writing_alone_waits_at_its_epoch() {
        let (mut a, mut b) = (Spqr::new(true), Spqr::new(false));
        for _ in 0..50 {
            assert_eq!(send(&mut a, &mut b), (0, true));
        }
        // B has the key whole and is ready, but seals in epoch 0 till A shows it has the ciphertext.
        assert!(matches!(b.step, Step::SendingCiphertext { .. }));
        for _ in 0..pieces_of(PQ_CIPHERTEXT_LEN) {
            assert_eq!(send(&mut b, &mut a), (0, true));
        }
        assert_eq!(a.epoch(), 1);
        assert_eq!(send(&mut a, &mut b), (1, true));
        assert_eq!(b.epoch(), 1);
    }

    #[test]
    fn lost_and_late_messages_still_open() {
        let (mut a, mut b) = (Spqr::new(true), Spqr::new(false));
        let mut late = Vec::new();
        // A fixed run of chances, the same each time: about a third lost, a fifth late.
        let mut seed = 0x2545_f491_u32;
        let mut roll = move || {
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            seed % 15
        };
        for _ in 0..500 {
            let out = a.outgoing();
            let key = a.key_for(out.epoch).unwrap();
            let chance = roll();
            if chance < 5 {
                continue;
            }
            if chance < 8 {
                late.push((out, key));
                continue;
            }
            assert_eq!(b.key_for(out.epoch), Some(key));
            b.received(&out).unwrap();
            let back = b.outgoing();
            if roll() >= 4 {
                assert_eq!(a.key_for(back.epoch), b.key_for(back.epoch));
                a.received(&back).unwrap();
            }
        }
        assert!(b.epoch() >= 3, "{}", b.epoch());
        // The latest late ones still open; their pieces are of steps passed, and change nothing.
        for (out, key) in late.iter().rev().take(KEPT_EPOCHS) {
            if let Some(k) = b.key_for(out.epoch) {
                assert_eq!(&k, key);
                b.received(out).unwrap();
            }
        }
    }

    #[test]
    fn the_state_survives_a_restart_at_every_step() {
        let (mut a, mut b) = (Spqr::new(true), Spqr::new(false));
        for _ in 0..60 {
            send(&mut a, &mut b);
            a = Spqr::from_secret_bytes(&a.to_secret_bytes()).unwrap();
            send(&mut b, &mut a);
            b = Spqr::from_secret_bytes(&b.to_secret_bytes()).unwrap();
        }
        assert!(a.epoch() >= 2);
        assert!(send(&mut a, &mut b).1);
        let bytes = a.to_secret_bytes();
        assert!(Spqr::from_secret_bytes(&bytes[..bytes.len() - 1]).is_err());
        let mut longer = bytes.to_vec();
        longer.push(0);
        assert!(Spqr::from_secret_bytes(&longer).is_err());
    }

    #[test]
    fn bad_pieces_are_refused_and_change_nothing() {
        let mut b = Spqr::new(false);
        let came = |piece| Outgoing { generation: 0, epoch: 0, piece };
        assert!(Outgoing::from_bytes(&[0; FIELD - 1]).is_err());
        assert!(b.received(&came(encode_raw(9, 0, 0, &[]))).is_err());
        let mut nothing_but = [0; PIECE_LEN];
        nothing_but[7] = 1;
        assert!(b.received(&came(nothing_but)).is_err());
        // An index past the key, and bytes past the end of the last piece.
        assert!(b.received(&came(encode_raw(KEY_PIECE, 1, 200, &[1; PIECE]))).is_err());
        assert!(b.received(&came(encode_raw(KEY_PIECE, 1, (pieces_of(PQ_PUBLIC_LEN) - 1) as u8, &[1; PIECE]))).is_err());
        // A piece for another epoch, or of another generation, is passed over.
        b.received(&came(encode_raw(KEY_PIECE, 7, 0, &[1; PIECE]))).unwrap();
        let mut other = came(encode_raw(KEY_PIECE, 1, 0, &[1; PIECE]));
        other.generation = 3;
        b.received(&other).unwrap();
        assert!(matches!(&b.step, Step::AwaitingKey { got } if got.parts.iter().all(Option::is_none)));
    }

    fn encode_raw(kind: u8, epoch: u32, index: u8, data: &[u8]) -> [u8; PIECE_LEN] {
        let mut out = [0; PIECE_LEN];
        out[0] = kind;
        out[1..5].copy_from_slice(&epoch.to_be_bytes());
        out[5] = index;
        out[6..6 + data.len()].copy_from_slice(data);
        out
    }

    #[test]
    fn what_goes_with_a_message_is_always_as_long() {
        let (mut a, mut b) = (Spqr::new(true), Spqr::new(false));
        for _ in 0..40 {
            for out in [a.outgoing(), b.outgoing()] {
                let bytes = out.to_bytes();
                assert_eq!(bytes.len(), FIELD);
                assert_eq!(Outgoing::from_bytes(&bytes).unwrap(), out);
            }
            send(&mut a, &mut b);
            send(&mut b, &mut a);
        }
    }

    #[test]
    fn a_side_put_back_from_a_backup_starts_over_with_the_other() {
        let (mut a, mut b) = (Spqr::new(true), Spqr::new(false));
        let backup = Spqr::from_secret_bytes(&a.to_secret_bytes()).unwrap();
        for _ in 0..100 {
            send(&mut a, &mut b);
            send(&mut b, &mut a);
        }
        assert!(b.epoch() >= 3);
        // The backup knows none of the epochs since: B's messages no longer open.
        let mut a = backup;
        let out = b.outgoing();
        assert!(a.opening(&out, true).is_none());
        // Put back, A starts over later; B follows on the first that opens.
        a.restart(true);
        assert!(a.generation() > 0);
        let out = a.outgoing();
        let (key, mut next) = b.opening(&out, false).unwrap();
        assert_eq!(key, a.key_for(out.epoch).unwrap());
        next.received(&out).unwrap();
        b = next;
        assert_eq!((b.generation(), b.epoch()), (a.generation(), 0));
        // A late message of the old generation opens only from its epoch 0.
        let old = Outgoing { generation: 0, epoch: 2, piece: [0; PIECE_LEN] };
        assert!(b.opening(&old, false).is_none());
        let old = Outgoing { generation: 0, epoch: 0, piece: encode_raw(KEY_PIECE, 1, 0, &[1; PIECE]) };
        let (key, mut next) = b.opening(&old, false).unwrap();
        assert_eq!(key, [0; 32]);
        next.received(&old).unwrap();
        assert_eq!(next.to_secret_bytes(), b.to_secret_bytes());
        // And the epochs move on again.
        for _ in 0..100 {
            assert!(open_both(&mut a, &mut b, false));
            assert!(open_both(&mut b, &mut a, true));
        }
        assert!(a.epoch() >= 3);
    }

    // Sends one message from `a` to `b` the way a conversation does.
    fn open_both(a: &mut Spqr, b: &mut Spqr, b_initiator: bool) -> bool {
        let out = a.outgoing();
        let ours = a.key_for(out.epoch).unwrap();
        let Some((theirs, mut next)) = b.opening(&out, b_initiator) else { return false };
        if theirs != ours {
            return false;
        }
        next.received(&out).unwrap();
        *b = next;
        true
    }

    #[test]
    fn epoch_zero_leaves_the_message_key_alone() {
        let mk = [5u8; 32];
        assert_eq!(mix(&mk, 0, &[1; 32]), mk);
        assert_ne!(mix(&mk, 1, &[1; 32]), mk);
        assert_ne!(mix(&mk, 1, &[1; 32]), mix(&mk, 1, &[2; 32]));
    }
}
