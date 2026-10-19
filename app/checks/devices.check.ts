// Linked devices (lib/devices.ts, docs/linked-devices.md): the code a device shows and what goes
// between the devices, alone; then a phone and a computer of one account and a contact on a
// version from before linking, through a real relay and the real core: linking with the codes
// compared, the history brought over, messages both ways and on both devices, contacts kept alike,
// and unlinking. Skipped, with a note, when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes, utf8Encode } from '../lib/crypto';
import { Links } from '../lib/devices';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { cleanDeviceName, linkCodeLink, linkSafetyCode, parseLinkCode } from '../lib/link-code';
import { changedFields, encodeEnvelope, encodeOne, isKept, isSignal, isWorthTelling, mirrorOf, onlyCame, Parts, readPack, syncedOf, withoutPlace, writePack, type Synced } from '../lib/link-wire';
import { createQueue, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';
import type { SpaceChats } from '../lib/space-chats';
import { VoiceAssembler } from '../lib/voice';
import { History } from '../lock/history';
import { EMPTY_SPACE, saveSpaceData, type Queue } from '../lock/space-data';
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
  console.log('Skipping the linked device checks: build the core first with node checks/build-core.mjs');
}
relayNote('the linked device checks');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(what: () => boolean | Promise<boolean>, ms = 8000): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (await what()) return;
  throw new Error('waited too long');
}

const KEY = 'A'.repeat(1800);
const SENDER = 'ab'.repeat(24);
const SECRET = '0f'.repeat(16);

test('a device code goes and comes back whole, and anything else is not one', () => {
  const link = linkCodeLink({ key: KEY, senderHex: SENDER, relayUrl: 'wss://relay.example/q', relayKey: 'k'.repeat(43), secret: SECRET, name: 'DELL & co' });
  assert.ok(link.startsWith('erevos://link?'));
  assert.deepEqual(parseLinkCode(link), { key: KEY, senderHex: SENDER, relayUrl: 'wss://relay.example/q', relayKey: 'k'.repeat(43), secret: SECRET, name: 'DELL & co' });
  assert.deepEqual(parseLinkCode(linkCodeLink({ key: KEY, senderHex: SENDER, relayUrl: 'ws://10.0.0.2:8080', secret: SECRET, name: '' })), {
    key: KEY,
    senderHex: SENDER,
    relayUrl: 'ws://10.0.0.2:8080',
    secret: SECRET,
    name: '',
  });
  // A contact link, a short secret, a bad relay, a bad key: none is a device code.
  assert.equal(parseLinkCode(`erevos://contact?id=${SENDER}&key=${KEY}`), null);
  assert.equal(parseLinkCode(link.replace(SECRET, '0f0f')), null);
  assert.equal(parseLinkCode(link.replace('wss%3A%2F%2Frelay.example%2Fq', 'http%3A%2F%2Fx')), null);
  assert.equal(parseLinkCode(link.replace(KEY, 'not a key!')), null);
  // A name is one short line, without marks that turn the text around.
  assert.equal(cleanDeviceName('  Office\n‮DELL  '), 'Office DELL');
  assert.equal([...cleanDeviceName('x'.repeat(80))].length, 40);
  assert.equal(linkSafetyCode('12345 67890 11111 22222 33333 44444'), '12345 67890 11111 22222');
});

test('what goes between devices: parts put together, messages sorted, contacts kept alike', () => {
  const at = { sender: SENDER, relay: 'ws://localhost:1', relayKey: '', spare: null };
  // A small envelope goes whole; a large one in parts, put together in any order, once.
  const [one] = encodeEnvelope({ k: 'here' }, at);
  const parts = new Parts();
  assert.deepEqual(parts.take('a', one), { k: 'here', at });
  const big = { k: 'in' as const, c: 'c'.repeat(64), m: { text: 'x'.repeat(40_000), tag: 'aabbccddeeff' } };
  const pieces = encodeEnvelope(big, at);
  assert.ok(pieces.length > 1);
  const shuffled = [pieces[2], pieces[0], ...pieces.slice(3), pieces[1]];
  const out = shuffled.map((p) => parts.take('a', p));
  assert.deepEqual(out.slice(0, -1), new Array(pieces.length - 1).fill(null));
  assert.deepEqual(out[out.length - 1], { ...big, at });
  // From another sender, a part is that sender's; what is no envelope is nothing.
  assert.equal(parts.take('b', pieces[0]), null);
  assert.equal(parts.take('a', utf8Encode('{"v":2,"k":"here"}')), null);
  assert.equal(parts.take('a', utf8Encode('not json')), null);
  // A message too long for one packet with where its sender reads goes without it.
  assert.ok(encodeOne({ k: 'send', c: 'c'.repeat(64), m: { text: 'y'.repeat(16_000) } }, at));
  assert.equal(encodeOne({ k: 'send', c: 'c'.repeat(64), m: { text: 'y'.repeat(16_400) } }, at), null);

  // What the chat keeps, what only says what came, what is worth telling the other devices.
  const place = { from: SENDER, relay: 'ws://a', relayKey: '', spare: null };
  assert.equal(isKept({ ...place, text: 'hi', tag: 'aabbccddeeff' }), true);
  assert.equal(isKept({ ...place, text: '', tag: '' }), false);
  assert.equal(onlyCame({ ...place, text: '', timer: 0, timerAt: 5, got: ['aabbccddeeff'] }, 5), true);
  assert.equal(onlyCame({ ...place, text: '', timer: 60, timerAt: 9 }, 5), false);
  assert.equal(onlyCame({ ...place, text: '', read: ['aabbccddeeff'] }, 5), false);
  assert.equal(isWorthTelling({ ...place, text: '', got: ['aabbccddeeff'], on: 75, onAt: 1 }), false);
  assert.equal(isWorthTelling({ ...place, text: '', read: ['aabbccddeeff'] }), true);
  assert.equal(isWorthTelling({ ...place, text: '', erase: { all: true } }), true);
  // What a later version adds is told, unread; calls and groups are not.
  assert.equal(isWorthTelling({ ...place, text: '', react: { tag: 'aabbccddeeff', emoji: '+' } }), true);
  assert.equal(isSignal({ ...place, text: '', call: { kind: 'end' } }), true);
  assert.equal(isWorthTelling({ ...place, text: '', call: { kind: 'end' } }), false);
  assert.deepEqual(withoutPlace({ ...place, text: 'hi' }), { text: 'hi' });

  // Contacts: only what changed goes, and a photo picture stays where it was chosen.
  const synced: Synced = { identity: 'd'.repeat(64), name: 'Μαρία', timer: 0, timerAt: 0, request: false, look: null, avatar: null, hide: false };
  assert.deepEqual(changedFields(synced, { ...synced, name: 'Maria', timer: 60, timerAt: 9 }), { name: 'Maria', timer: 60, timerAt: 9 });
  const photo = { kind: 'photo' as const, id: 'e'.repeat(32), key: 'f'.repeat(64) };
  const contact = { ...synced, avatar: photo };
  assert.equal('avatar' in syncedOf(contact), false);
  assert.deepEqual(changedFields(synced, syncedOf(contact)), {});
  const mirror = mirrorOf(synced, undefined, at, 'a'.repeat(64));
  assert.deepEqual([mirror.sender, mirror.relay, mirror.conversations, mirror.ownIdentity], [SENDER, 'ws://localhost:1', [''], 'a'.repeat(64)]);
  assert.equal(mirrorOf(syncedOf(contact), { ...mirror, avatar: photo }, at, 'a'.repeat(64)).avatar, photo);

  // A pack of the history: messages of the wrong shape are left out.
  const entry = { peer: `contact:${'d'.repeat(64)}`, text: 'hi', mine: true, at: 5, tag: 'aabbccddeeff', mark: 2 as const };
  const pack = writePack([entry, { ...entry, peer: 'sms:123' } as never, { ...entry, tag: 'x' }]);
  assert.deepEqual(readPack(pack), [entry]);
  assert.deepEqual(readPack(utf8Encode('[1,2]')), []);
});

type Phone = { chats: SpaceChats; queue: Queue; links: Links; space: number };

test('a computer linked to the phone: codes, history, messages both ways, contacts, unlinking', { skip: !coreReady || !relayReady }, async () => {
  files.clear();
  blobs.clear();
  const url = await startRelay();
  const relay = { url };
  const where = { relay: url, relayKey: '' };
  const queue = async (): Promise<Queue> => {
    const ids = await createQueue(relay);
    return { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  };
  const phone = async (space: number): Promise<Phone> => {
    const key = randomBytes(32);
    const own = await queue();
    await saveSpaceData(space, key, { ...EMPTY_SPACE, url, ownQueue: own });
    const chats = { e2e: await E2E.open('space', space, key), history: await History.open('space', space, key), voiceParts: new VoiceAssembler() };
    return { chats, queue: own, links: await Links.open(space, key, chats, 60 * 60_000), space };
  };
  // What the chat or the receiver does with what comes to a space's queue, in short.
  const take = async ({ chats, queue: own, links }: Phone): Promise<Extract<Received, { kind: 'message' }>[]> => {
    const opened: Extract<Received, { kind: 'message' }>[] = [];
    for (;;) {
      const bytes = await receiveMessage(relay, fromHex(own.recipientHex));
      if (!bytes) break;
      const received = await chats.e2e.receive(bytes);
      if (received.kind !== 'message') continue;
      opened.push(received);
      const peer = `contact:${received.identity}`;
      if (received.text) await chats.history.add({ peer, text: received.text, mine: false, at: Date.now(), tag: received.tag });
      if (received.read.length > 0) await chats.history.mark(peer, true, 2, Date.now(), received.read);
    }
    await links.settled();
    return opened;
  };
  const write = async ({ chats, queue: own }: Phone, identity: string, text: string) => {
    const sealed = await chats.e2e.seal(identity, text, own.senderHex, { at: where });
    if (sealed.first) {
      await sendMessage(relay, fromHex(sealed.sender), sealed.first);
      await chats.e2e.firstSent(identity);
    }
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
    await chats.history.add({ peer: `contact:${identity}`, text, mine: true, at: Date.now(), tag: sealed.tag });
    return sealed.tag;
  };

  const pixel = await phone(0);
  const dell = await phone(1);
  // Carol, on an Erevos from before linked devices, writes to the phone.
  const carol = await phone(2);
  carol.links.close();
  const { identity: account } = await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  const carolId = carol.chats.e2e.identityHex();
  await write(carol, account, 'before the computer');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  assert.equal(pixel.chats.history.messages().length, 1);
  assert.equal(pixel.links.role(), null);

  // The computer shows its code; the phone reads it and shows the same safety code.
  const code = await dell.links.makeOffer('DELL');
  const asked = await pixel.links.prepare(code);
  assert.equal(asked.name, 'DELL');
  await pixel.links.link({ since: 0, files: true }, 'Pixel');
  await take(dell);
  assert.equal(dell.links.answerCode(), asked.code);
  // Nothing of the account came before the codes are compared there.
  assert.deepEqual(dell.chats.e2e.contacts(), []);
  await assert.rejects(dell.links.confirm('00000 00000 00000 00000'));
  await dell.links.confirm(asked.code);
  assert.equal(dell.links.role(), 'linked');
  await take(pixel);
  assert.equal(pixel.links.role(), 'primary');
  assert.deepEqual(
    pixel.links.devices().map((d) => [d.name, d.linked]),
    [['DELL', true]],
  );
  // The contacts, then the history.
  await take(dell);
  await until(async () => {
    await take(dell);
    return dell.chats.history.messages().length === 1;
  });
  assert.deepEqual(
    dell.chats.e2e.contacts().map((c) => c.identity),
    [carolId],
  );
  assert.equal(dell.chats.history.messages()[0].text, 'before the computer');
  // Both show the account's safety number, the one Carol has.
  assert.equal(await dell.chats.e2e.safetyNumber(carolId), await pixel.chats.e2e.safetyNumber(carolId));
  assert.equal(await dell.chats.e2e.safetyNumber(carolId), await carol.chats.e2e.safetyNumber(account));
  // And the account's own contact link, to show.
  assert.ok(dell.links.accountLink()?.includes(pixel.queue.senderHex));

  // Carol writes: the phone keeps it and passes it on; the computer opens it as hers.
  await write(carol, account, 'hello both');
  await take(pixel);
  const [came] = await take(dell);
  assert.deepEqual([came.identity, came.text], [carolId, 'hello both']);

  // The computer writes: the phone seals it for Carol, keeps it as its own, and Carol reads it as the account's.
  const fromDell = await write(dell, carolId, 'from the computer');
  await take(pixel);
  const [toCarol] = await take(carol);
  assert.deepEqual([toCarol.identity, toCarol.text, toCarol.tag], [account, 'from the computer', fromDell]);
  const kept = pixel.chats.history.messages().find((m) => m.tag === fromDell);
  assert.deepEqual([kept?.text, kept?.mine, kept?.mark], ['from the computer', true, 0]);

  // The phone writes: once kept as sent, the computer shows it as its own too.
  const fromPixel = await write(pixel, carolId, 'from the phone');
  assert.equal((await take(carol))[0].text, 'from the phone');
  await until(async () => {
    await take(dell);
    return dell.chats.history.messages().some((m) => m.tag === fromPixel);
  });
  assert.equal(dell.chats.history.messages().find((m) => m.tag === fromPixel)?.mine, true);

  // Carol reads both: the marks reach the computer through the phone.
  const read = await carol.chats.e2e.seal(account, '', carol.queue.senderHex, { at: where, read: [fromDell, fromPixel] });
  await sendMessage(relay, fromHex(read.sender), read.packet);
  await take(pixel);
  await take(dell);
  assert.deepEqual(
    dell.chats.history
      .messages()
      .filter((m) => m.mine)
      .map((m) => m.mark),
    [2, 2],
  );

  // A name given on the computer is the phone's too, and a timer set on the phone the computer's.
  await dell.chats.e2e.rename(carolId, 'Carol');
  await dell.links.settled();
  await take(pixel);
  assert.equal(pixel.chats.e2e.contacts()[0].name, 'Carol');
  await pixel.chats.e2e.setTimer(carolId, 3600);
  await pixel.links.settled();
  await take(dell);
  assert.equal(dell.chats.e2e.contacts()[0].timer, 3600);
  // Said once, they do not go back and forth.
  await dell.links.settled();
  assert.equal(await receiveMessage(relay, fromHex(pixel.queue.recipientHex)), null);

  // A contact added on the computer is added by the phone, which starts the conversation.
  const dave = await phone(3);
  dave.links.close();
  const daveId = dave.chats.e2e.identityHex();
  await dell.chats.e2e.addContact({ senderHex: dave.queue.senderHex, key: toBase64Url(dave.chats.e2e.bundle), relayUrl: url }, dell.queue.senderHex, where);
  await take(pixel);
  assert.ok(pixel.chats.e2e.contacts().some((c) => c.identity === daveId));
  await write(dell, daveId, 'hi Dave');
  await take(pixel);
  const toDave = await take(dave);
  assert.deepEqual(
    toDave.map((m) => [m.identity, m.text]).filter(([, text]) => text),
    [[account, 'hi Dave']],
  );

  // Unlinked on the phone: the computer is told, and the account's chats leave it.
  assert.equal(await pixel.links.unlink(pixel.links.devices()[0].id), true);
  assert.equal(pixel.links.role(), null);
  await take(dell);
  await until(() => dell.links.role() === null && dell.chats.e2e.contacts().length === 0);
  assert.deepEqual(dell.chats.history.messages(), []);
  // What it sends now is opened by no one.
  await write(carol, account, 'after');
  assert.equal((await take(pixel)).length, 1);
  assert.deepEqual(await take(dell), []);

  for (const p of [pixel, dell]) p.links.close();
});
