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
  one message for several endpoints go together (lib/relay.ts `RelaySession`, `RelaySends`).

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
- `n = max(previous + 1, now in ms)`. The last `n` is kept with the account (`E2EData.list`),
  which backups carry. On a primary put back from a backup (`E2EData.putBack`, when it was put
  back, by its clock then; never set on an account made since) contacts may hold a later list,
  signed after the backup was made, so there `n` is also above any `dv` a contact it accepted says
  (`newestHeld`: not a message request's, and none more than a day after it was put back,
  `heldAtMost`). Should a contact still say a later one than the list it signed since, as when its
  clock is behind the lost phone's, it signs once more, with `n` above `heldAtMost`, so above any a
  contact can say, and no contact makes it sign again. On a phone no backup was put back on, what
  contacts say never moves `n`, as none of them can hold a later list than the one kept.
- At most 4 entries, sorted by `i`, no names. Flags: 1 messages, 2 calls, 4 group member (later).
  This version says 1 for every entry; a primary re-signs a list it holds that says otherwise
  (`flagsHold`), as one signed by the version before, which said 0 for a device that said no key
  for contacts to seal with (`ek`, below: a device of the version before). Such a device is listed
  as a place that fills the list is (below), on a queue of the primary's that it empties, with a
  key no one reads with, so nothing in the list tells it from those; contacts' copies to it are
  read by no one, and it gets their messages through the primary. Once it says `ek` it does so
  with a new endpoint (`newEndpoint`), as the one it had was taken by contacts for such a place:
  that one leaves the list and the new one takes a place, as when a device is linked, and the
  devices it met as the old one meet it anew.
- **Always 4 entries** (the owner's choice, 2026-10-21; `PAD_LIST` in lib/device-list.ts): empty
  places hold endpoints made only for the list, whose secrets are thrown away and whose queues no
  one reads, so a contact cannot count the devices from the list. They carry the devices' flags
  and are sorted with them. Only the primary knows which entries are its devices' (`real`, kept in
  `E2EData.list`, not in the list), and it tells its own devices, in `list`, never contacts. Each
  new list keeps the filling entries of the one before, but one at random for each device that
  takes a place, so linking a device and unlinking one both show as one entry replaced. They cost
  contacts one copy of each message per empty place. That hides how many devices there are from a
  contact reading the list, not from one who watches, nor from the primary's relay: see Costs.
- `r` holds where each endpoint reads and the key contacts seal for it with
  (`{id: {s, relay, rk, pk}}`), deliberately unsigned: a device's queue, a filler's queue on the
  primary's relay. The key is each contact's own: the primary keeps one for each entry (`OwnList.r`:
  for a device what its endpoint gives, `ek`; for a filler a random one no one reads with) and gives
  each contact `pk = HMAC-SHA256(that key, "erevos entry key v1 " ‖ their identity hex)`
  (lib/sealed-packet.ts `entryKey`, lib/e2e.ts `routesFor`), so no contact, nor a relay that works
  with one, opens what another seals for an endpoint, nor reads its ratchet keys to tell their
  conversations apart; a device finds whose a packet is by its mark, one HMAC a contact, as the
  primary does with its own keys. After the first message each endpoint's own messages say it, per
  conversation, as `from`, `relay`, `relayKey`, `spare` and `pk` do today. A contact is given no list while an entry has no route
  (lib/e2e.ts `listFor`), but one whose list may name a device this one does not
  (`OwnList.cut`: they hold the list before a device was unlinked, or an older one; put back from
  a backup, any older one): cutting a device off comes first, and that contact sees which entry
  has no route, so which is no device's.
- A contact takes a list only if: `bundleVerify(contact.bundle, "devices", body, s)` gives
  `contact.identity`; `a` is `contact.identity`; `n` is above the one it holds (equal: nothing to
  do); each `b` holds and names its `i`, no `i` is `a`, none twice, at most 4.

### New fields in a chat message (lib/e2e.ts `Message`)

Older versions drop fields they do not know (`decodeMessage`), so all of these are safe to send.

| Field | Meaning | Rule |
|---|---|---|
| `dv` | "I know about devices, and hold your list `n`" (0: none) | In every message from a chat that takes part: the space's chat and hidden chats, the core able to sign (`E2E.takesPart`), on the primary and on a device; to every contact but one who knows the chat by another identity (`Contact.ownIdentity`: a chat moved into hidden chats, or out of them into the space's), to whom it says nothing of devices, as an Erevos from before (`partOf`, Hidden places). A message from a contact's account without it drops what was kept of their devices (this replaces `solo`). |
| `ak` | The sender's account bundle (its newer prekeys, lib/e2e.ts, which also start the next conversation) | From the account's own endpoint only; taken only inside the conversation with the account's identity, and only if it names it. Sent once for each newer prekeys (`keysDue`), and with every `dl`, which it checks. |
| `dl` | The signed list, with `r` | From the primary only, never from a device; in a quiet message of its own (`keysDue`, `keysGiven`), when the peer's `dv` is below its `n`: once, and again each day they still say so (`LIST_AGAIN`, `Contact.listSent`), or at once should the clock read earlier than when it went; and when the peer holds it but where its endpoints read changed since it was given (`OwnList.rAt`, later each time whatever the clock says). Which list went is kept by its `n` and `rAt` (`Contact.listGiven`), not by when, so a clock set back since gives it no more than once. |
| `acct` | The account a device speaks for | In the first message of a conversation a device's endpoint starts with an endpoint of a contact's account. |
| `to` | The account a conversation is for | In the first message of every conversation started with an endpoint, by an account or by a device. Only a linked device takes one that says `to`, and only for the account it is linked to; an account, the space's chat or hidden chats, takes none that says `to` or `acct`, as no list names its own account. So a list that names someone else's endpoint or account cannot make it read a conversation, on this version (an Erevos from before does not know `to`: Costs). |

Also: `Received` gains `from`, the endpoint it came through (`''` for the account and, on a device,
for its own way to the contact's account). `CallEnd` gains `taken` in phase 4. A file offer
gains nothing: see Files below.

### New link messages (lib/link-wire.ts)

Older versions ignore an unknown `k`.

- `endpoint` (device → primary): its endpoint's bundle and the key each contact's key to seal for
  it with is drawn from (`ek`, drawn from the endpoint; `entryKey`, above), once the codes match, and
  once from a link made before this. Only the primary is told it.
  Said again when a list does not name it; one said without `ek`, by the version before, is made
  anew and said (above).
- `list` (primary → devices): the signed list, the account's bundle (`ak`), which entries are the
  devices' (`real`) and where each of the other devices reads (`routes`, by endpoint id, from the
  primary's `Peer.at`; in the envelope over the link, not in `r` of the signed body); a device
  checks the bundle names the account it linked to (`hello`, over the link whose safety code was
  compared), then the list against it, and keeps it (`E2EData.own`). The primary keeps the `n`
  each device was last told (`Peer.listed`), the endpoint each said (`Peer.endpoint`) and the
  routes it was last told (`Peer.routed`), and tells the list again when a device's route
  changes. Devices do not pass the list on to each other.
- `way` (primary → devices): what it knows of the devices of one contact's account: the `dv` they
  said, and their list as the primary checked it, with where each endpoint reads (`r`; an endpoint on
  the primary's own relay is said with that relay). Sent to each device that said `ek` when it
  changes, by the digest of what that device was told of each contact (`Peer.ways`), at most half
  of its outbox at once and the rest with the next tick; all of it again to a device that says its
  endpoint again. A device keeps it
  (`withWay`): a later list replaces the ways, the same one moves the routes, no `dv` drops them
  and the device's own way to the contact. A device checks no contact's list itself; it trusts its
  primary, over the link whose safety code was compared. What a device learns from a contact
  directly (`dv`, and their list when their account gives it to the device) it keeps too.
- `came` (device → primary and siblings): tags of the messages this device wrote to a contact
  itself that the contact's endpoint said came; each marks them delivered. The primary passes it on
  to devices from before as `in` with `got`.
- `blocked` (primary → devices): who is blocked on the phone, the whole list (`E2EData.blocked`),
  each time it changes, as a device is linked and when one falls behind; a device keeps it as its
  own, so the link of someone blocked asks to unblock them there as on the phone, before anything is
  made for it, and an unlinked device forgets it. `unblock` (device → primary): someone was
  unblocked on the device, said ahead of the `add` that follows, so the phone unblocks them first
  and adds them as asked, then tells the devices the list again.
- The primary passes on to the devices the list does not name (a device from before) what the
  devices write to contacts themselves (`out`) and what came of it (`came`): they see it as before.
- Between devices, in their endpoints' conversation: `out` (what one sealed for a contact), `set`
  (a change it made to a contact) and `here` (where it reads). A `set` says when it was made
  (`when`), as does an `add` to the primary, and each contact in `contacts` says when each of its
  fields was set (`at`: `name`, `look`, `avatar`, `hide`, and `added`), so changes made at once
  settle last writer first. `call`, `took` and `changed` still go between a device and the
  primary only (phase 4 for calls).
- `pk`, in every envelope of this version, on the primary's links and between devices: the key its
  sender gives the other for the packets it sends back (lib/sealed-packet.ts, a random one for each
  link, kept with it). Once a side has the other's, every packet but a conversation's first goes to
  it sealed, and the receiver finds whose it is by its mark. A version from before never says it,
  so nothing is sealed for it.

### How a contact finds and checks the devices

1. Each chat that takes part says `dv` in every message, `addContact`'s first and the one that
   starts again with newer prekeys too; it says 0 while it holds no list of the contact's.
2. The primary sees a contact say a `dv` below its list's `n` and sends `ak` and `dl`, with `r`,
   in a quiet message (with the newer prekeys, when those are due too).
3. The contact checks the list against the `ak` that came with it, then against the bundle it
   kept (`Contact.bundle`), only in the conversation with the account (on a device, its own way to
   the account), keeps it (`Contact.list`) and a way to each endpoint it names
   (`Contact.endpoints`, lib/endpoints.ts `waysFor`), says `dv: n` from then on, and writes to every
   endpoint. Its primary tells its own devices (`way`). An entry whose flags do not say messages
   (`f & 1`) gets no way, and nor does one that names an account: this chat's own (on a device,
   its account), a contact's, or the one a contact knows this chat by (`isAccount`).
4. Conversations start when the first copy for one goes, once what went to the account went: a way
   with none starts PQXDH to the endpoint's bundle, from the account, or on a device from its
   endpoint; its first message says `to`, and from a device `acct`. That first packet goes before
   the rest (`Copy.first`), and is put before them again if the outbox lost it (`Way.first`). Once
   the relay took it, nothing says whether the endpoint read it: the relay drops what waits longer
   than 14 days, and a device may move its queue before reading it. So a way whose endpoint has not
   answered in it a day after it started (`Way.again`, `WAY_AGAIN`) starts another with the next
   copy, the conversations before kept to open what the endpoint sends in them (the newest 3 in
   all), and so on until it answers in one, two days after that, then four, then every eight
   (`againAfter`), so one that never answers costs ever less, and a device away for long still finds
   one the relay kept; one that answered, or that started a conversation with this chat itself,
   starts none again. Another, not the same first packet sent again: what was sealed after it since
   may be more than the endpoint can skip (1000). When the contact's account starts a new
   conversation with this chat (it added this chat again, and may have lost what its devices spoke),
   every way starts again too, where it reads and its key kept. On a device, a new conversation from
   the contact's account while it had one (`acceptDirect`) starts its ways to their endpoints again
   too: each that had one starts another with its next copy, those before kept to open in.
5. A first packet that says `acct` is taken only as an endpoint of that account, and only if the
   list of it checked here names it (`acceptEndpoint`); a first packet to a device's endpoint
   without `acct` only from a contact the device knows, as that contact's account (`acceptDirect`,
   kept as `Contact.direct`). Both only with the right `to`. One of the latter from a contact the
   device does not know yet (the list reached them before the phone told the device of them) waits
   with the chat (`E2EData.early`: the latest of each contact, 8 at most, 14 days), and is tried
   once more when the phone says who its contacts are (`retryEarly`). If the list cannot be checked
   to name it yet, the packet waits (`E2EData.unverified`: only from a contact who knows about
   devices, the latest of each endpoint, 4 of one account, 16 in all, 14 days) and is tried once
   more when that account's list changes; one still not named then goes. Both keep those that came
   first: one from an endpoint or a contact none waits from yet is left out while they are full, so
   first packets made up under as many identities as one likes, by anyone who has the account's list
   and where its device reads, never push out one that waits (lib/endpoints.ts `withUnverified`,
   `withEarlyFirst`). They can keep one out, though: its way starts again a day or more later (step
   4), and is taken then if by then the phone said who sent it, the list names it, or room was made.
   Such a packet never becomes a message request.
6. A new device: contacts catch up when their `dv` is behind. An unlinked device: the list the
   primary signs at once is due to every contact that says `dv`, and goes with the next look; they
   drop the ways no longer listed, conversations and all, so nothing the device seals for them
   opens, and a first packet from it waits for a list that names it.

Someone new whose link says `d=1` a device adds with the phone off: its endpoint starts the
conversation with the account's X25519 word that the bundle signing the list is its own, the
list naming it, and a pass for it the account signed, good for 14 days and renewed by the phone
(docs/sync.md, phase S5). Their Erevos checks both and starts the account's own
conversation itself. A link from before needs the account's own handshake, so the primary must be
on once for each such contact. A device asks for each to be added (`Links.add`) either way.

### What goes where

lib/endpoints.ts `copiedAs` decides: the message whole (`whole`), or only what it says was read and
what came from that endpoint (`marks`, a message that says only what was read; `none`, all else).
What a sealing copies is planned then, and waits in memory, not sealed, until what it sealed for
the account went, however it went (lib/e2e.ts `copiesAfter`, `copiesGo`). Only then is it sealed
for each endpoint, in that endpoint's conversation as it is then, started then if there is none,
with its first packet first again if the outbox lost it: so each endpoint's copies are sealed in
the order they go, the order the sends to the account ended in, and whichever goes first starts the
conversation. They then wait in lock/fanout-data.ts and go with lib/fanout.ts `sendCopies`. If the
send to the account failed, or took longer than ten minutes and more was sealed since, or 64
sealed after it wait as well, the plan goes and nothing of it was sealed, so no endpoint's conversation moved on;
the message, sealed again when it is tried again, plans them anew. When the relay could take it
only later (lib/relay.ts `canTryLater`: the account's queue is full, a relay cannot be reached, as
the relay said too when only LoRa was left and it is too large for LoRa,
`TooLargeForLoraError.relayError`) and it is tried again as it is, with its tag (`waits`: a text,
what came or was read, the keys, what waits in lib/waiting.ts, what a device wrote that the
primary sends and keeps, or that says only what came or was read), its copies go all the same, so
the endpoints have it while the account cannot take it yet. Nothing else does: not a voice
message or file sent at once (the sender is asked whether it waits), a reaction, pin, vote or
delete, also one a device wrote that the primary tries again, a walkie-talkie message, a call's or
a group's signal, nor a change of the timer. Hidden chats keep nothing waiting: there a text, a
voice message (not a walkie-talkie one) or a file is tried again as it is only once the relay said
the account's queue is full (`waits` 'full', lib/waiting.ts `handOverHidden`): its copies go, it
shows as sent, and it is owed to the account, tried again in memory only, while hidden chats stay
open, sealed anew with its tag (`Owed`); closed before it went, the account never gets it. With the
relay out of reach it is not sent there, and copies nothing, as before. What went
to an endpoint goes there once: the chat keeps in memory what went to each (`copied`, the last
2000, by contact, endpoint and the message's tag, a voice message's by how many of its parts, the
keys by their digest, each mark by the tag it marks), and a message sealed again, as one tried
again, copies none of that again. A copy says nothing of being open nor asks, whatever the account
is told.

| What | To the contact's endpoints (if it knows about devices) | To own devices |
|---|---|---|
| text, voice, file, sticker, poll, place | every endpoint in its list, and its account | `out` |
| read, react, pin, vote, erase, a message that says only the timer | every endpoint | `out` |
| read, with a call's or a group's signal or one sent for later | every endpoint, as marks alone (`receiptOf`), with what came from that one | `in` from the primary: the message with them once it comes, a signal's as a receipt says them |
| `ak`, `dl` | every endpoint (a contact's device learns the list from it) | none |
| delivered (`got`) | only the way it came, kept in memory by (contact, tag) (`cameFrom`, the last 2000), saying only that and the timer, whatever else the message says; after a restart, to the account | `came`, from a device |
| online, typing, ask | the account only | none |
| calls (phase 4), group signals, sent for later (`due`) | the account only, but for what they say was read or came (above) | as before |
| group messages | the account only | none |

A device writes to a contact itself (`isDirect`) when their account started a conversation with
its endpoint, the list it holds names it, and they hold that list (`dv`); otherwise, and for a
call's or a group's signal or one sent for later, it goes through the primary as before. Written
itself, the main packet goes in the device's own way to their account, copies go to their
endpoints from the device's endpoint, and `out` goes to the primary and siblings.

Each copy tells the relay what it carries (app/lib/relay.ts, Mark) as what went to the account
does, so a closed web app's notice on a device counts it: the last packet of a message someone
reads (a voice message's last part) as a message (`Copy.mark`), a way's first packet and all else
quiet, to a device and a place that fills the list alike. The primary still passes a contact's
message on to each device (`in`), quiet to a device it went to directly too: one the contact's chat
copies (`isCopied`), from a chat that says it holds the list signed last (`dv`), to a device that
list names as taking messages (`Links.copiedTo`); to the others, a device from before among them,
as a message, as before. What a device writes to a contact itself goes to them marked as the
primary's own would, with the phone off too; what it seals for the primary goes to the primary
quiet, and the primary marks it as it passes it on (`sentMark`, by the sealing's `through`). The
primary keeps what a device wrote itself as its own (`out`), and sends none of it again. A call's
offer is copied to no endpoint: it goes to the account alone, as a call that rings (`ring`), and the
primary passes it on to each device as one that rings too; a device's own offer goes to the primary
quiet, and on to the contact ringing.

A contact that never said `dv` is treated as today: the primary seals for it and devices go
through the primary.

### One person, receipts, duplicates

A message that opens in one of a contact's endpoints is that contact's: the history has one chat
per contact, and no device's name shows. Each endpoint that receives a message says delivered to
the endpoint that sent it, which passes it on to its own devices. Read goes to every endpoint of
the other side and to own devices, so unread counts and disappearing timers start everywhere.
While contacts move over, the same message can arrive passed on by the primary and directly; it is
kept once, by (chat, tag), in the receiver (lib/receiver.ts) and in the chat (app/chat.tsx), and
said delivered once; a voice message that came twice is put together once. What the history holds
says so (`History.has`), and so does what each chat took from a contact whose account lists
devices (`Contact.list`), and on a device from every contact (`Contact.took`, `Received.twice`):
each message once by its tag, with the day it first came and no more of when, for 30 days from the
end of that day (`TOOK_LASTS`, as long as its second copy may take within what this version and
its relay keep: one waiting in the contact's outbox, `COPIES_LAST`, and then in a device's queue on
the relay, or in the phone's queue and then, passed on, in the device's, 14 days each, and two days
more), 2000 of one contact at most (`MAX_TOOK`); of a voice message, the parts taken until all
were, its parts still put together while the history does not hold it, those that came before
too, as a voice message sealed again with its tag has the same id (lib/voice.ts `voiceIdOf`). One
that came again stays where it was, marked so (`two`), so what the primary passes on in the order
it came pushes out nothing still to come. So one that left the history, as its timer ran out or it
was deleted here, is not kept again when its second copy comes. Once 2000 of one contact are kept,
the oldest one that came again gives way to a new one, and while none did, the new one is not
kept: so what the phone passes on after more than 2000 came directly while it was off shows again
only for those past the 2000, and only if they already left the history. A copy can come later
than 30 days still: one the phone passes on after it was off, or its queue full, for longer, as the
contact's phone tries it again until it takes it, or one from a relay that keeps messages longer;
it shows again if it already left the history. Nothing is kept of a contact whose account lists no
devices but on a linked device: elsewhere each of their messages comes once.

### Timers, reactions, deletes, pins, polls, files, sent for later

- The timer travels with every message, the later setting wins (`timerOf`), unchanged.
- Reactions, pins and votes are taken as they come, as from the account; each way keeps its order:
  one endpoint's copies are sealed in the order they go, and come in it.
- Erase goes to every endpoint; a device keeps the tags it erased (`erased`, phase 2), and what came
  directly and again through the primary comes in order on each path, so it ends erased.
- Files: one upload, its offer copied to every endpoint. An account with linked devices leaves on
  the relay what it takes (`TakenFiles.leave`, by role, on the primary and on each device), and the
  primary deletes it once each device it told took it; one a device of a contact takes directly and
  the primary never tells of stays until the relay drops it after 14 days.
- Sent for later goes to the account, and, to a contact that says `cl` (phase 4, docs/sync.md S4),
  a copy to each endpoint too, each held by the relay's LATER till its time; taking it back takes
  back each. To one that does not, the account only, as before. What it says was read goes to every
  endpoint at once, as marks alone, and what came only the way it came; the primary passes those
  on to its devices with the message once it comes. A device sends it to a contact that says `cl`
  itself, and every device of the account shows it as scheduled, through the place's log.
- Nearby and LoRa carry the main packet only; the copies go through the relay.

### Calls (phase 4)

The caller decides who has the call: the offer goes to every endpoint, each rings, the first to
answer gets it, and the caller sends `end{taken, by}` to the account, copied to every endpoint, by
naming the one that answered (its endpoint, `''` for the account): the others stop ringing, and it
goes on. A decline on one is a decline for the account (`end{decline, by}`). Busy counts only when
every endpoint is busy. Group calls stay on the primary. Only between chats that say `cl: 1` in
every message (`Contact.calls`): to one that does not, a device's calls go through the primary as
before (lib/linked-calls.ts).

### Groups

The primary stays the one MLS member: only the group's admin commits (crates/erevos-group), so a
device's own leaf would need every group's admin, often someone else, to add it, and members would
see each account's device count. With the primary off, groups wait on the devices. Later (phase 6),
device leaves that name the account (`about.id`) and that an admin's Erevos adds when the member's
signed list does.

## Own devices

All with all (phase 2): the primary's links to each device (safety codes compared) stay, and
devices start conversations with each other, endpoint to endpoint, from the bundles of the list's
`real` entries the primary gave a route for; the one with the lower id starts, the other takes a
first packet only from an id in the list it last checked, and only from one that should start.
lib/siblings.ts holds them, as a device's **siblings**.

Chat with myself (lock/myself-data.ts) goes the same ways, the space's only: a `notes` envelope
carries notes as they are, each stamped (`v`) after every stamp its device knew, and the stamps of
those deleted (`gone`, the last 2000); of two changes to a note the later stays, and a deletion
stays unless a later change came. Each side first says an empty one, once each time the space
opens, so a version from before is told nothing more; heard from, a device is told every note once,
then what changed on this one since (`notesTold`, by stamp), as far as half its outbox has room.
The primary passes a device's on to the devices that do not hear it directly. A note's photo or
file goes on the relay, left there (`keep`) while two devices or more take that copy; a voice
message's sound goes in the envelope.

- A device meets its siblings as soon as it keeps a list (or the same list again with new
  routes). What is for a sibling that has not started yet waits (`held`, the last 100), and goes
  sealed once its first packet came. A first packet from an id the list names, before the phone
  said where it reads, waits too (`early`, at most 8, 14 days), and is tried again with the next
  list; one from an id it does not name is dropped, so none can push those out. The first packets
  taken are remembered (`seen`, 100), so the relay cannot replay one.
- A sibling that has said nothing in the conversation this device started, a day after it did
  (`again`), may never have had its first packet: the next envelope for it starts another, once the
  relay took all that waited for it, and so on until it answers, two days after, then four, then
  every eight. The ones before are kept to open what it sealed there while away (`before`, 2 at
  most); the other side, taking the new first packet, keeps what it sealed in the one before in its
  outbox, to go still. A device a later list names, whose first packet came before that list did, is
  met this way a day or more later.
- What a device writes goes to the primary and to every sibling: `out` for what it sealed for a
  contact (not a call's signal, nor one sent for later, `due`, which the siblings see once the
  primary sends it), `set` for each contact change, `here` when its queue changes. `add` goes to
  the primary only, which adds the contact and tells every device.
- A photo or file a device sends is left on its relay when the list names others, for them to
  take, and expires there after 14 days; the primary takes its copy without deleting it.
- Kept in lock/devices-data.ts (`siblings`), with the links, not in `E2EData`: that file is in no
  backup, so a backup put back on the same device finds them as they were and no conversation
  goes back to keys it used (nothing goes through `core.restored`), and a copy put back elsewhere
  has none. They name the endpoint they were made with (`of`), and go when the device's endpoint
  is another or none (a restored copy, forget, unlink, a new endpoint).
- A primary from before gives no routes, so its devices meet no one and go through it as today. A
  device from before is never met, and is reached through the primary as today.

What settles how:

- Messages by (chat, tag), so what comes from a sibling and again through the primary is kept once;
  marks only go up.
- Contact fields last writer first per field: `name`, `look`, `avatar` and `hide` each keep when
  they were set (`at`), by the clock of the device that set them and always after a time it knew
  of; an older change to a field is dropped. The timer takes the later setting (`timerAt`).
- A request accepted on one device stays accepted.
- Removing a contact leaves a tombstone (lock/devices-data.ts `removed`, 500 at most): what comes
  of it later is dropped while its `added` time is not after the removal. A deliberate re-add
  (`add`, then the primary's `contacts`, or a sibling's `set` with `added`) says a later one, and
  overrides it.
- Erase wins: each chat keeps the tags erased on this device (`erased`, 500 tags in each of 200
  chats), so a late copy from a sibling or the primary does not bring one back. Erasing a chat's
  messages covers the tags it had then.
- Groups the primary decides: nothing of groups goes between devices.

Device names stay on each device. Hidden places never go over the space's link. From phase 3,
contacts on this version also write to each device directly (above), and a device to them.

## Data

- Contact: `bundle` (their account bundle), `dv`, `list` (their checked list), `endpoints` (a way to
  each endpoint, lock/e2e-data.ts `Way`: its id and bundle, where it reads, its conversations, its
  first packet until sent, from when the next copy starts another while it has not answered,
  `again`, the first packets taken, sealing keys), on a device `direct` (its own way to their
  account, bundle empty), on the primary `listSent` (when the message that last gave them its list
  was sealed) and `listGiven` (that list's `n` and `rAt`), and `took` (on a device, and from a
  contact whose account lists devices: each message taken from them in the last 30 days, by tag,
  with the day it came, whether it came again, and of a voice message not all taken yet the parts
  that were; 2000 at most). Field times stay in lock/devices-data.ts.
- Space: `endpoint` (a linked device's own account), `own` (its account's identity and bundle, and
  the list as last checked, with `real`), `list` (the primary's last signed list, with `real`, the
  routes it gives with it, each with the key contacts' keys for it are drawn from, `r`, the queues
  it made for the fillers, `q`, when it was signed or `r`
  changed, `rAt`, the restore of a backup it was signed after, `restore`, and the `n` up to which a
  contact's list may name a device it does not, `cut`), `putBack`, `unverified`
  (with the endpoint each came from, `peer`), and on a device `early` (first packets of contacts
  it did not know yet, with whose each is).
- Links (lock/devices-data.ts, in no backup): on a linked device `siblings`, `removed` and `erased`
  (Own devices, above), and each contact's field times (`at`, in `synced`); on each link its
  sealing keys (`key`, `sealTo`), and on the primary the routes each device was told (`routed`)
  and a digest of what each device was told of each contact's devices (`ways`, lib/devices.ts
  `wayDigest`, 16 hex characters each).
  The endpoints' bundles stay as made: newer prekeys (`E2E.open`, `PREKEYS_EVERY`) are the
  account's only.
- lock/fanout-data.ts: the copies for other endpoints waiting for the relay, for the space's chat and
  for each hidden chats a value of their own (sealed-file.ts), each with when it was sealed (`at`)
  and none older than the relay keeps a message (14 days), and 1000 in all. Each space's chat writes
  its own value as it opens, should it find none it opens with its key (`keepFanoutFile`: the file
  not there yet, or written first by another space, as after an update or a restore one opened
  first), so the file's being there says nothing of which chats copy, and every space's value in it
  opens with that space's key. Once 50 wait for one endpoint, for the relay or for what went to the
  account, or one waits for it while the relay said its queue is full the last time one went
  there (in memory only, until the relay takes one there), nothing new is copied to it, but a voice
  message goes on to its last part, so one message goes whole or not at all, and one endpoint holds
  at most 114 (49, a voice message's 64 parts, and a way's first packet). Once all are taken, those
  for an endpoint whose queue the relay said is full give way first, whoever's they are, the oldest
  first and a conversation's first packets last; then the oldest of the contact with the most, a
  conversation's first packets last, while that contact has more than the one sealing would. So
  endpoints that are never read, or whose queues are full, keep no one else out: what waits for
  them gives way to anything new for an endpoint that takes it.
  Each goes where the way to its endpoint says it reads when it goes; one sent where it read
  before changes nothing of the way. Those for an endpoint no list names any more, or whose
  conversations went, go. The conversations are saved before the outbox: a crash in between loses
  copies, which is safe; the other order would reuse message keys.
- Links made before this need no relinking: a device with no endpoint makes one and sends
  `endpoint`; an older primary ignores it and keeps passing on. A new link takes the same way: the
  QR's key stays the link's own, and the device makes its endpoint once the codes match. That key
  is the identity of the link's conversation and the one its safety code covers, so it stays that
  and nothing else; and an older device throws it away once linked, so a primary could not list a
  device from its QR alone.
- A device's backup put back elsewhere drops its endpoint, what it checked of its account and its
  endpoints' conversations before sealing anything, so two machines never seal as one device. A
  primary put back on another phone has listed devices but no links: it signs a list without them,
  their places filled anew. One whose list names no device signs a later one too, as the backup
  was put back since that list was signed (`OwnList.restore`), and one that holds none, once a
  contact it accepted says they hold one; and either signs once more should such a contact still
  say they hold a later one than it signed, as with its clock behind: a device linked after the
  backup was made is named no more. Each of those lists goes to every contact who holds an older
  one, though a place in it has no queue yet. A device unlinked drops its endpoint too.

## Hidden places (phase 5)

Each hidden place links on its own, from inside it, with its own `Links` (lib/devices.ts
`placeLinks`, `placeLinksNow`), data under `hiddenHolder(pocket)` sealed with the place's key, and
its own account signing its own list, so its contacts write to the device's place directly. On
the device, inside one of its four places (opened with that place's PIN, empty, with a relay queue
of its own made under **For advanced users** there): **Linked devices**, then **Link to my phone**
shows the usual QR (app/devices.tsx with `hidden=1`; app/link.tsx shows the open place's, never
the space's); on the phone, inside the place: **Linked devices**, then **Link a device** scans it.
The two places need not be in the same pocket. A place's `Links` opens with its chats, before
anything uses them (lib/place-chats.ts `joinPlaceChats`), whether the place opens with its PIN or
receives while closed (lib/place-receiver.ts), and closes as they are let go of
(`onForgetPlaceChats`). It reads on the place's own relay and queue (`loadHiddenData`,
`placeQueues`), and sends as the place's chat does, through the relay or Nostr only
(lib/waiting.ts `handOverHidden`): the copies for a contact's endpoints go once the packet for
their account went, and, of what the relay could take only later, only when that account's queue
is full, never through what is nearby. Everything the space's
link does, the place's does between the two places: history brought over, messages both ways, what
is done on one only, calls, groups (lib/place-groups.ts), the place's Chat with myself, the list
and its fillers, the place's queue moving (lib/queue-move.ts `onPlaceMoved`, `placeMoved`), and its
own Matrix, XMPP and Nostr accounts (lib/linked-accounts.ts with the place's pocket: those under its
holder, run by lib/place-networks.ts, never the space's). The place's screens hear its links
(`onLinked(listener, at)`, `changedHere(change, at)`); the space's never do, and what a place's
device reads leaves the space's notice count alone (`readElsewhere`, `announceReceived` are the
space's only).

Nothing of it shows in the space, on its screens or on its devices: the space's links carry nothing
of a place, and a place's carry nothing of the space. lock/devices-data.ts keeps a value for every
place of every space in its file, written or not, each the same size (sealed-file.ts, `BLOCK`), and
each space writes its own as it opens, should it find none it opens with its key
(`keepDevicesFile`), so the file is there, and of the same size, whichever places link, and the
space's key opens no place's value. A place's link runs while the place is open, and while it is
closed too with **Receive while closed** on, as its key is in memory only then; closed with it off,
nothing of its link runs on that side, and what the other side sends waits on the relay (14 days)
until the place opens. On the device's place, new groups and group calls stay on the phone, as for
a space; a chat cannot be moved into it or out of it there (app/chat.tsx refuses: moved on the
phone, it comes or goes); and a call answered there stops the phone's ring only while the phone's
place is open, as a closed place's ring (lib/hidden-ring.ts) is not its link's.

A hidden place that links no device signs no list, but knows about its contacts' devices as the
space's chat does (`E2E.takesPart`): it says `dv`, takes a contact's list, writes to every endpoint
it names and takes what those write, keeping the copies that wait in lock/fanout-data.ts under its
own holder. So to a contact a chat made in such a place is a chat of a space that never linked a
device, and one made in a place that links is a chat of a space that did; none of its contacts'
devices learns anything of it beyond that, and nothing of hidden chats goes to the space's own
devices. Put back from a backup, a place signs a list once a contact it accepted says they hold one
(`newestHeld`), as a space's chat does, but only while its link runs. A hidden place that rings its
contacts' calls while closed says its ring queue (`rf`, lock/hidden-ring.ts) in what it copies to
their endpoints too, as in what goes to their account, whose phone passes it on to their devices as
it comes; a device takes a ring queue only from what its phone passes on (lib/e2e.ts `heardIn`). A
list that names one of the space's own devices has hidden chats write to it as to any endpoint, but
the device opens none of it: each conversation says it is for the contact's account (`to`).

A chat moved into hidden chats, or from them into the space's, is known to its contact by the
identity of where it was made (`Contact.ownIdentity`), and a chat says nothing of devices to such a
contact (`partOf`): it could start no way to their endpoints from that identity, whose secret it
does not have, and one started from its own would show their devices, in its first packet, the
identity they do not know it by. Moving it into hidden chats takes it off the space's devices at
once (they drop the contact, and open nothing more of theirs). Before it moves, the chat tells a
contact who knows about devices what it will say from where it goes, nothing of devices
(`Extra.leaving`), to their account and to each of their endpoints it speaks with, starting nothing
new: their devices then let go of its devices, and of their own way to it, though their phone is
off, and write to its queue no more. Should that not go, the next message from where it went does
it; until then their copies still go to the devices of where it was, which open none, and what their
devices write there directly is lost. What the chat kept of the contact's devices is dropped as it
moves (`putIn`). A contact on this version sees from it that the chat stopped taking part, at that moment,
as one put back on an Erevos from before does. One the chat gave its list, which only an account
that linked a device signs, knows it is on this version: for them a chat that stops taking part
went into hidden chats, unless it was put back on an Erevos from before, so they can tell where it
went. A chat moved back to where it was
made is known by its own identity again, and each side gives the other its list once the other says
`dv`.

## Costs and what still needs the primary

- Still needs the primary: contacts on older versions (and their calls and what is sent them for
  later, and adding them), linking and unlinking, public groups, and groups unless they are held on a
  device (docs/sync.md, phase S6: then that device, and the others through it).
- A lost primary cannot unlink a stolen device until a list is signed again (the primary or its
  backup). A primary taken over can add a device without the safety number changing, as in Signal:
  contact details show the list's last change (under the safety number, the day of its `n`).
- The places that fill the list are written to like devices: the primary makes a queue for each on
  its own relay (`OwnList.q`, `r`), with a key kept for it from which each contact's to seal with is
  drawn, as for a device's (`entryKey`), and empties
  them every hour while it is open, whether or not a device is linked, 1000 at most each time
  (`drainFillers`, on its own relay with its own token), so the relay does not remove them as
  unread (180 days). One the relay lost is made again with the same key, and one left on a relay
  the phone no longer uses is made again where it reads now; a relay whose key the phone could not
  ask this time (offline, or the key's request failed as the app started) counts as the same. One
  that cannot be made now (offline, the relay full, a lent place's queues for the day used up)
  keeps where it was and its key, and is tried again with each tick (every minute while the space
  is open), as is a new one that has no queue yet; each is given with the list, and no list is
  given while one has no queue, but to a contact who may hold one naming a device the new one does
  not, as when one is unlinked: they see which place has no route, so which is no device's, until
  it has one and they are given it again. A contact's copy to a queue the relay does not have drops
  that way's route silently (no error shows), until a list says it again. So a contact sends to a
  filler sealed alike, and gets the relay's answer exactly as for a device. Each contact seals for
  every endpoint, a filler or a device not answered yet, with a key no other contact has, so a relay
  that works with one of the account's contacts opens only that contact's copies, and cannot read
  another's ratchet keys to tell their copies apart by conversation; what it still sees is what it
  sees of the account's own queue, when each burst came and from which address, and each way's
  first packet, which is not sealed. What still tells them
  apart: a filler never answers, never says delivered, and sits on the primary's relay, where a
  device on another relay does not, which a contact sees in `r` at once (a device of the version
  before is one of them in all of this, and never answers either); the primary's relay sees
  the phone empty them, from the phone's own connection, so it can tell them from devices and tie
  them to the phone from the first hour; and while the phone is not open no one empties them, as a
  device that is on reads its own. An account whose last device is unlinked keeps a list of fillers
  only, and contacts go on writing to them, so the list says nothing of whether a device is left;
  that costs them four copies of each message for as long. But whether an account ever linked a
  device shows: it has a list only once one was, or, put back from a backup that held none, once
  a contact it accepted says they hold one, which they may say falsely (no one else's saying so
  counts); and the chat details' line says when that list last changed, not that a device is in
  it.
- Put back from a backup, a primary believes what a contact it accepted says of the list they hold,
  up to a day after it was put back: one who says it falsely has it sign a list of places that fill
  it only, if it held none, which every contact on this version then writes to for good; or, once
  more, a list whose `n` is a day after it was put back, the day the chat details' line then shows
  every contact; neither more than that once. A list a contact holds from more than a day after
  it was put back, as with its clock that much behind the lost phone's, or signed since on the lost
  phone itself, it counts as none of its own: that contact keeps it, and writes on to the devices it
  names. And should both clocks have been behind the one that signed the list in the backup, it
  may sign one with the same `n` as the first one signed after the backup was made: a contact who
  holds that one takes it as the same, keeps theirs, and writes on to the device it names, until a
  later list.
- An Erevos from before this version does not know `to`: a contact's list can name such an
  account, the space's or its hidden chats', that a chat here does not know, and what the chat
  writes to the contact then reaches that account too, as a message request from the chat, whose
  answers show here as the contact's, from that endpoint. The contact could forward the messages
  and write those answers themselves; the account so named gets messages not meant for it.
- Traffic: to a contact whose account has a list (always 4 places), one text or read mark is 5
  packets instead of 1, and each way's first packet once more at the start; delivered marks go
  back one way each. A device writing itself sends as many, and `out` to the phone and each
  sibling. While the phone is on it still passes on to its devices what it opens, so a device gets
  a contact's message twice, and keeps it once. So how many packets go together, on one
  connection, shows a relay roughly what kind of message it was: one for typing or being open, one
  or two for a delivered mark, five for a text, a read mark or a reaction, and one for a message
  tried again once its copies went. A change of devices shows as a burst: the new
  list goes to every contact who says `dv`, each in a message of its own of the largest size, with
  its copies, the next time the phone reaches the relay.
- Tried again: what is tried again as it is goes to the endpoints while the account's queue is full
  or its relay cannot be reached, so the account's devices may have it long before its phone, and a
  relay sees copies go with no packet to the account taken. A message that waits can be deleted on
  this phone only: deleted before it went, it stays on their devices, and their phone never gets it.
  So it is in hidden chats, while the account's queue is full; and there what is owed to the account
  is tried again only while hidden chats stay open: closed before it went, it is on their devices
  only. A contact who sees their devices have a message their phone never gets cannot tell that from
  one deleted before it went, or a space's chat whose phone stayed off, but it is a little more
  likely of hidden chats.
  What went to each endpoint is kept in memory only (the last 2000): a message tried again after the
  app was closed, or once 2000 more went, is copied again: the endpoint keeps a message once, though
  a device's web app notice counts it again, and a mark again changes nothing. The packet to the account is
  sealed anew with each try, as before this version, and moves that conversation on: a mark tried
  again with each look while their queue stays full (every 3 seconds while the chat is open) passes
  what their phone can skip (1000) within an hour, and their phone then opens nothing more this chat
  writes to it until a new conversation starts with their newer prekeys (lib/e2e.ts `startedAgain`).
  Their devices are not touched by it: nothing more is copied to them, and no try that did not go
  moved a conversation with them on.
- Marks: each copy says what it carries as the packet to the account does, so the relay sees on
  every queue of the burst alike which packet is a message someone reads, which ties them together
  all the more, though it does not tell a filler from a device. A device whose web app says when a
  message comes gives the relay it reads on a push address for its queue, which a filler's queue
  never has. A device's web app notice, which counts what the relay says, counts a contact's
  message twice while the contact still holds an older list that names it, between a device's
  linking or unlinking and their taking the new one, as the primary passes it on as a message then;
  and not at all when the contact holds the list signed last but its copy did not reach the device
  (that endpoint's outbox full, its queue gone), as the primary passes it on quiet, and only the
  contact's chat knows whether a copy went. An Android device's notice in the background counts
  what its receiver opens, a message that came twice once (lib/receiver.ts `isNews`).
- `dv` goes in every message of a chat that takes part, to contacts on older versions too: a few
  bytes more, so a text near the edge of a size LoRa carries may no longer fit, and goes through
  the relay or waits.
- A device off for long fills its queue faster (1000 messages, 14 days); what came directly and was
  dropped comes back from the primary's history once it is on. Should the relay have dropped a
  way's first packet, that way starts again with the next copy a day or more after it started
  (step 4), so the device opens what came after that; what came before is lost on that path, and
  comes back from the primary.
- Hidden chats, to a contact: a chat made there says and does what a chat of a space does, one
  that never linked a device unless its place links one. Put back from a backup, both sign a list
  once a contact they accepted says they hold one (`newestHeld`), but hidden chats only while their
  link runs (open, or receiving while closed): so a contact who knows a chat was put back from a
  backup, and says that falsely, of a list from before then or up to a day after, gets a list from
  either, and from hidden chats perhaps only days later, as from a space's chat whose phone stayed
  off, which hints at them. A chat moved into hidden chats, or out of them, stops saying `dv` at
  the move (Hidden places), which a contact on this version sees, and a careful one may take for
  the move; one the chat gave its list can tell, unless it was put back on an Erevos from before,
  that it went into hidden chats.
- Hidden places linked on their own run their link only while open, or receiving while closed, on
  each side. Closed otherwise, what the other side sends waits on the relay, and what is not taken
  within 14 days is lost there (Bring over messages again sends the history once more); and the
  phone's place empties the places that fill its list (`drainFillers`) only while it runs, so one
  unread for 180 days is removed by the relay, and contacts' copies to it go nowhere, silently,
  until it is made again with the same key once the place runs. The place's relay sees its link,
  its fillers and the device's queue as a space's relay sees the space's: tied together by the
  contacts' bursts, read from the phone's address while the place runs, and so, on the same relay
  as the space, read from the same address as the space's queues, as for hidden chats already. A
  place's link reads its own relay queue, which the place's chat screen makes and keeps, so the
  device's place needs one made there before it shows its code. On the device's place, new groups,
  group calls and moves into or out of it stay on the phone, a call answered there stops the
  phone's ring only while the phone's place is open; and a device's place put back from its
  backup says it is a copy on its Linked devices screen, and as it is written in, but not once as
  it opens (`copyNote` is the space's). A place that never linked nor showed a code never writes
  its value in the file of links, and one that links writes it as its link changes, while each
  value written leaves the others as they were (lock/sealed-file.ts): so two copies of the file
  taken at different times, with no password, show which place's value changed, and so that it
  links, as two copies of the hidden chats' other files show which place was used. One copy shows
  only when the file was last written, and each space writes its own value again as it opens
  (keepDevicesFile), so a file written lately says no more than that a space was open.
- Ways started again: an endpoint that never answers in a conversation this chat started (a place
  that fills the list, or a device whose owner never writes to this contact) gets another a day
  after the first, two days after that, then four, then every eight, each with the next copy for it:
  one more quiet first packet and a PQXDH for each such endpoint, which a relay sees as a way's
  first packet once more, and so a filler as one that never answered. Only the newest 3 are kept to
  open in, so one goes a week or more after it started: an endpoint away for longer, that sealed in
  it while away, has that not open here when it comes back (on the primary, what it wrote to the
  account itself, which then shows only on the devices its copies reached; on a device, its copies,
  which come from the primary instead). A sibling that says nothing is started again alike while
  this device has something for it; the newest 3 are kept to open in too, and what it sealed in an
  older one while away is lost on that path, and comes again through the primary. On a device, every
  new conversation a contact's account starts with it while it had one starts each of its ways to
  their endpoints again (step 4): a first packet more for each, once, whether or not those had lost
  anything.
- First packets kept to try again (`early`, `unverified`, a sibling's `early`) are those that came
  first: someone who has the account's list and knows where a device reads can fill them with ones
  made up, and keep a real one out until its way starts again a day or more later after they let go
  (step 5); they push none out, and a sibling's keeps none from an endpoint the list does not name.
- Messages kept as taken (`Contact.took`), on a device and of a contact whose account lists
  devices: about 40 bytes each, kept with the chat, which is saved whole with each change, for 30
  days: a contact who wrote 2000 messages in that time adds about 80 KB to it. Each is the
  message's tag and the day it came, kept after the message itself disappeared or was deleted, and
  so in a backup made meanwhile: whoever opens the chat, or such a backup, with its password sees
  that a message with that tag came that day, of a contact who wrote it, though not what it said.
  The tag is random, so it ties the message to nothing else on this phone once the message is gone;
  only someone who has it from elsewhere (the contact's phone, or a copy of it) can tell which it
  was.
- With siblings, a device's photos and files stay on its relay until they expire (14 days), not
  only until the primary took them. Packets a sibling sends after its first, should they come
  before that first one is taken, are lost; what they said comes again through the primary.
- The relay can tie an account's queues together (every contact writes to all of them at once). A
  contact deleted or blocked keeps no way in: the phone's queue moves (lib/queue-move.ts), so do the
  queues of the places that fill the list (the old ones emptied for 14 days, then deleted), each
  linked device moves its own when the phone says `move`, and the list is signed again, `n` + 1, at
  most once an hour, so contacts who held the one before take the new routes. Each linked device
  knows who is blocked (`blocked`), so their link asks to unblock them there too. A contact's devices
  learn the account's new queue as its phone does: each tell is a message with nothing in it, copied
  whole to every endpoint of theirs, and it says the new `from` with its `qa`, as the first message
  of a way to an endpoint does, so a late copy from before the move takes none of them back. The
  contact link a linked device shows carries the backup queue (`spare`) only while it names the
  phone's own queue, as that one moves with it. All of it in band, with no change to the relay.

## Phases

0. Signatures in the core (this note, crates/erevos-core, erevos-ffi, lib/core.ts). Nothing
   changes for anyone.
1. Endpoints and the signed list among own devices; contacts see nothing.
2. Own devices reach each other with the primary off.
3. Contacts write to every endpoint: the change people see.
4. Calls answered on any device.
5. Hidden places linked on their own, each from inside it (Hidden places, above).
6. Later: devices as group members.
