// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! No packet that comes in makes the core panic, whatever its bytes: every call that reads what
//! another phone, a relay or a file sent is given random bytes, and good packets cut short, grown,
//! or with bits turned, and must answer, with an error or not, without a panic. On the web and the
//! computer (wasm32, where a panic cannot be caught) a panic stops the core until it is set up
//! again (app/lib/crypto-setup.ts). A fixed seed, so a failure shows again the same way.

use super::*;
use std::panic::{catch_unwind, AssertUnwindSafe};

fn split(bytes: &[u8]) -> Vec<Vec<u8>> {
    let mut out = Vec::new();
    let mut rest = bytes;
    while !rest.is_empty() {
        let len = u32::from_be_bytes(rest[..4].try_into().unwrap()) as usize;
        out.push(rest[4..4 + len].to_vec());
        rest = &rest[4 + len..];
    }
    out
}

struct Dice(u64);

impl Dice {
    fn next(&mut self) -> u64 {
        // xorshift64*
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        self.0.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n.max(1) as u64) as usize
    }
    fn bytes(&mut self, len: usize) -> Vec<u8> {
        (0..len).map(|_| self.next() as u8).collect()
    }
    /// Random bytes, or `good` cut short, grown, with bytes turned, or with a length field made huge.
    fn spoil(&mut self, good: &[u8]) -> Vec<u8> {
        let mut bytes = good.to_vec();
        match self.below(7) {
            0 => {
                let len = [0, 1, 2, 3, 4, 5, 8, 16, 31, 32, 33, 64, 100, 300, 1000][self.below(15)];
                self.bytes(len)
            }
            1 => {
                bytes.truncate(self.below(bytes.len() + 1));
                bytes
            }
            2 => {
                let more = self.below(64) + 1;
                bytes.extend(self.bytes(more));
                bytes
            }
            3 | 4 => {
                for _ in 0..self.below(4) + 1 {
                    if bytes.is_empty() {
                        break;
                    }
                    let at = self.below(bytes.len());
                    bytes[at] ^= 1 << self.below(8);
                }
                bytes
            }
            5 => {
                if bytes.len() >= 4 {
                    let at = self.below(bytes.len() - 3);
                    let big = [0xff, 0xff, 0xff, 0xff];
                    bytes[at..at + 4].copy_from_slice(&big);
                }
                bytes
            }
            _ => {
                if !bytes.is_empty() {
                    let at = self.below(bytes.len());
                    bytes[at] = [0, 0xff, 0x7f, 0x80][self.below(4)];
                }
                bytes
            }
        }
    }
}

// How many spoiled copies each call is given: EREVOS_NO_PANIC_ROUNDS for a longer search.
fn rounds() -> usize {
    std::env::var("EREVOS_NO_PANIC_ROUNDS").ok().and_then(|n| n.parse().ok()).unwrap_or(400)
}

/// Gives `call` rounds() spoiled copies of `good`; a panic fails with the bytes that made it.
fn never_panics(name: &str, good: &[u8], seed: u64, call: impl Fn(&[u8])) {
    let mut dice = Dice(seed | 1);
    for _ in 0..rounds() {
        let bytes = dice.spoil(good);
        if catch_unwind(AssertUnwindSafe(|| call(&bytes))).is_err() {
            panic!("{name} panicked on {} bytes: {:02x?}", bytes.len(), &bytes[..bytes.len().min(96)]);
        }
    }
}

#[test]
fn packets_between_two_people_never_panic() {
    let alice = account_new();
    let bob = account_new();
    let link = account_bundle(&bob).unwrap();
    let started = split(&conversation_start(&alice, &link, b"hello").unwrap());
    let accepted = split(&conversation_accept(&bob, &started[1]).unwrap());
    let reply = split(&conversation_seal(&accepted[0], b"hi").unwrap());
    let made = split(&account_prekeys(&bob).unwrap());
    let kept = parts(&[&made[0]]);
    let signature = account_sign(&alice, b"devices", b"list").unwrap();
    let bound = account_bind(&alice).unwrap();
    let alice_link = account_bundle(&alice).unwrap();

    never_panics("bundle_identity", &link, 1, |b| drop(bundle_identity(b)));
    never_panics("bundle_verify", &alice_link, 2, |b| drop(bundle_verify(b, b"devices", b"list", &signature)));
    never_panics("bundle_verify signature", &signature, 3, |b| drop(bundle_verify(&alice_link, b"devices", b"list", b)));
    never_panics("bundle_bound", &bound, 4, |b| drop(bundle_bound(&alice_link, b)));
    never_panics("conversation_accept", &started[1], 5, |b| drop(conversation_accept(&bob, b)));
    never_panics("conversation_accept_any", &started[1], 6, |b| drop(conversation_accept_any(&bob, &kept, b)));
    never_panics("conversation_accept_any prekeys", &kept, 7, |b| drop(conversation_accept_any(&bob, b, &started[1])));
    never_panics("conversation_open", &reply[1], 8, |b| drop(conversation_open(&started[0], b)));
    never_panics("conversation_open state", &started[0], 9, |b| drop(conversation_open(b, &reply[1])));
    never_panics("conversation_restored", &accepted[0], 10, |b| drop(conversation_restored(b)));
    never_panics("conversation_peer", &accepted[0], 11, |b| drop(conversation_peer(b)));
    never_panics("packet_kind", &started[1], 12, |b| {
        let _ = packet_kind(b);
    });
    never_panics("first_message_id", &started[1], 13, |b| drop(first_message_id(b)));
    never_panics("safety_number", &account_identity(&bob).unwrap(), 14, |b| drop(safety_number(&account_identity(&alice).unwrap(), b)));
    never_panics("signature_verify", &signature, 15, |b| drop(signature_verify(&[7; 32], b"m", b)));
}

#[test]
fn sealed_and_paired_bytes_never_panic() {
    let secret = [5u8; 32];
    let public = seal_public(&secret).unwrap();
    let sealed = erevos_core::relay_seal::RelayKey::generate();
    let relay_sealed = relay_seal(&sealed.public(), &[3; 24], b"hi").unwrap();
    never_panics("seal_open", &relay_sealed, 21, |b| drop(seal_open(&secret, b)));
    never_panics("relay_channel_keys", &public, 22, |b| drop(relay_channel_keys(&sealed.public(), &secret, b)));
    let started = pair_start(b"123456", b"channel", &[1; 16]).unwrap();
    let (own, share) = started.split_at(32);
    never_panics("pair_finish", share, 23, |b| drop(pair_finish(own, &[1; 16], share, b, &[1])));
    never_panics("pair_confirmed", &[0; 32], 24, |b| drop(pair_confirmed(&[2; 32], share, b)));
    never_panics("import_chats", b"[01/02/2024, 10:00:00] A: hi\n", 25, |b| drop(import_chats(b"WhatsApp Chat.txt", b)));
}

#[test]
fn nostr_events_never_panic() {
    let ours = nostr::secret().unwrap();
    let theirs = nostr::secret().unwrap();
    let to = nostr::public(&theirs).unwrap();
    let event = nostr::wrap(&to, b"hi", b"1700000000").unwrap_or_default();
    let _ = ours;
    never_panics("nostr unwrap", &event, 31, |b| drop(nostr::unwrap(&theirs, b)));
    never_panics("nostr_chat", b"{}", 32, |b| drop(nostr_chat(b)));
}

#[test]
fn group_messages_never_panic() {
    let alice = group_new(b"alice").unwrap();
    let bob = group_new(b"bob").unwrap();
    let [alice, id]: [Vec<u8>; 2] = split(&group_create(&alice).unwrap()).try_into().unwrap();
    let [bob, package]: [Vec<u8>; 2] = split(&group_key_package(&bob).unwrap()).try_into().unwrap();
    let [alice, commit, welcome]: [Vec<u8>; 3] = split(&group_add(&alice, &id, &package).unwrap()).try_into().unwrap();
    let [bob, _]: [Vec<u8>; 2] = split(&group_join(&bob, &welcome).unwrap()).try_into().unwrap();
    let [_, message]: [Vec<u8>; 2] = split(&group_seal(&bob, &id, b"hi").unwrap()).try_into().unwrap();
    let fresh = group_new(b"carol").unwrap();

    never_panics("group_open", &message, 41, |b| drop(group_open(&alice, b)));
    never_panics("group_open commit", &commit, 42, |b| drop(group_open(&bob, b)));
    never_panics("group_join", &welcome, 43, |b| drop(group_join(&fresh, b)));
    never_panics("group_rejoin", &welcome, 44, |b| drop(group_rejoin(&bob, &id, b)));
    never_panics("group_add key package", &package, 45, |b| drop(group_add(&alice, &id, b)));
    never_panics("group_package_about", &package, 46, |b| drop(group_package_about(b)));
    never_panics("group_epoch", &message, 47, |b| drop(group_epoch(b)));
    never_panics("group_of", &message, 48, |b| drop(group_of(b)));
    // A group's own state comes only from this phone's own sealed storage, which a damaged copy
    // does not open, never from another: OpenMLS's memory storage unwraps what it reads there.
}
