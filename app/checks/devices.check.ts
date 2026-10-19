// Linked devices (lib/devices.ts, docs/linked-devices.md): the code a device shows and what goes
// between the devices, alone; then a phone and a computer of one account and a contact on a
// version from before linking, through a real relay and the real core: linking with the codes
// compared, the history brought over, messages both ways and on both devices, contacts kept alike,
// photos and files deleted from the relay once each took them, calls on either, the phone's groups
// on the computer too, what is done later to messages reaching it, unlinking, and a computer's own
// backup restored elsewhere.
// Skipped, with a note, when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import { Call, currentCall } from '../lib/call';
import type { CallSignal } from '../lib/call-signal';
import { setCore, type Core } from '../lib/core';
import { randomBytes, utf8Encode } from '../lib/crypto';
import { bytesSource, FileGoneError, offerRef, readFile, sendFile, takeFile, watchTakenFiles, type FileOffer } from '../lib/attachments';
import { Links, type HistoryChoice } from '../lib/devices';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { sendGroupFile, takeGroupFile } from '../lib/group-media';
import type { GroupSignal } from '../lib/group-signal';
import { Groups, type GroupTransport } from '../lib/groups';
import { cleanDeviceName, linkCodeLink, linkSafetyCode, parseLinkCode } from '../lib/link-code';
import {
  changedFields,
  changedGroups,
  changeEnvelopes,
  encodeEnvelope,
  encodeOne,
  groupEnvelopes,
  groupMarks,
  groupMirror,
  isKept,
  isSignal,
  isWorthTelling,
  lastKey,
  marksChanged,
  marksDigest,
  messagesAfter,
  mirrorGroups,
  mirrorMark,
  mirrorOf,
  onlyCame,
  Parts,
  readGroupEntries,
  readPack,
  syncedOf,
  wholeMarks,
  withoutPlace,
  writePack,
  type Envelope,
  type GroupEntry,
  type GroupMirror,
  type Synced,
} from '../lib/link-wire';
import { createQueue, fromHex, receiveMessage, sendMessage, toHex } from '../lib/relay';
import type { SpaceChats } from '../lib/space-chats';
import { VoiceAssembler } from '../lib/voice';
import { newFileId, type FileRef } from '../lock/attachment-files';
import { EMPTY_GROUPS, type Group, type GroupMessage } from '../lock/group-data';
import { History } from '../lock/history';
import { loadClip, saveClip } from '../lock/voice-clips';
import { EMPTY_SPACE, saveSpaceData, type Queue } from '../lock/space-data';
import { fakeRtc } from './fake-rtc';
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
  // With what it answers and what was done to it; what is not one of those is left out.
  const poll = { q: 'When?', o: ['Mon', 'Tue'] };
  const parted = { ...entry, parts: { re: '112233445566', myReaction: '👍', theirReaction: 'no', pinned: 9, starred: true, poll, myVote: [1], theirVote: [7] } };
  assert.deepEqual(readPack(writePack([parted as never])), [{ ...entry, parts: { re: '112233445566', myReaction: '👍', pinned: 9, starred: true, poll, myVote: [1] } }]);
});

type Phone = { chats: SpaceChats; queue: Queue; links: Links; space: number; key: Uint8Array };

// Every link opened stops after its check, whatever happened in it.
const opened: Links[] = [];
afterEach(() => {
  for (const links of opened.splice(0)) links.close();
});
type Opened = Extract<Received, { kind: 'message' }>;

// A relay, and phones on it: each a space of its own with its relay and queue set, its chats and its links.
async function setup() {
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
  // What the chat or the receiver does with what comes to a space's queue, in short.
  const take = async ({ chats, queue: own, links }: Phone): Promise<Opened[]> => {
    const opened: Opened[] = [];
    for (;;) {
      const bytes = await receiveMessage(relay, fromHex(own.recipientHex));
      if (!bytes) break;
      const received = await chats.e2e.receive(bytes);
      if (received.kind !== 'message') continue;
      opened.push(received);
      const peer = `contact:${received.identity}`;
      const message = { peer, text: '', mine: false, at: Date.now(), tag: received.tag };
      if (received.text) await chats.history.add({ ...message, text: received.text });
      if (received.file) await chats.history.add({ ...message, file: offerRef(received.file) });
      const voice = received.voice && chats.voiceParts.add(peer, received.voice);
      if (voice) await chats.history.add({ ...message, voice: await saveClip(voice.audio, voice.ms) });
      if (received.read.length > 0) await chats.history.mark(peer, true, 2, Date.now(), received.read);
      if (received.erase && 'tag' in received.erase) await chats.history.remove(peer, received.erase.tag);
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
  // Links the computer to the phone, as the screens do once the codes match.
  const linkUp = async (pixel: Phone, dell: Phone, history: HistoryChoice = { since: 0, files: true }) => {
    const asked = await pixel.links.prepare(await dell.links.makeOffer('DELL'));
    await pixel.links.link(history, 'Pixel');
    await take(dell);
    await dell.links.confirm(asked.code);
    await take(pixel);
    await take(dell);
    return asked;
  };
  return { relay, url, where, phone, take, write, linkUp };
}

test('a computer linked to the phone: codes, history, messages both ways, contacts, unlinking', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  // Carol, on an Erevos from before linked devices, writes to the phone.
  const carol = await phone(2, false);
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

  // What it carries beyond words goes with it: here a sticker, answering the computer's message.
  const sticker = await pixel.chats.e2e.seal(carolId, '🌝', pixel.queue.senderHex, { at: where, re: fromDell, more: { sticker: 'moon-smile' } });
  await sendMessage(relay, fromHex(sticker.sender), sticker.packet);
  await pixel.chats.history.add({ peer: `contact:${carolId}`, text: '🌝', mine: true, at: Date.now(), tag: sticker.tag, re: fromDell, sticker: 'moon-smile' });
  await take(carol);
  await until(async () => {
    await take(dell);
    return dell.chats.history.messages().some((m) => m.tag === sticker.tag);
  });
  const stuck = dell.chats.history.messages().find((m) => m.tag === sticker.tag);
  assert.deepEqual([stuck?.text, stuck?.sticker, stuck?.re], ['🌝', 'moon-smile', fromDell]);

  // What the phone does later to a message reaches the computer as its own: a reaction and a pin
  // with what it seals for Carol.
  const onDell = (tag: string) => dell.chats.history.messages().find((m) => m.tag === tag);
  const onPixel = (tag: string) => pixel.chats.history.messages().find((m) => m.tag === tag);
  const marked = await pixel.chats.e2e.seal(carolId, '', pixel.queue.senderHex, { at: where, react: { tag: fromDell, emoji: '👍' }, more: { pin: { tag: fromPixel, on: true } } });
  await sendMessage(relay, fromHex(marked.sender), marked.packet);
  await take(carol);
  await until(async () => {
    await take(dell);
    return onDell(fromDell)?.myReaction === '👍' && !!onDell(fromPixel)?.pinned;
  });
  // The computer's reaction to Carol's message goes to her from the account, and is the phone's too.
  const reacted = await dell.chats.e2e.seal(carolId, '', dell.queue.senderHex, { at: where, react: { tag: came.tag, emoji: '😂' } });
  await sendMessage(relay, fromHex(reacted.sender), reacted.packet);
  await take(pixel);
  assert.deepEqual((await take(carol)).map((m) => m.react), [{ tag: came.tag, emoji: '😂' }]);
  assert.equal(onPixel(came.tag)?.myReaction, '😂');
  // Starred, and deleted, on the phone only, which Carol is not told of: the computer does the same.
  await pixel.chats.history.star(`contact:${carolId}`, fromPixel, true);
  pixel.links.changedHere({ c: carolId, tag: fromPixel, starred: true });
  await pixel.chats.history.remove(`contact:${carolId}`, sticker.tag);
  pixel.links.changedHere({ c: carolId, tag: sticker.tag, gone: true });
  await pixel.links.settled();
  await until(async () => {
    await take(dell);
    return !!onDell(fromPixel)?.starred && !onDell(sticker.tag);
  });
  assert.deepEqual(await take(carol), []);

  // A contact added on the computer is added by the phone, which starts the conversation.
  const dave = await phone(3, false);
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

test('a linked computer\'s own backup, restored: read, not written in, said once, and linked again', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const dave = await phone(3, false);
  const account = pixel.chats.e2e.identityHex();
  const [carolId, daveId] = [carol.chats.e2e.identityHex(), dave.chats.e2e.identityHex()];
  for (const p of [carol, dave]) {
    await p.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, p.queue.senderHex, where);
    await write(p, account, 'hello');
  }
  await take(pixel);
  await linkUp(pixel, dell);
  await until(async () => {
    await take(dell);
    return dell.chats.history.messages().length === 2;
  });

  // The computer's chats as its backup has them, restored in a space of another computer: no link.
  const copy = await phone(4);
  for (const c of dell.chats.e2e.contacts()) await copy.chats.e2e.putIn(dell.chats.e2e.record(c.identity)!);
  await copy.chats.history.putIn(dell.chats.history.messages());
  assert.deepEqual([copy.links.role(), copy.links.copied(), dell.links.copied(), pixel.links.copied()], [null, true, false, false]);
  // Said once; written in, it says why not.
  assert.deepEqual([await copy.links.sayCopy(), await copy.links.sayCopy()], [true, false]);
  await assert.rejects(write(copy, carolId, 'from the copy'), /linked device’s backup/);

  // Dave's chat leaves the phone meanwhile. Linked again, the copy keeps the chats the phone has,
  // each message once, with what came since, and lets go of the others.
  await pixel.chats.e2e.removeContact(daveId);
  await pixel.chats.history.clear(`contact:${daveId}`);
  await write(carol, account, 'since');
  await take(pixel);
  await linkUp(pixel, copy);
  await until(async () => {
    await take(copy);
    return copy.chats.history.messages().some((m) => m.text === 'since');
  });
  assert.equal(copy.links.role(), 'linked');
  assert.deepEqual(
    copy.chats.e2e.contacts().map((c) => c.identity),
    [carolId],
  );
  assert.deepEqual(
    copy.chats.history.messages().map((m) => [m.peer, m.text]),
    [
      [`contact:${carolId}`, 'hello'],
      [`contact:${carolId}`, 'since'],
    ],
  );
  assert.equal(copy.links.copied(), false);

  for (const p of [pixel, dell, copy]) p.links.close();
});

test('photos, files and voice messages go through the phone both ways, and deleting goes to both phones', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const sendVoice = async ({ chats, queue: own }: Phone, identity: string, audio: Uint8Array) => {
    const sealed = await chats.e2e.sealVoice(identity, audio, 3000, own.senderHex, { at: where });
    if (sealed.first) {
      await sendMessage(relay, fromHex(sealed.sender), sealed.first);
      await chats.e2e.firstSent(identity);
    }
    for (const packet of sealed.packets) await sendMessage(relay, fromHex(sealed.sender), packet);
    await chats.history.add({ peer: `contact:${identity}`, text: '', mine: true, at: Date.now(), tag: sealed.tag, voice: await saveClip(audio, 3000) });
    return sealed.tag;
  };
  const sendPhoto = async ({ chats, queue: own }: Phone, identity: string, bytes: Uint8Array) => {
    const { ref, offer } = await sendFile(relay, bytesSource(bytes), { name: 'photo.jpg', mime: 'image/jpeg', kind: 'photo' });
    const sealed = await chats.e2e.sealFile(identity, offer, own.senderHex, { at: where });
    if (sealed.first) {
      await sendMessage(relay, fromHex(sealed.sender), sealed.first);
      await chats.e2e.firstSent(identity);
    }
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
    await chats.history.add({ peer: `contact:${identity}`, text: '', mine: true, at: Date.now(), tag: sealed.tag, file: ref });
    return sealed.tag;
  };
  // Takes a photo as the chat does, its links hearing of it as the open space's do, and keeps where it is now.
  const fileOf = async (p: Phone, tag: string) => {
    const m = p.chats.history.messages().find((x) => x.tag === tag);
    if (!m?.file) return null;
    watchTakenFiles(p.links);
    const taken = await takeFile(relay, m.file).finally(() => watchTakenFiles(null));
    await p.chats.history.setFile(m.peer, tag, taken);
    await p.links.settled();
    return readFile(taken);
  };
  // Whether a file is still on the relay: taken by someone else, left there.
  const onRelay = async (ref: FileRef) => {
    try {
      await takeFile(relay, { ...ref, id: newFileId() }, undefined, true);
      return true;
    } catch (error) {
      if (error instanceof FileGoneError) return false;
      throw error;
    }
  };
  const fromOf = (p: Phone, tag: string) => p.chats.history.messages().find((m) => m.tag === tag)!.file!;

  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const { identity: account } = await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  const carolId = carol.chats.e2e.identityHex();
  // Before linking: a voice message and a photo from Carol, which the phone took.
  const oldVoice = randomBytes(25_000);
  const oldPhoto = randomBytes(70_000);
  const oldVoiceTag = await sendVoice(carol, account, oldVoice);
  const oldPhotoTag = await sendPhoto(carol, account, oldPhoto);
  await take(pixel);
  assert.deepEqual(await fileOf(pixel, oldPhotoTag), oldPhoto);

  // The history comes with its sound and a copy of the photo.
  await linkUp(pixel, dell);
  await until(async () => {
    await take(dell);
    return dell.chats.history.messages().length === 2;
  });
  const voiceKept = dell.chats.history.messages().find((m) => m.tag === oldVoiceTag);
  assert.deepEqual(await loadClip(voiceKept!.voice!), oldVoice);
  // The copy goes from the relay once the computer took it.
  const oldCopy = fromOf(dell, oldPhotoTag);
  assert.deepEqual(await fileOf(dell, oldPhotoTag), oldPhoto);
  await take(pixel);
  assert.equal(await onRelay(oldCopy), false);

  // A photo from Carol now: both the phone and the computer take it, and it goes from the relay
  // once both did, whichever was first.
  const photo = randomBytes(90_000);
  const photoTag = await sendPhoto(carol, account, photo);
  await take(pixel);
  await take(dell);
  const carols = fromOf(pixel, photoTag);
  assert.deepEqual(await fileOf(dell, photoTag), photo);
  await take(pixel);
  assert.equal(await onRelay(carols), true);
  assert.deepEqual(await fileOf(pixel, photoTag), photo);
  assert.equal(await onRelay(carols), false);
  const another = randomBytes(20_000);
  const anotherTag = await sendPhoto(carol, account, another);
  await take(pixel);
  await take(dell);
  const anothers = fromOf(pixel, anotherTag);
  assert.deepEqual(await fileOf(pixel, anotherTag), another);
  assert.equal(await onRelay(anothers), true);
  assert.deepEqual(await fileOf(dell, anotherTag), another);
  await take(pixel);
  assert.equal(await onRelay(anothers), false);

  // The computer sends a photo and a voice message: the phone takes them on, and Carol gets both from the account.
  const dellPhoto = randomBytes(80_000);
  const dellVoice = randomBytes(31_000);
  const dellPhotoTag = await sendPhoto(dell, carolId, dellPhoto);
  const dellVoiceTag = await sendVoice(dell, carolId, dellVoice);
  await take(pixel);
  const toCarol = await take(carol);
  assert.ok(toCarol.length > 0 && toCarol.every((m) => m.identity === account));
  assert.deepEqual(await fileOf(carol, dellPhotoTag), dellPhoto);
  assert.deepEqual(await loadClip(carol.chats.history.messages().find((m) => m.tag === dellVoiceTag)!.voice!), dellVoice);
  // The phone keeps both as its own.
  const onPixel = pixel.chats.history.messages().filter((m) => m.mine);
  assert.deepEqual(
    onPixel.map((m) => [m.tag, m.mark]),
    [
      [dellPhotoTag, 0],
      [dellVoiceTag, 0],
    ],
  );
  assert.deepEqual(await readFile(onPixel[0].file!), dellPhoto);
  assert.deepEqual(await loadClip(onPixel[1].voice!), dellVoice);

  // A photo the phone sends: the computer gets a copy of its own to take, whether or not Carol took hers.
  const pixelPhoto = randomBytes(60_000);
  const pixelPhotoTag = await sendPhoto(pixel, carolId, pixelPhoto);
  await take(carol);
  assert.deepEqual(await fileOf(carol, pixelPhotoTag), pixelPhoto);
  await until(async () => {
    await take(dell);
    return dell.chats.history.messages().some((m) => m.tag === pixelPhotoTag);
  });
  const copy = fromOf(dell, pixelPhotoTag);
  assert.deepEqual(await fileOf(dell, pixelPhotoTag), pixelPhoto);
  await take(pixel);
  assert.equal(await onRelay(copy), false);

  // Deleted on both phones from the computer: gone from the phone and from Carol's.
  const gone = await write(dell, carolId, 'oops');
  await take(pixel);
  await take(carol);
  assert.ok(carol.chats.history.messages().some((m) => m.tag === gone));
  const erase = await dell.chats.e2e.seal(carolId, '', dell.queue.senderHex, { at: where, erase: { tag: gone } });
  await sendMessage(relay, fromHex(erase.sender), erase.packet);
  await dell.chats.history.remove(`contact:${carolId}`, gone);
  await take(pixel);
  await take(carol);
  assert.equal(pixel.chats.history.messages().some((m) => m.tag === gone), false);
  assert.equal(carol.chats.history.messages().some((m) => m.tag === gone), false);

  // A photo the computer never took goes from the relay once it is unlinked, the phone having taken it.
  const last = randomBytes(10_000);
  const lastTag = await sendPhoto(carol, account, last);
  await take(pixel);
  const lasts = fromOf(pixel, lastTag);
  assert.deepEqual(await fileOf(pixel, lastTag), last);
  assert.equal(await onRelay(lasts), true);
  await pixel.links.unlink(pixel.links.devices()[0].id);
  await pixel.links.settled();
  assert.equal(await onRelay(lasts), false);

  for (const p of [pixel, dell]) p.links.close();
});

test('a call rings on the phone and the computer, the first to answer takes it, and the computer calls through the phone', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  // A call signal, sealed in the chat as lib/space-calls.ts does.
  const signal = async ({ chats, queue: own }: Phone, identity: string, call: CallSignal) => {
    const sealed = await chats.e2e.seal(identity, '', own.senderHex, { at: where, call });
    if (sealed.first) {
      await sendMessage(relay, fromHex(sealed.sender), sealed.first);
      await chats.e2e.firstSent(identity);
    }
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
  };
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const { identity: account } = await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  const carolId = carol.chats.e2e.identityHex();
  await write(carol, account, 'hi');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell, { since: null, files: false });
  await until(async () => {
    await take(dell);
    return dell.chats.e2e.contacts().length === 1;
  });

  // Carol calls: the phone passes her offer on, and the computer opens it as hers.
  const offer: CallSignal = { id: '0123456789abcdef', kind: 'offer', video: false, sdp: 'v=0\r\noffer', at: Date.now() };
  await signal(carol, account, offer);
  assert.deepEqual((await take(pixel)).map((m) => m.call), [offer]);
  const rang = await take(dell);
  assert.deepEqual(
    rang.map((m) => [m.identity, m.call]),
    [[carolId, offer]],
  );
  // The computer answers: Carol gets its answer, from the account; the account is in a call.
  const answer: CallSignal = { id: offer.id, kind: 'answer', sdp: 'v=0\r\nanswer' };
  await signal(dell, carolId, answer);
  await take(pixel);
  assert.deepEqual(
    (await take(carol)).map((m) => [m.identity, m.call]),
    [[account, answer]],
  );
  assert.equal(pixel.links.inCall(), true);
  // Carol hangs up: the computer hears it.
  const hangUp: CallSignal = { id: offer.id, kind: 'end', reason: 'hangup' };
  await signal(carol, account, hangUp);
  await take(pixel);
  assert.deepEqual(
    (await take(dell)).map((m) => m.call),
    [hangUp],
  );
  assert.equal(pixel.links.inCall(), false);

  // She calls again, and the phone answers first: on the computer it stops ringing, quietly.
  const again: CallSignal = { ...offer, id: '1111111111111111', at: Date.now() };
  await signal(carol, account, again);
  await take(pixel);
  await take(dell);
  const sent: CallSignal[] = [];
  const ringing = Call.incoming(again, { peer: `contact:${carolId}`, relay: null, rtc: fakeRtc().rtc, events: { onChange: () => undefined, send: async (s) => void sent.push(s) } })!;
  const answered: CallSignal = { id: again.id, kind: 'answer', sdp: 'v=0\r\nphone' };
  await signal(pixel, carolId, answered);
  await pixel.links.settled();
  await take(dell);
  assert.deepEqual(ringing.ended, { reason: 'hangup', byUs: true, elsewhere: true });
  // The computer's answer, too late, goes to no one.
  await signal(dell, carolId, { ...answer, id: again.id });
  await take(pixel);
  assert.deepEqual(
    (await take(carol)).map((m) => m.call),
    [answered],
  );
  await signal(pixel, carolId, { id: again.id, kind: 'end', reason: 'hangup' });
  await take(carol);

  // The computer calls Carol through the phone, and hears her answer.
  const out: CallSignal = { id: 'fedcba9876543210', kind: 'offer', video: true, sdp: 'v=0\r\ncomputer', at: Date.now() };
  await signal(dell, carolId, out);
  await take(pixel);
  assert.deepEqual(
    (await take(carol)).map((m) => [m.identity, m.call]),
    [[account, out]],
  );
  const herAnswer: CallSignal = { id: out.id, kind: 'answer', sdp: 'v=0\r\ncarol' };
  await signal(carol, account, herAnswer);
  assert.deepEqual((await take(pixel)).map((m) => m.call), [herAnswer]);
  assert.deepEqual(
    (await take(dell)).map((m) => [m.identity, m.call]),
    [[carolId, herAnswer]],
  );
  // Unlinked during the call: it ends for Carol.
  await pixel.links.unlink(pixel.links.devices()[0].id);
  await pixel.links.settled();
  assert.deepEqual(
    (await take(carol)).map((m) => m.call),
    [{ id: out.id, kind: 'end', reason: 'hangup' }],
  );
  currentCall()?.hangUp();

  for (const p of [pixel, dell]) p.links.close();
});

test('groups between devices: told as they change, each message once, and what a computer asks', () => {
  const g = 'ab'.repeat(16);
  const other = 'cd'.repeat(16);
  const alice = 'a1'.repeat(32);
  const me = 'e0'.repeat(32);
  const group: Group = {
    id: g,
    name: 'Φίλοι',
    admin: true,
    status: 'in',
    asked: [],
    later: [],
    outbox: [],
    readAt: 1,
    messages: [
      { at: 1, from: '', text: 'You made the group.', tag: '', note: true },
      { at: 2, from: alice, text: 'hi', tag: 'aabbccddeeff' },
      { at: 3, from: '', text: 'yo', tag: '112233445566' },
    ],
  };
  // A group as the phone tells it, told again only once that changed.
  const mirror = groupMirror(group, [
    { leaf: 0, about: { id: me }, me: true },
    { leaf: 1, about: null, me: false },
  ]);
  assert.deepEqual(mirror, {
    id: g,
    name: 'Φίλοι',
    admin: true,
    status: 'in',
    asked: [],
    readAt: 1,
    members: [
      { leaf: 0, id: me, me: true },
      { leaf: 1, id: '', me: false },
    ],
  });
  assert.equal(mirrorMark(mirror), mirrorMark(JSON.parse(JSON.stringify(mirror)) as GroupMirror));
  assert.notEqual(mirrorMark(mirror), mirrorMark({ ...mirror, readAt: 2 }));
  // The messages after the last one told; all of them once that one is gone.
  assert.deepEqual(messagesAfter(group.messages, lastKey({ messages: group.messages.slice(0, 2) })), group.messages.slice(2));
  assert.deepEqual(messagesAfter(group.messages, lastKey(group)), []);
  assert.deepEqual(messagesAfter(group.messages, 'not there'), group.messages);

  // As they travel: checked, and many in several envelopes, the groups with the first.
  const parts = new Parts();
  const travel = (envelope: Envelope) => {
    let out: unknown = null;
    for (const bytes of encodeEnvelope(envelope, null)) out = parts.take('p', bytes);
    return out;
  };
  const entries: GroupEntry[] = group.messages.map((m) => ({ group: g, at: m.at, from: m.from, text: m.text, tag: m.tag, ...(m.note ? { note: true } : {}) }));
  const [one] = groupEnvelopes([mirror], [other], entries);
  assert.deepEqual(travel(one), one);
  const many = Array.from({ length: 200 }, (_, i) => ({ group: g, at: 10 + i, from: alice, text: 'x'.repeat(3000), tag: (0x100000 + i).toString(16).padStart(12, '0') }));
  const split = groupEnvelopes([mirror], [other], many);
  assert.ok(split.length > 1);
  assert.deepEqual(
    split.map(travel).flatMap((e) => ((e as Envelope).k === 'groups' ? (e as Extract<Envelope, { k: 'groups' }>).entries : [])),
    many,
  );
  assert.deepEqual(
    split.map((e) => (e.k === 'groups' ? e.list.length + e.gone.length : -1)),
    [2, ...new Array<number>(split.length - 1).fill(0)],
  );
  // What is not one is left out.
  const junk = { v: 1, k: 'groups', list: [{ id: 'x' }], gone: ['y'], entries: [{ group: g, at: 1, from: 'nobody', text: 'hi', tag: '' }, { group: g, at: 1, from: alice, text: '', tag: 't' }] };
  assert.deepEqual(parts.take('p', utf8Encode(JSON.stringify(junk))), { k: 'groups', list: [], gone: [], entries: [] });
  // What a computer asks the phone to do in a group, checked.
  const ask: Envelope = { k: 'group', id: g, ask: { t: 'text', text: 'hi', tag: 'aabbccddeeff', parts: { re: '112233445566' } } };
  assert.deepEqual(travel(ask), ask);
  const react: Envelope = { k: 'group', id: g, ask: { t: 'mark', marked: { t: 'react', tag: 'aabbccddeeff', emoji: '👍' } } };
  assert.deepEqual(travel(react), react);
  for (const wrong of [{ t: 'text', text: ' ', tag: 'aabbccddeeff' }, { t: 'remove', leaf: 0 }, { t: 'add', identities: ['x'] }, { t: 'mark', marked: { t: 'react', tag: 'x', emoji: '👍' } }, { t: 'make' }]) {
    assert.equal(parts.take('p', utf8Encode(JSON.stringify({ v: 1, k: 'group', id: g, ask: wrong }))), null);
  }
  // In a pack, with the chats' messages.
  assert.deepEqual(readGroupEntries(writePack([], entries)), entries);
  assert.deepEqual(readGroupEntries(writePack([])), []);

  // On the computer: each group as said; those gone go; the messages put in by time, each once.
  // One it kept already, said again with a photo, is one it takes no more.
  const offer: FileOffer = { name: 'p.jpg', mime: 'image/jpeg', kind: 'photo', size: 10, key: 'cd'.repeat(32), chunk: 65536, relay: 'ws://127.0.0.1:1', ids: 'ab'.repeat(24) };
  const kept: Group = { ...group, messages: [group.messages[0], { at: 4, from: '', text: 'mine', tag: 'ffeeddccbbaa' }] };
  const made = mirrorGroups([kept, { ...kept, id: other }], {
    list: [{ ...mirror, name: 'Νέο', readAt: 0 }],
    gone: [other],
    entries: [
      ...entries,
      { group: g, at: 9, from: '', text: '', tag: 'ffeeddccbbaa', file: offer },
      { group: g, at: 5, from: alice, text: '', tag: 'abababababab', file: offer, ms: 1200 },
      { group: other, at: 9, from: alice, text: 'lost', tag: 'abcdefabcdef' },
    ],
  });
  assert.deepEqual(
    made.groups.map((x) => [x.id, x.name, x.readAt]),
    [[g, 'Νέο', 1]],
  );
  const shown = made.groups[0].messages;
  assert.deepEqual(
    shown.map((m) => m.text),
    ['You made the group.', 'hi', 'yo', 'mine', ''],
  );
  assert.deepEqual([shown[4].file?.from, shown[4].ms], [{ relay: offer.relay, ids: offer.ids }, 1200]);
  assert.deepEqual(made.came, [g]);
  assert.deepEqual(made.again, [{ relay: offer.relay, ids: offer.ids }]);
  // Read as late as either read it.
  assert.equal(mirrorGroups([kept], { list: [{ ...mirror, readAt: 7 }], gone: [], entries: [] }).groups[0].readAt, 7);
});

test('what changes later in messages told already: only what changed, or all of it, and so on the computer', () => {
  const g = 'ab'.repeat(16);
  const other = 'cd'.repeat(16);
  const alice = 'a1'.repeat(32);
  const poll = { q: 'When?', o: ['Mon', 'Tue'] };
  const messages: GroupMessage[] = [
    { at: 1, from: '', text: 'You made the group.', tag: '', note: true },
    { at: 2, from: alice, text: 'hi', tag: 'aabbccddeeff' },
    { at: 3, from: '', text: 'When?', tag: '112233445566', poll },
    { at: 4, from: alice, text: 'bye', tag: 'abcdefabcdef' },
  ];
  // What was done to each message, but the notes; the same marks in another order are the same.
  const before = groupMarks(messages);
  assert.deepEqual([...before.keys()], ['aabbccddeeff', '112233445566', 'abcdefabcdef']);
  const reacted = (reactions: Record<string, string>) => groupMarks(messages.map((m) => (m.tag === 'aabbccddeeff' ? { ...m, reactions } : m)));
  assert.equal(marksDigest(reacted({ [alice]: '👍', '': '❤️' })), marksDigest(reacted({ '': '❤️', [alice]: '👍' })));
  assert.notEqual(marksDigest(before), marksDigest(reacted({ [alice]: '👍' })));
  // Alice reacts and votes, the phone pins and stars, and Bye is deleted: only that goes.
  const after = groupMarks([messages[0], { ...messages[1], reactions: { [alice]: '👍' }, starred: true }, { ...messages[2], votes: { [alice]: [1] }, pinned: 9 }]);
  const changes = marksChanged(g, before, after);
  assert.deepEqual(changes, [
    { group: g, tag: 'aabbccddeeff', reactions: { [alice]: '👍' }, starred: true },
    { group: g, tag: '112233445566', votes: { [alice]: [1] }, pinned: 9 },
    { group: g, tag: 'abcdefabcdef', gone: true },
  ]);
  // What is taken off is said as none any more.
  assert.deepEqual(marksChanged(g, after, groupMarks(messages.slice(0, 3))), [
    { group: g, tag: 'aabbccddeeff', reactions: null, starred: false },
    { group: g, tag: '112233445566', votes: null, pinned: null },
  ]);

  // As they travel: checked, and many in several envelopes; what is not one is left out.
  const parts = new Parts();
  const travel = (envelope: Envelope) => {
    let out: unknown = null;
    for (const bytes of encodeEnvelope(envelope, null)) out = parts.take('p', bytes);
    return out;
  };
  const [one] = changeEnvelopes([{ c: alice, tag: 'aabbccddeeff', starred: true }, { c: alice, gone: true }], changes, [{ group: g, tags: ['aabbccddeeff'] }]);
  assert.deepEqual(travel(one), one);
  const many = Array.from({ length: 3000 }, (_, i) => ({ group: g, tag: (0x100000 + i).toString(16).padStart(12, '0'), reactions: { [alice]: '👍' } }));
  const split = changeEnvelopes([], many, []);
  assert.ok(split.length > 1);
  assert.deepEqual(
    split.map(travel).flatMap((e) => ((e as Envelope).k === 'changed' ? (e as Extract<Envelope, { k: 'changed' }>).groups : [])),
    many,
  );
  const junk = { v: 1, k: 'changed', chats: [{ c: 'x', gone: true }, { c: alice, tag: 'x', gone: true }, { c: alice, tag: 'aabbccddeeff' }], groups: [{ group: 'x', tag: 'aabbccddeeff', gone: true }, { group: g, tag: 'aabbccddeeff' }], whole: [{ group: 'x', tags: [] }] };
  assert.equal(parts.take('p', utf8Encode(JSON.stringify(junk))), null);

  // On the computer: each change made, a vote only as its poll allows, a message gone.
  const group: Group = { id: g, name: 'Φίλοι', admin: false, status: 'in', asked: [], later: [], outbox: [], readAt: 0, messages };
  const [changed] = changedGroups([group], { groups: changes, whole: [] }, 100);
  assert.deepEqual(
    changed.messages.map((m) => m.tag),
    ['', 'aabbccddeeff', '112233445566'],
  );
  assert.deepEqual([changed.messages[1].reactions, changed.messages[1].starred], [{ [alice]: '👍' }, true]);
  assert.deepEqual([changed.messages[2].votes, changed.messages[2].pinned], [{ [alice]: [1] }, 9]);
  assert.equal(changedGroups([group], { groups: [{ group: g, tag: '112233445566', votes: { [alice]: [5] } }], whole: [] }, 100)[0].messages[2].votes, undefined);
  // Said whole: what was done to the messages not said goes, and the messages the phone no longer
  // has, but the computer's own of the last minutes, which may not have reached the phone yet.
  const NOW = 60 * 60_000;
  const marked: Group = {
    ...group,
    messages: [
      ...messages.map((m) => (m.tag === '112233445566' ? { ...m, reactions: { [alice]: '😂' }, starred: true as const } : m)),
      { at: 5, from: '', text: 'long ago', tag: '0a0b0c0d0e0f' },
      { at: NOW - 1000, from: '', text: 'just now', tag: 'fedcbafedcba' },
    ],
  };
  const all = wholeMarks(g, groupMarks([messages[0], { ...messages[1], reactions: { [alice]: '👍' } }, messages[2]]));
  assert.deepEqual(all.whole, { group: g, tags: ['aabbccddeeff', '112233445566'] });
  const [whole] = changedGroups([marked], { groups: all.changes, whole: [all.whole] }, NOW);
  assert.deepEqual(
    whole.messages.map((m) => m.tag),
    ['', 'aabbccddeeff', '112233445566', 'fedcbafedcba'],
  );
  assert.deepEqual(whole.messages[1].reactions, { [alice]: '👍' });
  // The computer's own star stays.
  assert.deepEqual([whole.messages[2].reactions, whole.messages[2].starred], [undefined, true]);

  // Told again with what was done to it, a message kept here takes that; with `all`, a group not said goes.
  const mirror = groupMirror(group, []);
  const again = mirrorGroups([group, { ...group, id: other }], {
    list: [mirror],
    gone: [],
    entries: [
      { group: g, at: 2, from: alice, text: 'hi', tag: 'aabbccddeeff', marks: { reactions: { [alice]: '👍' }, pinned: 4 } },
      { group: g, at: 5, from: alice, text: 'new', tag: '999999999999', marks: { reactions: { '': '❤️' } } },
    ],
    all: true,
  });
  assert.deepEqual(
    again.groups.map((x) => x.id),
    [g],
  );
  const kept = again.groups[0].messages;
  assert.deepEqual([kept[1].reactions, kept[1].pinned], [{ [alice]: '👍' }, 4]);
  assert.deepEqual(kept[kept.length - 1].reactions, { '': '❤️' });
  // Once the last one told is gone: those from when it came on.
  assert.deepEqual(messagesAfter(messages, `${alice}|gonegonegone`, 3), messages.slice(2));
});

// Group chats on an in-memory relay of their own, as checks/groups.check.ts has them: each member's
// queue in order, and the chats' signals handed on.
function groupNet() {
  type Member = { identity: string; groups: Groups; queue: Uint8Array[]; transport: GroupTransport };
  const members = new Map<string, Member>();
  const signals: { from: string; to: string; signal: GroupSignal }[] = [];
  const member = (identity: string): Member => {
    const sender = toHex(randomBytes(24));
    const groups = new Groups(EMPTY_GROUPS, async () => undefined, async () => ({ id: identity, sender, relay: 'wss://relay.example.org', relayKey: '' }));
    const transport: GroupTransport = {
      async post(to, packet) {
        members.get(to.id)?.queue.push(packet);
      },
      async signal(to, signal) {
        signals.push({ from: identity, to, signal });
      },
    };
    const it: Member = { identity, groups, queue: [], transport };
    members.set(identity, it);
    return it;
  };
  const settle = async () => {
    for (let round = 0; round < 20; round++) {
      let moved = false;
      while (signals.length > 0) {
        const { from, to, signal } = signals.shift()!;
        const target = members.get(to);
        if (target) await target.groups.signal(from, signal, false, target.transport);
        moved = true;
      }
      for (const m of members.values()) {
        while (m.queue.length > 0) {
          await m.groups.receive(m.queue.shift()!, m.transport);
          moved = true;
        }
      }
      if (!moved) return;
    }
  };
  return { member, settle };
}

test('groups on a linked computer: the phone\'s, read and written there through it', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, phone, take, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const net = groupNet();
  const account = pixel.chats.e2e.identityHex();
  const onPixel = net.member(account);
  const bob = net.member(toHex(randomBytes(32)));
  const carol = net.member(toHex(randomBytes(32)));
  // The computer's groups are the phone's: it sends nothing to any member itself, and has no group state.
  const nowhere: GroupTransport = {
    post: async () => assert.fail('sent from the computer'),
    signal: async () => assert.fail('sent from the computer'),
  };
  const onDell = new Groups(EMPTY_GROUPS, async () => undefined, async () => assert.fail('no group state on the computer'));
  pixel.links.useGroups(onPixel.groups, onPixel.transport);
  dell.links.useGroups(onDell, nowhere);
  // Whether a file is still on the relay: taken by someone else, left there.
  const onRelay = async (ref: FileRef) => {
    try {
      await takeFile(relay, { ...ref, id: newFileId() }, undefined, true);
      return true;
    } catch (error) {
      if (error instanceof FileGoneError) return false;
      throw error;
    }
  };
  const photo = { name: 'photo.jpg', mime: 'image/jpeg', kind: 'photo' as const };
  // What the computer did, through the phone, to the members, and what came of it back to the computer.
  const round = async () => {
    await dell.links.settled();
    await take(pixel);
    await pixel.links.settled();
    await net.settle();
    await pixel.links.settled();
    await take(dell);
  };

  // A group from before linking, with a message from Bob.
  const id = await onPixel.groups.create('Φίλοι', [bob.identity, carol.identity], onPixel.transport);
  await net.settle();
  await bob.groups.send(id, 'before the computer', bob.transport);
  await net.settle();
  // Linked: the group comes, then its messages with the history.
  await linkUp(pixel, dell);
  await until(async () => {
    await take(dell);
    return onDell.messages(id).some((m) => m.text === 'before the computer');
  });
  assert.deepEqual(
    onDell.list().map((x) => [x.name, x.admin, x.status]),
    [['Φίλοι', true, 'in']],
  );
  const seats = await onDell.members(id);
  assert.deepEqual(
    seats.filter((m) => m.me).map((m) => m.about?.id),
    [account],
  );
  assert.deepEqual(
    seats
      .filter((m) => !m.me)
      .map((m) => m.about?.id)
      .sort(),
    [bob.identity, carol.identity].sort(),
  );

  // Bob writes: the computer has it too, unread there until read, and read there is read on the phone.
  await bob.groups.send(id, 'hello both', bob.transport);
  await round();
  assert.equal(onDell.messages(id)[onDell.messages(id).length - 1].text, 'hello both');
  assert.equal(onDell.list()[0].unread, 2);
  await onDell.markRead(id);
  await round();
  assert.equal(onPixel.groups.list()[0].unread, 0);

  // The computer writes: the phone sends it to the group from the account, and the computer keeps it once.
  await onDell.send(id, 'from the computer', nowhere);
  await round();
  const said = bob.groups.messages(id).find((m) => m.text === 'from the computer');
  assert.equal(said?.from, account);
  assert.equal(onPixel.groups.messages(id).find((m) => m.text === 'from the computer')?.tag, said?.tag);
  assert.equal(onDell.messages(id).filter((m) => m.text === 'from the computer').length, 1);

  // What the computer answers, and its reaction, reach the group from the account; Bob's answer
  // comes to the computer with what it answers.
  await onDell.send(id, 'answering', nowhere, { re: said!.tag });
  await onDell.mark(id, { t: 'react', tag: said!.tag, emoji: '👍' }, nowhere);
  await round();
  assert.equal(bob.groups.messages(id).find((m) => m.text === 'answering')?.re, said?.tag);
  assert.deepEqual(bob.groups.messages(id).find((m) => m.tag === said?.tag)?.reactions, { [account]: '👍' });
  assert.deepEqual(onDell.messages(id).find((m) => m.tag === said?.tag)?.reactions, { '': '👍' });
  await bob.groups.send(id, 'yes', bob.transport, { re: said!.tag });
  await round();
  assert.equal(onDell.messages(id).find((m) => m.text === 'yes')?.re, said?.tag);

  // What is done later to messages the computer has reaches it: Bob's reaction and his vote, the
  // phone's pin and star, a message deleted for everyone, and one deleted on the phone only.
  await onPixel.groups.send(id, 'When?', onPixel.transport, { poll: { q: 'When?', o: ['Mon', 'Tue'] } });
  await round();
  const poll = onPixel.groups.messages(id).find((m) => m.poll)!;
  const yes = bob.groups.messages(id).find((m) => m.text === 'yes')!;
  await bob.groups.mark(id, { t: 'react', tag: said!.tag, emoji: '😂' }, bob.transport);
  await bob.groups.mark(id, { t: 'vote', tag: poll.tag, chose: [1] }, bob.transport);
  await bob.groups.mark(id, { t: 'erase', tag: yes.tag }, bob.transport);
  await net.settle();
  await onPixel.groups.mark(id, { t: 'pin', tag: said!.tag, on: true }, onPixel.transport);
  await onPixel.groups.star(id, said!.tag, true);
  await round();
  const marked = () => onDell.messages(id).find((m) => m.tag === said?.tag);
  assert.deepEqual(marked()?.reactions, { '': '👍', [bob.identity]: '😂' });
  assert.deepEqual([!!marked()?.pinned, marked()?.starred], [true, true]);
  assert.deepEqual(onDell.messages(id).find((m) => m.tag === poll.tag)?.votes, { [bob.identity]: [1] });
  assert.equal(onDell.messages(id).some((m) => m.tag === yes.tag), false);
  const answering = onDell.messages(id).find((m) => m.text === 'answering')!;
  await onPixel.groups.deleteHere(id, answering.tag);
  await round();
  assert.equal(onDell.messages(id).some((m) => m.tag === answering.tag), false);
  // The phone opens again with a reaction it did not tell yet: the computer is told the group's
  // marks whole with the next change, and has both.
  pixel.links.close();
  await bob.groups.mark(id, { t: 'react', tag: said!.tag, emoji: '' }, bob.transport);
  await net.settle();
  pixel.links = await Links.open(pixel.space, pixel.key, pixel.chats, 60 * 60_000);
  opened.push(pixel.links);
  pixel.links.useGroups(onPixel.groups, onPixel.transport);
  await onPixel.groups.mark(id, { t: 'react', tag: poll.tag, emoji: '🎉' }, onPixel.transport);
  await round();
  assert.deepEqual(marked()?.reactions, { '': '👍' });
  assert.deepEqual(onDell.messages(id).find((m) => m.tag === poll.tag)?.reactions, { '': '🎉' });
  assert.equal(marked()?.starred, true);

  // Renamed, and Carol taken out, on the computer, as the admin: the phone does it for everyone.
  await onDell.rename(id, 'Νέο όνομα', nowhere);
  await onDell.remove(id, seats.find((m) => m.about?.id === carol.identity)!.leaf, nowhere);
  await round();
  assert.equal(bob.groups.list()[0].name, 'Νέο όνομα');
  assert.equal(carol.groups.list()[0].status, 'out');
  assert.equal(onDell.list()[0].name, 'Νέο όνομα');
  assert.deepEqual(
    (await onDell.members(id)).map((m) => m.about?.id).sort(),
    [account, bob.identity].sort(),
  );

  // Bob's photo comes to the computer as where it waits for the group, and stays there for the
  // others once the computer took it.
  const bobPhoto = randomBytes(50_000);
  await sendGroupFile(bob.groups, id, relay, bytesSource(bobPhoto), photo, undefined, bob.transport);
  await round();
  const bobs = onDell.messages(id).find((m) => m.from === bob.identity && m.file)!.file!;
  assert.deepEqual(await readFile((await takeGroupFile(onDell, id, relay, bobs))!), bobPhoto);
  await round();
  assert.equal(await onRelay(bobs), true);

  // The computer's photo goes to the group from where it put it; the phone keeps it as its own, to
  // take from there too, and the computer keeps it once.
  const dellPhoto = randomBytes(40_000);
  await sendGroupFile(onDell, id, relay, bytesSource(dellPhoto), photo, undefined, nowhere);
  await round();
  const toBob = bob.groups.messages(id).find((m) => m.from === account && m.file)!.file!;
  assert.deepEqual(await readFile((await takeGroupFile(bob.groups, id, relay, toBob))!), dellPhoto);
  assert.ok(onPixel.groups.messages(id).find((m) => m.from === '' && m.file)?.file?.from);
  assert.equal(onDell.messages(id).filter((m) => m.from === '' && m.file).length, 1);

  // The phone's own photo comes to the computer as a copy of its own, gone from the relay once the
  // computer took it; the one for the members stays there for them.
  const pixelPhoto = randomBytes(30_000);
  await sendGroupFile(onPixel.groups, id, relay, bytesSource(pixelPhoto), photo, undefined, onPixel.transport);
  await round();
  const copy = onDell.messages(id).find((m) => m.from === '' && m.file?.from)!.file!;
  const forMembers = bob.groups.messages(id).filter((m) => m.from === account && m.file).pop()!.file!;
  assert.deepEqual(await readFile((await takeGroupFile(onDell, id, relay, copy))!), pixelPhoto);
  await round();
  assert.equal(await onRelay(copy), false);
  assert.equal(await onRelay(forMembers), true);

  // What stays on the phone: making a group, and group calls.
  await assert.rejects(onDell.create('mine', [], nowhere));
  await assert.rejects(onDell.call(id, { id: 'ab'.repeat(8), kind: 'start', at: Date.now(), video: false }, nowhere));

  // Closed from the computer: the phone closes it for everyone. Then deleted on both.
  await onDell.leave(id, nowhere);
  await round();
  assert.equal(bob.groups.list()[0].status, 'out');
  assert.equal(onDell.list()[0].status, 'out');
  await onDell.forget(id);
  await round();
  assert.deepEqual(onPixel.groups.list(), []);
  assert.deepEqual(onDell.list(), []);

  // A group made after linking comes whole; unlinked, the computer's groups go.
  const later = await onPixel.groups.create('Μετά', [bob.identity], onPixel.transport);
  await net.settle();
  await round();
  assert.deepEqual(
    onDell.list().map((x) => x.id),
    [later],
  );
  assert.ok(onDell.messages(later).some((m) => m.note));
  await pixel.links.unlink(pixel.links.devices()[0].id);
  await take(dell);
  await until(() => onDell.list().length === 0);

  for (const p of [pixel, dell]) p.links.close();
});
