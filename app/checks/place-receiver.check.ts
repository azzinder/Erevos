// Hidden chats that receive while they are closed (lock/hidden-keep.ts, lib/place-receiver.ts):
// every space keeps four keys, sealed with its own, the real one only where a place's switch is on,
// so its entry looks the same whatever hidden chats it has; a new place starts with the switch on.
// While the space is open, through a real relay and the real core, what comes to such a place is
// kept in its history and its sender told it came, nothing is taken while its chat screen holds
// it, a call rings with no name and waits for the PIN, and one ended or too old is kept as missed.
// Switched off, nothing reads it any more. The relay part is skipped, with a note, when the core or
// the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { OFFER_FRESH_MS } from '../lib/call';
import type { CallSignal } from '../lib/call-signal';
import { CALL_LINE } from '../lib/calls';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { forgetPlaceChats, placeChats } from '../lib/place-chats';
import { holdPlace, onPlaceMessage, onPlaceRing, receivesPocket, startPlaceReceiver, takePlaceCalls } from '../lib/place-receiver';
import { setAppShown } from '../lib/receiver';
import { createQueue, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { prepareHidden, removeHiddenPassword, setHiddenPassword } from '../lock/hidden';
import { keepPlace, keepsPlace, keptPlaces, onKeptChange, prepareKeepEntries } from '../lock/hidden-keep';
import { setCurrentSpace } from '../lock/keys';
import { EMPTY_SPACE, saveHiddenData } from '../lock/space-data';
import { blobs, files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';
import { store } from './secure-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
} else {
  console.log('Skipping the hidden chats receiving checks: build the core first with node checks/build-core.mjs');
}
relayNote('the hidden chats receiving checks');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(what: () => boolean | Promise<boolean>, ms = 5000): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (await what()) return;
  throw new Error('waited too long');
}

test('every space keeps four keys of one size, the real one only where a place receives, and a new place receives', async () => {
  store.clear();
  await prepareKeepEntries();
  const names = [...store.keys()].filter((name) => name.startsWith('erevos.keep.'));
  assert.deepEqual(names.sort(), ['erevos.keep.0', 'erevos.keep.1', 'erevos.keep.2', 'erevos.keep.3']);
  const size = store.get('erevos.keep.0')!.length;
  const spaceKey = randomBytes(32);
  const placeKey = randomBytes(32);
  await saveHiddenData(0, 2, placeKey, EMPTY_SPACE);

  // Before any switch, the entry sealed with a random key: the space's own seals it as it is read,
  // of the same size, and finds nothing.
  const before = store.get('erevos.keep.0')!;
  assert.deepEqual(await keptPlaces(0, spaceKey), []);
  assert.notEqual(store.get('erevos.keep.0'), before);
  assert.equal(store.get('erevos.keep.0')!.length, size);

  let changed = 0;
  const stop = onKeptChange(() => changed++);
  try {
    await keepPlace(0, spaceKey, 2, placeKey);
    assert.equal(changed, 1);
    assert.equal(store.get('erevos.keep.0')!.length, size);
    assert.ok(await keepsPlace(0, spaceKey, 2, placeKey));
    assert.ok(!(await keepsPlace(0, spaceKey, 1, placeKey)));
    // Only the place's own entry tells its key from the random ones of the other pockets.
    const found = await keptPlaces(0, spaceKey);
    assert.deepEqual(
      found.map((place) => [place.pocket, toHex(place.key)]),
      [[2, toHex(placeKey)]],
    );
    // Another key opens nothing; the other spaces keep nothing of it.
    assert.deepEqual(await keptPlaces(0, randomBytes(32)), []);
    assert.ok(!(await keepsPlace(1, spaceKey, 2, placeKey)));
    // Off, its key is gone from the entry.
    await keepPlace(0, spaceKey, 2, null);
    assert.equal(changed, 2);
    assert.ok(!(await keepsPlace(0, spaceKey, 2, placeKey)));
    assert.deepEqual(await keptPlaces(0, spaceKey), []);
  } finally {
    stop();
  }

  // A new place, set while its space is open, receives; one whose PIN goes no longer does.
  store.clear();
  await prepareHidden();
  setCurrentSpace(0, spaceKey);
  try {
    const key = await setHiddenPassword(0, 1, 'hidden-pin-1', null);
    assert.ok(await keepsPlace(0, spaceKey, 1, key));
    // A new PIN for the same hidden chats leaves their switch as it was.
    await keepPlace(0, spaceKey, 1, null);
    await setHiddenPassword(0, 1, 'hidden-pin-2', key);
    assert.ok(!(await keepsPlace(0, spaceKey, 1, key)));
    await keepPlace(0, spaceKey, 1, key);
    await removeHiddenPassword(0, 1);
    assert.ok(!(await keepsPlace(0, spaceKey, 1, key)));
  } finally {
    setCurrentSpace(null);
  }
});

test('a closed place that receives keeps what comes, tells its sender, rings calls with no name, and stops when switched off', { skip: !coreReady || !relayReady }, async () => {
  store.clear();
  files.clear();
  blobs.clear();
  const url = await startRelay();
  const relay = { url };
  const queue = async () => {
    const ids = await createQueue(relay);
    return { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  };

  // Bob's space is open, its hidden chats in pocket 1 closed, their switch on.
  const spaceKey = randomBytes(32);
  const placeKey = randomBytes(32);
  setCurrentSpace(0, spaceKey);
  await prepareKeepEntries();
  const bobQueue = await queue();
  await saveHiddenData(0, 1, placeKey, { ...EMPTY_SPACE, url, ownQueue: bobQueue });
  const bob = await placeChats(0, 1, placeKey);
  await keepPlace(0, spaceKey, 1, placeKey);

  // Alice, on another phone, adds the hidden chats' link and writes.
  const alice = await E2E.open('space', 1, randomBytes(32));
  const aliceQueue = await queue();
  const where = { relay: url, relayKey: '' };
  const { identity: bobId } = await alice.addContact({ senderHex: bobQueue.senderHex, key: toBase64Url(bob.e2e.bundle), relayUrl: url }, aliceQueue.senderHex, where);
  const [first] = alice.pending();
  await sendMessage(relay, fromHex(first.sender), first.first);
  await alice.firstSent(bobId);
  const write = async (text: string, call?: CallSignal) => {
    const sealed = await alice.seal(bobId, text, aliceQueue.senderHex, { at: where, ...(call ? { call } : {}) });
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
    return sealed.tag;
  };
  const toAlice = async () => {
    for (;;) {
      const bytes = await receiveMessage(relay, fromHex(aliceQueue.recipientHex));
      if (!bytes) return null;
      const said = (await alice.receive(bytes)) as Extract<Received, { kind: 'message' }>;
      if (said.kind !== 'message' || said.text || said.got.length > 0 || said.read.length > 0 || said.ask) return said;
    }
  };
  const texts = () => bob.history.messages().map((message) => message.text);

  const heard: string[] = [];
  const rang: number[] = [];
  const stopHeard = onPlaceMessage((space, pocket, received) => {
    assert.deepEqual([space, pocket], [0, 1]);
    heard.push(received.text);
  });
  const stopRang = onPlaceRing((_space, pocket) => rang.push(pocket));
  setAppShown(true);
  const stop = startPlaceReceiver(30);
  try {
    await until(() => receivesPocket(0, 1));
    assert.ok(!receivesPocket(0, 2));
    assert.ok(!receivesPocket(1, 1));

    await write('hi hidden Bob');
    await until(() => texts().includes('hi hidden Bob'));
    await until(() => heard.includes('hi hidden Bob'));
    // Someone new, a message request: told nothing back until accepted.
    assert.equal(bob.e2e.contacts()[0].request, true);
    await bob.e2e.acceptRequest(bob.e2e.contacts()[0].identity);
    const againTag = await write('still there?');
    await until(() => texts().includes('still there?'));
    let receipt: Awaited<ReturnType<typeof toAlice>> = null;
    await until(async () => (receipt = await toAlice()) !== null && receipt.got.length > 0);
    assert.deepEqual(receipt!.got, [againTag]);

    // While its chat screen holds it, nothing is taken; once let go, it is.
    const release = await holdPlace(0, 1);
    await write('held');
    await sleep(200);
    assert.ok(!texts().includes('held'));
    release();
    await until(() => texts().includes('held'));

    // A call rings with no name and waits for the PIN, for its chat screen to take.
    const callId = () => toHex(randomBytes(8));
    const ringing = callId();
    await write('', { id: ringing, kind: 'offer', video: false, sdp: 'v=0 ring', at: Date.now() });
    await until(() => rang.length === 1);
    assert.deepEqual(rang, [1]);
    const taken = takePlaceCalls(0, 1);
    assert.deepEqual(
      taken.map((received) => received.call?.id),
      [ringing],
    );
    assert.deepEqual(takePlaceCalls(0, 1), []);
    // Not for another space.
    assert.deepEqual(takePlaceCalls(1, 1), []);

    // One its caller ended before the PIN opened the place is kept as missed, as is one too old to answer.
    const ended = callId();
    await write('', { id: ended, kind: 'offer', video: true, sdp: 'v=0 video', at: Date.now() });
    await until(() => rang.length === 2);
    await write('', { id: ended, kind: 'end', reason: 'hangup' });
    await until(() => texts().includes(`${CALL_LINE}Missed video call`));
    assert.deepEqual(takePlaceCalls(0, 1), []);
    await write('', { id: callId(), kind: 'offer', video: false, sdp: 'v=0 old', at: Date.now() - OFFER_FRESH_MS - 1000 });
    await until(() => texts().includes(`${CALL_LINE}Missed voice call`));
    assert.equal(rang.length, 2);

    // Switched off, nothing reads it any more: what comes waits on the relay.
    await keepPlace(0, spaceKey, 1, null);
    await until(() => !receivesPocket(0, 1));
    const count = texts().length;
    await write('after');
    await sleep(300);
    assert.equal(texts().length, count);
    assert.ok(await receiveMessage(relay, fromHex(bobQueue.recipientHex)));
  } finally {
    stop();
    stopHeard();
    stopRang();
    // A look under way ends first: what it tells could reach the next check.
    (await holdPlace(0, 1))();
    forgetPlaceChats();
    setCurrentSpace(null);
  }
});
