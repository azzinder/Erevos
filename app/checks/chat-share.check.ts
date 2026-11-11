// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Imported chats shared with the contact they go on with (lib/chat-share.ts): the mark their file
// carries, and what an Erevos from before makes of it; the chats packed and read back; the sides
// swapped; a copy shared again in place of the one before (lock/archive.ts); and, with the real
// core and real relays (crates/erevos-relay), the chats with their files going from one phone to
// the other, end-to-end encrypted, kept there at once. Those are skipped with a note when the core
// or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

import { blobs, files } from './files-memory';
import { ready, relayNote, startRelay } from './real-relay';
import { bytesSource, chunkPlan, FileGoneError, keepFile, offerRef, readFile, readOffer, sendFile, takeFile, type FileOffer } from '../lib/attachments';
import {
  askToShare,
  keepShared,
  markOf,
  packBytes,
  packChats,
  packMeta,
  readPack,
  receivedChats,
  sharable,
  sharedLine,
  shareChats,
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
import { Archive, replaceShared, type ArchivedChat } from '../lock/archive';
import { cleanFileName, cleanMime, isFileMeta, isFileRef, PREFIX, type FileRef } from '../lock/attachment-files';

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

t('chats are packed with where their files wait, read back as they went, and anything else is left out', () => {
  const [photo, gone] = [refOf(2000), refOf(3000, 'file')];
  const sent = offerOf(2000);
  const chats = [chat([[1000, 'Alice', 'hi', ''], [2000, 'Bob', '', 'video', [photo, gone]], [0, 'Bob', 'no time', '']])];
  const packed = packChats(chats, new Map([[photo.id, sent]]));
  // The one put on the relay goes as where it is; the other, no longer here, is named as one that stayed behind.
  assert.deepEqual(packed[0].messages[1], [2000, 'Bob', '', 'video,file', [sent]]);
  assert.deepEqual(packed[0].messages[0], [1000, 'Alice', 'hi', '']);
  const bytes = packBytes(packed);
  assert.deepEqual(readPack(bytes), packed);
  assert.equal(readPack(bytes)[0].id, chats[0].id);
  // Not a pack, or not one that reads: nothing.
  assert.deepEqual(readPack(utf8Encode('{}')), []);
  assert.deepEqual(readPack(utf8Encode('not json')), []);
  assert.deepEqual(readPack(utf8Encode(JSON.stringify({ kind: 'something', v: 1, chats: packed }))), []);
  // What a later Erevos adds is left out; a chat or message that does not read is.
  const later = JSON.parse(utf8Decode(bytes)) as { v: number; chats: Record<string, unknown>[] };
  later.v = 2;
  later.chats[0].more = 'later';
  later.chats.push({ id: 'zz', source: 'telegram', messages: [] }, { id: 'ab', source: 'icq', messages: [] });
  (later.chats[0].messages as unknown[]).push(['when', 'x', 'y', ''], [5, 'x', 'y']);
  assert.deepEqual(readPack(utf8Encode(JSON.stringify(later))), packed);
  // A file may be as large as an imported one, never larger, and only on a relay's file store.
  const big = offerOf(MAX_IMPORTED_FILE, { kind: 'file', name: 'film.mp4', mime: 'video/mp4' });
  const tooBig = offerOf(MAX_IMPORTED_FILE + 1, { kind: 'file', name: 'film.mp4', mime: 'video/mp4' });
  const nostr = { ...offerOf(2000), relay: 'nostr', via: 'nostr' };
  const files = JSON.parse(JSON.stringify({ kind: 'erevos-shared-chats', v: 1, chats: [{ ...packed[0], messages: [[1, 'Bob', '', '', [big, tooBig, nostr, 'x']]] }] }));
  assert.deepEqual(readPack(utf8Encode(JSON.stringify(files)))[0].messages, [[1, 'Bob', '', 'file,file,file', [big]]]);
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
  const kept = receivedChats([two, group, nobody], ALICE, 'Alice K.', new Map(), 7);
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

// Through real relays, end-to-end encrypted with the real core.

let mine = '';
let theirs = '';

before(async () => {
  if (!ready) return;
  mine = await startRelay();
  theirs = await startRelay();
});

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

t(
  'imported chats with their files go to the contact alone through the relays, and are kept there at once, sides swapped, once',
  async () => {
    // Two phones, each the other's contact.
    const alice = await E2E.open('space', 0, randomBytes(32));
    const bob = await E2E.open('space', 1, randomBytes(32));
    const [aliceFrom, bobFrom] = [toHex(randomBytes(24)), toHex(randomBytes(24))];
    const { identity: toBob } = await alice.addContact({ senderHex: bobFrom, key: toBase64Url(bob.bundle) }, aliceFrom);
    const first = message(await bob.receive(alice.pending()[0].first));
    const fromAlice = first.identity;
    await alice.firstSent(toBob);

    // Alice's chats imported with Bob, one with a photo and a file larger than a message's chunk.
    const aliceArchive = await Archive.open('space', 0, randomBytes(32));
    const photo = randomBytes(1500);
    const pdf = randomBytes(2 * 1024 * 1024 + 77);
    const photoRef = await keepFile(bytesSource(photo), { name: 'IMG_1.jpg', mime: 'image/jpeg', kind: 'photo' });
    const pdfRef = await keepFile(bytesSource(pdf), { name: 'notes.pdf', mime: 'application/pdf', kind: 'file' }, undefined, MAX_IMPORTED_FILE);
    const [telegram] = await aliceArchive.add([
      {
        source: 'telegram',
        title: 'Bob',
        me: 'Alice',
        added: 1,
        skipped: 0,
        contact: '',
        messages: [
          [1000, 'Alice', 'look', '', [photoRef]],
          [2000, 'Bob', 'nice', 'video'],
          [3000, 'Bob', 'the notes', '', [pdfRef, photoRef]],
        ],
      },
      { source: 'viber', title: 'Bob', me: 'Me', added: 2, skipped: 0, contact: '', messages: [[4000, 'Bob', 'and on Viber', '']] },
    ]);
    for (const { id } of aliceArchive.chats()) await aliceArchive.link(id, toBob, id === telegram);
    const chats = sharable(aliceArchive, toBob);
    assert.equal(chats.length, 2);

    // Each file goes as it is kept here, once, and the chats in one .json.
    const percents: number[] = [];
    const shared = await shareChats({ url: mine }, chats, (percent) => percents.push(percent));
    assert.equal(shared.offers.length, 2);
    assert.equal(percents.at(-1), 100);
    assert.deepEqual(shared.mark, { from: ['telegram', 'viber'], count: 4 });
    const packed = await sendFile({ url: mine }, bytesSource(shared.bytes), packMeta(shared.mark));
    const sealed = await alice.sealFile(toBob, packed.offer, aliceFrom);
    const came = message(await bob.receive(sealed.packet));
    assert.equal(came.identity, fromAlice);
    assert.deepEqual(came.file?.history, { from: ['telegram', 'viber'], count: 4 });
    assert.equal(came.file?.name, 'Chat from Telegram and Viber.json');

    // Bob's Erevos takes it through his relay and keeps it, with the files, at once.
    const bobArchive = await Archive.open('space', 1, randomBytes(32));
    const keep = async (offer: FileOffer) => {
      const pack = await takeFile({ url: theirs }, offerRef(offer));
      return keepShared({ url: theirs }, (await readFile(pack))!, bobArchive, { by: fromAlice, name: 'Alice' });
    };
    assert.equal((await keep(came.file!)).length, 2);
    const shown = bobArchive.linked(fromAlice);
    assert.deepEqual(
      shown.map(({ sender, text, media, mine: own, source }) => [sender, text, media, own, source]),
      [
        ['Alice', 'look', '', false, 'telegram'],
        ['Bob', 'nice', 'video', true, 'telegram'],
        ['Bob', 'the notes', '', true, 'telegram'],
        ['Bob', 'and on Viber', '', true, 'viber'],
      ],
    );
    assert.deepEqual(await readFile(shown[0].files[0]), photo);
    assert.deepEqual(await readFile(shown[2].files[0]), pdf);
    assert.equal(shown[2].files[1].id, shown[0].files[0].id, 'one file named twice is taken once');
    assert.deepEqual(
      bobArchive.chats().map(({ title, me, contact, inChat }) => ({ title, me, contact, inChat })),
      [
        { title: 'Alice', me: 'Bob', contact: fromAlice, inChat: true },
        { title: 'Alice', me: 'Bob', contact: fromAlice, inChat: true },
      ],
    );
    // Nothing left pending, and the files are off the relay once kept.
    assert.equal(await sweepPendingChunks(), 0);
    await assert.rejects(takeFile({ url: theirs }, offerRef(shared.offers[0])), FileGoneError);

    // Shared again, it takes the place of the copy kept before.
    const again = await shareChats({ url: mine }, sharable(aliceArchive, toBob));
    const repacked = await sendFile({ url: mine }, bytesSource(again.bytes), packMeta(again.mark));
    const resealed = await alice.sealFile(toBob, repacked.offer, aliceFrom);
    await keep(message(await bob.receive(resealed.packet)).file!);
    assert.equal(bobArchive.chats().length, 2);
    assert.equal(bobArchive.linked(fromAlice).length, 4);
    assert.deepEqual(await readFile(bobArchive.linked(fromAlice)[2].files[0]), pdf);
    // The first copy's files are gone from the phone.
    assert.equal(blobs.has(`${PREFIX}${shown[2].files[0].id}-0`), false);
  },
  !ready || !coreReady,
);
