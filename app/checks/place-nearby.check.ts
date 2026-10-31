// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Hidden chats and the phones nearby (lib/place-nearby.ts, lib/nearby.ts NearHeard): where a hidden
// place's contacts were heard is its own, never the space's; its packets go on the contact's link,
// or, small, to every phone linked, never carried, over LoRa or by SMS. What came nearby and opened
// in none of the space's chats is tried in the open space's hidden places that are open or receive,
// and is otherwise kept unopened in memory, written nowhere, until the place opens. With the real
// Rust core built to WebAssembly by checks/build-core.mjs: a hidden contact talks to the place
// nearby, and the space opens nothing of it. Those checks are skipped, with a note, when that build
// is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { NearHeard, Nearby, nearby, NoWayError, SMS_LINK } from '../lib/nearby';
import { openHeldIn, openInPlaces, openPlaceNearby, placeNear, unopenedNearby, type PlaceOpener } from '../lib/place-nearby';
import { forgetPlaceChats, placeChats } from '../lib/place-chats';
import { holdPlace, onPlaceMessage, receivesPocket, startPlaceReceiver } from '../lib/place-receiver';
import { setAppShown } from '../lib/receiver';
import { handOverHidden } from '../lib/waiting';
import { keepPlace, prepareKeepEntries } from '../lock/hidden-keep';
import { setCurrentSpace } from '../lock/keys';
import { hiddenHolder } from '../lock/sealed-file';
import { EMPTY_SPACE, saveHiddenData } from '../lock/space-data';
import { blobs, files } from './files-memory';
import { store } from './secure-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
} else {
  console.log('Skipping the hidden chats nearby checks with the core: build it first with node checks/build-core.mjs');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(what: () => boolean | Promise<boolean>, ms = 5000): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (await what()) return;
  throw new Error('waited too long');
}

const relayDown = async () => {
  throw new Error('cannot reach the relay');
};

test("a hidden place's contacts are heard apart from the space's, and what goes to them goes only where the place heard them", async () => {
  const n = new Nearby();
  const sent: string[] = [];
  let up = true;
  n.start((link) => {
    sent.push(link);
    return up || link !== 'ble-link-1';
  });
  n.linkUp('ble-link-1');
  n.linkUp('lan-2');
  n.linkUp('lora-3');
  const heard = new NearHeard(n);
  let told = 0;
  heard.onChange(() => told++);
  heard.heardOn('aa', 'ble-link-1');
  heard.heardOn('aa', 'lora-3');
  assert.equal(told, 1, 'a slow link is never where a hidden contact is');
  assert.equal(heard.isNear('aa'), true);
  assert.equal(n.isNear('aa'), false, 'the space never learns it');

  assert.equal(n.offer('aa', [randomBytes(100)], heard), 'direct');
  assert.deepEqual(sent.splice(0), ['ble-link-1']);
  // Another contact of the place, not heard: small packets go to every phone, never on LoRa.
  assert.equal(n.offer('bb', [randomBytes(100)], heard), 'spread');
  assert.deepEqual(sent.splice(0).sort(), ['ble-link-1', 'lan-2']);
  assert.equal(n.offer('bb', [randomBytes(12_000)], heard), null, 'large ones go to a contact heard nearby only');
  assert.deepEqual(sent.splice(0), []);

  // Nothing of a hidden place's is carried, nor goes over LoRa or by SMS.
  let carried = 0;
  let texted = 0;
  n.smsWay = {
    can: () => true,
    send: async () => {
      texted++;
      return true;
    },
  };
  const carry = async () => {
    carried++;
    return [{ url: 'wss://relay.example.org', sealed: randomBytes(50) }];
  };
  assert.equal(await n.deliver('bb', [randomBytes(100)], relayDown, carry, true, heard), 'spread');
  assert.equal(carried, 0);
  assert.deepEqual(n.carriedCount(), { own: 0, others: 0 });
  sent.splice(0);
  const alone = new Nearby();
  alone.start(() => true);
  alone.smsWay = n.smsWay;
  await assert.rejects(alone.deliver('bb', [randomBytes(100)], null, carry, true, new NearHeard(alone)), NoWayError);
  assert.equal(texted, 0);

  // A link that dropped is let go of: the contact is no longer near.
  up = false;
  assert.equal(n.offer('aa', [randomBytes(100)], heard), 'spread');
  assert.equal(heard.isNear('aa'), false);
  heard.clear();
  assert.equal(heard.linkOf('aa'), null);
});

test("what opened in none of the space's chats is tried in its open hidden places, and kept, unopened, when none takes it", async () => {
  setCurrentSpace(4, randomBytes(32));
  nearby.start(() => true);
  for (const packet of nearby.heldPackets()) nearby.dropHeld(packet);
  const mine = randomBytes(80);
  const tried: string[] = [];
  const place: PlaceOpener = async (link, packet) => {
    tried.push(link ?? 'kept');
    return packet === mine;
  };
  // Not open: kept, in memory only.
  const before = { files: new Map(files), blobs: new Map(blobs) };
  await unopenedNearby('ble-link-1', mine);
  assert.deepEqual(nearby.heldPackets(), [mine]);
  assert.deepEqual(new Map(files), before.files, 'nothing written');
  assert.deepEqual(new Map(blobs), before.blobs, 'nothing written');

  // It opens: what was kept for it opens there, and is kept no longer.
  const stop = openPlaceNearby(4, 2, place);
  await openHeldIn(place);
  assert.deepEqual(tried.splice(0), ['kept']);
  assert.deepEqual(nearby.heldPackets(), []);
  await unopenedNearby('ble-link-1', mine);
  assert.deepEqual(tried.splice(0), ['ble-link-1']);
  assert.deepEqual(nearby.heldPackets(), []);
  const stranger = randomBytes(80);
  await unopenedNearby('lan-3', stranger);
  assert.deepEqual(nearby.heldPackets(), [stranger], 'none of its: kept for another space or place');
  nearby.dropHeld(stranger);
  // By SMS: never a hidden place's.
  assert.equal(await openInPlaces(4, SMS_LINK, mine), false);
  assert.deepEqual(tried.splice(0), ['lan-3']);

  // Another space open: this one's places are not tried.
  setCurrentSpace(5, randomBytes(32));
  await unopenedNearby('ble-link-1', mine);
  assert.deepEqual(tried, []);
  assert.deepEqual(nearby.heldPackets(), [mine]);
  nearby.dropHeld(mine);
  setCurrentSpace(4, randomBytes(32));

  // Closed: no more.
  stop();
  await unopenedNearby('ble-link-1', mine);
  assert.deepEqual(tried, []);
  assert.deepEqual(nearby.heldPackets(), [mine]);
  nearby.dropHeld(mine);
  setCurrentSpace(null);
});

test('where a place heard its contacts lasts while its screen or its receiver wants it, and is forgotten after', () => {
  nearby.start(() => true);
  nearby.linkUp('ble-link-9');
  const screen = placeNear(1, 3);
  const receiver = placeNear(1, 3);
  assert.equal(screen.heard, receiver.heard);
  assert.notEqual(placeNear(1, 2).heard, screen.heard, "each place's is its own");
  screen.heard.heardOn('cc', 'ble-link-9');
  screen.release();
  screen.release();
  assert.equal(receiver.heard.isNear('cc'), true);
  receiver.release();
  assert.equal(receiver.heard.isNear('cc'), false, 'forgotten');
  const again = placeNear(1, 3);
  assert.notEqual(again.heard, receiver.heard);
  assert.equal(again.heard.isNear('cc'), false);
  again.release();
});

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

test('a hidden contact talks to the place nearby: opened only while it is open, never in the space, which holds only bytes', { skip: !ready }, async () => {
  files.clear();
  blobs.clear();
  const spaceKey = randomBytes(32);
  setCurrentSpace(0, spaceKey);
  const space = await E2E.open('space', 0, spaceKey);
  const place = await E2E.open(hiddenHolder(1), 0, randomBytes(32));
  const bob = await E2E.open('space', 7, randomBytes(32));
  const bobPhone = new Nearby();
  const toBob: Uint8Array[] = [];
  bobPhone.start(() => true);
  const sentOn: string[] = [];
  nearby.start((link, text) => {
    sentOn.push(link);
    const packet = bobPhone.frameIn('ble-link-alice', text);
    if (packet) toBob.push(packet);
    return true;
  });
  for (const packet of nearby.heldPackets()) nearby.dropHeld(packet);
  nearby.linkUp('ble-link-bob');
  nearby.linkUp('ble-link-stranger');

  // Bob has the place's link, with no relay; Alice's phone has the space open, the place closed.
  const { identity: placeId } = await bob.addContact({ senderHex: '', key: toBase64Url(place.bundle) }, '');
  const hi = await bob.seal(placeId, 'hi, hidden', '');
  // As the space's chats take what comes nearby (lib/receiver.ts openHere).
  const came = async (packet: Uint8Array) => {
    const received = await space.receive(packet);
    if (received.kind === 'refused' && received.reason === 'unknown') await unopenedNearby('ble-link-bob', packet);
    return received;
  };
  const before = { files: new Map(files), blobs: new Map(blobs) };
  for (const packet of [hi.first!, hi.packet]) assert.deepEqual(await came(packet), { kind: 'refused', reason: 'unknown' });
  assert.equal(space.contacts().length, 0, 'the space opened nothing');
  assert.equal(nearby.heldPackets().length, 2, 'kept unopened, in memory');
  assert.deepEqual(new Map(files), before.files, 'nothing written');
  assert.deepEqual(new Map(blobs), before.blobs, 'nothing written');

  // The PIN opens the place: what was kept opens there, from the link it came on from now on.
  const near = placeNear(0, 1);
  const texts: string[] = [];
  let bobId = '';
  const open: PlaceOpener = async (link, packet) => {
    const received = await place.receive(packet);
    if (received.kind === 'refused' && received.reason === 'unknown') return false;
    if (received.kind === 'message') {
      bobId = received.identity;
      texts.push(received.text);
      if (link) near.heard.heardOn(received.identity, link);
    }
    return true;
  };
  const stop = openPlaceNearby(0, 1, open);
  await openHeldIn(open);
  assert.deepEqual(texts.splice(0), ['', 'hi, hidden']);
  assert.deepEqual(nearby.heldPackets(), []);
  const more = await bob.seal(placeId, 'are you near?', '');
  assert.deepEqual(await came(more.packet), { kind: 'refused', reason: 'unknown' });
  assert.deepEqual(texts.splice(0), ['are you near?']);
  assert.equal(near.heard.isNear(bobId), true);
  assert.equal(nearby.isNear(bobId), false, 'the space never hears of it');
  assert.equal(space.contacts().length, 0);

  // The place answers on Bob's link alone, with no relay: never to the stranger, never carried.
  await place.acceptRequest(bobId);
  const answer = await place.seal(bobId, 'yes, here', '');
  sentOn.splice(0);
  const way = await handOverHidden(place, null, bobId, { sealed: { ...answer, spare: answer.spare ?? null }, packets: [answer.packet] }, 'message', false, near.heard);
  assert.equal(way, 'nearby');
  assert.ok(sentOn.length > 0 && sentOn.every((link) => link === 'ble-link-bob'));
  assert.deepEqual(nearby.carriedCount(), { own: 0, others: 0 });
  const back = toBob.splice(0).map((packet) => bob.receive(packet));
  assert.equal(message((await Promise.all(back)).at(-1)!).text, 'yes, here');

  // Closed again: what comes is kept unopened, and where Bob was heard is forgotten.
  stop();
  near.release();
  assert.equal(near.heard.isNear(bobId), false);
  const later = await bob.seal(placeId, 'still there?', '');
  assert.deepEqual(await came(later.packet), { kind: 'refused', reason: 'unknown' });
  assert.deepEqual(texts, []);
  assert.equal(nearby.heldPackets().length, 1);
  for (const packet of nearby.heldPackets()) nearby.dropHeld(packet);
  setCurrentSpace(null);
});

test('a closed place that receives takes what comes nearby for it, and what was kept, and nothing while its screen holds it', { skip: !ready }, async () => {
  store.clear();
  files.clear();
  blobs.clear();
  // Bob's space is open, its hidden chats in pocket 1 closed, their switch on, with no relay.
  const spaceKey = randomBytes(32);
  const placeKey = randomBytes(32);
  setCurrentSpace(0, spaceKey);
  await prepareKeepEntries();
  await saveHiddenData(0, 1, placeKey, EMPTY_SPACE);
  const bob = await placeChats(0, 1, placeKey);
  await keepPlace(0, spaceKey, 1, placeKey);
  const alice = await E2E.open('space', 1, randomBytes(32));
  const { identity: bobId } = await alice.addContact({ senderHex: '', key: toBase64Url(bob.e2e.bundle) }, '');
  nearby.start(() => true);
  for (const packet of nearby.heldPackets()) nearby.dropHeld(packet);
  nearby.linkUp('ble-link-alice');

  // What came before the place started to receive was kept, unopened.
  const hello = await alice.seal(bobId, 'came early', '');
  for (const packet of [hello.first!, hello.packet]) await unopenedNearby('ble-link-alice', packet);
  assert.equal(nearby.heldPackets().length, 2);

  const heard: string[] = [];
  const stopHeard = onPlaceMessage((space, pocket, received) => {
    assert.deepEqual([space, pocket], [0, 1]);
    heard.push(received.text);
  });
  setAppShown(true);
  const stop = startPlaceReceiver(30);
  const texts = () => bob.history.messages().map((message) => message.text);
  try {
    await until(() => receivesPocket(0, 1));
    await until(() => texts().includes('came early'));
    assert.deepEqual(nearby.heldPackets(), []);
    assert.ok(heard.includes('came early'));
    const now = await alice.seal(bobId, 'came now', '');
    await unopenedNearby('ble-link-alice', now.packet);
    await until(() => texts().includes('came now'));
    // Where Alice was heard is the place's, never the space's.
    const near = placeNear(0, 1);
    assert.equal(near.heard.isNear(bob.e2e.contacts()[0].identity), true);
    near.release();
    assert.equal(nearby.isNear(bob.e2e.contacts()[0].identity), false);

    // While its chat screen holds it, the screen takes them: the receiver lets them be.
    const release = await holdPlace(0, 1);
    const held = await alice.seal(bobId, 'while held', '');
    await unopenedNearby('ble-link-alice', held.packet);
    assert.equal(nearby.heldPackets().length, 1);
    assert.ok(!texts().includes('while held'));
    release();
  } finally {
    stop();
    stopHeard();
    (await holdPlace(0, 1))();
    forgetPlaceChats();
    for (const packet of nearby.heldPackets()) nearby.dropHeld(packet);
    setCurrentSpace(null);
  }
  // Stopped, it takes nothing more.
  setCurrentSpace(0, spaceKey);
  const after = await alice.seal(bobId, 'after', '');
  await unopenedNearby('ble-link-alice', after.packet);
  assert.equal(nearby.heldPackets().length, 1);
  nearby.dropHeld(after.packet);
  setCurrentSpace(null);
});
