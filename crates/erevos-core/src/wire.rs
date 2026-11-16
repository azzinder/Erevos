// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Byte encodings for prekey bundles, handshake messages and mesh packets, so
//! they can cross a relay or a radio link.
//!
//! Every message starts with a version byte. Fields are fixed-size, except a
//! packet body, which carries a 4-byte length. Decoding rejects an unknown
//! version, a truncated field and trailing bytes, so there is one valid
//! encoding per message.

use x25519_dalek::PublicKey;

use crate::mesh::Packet;
use crate::pqxdh::{InitialMessage, OneTimePrekey, PrekeyBundle, PQ_CIPHERTEXT_LEN, PQ_PUBLIC_LEN};
use crate::Error;

pub(crate) const VERSION: u8 = 1;
/// Largest packet body, the top padding bucket.
const MAX_BODY: usize = 16384;

pub(crate) struct Reader<'a> {
    buf: &'a [u8],
}

impl<'a> Reader<'a> {
    pub(crate) fn new(buf: &'a [u8]) -> Result<Self, Error> {
        let mut r = Reader { buf };
        if r.u8()? != VERSION {
            return Err(Error::Malformed);
        }
        Ok(r)
    }

    pub(crate) fn take(&mut self, n: usize) -> Result<&'a [u8], Error> {
        if self.buf.len() < n {
            return Err(Error::Malformed);
        }
        let (head, rest) = self.buf.split_at(n);
        self.buf = rest;
        Ok(head)
    }

    pub(crate) fn u8(&mut self) -> Result<u8, Error> {
        Ok(self.take(1)?[0])
    }

    pub(crate) fn u32(&mut self) -> Result<u32, Error> {
        let b = self.take(4)?;
        Ok(u32::from_be_bytes(b.try_into().map_err(|_| Error::Malformed)?))
    }

    pub(crate) fn array<const N: usize>(&mut self) -> Result<[u8; N], Error> {
        let mut out = [0u8; N];
        out.copy_from_slice(self.take(N)?);
        Ok(out)
    }

    /// Everything left, for a field that runs to the end.
    /// The next byte, left unread.
    pub(crate) fn peek(&self) -> Option<u8> {
        self.buf.first().copied()
    }

    pub(crate) fn rest(self) -> &'a [u8] {
        self.buf
    }

    pub(crate) fn finish(self) -> Result<(), Error> {
        if self.buf.is_empty() {
            Ok(())
        } else {
            Err(Error::Malformed)
        }
    }
}

fn put_one_time(out: &mut Vec<u8>, one_time: Option<(u32, &PublicKey)>) {
    match one_time {
        Some((id, public)) => {
            out.push(1);
            out.extend_from_slice(&id.to_be_bytes());
            out.extend_from_slice(public.as_bytes());
        }
        None => out.push(0),
    }
}

fn read_one_time(r: &mut Reader) -> Result<Option<(u32, PublicKey)>, Error> {
    match r.u8()? {
        0 => Ok(None),
        1 => {
            let id = r.u32()?;
            let public = PublicKey::from(r.array::<32>()?);
            Ok(Some((id, public)))
        }
        _ => Err(Error::Malformed),
    }
}

impl PrekeyBundle {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = vec![VERSION];
        out.extend_from_slice(&self.identity_verify);
        out.extend_from_slice(self.identity_dh.as_bytes());
        out.extend_from_slice(self.signed_prekey.as_bytes());
        out.extend_from_slice(&self.pq_prekey);
        put_one_time(
            &mut out,
            self.one_time.as_ref().map(|o: &OneTimePrekey| (o.id, &o.public)),
        );
        out.extend_from_slice(&self.signature);
        out
    }

    pub fn from_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let identity_verify = r.array::<32>()?;
        let identity_dh = PublicKey::from(r.array::<32>()?);
        let signed_prekey = PublicKey::from(r.array::<32>()?);
        let pq_prekey = r.take(PQ_PUBLIC_LEN)?.to_vec();
        let one_time = read_one_time(&mut r)?.map(|(id, public)| OneTimePrekey { id, public });
        let signature = r.array::<64>()?;
        r.finish()?;
        Ok(PrekeyBundle {
            identity_verify,
            identity_dh,
            signed_prekey,
            pq_prekey,
            one_time,
            signature,
        })
    }
}

impl InitialMessage {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = vec![VERSION];
        out.extend_from_slice(self.identity_dh.as_bytes());
        out.extend_from_slice(self.ephemeral.as_bytes());
        out.extend_from_slice(&self.pq_ciphertext);
        match self.one_time_id {
            Some(id) => {
                out.push(1);
                out.extend_from_slice(&id.to_be_bytes());
            }
            None => out.push(0),
        }
        out
    }

    pub fn from_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let identity_dh = PublicKey::from(r.array::<32>()?);
        let ephemeral = PublicKey::from(r.array::<32>()?);
        let pq_ciphertext = r.take(PQ_CIPHERTEXT_LEN)?.to_vec();
        let one_time_id = match r.u8()? {
            0 => None,
            1 => Some(r.u32()?),
            _ => return Err(Error::Malformed),
        };
        r.finish()?;
        Ok(InitialMessage {
            identity_dh,
            ephemeral,
            pq_ciphertext,
            one_time_id,
        })
    }
}

impl Packet {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = vec![VERSION];
        out.extend_from_slice(&self.id);
        out.extend_from_slice(&self.tag);
        out.push(self.ttl);
        out.extend_from_slice(&(self.body.len() as u32).to_be_bytes());
        out.extend_from_slice(&self.body);
        out
    }

    pub fn from_bytes(buf: &[u8]) -> Result<Self, Error> {
        let mut r = Reader::new(buf)?;
        let id = r.array::<16>()?;
        let tag = r.array::<16>()?;
        let ttl = r.u8()?;
        let len = r.u32()? as usize;
        if len > MAX_BODY {
            return Err(Error::Malformed);
        }
        let body = r.take(len)?.to_vec();
        r.finish()?;
        Ok(Packet { id, tag, ttl, body })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mesh::TagKey;
    use crate::pqxdh::{self, Identity, Prekeys};

    #[test]
    fn bundle_roundtrip_and_still_verifies() {
        let id = Identity::generate();
        let (_, bundles) = Prekeys::generate(&id, 2);
        let bytes = bundles[1].to_bytes();
        let back = PrekeyBundle::from_bytes(&bytes).unwrap();
        assert_eq!(back.to_bytes(), bytes);
        // The signature covers the encoded fields, so a decoded bundle still
        // starts a session.
        pqxdh::initiate(&Identity::generate(), &back).unwrap();
    }

    #[test]
    fn initial_message_roundtrip() {
        let alice = Identity::generate();
        let (_, bundles) = Prekeys::generate(&Identity::generate(), 1);
        let (_, msg) = pqxdh::initiate(&alice, &bundles[0]).unwrap();
        let bytes = msg.to_bytes();
        assert_eq!(InitialMessage::from_bytes(&bytes).unwrap().to_bytes(), bytes);
        assert_eq!(bytes.len(), 1 + 32 + 32 + PQ_CIPHERTEXT_LEN + 1 + 4);
    }

    #[test]
    fn packet_roundtrip() {
        let packet = Packet::new(TagKey::derive(&[4; 32]).tag(1), b"payload").unwrap();
        let bytes = packet.to_bytes();
        assert_eq!(Packet::from_bytes(&bytes).unwrap(), packet);
    }

    #[test]
    fn rejects_bad_framing() {
        let packet = Packet::new([1; 16], b"x").unwrap().to_bytes();
        let mut wrong_version = packet.clone();
        wrong_version[0] = 9;
        assert!(Packet::from_bytes(&wrong_version).is_err());
        assert!(Packet::from_bytes(&packet[..packet.len() - 1]).is_err());
        let mut trailing = packet.clone();
        trailing.push(0);
        assert!(Packet::from_bytes(&trailing).is_err());
    }

    #[test]
    fn rejects_oversized_body_length() {
        let mut bytes = Packet::new([1; 16], b"x").unwrap().to_bytes();
        let len_at = 1 + 16 + 16 + 1;
        bytes[len_at..len_at + 4].copy_from_slice(&((MAX_BODY as u32) + 1).to_be_bytes());
        assert!(Packet::from_bytes(&bytes).is_err());
    }
}
