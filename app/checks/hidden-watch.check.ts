// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Hidden chats that say how many messages came (lock/hidden-watch.ts, lib/hidden-notices.ts): every
// space keeps one queue per pocket, those not asked for made for nothing on the same relay, sealed
// and padded so a space with hidden chats looks like one without; in the background the relay is
// only asked what came by what each send said, never for it, and each message is told of once,
// though Erevos starts anew, word between phones never, what the chats read while open not once
// they close, but what came after they last looked; a call only when it did not ring; and a queue
// the relay lost leaves a trace in its slot. The relay part runs with a real relay, and is skipped,
// with a note, without one.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OpenHiddenPlace } from '../lib/hidden-contacts';
import { placeGroupTells, setOpenHiddenPlace } from '../lib/hidden-contacts';
import { startHiddenNotices } from '../lib/hidden-notices';
import { setHiddenRinging } from '../lib/hidden-ring';
import { setAppShown } from '../lib/receiver';
import { createQueue, deleteQueue, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { isWatchedQueue, loadWatched, lostPocket, prepareWatchEntries, rewatchLost, unwatchPocket, wasWatchedQueue, watchPocket } from '../lock/hidden-watch';
import { newSpaceKey, setCurrentSpace } from '../lock/keys';
import { POCKETS } from '../lock/sealed-file';
import { updateCurrentSpaceData } from '../lock/space-data';
import { ready as relayReady, relayNote, startRelay } from './real-relay';
import { store } from './secure-memory';

relayNote('the hidden chats notice checks through a relay');

const until = async (done: () => boolean, ms = 5_000) => {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};

const place = (space: number, pocket: number): OpenHiddenPlace => ({
  space,
  pocket,
  key: newSpaceKey(),
  erevos: () => [],
  messages: () => [],
  open: () => undefined,
  takeName: async () => '',
});

test('every space has the entry, of one size whether its pockets are waited on or not', { skip: !relayReady }, async () => {
  store.clear();
  await prepareWatchEntries();
  const names = [...store.keys()].filter((name) => name.startsWith('erevos.watch.'));
  assert.deepEqual(names.sort(), ['erevos.watch.0', 'erevos.watch.1', 'erevos.watch.2', 'erevos.watch.3']);
  const unused = store.get('erevos.watch.1')!.length;
  const url = await startRelay();
  const key = newSpaceKey();
  const ids = await createQueue({ url });
  const list = await watchPocket(0, key, 2, { url, token: '', recipientHex: toHex(ids.recipientId) });
  // The other pockets got queues of their own on the same relay, none alike.
  assert.equal(list.length, POCKETS);
  assert.ok(list.every((kept) => kept?.url === url));
  assert.equal(new Set(list.map((kept) => kept!.recipientHex)).size, POCKETS);
  assert.ok(isWatchedQueue(list, 2, toHex(ids.recipientId)));
  assert.ok(!isWatchedQueue(list, 1, toHex(ids.recipientId)));
  assert.equal(store.get('erevos.watch.0')!.length, unused);
  assert.ok(!store.get('erevos.watch.0')!.includes(toHex(ids.recipientId)));
  // Another key opens nothing; stopping puts a queue made for nothing in its place.
  assert.deepEqual(await loadWatched(0, newSpaceKey()), [null, null, null, null]);
  const after = await unwatchPocket(0, key, 2, { url });
  assert.ok(after[2] && !isWatchedQueue(after, 2, toHex(ids.recipientId)));
  assert.deepEqual(after.slice(0, 2), list.slice(0, 2));
});

test('a pocket tells of each message once, and of word between phones never', { skip: !relayReady }, async () => {
  store.clear();
  const url = await startRelay();
  const key = newSpaceKey();
  setCurrentSpace(0, key);
  await updateCurrentSpaceData({ url });
  const ids = await createQueue({ url });
  await watchPocket(0, key, 1, { url, token: '', recipientHex: toHex(ids.recipientId) });
  setAppShown(false);
  let told = 0;
  let stop = startHiddenNotices((count) => (told += count));
  const settle = () => new Promise((r) => setTimeout(r, 400));
  try {
    // That a message came, or was read: nothing.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(9), 'quiet');
    await settle();
    assert.equal(told, 0);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(1, 2, 3), 'message');
    await until(() => told === 1);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(4), 'message');
    await until(() => told === 2);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(9), 'quiet');
    // One that did not say, as from an older phone: perhaps a message.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(5));
    await until(() => told === 3);
    await settle();
    assert.equal(told, 3);
    // Shown and back, opened and closed with the messages still waiting, or started anew: nothing again.
    setAppShown(true);
    await settle();
    setAppShown(false);
    setOpenHiddenPlace(place(0, 1));
    await settle();
    setOpenHiddenPlace(null);
    stop();
    stop = startHiddenNotices((count) => (told += count));
    await settle();
    assert.equal(told, 3);
    // Taken by the hidden chats, what comes after counts anew.
    assert.deepEqual(await receiveMessage({ url }, ids.recipientId), Uint8Array.of(9));
    while (await receiveMessage({ url }, ids.recipientId));
    await sendMessage({ url }, ids.senderId, Uint8Array.of(6), 'message');
    await until(() => told === 4);
    // A message that comes while Erevos shows is told of at once, and not again once it goes to the background.
    setAppShown(true);
    await settle();
    await sendMessage({ url }, ids.senderId, Uint8Array.of(7), 'message');
    await until(() => told === 5);
    setAppShown(false);
    await settle();
    assert.equal(told, 5);
    // One that comes while its hidden chats are open, and that they read there: not told of once they close.
    setOpenHiddenPlace(place(0, 1));
    await sendMessage({ url }, ids.senderId, Uint8Array.of(8), 'message');
    while (await receiveMessage({ url }, ids.recipientId));
    await settle();
    setOpenHiddenPlace(null);
    await settle();
    assert.equal(told, 5);
    // One that came after they last looked, just before they closed: told of once they close, once.
    setOpenHiddenPlace(place(0, 1));
    while (await receiveMessage({ url }, ids.recipientId));
    await sendMessage({ url }, ids.senderId, Uint8Array.of(9), 'message');
    await settle();
    setOpenHiddenPlace(null);
    await until(() => told === 6);
    // Started anew, as Android does with Erevos in the background: what was told of is kept, not told again.
    stop();
    stop = startHiddenNotices((count) => (told += count));
    await settle();
    assert.equal(told, 6);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(10), 'message');
    await until(() => told === 7);
  } finally {
    stop();
    setAppShown(true);
    setCurrentSpace(null);
  }
});

test('a call is told of only when it did not ring, though its ring comes late or rang before', { skip: !relayReady }, async () => {
  store.clear();
  const url = await startRelay();
  const key = newSpaceKey();
  setCurrentSpace(0, key);
  await updateCurrentSpaceData({ url });
  const ids = await createQueue({ url });
  await watchPocket(0, key, 2, { url, token: '', recipientHex: toHex(ids.recipientId) });
  setAppShown(false);
  let told = 0;
  const stop = startHiddenNotices((count) => (told += count), { settles: 500 });
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  try {
    // A call that never rang (another call went on): told of.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(1), 'ring');
    await until(() => told === 1);
    // One whose ring comes a while after: not told of.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(2), 'ring');
    await wait(200);
    setHiddenRinging({ space: 0, pocket: 2, at: Date.now() });
    setHiddenRinging(null);
    await wait(900);
    assert.equal(told, 1);
    // One that rang before the relay said it came: not told of either.
    setHiddenRinging({ space: 0, pocket: 2, at: Date.now() });
    setHiddenRinging(null);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(3), 'ring');
    await wait(900);
    assert.equal(told, 1);
    // The next that does not ring is told of, though one rang before it.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(4), 'ring');
    await until(() => told === 2);
    // A message that comes while a call waits to see whether it rang is told of at once.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(5), 'ring');
    await wait(100);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(6), 'message');
    await until(() => told === 3, 400);
    await until(() => told === 4);
  } finally {
    stop();
    setAppShown(true);
    setCurrentSpace(null);
  }
});

test('a queue the relay lost leaves its switch on, and is waited on again as its chats move it', { skip: !relayReady }, async () => {
  store.clear();
  await prepareWatchEntries();
  const unused = store.get('erevos.watch.0')!.length;
  const url = await startRelay();
  const key = newSpaceKey();
  setCurrentSpace(0, key);
  await updateCurrentSpaceData({ url });
  const ids = await createQueue({ url });
  const own = toHex(ids.recipientId);
  const list = await watchPocket(0, key, 1, { url, token: '', recipientHex: own });
  await deleteQueue({ url }, ids.recipientId);
  setAppShown(false);
  const stop = startHiddenNotices(() => undefined);
  try {
    let after = list;
    const end = Date.now() + 5_000;
    while (after[1]?.recipientHex === own) {
      if (Date.now() > end) throw new Error('timed out');
      await new Promise((r) => setTimeout(r, 50));
      after = await loadWatched(0, key);
    }
    // A queue made for nothing in its place, which says whose it was; the others as they were.
    assert.ok(after[1] && after[1].url === url);
    assert.ok(!isWatchedQueue(after, 1, own));
    assert.equal(after[1].was, own.slice(0, 16));
    assert.ok(wasWatchedQueue(after, 1, own));
    assert.ok(!wasWatchedQueue(after, 2, own));
    assert.deepEqual([after[0], after[2], after[3]].map((kept) => kept?.recipientHex), [list[0], list[2], list[3]].map((kept) => kept?.recipientHex));
    assert.ok([after[0], after[2], after[3]].every((kept) => kept?.was === undefined));
    // The entry keeps its size, lost or not.
    assert.equal(store.get('erevos.watch.0')!.length, unused);
    // Lost again before the chats opened: still says the first.
    const nothing = after[1].recipientHex;
    const again = await lostPocket(0, key, 1, nothing, { url });
    assert.equal(again[1]!.was, own.slice(0, 16));
    // Another queue meanwhile: nothing changes.
    assert.deepEqual(await lostPocket(0, key, 1, nothing, { url }), again);
    // The chats open with their own queue: waited on again, the trace gone.
    const back = await rewatchLost(0, key, 1, { url, token: '', recipientHex: own });
    assert.ok(isWatchedQueue(back, 1, own));
    assert.equal(back[1]!.was, undefined);
    assert.deepEqual(await rewatchLost(0, key, 1, { url, token: '', recipientHex: own }), back);
    // Moved to a new queue, or turned off by hand: no trace either.
    await lostPocket(0, key, 1, own, { url });
    const moved = await watchPocket(0, key, 1, { url, token: '', recipientHex: toHex((await createQueue({ url })).recipientId) });
    assert.equal(moved[1]!.was, undefined);
    await lostPocket(0, key, 1, moved[1]!.recipientHex, { url });
    assert.equal((await unwatchPocket(0, key, 1, { url }))[1]!.was, undefined);
  } finally {
    stop();
    setAppShown(true);
    setCurrentSpace(null);
  }
});

test('a group of the hidden chats tells, with Erevos away, only as their contacts do', () => {
  setOpenHiddenPlace({ ...place(0, 1), tells: () => false });
  try {
    assert.equal(placeGroupTells(0, 1, false, false), false);
    assert.equal(placeGroupTells(0, 1, true, false), true);
    assert.equal(placeGroupTells(0, 1, false, true), true);
    assert.equal(placeGroupTells(0, 2, false, false), false);
    setOpenHiddenPlace({ ...place(0, 1), tells: () => true });
    assert.equal(placeGroupTells(0, 1, false, false), true);
    assert.equal(placeGroupTells(1, 1, false, false), false);
  } finally {
    setOpenHiddenPlace(null);
  }
});
