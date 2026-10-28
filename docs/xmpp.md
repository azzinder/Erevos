# XMPP accounts in Erevos

Erevos can hold an XMPP (Jabber) account, so people can write to friends who use Conversations,
Monal, Gajim, Dino, Cheogram, Kaidan or any other XMPP app. Erevos talks to the person's XMPP server
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
  `file_encrypt`, `file_decrypt`). Beside it, `omemo2.rs` is OMEMO 2 (below), its ops named
  `two_*`.
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
  write without encryption. Used one-time pre-keys are replaced and published again; the used
  one is kept three days (50 at most), so someone who took it from the bundle before the new one
  was out, as another did, still begins a session that opens (both versions).
- `app/lib/xmpp-files.ts`: photos and files, below.
- `app/lib/xmpp-muc.ts`: groups, below.
- `app/lib/xmpp-store.ts` keeps the open space's account connected while the space is open
  (again after a pause that grows, a ping after 4 minutes of silence), and keeps it encrypted in
  the space (`app/lock/xmpp-data.ts`, file `erevos-xmpp`). A hidden place can have an account of its
  own (Hidden chats, below).

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
receipts, read marks, the archive read once, a person with no OMEMO, and photos and files both ways,
encrypted and as they are, through an upload service played there (only the slot's allowed headers
sent, a changed file not opened, one too large not sent, a server without the service said so). It was also run by hand
against Prosody 0.12 over its WebSocket: sign-in, roster both ways, OMEMO
both ways, receipts and the archive.

`app/checks/xmpp-muc.check.ts` plays groups on the same server, which also has a group service and bookmarks: a private
group made and set up members only and not anonymous, its people invited and joining, all writing with OMEMO to every
member's devices and reading each other with the server keeping only ciphertext, a second device of the account joining
by the bookmarks and reading along, what came while a device was away read from the group's archive once, a member
without OMEMO, a channel written as it is whose history counts as read and that tells only of what names the account,
groups joined and left in another app of the account, invitations only from contacts (and one said no to), and photos in
a private group opened by every member. Not run against a real server yet.

## OMEMO 2

OMEMO 2 is version 0.8 of XEP-0384, namespace `urn:xmpp:omemo:2`, which Kaidan and the other apps
built on QXmpp speak. Erevos speaks it beside 0.3, to each device that has it, and 0.3 to the
others, so one message can carry both.

- **One identity.** OMEMO 2 says an identity as an Ed25519 key; this device's is the Edwards form
  of its Curve25519 identity with the sign bit 0, the key XEdDSA signs with, so both versions show
  one device with one key. Its fingerprint looks different in each, so the XMPP screen shows both,
  the second marked as Kaidan shows it. OMEMO 2 has its own signed pre-key and 100 one-time
  pre-keys, replaced as they are used.
- **The core** (`crates/erevos-xmpp/src/omemo2.rs`, ops `two_identity`, `two_signed_pre_key_new`,
  `two_pre_keys_new`, `two_session_start`, `two_encrypt`, `two_decrypt`): the ratchet of 0.3 with
  OMEMO 2's derivations (`OMEMO X3DH`, `OMEMO Root Chain`, `OMEMO Message Key Material`), its
  protobuf messages (`OMEMOKeyExchange`, `OMEMOAuthenticatedMessage`, `OMEMOMessage`, a 16-byte
  MAC over both identities and the message) and its payload: AES-256-CBC with a 16-byte HMAC, both
  from one 32-byte key through HKDF (`OMEMO Payload`), that key and the HMAC going to each device.
- **On the server** (`app/lib/xmpp-omemo2.ts`): the device list in the PEP node
  `urn:xmpp:omemo:2:devices` (item `current`, other devices' labels kept as they are), and each
  device's bundle as one item of `urn:xmpp:omemo:2:bundles`, its id the device's, the node asked to
  keep `max` items, else 1000, 100 or 10, as QXmpp asks. Both are published open to anyone.
- **The payload** is an SCE envelope (XEP-0420): the `<body>`, random padding of 0 to 149 bytes, the
  time, and who it is from and to. One that comes counts only when its `from` is the sender's
  address and its `to` is this account (or, for a copy of our own from another device, the other
  person; in a group, the group), so an envelope cannot be passed on as another chat's.
- **Which version** (`app/lib/xmpp.ts`): a device gets OMEMO 2 when it is in the person's OMEMO 2
  list and this device's own OMEMO 2 bundle has been on the server once; else 0.3. A message to
  someone with both kinds of device carries both `<encrypted>` elements, and its `<encryption>`
  (XEP-0380) names 0.3 when 0.3 is in it. A message that comes is read in OMEMO 2 when it has a key
  for this device there, else in 0.3. Signing out takes this device out of both lists, and its
  OMEMO 2 bundle off the server.

Checked against python-twomemo (the OMEMO 2 of Gajim's and Slixmpp's library) both ways, with
`docs/xmpp-checks/twomemo-cross.py`: a session begun by each side, messages both ways, an empty
one that only moves the ratchet on, a bundle with a wrong signature refused, and one identity seen
the same by both:

```
python3 -m venv /tmp/omemo && /tmp/omemo/bin/pip install twomemo==2.1.0 xmlschema
cargo build -p erevos-xmpp --example omemo-call
/tmp/omemo/bin/python -I docs/xmpp-checks/twomemo-cross.py target/debug/examples/omemo-call
```

`app/checks/xmpp.check.ts` has an account with one device that speaks only OMEMO 2, one with only
0.3, and one with a device of each: each reads the other, and the server sees one version or both
as the devices ask. The XML and the envelope follow QXmpp's code; not yet tried with Kaidan on a
phone.

## Screens

- `app/xmpp.tsx`, under Settings → Relay and networks → XMPP: signing in (address, password, and a server
  only when DNS does not find it), then the people who asked to add the account (Accept, Decline) and the groups that
  invited it (Join, Decline), a new chat with an address, **New group** (a name and the contacts to invite, ticked as
  chips; it says the group is private and encrypted with OMEMO for every member), **Join a group** (an address such as
  `name@conference.example.org`, and a password if it asks; it says a group that is not private, a channel, is not
  encrypted), the chats and groups (a group is marked as a private group or a channel, and its last message says who
  wrote it), the contacts the account has without a chat, this device's OMEMO fingerprint, and signing out. It says the
  chats are not anonymous, and on Android whether the connection goes through Tor.
- `app/xmpp-chat.tsx`: two tiles at the top that call the person (video, voice; see Calls), the messages,
  with delivery and read marks, each call's line, a locked message that could not be opened here, a photo or
  file with **Show photo**, **Play** (a sound) and **Save** (`components/network-file.tsx`, as Nostr chats have it),
  **Photo** and **File** under the message box, and below the chat the fingerprints of the person's devices, with a note for a key that
  changed. A person with no OMEMO gets nothing until the chat chooses **Write without encryption**
  (`plain` in `XmppChat`); **Encrypt again** goes back. **Remove this chat** removes it here only.
  A group (`room` in `XmppChat`) is the same screen with its own words and no call tiles: its name and address, a line
  saying a private group is encrypted with OMEMO for every member and not anonymous, or that a channel is not
  encrypted and that everyone in it, and the servers, can read it, a status line while it is being joined or when the
  room did not let the account in (`room.problem`), its subject, and for each message the name of whoever wrote it, with
  only its time (no delivery or read marks: the room passes a message back once it has it) and Sending… or Not sent. When
  nobody in a private group has an OMEMO app Erevos can find, the same choice is offered (**Write without
  encryption**). Below a private group are its **Members**, each with the fingerprints of their devices as a chat
  has them, and a note on one with no OMEMO keys found (they are looked up as the group opens), who
  cannot read what is encrypted; for an admin of the room, **Add people** picks from the account's contacts who are not
  members yet. A channel says it tells only of messages that name the account. **Leave the group** replaces **Remove
  this chat**, and says the account's other XMPP apps leave it too.
- The home list (`xmppInboxRows` in `app/lib/inbox.ts`): each chat and group is a row, `network: 'xmpp'` with `xmpp:` and
  the address as its identity, in the XMPP chip beside the SMS, Erevos and Matrix ones, a group's last message with
  its writer's name before it; a person who asked to add the account, and a group that invited it, is a row at the
  top until answered (`invited: true`, opening the XMPP screen). The chip shows once the space has an account.

## Groups

Group chats as Conversations, Monal, Gajim and Dino have them (`app/lib/xmpp-muc.ts`): rooms of a multi-user chat
service (MUC, XEP-0045), which each device of the account joins by itself.

- **Private groups and channels.** A room is a private group when it says in disco#info that it is members only
  (`muc_membersonly`) and non-anonymous (`muc_nonanonymous`); every other room is a channel. A private group is what
  Conversations calls a private group: only its members can join, and everyone in it sees everyone's real address, which
  is what lets OMEMO write to each member. A channel is written as it is, with no encryption, and says so wherever it
  shows.
- **Encryption in a private group.** A message is a `groupchat` message with OMEMO 0.3, encrypted to every device of
  every member and to the account's own other devices, like a message to one person but to many (one AES-128-GCM key,
  wrapped for each device through its ratchet). The members are the room's affiliation lists (owner, admin and member,
  asked with XEP-0045 §9.5) and the real addresses of those in the room (`jid` in the presence, `Room.occupants`); their
  device lists are fetched as the group's screen opens and as a message is written, and their sessions started then,
  as for one person. A message that
  comes is opened for the device that wrote it: the sender is the real address in the presence, or, when the room does
  not say, whichever member has a device with the id in the message's header. One who has no OMEMO device is left out
  and marked; when nobody has one, nothing is sent unless the chat chooses to write without encryption, as for a
  person. Someone who joins later cannot read what came before: it shows as locked. A message the room passes back
  (every room does) marks the one sent from here as sent; a group has no delivery receipts or read marks.
- **Making a group.** The server's group service is found by disco#items on the account's domain (an item whose
  identity is `conference`/`text`) and kept a day. The room is `<16 random hex characters>@<service>`, made by joining
  it and then submitted its owner form (XEP-0045 §10.1.3), with only the fields the room offers: the name, persistent,
  members only, non-anonymous, not listed, no password, not moderated, subject changeable only by admins, archived
  (`muc#roomconfig_enablearchiving` or `mam`), and, for ejabberd, `muc#roomconfig_getmemberlist` so members may see who the
  members are. The people chosen get the member affiliation and a mediated invitation. The account owns the room.
- **Joining a group.** By an address typed, or as an invitation asked: disco#info on the room says whether it is
  private, has an archive (MAM) and what it is called; then the presence to `room/nick`, with the password if there is
  one. The nickname is the account's name before the `@`, with a `_` more when the room says it is taken. Why
  a room did not let the account in comes as the presence error (members only, forbidden, a password asked, no such
  room), or as the status codes of an unavailable presence (banned, taken out, the server stopped), and shows on the
  group's screen. A room is joined again on each connection.
- **Bookmarks (XEP-0402).** The groups the account is in are items of its `urn:xmpp:bookmarks:1` node, with
  `autojoin`, the nickname and the password, published open to the account only (`access_model` whitelist; a server that
  refuses the options gets the item without them). On each start the node is read and its groups joined, and
  `urn:xmpp:bookmarks:1+notify` in the capabilities has the server tell of changes: a group joined in another app is
  joined here, one left there (autojoin off, or the item retracted) is left here, and **Leave the group** retracts the
  item, so the account's other apps leave it too. Leaving does not take the account off a private group's member list; an
  admin of the room does that.
- **Invitations.** Through the room (XEP-0045 §7.8.2, `<invite>` in a message from the room) or straight from the person
  (XEP-0249, `jabber:x:conference`). Only an invitation from one of the account's contacts is kept, since anyone can
  invite anyone, with its reason (up to 300 characters) and the password it carries; it is shown with the room's
  address and who invited. **Join** joins with that password; **Decline** answers through the room (`<decline>`) and
  drops it.
- **What came before.** A room with an archive (MAM, XEP-0313, on the room's own address) is read after the last message
  seen, 50 at a time, its newest page the first time; the presence then asks for no history. A room without one gives, in
  the join presence, what came since the last message (`history since`), or its last 20 the first time. What was there
  before the account joined counts as read.
- **What counts as not read.** In a private group, every message from someone else; in a channel, only those that name
  the account's nickname as a word of their own (`mentions`), so a busy channel does not fill the number on Erevos's icon
  or make a notice for each message. Messages from the account's own devices never count. Notices, the icon's number and
  a chat's own sounds work as for any chat.
- **What the servers see.** The room's server sees the room, who is in it with their addresses (a private group's
  members are public to each other by design), who writes and when, and the account's server sees its bookmarks, so
  which groups it is in. In a private group they keep only ciphertext, in the room's archive too; in a channel they keep
  and can read the text. None of Erevos's own protections apply.
- **Files.** Photos and files go to a group as to a chat, through the account's server's upload service: encrypted on the
  phone in a private group, and sent as they are in a channel.
- **Not yet.** Changing a group's name or subject, removing or banning someone, roles, private messages inside a room,
  and a room's other settings: an admin does them in another app.

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
  `item-not-found` with `unknown-session`. Either side can add video to a voice call with Jingle's
  `content-add`; the other is asked first and answers `content-accept` or `content-reject`.
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

## Photos and files

As Conversations, Monal, Gajim and Dino share them:

1. The server's upload service (XEP-0363) is found by disco#info on the account's domain, then on each
   item disco#items gives; it is kept a day, with the largest file it takes (`max-file-size`).
2. In a chat encrypted with OMEMO the file is encrypted on the phone with AES-256-GCM, by a key and a
   12-byte IV made for it alone (the crate's `file_encrypt`), and asked a slot for under a random name with
   its ending, as `application/octet-stream`. In a chat written without encryption it goes as it is, under
   its own name.
3. It is put with an HTTPS PUT to the slot's address, with only the `Authorization`, `Cookie` and `Expires`
   headers the slot gives (XEP-0363 §4), and the message says where to fetch it: encrypted, its
   `aesgcm://` link with the IV and key as the fragment (XEP-0454), inside the OMEMO payload like any text;
   as it is, its `https://` link as the body and in an out-of-band element (XEP-0066).
4. A message whose whole text is an `aesgcm://` link (a 12- or 16-byte IV), or an `https://` link that its
   out-of-band element names too (in an unencrypted message only), is a file, with its name and type from
   the link. It is fetched only when asked for, and an encrypted one opens only when its GCM tag is right.

Up to 50 MB (`XMPP_FILE_MOST`), less when the service says less. Uploads and fetches go through Tor as the
chat does (`app/lib/net-http.ts`, as Nostr's files). A file fetched is kept in memory while the space is
open (`app/lib/file-cache.ts`), not on the phone.

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

## Hidden chats

Each place of hidden chats can sign in to an XMPP account of its own, apart from the space's, that
nothing outside its hidden chats shows.

- `app/lib/place-networks.ts` opens the place's account (`openXmppPlace`) as its hidden chats open
  and closes it (`closeXmppPlace`) as they close, so it connects only while they are open and a
  closed place receives nothing. Its sign-in and keys are kept encrypted with the place's key, in the
  place's own value of `erevos-xmpp`: the holders `hidden` and `hidden1` to `hidden3` of
  `app/lock/sealed-file.ts` (`hiddenHolder(pocket)`), beside the space's `space`, which never sees them.
- `app/lib/network-place.ts`: `app/xmpp.tsx` and `app/xmpp-chat.tsx` read a `hidden=1` route param
  (`useNetworkWhere`), show the place's account (`xmppNow('place')`), say under the title that it is
  the hidden chats' own, and while they are on top what is done goes to that account; the chat they
  open takes the param on (`whereParams`). The hidden chats' list (`app/app/chat.tsx`) has **XMPP**
  under it, and lists the place's chats (`xmppInboxRows`), which open with `hidden=1`
  (`components/chat-row.tsx`).
- It tells nothing outside its hidden chats: no notice, no number on Erevos's icon or the home list,
  and no notification settings. It has no calls: the tiles are not on its chats, and a call to it is
  refused (`app/lib/xmpp-calls.ts` takes calls for the space's account only).
- `app/checks/place-networks.check.ts` checks the stores against the server played in the checks,
  with the real core; not yet on a phone.

## Not yet

- Group calls, and moving a call to another device.
- OMEMO 2 with Kaidan on a phone: so far only against python-twomemo and the server played in the
  checks.
- Photos and files against a real upload service: so far only the one played in the checks.
