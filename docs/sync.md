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

## Next

Phase S3: a snapshot of the log for a device new or long away, and the log over the LAN.
