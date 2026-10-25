// A closed space that says a message came while another is open (lock/doors.ts,
// lib/closed-notices.ts): every space has its entry, of one size whether its door is open or not,
// and none shows its queues; the open space waits on the other spaces' doors only, is told of each
// message once, word between phones never, what came while that space was open not once it
// closes, and nothing once its door is shut. The relay part runs with a real relay, and is
// skipped, with a note, without one.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { doorOf, keepDoor, startClosedNotices } from '../lib/closed-notices';
import { createQueue, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { loadDoor, openDoors, prepareDoors, saveDoor } from '../lock/doors';
import { newSpaceKey, setCurrentSpace } from '../lock/keys';
import { EMPTY_SPACE, saveSpaceData } from '../lock/space-data';
import { ready as relayReady, relayNote, startRelay } from './real-relay';
import { store } from './secure-memory';

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
