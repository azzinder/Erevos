// Messages that come while a space is open but no chat is (lib/receiver.ts), through a real relay
// and the real core: kept in the space's history, the sender told they came (not a message
// request's), and nothing taken while the chat screen holds the receiver. Skipped, with a note,
// when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, ONLINE, toBase64Url, type Received } from '../lib/e2e';
import { answersAsk, holdReceiver, onReceived, startReceiver } from '../lib/receiver';
import { createQueue, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { forgetSpaceChats, spaceChats } from '../lib/space-chats';
import { setCurrentSpace } from '../lock/keys';
import { updateCurrentSpaceData } from '../lock/space-data';
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
  console.log('Skipping the receiver checks: build the core first with node checks/build-core.mjs');
}
relayNote('the receiver checks');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(what: () => boolean | Promise<boolean>, ms = 5000): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (await what()) return;
  throw new Error('waited too long');
}

test('what comes while no chat is open is kept, and the sender hears it came', { skip: !coreReady || !relayReady }, async () => {
  files.clear();
  blobs.clear();
  const url = await startRelay();
  const relay = { url };
  const queue = async () => {
    const ids = await createQueue(relay);
    return { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  };

  // Bob's space is open, on the home screen.
  setCurrentSpace(0, randomBytes(32));
  const bobQueue = await queue();
  await updateCurrentSpaceData({ url, ownQueue: bobQueue });
  const bob = await spaceChats();

  // Alice, on another phone, adds Bob's link and writes.
  const alice = await E2E.open('space', 1, randomBytes(32));
  const aliceQueue = await queue();
  const where = { relay: url, relayKey: '' };
  const { identity: bobId } = await alice.addContact({ senderHex: bobQueue.senderHex, key: toBase64Url(bob.e2e.bundle), relayUrl: url }, aliceQueue.senderHex, where);
  const [first] = alice.pending();
  await sendMessage(relay, fromHex(first.sender), first.first);
  await alice.firstSent(bobId);
  const write = async (text: string) => {
    const sealed = await alice.seal(bobId, text, aliceQueue.senderHex, { at: where });
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
    return sealed.tag;
  };
  const toAlice = async () => {
    const bytes = await receiveMessage(relay, fromHex(aliceQueue.recipientHex));
    return bytes && ((await alice.receive(bytes)) as Extract<Received, { kind: 'message' }>);
  };

  let told = 0;
  const stopListening = onReceived(() => told++);
  const stop = startReceiver(30);
  try {
    const hiTag = await write('hi Bob');
    await until(() => bob.history.messages().length === 1);
    const [hi] = bob.history.messages();
    assert.deepEqual([hi.text, hi.mine, hi.mark, hi.tag], ['hi Bob', false, 0, hiTag]);
    await until(() => told > 0);
    // Someone new: a message request, which hears nothing back.
    assert.equal(bob.e2e.contacts()[0].request, true);
    await sleep(150);
    assert.equal(await toAlice(), null);

    // Accepted, the next message is told as come.
    await bob.e2e.acceptRequest(bob.e2e.contacts()[0].identity);
    const againTag = await write('still there?');
    await until(() => bob.history.messages().length === 2);
    let receipt: Awaited<ReturnType<typeof toAlice>> = null;
    await until(async () => !!(receipt = await toAlice()));
    assert.deepEqual(receipt!.got, [againTag]);

    // Told while the app shows, so it says the phone is open; an ask so soon after needs no answer.
    assert.ok(receipt!.online > Date.now());
    assert.ok(bob.e2e.toldAt(bob.e2e.contacts()[0].identity) > 0);
    assert.equal(answersAsk(bob.e2e.toldAt(bob.e2e.contacts()[0].identity)), false);
    assert.equal(answersAsk(Date.now() - ONLINE * 1000), true);

    // A chat that appears offline: nothing told, what came is held with the contact.
    const aliceId = bob.e2e.contacts()[0].identity;
    await bob.e2e.setHidden(aliceId, true);
    const quietTag = await write('are you hiding?');
    await until(() => bob.history.messages().length === 3);
    const quietAsk = await alice.seal(bobId, '', aliceQueue.senderHex, { at: where, ask: true, on: ONLINE });
    await sendMessage(relay, fromHex(quietAsk.sender), quietAsk.packet);
    await sleep(200);
    assert.equal(await toAlice(), null);
    // Bob writes: what came goes with it.
    const yes = await bob.e2e.seal(aliceId, 'yes', bobQueue.senderHex, { at: where });
    await sendMessage(relay, fromHex(yes.sender), yes.packet);
    const toldBack = await toAlice();
    assert.deepEqual([toldBack!.text, toldBack!.got], ['yes', [quietTag]]);
    await bob.e2e.setHidden(aliceId, false);

    // While the chat screen holds it, nothing is taken; once let go, it is.
    const release = await holdReceiver();
    await write('held');
    await sleep(200);
    assert.equal(bob.history.messages().length, 3);
    release();
    await until(() => bob.history.messages().length === 4);
    assert.equal(bob.history.messages()[3].text, 'held');
  } finally {
    stop();
    stopListening();
    forgetSpaceChats();
    setCurrentSpace(null);
  }
});
