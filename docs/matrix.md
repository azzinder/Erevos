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
- Reactions, replies, edits, deletes, older messages and voice messages (`app/lib/matrix.ts`,
  `app/lib/matrix-media.ts`, `app/app/matrix-chat.tsx`, `app/components/matrix-message.tsx`,
  `app/components/matrix-voice.tsx`), as Element writes them:
  - A reaction is a plain `m.reaction` with an `m.annotation` relation (the message's event ID and the
    key, an emoji), not encrypted even in an encrypted room, as Element sends it: the relation is
    readable to the homeserver anyway, so encrypting the event would hide only its kind, and Matrix's
    push rules let a plain reaction be where an encrypted one wakes the other's phone as a message.
    Each person can choose a key once on a message; taking ours back is a redaction of the reaction,
    which comes off its message. The key is kept to 40 characters.
  - A reply carries `m.relates_to` → `m.in_reply_to`. An older app's fallback, the quoted lines it
    copies into the body, is cut from the words.
  - An edit is an `m.room.message` with an `m.replace` relation and `m.new_content`. It counts only
    when its sender is the sender of the message it changes, so nobody can change another's words, and
    a change of a change is not one. The message then shows as edited, with the time of its latest
    change. Erevos offers it for a message of ours that has gone, with words of its own.
  - A delete is an `m.room.redaction` (`/redact`). The message stays in the thread as a line saying it
    was deleted, its words, file, reactions and answer dropped. A redaction that comes takes a message
    or a reaction back the same way.
  - Older messages come from `/rooms/{id}/messages?dir=b`, 40 at a time with lazy-loaded members,
    from the token the room keeps in `before`, up to five pages while nothing new comes; `start` is
    set when the room's first message is there. They are opened as the sync's are, so those still
    locked can open from the key backup later. A room then keeps up to `MOST_KEPT` (2000) messages.
  - A relation that comes before its message, as in an older page, waits in `waiting` (400 at most,
    the oldest dropped) and is put on its message when it comes; none waits once the first message is
    there.
  - A voice message is an `m.audio` with `org.matrix.msc3245.voice` and `org.matrix.msc1767.audio`
    (its duration in milliseconds, also in `info.duration`), body `Voice message`, uploaded and
    encrypted as any file. It is recorded by the microphone beside the field, held (a minute at most,
    under a second is let go): AAC from a phone, what the browser records elsewhere. One that comes is
    fetched and played when asked, with its duration shown. Its waveform goes with it (MSC3246:
    `waveform` in `org.matrix.msc1767.audio`, at most 100 values of 0 to 1024, each the loudest of
    its stretch of the recording's level, sampled ten times a second; `waveformOf` in
    `app/lib/voice.ts`), and one that comes with a waveform shows it in 40 bars under **Play**,
    coloured as it plays (`VoiceClip` in `app/components/matrix-voice.tsx`).
- `app/lib/matrix-verify.ts`: checking devices by emoji (SAS, m.sas.v1 with hkdf-hmac-sha256.v2),
  in a room with another person or to-device between two devices of one account, both ways with
  Element. The core does the X25519, HKDF and HMAC (`sas_new`, `sas_bytes`, `sas_mac`,
  `sas_verify`) itself rather than through vodozemac's `Sas`, whose secret cannot be passed out,
  so the core keeps nothing between calls; a test checks it against vodozemac. What a check
  proves is kept in `MatrixState.verified`; with the account's cross-signing keys on this device,
  the other device or the other person's master key gets signed too. The 64 pictures and their
  names are `app/lib/sas-emoji.ts` (Matrix's table, Greek added).
- `app/lib/matrix-qr.ts` and the QR path of `app/lib/matrix-verify.ts`: checking by QR code
  (m.qr_code.show.v1 / m.qr_code.scan.v1 / m.reciprocate.v1). Mode 0 with another person (our
  master key, then theirs), 1 and 2 between our own devices (1 when this device trusts the master
  key: the master key, then the other device's; 2 when it does not: this device's key, then the
  master key). A code is shown only when this device trusts the key it vouches for. The scanner
  checks the code's ID and that its second key is its own side's, sends the secret back in a
  `start` with `m.reciprocate.v1`, and trusts the first key once the other side sends `done`; the
  side that showed it trusts its second key once its person says the other app reported success.
- Single sign-on (Android): `loginWays`, `ssoLink` and `signInWithToken` in `app/lib/matrix.ts`;
  `matrixSsoStart`/`matrixSsoFinish` in `app/lib/matrix-store.ts` keep the pending sign-in 10
  minutes, tied to the space and its key (a random mark in the return link), and `app/matrix-sso.tsx`
  takes the browser's `loginToken`. Without a password, cross-signing keys are uploaded only when
  the server asks no more (MSC3967); otherwise the device is checked from another. Not on the web
  app: a reload in the browser would lose the pending sign-in.
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
- Calls on the computer and in the web app (`app/lib/element-call-window.web.ts`,
  `pwa/element-call.mjs`): the same Element Call, made ready by `pwa/element-call.mjs` (the same
  files left out, its two inline scripts moved to `erevos-call.js` so its page runs no inline
  script, `config.json` empty), in a frame over the app from an origin of its own, so it reads
  nothing of Erevos's: on the computer `app://element-call` (`desktop/main.js`, which alone gives
  that frame the camera and refuses its trackers and `/_matrix/` requests), in the web app a second
  address on the same server, served from the signed release by the same service worker
  (`pwa/README.md`, Matrix calls). The Widget API goes by `postMessage`, only to and from that
  origin; `hostWidget` is the same. Its back arrow, or Escape, puts the frame small in a corner, as
  picture in picture; a tap brings it back. Sailfish OS has none.
- `app/lib/matrix-store.ts` and `app/lock/matrix-data.ts`: the open space's account, kept sealed in
  that space (and in backups, where a restore lets it go, see Backups below), synced while the space
  is open; it answers `matrixUnread()` and `onMatrixChange()` for the home screen. A hidden place
  can have an account of its own (Hidden chats, below).
- `app/app/matrix.tsx` (Settings → Relay and networks → Matrix: sign in, chats, invites, new chat,
  sign out) and `app/app/matrix-chat.tsx` (one chat).
- `app/checks/matrix.check.ts`: two people and a device that signs in later, against a homeserver
  played in the check (`app/checks/matrix-server.ts`), with the real core; a photo there and back,
  held by the server only as ciphertext, and refused once a byte of it is changed; reactions (plain),
  replies, edits (not by anyone but the sender) and messages taken back both ways; older messages
  fetched to the room's first, with a reaction on a page before its message; a voice message with its
  duration.
- `app/checks/matrix-calls.check.ts`: the capabilities given and refused; the host doing what
  Element Call asks (state now and delayed both ways, encrypted room and to-device events that the
  other side opens, OpenID, transports) and nothing else; rings answered, declined, missed, left by
  the caller, answered or declined on another device, each with one line.
- `docs/matrix-checks/element-call-browser.ts`: the real Element Call in Chromium, served as the
  Android window serves it, with Erevos's real host: it loads without the files left out, gets its
  capabilities and the room's state, asks for the OpenID token and the transports, and asks the
  media server for its token. No LiveKit runs there, so its member state and ring are not reached.
- `docs/matrix-checks/element-call-frame.ts`: the same in a frame of a page, as the web app and the
  computer would show it, the Widget API spoken by `postMessage`. From an origin of its own it goes
  as far as on Android; from the page's own origin in a sandbox it cannot start, as it reads
  `localStorage`. So in a browser Element Call needs an origin of its own: one beside the app's, or a
  second one the computer's shell serves.
- `docs/matrix-checks/element-call-web.ts`: the web app as it goes out, signed and served on two
  addresses, in Chromium, with the real `element-call-window.web.ts` and Erevos's host against
  `app/checks/matrix-server.ts`: Element Call starts from its own address through its worker, gets
  its capabilities, the room's state, the OpenID token and the transports, and asks the media
  server for its token; no policy refuses it, and only `/_matrix/` and trackers are refused.
- `app/checks/web-call.check.ts`: the worker's two roles (what each address keeps and serves, the
  policies, what Element Call's address refuses), and `pwa/element-call.mjs`'s copy.

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
Android; a muted one is left out. A room is marked read only while Erevos shows it. A call rings
with the room's own ringtone when it has one (`components/call-host.tsx`).

### While the space is closed

On Android, **While this space is closed** on the Matrix screen (`app/app/matrix.tsx`) chooses
**Say a message came** or **No notice**, the second until chosen. With the first, the space's relay
is the account's push gateway (`app/lib/matrix-push.ts`, `crates/erevos-relay/src/matrix_push.rs`):

- The space makes a queue of its own at its relay, and checks that the relay's gateway takes pushes
  for it with a notification of a count alone, which wakes nothing; a relay that does not is told
  of as one that needs updating, and the queue goes.
- It sets a pusher on the homeserver (`/pushers/set`): kind `http`, app id `app.erevos`, the push key
  the queue's sender id in hex, at `https://<relay host>/_matrix/push/v1/notify`, format
  `event_id_only`, language `en`. For each message the homeserver would tell of, it posts the
  room's and the event's ids and the counts, never what was written or by whom.
- The relay counts one message in that queue's news for each notification with an event id, stores
  nothing and writes nothing to its journal, and answers any push key it does not know as rejected,
  so the homeserver drops a pusher whose queue is gone.
- The queue is kept with the account (`push`, `lock/matrix-data.ts`). After the first sync of each
  start, the space checks it: the pusher is set again if the homeserver lost it, and a new queue and
  pusher are made if the queue is gone or the space reads at another relay now, the old pusher taken
  off. **No notice** and signing out take the pusher off and delete the queue.
- The space's door (`app/lib/closed-notices.ts`) names the queue first among its contacts' queues,
  under a Tor way of its own, so while another space is open the closed one says "New message" for
  it as for its own chats. It cannot say which chat, and a call does not ring: only the space's key
  opens what came, and it opens on the next sync.

The homeserver learns the relay's address, and the relay when messages come for that queue. With
no space open, or Erevos stopped by Android, nothing is told, as for the space's own chats.

## Hidden chats

Each place of hidden chats can sign in to a Matrix account of its own, apart from the space's, that
nothing outside its hidden chats shows.

- `app/lib/place-networks.ts` runs the place's account (`followMatrixPlaces`, each place's in
  `app/lib/place-lives.ts`) while its hidden chats are open, and while they are closed too if they
  receive while closed (`receivingPlaces` in `app/lib/place-receiver.ts`): then it syncs whenever the
  space is open, as the place's relay queue is read, and its homeserver sees it sync from the phone's
  address beside the space's account. Otherwise it stops as they close, and a closed place receives
  nothing. Its sign-in and keys are kept sealed with the place's key, in the
  place's own value of `erevos-matrix`: the holders `hidden` and `hidden1` to `hidden3` of
  `app/lock/sealed-file.ts` (`hiddenHolder(pocket)`), beside the space's `space`, which never sees them.
- `app/lib/network-place.ts`: `app/matrix.tsx` and `app/matrix-chat.tsx` read a `hidden=1` route
  param (`useNetworkWhere`), show the place's account (`matrixNow('place')`, `matrixVerifications('place')`),
  say under the title that it is the hidden chats' own, and while they are on top what is done goes to
  that account; the screens they open take the param on (`whereParams`). The hidden chats' list
  (`app/app/chat.tsx`) has **Matrix** under it, and lists the place's rooms (`matrixInboxRows`), which
  open with `hidden=1` (`components/chat-row.tsx`).
- While its hidden chats are closed and receive (**Receive while closed**), a message to it makes the
  notice say "New message", as for the place's other chats (`hearing` with the place, then
  `onPlaceNetworkMessage` in `app/lib/network-notices.ts`, which `app/lib/background.ts` hears, on
  Android only); while they are open, it sounds as theirs do. Nothing else of it tells outside them:
  no number on Erevos's icon or the home list, no notification settings, and no closed-space notice
  (`matrixSetPush` refuses a place, and its section is not on the screen).
- Its calls are its own (`MatrixCall.place` and `MatrixCallsSpace.place` in `app/lib/matrix-calls.ts`):
  the buttons of its chats open Element Call as that account, a ring to it while the hidden chats are
  open rings with the phone's ringtone, and Element Call hears only its account's sync (the room tap
  says which account an event came to). The hidden chats stay open through the call (`app/app/chat.tsx`),
  and a call still on as they close ends. While they are closed and receive, a ring to it is held
  (`MatrixCallsSpace.closed`): the phone rings "Incoming call" with no name (`placeNetworkRang`, the
  hidden ring screen), and once the PIN opens the place while it still rings, it rings there
  (`promote`, `MatrixCall.held`), answered at once when the PIN was typed on the ring screen
  (`components/call-host.tsx`). One the caller left, turned down or answered on another device, or not
  opened in time, is kept as missed, or as its device said. Checked in `app/checks/matrix-calls.check.ts`.
- `app/checks/place-networks.check.ts` checks the stores against the homeserver played in the checks,
  with the real core; not yet on a phone.

## Threads, polls, places, previews, pins, forwarding, rooms

- Threads: `m.thread` (MSC3440). A reply in a thread carries `is_falling_back: true` with an `m.in_reply_to` for apps
  without threads; such a message is held in `MatrixMessage.thread` (the first message's ID) and shown on the thread's
  screen only (`app/matrix-chat.tsx`, param `thread`), the room's thread keeps the rest. A thread's first message
  counts its answers from the server's bundled `m.relations` (`threadCount`).
- Polls: MSC3381 (`org.matrix.msc3381.poll.start`, `.response`, `.end`) and the stable `m.poll.*` names, read both
  ways, sent in the unstable form Element understands (`lib/matrix-parts.ts`). Votes and the end are
  `m.reference` relations; only the poll's maker can end it, a vote counts if it is dated before the end, a spoiled
  vote counts as none. Our own end waits for the server's echo to date it (`closing`).
- Places: `m.location` (MSC3488), a `geo:` URI with `;u=` for how near; shown by `PlaceCard`.
- Link previews: MSC4095 (`com.beeper.linkpreviews`), made on the phone when the space's previews switch is on, never
  through Tor or in a hidden place, and sent without the picture. They ride inside the (encrypted) event.
- Pins: `m.room.pinned_events` (the server refuses it for one who may not); tags `m.favourite`/`m.lowpriority` in the
  account data; `/leave` then `/forget`; Forward sends a copy anew (a file is fetched, opened and sent under a key of
  its own) (`lib/matrix-rooms.ts`, `lib/matrix-store.ts`).
- Rooms: `/publicRooms` (the server's, or another's through it), `/hierarchy` for the rooms in a space; both tell the
  homeserver what was looked for. Looking for words in messages never asks the server.
- Accounts: `/register` with User-Interactive Authentication (`lib/matrix-account.ts`): dummy, terms, registration
  token and password are answered in the app; reCAPTCHA and SSO go to the server's fallback page in the browser; an
  e-mail or phone step is not taken here. `/devices` lists, renames and (with UIA) `/delete_devices`; this device is
  never among those signed out.
- Older calls: `lib/matrix-voip.ts`, see below.

## Older one-to-one calls

`m.call.invite`, `.answer`, `.select_answer`, `.candidates`, `.hangup`, `.reject`, version `"1"`, as FluffyChat,
Nheko and Element on a computer make them, in rooms of two only. They come encrypted in an encrypted room (an
unencrypted one there does not ring), the invite names its `invitee`, and an invite older than its lifetime shows as
missed. Our own other device answering or rejecting ends the ring here. The call uses the space's relay's TURN
when it has one, else the homeserver's `/voip/turnServer`; the media is DTLS-SRTP. They use the same `Call` and call
screen as Erevos's own calls (`lib/call.ts`). `app/checks/matrix-voip.check.ts` plays Bob's app.

## Backups

The account is in the backups (`app/lock/backup.ts`): the file `erevos-matrix`, the space's and each
hidden place's, with the pages its value takes. A restored account is let go of, not put back as a
device: its Olm and Megolm sessions as the backup kept them would use again keys used since, which
the others refuse, and its device is the one on the phone the backup came from, which may still be
using it. `app/lib/matrix-store.ts` finds, as the account loads, that the restore it last went past
(the id `app/lock/restored.ts` keeps outside the backup, held in the account as `restored`) is not
the phone's last, and drops it: the sign-in is gone, the Matrix screen says to sign in again, as a
new device, and the Security Key opens the messages from before. It is never signed out on the
server (no `/logout`), which would end the device of the phone the backup came from.
`app/checks/matrix.check.ts` checks that it is let go of, that no `/logout` is sent and that it signs
in again; `app/checks/backup.check.ts`, that the file and its pages come back and that those of the
phone it is restored on go. Not yet on a phone.

## Not yet

- Video thumbnails: a video, as a photo, is fetched only when tapped, so a thumbnail would show
  nothing sooner; sending one would need a frame taken from the video.
- Trust shown per device in a group.
- A room's history beyond the 2000 messages it keeps.
- Notices while no space is open, or Android stopped Erevos; a closed space's notice naming the chat.
- Calls on Sailfish OS.
- A ring while Erevos is closed: it shows as missed when the space next syncs.
- MatrixRTC's sticky membership (MSC4354, Element Call's "Matrix 2.0" mode): Element Call is not given sticky events.
- Group calls with the older `m.call.*` (only rooms of two), and threads of voice messages' own screen.
- Everything on this page's threads, polls, places, pins, rooms, accounts and older calls against a real homeserver and
  Element, FluffyChat and Nheko on a phone: so far only against the server played in the checks
  (`checks/matrix-more.check.ts`, `checks/matrix-voip.check.ts`).
- Element Call's background blur (its models are left out of the APK).
