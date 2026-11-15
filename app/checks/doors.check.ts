// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A closed space that says a message came while another is open (lock/doors.ts,
// lib/closed-notices.ts): every space has its entry, of one size whether its door is open or not
// and however many contacts' queues it keeps, entries from before sealed again at that size, and
// none shows its queues; the open space waits on the other spaces' doors only, their contacts'
// queues too, is told of each message once, word between phones never, what came while that
// space was open not once it closes, and nothing once its door is shut or a queue is gone; the
// open space's door follows its contacts as they take queues of their own; a closed space's Matrix
// account pushes through the relay to a queue its door names (lib/matrix-push.ts). The relay part
// runs with a real relay, and is skipped, with a note, without one.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { doorBunches, doorOf, followDoor, keepDoor, MATRIX_PUSH_GROUP, startClosedNotices } from '../lib/closed-notices';
import { setMatrixHttp, type MatrixState } from '../lib/matrix';
import { keepMatrixPush, MATRIX_PUSH_APP, startMatrixPush, stopMatrixPush } from '../lib/matrix-push';
import { encryptText, fromHex, randomBytes } from '../lib/crypto';
import { networkChanged } from '../lib/network-change';
import { createQueue, deleteQueue, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { spacesSign } from '../lib/unread-signs';
import { DOOR_CONTACTS, hearDoorAll, loadDoor, onDoorsCame, openDoors, prepareDoors, saveDoor, type Door } from '../lock/doors';
import { EMPTY_E2E, saveE2EData, type E2EData } from '../lock/e2e-data';
import { heardText } from '../lock/hidden-watch';
import { newSpaceKey, setCurrentSpace } from '../lock/keys';
import { saveMatrix } from '../lock/matrix-data';
import { EMPTY_SPACE, loadSpaceData, saveSpaceData } from '../lock/space-data';
import { Homeserver, HS, PASSWORD } from './matrix-server';
import { ready as relayReady, relayNote, startRelay } from './real-relay';
import { store } from './secure-memory';
import { editionName } from '../lib/edition';

relayNote('the closed spaces notice checks through a relay');

const until = async (done: () => boolean, ms = 5_000) => {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
const settle = () => new Promise((r) => setTimeout(r, 400));

test('every space has its entry, of one size with its door open or shut, and none shows its queues', async () => {
  store.clear();
  await prepareDoors();
  const names = [...store.keys()].filter((name) => name.startsWith('erevos.door.')).sort();
  assert.deepEqual(names, ['erevos.door.0', 'erevos.door.1', 'erevos.door.2', 'erevos.door.3']);
  assert.ok(store.has('erevos.doors-key'));
  const shut = store.get('erevos.door.2')!.length;
  const recipientHex = 'ab'.repeat(24);
  await saveDoor(2, { tor: 'messages', queues: [{ url: 'wss://relay.example', token: 't'.repeat(43), recipientHex }] });
  assert.equal(store.get('erevos.door.2')!.length, shut);
  assert.ok(!store.get('erevos.door.2')!.includes(recipientHex));
  assert.deepEqual(await loadDoor(2), { tor: 'messages', queues: [{ url: 'wss://relay.example', token: 't'.repeat(43), recipientHex }] });
  assert.equal(await loadDoor(1), null);
  // The open space waits on the others' doors, never its own.
  assert.deepEqual((await openDoors(0)).map((found) => found.space), [2]);
  assert.deepEqual(await openDoors(2), []);
  await saveDoor(2, null);
  assert.equal(await loadDoor(2), null);
  assert.equal(store.get('erevos.door.2')!.length, shut);
});

const hex = (n: number, width = 48) => n.toString(16).padStart(width, '0');

test("a door keeps its contacts' queues, as many as fit, at the same size, and one from before is sealed again at it", async () => {
  store.clear();
  await prepareDoors();
  const shut = store.get('erevos.door.1')!.length;
  const queue = { url: 'wss://relay.example', token: 't'.repeat(43), recipientHex: 'ab'.repeat(24) };
  const contacts = Array.from({ length: DOOR_CONTACTS + 16 }, (_, i) => ({ r: hex(i + 1), g: Math.floor(i / 8) }));
  await saveDoor(1, { tor: 'messages', queues: [queue], contacts: { url: queue.url, queues: contacts } });
  assert.equal(store.get('erevos.door.1')!.length, shut);
  assert.ok(!store.get('erevos.door.1')!.includes(hex(1)));
  const kept = (await loadDoor(1))!;
  assert.deepEqual(kept.contacts, { url: queue.url, queues: contacts.slice(0, DOOR_CONTACTS) });
  // Through Tor, in the groups the open space reads them in, each on a way named for that space.
  assert.deepEqual(
    doorBunches(1, kept).map((b) => [b.way, b.queues.length]),
    Array.from({ length: DOOR_CONTACTS / 8 }, (_, g) => [`door-1-${g}`, 8]),
  );
  assert.deepEqual(doorBunches(1, { ...kept, tor: 'off' }).map((b) => [b.way, b.queues.length]), [['door-1', DOOR_CONTACTS]]);
  // At a relay of a long address, with tokens far longer than any, they do not all fit: the last
  // contacts are left out, and the entry stays as long.
  const far = `wss://${'r'.repeat(400)}.example`;
  await saveDoor(1, {
    tor: 'off',
    queues: [0, 1, 2, 3].map((i) => ({ url: far, token: 't'.repeat(1500), recipientHex: hex(900 + i) })),
    contacts: { url: far, queues: contacts },
  });
  assert.equal(store.get('erevos.door.1')!.length, shut);
  const trimmed = (await loadDoor(1))!;
  assert.equal(trimmed.queues.length, 4);
  assert.ok(trimmed.contacts!.queues.length > 0 && trimmed.contacts!.queues.length < DOOR_CONTACTS);
  // Queues alone too long to fit, with tokens longer still: the door stays shut, as long as the others.
  await saveDoor(1, { tor: 'off', queues: [0, 1, 2, 3].map((i) => ({ url: far, token: 't'.repeat(3000), recipientHex: hex(900 + i) })) });
  assert.equal(store.get('erevos.door.1')!.length, shut);
  assert.equal(await loadDoor(1), null);
  // Written only while open, as when a space follows its contacts: a shut door stays shut.
  await saveDoor(1, { tor: 'off', queues: [queue] }, true, true);
  assert.equal(await loadDoor(1), null);
  // A relay's address in other letters, more bytes each: the same length still.
  await saveDoor(1, { tor: 'off', queues: [{ ...queue, url: 'wss://ρελέ.παράδειγμα' }], contacts: { url: 'wss://ρελέ.παράδειγμα', queues: contacts } });
  assert.equal(store.get('erevos.door.1')!.length, shut);
  assert.equal((await loadDoor(1))!.contacts!.queues.length, DOOR_CONTACTS);
  // What was heard of a contact's queue kept again stays, unless all is heard anew.
  const news = { round: 7, messages: 2, unmarked: 0, rings: 1 };
  await saveDoor(1, { tor: 'off', queues: [queue], contacts: { url: queue.url, queues: [{ r: hex(1), g: 0 }] } });
  await hearDoorAll(1, [{ recipientHex: hex(1), news }, { recipientHex: queue.recipientHex, news }]);
  const heard = heardText(news);
  assert.deepEqual(await loadDoor(1), { tor: 'off', queues: [{ ...queue, heard }], contacts: { url: queue.url, queues: [{ r: hex(1), g: 0, heard }] } });
  await saveDoor(1, { tor: 'off', queues: [queue], contacts: { url: queue.url, queues: [{ r: hex(1), g: 0 }, { r: hex(2), g: 0 }] } });
  assert.deepEqual((await loadDoor(1))!.contacts!.queues, [{ r: hex(1), g: 0, heard }, { r: hex(2), g: 0 }]);
  await saveDoor(1, { tor: 'off', queues: [queue], contacts: { url: queue.url, queues: [{ r: hex(1), g: 0 }] } }, true);
  assert.deepEqual(await loadDoor(1), { tor: 'off', queues: [queue], contacts: { url: queue.url, queues: [{ r: hex(1), g: 0 }] } });

  // Entries from before contacts' queues, two blocks long: sealed again at the length all have now,
  // the open door with what it named, the shut one shut.
  const doorKey = fromHex(store.get('erevos.doors-key')!);
  const old = (key: Uint8Array, door: Door | null) => encryptText(key, JSON.stringify(door ?? []).padEnd(2048, ' '));
  store.set('erevos.door.2', old(doorKey, { tor: 'off', queues: [queue] }));
  store.set('erevos.door.3', old(randomBytes(32), null));
  assert.notEqual(store.get('erevos.door.2')!.length, shut);
  await prepareDoors();
  assert.equal(store.get('erevos.door.2')!.length, shut);
  assert.equal(store.get('erevos.door.3')!.length, shut);
  assert.deepEqual(await loadDoor(2), { tor: 'off', queues: [queue] });
  assert.equal(await loadDoor(3), null);
  // Spaces past SLOTS, made by second passwords, are sealed again too, open or shut: none is left
  // at the old length to show which of them let themselves be heard.
  store.set('erevos.door.4', old(doorKey, { tor: 'off', queues: [queue] }));
  store.set('erevos.door.5', old(randomBytes(32), null));
  await prepareDoors();
  assert.equal(store.get('erevos.door.4')!.length, shut);
  assert.equal(store.get('erevos.door.5')!.length, shut);
  assert.deepEqual(await loadDoor(4), { tor: 'off', queues: [queue] });
  assert.equal(await loadDoor(5), null);
  assert.ok(!store.has('erevos.door.6'));
});

test("a closed space's door names the queues it reads on, and tells of each message once", { skip: !relayReady }, async () => {
  store.clear();
  await prepareDoors();
  const url = await startRelay();
  const [open, closed] = [newSpaceKey(), newSpaceKey()];
  const ids = await createQueue({ url });
  await saveSpaceData(1, closed, { ...EMPTY_SPACE, url, tor: 'off', ownQueue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } });
  const door = await doorOf(1, closed);
  assert.deepEqual(door, { tor: 'off', queues: [{ url, token: '', recipientHex: toHex(ids.recipientId) }] });
  await saveDoor(1, door);

  // What came while that space was open was read there: heard as it closes, not told of.
  await sendMessage({ url }, ids.senderId, Uint8Array.of(1), 'message');
  await keepDoor(1, closed, true);
  setCurrentSpace(0, open);
  let told: number[] = [];
  let stop = startClosedNotices((count, space) => (told = [...told, ...Array<number>(count).fill(space)]));
  try {
    await settle();
    assert.deepEqual(told, []);
    // That a message came, or was read: nothing.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(9), 'quiet');
    await settle();
    assert.deepEqual(told, []);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(2), 'message');
    await until(() => told.length === 1);
    assert.deepEqual(told, [1]);
    // Started anew: what was told of is kept, not told again.
    stop();
    stop = startClosedNotices((count, space) => (told = [...told, ...Array<number>(count).fill(space)]));
    await settle();
    assert.equal(told.length, 1);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(3), 'message');
    await until(() => told.length === 2);
    // Taken once that space opened, what comes after counts anew.
    stop();
    while (await receiveMessage({ url }, ids.recipientId));
    await keepDoor(1, closed, true);
    stop = startClosedNotices((count, space) => (told = [...told, ...Array<number>(count).fill(space)]));
    await settle();
    assert.equal(told.length, 2);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(4), 'message');
    await until(() => told.length === 3);
    // Shut, it says nothing more.
    stop();
    await saveDoor(1, null);
    await keepDoor(1, closed, true);
    assert.equal(await loadDoor(1), null);
    stop = startClosedNotices((count, space) => (told = [...told, ...Array<number>(count).fill(space)]));
    await sendMessage({ url }, ids.senderId, Uint8Array.of(5), 'message');
    await settle();
    assert.equal(told.length, 3);
  } finally {
    stop();
    setCurrentSpace(null);
  }
});

test("a closed space that asks for the dot keeps that a message came, at the same size, until it opens", { skip: !relayReady }, async () => {
  store.clear();
  await prepareDoors();
  const shut = store.get('erevos.door.1')!.length;
  const url = await startRelay();
  const [open, closed, quiet] = [newSpaceKey(), newSpaceKey(), newSpaceKey()];
  const ids = await createQueue({ url });
  const others = await createQueue({ url });
  await saveSpaceData(1, closed, { ...EMPTY_SPACE, url, tor: 'off', sign: true, ownQueue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } });
  // Space 2 says a message came too, with no dot.
  await saveSpaceData(2, quiet, { ...EMPTY_SPACE, url, tor: 'off', ownQueue: { recipientHex: toHex(others.recipientId), senderHex: toHex(others.senderId) } });
  const door = await doorOf(1, closed);
  assert.equal(door?.sign, true);
  assert.equal((await doorOf(2, quiet))?.sign, undefined);
  await saveDoor(1, door);
  await saveDoor(2, await doorOf(2, quiet));
  await keepDoor(1, closed, true);
  await keepDoor(2, quiet, true);
  setCurrentSpace(0, open);
  let came = 0;
  const unlisten = onDoorsCame(() => came++);
  let told: number[] = [];
  const stop = startClosedNotices((count, space) => (told = [...told, ...Array<number>(count).fill(space)]));
  try {
    await settle();
    assert.equal(await spacesSign(), false);
    await sendMessage({ url }, others.senderId, Uint8Array.of(1), 'message');
    await until(() => told.length === 1);
    assert.equal(await spacesSign(), false);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(2), 'message');
    await until(() => told.length === 2);
    assert.equal(await spacesSign(), true);
    assert.equal(came, 1);
    assert.equal((await loadDoor(2))?.came, undefined);
    // Its entry is as long as any.
    assert.equal(store.get('erevos.door.1')!.length, shut);
    // Another message: nothing more to keep.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(3), 'message');
    await until(() => told.length === 3);
    assert.equal(came, 1);
    // It opens: what came is read there, and the dot goes.
    stop();
    setCurrentSpace(1, closed);
    while (await receiveMessage({ url }, ids.recipientId));
    await keepDoor(1, closed);
    assert.equal((await loadDoor(1))?.came, undefined);
    assert.equal((await loadDoor(1))?.sign, true);
    setCurrentSpace(0, open);
    assert.equal(await spacesSign(), false);
    // A door the space no longer asks a dot of says none.
    await saveSpaceData(1, closed, { ...(await loadSpaceData(1, closed)), sign: false });
    await followDoor(1, closed);
    assert.equal((await loadDoor(1))?.sign, undefined);
  } finally {
    stop();
    unlisten();
    setCurrentSpace(null);
  }
});

// A contact as the space keeps them, with a queue of their own at `url`.
const contactWith = (n: number, ids: { recipientId: Uint8Array; senderId: Uint8Array }, url: string) => ({
  identity: hex(n, 64),
  mine: { r: toHex(ids.recipientId), s: toHex(ids.senderId), u: url, qa: 1, g: 0 },
});
const chatsWith = (contacts: ReturnType<typeof contactWith>[]) => ({ ...EMPTY_E2E, contacts }) as unknown as E2EData;

test("a closed space's door names its contacts' queues, tells of their messages once, follows them, and lets one gone go", { skip: !relayReady }, async () => {
  store.clear();
  await prepareDoors();
  const url = await startRelay();
  const [open, closed] = [newSpaceKey(), newSpaceKey()];
  const own = await createQueue({ url });
  const [bob, carol] = [await createQueue({ url }), await createQueue({ url })];
  await saveSpaceData(1, closed, { ...EMPTY_SPACE, url, tor: 'off', ownQueue: { recipientHex: toHex(own.recipientId), senderHex: toHex(own.senderId) } });
  await saveE2EData('space', 1, closed, chatsWith([contactWith(1, bob, url)]));
  const door = (await doorOf(1, closed))!;
  assert.deepEqual(door.contacts, { url, queues: [{ r: toHex(bob.recipientId), g: 0 }] });
  // Shut, the door follows nothing.
  await followDoor(1, closed);
  assert.equal(await loadDoor(1), null);
  await saveDoor(1, door);

  // While the space is open a contact takes a queue of their own: the door names it, and is not
  // written again while nothing changed.
  await saveE2EData('space', 1, closed, chatsWith([contactWith(1, bob, url), contactWith(2, carol, url)]));
  await followDoor(1, closed);
  assert.deepEqual((await loadDoor(1))!.contacts!.queues.map((q) => q.r), [toHex(bob.recipientId), toHex(carol.recipientId)]);
  const written = store.get('erevos.door.1');
  await followDoor(1, closed);
  assert.equal(store.get('erevos.door.1'), written);

  // What came to a contact's queue while that space was open was read there: heard as it closes.
  await sendMessage({ url }, bob.senderId, Uint8Array.of(1), 'message');
  await keepDoor(1, closed, true);
  assert.ok((await loadDoor(1))!.contacts!.queues[0]!.heard);
  setCurrentSpace(0, open);
  let told: number[] = [];
  const telling = () => startClosedNotices((count, space) => (told = [...told, ...Array<number>(count).fill(space)]));
  let stop = telling();
  try {
    await settle();
    assert.deepEqual(told, []);
    // Word between phones: nothing.
    await sendMessage({ url }, carol.senderId, Uint8Array.of(9), 'quiet');
    await settle();
    assert.deepEqual(told, []);
    await sendMessage({ url }, carol.senderId, Uint8Array.of(2), 'message');
    await until(() => told.length === 1);
    await sendMessage({ url }, bob.senderId, Uint8Array.of(3), 'message');
    await until(() => told.length === 2);
    assert.deepEqual(told, [1, 1]);
    // Started anew: what was told of is kept, not told again.
    stop();
    stop = telling();
    await settle();
    assert.equal(told.length, 2);
    // A contact deleted while that space was closed: their queue is let go, the others still tell.
    await deleteQueue({ url }, bob.recipientId);
    await settle();
    await sendMessage({ url }, carol.senderId, Uint8Array.of(4), 'message');
    await until(() => told.length === 3);
    await sendMessage({ url }, own.senderId, Uint8Array.of(5), 'message');
    await until(() => told.length === 4);
    // Taken once that space opened, what comes after counts anew.
    stop();
    while (await receiveMessage({ url }, carol.recipientId));
    await keepDoor(1, closed, true);
    stop = telling();
    await settle();
    assert.equal(told.length, 4);
    await sendMessage({ url }, carol.senderId, Uint8Array.of(6), 'message');
    await until(() => told.length === 5);
    // The phone's network changed: the waits ask again, and tell what comes after once, nothing twice.
    networkChanged();
    await new Promise((r) => setTimeout(r, 1_400));
    assert.equal(told.length, 5);
    await sendMessage({ url }, carol.senderId, Uint8Array.of(8), 'message');
    await sendMessage({ url }, own.senderId, Uint8Array.of(8), 'message');
    await until(() => told.length === 7);
    await settle();
    assert.equal(told.length, 7);
    // Shut, it says nothing more.
    stop();
    await saveDoor(1, null);
    stop = telling();
    await sendMessage({ url }, carol.senderId, Uint8Array.of(7), 'message');
    await settle();
    assert.equal(told.length, 7);
  } finally {
    stop();
    setCurrentSpace(null);
  }
});

test("a closed space's Matrix account pushes through its relay to a queue its door names, which tells of each message", { skip: !relayReady }, async () => {
  store.clear();
  await prepareDoors();
  const url = await startRelay();
  const [open, closed] = [newSpaceKey(), newSpaceKey()];
  const ids = await createQueue({ url });
  await saveSpaceData(1, closed, { ...EMPTY_SPACE, url, tor: 'off', ownQueue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } });
  const server = new Homeserver();
  setMatrixHttp(async (request) => server.answer(request));
  const login = server.answer({ method: 'POST', url: `${HS}/_matrix/client/v3/login`, body: { identifier: { user: 'ann' }, password: PASSWORD } }).json;
  const state = {
    homeserver: HS,
    userId: login.user_id,
    deviceId: login.device_id,
    accessToken: login.access_token,
    account: {},
    rooms: {},
    devices: {},
    outdated: [],
    olm: {},
    inbound: {},
    outbound: {},
    seen: {},
  } as unknown as MatrixState;
  const pushers = () => server.pushers.get(state.userId) ?? [];
  const gateway = `${url.replace('ws://', 'http://')}/_matrix/push/v1/notify`;

  const push = await startMatrixPush(state, { url });
  // A pusher at the relay's gateway, in the format that sends no words, by the queue's sender id.
  assert.deepEqual(pushers(), [
    {
      kind: 'http',
      app_id: MATRIX_PUSH_APP,
      pushkey: push.senderHex,
      app_display_name: editionName(),
      device_display_name: editionName(),
      lang: 'en',
      data: { url: gateway, format: 'event_id_only' },
      append: false,
    },
  ]);
  state.push = push;
  await saveMatrix(1, closed, state);
  // The door names it first, at the space's relay, in a group of its own.
  const door = (await doorOf(1, closed))!;
  assert.deepEqual(door.contacts, { url, queues: [{ r: push.recipientHex, g: MATRIX_PUSH_GROUP }] });
  await saveDoor(1, door);
  // What the homeserver told of while that space was open was seen there: heard as it closes.
  await server.push(state.userId, '$before');
  await keepDoor(1, closed, true);

  setCurrentSpace(0, open);
  let told: number[] = [];
  const stop = startClosedNotices((count, space) => (told = [...told, ...Array<number>(count).fill(space)]));
  try {
    await settle();
    assert.deepEqual(told, []);
    await server.push(state.userId, '$one');
    await until(() => told.length === 1);
    assert.deepEqual(told, [1]);
    // A count alone, as when something was read elsewhere: nothing.
    await server.push(state.userId);
    await settle();
    assert.equal(told.length, 1);
    await server.push(state.userId, '$two');
    await until(() => told.length === 2);
  } finally {
    stop();
    setCurrentSpace(null);
  }
  // The queue stays empty: the relay keeps nothing of a push.
  assert.equal(await receiveMessage({ url }, fromHex(push.recipientHex)), null);

  // Kept as it is while all holds; the pusher set again when the homeserver let go of it.
  assert.equal(await keepMatrixPush(state, push, { url }), push);
  server.pushers.set(state.userId, []);
  assert.equal(await keepMatrixPush(state, push, { url }), push);
  assert.deepEqual(pushers().map((p) => p.pushkey), [push.senderHex]);
  // The relay lost the queue: its gateway rejects the key, and the homeserver drops the pusher; a
  // new queue and pusher take their place.
  await deleteQueue({ url }, fromHex(push.recipientHex));
  await server.push(state.userId, '$lost');
  assert.deepEqual(pushers(), []);
  const next = await keepMatrixPush(state, push, { url });
  assert.notEqual(next.senderHex, push.senderHex);
  assert.deepEqual(pushers().map((p) => p.pushkey), [next.senderHex]);
  // The space moved to another relay: a queue there, the old pusher off.
  const elsewhere = await startRelay();
  const moved = await keepMatrixPush(state, next, { url: elsewhere });
  assert.equal(moved.url, elsewhere);
  assert.deepEqual(pushers().map((p) => [p.pushkey, p.data.url]), [[moved.senderHex, `${elsewhere.replace('ws://', 'http://')}/_matrix/push/v1/notify`]]);

  // Turned off: the pusher goes, and the queue.
  await stopMatrixPush(state, moved, { url: elsewhere });
  assert.deepEqual(pushers(), []);
  await assert.rejects(receiveMessage({ url: elsewhere }, fromHex(moved.recipientHex)));

  // A relay that takes no pushes (from before, or turned off): refused, and nothing left behind.
  const before = await startRelay(false, '', false, { EREVOS_RELAY_MATRIX_PUSH: 'off' });
  await assert.rejects(startMatrixPush(state, { url: before }), /does not take Matrix notices/);
  assert.deepEqual(pushers(), []);
});
