# Chats with other Nostr apps

A space can have a Nostr key of its own and chat one to one with people who use Damus, Amethyst,
Primal, 0xchat or any other Nostr app that sends private messages as NIP-17 asks. Erevos talks to
the Nostr relays itself, as those apps do. This is not Erevos's own Nostr way (`app/lib/nostr.ts`,
the guide's "Through Nostr"), which carries Erevos's own chats between Erevos apps; the two share
only the core's Nostr code (`crates/erevos-nostr`).

## What Nostr chats do not have

They are not anonymous, and the app says so on them. The space's key is the same to everyone it
writes to, and anyone who has its npub can write to it. The relays where its messages arrive see
the key read them and, without Tor, from where. None of Erevos's own protections apply: no queue
per contact, no padding to one size, no relay of its own. What stays private is who wrote a
message, when, and what it says.

## How a message goes

As NIP-17 has it, with NIP-44 encryption and NIP-59 wraps:

1. The message is a kind 14 event, not signed (a rumor), its id worked out as any event's, with a
   `p` tag for the person.
2. The rumor is encrypted with NIP-44 from the space's key to the person's, and that is the content
   of a kind 13 event (the seal), signed by the space's key, with no tags.
3. The seal is encrypted with NIP-44 from a key made for this message alone to the person's, and
   that is the content of a kind 1059 event (the wrap), signed by that key, with a `p` tag for the
   person. The seal's and the wrap's times are set back by a random time up to two days.
4. The wrap goes to the relays the person's kind 10050 names, and nowhere else. A second wrap of the
   same rumor, for the space's own key, goes to the space's own relays, so its other apps with the
   key read along.

A wrap that comes is opened the other way, and counts only when the wrap's signature, the seal's
signature and the rumor's id are right, and the seal's key is the rumor's author: anyone else
could otherwise write in someone's name. A rumor that names more than one other person (a group) is
let be, so are kinds other than 14 and 15; a kind 15 (a file) shows as a file that cannot be opened
yet. A time in the future is shown as now.

## How it is built

- `crates/erevos-nostr/src/chat.rs`: one JSON request in, one JSON answer out (`op`: `keys_new`,
  `keys_of`, `decode`, `npub`, `nsec`, `nprofile`, `wrap`, `unwrap`, `sign`, `verify`), on top of
  the crate's NIP-44 and event code. NIP-19's bech32 (npub, nsec, nprofile with its relays, a
  `nostr:` before them, a key's hex) is written there by hand, with its checksum. Keeps nothing
  between calls.
- `crates/erevos-ffi` passes it on as one call, `nostrChat`, through JNI and WebAssembly.
- `app/lib/nostr-dm-net.ts`: NIP-01 connections. On Android through Tor on the core's own
  connection (`torText*`, as `app/lib/nostr.ts` uses), while the space's Tor way says so: with
  Messages a relay Tor cannot reach is tried straight, with Everything never. Straight WebSocket
  otherwise, and in the web app and on a computer. A relay that floods (5000 frames not read) is cut
  off. NIP-42: a connection given a way to answer answers a relay's `AUTH`, and asks again for what
  was refused with `auth-required`; one given none never answers. NIP-05 names are looked up at
  `/.well-known/nostr.json`, through Tor when the relays are.
- `app/lib/nostr-dm.ts`: the space's account (key, inbox relays, name, chats, who called themselves
  what, up to when it read all, the wraps it took), what goes out (kind 10050, kind 0 with a name
  only, kind 22242 for NIP-42), and taking a wrap into its chat. 500 messages kept per chat, 5000
  wraps remembered as taken, 300 chats at most: past that, the chat that moved least long ago with
  nothing of ours and no name given makes room, and when none has, a stranger's message waits on
  the relay until there is room.
- `app/lib/nostr-dm-store.ts`: the open space's account while the space is open (started in
  `app/_layout.tsx`, as XMPP is). Each inbox relay has a reading connection of its own, which reads
  wraps for the key from two days before it last read all (the times are set back), again after a
  pause that grows; what came since counts as read every ten minutes. Sending and looking up go on
  other connections, kept a minute after their last use, which never answer `AUTH`. The space's
  kind 10050 and kind 0 go to its own relays and to the relays people look them up on
  (purplepag.es, relay.damus.io, nos.lol, relay.primal.net) when they change and once a week, each
  newer than the last. Where someone reads is looked up on those, on the space's own and on the
  relays their nprofile or NIP-05 named, and kept six hours for sending. Kept encrypted in the space
  (`app/lock/nostr-dm-data.ts`, file `erevos-nostr-dm`), not in hidden chats, not in backups yet.

## Checks

- `crates/erevos-nostr` tests: NIP-19's own examples, NIP-17's own example message opened as its
  reader's and as its sender's copy (`tests/nip17-receiver.json`, `tests/nip17-sender.json`), a
  round trip, a seal signed by someone other than the rumor's author refused, signed events.
- `app/checks/nostr-dm.check.ts`, with relays played in `app/checks/nostr-relay.ts` (one that keeps
  wraps for their reader only and asks who reads, as NIP-17 recommends): keys as people write them,
  the NIP-17 example through the app's own code, a group let be, a note to oneself, a time to come,
  the chats a stranger can make, and two keys writing both ways through each other's inbox relays,
  the space's guarded one asking who reads and told only by the connection that reads; the wraps
  signed by one-time keys, times set back, nothing on the look-up relay; the space's other app
  reading both sides; someone with no kind 10050 told so; closing and opening the space; a relay
  that goes away read again; a NIP-05 name; the home list's rows.
- `docs/nostr-checks/nip17-cross.ts` against nostr-tools, the library many Nostr apps are built on:
  a message Erevos wraps opens there, as the reader's and as the sender's copy; one it wraps opens
  in Erevos; npub, nsec and nprofile read the same both ways; a wrap changed on the way is refused;
  the kinds 10050, 0 and 22242 are signed as it checks them.

```
mkdir /tmp/nt && cd /tmp/nt && npm init -y && npm install nostr-tools@2.10.4
cd app && node checks/build-core.mjs
node --import ./checks/register.mjs ../docs/nostr-checks/nip17-cross.ts /tmp/nt/node_modules/nostr-tools
```

Not yet run with a Nostr app on a phone.

## Screens

- `app/nostr-chats.tsx`, under Settings → Relay and networks → Nostr chats: making a key or bringing
  one (its nsec); then the npub (copy, QR code of `nostr:npub…`), a new chat with an npub, nprofile
  or name@domain, the chats, the name others see, the relays where messages arrive (one to three),
  the nsec shown only when asked, and forgetting the key. It says the chats are not anonymous, how
  many of the relays it reads, and on Android whether through Tor.
- `app/nostr-chat.tsx`: the messages, one tick once one of their relays took ours (NIP-17 says
  nothing more), Try again for one none took, a name given here only, and removing the chat here.
- The home list (`nostrInboxRows` in `app/lib/inbox.ts`): each chat is a row, `network: 'nostr'` with
  `nostr:` and the key's hex as its identity, named as given here, or as they call themselves, or by
  the start and end of their npub, in a Nostr chip of its own. The chip shows once the space has a
  key.

## Not yet

Files (kind 15 with its encrypted file), group chats, reactions (kind 7 in a wrap), a notice when a
message comes (as with Matrix and XMPP), the key in backups and in hidden chats, and a key kept by a
signer app (NIP-55) or a remote signer (NIP-46) in place of the nsec.
