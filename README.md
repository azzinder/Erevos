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

- `app/`: the Expo app (React Native, expo-router), same SDK as LPHL FASOULI.
  Home screen only so far.
- `crates/erevos-core`: protocol and crypto. So far the PQXDH handshake
  (X25519 + ML-KEM-768), the double ratchet and message padding.
- `crates/erevos-core/src/mesh.rs`: store-and-forward for offline delivery.
- `crates/erevos-core/src/frame.rs`: length-prefixed frames for stream sockets
  and small radio writes.
- `crates/erevos-core/src/wire.rs`: byte encodings for prekey bundles, handshake
  messages and packets, with one valid encoding per message.
- `crates/erevos-import`: reads chats exported from other apps. So far Telegram.
- `crates/erevos-relay`: the relay server. One-way queues (create, send,
  receive, delete) over TCP and WebSocket, with an optional bearer token and
  an optional journal on disk so queues survive a restart.
- `deploy/relay`: scripts that run the relay on a Debian or Ubuntu server
  behind Caddy, with TLS from Let's Encrypt. See its README.
- `desktop/`: Erevos for Linux and macOS, the app's web build (with the core in
  WebAssembly) in Electron. `.github/workflows/desktop.yml` builds the Linux
  packages and the Mac disk image, and starts each to check it opens.

## Build

    cargo test

The desktop app, from `app/`:

    node scripts/build-web-core.mjs
    EXPO_PUBLIC_SHELL=electron npx expo export --platform web --output-dir ../desktop/web
    cd ../desktop && npm ci && npx electron .

## Licence

AGPL-3.0-or-later.
