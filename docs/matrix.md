# Matrix accounts in Erevos

Erevos can hold a Matrix account, so people can write to friends who use Element or any other
Matrix app. Erevos talks to the person's homeserver itself, as Element does: messages are
encrypted on the phone and opened on the other person's device. No bridge sits in between, as a
bridge has to open every message to pass it on.

## What Matrix chats do not have

Matrix chats are not anonymous, and the app says so on them. The homeserver sees the account, who
talks with whom, when, in which rooms, and the phone's address unless it goes through Tor. In a
room with members on other servers, every one of those servers keeps the same. None of Erevos's
own protections apply: no queue per contact, no padding to one size, no Nostr, no relay hops.
What stays private is what is written.

## How it is built

- `crates/erevos-matrix`: Olm (between two devices) and Megolm (a room's messages) through
  vodozemac, the Matrix project's own Rust library, audited in 2022. Like the rest of the core it
  keeps nothing between calls: accounts and sessions go out as JSON and the app keeps them sealed.
  One JSON request in, one JSON answer out (`op`: `account_new`, `device_keys`, `one_time_keys`,
  `olm_encrypt`, `olm_decrypt`, `megolm_new`, `megolm_session_key`, `megolm_encrypt`,
  `megolm_inbound`, `megolm_decrypt`, `megolm_export`, `signing_key_new`, `sign_json`,
  `verify_json`, `canonical_json`).
- `crates/erevos-ffi` passes it on as one call, `matrix`, through JNI and WebAssembly.
- `app/lib/matrix.ts`: the account and the Client-Server API (v3). Signing in with a password as
  a new device named Erevos, publishing its keys, and setting up cross-signing when the account
  has none; syncing rooms, members, invites and messages; sending text, giving the room's Megolm
  key first to every member device that lacks it; starting a chat with one person (encrypted,
  listed in `m.direct`), joining, leaving, marking read, signing out.
- `app/checks/matrix.check.ts`: two people and a device that signs in later, against a homeserver
  played in the check, with the real core.

## Checks it makes

- A device's keys count only when signed by the device itself, and a device that comes back with
  another key is not taken.
- One-time keys are checked against the device's signature before a session is made with them.
- A room key received through Olm counts only when its payload names the sender, us, and our key.
- A Megolm message index read once under one event cannot come back under another (replays).
- A room's key changes after 100 messages, a week, or when a member leaves.

## Not yet

- Screens (account, list, chat), which the app thread adds next to the others.
- Photos, files and voice messages (encrypted attachments), reactions, replies, edits.
- Checking someone's devices by emoji or QR (SAS, `vodozemac::sas`), and trust shown per device.
- Key backup and secret storage, so this device cannot read what came before it signed in, and an
  account that already has cross-signing keys does not sign this device.
- Going through Tor, and notifications while Erevos is closed.
- XMPP, the next network after Matrix.
