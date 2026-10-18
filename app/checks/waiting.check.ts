// Messages that wait (lib/waiting.ts), with the real core and phones joined by a radio in memory,
// and a real relay for a photo: kept in the history marked waiting, tried only when there is a
// way for them, each contact's in order, sent with the tag they were kept with, and marked as
// gone. Skipped, with a note, when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { bytesSource, keepFile, offerRef, readFile, takeFile } from '../lib/attachments';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { nearby, Nearby } from '../lib/nearby';
import { createQueue, toHex } from '../lib/relay';
import { forgetSpaceChats, spaceChats } from '../lib/space-chats';
import { sendWaiting, type SendPlace } from '../lib/waiting';
import { WAITING } from '../lock/history';
import { setCurrentSpace } from '../lock/keys';
import { blobs, files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
} else {
  console.log('Skipping the waiting checks: build the core first with node checks/build-core.mjs');
}
relayNote('the check of a photo that waits');

const none = { relay: '', relayKey: '' };
const nowhere: SendPlace = { sends: null, own: null, senderHex: '', here: none, ownKey: '', relayUp: false };

// Bob's space open, and Alice's phone, which has Bob's link and wrote once; the link between them
// up or not (`link`). What Bob's phone sends Alice's on it lands in `toAlice`.
async function twoPhones() {
  files.clear();
  blobs.clear();
  setCurrentSpace(0, randomBytes(32));
  const bob = await spaceChats();
  const alice = await E2E.open('space', 1, randomBytes(32));
  const aliceNearby = new Nearby();
  const toAlice: Uint8Array[] = [];
  let up = false;
  const stop = nearby.start((link, text) => {
    if (!up || link !== 'ble-link-alice') return false;
    const packet = aliceNearby.frameIn('ble-link-bob', text);
    if (packet) toAlice.push(packet);
    return true;
  });
  const { identity: bobId } = await alice.addContact({ senderHex: '', key: toBase64Url(bob.e2e.bundle) }, '', none);
  const hi = await alice.seal(bobId, 'hi', '', { at: none });
  const said = (await bob.e2e.receive(hi.first!)) as Extract<Received, { kind: 'message' }>;
  await bob.e2e.receive(hi.packet);
  await bob.e2e.acceptRequest(said.identity);
  const aliceId = said.identity;
  const peer = `contact:${aliceId}`;
  // Down, Bob's phone still takes the link for up until a send on it fails.
  const link = (on: boolean) => {
    up = on;
    if (!on) return;
    nearby.linkUp('ble-link-alice');
    nearby.heardOn(aliceId, 'ble-link-alice');
  };
  const done = () => {
    stop();
    forgetSpaceChats();
    setCurrentSpace(null);
  };
  return { bob, alice, peer, toAlice, link, done };
}

test('what waits goes only once there is a way, in order, with its tag', { skip: !coreReady }, async () => {
  const { bob, alice, peer, toAlice, link, done } = await twoPhones();
  try {
    await bob.history.add({ peer, text: 'first', mine: true, at: 1, tag: 'aaaaaaaaaaaa', mark: WAITING });
    await bob.history.add({ peer, text: 'second', mine: true, at: 2, tag: 'bbbbbbbbbbbb', mark: WAITING });
    assert.deepEqual(bob.history.waiting().map((m) => m.text), ['first', 'second']);

    // No relay, their phone not near: nothing is even sealed.
    assert.deepEqual(await sendWaiting(bob, nowhere), []);
    assert.equal(toAlice.length, 0);

    // Near: both go, in order, with the tags they were kept with, and are marked gone.
    link(true);
    const went = await sendWaiting(bob, nowhere);
    assert.deepEqual(went.map((w) => w.tag), ['aaaaaaaaaaaa', 'bbbbbbbbbbbb']);
    assert.deepEqual(bob.history.waiting(), []);
    assert.deepEqual(bob.history.messages().filter((m) => m.mine).map((m) => m.mark), [0, 0]);
    const came = [];
    for (const packet of toAlice) came.push((await alice.receive(packet)) as Extract<Received, { kind: 'message' }>);
    assert.deepEqual(came.map((m) => [m.text, m.tag]), [['first', 'aaaaaaaaaaaa'], ['second', 'bbbbbbbbbbbb']]);
  } finally {
    done();
  }
});

test('one that fails waits longer before the next try, and holds the ones after it', { skip: !coreReady }, async () => {
  const { bob, alice, peer, toAlice, link, done } = await twoPhones();
  try {
    await bob.history.add({ peer, text: 'one', mine: true, at: 1, tag: 'cccccccccccc', mark: WAITING });
    await bob.history.add({ peer, text: 'two', mine: true, at: 2, tag: 'dddddddddddd', mark: WAITING });
    // Heard nearby, but the link drops as it goes.
    link(true);
    link(false);
    const start = Date.now();
    assert.deepEqual(await sendWaiting(bob, nowhere, start), []);
    assert.equal(bob.history.waiting().length, 2);
    // Back up at once: not tried again until its wait is over.
    link(true);
    assert.deepEqual(await sendWaiting(bob, nowhere, start + 1000), []);
    assert.equal(toAlice.length, 0);
    const went = await sendWaiting(bob, nowhere, start + 31_000);
    assert.deepEqual(went.map((w) => w.tag), ['cccccccccccc', 'dddddddddddd']);
    const opened = (await alice.receive(toAlice[toAlice.length - 2])) as Extract<Received, { kind: 'message' }>;
    assert.equal(opened.text, 'one');
  } finally {
    done();
  }
});

test('a voice message or photo does not wait for LoRa, and a photo goes once the relay answers', { skip: !coreReady || !relayReady }, async () => {
  const { bob, alice, peer, toAlice, link, done } = await twoPhones();
  try {
    const url = await startRelay();
    const relay = { url };
    const ids = await createQueue(relay);
    const bobQueue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    const photo = randomBytes(5000);
    const ref = await keepFile(bytesSource(photo), { name: 'p.jpg', mime: 'image/jpeg', kind: 'photo' });
    await bob.history.add({ peer, text: '', mine: true, at: 1, tag: 'eeeeeeeeeeee', mark: WAITING, file: ref });
    // A LoRa radio only: a photo is not tried.
    nearby.linkUp('lora-00000001');
    assert.deepEqual(await sendWaiting(bob, nowhere), []);
    // Near, but photos need the relay: not tried either.
    link(true);
    assert.deepEqual(await sendWaiting(bob, nowhere), []);
    assert.equal(toAlice.length, 0);
    // The relay answers: it goes to the relay, and its offer to their phone nearby.
    const place: SendPlace = { sends: relay, own: relay, senderHex: bobQueue.senderHex, here: { relay: url, relayKey: '' }, ownKey: '', relayUp: true };
    const went = await sendWaiting(bob, place);
    assert.deepEqual(went.map((w) => w.tag), ['eeeeeeeeeeee']);
    const offer = (await alice.receive(toAlice[toAlice.length - 1])) as Extract<Received, { kind: 'message' }>;
    assert.equal(offer.tag, 'eeeeeeeeeeee');
    const taken = await takeFile(relay, offerRef(offer.file!));
    assert.deepEqual(await readFile(taken), photo);
  } finally {
    done();
  }
});
