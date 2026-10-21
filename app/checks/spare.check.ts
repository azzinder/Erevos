// The home relay (lib/spare.ts): the contact link and messages say a backup queue beside the main
// one, sends try it when the main relay cannot take them (lib/space-chats.ts contactTarget), and
// the receiver takes what came there even while the main relay is down. The relay part runs with
// real relays and the real core, and is skipped, with a note, without them.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { contactLink, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url } from '../lib/e2e';
import { startReceiver } from '../lib/receiver';
import { createQueue, fromHex, receiveMessage, relayKey, sendMessage, toHex } from '../lib/relay';
import { contactTarget, forgetSpaceChats, relayFor, spaceChats } from '../lib/space-chats';
import { forgetSpare, hiddenSpare, readySpare, setSpareRelay, spareBackup, spareCode } from '../lib/spare';
import { setCurrentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, updateCurrentSpaceData } from '../lock/space-data';
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
  console.log('Skipping the home relay checks through relays: build the core first with node checks/build-core.mjs');
}
relayNote('the home relay checks through relays');

const KEY = 'A'.repeat(43);
const hex = (bytes: number) => toHex(randomBytes(bytes));

test('a contact link carries the backup queue, and one that does not read is left out', () => {
  const spare = { senderHex: hex(24), relayUrl: 'wss://home.example.org/erevos', relayKey: KEY };
  const code = { senderHex: hex(24), relayUrl: 'wss://relay.example.org', key: 'abc', relayKey: KEY, spare };
  assert.deepEqual(parseContact(contactLink(code)), code);
  const plain = { senderHex: code.senderHex, relayUrl: code.relayUrl, key: 'abc', relayKey: KEY };
  assert.deepEqual(parseContact(`${contactLink(plain)}&sid=nothex&srelay=wss%3A%2F%2Fhome`), plain);
  assert.deepEqual(parseContact(`${contactLink(plain)}&sid=${hex(24)}&srelay=http%3A%2F%2Fhome`), plain);
  assert.deepEqual(parseContact(contactLink({ ...code, spare: { senderHex: spare.senderHex, relayUrl: spare.relayUrl } })), {
    ...code,
    spare: { senderHex: spare.senderHex, relayUrl: spare.relayUrl },
  });
});

test('a send goes to the main queue first, then the backup queue, then the same through the home relay', () => {
  const own = relayFor('wss://mine.example.org', 't', '', '', { url: 'wss://home.mine.example', token: 'h' })!;
  const spare = { sender: hex(24), relay: 'wss://home.theirs.example', relayKey: KEY };
  const to = contactTarget(own, { relay: 'wss://theirs.example.org', relayKey: KEY, spare });
  assert.equal(to.url, 'wss://theirs.example.org');
  assert.equal(to.via?.url, 'wss://mine.example.org');
  assert.deepEqual(
    to.fallback?.map((f) => [f.relay.url, f.relay.via?.url, f.senderId ? toHex(f.senderId) : '']),
    [
      ['wss://home.theirs.example', 'wss://mine.example.org', spare.sender],
      ['wss://theirs.example.org', 'wss://home.mine.example', ''],
      ['wss://home.theirs.example', 'wss://home.mine.example', spare.sender],
    ],
  );
  // On our own relay: straight there, and through the home relay to it when it is down.
  const same = contactTarget(own, { relay: '', relayKey: '' });
  assert.equal(same.url, 'wss://mine.example.org');
  assert.equal(same.via, undefined);
  assert.deepEqual(same.fallback?.map((f) => [f.relay.url, f.relay.via?.url]), [['wss://mine.example.org', 'wss://home.mine.example']]);
  // Without a backup anywhere, as before.
  const plain = relayFor('wss://mine.example.org', '', '', '')!;
  assert.equal(contactTarget(plain, { relay: '', relayKey: '' }).fallback, undefined);
  assert.throws(() => contactTarget(plain, { relay: 'wss://theirs.example.org', relayKey: '' }), /no key/);
});

test('while the main relay is down, messages come through the home relay, and receipts go back through it', { skip: !coreReady || !relayReady }, async () => {
  files.clear();
  blobs.clear();
  forgetSpaceChats();
  forgetSpare();
  // Alice's relay, and Bob's home relay. Bob's own relay is down.
  const alicesRelay = await startRelay(true);
  const home = await startRelay(true);
  const down = 'ws://127.0.0.1:1';
  const fake = { recipientHex: hex(24), senderHex: hex(24) };

  setCurrentSpace(0, randomBytes(32));
  await updateCurrentSpaceData({ url: down, ownQueue: fake, spare: { url: home, token: '', queue: null } });
  const bob = await spaceChats();
  const stop = startReceiver(50);
  try {
    // The receiver makes Bob's queue on the home relay, and says it from then on.
    for (let i = 0; i < 200 && !bob.e2e.spare(); i++) await new Promise((r) => setTimeout(r, 25));
    const said = bob.e2e.spare();
    assert.ok(said);
    assert.equal(said.relay, home);
    assert.ok(said.relayKey);

    // Alice adds Bob's link, which says both queues, and writes.
    const link = contactLink({ senderHex: fake.senderHex, relayUrl: down, key: toBase64Url(bob.e2e.bundle), relayKey: KEY, spare: spareCode(said) });
    const code = parseContact(link)!;
    const alice = await E2E.open('space', 1, randomBytes(32));
    const ids = await createQueue({ url: alicesRelay });
    const aliceQueue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    const key = await relayKey({ url: alicesRelay });
    const where = { relay: alicesRelay, relayKey: toBase64Url(key!) };
    const { identity: bobId } = await alice.addContact(code, aliceQueue.senderHex, where);
    assert.deepEqual(alice.pending()[0].spare, said);
    const own = relayFor(alicesRelay, '', '', '')!;
    const [first] = alice.pending();
    await sendMessage(contactTarget(own, first), fromHex(first.sender), first.first);
    await alice.firstSent(bobId);
    const sealed = await alice.seal(bobId, 'through the home relay', aliceQueue.senderHex, { at: where });
    await sendMessage(contactTarget(own, sealed), fromHex(sealed.sender), sealed.packet);

    // Bob's receiver takes it from the home relay, and tells Alice it came, through the home relay.
    const peer = `contact:${toHex(alice.identity)}`;
    for (let i = 0; i < 200 && !bob.history.messages().some((m) => m.peer === peer && m.text === 'through the home relay'); i++) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(bob.history.messages().some((m) => m.peer === peer && m.text === 'through the home relay'));
    // A first message is a request, which hears nothing back until accepted.
    await bob.e2e.acceptRequest(toHex(alice.identity));
    const again = await alice.seal(bobId, 'and again', aliceQueue.senderHex, { at: where });
    await sendMessage(contactTarget(own, again), fromHex(again.sender), again.packet);
    // Bob's newer prekeys may come first, in a message of their own with nothing else in it.
    let got: Awaited<ReturnType<typeof alice.receive>> | null = null;
    for (let i = 0; i < 200 && !(got?.kind === 'message' && got.got.length > 0); i++) {
      const bytes = await receiveMessage({ url: alicesRelay }, ids.recipientId);
      if (bytes) got = await alice.receive(bytes);
      else await new Promise((r) => setTimeout(r, 25));
    }
    assert.equal(got?.kind, 'message');
    assert.ok(got?.kind === 'message' && got.got.includes(again.tag));
    // What Bob writes says the home relay too, so Alice keeps it.
    assert.deepEqual((await alice.seal(bobId, '', aliceQueue.senderHex, { at: where })).spare, said);
  } finally {
    stop();
    forgetSpaceChats();
    forgetSpare();
  }
});

test('a hidden place keeps its own home relay, sealed with its key, and the space knows nothing of it', { skip: !relayReady }, async () => {
  files.clear();
  blobs.clear();
  forgetSpare();
  const home = await startRelay();
  setCurrentSpace(0, randomBytes(32));
  const key = randomBytes(32);
  const store = hiddenSpare(0, 2, key);
  await setSpareRelay(home, '', store);
  assert.equal(await readySpare(store), true);
  const kept = await loadHiddenData(0, 2, key);
  assert.equal(kept.spare.url, home);
  assert.ok(kept.spare.queue);
  assert.equal(spareBackup(store)?.url, home);
  // The space, and another place, have none.
  assert.deepEqual((await loadCurrentSpaceData()).spare, { url: '', token: '', queue: null });
  assert.equal((await loadHiddenData(0, 1, key)).spare.url, '');
  assert.equal(spareBackup(), undefined);
  // Closing the place lets go of it.
  forgetSpare(store);
  assert.equal(spareBackup(store), undefined);
});
