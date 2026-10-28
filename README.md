# Erevos

A private messenger with no phone number, no email and no account.

**Not audited.** This is early work. No one outside the project has reviewed the code or the
cryptography. Do not rely on it to protect anyone yet.

- [docs/threat-model.md](docs/threat-model.md): who Erevos protects you from, and what each one
  still learns.
- [SECURITY.md](SECURITY.md): how to report a problem, and
  [docs/security-review.md](docs/security-review.md): a map of the code for a security review.
- [CHANGELOG.md](CHANGELOG.md): what each release changed.
- [docs/reproducible-builds.md](docs/reproducible-builds.md): which published files can be built again from the source
  and come out the same (the web app can), and how to check.
- **Transparency**: what the server behind Erevos keeps, for how long, and what has been asked of it, in the user
  guide's Transparency part (`app/guide/en.ts`, `#transparency`), renewed with every release.
- [docs/linked-devices.md](docs/linked-devices.md) and [docs/public-groups.md](docs/public-groups.md):
  design notes.

## What it does

- **Chats** with contacts added from a link or a QR code. The link holds public keys and where to
  reach you on a relay, never a phone number or a name. Someone new who writes first waits as a
  request, and hears nothing back until you accept. Chats show marks for sent, came and read, and
  when a contact is online or typing, unless a chat is set to appear offline.
- **Voice messages, photos and files.** A photo or file is encrypted with a key of its own, in
  chunks of one size per file, and put on the relay's file store. Only its key and where it is go
  in the chat.
- **Groups**, private and public (anyone with a public group's link can ask to join).
- **Voice and video calls** with a contact, group calls (sound for up to 8 people, pictures for up
  to 4), and a walkie-talkie in chats.
- **Disappearing messages**, replies, reactions, pins, stars, polls, stickers, sending a place,
  forwarding, search, and exporting a chat as text.
- **Link previews**, off unless the sender turns them on. The sender's phone fetches the page and
  the preview goes inside the message.
- **Send later.** The relay holds the message and sends it at its time, even if the phone is off
  by then.
- **A spare relay**: a second relay with a queue of its own, which contacts write to while the
  main relay cannot be reached.
- **A second password** opens a second space, with its own contacts, chats and relay queue. Nothing
  in the app shows that it exists.
- **Hidden chats**: four places in every space, each opened by typing its PIN into the home
  screen's search. Each has its own keys and its own relay queue.
- **Linked devices**: a computer or browser linked to the phone by QR code, up to four. The phone
  stays the account and passes messages on to them.
- **Nearby, without internet** (Android): Bluetooth LE, Wi-Fi Aware, the same Wi-Fi or hotspot,
  Wi-Fi Direct, and a Meshtastic LoRa radio. The desktop app has the same Wi-Fi too. A message
  that cannot go yet waits, marked in the chat, until there is a way. When the relay cannot be
  reached, other Erevos phones nearby can carry a sealed message to the contact's relay; carrying
  for others is off unless turned on. Hidden chats never use the nearby links.
- **Tor** (Android only), per space: what you write goes through Tor by default (**Messages**),
  or everything, or nothing, with bridges (obfs4, Snowflake and others) for where Tor is blocked.
- **Phone, SMS and contacts** (Android): Erevos can be the phone's SMS app (SMS and MMS), its
  phone app and its contacts app, with a home-screen widget.
- **Backups**: one file sealed with its own password, holding every space. Made by hand, or
  automatically every day or week into a folder you choose: on the phone, a memory card, or a
  cloud app that shows its folders in Android's folder picker; on a computer, any folder. The web
  app in a browser makes them by hand only. They can also hold the phone's SMS and MMS. Photos and
  files sent in chats are not in backups yet.
- **Imports** from Telegram and WhatsApp exports, with their photos, videos, voice messages and
  files since 0.1.16, and Viber chats saved as .html by the Android app Backup Text for Viber,
  with their words. Imported chats stay on the phone, marked as imported.
- **Updates in the app**: Updates → Check for updates reads `version.json` from the public
  release repository, only when you tap it. On Android it downloads the APK, checks its size and
  SHA-256 against `version.json`, and opens Android's installer.
- **Fingerprint or face unlock** (Android), off unless turned on. It opens only the first
  password's space.
- **Eight languages**: English, Greek, German, French, Spanish, Italian, Portuguese and
  Serbo-Croatian. The first start follows the phone's language, and Home → ⋯ → Settings →
  Language switches it. The user guide is in all eight.

## How it works

### Contacts and relays

- A relay holds one-way queues. A sender writes with a queue's sender id, the owner reads with its
  recipient id. There are no user accounts on the relay.
- Each space has **one** queue on its relay (and one on its spare relay, if it has one). Every
  contact of that space writes to it, and the space reads it. Each hidden place has a queue of its
  own. Each space with a relay also keeps four more queues on
  it for hidden chats that say a message came: the queue of each place that asked for it, and
  queues no one writes to for the others.
- When you and a contact use **different relays**, messages go through two of them: your relay
  sees your IP address but not which queue the message is for, and the contact's relay sees the
  queue but only your relay's address. When you both use **the same relay**, it sees your IP
  address and the queue together, unless you set a second relay to send through, or use Tor. Without
  Tor, your own relay also sees the address your phone reads your queue from. See
  [docs/threat-model.md](docs/threat-model.md) for what each relay learns.
- A relay can lend places to phones that have no relay of their own. Lending is off unless the
  relay's operator turns it on (`EREVOS_RELAY_LEND=on`). A ticket for a place goes into a contact
  link only when you choose to share a place for that link. A lent place may put 50 MB of files a
  day, and the operator can revoke tickets in a file.
- The relay closes connections left quiet for 5 minutes, or slow to finish their handshake, and
  takes at most 512 at once (128 on the paths that need no token). It holds at most 100,000 queues,
  and removes the ones no one has read for 180 days. Messages nobody takes expire after 14 days.
  `FORWARD` and `FILE_VIA` refuse addresses that are not on the public internet, unless
  `EREVOS_RELAY_PRIVATE_PEERS=allow`.

### Encryption

- 1:1 chats start with PQXDH (X25519 and ML-KEM-768), then use the double ratchet. Once each phone
  has had a message from the other, every packet is sealed once more for the phone it goes to
  (AES-256-GCM, with a key that phone gave inside the chat, and a 16-byte mark only the two can
  match), so a relay cannot tell from a packet which conversation in a queue it belongs to, and the
  phone opens it in that one contact's conversation instead of trying every contact. A
  conversation's first message, and any sent before the answer comes, still show the ratchet header
  (its public key and counters). An unsealed packet is tried in the conversations of contacts who
  seal at most 5 times an hour.
- Accounts have **no one-time prekeys**: the keys in a contact link never change, and several people
  may use one link. So a relay could replay a conversation's first message. The app remembers the
  ids of the last 100 first messages it accepted, and each contact's last 16, and ignores one it
  has seen.
- Each account also makes **newer prekeys** (a signed X25519 prekey and an ML-KEM-768 key) every 30
  days, and gives them to each contact inside their chat. The contact's Erevos then starts a new
  conversation with them, a new PQXDH, and both move to it once one answers there; the safety
  number stays the same. Each phone keeps its last three, and throws older ones away, with the
  ML-KEM secrets of the conversations they started. The contact link's own prekeys are kept for as
  long as the account, for anyone new who has the link. Contacts on an older Erevos stay in the
  conversation they have. Each renewal is a first packet the relay can see, once a month per contact.
- Every message is padded to one of four sizes: 256, 1024, 4096 or 16384 bytes.
- Each pair of contacts has a safety number to compare.
- A backup holds each chat's ratchet as it was then, and the phone used later keys since. So after
  a restore, each chat skips 900 sending keys ahead before it sends, so that no message key (which
  also gives the nonce) is used twice. More than 900 messages sent to one contact between the backup
  and the restore would still meet used keys.
- **Groups** use MLS (RFC 9420) through OpenMLS, with the classical ciphersuite
  `MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519`. Group messages are **not** post-quantum. Only the
  group's keeper (its maker, or a public group's owner) commits. Every week each phone's keys in
  each group are made new: the keeper's with a commit of its own, a member's by the keeper putting
  it in anew, in one commit, with a key package the member gives for that. So a member whose group
  keys leak heals within a week, once the keeper's Erevos does this too; members on an older one
  see the same member as before.

### Calls

- Calls use WebRTC. The call is set up with signals sent inside the chat's end-to-end encryption,
  including the fingerprint of the key that encrypts the call (DTLS-SRTP).
- When the relay has a call relay (TURN), calls go only through it, so neither phone learns the
  other's IP address. The server running it sees both. Without a call relay, the phones offer their
  own addresses, and each sees the other's; this usually works only on the same network.
- No link starts a call. A link from another app or a web page may open a chat; a call starts only
  from a tap inside Erevos.

### Tor

- Tor (Arti, inside the app) carries only the relay connections, and only on Android. There is no
  falling back to a direct connection when Tor is on.
- Calls, link previews and the update check do not go through Tor. Calls go direct or through the
  call relay. Link previews are not made while Tor is on, and the update check refuses to run.

### On the device

- Each space has its own random key, which seals everything it keeps. Behind a password, the key is
  kept only sealed by it. A space without a password lock keeps its key in the OS keystore, so
  whoever can read the keystore can open it. Passwords and PINs are stretched with PBKDF2-SHA256,
  200,000 rounds, and then Argon2id (32 MiB, 3 passes), so every guess costs memory as well as time;
  backups the same. Slots and automatic backups from before Argon2id get it at the next start or
  backup, without the password. Passwords and PINs need at least 4 characters; backup passwords
  need at least 12.
  Wrong passwords make the next try wait, but that does not slow down someone who has copied the
  stored data: see [docs/threat-model.md](docs/threat-model.md).
- The lock keeps at least four password slots, and every space keeps a slot for each of its four
  hidden places. The unused ones hold random data shaped like used ones, and unlocking tries all of
  them. So neither the stored data nor the time it takes shows how many are in use.
- Message history is kept in sealed pages of 16 KB (a few times that for one very long message),
  the pages of every space and every hidden place side by side. The rest of what a space keeps
  (contacts, conversations, groups and more) is in files holding a value of the same size for every
  space and hidden place, used or not; a value larger than that goes to pages like the history's,
  among them. Values an older version kept in whole blocks keep their size until their space next saves
  them.
- Turning the password lock off inside a second space writes, unsealed, which space opens by
  itself. So whoever can read the phone's stored data then knows the phone has a space before it.
- On Android, Erevos stays out of screenshots, screen recordings and the recent-apps preview while
  hidden chats are open, always, and while a space with a password lock is open, unless **Screen
  privacy** is turned off in its security settings.
- Photos sent as photos lose their metadata: JPEG and PNG are cleaned (location, phone, time,
  thumbnails, motion-photo video), and other kinds are made into a new JPEG. Videos and anything
  sent as a file go as they are.
- **SMS and MMS** in SMS-app mode, the call log and the phone's contacts live in Android's own
  stores, as for any phone app. Erevos does not encrypt them.

## Platforms

- **Android**: the full app. The release APK is for 64-bit ARM.
- **iPhone**: the web app (`pwa/`), from Safari. The native iOS build has no chat ("Chat runs on
  Android and on a computer for now").
- **Linux, Windows and macOS**: the desktop app (`desktop/`), the web build with the core in
  WebAssembly, in Electron. No Bluetooth, SMS, Tor, notices or ringing sound there; the same Wi-Fi works.
- **Any browser**: the web app. Its releases are signed with an offline Ed25519 key, and its
  service worker runs only signed releases. See [pwa/README.md](pwa/README.md) for what that
  protects and what it does not.
- **Sailfish OS**: the web build in Sailfish WebView, packaged as an RPM. Not yet tested on a phone.
  See [sailfish/README.md](sailfish/README.md).

## Tried on phones

Erevos is tested with checks on every change, but only some of it has been tried by hand on real
phones (a Pixel and two other Android phones) and computers:

- **Tried**: a second password's space, hidden chats, QR contacts, chats through a relay and its
  spare, sealed history, disappearing messages and the marks, voice messages, photos and files,
  1:1 voice and video calls, backups, Telegram and WhatsApp imports (before their media came
  along), chats over Bluetooth between two phones, SMS-app mode, looks and themes, and the Linux
  desktop app.
- **Not tried yet**: groups and group calls, the walkie-talkie, calls without internet, ringing and
  receiving in the background, MMS and two SIMs, Tor, the same Wi-Fi, Wi-Fi Direct, LoRa, carrying
  for others, linked devices, Web Push, the language switch, the Sailfish app, imports with media,
  lent places, and what is in Unreleased in the [changelog](CHANGELOG.md).


- `app/`: the Expo app (React Native, expo-router), for Android, the web app, the desktop app and
  Sailfish. `app/lib` holds the chat logic, `app/lock` what is kept sealed on the device,
  `app/modules` the Android native modules.
- `crates/erevos-core`: protocol and crypto: PQXDH, the double ratchet, padding, two-hop sealing for
  relays (`relay_seal.rs`), byte encodings and frames. `mesh.rs` is a store-and-forward design with
  routing tags that the apps do not use; nearby messages are handled in `app/lib/nearby.ts`.
- `crates/erevos-ffi`: the core as the apps call it, through JNI on Android and WebAssembly
  elsewhere. It keeps nothing between calls.
- `crates/erevos-group`: group chats, MLS through OpenMLS.
- `crates/erevos-import`: reads Telegram and WhatsApp exports.
- `crates/erevos-tor`: relay connections through Tor with Arti, for Android.
- `crates/erevos-relay`: the relay server: queues over TCP and WebSocket, an optional bearer
  token, an optional journal on disk, a file store, two-hop forwarding, messages held for later,
  Web Push for the web app, credentials for a call relay, and lent places.
- `deploy/relay`: scripts that run the relay on a Debian or Ubuntu server behind Caddy, with TLS
  from Let's Encrypt and a call relay (coturn). See its [README](deploy/relay/README.md).
- `deploy/web`: scripts that sign the web app and serve it from your own server.
- `desktop/`: the Electron app.
- `pwa/`: the web app's service worker, build and signing tools.
- `sailfish/`: the Sailfish OS shell.
- `transports/`: the Go module for lyrebird, Tor's pluggable transports for bridges.

## Build

The Rust crates:

    cargo test

The app's checks and the desktop app need Node 22, Rust with the `wasm32-unknown-unknown` target
and wasm-bindgen-cli 0.2.129 (`cargo install wasm-bindgen-cli --version 0.2.129 --locked`).

The app's checks, from `app/` (they run the real core in WebAssembly and real relays):

    npm ci
    npm run typecheck
    node checks/build-core.mjs
    cargo build -p erevos-relay
    npm run check

The desktop app, from `app/`:

    npm ci
    node scripts/build-web-core.mjs
    EXPO_PUBLIC_SHELL=electron npx expo export --clear --platform web --output-dir ../desktop/web
    node ../pwa/element-call.mjs node_modules/@element-hq/element-call-embedded/dist ../desktop/web/element-call
    cd ../desktop && npm ci && npx electron .

The Android app is built by `.github/workflows/android.yml` (pull requests and by hand) and by the
release workflow: `npx expo prebuild --platform android`, then Gradle, with cargo-ndk and Go for
lyrebird.
With `EREVOS_DISTRIBUTION=fdroid` set for the prebuild and Gradle, it is the F-Droid build, which
F-Droid updates: Updates has no **Check for updates** and the app may not install packages
(`app/app.config.js`). Every build leaves out the Google Play services entry that expo-image-picker
puts in the manifest (`app/plugins/with-no-gms-entry.js`).

## Releases

`.github/workflows/release.yml` (workflow `release`) builds every package and publishes them as a
GitHub release, `v2.0.0` and then the next number (`v2.0.1`…) unless one is given: the Android
APK, Linux (Arch package and AppImage), the macOS disk image, Windows (installer and portable
.exe), the Sailfish OS RPM and the web app, with `SHA256SUMS`. A package whose job fails is left
out and the others still go. The workflow is set to run every night at 02:30 UTC when main has
changed, while it is enabled on GitHub, and by hand (Actions, release, Run workflow). The five newest releases stay. Some run numbers have no release;
[CHANGELOG.md](CHANGELOG.md) lists the ones there are.

The web app comes unsigned: the release computer, which holds the web release key, signs it and
serves it with `deploy/web/publish.sh` (see [pwa/README.md](pwa/README.md)).

The APK is signed with Erevos's own release key, made once with
`scripts/make-release-keystore.sh`, which names the four Actions secrets it needs. Without them the
release goes out without an APK. Android installs a release only over an app signed with the same
key, so a phone with a build from a computer (signed with the debug key) has to uninstall it first:
make a backup before.

Each release also goes to the public repository `azzinder/erevos-releases` when the Actions secret
`RELEASES_TOKEN` (a token that may write releases there) is set, with a `version.json` that
**Updates → Check for updates** in the app reads. The app never checks by itself. On Android it
downloads the APK, checks its size and SHA-256 and opens Android's installer; elsewhere it opens
the release page.

The repository variable `EREVOS_MACOS` set to `off` leaves the Mac out (a Mac minute counts as ten),
and `EREVOS_WINDOWS` set to `off` leaves Windows out (a Windows minute counts as two). The macOS app
is signed ad hoc, not by Apple; no release so far has had one. A release that went out without it
gets it later from **Actions → release-macos → Run workflow** with its version: built from the
release's commit, with its build number, and added to its files, SHA256SUMS and notes on both
repositories. The Windows files are not signed: that needs a code signing
certificate, so Windows' SmartScreen warns before the first start.

## Built with others' open source

Erevos stands on the work of many other projects: Element Call for Matrix calls, Arti and The Tor Project's bridges for Tor, vodozemac and OpenMLS for encryption, the RustCrypto and dalek crates, rustls, React Native, Expo and Electron, among others. [CREDITS.md](CREDITS.md) names every package it uses, with its maker and licence. A change that adds or updates a dependency runs `node scripts/credits.mjs` and commits the result with it; `npm run check` in `app/` fails otherwise.

## Licence

AGPL-3.0-or-later.
