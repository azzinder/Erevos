// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A photo to see once (lib/see-once.ts): what it says of itself, how it is read, and how each phone
// lets go of it, theirs once seen and ours once it reached them.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { offerRef, readOffer, type FileOffer } from '../lib/attachments';
import { randomBytes } from '../lib/crypto';
import { canForward } from '../lib/forward';
import { chatMedia } from '../lib/chat-media';
import { isFileMeta, PREFIX, type FileRef } from '../lock/attachment-files';
import { History } from '../lock/history';
import { blobs } from './files-memory';

const OFFER: FileOffer = { name: 'photo.jpg', mime: 'image/jpeg', kind: 'photo', size: 3000, w: 4, h: 3, hidden: true, once: true, relay: 'ws://127.0.0.1:7879', ids: 'ab'.repeat(24), key: 'cd'.repeat(32), chunk: 64 * 1024 };

test('a photo to see once is a hidden photo that says so, and nothing else is', () => {
  assert.deepEqual(readOffer(JSON.parse(JSON.stringify(OFFER))), OFFER);
  // Not hidden, not a photo, or a sticker: the mark is left out, never trusted alone.
  const { hidden: _h, ...bare } = OFFER;
  assert.equal(readOffer(bare)?.once, undefined);
  assert.equal(readOffer({ ...OFFER, once: 'yes' })?.once, undefined);
  assert.equal(readOffer({ ...OFFER, kind: 'file' })?.once, undefined);
  assert.equal(isFileMeta({ name: 'a.jpg', mime: 'image/jpeg', kind: 'photo', size: 1, once: true }), false);
  assert.equal(isFileMeta({ name: 'a.jpg', mime: 'image/jpeg', kind: 'photo', size: 1, hidden: true, once: true }), true);
  assert.equal(offerRef(OFFER).once, true);
});

const photo = (): FileRef => ({ name: 'p.jpg', mime: 'image/jpeg', kind: 'photo', size: 5, hidden: true, once: true, id: toHex16(), key: 'cd'.repeat(32), chunk: 64 * 1024, count: 1 });
const toHex16 = () => Array.from(randomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');

test('theirs goes from this phone once seen, and the message says it was', async () => {
  const history = await History.open('space', 0, randomBytes(32));
  const file = photo();
  blobs.set(`${PREFIX}${file.id}-0`, Uint8Array.of(1));
  await history.add({ peer: 'contact:x', text: '', mine: false, at: 1, tag: 'aaaaaaaaaaaa', file });
  const [came] = history.messages();
  assert.equal(canForward(came), false, 'not forwarded');
  assert.deepEqual(chatMedia([came]), [], 'not among the chat’s photos');
  assert.equal(await history.seeOnce('contact:x', 'aaaaaaaaaaaa', 50), true);
  const [seen] = history.messages();
  assert.equal(seen.file, undefined);
  assert.equal(seen.seenOnce, 50);
  assert.ok(!blobs.has(`${PREFIX}${file.id}-0`), 'its chunks are deleted');
  assert.equal(await history.seeOnce('contact:x', 'bbbbbbbbbbbb', 50), false);
});

test('ours goes from this phone once it reached them, not before', async () => {
  const key = randomBytes(32);
  const history = await History.open('space', 0, key);
  const file = photo();
  blobs.set(`${PREFIX}${file.id}-0`, Uint8Array.of(1));
  await history.add({ peer: 'contact:x', text: '', mine: true, at: 1, tag: 'cccccccccccc', file });
  await history.mark('contact:x', true, 0, 10, ['cccccccccccc']);
  assert.ok(history.messages()[0].file, 'still here while only sent');
  await history.mark('contact:x', true, 1, 20, ['cccccccccccc']);
  const [went] = (await History.open('space', 0, key)).messages();
  assert.equal(went.file, undefined);
  assert.equal(went.seenOnce, 20);
  assert.ok(!blobs.has(`${PREFIX}${file.id}-0`));
  // A plain hidden photo of ours stays.
  const plain = { ...photo(), once: undefined };
  delete plain.once;
  await history.add({ peer: 'contact:x', text: '', mine: true, at: 2, tag: 'dddddddddddd', file: plain });
  await history.mark('contact:x', true, 2, 30, ['dddddddddddd']);
  assert.deepEqual(history.messages().find((m) => m.tag === 'dddddddddddd')?.file, plain);
});
