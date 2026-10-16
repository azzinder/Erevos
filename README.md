# Erevos

The ONE instant messenger focused in privacy, anonymity and functionality.

A private messenger with no phone number, no email and no account.

Early work, not audited. Do not rely on it to protect anyone yet.

## Design

- No user identifiers. Each contact is a pair of one-way relay queues, as in
  SimpleX, so no server holds a contact graph.
- Double ratchet for 1:1 messages, seeded by a post-quantum hybrid handshake
  (PQXDH with X25519 and ML-KEM-768). Each one-time prekey is used once and
  then deleted, so an initial message cannot be replayed. Every message is padded to a fixed size.
- Messages go through two relays, so no relay sees both the sender's IP and
  the recipient's queue. Built-in Tor is optional.
- Offline mesh (Android first, Wi-Fi Aware and Bluetooth LE): packets are
  padded, carry a per-day routing tag only the two session holders can
  compute, and expire after three days. Based on what Knit does, without its
  plaintext public room, static keys or flooding of direct messages.
- Device safety from Kryfo: wipe PIN, decoy and hidden chats, metadata
  stripping on photos and video, a requests inbox and proof-of-work for
  first contact.
- One Rust core under one Expo/React Native app for Android, iOS, Linux,
  macOS and Sailfish OS, structured like LPHL FASOULI.

## Layout

- `crates/erevos-core`: protocol and crypto. So far the PQXDH handshake
  (X25519 + ML-KEM-768), the double ratchet and message padding.
- `crates/erevos-core/src/mesh.rs`: store-and-forward for offline delivery.
- `crates/erevos-import`: reads chats exported from other apps. So far Telegram.
- `crates/erevos-relay`: the relay server. So far the one-way queue store.

## Build

    cargo test

## Licence

AGPL-3.0-or-later.
