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
- `app/lib/matrix-media.ts`: photos and files. In an encrypted room each is encrypted on the phone
  with a key of its own (AES-256-CTR, the counter's lower half at zero) and its SHA-256 taken, the
  key and hash going inside the Megolm-encrypted message; what comes back is checked against the
  hash before it is opened. Uploads to `/_matrix/media/v3/upload`; downloads signed in
  (`/_matrix/client/v1/media/download`, Matrix 1.11), or the older way for older servers. Up to
  50 MB. A photo is fetched only when tapped, and kept in memory while Erevos runs (40 MB at most).
- `app/lib/matrix-verify.ts`: checking devices by emoji (SAS, m.sas.v1 with hkdf-hmac-sha256.v2),
  in a room with another person or to-device between two devices of one account, both ways with
  Element. The core does the X25519, HKDF and HMAC (`sas_new`, `sas_bytes`, `sas_mac`,
  `sas_verify`) itself rather than through vodozemac's `Sas`, whose secret cannot be passed out,
  so the core keeps nothing between calls; a test checks it against vodozemac. What a check
  proves is kept in `MatrixState.verified`; with the account's cross-signing keys on this device,
  the other device or the other person's master key gets signed too. The 64 pictures and their
  names are `app/lib/sas-emoji.ts` (Matrix's table, Greek added).
- `app/lib/matrix-backup.ts`: the Security Key (base58, as Element writes it, or a phrase through
  PBKDF2-SHA-512 in the core), secret storage (m.secret_storage.v1.aes-hmac-sha2) and key backup
  (m.megolm_backup.v1.curve25519-aes-sha2, libolm's PkEncryption: X25519 in the core, HKDF,
  AES-CBC and HMAC with @noble). The account's cross-signing keys are taken only when they make
  the keys its homeserver has, then sign this device; the backup only when its secret makes the
  backup's public key. Keys are fetched one session at a time, for the messages shown locked, so
  the sealed state holds only what this device uses. `setUpRecovery` makes both for an account
  with none.
- Tor: every request to the homeserver goes through `defaultMatrixHttp` in `app/lib/matrix.ts`,
  which follows the space's Tor way (`torFor` in `app/lib/relay.ts`): through Tor once Tor is
  ready with the way Messages, straight while it starts or when it fails; only through Tor with
  Everything. `crates/erevos-tor` answers one HTTP/1.1 request over Tor (`http`, TLS for
  `https://`, 64 MB at most, its own circuit per host), passed on as `torHttp` through JNI. The
  computer and the web app have no Tor, so there Matrix goes straight.
- Calls' events (`setCallHandler`, `CallEvent` in `app/lib/matrix.ts`): legacy calls' `m.call.*`
  and MatrixRTC's rings, declines, call members (`org.matrix.msc3401.call.member`, room state) and
  media keys (`io.element.call.encryption_keys`, to-device through Olm) go to the calls, opened
  first when they came encrypted, and are no message of their own; each call keeps one line in its
  chat (`addMatrixCallLine`). `sendStateEvent`, `sendDelayedState`, `updateDelayed`,
  `sendToDeviceSealed` (any event type through Olm, to chosen devices), `sendToDevicePlain`,
  `roomState`, `rtcTransports` and `openIdToken` are what calls send and ask with.
- Calls (`app/lib/matrix-calls.ts`, `app/lib/matrix-widget.ts`, `app/modules/erevos-webcall`): Element
  Call (`@element-hq/element-call-embedded`, pinned) is copied out of `node_modules` into the APK's
  assets when the app is built, without its source maps, its background blur models, its own Rust
  crypto WebAssembly and old font files, and served from
  `https://appassets.androidplatform.net/element-call/` by `ElementCallActivity` (its own task,
  picture in picture, shown over the lock screen). `config.json` is answered empty, so no
  telemetry, error reports or rageshakes are set up; posthog, sentry and Google hosts are refused,
  and so is any `/_matrix/` request from the page (it tries `/versions` and MSC4195's delegated
  leave on its own, without a token). The page and Erevos speak the Matrix Widget API: a listener
  put in the page's `<head>` hands Erevos what the page posts (`erevosCall.postMessage`), and Erevos
  answers with `window.postMessage`; `parentUrl` is the page itself, so the widget API accepts it.
  `hostWidget` approves only a call's capabilities in the call's room: its member state under this
  account and device's keys, rings, declines, media keys, reactions, and the to-device events of
  calls; never `m.room.message`, other rooms, other state, downloads or sticky events. It sends
  the room's readable state once (`update_state`, MSC2762), then each change; timeline events of
  the room go through `setRoomTap` while the call is open, opened first when encrypted. Room
  events it sends go through `sendEvent`, so encrypted as the room is; to-device ones through
  `sendToDeviceSealed` or as they are, as it asks; delayed state through MSC4140's
  `delayed_event` endpoint, or the older `?org.matrix.msc4140.delay=` for servers that have only
  that. `get_openid` gives the OpenID token, `get_rtc_transports` (MSC4515) the homeserver's
  MSC4143 transports or its `.well-known` `org.matrix.msc4143.rtc_foci`. Rings are
  `org.matrix.msc4075.rtc.notification` (and `m.rtc.notification`, and the older `call.notify`)
  that mention us, for their `lifetime` from `sender_ts` (from the server's time when the sender's
  clock is more than 20 s ahead), two minutes at most. The ring screen is
  `components/matrix-ring.tsx`; the chat's tiles open Element Call with `start_call_dm` (or
  `start_call` in a room), an answer with `join_existing_dm`. Element Call uses MatrixRTC in its
  default compatibility mode (state events `org.matrix.msc3401.call.member`).
- `app/lib/matrix-store.ts` and `app/lock/matrix-data.ts`: the open space's account, kept sealed in
  that space only (not its hidden chats, not in backups yet), synced while the space is open; it
  answers `matrixUnread()` and `onMatrixChange()` for the home screen.
- `app/app/matrix.tsx` (Settings → Relay and networks → Matrix: sign in, chats, invites, new chat,
  sign out) and `app/app/matrix-chat.tsx` (one chat).
- `app/checks/matrix.check.ts`: two people and a device that signs in later, against a homeserver
  played in the check (`app/checks/matrix-server.ts`), with the real core; a photo there and back,
  held by the server only as ciphertext, and refused once a byte of it is changed.
- `app/checks/matrix-calls.check.ts`: the capabilities given and refused; the host doing what
  Element Call asks (state now and delayed both ways, encrypted room and to-device events that the
  other side opens, OpenID, transports) and nothing else; rings answered, declined, missed, left by
  the caller, answered or declined on another device, each with one line.
- `docs/matrix-checks/element-call-browser.ts`: the real Element Call in Chromium, served as the
  Android window serves it, with Erevos's real host: it loads without the files left out, gets its
  capabilities and the room's state, asks for the OpenID token and the transports, and asks the
  media server for its token. No LiveKit runs there, so its member state and ring are not reached.

## Checks it makes

- A device's keys count only when signed by the device itself, and a device that comes back with
  another key is not taken.
- One-time keys are checked against the device's signature before a session is made with them.
- A room key received through Olm counts only when its payload names the sender, us, and our key.
- A Megolm message index read once under one event cannot come back under another (replays).
- A room's key changes after 100 messages, a week, or when a member leaves.

## Notices

Each change of the account says how many messages each room has not read, by the homeserver's
`unread_notifications.notification_count` (an invite counts as one), to `app/lib/network-notices.ts`:
what went up came, and shows the same notice as a message in Erevos's own chats
(`app/lib/background.ts`), with its sound; what went down was read, here or in Element. The number on
Erevos's icon counts them (`app/lib/unread.ts`), the computer's notice too. The first sync of an
account just signed in to tells of nothing. A room has notifications of its own (`notify`, as
`app/lock/chat-notify.ts` keeps them), set from **Notifications** at the bottom of its screen on
Android; a muted one is left out. A room is marked read only while Erevos shows it.

## Not yet

- Voice messages, video thumbnails, reactions, replies, edits.
- Checking by QR, and trust shown per device in a group.
- Reading a room's history further back than the last sync, so older locked messages show.
- Notices while the space is locked or Android stopped Erevos: that needs a push gateway, which
  would learn when messages come.
- Calls on the computer and in the web app (Element Call in a frame), and in a hidden chat's place.
- A ring while Erevos is closed: it shows as missed when the space next syncs.
- Older one-to-one calls (`m.call.*`), and MatrixRTC's sticky membership (MSC4354, Element Call's
  "Matrix 2.0" mode): Element Call is not given sticky events.
- Element Call's background blur (its models are left out of the APK).
