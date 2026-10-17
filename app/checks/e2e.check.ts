// End-to-end encryption in the app (lib/e2e.ts) with the real Rust core, built to WebAssembly by
// checks/build-core.mjs. Skipped, with a note, when that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { contactLink, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes, utf8Encode } from '../lib/crypto';
import { qrRows } from '../lib/qr';
import { E2E, NoKeyError, OwnCodeError, toBase64Url, type Received } from '../lib/e2e';
import { FILE, loadE2EData } from '../lock/e2e-data';
import { files } from './files-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  // The WebAssembly calls return at once. The Android module's return promises.
  setCore(
    Object.fromEntries(
      Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)]),
    ) as unknown as Core,
  );
} else {
  console.log('Skipping the end-to-end checks: build the core first with node checks/build-core.mjs');
}

const t = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !ready }, async () => {
    files.clear();
    await fn();
  });

const sender = () => Array.from(randomBytes(24), (b) => b.toString(16).padStart(2, '0')).join('');

/** A chat with its relay sender id, and the code it shows. */
async function chat(holder: 'space' | 'hidden', space: number, key = randomBytes(32)) {
  const e2e = await E2E.open(holder, space, key);
  const from = sender();
  const code = { senderHex: from, key: toBase64Url(e2e.bundle) };
  return { e2e, from, code, key };
}

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

t('two chats add each other through a link and talk both ways', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('hidden', 0);
  const link = contactLink({ senderHex: bob.from, relayUrl: 'ws://relay:7879', key: bob.code.key });
  const code = parseContact(link)!;
  assert.equal(code.key, bob.code.key);

  const added = await alice.e2e.addContact(code, alice.from);
  assert.equal(added.added, true);
  const [pending] = alice.e2e.pending();
  assert.equal(pending.sender, bob.from);

  // Bob opens the first packet and learns who Alice is and where to answer.
  const hello = message(await bob.e2e.receive(pending.first));
  assert.equal(hello.added, true);
  assert.equal(hello.text, '');
  assert.deepEqual(bob.e2e.contacts(), [{ identity: hello.identity, sender: alice.from }]);
  await alice.e2e.firstSent(added.identity);
  assert.deepEqual(alice.e2e.pending(), []);

  const toAlice = await bob.e2e.seal(hello.identity, 'γεια σου', bob.from);
  assert.equal(toAlice.sender, alice.from);
  assert.equal(toAlice.first, null);
  assert.equal(message(await alice.e2e.receive(toAlice.packet)).text, 'γεια σου');

  const toBob = await alice.e2e.seal(added.identity, 'hi', alice.from);
  const got = message(await bob.e2e.receive(toBob.packet));
  assert.deepEqual([got.text, got.identity], ['hi', hello.identity]);

  // Both see the same safety number.
  assert.equal(await alice.e2e.safetyNumber(added.identity), await bob.e2e.safetyNumber(hello.identity));
  assert.match(await alice.e2e.safetyNumber(added.identity), /^(\d{5} ){11}\d{5}$/);
});

t('a first packet the relay did not take goes again before the next message', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  // The relay was down: the first packet was never sent.
  const sealed = await alice.e2e.seal(identity, 'are you there', alice.from);
  assert.ok(sealed.first);
  assert.equal(message(await bob.e2e.receive(sealed.first)).text, '');
  assert.equal(message(await bob.e2e.receive(sealed.packet)).text, 'are you there');
  // Sent twice (it may have reached the relay the first time): the second is a replay.
  assert.deepEqual(await bob.e2e.receive(sealed.first), { kind: 'refused', reason: 'replay' });
});

t('both start a conversation at once and still read each other', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const a = await alice.e2e.addContact(bob.code, alice.from);
  const b = await bob.e2e.addContact(alice.code, bob.from);
  message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  message(await alice.e2e.receive(bob.e2e.pending()[0].first));
  for (let round = 0; round < 3; round++) {
    const one = await alice.e2e.seal(a.identity, `a${round}`, alice.from);
    const two = await bob.e2e.seal(b.identity, `b${round}`, bob.from);
    assert.equal(message(await bob.e2e.receive(one.packet)).text, `a${round}`);
    assert.equal(message(await alice.e2e.receive(two.packet)).text, `b${round}`);
  }
  assert.equal(alice.e2e.contacts().length, 1);
});

t('keeps the conversations between launches, sealed', async () => {
  const key = randomBytes(32);
  const alice = await chat('space', 0, key);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  const answer = await bob.e2e.seal(hello.identity, 'kept?', bob.from);

  const again = await E2E.open('space', 0, key);
  assert.deepEqual(again.identity, alice.e2e.identity);
  assert.equal(message(await again.receive(answer.packet)).text, 'kept?');
  assert.equal(again.contacts()[0].identity, identity);

  const raw = files.get(FILE)!;
  assert.ok(!raw.includes(identity) && !raw.includes(bob.from));
  // Another key opens nothing, and gets a new account.
  assert.equal((await loadE2EData('space', 0, randomBytes(32))).account, '');
  const other = await E2E.open('space', 0, randomBytes(32));
  assert.notDeepEqual(other.identity, alice.e2e.identity);
});

t('every slot has a value of the same size, used or not', async () => {
  await chat('space', 0);
  const before = JSON.parse(files.get(FILE)!) as Record<string, string[]>;
  const lengths = (values: Record<string, string[]>) => [...values.space, ...values.hidden].map((v) => v.length);
  assert.equal(before.space.length, 4);
  assert.equal(before.hidden.length, 4);
  assert.equal(new Set(lengths(before)).size, 1);
  const hidden = await chat('hidden', 2);
  await hidden.e2e.addContact((await chat('space', 3)).code, hidden.from);
  assert.equal(new Set(lengths(JSON.parse(files.get(FILE)!))).size, 1);
});

t('refuses plain messages, other accounts, its own link and links without keys', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const carol = await chat('space', 2);
  assert.deepEqual(await alice.e2e.receive(utf8Encode('{"from":"","text":"plain"}')), { kind: 'refused', reason: 'plain' });
  await carol.e2e.addContact(bob.code, carol.from);
  // A first packet for Bob, not Alice.
  assert.deepEqual(await alice.e2e.receive(carol.e2e.pending()[0].first), { kind: 'refused', reason: 'unknown' });
  await assert.rejects(alice.e2e.addContact(alice.code, alice.from), OwnCodeError);
  await assert.rejects(alice.e2e.addContact({ senderHex: bob.from, key: '' }, alice.from), NoKeyError);
  const damaged = bob.code.key.slice(0, 60) + (bob.code.key[60] === 'A' ? 'B' : 'A') + bob.code.key.slice(61);
  await assert.rejects(alice.e2e.addContact({ senderHex: bob.from, key: damaged }, alice.from));
  assert.deepEqual(alice.e2e.contacts(), []);
});

t('a contact link with its key fits a QR code', async () => {
  const { code } = await chat('space', 0);
  const link = contactLink({ senderHex: code.senderHex, relayUrl: 'wss://relay.example.org/erevos', key: code.key });
  assert.ok(link.length < 2000, `${link.length}`);
  // Version 32 or below: 145 modules a side.
  assert.ok(qrRows(link).length <= 145, `${qrRows(link).length}`);
});
