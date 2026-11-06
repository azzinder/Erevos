// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The account's log (lib/sync/clock.ts, log.ts, wire.ts, docs/sync.md): stamps after all a device
// saw whatever its clock says; the later change wins, a removal drops what came before it and a
// record added again starts empty; ops in any order, twice or lost and given again, end the same on
// every device; who may write what; a device far behind takes the whole log; what every device has
// goes; an unlinked device is cut off; and what comes in any other form is refused.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compare, MAX_AHEAD, tick, type Stamp } from '../lib/sync/clock';
import {
  answer, change, compact, emptyLog, idsOf, isOp, isThere, MAX_OPS, setPeers, take, takeWhole, valueOf, whole,
  type Change, type Log, type Op,
} from '../lib/sync/log';
import { blockedIn, changesFor, contactsIn } from '../lib/sync/contacts';
import { SyncLinks } from '../lib/sync/links';
import { have, heard, readSaid, type Said } from '../lib/sync/wire';

const PHONE = 'a1'.repeat(32);
const DELL = 'b2'.repeat(32);
const JOLLA = 'c3'.repeat(32);
const OTHER = 'd4'.repeat(32);
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 6);

function account(): { phone: Log; dell: Log; jolla: Log } {
  const devices = [PHONE, DELL, JOLLA];
  const logs = { phone: emptyLog(PHONE, PHONE), dell: emptyLog(DELL, PHONE), jolla: emptyLog(JOLLA, PHONE) };
  for (const log of Object.values(logs)) setPeers(log, devices, T0);
  return logs;
}

const name = (id: string, v: string): Change => ({ k: 'contact', id, f: 'name', v });

/** Lets two devices talk until neither has more to say; how many things were said. */
function talk(a: Log, b: Log, now: number): number {
  let said: { to: Log; from: string; m: Said }[] = [{ to: b, from: a.me, m: have(a) }, { to: a, from: b.me, m: have(b) }];
  let n = 0;
  while (said.length > 0) {
    assert.ok(++n < 1000, 'the devices stop talking');
    const next: typeof said = [];
    for (const { to, from, m } of said) {
      // Over the wire as JSON, as the links carry it.
      for (const back of heard(to, from, JSON.parse(JSON.stringify(m)), now)) next.push({ to: to.me === a.me ? b : a, from: to.me, m: back });
    }
    said = next;
  }
  return n;
}

/** What a log shows, the same however it came: each record there, with its fields. */
function records(log: Log): string {
  const out: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const k of Object.keys(log.data).sort()) {
    for (const id of Object.keys(log.data[k]).sort()) {
      const e = log.data[k][id];
      const fields = Object.keys(e.f).sort().map((f) => [f, e.f[f].v]);
      // A record removed shows nothing, kept or let go.
      if (!isThere(log, k, id) && fields.length === 0) continue;
      (out[k] ??= {})[id] = { there: isThere(log, k, id), ...Object.fromEntries(fields) };
    }
  }
  return JSON.stringify(out);
}

test('a stamp is after all its device made or saw, whatever its clock says', () => {
  const a = tick(undefined, T0, PHONE);
  const b = tick(a, T0 - 5000, PHONE);
  assert.ok(compare(b, a) > 0, 'a clock set back still stamps later');
  const ahead: Stamp = { t: T0 + 60_000, c: 3, d: DELL };
  const log = emptyLog(PHONE, PHONE);
  setPeers(log, [DELL], T0);
  take(log, [{ d: DELL, s: 1, at: ahead, k: 'contact', id: 'x', x: 'add' } satisfies Op], T0);
  const mine = change(log, T0, name('x', 'Mine'))!;
  assert.ok(compare(mine.at, ahead) > 0, 'after the stamp it took from a clock ahead');
  assert.equal(valueOf(log, 'contact', 'x', 'name'), 'Mine');
  // Ties go by device, so two stamps are never the same.
  assert.ok(compare({ t: 1, c: 0, d: PHONE }, { t: 1, c: 0, d: DELL }) < 0);
});

test('the later change wins, on every device, in whichever order they came', () => {
  const { phone, dell, jolla } = account();
  change(phone, T0, { k: 'contact', id: 'maria', x: 'add' });
  change(phone, T0 + 1, name('maria', 'Maria'));
  change(dell, T0 + 5, name('maria', 'Μαρία'));
  change(jolla, T0 + 3, { k: 'setting', id: 'look', f: 'theme', v: 'nocturne' });
  talk(jolla, dell, T0 + 10);
  talk(phone, jolla, T0 + 10);
  talk(dell, phone, T0 + 10);
  talk(jolla, dell, T0 + 10);
  for (const log of [phone, dell, jolla]) {
    assert.equal(valueOf(log, 'contact', 'maria', 'name'), 'Μαρία');
    assert.equal(valueOf(log, 'setting', 'look', 'theme'), 'nocturne');
  }
  assert.equal(records(phone), records(dell));
  assert.equal(records(dell), records(jolla));
});

test('a removal drops what came before it, and a record added again starts empty', () => {
  const { phone, dell } = account();
  change(phone, T0, { k: 'contact', id: 'nikos', x: 'add' });
  change(phone, T0 + 1, name('nikos', 'Nikos'));
  talk(phone, dell, T0 + 2);
  // The DELL renames while the phone removes, later: the removal wins.
  change(dell, T0 + 3, name('nikos', 'Νίκος'));
  change(phone, T0 + 4, { k: 'contact', id: 'nikos', x: 'del' });
  talk(phone, dell, T0 + 5);
  for (const log of [phone, dell]) {
    assert.equal(isThere(log, 'contact', 'nikos'), false);
    assert.equal(valueOf(log, 'contact', 'nikos', 'name'), undefined);
  }
  // Added again, on purpose: there, with nothing of before.
  change(dell, T0 + 6, { k: 'contact', id: 'nikos', x: 'add' });
  talk(phone, dell, T0 + 7);
  for (const log of [phone, dell]) {
    assert.equal(isThere(log, 'contact', 'nikos'), true);
    assert.equal(valueOf(log, 'contact', 'nikos', 'name'), undefined);
  }
  assert.deepEqual(idsOf(phone, 'contact'), ['nikos']);
});

test('ops shuffled, twice and held for what they follow end the same', () => {
  // Many changes on three devices, given to a fourth reader in random order, some twice.
  const { phone, dell, jolla } = account();
  let seed = 7;
  const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
  const all: Op[] = [];
  const devices = [phone, dell, jolla];
  for (let i = 0; i < 300; i++) {
    const log = devices[rand(3)];
    const id = `c${rand(6)}`;
    const r = rand(10);
    const c: Change = r < 2 ? { k: 'contact', id, x: 'add' } : r < 3 ? { k: 'contact', id, x: 'del' } : { k: 'contact', id, f: rand(2) ? 'name' : 'look', v: `v${i}` };
    const op = change(log, T0 + rand(1000), c);
    if (op) all.push(op);
    if (rand(15) === 0) talk(devices[rand(3)], devices[rand(3)], T0 + 2000);
  }
  for (const a of devices) for (const b of devices) if (a !== b) talk(a, b, T0 + 2000);
  for (let round = 0; round < 3; round++) {
    const reader = emptyLog(JOLLA, PHONE);
    setPeers(reader, [PHONE, DELL, JOLLA], T0);
    // The reader is the Jolla put back from nothing: its own ops it takes as anyone's.
    reader.me = OTHER;
    setPeers(reader, [PHONE, DELL, JOLLA], T0);
    const shuffled = [...all, ...all.slice(0, 50)].map((op) => ({ op, k: rand(1e6) })).sort((x, y) => x.k - y.k).map((x) => x.op);
    for (let i = 0; i < shuffled.length; i += 37) take(reader, shuffled.slice(i, i + 37), T0 + 2000);
    assert.equal(reader.held.length, 0, 'nothing left held');
    assert.equal(records(reader), records(phone));
  }
  assert.equal(records(phone), records(dell));
  assert.equal(records(dell), records(jolla));
});

test('only the primary writes what the account decides, and the rest goes on', () => {
  const { phone, dell, jolla } = account();
  assert.equal(change(dell, T0, { k: 'holder', id: 'groups', f: 'd', v: DELL }), null, 'a device cannot write it');
  // One a device sends all the same is passed over, and what it wrote after it still counts.
  const forged: Op = { d: DELL, s: 1, at: { t: T0, c: 0, d: DELL }, k: 'holder', id: 'groups', f: 'd', v: DELL };
  const next: Op = { d: DELL, s: 2, at: { t: T0 + 1, c: 0, d: DELL }, k: 'note', id: 'n1', f: 'text', v: 'hi' };
  const r = take(jolla, [next, forged], T0 + 2);
  assert.equal(r.refused, 1);
  assert.equal(valueOf(jolla, 'holder', 'groups', 'd'), undefined);
  assert.equal(valueOf(jolla, 'note', 'n1', 'text'), 'hi');
  // The phone moves the groups to the DELL: every device takes it.
  assert.ok(change(phone, T0 + 3, { k: 'holder', id: 'groups', f: 'd', v: DELL }));
  talk(phone, dell, T0 + 4);
  talk(dell, jolla, T0 + 4);
  assert.equal(valueOf(jolla, 'holder', 'groups', 'd'), DELL);
  // Nor does a device's whole log bring in what only the primary writes.
  const fake = whole(dell);
  fake.data.holder = { groups: { f: { d: { v: JOLLA, at: { t: T0 + 99, c: 0, d: DELL } } } } };
  takeWhole(jolla, DELL, fake);
  assert.equal(valueOf(jolla, 'holder', 'groups', 'd'), DELL);
});

test('a stamp too far ahead waits for the clock, and one from no device of the account waits for the list', () => {
  const { jolla } = account();
  const far: Op = { d: DELL, s: 1, at: { t: T0 + 2 * MAX_AHEAD, c: 0, d: DELL }, k: 'note', id: 'n', f: 'text', v: 'later' };
  assert.equal(take(jolla, [far], T0).held, 1);
  assert.equal(valueOf(jolla, 'note', 'n', 'text'), undefined);
  take(jolla, [], T0 + 2 * MAX_AHEAD);
  assert.equal(valueOf(jolla, 'note', 'n', 'text'), 'later');
  const early: Op = { d: OTHER, s: 1, at: { t: T0, c: 0, d: OTHER }, k: 'note', id: 'o', f: 'text', v: 'new device' };
  assert.equal(take(jolla, [early], T0 + 2 * MAX_AHEAD).held, 1);
  setPeers(jolla, [PHONE, DELL, JOLLA, OTHER], T0 + 2 * MAX_AHEAD);
  assert.equal(valueOf(jolla, 'note', 'o', 'text'), 'new device');
});

test('an unlinked device is cut off, and what it wrote before stays', () => {
  const { phone, dell, jolla } = account();
  change(dell, T0, { k: 'note', id: 'before', f: 'text', v: 'kept' });
  talk(dell, phone, T0 + 1);
  setPeers(phone, [PHONE, JOLLA], T0 + 10);
  const late = change(dell, T0 + 20, { k: 'note', id: 'after', f: 'text', v: 'stolen' })!;
  assert.deepEqual(heard(phone, DELL, have(dell), T0 + 21), [], 'it is not answered');
  assert.equal(take(phone, [late], T0 + 21).refused, 1);
  assert.equal(valueOf(phone, 'note', 'before', 'text'), 'kept');
  assert.equal(valueOf(phone, 'note', 'after', 'text'), undefined);
  // Nor does another device pass it on.
  setPeers(jolla, [PHONE, JOLLA], T0 + 10);
  talk(phone, jolla, T0 + 22);
  take(jolla, [late], T0 + 22);
  assert.equal(valueOf(jolla, 'note', 'after', 'text'), undefined);
});

test('what every device has goes, and a removed record once nothing from before can come', () => {
  const { phone, dell, jolla } = account();
  change(phone, T0, { k: 'contact', id: 'old', x: 'add' });
  change(phone, T0 + 1, { k: 'contact', id: 'old', x: 'del' });
  for (let i = 0; i < 3; i++) {
    talk(phone, dell, T0 + 2);
    talk(phone, jolla, T0 + 2);
    talk(dell, jolla, T0 + 2);
  }
  compact(phone);
  assert.equal(phone.ops.length, 0, 'every device has them');
  assert.equal(phone.data.contact, undefined, 'the removed record went');
  // A device that has nothing from before, as those ops went, takes the whole log.
  const fresh = emptyLog(OTHER, PHONE);
  setPeers(phone, [PHONE, DELL, JOLLA, OTHER], T0 + 3);
  setPeers(fresh, [PHONE, DELL, JOLLA, OTHER], T0 + 3);
  change(phone, T0 + 4, { k: 'setting', id: 'look', f: 'language', v: 'el' });
  assert.deepEqual(Object.keys(answer(phone, OTHER, {})), ['whole']);
  talk(phone, fresh, T0 + 5);
  assert.equal(valueOf(fresh, 'setting', 'look', 'language'), 'el');
  assert.equal(records(fresh), records(phone));
  // Taken twice, the whole log changes nothing.
  const before = records(fresh);
  takeWhole(fresh, PHONE, whole(phone));
  assert.equal(records(fresh), before);
});

test('the oldest ops go past what is kept, and a device behind then takes the whole log', () => {
  const { phone, dell } = account();
  for (let i = 0; i < MAX_OPS + 10; i++) change(phone, T0 + i, { k: 'note', id: `n${i % 20}`, f: 'text', v: `${i}` });
  assert.equal(phone.ops.length, MAX_OPS);
  const n = talk(phone, dell, T0 + MAX_OPS + 20);
  assert.ok(n < 10, 'one whole log, not thousands of ops');
  assert.equal(records(dell), records(phone));
});

test('a long way behind, given in batches', () => {
  const { phone, dell } = account();
  for (let i = 0; i < 1000; i++) change(phone, T0 + i, { k: 'note', id: `n${i}`, f: 'text', v: 'x' });
  talk(phone, dell, T0 + 2000);
  assert.equal(idsOf(dell, 'note').length, 0, 'notes have fields, not adds');
  assert.equal(Object.keys(dell.data.note).length, 1000);
  assert.equal(dell.vv[PHONE], 1000);
});

test('a device put back from a backup never numbers an op again as one it made', () => {
  const { phone, dell } = account();
  change(dell, T0, { k: 'note', id: 'a', f: 'text', v: 'one' });
  const backup = structuredClone(dell);
  change(dell, T0 + 1, { k: 'note', id: 'b', f: 'text', v: 'two' });
  talk(dell, phone, T0 + 2);
  // The DELL is put back as it was before its second note, and writes again.
  talk(backup, phone, T0 + 3);
  assert.equal(backup.vv[DELL], 2, 'it knows its own last number');
  assert.equal(valueOf(backup, 'note', 'b', 'text'), 'two');
  change(backup, T0 + 4, { k: 'note', id: 'c', f: 'text', v: 'three' });
  talk(backup, phone, T0 + 5);
  assert.equal(valueOf(phone, 'note', 'c', 'text'), 'three');
});

test('anything in another form is refused', () => {
  const ok: Op = { d: DELL, s: 1, at: { t: T0, c: 0, d: DELL }, k: 'note', id: 'n', f: 'text', v: 'x' };
  assert.ok(isOp(ok));
  const bad: unknown[] = [
    { ...ok, s: 0 },
    { ...ok, d: 'DELL' },
    { ...ok, at: { t: T0, c: 0, d: PHONE } },
    { ...ok, k: 'Contact' },
    { ...ok, id: '' },
    { ...ok, f: undefined },
    { ...ok, v: undefined },
    { ...ok, v: 'x'.repeat(20000) },
    { ...ok, v: { n: NaN } },
    { ...ok, x: 'add' },
    { ...ok, extra: 1 },
    { d: DELL, s: 1, at: ok.at, k: 'note', id: 'n', x: 'gone' },
  ];
  for (const b of bad) assert.equal(isOp(b), false, JSON.stringify(b));
  assert.equal(readSaid({ k: 'have', vv: { [DELL]: -1 } }), null);
  assert.equal(readSaid({ k: 'have', vv: {}, more: 1 }), null);
  assert.equal(readSaid({ k: 'ops', ops: [bad[0]] }), null);
  assert.equal(readSaid({ k: 'whole', vv: {}, data: { note: { n: { f: { text: { v: 1 } } } } } }), null);
  assert.equal(readSaid({ k: 'nope' }), null);
  const { jolla } = account();
  assert.equal(take(jolla, bad, T0).refused, bad.length);
  assert.deepEqual(jolla.data, {});
});

test('the clock moves a ms on once its counter is full', () => {
  let s: Stamp | undefined;
  for (let i = 0; i < 70_000; i++) s = tick(s, T0, PHONE);
  assert.ok(s!.t > T0 && s!.t < T0 + DAY);
});

// Devices with their links as lib/devices.ts gives them: what each says goes to the other's inbox.
function linked(): { phone: SyncLinks; dell: SyncLinks; said: { to: string; from: string; m: Said }[]; deliver: () => Promise<number> } {
  const said: { to: string; from: string; m: Said }[] = [];
  const kept: Record<string, Log | null> = {};
  const make = (me: string) =>
    new SyncLinks(
      {
        load: async () => (kept[me] ? structuredClone(kept[me]) : null),
        save: async (log) => {
          kept[me] = log && structuredClone(log);
        },
        send: (to, m) => said.push({ to, from: me, m: JSON.parse(JSON.stringify(m)) as Said }),
        who: () => ({ me, primary: PHONE, peers: [PHONE, DELL] }),
      },
      () => T0,
    );
  const links: Record<string, SyncLinks> = { [PHONE]: make(PHONE), [DELL]: make(DELL) };
  const deliver = async () => {
    let n = 0;
    while (said.length > 0) {
      const { to, from, m } = said.shift()!;
      n++;
      await links[to].heard(from, m);
    }
    return n;
  };
  return { phone: links[PHONE], dell: links[DELL], said, deliver };
}

const carol = { identity: 'e5'.repeat(32), name: 'Carol', timer: 0, request: false, look: null, hide: false };

test('the phone writes the contacts into the log, and a device takes them with nothing said back', async () => {
  const { phone, dell, deliver } = linked();
  assert.equal(await phone.writeFrom((log) => changesFor(log, [carol], [{ identity: OTHER, name: 'Spam' }])), true);
  assert.equal(await deliver(), 1, 'one ops, and no thanks for it');
  const log = (await dell.read())!;
  assert.deepEqual(contactsIn(log), [carol]);
  assert.deepEqual(blockedIn(log), [{ identity: OTHER, name: 'Spam' }]);
  // The same again writes nothing, and says nothing.
  assert.equal(await phone.writeFrom((l) => changesFor(l, [carol], [{ identity: OTHER, name: 'Spam' }])), false);
  assert.equal(await deliver(), 0);
  // A change goes alone: what was given before does not go again.
  await phone.writeFrom((l) => changesFor(l, [{ ...carol, timer: 3600 }], []));
  assert.equal(await deliver(), 1);
  const next = (await dell.read())!;
  assert.equal(contactsIn(next)[0].timer, 3600);
  assert.deepEqual(blockedIn(next), []);
  assert.equal(next.vv[PHONE], 10, 'eight ops, then the timer and the one no longer blocked');
});

test('now and then the phone asks a device that may lack its ops, and the device says how far it is, once', async () => {
  const { phone, dell, said, deliver } = linked();
  await phone.writeFrom((log) => changesFor(log, [carol], []));
  // Lost on the way.
  said.length = 0;
  await phone.ask();
  assert.equal(await deliver(), 3, 'asked, told how far, given what it lacked');
  assert.deepEqual(contactsIn((await dell.read())!), [carol]);
  // Asked again: it says it has all, and from then nothing is asked.
  await phone.ask();
  assert.equal(await deliver(), 2);
  await phone.ask();
  await dell.ask();
  assert.equal(await deliver(), 0, 'two devices that have all of each other say nothing');
});

test('a device unlinked forgets the log, and starts a new one when linked again', async () => {
  const { phone, dell, deliver } = linked();
  await phone.writeFrom((log) => changesFor(log, [carol], []));
  await deliver();
  await dell.forget();
  const log = (await dell.read())!;
  assert.deepEqual(log.data, {});
  await dell.ask();
  await phone.ask();
  await deliver();
  assert.deepEqual(contactsIn((await dell.read())!), [carol]);
});
