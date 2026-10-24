// Hidden chats that say how many messages came (lock/hidden-watch.ts, lib/hidden-notices.ts): every
// space keeps one queue per pocket, those not asked for made for nothing on the same relay, sealed
// and padded so a space with hidden chats looks like one without; in the background the relay is
// only asked what came by what each send said, never for it, and each message is told of once,
// though Erevos starts anew, word between phones never, and what came while the chats were open not
// once they close. The relay part runs with a real relay, and is skipped, with a note,
// without one.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OpenHiddenPlace } from '../lib/hidden-contacts';
import { setOpenHiddenPlace } from '../lib/hidden-contacts';
import { startHiddenNotices } from '../lib/hidden-notices';
import { setAppShown } from '../lib/receiver';
import { createQueue, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { isWatchedQueue, loadWatched, prepareWatchEntries, unwatchPocket, watchPocket } from '../lock/hidden-watch';
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

test('in the background, a pocket tells of each message once, and of word between phones never', { skip: !relayReady }, async () => {
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
    // A message that comes while Erevos shows is told of once it goes to the background.
    setAppShown(true);
    await settle();
    await sendMessage({ url }, ids.senderId, Uint8Array.of(7), 'message');
    await settle();
    assert.equal(told, 4);
    setAppShown(false);
    await until(() => told === 5);
    // One that comes while its hidden chats are open is read there: not told of once they close.
    setOpenHiddenPlace(place(0, 1));
    await sendMessage({ url }, ids.senderId, Uint8Array.of(8), 'message');
    await settle();
    setOpenHiddenPlace(null);
    await settle();
    assert.equal(told, 5);
    // Started anew, as Android does with Erevos in the background: what was told of is kept, not told again.
    stop();
    stop = startHiddenNotices((count) => (told += count));
    await settle();
    assert.equal(told, 5);
    await sendMessage({ url }, ids.senderId, Uint8Array.of(10), 'message');
    await until(() => told === 6);
  } finally {
    stop();
    setAppShown(true);
    setCurrentSpace(null);
  }
});
