// Hidden chats that say a message came (lock/hidden-watch.ts, lib/hidden-notices.ts): every space
// keeps one queue per pocket, those not asked for made for nothing on the same relay, sealed and
// padded so a space with hidden chats looks like one without; in the background the relay is only
// asked whether something waits, and a pocket tells once until its chats open. The relay part runs
// with a real relay, and is skipped, with a note, without one.
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

test('in the background, a pocket tells once that a message came, and again only after it opened', { skip: !relayReady }, async () => {
  store.clear();
  const url = await startRelay();
  const key = newSpaceKey();
  setCurrentSpace(0, key);
  await updateCurrentSpaceData({ url });
  const ids = await createQueue({ url });
  await watchPocket(0, key, 1, { url, token: '', recipientHex: toHex(ids.recipientId) });
  setAppShown(false);
  let told = 0;
  const stop = startHiddenNotices(() => told++);
  try {
    await sendMessage({ url }, ids.senderId, Uint8Array.of(1, 2, 3));
    await until(() => told === 1);
    // What came stays on the relay for the hidden chats.
    await sendMessage({ url }, ids.senderId, Uint8Array.of(4));
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(told, 1);
    // Opened and closed again, with the messages still waiting: it tells again.
    setOpenHiddenPlace(place(0, 1));
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(told, 1);
    setOpenHiddenPlace(null);
    await until(() => told === 2);
    assert.deepEqual(await receiveMessage({ url }, ids.recipientId), Uint8Array.of(1, 2, 3));
  } finally {
    stop();
    setAppShown(true);
    setCurrentSpace(null);
  }
});
