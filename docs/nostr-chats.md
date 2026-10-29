# Chats with other Nostr apps

A space can have a Nostr key of its own and chat, one to one or in groups, with people who use
Damus, Amethyst, Primal, 0xchat or any other Nostr app that sends private messages as NIP-17 asks:
text, photos and files, voice messages, replies and reactions. Erevos talks to
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
could otherwise write in someone's name. Kinds other than 14 (text), 15 (a file) and 7 (a reaction)
are let be. A time in the future is shown as now.

## Groups

NIP-17 has no group to make or join: a group is the set of people a message names, its author and
its `p` tags. Each message is wrapped once for each of them and once for the space, as above. So:

- A chat's key is one person's key, or, for two or more others, `groupKey`: the SHA-256 of all the
  members' keys (the space's too), sorted, in hex. Every member's app finds the same group from any
  member's message. More than 20 others (`GROUP_MOST`) is let be.
- Nobody runs it: nobody can be added or taken out. A message to other people is another group.
- Its name is the `subject` tag; the newest one by its rumor's time wins, from any member. Erevos
  sends it with the next message after it was given or changed here (**Name this group**), not with
  each one, as NIP-17 asks: an old name sent late would undo a newer one. A newer name that comes
  first is not sent at all.
- Each message from someone else carries who wrote it (`from`), shown above it.

**New group** on the Nostr chats screen makes one from two or more of the space's one-to-one chats.

## Photos and files

As NIP-17 has them (kind 15), with the file on a Blossom server (BUD-01, BUD-02):

1. The file is encrypted on the phone with AES-256-GCM, by a key and a 12-byte nonce made for it
   alone (`sealFile`, `app/lib/nostr-files.ts`).
2. What is encrypted goes to the first Blossom server that takes it: `PUT /upload`, with an
   `Authorization: Nostr` event (kind 24242, `t` upload, `x` its hash, an `expiration` ten minutes on,
   `server` the host) signed by a key made for this upload alone, so the server cannot tell whose it
   is. The servers are the space's own list, or blossom.primal.net, blossom.band and nostr.download.
   An answer whose `sha256` is not the hash sent is refused. On Android through Tor
   (`torHttp`), as the space's Tor way says, as the chats go.
3. The message is a kind 15 rumor whose content is the file's URL, with `file-type`,
   `encryption-algorithm` `aes-gcm`, `decryption-key`, `decryption-nonce`, `x` (the hash of what is
   encrypted), `ox` (the file's own), `size`, `dim` for a photo and `name`. It goes as a kind 14 does.
4. A file that comes is fetched only when asked for (**Show photo**, **Save**), checked against `x`,
   opened with any nonce length (some apps send 16 bytes), and checked against `ox` when it is said.
   One with another encryption, or no `x`, shows as a file Erevos cannot open.

Up to 20 MB (`NOSTR_FILE_MOST`), what the servers above take without payment. A file fetched is kept
in memory while the space is open, not on the phone.

## Voice messages

A voice message is a file as above (kind 15) that is audio and says how long it lasts: a `duration`
tag, in seconds (`["duration", "3.2"]`; read as milliseconds, kept to a day at most). The microphone
beside the field (`components/matrix-voice.tsx`, shared with Matrix) records it while held, a minute at
most, under a second let go; the sound is AAC (`audio/mp4`, `voice.m4a`) from a phone, or what the
browser records (`audio/ogg`, `audio/webm`) in the web app and on a computer. It is sealed and
uploaded as any file, with the duration in the message (`nostrDmSendFile` takes `durationMs`). One that
comes with `audio/*` and a duration plays as a voice message, with **Play** and its length (0:03),
fetched and opened when asked (`VoiceClip` in `components/matrix-voice.tsx`); an audio file without a
length shows as a file with **Play** and **Save** (`components/network-file.tsx`). Whether another
app plays Erevos's as a voice message or as a sound file is for that app: NIP-17 has no voice kind of
its own. The home list and the chat's quotes say `Voice message, 0:03`.

## Replies

A reply is a kind 14 message with an `e` tag for the message it answers, marked `reply`:
`["e", <id>, "", "reply"]` (`nostrDmSend(key, text, replyTo)`). On a message that comes, the `e` tag
marked `reply` wins; with none marked, the first `e` tag counts, as apps that mark no answer write it.
The answer is kept as `replyTo` and shows the message it answers over its words, which a tap scrolls
to; one not on the phone says so. A message that failed and is sent again keeps its `replyTo`. A
photo, file or voice message sent while a message shows over the field answers it too: its kind 15
message carries the same `e` tag (`nostrDmSendFile(key, file, replyTo)`).

## Reactions

A reaction is a kind 7 rumor (NIP-25) wrapped as a message is, to the same people, its last `e` tag
the message reacted to and `k` its kind; `+` shows as 👍 and `-` as 👎. Each person's last one shows.
One that comes before its message (wraps come in any order) is kept, up to 200, and put on the message
as it comes.

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
- `app/lib/nostr-files.ts`: photos and files: encrypting, opening, the kind 15 tags, Blossom uploads
  and fetches.
- `app/lib/nostr-dm-store.ts`: the open space's account while the space is open (started in
  `app/_layout.tsx`, as XMPP is). Each inbox relay has a reading connection of its own, which reads
  wraps for the key from two days before it last read all (the times are set back), again after a
  pause that grows; what came since counts as read every ten minutes. Sending and looking up go on
  other connections, kept a minute after their last use, which never answer `AUTH`. The space's
  kind 10050 and kind 0 go to its own relays and to the relays people look them up on
  (purplepag.es, relay.damus.io, nos.lol, relay.primal.net) when they change and once a week, each
  newer than the last. Where someone reads is looked up on those, on the space's own and on the
  relays their nprofile or NIP-05 named, and kept six hours for sending. Kept encrypted in the space
  (`app/lock/nostr-dm-data.ts`, file `erevos-nostr-dm`), and in backups (`app/lock/backup.ts`, the
  space's and each hidden place's, with the pages their values take): restored, the key and its
  chats come back as they were, since NIP-17 keeps no ratchet that could use a key twice
  (`app/checks/backup.check.ts`; not yet on a phone). A hidden place can have a key of its own
  (Hidden chats, below).

## Checks

- `crates/erevos-nostr` tests: NIP-19's own examples, NIP-17's own example message opened as its
  reader's and as its sender's copy (`tests/nip17-receiver.json`, `tests/nip17-sender.json`), a
  round trip, a seal signed by someone other than the rumor's author refused, signed events.
- `app/checks/nostr-dm.check.ts`, with relays played in `app/checks/nostr-relay.ts` (one that keeps
  wraps for their reader only and asks who reads, as NIP-17 recommends): keys as people write them,
  the NIP-17 example through the app's own code, a message to three people making a group, one to
  too many let be, a note to oneself, a time to come,
  the chats a stranger can make, and two keys writing both ways through each other's inbox relays,
  the space's guarded one asking who reads and told only by the connection that reads; the wraps
  signed by one-time keys, times set back, nothing on the look-up relay; the space's other app
  reading both sides; someone with no kind 10050 told so; closing and opening the space; a relay
  that goes away read again; a NIP-05 name; the home list's rows; a group of three made, named and
  written in by all, its reactions (one before its message), and a photo through a Blossom server
  played in the check (encrypted there, the upload signed by a one-time key, opened by the others);
  a file another app sent with a 16-byte nonce.
- `docs/nostr-checks/nip17-cross.ts` against nostr-tools, the library many Nostr apps are built on:
  a message Erevos wraps opens there, as the reader's and as the sender's copy; one it wraps opens
  in Erevos; npub, nsec and nprofile read the same both ways; a wrap changed on the way is refused;
  the kinds 10050, 0 and 22242 are signed as it checks them.

```
mkdir /tmp/nt && cd /tmp/nt && npm init -y && npm install nostr-tools@2.10.4
cd app && node checks/build-core.mjs
node --import ./checks/register.mjs ../docs/nostr-checks/nip17-cross.ts /tmp/nt/node_modules/nostr-tools
```

Not yet run with a Nostr app on a phone, nor against the real Blossom servers.

## Screens

- `app/nostr-chats.tsx`, under Settings → Relay and networks → Nostr chats: making a key or bringing
  one (its nsec); then the npub (copy, QR code of `nostr:npub…`), a new chat with an npub, nprofile
  or name@domain, the chats, the name others see, the relays where messages arrive (one to three),
  the nsec shown only when asked, and forgetting the key. It says the chats are not anonymous, how
  many of the relays it reads, and on Android whether through Tor.
  **New group** chooses two or more of its chats and a name; **File servers** lists where photos and
  files go, to change.
- `app/nostr-chat.tsx`: the messages, one tick once one of their relays took ours (NIP-17 says
  nothing more), Try again for one none took, a name given here only (a group's, for everyone),
  removing the chat here; in a group who wrote each message; **Photo** and **File**, and a photo or
  file that came with **Show photo**, **Play** (a sound) and **Save** (`components/network-file.tsx`);
  the microphone for voice messages and a voice message that came with **Play** and its length; a
  message held opens its menu (`components/message-menu.tsx`): six reactions to pick from, more behind
  **+**, **Reply** and **Copy**; the reply shows over the field with a ✕ and over the answer in the
  thread, where a tap scrolls to the message; under a message, the reactions it has.
- The home list (`nostrInboxRows` in `app/lib/inbox.ts`): each chat is a row, `network: 'nostr'` with
  `nostr:` and the key's hex as its identity, named as given here, or as they call themselves, or by
  the start and end of their npub, in a Nostr chip of its own. The chip shows once the space has a
  key.

## Notices

Each change of the account says how many messages each chat has not read
(`app/lib/network-notices.ts`): what went up came, and shows the same notice as a message in Erevos's
own chats (`app/lib/background.ts`, `messageCame`), with its sound; what went down was read. The number
on Erevos's icon counts them (`app/lib/unread.ts`), the computer's notice too (`app/lib/desktop.ts`).
What a key brought from another app takes from its relays before they first say that was all
(`caught` is 0) tells of nothing. A chat has notifications of its own (`notify`, as
`app/lock/chat-notify.ts` keeps them), set from **Notifications** at the bottom of its screen on
Android; a muted one is left out. Its messages are marked read only while Erevos shows the chat.

## Hidden chats

Each place of hidden chats can have a Nostr key of its own, apart from the space's, that nothing
outside its hidden chats shows.

- `app/lib/place-networks.ts` runs the place's key (`followNostrDmPlaces`, each place's in
  `app/lib/place-lives.ts`) while its hidden chats are open, and while they are closed too if they
  receive while closed (`receivingPlaces` in `app/lib/place-receiver.ts`): then it reads its relays
  whenever the space is open, as the place's relay queue is read. Otherwise it stops as they close, and
  a closed place receives nothing. The key and its chats are kept encrypted with the place's key, in the
  place's own value of `erevos-nostr-dm`: the holders `hidden` and `hidden1` to `hidden3` of
  `app/lock/sealed-file.ts` (`hiddenHolder(pocket)`), beside the space's `space`, which never sees them.
  Its connections are its own, so no relay sees both keys on one.
- `app/lib/network-place.ts`: `app/nostr-chats.tsx` and `app/nostr-chat.tsx` read a `hidden=1` route
  param (`useNetworkWhere`), show the place's key (`nostrDmNow('place')`), say under the title that it
  is the hidden chats' own, and while they are on top what is done goes to it; the chat they open takes
  the param on (`whereParams`). The hidden chats' list (`app/app/chat.tsx`) has **Nostr** under it, and
  lists the place's chats (`nostrInboxRows`), which open with `hidden=1` (`components/chat-row.tsx`).
- While its hidden chats are closed and receive (**Receive while closed**), a message to it makes the
  notice say "New message", as for the place's other chats (`hearing` with the place, then
  `onPlaceNetworkMessage` in `app/lib/network-notices.ts`, which `app/lib/background.ts` hears, on
  Android only); while they are open, it sounds as theirs do. Nothing else of it tells outside them:
  no number on Erevos's icon or the home list, and no notification settings.
- `app/checks/place-networks.check.ts` checks the stores against the relay played in the checks, with
  the real core; not yet on a phone.

## Not yet

Files encrypted otherwise than with AES-GCM, a voice message's waveform, and a key kept by a signer
app (NIP-55) or a remote signer (NIP-46) in place of the nsec.
