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

## Not yet

- The connection to the server, the screens, and the account in the home screen's list.
- OMEMO 2 (`urn:xmpp:omemo:2`), which Kaidan and newer Gajim speak beside 0.3.
- Group chats (MUC), calls (Jingle), and files (HTTP upload, `aesgcm://` links; the crate already
  encrypts and opens them).
