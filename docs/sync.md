# The account's log

How the account's own devices will share what they change, one way for everything, in place of
the many kinds of link envelopes they use now (docs/multi-device.md, docs/linked-devices.md). The
plan, its options and its phases: the maintainer's project files, `sync-plan/`. This note is what
is built. **Not audited.**

## Phase S0 (this one): the log alone

app/lib/sync/ holds it, used by nothing yet, so nothing changes for anyone.

- **Ops.** Each change a device makes is one op: a field of a record set, a record added, or a
  record removed. It names its device (the endpoint's identity), its number among that device's ops
  (1, 2, 3, ...) and a stamp (lib/sync/clock.ts).
- **Stamps** are a hybrid logical clock: wall clock in ms, a counter, the device. A device stamps
  every change after everything it made or took, so a device whose clock is behind still writes
  after a change it saw. One stamped more than a day ahead of this device's clock waits until the
  clock gets there.
- **Records** settle the same on every device, whatever order their ops came in (lib/sync/log.ts):
  each field keeps its latest value; a record is there while its latest add is after its latest
  removal; a removal drops the fields set before it, so a record added again starts empty.
- **Who writes.** Each kind says it: any of the account's devices (contacts, blocked, requests,
  notes, settings, accounts on other networks, places, the Collection, the groups as their holder
  tells them), or the primary only (`holder`: which device holds the groups). An op a device may not
  write is passed over by its number on every device. A kind this version does not know is kept as
  any device's, for the newer devices that know it.
- **Talking** (lib/sync/wire.ts): `have` says how far a device has each device's ops; the other
  gives what it lacks in `ops`, 200 at most at once, or the `whole` log when it lacks ops no longer
  kept. A device that changed something gives each other device at once what it has not given it
  yet. Nothing thanks for ops taken, so a change costs one packet to each other device: now and then
  (every 10 minutes while the space is open) a device asks one that may lack its ops, or that it
  never heard from, how far it is (`have` with `ask`), and that one says it. Two devices that have all
  of each other's ops say nothing. A device is never given its own ops back; one that has fewer of
  its own than another has of it (put back from a backup) takes the whole log, and numbers its next
  op after the last it made.
- **Letting go.** An op goes once every device said it has it; past 5000 the oldest go anyway, and a
  device behind them takes the whole log. A removed record goes once every device has its removal
  and nothing made before it can still come.
- **Unlinked.** The device list sets who the account's devices are (`setPeers`). Nothing from a
  device that is not one of them is taken: from one not listed yet it is held (500 at most) until
  it is, and from one unlinked, what it stamped after this device knew it left is refused. Cutting
  it off is the links' work first: nothing it seals is opened any more.

Every op and every log is checked in full as it comes: its form, sizes (a value 16 KB at most as
JSON), no NaN or other values JSON does not carry. checks/sync.check.ts.

## Costs, as built

- A field changed on a device that had not seen a removal yet, stamped after it, keeps its value,
  but the record stays removed: only an add brings it back, and then with that value. Such a record
  is not let go while the field is there.
- A device unlinked while its ops are on the way may have them taken on one device and refused on
  another (each knows it left from its own clock). It is cut off by its links anyway.
- A device put back from a backup that writes before it talks to another reuses numbers it already
  used, and what it wrote then is lost on the others. S1 keeps it from writing until it heard one.
- The `whole` log is trusted as it comes from one of the account's own devices, over a link whose
  code was compared: it can say it has more of a third device's ops than it has.

## Phase S1, first part: the phone writes, the devices keep

- lock/sync-data.ts keeps each space's log, and each hidden place's that links on its own, sealed
  with its key in `erevos-sync`, out of backups like the links (lock/devices-data.ts): a device put
  back from a backup has no log and takes the whole of it. Unlinked, a device lets go of its log.
- The log goes in the links as the envelope `sync` (lib/link-wire.ts), which a version from before
  leaves alone: between the phone and each linked device that has an endpoint, and between devices
  the phone named to each other (lib/siblings.ts). In the log the phone is the account's identity,
  each device its endpoint's (lib/sync/links.ts, lib/devices.ts `syncWho`).
- The phone writes its contacts (name, timer, request, look, hidden) and those it blocked into the
  log as they change (lib/sync/contacts.ts), and all of them once a device first says its endpoint.
  The devices keep it. Nothing reads it yet: the envelopes of before (`contacts`, `set`, `blocked`)
  still carry the contacts, so nothing changes for anyone.

## Phase S1, second part: the devices write, and the contacts follow the log

- A linked device writes into the log each change it makes to a contact, as it says it in `set`
  (lib/sync/contacts.ts `syncChangesOf`): a name, timer, look, hidden, a request accepted, a contact
  removed. It goes to the phone and to the other devices, with the phone off too.
- What a device takes from the log changes its contacts as a `set` from another device does
  (`setsFromLog`, then lib/devices.ts `setFrom`): field by field, each by when it was set, so what
  came the way of before already changes nothing, and the later of the two ways wins. A contact the
  log removed goes; one the log never named stays. Those blocked follow the log as they follow the
  phone's `blocked`.
- What the phone takes from a device's ops it does as that device's `set` (`setFor`), and then
  writes into the log what it has, should it differ: the log ends with what the phone has, as the
  devices did before.
- Nothing thanks for ops; but a device that writes before it heard how far the phone is gives it
  only what it lacks of others' ops, never the whole log: only what a device says itself tells it was
  put back from a backup.
- The envelopes of before still go, for devices of the 6 series.

## Phase S2, first part: the settings

- The settings that mean the same on every device go as records of kind `setting`, field `v`
  (lib/sync/settings.ts `SHARED_SETTINGS`): `language`, and `look`, the open space's look without
  its photo behind the screens (`lookToShare`). A look that comes keeps this device's own photo,
  should it have one, else takes the style's own ground (`lookFrom`). And `lastSeen`, the open
  space's SpaceData.lastSeen (lib/space-chats.ts shareLastSeen), so no device tells contacts a time
  while another says it tells none. A hidden place's own `lastSeen` does not go: places keep theirs.
- What stays on each device: passwords, PINs, the panic code, the lock's time, vibration, battery,
  LoRa and BLE, the modules and permissions, the device's name, its relay and Tor (where its queue
  is), the SMS Shield (the phone's alone).
- A setting is written as it changes on a device (`settingChanged`, lib/devices.ts `syncSetting`,
  only if the log says otherwise), never as one comes from the log (`settingCame` puts it in place
  and is not told back). The phone writes those it has into a log that has none of them yet
  (`seedSettings`), so a device just linked takes the phone's and does not give it its own.
- Only the space's links carry them: hidden chats keep their own.
- Each device can keep its own (`erevos.share-settings`, Settings → Data and devices → Linked
  devices → Same settings on every device): then it writes none and takes none; turned on again, it
  takes the log's at once (`takeSettings`).
- The notes of Chat with myself stay on their own way: a voice message or file is far beyond what a
  value of the log may hold (16 KB).

## Phase S2, second part: the accounts on other networks

- Every linked device gets the space's Matrix, XMPP and Nostr accounts (a hidden place's: its own),
  always (the owner's choice, 2026-11-06): once the codes match, and again as they change.
- The phone follows who they are (`followAccounts`, once a minute while a device is linked): a
  record of kind `account` for each network (`matrix`, `xmpp`, `nostr`), who it is in field `v`
  (the user, the address, the Nostr key's public half). One that appears or changes gives the
  accounts again to every device, in the `accounts` envelope as before: the secrets never go into
  the log, which every device keeps.
- One signed out of on the phone is removed from the log, and each device lets go of the one it
  brought of it (`accountsFrom`). One given in place of another of the same network replaces the one
  brought before (lib/linked-accounts.ts `take`, `had`). A device's own account stays, and so does
  one the log never named (a phone that has not followed them yet).

## Phase S3, first part: the whole log as a file

- `whole` once its JSON is over 12 KB (more than one packet) goes as a snapshot: a file on the
  sender's relay queue (lib/attachments.ts `sendFile`), encrypted with a key of its own, and the
  envelope says `{k:'snap', offer}` where it waits. The receiver takes it once (the relay deletes
  it), up to 64 MB, and hears it as the whole log. One that cannot be taken now is let be: the
  device asks again (every 10 minutes) and is given it again.

## Phase S3, second part: over the links nearby

- A packet between the account's devices that came on a link nearby (the same Wi-Fi or hotspot,
  lib/nearby.ts) has that device heard there; what goes to it is handed on that link first, each
  packet once, so the log (and all the rest) goes with no internet too. The relay still gets its
  copy, which opens nothing the second time. The space's links only.

## Phase S3, third part: large files, chunk by chunk

- lib/sync/chunks.ts brings a file's chunks as they are kept (lock/attachment-files.ts) by a list
  of ways (`ChunkWay`: the same Wi-Fi, a file server such as the Collection's WebDAV mirror, the
  relay for small ones), each chunk from the first way that has it whole.
- Only what is missing here is asked: a transfer cut off goes on from the missing chunk. Each chunk
  is opened with the file's key before it is kept (its tag, and its place in the file), so a chunk
  cut short, damaged, of another file or in another place is let go and asked of the next way.
- `whole` says a file is there only once every chunk is and opens; until then it shows as coming.
- `stop` (the file deleted while it comes) ends it after the chunk under way and deletes every
  chunk of it, also one kept just then.

## Phase S3, fourth part: a fast way for chunks on the same Wi-Fi

The links nearby carry frames of 16 KB through the app, too slow for files of up to 4 GB. So the
chunks have a TCP channel of their own: desktop/chunks.js on a computer (the shell answers it at
`/__chunks`), ChunkChannel.kt on Android (modules/erevos-radio), the same protocol, `EVC1`:

- A device that has chunks to give listens, and tells a linked device, inside their end-to-end
  encrypted link (envelope `chunks`: its addresses, the port, a key), where to find it. The key is
  32 random bytes for that one device (`ChunkGiver`, lib/sync/lan-chunks.ts), and may take only
  the files it was allowed.
- On connecting, both show they hold the key (HMAC-SHA256 over a challenge from each side): who
  holds none is cut off before anything else.
- Each chunk goes as it is kept, encrypted with the file's own key, and the one taking keeps it
  only once it opens with that key (written beside it, then moved in place). The chunks never go
  through the app's JavaScript; to ChunkFetch it is a `ChunkWay` with `keep` (`Links.chunkWays`).
- Unlinked, a device's key is let go and its connections are cut; with no one left, the device
  stops listening. The web app and Sailfish OS have no such channel: their files come by the
  other ways.

Checked: chunk-channel.check.ts (the key, what it may take, a damaged chunk, a cut at chunk 17 of
40 going on from 17), devices.check.ts (the offer inside the link), and the phone's Kotlin against
desktop/chunks.js (modules/erevos-radio/android/lan-check).

## Phase S7: the Collection on the linked devices

- The switch **On my linked devices too** (per space and per hidden place, off until turned on) is record `on` of kind
  `collection` in the place's log, so it goes to every device of the place. Off, nothing of the Collection goes.
- Each file is record `i<id>` (fields `file`, the file as kept with its key; `thumb`; `folder`; `added`), each folder
  `d<id>` (`name`), the WebDAV server `server` (address, user name, password, folder: the other devices fetch from it;
  copying to it stays each device's own choice).
- A device writes a field only when it changed there since the log last said it (`Since`; after a restart, by when it
  changed), so what came is never written back over a later change; a field changed here and not written yet stays when
  something else of the record comes.
- A file or folder goes elsewhere only by the log's removal (the catalogue's `gone` mark, written as `x: 'del'`). One the
  log never named stays, and goes in with the next write: nothing is deleted for being missing. A file removed while it
  comes stops (`ChunkFetch.stop`) and keeps no chunk.
- The chunks: small pictures at once by any way; a file itself at once over the fast Wi-Fi channel (S3), else when it is
  opened: from the place's server, or through the relay up to 100 MB (envelope `cfetch` asks a device to put files on
  its relay for this one, `cfile` says where). Each chunk is kept only once it opens with the file's key.
- Every device with the fast channel tells each linked device which of its files' chunks it may take there.
- A hidden place's Collection runs in that place's own log and links only.

## Phase S4: calls and sent for later without the phone

- Every message of a chat on this version says `cl: 1`: it copies a call's signals to the endpoints of the other
  account, and takes them from its endpoints (`Contact.calls`). An Erevos before says nothing, and its calls and what it
  is sent for later go through the phone as before.
- To such a contact, a call's offer, answer and end go whole to every endpoint, so each device rings; a linked device
  writes its own signals to them itself, as it writes its words. The caller, answered from one endpoint
  (`Received.from`), sends `end{taken, by}` to the account, so the others stop ringing and the one named goes on; a
  decline from an endpoint ends it for all as `end{decline, by}`. Each device ignores the end that names itself.
- Sent for later from a device goes from the device: the relay's LATER holds it for the contact's account, and one copy
  for each endpoint of theirs (`Copy.due`, lib/fanout.ts), so their devices have it at its time with their phone off.
  Where each copy is held is kept (`E2EData.heldCopies`), and taken back with the message.
- Each held one is record `<contact>.<tag>` of kind `later` in the place's log (lib/sync/later.ts): its time, words,
  what it is, how long it lasts once read, and where it and its copies are held. Every device shows it as scheduled and
  can take it back; the one that does removes the record, and the others let it go. Only the device that sent it holds
  it anew should the contact's queue move; a safety message stays the sending device's own. A record goes a day after
  its time.

## Phase S5: a new contact from a device

- The account's X25519 identity says, with an XEdDSA signature, that its bundle's signing key is its own
  (crates/erevos-core/src/bind.rs, over `erevos signed v1\0bind\0 ‖ x25519 ‖ ed25519`; strict on the way back: sign
  bit 0, canonical `s`, no small-order points). The phone makes it once (`E2EData.bound`) and gives it to each device
  with the list (`ab`, `Peer.bound`), which keeps it with its own (`Own.ab`) once it holds for the account's bundle.
- A contact link of this version says `d=1`: its Erevos takes a conversation one of the adder's devices starts. A device
  adding someone new from such a link starts a conversation from its endpoint to their bundle (E2E `startBound`), whose
  first message says whom it is for (`to`), the account (`acct`), its bundle (`ak`) and the word for it (`ab`), the list
  that bundle signed (`dl`) and this device's pass (`ap`). It writes to them itself from then on.
- A pass (lib/device-list.ts) is the account's signature, with the key that signs its lists (context `pass`), of
  whose it is, the endpoint it is for, where the account reads, and until when (14 days). The phone gives each device
  whose endpoint the list names one with the list, and a new one once less than 7 days are left (`Peer.passed`); a
  device uses one only while more than a day is left. So a device unlinked, lost or stolen starts nothing with anyone
  new for longer than its pass, though an old list names it, and cannot say where the account reads but as the
  account said it.
- Their Erevos (`acceptBound`) takes it only when the word holds for that bundle and `acct`, the list holds for that
  account and names the endpoint that opened the conversation, the pass holds for that account and endpoint and is good
  now (and not for far longer than one lasts), `to` is this chat, and the account is neither blocked nor known by
  another identity. They then start the account's own conversation, to where the pass says, and have it as a request.
- The device still asks the phone to add them (`Links.add`). The account's own first message, once the phone is on, is
  no new start (`Contact.byDevice`): the ways to the endpoints stay.
- A link from before, or a core that cannot make or check the word, goes through the phone as before.

## Phase S6: a holder of the groups that moves

- The account keeps one MLS leaf in each group, so members never learn how many devices it has. Its state, the seal key
  group messages to it are sealed to, and what goes with them (`HeldGroups`: each group's outbox, what waits for a
  later epoch, orphans, key packages given) are on one device at a time: the phone, or the linked device the phone
  chooses (**Groups stay on**, `Links.moveGroups`).
- Moving, in two steps: the side that holds them wipes them and keeps them as they went (`GroupData.handed`) in one
  save (`Groups.moveOut`), so they are never kept in two places, nor lost should it stop on the way. It puts them on
  the relay as a file whose key goes only in the link (`hold`), told again every 10 minutes (`HAND_AGAIN`). The other
  side takes them with the relay's copy left (`moveIn`), keeps each group's messages as it was told them, says so
  (`held`, by the file's first piece), and makes its keys new in each group with the next `renewKeys`, which says
  where its group messages come to now. Only then does the first side drop its copy and the relay's. One that can
  never be taken (gone from the relay, damaged, too large: `MAX_HELD_GROUPS`) is said so (`nohold`), and the first
  side keeps them again (`takeBack`). Told again after it took them, it says `held` again (`tookHold`). The members
  see the same leaf whose queue moved; the queues it read at stay its own 30 days (`GroupData.left`), as members may
  write there till they heard the new keys. From a device back to the phone, the phone asks (`give`); to another
  device, they go through the phone. A second move waits till the first is done.
- Only to a device that said its Erevos can hold them (`can`, once each time it opens: `Peer.canHold`).
- Where they are not held, the groups are kept as told (as on a device before): the phone and the other devices ask
  the holder through the link (`group`), which tells the phone as they change, and the phone tells the other devices.
  A group message that still comes to the phone's queue, or a contact's group signal (which only the account gets),
  is passed on to the holder (`gpkt`, at most twice; `gsig`). While they are on their way, a device that does not
  hold them gives what comes for them back to the phone, which keeps it in memory (500 at most) till they are held
  again, then does it or passes it on.
- Refused while in a public group or asking to join one, which stay on the phone; a linked device makes and joins
  none, even holding the groups. Neither side unlinks while the device holds them, unless asked again (a lost
  device: `unlink(id, true)`): then the phone shows each group as left, or keeps those still on their way to the
  device; a device unlinked so wipes them with the account's chats. A device that left all the same leaves the groups
  as left on the phone.
- A backup has the groups as they were where it was made: one from before they moved holds an older state, and
  members see a phone restored from it as behind, as with any backup of the groups (the groups then have to be
  joined again).
- A copy of a photo or file the holder keeps, put on the relay for the phone, stays there till it expires (14 days).

## Next

All of S0 to S7 are on main. Not device-tested.
