// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Collection's catalogue in the place's log (lib/sync/collection.ts): nothing goes until it is
// turned on, and then the switch goes to every device; files and folders, renamed or moved on any
// device, end the same on all; a file is deleted elsewhere only by the log's removal, never for
// being missing; what came is not written back over what changed later; and the server goes too,
// with copying to it left to each device.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkedCollection, type Collection, type CollectionItem } from '../lock/collection-data';
import { collectionChanges, collectionFrom, collectionOn, type Since } from '../lib/sync/collection';
import { change, emptyLog, setPeers, take, type Log } from '../lib/sync/log';

const PHONE = 'a1'.repeat(32);
const DELL = 'b2'.repeat(32);
const hex = (byte: string) => byte.repeat(16);

function fileOf(id: string, name: string) {
  return { name, mime: 'image/jpeg', kind: 'photo' as const, size: 1000, id, key: 'ee'.repeat(32), chunk: 64 * 1024, count: 1 };
}

function itemOf(id: string, name: string, at: number, folder = ''): CollectionItem {
  return { id, file: fileOf(hex(id.slice(0, 2) === 'aa' ? 'f1' : 'f2'), name), thumb: fileOf(hex(id.slice(0, 2) === 'aa' ? 'c1' : 'c2'), 'thumb.jpg'), folder, added: at, at };
}

const EMPTY: Collection = { items: [], folders: [], gone: [], backup: true };

// One device: its log, its Collection, and what it last took from the log.
type Device = { log: Log; c: Collection; since: Since };

function pair(): { phone: Device; dell: Device } {
  const phone = emptyLog(PHONE, PHONE);
  const dell = emptyLog(DELL, PHONE);
  for (const log of [phone, dell]) setPeers(log, [PHONE, DELL], Date.now());
  return { phone: { log: phone, c: EMPTY, since: new Map() }, dell: { log: dell, c: EMPTY, since: new Map() } };
}

// A device writes what changed in its Collection; the other takes it, and puts it in place.
function tell(from: Device, to: Device): CollectionItem[] {
  for (const c of collectionChanges(from.log, from.c, from.since)) change(from.log, Date.now(), c);
  take(to.log, from.log.ops, Date.now());
  const merged = collectionFrom(to.log, to.c, to.since);
  if (!merged) return [];
  to.c = checkedCollection(merged.next);
  return merged.dropped;
}

test('nothing goes until it is turned on; then the switch goes to every device, and the files and folders with it', () => {
  const { phone, dell } = pair();
  const now = Date.now();
  phone.c = { ...EMPTY, folders: [{ id: hex('dd'), name: 'Trips', at: now }], items: [itemOf(hex('aa'), 'sea.jpg', now, hex('dd'))] };
  assert.deepEqual(collectionChanges(phone.log, phone.c, phone.since), []);
  tell(phone, dell);
  assert.equal(dell.c.items.length, 0);

  phone.c = { ...phone.c, devices: true };
  tell(phone, dell);
  assert.equal(collectionOn(dell.log), true);
  assert.equal(dell.c.devices, true);
  assert.deepEqual(dell.c.folders.map((f) => f.name), ['Trips']);
  assert.deepEqual(dell.c.items.map((i) => [i.id, i.file.name, i.folder, i.file.key, i.thumb?.id]), [[hex('aa'), 'sea.jpg', hex('dd'), 'ee'.repeat(32), hex('c1')]]);
  // Taken, nothing is written back.
  assert.deepEqual(collectionChanges(dell.log, dell.c, dell.since), []);

  // Turned off on the computer: off on the phone too, and nothing more goes.
  dell.c = { ...dell.c, devices: false };
  tell(dell, phone);
  assert.equal(phone.c.devices, undefined);
  phone.c = { ...phone.c, items: [...phone.c.items, itemOf(hex('ab'), 'later.jpg', Date.now())] };
  tell(phone, dell);
  assert.equal(dell.c.items.length, 1);
});

test('renamed on one, moved on the other: both changes stay on both; what came is not written back over a later change', () => {
  const { phone, dell } = pair();
  const now = Date.now() - 10_000;
  phone.c = { ...EMPTY, devices: true, folders: [{ id: hex('dd'), name: 'Trips', at: now }], items: [itemOf(hex('aa'), 'sea.jpg', now)] };
  tell(phone, dell);
  // The phone renames, the computer moves it into the folder, each before hearing the other.
  phone.c = { ...phone.c, items: phone.c.items.map((i) => ({ ...i, file: { ...i.file, name: 'beach.jpg' }, at: Date.now() })) };
  dell.c = { ...dell.c, items: dell.c.items.map((i) => ({ ...i, folder: hex('dd'), at: Date.now() })) };
  tell(phone, dell);
  tell(dell, phone);
  tell(phone, dell);
  for (const d of [phone, dell]) assert.deepEqual(d.c.items.map((i) => [i.file.name, i.folder]), [['beach.jpg', hex('dd')]]);
});

test('a file deleted on one device goes on the other only by the log\'s removal; one missing there is never deleted for it', () => {
  const { phone, dell } = pair();
  const now = Date.now();
  phone.c = { ...EMPTY, devices: true, items: [itemOf(hex('aa'), 'sea.jpg', now)] };
  tell(phone, dell);
  // Added on the computer, not yet in the phone's log: the phone has not heard of it, and the
  // computer keeps it though the phone's catalogue does not name it.
  dell.c = { ...dell.c, items: [...dell.c.items, itemOf(hex('ab'), 'mine.jpg', Date.now())] };
  assert.equal(collectionFrom(dell.log, dell.c, dell.since), null);
  tell(dell, phone);
  assert.deepEqual(phone.c.items.map((i) => i.file.name).sort(), ['mine.jpg', 'sea.jpg']);

  // Deleted on the phone: a mark in its catalogue, and the log removes it; the computer lets it go,
  // and says which file's chunks to delete.
  phone.c = { ...phone.c, items: phone.c.items.filter((i) => i.id !== hex('aa')), gone: [{ id: hex('aa'), at: Date.now() }] };
  const dropped = tell(phone, dell);
  assert.deepEqual(dropped.map((i) => i.id), [hex('aa')]);
  assert.deepEqual(dell.c.items.map((i) => i.file.name), ['mine.jpg']);
  assert.equal(dell.c.gone.some((g) => g.id === hex('aa')), true);
  // A folder deleted: its files go to the top there too.
  phone.c = { ...phone.c, folders: [{ id: hex('dd'), name: 'Trips', at: Date.now() }], items: phone.c.items.map((i) => ({ ...i, folder: hex('dd'), at: Date.now() })) };
  tell(phone, dell);
  assert.equal(dell.c.items[0].folder, hex('dd'));
  phone.c = { ...phone.c, folders: [], items: phone.c.items.map((i) => ({ ...i, folder: '', at: Date.now() })), gone: [...phone.c.gone, { id: hex('dd'), at: Date.now() }] };
  tell(phone, dell);
  assert.deepEqual([dell.c.folders.length, dell.c.items[0].folder], [0, '']);
});

test('the server goes to the devices, to fetch from; copying to it stays each device\'s own', () => {
  const { phone, dell } = pair();
  const server = { on: true, url: 'https://example.org/dav/', user: 'me', password: 'pw', folder: 'ab'.repeat(12), last: 5 };
  phone.c = { ...EMPTY, devices: true, server };
  tell(phone, dell);
  assert.deepEqual(dell.c.server, { ...server, on: false, last: 0 });
  // Its own copying turned on: nothing goes for it.
  dell.c = { ...dell.c, server: { ...dell.c.server!, on: true } };
  assert.deepEqual(collectionChanges(dell.log, dell.c, dell.since), []);
  // Forgotten on the phone: forgotten there too.
  const { server: _s, ...rest } = phone.c;
  phone.c = rest;
  tell(phone, dell);
  assert.equal(dell.c.server, undefined);
});
