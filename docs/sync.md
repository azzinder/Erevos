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
  kept; taking them, it says `have` again. Two devices that have the same say nothing more. A device
  is never given its own ops back; one that has fewer of its own than another has of it (put back
  from a backup) takes the whole log, and numbers its next op after the last it made.
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

## Next

S1 keeps the log sealed with the space's key, sends it in the devices' conversations
(lib/siblings.ts and the phone's links), and moves contacts, blocked, requests and notes onto it,
still writing the envelopes of before for devices of the 6 series.
