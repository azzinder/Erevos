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
import { E2E, NoKeyError, ONLINE, ONLINE_AFTER_WRITE, OwnCodeError, toBase64Url, type Received } from '../lib/e2e';
import { PART_SIZE, VoiceAssembler } from '../lib/voice';
import { checkedAvatar, FILE, loadE2EData, MAX_NAME } from '../lock/e2e-data';
import { DEFAULT_LOOK } from '../theme/look';
import { loadPhoto, savePhoto } from '../lock/avatar-photos';
import { History, newTag } from '../lock/history';
import { moveChat } from '../lock/move-chat';
import { hiddenHolder } from '../lock/sealed-file';
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
  assert.deepEqual(bob.e2e.contacts(), [{ identity: hello.identity, sender: alice.from, name: '', timer: 0, request: true, look: null, avatar: null, hide: false }]);
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

t('a chat keeps its own look, sealed, until given the space\'s again', async () => {
  const key = randomBytes(32);
  const alice = await chat('space', 0, key);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  assert.equal(alice.e2e.contacts()[0].look, null);
  await alice.e2e.setLook(identity, { ...DEFAULT_LOOK, style: 'matrix', wallpaper: 'stars' });
  // A message from them keeps it, and so does opening the chat again.
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  await alice.e2e.receive((await bob.e2e.seal(hello.identity, 'hi', bob.from)).packet);
  const again = await E2E.open('space', 0, key);
  assert.equal(again.contacts()[0].look?.style, 'matrix');
  assert.equal(again.contacts()[0].look?.wallpaper, 'stars');
  assert.ok(!files.get(FILE)!.includes('matrix'));
  await again.setLook(identity, null);
  assert.equal((await E2E.open('space', 0, key)).contacts()[0].look, null);
  await assert.rejects(again.setLook('00'.repeat(32), null));
});

t('a contact keeps the picture this chat gives it, sealed, and a picture of the wrong shape is none', async () => {
  const key = randomBytes(32);
  const alice = await chat('space', 0, key);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  assert.equal(alice.e2e.contacts()[0].avatar, null);
  await alice.e2e.setAvatar(identity, { kind: 'emoji', emoji: '🦊', color: '#f76b15' });
  const again = await E2E.open('space', 0, key);
  assert.deepEqual(again.contacts()[0].avatar, { kind: 'emoji', emoji: '🦊', color: '#F76B15' });
  await again.setAvatar(identity, null);
  assert.equal((await E2E.open('space', 0, key)).contacts()[0].avatar, null);
  assert.equal(checkedAvatar({ kind: 'emoji', emoji: 'way too long a sign', color: '#000000' }), null);
  assert.equal(checkedAvatar({ kind: 'emoji', emoji: '\u202e🦊', color: '#000000' }), null);
  assert.equal(checkedAvatar({ kind: 'photo', emoji: '🦊', color: '#000000' }), null);
  assert.equal(checkedAvatar({ kind: 'photo', id: 'ab', key: 'cd' }), null);
  assert.equal(checkedAvatar({ kind: 'emoji', emoji: '🦊', color: 'orange' }), null);
});

t('a contact\'s photo is sealed in its own file, deleted when another picture or forgetting them takes its place', async () => {
  const key = randomBytes(32);
  const alice = await chat('space', 0, key);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const first = await savePhoto(new Uint8Array([1, 2, 3]));
  await alice.e2e.setAvatar(identity, { kind: 'photo', ...first });
  const again = await E2E.open('space', 0, key);
  const kept = again.contacts()[0].avatar;
  assert.ok(kept?.kind === 'photo' && kept.id === first.id);
  assert.deepEqual(await loadPhoto(first), new Uint8Array([1, 2, 3]));
  assert.ok(!files.get(FILE)!.includes(first.key));

  const second = await savePhoto(new Uint8Array([4]));
  await again.setAvatar(identity, { kind: 'photo', ...second });
  assert.equal(await loadPhoto(first), null);
  await again.removeContact(identity);
  assert.equal(await loadPhoto(second), null);
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

t('an answer says which message it answers, and a reaction travels with no words', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  await alice.e2e.firstSent(identity);

  const question = await alice.e2e.seal(identity, 'coffee?', alice.from);
  assert.equal(message(await bob.e2e.receive(question.packet)).re, '');
  const answer = await bob.e2e.seal(hello.identity, 'yes', bob.from, { re: question.tag });
  const answered = message(await alice.e2e.receive(answer.packet));
  assert.deepEqual([answered.text, answered.re], ['yes', question.tag]);
  // A voice message and a file answer too.
  const voice = await bob.e2e.sealVoice(hello.identity, new Uint8Array(10), 1000, bob.from, { re: question.tag });
  assert.equal(message(await alice.e2e.receive(voice.packets[0])).re, question.tag);

  const liked = await alice.e2e.seal(identity, '', alice.from, { react: { tag: answer.tag, emoji: '👍' } });
  assert.equal(liked.tag, '');
  const reaction = message(await bob.e2e.receive(liked.packet));
  assert.deepEqual([reaction.text, reaction.tag, reaction.react], ['', '', { tag: answer.tag, emoji: '👍' }]);
  const back = await alice.e2e.seal(identity, '', alice.from, { react: { tag: answer.tag, emoji: '' } });
  assert.deepEqual(message(await bob.e2e.receive(back.packet)).react, { tag: answer.tag, emoji: '' });
  // A reaction with words is none, and words never react.
  const words = await alice.e2e.seal(identity, '', alice.from, { react: { tag: answer.tag, emoji: 'nice' } });
  assert.equal(message(await bob.e2e.receive(words.packet)).react, null);
  const both = await alice.e2e.seal(identity, 'text', alice.from, { react: { tag: answer.tag, emoji: '👍' } });
  assert.equal(message(await bob.e2e.receive(both.packet)).react, null);
});

t('a pin travels with no words, and says the phone is open as writing does', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  await alice.e2e.firstSent(identity);

  const words = await alice.e2e.seal(identity, 'meet here', alice.from);
  await bob.e2e.receive(words.packet);
  const pinned = await bob.e2e.seal(hello.identity, '', bob.from, { more: { pin: { tag: words.tag, on: true } } });
  assert.equal(pinned.tag, '');
  const pin = message(await alice.e2e.receive(pinned.packet));
  assert.deepEqual([pin.text, pin.more], ['', { pin: { tag: words.tag, on: true } }]);
  assert.ok(pin.online > Date.now());
  const down = await bob.e2e.seal(hello.identity, '', bob.from, { more: { pin: { tag: words.tag, on: false } } });
  assert.deepEqual(message(await alice.e2e.receive(down.packet)).more, { pin: { tag: words.tag, on: false } });
  // Words never pin, and a pin of no tag is none.
  const both = await bob.e2e.seal(hello.identity, 'text', bob.from, { more: { pin: { tag: words.tag, on: true } } });
  assert.deepEqual(message(await alice.e2e.receive(both.packet)).more, {});
  const odd = await bob.e2e.seal(hello.identity, '', bob.from, { more: { pin: { tag: 'nope', on: true } } });
  assert.deepEqual(message(await alice.e2e.receive(odd.packet)).more, {});
});

t('a message sent without sound says so inside the encryption, and one sent as usual says nothing', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const { identity } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  assert.equal(hello.quiet, false);
  await alice.e2e.firstSent(identity);

  const hush = await alice.e2e.seal(identity, 'hush', alice.from, { quiet: true });
  const heard = message(await bob.e2e.receive(hush.packet));
  assert.deepEqual([heard.text, heard.quiet], ['hush', true]);
  const loud = await alice.e2e.seal(identity, 'loud', alice.from, { quiet: false });
  assert.equal(message(await bob.e2e.receive(loud.packet)).quiet, false);
  // Only words come quiet: what came or was read is no message to hear.
  const marks = await bob.e2e.seal(hello.identity, '', bob.from, { got: [hush.tag], quiet: true });
  assert.equal(message(await alice.e2e.receive(marks.packet)).quiet, false);
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

t('a phone says it is open when it writes or answers, and a chat that appears offline holds its marks', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('space', 1);
  const { identity: bobId } = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  const aliceId = hello.identity;
  await alice.e2e.firstSent(bobId);
  await bob.e2e.acceptRequest(aliceId);
  // Nothing said yet: not known to be open.
  assert.equal(hello.online, 0);
  assert.equal(bob.e2e.onlineUntil(aliceId), 0);

  // Asking says this phone is open too.
  const before = Date.now();
  const asked = message(await bob.e2e.receive((await alice.e2e.seal(bobId, '', alice.from, { ask: true, on: ONLINE })).packet));
  assert.equal(asked.ask, true);
  assert.ok(asked.online >= before + ONLINE * 1000 - 50 && asked.online <= Date.now() + ONLINE * 1000);
  assert.equal(bob.e2e.onlineUntil(aliceId), asked.online);
  assert.ok(alice.e2e.toldAt(bobId) >= before);
  // Gone by then.
  assert.equal(bob.e2e.onlineUntil(aliceId, asked.online + 1), 0);

  // Bob's chat with Alice appears offline: no word of being open, no asking, marks held.
  await bob.e2e.setHidden(aliceId, true);
  assert.equal(bob.e2e.contacts()[0].hide, true);
  const one = await alice.e2e.seal(bobId, 'one', alice.from);
  const two = await alice.e2e.seal(bobId, 'two', alice.from);
  message(await bob.e2e.receive(one.packet));
  message(await bob.e2e.receive(two.packet));
  await bob.e2e.hold(aliceId, 'got', [one.tag, two.tag]);
  await bob.e2e.hold(aliceId, 'read', [one.tag]);
  const quiet = message(await alice.e2e.receive((await bob.e2e.seal(aliceId, '', bob.from, { ask: true, on: ONLINE })).packet));
  assert.deepEqual([quiet.ask, quiet.online, quiet.got, quiet.read], [false, 0, [], []]);
  // Held across launches, sealed.
  const again = await E2E.open('space', 1, bob.key);
  assert.deepEqual(
    [again.contacts()[0].hide, (await loadE2EData('space', 1, bob.key)).contacts[0].heldRead],
    [true, [one.tag]],
  );

  // Bob writes: open for a while, and what was held goes with it, read beating came.
  const reply = message(await alice.e2e.receive((await bob.e2e.seal(aliceId, 'here', bob.from)).packet));
  assert.equal(reply.text, 'here');
  assert.ok(reply.online >= Date.now() + ONLINE_AFTER_WRITE * 1000 - 1000);
  assert.deepEqual([reply.got, reply.read], [[two.tag], [one.tag]]);
  // Told once only.
  const after = message(await alice.e2e.receive((await bob.e2e.seal(aliceId, 'and again', bob.from)).packet));
  assert.deepEqual([after.got, after.read], [[], []]);

  // Shown again, what is held goes with the next message, whatever it is.
  await bob.e2e.hold(aliceId, 'read', [two.tag]);
  await bob.e2e.setHidden(aliceId, false);
  const shown = message(await alice.e2e.receive((await bob.e2e.seal(aliceId, '', bob.from, { on: ONLINE })).packet));
  assert.deepEqual([shown.read, shown.online > 0], [[two.tag], true]);
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
  let whole: { audio: Uint8Array; ms: number; talk: boolean } | null = null;
  for (const packet of sealed.packets) {
    assert.ok(packet.length < 20_000);
    const got = message(await bob.e2e.receive(packet));
    assert.deepEqual([got.text, got.tag, got.timer, got.voice!.parts], ['', sealed.tag, 300, 3]);
    whole = assembler.add(hello.identity, got.voice!) ?? whole;
  }
  assert.deepEqual([whole!.audio, whole!.ms, whole!.talk], [sound, 9000, false]);
  // Said walkie-talkie style, it comes back as such.
  const talk = await alice.e2e.sealVoice(identity, sound.slice(0, 900), 1500, alice.from, { talk: true });
  const heard = assembler.add(hello.identity, message(await bob.e2e.receive(talk.packets[0])).voice!);
  assert.deepEqual([heard!.audio, heard!.talk], [sound.slice(0, 900), true]);
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

t('a call is set up in sealed messages, and calling accepts a request', async () => {
  const alice = await chat('space', 0);
  const bob = await chat('hidden', 0);
  const added = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  await alice.e2e.firstSent(added.identity);
  assert.equal(bob.e2e.contacts()[0].request, true);

  // Bob calls Alice back, who wrote first: that accepts her request.
  const sdp = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n';
  const offer = await bob.e2e.seal(hello.identity, '', bob.from, { call: { id: '0123456789abcdef', kind: 'offer', video: true, sdp, at: 5 } });
  assert.equal(offer.tag, '');
  assert.equal(bob.e2e.contacts()[0].request, false);
  const rang = message(await alice.e2e.receive(offer.packet));
  assert.equal(rang.text, '');
  assert.deepEqual(rang.call, { id: '0123456789abcdef', kind: 'offer', video: true, sdp, at: 5 });

  const end = await alice.e2e.seal(added.identity, '', alice.from, { call: { id: '0123456789abcdef', kind: 'end', reason: 'decline' } });
  assert.deepEqual(message(await bob.e2e.receive(end.packet)).call, { id: '0123456789abcdef', kind: 'end', reason: 'decline' });

  // A text never carries a call signal, and a plain message has none.
  const text = await alice.e2e.seal(added.identity, 'hi', alice.from, { call: { id: '0123456789abcdef', kind: 'ringing' } });
  assert.equal(message(await bob.e2e.receive(text.packet)).call, null);
});

t('a chat moves into the hidden chats whole, with the same safety number, and goes on there', async () => {
  const key = randomBytes(32);
  const alice = await chat('space', 0, key);
  const bob = await chat('hidden', 1);
  const added = await alice.e2e.addContact(bob.code, alice.from);
  const hello = message(await bob.e2e.receive(alice.e2e.pending()[0].first));
  await alice.e2e.firstSent(added.identity);
  await alice.e2e.rename(added.identity, 'Bob');
  const before = await alice.e2e.safetyNumber(added.identity);
  const peer = `contact:${added.identity}`;
  const history = await History.open('space', 0, key);
  await history.add({ peer, text: 'γεια', mine: true, at: 1, tag: newTag() });
  await history.add({ peer: 'contact:other', text: 'stays', mine: true, at: 2, tag: newTag() });

  const hiddenKey = randomBytes(32);
  // Into the third place of the space's hidden chats.
  const holder = hiddenHolder(2);
  const hidden = { e2e: await E2E.open(holder, 0, hiddenKey), history: await History.open(holder, 0, hiddenKey) };
  await moveChat(added.identity, { e2e: alice.e2e, history, archive: null }, hidden);

  // Nothing of it stays in the space, opened again from what it keeps.
  assert.deepEqual((await E2E.open('space', 0, key)).contacts(), []);
  assert.deepEqual((await History.open('space', 0, key)).messages().map((m) => m.text), ['stays']);
  // The hidden chats have it all, and the safety number is the one Bob compared.
  const reopened = await E2E.open(holder, 0, hiddenKey);
  assert.equal(reopened.contacts()[0].name, 'Bob');
  assert.equal(await reopened.safetyNumber(added.identity), before);
  assert.equal(await bob.e2e.safetyNumber(hello.identity), before);
  assert.deepEqual((await History.open(holder, 0, hiddenKey)).messages().map((m) => m.text), ['γεια']);
  // Nothing of it in the first place.
  assert.deepEqual((await E2E.open('hidden', 0, hiddenKey)).contacts(), []);

  // Told from the hidden chats' queue, Bob writes there, and the hidden chats read it.
  const queue = sender();
  const told = await reopened.seal(added.identity, '', queue);
  message(await bob.e2e.receive(told.packet));
  const answer = await bob.e2e.seal(hello.identity, 'εδώ είμαι', bob.from);
  assert.equal(answer.sender, queue);
  assert.equal(message(await reopened.receive(answer.packet)).text, 'εδώ είμαι');
});
