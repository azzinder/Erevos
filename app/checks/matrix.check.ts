// Matrix accounts (lib/matrix.ts) against a small homeserver played here, with the real core built
// to WebAssembly for the keys (crates/erevos-matrix): signing in publishes the device's keys and,
// for an account without them, cross-signing keys, asking the password again as servers do; a chat
// started with someone is encrypted, they see the invite, join, and read what is sent; the server
// keeps only ciphertext; each side reads the other and its own; the state survives being kept as
// JSON between every step, as the app keeps it; a message the server gives again under another ID
// does not show twice; a device that signs in later gets the room's key for what comes after, and
// what came before stays locked to it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCurrentSpace } from '../lock/keys';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { setThroughTor } from '../lib/relay';
import {
  defaultMatrixHttp,
  findHomeserver,
  isMatrixId,
  matrixThroughTor,
  joinRoom,
  roomList,
  sendEvent,
  sendStateEvent,
  sendText,
  sendToDeviceSealed,
  setCallHandler,
  setMatrixHttp,
  signIn,
  startChat,
  sync,
  type CallEvent,
  type MatrixRequest,
  type MatrixState,
} from '../lib/matrix';
import { ChangedFileError, decryptFile, encryptFile, fetchFile, MATRIX_MOST, MatrixFileTooLargeError, mimeOfName, sendFile } from '../lib/matrix-media';
import { inboxParts, matrixInboxRows, showsIn } from '../lib/inbox';
import { backUpKeys, keyOfRecovery, recoveryKeyOf, setUpRecovery, unlockRecovery, WrongRecoveryError } from '../lib/matrix-backup';
import { acceptVerification, confirmVerification, isVerified, requestVerification, verifications } from '../lib/matrix-verify';
import { matrixNow, matrixRead, matrixSignIn, matrixUnread, runMatrix, stopMatrix } from '../lib/matrix-store';
import { onNetworkMessage, onNetworkRead } from '../lib/network-notices';
import { Homeserver, HS, PASSWORD, type Json } from './matrix-server';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
// A core built before Matrix has no `matrix` call: built again, it has.
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).matrix === 'function';
if (!coreReady) console.log('Skipping the Matrix checks: build the core first with node checks/build-core.mjs');

const server = new Homeserver();

// Each step keeps the state as the app does: as JSON, then read back.
const kept = (state: MatrixState): MatrixState => JSON.parse(JSON.stringify(state)) as MatrixState;

let wasmCore: Core | null = null;

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  wasmCore = Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core;
  setCore(wasmCore);
  setMatrixHttp(async (request) => server.answer(request));
});

after(() => setCore(null));

test('Matrix IDs and homeservers', { skip: !coreReady }, async () => {
  assert.ok(isMatrixId('@nekten:matrix.org'));
  assert.ok(!isMatrixId('nekten'));
  assert.equal(await findHomeserver('@nekten:matrix.example.org'), HS);
  assert.equal(await findHomeserver('https://matrix.example.org/'), HS);
});

test('a wrong password signs nobody in', { skip: !coreReady }, async () => {
  await assert.rejects(signIn(HS, 'alice', 'wrong'), /Invalid password/);
});

test('two people chat encrypted, and a device that comes later reads only from then on', { skip: !coreReady }, async () => {
  let alice = kept(await signIn(HS, '@alice:example.org', PASSWORD));
  let bob = kept(await signIn(HS, 'bob', PASSWORD));
  assert.equal(alice.userId, '@alice:example.org');

  // Cross-signing was set up with the password asked again, and signs Alice's device.
  assert.ok(alice.crossSigning);
  const aliceKeys = server.deviceKeys.get(alice.userId)!.get(alice.deviceId)!;
  assert.equal(Object.keys(aliceKeys.signatures[alice.userId]).length, 2);
  assert.ok(server.master.has(alice.userId));

  const room = await startChat(alice, '@bob:example.org');
  alice = kept(alice);
  assert.ok(room.encrypted);
  assert.deepEqual(server.direct.get(alice.userId), { '@bob:example.org': [room.id] });

  await sync(bob, 0);
  bob = kept(bob);
  assert.equal(bob.rooms[room.id].invitedBy, alice.userId);
  assert.equal(roomList(bob)[0].id, room.id);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  bob = kept(bob);

  await sync(alice, 0);
  const first = await sendText(alice, room.id, 'γεια σου, Bob');
  alice = kept(alice);
  assert.equal(first.state, undefined);
  // The server holds ciphertext only.
  assert.ok(!JSON.stringify(server.log).includes('γεια'));
  const onServer = server.log.find((l) => l.event.event_id === first.id)!.event;
  assert.equal(onServer.type, 'm.room.encrypted');

  assert.ok(await sync(bob, 0));
  bob = kept(bob);
  assert.deepEqual(
    bob.rooms[room.id].messages.map((m) => [m.sender, m.text]),
    [[alice.userId, 'γεια σου, Bob']],
  );

  await sendText(bob, room.id, 'καλώς σε βρήκα');
  bob = kept(bob);
  await sync(alice, 0);
  await sync(bob, 0);
  alice = kept(alice);
  bob = kept(bob);
  const texts = (s: MatrixState) => s.rooms[room.id].messages.map((m) => m.text);
  assert.deepEqual(texts(alice), ['γεια σου, Bob', 'καλώς σε βρήκα']);
  assert.deepEqual(texts(bob), ['γεια σου, Bob', 'καλώς σε βρήκα']);

  // The same ciphertext again under another ID is not read twice.
  server.replay(first.id);
  await sync(bob, 0);
  bob = kept(bob);
  assert.deepEqual(texts(bob).filter((t) => t === 'γεια σου, Bob').length, 1);

  // Bob signs in on a second device: Alice's next message reaches it, the earlier ones stay locked.
  let bob2 = kept(await signIn(HS, 'bob', PASSWORD));
  assert.equal(bob2.crossSigning, undefined);
  await sync(alice, 0);
  await sendText(alice, room.id, 'και στη νέα σου συσκευή');
  alice = kept(alice);
  await sync(bob2, 0);
  bob2 = kept(bob2);
  const seen = bob2.rooms[room.id].messages;
  assert.equal(seen.at(-1)!.text, 'και στη νέα σου συσκευή');
  assert.ok(seen.filter((m) => m.locked).length >= 2);
  // Bob's first device reads it too, with the key it already had.
  await sync(bob, 0);
  assert.equal(bob.rooms[room.id].messages.at(-1)!.text, 'και στη νέα σου συσκευή');
});

test("a call's events reach the calls, opened: in the room, in its state, and to one device", { skip: !coreReady }, async () => {
  let hana = kept(await signIn(HS, 'hana', PASSWORD));
  let ivan = kept(await signIn(HS, 'ivan', PASSWORD));
  const room = await startChat(hana, '@ivan:example.org');
  await sync(ivan, 0);
  await joinRoom(ivan, room.id);
  await sync(ivan, 0);
  await sync(hana, 0);
  hana = kept(hana);
  ivan = kept(ivan);
  const got: CallEvent[] = [];
  setCallHandler(async (_state, event) => {
    got.push(event);
    return true;
  });
  try {
    await sendEvent(hana, room.id, 'm.call.invite', { call_id: 'c1', version: '1', lifetime: 60000, offer: { type: 'offer', sdp: 'v=0 secret-offer' } });
    const member = `_${hana.userId}_${hana.deviceId}_m.call`;
    await sendStateEvent(hana, room.id, 'org.matrix.msc3401.call.member', member, { application: 'm.call', call_id: '', device_id: hana.deviceId, scope: 'm.room' });
    await sendToDeviceSealed(hana, 'io.element.call.encryption_keys', { [ivan.userId]: { '*': { keys: [{ index: 0, key: 'media-key-1' }], room_id: room.id } } });
    hana = kept(hana);
    // The ring and the media's key are encrypted on the way; the room's call members are its state, as Matrix has them.
    assert.ok(!JSON.stringify(server.log).includes('secret-offer'));
    assert.ok(!JSON.stringify([...server.toDevice.values()]).includes('media-key-1'));
    assert.ok(await sync(ivan, 0));
    ivan = kept(ivan);
    assert.deepEqual(
      got.map((e) => [e.type, e.sender, e.roomId, e.stateKey, e.senderDevice]),
      [
        ['io.element.call.encryption_keys', hana.userId, undefined, undefined, hana.deviceId],
        ['m.call.invite', hana.userId, room.id, undefined, undefined],
        ['org.matrix.msc3401.call.member', hana.userId, room.id, member, undefined],
      ],
    );
    assert.equal(got[0].content.keys && (got[0].content.keys as { key: string }[])[0].key, 'media-key-1');
    assert.equal((got[1].content.offer as { sdp: string }).sdp, 'v=0 secret-offer');
    assert.ok(got[1].eventId?.startsWith('$'));
    // A call's events are no message of their own.
    assert.deepEqual(ivan.rooms[room.id].messages, []);
  } finally {
    setCallHandler(null);
  }
});

test('a photo goes encrypted, comes back whole, and a changed one is refused', { skip: !coreReady }, async () => {
  let alice = kept(await signIn(HS, '@alice:example.org', PASSWORD));
  let bob = kept(await signIn(HS, 'bob', PASSWORD));
  const room = await startChat(alice, '@bob:example.org');
  alice = kept(alice);
  await sync(bob, 0);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  bob = kept(bob);
  await sync(alice, 0);

  const photo = new TextEncoder().encode('JPEG of the sea at Kalamata '.repeat(40));
  await sendFile(alice, room.id, { name: 'sea.jpg', mime: 'image/jpeg', bytes: photo, w: 400, h: 300 });
  alice = kept(alice);
  // The homeserver keeps only ciphertext, and its name tells nothing.
  const stored = [...server.media.values()].at(-1)!;
  assert.equal(stored.length, photo.length);
  assert.ok(!new TextDecoder().decode(stored).includes('Kalamata'));
  assert.ok(!JSON.stringify(server.log).includes('sea.jpg'));

  await sync(bob, 0);
  bob = kept(bob);
  const message = bob.rooms[room.id].messages.at(-1)!;
  assert.equal(message.file?.kind, 'image');
  assert.equal(message.file?.name, 'sea.jpg');
  assert.deepEqual([message.file?.w, message.file?.h], [400, 300]);
  assert.deepEqual(await fetchFile(bob, message.file!), photo);

  // One byte changed on the server: the hash no longer matches.
  stored[0] ^= 1;
  await assert.rejects(fetchFile(bob, message.file!), ChangedFileError);
});

test('Matrix files: encrypted as other apps read them, too large ones refused', { skip: !coreReady }, async () => {
  const bytes = new Uint8Array(1000).map((_, i) => i % 251);
  const { data, file } = encryptFile(bytes);
  assert.equal(file.v, 'v2');
  assert.match(file.key.k, /^[A-Za-z0-9_-]{43}$/);
  assert.match(file.iv, /^[A-Za-z0-9+/]{22}$/);
  // The counter's lower half starts at zero.
  assert.ok(Buffer.from(file.iv + '==', 'base64').subarray(8).every((b) => b === 0));
  assert.deepEqual(decryptFile(data, file), bytes);
  const alice = kept(await signIn(HS, '@alice:example.org', PASSWORD));
  await assert.rejects(sendFile(alice, '!none:example.org', { name: 'big', mime: 'application/zip', bytes: new Uint8Array(MATRIX_MOST + 1) }), MatrixFileTooLargeError);
  assert.equal(mimeOfName('Report.PDF'), 'application/pdf');
});

test('Matrix rooms are rows of the home list, with a part of their own', () => {
  const state = {
    userId: '@me:example.org',
    rooms: {
      '!a:example.org': { id: '!a:example.org', name: 'Anna', members: {}, encrypted: true, direct: true, unread: 2, messages: [{ id: '$1', sender: '@anna:example.org', ts: 5000, text: 'hi\nthere' }] },
      '!b:example.org': { id: '!b:example.org', name: 'Club', members: { '@bo:example.org': { membership: 'join', name: 'Bo' } }, encrypted: true, direct: false, unread: 0, messages: [], invitedBy: '@bo:example.org' },
    },
  } as unknown as MatrixState;
  const rows = matrixInboxRows(state, 9000);
  const anna = rows.find((r) => r.identity === 'matrix:!a:example.org')!;
  assert.deepEqual([anna.last, anna.unread, anna.at, anna.mine, anna.network], ['hi\nthere', 2, 5000, false, 'matrix']);
  const club = rows.find((r) => r.invited)!;
  assert.deepEqual([club.last, club.unread, club.at], ['Invited by Bo', 1, 9000]);
  assert.deepEqual([showsIn(anna, 'matrix'), showsIn(anna, 'erevos'), showsIn(anna, 'sms'), showsIn(anna, 'all')], [true, false, false, true]);
  assert.deepEqual(inboxParts([], true), ['matrix']);
  assert.deepEqual(inboxParts(rows, false), ['matrix']);
});

test('two people check each other by emoji in their chat, and see the same seven', { skip: !coreReady }, async () => {
  const alice = await signIn(HS, '@dave:example.org', PASSWORD);
  const bob = await signIn(HS, 'erin', PASSWORD);
  const room = await startChat(alice, bob.userId);
  await sync(bob, 0);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  await sync(alice, 0);

  const asked = await requestVerification(alice, bob.userId, room.id);
  await sync(bob, 0);
  const theirs = verifications(bob).find((v) => v.id === asked.id)!;
  assert.equal(theirs.phase, 'asked');
  assert.equal(bob.rooms[room.id].messages.at(-1)!.text, 'Asked to check devices by emoji.');
  await acceptVerification(bob, asked.id);
  // ready → start → accept → key → key: each side syncs in turn.
  for (let i = 0; i < 3; i++) {
    await sync(alice, 0);
    await sync(bob, 0);
  }
  assert.equal(asked.phase, 'compare');
  assert.equal(theirs.phase, 'compare');
  assert.equal(asked.emoji!.length, 7);
  assert.deepEqual(asked.emoji, theirs.emoji);
  // Nothing of it is readable on the server.
  assert.ok(!JSON.stringify(server.log).includes('m.key.verification.key'));

  await confirmVerification(alice, asked.id, true);
  await sync(bob, 0);
  await confirmVerification(bob, asked.id, true);
  await sync(alice, 0);
  assert.equal(theirs.phase, 'done');
  assert.equal(asked.phase, 'done');
  assert.ok(isVerified(alice, bob.userId, bob.deviceId));
  assert.ok(isVerified(bob, alice.userId, alice.deviceId));
  assert.ok(alice.verified![bob.userId].master);
  // Alice's user-signing key signed Bob's master key (Dave and Erin, new here, made theirs).
  assert.equal(Object.keys(server.master.get(bob.userId)!.signatures[alice.userId] ?? {}).length, 1);

  // Pictures that do not match stop the check on both sides.
  const again = await requestVerification(bob, alice.userId, room.id);
  await sync(alice, 0);
  await acceptVerification(alice, again.id);
  for (let i = 0; i < 3; i++) {
    await sync(bob, 0);
    await sync(alice, 0);
  }
  assert.equal(again.phase, 'compare');
  await confirmVerification(bob, again.id, false);
  await sync(alice, 0);
  assert.equal(again.phase, 'cancelled');
  assert.equal(verifications(alice).find((v) => v.id === again.id)!.phase, 'cancelled');
});

test('a new device of ours is checked by emoji from one that holds our cross-signing keys', { skip: !coreReady }, async () => {
  const carol = await signIn(HS, '@carol:example.org', PASSWORD);
  const carol2 = await signIn(HS, 'carol', PASSWORD);
  assert.ok(carol.crossSigning);
  assert.equal(carol2.crossSigning, undefined);
  const asked = await requestVerification(carol2, carol.userId);
  await sync(carol, 0);
  await sync(carol2, 0);
  const theirs = verifications(carol).find((v) => v.id === asked.id)!;
  assert.equal(theirs.deviceId, carol2.deviceId);
  await acceptVerification(carol, asked.id);
  for (let i = 0; i < 3; i++) {
    await sync(carol2, 0);
    await sync(carol, 0);
  }
  assert.deepEqual(asked.emoji, theirs.emoji);
  await confirmVerification(carol, asked.id, true);
  await sync(carol2, 0);
  await confirmVerification(carol2, asked.id, true);
  await sync(carol, 0);
  assert.deepEqual([asked.phase, theirs.phase], ['done', 'done']);
  assert.ok(isVerified(carol, carol.userId, carol2.deviceId));
  // The first device's self-signing key now signs the new one, so other apps see it checked.
  const signatures = server.deviceKeys.get(carol.userId)!.get(carol2.deviceId)!.signatures[carol.userId];
  assert.equal(Object.keys(signatures).length, 2);
});

test('Security Keys are written and read as Element does', () => {
  const key = new Uint8Array(32).map((_, i) => i * 7);
  const words = recoveryKeyOf(key);
  assert.match(words, /^Es[1-9A-HJ-NP-Za-km-z]{2}( [1-9A-HJ-NP-Za-km-z]{4}){11}$/);
  assert.deepEqual(keyOfRecovery(words), key);
  assert.deepEqual(keyOfRecovery(words.replace(/ /g, '')), key);
  // One letter changed fails the parity byte (or the prefix).
  const typo = words.slice(0, 10) + (words[10] === 'a' ? 'b' : 'a') + words.slice(11);
  assert.equal(keyOfRecovery(typo), null);
});

test('a Security Key set up on one device opens the cross-signing keys and earlier messages on a new one', { skip: !coreReady }, async () => {
  const frank = await signIn(HS, '@frank:example.org', PASSWORD);
  const gina = await signIn(HS, '@gina:example.org', PASSWORD);
  const words = await setUpRecovery(frank);
  assert.ok(keyOfRecovery(words));
  assert.ok(frank.backup);
  // The server keeps the secrets only encrypted.
  const stored = JSON.stringify([...server.accountData.values()]);
  assert.ok(!stored.includes(frank.crossSigning!.master) && !stored.includes(frank.backup.secret));

  const room = await startChat(frank, gina.userId);
  await sync(gina, 0);
  await joinRoom(gina, room.id);
  await sync(gina, 0);
  await sync(frank, 0);
  await sendText(frank, room.id, 'before the new phone');
  assert.equal(await backUpKeys(frank), 1);
  assert.equal(await backUpKeys(frank), 0);

  const frank2 = await signIn(HS, 'frank', PASSWORD);
  await sync(frank2, 0);
  assert.ok(frank2.rooms[room.id].messages.some((m) => m.locked));
  await assert.rejects(unlockRecovery(frank2, recoveryKeyOf(new Uint8Array(32))), WrongRecoveryError);
  const unlocked = await unlockRecovery(frank2, words);
  assert.deepEqual(unlocked, { crossSigning: true, backup: true, opened: 1 });
  assert.equal(frank2.rooms[room.id].messages.find((m) => m.text === 'before the new phone')?.sender, frank.userId);
  assert.equal(frank2.crossSigning!.master, frank.crossSigning!.master);
  // The new device signed itself with the account's self-signing key, so Element trusts it.
  assert.equal(Object.keys(server.deviceKeys.get(frank.userId)!.get(frank2.deviceId)!.signatures[frank.userId]).length, 2);
  await assert.rejects(setUpRecovery(frank2), /already has a Security Key/);
});

async function until(done: () => boolean, what: string, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error(`Waited in vain for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('signed in, the first sync tells of nothing from before; a message after it does, and its reading', { skip: !coreReady }, async () => {
  let cleo = await signIn(HS, 'cleo', PASSWORD);
  const dan = await signIn(HS, 'dan', PASSWORD);
  const room = await startChat(cleo, '@dan:example.org');
  await sync(dan, 0);
  await joinRoom(dan, room.id);
  await sync(dan, 0);
  await sync(cleo, 0);
  await sendText(cleo, room.id, 'πριν');
  cleo = kept(cleo);

  const came: [string, number][] = [];
  const read: string[][] = [];
  const stopCame = onNetworkMessage((where, times) => came.push([where, times]));
  const stopRead = onNetworkRead((where) => read.push(where));
  // The homeserver here answers at once: a sync that would wait a while waits a little, as the
  // store syncs on and on.
  setMatrixHttp(async (request) => {
    if (request.url.includes('/sync?timeout=30000')) await new Promise((resolve) => setTimeout(resolve, 20));
    return server.answer(request);
  });
  setCurrentSpace(8, randomBytes(32));
  const where = `matrix:${room.id}`;
  try {
    runMatrix();
    await until(() => matrixNow().loaded, 'the account to load');
    await matrixSignIn('dan', PASSWORD, HS);
    await until(() => matrixUnread() === 1, 'the first sync');
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.deepEqual(came, []);

    await sync(cleo, 0);
    await sendText(cleo, room.id, 'τώρα');
    await until(() => matrixUnread() === 2, 'the new message');
    assert.deepEqual(came, [[where, 1]]);
    await matrixRead(room.id);
    assert.deepEqual(read, [[where]]);
    // The homeserver has it read too: the next sync says none.
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(matrixUnread(), 0);
    assert.deepEqual(came, [[where, 1]]);
  } finally {
    stopCame();
    stopRead();
    stopMatrix();
    setCurrentSpace(null);
    setMatrixHttp(async (request) => server.answer(request));
  }
});

test("Matrix goes through Tor as the space's Tor way says", async () => {
  const sent: { head: Json; body: string }[] = [];
  const fake = {
    torRequest: async () => new Uint8Array(0),
    torHttp: async (head: string, body: Uint8Array) => {
      sent.push({ head: JSON.parse(head) as Json, body: new TextDecoder().decode(body) });
      return new Uint8Array([0x01, 0x91, ...new TextEncoder().encode('{"errcode":"M_FORBIDDEN"}')]);
    },
  } as unknown as Core;
  setCore(fake);
  setThroughTor('all');
  try {
    const answer = await defaultMatrixHttp({ method: 'POST', url: `${HS}/_matrix/client/v3/login`, body: { a: 1 }, token: 'tok' });
    assert.deepEqual(answer, { status: 401, json: { errcode: 'M_FORBIDDEN' } });
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].head, { method: 'POST', url: `${HS}/_matrix/client/v3/login`, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' } });
    assert.equal(sent[0].body, '{"a":1}');
    assert.ok(matrixThroughTor());
    // With the way 'messages' and Tor not ready yet, it goes straight, as Erevos's own messages do.
    setThroughTor('messages');
    assert.equal(matrixThroughTor(), false);
    // With no Tor in the build, the way 'all' sends nothing.
    setCore({} as Core);
    setThroughTor('all');
    await assert.rejects(defaultMatrixHttp({ method: 'GET', url: `${HS}/x` }), /Tor is not ready/);
  } finally {
    setThroughTor('off');
    setCore(wasmCore);
  }
});

