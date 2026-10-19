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
- In English, Greek, German, French, Spanish, Italian and Portuguese, the user
  guide in English and Greek: the first start follows the phone's language, and
  Home → Menu → Language switches it.

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
- `crates/erevos-group`: group chats, MLS (RFC 9420) through OpenMLS. The
  group's maker is its admin and the only one who commits.
- `crates/erevos-import`: reads chats exported from other apps. So far Telegram.
- `crates/erevos-relay`: the relay server. One-way queues (create, send,
  receive, delete) over TCP and WebSocket, with an optional bearer token and
  an optional journal on disk so queues survive a restart.
- `deploy/relay`: scripts that run the relay on a Debian or Ubuntu server
  behind Caddy, with TLS from Let's Encrypt. See its README.
- `desktop/`: Erevos for Linux and macOS, the app's web build (with the core in
  WebAssembly) in Electron. `.github/workflows/desktop.yml` builds the Linux
  packages and the Mac disk image, and starts each to check it opens.
- `pwa/`: the web app, for an iPhone without an Apple account and for any
  browser: the same web build, kept on the device by a service worker that runs
  only releases signed with a key the server does not have. `deploy/web`
  serves it from your own server. See its README for what that protects and
  what it does not.
- `sailfish/`: Erevos for Sailfish OS, the same web build in Sailfish WebView,
  packaged as an RPM with the Sailfish SDK. See its README.

## Build

    cargo test

The desktop app, from `app/`:

    node scripts/build-web-core.mjs
    EXPO_PUBLIC_SHELL=electron npx expo export --platform web --output-dir ../desktop/web
    cd ../desktop && npm ci && npx electron .

## Releases

`.github/workflows/release.yml` builds every package and publishes them as a
GitHub release, `v0.1.<build>`: the Android APK, Linux (Arch package and
AppImage), the macOS disk image, the Sailfish OS RPM and the web app, with
`SHA256SUMS`. It runs every night when main has changed, and by hand (Actions,
release, Run workflow). The five newest releases stay. The web app comes
unsigned: the release computer signs it and serves it with
`deploy/web/publish.sh` (see `pwa/README.md`).

The APK is signed with Erevos's own release key, made once with
`scripts/make-release-keystore.sh`, which names the four Actions secrets it
needs. Without them the release goes out without an APK. Android installs a
release only over an app signed with the same key, so a phone with a build
from a computer (signed with the debug key) has to uninstall it first: make a
backup before.

Each release also goes to the public repository `azzinder/erevos-releases`
when the Actions secret `RELEASES_TOKEN` (a token that may write releases
there) is set, with a `version.json` that **Updates → Check for updates** in
the app reads. The app never checks by itself; on Android it downloads the
APK, checks its size and SHA-256 and opens Android's installer.

The repository variable `EREVOS_MACOS` set to `off` leaves the Mac out (a Mac
minute counts as ten).

## Licence

AGPL-3.0-or-later.
