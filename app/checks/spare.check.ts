// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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

import { contactLink, LINK_MOST, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url } from '../lib/e2e';
import { startReceiver } from '../lib/receiver';
import { createQueue, fromHex, receiveMessage, relayKey, sendMessage, toHex } from '../lib/relay';
import { contactTarget, forgetSpaceChats, relayFor, spaceChats } from '../lib/space-chats';
import { forgetSpare, hiddenSpare, homeRelays, readySpare, setSpareRelay, setSpareRelays, spareBackup, spareCode } from '../lib/spare';
import { qrRows } from '../lib/qr';
import { parseWelcome, welcomeLink } from '../lib/welcome';
import { checkedSpare, MORE_SPARE, sparesOf } from '../lock/e2e-data';
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

test('a contact link carries a list of home relays, in order, each once, and an older reader keeps the first', () => {
  const first = { senderHex: hex(24), relayUrl: 'wss://home.example.org/erevos', relayKey: KEY };
  const second = { senderHex: hex(24), relayUrl: 'wss://friend.example.net', relayKey: KEY };
  const third = { senderHex: hex(24), relayUrl: 'ws://192.168.1.10:7879' };
  const code = { senderHex: hex(24), relayUrl: 'wss://relay.example.org', key: 'abc', relayKey: KEY, spare: { ...first, more: [second, third] } };
  const link = contactLink(code);
  assert.match(link, /&sid2=.*&srelay2=.*&srk2=.*&sid3=.*&srelay3=/);
  assert.deepEqual(parseContact(link), code);
  // An Erevos before the list reads the link as it always did: the numbered ones are names it does not know.
  const old = link.replace(/&(sid|srelay|srk)[23]=[^&]*/g, '');
  assert.deepEqual(parseContact(old), { ...code, spare: first });
  // Past the most a link says, the same relay twice, one that does not read: left out.
  const fourth = `&sid4=${hex(24)}&srelay4=${encodeURIComponent('wss://four.example')}`;
  assert.deepEqual(parseContact(link + fourth), code);
  const twice = contactLink({ ...code, spare: { ...first, more: [{ ...second, relayUrl: first.relayUrl }, third] } });
  assert.deepEqual(parseContact(twice)?.spare, { ...first, more: [third] });
  const bad = link.replace(/srelay2=[^&]*/, 'srelay2=http%3A%2F%2Fnope');
  assert.deepEqual(parseContact(bad)?.spare, { ...first, more: [third] });
  // Without a first, the others say nothing.
  assert.equal(parseContact(link.replace(/&sid=[^&]*/, ''))?.spare, undefined);
  // An invite brings the list whole.
  assert.deepEqual(parseWelcome(welcomeLink(link, { hi: 'ab'.repeat(16) }))?.contact, code);
});

test('a contact link with every home relay, Nostr and a ticket still fits one QR code', () => {
  const long = (name: string) => `wss://${name}.a-rather-long-name-for-a-home-relay.example.org/erevos`;
  const code = {
    senderHex: hex(24),
    relayUrl: long('relay'),
    // An account bundle is about 1800 characters.
    key: 'A'.repeat(1800),
    relayKey: KEY,
    spare: { senderHex: hex(24), relayUrl: long('home'), relayKey: KEY, more: [1, 2].map((n) => ({ senderHex: hex(24), relayUrl: long(`home${n}`), relayKey: KEY })) },
    lend: `ticket.${'a'.repeat(80)}`,
    nostr: { k: hex(32), r: [1, 2, 3, 4, 5].map((n) => `wss://nostr${n}.example.org`) },
  };
  // Too long with both others: the link says the first only, and the others come with the first message.
  const link = contactLink(code);
  const without = contactLink({ ...code, spare: { ...code.spare, more: [] } });
  assert.equal(link, without);
  assert.ok(without.length > LINK_MOST - 300);
  assert.deepEqual(parseContact(link)?.spare, { senderHex: code.spare.senderHex, relayUrl: code.spare.relayUrl, relayKey: KEY });
  // Greek letters take six characters each in a link.
  const invite = welcomeLink(link, { code: 'cd'.repeat(32), hi: 'ab'.repeat(16), name: 'Ν'.repeat(40) });
  assert.ok(invite.length < 2950, `${invite.length} characters`);
  assert.ok(qrRows(invite).length <= 177);
  // With shorter addresses both fit, and all of it reads back.
  const short = (name: string) => `wss://${name}.example.org`;
  const { lend: _lend, nostr: _nostr, ...plain } = code;
  const fits = { ...plain, relayUrl: short('relay'), spare: { ...code.spare, relayUrl: short('home'), more: code.spare.more.map((m, i) => ({ ...m, relayUrl: short(`h${i}`) })) } };
  assert.deepEqual(parseContact(contactLink(fits)), fits);
  assert.ok(qrRows(welcomeLink(contactLink(fits), { code: 'cd'.repeat(32), hi: 'ab'.repeat(16), name: 'Ν'.repeat(40) })).length <= 177);
});

test('a backup queue as kept or said holds at most two more, each relay once', () => {
  const one = (relay: string) => ({ sender: hex(24), relay, relayKey: KEY });
  const first = one('wss://a.example');
  const said = checkedSpare({ ...first, more: [one('wss://b.example'), one('wss://A.example'), { sender: 'x', relay: 'wss://c.example' }, one('wss://d.example'), one('wss://e.example')] });
  assert.deepEqual(said?.more?.map((m) => m.relay), ['wss://b.example', 'wss://d.example']);
  assert.deepEqual(sparesOf(said).map((s) => s.relay), ['wss://a.example', 'wss://b.example', 'wss://d.example']);
  // One said inside another says no more of its own.
  assert.equal(checkedSpare({ ...first, more: [{ ...one('wss://b.example'), more: [one('wss://c.example')] }] })?.more?.[0].more, undefined);
  assert.equal(MORE_SPARE, 2);
  assert.deepEqual(sparesOf(null), []);
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
  // Their other home relays come after the first, each through ours, then each through our home relay.
  const second = { sender: hex(24), relay: 'wss://second.theirs.example', relayKey: KEY };
  const list = contactTarget(own, { relay: 'wss://theirs.example.org', relayKey: KEY, spare: { ...spare, more: [second] } });
  assert.deepEqual(
    list.fallback?.map((f) => [f.relay.url, f.relay.via?.url, f.senderId ? toHex(f.senderId) : '']),
    [
      ['wss://home.theirs.example', 'wss://mine.example.org', spare.sender],
      ['wss://second.theirs.example', 'wss://mine.example.org', second.sender],
      ['wss://theirs.example.org', 'wss://home.mine.example', ''],
      ['wss://home.theirs.example', 'wss://home.mine.example', spare.sender],
      ['wss://second.theirs.example', 'wss://home.mine.example', second.sender],
    ],
  );
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

test('with two home relays, both are said, kept and looked at, and a message to the second comes', { skip: !coreReady || !relayReady }, async () => {
  files.clear();
  blobs.clear();
  forgetSpaceChats();
  forgetSpare();
  const alicesRelay = await startRelay(true);
  const homeOne = await startRelay(true);
  const homeTwo = await startRelay(true);
  const down = 'ws://127.0.0.1:1';
  const fake = { recipientHex: hex(24), senderHex: hex(24) };

  setCurrentSpace(0, randomBytes(32));
  await updateCurrentSpaceData({ url: down, ownQueue: fake });
  await setSpareRelays([
    { url: homeOne, token: '' },
    { url: homeTwo, token: '' },
    { url: homeOne, token: '' },
    { url: '', token: '' },
  ]);
  assert.deepEqual(homeRelays((await loadCurrentSpaceData()).spare).map((h) => h.url), [homeOne, homeTwo]);
  const bob = await spaceChats();
  const stop = startReceiver(50);
  try {
    for (let i = 0; i < 200 && !bob.e2e.spare()?.more; i++) await new Promise((r) => setTimeout(r, 25));
    const said = bob.e2e.spare();
    assert.equal(said?.relay, homeOne);
    assert.equal(said?.more?.[0].relay, homeTwo);
    // Both queues are kept, each with its relay.
    const kept = (await loadCurrentSpaceData()).spare;
    assert.ok(kept.queue && kept.more?.[0].queue);
    assert.equal(kept.more[0].queue.senderHex, said?.more?.[0].sender);

    // Alice adds the link, which says both, and writes to the second one, as when the first is down too.
    const link = contactLink({ senderHex: fake.senderHex, relayUrl: down, key: toBase64Url(bob.e2e.bundle), relayKey: KEY, spare: spareCode(said) });
    const alice = await E2E.open('space', 1, randomBytes(32));
    const ids = await createQueue({ url: alicesRelay });
    const aliceQueue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    const key = await relayKey({ url: alicesRelay });
    const where = { relay: alicesRelay, relayKey: toBase64Url(key!) };
    const { identity: bobId } = await alice.addContact(parseContact(link)!, aliceQueue.senderHex, where);
    const [first] = alice.pending();
    assert.deepEqual(first.spare, said);
    const second = said!.more![0];
    await sendMessage({ url: homeTwo }, fromHex(second.sender), first.first);
    await alice.firstSent(bobId);
    const sealed = await alice.seal(bobId, 'through the second home relay', aliceQueue.senderHex, { at: where });
    await sendMessage({ url: homeTwo }, fromHex(second.sender), sealed.packet);
    const peer = `contact:${toHex(alice.identity)}`;
    for (let i = 0; i < 200 && !bob.history.messages().some((m) => m.peer === peer && m.text === 'through the second home relay'); i++) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(bob.history.messages().some((m) => m.peer === peer && m.text === 'through the second home relay'));

    // Down to one: the second is let go of, and no longer said.
    await setSpareRelays([{ url: homeOne, token: '' }]);
    const left = await loadCurrentSpaceData();
    assert.equal(left.spare.more, undefined);
    assert.equal(left.spare.queue?.senderHex, said?.sender);
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
