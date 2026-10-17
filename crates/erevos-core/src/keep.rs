//! Encodings for the secrets a device keeps between launches: its identity,
//! its prekeys and its sessions. They are key material: an app seals them in
//! its own encrypted storage and never sends them anywhere.
//!
//! The rules are the ones in wire.rs: a version byte, fixed-size fields and
//! one valid encoding per value, so a damaged store fails to load instead of
//! loading wrong keys.

use std::collections::{HashMap, HashSet, VecDeque};

use ed25519_dalek::SigningKey;
use ml_kem::{DecapsulationKey, KeyExport, MlKem768, Seed};
use x25519_dalek::{PublicKey, StaticSecret};
use zeroize::Zeroizing;

use crate::pqxdh::{Identity, Prekeys};
use crate::ratchet::{ChainKey, MessageKey, Session, MAX_STORED_SKIPPED};
use crate::wire::{Reader, VERSION};
use crate::Error;

/// Bytes an encoded identity takes.
pub const IDENTITY_LEN: usize = 1 + 32 + 32;

impl Identity {
    /// The Ed25519 seed, then the X25519 secret.
    pub fn to_secret_bytes(&self) -> Zeroizing<Vec<u8>> {
        let mut out = Zeroizing::new(Vec::with_capacity(IDENTITY_LEN));
        out.push(VERSION);
        out.extend_from_slice(&Zeroizing::new(self.signing.to_bytes())[..]);
        out.extend_from_slice(&Zeroizing::new(self.dh.to_bytes())[..]);
        out
    }

    pub fn from_secret_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let signing = SigningKey::from_bytes(&Zeroizing::new(r.array::<32>()?));
        let dh = StaticSecret::from(*Zeroizing::new(r.array::<32>()?));
        r.finish()?;
        Ok(Identity { signing, dh })
    }
}

impl Prekeys {
    /// The signed prekey, the ML-KEM seed, then each one-time prekey by id.
    pub fn to_secret_bytes(&self) -> Zeroizing<Vec<u8>> {
        let mut out = Zeroizing::new(Vec::with_capacity(1 + 32 + 64 + 4 + self.one_time.len() * 36));
        out.push(VERSION);
        out.extend_from_slice(&Zeroizing::new(self.signed.to_bytes())[..]);
        let seed: Zeroizing<[u8; 64]> = Zeroizing::new(self.pq.to_bytes().into());
        out.extend_from_slice(&seed[..]);
        let mut ids: Vec<u32> = self.one_time.keys().copied().collect();
        ids.sort_unstable();
        out.extend_from_slice(&(ids.len() as u32).to_be_bytes());
        for id in ids {
            out.extend_from_slice(&id.to_be_bytes());
            out.extend_from_slice(&Zeroizing::new(self.one_time[&id].to_bytes())[..]);
        }
        out
    }

    pub fn from_secret_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let signed = StaticSecret::from(*Zeroizing::new(r.array::<32>()?));
        let pq = DecapsulationKey::<MlKem768>::from_seed(Seed::try_from(r.take(64)?).map_err(|_| Error::Malformed)?);
        let count = r.u32()?;
        let mut one_time = HashMap::new();
        let mut last = None;
        for _ in 0..count {
            let id = r.u32()?;
            // Ids are written in rising order, once each.
            if last.is_some_and(|l| id <= l) {
                return Err(Error::Malformed);
            }
            last = Some(id);
            one_time.insert(id, StaticSecret::from(*Zeroizing::new(r.array::<32>()?)));
        }
        r.finish()?;
        Ok(Prekeys { signed, pq, one_time })
    }
}

fn put_key(out: &mut Vec<u8>, key: Option<&ChainKey>) {
    match key {
        Some(k) => {
            out.push(1);
            out.extend_from_slice(&k.0);
        }
        None => out.push(0),
    }
}

fn read_key(r: &mut Reader) -> Result<Option<ChainKey>, Error> {
    match r.u8()? {
        0 => Ok(None),
        1 => Ok(Some(ChainKey(r.array::<32>()?))),
        _ => Err(Error::Malformed),
    }
}

impl Session {
    /// Every ratchet key and counter, then the skipped message keys, oldest
    /// first.
    pub fn to_secret_bytes(&self) -> Zeroizing<Vec<u8>> {
        let mut out = Zeroizing::new(Vec::with_capacity(200 + self.skipped_order.len() * 68));
        out.push(VERSION);
        out.extend_from_slice(&Zeroizing::new(self.dhs.to_bytes())[..]);
        match &self.dhr {
            Some(k) => {
                out.push(1);
                out.extend_from_slice(k.as_bytes());
            }
            None => out.push(0),
        }
        out.extend_from_slice(&self.rk.0);
        put_key(&mut out, self.cks.as_ref());
        put_key(&mut out, self.ckr.as_ref());
        for n in [self.ns, self.nr, self.pn] {
            out.extend_from_slice(&n.to_be_bytes());
        }
        out.extend_from_slice(&(self.skipped_order.len() as u32).to_be_bytes());
        for key in &self.skipped_order {
            out.extend_from_slice(&key.0);
            out.extend_from_slice(&key.1.to_be_bytes());
            out.extend_from_slice(&self.skipped[key].0);
        }
        out
    }

    pub fn from_secret_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let dhs = StaticSecret::from(*Zeroizing::new(r.array::<32>()?));
        let dhr = match r.u8()? {
            0 => None,
            1 => Some(PublicKey::from(r.array::<32>()?)),
            _ => return Err(Error::Malformed),
        };
        let rk = ChainKey(r.array::<32>()?);
        let cks = read_key(&mut r)?;
        let ckr = read_key(&mut r)?;
        let (ns, nr, pn) = (r.u32()?, r.u32()?, r.u32()?);
        let count = r.u32()? as usize;
        if count > MAX_STORED_SKIPPED {
            return Err(Error::Malformed);
        }
        let mut skipped = HashMap::with_capacity(count);
        let mut skipped_order = VecDeque::with_capacity(count);
        let mut seen = HashSet::with_capacity(count);
        for _ in 0..count {
            let key = (r.array::<32>()?, r.u32()?);
            if !seen.insert(key) {
                return Err(Error::Malformed);
            }
            skipped.insert(key, MessageKey(r.array::<32>()?));
            skipped_order.push_back(key);
        }
        r.finish()?;
        Ok(Session {
            dhs,
            dhr,
            rk,
            cks,
            ckr,
            ns,
            nr,
            pn,
            skipped,
            skipped_order,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pqxdh;

    #[test]
    fn identity_and_prekeys_survive_a_restart() {
        let id = Identity::generate();
        let (keys, bundles) = Prekeys::generate(&id, 3);
        let id2 = Identity::from_secret_bytes(&id.to_secret_bytes()).unwrap();
        let mut keys2 = Prekeys::from_secret_bytes(&keys.to_secret_bytes()).unwrap();
        assert_eq!(id2.to_secret_bytes(), id.to_secret_bytes());
        assert_eq!(keys2.to_secret_bytes(), keys.to_secret_bytes());
        assert_eq!(keys2.one_time_left(), 3);

        // The reloaded keys still answer a handshake made against the old bundle.
        let alice = Identity::generate();
        let (mut a, first) = pqxdh::initiate(&alice, &bundles[2]).unwrap();
        let mut b = pqxdh::respond(&id2, &mut keys2, &first).unwrap();
        let (h, c) = a.encrypt(b"after restart", b"ad").unwrap();
        assert_eq!(b.decrypt(&h, &c, b"ad").unwrap(), b"after restart");
        assert_eq!(keys2.one_time_left(), 2);
    }

    #[test]
    fn a_session_carries_on_after_a_restart() {
        let alice = Identity::generate();
        let bob = Identity::generate();
        let (mut bob_keys, bundles) = Prekeys::generate(&bob, 0);
        let (mut a, first) = pqxdh::initiate(&alice, &bundles[0]).unwrap();
        let mut b = pqxdh::respond(&bob, &mut bob_keys, &first).unwrap();

        // Leave a gap so the session holds skipped keys, then reload both sides.
        let late = a.encrypt(b"late", b"ad").unwrap();
        let (h, c) = a.encrypt(b"first to arrive", b"ad").unwrap();
        assert_eq!(b.decrypt(&h, &c, b"ad").unwrap(), b"first to arrive");
        let mut a = Session::from_secret_bytes(&a.to_secret_bytes()).unwrap();
        let mut b = Session::from_secret_bytes(&b.to_secret_bytes()).unwrap();
        assert_eq!(b.skipped.len(), 1);
        assert_eq!(b.decrypt(&late.0, &late.1, b"ad").unwrap(), b"late");

        let (h, c) = b.encrypt(b"reply", b"ad").unwrap();
        assert_eq!(a.decrypt(&h, &c, b"ad").unwrap(), b"reply");
    }

    #[test]
    fn damaged_secrets_do_not_load() {
        let id = Identity::generate();
        let bytes = id.to_secret_bytes();
        assert!(Identity::from_secret_bytes(&bytes[..bytes.len() - 1]).is_err());
        let mut longer = bytes.to_vec();
        longer.push(0);
        assert!(Identity::from_secret_bytes(&longer).is_err());
        let mut wrong_version = bytes.to_vec();
        wrong_version[0] = 9;
        assert!(Identity::from_secret_bytes(&wrong_version).is_err());

        let (keys, _) = Prekeys::generate(&id, 2);
        let mut swapped = keys.to_secret_bytes().to_vec();
        // Make the second one-time id equal to the first.
        let first_id = 1 + 32 + 64 + 4;
        let second_id = first_id + 4 + 32;
        let copy = swapped[first_id..first_id + 4].to_vec();
        swapped[second_id..second_id + 4].copy_from_slice(&copy);
        assert!(Prekeys::from_secret_bytes(&swapped).is_err());
    }
}
