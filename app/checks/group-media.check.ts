// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Photos, files, stickers made from photos and voice messages in group chats (lib/group-media.ts,
// lib/groups.ts): three phones with the real core, as in groups.check.ts, and real relays
// (crates/erevos-relay) for the files. Skipped, with a note, without the core or the relay.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

import { blobs } from './files-memory';
import { ready, relayNote, startRelay } from './real-relay';
import { AUTO_TAKE, bytesSource, readFile } from '../lib/attachments';
import * as core from '../lib/core';
import { setCore, type Core } from '../lib/core';
import { fromBase64, randomBytes, toHex, utf8Decode } from '../lib/crypto';
import { filesToTake, sendGroupFile, takeGroupFile, voiceMime } from '../lib/group-media';
import { decodeGroup, encodeGroup, type GroupSignal } from '../lib/group-signal';
import { Groups, type GroupTransport } from '../lib/groups';
import { groupRows } from '../lib/inbox';
import { stickerMeta } from '../lib/own-stickers';
import { getChunk, RelaySession } from '../lib/relay';
import { PREFIX, type FileRef } from '../lock/attachment-files';
import { EMPTY_GROUPS, type About, type GroupData, type GroupMessage } from '../lock/group-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
if (existsSync(built)) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the group media checks: build the core first with node checks/build-core.mjs');
}
relayNote('the group media checks');

type Phone = { identity: string; groups: Groups; queue: Uint8Array[]; transport: GroupTransport; data: GroupData };

// As groups.check.ts: phones joined by queues in memory, and what each keeps, to look into.
function network(relay: (name: string) => string) {
  const phones = new Map<string, Phone>();
  const signals: { from: string; to: string; signal: GroupSignal }[] = [];
  const phone = (name: string): Phone => {
    const identity = toHex(randomBytes(32));
    const sender = toHex(randomBytes(24));
    const me = async () => ({ id: identity, sender, relay: relay(name), relayKey: '' });
    const it: Phone = { identity, groups: null as unknown as Groups, queue: [], transport: null as unknown as GroupTransport, data: EMPTY_GROUPS };
    it.groups = new Groups(EMPTY_GROUPS, async (data) => void (it.data = data), me);
    it.transport = {
      async post(to: About, packet: Uint8Array) {
        phones.get(to.id)!.queue.push(packet);
      },
      async signal(to: string, signal: GroupSignal) {
        signals.push({ from: identity, to, signal: decodeGroup(JSON.parse(JSON.stringify(encodeGroup(signal))))! });
      },
    };
    phones.set(identity, it);
    return it;
  };
  const settle = async () => {
    for (let round = 0; round < 20; round++) {
      let moved = false;
      while (signals.length > 0) {
        const { from, to, signal } = signals.shift()!;
        const target = phones.get(to)!;
        await target.groups.signal(from, signal, false, target.transport);
        moved = true;
      }
      for (const p of phones.values()) {
        while (p.queue.length > 0) {
          await p.groups.receive(p.queue.shift()!, p.transport);
          moved = true;
        }
      }
      if (!moved) return;
    }
  };
  return { phone, settle };
}

const said = (p: Phone, id: string) => p.groups.messages(id).filter((m) => !m.note);
const hasChunks = (file: FileRef) => [...blobs.keys()].some((name) => name.startsWith(`${PREFIX}${file.id}-`));

// What a phone from before files in groups read in a group's message (lib/groups.ts then): text,
// a name or a call. Anything else showed nothing.
const readBefore = (v: Record<string, unknown>) => (v.t === 'text' && typeof v.text === 'string' && v.text.length > 0) || v.t === 'name' || v.t === 'call';

let mine = '';
let theirs = '';

before(async () => {
  if (!ready) return;
  mine = await startRelay();
  theirs = await startRelay();
});

test('a photo goes to the group once, and each member takes it, leaving it for the others', { skip: !existsSync(built) || !ready }, async () => {
  // Alice and Bob on one relay, Carol on another.
  const net = network((name) => (name === 'carol' ? theirs : mine));
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();

  const photo = randomBytes(300_000);
  const progress: number[] = [];
  await sendGroupFile(alice.groups, id, { url: mine }, bytesSource(photo), { name: 'photo.jpg', mime: 'image/jpeg', kind: 'photo', w: 4, h: 3 }, undefined, alice.transport, (done) =>
    progress.push(done),
  );
  assert.deepEqual(progress, [1]);
  const [kept] = said(alice, id);
  assert.equal(kept.text, '');
  assert.deepEqual(await readFile(kept.file!), photo, 'kept here as it went');

  // What Carol's phone opens says nothing to a phone from before.
  const packet = carol.queue.find((p) => p.length > 0)!;
  const message = (await core.sealOpen(fromBase64(carol.data.seal), packet.slice(2))).message;
  const opened = (await core.group.open(fromBase64(carol.data.state), message)).opened;
  assert.equal(opened.kind, 'message');
  const inside = JSON.parse(utf8Decode((opened as { text: Uint8Array }).text)) as Record<string, unknown>;
  assert.equal(inside.t, 'file');
  assert.equal(readBefore(inside), false);

  await net.settle();
  for (const p of [bob, carol]) {
    const [m] = said(p, id);
    assert.equal(m.from, alice.identity);
    assert.equal(m.file?.kind, 'photo');
    assert.ok(m.file?.from, 'not taken yet');
    assert.equal(await readFile(m.file!), null);
    assert.deepEqual(filesToTake(p.groups.messages(id), new Set()), [m.file]);
    assert.equal(p.groups.list()[0].unread, 1);
  }

  // Bob takes it from his own relay, Carol through hers.
  const offer = said(bob, id)[0].file!.from!;
  for (const [p, relay] of [[bob, mine], [carol, theirs]] as const) {
    const taken = await takeGroupFile(p.groups, id, { url: relay }, said(p, id)[0].file!);
    assert.equal(taken?.from, undefined);
    assert.deepEqual(await readFile(said(p, id)[0].file!), photo);
    assert.deepEqual(filesToTake(p.groups.messages(id), new Set()), []);
  }
  // Still on Alice's relay, for any other member: it expires there.
  const session = await RelaySession.open({ url: mine });
  assert.ok(await getChunk(session, Uint8Array.from(Buffer.from(offer.ids.slice(0, 48), 'hex'))));
  session.close();

  // The inbox says what it is.
  const names = (identity: string) => (identity === alice.identity ? 'Alice' : 'someone');
  assert.equal(groupRows(bob.groups.list(), names, (text) => text)[0].last, 'Alice: Photo');
  assert.equal(groupRows(alice.groups.list(), names, (text) => text)[0].last, 'You: Photo');
});

test('a sticker made from a photo goes to the group as a photo does, marked, and shows as a sticker', { skip: !existsSync(built) || !ready }, async () => {
  const net = network(() => mine);
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const id = await alice.groups.create('g', [bob.identity], alice.transport);
  await net.settle();

  // A small JPEG, as lib/own-stickers.ts makes them.
  const picture = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 2, 0, 2, 0, 1, 1, 0x11, 0, ...randomBytes(3000).map((b) => b & 0x7f), 0xff, 0xd9]);
  await sendGroupFile(alice.groups, id, { url: mine }, bytesSource(picture), stickerMeta(picture), undefined, alice.transport);
  assert.equal(said(alice, id)[0].file?.sticker, true);

  // What goes says it is a photo, marked as a sticker: nothing else.
  const packet = bob.queue.find((p) => p.length > 0)!;
  const message = (await core.sealOpen(fromBase64(bob.data.seal), packet.slice(2))).message;
  const opened = (await core.group.open(fromBase64(bob.data.state), message)).opened;
  const inside = JSON.parse(utf8Decode((opened as { text: Uint8Array }).text)) as { file: Record<string, unknown> };
  assert.deepEqual([inside.file.kind, inside.file.sticker], ['photo', true]);

  await net.settle();
  const [m] = said(bob, id);
  assert.deepEqual([m.text, m.file?.kind, m.file?.sticker], ['', 'photo', true]);
  const taken = (await takeGroupFile(bob.groups, id, { url: mine }, m.file!))!;
  assert.equal(said(bob, id)[0].file?.sticker, true, 'still one once taken');
  assert.deepEqual(await readFile(taken), picture);
  assert.equal(groupRows(bob.groups.list(), () => 'Alice', (text) => text)[0].last, 'Alice: Sticker');
});

test('a voice message is a small file, and what leaves the group here takes its chunks', { skip: !existsSync(built) || !ready }, async () => {
  const net = network(() => mine);
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();

  const sound = Uint8Array.from([0, 0, 0, 24, ...[...'ftypM4A '].map((c) => c.charCodeAt(0)), ...randomBytes(40_000)]);
  assert.equal(voiceMime(sound), 'audio/mp4');
  await sendGroupFile(bob.groups, id, { url: mine }, bytesSource(sound), { name: 'voice', mime: voiceMime(sound), kind: 'file' }, 4200, bob.transport);
  await bob.groups.send(id, 'after it', bob.transport);
  await net.settle();
  const [voice, text] = said(carol, id);
  assert.equal(voice.ms, 4200);
  assert.equal(voice.file?.mime, 'audio/mp4');
  assert.equal(text.text, 'after it', 'what follows still opens');
  assert.equal(groupRows(carol.groups.list(), () => 'Bob', (t) => t)[0].last, 'Bob: after it');
  assert.equal(groupRows(bob.groups.list().map((g) => ({ ...g, last: said(bob, id)[0] })), () => 'Bob', (t) => t)[0].last, 'You: Voice message, 0:04');

  const taken = (await takeGroupFile(carol.groups, id, { url: mine }, voice.file!))!;
  assert.deepEqual(await readFile(taken), sound);
  assert.ok(hasChunks(taken));
  // Alice forgets the group before she took it: what she takes then is not kept.
  const hers = said(alice, id)[0].file!;
  await alice.groups.forget(id);
  assert.equal(await takeGroupFile(alice.groups, id, { url: mine }, hers), null);
  assert.ok(!hasChunks(hers));
  // Carol's go with the group.
  await carol.groups.forget(id);
  assert.ok(!hasChunks(taken));
  // Bob's own stay while his group does.
  assert.ok(hasChunks(said(bob, id)[0].file!));
});

test('what is taken by itself: still on the relay, small enough, not tried', () => {
  const file = (size: number, from = true): FileRef => ({
    name: 'a',
    mime: 'image/jpeg',
    kind: 'photo',
    size,
    id: toHex(randomBytes(16)),
    key: 'cd'.repeat(32),
    chunk: 1024 * 1024,
    count: 1,
    ...(from ? { from: { relay: 'ws://127.0.0.1:1', ids: 'ab'.repeat(24) } } : {}),
  });
  const m = (from: string, f: FileRef): GroupMessage => ({ at: 1, from, text: '', tag: '', file: f });
  const someone = 'ab'.repeat(32);
  const small = file(1000);
  const tried = file(1000);
  // One of this phone's own is on the relay when another device of the account sent it.
  const own = file(1000);
  const list = [m(someone, small), m('', own), m(someone, file(AUTO_TAKE + 1)), m(someone, file(1000, false)), m(someone, tried), { at: 2, from: someone, text: 'hi', tag: '' }];
  assert.deepEqual(filesToTake(list, new Set([tried.id])), [small, own]);
  assert.equal(voiceMime(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 1])), 'audio/webm');
  assert.equal(voiceMime(new Uint8Array(8)), 'application/octet-stream');
});

test('a group file on a member\'s relay, reached straight from a lent place, waits for a tap', () => {
  const ids = 'cd'.repeat(24);
  const file: FileRef = { id: 'ef'.repeat(16), key: 'ab'.repeat(32), chunk: 1024, count: 1, size: 10, kind: 'file', name: 'a.bin', mime: 'application/octet-stream', from: { relay: 'wss://theirs.example', ids } };
  const message = { at: 1, from: 'ab'.repeat(32), text: '', tag: 'a'.repeat(12), file } as GroupMessage;
  const own = { url: 'wss://own.example' };
  const lent = { url: 'wss://own.example', token: `lent.${'ab'.repeat(48)}` };
  // Through our own relay it comes by itself; from a lent place their relay would see this phone.
  assert.deepEqual(filesToTake([message], new Set(), own), [file]);
  assert.deepEqual(filesToTake([message], new Set(), lent), []);
  assert.deepEqual(filesToTake([message], new Set()), [file]);
});
