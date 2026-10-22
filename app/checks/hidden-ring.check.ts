// Hidden chats that ring their contacts' calls while they are closed (lock/hidden-ring.ts,
// lib/hidden-ring-notices.ts): every space keeps one ring queue per pocket, those not ringing made
// for nothing on the same relay, sealed and padded so a space that rings looks like one that does
// not; in the background the relay is asked only whether a ring waits on each of the four queues,
// decoys and all, and a pocket rings on any arrival, drained so the next call rings too, let be
// while its place is open and while another hidden call already rings. The ringtone and the
// "Incoming call" notice, and the guard against ringing while a call is already in progress, are
// played by lib/background.ts; the PIN that answers on the ring screen and a stale offer that
// cannot connect are checked by lock.check.ts (searchHidden/SEARCH_TRIES) and call.check.ts
// (OFFER_FRESH_MS); a ring the PIN answered that no call took counts towards moving the ring queue
// (lib/moves.ts fakeRings, checked in moves.check.ts). The relay part runs with a real relay, and is
// skipped, with a note, without one.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OpenHiddenPlace } from '../lib/hidden-contacts';
import { setOpenHiddenPlace } from '../lib/hidden-contacts';
import { randomBytes } from '../lib/crypto';
import { answerHiddenCall, HIDDEN_ANSWER_MS, HIDDEN_OFFER_MS, hiddenAnswerAt, lapseHiddenAnswer, setHiddenRinging, takeHiddenAnswer } from '../lib/hidden-ring';
import { startHiddenRinging } from '../lib/hidden-ring-notices';
import { setAppShown } from '../lib/receiver';
import { createQueue, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { isQueueNotFound } from '../lib/relay';
import { isRingedQueue, loadRinged, moveRingPocket, prepareRingEntries, ringPocket, unringPocket } from '../lock/hidden-ring';
import { newSpaceKey, setCurrentSpace } from '../lock/keys';
import { POCKETS } from '../lock/sealed-file';
import { updateCurrentSpaceData } from '../lock/space-data';
import { ready as relayReady, relayNote, startRelay } from './real-relay';
import { store } from './secure-memory';

relayNote('the hidden chats ring checks through a relay');

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
  takeName: async () => '',
  key: newSpaceKey(),
  erevos: () => [],
  messages: () => [],
  open: () => undefined,
});

test('every space has the entry, of one size whether its pockets ring or not', { skip: !relayReady }, async () => {
  store.clear();
  await prepareRingEntries();
  const names = [...store.keys()].filter((name) => name.startsWith('erevos.ring.'));
  assert.deepEqual(names.sort(), ['erevos.ring.0', 'erevos.ring.1', 'erevos.ring.2', 'erevos.ring.3']);
  const unused = store.get('erevos.ring.1')!.length;
  const url = await startRelay();
  const key = newSpaceKey();
  const ids = await createQueue({ url });
  const own = { url, token: '', recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  const list = await ringPocket(0, key, 2, own);
  // The other pockets got queues of their own on the same relay, none alike.
  assert.equal(list.length, POCKETS);
  assert.ok(list.every((kept) => kept?.url === url));
  assert.equal(new Set(list.map((kept) => kept!.recipientHex)).size, POCKETS);
  assert.ok(isRingedQueue(list, 2, toHex(ids.recipientId)));
  assert.ok(!isRingedQueue(list, 1, toHex(ids.recipientId)));
  assert.equal(store.get('erevos.ring.0')!.length, unused);
  assert.ok(!store.get('erevos.ring.0')!.includes(toHex(ids.recipientId)));
  // Another key opens nothing; stopping puts a queue made for nothing in its place.
  assert.deepEqual(await loadRinged(0, newSpaceKey()), [null, null, null, null]);
  const after = await unringPocket(0, key, 2, { url });
  assert.ok(after[2] && !isRingedQueue(after, 2, toHex(ids.recipientId)));
  assert.deepEqual(after.slice(0, 2), list.slice(0, 2));
});

test('a place that moves for a deletion gets a new ring queue, the old one gone at once, the other pockets as they were', { skip: !relayReady }, async () => {
  store.clear();
  await prepareRingEntries();
  const unused = store.get('erevos.ring.0')!.length;
  const url = await startRelay();
  const key = newSpaceKey();
  const ids = await createQueue({ url });
  const own = { url, token: '', recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  const list = await ringPocket(0, key, 1, own);
  const made = await moveRingPocket(0, key, 1, { url }, own.recipientHex);
  const after = await loadRinged(0, key);
  assert.ok(isRingedQueue(after, 1, made.recipientHex));
  assert.notEqual(made.senderHex, own.senderHex);
  assert.deepEqual([after[0], after[2], after[3]], [list[0], list[2], list[3]]);
  assert.equal(store.get('erevos.ring.0')!.length, unused);
  // The one deleted can no longer ring: the relay has no such queue.
  await assert.rejects(sendMessage({ url }, fromHex(own.senderHex), randomBytes(64)), (error) => isQueueNotFound(error));
  await sendMessage({ url }, fromHex(made.senderHex), randomBytes(64));
});

test('a ring answered with the PIN that a call takes is no ring for nothing; one no call takes within two minutes is, once', () => {
  answerHiddenCall(1000);
  assert.equal(hiddenAnswerAt(), 1000);
  assert.equal(takeHiddenAnswer(1000 + HIDDEN_ANSWER_MS), true);
  assert.equal(lapseHiddenAnswer(1000), false);
  answerHiddenCall(5000);
  assert.equal(lapseHiddenAnswer(4000), false);
  assert.equal(lapseHiddenAnswer(5000), true);
  assert.equal(lapseHiddenAnswer(5000), false);
  assert.equal(hiddenAnswerAt(), null);
  assert.equal(takeHiddenAnswer(5000), false);
  // Not before HIDDEN_OFFER_MS: a call that comes late, over a slow relay or Tor, is no ring for
  // nothing, though too late to answer at once; and chats closed meanwhile count nothing yet.
  answerHiddenCall(10_000);
  assert.equal(lapseHiddenAnswer(10_000, 10_000 + HIDDEN_ANSWER_MS + 1), false);
  assert.equal(lapseHiddenAnswer(10_000, 10_000 + HIDDEN_OFFER_MS - 1), false);
  assert.equal(takeHiddenAnswer(10_000 + HIDDEN_ANSWER_MS + 30_000), false);
  assert.equal(lapseHiddenAnswer(10_000, 10_000 + HIDDEN_OFFER_MS), false);
  answerHiddenCall(20_000);
  assert.equal(lapseHiddenAnswer(20_000, 20_000 + HIDDEN_OFFER_MS - 1), false);
  assert.equal(lapseHiddenAnswer(20_000, 20_000 + HIDDEN_OFFER_MS), true);
});

test('in the background a pocket rings when a call comes, drained so the next rings too, let be while a hidden call rings or its place is open, and ringing on any of the four queues and though the app shows', { skip: !relayReady }, async () => {
  store.clear();
  const url = await startRelay();
  const key = newSpaceKey();
  setCurrentSpace(0, key);
  await updateCurrentSpaceData({ url });
  const ids = await createQueue({ url });
  await ringPocket(0, key, 1, { url, token: '', recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) });
  setAppShown(true); // A hidden call rings on any screen, the app shown included.
  setHiddenRinging(null);
  const rang: { space: number; pocket: number }[] = [];
  const stop = startHiddenRinging((space, pocket) => void rang.push({ space, pocket }));
  try {
    const ping = () => sendMessage({ url }, ids.senderId, randomBytes(1024), 'ring');
    await ping();
    await until(() => rang.length === 1);
    assert.deepEqual(rang[0], { space: 0, pocket: 1 });
    // What rang is drained, so the queue is empty and the next call rings again.
    assert.equal(await receiveMessage({ url }, ids.recipientId), null);

    // A call is in progress (hiddenRinging is set): a ring that comes meanwhile does not ring again.
    setHiddenRinging({ space: 0, pocket: 1, at: Date.now() });
    await ping();
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(rang.length, 1);
    // It ends: the waiting ring is drained and rings.
    setHiddenRinging(null);
    await until(() => rang.length === 2);

    // While the place is open its pocket does not ring; closed again, it does.
    setOpenHiddenPlace(place(0, 1));
    await ping();
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(rang.length, 2);
    setOpenHiddenPlace(null);
    await until(() => rang.length === 3);

    // All four queues are waited on: a ring to a made-for-nothing one rings its pocket too.
    const decoy = (await loadRinged(0, key))[3]!;
    assert.ok(decoy && decoy.recipientHex !== toHex(ids.recipientId));
    await sendMessage({ url }, fromHex(decoy.senderHex), randomBytes(1024), 'ring');
    await until(() => rang.some((r) => r.pocket === 3));
  } finally {
    stop();
    setOpenHiddenPlace(null);
    setHiddenRinging(null);
    setAppShown(true);
    setCurrentSpace(null);
  }
});
