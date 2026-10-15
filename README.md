# Erevos

The ONE instant messenger focused in privacy, anonymity and functionality.

A private messenger with no phone number, no email and no account.

Early work, not audited. Do not rely on it to protect anyone yet.

## Design

- No user identifiers. Each contact is a pair of one-way relay queues, as in
  SimpleX, so no server holds a contact graph.
- Double ratchet for 1:1 messages, seeded by a post-quantum hybrid handshake
  (PQXDH, not written yet). Every message is padded to a fixed size.
- Messages go through two relays, so no relay sees both the sender's IP and
  the recipient's queue. Built-in Tor is optional.
- Device safety from Kryfo: wipe PIN, decoy and hidden chats, metadata
  stripping on photos and video, a requests inbox and proof-of-work for
  first contact.
- One Rust core shared by Android, iOS and desktop apps.

## Layout

- `crates/erevos-core`: protocol and crypto. So far the double ratchet and
  message padding.
- `crates/erevos-relay`: the relay server. So far the one-way queue store.

## Build

    cargo test

## Licence

AGPL-3.0-or-later.
