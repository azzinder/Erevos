<!--
SPDX-FileCopyrightText: 2026 azzinder
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
-->

# Post-quantum ratchet

`crates/erevos-core/src/spqr.rs`, used by `conversation.rs`. Not audited.

PQXDH (protocol.md §3) makes the start of a conversation hold against someone who records it now
and breaks X25519 later with a quantum computer. The double ratchet after it heals only with
X25519: once such a computer reads one ratchet step, it reads the steps after it too. The
post-quantum ratchet adds a fresh ML-KEM-768 secret now and then, an **epoch** at a time, and mixes
the key of the epoch into every message key. So whoever records the conversation and later breaks
X25519 still needs to break ML-KEM to read what came after each epoch began.

It is the same idea as Signal's SPQR, not its code or its wire format: Erevos's own, smaller,
written for one conversation between two people.

## When it is on

Each conversation turns it on by itself, with no switch:

1. Every message an Erevos with this core seals says `pq: 1` inside, encrypted (app/lib/e2e.ts,
   `Message.pq`).
2. A side that opens a message saying it calls `enable_pq` on that conversation: from then on it
   seals post-quantum packets (below).
3. A side that opens a post-quantum packet turns it on too, if it was not already.

An Erevos before this ignores `pq` and never receives a post-quantum packet, because no one turns
it on for it. Packets of the older kind still open after it is on (one sent before, come late).
Groups (MLS) do not have it.

## Packets

```text
following, post-quantum: VERSION(1)=1 ‖ 0x03 ‖ header(40) ‖ field(110) ‖ ciphertext
field:                   generation be32 ‖ epoch be32 ‖ piece(102)
piece:                   kind(1) ‖ for epoch be32 ‖ index(1) ‖ bytes(96), zero padded
```

- `kind`: 0 nothing (the whole piece is zeros), 1 a piece of an encapsulation key (1,184 bytes, 13
  pieces), 2 a piece of a ciphertext (1,088 bytes, 12 pieces). The last piece of each is shorter and
  the rest of it must be zeros, so a piece has one encoding.
- The field always has the same length, so a packet's length does not tell what step its sender
  is at. It adds 110 bytes to every packet: small enough that a text of up to 1,024 bytes padded
  still goes in 10 SMS (app/lib/sms-packets.ts), as before; a short one takes 4 instead of 3.
- AEAD associated data: `AD(64) ‖ field(110) ‖ header(40)`. The field is authenticated with the
  message, so only the other side could have made it, and it is taken in only once the message
  opened.

## Message keys

```text
mk'  = mk                                                         in epoch 0
mk'  = HKDF(salt = K_e, ikm = mk, info = "erevos spqr message v1", L = 32)   in epoch e > 0
K_e+1 = HKDF(salt = K_e, ikm = ML-KEM shared secret,
             info = "erevos spqr epoch v1" ‖ (e + 1) be32, L = 32)        K_0 = 32 zero bytes
```

`mk` is the double ratchet's message key (protocol.md §5); `mk'` then gives the ChaCha20-Poly1305
key and nonce as before. Each new epoch key comes from the one before it and the new secret, so it
holds while either does.

## Epochs

The two sides take turns making the key pair. For epoch 1 it is the conversation's initiator.

1. **Key side** makes an ML-KEM-768 key pair and sends its encapsulation key in pieces, one with
   every message, round and round, still sealing in epoch e.
2. **The other side**, once it has every piece, encapsulates: it knows `K_e+1` at once, and sends
   the ciphertext in pieces, still sealing in epoch e, as the key side cannot open e + 1 yet.
3. **Key side**, once it has every ciphertext piece, decapsulates, seals in e + 1 from then on, and
   waits for the next key.
4. **The other side**, on the first message it opens in e + 1, seals in it too and makes the key
   pair for e + 2: the roles swap.

A lost message only means waiting for its piece to come round again. With messages going both ways,
an epoch takes about thirty of them each way. One side writing alone stays in its epoch.

The last 8 epoch keys are kept (`KEPT_EPOCHS`), so a late message still opens. The decapsulation
key is kept as its 64-byte seed until the ciphertext comes.

## Backups

A conversation put back from a backup has lost the epochs after it, and could not open what the
other side seals in them. So `restored()` also starts the post-quantum ratchet over, at epoch 0 of
a later **generation**: the old one plus 1 plus a random number up to 65,536, so two restores of one
backup do not land in the same one. A side that opens a message of a later generation than its own
starts over in it too. A message of an earlier generation opens only if it was sealed in its epoch
0; anything else of it changes nothing.

Starting over brings the conversation back to what the double ratchet alone gives, until the next
epoch.

**Not covered:** a backup made before the post-quantum ratchet was on, put back after the other
side turned it on. The restored conversation has nothing to start over, and cannot open what the
other side sends in its later epochs. The app's new conversation after a restore (protocol.md §4,
`E2E.startAnew`) is the way out of it.

## Kept state

A conversation kept with the post-quantum ratchet on has, after the other person's key, the byte
`0xA5`, a be32 length, then the ratchet's state: version, generation, epoch, the kept epoch keys,
and the step (key side: the seed, the next piece to send, the ciphertext pieces so far; waiting:
the key pieces so far; sending the ciphertext: it, the next piece, the new epoch key). One kept
before it has the session's version byte there instead, so it still loads.
