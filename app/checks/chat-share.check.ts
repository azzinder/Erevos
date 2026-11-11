// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Imported chats shared with the contact they go on with (lib/chat-share.ts): the mark their file
// carries, and what an Erevos from before makes of it; the chats packed and read back, their files
// named by place; the sides swapped; a copy shared again in place of the one before
// (lock/archive.ts); a file of an imported chat in more chunks than a message's; what a round says
// (lib/chat-parts.ts); and, with the real core and real relays (crates/erevos-relay), the files
// going in rounds (lib/share-rounds.ts) through a relay that keeps only a few MB, several times
// that in all, each phone starting again in the middle; to an Erevos from before, none, and the
// share ends; a share stopped by either phone; a phone with too little room, or one that cannot
// write, that waits and says so; and a place lent on a contact's relay, with Tor off, whose files
// wait for Tor. Those are skipped with a note when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

import { blobs, files, room } from './files-memory';
import { ready, relayNote, startRelay } from './real-relay';
import { bytesSource, chunkPlan, keepFile, offerRef, readFile, readOffer, sendFile, type FileOffer } from '../lib/attachments';
import { carriedOf, checkedRounds, ROUND_IDS, toCarry } from '../lib/chat-parts';
import {
  askToShare,
  markOf,
  packBytes,
  packChats,
  packMeta,
  readPack,
  readPackedFile,
  receivedChats,
  sharable,
  sharedLine,
  shareSize,
  sourcesText,
  takeAskToShare,
  theirSide,
  type PackedChat,
} from '../lib/chat-share';
import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex, utf8Encode } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { canForward } from '../lib/forward';
import { MAX_IMPORTED_FILE } from '../lib/imports';
import { messageLine } from '../lib/message-line';
import { sweepPendingChunks } from '../lib/pending-chunks';
import { deleteChunk, fromHex, getChunk, putChunk, RelaySession, setThroughTor } from '../lib/relay';
import { beginShare, chunkAt, driveShares, forgetRounds, packCame, readyShare, roundsCame, shareLines, sharesSettled, sharingNow, startsOf, stopShare, WINDOW_CHUNKS, type ShareWay } from '../lib/share-rounds';
import type { SpaceChats } from '../lib/space-chats';
import { VoiceAssembler } from '../lib/voice';
import { Archive, replaceShared, type ArchivedChat } from '../lock/archive';
import { cleanFileName, cleanMime, HISTORY_CHUNKS, isFileMeta, isFileRef, MOST_CHUNKS, PREFIX, type FileRef } from '../lock/attachment-files';
import { History } from '../lock/history';
import { loadRounds, type RoundsPlace } from '../lock/share-rounds-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the end-to-end check of shared chats: build the core first with node checks/build-core.mjs');
}
relayNote('the check of shared chats through the relays');

const t = (name: string, fn: () => void | Promise<void>, skip = false) =>
  test(name, { skip }, async () => {
    files.clear();
    blobs.clear();
    await fn();
  });

const ALICE = 'a1'.repeat(32);
const BOB = 'b2'.repeat(32);

const offerOf = (size: number, more: Partial<FileOffer> = {}): FileOffer => {
  const { chunk, count } = chunkPlan(size);
  return { name: 'photo.jpg', mime: 'image/jpeg', kind: 'photo', size, relay: 'ws://127.0.0.1:7879', ids: toHex(randomBytes(24 * count)), key: toHex(randomBytes(32)), chunk, ...more };
};

const refOf = (size: number, kind: 'photo' | 'file' = 'photo'): FileRef => {
  const { chunk, count } = chunkPlan(size);
  return { name: kind === 'photo' ? 'photo.jpg' : 'notes.pdf', mime: kind === 'photo' ? 'image/jpeg' : 'application/pdf', kind, size, id: toHex(randomBytes(16)), key: toHex(randomBytes(32)), chunk, count };
};

// How an Erevos before this one reads a file's offer (lib/attachments.ts readOffer then): field by
// field, the ones it knew, and nothing larger than a message's file.
function readBefore(value: unknown): FileOffer | null {
  const v = value as Partial<FileOffer> | null;
  if (!v || typeof v !== 'object') return null;
  const meta = { name: cleanFileName(typeof v.name === 'string' ? v.name : ''), mime: cleanMime(v.mime), kind: v.kind, size: v.size };
  if (!isFileMeta(meta) || meta.size > 100 * 1000 * 1000 || typeof v.relay !== 'string' || typeof v.key !== 'string' || typeof v.ids !== 'string') return null;
  if (v.chunk !== chunkPlan(meta.size).chunk) return null;
  return { ...meta, relay: v.relay, ids: v.ids, key: v.key, chunk: v.chunk };
}

const chat = (messages: ArchivedChat['messages'], more: Partial<ArchivedChat> = {}): ArchivedChat => ({
  id: toHex(randomBytes(8)),
  source: 'telegram',
  title: 'Bob',
  me: 'Alice',
  added: 1,
  skipped: 2,
  contact: BOB,
  messages,
  ...more,
});

t('the mark of shared chats travels on the offer of a .json, which an Erevos from before shows as a file', () => {
  const mark = markOf([chat([[1, 'Alice', 'hi', '']]), chat([[2, 'Bob', 'yo', '']], { source: 'viber' })]);
  assert.deepEqual(mark, { from: ['telegram', 'viber'], count: 2 });
  assert.equal(sourcesText(mark.from), 'Telegram and Viber');
  const meta = packMeta({ from: ['telegram'], count: 3 });
  assert.deepEqual(meta, { name: 'Chat from Telegram.json', mime: 'application/json', kind: 'file', history: { from: ['telegram'], count: 3 } });
  const offer = offerOf(5000, { name: meta.name, mime: meta.mime, kind: 'file', history: meta.history });
  const wire = JSON.parse(JSON.stringify(offer)) as unknown;
  assert.deepEqual(readOffer(wire), offer);
  const ref = offerRef(readOffer(wire)!);
  assert.deepEqual(ref.history, { from: ['telegram'], count: 3 });
  const { from: _from, ...here } = ref;
  assert.equal(isFileRef(here), true);
  // Said of what cannot be one, or saying what does not read, it is a file like any other.
  assert.equal(readOffer({ ...offer, kind: 'photo' })!.history, undefined);
  assert.equal(readOffer({ ...offer, history: { from: ['icq'], count: 3 } })!.history, undefined);
  assert.equal(readOffer({ ...offer, history: { from: ['telegram'], count: -1 } })!.history, undefined);
  assert.equal(isFileRef({ ...here, kind: 'photo' }), false);
  // An Erevos from before: a .json file named for what it is, which it takes and opens as any other.
  const old = readBefore(wire)!;
  assert.deepEqual(old, { name: 'Chat from Telegram.json', mime: 'application/json', kind: 'file', size: 5000, relay: offer.relay, ids: offer.ids, key: offer.key, chunk: offer.chunk });
  assert.equal(messageLine({ text: '', file: offerRef(old) }), 'File: Chat from Telegram.json');
  // Its line, and never forwarded: it goes to the one it was shared with, no one else.
  assert.equal(sharedLine({ from: ['telegram'], count: 3 }, false, 'Alice'), 'Alice shared a chat from Telegram: 3 messages');
  assert.equal(sharedLine({ from: ['viber'], count: 1 }, true, 'Bob'), 'You shared a chat from Viber: 1 message');
  assert.equal(canForward({ text: '', file: here }), false);
  assert.equal(canForward({ text: '', file: { ...here, history: undefined } }), true);
});

t('chats are packed with their files named by place, read back as they went, and anything else is left out', () => {
  const [photo, gone] = [refOf(2000), refOf(3000, 'file')];
  const share = toHex(randomBytes(16));
  const chats = [chat([[1000, 'Alice', 'hi', ''], [2000, 'Bob', '', 'video', [photo, gone]], [0, 'Bob', 'no time', '']])];
  const packed = packChats(share, chats, [photo]);
  // The one that goes is named by its place among the share's files, with its key, never by where
  // it is kept here; the other, no longer here, as one that stayed behind.
  assert.deepEqual(packed.chats[0].messages[1], [2000, 'Bob', '', 'video,file', [0]]);
  assert.deepEqual(packed.files, [{ name: 'photo.jpg', mime: 'image/jpeg', kind: 'photo', size: 2000, key: photo.key, chunk: photo.chunk }]);
  assert.deepEqual(packed.chats[0].messages[0], [1000, 'Alice', 'hi', '']);
  const bytes = packBytes(packed);
  assert.deepEqual(readPack(bytes), packed);
  assert.equal(readPack(bytes)!.chats[0].id, chats[0].id);
  // An Erevos from before that reads a pack reads no file in it: each one is named as one that stayed behind.
  assert.equal(readBefore(0), null);
  // Not a pack, or not one that reads: nothing.
  assert.equal(readPack(utf8Encode('{}')), null);
  assert.equal(readPack(utf8Encode('not json')), null);
  assert.equal(readPack(utf8Encode(JSON.stringify({ kind: 'something', v: 1, chats: packed.chats }))), null);
  // What a later Erevos adds is left out; a chat or message that does not read is.
  const later = JSON.parse(utf8Decode(bytes)) as { v: number; chats: Record<string, unknown>[] };
  later.v = 2;
  later.chats[0].more = 'later';
  later.chats.push({ id: 'zz', source: 'telegram', messages: [] }, { id: 'ab', source: 'icq', messages: [] });
  (later.chats[0].messages as unknown[]).push(['when', 'x', 'y', ''], [5, 'x', 'y']);
  assert.deepEqual(readPack(utf8Encode(JSON.stringify(later))), packed);
  // A file may be as large as an imported one, in more chunks than a message's file has, never
  // larger, and in chunks as any file of its size has them; one that does not read keeps its place,
  // and is named as one that stayed behind, as is a place no file has.
  const film = { name: 'film.mp4', mime: 'video/mp4', kind: 'file', size: MAX_IMPORTED_FILE, key: toHex(randomBytes(32)), chunk: 1024 * 1024 };
  assert.ok(chunkPlan(MAX_IMPORTED_FILE).count > MOST_CHUNKS);
  assert.deepEqual(readPackedFile(film), film);
  assert.equal(readPackedFile({ ...film, size: MAX_IMPORTED_FILE + 1 }), null);
  assert.equal(readPackedFile({ ...film, chunk: 64 * 1024 }), null);
  assert.equal(readPackedFile({ ...film, key: 'aa' }), null);
  const odd = { kind: 'erevos-shared-chats', v: 1, share, files: [film, { ...film, size: MAX_IMPORTED_FILE + 1 }], chats: [{ ...packed.chats[0], messages: [[1, 'Bob', '', '', [0, 1, 7, 'x']]] }] };
  const read = readPack(utf8Encode(JSON.stringify(odd)))!;
  assert.deepEqual(read.files, [film, null]);
  assert.deepEqual(read.chats[0].messages, [[1, 'Bob', '', 'file,file,file', [0]]]);
  // With no share's id, no file comes: only the words.
  assert.deepEqual(readPack(utf8Encode(JSON.stringify({ ...odd, share: 'x' }))), { share: '', files: [], chats: [{ ...read.chats[0], messages: [[1, 'Bob', '', 'file,file,file,file']] }] });
  // What it comes to: the messages, and the words and files together.
  assert.deepEqual(shareSize(chats), { count: 3, bytes: shareSize([chat([[1000, 'Alice', 'hi', ''], [2000, 'Bob', '', 'video'], [0, 'Bob', 'no time', '']])]).bytes + 5000 });
});

const utf8Decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

t('the sides swap: the sharer’s messages are theirs, in a chat of two the other’s are mine, and a group keeps its names', async () => {
  const two: PackedChat = { id: 'aa', source: 'whatsapp', title: 'Bob', me: 'Alice', skipped: 0, messages: [[1, 'Alice', 'hi', ''], [2, 'Bob', 'yo', ''], [3, '', 'joined', '']] };
  const group: PackedChat = { ...two, id: 'bb', title: 'Hiking', messages: [...two.messages, [4, 'Carol', 'me too', '']] };
  const nobody: PackedChat = { ...two, id: 'cc', me: '' };
  assert.equal(theirSide(two), 'Bob');
  assert.equal(theirSide(group), '');
  assert.equal(theirSide(nobody), '');
  const kept = receivedChats({ chats: [two, group, nobody], files: [] }, ALICE, 'Alice K.', [], 7);
  // Linked to the one who shared them, kept only in their chat, and named for them in a chat of two.
  assert.deepEqual(
    kept.map(({ title, me, contact, inChat, shared, added }) => ({ title, me, contact, inChat, shared, added })),
    [
      { title: 'Alice K.', me: 'Bob', contact: ALICE, inChat: true, shared: { by: ALICE, id: 'aa' }, added: 7 },
      { title: 'Hiking', me: '', contact: ALICE, inChat: true, shared: { by: ALICE, id: 'bb' }, added: 7 },
      { title: 'Bob', me: '', contact: ALICE, inChat: true, shared: { by: ALICE, id: 'cc' }, added: 7 },
    ],
  );
  const archive = await Archive.open('space', 0, randomBytes(32));
  await archive.keepShared(kept.slice(0, 1));
  assert.deepEqual(
    archive.linked(ALICE).map(({ sender, mine }) => [sender, mine]),
    [
      ['Alice', false],
      ['Bob', true],
      ['', false],
    ],
  );
  // Kept so when the archive opens again; a chat a contact shared is not shared on.
  const key = randomBytes(32);
  const again = await Archive.open('space', 1, key);
  await again.add([{ ...chat([[1, 'Alice', 'hi', '']]), contact: ALICE }]);
  await again.keepShared(kept.slice(0, 1));
  const reopened = await Archive.open('space', 1, key);
  assert.deepEqual(reopened.chats().map((c) => c.shared).filter(Boolean), [{ by: ALICE, id: 'aa' }]);
  assert.equal(sharable(reopened, ALICE).length, 1);
  assert.equal(sharable(reopened, ALICE)[0].shared, undefined);
  assert.deepEqual(sharable(reopened, BOB), []);
});

t('a chat shared again takes the place of the copy kept before, whose files go', async () => {
  const one = { by: ALICE, id: 'aa' };
  const was = chat([[1, 'Bob', 'hi', '']], { shared: one });
  const other = chat([[1, 'Bob', 'hi', '']], { shared: { by: ALICE, id: 'bb' } });
  const fromCarol = chat([[1, 'Bob', 'hi', '']], { shared: { by: 'c3'.repeat(32), id: 'aa' } });
  const mine = chat([[1, 'Bob', 'hi', '']]);
  const now = chat([[1, 'Bob', 'hi again', '']], { shared: one });
  const { chats, gone } = replaceShared([was, other, fromCarol, mine], [now]);
  assert.deepEqual(gone, [was]);
  assert.deepEqual(chats, [other, fromCarol, mine, now]);

  const archive = await Archive.open('space', 0, randomBytes(32));
  const old = await keepFile(bytesSource(randomBytes(1000)), { name: 'a.jpg', mime: 'image/jpeg', kind: 'photo' });
  const kept = await keepFile(bytesSource(randomBytes(1000)), { name: 'b.jpg', mime: 'image/jpeg', kind: 'photo' });
  const { id: _a, ...first } = chat([[1, 'Bob', 'hi', '', [old, kept]]], { shared: one, contact: ALICE });
  const { id: _b, ...second } = chat([[1, 'Bob', 'hi', '', [kept]], [2, 'Alice', 'more', '']], { shared: one, contact: ALICE });
  await archive.keepShared([first]);
  await archive.keepShared([second]);
  assert.equal(archive.chats().length, 1);
  assert.equal(archive.linked(ALICE).length, 2);
  // The old copy's file goes; the one the new copy names too stays.
  assert.equal(blobs.has(`${PREFIX}${old.id}-0`), false);
  assert.equal(blobs.has(`${PREFIX}${kept.id}-0`), true);
});

t('Settings → Imported chats asks the chat with the contact to share, once', () => {
  assert.equal(takeAskToShare(BOB), false);
  askToShare(BOB);
  assert.equal(takeAskToShare(ALICE), false);
  assert.equal(takeAskToShare(BOB), true);
  assert.equal(takeAskToShare(BOB), false);
  assert.equal(takeAskToShare(''), false);
});

t('a round says where chunks wait, how many came, or that it ends, with no words, and nothing else reads as one', () => {
  const s = toHex(randomBytes(16));
  const ids = toHex(randomBytes(48));
  assert.deepEqual(checkedRounds({ s, at: 3, r: 'wss://relay.example', ids, took: 1 }), { s, at: 3, r: 'wss://relay.example', ids });
  assert.deepEqual(checkedRounds({ s, took: 5, gone: true, later: 1 }), { s, took: 5, gone: true });
  assert.deepEqual(checkedRounds({ s, took: 0 }), { s, took: 0 });
  assert.deepEqual(checkedRounds({ s, drop: true, took: 2 }), { s, drop: true });
  // That the phone has no room for more, with how many it took; that no more files come.
  assert.deepEqual(checkedRounds({ s, took: 3, full: true, later: 1 }), { s, took: 3, full: true });
  assert.deepEqual(checkedRounds({ s, took: 3, full: 1 }), { s, took: 3 });
  assert.deepEqual(checkedRounds({ s, end: true, took: 2 }), { s, end: true });
  assert.equal(checkedRounds({ s, end: 1 }), null);
  const many = '00'.repeat(24 * (ROUND_IDS + 1));
  for (const bad of [null, 'x', {}, { s: 'x', took: 1 }, { s, took: -1 }, { s, took: 1.5 }, { s, at: 1, r: 'https://x', ids }, { s, at: 1, r: 'ws://x', ids: `${ids}a` }, { s, at: 1, r: 'ws://x', ids: many }, { s, at: 1, r: 'ws://x', ids: '' }, { s, r: 'ws://x', ids }]) {
    assert.equal(checkedRounds(bad), null);
  }
  // It goes with no words, which an Erevos from before shows nothing of, and never with them.
  const rounds = { s, took: 4 };
  assert.deepEqual(toCarry({ rounds }, false), { rounds });
  assert.deepEqual(toCarry({ rounds }, true), {});
  assert.deepEqual(carriedOf({ rounds, later: 1 }), { rounds });
  assert.deepEqual(carriedOf({ rounds: { s, took: -1 } }), {});
});

t('a file of an imported chat may have more chunks than a message’s, and only with its chat', async () => {
  const size = MAX_IMPORTED_FILE;
  const { chunk, count } = chunkPlan(size);
  assert.ok(count > MOST_CHUNKS && count <= HISTORY_CHUNKS);
  const big: FileRef = { name: 'film.mp4', mime: 'video/mp4', kind: 'file', size, id: toHex(randomBytes(16)), key: toHex(randomBytes(32)), chunk, count };
  assert.equal(isFileRef(big), false);
  assert.equal(isFileRef(big, HISTORY_CHUNKS), true);
  assert.equal(isFileRef({ ...big, count: HISTORY_CHUNKS + 1 }, HISTORY_CHUNKS), false);
  // Kept with an imported chat, as it opens again.
  const key = randomBytes(32);
  const archive = await Archive.open('space', 2, key);
  await archive.add([chat([[1, 'Bob', 'the film', '', [big]]])]);
  const reopened = await Archive.open('space', 2, key);
  assert.deepEqual(reopened.chat(reopened.chats()[0].id)!.messages[0][4], [big]);
  // Never a message's: an offer that large does not read, and the history keeps none.
  assert.equal(readOffer({ ...big, relay: 'ws://127.0.0.1:7879', ids: '00'.repeat(24 * count) }), null);
  const history = await History.open('space', 2, key);
  await history.add({ peer: `contact:${BOB}`, text: 'the film', mine: false, at: 1, tag: 'aabbccddeeff', file: big });
  const again = await History.open('space', 2, key);
  assert.equal(again.messages()[0].text, 'the film');
  assert.equal(again.messages()[0].file, undefined);
});

t('a share’s chunks are counted file after file', () => {
  const starts = startsOf([3, 1, 2]);
  assert.deepEqual(starts, [0, 3, 4, 6]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((g) => chunkAt(starts, g)), [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0], [2, 1]]);
  // Files the phone that keeps them cannot take are named by what they are, as ones that stayed behind.
  const pack = { share: toHex(randomBytes(16)), files: [readPackedFile({ name: 'a.jpg', mime: 'image/jpeg', kind: 'photo', size: 10, key: toHex(randomBytes(32)), chunk: 64 * 1024 })], chats: [{ id: 'aa', source: 'telegram' as const, title: 'Bob', me: 'Alice', skipped: 0, messages: [[1, 'Bob', 'hi', 'video', [0]] as PackedChat['messages'][number]] }] };
  assert.deepEqual(receivedChats(pack, ALICE, 'Alice', [null], 1)[0].messages, [[1, 'Bob', 'hi', 'video,photo']]);
});

// Through real relays, end-to-end encrypted with the real core.

let small = '';
let theirs = '';
// The room the small relay keeps for files, in MB: the shares below are several times as large.
const SMALL_MB = 3;

before(async () => {
  if (!ready) return;
  small = await startRelay(false, '', false, { EREVOS_RELAY_FILES_MB: String(SMALL_MB) });
  theirs = await startRelay();
});

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

// A phone: its chats, kept in its space under the key its imported chats and shares are kept
// with too, where its relay queue is, and what came to it, to read.
type Phone = { e2e: E2E; id: string; sender: string; key: Uint8Array; place: RoundsPlace; chats: SpaceChats; relay: string; inbox: Uint8Array[]; way: ShareWay };

async function phone(space: number, relay: string): Promise<Phone> {
  const key = randomBytes(32);
  const e2e = await E2E.open('space', space, key);
  const history = await History.open('space', space, key);
  const place: RoundsPlace = { holder: 'space', space, key };
  const chats: SpaceChats = { e2e, history, voiceParts: new VoiceAssembler(), pieces: place };
  return { e2e, id: e2e.identityHex(), sender: toHex(randomBytes(24)), key, place, chats, relay, inbox: [], way: null as unknown as ShareWay };
}

// `a` adds `b`, who takes the first packet and accepts; then each says to the other what a round
// says as lib/receiver.ts does, in a quiet message with no words.
async function meet(a: Phone, b: Phone): Promise<void> {
  await a.e2e.addContact({ senderHex: b.sender, key: toBase64Url(b.e2e.bundle) }, a.sender);
  assert.equal((await b.e2e.receive(a.e2e.pending()[0].first)).kind, 'message');
  await a.e2e.firstSent(b.id);
  await b.e2e.acceptRequest(a.id);
  for (const [from, to] of [[a, b], [b, a]] as const) {
    from.way = {
      chats: from.chats,
      own: { url: from.relay },
      send: async (identity, rounds) => {
        assert.equal(identity, to.id);
        to.inbox.push((await from.e2e.seal(identity, '', from.sender, { at: { relay: from.relay, relayKey: '' }, more: { rounds } })).packet);
      },
    };
  }
}

// What came to a phone, kept for its next round (lib/receiver.ts): nothing of it shows.
async function deliver(p: Phone): Promise<void> {
  for (const packet of p.inbox.splice(0)) {
    const came = message(await p.e2e.receive(packet));
    assert.equal(came.text, '');
    assert.ok(!came.file);
    assert.ok(came.more.rounds);
    await roundsCame(p.chats, came.identity, came.more.rounds);
  }
}

// A round on each phone, one after the other, what each said taken to the other, until `done`.
async function rounds(a: Phone, b: Phone, done: () => Promise<boolean>, each: (n: number) => Promise<void> = async () => undefined): Promise<number> {
  for (let n = 0; n < 60; n++) {
    for (const [p, q] of [[a, b], [b, a]] as const) {
      driveShares(p.way);
      await sharesSettled(p.place);
      await deliver(q);
    }
    await each(n);
    if (await done()) return n;
  }
  assert.fail('the shares did not end');
}

// Alice's chats imported with Bob, with a film and a document larger than the small relay keeps,
// and photos: about 3.5 times as much in all.
async function aliceChats(alice: Phone, bob: Phone) {
  const archive = await Archive.open('space', alice.place.space, alice.key);
  const film = randomBytes(7 * 1000 * 1000 + 13);
  const doc = randomBytes(3 * 1000 * 1000);
  const photos = [randomBytes(150_000), randomBytes(40_000), randomBytes(200_000)];
  const filmRef = await keepFile(bytesSource(film), { name: 'film.mp4', mime: 'video/mp4', kind: 'file' }, undefined, MAX_IMPORTED_FILE);
  const docRef = await keepFile(bytesSource(doc), { name: 'notes.pdf', mime: 'application/pdf', kind: 'file' }, undefined, MAX_IMPORTED_FILE);
  const photoRefs: FileRef[] = [];
  for (const [n, bytes] of photos.entries()) photoRefs.push(await keepFile(bytesSource(bytes), { name: `IMG_${n}.jpg`, mime: 'image/jpeg', kind: 'photo' }));
  const [telegram] = await archive.add([
    {
      source: 'telegram',
      title: 'Bob',
      me: 'Alice',
      added: 1,
      skipped: 0,
      contact: '',
      messages: [
        [1000, 'Alice', 'look', '', [photoRefs[0]]],
        [2000, 'Bob', 'nice', 'video'],
        [3000, 'Bob', 'the film and the notes', '', [filmRef, docRef, photoRefs[0]]],
        [3500, 'Alice', 'more', '', [photoRefs[1], photoRefs[2]]],
      ],
    },
    { source: 'viber', title: 'Bob', me: 'Me', added: 2, skipped: 0, contact: '', messages: [[4000, 'Bob', 'and on Viber', '']] },
  ]);
  for (const { id } of archive.chats()) await archive.link(id, bob.id, id === telegram);
  return { archive, film, doc, photos, total: film.length + doc.length + photos.reduce((sum, p) => sum + p.length, 0) };
}

// Alice shares her chats with Bob: the words go in one message, kept by Bob's Erevos as it comes
// (lib/receiver.ts), its files in rounds from then on. Returns the message's tag.
async function share(alice: Phone, bob: Phone, archive: Archive): Promise<string> {
  const ready = await readyShare(bob.id, sharable(archive, bob.id));
  const packed = await sendFile({ url: alice.relay }, bytesSource(ready.bytes), packMeta(ready.mark));
  const sealed = await alice.e2e.sealFile(bob.id, packed.offer, alice.sender);
  await beginShare(alice.way, ready, sealed.tag);
  const came = message(await bob.e2e.receive(sealed.packet));
  assert.ok(came.file?.history);
  await bob.chats.history.add({ peer: `contact:${alice.id}`, text: '', mine: false, at: Date.now(), tag: came.tag, file: offerRef(came.file) });
  await packCame(bob.chats, alice.id, came.tag);
  return sealed.tag;
}

// The chunks a share keeps on the relay now, by their ids there.
const onRelay = async (alice: Phone) => {
  const out = (await loadRounds(alice.place)).out[0]?.out ?? '';
  return out.match(/.{48}/g) ?? [];
};

async function goneFromRelay(relay: string, ids: string[]): Promise<boolean> {
  const session = await RelaySession.open({ url: relay });
  try {
    for (const id of ids) if (await getChunk(session, fromHex(id))) return false;
    return true;
  } finally {
    session.close();
  }
}

t(
  'imported chats of any size go in rounds through a relay that keeps a few MB, kept at once, filled in, going on after each phone starts again',
  async () => {
    forgetRounds();
    const alice = await phone(0, small);
    const bob = await phone(1, theirs);
    await meet(alice, bob);
    const { archive, film, doc, photos, total } = await aliceChats(alice, bob);
    assert.ok(total > 3 * SMALL_MB * 1024 * 1024, 'several times what the relay keeps');
    const tag = await share(alice, bob, archive);
    const line = `contact:${alice.id}|${tag}`;

    let restarted = false;
    let percents: number[] = [];
    await rounds(
      alice,
      bob,
      async () => (await loadRounds(alice.place)).out.length === 0 && (await loadRounds(bob.place)).in.length === 0,
      async (n) => {
        // Never more than a round's worth up there.
        assert.ok((await onRelay(alice)).length <= WINDOW_CHUNKS);
        const now = await sharingNow(alice.place, bob.id, tag);
        if (now) percents.push(now.percent);
        if (n === 0) {
          // Bob's Erevos kept the chats at once, sides swapped, their files named but not here yet.
          const kept = (await Archive.open('space', 1, bob.key)).linked(alice.id);
          assert.deepEqual(
            kept.map(({ sender, text, media, mine: own }) => [sender, text, media, own]),
            [
              ['Alice', 'look', '', false],
              ['Bob', 'nice', 'video', true],
              ['Bob', 'the film and the notes', '', true],
              ['Alice', 'more', '', false],
              ['Bob', 'and on Viber', '', true],
            ],
          );
          assert.equal(kept[2].files.length, 3);
          assert.equal(await readFile(kept[2].files[0]), null);
          assert.equal(kept[2].files[2].id, kept[0].files[0].id, 'one file named twice comes once');
          // The pack itself is not kept: its message says so, as one taken.
          assert.equal(bob.chats.history.messages().find((m) => m.tag === tag)?.file?.from, undefined);
        }
        if (n === 1) {
          assert.match((await shareLines(bob.place))[line], /^Files: \d of 5$/);
          assert.match((await shareLines(alice.place))[`contact:${bob.id}|${tag}`], /^Sharing, \d+%$/);
        }
        if (n === 2 && !restarted) {
          // Both phones start again: what a round keeps in memory is gone, what they keep goes on.
          restarted = true;
          assert.ok((await loadRounds(bob.place)).in[0].taken > 0);
          forgetRounds();
        }
      },
    );
    assert.ok(restarted);
    assert.ok(percents.length > 1 && percents.every((p, i) => p <= 100 && (i === 0 || p >= percents[i - 1])));
    assert.equal(await sharingNow(alice.place, bob.id, tag), null);

    // All of it came, each file whole and as it was.
    const kept = (await Archive.open('space', 1, bob.key)).linked(alice.id);
    assert.deepEqual(await readFile(kept[0].files[0]), photos[0]);
    assert.deepEqual(await readFile(kept[2].files[0]), film);
    assert.deepEqual(await readFile(kept[2].files[1]), doc);
    assert.deepEqual(await readFile(kept[3].files[0]), photos[1]);
    assert.deepEqual(await readFile(kept[3].files[1]), photos[2]);
    assert.deepEqual(await shareLines(bob.place), {});
    assert.deepEqual(await shareLines(alice.place), {});
    // Nothing left pending, nor on the relay: it has all its room again.
    assert.equal(await sweepPendingChunks(), 0);
    const session = await RelaySession.open({ url: small });
    try {
      const put: Uint8Array[] = [];
      for (let n = 0; n < SMALL_MB; n++) put.push(await putChunk(session, randomBytes(1024 * 1024)));
      for (const id of put) await deleteChunk(session, id);
    } finally {
      session.close();
    }
  },
  !ready || !coreReady,
);

t(
  'to an Erevos from before, which never says it keeps them, no file goes',
  async () => {
    forgetRounds();
    const alice = await phone(0, small);
    const bob = await phone(1, theirs);
    await meet(alice, bob);
    const { archive } = await aliceChats(alice, bob);
    const tag = await share(alice, bob, archive);
    for (let n = 0; n < 3; n++) {
      driveShares(alice.way);
      await sharesSettled(alice.place);
    }
    const [out] = (await loadRounds(alice.place)).out;
    assert.equal(out.ready, undefined);
    assert.equal(out.out, '');
    assert.equal(bob.inbox.length, 0);
    assert.deepEqual(await sharingNow(alice.place, bob.id, tag), { s: out.s, percent: 0 });
  },
  !ready || !coreReady,
);

// Rounds until some of a share came, then Alice's next: chunks wait on the relay, not taken yet.
async function someCame(alice: Phone, bob: Phone): Promise<string[]> {
  await rounds(alice, bob, async () => ((await loadRounds(bob.place)).in[0]?.taken ?? 0) > 0);
  driveShares(alice.way);
  await sharesSettled(alice.place);
  const up = await onRelay(alice);
  assert.ok(up.length > 0);
  assert.equal(await goneFromRelay(small, up), false);
  return up;
}

t(
  'a share stopped by the one who shares, or by the one it goes to, ends on both phones, its chunks off the relay',
  async () => {
    forgetRounds();
    const alice = await phone(0, small);
    const bob = await phone(1, theirs);
    await meet(alice, bob);
    const { archive } = await aliceChats(alice, bob);
    const bobArchive = () => Archive.open('space', 1, bob.key);
    const bobFiles = async () => (await bobArchive()).linked(alice.id).flatMap((m) => m.files.map((f) => f.id));

    // Alice stops hers once some of it came, and more waits on the relay.
    const tag = await share(alice, bob, archive);
    let up = await someCame(alice, bob);
    const ids = await bobFiles();
    const now = await sharingNow(alice.place, bob.id, tag);
    assert.ok(now);
    await stopShare(alice.way, now.s);
    assert.deepEqual((await loadRounds(alice.place)).out, []);
    assert.equal(await goneFromRelay(small, up), true);
    await deliver(bob);
    driveShares(bob.way);
    await sharesSettled(bob.place);
    // Bob's Erevos deletes what came of it: the chats, and their files.
    assert.deepEqual((await loadRounds(bob.place)).in, []);
    assert.deepEqual((await bobArchive()).linked(alice.id), []);
    assert.ok(ids.length > 0 && ids.every((id) => ![...blobs.keys()].some((name) => name.startsWith(`${PREFIX}${id}`))));

    // Bob deletes the chats of the next one: Alice's Erevos hears it, and takes its chunks off the relay.
    await share(alice, bob, archive);
    up = await someCame(alice, bob);
    const imported = await bobArchive();
    for (const { id } of imported.chats()) await imported.remove(id);
    await rounds(alice, bob, async () => (await loadRounds(alice.place)).out.length === 0 && (await loadRounds(bob.place)).in.length === 0);
    assert.equal(await goneFromRelay(small, up), true);
    assert.deepEqual((await bobArchive()).linked(alice.id), []);
  },
  !ready || !coreReady,
);

// A round on one phone, to its end.
async function drive(p: Phone): Promise<void> {
  driveShares(p.way);
  await sharesSettled(p.place);
}

// A clock the checks move on: Date.now, as Erevos reads it, until `stop`.
function fakeClock(): { now: number; stop(): void } {
  const real = Date.now;
  const clock = { now: real(), stop: () => void (Date.now = real) };
  Date.now = () => clock.now;
  return clock;
}

// The chunks of files written here from now on: counted, and while `fails`, refused as a full
// storage refuses (QuotaExceededError).
function chunkWrites(): { tried: number; kept: number; fails: boolean; stop(): void } {
  const set = blobs.set;
  const writes = { tried: 0, kept: 0, fails: false, stop: () => void (blobs.set = set) };
  blobs.set = function (name: string, bytes: Uint8Array) {
    if (name.startsWith(PREFIX)) {
      writes.tried++;
      if (writes.fails) throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
      writes.kept++;
    }
    return set.call(this, name, bytes);
  };
  return writes;
}

const DAY = 24 * 60 * 60_000;

t(
  'a phone with too little room takes no more and says so on both phones; one that cannot write fetches nothing again for nothing; both go on once there is room',
  async () => {
    forgetRounds();
    const alice = await phone(0, small);
    const bob = await phone(1, theirs);
    await meet(alice, bob);
    const { archive, film, doc, photos } = await aliceChats(alice, bob);
    const tag = await share(alice, bob, archive);
    const bobLine = `contact:${alice.id}|${tag}`;
    const aliceLine = `contact:${bob.id}|${tag}`;
    const clock = fakeClock();
    const writes = chunkWrites();
    try {
      const up = await someCame(alice, bob);
      await deliver(bob);
      const [was] = (await loadRounds(bob.place)).in;
      writes.tried = writes.kept = 0;

      // Less than 500 MB free: Bob's Erevos fetches nothing, keeps nothing, and says why, here and to Alice.
      room.free = 400 * 1000 * 1000;
      const asked = room.asked;
      await drive(bob);
      let [coming] = (await loadRounds(bob.place)).in;
      assert.equal(coming.taken, was.taken);
      assert.equal(coming.waits, 'room');
      assert.equal(writes.tried, 0);
      assert.equal(room.asked, asked + 1);
      assert.equal(await goneFromRelay(small, up), false, 'the chunks wait on the relay');
      assert.equal((await shareLines(bob.place))[bobLine], `Files: ${coming.whole} of 5 · waiting for free space on this phone`);
      await deliver(alice);
      await drive(alice);
      assert.match((await shareLines(alice.place))[aliceLine], /^Sharing, \d+% · waiting for free space on their phone$/);
      // While the wait lasts the room is not even looked at; after it, once, and the next wait is longer.
      for (let n = 0; n < 3; n++) await drive(bob);
      assert.equal(room.asked, asked + 1);
      clock.now += 61_000;
      await drive(bob);
      assert.equal(room.asked, asked + 2);
      clock.now += 61_000;
      await drive(bob);
      assert.equal(room.asked, asked + 2, 'two minutes, this time');

      // Room said to be there, but a chunk cannot be written: fetched once, then not again until the wait is over.
      room.free = 50 * 1000 * 1000 * 1000;
      writes.fails = true;
      clock.now += 61_000;
      await drive(bob);
      assert.equal(writes.tried, 1);
      for (let n = 0; n < 5; n++) await drive(bob);
      assert.equal(writes.tried, 1, 'not fetched again and again');
      [coming] = (await loadRounds(bob.place)).in;
      assert.equal(coming.taken, was.taken);
      assert.equal(coming.waits, 'room');
      assert.equal(await goneFromRelay(small, up), false, 'the chunk stays on the relay');
      clock.now += 4 * 60_000 + 1000;
      await drive(bob);
      assert.equal(writes.tried, 2);
      assert.match((await shareLines(bob.place))[bobLine], /waiting for free space on this phone$/);

      // Room again: after the wait it goes on by itself, to the end, on both phones.
      writes.fails = false;
      clock.now += 8 * 60_000 + 1000;
      await drive(bob);
      assert.ok((await loadRounds(bob.place)).in[0].taken > was.taken);
      assert.equal((await loadRounds(bob.place)).in[0].waits, undefined);
      await deliver(alice);
      await drive(alice);
      assert.match((await shareLines(alice.place))[aliceLine] ?? '', /^(Sharing, \d+%)?$/);
      await rounds(alice, bob, async () => (await loadRounds(alice.place)).out.length === 0 && (await loadRounds(bob.place)).in.length === 0);
      const kept = (await Archive.open('space', 1, bob.key)).linked(alice.id);
      assert.deepEqual(await readFile(kept[0].files[0]), photos[0]);
      assert.deepEqual(await readFile(kept[2].files[0]), film);
      assert.deepEqual(await readFile(kept[2].files[1]), doc);
      assert.deepEqual(await shareLines(bob.place), {});
      assert.deepEqual(await shareLines(alice.place), {});
    } finally {
      writes.stop();
      clock.stop();
      room.free = null;
    }
  },
  !ready || !coreReady,
);

t(
  'a share its contact’s Erevos does not take waits, its line saying why a day after its message came, and ends once the relay no longer keeps its words; a later one that keeps it after all keeps the words, hears no files come, and names them as ones that stayed behind',
  async () => {
    forgetRounds();
    const alice = await phone(0, small);
    const bob = await phone(1, theirs);
    await meet(alice, bob);
    const { archive } = await aliceChats(alice, bob);
    const clock = fakeClock();
    try {
      const began = clock.now;
      const tag = await share(alice, bob, archive);
      const peer = `contact:${bob.id}`;
      await alice.chats.history.add({ peer, text: '', mine: true, at: clock.now, tag, mark: 0 });
      const [out] = (await loadRounds(alice.place)).out;
      const listHere = () => blobs.has(`${PREFIX}${out.list.id}-0`);
      assert.ok(listHere());
      // Not said to have come to their phone: it waits, a while.
      clock.now += 5 * DAY;
      await drive(alice);
      assert.deepEqual(await sharingNow(alice.place, bob.id, tag), { s: out.s, percent: 0 });
      // Their phone says it came, as an Erevos from before does too, and nothing more: a day on, its
      // line says what it waits for; it goes on, as a later Erevos may keep it only later.
      await alice.chats.history.mark(peer, true, 1, clock.now, [tag]);
      await drive(alice);
      clock.now += DAY - 60_000;
      await drive(alice);
      assert.equal((await shareLines(alice.place))[`${peer}|${tag}`], 'Sharing, 0%');
      clock.now += 2 * 60_000;
      await drive(alice);
      assert.equal((await shareLines(alice.place))[`${peer}|${tag}`], 'Sharing, 0% · waiting for their Erevos to take it; an older one takes only the messages');
      clock.now = began + 15 * DAY - 60_000;
      await drive(alice);
      assert.deepEqual(await sharingNow(alice.place, bob.id, tag), { s: out.s, percent: 0 });
      assert.ok(listHere());
      // The relay no longer keeps the words: it ends, its list deleted, its line saying so.
      clock.now += 2 * 60_000;
      await drive(alice);
      assert.equal(await sharingNow(alice.place, bob.id, tag), null);
      assert.deepEqual((await loadRounds(alice.place)).out, []);
      assert.equal(listHere(), false);
      const only = { [`${peer}|${tag}`]: 'Their Erevos did not take the files; only the messages went' };
      assert.deepEqual(await shareLines(alice.place), only);
      assert.equal(bob.inbox.length, 0);

      // Bob's was a later Erevos that kept them only now: it keeps the words and says so, hears
      // that no files come, and ends its share with its chats kept, their files named as ones that
      // stayed behind; Alice's line still says so.
      await drive(bob);
      assert.equal((await loadRounds(bob.place)).in.length, 1);
      await deliver(alice);
      await drive(alice);
      assert.deepEqual(await shareLines(alice.place), only);
      await deliver(bob);
      await drive(bob);
      assert.deepEqual((await loadRounds(bob.place)).in, []);
      const kept = (await Archive.open('space', 1, bob.key)).linked(alice.id);
      assert.equal(kept.length, 5);
      assert.ok(kept.every((m) => m.files.length === 0));
      assert.deepEqual(
        kept.map((m) => [m.text, m.media]),
        [
          ['look', 'photo'],
          ['nice', 'video'],
          ['the film and the notes', 'file,file,photo'],
          ['more', 'photo,photo'],
          ['and on Viber', ''],
        ],
      );
      assert.deepEqual(await shareLines(bob.place), {});

      // Never said to have come: it ends once the relay no longer keeps the message's file, with nothing to say.
      const again = await share(alice, bob, archive);
      clock.now += 15 * DAY - 60_000;
      await drive(alice);
      assert.ok(await sharingNow(alice.place, bob.id, again));
      clock.now += 2 * 60_000;
      await drive(alice);
      assert.equal(await sharingNow(alice.place, bob.id, again), null);
      assert.deepEqual(await shareLines(alice.place), only);
    } finally {
      clock.stop();
    }
  },
  !ready || !coreReady,
);

t(
  'a share kept days after its message came, as hidden chats keep theirs only once their chat screen opens, goes on to the end',
  async () => {
    forgetRounds();
    const alice = await phone(0, small);
    const bob = await phone(1, theirs);
    await meet(alice, bob);
    const { archive, film, photos } = await aliceChats(alice, bob);
    const clock = fakeClock();
    try {
      const tag = await share(alice, bob, archive);
      const peer = `contact:${bob.id}`;
      await alice.chats.history.add({ peer, text: '', mine: true, at: clock.now, tag, mark: 0 });
      await alice.chats.history.mark(peer, true, 1, clock.now, [tag]);
      await drive(alice);
      clock.now += 4 * DAY;
      await drive(alice);
      assert.equal((await shareLines(alice.place))[`${peer}|${tag}`], 'Sharing, 0% · waiting for their Erevos to take it; an older one takes only the messages');
      // Bob's Erevos keeps them now, and all their files come.
      await rounds(
        alice,
        bob,
        async () => (await loadRounds(alice.place)).out.length === 0 && (await loadRounds(bob.place)).in.length === 0,
        async () => void (clock.now += 61_000),
      );
      const kept = (await Archive.open('space', 1, bob.key)).linked(alice.id);
      assert.deepEqual(await readFile(kept[0].files[0]), photos[0]);
      assert.deepEqual(await readFile(kept[2].files[0]), film);
      assert.deepEqual(await shareLines(alice.place), {});
    } finally {
      clock.stop();
    }
  },
  !ready || !coreReady,
);

t(
  'from a place lent on a contact’s relay, with Tor off, the files wait for Tor and say so, and go on by themselves once they may',
  async () => {
    forgetRounds();
    const alice = await phone(0, small);
    const bob = await phone(1, theirs);
    await meet(alice, bob);
    const { archive, film, photos } = await aliceChats(alice, bob);
    const tag = await share(alice, bob, archive);
    const line = `contact:${alice.id}|${tag}`;
    // Bob's Erevos keeps the chats and says so; then its place is one lent on a contact's relay.
    await drive(bob);
    const own = bob.way.own;
    bob.way = { ...bob.way, own: { url: bob.relay, token: `lent.${'ab'.repeat(48)}` } };
    await rounds(alice, bob, async () => (await loadRounds(bob.place)).in[0]?.waits === 'tor');
    for (let n = 0; n < 3; n++) {
      await drive(alice);
      await deliver(bob);
      await drive(bob);
      await deliver(alice);
    }
    const [coming] = (await loadRounds(bob.place)).in;
    assert.equal(coming.taken, 0);
    assert.equal(coming.waits, 'tor');
    assert.equal((await shareLines(bob.place))[line], 'Files: 0 of 5 · waiting for Tor (Everything)');
    const up = await onRelay(alice);
    assert.ok(up.length > 0);
    assert.equal(await goneFromRelay(small, up), false);
    // With Everything through Tor it waits for it no longer, and fetches through it (none here: nothing comes yet).
    setThroughTor('all');
    try {
      await drive(bob);
    } finally {
      setThroughTor('off');
    }
    assert.equal((await loadRounds(bob.place)).in[0].waits, undefined);
    assert.equal((await loadRounds(bob.place)).in[0].taken, 0);
    // Once it may, here as the place has a relay of its own now, it goes on by itself, to the end.
    bob.way = { ...bob.way, own };
    await rounds(alice, bob, async () => (await loadRounds(alice.place)).out.length === 0 && (await loadRounds(bob.place)).in.length === 0);
    const kept = (await Archive.open('space', 1, bob.key)).linked(alice.id);
    assert.deepEqual(await readFile(kept[2].files[0]), film);
    assert.deepEqual(await readFile(kept[3].files[1]), photos[2]);
    assert.deepEqual(await shareLines(bob.place), {});
  },
  !ready || !coreReady,
);
