// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Messages taken to keep (lib/relay.ts, "Taken to keep"): the relay keeps each message it hands
// over until the phone says it has it, so one whose reply was lost with its connection comes again;
// and one kept and handed over again, after a restart, shows once. Against a real relay
// (crates/erevos-relay) and the real core built to WebAssembly by checks/build-core.mjs; skipped,
// with a note, when either build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url } from '../lib/e2e';
import { ackTaken, createQueue, forgetTaken, receiveMessage, receiveOnRead, sendMessage, toHex, waitForMessage } from '../lib/relay';
import { files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the checks of messages taken to keep: build the core first with node checks/build-core.mjs');
}
relayNote('the checks of messages taken to keep');

const one = (n: number) => Uint8Array.of(n);

test('a message whose reply was lost comes again, and goes from the relay once kept', { skip: !relayReady }, async () => {
  const relay = { url: await startRelay() };
  const ids = await createQueue(relay);
  for (const n of [1, 2, 3, 4]) await sendMessage(relay, ids.senderId, one(n));

  assert.deepEqual(await receiveMessage(relay, ids.recipientId, false), one(1));
  // The phone stopped before it kept it, as when the reply was lost with the connection: it comes again.
  forgetTaken();
  assert.deepEqual(await receiveMessage(relay, ids.recipientId, false), one(1));
  // The next take says it was kept, and gives the next.
  assert.deepEqual(await receiveMessage(relay, ids.recipientId, false), one(2));
  // Said at the end of a look: gone from the relay, though this run forgets it.
  await ackTaken(relay, ids.recipientId);
  await ackTaken(relay, ids.recipientId);
  forgetTaken();
  assert.deepEqual(await receiveMessage(relay, ids.recipientId, false), one(3));
  // On /read, as contacts' queues are read, the same.
  forgetTaken();
  assert.deepEqual(await receiveOnRead(relay, ids.recipientId, 'check', false), one(3));
  assert.deepEqual(await receiveOnRead(relay, ids.recipientId, 'check', false), one(4));
  await ackTaken(relay, ids.recipientId);
  assert.equal(await waitForMessage(relay, ids.recipientId, 0), false);
  assert.equal(await receiveMessage(relay, ids.recipientId, false), null);
});

test('a message handed over again after a restart shows once', { skip: !relayReady || !coreReady }, async () => {
  files.clear();
  const relay = { url: await startRelay() };
  const bobQueue = await createQueue(relay);
  const alice = await E2E.open('space', 0, randomBytes(32));
  const bob = await E2E.open('space', 1, randomBytes(32));
  const aliceFrom = toHex(randomBytes(24));
  const { identity } = await alice.addContact({ senderHex: toHex(bobQueue.senderId), key: toBase64Url(bob.bundle) }, aliceFrom);
  const sealed = await alice.seal(identity, 'are you there', aliceFrom);
  assert.ok(sealed.first);
  await sendMessage(relay, bobQueue.senderId, sealed.first);
  await sendMessage(relay, bobQueue.senderId, sealed.packet);

  const texts: string[] = [];
  const look = async () => {
    for (let bytes = await receiveMessage(relay, bobQueue.recipientId, false); bytes; bytes = await receiveMessage(relay, bobQueue.recipientId, false)) {
      const received = await bob.receive(bytes);
      if (received.kind === 'message' && received.text) texts.push(received.text);
    }
  };
  // Bob keeps the first packet, then the message, and stops before he says so: the message comes again.
  assert.equal((await bob.receive((await receiveMessage(relay, bobQueue.recipientId, false))!)).kind, 'message');
  const packet = (await receiveMessage(relay, bobQueue.recipientId, false))!;
  const received = await bob.receive(packet);
  assert.equal(received.kind === 'message' && received.text, 'are you there');
  forgetTaken();
  const again = (await receiveMessage(relay, bobQueue.recipientId, false))!;
  assert.deepEqual(again, packet);
  // Its key was used: it opens in no conversation, so it shows nothing more.
  assert.notEqual((await bob.receive(again)).kind, 'message');
  await look();
  assert.deepEqual(texts, []);
  assert.equal(await receiveMessage(relay, bobQueue.recipientId, false), null);
});
