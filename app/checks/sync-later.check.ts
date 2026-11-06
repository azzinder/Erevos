// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What the account sent for later, in the place's log (lib/sync/later.ts): written once held, its
// copies as more are held, shown on the other device while its time is ahead, taken back by a
// removal any device writes, and gone a day after its time.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { laterChanges, laterFrom, laterGone, laterId, type Scheduled } from '../lib/sync/later';
import { change, emptyLog, setPeers, take, type Log } from '../lib/sync/log';

const PHONE = 'a1'.repeat(32);
const DELL = 'b2'.repeat(32);
const CAROL = 'c3'.repeat(32);
const held = (n: string) => ({ id: n.repeat(32), relay: 'wss://relay.example.org' });

function pair(): { phone: Log; dell: Log } {
  const phone = emptyLog(PHONE, PHONE);
  const dell = emptyLog(DELL, PHONE);
  for (const log of [phone, dell]) setPeers(log, [PHONE, DELL], Date.now());
  return { phone, dell };
}

const write = (from: Log, to: Log, changes: ReturnType<typeof laterChanges>) => {
  for (const c of changes) change(from, Date.now(), c);
  take(to, from.ops, Date.now());
};

test('held on the computer: the phone shows it, with its copies as they are held; taken back there, it goes on both; past its time a day, it goes', () => {
  const { phone, dell } = pair();
  const now = Date.now();
  const s: Scheduled = { c: CAROL, tag: 'abcdefabcdef', at: now + 3600_000, text: 'tomorrow', what: 'text', lasts: 0, held: held('1'), copies: [] };
  write(dell, phone, laterChanges(dell, [s], now));
  assert.deepEqual(laterFrom(phone, null, now).came, [s]);
  // Written again as it is: nothing; one more copy held: that.
  assert.deepEqual(laterChanges(dell, [s], now), []);
  const more = { ...s, copies: [held('2')] };
  write(dell, phone, laterChanges(dell, [more], now));
  assert.deepEqual(laterFrom(phone, [laterId(CAROL, s.tag)], now).came[0].copies, [held('2')]);
  // Its time past: not shown.
  assert.deepEqual(laterFrom(phone, null, s.at + 1).came, []);

  // Taken back on the phone: the computer lets it go, and does not write it again.
  write(phone, dell, laterGone(phone, CAROL, s.tag));
  assert.deepEqual(laterFrom(dell, null, now), { came: [], gone: [{ c: CAROL, tag: s.tag }] });
  assert.deepEqual(laterChanges(dell, [more], now), []);

  // A day past its time: removed.
  const old: Scheduled = { ...s, tag: '012345012345', at: now + 1000 };
  write(dell, phone, laterChanges(dell, [old], now));
  assert.deepEqual(laterChanges(phone, [], old.at + 25 * 3600_000).map((c) => [c.id, 'x' in c ? c.x : '']), [[laterId(CAROL, old.tag), 'del']]);
});

test('a record that is not one sent for later is not shown', () => {
  const { phone } = pair();
  change(phone, Date.now(), { k: 'later', id: laterId(CAROL, 'abcdefabcdef'), x: 'add' });
  change(phone, Date.now(), { k: 'later', id: laterId(CAROL, 'abcdefabcdef'), f: 'at', v: Date.now() + 3600_000 });
  change(phone, Date.now(), { k: 'later', id: 'nonsense', x: 'add' });
  assert.deepEqual(laterFrom(phone, null).came, []);
});
