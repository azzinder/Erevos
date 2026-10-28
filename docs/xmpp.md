# XMPP accounts in Erevos

Erevos can hold an XMPP (Jabber) account, so people can write to friends who use Conversations,
Monal, Gajim, Dino, Cheogram or any other XMPP app. Erevos talks to the person's XMPP server
itself, as those apps do: messages are encrypted on the phone with OMEMO and opened on the other
person's devices. No bridge sits in between.

## What XMPP chats do not have

XMPP chats are not anonymous, and the app says so on them. The server sees the account, its
contacts, who talks with whom and when, and the phone's address unless it goes through Tor. The
other person's server sees the same of the chats with its people. None of Erevos's own protections
apply: no queue per contact, no padding to one size, no Nostr, no relay hops. What stays private
is what is written, once OMEMO encrypts it.

## How it is built

- `crates/erevos-xmpp`: OMEMO 0.3 (XEP-0384 version 0.3, namespace
  `eu.siacs.conversations.axolotl`), the version Conversations, Monal, Gajim, Dino and Cheogram
  all speak. It is the Signal protocol as libsignal had it in 2016: X3DH with XEdDSA signatures to
  begin, then the Double Ratchet, with libsignal's message format (protobuf, version byte 0x33,
  8-byte HMAC), keys (HKDF info `WhisperText`, `WhisperRatchet`, `WhisperMessageKeys`) and limits
  (2000 skipped messages, 5 receiving chains). A message's text is encrypted once with
  AES-128-GCM; its key and tag go to each device through its ratchet. Like the rest of the core
  it keeps nothing between calls: one JSON request in, one JSON answer out (`op`: `identity_new`,
  `signed_pre_key_new`, `pre_keys_new`, `session_start`, `encrypt`, `decrypt`, `sign`, `verify`,
  `file_encrypt`, `file_decrypt`).
- `crates/erevos-ffi` passes it on as one call, `xmpp`, through JNI and WebAssembly.
- `crates/erevos-tor` opens the connection to the server on Android (`net_open`, `net_write`,
  `net_read`, `net_close` in the FFI): TLS straight away (XEP-0368, port 5223, ALPN
  `xmpp-client`) or STARTTLS on port 5222, straight or through Tor with a circuit of its own per
  server. The TLS is rustls with Mozilla's roots (webpki-roots), checked for the XMPP domain.
- `app/lib/xmpp-net.ts` finds the server: the SRV records `_xmpps-client._tcp` and
  `_xmpp-client._tcp` asked over DNS-over-HTTPS (through Tor when the space goes through Tor), and
  the domain itself on 5222 when there are none. In the web app, where no socket can be opened,
  it uses the server's WebSocket (RFC 7395), found in its `/.well-known/host-meta` (XEP-0156). A
  server written on the sign-in screen (host, host:port, or a `wss://` address) is used as given.
  With the Tor way Messages, a server Tor cannot reach is tried straight; with Everything, never.
- `app/lib/xmpp-xml.ts` reads the stream in pieces cut anywhere; `app/lib/xmpp-sasl.ts` signs in
  with SCRAM-SHA-256 or SCRAM-SHA-1 (RFC 5802, RFC 7677), which also proves the server knows the
  password, or with PLAIN only inside TLS.
- `app/lib/xmpp.ts` is the account: resource binding, the roster and presence subscriptions,
  Message Carbons (XEP-0280) so other apps of the same account read along, the Message Archive
  (XEP-0313, since the last message read, so nothing comes twice), delivery receipts (XEP-0184),
  read marks (XEP-0333), OMEMO device lists and bundles in PEP (published open to anyone, as
  OMEMO needs), entity capabilities (XEP-0115) with `+notify` for device lists, and answers to
  pings and disco#info. A message goes to every device of the person and to the account's own
  other devices; when the person has none with OMEMO, nothing is sent unless the chat chooses to
  write without encryption. Used one-time pre-keys are replaced and published again.
- `app/lib/xmpp-store.ts` keeps the open space's account connected while the space is open
  (again after a pause that grows, a ping after 4 minutes of silence), and keeps it encrypted in
  the space (`app/lock/xmpp-data.ts`, file `erevos-xmpp`).

Our own code, not audited. It is checked against python-oldmemo (the OMEMO 0.3 of Gajim's and
Slixmpp's library) both ways: a message python-oldmemo sent is one of the crate's tests, and
`docs/xmpp-checks/oldmemo-cross.py` runs a conversation between the two:

```
python3 -m venv /tmp/omemo && /tmp/omemo/bin/pip install oldmemo xmlschema
cargo build -p erevos-xmpp --example omemo-call
/tmp/omemo/bin/python docs/xmpp-checks/oldmemo-cross.py target/debug/examples/omemo-call
```

## Checks it makes

- A bundle's signed pre-key counts only when its signature is the identity key's (XEdDSA, the
  sign bit read from the signature as libsignal does, so older clients' signatures count too).
- A message counts only when its MAC, over both identity keys and the message, is right; a state
  changes only then.
- A message number read once does not open again; one more than 2000 ahead is refused.
- A first message read again (from the archive) is read by the session it began, and does not
  use up another pre-key.
- A carbon copy counts only when it comes from the account itself; anyone else's is dropped.
- SCRAM asks for between 4096 and 1,000,000 rounds, and the server's own proof must be right.

`app/checks/xmpp.check.ts` runs two accounts and a second device against a small server written
for it: the stream in pieces, SCRAM's RFC examples, a wrong password, OMEMO both ways, carbons,
receipts, read marks, the archive read once, and a person with no OMEMO. It was also run by hand
against Prosody 0.12 over its WebSocket: sign-in, roster both ways, OMEMO
both ways, receipts and the archive.

## Screens

- `app/xmpp.tsx`, under Settings → Relay and networks → XMPP: signing in (address, password, and a server
  only when DNS does not find it), then the people who asked to add the account (Accept, Decline), a new chat
  with an address, the chats, the contacts the account has without a chat, this device's OMEMO fingerprint, and
  signing out. It says the chats are not anonymous, and on Android whether the connection goes through Tor.
- `app/xmpp-chat.tsx`: two tiles at the top that call the person (video, voice; see Calls), the messages,
  with delivery and read marks, each call's line, a locked message that could not be opened here, and below the chat the fingerprints of the person's devices, with a note for a key that
  changed. A person with no OMEMO gets nothing until the chat chooses **Write without encryption**
  (`plain` in `XmppChat`); **Encrypt again** goes back. **Remove this chat** removes it here only.
- The home list (`xmppInboxRows` in `app/lib/inbox.ts`): each chat is a row, `network: 'xmpp'` with `xmpp:` and
  the address as its identity, in the XMPP chip beside the SMS, Erevos and Matrix ones; a person who asked to
  add the account is a row at the top until answered. The chip shows once the space has an account.

## Calls

One-to-one voice and video calls, as Conversations, Monal and Dino make them, on the same call
screen as Erevos's own (`app/lib/xmpp-calls.ts`, a `CallPlace` of `app/lib/calls.ts`; the call is
`app/lib/call.ts`'s):

- **Ringing (XEP-0353):** a call of ours is a `<propose>` to the person's bare address, with an
  `<description media>` per kind, so it rings on all their devices. The first `<proceed>` names the
  device that has the call; it alone gets the `session-initiate`. A `<retract>` takes ours back,
  `<reject>` turns theirs down (with a Jingle reason: `decline`, `busy`), and `<finish>` tells both
  archives the call ended. Answering theirs sends `<proceed>` to their device and `<accept>` to our
  own bare address, so our other devices stop ringing; theirs doing so stops the ring here
  (`endedElsewhere`). The ring's id is the Jingle session's id.
- **The session (XEP-0166, XEP-0167):** `session-initiate` carries the caller's description,
  `session-accept` the answer, `session-terminate` the end, `session-info` with `<ringing>` the ring
  for an app that started with Jingle at once, and `transport-info` addresses that come one at a
  time (`Call.addCandidates`, held until the description is set). Anything else is said no to
  (`feature-not-implemented` with `unsupported-info`), and a session nobody knows here gets
  `item-not-found` with `unknown-session`.
- **Descriptions (`app/lib/jingle-sdp.ts`):** WebRTC's SDP to Jingle and back: one content per media
  section, named by its `mid`; payload types with their parameters (a nameless one, as RED's
  `111/111`, kept) and RTCP feedback (XEP-0293); header extensions and `extmap-allow-mixed`
  (XEP-0294); sources, their `msid` and groups (XEP-0339); the BUNDLE group (XEP-0338); ICE-UDP
  (XEP-0176) with the DTLS fingerprint and `setup` (XEP-0320). Only UDP addresses given as numbers
  pass: a `.local` name or a host name is dropped, as it would be looked up. An app that names no
  stream gets one per call, so sound and picture play together.
- **Rings without an offer:** a ring has no description, so the call rings with none and
  `CallEvents.offer` asks for it as it is answered: `<proceed>`, then the `session-initiate` it
  waits for. So an answer always goes through a call relay when there is one.
- **The way it goes:** the space's own call relay first, else the XMPP server's TURN server
  (XEP-0215 `extdisco:2`, with the credentials it gives), always with `iceTransportPolicy: 'relay'`,
  so the other side never learns this phone's address; with neither, straight. Media never goes
  through Tor.
- **Who may ring:** people in the account's contacts with a subscription; anyone else's call is
  only a missed line. A ring from the archive, or older than a minute, is a missed line too.
- **What it does not protect:** the descriptions, the DTLS fingerprint with them, go through the
  XMPP servers as they are, so those servers could put themselves in between; XMPP apps do the same.
  The guide says so.
- **Each call has one line** in its chat (`call: true` in `XmppMessage`, kept in English and shown
  by `app/lib/call-lines.ts`), by the call's id, so a missed ring and its end do not make two.
- **Caps:** the features say Jingle, RTP audio and video, ICE-UDP, DTLS and XEP-0353, which is what
  Conversations looks for before it shows its call buttons.

`app/checks/jingle-sdp.check.ts` turns a Chromium offer to Jingle and back, with the directions for
each side, an app that names no stream, and transport-info. `app/checks/xmpp-calls.check.ts` plays
the other side as Conversations does, stanza by stanza, through the checks' server
(`app/checks/xmpp-server.ts`): a call of ours through the server's TURN to the device that answers,
theirs answered and hung up, turned down, taken back, answered on another device of ours, rung while
in another call, a stranger's, an older app's, and a session nobody knows. `docs/xmpp-checks/jingle-browser.ts`
connects two of Chromium's own WebRTC peers whose descriptions and addresses go through Jingle XML on
the way (sound, sound and picture, addresses one at a time). The same flows were also run by hand
against Prosody 0.12 with `mod_turn_external`. Not yet tried with Conversations, Monal or Dino on a
phone.

## Notices

Each change of the account says how many messages each chat has not read, and one who asks to add
the account counts as one, to `app/lib/network-notices.ts`: what went up came, and shows the same
notice as a message in Erevos's own chats (`app/lib/background.ts`), with its sound; what went down
was read, here or on another device of the account (its read marks, as carbons). The number on
Erevos's icon counts them (`app/lib/unread.ts`), the computer's notice too. What the archive gives
just after signing in (`fresh`) tells of nothing. A chat has notifications of its own (`notify`, as
`app/lock/chat-notify.ts` keeps them), set from **Notifications** at the bottom of its screen on
Android; a muted one is left out, and a call rings with the chat's ringtone. A chat is marked read
only while Erevos shows it.

## Not yet

- OMEMO 2 (`urn:xmpp:omemo:2`), which Kaidan and newer Gajim speak beside 0.3.
- Group chats (MUC) and group calls, adding video to a voice call (`content-add`), moving a call to
  another device, and photos and files (HTTP upload, `aesgcm://` links; the crate already encrypts and
  opens them).
