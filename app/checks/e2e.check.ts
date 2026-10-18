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
import { PART_SIZE, VoiceAssembler } from '../lib/voice';
import { FILE, loadE2EData, MAX_NAME } from '../lock/e2e-data';
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
  assert.deepEqual(bob.e2e.contacts(), [{ identity: hello.identity, sender: alice.from, name: '', timer: 0, request: true }]);
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

t('someone new who writes first is a message request until accepted, refused or answered', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const carol = await chat('space', 2);
  const { identity: bobId } = await alice.e2e.addContact(bob.code, alice.from);
  assert.equal(alice.e2e.contacts()[0].request, false);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  assert.equal(hello.request, true);
  // Receipts alone do not accept.
  await bob.e2e.seal(hello.identity, '', bob.from, { got: [] });
  assert.equal(bob.e2e.contacts()[0].request, true);
  const later = message(await bob.e2e.receive((await alice.e2e.seal(bobId, 'hi', alice.from)).packet));
  assert.equal(later.request, true);
  // Answering accepts.
  await bob.e2e.seal(hello.identity, 'hello', bob.from);
  assert.equal(bob.e2e.contacts()[0].request, false);

  // Carol writes to Bob too; Bob accepts with a tap, then another request is refused.
  await carol.e2e.addContact(bob.code, carol.from);
  const fromCarol = message(await bob.e2e.receive(carol.e2e.pending()[0].first));
  assert.equal(fromCarol.request, true);
  await bob.e2e.acceptRequest(fromCarol.identity);
  assert.equal(bob.e2e.contacts().find((c) => c.identity === fromCarol.identity)!.request, false);
  await bob.e2e.removeContact(fromCarol.identity);
  assert.equal(bob.e2e.contacts().length, 1);
  const { identity: toBob } = carol.e2e.contacts()[0];
  assert.deepEqual(await bob.e2e.receive((await carol.e2e.seal(toBob, 'still there?', carol.from)).packet), {
    kind: 'refused',
    reason: 'unknown',
  });
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

t('a contact keeps the name this chat gives it, sealed, through new messages and links', async () => {
  const key = randomBytes(32);
  const alice = await chat('space', 0, key);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  await alice.e2e.rename(identity, '  Μαρία\n\u202e Π.  ');
  assert.equal(alice.e2e.contacts()[0].name, 'Μαρία Π.');

  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  await alice.e2e.receive((await bob.e2e.seal(hello.identity, 'hi', bob.from)).packet);
  await alice.e2e.addContact({ ...bob.code, senderHex: sender() }, alice.from);
  const again = await E2E.open('space', 0, key);
  assert.equal(again.contacts()[0].name, 'Μαρία Π.');
  assert.ok(!files.get(FILE)!.includes('Μαρία'));

  await again.rename(identity, 'x'.repeat(MAX_NAME + 10));
  assert.equal(again.contacts()[0].name.length, MAX_NAME);
  await again.rename(identity, '   ');
  assert.equal((await E2E.open('space', 0, key)).contacts()[0].name, '');
  await assert.rejects(again.rename('00'.repeat(32), 'nobody'));
});

t('a message carries its tag, and a request to delete one message or all of them', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  assert.deepEqual([hello.tag, hello.erase], ['', null]);
  await alice.e2e.firstSent(identity);

  const hi = await alice.e2e.seal(identity, 'hi', alice.from);
  assert.match(hi.tag, /^[0-9a-f]{12}$/);
  const got = message(await bob.e2e.receive(hi.packet));
  assert.deepEqual([got.text, got.tag, got.erase], ['hi', hi.tag, null]);

  const one = await alice.e2e.seal(identity, '', alice.from, { erase: { tag: hi.tag } });
  assert.equal(one.tag, '');
  assert.deepEqual(message(await bob.e2e.receive(one.packet)).erase, { tag: hi.tag });
  const all = await bob.e2e.seal(hello.identity, '', bob.from, { erase: { all: true } });
  const asked = message(await alice.e2e.receive(all.packet));
  assert.deepEqual([asked.text, asked.erase], ['', { all: true }]);
  // A message with text never asks to delete.
  const both = await alice.e2e.seal(identity, 'text', alice.from, { erase: { all: true } });
  assert.equal(message(await bob.e2e.receive(both.packet)).erase, null);
});

t('a chat timer travels with the messages, the later setting wins, and old messages keep theirs', async () => {
  const key = randomBytes(32);
  const alice = await chat('space', 0, key);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  assert.deepEqual([hello.timer, hello.timerChanged], [0, false]);
  await alice.e2e.firstSent(identity);

  // Bob sends with no timer while Alice sets one: his message does not take it back.
  const before = await bob.e2e.seal(hello.identity, 'before', bob.from);
  assert.equal(before.timer, 0);
  await alice.e2e.setTimer(identity, 3600);
  const told = await alice.e2e.seal(identity, '', alice.from);
  assert.equal(told.timer, 3600);
  const stale = message(await alice.e2e.receive(before.packet));
  assert.deepEqual([stale.text, stale.timer, stale.timerChanged], ['before', 0, false]);
  assert.equal(alice.e2e.contacts()[0].timer, 3600);

  const learnt = message(await bob.e2e.receive(told.packet));
  assert.deepEqual([learnt.text, learnt.erase, learnt.timer, learnt.timerChanged], ['', null, 3600, true]);
  assert.equal(bob.e2e.contacts()[0].timer, 3600);
  const after = await bob.e2e.seal(hello.identity, 'after', bob.from);
  assert.deepEqual([message(await alice.e2e.receive(after.packet)).timer, after.timer], [3600, 3600]);

  // Bob turns it off; the same setting again changes nothing.
  await bob.e2e.setTimer(hello.identity, 0);
  const off = message(await alice.e2e.receive((await bob.e2e.seal(hello.identity, 'off', bob.from)).packet));
  assert.deepEqual([off.timer, off.timerChanged], [0, true]);
  const same = message(await alice.e2e.receive((await bob.e2e.seal(hello.identity, 'again', bob.from)).packet));
  assert.deepEqual([same.timer, same.timerChanged], [0, false]);

  // One message can disappear on its own, without changing the chat's timer.
  const once = await bob.e2e.seal(hello.identity, 'once', bob.from, { lasts: 60 });
  assert.equal(once.timer, 60);
  const gotOnce = message(await alice.e2e.receive(once.packet));
  assert.deepEqual([gotOnce.text, gotOnce.timer, gotOnce.timerChanged], ['once', 60, false]);
  assert.equal(alice.e2e.contacts()[0].timer, 0);

  // What came and was read travels back by tag.
  const receipts = await alice.e2e.seal(identity, '', alice.from, { got: [once.tag, 'not a tag'], read: [once.tag] });
  const back = message(await bob.e2e.receive(receipts.packet));
  assert.deepEqual([back.text, back.got, back.read, back.timerChanged], ['', [once.tag], [once.tag], false]);

  // Kept, sealed, between launches; and only times Erevos knows.
  await alice.e2e.setTimer(identity, 300);
  assert.equal((await E2E.open('space', 0, key)).contacts()[0].timer, 300);
  await assert.rejects(alice.e2e.setTimer(identity, -1));
  await assert.rejects(alice.e2e.setTimer(identity, 1.5));
  await assert.rejects(alice.e2e.seal(identity, 'x', alice.from, { lasts: -5 }));
  await assert.rejects(alice.e2e.setTimer('00'.repeat(32), 60));
});

t('a voice message travels in parts, each with its tag, and comes back whole', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  await alice.e2e.firstSent(identity);

  const sound = randomBytes(PART_SIZE * 2 + 500);
  const sealed = await alice.e2e.sealVoice(identity, sound, 9000, alice.from, { lasts: 300 });
  assert.deepEqual([sealed.packets.length, sealed.timer], [3, 300]);
  assert.match(sealed.tag, /^[0-9a-f]{12}$/);
  const assembler = new VoiceAssembler();
  let whole: { audio: Uint8Array; ms: number } | null = null;
  for (const packet of sealed.packets) {
    assert.ok(packet.length < 20_000);
    const got = message(await bob.e2e.receive(packet));
    assert.deepEqual([got.text, got.tag, got.timer, got.voice!.parts], ['', sealed.tag, 300, 3]);
    whole = assembler.add(hello.identity, got.voice!) ?? whole;
  }
  assert.deepEqual([whole!.audio, whole!.ms], [sound, 9000]);
  // The conversation goes on after it, both ways.
  assert.equal(message(await bob.e2e.receive((await alice.e2e.seal(identity, 'after', alice.from)).packet)).text, 'after');
  assert.equal(message(await alice.e2e.receive((await bob.e2e.seal(hello.identity, 'back', bob.from)).packet)).text, 'back');
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

t('contacts on different relays learn where to reach each other', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const bobAt = { relay: 'wss://bob.example.org', relayKey: toBase64Url(randomBytes(32)) };
  const aliceAt = { relay: 'wss://alice.example.org', relayKey: toBase64Url(randomBytes(32)) };
  const code = parseContact(contactLink({ senderHex: bob.from, relayUrl: bobAt.relay, key: bob.code.key, relayKey: bobAt.relayKey }))!;
  assert.equal(code.relayKey, bobAt.relayKey);

  const { identity } = await alice.e2e.addContact(code, alice.from, aliceAt);
  const [pending] = alice.e2e.pending();
  assert.deepEqual([pending.relay, pending.relayKey], [bobAt.relay, bobAt.relayKey]);

  // Bob's answer goes to Alice's relay, told to him in her first packet.
  const hello = message(await bob.e2e.receive(pending.first));
  const toAlice = await bob.e2e.seal(hello.identity, 'hi', bob.from, { at: bobAt });
  assert.deepEqual([toAlice.relay, toAlice.relayKey], [aliceAt.relay, aliceAt.relayKey]);
  await alice.e2e.firstSent(identity);

  // Alice moves to another relay: her next message tells Bob.
  message(await alice.e2e.receive(toAlice.packet));
  const moved = { relay: 'wss://new.example.org', relayKey: toBase64Url(randomBytes(32)) };
  message(await bob.e2e.receive((await alice.e2e.seal(identity, 'moved', alice.from, { at: moved })).packet));
  const again = await bob.e2e.seal(hello.identity, '', bob.from);
  assert.deepEqual([again.relay, again.relayKey], [moved.relay, moved.relayKey]);

  // A link with a broken relay key is not a contact link.
  assert.equal(parseContact(contactLink({ ...code, relayKey: 'short' })), null);
});

t('a contact link with its key fits a QR code', async () => {
  const { code } = await chat('space', 0);
  const link = contactLink({ senderHex: code.senderHex, relayUrl: 'wss://relay.example.org/erevos', key: code.key, relayKey: toBase64Url(randomBytes(32)) });
  assert.ok(link.length < 2000, `${link.length}`);
  // Version 33 or below: 149 modules a side. The relay's key added one version.
  assert.ok(qrRows(link).length <= 149, `${qrRows(link).length}`);
});
