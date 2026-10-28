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

## Not yet

- The screens, and the account in the home screen's list.
- OMEMO 2 (`urn:xmpp:omemo:2`), which Kaidan and newer Gajim speak beside 0.3.
- Group chats (MUC), calls (Jingle), and files (HTTP upload, `aesgcm://` links; the crate already
  encrypts and opens them).
