// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Checking a contact by QR codes, in person (lib/verify-code.ts): each phone shows a code and
// checks the other's; a key someone in between gave either phone, a phone's own code, another
// contact's code or a later version's never marks a contact checked. With the real Rust core
// (checks/build-core.mjs) for the two chats; the code alone runs without it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { contactLink, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { qrRows } from '../lib/qr';
import { checkVerifyCode, verifyCode } from '../lib/verify-code';
import { loadE2EData } from '../lock/e2e-data';
import { files } from './files-memory';
import './secure-memory';

const key = () => toHex(randomBytes(32));

test('each side checks the code the other shows, and only that', () => {
  const alice = key();
  const bob = key();
  const mallory = key();
  // Bob shows his; Alice holds Bob's key and her own.
  const bobShows = verifyCode(bob, alice);
  assert.match(bobShows, /^EREVOSV1:[A-Za-z0-9_-]{43}$/);
  assert.equal(checkVerifyCode(bobShows, alice, bob), 'match');
  assert.equal(checkVerifyCode(verifyCode(alice, bob), bob, alice), 'match');
  // Her own screen in a mirror, or a photo of it, checks nothing.
  assert.equal(checkVerifyCode(verifyCode(alice, bob), alice, bob), 'own');
  // Someone in between gave Alice Mallory's key for Bob, and Bob Mallory's for Alice.
  assert.equal(checkVerifyCode(bobShows, alice, mallory), 'other');
  assert.equal(checkVerifyCode(verifyCode(bob, mallory), alice, mallory), 'other');
  assert.equal(checkVerifyCode(verifyCode(mallory, alice), alice, bob), 'other');
  // Another contact's code.
  assert.equal(checkVerifyCode(verifyCode(key(), alice), alice, bob), 'other');
});

test('what is not a code of this version is said for what it is, never taken', () => {
  const alice = key();
  const bob = key();
  const code = verifyCode(bob, alice);
  assert.equal(checkVerifyCode(`  ${code}\n`, alice, bob), 'match');
  assert.equal(checkVerifyCode(code.replace('EREVOSV1', 'EREVOSV2'), alice, bob), 'newer');
  assert.equal(checkVerifyCode(code.replace('EREVOSV1', 'EREVOSV0'), alice, bob), 'none');
  assert.equal(checkVerifyCode(code.slice(0, -1), alice, bob), 'none');
  assert.equal(checkVerifyCode(`${code}A`, alice, bob), 'none');
  assert.equal(checkVerifyCode('erevos://contact?id=00', alice, bob), 'none');
  assert.equal(checkVerifyCode('', alice, bob), 'none');
  // The safety number typed in is not a code.
  assert.equal(checkVerifyCode('12345 '.repeat(12), alice, bob), 'none');
  // The keys are not in it.
  assert.ok(!code.includes(bob) && !code.includes(alice));
});

test('the code fits a small QR code', () => {
  const rows = qrRows(verifyCode(key(), key()));
  assert.ok(rows.length <= 33, `${rows.length} modules`);
});

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the contact check between two chats: build the core first with node checks/build-core.mjs');
}

const sender = () => toHex(randomBytes(24));

test('two chats check each other by their codes, each marks only what it saw, and the mark is kept', { skip: !ready }, async () => {
  files.clear();
  const aliceKey = randomBytes(32);
  const alice = await E2E.open('space', 0, aliceKey);
  const bob = await E2E.open('hidden', 0, randomBytes(32));
  const aliceFrom = sender();
  const code = parseContact(contactLink({ senderHex: sender(), relayUrl: 'ws://relay:7879', key: toBase64Url(bob.bundle) }))!;
  const added = await alice.addContact(code, aliceFrom);
  const [pending] = alice.pending();
  const hello = (await bob.receive(pending.first)) as Extract<Received, { kind: 'message' }>;
  const bobId = added.identity;
  const aliceId = hello.identity;

  assert.equal(alice.verifiedAt(bobId), 0);
  // Alice photographs her own screen: nothing.
  assert.equal(await alice.checkVerify(bobId, alice.verifyCode(bobId)), 'own');
  assert.equal(alice.verifiedAt(bobId), 0);
  // Alice photographs Bob's: checked on her side only.
  assert.equal(await alice.checkVerify(bobId, bob.verifyCode(aliceId), 1000), 'match');
  assert.equal(alice.verifiedAt(bobId), 1000);
  assert.equal(bob.verifiedAt(aliceId), 0);
  // Bob photographs Alice's.
  assert.equal(await bob.checkVerify(aliceId, alice.verifyCode(bobId), 2000), 'match');
  assert.equal(bob.verifiedAt(aliceId), 2000);

  // A message from Bob afterwards leaves Alice's mark as it is.
  const toAlice = await bob.seal(aliceId, 'hi', sender());
  await alice.receive(toAlice.packet);
  assert.equal(alice.verifiedAt(bobId), 1000);

  // Kept, sealed with the space's key.
  const kept = await loadE2EData('space', 0, aliceKey);
  assert.equal(kept?.contacts.find((c) => c.identity === bobId)?.verified, 1000);
  const reopened = await E2E.open('space', 0, aliceKey);
  assert.equal(reopened.verifiedAt(bobId), 1000);

  // The mark comes off.
  await reopened.unverify(bobId);
  assert.equal(reopened.verifiedAt(bobId), 0);
  await assert.rejects(reopened.checkVerify('00'.repeat(32), 'EREVOSV1:x'));
});
