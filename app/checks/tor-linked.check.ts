// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A chat's "Through Tor" switch (Contact.tor, lib/tor-chats.ts) on the account's linked devices:
// alone, what goes between devices for it (lib/link-wire.ts, lib/siblings.ts) and into the
// account's log (lib/sync/contacts.ts), a version from before that says nothing of it leaving it as
// it is, and what is sealed for such a chat going on its circuits or not at all (lib/space-chats.ts
// sendSealed). Then a phone and a linked computer through a real relay and the real core: switched
// on or off on either, it is so on both, the computer seals for that chat's circuits, and its own
// link to the phone, through the phone's queue every chat shares there, is not on them. Those
// skipped, with a note, when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { Links, type HistoryChoice } from '../lib/devices';
import { E2E, toBase64Url } from '../lib/e2e';
import { changedFields, checkedSynced, encodeEnvelope, mirrorOf, Parts, syncedOf, type Synced } from '../lib/link-wire';
import { createQueue, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';
import { blankSynced, changedBy, settled, stamped } from '../lib/siblings';
import { sealedTarget, sendSealed, type SpaceChats } from '../lib/space-chats';
import { changesFor, contactsIn, setsFromLog, syncChangesOf } from '../lib/sync/contacts';
import { change, emptyLog } from '../lib/sync/log';
import { circuitOf } from '../lib/tor-chats';
import { VoiceAssembler } from '../lib/voice';
import type { Contact } from '../lock/e2e-data';
import { History } from '../lock/history';
import { EMPTY_SPACE, saveSpaceData, type Queue } from '../lock/space-data';
import { blobs, files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
let wasmCore: Core | null = null;
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  // With no channels to a relay's key, as checks/devices.check.ts has it.
  const calls = Object.entries(wasm).filter(([name]) => name !== 'relayChannelKeys');
  wasmCore = Object.fromEntries(calls.map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core;
} else {
  console.log('Skipping the linked Tor chat checks through a relay: build the core first with node checks/build-core.mjs');
}
relayNote('the linked Tor chat checks through a relay');

const C = 'c'.repeat(64);
const ACCOUNT = 'a'.repeat(64);
const AT = { sender: 'ab'.repeat(24), relay: 'ws://localhost:1', relayKey: '', spare: null };
const ONLY_TOR = /only through Tor/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// What a contact's word goes between devices as, and comes out as.
function through(envelope: Parameters<typeof encodeEnvelope>[0]) {
  return new Parts().take('x', encodeEnvelope(envelope, AT)[0]);
}

test('whether a chat goes through Tor goes between devices, and one from before that says nothing of it turns it off nowhere', () => {
  const synced: Synced = { ...blankSynced(C), request: false };
  // Said always by this version, on or off; kept as true or not at all.
  const contact = { ...synced, avatar: null };
  assert.equal(syncedOf({ ...contact, tor: undefined }).tor, false);
  assert.equal(syncedOf({ ...contact, tor: true }).tor, true);
  // Said, it comes as said; not said, as by a version from before, it is not there.
  assert.equal(checkedSynced({ ...synced, tor: true })?.tor, true);
  assert.equal(checkedSynced({ ...synced, tor: false })?.tor, false);
  const { tor: _tor, ...before } = synced;
  assert.equal('tor' in checkedSynced(before)!, false);

  // Only what changed goes: on, then off; one never said is off, so a device that comes to this
  // version says nothing of its chats that are not through Tor, and its others' word is not undone.
  assert.deepEqual(changedFields(synced, { ...synced, tor: true }), { tor: true });
  assert.deepEqual(changedFields({ ...synced, tor: true }, synced), { tor: false });
  assert.deepEqual(changedFields(before, synced), {});
  assert.deepEqual(changedFields(before, { ...synced, tor: true }), { tor: true });
  assert.deepEqual(changedFields({ ...synced, tor: true }, before), {});

  // A change to it, as a device says it; one from before says none.
  const set = (change: object) => through({ k: 'set', c: C, change, when: 5 } as never);
  assert.deepEqual(set({ tor: true }), { k: 'set', c: C, change: { tor: true }, when: 5, at: AT });
  assert.deepEqual(set({ hide: true }), { k: 'set', c: C, change: { hide: true }, when: 5, at: AT });
  const told = through({ k: 'contacts', all: true, list: [{ ...synced, tor: true }, before as Synced], gone: [] });
  assert.deepEqual(told?.k === 'contacts' && told.list.map((s) => s.tor), [true, undefined]);

  // On the linked device: as the phone says it, and kept while the phone says nothing of it.
  const kept = mirrorOf({ ...synced, tor: true }, undefined, AT, ACCOUNT);
  assert.equal(kept.tor, true);
  const off = mirrorOf(synced, kept, AT, ACCOUNT);
  assert.equal('tor' in off, false, 'off is no field, never false');
  assert.equal(mirrorOf(before as Synced, kept, AT, ACCOUNT).tor, true);
  assert.equal('tor' in mirrorOf(before as Synced, off, AT, ACCOUNT), false);
});

test('switched at once on two devices, the later wins; a phone from before leaves the device as it is', () => {
  const kept = stamped({ ...blankSynced(C), request: false }, {}, 100, true);
  assert.equal(kept.at?.tor, 100);
  // From another device: set later, taken; set before, not.
  assert.equal(changedBy(kept, C, { tor: true }, 200, false, 0)?.tor, true);
  assert.equal(changedBy(kept, C, { tor: true }, 90, false, 0), null);
  // What the phone says, settled with what this device set later.
  const mine: Synced = { ...kept, tor: true, at: { ...kept.at, tor: 300 } };
  assert.equal(settled(mine, { ...kept, at: { ...kept.at, tor: 200 } }).tor, true);
  assert.equal(settled(mine, { ...kept, at: { ...kept.at, tor: 400 } }).tor, false);
  // A phone from before says no times and nothing of it: taken as said, and the chat stays as kept.
  const { tor: _tor, at: _at, ...old } = kept;
  const said = settled(mine, old as Synced);
  assert.equal('tor' in said, false);
  const mirror = mirrorOf(said, mirrorOf(mine, undefined, AT, ACCOUNT), AT, ACCOUNT);
  assert.equal(mirror.tor, true);
  // And the device says it again, on, never off.
  assert.deepEqual(changedFields(said, syncedOf(mirror)), { tor: true });
});

test("the account's log keeps it, and one that never said it leaves it as it is", () => {
  // A change a device said goes into the log as one field.
  assert.deepEqual(syncChangesOf({ k: 'set', c: C, change: { tor: true }, when: 5 }), [{ k: 'contact', id: C, f: 'tor', v: true }]);
  assert.deepEqual(syncChangesOf({ k: 'set', c: C, change: { hide: true }, when: 5 }), [{ k: 'contact', id: C, f: 'hide', v: true }]);

  // The phone writes it, on or off; a contact without it writes none.
  const log = emptyLog(ACCOUNT, ACCOUNT);
  const carol = { identity: C, name: 'Carol', timer: 0, request: false, look: null, hide: false };
  for (const c of changesFor(log, [{ ...carol, tor: true }], [])) change(log, 1000, c);
  assert.equal(contactsIn(log)[0].tor, true);
  assert.equal(
    changesFor(log, [carol], []).some((c) => 'f' in c && c.f === 'tor'),
    false,
  );
  assert.deepEqual(changesFor(log, [{ ...carol, tor: false }], []), [{ k: 'contact', id: C, f: 'tor', v: false }]);

  // A device takes it from the log as a change, by when it was set there.
  const kept: Synced = { ...blankSynced(C), name: 'Carol', request: false };
  assert.deepEqual(
    setsFromLog(log, C, kept).map((s) => s.change),
    [{ tor: true }],
  );
  assert.deepEqual(setsFromLog(log, C, { ...kept, tor: true }), []);
  const { tor: _tor, ...said } = kept;
  assert.deepEqual(
    setsFromLog(log, C, said as Synced).map((s) => s.change),
    [{ tor: true }],
  );
  // A log that never said it says nothing of it.
  const old = emptyLog(ACCOUNT, ACCOUNT);
  for (const c of changesFor(old, [carol], [])) change(old, 1000, c);
  assert.equal('tor' in contactsIn(old)[0], false);
  assert.deepEqual(setsFromLog(old, C, { ...kept, tor: true }), []);
  assert.equal('tor' in setsFromLog(old, C, undefined)[0].change, false);
});

test('what is sealed for a chat through Tor goes on its circuits, or not at all where there is no Tor', async () => {
  const sealed = { sender: 'ab'.repeat(24), relay: '', relayKey: '', spare: null, first: null };
  const own = { url: 'ws://127.0.0.1:9' };
  const refusal = (s: object) =>
    sendSealed(own, s as typeof sealed, [randomBytes(8)], 'quiet', async () => undefined).then(
      () => '',
      (error: Error) => error.message,
    );
  // This build has no Tor: refused before it goes anywhere.
  assert.match(await refusal({ ...sealed, torChat: circuitOf(C) }), ONLY_TOR);
  // Without, it is tried straight, where nothing answers.
  assert.doesNotMatch(await refusal(sealed), ONLY_TOR);

  // To their relay through ours, and through our backup relay should ours not take it: each relay
  // on the way on the chat's circuits.
  const theirs = { ...sealed, relay: 'ws://127.0.0.2:9', relayKey: toBase64Url(randomBytes(32)), torChat: circuitOf(C) };
  const to = sealedTarget({ ...own, backup: { url: 'ws://127.0.0.3:9' } }, theirs);
  const ways = [to, to.via, ...(to.fallback ?? []).flatMap((f) => [f.relay, f.relay.via])];
  assert.deepEqual(
    ways.map((r) => [r?.url, r?.torChat]),
    [
      ['ws://127.0.0.2:9', circuitOf(C)],
      [own.url, circuitOf(C)],
      ['ws://127.0.0.2:9', circuitOf(C)],
      ['ws://127.0.0.3:9', circuitOf(C)],
    ],
  );
  const { torChat: _torChat, ...plain } = theirs;
  assert.equal(sealedTarget(own, plain).via?.torChat, undefined);
});

// ---- Through a relay ----

type Phone = { chats: SpaceChats; queue: Queue; links: Links; space: number; key: Uint8Array };

const opened: Links[] = [];
afterEach(() => {
  for (const links of opened.splice(0)) links.close();
});

async function until(what: () => boolean | Promise<boolean>, ms = 8000): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (await what()) return;
  throw new Error('waited too long');
}

// A relay, and phones on it, as checks/devices.check.ts has them.
async function setup() {
  setCore(wasmCore);
  files.clear();
  blobs.clear();
  const url = await startRelay();
  const relay = { url };
  const where = { relay: url, relayKey: '' };
  const queue = async (): Promise<Queue> => {
    const ids = await createQueue(relay);
    return { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  };
  const phone = async (space: number, linking = true): Promise<Phone> => {
    const key = randomBytes(32);
    const own = await queue();
    await saveSpaceData(space, key, { ...EMPTY_SPACE, url, ownQueue: own });
    const chats = { e2e: await E2E.open('space', space, key), history: await History.open('space', space, key), voiceParts: new VoiceAssembler() };
    const links = await Links.open(space, key, chats, 60 * 60_000);
    opened.push(links);
    // A contact on an Erevos from before linked devices has none.
    if (!linking) links.close();
    return { chats, queue: own, links, space, key };
  };
  const take = async ({ chats, queue: own, links }: Phone): Promise<void> => {
    for (;;) {
      const bytes = await receiveMessage(relay, fromHex(own.recipientHex));
      if (!bytes) break;
      const received = await chats.e2e.receive(bytes);
      if (received.kind === 'message' && received.text) await chats.history.add({ peer: `contact:${received.identity}`, text: received.text, mine: false, at: Date.now(), tag: received.tag });
    }
    await links.settled();
  };
  const write = async ({ chats, queue: own }: Phone, identity: string, text: string) => {
    const sealed = await chats.e2e.seal(identity, text, own.senderHex, { at: where });
    if (sealed.first) {
      await sendMessage(relay, fromHex(sealed.sender), sealed.first);
      await chats.e2e.firstSent(identity);
    }
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
    await chats.history.add({ peer: `contact:${identity}`, text, mine: true, at: Date.now(), tag: sealed.tag });
  };
  const linkUp = async (pixel: Phone, dell: Phone, history: HistoryChoice = { since: 0, files: true }) => {
    const asked = await pixel.links.prepare(await dell.links.makeOffer('DELL'));
    await pixel.links.link(history, 'Pixel');
    await take(dell);
    await dell.links.confirm(asked.code);
    await take(pixel);
    await take(dell);
  };
  return { relay, url, where, phone, take, write, linkUp };
}

test('switched on the phone or on the linked computer, a chat goes through Tor on both; the computer seals it for its circuits, and its own link to the phone is not on them', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const { identity: account } = await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  const carolId = carol.chats.e2e.identityHex();
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await until(async () => {
    await take(dell);
    return dell.chats.e2e.contacts().some((c) => c.identity === carolId);
  });
  const shown = (p: Phone) => p.chats.e2e.contacts().find((c) => c.identity === carolId)!;
  assert.equal(shown(dell).tor, undefined);

  // On on the phone: on on the computer, which shows it, so its files go through Tor too.
  await pixel.chats.e2e.setTor(carolId, true);
  await pixel.links.settled();
  await until(async () => {
    await take(dell);
    return dell.chats.e2e.torChat(carolId);
  });
  assert.equal(shown(dell).tor, true);
  // Off on the phone: off there too, no field left.
  await pixel.chats.e2e.setTor(carolId, false);
  await pixel.links.settled();
  await until(async () => {
    await take(dell);
    return !dell.chats.e2e.torChat(carolId);
  });
  assert.equal('tor' in (dell.chats.e2e.record(carolId) as Contact), false);

  // On on the computer: on on the phone, and still on on the computer once the phone says it back.
  await dell.chats.e2e.setTor(carolId, true);
  await dell.links.settled();
  await until(async () => {
    await take(pixel);
    return pixel.chats.e2e.torChat(carolId);
  });
  await take(dell);
  assert.equal(dell.chats.e2e.torChat(carolId), true);
  // The account's log says so on both.
  const logged = async (p: Phone) => contactsIn((await p.links.syncLog())!).find((c) => c.identity === carolId)?.tor;
  await until(async () => {
    await take(pixel);
    await take(dell);
    return (await logged(pixel)) === true && (await logged(dell)) === true;
  });

  // On the computer every chat's queue is the phone's, and so is its own link's: none of it goes on
  // Carol's circuits, as the phone sends what it writes to her on them (refused here, with no Tor).
  const nowhere = { url: 'ws://127.0.0.1:9' };
  const refusal = (sender: string) => sendMessage(nowhere, fromHex(sender), randomBytes(8)).then(() => '', (error: Error) => error.message);
  const mirror = dell.chats.e2e.record(carolId)!;
  assert.doesNotMatch(await refusal(mirror.sender), ONLY_TOR);
  assert.match(await refusal(pixel.chats.e2e.record(carolId)!.sender), ONLY_TOR);

  // What each seals for her says her circuits; from the computer, through the phone or not at all.
  const fromPixel = await pixel.chats.e2e.seal(carolId, 'from the phone', pixel.queue.senderHex, { at: where });
  assert.equal(fromPixel.torChat, circuitOf(carolId));
  const fromDell = await dell.chats.e2e.seal(carolId, 'from the computer', dell.queue.senderHex, { at: where });
  assert.deepEqual([fromDell.through, fromDell.sender, fromDell.torChat], [true, mirror.sender, circuitOf(carolId)]);
  const send = (own: { url: string }, sealed: Parameters<typeof sendSealed>[1]) =>
    sendSealed(own, sealed, [fromDell.packet], 'quiet', async () => undefined).then(
      () => '',
      (error: Error) => error.message,
    );
  assert.match(await send({ url }, fromDell), ONLY_TOR);
  // Through our relay to another, each hop on her circuits; without them, it would go straight.
  const elsewhere = { ...fromDell, relay: 'ws://127.0.0.2:9', relayKey: toBase64Url(randomBytes(32)) };
  assert.match(await send(nowhere, elsewhere), ONLY_TOR);
  const { torChat: _torChat, ...straight } = elsewhere;
  assert.doesNotMatch(await send(nowhere, straight), ONLY_TOR);
});
