// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The pieces of photos that come through Nostr (lib/nostr-pieces.ts), kept by the place they came
// for, in its own encrypted storage (lock/nostr-pieces-data.ts): a space's and each hidden place's
// apart, nothing of them outside its key, neither their ids nor how many, their pages alike to the
// history's; a piece no place can take is held in memory only, a few at most, until a place whose
// photo names it takes it; the limits hold in each place; what an Erevos from before kept, all
// places' together, goes into the first place whose photo names it, or is deleted once four days
// old; and backups hold them with their pages. Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encryptBytes, randomBytes, setHardCost, setPbkdf2, webCryptoPbkdf2 } from '../lib/crypto';
import { HELD_MOST, PIECES_LAST, dropPieces, heldPieces, keepPiece, pieceId, piecesCame, readPieces, sweepPieces, wrapPiece, type PiecePlace } from '../lib/nostr-pieces';
import { NOSTR_PIECE } from '../lock/attachment-files';
import { backupKey, makeBackup, openBackup, restoreBackup } from '../lock/backup';
import { FILE, keepPiecesFile, loadPiecesData } from '../lock/nostr-pieces-data';
import { PAGE, PAGE_PREFIX } from '../lock/sealed-file';
import { blobs, files } from './files-memory';
import { store } from './secure-memory';

setHardCost({ m: 64, t: 1 });
setPbkdf2(webCryptoPbkdf2()!);

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    store.clear();
    files.clear();
    blobs.clear();
    await fn();
  });

const piece = () => randomBytes(NOSTR_PIECE);
// A phone with no photos, files or voice messages: a backup of it has no parts.
const noParts = async (): Promise<string> => assert.fail('no parts');
const place = (holder: PiecePlace['holder'], space: number): PiecePlace => ({ holder, space, key: randomBytes(32) });

// Whether `needle` lies anywhere in what the app keeps, outside the keystore.
function anywhere(needle: Uint8Array | string): boolean {
  const text = typeof needle === 'string' ? needle : null;
  for (const value of files.values()) if (text !== null && value.includes(text)) return true;
  for (const bytes of blobs.values()) {
    if (text !== null && Buffer.from(bytes).includes(Buffer.from(text))) return true;
    if (typeof needle !== 'string') {
      const head = Buffer.from(needle.slice(0, 32));
      if (Buffer.from(bytes).includes(head)) return true;
    }
  }
  return false;
}

t('a piece is kept by the place it came for, sealed: nothing outside its key says it is there, nor whose it is', async () => {
  const space = place('space', 0);
  const hidden = place('hidden', 0);
  const other = place('hidden2', 0);
  await keepPiecesFile(space.space, space.key);
  const fileBefore = files.get(FILE);
  const sealed = piece();
  const id = pieceId(sealed);
  await keepPiece(hidden, wrapPiece(sealed));
  assert.deepEqual(await piecesCame(hidden, id), [true]);
  assert.deepEqual(await piecesCame(space, id), [false], 'the space does not see its hidden place’s piece');
  assert.deepEqual(await piecesCame(other, id), [false], 'nor does another hidden place');
  assert.deepEqual(await readPieces(space, id), [null]);
  assert.deepEqual(await readPieces(hidden, id), [sealed]);
  assert.equal(heldPieces(), 0, 'none in memory');

  // Outside: the one file every place's value lies in, the same size as before, and two pages.
  assert.deepEqual([...files.keys()].sort(), [FILE]);
  assert.equal(files.get(FILE)!.length, fileBefore!.length, 'the file is no larger for it');
  const pages = [...blobs.keys()];
  assert.equal(pages.length, 2);
  assert.ok(pages.every((name) => name.startsWith(PAGE_PREFIX)));
  assert.ok([...blobs.values()].every((bytes) => bytes.length === encryptBytes(randomBytes(32), new Uint8Array(PAGE)).length), 'each the size of a history’s page');
  assert.ok(!anywhere(id), 'its id shows nowhere');
  assert.ok(!anywhere(sealed), 'nor the piece as it came');
  assert.ok(![...blobs.keys(), ...files.keys()].some((name) => name.includes(id) || name.startsWith('erevos-piece')), 'nor in a name');

  // Kept once; once taken, gone with its pages.
  await keepPiece(hidden, wrapPiece(sealed));
  assert.equal(blobs.size, 2);
  await dropPieces(hidden, id);
  assert.deepEqual(await piecesCame(hidden, id), [false]);
  assert.equal(blobs.size, 0);
});

t('one of another size is no piece of a photo, and is not kept; a page changed reads as none', async () => {
  const space = place('space', 0);
  await keepPiece(space, wrapPiece(randomBytes(NOSTR_PIECE - 1)));
  await keepPiece(null, wrapPiece(randomBytes(NOSTR_PIECE + 1)));
  assert.equal(blobs.size, 0);
  assert.equal(heldPieces(), 0);
  const sealed = piece();
  await keepPiece(space, wrapPiece(sealed));
  const [name] = [...blobs.keys()];
  blobs.set(name, encryptBytes(space.key, new Uint8Array(PAGE)));
  assert.deepEqual(await readPieces(space, pieceId(sealed)), [null]);
});

t('a piece no place can take is held in memory only, a few at most, and kept by the place whose photo names it', async () => {
  const space = place('space', 0);
  const hidden = place('hidden1', 0);
  const sealed = piece();
  const id = pieceId(sealed);
  await keepPiece(null, wrapPiece(sealed));
  assert.equal(heldPieces(), 1);
  assert.equal(files.size + blobs.size, 0, 'nothing written');
  assert.deepEqual(await piecesCame(null, id), [true]);
  // A place whose photo does not name it takes nothing.
  assert.deepEqual(await piecesCame(space, pieceId(piece())), [false]);
  assert.equal(heldPieces(), 1);
  // The one whose photo names it keeps it, and it is no longer in memory.
  assert.deepEqual(await piecesCame(hidden, id), [true]);
  assert.equal(heldPieces(), 0);
  assert.deepEqual(await readPieces(hidden, id), [sealed]);
  assert.deepEqual(await piecesCame(space, id), [false], 'nor then for another');

  for (let n = 0; n < HELD_MOST + 10; n++) await keepPiece(null, wrapPiece(piece()));
  assert.equal(heldPieces(), HELD_MOST, 'bounded');
  // Too old: let go of with the next one held.
  await keepPiece(null, wrapPiece(piece()), Date.now() + PIECES_LAST);
  assert.equal(heldPieces(), 1);
});

t('each place keeps four days at most, and the oldest go first past its most', async () => {
  const space = place('space', 0);
  const hidden = place('hidden', 0);
  const now = Date.now();
  const old = piece();
  await keepPiece(space, wrapPiece(old), now - PIECES_LAST - 1);
  const fresh = piece();
  await keepPiece(space, wrapPiece(fresh), now);
  await keepPiece(hidden, wrapPiece(piece()), now - PIECES_LAST - 1);
  await sweepPieces(space, now);
  assert.deepEqual(await piecesCame(space, pieceId(old) + pieceId(fresh)), [false, true]);
  assert.equal((await loadPiecesData('hidden', 0, hidden.key)).pieces.length, 1, 'another place’s are its own to drop');
  await sweepPieces(hidden, now);
  assert.equal((await loadPiecesData('hidden', 0, hidden.key)).pieces.length, 0);
  assert.equal(blobs.size, 2, 'their pages go with them');
});

t('a place keeps a thousand pieces at most, the oldest dropped first', async () => {
  const space = place('space', 0);
  const now = Date.now();
  const first = piece();
  await keepPiece(space, wrapPiece(first), now - 1000);
  for (let n = 0; n < 1000; n++) await keepPiece(space, wrapPiece(piece()), now);
  const kept = (await loadPiecesData('space', 0, space.key)).pieces;
  assert.equal(kept.length, 1000);
  assert.ok(!kept.some(([id]) => id === pieceId(first)));
  const named = new Set(kept.flatMap(([, , pages]) => [pages.slice(0, 24), pages.slice(24)]));
  assert.ok([...named].every((page) => blobs.has(PAGE_PREFIX + page)), 'every piece kept has its pages');
  // The rest are the pages of the place's value itself, which names them.
  assert.ok(blobs.size - named.size < 20, 'the dropped one’s pages are gone');
});

t('what an Erevos from before kept goes into the first place whose photo names it, or is deleted once four days old', async () => {
  const space = place('space', 0);
  const now = Date.now();
  const kept = piece();
  const stale = piece();
  const id = pieceId(kept);
  files.set('erevos-pieces-index', JSON.stringify([
    [id, now - 1000],
    [pieceId(stale), now - PIECES_LAST - 1],
  ]));
  blobs.set(`erevos-piece-${id}`, kept);
  blobs.set(`erevos-piece-${pieceId(stale)}`, stale);
  // Still read as it was, with no place.
  assert.deepEqual(await piecesCame(null, id), [true]);
  assert.deepEqual(await readPieces(null, id), [kept]);

  // A space whose photo names it keeps it, in its own storage, and it is gone from before's.
  assert.deepEqual(await piecesCame(space, id), [true]);
  assert.ok(!blobs.has(`erevos-piece-${id}`));
  assert.deepEqual(JSON.parse(files.get('erevos-pieces-index')!), [[pieceId(stale), now - PIECES_LAST - 1]]);
  assert.deepEqual(await readPieces(space, id), [kept]);

  // The stale one goes as a place opens; a file its index did not name too; then the index.
  blobs.set(`erevos-piece-${'ab'.repeat(24)}`, piece());
  await sweepPieces(space, now);
  assert.ok(![...files.keys(), ...blobs.keys()].some((name) => name.startsWith('erevos-piece')));
});

t('a backup holds each place’s pieces with their pages, and restored they are there as they were', async () => {
  const hidden = place('hidden', 0);
  const sealed = piece();
  await keepPiece(hidden, wrapPiece(sealed));
  store.set('erevos.space-keys', '[]');
  const backup = await makeBackup(await backupKey('backup-pass', randomBytes(16), 1000), { parts: noParts });
  const pages = [...blobs.keys()];
  files.clear();
  blobs.clear();
  await restoreBackup(await openBackup(backup, 'backup-pass'));
  assert.ok(files.has(FILE));
  assert.deepEqual([...blobs.keys()].sort(), pages.sort());
  assert.deepEqual(await readPieces(hidden, pieceId(sealed)), [sealed]);
});
