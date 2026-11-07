// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The computer app's player of the Collection's files (desktop/play.js): it answers the page's
// <audio> and <video> by range, opening only the chunks the range needs, from chunks as the app
// writes them (lib/attachments.ts), and forgets a file's key when told.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { bytesSource } from '../lib/attachments';
import { randomBytes } from '../lib/crypto';
import { addToCollection, type CollectionPlace } from '../lock/collection-data';
import { setCurrentSpace } from '../lock/keys';
import { blobs, files } from './files-memory';

type Served = { status: number; headers: Headers; arrayBuffer: () => Promise<ArrayBuffer> };
type PlaysType = {
  add: (file: unknown) => string | null;
  forget: (token: string) => void;
  clear: () => void;
  serve: (request: Request, token: string) => Served;
};
const require = createRequire(import.meta.url);
const { Plays, rangeOf } = require('../../desktop/play.js') as {
  Plays: new (folder: string) => PlaysType;
  rangeOf: (header: string | null, size: number) => [number, number] | null | false;
};

const ask = (plays: PlaysType, token: string, range?: string) => plays.serve(new Request('app://erevos/__play/' + token, { headers: range ? { range } : {} }), token);

test('a range is read as a media element asks it', () => {
  assert.equal(rangeOf(null, 100), null);
  assert.deepEqual(rangeOf('bytes=0-', 100), [0, 99]);
  assert.deepEqual(rangeOf('bytes=10-19', 100), [10, 19]);
  assert.deepEqual(rangeOf('bytes=90-500', 100), [90, 99]);
  assert.deepEqual(rangeOf('bytes=-10', 100), [90, 99]);
  assert.equal(rangeOf('bytes=100-', 100), false);
  assert.equal(rangeOf('bytes=5-2', 100), false);
  assert.equal(rangeOf('items=0-1', 100), false);
});

test("a file's bytes come from its chunks by range, and not once it is forgotten", async () => {
  files.clear();
  blobs.clear();
  setCurrentSpace(null);
  const folder = mkdtempSync(join(tmpdir(), 'erevos-play-'));
  try {
    const place: CollectionPlace = { holder: 'space', space: 0, key: randomBytes(32) };
    // More than one chunk: the range below crosses from one to the next.
    const data = randomBytes(2_500_000);
    const item = await addToCollection(place, bytesSource(data), { name: 'song.mp3', mime: 'audio/mpeg', kind: 'file' });
    assert.ok(item.file.count > 1);
    for (const [name, bytes] of blobs) if (name.startsWith('erevos-file-')) writeFileSync(join(folder, name), bytes);
    const plays = new Plays(folder);
    const { id, key, chunk, count, size } = item.file;
    const token = plays.add({ id, key, chunk, count, size, mime: 'audio/mpeg' })!;
    assert.match(token, /^[0-9a-f]{32}$/);
    assert.equal(plays.add({ id, key: 'x', chunk, count, size }), null);
    assert.equal(plays.add({ id, key, chunk, count: count + 1, size }), null);

    const whole = ask(plays, token);
    assert.equal(whole.status, 200);
    assert.equal(whole.headers.get('content-type'), 'audio/mpeg');
    assert.deepEqual(new Uint8Array(await whole.arrayBuffer()), data);

    const part = ask(plays, token, 'bytes=1048000-1049999');
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), `bytes 1048000-1049999/${data.length}`);
    assert.deepEqual(new Uint8Array(await part.arrayBuffer()), data.slice(1048000, 1050000));

    assert.equal(ask(plays, token, 'bytes=2500000-').status, 416);
    assert.equal(ask(plays, 'f'.repeat(32)).status, 404);
    // Forgotten (the list stopped, the space locked): nothing more.
    plays.clear();
    assert.equal(ask(plays, token).status, 404);
    // A chunk changed on the disk: the answer stops, with no wrong bytes.
    const again = plays.add({ id, key, chunk, count, size })!;
    const first = join(folder, `erevos-file-${id}-0`);
    const changed = Uint8Array.from(blobs.get(`erevos-file-${id}-0`)!);
    changed[40] ^= 1;
    writeFileSync(first, changed);
    await assert.rejects(ask(plays, again, 'bytes=0-10').arrayBuffer());
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
