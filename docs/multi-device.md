# Linked devices with the primary off

docs/linked-devices.md describes the link as it is: the phone (the **primary**) is the account,
and passes on what comes for its linked devices and what they write (the third way there). It
costs one thing: with the phone off, the computer reaches no one. This note is how Erevos moves to
the second way there, on top of the first, so linked devices keep working with the primary off,
for every contact on a version that knows about it, while contacts on older versions keep going
through the primary as today. It is built in phases, each one shipped on its own (at the end).

**Not audited.** Nothing here is a new primitive: the account's Ed25519 identity key, which already
signs its bundle, signs one more kind of statement.

## Decisions

- **Each linked device has an identity of its own**, an **endpoint**: a core account the device
  makes and never shows anyone. No device ever holds the account's own secret. Signal copies its
  identity key to every device and relies on its server to cut a removed one off; Erevos has no
  such server, so an unlinked device must be cut off by keys alone, and it is: it was never more
  than an entry in a list the account signs.
- **The primary stays the account.** Its endpoint is the account's identity, so every
  conversation there is today stays as it is. It alone signs the device list, links and unlinks.
  It keeps passing on for contacts on older versions, and stays the one member of groups (MLS).
- **Contacts learn the account's bundle once, from inside the account's own conversation**, and
  from then on take any device list it signs, write to every endpoint in it, and take a
  conversation that a listed device starts.
- **Safety numbers do not change.** They cover the X25519 identities, as today. The account's
  bundle is trusted because it came inside the conversation the number covers, and each device
  because the bundle's key signed the list.
- **Own devices reach each other directly**, all with all: the primary's links to each device
  stay, and the devices start conversations with each other from the list's bundles.
- **The relay does not change.** Everything uses what it has (SEND, FORWARD, SEALED_SEND, RECEIVE,
  WAIT, FILE_*, LATER/UNLATER, CALL_RELAY). One connection takes many requests, so the copies of
  one message for several endpoints go together (lib/relay.ts `RelaySession`).

### Why the bundle comes only from inside the conversation

A bundle's signature shows that its Ed25519 key signed its X25519 keys, not that whoever made it
holds the X25519 identity secret (crates/erevos-core/src/pqxdh.rs). Anyone can put someone else's
X25519 identity, their own Ed25519 key and their own "device" in a contact link, and the safety
number would still match. But no one can finish PQXDH as an identity without its secret, so a
bundle that arrives inside a conversation with that identity is that identity's. So a contact
takes the account's signing key **only** from a message opened in the conversation whose peer is
the account's identity, and only when the bundle names that identity: never from a contact link,
never from a device's conversation.

## Protocol

### Signatures (phase 0)

- `Account::sign(context, message)` (crates/erevos-core/src/conversation.rs) signs
  `"erevos signed v1\0" ‖ context ‖ 0x00 ‖ message`. The context names what the statement is
  (`devices`) and holds no zero byte; no bundle transcript (`"erevos prekey bundle v1"…`) starts
  that way, so a statement and a bundle signature never pass for each other.
- `PrekeyBundle::verify_signed(context, message, signature)` checks the bundle, then the statement.
- FFI `account_sign` and `bundle_verify` (the bundle's identity, or nothing), through JNI and
  WebAssembly; app/lib/core.ts `accountSign`, `bundleVerify`, `canSign()`. A build without them
  stays on the primary's passing on.

### The device list (app/lib/device-list.ts)

Canonical JSON, keys in this order:

```
{"t":"erevos devices","v":1,"a":"<account identity hex>","n":<int>,
 "d":[{"i":"<endpoint identity hex>","b":"<endpoint bundle base64url>","f":<flags>}]}
```

- Signed as `accountSign(account, "devices", body)`; on the wire `{b: body, s: signature, r?}`.
- `n = max(previous + 1, now in ms)`. The last `n` is kept with the account (`E2EData.list`), which
  backups carry, so a primary put back from a backup still signs higher.
- At most 4 entries, sorted by `i`, no names. Flags: 1 messages, 2 calls, 4 group member (later).
- **Always 4 entries** (default, pending the owner's word, 2026-10-21): empty places hold
  endpoints made only for the list, whose secrets are thrown away and whose queues no one reads,
  so a contact cannot count the devices from the list. They cost contacts one copy of each message
  per empty place. A contact can still tell, over time, which places answer.
- `r` holds where each endpoint reads (`{id: {s, relay, rk}}`), deliberately unsigned: after the
  first message each endpoint's own messages say it, per conversation, as `from`, `relay`,
  `relayKey` and `spare` do today.
- A contact takes a list only if: `bundleVerify(contact.bundle, "devices", body, s)` gives
  `contact.identity`; `a` is `contact.identity`; `n` is above the one it holds (equal: nothing to
  do); each `b` holds and names its `i`, no `i` is `a`, none twice, at most 4.

### New fields in a chat message (lib/e2e.ts `Message`)

Older versions drop fields they do not know (`decodeMessage`), so all of these are safe to send.

| Field | Meaning | Rule |
|---|---|---|
| `dv` | "I know about devices, and hold your list `n`" (0: none) | In every message from an endpoint of this version. |
| `ak` | The sender's account bundle | From the account's own endpoint only; taken only inside the conversation with the account's identity, and only if it names it. Sent when the peer says `dv: 0`. |
| `dl` | The signed list | From any endpoint, when the peer's `dv` is below its own `n`; as a quiet message of its own. |
| `acct` | The account a device speaks for | In the first message of a conversation a device starts. |
| `solo` | "Write only to my account" | From the account (chats moved into hidden chats). |

Also: `CallEnd` gains `taken` (answered on another device); a file offer gains `shared`;
`Received` gains `from`, the endpoint it came through (`''` for the account); sealing takes an
optional `to`, for one endpoint only.

### New link messages (lib/link-wire.ts)

Older versions ignore an unknown `k`.

- `endpoint` (device → primary): its endpoint bundle, for links made before this.
- `list` (primary → devices, and passed on between devices): the signed list and the account's
  bundle; a device checks the bundle names the account it linked to (`hello`, over the link whose
  safety code was compared).
- `peer` (any endpoint → its siblings): what it learned of a contact's endpoints and whether that
  contact writes to it directly.
- `out`, `set`, `call`, `took`, `changed` may now come from any endpoint, with a time each, so
  they settle last writer first.

### How a contact finds and checks the devices

1. Each endpoint says `dv` in what it sends; the primary says `dv: 0` to a contact it knows
   nothing of yet.
2. The account sees a contact say `dv: 0` and sends `ak` and `dl` in a quiet message.
3. The contact checks them, keeps the bundle and the list, says `dv: n` from then on, writes to
   every endpoint, and tells its own devices (`peer`).
4. Conversations start when there is something to send: an endpoint with none starts PQXDH to the
   other's bundle; its first message says `acct`.
5. A first packet from an identity that is not a contact is taken only as an endpoint of the
   account `acct` names, and only if that account's checked list has it. If that cannot be checked
   yet, the packet waits (`E2EData.unverified`, at most 16, 14 days) and is tried again when a
   list arrives. Such a packet never becomes a message request.
6. A new device: contacts catch up when their `dv` is behind. An unlinked device: the account
   sends the new list at once to every contact that knows about devices, and devices pass it on
   too; contacts drop the endpoints no longer listed and refuse their packets.

Adding a new contact needs the account's own handshake, so the primary must be on once for each
new contact. A device can still ask for one to be added (`Links.add`), as today.

### What goes where

| What | To the contact's endpoints (if it knows about devices) | To own devices |
|---|---|---|
| text, voice, file, sticker, poll, place | every endpoint in its list, and its account | `out` |
| read, react, pin, vote, erase, timer | every endpoint | `out` |
| delivered (`got`) | only the endpoint it came from | that one passes on the mark |
| online, typing | endpoints seen online lately; else the account | none |
| call offer | every endpoint | `call` |
| call answer, ringing, end | the caller's endpoint | `call` answered or declined |
| group messages | the account only | none |

A contact that never said `dv` is treated as today: the primary seals for it and devices go
through the primary.

### One person, receipts, duplicates

A message that opens in one of a contact's endpoints is that contact's: the history has one chat
per contact, and no device's name shows. Each endpoint that receives a message says delivered to
the endpoint that sent it, which passes it on to its own devices. Read goes to every endpoint of
the other side and to own devices, so unread counts and disappearing timers start everywhere.
While contacts move over, the same message can arrive passed on by the primary and directly; it is
kept once, by (chat, tag) (`History.has`).

### Timers, reactions, deletes, pins, polls, files, sent for later

- The timer travels with every message, the later setting wins (`timerOf`), unchanged.
- Reactions, pins and votes settle by (time, endpoint), last writer first.
- Erase goes to every endpoint; each chat keeps the tags it erased (500 at most) so a late copy
  cannot bring one back.
- Files: the sender uploads one copy for the contact's account and one for its own devices, both
  `shared`; whoever takes one tells its siblings, and the last of the list to take it deletes it.
  Otherwise the relay drops it after 14 days.
- Sent for later: every endpoint's copy goes with `sendMessageLater`, and taking it back takes back
  every copy.
- Nearby and LoRa carry the main packet only; the other copies go through the relay.

### Calls (phase 4)

The caller decides who has the call: the offer goes to every endpoint, each rings, the first to
answer gets it, and the caller sends `end{taken}` to the others. A decline on one is a decline for
the account. Busy counts only when every endpoint is busy. Group calls stay on the primary.

### Groups

The primary stays the one MLS member: only the group's admin commits (crates/erevos-group), so a
device's own leaf would need every group's admin, often someone else, to add it, and members would
see each account's device count. With the primary off, groups wait on the devices. Later (phase 6),
device leaves that name the account (`about.id`) and that an admin's Erevos adds when the member's
signed list does.

## Own devices

All with all: the primary's links to each device (safety codes compared) stay, and devices start
conversations with each other from the list's bundles; the one with the lower id starts, the other
takes a first packet only from an id in the current list. lib/siblings.ts holds them; `Links.say`
writes to the primary and every sibling; link packets are sealed with sealed-packet marks.

What settles how: messages by (chat, tag), marks only go up; contact fields last writer first per
field; an accepted request stays accepted; removing a contact leaves a tombstone a deliberate re-add
overrides; erase wins; groups the primary decides. Device names stay on each device. Hidden places
never go over the space's link.

## Data

- Contact: `bundle` (their account bundle), `list` (their checked list), `endpoints` (theirs, each
  with its route and conversations), `dv`, `solo`, field times.
- Space: `endpoint` (a linked device's own account), `own` (its account's bundle and list), `list`
  (the primary's last signed list), `unverified`.
- lock/fanout-data.ts: the copies for other endpoints waiting for the relay, at most 300 per
  endpoint and 1000 in all. The conversations are saved before the outbox: a crash in between
  loses copies, which is safe; the other order would reuse message keys.
- Links made before this need no relinking: a device with no endpoint makes one and sends
  `endpoint`; an older primary ignores it and keeps passing on. New links carry the endpoint's
  bundle in the QR's key, which keeps its format.
- A device's backup put back elsewhere drops its endpoint and its endpoints' conversations before
  sealing anything, so two machines never seal as one device. A primary put back on another phone
  has listed devices but no links: it signs an empty list.

## Hidden places (phase 5)

Each hidden place links on its own, from inside it, with its own `Links`, data under
`hiddenHolder(pocket)`, and its own account signing its own list, so its contacts write to the
device's place directly. On the device, inside one of its four places (opened with that place's
PIN, empty): **Link to my phone** shows the usual QR; on the phone, inside the place: **Link a
device** scans it. Nothing of it shows in the space or in its linked devices. A hidden place syncs
only while open, as its key is in memory only then. Moving a chat into hidden chats sends `solo`,
so the contact stops writing to the space's devices.

## Costs and what still needs the primary

- Still needs the primary: contacts on older versions, adding each new contact once, linking and
  unlinking, groups (until phase 6).
- A lost primary cannot unlink a stolen device until a list is signed again (the primary or its
  backup). A primary taken over can add a device without the safety number changing, as in Signal:
  contact details show the list's last change.
- Traffic: from an account with 2 endpoints to a contact with a full list of 4, one text is 5 to 7
  packets instead of 1 or 2, and up to 4 delivered marks back.
- A device off for long fills its queue faster (1000 messages, 14 days); what came directly and was
  dropped comes back from the primary's history once it is on.
- The relay can tie an account's queues together (every contact writes to all of them at once).
  R4 (a sender id per contact) is the first relay change worth making after this.

## Phases

0. Signatures in the core (this note, crates/erevos-core, erevos-ffi, lib/core.ts). Nothing
   changes for anyone.
1. Endpoints and the signed list among own devices; contacts see nothing.
2. Own devices reach each other with the primary off.
3. Contacts write to every endpoint: the change people see.
4. Calls answered on any device.
5. Hidden places linked on their own.
6. Later: devices as group members.
