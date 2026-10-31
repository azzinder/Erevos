// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Store-and-forward for phones that are not online: packets flood between
//! nearby devices over Bluetooth LE or Wi-Fi Aware until they reach the
//! recipient or expire.
//!
//! Knit (github.com/getknit/knit) shows that this works, but it has three
//! weaknesses this module avoids:
//!
//! - Direct messages flood to every device in range. Here a packet carries a
//!   routing tag that only the two session holders can compute, so a relay
//!   cannot tell whose packet it is carrying. Only the tag is in the clear.
//! - Long-term keys with no ratchet. Here the body is a double-ratchet
//!   message, so a stolen key does not expose old traffic.
//! - Message sizes leak. Here every body is padded to a fixed bucket.
//!
//! The mesh only moves opaque bytes. It knows nothing about identities.
//!
//! Not audited.

use std::collections::HashMap;

use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use rand_core::{OsRng, RngCore};
use sha2::Sha256;
use zeroize::Zeroize;

use crate::padding::{self, BUCKETS};
use crate::Error;

type HmacSha256 = Hmac<Sha256>;

/// Hops a packet may take. Knit uses a similar limit.
pub const MAX_TTL: u8 = 8;
/// How long a relay keeps a packet, in seconds: three days.
pub const LIFETIME_SECS: u64 = 3 * 24 * 60 * 60;
const DAY_SECS: u64 = 24 * 60 * 60;
/// Packets one device holds at once. Full means it refuses new ones.
pub const MAX_PACKETS: usize = 4096;

pub type PacketId = [u8; 16];
pub type Tag = [u8; 16];

/// Derives per-day routing tags from a session's shared secret. Only someone
/// holding the secret can match a tag to a session.
pub struct TagKey([u8; 32]);

impl TagKey {
    pub fn derive(shared_secret: &[u8; 32]) -> Self {
        let mut out = [0u8; 32];
        Hkdf::<Sha256>::new(None, shared_secret)
            .expand(b"erevos mesh tag key v1", &mut out)
            .expect("32 bytes is a valid hkdf length");
        TagKey(out)
    }

    /// The tag for the day that contains `day` (days since the Unix epoch).
    pub fn tag(&self, day: u64) -> Tag {
        let mut mac = <HmacSha256 as Mac>::new_from_slice(&self.0).expect("hmac takes any key length");
        mac.update(b"erevos mesh tag v1");
        mac.update(&day.to_be_bytes());
        let full = mac.finalize().into_bytes();
        let mut tag = [0u8; 16];
        tag.copy_from_slice(&full[..16]);
        tag
    }

    /// Tags to watch for at `now`: the days a packet can still be carried
    /// from, and tomorrow, for a sender whose clock runs ahead of ours.
    pub fn watch(&self, now: u64) -> Vec<Tag> {
        let today = now / DAY_SECS;
        let oldest = today.saturating_sub(LIFETIME_SECS / DAY_SECS);
        (oldest..=today + 1).map(|d| self.tag(d)).collect()
    }
}

impl Drop for TagKey {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

/// One packet on the air. Its body is already padded.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Packet {
    pub id: PacketId,
    pub tag: Tag,
    pub ttl: u8,
    pub body: Vec<u8>,
}

impl Packet {
    /// Wraps an encrypted payload for `tag`, padded to a bucket. The sender
    /// picks a random id, so relays can drop duplicates.
    pub fn new(tag: Tag, payload: &[u8]) -> Result<Self, Error> {
        let mut id = [0u8; 16];
        OsRng.fill_bytes(&mut id);
        Ok(Packet {
            id,
            tag,
            ttl: MAX_TTL,
            body: padding::pad(payload)?,
        })
    }

    /// The copy a relay sends on. `None` once the hop limit is reached.
    pub fn relayed(&self) -> Option<Packet> {
        (self.ttl > 1).then(|| Packet {
            ttl: self.ttl - 1,
            ..self.clone()
        })
    }
}

struct Held {
    expires: u64,
    packet: Packet,
}

/// Packets this device carries, for itself or for others.
pub struct Store {
    capacity: usize,
    seen: HashMap<PacketId, u64>,
    held: Vec<Held>,
}

impl Default for Store {
    fn default() -> Self {
        Self::with_capacity(MAX_PACKETS)
    }
}

impl Store {
    pub fn with_capacity(capacity: usize) -> Self {
        Store {
            capacity,
            seen: HashMap::new(),
            held: Vec::new(),
        }
    }

    /// Takes a packet from the air. Returns `false` for one already seen.
    pub fn accept(&mut self, packet: Packet, now: u64) -> Result<bool, Error> {
        if !BUCKETS.contains(&packet.body.len()) || packet.ttl == 0 {
            return Err(Error::Malformed);
        }
        self.expire(now);
        if self.seen.contains_key(&packet.id) {
            return Ok(false);
        }
        if self.held.len() >= self.capacity {
            return Err(Error::Full);
        }
        let expires = now + LIFETIME_SECS;
        self.seen.insert(packet.id, expires);
        self.held.push(Held { expires, packet });
        Ok(true)
    }

    /// Removes and returns the packets addressed to `tags`.
    pub fn take(&mut self, tags: &[Tag]) -> Vec<Packet> {
        let (mine, rest): (Vec<Held>, Vec<Held>) = std::mem::take(&mut self.held)
            .into_iter()
            .partition(|h| tags.contains(&h.packet.tag));
        self.held = rest;
        mine.into_iter().map(|h| h.packet).collect()
    }

    /// Packets to offer to neighbours, each with its hop count already
    /// reduced.
    pub fn to_relay(&self) -> Vec<Packet> {
        self.held.iter().filter_map(|h| h.packet.relayed()).collect()
    }

    /// Drops packets past their lifetime.
    pub fn expire(&mut self, now: u64) {
        self.held.retain(|h| h.expires > now);
        self.seen.retain(|_, expires| *expires > now);
    }

    pub fn len(&self) -> usize {
        self.held.len()
    }

    pub fn is_empty(&self) -> bool {
        self.held.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ratchet::{Header, Session};
    use x25519_dalek::{PublicKey, StaticSecret};

    const NOW: u64 = 1_700_000_000;
    const AD: &[u8] = b"alice|bob";

    #[test]
    fn only_the_session_key_matches_its_tag() {
        let a = TagKey::derive(&[1; 32]);
        let b = TagKey::derive(&[2; 32]);
        assert!(a.watch(NOW).contains(&a.tag(NOW / DAY_SECS)));
        assert!(!b.watch(NOW).contains(&a.tag(NOW / DAY_SECS)));
    }

    #[test]
    fn watch_covers_the_packet_lifetime() {
        let k = TagKey::derive(&[3; 32]);
        let sent_day = NOW / DAY_SECS;
        let later = NOW + LIFETIME_SECS;
        assert!(k.watch(later).contains(&k.tag(sent_day)));
    }

    #[test]
    fn watch_allows_a_sender_clock_ahead_past_midnight() {
        let k = TagKey::derive(&[3; 32]);
        let today = NOW / DAY_SECS;
        assert!(k.watch(NOW).contains(&k.tag(today + 1)));
        assert!(!k.watch(NOW).contains(&k.tag(today + 2)));
    }

    #[test]
    fn duplicates_are_dropped() {
        let mut s = Store::default();
        let p = Packet::new([7; 16], b"hi").unwrap();
        assert!(s.accept(p.clone(), NOW).unwrap());
        assert!(!s.accept(p, NOW).unwrap());
        assert_eq!(s.len(), 1);
    }

    #[test]
    fn ttl_runs_out() {
        let mut p = Packet::new([7; 16], b"hi").unwrap();
        p.ttl = 1;
        assert!(p.relayed().is_none());
        let mut s = Store::default();
        assert!(matches!(s.accept(Packet { ttl: 0, ..p.clone() }, NOW), Err(Error::Malformed)));
        s.accept(p, NOW).unwrap();
        assert!(s.to_relay().is_empty());
    }

    #[test]
    fn relay_copies_lower_the_hop_count() {
        let p = Packet::new([7; 16], b"hi").unwrap();
        assert_eq!(p.relayed().unwrap().ttl, MAX_TTL - 1);
    }

    #[test]
    fn rejects_bodies_that_are_not_a_bucket() {
        let mut p = Packet::new([7; 16], b"hi").unwrap();
        p.body.truncate(100);
        assert!(matches!(Store::default().accept(p, NOW), Err(Error::Malformed)));
    }

    #[test]
    fn full_store_refuses_new_packets() {
        let mut s = Store::with_capacity(1);
        s.accept(Packet::new([7; 16], b"a").unwrap(), NOW).unwrap();
        let err = s.accept(Packet::new([7; 16], b"b").unwrap(), NOW);
        assert!(matches!(err, Err(Error::Full)));
    }

    #[test]
    fn expired_packets_are_gone() {
        let mut s = Store::default();
        s.accept(Packet::new([7; 16], b"a").unwrap(), NOW).unwrap();
        s.expire(NOW + LIFETIME_SECS);
        assert!(s.is_empty());
    }

    #[test]
    fn ratchet_message_crosses_the_mesh_to_its_recipient() {
        let shared = [9u8; 32];
        let bob_ratchet = StaticSecret::random_from_rng(OsRng);
        let mut alice = Session::initiator(shared, PublicKey::from(&bob_ratchet));
        let mut bob = Session::responder(shared, bob_ratchet);
        let tags_a = TagKey::derive(&shared);
        let tags_b = TagKey::derive(&shared);

        let (header, ct) = alice.encrypt(b"hello over the air", AD).unwrap();
        let mut payload = header.to_bytes().to_vec();
        payload.extend_from_slice(&ct);
        let packet = Packet::new(tags_a.tag(NOW / DAY_SECS), &payload).unwrap();

        // A relay between the two phones holds the packet and cannot read it.
        let mut relay = Store::default();
        relay.accept(packet, NOW).unwrap();
        let on_air = relay.to_relay().pop().unwrap();

        let mut phone = Store::default();
        phone.accept(on_air, NOW).unwrap();
        let mine = phone.take(&tags_b.watch(NOW));
        assert_eq!(mine.len(), 1);

        let body = padding::unpad(&mine[0].body).unwrap();
        let header = Header::from_bytes(&body[..Header::LEN]).unwrap();
        let text = bob.decrypt(&header, &body[Header::LEN..], AD).unwrap();
        assert_eq!(text, b"hello over the air");
        assert!(phone.is_empty());
    }
}
