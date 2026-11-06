// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Collection on the account's other devices (lib/collection-links.ts): once turned on, the
// catalogue goes through the place's log; small pictures come at once, by the relay when there is
// no other way; a whole file at once on the same Wi-Fi, else when it is opened; a file deleted on
// one device is deleted on the other, its chunks with it; and the switch off, nothing more goes.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { room, type FileOffer } from '../lib/attachments';
import { CollectionSync, type CollectionIo } from '../lib/collection-links';
import { randomBytes } from '../lib/crypto';
import type { ChunkWay } from '../lib/sync/chunks';
import { change, emptyLog, setPeers, take, type Log } from '../lib/sync/log';
import { PREFIX, type FileRef } from '../lock/attachment-files';
import { addToCollection, deleteItems, loadCollection, openItem, setCollectionOption, type CollectionPlace } from '../lock/collection-data';
import { setCurrentSpace } from '../lock/keys';
import { blobs, files } from './files-memory';

const PHONE = 'a1'.repeat(32);
const DELL = 'b2'.repeat(32);

// Two devices of one account: each its own place, log and chunks; what one writes the other takes.
function account() {
  files.clear();
  blobs.clear();
  setCurrentSpace(null);
  const logs = { phone: emptyLog(PHONE, PHONE), dell: emptyLog(DELL, PHONE) };
  for (const log of Object.values(logs)) setPeers(log, [PHONE, DELL], Date.now());
  // The chunks each keeps, apart: the checks' file store is one for both.
  const kept = { phone: new Map<string, Uint8Array>(), dell: new Map<string, Uint8Array>() };
  const relay = new Map<string, Uint8Array[]>();
  // What the computer asked of the phone to put on the relay.
  const asked: string[][] = [];
  let lan = false;
  const devices: Partial<Record<'phone' | 'dell', { sync: CollectionSync; place: CollectionPlace }>> = {};
  const make = (me: 'phone' | 'dell', other: 'phone' | 'dell', space: number) => {
    const place: CollectionPlace = { holder: 'space', space, key: randomBytes(32) };
    const io: CollectionIo = {
      place,
      write: async (changesOf) => {
        const log = logs[me];
        let wrote = false;
        for (const c of changesOf(log)) if (change(log, Date.now(), c)) wrote = true;
        if (wrote) {
          take(logs[other], log.ops, Date.now());
          await devices[other]?.sync.heard(logs[other], true);
        }
        return wrote;
      },
      peers: () => [other],
      ask: async (_peer, ids) => {
        if (me === 'dell') asked.push(ids);
        await devices[other]?.sync.asking(me, ids);
      },
      answer: async (_peer, list) => devices[other]?.sync.answered(list),
      upload: async (ref) => {
        const chunks = Array.from({ length: ref.count }, (_, n) => kept[me].get(`${PREFIX}${ref.id}-${n}`));
        if (chunks.some((c) => !c)) throw new Error('not here');
        const ids = randomBytes(24).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '').repeat(ref.count);
        relay.set(ids, chunks as Uint8Array[]);
        return { name: ref.name, mime: ref.mime, kind: ref.kind, size: ref.size, key: ref.key, chunk: ref.chunk, relay: 'ws://relay', ids } as FileOffer;
      },
      take: async (ref, offer) => {
        const chunks = relay.get(offer.ids)!;
        chunks.forEach((c, n) => blobs.set(`${PREFIX}${ref.id}-${n}`, c));
      },
      // The same Wi-Fi, while it is up: the chunks as the other keeps them.
      ways: (): ChunkWay[] =>
        lan
          ? [
              {
                name: 'lan',
                get: async () => null,
                keep: async (want, n) => {
                  const c = kept[other].get(`${PREFIX}${want.id}-${n}`);
                  if (!c) return false;
                  blobs.set(`${PREFIX}${want.id}-${n}`, c);
                  return true;
                },
              },
            ]
          : [],
      offer: async () => true,
    };
    devices[me] = { sync: new CollectionSync(io), place };
    return devices[me]!;
  };
  const phone = make('phone', 'dell', 0);
  const dell = make('dell', 'phone', 1);
  // What the phone keeps goes to its own store, and out of the shared one.
  const keepOnPhone = () => {
    for (const [name, bytes] of blobs) if (name.startsWith(PREFIX)) kept.phone.set(name, bytes);
    for (const name of kept.phone.keys()) blobs.delete(name);
  };
  return { phone, dell, keepOnPhone, asked, kept, setLan: (on: boolean) => void (lan = on), close: () => [phone, dell].forEach((d) => d.sync.close()) };
}

const photo = { name: 'sea.jpg', mime: 'image/jpeg', kind: 'photo' as const, w: 40, h: 30 };
const bytesOf = (size: number) => ({ size, read: async (at: number, length: number) => new Uint8Array(length).fill((at / 1000) & 0xff) });
const here = (ref: FileRef) => Array.from({ length: ref.count }, (_, n) => blobs.has(`${PREFIX}${ref.id}-${n}`)).every(Boolean);

test('turned on, the catalogue goes; a small picture comes at once by the relay, the file itself when opened; deleted on the phone, it goes on the computer', async () => {
  const { phone, dell, keepOnPhone, asked, close } = account();
  try {
    const item = await addToCollection(phone.place, bytesOf(3 * room(64 * 1024)), photo, { thumb: new Uint8Array(500).fill(7) });
    await phone.sync.written();
    assert.equal((await loadCollection(dell.place)).items.length, 0);
    keepOnPhone();

    await setCollectionOption(phone.place, 'devices', true);
    await phone.sync.written();
    await dell.sync.settled();
    const there = (await loadCollection(dell.place)).items;
    assert.deepEqual(there.map((i) => [i.id, i.file.name]), [[item.id, 'sea.jpg']]);
    assert.equal((await loadCollection(dell.place)).devices, true);
    // The small picture came by the relay; the file did not, with no Wi-Fi.
    assert.deepEqual(asked, [[item.thumb!.id]]);
    assert.equal(here(item.thumb!), true);
    assert.equal(here(item.file), false);

    // Opened on the computer: asked of the phone, put on the relay, and whole.
    setCurrentSpace(dell.place.space, dell.place.key);
    const bytes = await openItem(there[0]);
    assert.equal(bytes?.length, 3 * room(64 * 1024));
    assert.deepEqual(asked.at(-1), [item.file.id]);

    // Deleted on the phone: deleted on the computer, its chunks with it.
    await deleteItems(phone.place, [item.id]);
    await phone.sync.written();
    await dell.sync.settled();
    assert.deepEqual((await loadCollection(dell.place)).items, []);
    assert.equal(here(item.file) || here(item.thumb!), false);
  } finally {
    close();
  }
});

test('on the same Wi-Fi a whole file comes at once; one only missing on the computer is not deleted on the phone; off, nothing more goes', async () => {
  const { phone, dell, keepOnPhone, setLan, kept, close } = account();
  try {
    setLan(true);
    await setCollectionOption(phone.place, 'devices', true);
    const item = await addToCollection(phone.place, bytesOf(5 * room(64 * 1024)), photo);
    keepOnPhone();
    await phone.sync.written();
    await dell.sync.settled();
    assert.equal(here(item.file), true);
    // Its chunks gone on the computer (a restore without them): nothing is deleted anywhere.
    for (let n = 0; n < item.file.count; n++) blobs.delete(`${PREFIX}${item.file.id}-${n}`);
    await dell.sync.written();
    assert.equal((await loadCollection(phone.place)).items.length, 1);
    assert.equal(kept.phone.size, item.file.count);

    // Turned off on the computer: off on the phone too; a new file stays on the phone.
    await setCollectionOption(dell.place, 'devices', false);
    await dell.sync.written();
    assert.equal((await loadCollection(phone.place)).devices, undefined);
    await addToCollection(phone.place, bytesOf(100), { ...photo, name: 'later.jpg' });
    await phone.sync.written();
    assert.deepEqual((await loadCollection(dell.place)).items.map((i) => i.file.name), ['sea.jpg']);
  } finally {
    close();
  }
});
