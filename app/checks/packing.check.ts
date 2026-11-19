// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Packed messages (lib/packing.ts, lib/e2e.ts): a long one goes packed to a contact whose Erevos
// said it reads them, smaller once padded, and opens as it was; a short one, or one to an Erevos
// that never said so, goes as before. Sealed by the real core built to WebAssembly by
// checks/build-core.mjs; those checks are skipped, with a note, when that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { deflateSync } from 'fflate';

import { setCore, type Core } from '../lib/core';
import { randomBytes, utf8Encode } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { MOST_UNPACKED, packed, PACKED, unpacked } from '../lib/packing';
import { files } from './files-memory';

const require = createRequire(import.meta.url);
const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = require(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the packed messages checks with the core: build it first with node checks/build-core.mjs');
}

const LONG = 'Καλησπέρα, τι κάνεις; Θα βρεθούμε αύριο στις 7 στην πλατεία, μπροστά στο καφέ. '.repeat(16);

test('packed only when it goes to a smaller padded size, and opens as it was', () => {
  const short = utf8Encode(JSON.stringify({ text: 'ok', from: 'x'.repeat(48) }));
  assert.equal(packed(short), null);
  // Over a bucket, but packing leaves it in the same one: as it is.
  assert.equal(packed(new Uint8Array(randomBytes(2000))), null);
  const long = utf8Encode(JSON.stringify({ text: LONG }));
  assert.ok(long.length > 1024);
  const p = packed(long)!;
  assert.equal(p[0], PACKED);
  assert.ok(p.length < 1023);
  assert.deepEqual(unpacked(p), long);
  // JSON is never taken for packed.
  assert.equal(unpacked(long), long);
});

test('a packed message that opens to too much, or is cut short, does not open', () => {
  const bomb = deflateSync(new Uint8Array(MOST_UNPACKED + 1));
  assert.throws(() => unpacked(Uint8Array.of(PACKED, ...bomb)), RangeError);
  const p = packed(utf8Encode(JSON.stringify({ text: LONG })))!;
  assert.throws(() => unpacked(p.subarray(0, p.length - 10)));
  assert.throws(() => unpacked(Uint8Array.of(PACKED)));
});

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

test('a long text goes packed once the contact said its Erevos reads them, and comes as written', { skip: !ready }, async () => {
  files.clear();
  const alice = await E2E.open('space', 0, randomBytes(32));
  const bob = await E2E.open('space', 1, randomBytes(32));
  const { identity: bobId } = await alice.addContact({ senderHex: '', key: toBase64Url(bob.bundle) }, '');
  // Bob has said nothing yet: as before, padded to the size it takes as it is.
  const first = await alice.seal(bobId, LONG, '');
  assert.ok(first.packet.length > 4096);
  assert.equal(message(await bob.receive(first.first!)).request, true);
  const got = message(await bob.receive(first.packet));
  assert.equal(got.text, LONG);
  await bob.acceptRequest(got.identity);
  // Bob's answer says his Erevos reads packed ones.
  const answer = await bob.seal(got.identity, 'ok', '');
  message(await alice.receive(answer.packet));
  const second = await alice.seal(bobId, LONG, '');
  assert.ok(second.packet.length < 1400, `${second.packet.length} bytes`);
  assert.equal(message(await bob.receive(second.packet)).text, LONG);
  // A short one goes as it did.
  const short = await alice.seal(bobId, 'see you', '');
  assert.equal(message(await bob.receive(short.packet)).text, 'see you');
});
