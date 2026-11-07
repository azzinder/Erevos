// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Linked devices (lib/devices.ts, docs/linked-devices.md): the code a device shows and what goes
// between the devices, alone; then a phone and a computer of one account and a contact on a version
// from before linking, through a real relay and the real core: linking with the codes compared, the
// history brought over, messages both ways and on both devices, contacts kept alike, photos and
// files deleted from the relay once each took them, calls on either and what one says was read, the
// phone's groups on the computer too, what is done later to messages reaching it, unlinking, a
// computer's own backup restored elsewhere, each device's own endpoint in the list the phone signs,
// and the devices it names reaching each other: sealed, and with the phone off still seeing what
// the others write, read and change, started again a day after a first packet lost; a backup put
// back elsewhere meeting no one, and versions from before reached through the phone as they were.
// The space's Matrix, XMPP and Nostr accounts going to a device linked with them, brought there as
// far as it can, the rest again as the space opens, and let go of once it is unlinked. A hidden
// place linked on its own, from inside it: its own link and device list, messages both ways, its
// contacts writing to the device's place directly, its own accounts, unlinking, and nothing of it
// in the space, on the space's devices or in the size of the file the links keep.
// Then contacts given the list: writing to each endpoint alike, each with keys of its own that a
// device finds them by, a device taking their messages and answering them with the phone off, and with the phone's queue full what they try again, once, its
// conversation with them going on; each kept once however many come between, what came and was read
// marked everywhere, the places that fill the list sealed for alike and following the phone, a list
// taken only as their account signed it and an endpoint's conversation only once it names it; two
// accounts' devices reaching each other with both phones off, and letting go of each other once a
// chat moves into hidden chats, and again after one deletes the other and adds it again; a chat
// made in hidden chats writing to a contact's device as a space's chat does, and taking its answer;
// contacts, phones and devices from before going through the phone; a device that says no key for contacts
// listed as a place no device takes, and with an endpoint anew once it says one; a phone put back
// from a backup signing a later list, and once more when its clock is behind; a phone that never
// linked a device signing no list for what a stranger or a contact says; a device unlinked left out
// of the list at once, though a place has no queue yet; and the places that fill the list keeping
// their queues and keys while the relay's key is not known, offline, or a queue cannot be made
// again; and who is blocked known on a device too, which asks to unblock them as the phone does and
// has the phone unblock them. Copies alone, without a relay: checks/copies.check.ts. Skipped, with a note, when the core
// or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import { Call, currentCall } from '../lib/call';
import type { CallSignal } from '../lib/call-signal';
import { acceptConversation, accountBundle, accountIdentity, newAccount, open as openIn, seal as sealIn, setCore, startConversation, type Core } from '../lib/core';
import { fromBase64, randomBytes, utf8Decode, utf8Encode } from '../lib/crypto';
import { bytesSource, dropFile, FileGoneError, keepFile, offerRef, readFile, sendFile, takeFile, watchTakenFiles, type FileOffer } from '../lib/attachments';
import { addToCollection, deleteItems, loadCollection, setCollectionOption } from '../lock/collection-data';
import { bodyOf, nextList, readPass, signList, signPass, verifyList, type Body } from '../lib/device-list';
import { GroupsHeldError, handAccounts, handChunks, Links, type AccountsWho, type HistoryChoice } from '../lib/devices';
import { BlockedContactError, E2E, fromBase64Url, toBase64Url, type Received, type Where } from '../lib/e2e';
import { sendCopies } from '../lib/fanout';
import { sendGroupFile, takeGroupFile } from '../lib/group-media';
import type { GroupSignal } from '../lib/group-signal';
import { Groups, type GroupTransport } from '../lib/groups';
import { cleanDeviceName, linkCodeLink, linkSafetyCode, parseLinkCode } from '../lib/link-code';
import {
  changedFields,
  changedGroups,
  checkedGroupEntry,
  changeEnvelopes,
  checkedGiven,
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
  type GivenAccounts,
  type GroupEntry,
  type GroupMirror,
  type Synced,
} from '../lib/link-wire';
import { giveLinkedName } from '../lib/linked-name';
import { onReadElsewhere } from '../lib/notice-count';
import { isNews, keepReceived } from '../lib/receiver';
import { createQueue, deleteQueue, fromHex, receiveMessage, RelaySends, RelaySession, RelayUnreachableError, sendMessage, toHex, type Relay } from '../lib/relay';
import { isSealedPacket, openPacket, packetKeys } from '../lib/sealed-packet';
import type { SpaceChats } from '../lib/space-chats';
import { VoiceAssembler } from '../lib/voice';
import { handOverHidden, Owed, OwedError, sendWaiting, takeBack, type SendPlace } from '../lib/waiting';
import { newFileId, type FileRef } from '../lock/attachment-files';
import { addNote, changeNote, loadNotes, markTold, newNoteId, removeNote, type NotesPlace } from '../lock/myself-data';
import { FILE as DEVICES_FILE, loadDevicesData, saveDevicesData, type Brought, type DevicesData } from '../lock/devices-data';
import { loadE2EData, saveE2EData, WAY_AGAIN, type E2EData } from '../lock/e2e-data';
import { EMPTY_GROUPS, type Group, type GroupMessage } from '../lock/group-data';
import { History, WAITING } from '../lock/history';
import { loadClip, saveClip } from '../lock/voice-clips';
import { markRestore } from '../lock/restored';
import { EMPTY_SPACE, loadSpaceData, saveHiddenData, saveSpaceData, type Queue } from '../lock/space-data';
import { hiddenHolder } from '../lock/sealed-file';
import { setCurrentSpace } from '../lock/keys';
import { forgetSpaceMover, spaceMover } from '../lib/queue-move';
import { nearby } from '../lib/nearby';
import { contactsIn } from '../lib/sync/contacts';
import { valueOf as syncValueOf, whole as syncWhole, type Json as SyncJson } from '../lib/sync/log';
import { onSettingCame } from '../lib/sync/settings';
import { fakeRtc } from './fake-rtc';
import { blobs, files } from './files-memory';
import { store as secureStore } from './secure-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
// The core, and the same core as a build made before it signed as an account, as an Erevos from
// before endpoints has it.
let wasmCore: Core | null = null;
let unsignedCore: Core | null = null;
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  // With no channels to a relay's key (checked in checks/relay.check.ts), as a core from before
  // them: the WebSocket below tells requests apart by their kind, which a channel hides.
  const calls = Object.entries(wasm).filter(([name]) => name !== 'relayChannelKeys');
  wasmCore = Object.fromEntries(calls.map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core;
  unsignedCore = { ...wasmCore, accountSign: undefined, bundleVerify: undefined };
  setCore(wasmCore);
} else {
  console.log('Skipping the linked device checks: build the core first with node checks/build-core.mjs');
}
relayNote('the linked device checks');

// What a device or phone on an Erevos from before endpoints does, its core unable to sign.
async function asOld<T>(call: () => Promise<T>): Promise<T> {
  setCore(unsignedCore);
  try {
    return await call();
  } finally {
    setCore(wasmCore);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Requests the relays refuse, by their kind (lib/relay.ts: 1 makes a queue, 5 asks the relay's
// key), or all of them (`offline`): the connection closes as one cut off does.
const CREATE = 1;
const KEY_ASKED = 5;
const refused = new Set<number>();
let offline = false;
const Socket = globalThis.WebSocket;
if (typeof Socket === 'function') {
  globalThis.WebSocket = class extends Socket {
    send(data: Parameters<WebSocket['send']>[0]) {
      if (offline || (data instanceof Uint8Array && refused.has(data[0]))) {
        this.close();
        return;
      }
      super.send(data);
    }
  } as typeof WebSocket;
}
afterEach(() => {
  refused.clear();
  offline = false;
});

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
  // With `restored`, its chat's keys and contacts as a backup put them back (lock/e2e-data.ts), without links.
  const phone = async (space: number, linking = true, restored?: E2EData): Promise<Phone> => {
    const key = randomBytes(32);
    const own = await queue();
    await saveSpaceData(space, key, { ...EMPTY_SPACE, url, ownQueue: own });
    if (restored) await saveE2EData('space', space, key, restored);
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
    await chats.e2e.copiesGo(sealed.copies);
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
  // Opens a space's links again, as when it opens again.
  const reopen = async (p: Phone) => {
    p.links.close();
    p.links = await Links.open(p.space, p.key, p.chats, 60 * 60_000);
    opened.push(p.links);
    await p.links.settled();
  };
  return { relay, url, where, phone, take, write, linkUp, reopen };
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
  // The account's log (lib/sync/) holds the same: the computer's name, the phone's timer.
  const logged = contactsIn((await dell.links.syncLog())!);
  assert.deepEqual(logged.map((c) => [c.identity, c.name, c.timer]), [[carolId, 'Carol', 3600]]);
  assert.deepEqual(contactsIn((await pixel.links.syncLog())!), logged);

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

  // A contact added on the computer is added by the phone, which starts the conversation. The name
  // the computer gives it right away, as one of its contacts linked to it (lib/linked-name.ts), is
  // the phone's too, once it has added them.
  const dave = await phone(3, false);
  const daveId = dave.chats.e2e.identityHex();
  await dell.chats.e2e.addContact({ senderHex: dave.queue.senderHex, key: toBase64Url(dave.chats.e2e.bundle), relayUrl: url }, dell.queue.senderHex, where);
  assert.equal(await giveLinkedName(dell.chats.e2e, daveId, { name: 'Dave Δ.' }), 'Dave Δ.');
  await take(pixel);
  assert.ok(pixel.chats.e2e.contacts().some((c) => c.identity === daveId));
  assert.equal(pixel.chats.e2e.contacts().find((c) => c.identity === daveId)?.name, 'Dave Δ.');
  await write(dell, daveId, 'hi Dave');
  await take(pixel);
  const toDave = await take(dave);
  assert.deepEqual(
    toDave.map((m) => [m.identity, m.text]).filter(([, text]) => text),
    [[account, 'hi Dave']],
  );

  // A setting changed on the computer (lib/sync/settings.ts) is put in place on the phone, and
  // one changed on the phone on the computer: through the log, by what keeps it on each.
  const settingsCame: [string, unknown][] = [];
  const stops = (['language', 'look'] as const).map((id) => onSettingCame(id, (value) => void settingsCame.push([id, value])));
  const changeOn = (p: Phone, id: 'language' | 'look', value: SyncJson) => (p.links as unknown as { syncSetting(id: string, value: SyncJson): void }).syncSetting(id, value);
  changeOn(dell, 'language', 'de');
  await dell.links.settled();
  await until(async () => (await take(pixel), settingsCame.length > 0));
  assert.deepEqual(settingsCame, [['language', 'de']]);
  changeOn(pixel, 'look', { style: 'nocturne', wallpaper: 'dots' });
  await pixel.links.settled();
  await until(async () => (await take(dell), settingsCame.length > 1));
  assert.deepEqual(settingsCame[1], ['look', { style: 'nocturne', wallpaper: 'dots' }]);
  for (const stop of stops) stop();

  // The whole log, once larger than a packet holds, goes as a file on the relay, encrypted with a
  // key of its own the envelope carries; taken, it is heard as the whole log, and the file is gone.
  type Snapping = {
    syncs: { write(changes: { k: string; id: string; f?: string; v?: SyncJson; x?: 'add' }[]): Promise<boolean> };
    snapshot(said: unknown): Promise<SyncJson | null>;
    syncHeard(from: string, s: SyncJson): Promise<{ whole: boolean } | null>;
    data: { account: string };
  };
  const phoneSide = pixel.links as unknown as Snapping;
  const deviceSide = dell.links as unknown as Snapping;
  const many = Array.from({ length: 60 }, (_, n) => `place-${n}`);
  await phoneSide.syncs.write(many.flatMap((id) => [{ k: 'place', id, x: 'add' as const }, { k: 'place', id, f: 'v', v: 'x'.repeat(300) }]));
  const phoneLog = (await pixel.links.syncLog())!;
  const snap = await phoneSide.snapshot({ k: 'whole', ...syncWhole(phoneLog) });
  assert.equal((snap as { k?: string } | null)?.k, 'snap');
  assert.ok(JSON.stringify(snap).length < 2048);
  const heardSnap = await deviceSide.syncHeard(deviceSide.data.account, snap!);
  assert.equal(heardSnap?.whole, true);
  const deviceLog = (await dell.links.syncLog())!;
  assert.deepEqual(many.map((id) => syncValueOf(deviceLog, 'place', id, 'v')), many.map(() => 'x'.repeat(300)));
  // Taken once: the file is no longer on the relay.
  assert.equal(await deviceSide.syncHeard(deviceSide.data.account, snap!).catch(() => null), null);

  // On the same Wi-Fi (lib/nearby.ts): a device heard on a link nearby is handed what goes to it
  // there first, so it comes with no internet too; the relay's copy, second, changes nothing more.
  const lan: { link: string; text: string }[] = [];
  const stopLan = nearby.start((link, text) => (lan.push({ link, text }), true));
  nearby.linkUp('lan-dell');
  const languages: unknown[] = [];
  const stopLanguage = onSettingCame('language', (value) => void languages.push(value));
  changeOn(dell, 'language', 'fr');
  await dell.links.settled();
  await until(async () => {
    for (;;) {
      const bytes = await receiveMessage(relay, fromHex(pixel.queue.recipientHex));
      if (!bytes) break;
      await pixel.chats.e2e.receive(bytes, { near: 'lan-dell' });
    }
    await pixel.links.settled();
    return languages.includes('fr');
  });
  lan.length = 0;
  changeOn(pixel, 'look', { style: 'classic', wallpaper: 'grid' });
  await pixel.links.settled();
  await until(() => lan.some((l) => l.link === 'lan-dell'));
  let looks = 0;
  const stopLook = onSettingCame('look', () => void looks++);
  for (const { text } of lan.filter((l) => l.link === 'lan-dell')) {
    const packet = nearby.frameIn('lan-pixel', text);
    if (packet) await dell.chats.e2e.receive(packet, { near: 'lan-pixel' });
  }
  await dell.links.settled();
  assert.equal(looks, 1);
  await take(dell);
  assert.equal(looks, 1);
  stopLook();
  stopLanguage();
  stopLan();

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

test('the accounts a device is given: only what each is, as said and as kept', () => {
  const keys = { master: 'A'.repeat(43), selfSigning: 'B'.repeat(43), userSigning: 'C'.repeat(43) };
  const said = {
    matrix: { homeserver: 'https://matrix.example.org/', userId: '@nek:example.org', token: 'syt_one', keys, backup: 'D'.repeat(43), waited: true },
    xmpp: { jid: 'nek@example.org', password: 'two words', server: { host: 'xmpp.example.org', port: 5222, tls: 'starttls' } },
    nostr: { secret: 'ab'.repeat(32), inbox: ['wss://relay.example.org', 'http://not.one', 'wss://relay.example.org'], name: 'Nek', files: ['https://blossom.example.org', 'ftp://no'] },
  };
  // What only a device keeps (`waited`) is not taken from the phone.
  assert.deepEqual(checkedGiven(said), {
    matrix: { homeserver: 'https://matrix.example.org', userId: '@nek:example.org', token: 'syt_one', keys, backup: 'D'.repeat(43) },
    xmpp: said.xmpp,
    nostr: { secret: 'ab'.repeat(32), inbox: ['wss://relay.example.org'], name: 'Nek', files: ['https://blossom.example.org'] },
  });
  assert.equal(checkedGiven(said, true).matrix?.waited, true);
  // A homeserver not over HTTPS, an address with no domain, a key too short: none of them go; keys
  // that are not all there go without them.
  assert.deepEqual(
    checkedGiven({
      matrix: { homeserver: 'http://matrix.example.org', userId: '@nek:example.org' },
      xmpp: { jid: 'nek', password: 'x' },
      nostr: { secret: 'ab'.repeat(31) },
    }),
    {},
  );
  assert.deepEqual(checkedGiven({ matrix: { homeserver: 'https://m.example.org', userId: '@a:example.org', keys: { master: 'A'.repeat(43) }, token: 'two words' }, xmpp: { jid: 'a@example.org', password: 'x', server: { host: 'x', port: 0, tls: 'starttls' } } }), {
    matrix: { homeserver: 'https://m.example.org', userId: '@a:example.org' },
    xmpp: { jid: 'a@example.org', password: 'x' },
  });
  // It goes in one envelope, as any other.
  const [packet] = encodeEnvelope({ k: 'accounts', ...checkedGiven(said) }, null);
  const back = new Parts().take('x', packet);
  assert.equal(back?.k, 'accounts');
  assert.deepEqual(back?.k === 'accounts' ? back.xmpp : null, said.xmpp);
});

test('the space\'s Matrix, XMPP and Nostr accounts go to every device linked, are brought there as far as it can, follow as they change, and go once it is unlinked', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { phone, take, linkUp, reopen } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const lap = await phone(2);
  const keys = { master: 'A'.repeat(43), selfSigning: 'B'.repeat(43), userSigning: 'C'.repeat(43) };
  const given: GivenAccounts = {
    matrix: { homeserver: 'https://matrix.example.org', userId: '@nek:example.org', keys, backup: 'D'.repeat(43) },
    xmpp: { jid: 'nek@example.org', password: 'two words', server: { websocket: 'wss://xmpp.example.org/ws' } },
    nostr: { secret: 'ab'.repeat(32), inbox: ['wss://relay.example.org'], name: 'Nek' },
  };
  const took: { space: number; given: GivenAccounts }[] = [];
  const tookBy = (space: number) => took.filter((t) => t.space === space);
  const gone: { space: number; brought: Brought }[] = [];
  // Who the phone's accounts are, as it follows them: not known until said.
  let who: AccountsWho = {};
  // The Matrix account waits for its sign-in on the computer; XMPP and Nostr come at once.
  let signedIn = false;
  handAccounts({
    give: async (space) => (space === 0 ? given : {}),
    who: async () => who,
    take: async (space, _key, said) => {
      took.push({ space, given: said });
      if (signedIn) return { left: {}, brought: { matrix: { userId: '@nek:example.org', deviceId: 'DELL' } }, problems: [] };
      return { left: { matrix: { ...said.matrix!, waited: true } }, brought: { xmpp: said.xmpp!.jid, nostr: 'cd'.repeat(32) }, problems: ['Matrix: waits'] };
    },
    letGo: async (space, _key, brought) => {
      gone.push({ space, brought });
    },
  });
  const follow = (p: Phone) => (p.links as unknown as { followAccounts(): Promise<void> }).followAccounts();
  try {
    // Linked, chosen or not: they go once the codes match, and each device brings them.
    await linkUp(pixel, lap, { since: null, files: false });
    await linkUp(pixel, dell, { since: null, files: false, accounts: true });
    await until(async () => {
      await pixel.links.settled();
      await take(dell);
      await take(lap);
      return tookBy(1).length > 0 && tookBy(2).length > 0;
    });
    assert.deepEqual([tookBy(1), tookBy(2)], [[{ space: 1, given }], [{ space: 2, given }]]);
    const waiting = { left: { matrix: { ...given.matrix, waited: true } }, brought: { xmpp: 'nek@example.org', nostr: 'cd'.repeat(32) }, problems: ['Matrix: waits'] };
    assert.deepEqual(dell.links.accountsHere(), waiting);
    assert.deepEqual(lap.links.accountsHere(), waiting);
    // What is still to bring is kept, and tried again as the space opens: once signed in to Matrix there, its keys go.
    signedIn = true;
    await reopen(dell);
    assert.deepEqual(tookBy(1)[1], { space: 1, given: { matrix: { ...given.matrix, waited: true } } });
    assert.deepEqual(dell.links.accountsHere(), { left: {}, brought: { matrix: { userId: '@nek:example.org', deviceId: 'DELL' }, xmpp: 'nek@example.org', nostr: 'cd'.repeat(32) }, problems: [] });

    // Sent again from the phone, to that device only.
    // Both were named DELL as they showed their codes: the computer was linked second.
    const dellId = pixel.links.devices()[1].id;
    assert.deepEqual(await pixel.links.giveAccounts(dellId), ['matrix', 'xmpp', 'nostr']);
    assert.deepEqual(await pixel.links.giveAccounts('00'.repeat(32)), []);
    // Only the phone gives them.
    assert.deepEqual(await dell.links.giveAccounts(dellId), []);
    await until(async () => {
      await take(dell);
      return tookBy(1).length === 3;
    });
    await take(lap);
    assert.equal(tookBy(2).length, 1);

    // The phone follows who they are in the log: named the first time, so given to every device
    // again; the same again, given to none.
    who = { matrix: '@nek:example.org', xmpp: 'nek@example.org', nostr: 'cd'.repeat(32) };
    await follow(pixel);
    await until(async () => {
      await pixel.links.settled();
      await take(dell);
      await take(lap);
      return tookBy(1).length === 4 && tookBy(2).length === 2;
    });
    const logged = (await pixel.links.syncLog())!;
    assert.deepEqual(['matrix', 'xmpp', 'nostr'].map((n) => syncValueOf(logged, 'account', n, 'v')), ['@nek:example.org', 'nek@example.org', 'cd'.repeat(32)]);
    await follow(pixel);
    await pixel.links.settled();
    await take(dell);
    await take(lap);
    assert.deepEqual([tookBy(1).length, tookBy(2).length], [4, 2]);

    // Signed out of XMPP on the phone: each device lets go of the one it brought, and keeps the rest.
    who = { ...who, xmpp: null };
    await follow(pixel);
    await until(async () => {
      await pixel.links.settled();
      await take(dell);
      await take(lap);
      await dell.links.settled();
      await lap.links.settled();
      return gone.length === 2;
    });
    assert.deepEqual(
      [...gone].sort((a, b) => a.space - b.space),
      [
        { space: 1, brought: { xmpp: 'nek@example.org' } },
        { space: 2, brought: { xmpp: 'nek@example.org' } },
      ],
    );
    assert.equal(dell.links.accountsHere()?.brought.xmpp, undefined);
    assert.equal(dell.links.accountsHere()?.brought.nostr, 'cd'.repeat(32));
    gone.length = 0;

    // Unlinked: the computer lets go of what it brought, and keeps nothing of it.
    await dell.links.unlink();
    await dell.links.settled();
    assert.deepEqual(gone, [{ space: 1, brought: { matrix: { userId: '@nek:example.org', deviceId: 'DELL' }, nostr: 'cd'.repeat(32) } }]);
    assert.equal(dell.links.accountsHere(), null);
    const kept = await loadDevicesData(1, dell.key);
    assert.deepEqual([kept.given, kept.brought], [undefined, undefined]);
  } finally {
    handAccounts(null);
  }
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

  // The computer writes to her. Her chat appears offline, so that she read it waits for what she
  // writes next.
  const before = await write(dell, carolId, 'call me');
  await take(pixel);
  await take(carol);
  await carol.chats.e2e.setHidden(account, true);
  await carol.chats.e2e.hold(account, 'read', [before]);
  // Carol calls: the phone passes her offer on, and the computer opens it as hers, and that she
  // read what it wrote as a receipt says it.
  const offer: CallSignal = { id: '0123456789abcdef', kind: 'offer', video: false, sdp: 'v=0\r\noffer', at: Date.now() };
  await signal(carol, account, offer);
  assert.deepEqual((await take(pixel)).map((m) => [m.call, m.read]), [[offer, [before]]]);
  const rang = await take(dell);
  assert.deepEqual(
    rang.map((m) => [m.identity, m.call, m.read]),
    [
      [carolId, offer, []],
      [carolId, null, [before]],
    ],
  );
  assert.deepEqual(dell.chats.history.messages().filter((m) => m.tag === before).map((m) => m.mark), [2]);
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

test('a group message edited on the phone reaches the computer: its words, and when', () => {
  const g = 'ab'.repeat(16);
  const alice = 'a1'.repeat(32);
  const messages: GroupMessage[] = [
    { at: 2, from: alice, text: 'helo', tag: 'aabbccddeeff' },
    { at: 3, from: '', text: '🌝', tag: '112233445566', sticker: 'moon-smile' },
  ];
  const before = groupMarks(messages);
  // Words are said only once edited, so the marks of messages never edited read as before.
  assert.deepEqual(before.get('aabbccddeeff'), {});
  const edited = [{ ...messages[0], text: 'hello', edited: 9 }, messages[1]];
  assert.notEqual(marksDigest(groupMarks(edited)), marksDigest(before));
  const changes = marksChanged(g, before, groupMarks(edited));
  assert.deepEqual(changes, [{ group: g, tag: 'aabbccddeeff', text: 'hello', edited: 9 }]);
  const parts = new Parts();
  const [one] = changeEnvelopes([], changes, []);
  let out: unknown = null;
  for (const bytes of encodeEnvelope(one, null)) out = parts.take('p', bytes);
  assert.deepEqual(out, one);
  const group: Group = { id: g, name: 'G', admin: false, status: 'in', asked: [], later: [], outbox: [], readAt: 0, messages };
  const [changed] = changedGroups([group], { groups: changes, whole: [] }, 100);
  assert.deepEqual([changed.messages[0].text, changed.messages[0].edited], ['hello', 9]);
  // A sticker is what it is, whatever is said of it.
  const [kept] = changedGroups([group], { groups: [{ group: g, tag: '112233445566', text: 'words', edited: 9 }], whole: [] }, 100);
  assert.deepEqual(kept.messages[1], messages[1]);
  // Said whole, and with a message told anew, the words go too.
  const all = wholeMarks(g, groupMarks(edited));
  assert.deepEqual(changedGroups([group], { groups: all.changes, whole: [all.whole] }, 100)[0].messages[0].text, 'hello');
  const told = mirrorGroups([], { list: [groupMirror(group, [])], gone: [], entries: [{ group: g, at: 2, from: alice, text: 'hello', tag: 'aabbccddeeff', marks: { text: 'hello', edited: 9 } }] });
  assert.deepEqual([told.groups[0].messages[0].text, told.groups[0].messages[0].edited], ['hello', 9]);
});

test('who our group message came to and who read it reaches the computer, of our own only', () => {
  const g = 'ab'.repeat(16);
  const alice = 'a1'.repeat(32);
  const bob = 'b2'.repeat(32);
  const messages: GroupMessage[] = [
    { at: 2, from: '', text: 'ours', tag: 'aabbccddeeff' },
    { at: 3, from: alice, text: 'theirs', tag: '112233445566' },
  ];
  const before = groupMarks(messages);
  // Never said yet: the marks read as before.
  assert.deepEqual(before.get('aabbccddeeff'), {});
  const came = [{ ...messages[0], got: { [alice]: 5, [bob]: 6 } }, messages[1]];
  const changes = marksChanged(g, before, groupMarks(came));
  assert.deepEqual(changes, [{ group: g, tag: 'aabbccddeeff', got: { [alice]: 5, [bob]: 6 } }]);
  const read = [{ ...messages[0], got: { [bob]: 6 }, read: { [alice]: 7 } }, messages[1]];
  assert.deepEqual(marksChanged(g, groupMarks(came), groupMarks(read)), [{ group: g, tag: 'aabbccddeeff', got: { [bob]: 6 }, read: { [alice]: 7 } }]);
  const parts = new Parts();
  const [one] = changeEnvelopes([], changes, []);
  let out: unknown = null;
  for (const bytes of encodeEnvelope(one, null)) out = parts.take('p', bytes);
  assert.deepEqual(out, one);

  const group: Group = { id: g, name: 'G', admin: false, status: 'in', asked: [], later: [], outbox: [], readAt: 0, messages };
  const [changed] = changedGroups([group], { groups: marksChanged(g, before, groupMarks(read)), whole: [] }, 100);
  assert.deepEqual([changed.messages[0].got, changed.messages[0].read], [{ [bob]: 6 }, { [alice]: 7 }]);
  // Of a member's message, nothing of it is kept.
  const [theirs] = changedGroups([group], { groups: [{ group: g, tag: '112233445566', read: { [bob]: 7 } }], whole: [] }, 100);
  assert.equal(theirs.messages[1].read, undefined);
  // Said whole, and with a message told anew.
  const all = wholeMarks(g, groupMarks(read));
  assert.deepEqual(changedGroups([group], { groups: all.changes, whole: [all.whole] }, 100)[0].messages[0].read, { [alice]: 7 });
  // As it travels: the account is never among them.
  const entry = checkedGroupEntry({ group: g, at: 2, from: '', text: 'ours', tag: 'aabbccddeeff', marks: { read: { [alice]: 7, '': 8 }, got: { [bob]: 'soon' } } })!;
  assert.deepEqual(entry.marks, { read: { [alice]: 7 } });
  const told = mirrorGroups([], { list: [groupMirror(group, [])], gone: [], entries: [entry] });
  assert.deepEqual(told.groups[0].messages[0].read, { [alice]: 7 });
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
  // To the computer that wrote it, that the phone could not send it: only its own is marked so.
  const notSent: Envelope = { k: 'changed', chats: [], groups: [{ group: g, tag: '112233445566', unsent: true }, { group: g, tag: 'aabbccddeeff', unsent: true }], whole: [] };
  assert.deepEqual(travel(notSent), notSent);
  const unsent = changedGroups([group], notSent, 100)[0].messages;
  assert.deepEqual([unsent[2].unsent, unsent[1].unsent], [true, undefined]);
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
  // Who reads at each queue, where that is not where the member's phone does: a device that holds its groups.
  const bySender = new Map<string, Member>();
  const signals: { from: string; to: string; signal: GroupSignal }[] = [];
  const member = (identity: string): Member => {
    const sender = toHex(randomBytes(24));
    const groups = new Groups(EMPTY_GROUPS, async () => undefined, async () => ({ id: identity, sender, relay: 'wss://relay.example.org', relayKey: '' }));
    const transport: GroupTransport = {
      async post(to, packet) {
        (bySender.get(to.sender) ?? members.get(to.id))?.queue.push(packet);
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
      for (const m of [...members.values(), ...bySender.values()]) {
        while (m.queue.length > 0) {
          await m.groups.receive(m.queue.shift()!, m.transport);
          moved = true;
        }
      }
      if (!moved) return;
    }
  };
  // The groups of `identity`'s device that reads at `sender`, as they say where they read; what they send goes as a member's does.
  const device = (identity: string, sender: string, groups: Groups): Member => {
    const transport: GroupTransport = {
      async post(to, packet) {
        (bySender.get(to.sender) ?? members.get(to.id))?.queue.push(packet);
      },
      async signal(to, signal) {
        signals.push({ from: identity, to, signal });
      },
    };
    const it: Member = { identity, groups, queue: [], transport };
    bySender.set(sender, it);
    return it;
  };
  return { member, settle, device };
}

test('the groups held on a linked computer: their MLS state moved there and back, never copied; the members write to where it reads, what still comes to the phone goes on to it, and the phone writes through it', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, phone, take, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const net = groupNet();
  const account = pixel.chats.e2e.identityHex();
  const onPixel = net.member(account);
  const bob = net.member(toHex(randomBytes(32)));
  const dellSender = toHex(randomBytes(24));
  const onDell = new Groups(EMPTY_GROUPS, async () => undefined, async () => ({ id: account, sender: dellSender, relay: 'wss://relay.example.org', relayKey: '' }));
  const atDell = net.device(account, dellSender, onDell);
  pixel.links.useGroups(onPixel.groups, onPixel.transport);
  dell.links.useGroups(onDell, atDell.transport);
  const round = async () => {
    for (let n = 0; n < 3; n++) {
      await take(dell);
      await dell.links.settled();
      await take(pixel);
      await pixel.links.settled();
      await net.settle();
    }
  };
  const id = await onPixel.groups.create('Φίλοι', [bob.identity], onPixel.transport);
  await net.settle();
  await linkUp(pixel, dell);
  await until(async () => {
    await take(dell);
    return onDell.list().some((g) => g.id === id);
  });
  const dellId = pixel.links.devices()[0].id;
  // The computer said its Erevos can hold them.
  await until(async () => {
    await round();
    return pixel.links.groupsHolder().can.includes(dellId);
  });

  // To the computer: the state goes, and is gone from the phone, which keeps it as it went till the
  // computer says it took it, and the group as told.
  await pixel.links.moveGroups(dellId);
  assert.equal(onPixel.groups.hasState(), false);
  assert.ok(onPixel.groups.handed());
  assert.deepEqual([pixel.links.groupsHolder().on, pixel.links.groupsHolder().to], [dellId, dellId]);
  await assert.rejects(pixel.links.moveGroups(null), /on their way/);
  await round();
  assert.equal(onDell.hasState(), true);
  assert.equal(onPixel.groups.handed(), null);
  assert.deepEqual([pixel.links.groupsHolder().on, pixel.links.groupsHolder().to], [dellId, undefined]);
  assert.deepEqual(dell.links.groupsHolder().on, 'here');
  assert.deepEqual(onDell.list().map((g) => [g.name, g.admin, g.status]), [['Φίλοι', true, 'in']]);
  // Neither unlinks while it holds them, unless asked again.
  await assert.rejects(pixel.links.unlink(dellId), GroupsHeldError);
  await assert.rejects(dell.links.unlink(), GroupsHeldError);

  // Bob writes to where the account read before: the phone passes it on, and the computer tells the phone.
  await bob.groups.send(id, 'still to the phone', bob.transport);
  await round();
  assert.ok(onDell.messages(id).some((m) => m.text === 'still to the phone'));
  assert.ok(onPixel.groups.messages(id).some((m) => m.text === 'still to the phone'));

  // New keys from the computer say where it reads: Bob writes there now, past the phone.
  await onDell.renewKeys(atDell.transport);
  await net.settle();
  await bob.groups.send(id, 'to the computer', bob.transport);
  assert.equal(atDell.queue.length, 1);
  await round();
  assert.ok(onDell.messages(id).some((m) => m.text === 'to the computer'));
  assert.ok(onPixel.groups.messages(id).some((m) => m.text === 'to the computer'));

  // The phone writes through the computer, as the account.
  await onPixel.groups.send(id, 'from the phone', onPixel.transport);
  await round();
  assert.equal(bob.groups.messages(id).find((m) => m.text === 'from the phone')?.from, account);
  assert.equal(onPixel.groups.messages(id).filter((m) => m.text === 'from the phone').length, 1);

  // Back to the phone: asked, given, and gone from the computer. What the phone writes on the way,
  // the computer, which no longer holds them, gives back, and it goes once they came.
  await pixel.links.moveGroups(null);
  await pixel.links.settled();
  await take(dell);
  await dell.links.settled();
  assert.equal(onDell.hasState(), false);
  assert.ok(onDell.handed());
  await onPixel.groups.send(id, 'on the way', onPixel.transport);
  await round();
  assert.deepEqual([onPixel.groups.hasState(), onDell.hasState()], [true, false]);
  assert.equal(onDell.handed(), null);
  assert.deepEqual([pixel.links.groupsHolder().on, dell.links.groupsHolder().on], [null, null]);
  assert.equal(bob.groups.messages(id).filter((m) => m.text === 'on the way').length, 1);
  await onPixel.groups.renewKeys(onPixel.transport);
  await net.settle();
  await bob.groups.send(id, 'to the phone again', bob.transport);
  await round();
  assert.ok(onPixel.groups.messages(id).some((m) => m.text === 'to the phone again'));
  assert.ok(onDell.messages(id).some((m) => m.text === 'to the phone again'));
  // The queue the computer read at is still its own a while: its members may write there yet.
  assert.ok((await onDell.ownSenders()).has(dellSender));

  // One the computer cannot take (gone from the relay before it looked) is said so, and the phone
  // keeps them again, as they went.
  await pixel.links.moveGroups(dellId);
  const handing = (pixel.links as unknown as { data: DevicesData }).data.handing!;
  await dropFile(relay, offerRef(handing.offer).from!);
  await round();
  assert.deepEqual([onPixel.groups.hasState(), onDell.hasState(), onPixel.groups.handed()], [true, false, null]);
  assert.equal(pixel.links.groupsHolder().on, null);
  assert.match(pixel.links.groupsHolder().problem ?? '', /could not take/);
  await onPixel.groups.send(id, 'still here', onPixel.transport);
  await net.settle();
  assert.ok(bob.groups.messages(id).some((m) => m.text === 'still here'));

  // A computer lost while it holds them: unlinked all the same, the phone leaves each group.
  await pixel.links.moveGroups(dellId);
  await round();
  assert.equal(onDell.hasState(), true);
  await pixel.links.unlink(dellId, true);
  assert.equal(pixel.links.groupsHolder().on, null);
  assert.deepEqual(onPixel.groups.list().map((g) => g.status), ['out']);
  for (const p of [pixel, dell]) p.links.close();
});

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
  const readThere: string[][] = [];
  const stopRead = onReadElsewhere((where) => readThere.push(where));
  await onDell.markRead(id);
  await round();
  assert.equal(onPixel.groups.list()[0].unread, 0);
  // The phone's messages notice is told, to count it no more (lib/background.ts).
  assert.ok(readThere.some((where) => where.join() === `group:${id}`));
  stopRead();

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
  // Closed on the phone before the computer heard of it: what the computer wrote meanwhile shows
  // there as not sent.
  await onPixel.groups.leave(later, onPixel.transport);
  await onDell.send(later, 'too late', nowhere);
  await round();
  assert.equal(onDell.list().find((x) => x.id === later)?.status, 'out');
  assert.equal(onDell.messages(later).find((m) => m.text === 'too late')?.unsent, true);
  await pixel.links.unlink(pixel.links.devices()[0].id);
  await take(dell);
  await until(() => onDell.list().length === 0);

  for (const p of [pixel, dell]) p.links.close();
});

test('each linked device has an endpoint of its own, named in a list the phone signs: links from before too, not a device from before', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp, reopen } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  // The list a phone signed last, with what it says, and whether it names an endpoint.
  const listOf = (p: Phone) => {
    const list = p.chats.e2e.signedList();
    return list && { ...list, body: bodyOf(list) as Body };
  };
  const names = (list: { body: Body }, id: string) => list.body.d.some((e) => e.i === id);
  const filling = (list: { body: Body; real: string[] }) => list.body.d.filter((e) => !list.real.includes(e.i)).map((e) => e.i);

  // Linked by versions from before endpoints: none, and no list.
  await asOld(async () => {
    await linkUp(pixel, dell);
    await until(async () => {
      await take(dell);
      return dell.chats.e2e.contacts().length === 1;
    });
  });
  assert.equal(dell.chats.e2e.endpoint(), null);
  assert.equal(pixel.chats.e2e.signedList(), null);

  // Both updated, the link as it was: the computer makes its endpoint and says it, and the phone
  // signs a list that names it, which the computer checks and keeps. Said once, nothing more goes.
  await reopen(pixel);
  await reopen(dell);
  const endpoint = dell.chats.e2e.endpoint()!;
  assert.ok(endpoint);
  await take(pixel);
  await take(dell);
  const first = listOf(pixel)!;
  assert.deepEqual([first.real, first.body.a, first.body.d.length, names(first, endpoint.id)], [[endpoint.id], account, 4, true]);
  // Not the key of its link, which the phone knows it by.
  assert.notEqual(endpoint.id, pixel.links.devices()[0].id);
  const { ab, ap, ...ownKept } = dell.chats.e2e.own()!;
  assert.deepEqual(ownKept, { identity: account, bundle: toBase64Url(pixel.chats.e2e.bundle), list: { b: first.b, s: first.s, n: first.n, real: [endpoint.id] } });
  // With the account's word for its bundle, and a pass for this device's endpoint (S5).
  assert.ok(ab && ap && readPass(ap)?.i === endpoint.id);
  assert.ok(await verifyList(pixel.chats.e2e.bundle, account, first));
  await dell.links.settled();
  assert.equal(await receiveMessage(relay, fromHex(pixel.queue.recipientHex)), null);
  // Messages go through the phone as before.
  await write(carol, account, 'through the phone');
  await take(pixel);
  assert.deepEqual(
    (await take(dell)).map((m) => m.text),
    ['through the phone'],
  );

  // The computer's backup put back on another: no link, so its endpoint goes as it opens.
  const dellCopy = await phone(5, true, await loadE2EData('space', dell.space, dell.key));
  assert.deepEqual([dellCopy.chats.e2e.endpoint(), dellCopy.chats.e2e.own(), dellCopy.links.copied()], [null, null, true]);
  const kept = await loadE2EData('space', dellCopy.space, dellCopy.key);
  assert.deepEqual(['endpoint' in kept, 'own' in kept, kept.contacts.length], [false, false, 1]);
  dellCopy.links.close();

  // The phone's backup put back on another, where nothing is linked: it signs a later list that
  // names none of its devices, with the same endpoints filling its places.
  const pixelCopy = await phone(6, true, await loadE2EData('space', pixel.space, pixel.key));
  await pixelCopy.links.settled();
  const elsewhere = listOf(pixelCopy)!;
  assert.ok(elsewhere.n > first.n);
  assert.deepEqual([elsewhere.real, elsewhere.body.d.length, names(elsewhere, endpoint.id)], [[], 4, false]);
  assert.ok(filling(first).every((id) => names(elsewhere, id)));
  assert.ok(await verifyList(pixel.chats.e2e.bundle, account, elsewhere, first.n));
  pixelCopy.links.close();

  // A computer on an Erevos from before endpoints says none, and is in no list; one on this version,
  // linked now, says its endpoint once the codes match. The list names it in a place one that filled
  // it held, and every device is told it.
  const mac = await phone(7);
  await asOld(() => linkUp(pixel, mac));
  const lenovo = await phone(8);
  await linkUp(pixel, lenovo);
  await take(dell);
  await asOld(() => take(mac));
  const second = listOf(pixel)!;
  const lenovos = lenovo.chats.e2e.endpoint()!;
  assert.deepEqual(
    [...second.real].sort(),
    [endpoint.id, lenovos.id].sort(),
  );
  assert.deepEqual([second.body.d.length, filling(first).filter((id) => names(second, id)).length], [4, 2]);
  assert.deepEqual([dell.chats.e2e.own()?.list?.n, lenovo.chats.e2e.own()?.list?.n], [second.n, second.n]);
  assert.equal(mac.chats.e2e.endpoint(), null);
  const peers = (await loadDevicesData(pixel.space, pixel.key)).devices;
  assert.deepEqual(
    peers.map((d) => d.endpoint?.id ?? ''),
    [endpoint.id, '', lenovos.id],
  );
  assert.notEqual(peers[2].id, lenovos.id);
  // Carol's messages reach every computer through the phone, the one from before too.
  await write(carol, account, 'to every computer');
  await take(pixel);
  for (const p of [dell, lenovo]) assert.deepEqual((await take(p)).map((m) => m.text), ['to every computer']);
  assert.deepEqual(
    (await asOld(() => take(mac))).map((m) => m.text),
    ['to every computer'],
  );

  // Unlinked on the phone: the list it signs next no longer names the computer, a new endpoint
  // fills its place, and the computer lets go of its endpoint.
  await pixel.links.unlink(peers[0].id);
  await pixel.links.settled();
  await take(dell);
  await until(() => dell.links.role() === null);
  await dell.links.settled();
  assert.deepEqual([dell.chats.e2e.endpoint(), dell.chats.e2e.own()], [null, null]);
  const third = listOf(pixel)!;
  assert.ok(third.n > second.n);
  assert.deepEqual([third.real, third.body.d.length, names(third, endpoint.id), names(third, lenovos.id)], [[lenovos.id], 4, false, true]);
  assert.ok(filling(second).every((id) => names(third, id)));
  await take(lenovo);
  assert.equal(lenovo.chats.e2e.own()?.list?.n, third.n);

  for (const p of [pixel, dell, mac, lenovo]) p.links.close();
});

test('the devices the list names reach each other: started by the lower id, sealed, and with the phone off they see what the others write, read and change', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp, reopen } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const lenovo = await phone(2);
  const carol = await phone(3, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  const hello = await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await linkUp(pixel, lenovo);
  const siblingsOf = async (p: Phone) => (await loadDevicesData(p.space, p.key)).siblings;
  const all = async () => {
    for (const p of [pixel, dell, lenovo]) await take(p);
  };
  // The list names both: each meets the other, and each gives the other a key for what it sends back.
  await until(async () => {
    await all();
    const [a, b] = [await siblingsOf(dell), await siblingsOf(lenovo)];
    return !!a?.list[0]?.sealTo && !!b?.list[0]?.sealTo && dell.chats.history.messages().length === 1 && lenovo.chats.history.messages().length === 1;
  });
  const [dells, lenovos] = [dell.chats.e2e.endpoint()!, lenovo.chats.e2e.endpoint()!];
  assert.deepEqual([(await siblingsOf(dell))!.list.map((s) => s.id), (await siblingsOf(lenovo))!.list.map((s) => s.id)], [[lenovos.id], [dells.id]]);
  // The one with the lower id started it: the other took its first packet.
  const [lower, higher] = dells.id < lenovos.id ? [dell, lenovo] : [lenovo, dell];
  const lowers = lower.chats.e2e.endpoint()!;
  assert.deepEqual([(await siblingsOf(higher))!.seen.length, (await siblingsOf(lower))!.seen.length], [1, 0]);
  // The phone's link seals what it passes on, and a device what it says to another: to the relay,
  // like any contact's packets.
  await write(carol, account, 'sealed');
  await take(pixel);
  const passed = (await receiveMessage(relay, fromHex(dell.queue.recipientHex)))!;
  assert.equal(isSealedPacket(passed), true);
  await dell.chats.e2e.receive(passed);
  await take(dell);
  await take(lenovo);
  const told = await write(dell, carolId, 'to Carol');
  await dell.links.settled();
  const direct = (await receiveMessage(relay, fromHex(lenovo.queue.recipientHex)))!;
  assert.equal(isSealedPacket(direct), true);
  await lenovo.chats.e2e.receive(direct);
  await lenovo.links.settled();
  assert.equal(lenovo.chats.history.messages().find((m) => m.tag === told)?.mine, true);
  await all();

  // A first packet from an endpoint no list names is not taken, nor what it says, nor kept to try
  // again, so as many as anyone makes push out none that waits; nor one from a device the list
  // names that is not the one to start.
  const forged = await startConversation(await newAccount(), fromBase64Url(dells.bundle), encodeOne({ k: 'out', c: carolId, m: { text: 'forged', tag: 'aaaaaaaaaaaa' } }, null)!);
  await sendMessage(relay, fromHex(dell.queue.senderHex), forged.packet);
  const backwards = (await higher.chats.e2e.startAsEndpoint(fromBase64Url(lowers.bundle), encodeOne({ k: 'out', c: carolId, m: { text: 'backwards', tag: 'bbbbbbbbbbbb' } }, null)!))!;
  await sendMessage(relay, fromHex(lower.queue.senderHex), backwards.packet);
  await all();
  for (const p of [dell, lenovo]) assert.deepEqual(p.chats.history.messages().filter((m) => m.text === 'forged' || m.text === 'backwards'), []);
  assert.deepEqual((await siblingsOf(dell))!.list.map((s) => s.id), [lenovos.id]);
  assert.deepEqual([(await siblingsOf(dell))!.early, (await siblingsOf(lenovo))!.early], [[], []]);
  assert.equal((await siblingsOf(lower))!.seen.length, 0);

  // The phone off. What one computer writes the other shows as its own, and what it reacts to and
  // reads there too.
  pixel.links.close();
  const off = await write(dell, carolId, 'with the phone off');
  await dell.links.settled();
  await take(lenovo);
  const onLenovo = lenovo.chats.history.messages().find((m) => m.tag === off);
  assert.deepEqual([onLenovo?.text, onLenovo?.mine], ['with the phone off', true]);
  const readOn: string[][] = [];
  const stopReadOn = onReadElsewhere((where) => readOn.push(where));
  const reacted = await lenovo.chats.e2e.seal(carolId, '', lenovo.queue.senderHex, { at: where, react: { tag: hello, emoji: '👍' }, read: [hello] });
  await sendMessage(relay, fromHex(reacted.sender), reacted.packet);
  await lenovo.links.settled();
  await take(dell);
  const helloOnDell = dell.chats.history.messages().find((m) => m.tag === hello);
  assert.deepEqual([helloOnDell?.myReaction, helloOnDell?.mark], ['👍', 2]);
  assert.ok(readOn.some((where) => where.join() === `chat:${carolId}`));
  stopReadOn();
  // A name given on one is the other's; given on both at once, both keep the later.
  const nameOn = (p: Phone, id = carolId) => p.chats.e2e.contacts().find((c) => c.identity === id)?.name;
  await dell.chats.e2e.rename(carolId, 'Carol');
  await dell.links.settled();
  await take(lenovo);
  assert.equal(nameOn(lenovo), 'Carol');
  await dell.chats.e2e.rename(carolId, 'Carol D');
  await sleep(5);
  await lenovo.chats.e2e.rename(carolId, 'Carol L');
  await dell.links.settled();
  await lenovo.links.settled();
  await take(dell);
  await take(lenovo);
  assert.deepEqual([nameOn(dell), nameOn(lenovo)], ['Carol L', 'Carol L']);
  // In the account's log of each too, with the phone off: the devices give each other what they
  // wrote (what the phone wrote, only the phone gives).
  for (const p of [dell, lenovo]) assert.equal(syncValueOf((await p.links.syncLog())!, 'contact', carolId, 'name'), 'Carol L');
  // A contact added on one comes to the other; removed there, it goes from both.
  const dave = await phone(4, false);
  const daveId = dave.chats.e2e.identityHex();
  await dell.chats.e2e.addContact({ senderHex: dave.queue.senderHex, key: toBase64Url(dave.chats.e2e.bundle), relayUrl: url }, dell.queue.senderHex, where);
  await dell.links.settled();
  await take(lenovo);
  assert.ok(lenovo.chats.e2e.contacts().some((c) => c.identity === daveId));
  await sleep(5);
  await lenovo.chats.e2e.removeContact(daveId);
  await lenovo.links.settled();
  await take(dell);
  assert.equal(dell.chats.e2e.contacts().some((c) => c.identity === daveId), false);

  // The phone on again: it sends what the computer wrote meanwhile, which each keeps once; the
  // names settle as they did, and Dave, removed after he was added, stays removed everywhere.
  await reopen(pixel);
  await until(async () => {
    await all();
    return (await take(carol)).some((m) => m.text === 'with the phone off');
  });
  for (let i = 0; i < 3; i++) await all();
  assert.equal(lenovo.chats.history.messages().filter((m) => m.tag === off).length, 1);
  assert.equal(pixel.chats.history.messages().find((m) => m.tag === hello)?.myReaction, '👍');
  assert.deepEqual([nameOn(pixel), nameOn(dell), nameOn(lenovo)], ['Carol L', 'Carol L', 'Carol L']);
  for (const p of [pixel, dell, lenovo]) assert.equal(p.chats.e2e.contacts().some((c) => c.identity === daveId), false);
  // Added again on purpose, Dave comes back to all.
  await lenovo.chats.e2e.addContact({ senderHex: dave.queue.senderHex, key: toBase64Url(dave.chats.e2e.bundle), relayUrl: url }, lenovo.queue.senderHex, where);
  await lenovo.links.settled();
  for (let i = 0; i < 3; i++) await all();
  for (const p of [pixel, dell, lenovo]) assert.equal(p.chats.e2e.contacts().some((c) => c.identity === daveId), true);

  // The phone off again, and the first packet the lower id sent lost after the relay took it: the
  // other has no conversation with it, and holds what it says. A day later with no answer, what the
  // lower says starts another, which the other takes, and what it held goes.
  pixel.links.close();
  const each = (d: DevicesData, change: object): DevicesData => ({ ...d, siblings: { ...d.siblings!, list: d.siblings!.list.map((s) => ({ ...s, ...change })) } });
  await reopenWith(higher, (d) => each(d, { conversation: '', outbox: [], held: [], heard: 0 }));
  await reopenWith(lower, (d) => each(d, { again: 1 }));
  const held = await write(higher, carolId, 'held for the other');
  await higher.links.settled();
  const anew = await write(lower, carolId, 'started again');
  await lower.links.settled();
  await take(higher);
  await higher.links.settled();
  await take(lower);
  assert.deepEqual([higher.chats.history.messages().find((m) => m.tag === anew)?.mine, lower.chats.history.messages().find((m) => m.tag === held)?.mine], [true, true]);
  const answered = (await siblingsOf(lower))!.list[0];
  assert.deepEqual([answered.again, answered.before], [undefined, undefined]);
  // Another day with no answer, while the other was away and said something in the one before:
  // that still opens here, and the other takes the one started since.
  await reopenWith(lower, (d) => each(d, { again: 1 }));
  const again = await write(lower, carolId, 'started again, while it was away');
  await lower.links.settled();
  await sleep(5);
  await higher.chats.e2e.rename(carolId, 'Carol away');
  await higher.links.settled();
  await take(lower);
  const away = (await siblingsOf(lower))!.list[0];
  assert.deepEqual([nameOn(lower), away.before?.length], ['Carol away', 1]);
  // With one kept from before, it waits longer before the next: two days.
  assert.ok(away.again! - Date.now() > 2 * WAY_AGAIN - 60_000 && away.again! - Date.now() <= 2 * WAY_AGAIN);
  await take(higher);
  assert.equal(higher.chats.history.messages().find((m) => m.tag === again)?.mine, true);
  // Once more, while what the other said there could not go yet: it takes the one started since,
  // and what it sealed in the one before still goes, and opens here.
  await reopenWith(lower, (d) => each(d, { again: 1 }));
  await reopenWith(higher, (d) => each(d, { at: { ...d.siblings!.list[0].at!, sender: toHex(randomBytes(24)) } }));
  await sleep(5);
  await higher.chats.e2e.rename(carolId, 'Carol, said before');
  await higher.links.settled();
  assert.ok((await siblingsOf(higher))!.list[0].outbox.length > 0);
  const third = await write(lower, carolId, 'started again, while what it said waited');
  await lower.links.settled();
  await take(higher);
  await higher.links.settled();
  await take(lower);
  assert.deepEqual([nameOn(lower), higher.chats.history.messages().find((m) => m.tag === third)?.mine], ['Carol, said before', true]);

  for (const p of [pixel, dell, lenovo]) p.links.close();
});

test('a linked device\'s backup put back meets no one elsewhere, and on the same device meets the others again; one from before is reached through the phone, as is every device of a phone from before', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp, reopen } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const lenovo = await phone(2);
  const mac = await phone(3);
  const carol = await phone(4, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  const siblingsOf = async (p: Phone) => (await loadDevicesData(p.space, p.key)).siblings;
  const all = async () => {
    for (const p of [pixel, dell, lenovo]) await take(p);
    await asOld(() => take(mac));
  };
  const met = async (a: Phone, b: Phone) => {
    const [x, y] = [await siblingsOf(a), await siblingsOf(b)];
    return x?.list[0]?.id === b.chats.e2e.endpoint()?.id && y?.list[0]?.id === a.chats.e2e.endpoint()?.id && !!x?.list[0]?.sealTo && !!y?.list[0]?.sealTo;
  };
  // The computer linked first by versions from before endpoints, and kept as it was then: with the
  // account's chats, without an endpoint.
  await asOld(() => linkUp(pixel, dell));
  await until(async () => {
    await take(dell);
    return dell.chats.e2e.contacts().length === 1;
  });
  const before = await loadE2EData('space', dell.space, dell.key);
  await reopen(pixel);
  await reopen(dell);
  await linkUp(pixel, lenovo);
  // A computer on an Erevos from before has no endpoint: it is no one's other.
  await asOld(() => linkUp(pixel, mac));
  await until(async () => {
    await all();
    return met(dell, lenovo);
  });
  assert.equal(mac.chats.e2e.endpoint(), null);
  assert.equal((await siblingsOf(mac)) ?? null, null);
  for (const p of [dell, lenovo]) assert.equal((await siblingsOf(p))!.list.length, 1);
  // What one writes goes to the other directly, and to the one from before only through the phone.
  const tag = await write(dell, carolId, 'to every computer');
  await dell.links.settled();
  await take(lenovo);
  assert.equal(lenovo.chats.history.messages().some((m) => m.tag === tag), true);
  assert.equal(await receiveMessage(relay, fromHex(mac.queue.recipientHex)), null);
  await until(async () => {
    await all();
    return mac.chats.history.messages().some((m) => m.tag === tag);
  });
  assert.equal(lenovo.chats.history.messages().filter((m) => m.tag === tag).length, 1);

  // The computer's backup put back on another: no endpoint, no one to meet.
  const dellCopy = await phone(5, true, await loadE2EData('space', dell.space, dell.key));
  assert.deepEqual([dellCopy.chats.e2e.endpoint(), (await siblingsOf(dellCopy)) ?? null], [null, null]);
  dellCopy.links.close();

  // Put back on the same computer from before it had an endpoint: the others it met as the one it
  // had go as it opens; it makes another, the phone lists it, and they meet again.
  const was = dell.chats.e2e.endpoint()!;
  dell.links.close();
  await saveE2EData('space', dell.space, dell.key, before);
  dell.chats = { ...dell.chats, e2e: await E2E.open('space', dell.space, dell.key) };
  dell.links = await Links.open(dell.space, dell.key, dell.chats, 60 * 60_000);
  opened.push(dell.links);
  assert.equal((await siblingsOf(dell)) ?? null, null);
  await dell.links.settled();
  const now = dell.chats.e2e.endpoint()!;
  assert.notEqual(now.id, was.id);
  await until(async () => {
    await all();
    return met(dell, lenovo);
  });
  const again = await write(dell, carolId, 'met again');
  await dell.links.settled();
  await take(lenovo);
  assert.equal(lenovo.chats.history.messages().some((m) => m.tag === again), true);
  for (const p of [pixel, dell, lenovo, mac]) p.links.close();

  // A phone from before signs no list: its devices of this version have endpoints, but none meets
  // another, and what one writes reaches the other through the phone, as ever.
  const old = await phone(6);
  const asus = await phone(7);
  const hp = await phone(8);
  for (const p of [asus, hp]) {
    await asOld(() => linkUp(old, p));
    await reopen(p);
  }
  await asOld(() => take(old));
  for (const p of [asus, hp]) {
    await take(p);
    assert.ok(p.chats.e2e.endpoint());
    assert.equal((await siblingsOf(p)) ?? null, null);
  }
  assert.equal(old.chats.e2e.signedList(), null);
  const dan = await phone(9, false);
  await dan.chats.e2e.addContact({ senderHex: old.queue.senderHex, key: toBase64Url(old.chats.e2e.bundle), relayUrl: url }, dan.queue.senderHex, where);
  await write(dan, old.chats.e2e.identityHex(), 'hi');
  await asOld(() => take(old));
  await until(async () => {
    await take(asus);
    await take(hp);
    return asus.chats.e2e.contacts().length === 1 && hp.chats.e2e.contacts().length === 1;
  });
  const fromAsus = await write(asus, dan.chats.e2e.identityHex(), 'through the phone');
  await asus.links.settled();
  assert.equal(await receiveMessage(relay, fromHex(hp.queue.recipientHex)), null);
  await asOld(() => take(old));
  await until(async () => {
    await take(hp);
    return hp.chats.history.messages().some((m) => m.tag === fromAsus);
  });
  for (const p of [old, asus, hp]) p.links.close();
});

// What a phone or device keeps of what comes to it, as the receiver keeps it (lib/receiver.ts): one
// message that came twice, directly and through the phone, once.
async function takeKept(relay: Relay, { chats, queue: own, links }: Phone): Promise<Opened[]> {
  const came: Opened[] = [];
  for (;;) {
    const bytes = await receiveMessage(relay, fromHex(own.recipientHex));
    if (!bytes) break;
    const received = await chats.e2e.receive(bytes);
    if (received.kind !== 'message') continue;
    came.push(received);
    await keepReceived(chats, received);
  }
  await links.settled();
  return came;
}

// What the phone is still to give its contacts of its account, its prekeys and its device list, as
// the receiver gives it, and the copies of it for the endpoints of theirs.
async function giveKeys(relay: Relay, where: Where, { chats, queue: own }: Phone): Promise<string[]> {
  const given = chats.e2e.keysDue();
  for (const identity of given) {
    const sealed = await chats.e2e.seal(identity, '', own.senderHex, { at: where, keys: true });
    if (sealed.first) {
      await sendMessage(relay, fromHex(sealed.sender), sealed.first);
      await chats.e2e.firstSent(identity);
    }
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
    await chats.e2e.copiesGo(sealed.copies);
    await chats.e2e.keysGiven(identity);
  }
  await sendCopies(chats.e2e, relay);
  return given;
}

test('a contact on this version is given the list and writes to every endpoint: a device takes it with the phone off and answers itself, each message is kept once, what came and was read shows on all, and the places that fill the list are written to alike', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp, reopen } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const mac = await asOld(() => phone(2));
  const carol = await phone(3, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  // A computer on an Erevos from before, then one on this version, which the list names.
  await asOld(() => linkUp(pixel, mac));
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4 && dell.chats.e2e.own()?.list?.n === list.n;
  });
  await pixel.links.settled();
  await asOld(() => take(mac));
  const dells = dell.chats.e2e.endpoint()!;
  const first = pixel.chats.e2e.signedList()!;
  const named = (bodyOf(first) as Body).d.map((e) => e.i).sort();
  assert.ok(named.includes(dells.id));
  const tagged = (p: Phone, tag: string) => p.chats.history.messages().filter((m) => m.tag === tag);

  // Carol says she holds none of the account's lists: the phone gives her the one it signed, which
  // she checks against the account's key and keeps, with a way to each endpoint it names.
  assert.equal(pixel.chats.e2e.record(carolId)?.dv, 0);
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await take(carol);
  const learned = carol.chats.e2e.record(account)!;
  assert.equal(learned.list?.n, first.n);
  assert.deepEqual(learned.endpoints!.map((w) => w.id).sort(), named);
  assert.ok(learned.endpoints!.every((w) => w.sender && w.relay === url && w.conversations.length === 0));
  assert.equal(pixel.chats.e2e.keysDue().includes(carolId), false);

  // What she writes goes to the account, and a copy to each endpoint, each in a conversation she
  // starts with it. The relay takes them all: those for the places that fill the list as the
  // computer's, and her chat keeps each way alike.
  const everywhere = await write(carol, account, 'to every endpoint');
  assert.deepEqual(carol.chats.e2e.copies().map((c) => c.w).sort(), [...named, ...named].sort());
  // Each sealed for the relay, the places that fill the list as the computer, each with a key of its own.
  assert.ok(carol.chats.e2e.copies().filter((c) => !c.first).every((c) => isSealedPacket(fromBase64(c.p))));
  const keys = Object.values(pixel.chats.e2e.signedList()!.r!).map((r) => r.pk);
  assert.deepEqual([keys.length, new Set(keys).size, keys.includes(dell.chats.e2e.endpointKey())], [4, 4, true]);
  assert.equal(await sendCopies(carol.chats.e2e, relay), 8);
  assert.equal(carol.chats.e2e.copies().length, 0);
  const looks = carol.chats.e2e.record(account)!.endpoints!.map((w) => JSON.stringify([w.sender.length, w.relay, w.relayKey, w.conversations.length, w.first, w.seen, w.sealTo.length, w.sealsIn]));
  assert.deepEqual(new Set(looks).size, 1);
  assert.ok(carol.chats.e2e.record(account)!.endpoints!.every((w) => w.sealTo !== ''));
  // The phone empties the queues of the places that fill it, so the relay keeps them as it keeps
  // the computer's.
  const fillers = Object.values(pixel.chats.e2e.signedList()!.q!);
  assert.equal(fillers.length, 3);
  await pixel.links.drainFillers();
  for (const recipient of fillers) assert.equal(await receiveMessage(relay, fromHex(recipient)), null);
  // One the relay no longer has is made anew, with the same key, and Carol is told where it reads.
  const [lostId, lostQueue] = Object.entries(pixel.chats.e2e.signedList()!.q!)[0];
  const lostRoute = pixel.chats.e2e.signedList()!.r![lostId];
  await deleteQueue(relay, fromHex(lostQueue));
  await pixel.links.drainFillers();
  const remade = pixel.chats.e2e.signedList()!.r![lostId];
  assert.deepEqual([remade.s !== lostRoute.s, remade.pk], [true, lostRoute.pk]);
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await take(carol);
  assert.equal(carol.chats.e2e.record(account)!.endpoints!.find((w) => w.id === lostId)!.sender, remade.s);

  // The computer has it directly and through the phone, and keeps it once; it has a way of its own
  // to Carol now. The one from before has it through the phone.
  await take(pixel);
  const onDell = await takeKept(relay, dell);
  assert.equal(onDell.filter((m) => m.tag === everywhere).length, 2);
  assert.equal(tagged(dell, everywhere).length, 1);
  // And a notice tells of it once (lib/background.ts).
  assert.deepEqual(onDell.filter((m) => m.tag === everywhere).map(isNews), [true, false]);
  assert.equal(dell.chats.e2e.record(carolId)?.direct?.sender, carol.queue.senderHex);
  await pixel.links.settled();
  assert.deepEqual((await asOld(() => take(mac))).map((m) => m.tag), [everywhere]);

  // The computer writes to her itself: she reads it as the account's, from the computer's endpoint.
  // The phone keeps it as its own, and passes it to the computer from before.
  assert.equal(dell.chats.e2e.record(carolId)?.dv, first.n);
  const answer = await write(dell, carolId, 'from the computer');
  const atCarol = (await take(carol)).filter((m) => m.tag === answer);
  assert.deepEqual(atCarol.map((m) => [m.identity, m.text, m.from]), [[account, 'from the computer', dells.id]]);
  await dell.links.settled();
  await take(pixel);
  assert.deepEqual(tagged(pixel, answer).map((m) => m.mine), [true]);
  await pixel.links.settled();
  await asOld(() => take(mac));
  assert.deepEqual(tagged(mac, answer).map((m) => m.mine), [true]);

  // That it came goes back only the way it came, and the phone marks it as the computer does.
  const came = await carol.chats.e2e.seal(account, '', carol.queue.senderHex, { at: where, got: [answer] });
  assert.deepEqual(carol.chats.e2e.copies(), []);
  await sendMessage(relay, fromHex(came.sender), came.packet);
  await carol.chats.e2e.copiesGo(came.copies);
  assert.deepEqual(carol.chats.e2e.copies().map((c) => c.w), [dells.id]);
  await sendCopies(carol.chats.e2e, relay);
  assert.deepEqual((await take(pixel)).map((m) => m.got), [[]]);
  await takeKept(relay, dell);
  assert.equal(tagged(dell, answer)[0]?.mark, 1);
  await dell.links.settled();
  await take(pixel);
  assert.equal(tagged(pixel, answer)[0]?.mark, 1);
  // That it was read goes to every endpoint: the phone and the computer mark it.
  const read = await carol.chats.e2e.seal(account, '', carol.queue.senderHex, { at: where, read: [answer] });
  await sendMessage(relay, fromHex(read.sender), read.packet);
  await carol.chats.e2e.copiesGo(read.copies);
  assert.equal(carol.chats.e2e.copies().length, 4);
  await sendCopies(carol.chats.e2e, relay);
  await take(pixel);
  await takeKept(relay, dell);
  assert.deepEqual([tagged(pixel, answer)[0]?.mark, tagged(dell, answer)[0]?.mark], [2, 2]);

  // Someone new, with the account's list, starts a conversation with the computer before the phone
  // told it of them: it waits, kept with the chat as the computer is opened again, and is taken
  // once the phone does.
  const nina = await phone(4, false);
  const ninaId = nina.chats.e2e.identityHex();
  const ninaSecret = fromBase64((await loadE2EData('space', nina.space, nina.key)).account);
  const early = await startConversation(ninaSecret, fromBase64Url(dells.bundle), utf8Encode(JSON.stringify({ from: nina.queue.senderHex, text: '', dv: 0, to: account })));
  assert.equal((await dell.chats.e2e.receive(early.packet)).kind, 'refused');
  dell.chats.e2e = await E2E.open('space', dell.space, dell.key);
  await reopen(dell);
  await nina.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, nina.queue.senderHex, where);
  await write(nina, account, 'hello from Nina');
  await take(pixel);
  await until(async () => {
    await take(dell);
    return dell.chats.e2e.record(ninaId)?.direct?.sender === nina.queue.senderHex;
  });
  await pixel.links.settled();
  await take(dell);

  // The phone off: what she writes reaches the computer, which answers her itself.
  pixel.links.close();
  const off = await write(carol, account, 'with the phone off');
  await sendCopies(carol.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, dell)).map((m) => m.tag), [off]);
  assert.equal(tagged(dell, off).length, 1);
  // Gone from the computer, as once its timer ran out: when the phone passes it on, not kept again,
  // however many she wrote after it, all of which the phone passes on too, in the order they came.
  await dell.chats.history.remove(`contact:${carolId}`, off);
  await write(dell, carolId, 'answered with the phone off');
  assert.deepEqual((await take(carol)).map((m) => [m.text, m.from]), [['answered with the phone off', dells.id]]);
  const since: string[] = [];
  for (let i = 0; i < 210; i++) {
    since.push(await write(carol, account, `after it ${i}`));
    await sendCopies(carol.chats.e2e, relay);
    await takeKept(relay, dell);
  }

  // Unlinked: the phone signs a list without the computer, and gives it to Carol, who lets go of
  // the computer's way. What it sealed for her before is not opened, and her account takes no
  // conversation its endpoint starts with her saying it speaks for the account, nor keeps it.
  await reopen(pixel);
  await take(pixel);
  await takeKept(relay, dell);
  assert.equal(tagged(dell, off).length, 0);
  assert.deepEqual(since.filter((tag) => tagged(dell, tag).length !== 1), []);
  const secret = (await loadE2EData('space', dell.space, dell.key)).endpoint!;
  const captured = await dell.chats.e2e.seal(carolId, 'kept back', dell.queue.senderHex, { at: where });
  assert.equal(captured.sender, carol.queue.senderHex);
  const dellPeer = (await loadDevicesData(pixel.space, pixel.key)).devices.find((d) => d.endpoint?.id === dells.id)!;
  await pixel.links.unlink(dellPeer.id);
  await until(async () => {
    await take(pixel);
    const list = pixel.chats.e2e.signedList()!;
    return list.n > first.n && Object.keys(list.r ?? {}).length === 4;
  });
  const second = pixel.chats.e2e.signedList()!;
  assert.deepEqual(second.real, []);
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await take(carol);
  const after = carol.chats.e2e.record(account)!;
  assert.deepEqual([after.list?.n, after.endpoints!.length, after.endpoints!.some((w) => w.id === dells.id)], [second.n, 4, false]);
  assert.equal((await carol.chats.e2e.receive(captured.packet)).kind, 'refused');
  const opening = utf8Encode(JSON.stringify({ from: dell.queue.senderHex, text: '', dv: 0, acct: account, to: carolId }));
  const forged = await startConversation(fromBase64(secret), carol.chats.e2e.bundle, opening);
  assert.equal((await carol.chats.e2e.receive(forged.packet)).kind, 'refused');
  assert.equal((await loadE2EData('space', carol.space, carol.key)).unverified, undefined);

  // The phone moves to another relay: the places that fill its list follow it there, with the keys
  // contacts seal for them with, and Carol is to be told where they read now.
  const elsewhere = await startRelay();
  const queueThere = await createQueue({ url: elsewhere });
  await saveSpaceData(pixel.space, pixel.key, { ...EMPTY_SPACE, url: elsewhere, ownQueue: { recipientHex: toHex(queueThere.recipientId), senderHex: toHex(queueThere.senderId) } });
  await pixel.links.drainFillers();
  const there = pixel.chats.e2e.signedList()!;
  assert.deepEqual(Object.values(there.r!).map((r) => [r.relay, r.pk]), Object.values(second.r!).map((r) => [elsewhere, r.pk]));
  assert.ok(pixel.chats.e2e.keysDue().includes(carolId));

  for (const p of [pixel, dell, mac]) p.links.close();
});

test('calls on the devices: a contact on this version copies a call to every endpoint, a device takes it with the phone off and answers it itself, from its own endpoint', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  // Each says it copies a call's signals to the endpoints.
  assert.equal(pixel.chats.e2e.record(carolId)?.calls, true);
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && dell.chats.e2e.own()?.list?.n === list.n;
  });
  await pixel.links.settled();
  const dells = dell.chats.e2e.endpoint()!;
  await giveKeys(relay, where, pixel);
  await take(carol);
  assert.equal(carol.chats.e2e.record(account)?.calls, true);
  // A first message to every endpoint, so the computer has a way of its own to her.
  await write(carol, account, 'to every endpoint');
  await sendCopies(carol.chats.e2e, relay);
  await take(pixel);
  await takeKept(relay, dell);
  await pixel.links.settled();
  await take(dell);
  assert.equal(dell.chats.e2e.record(carolId)?.direct?.sender, carol.queue.senderHex);

  // The phone off: her call rings on the computer, copied whole to its endpoint.
  pixel.links.close();
  const offer = { id: 'ab'.repeat(8), kind: 'offer' as const, video: false, sdp: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n', at: Date.now() };
  const sealed = await carol.chats.e2e.seal(account, '', carol.queue.senderHex, { at: where, call: offer });
  await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
  await carol.chats.e2e.copiesGo(sealed.copies);
  assert.ok(carol.chats.e2e.copies().some((c) => c.w === dells.id));
  await sendCopies(carol.chats.e2e, relay);
  const rang = (await takeKept(relay, dell)).filter((m) => m.call?.kind === 'offer');
  assert.deepEqual(rang.map((m) => [m.identity, m.call?.id]), [[carolId, offer.id]]);

  // The computer answers itself: she hears it from its endpoint, not through the phone.
  const answer = { id: offer.id, kind: 'answer' as const, sdp: 'v=0\r\no=- 2 2 IN IP4 0.0.0.0\r\n' };
  const answered = await dell.chats.e2e.seal(carolId, '', dell.queue.senderHex, { at: where, call: answer });
  assert.equal(answered.sender, carol.queue.senderHex);
  await sendMessage(relay, fromHex(answered.sender), answered.packet);
  await dell.chats.e2e.copiesGo(answered.copies);
  const heard = (await take(carol)).filter((m) => m.call?.kind === 'answer');
  assert.deepEqual(heard.map((m) => [m.identity, m.call?.id, m.from]), [[account, offer.id, dells.id]]);
  for (const p of [pixel, dell]) p.links.close();
});

test('someone new added on a linked device with the phone off: the device starts its own conversation with the account\'s word for its bundle, she takes the account as a request from its endpoint, they write both ways, and the phone adds her later, not as a request', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp, reopen } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const erin = await phone(2);
  const account = pixel.chats.e2e.identityHex();
  const erinId = erin.chats.e2e.identityHex();
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && dell.chats.e2e.own()?.list?.n === list.n && !!dell.chats.e2e.own()?.ap;
  });
  await pixel.links.settled();
  const dells = dell.chats.e2e.endpoint()!;
  pixel.links.close();

  // Her link says her Erevos takes a conversation a device starts (`d`).
  const added = await dell.chats.e2e.addContact({ senderHex: erin.queue.senderHex, key: toBase64Url(erin.chats.e2e.bundle), relayUrl: url, d: true }, dell.queue.senderHex, where);
  assert.equal(added.added, true);
  assert.equal(dell.chats.e2e.record(erinId)?.direct?.sender, erin.queue.senderHex);
  await write(dell, erinId, 'hello from the computer');
  assert.ok(!dell.chats.e2e.record(erinId)?.direct?.first);
  const came = await take(erin);
  assert.deepEqual(came.filter((m) => m.text).map((m) => [m.identity, m.text, m.from]), [[account, 'hello from the computer', dells.id]]);
  assert.ok(came.every((m) => m.identity === account && m.from === dells.id));
  const her = erin.chats.e2e.record(account)!;
  assert.equal(her.request, true);
  assert.ok(her.endpoints?.some((w) => w.id === dells.id));
  assert.equal(her.sender, pixel.queue.senderHex);

  // She answers: the computer takes it from its endpoint, the phone still off.
  await erin.chats.e2e.acceptRequest(account);
  await write(erin, account, 'hello back');
  await sendCopies(erin.chats.e2e, relay);
  const back = await takeKept(relay, dell);
  assert.deepEqual(back.filter((m) => m.text).map((m) => [m.identity, m.text]), [[erinId, 'hello back']]);
  assert.ok(dell.chats.e2e.record(erinId)?.direct?.conversations[0]);

  // The phone back: it adds her, as the computer asked, and not as a request; the computer keeps its way to her.
  await reopen(pixel);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const c = pixel.chats.e2e.record(erinId);
    return !!c && !c.request;
  });
  assert.equal(dell.chats.e2e.record(erinId)?.direct?.sender, erin.queue.senderHex);
  await write(dell, erinId, 'still direct');
  const again = await take(erin);
  assert.deepEqual(again.filter((m) => m.text).map((m) => [m.identity, m.text, m.from]), [[account, 'still direct', dells.id]]);
  // The account's own first word came with it: no new start, and so gone.
  assert.equal(erin.chats.e2e.record(account)?.byDevice, undefined);
  for (const p of [pixel, dell, erin]) p.links.close();
});

test('sent for later from a device: held for the contact and copied to each endpoint, shown as scheduled on the phone, taken back there, and with the phone off it goes from the device', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && dell.chats.e2e.own()?.list?.n === list.n;
  });
  await pixel.links.settled();
  const dells = dell.chats.e2e.endpoint()!;
  await giveKeys(relay, where, pixel);
  await take(carol);
  await write(carol, account, 'to every endpoint');
  await sendCopies(carol.chats.e2e, relay);
  await take(pixel);
  await takeKept(relay, dell);
  await pixel.links.settled();
  await take(dell);
  assert.equal(dell.chats.e2e.record(carolId)?.direct?.sender, carol.queue.senderHex);
  const placeOf = (p: Phone): SendPlace => ({ sends: relay, own: relay, senderHex: p.queue.senderHex, here: where, ownKey: '', relayUp: true });
  const peer = `contact:${carolId}`;

  // The computer sends one for later: held by the relay, and the phone shows it as scheduled.
  const later = 'a1a1a1a1a1a1';
  await dell.chats.history.add({ peer, text: 'tomorrow', mine: true, at: Date.now() + 600_000, tag: later, mark: WAITING });
  const went = await sendWaiting(dell.chats, placeOf(dell));
  assert.deepEqual(went.map((w) => [w.tag, !!w.held]), [[later, true]]);
  await dell.links.laterWritten();
  await until(async () => {
    await take(pixel);
    await pixel.links.laterSettled();
    return pixel.chats.history.messages().some((m) => m.peer === peer && m.tag === later);
  });
  const shown = pixel.chats.history.messages().find((m) => m.tag === later)!;
  assert.deepEqual([shown.text, shown.mine, shown.held?.id, shown.heldFor], ['tomorrow', true, went[0].held!.id, undefined]);
  // Taken back on the phone: the relay drops it, and it goes from the computer too.
  assert.equal(await takeBack(relay, shown.held!), true);
  await pixel.chats.history.remove(peer, later);
  pixel.links.changedHere({ c: carolId, tag: later, gone: true });
  await until(async () => {
    await take(dell);
    await dell.links.laterSettled();
    return !dell.chats.history.messages().some((m) => m.tag === later);
  });

  // The phone off: one from the computer goes at its time, from its endpoint; one Carol sends for
  // later is held for the account and for each endpoint, so the computer has it then too.
  pixel.links.close();
  const soon = 'b2b2b2b2b2b2';
  const at = Date.now() + 2500;
  await dell.chats.history.add({ peer, text: 'soon', mine: true, at, tag: soon, mark: WAITING });
  assert.deepEqual((await sendWaiting(dell.chats, placeOf(dell))).map((w) => w.tag), [soon]);
  const hers = 'c3c3c3c3c3c3';
  await carol.chats.history.add({ peer: `contact:${account}`, text: 'for every endpoint', mine: true, at, tag: hers, mark: WAITING });
  assert.deepEqual((await sendWaiting(carol.chats, placeOf(carol))).map((w) => w.tag), [hers]);
  await sendCopies(carol.chats.e2e, relay);
  assert.ok(carol.chats.e2e.laterCopies(account, hers).length >= 1);
  assert.deepEqual((await takeKept(relay, dell)).filter((m) => m.tag === hers), []);
  assert.deepEqual((await take(carol)).filter((m) => m.tag === soon), []);
  await new Promise((r) => setTimeout(r, 3500));
  assert.deepEqual((await take(carol)).filter((m) => m.tag === soon).map((m) => [m.identity, m.text, m.from, m.due]), [[account, 'soon', dells.id, at]]);
  assert.deepEqual((await takeKept(relay, dell)).filter((m) => m.tag === hers).map((m) => [m.text, m.due]), [['for every endpoint', at]]);
  dell.links.close();
});

// With the phone's queue full, what a contact writes still goes to the computer, once however
// often it is tried again, and the computer's conversation with them goes on.
test('each contact seals for each endpoint with a key of its own, which the computer finds them by with the phone off, so no contact opens what another seals for it', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(3, false);
  const olga = await phone(5, false);
  const account = pixel.chats.e2e.identityHex();
  for (const c of [carol, olga]) {
    await c.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, c.queue.senderHex, where);
    await write(c, account, 'hello');
    await take(pixel);
    await pixel.chats.e2e.acceptRequest(c.chats.e2e.identityHex());
  }
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4 && dell.chats.e2e.own()?.list?.n === list.n;
  });
  await pixel.links.settled();
  assert.equal((await giveKeys(relay, where, pixel)).length, 2);
  await take(carol);
  await take(olga);
  // Neither is given the key the phone keeps for an entry, the computer's or a place's that fills
  // the list, and each is given another for every entry.
  const kept = pixel.chats.e2e.signedList()!.r!;
  const keysOf = (c: Phone) => Object.fromEntries(c.chats.e2e.record(account)!.endpoints!.map((w) => [w.id, w.sealTo]));
  const [atCarol, atOlga] = [keysOf(carol), keysOf(olga)];
  assert.deepEqual(Object.keys(atCarol).sort(), Object.keys(kept).sort());
  for (const id of Object.keys(kept)) assert.ok(atCarol[id] !== atOlga[id] && atCarol[id] !== kept[id].pk && atOlga[id] !== kept[id].pk);

  // With the phone off, each writes: what Olga seals for any endpoint, Carol's keys open none of,
  // and the computer opens both, finding whose each is by its mark.
  pixel.links.close();
  const [toCarol, toOlga] = [await write(carol, account, 'from carol'), await write(olga, account, 'from olga')];
  const olgas = olga.chats.e2e.copies().filter((c) => !c.first);
  assert.ok(olgas.length === 4 && olgas.every((c) => isSealedPacket(fromBase64(c.p))));
  assert.equal(olgas.filter((c) => openPacket(packetKeys(fromBase64Url(atCarol[c.w])), fromBase64(c.p))).length, 0);
  await sendCopies(carol.chats.e2e, relay);
  await sendCopies(olga.chats.e2e, relay);
  const came = await takeKept(relay, dell);
  assert.deepEqual(came.filter((m) => m.text).map((m) => [m.tag, m.identity]).sort(), [[toCarol, carol.chats.e2e.identityHex()], [toOlga, olga.chats.e2e.identityHex()]].sort());
  assert.deepEqual([dell.chats.e2e.record(carol.chats.e2e.identityHex())?.direct?.sender, dell.chats.e2e.record(olga.chats.e2e.identityHex())?.direct?.sender], [carol.queue.senderHex, olga.queue.senderHex]);
  for (const p of [pixel, dell]) p.links.close();
});

test('with the phone\'s queue full, what a contact writes and marks still reaches the computer, once however often it is tried, and what they write after opens there', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(3, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && list.real.length === 1 && dell.chats.e2e.own()?.list?.n === list.n;
  });
  await pixel.links.settled();
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await take(carol);
  await write(carol, account, 'first');
  await sendCopies(carol.chats.e2e, relay);
  await take(pixel);
  await takeKept(relay, dell);
  const answer = await write(dell, carolId, 'from the computer');
  await take(carol);
  await dell.links.settled();
  await take(pixel);
  const tagged = (p: Phone, tag: string) => p.chats.history.messages().filter((m) => m.tag === tag);

  // The phone off, and its queue as full as the relay keeps one.
  pixel.links.close();
  const sends = new RelaySends();
  let filled = 0;
  for (;;) {
    try {
      await sends.send(relay, fromHex(pixel.queue.senderHex), randomBytes(300), 'quiet');
      filled += 1;
    } catch (error) {
      assert.match(String(error), /queue is full/);
      break;
    }
  }
  sends.close();
  assert.ok(filled > 0);
  // What she writes the relay takes only later for the account: the copies go now, and what she
  // tries again with the same tag copies nothing more.
  const tries = async (text: string, extra: { tag?: string; read?: string[] }) => {
    const sealed = await carol.chats.e2e.seal(account, text, carol.queue.senderHex, { at: where, ...extra });
    await assert.rejects(carol.chats.e2e.copiesAfter(sealed.copies, sendMessage(relay, fromHex(sealed.sender), sealed.packet), true), /queue is full/);
    return sealed.tag;
  };
  const full = await tries('the phone\'s queue full', {});
  const ways = carol.chats.e2e.record(account)!.endpoints!.length;
  assert.equal(await sendCopies(carol.chats.e2e, relay), ways);
  for (let i = 0; i < 3; i++) await tries('the phone\'s queue full', { tag: full });
  assert.equal(await sendCopies(carol.chats.e2e, relay), 0);
  // That she read what the computer wrote, tried again more times than a conversation skips: it
  // goes to each endpoint once.
  await tries('', { read: [answer] });
  for (let i = 0; i < 1000; i++) await tries('', { read: [answer] });
  assert.equal(await sendCopies(carol.chats.e2e, relay), ways);
  const onDell = await takeKept(relay, dell);
  assert.deepEqual(onDell.filter((m) => m.tag === full).map((m) => m.text), ['the phone\'s queue full']);
  assert.deepEqual(onDell.filter((m) => m.read.length > 0).map((m) => m.read), [[answer]]);
  assert.equal(tagged(dell, full).length, 1);
  assert.equal(tagged(dell, answer)[0]?.mark, 2);

  // The phone empties its queue: what she writes next opens on the computer.
  let drained = 0;
  while (await receiveMessage(relay, fromHex(pixel.queue.recipientHex))) drained += 1;
  assert.equal(drained, filled);
  const next = await write(carol, account, 'after');
  await sendCopies(carol.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, dell)).map((m) => [m.tag, m.text]), [[next, 'after']]);
  dell.links.close();
});

// Fills a queue as full as the relay keeps one, with what no one opens. Says how many it took.
async function fill(relay: Relay, sender: string): Promise<number> {
  const sends = new RelaySends();
  let filled = 0;
  for (;;) {
    try {
      await sends.send(relay, fromHex(sender), randomBytes(300), 'quiet');
      filled += 1;
    } catch (error) {
      assert.match(String(error), /queue is full/);
      break;
    }
  }
  sends.close();
  return filled;
}

test('what a computer writes through the phone to a contact whose queue is full: a reaction copies nothing for the endpoints of their account, as the phone tries it again as it comes, and a message, which waits, copies once', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2);
  const asus = await phone(3);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  const hello = await write(carol, account, 'hello');
  await takeKept(relay, pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await linkUp(carol, asus);
  const all = async () => {
    for (const p of [pixel, dell, carol, asus]) await takeKept(relay, p);
  };
  await until(async () => {
    await all();
    const list = carol.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4 && !!pixel.chats.e2e.signedList() && dell.chats.e2e.contacts().length === 1;
  });
  // Carol gives the account her list; it gives her none of its own, so the computer writes to her
  // through the phone, which copies it for the endpoints of her account.
  await write(pixel, carolId, 'hi');
  await takeKept(relay, carol);
  assert.ok((await giveKeys(relay, where, carol)).includes(account));
  await until(async () => {
    await all();
    return pixel.chats.e2e.record(carolId)?.endpoints?.length === 4;
  });
  await write(pixel, carolId, 'with your list');
  assert.ok((await sendCopies(pixel.chats.e2e, relay)) >= 4);
  await all();
  assert.deepEqual(pixel.chats.e2e.copies(), []);

  // Her queue full: the computer's reaction does not go, and the phone copies nothing of it.
  assert.ok((await fill(relay, carol.queue.senderHex)) > 0);
  const reacted = await dell.chats.e2e.seal(carolId, '', dell.queue.senderHex, { at: where, react: { tag: hello, emoji: '👍' } });
  assert.equal(reacted.through, true);
  await sendMessage(relay, fromHex(reacted.sender), reacted.packet);
  await takeKept(relay, pixel);
  assert.deepEqual(pixel.chats.e2e.copies(), []);
  // What it writes, which waits on the phone, goes to her endpoints at once.
  const text = await dell.chats.e2e.seal(carolId, 'from the computer', dell.queue.senderHex, { at: where });
  await sendMessage(relay, fromHex(text.sender), text.packet);
  await takeKept(relay, pixel);
  assert.equal(pixel.chats.e2e.copies().length, 4);
  await sendCopies(pixel.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, asus)).filter((m) => m.text).map((m) => [m.tag, m.text]), [[text.tag, 'from the computer']]);
  for (const p of [pixel, dell, carol, asus]) p.links.close();
});

test('a contact takes a list only as their account signed it for them, an account no conversation an endpoint starts, and a device one only once the list names its sender and it is for this account', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, linkUp } = await setup();
  const carol = await phone(0);
  const mallory = await phone(1, false);
  const olga = await phone(2, false);
  const laptop = await phone(3);
  const carolId = carol.chats.e2e.identityHex();
  const malloryId = mallory.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: mallory.queue.senderHex, key: toBase64Url(mallory.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  for (const p of carol.chats.e2e.pending()) {
    await sendMessage(relay, fromHex(p.sender), p.first);
    await carol.chats.e2e.firstSent(p.identity);
  }
  await mallory.chats.e2e.receive((await receiveMessage(relay, fromHex(mallory.queue.recipientHex)))!);
  // What Mallory's account says to Carol, in its conversation with her, as Mallory wants it said.
  let conversation = fromBase64(mallory.chats.e2e.record(carolId)!.conversations[0]);
  const ak = toBase64Url(mallory.chats.e2e.bundle);
  const say = async (m: object) => {
    const sealed = await sealIn(conversation, utf8Encode(JSON.stringify({ from: mallory.queue.senderHex, text: '', dv: 0, ak, ...m })));
    conversation = sealed.conversation;
    const received = await carol.chats.e2e.receive(sealed.packet);
    await carol.links.settled();
    return received;
  };
  const endpoint = async () => {
    const secret = await newAccount();
    return { secret, i: toHex(await accountIdentity(secret)), b: toBase64Url(await accountBundle(secret)) };
  };
  const [x, y, m] = [await endpoint(), await endpoint(), await endpoint()];
  const signed = (by: Phone, a: string, n: number, d: { i: string; b: string }[]) => signList((context, message) => by.chats.e2e.sign(context, message), { a, n, d: d.map(({ i, b }) => ({ i, b, f: 1 })) });
  // A conversation an endpoint starts with `bundle`, saying it speaks for Mallory's account, for `to`.
  const opening = (to: string, bundle: Uint8Array) => startConversation(m.secret, bundle, utf8Encode(JSON.stringify({ from: mallory.queue.senderHex, text: '', dv: 0, acct: malloryId, to })));
  const held = async (p: Phone) => (await loadE2EData('space', p.space, p.key)).unverified ?? [];
  const kept = (p: Phone = carol) => p.chats.e2e.record(malloryId)!;
  assert.equal((await say({})).kind, 'message');
  assert.deepEqual([kept().dv, kept().list], [0, undefined]);

  // Her account takes no conversation that says it is for an endpoint, its own account's or
  // anyone's, as no list names an account, and keeps none to try again.
  for (const to of [carolId, olga.chats.e2e.identityHex()]) assert.equal((await carol.chats.e2e.receive((await opening(to, carol.chats.e2e.bundle)).packet)).kind, 'refused');
  assert.deepEqual(await held(carol), []);

  // A list whose signature does not hold, one another account signed, and one Mallory signed as
  // another account's, are none.
  const own = await signed(mallory, malloryId, 10, [x]);
  const other = await signed(mallory, malloryId, 11, [y]);
  await say({ dl: { b: own.b, s: other.s } });
  await say({ ak: toBase64Url(olga.chats.e2e.bundle), dl: await signed(olga, olga.chats.e2e.identityHex(), 12, [x]) });
  await say({ dl: await signed(mallory, olga.chats.e2e.identityHex(), 13, [x]) });
  assert.equal(kept().list, undefined);

  // Her computer, linked: it knows of Mallory what the phone knows, and its endpoint takes
  // conversations. No list names that endpoint yet: not taken, and kept to try again with her next
  // list. One for someone else is not kept at all.
  await linkUp(carol, laptop);
  await until(async () => {
    await take(carol);
    await take(laptop);
    return !!laptop.chats.e2e.endpoint() && laptop.chats.e2e.record(malloryId)?.dv === 0;
  });
  const onLaptop = fromBase64Url(laptop.chats.e2e.endpoint()!.bundle);
  assert.equal((await laptop.chats.e2e.receive((await opening(carolId, onLaptop)).packet)).kind, 'refused');
  assert.equal((await laptop.chats.e2e.receive((await opening(olga.chats.e2e.identityHex(), onLaptop)).packet)).kind, 'refused');
  assert.deepEqual((await held(laptop)).map((u) => u.acct), [malloryId]);

  // Her own list, not naming that endpoint: taken, and given to the computer, where what waited for it goes.
  await say({ dl: await signed(mallory, malloryId, 20, [x, y]) });
  assert.deepEqual([kept().list?.n, kept().endpoints?.map((w) => w.id).sort()], [20, [x.i, y.i].sort()]);
  await take(laptop);
  assert.deepEqual([kept(laptop).list?.n, await held(laptop)], [20, []]);
  // Started again, and then a list that names it: taken now, as Mallory's, and what it says next
  // opens as hers, from that endpoint. An older list after it changes nothing.
  const again = await opening(carolId, onLaptop);
  assert.equal((await laptop.chats.e2e.receive(again.packet)).kind, 'refused');
  await say({ dl: await signed(mallory, malloryId, 30, [x, m]) });
  await take(laptop);
  assert.deepEqual([kept(laptop).list?.n, kept(laptop).endpoints?.find((w) => w.id === m.i)?.conversations.length], [30, 1]);
  assert.deepEqual(await held(laptop), []);
  const next = await sealIn(again.conversation, utf8Encode(JSON.stringify({ from: mallory.queue.senderHex, text: 'from an endpoint', tag: 'aaaaaaaaaaaa', dv: 0 })));
  const opened = await laptop.chats.e2e.receive(next.packet);
  assert.deepEqual(opened.kind === 'message' && [opened.identity, opened.text, opened.from], [malloryId, 'from an endpoint', m.i]);
  await say({ dl: await signed(mallory, malloryId, 25, [y]) });
  assert.equal(kept().list?.n, 30);

  // Her account says nothing of devices any more (moved into hidden chats, or an Erevos from
  // before put back): what was kept of them goes, and nothing more goes to her endpoints.
  await say({ dv: undefined, ak: undefined });
  assert.deepEqual([kept().dv, kept().list, kept().endpoints], [undefined, undefined, undefined]);
  const only = await carol.chats.e2e.seal(malloryId, 'only to her account', carol.queue.senderHex, { at: where });
  await carol.chats.e2e.copiesGo(only.copies);
  assert.equal(carol.chats.e2e.copies().length, 0);

  for (const p of [carol, mallory, olga, laptop]) p.links.close();
});

test('someone new takes a conversation a device starts only with its account\'s own word for the bundle, a list that account signed naming that device, for them, and a pass from that account for that device, good now, which says where the account reads; and never from someone blocked', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { url, phone } = await setup();
  const erin = await phone(0);
  const mallory = await phone(1);
  const olga = await phone(2);
  const erinId = erin.chats.e2e.identityHex();
  const malloryId = mallory.chats.e2e.identityHex();
  const secret = await newAccount();
  const m = { secret, i: toHex(await accountIdentity(secret)), b: toBase64Url(await accountBundle(secret)) };
  const other = await newAccount();
  const x = toBase64Url(await accountBundle(other));
  const xi = toHex(await accountIdentity(other));
  const signed = (by: Phone, a: string, n: number, d: { i: string; b: string }[]) => signList((context, message) => by.chats.e2e.sign(context, message), { a, n, d: d.map(({ i, b }) => ({ i, b, f: 1 })) });
  const ak = toBase64Url(mallory.chats.e2e.bundle);
  const ab = await mallory.chats.e2e.binding();
  assert.equal(fromBase64Url(ab).length, 64);
  const list = await signed(mallory, malloryId, 5, [m]);
  const pass = (by: Phone, a: string, i: string, u: number) => signPass((context, message) => by.chats.e2e.sign(context, message), { a, i, s: 'ab'.repeat(24), r: url, k: '', u });
  const day = 24 * 60 * 60_000;
  const fine = { from: mallory.queue.senderHex, relay: url, text: 'hello', tag: 'bbbbbbbbbbbb', dv: 0, cl: 1, to: erinId, acct: malloryId, ak, ab, dl: list, ap: await pass(mallory, malloryId, m.i, Date.now() + day) };
  const opening = async (say: object) => (await startConversation(m.secret, erin.chats.e2e.bundle, utf8Encode(JSON.stringify({ ...fine, ...say })))).packet;
  const refused = async (say: object) => {
    const received = await erin.chats.e2e.receive(await opening(say));
    assert.equal(received.kind, 'refused', JSON.stringify(Object.keys(say)));
    assert.ok(!erin.chats.e2e.record(malloryId));
  };
  // Another account's word, a word made up, and another account's bundle with its own word.
  await refused({ ab: await olga.chats.e2e.binding() });
  await refused({ ab: toBase64Url(randomBytes(64)) });
  await refused({ ak: toBase64Url(olga.chats.e2e.bundle), ab: await olga.chats.e2e.binding() });
  // For someone else; a list not naming this device, or signed as another account's, or by another; no list; nowhere the account reads.
  await refused({ to: olga.chats.e2e.identityHex() });
  await refused({ dl: await signed(mallory, malloryId, 6, [{ i: xi, b: x }]) });
  await refused({ dl: await signed(mallory, olga.chats.e2e.identityHex(), 7, [m]) });
  await refused({ dl: await signed(olga, malloryId, 8, [m]) });
  await refused({ dl: undefined });
  // No pass; one run out, or good for far longer than one lasts; for another endpoint, another account, or signed by another.
  await refused({ ap: undefined });
  await refused({ ap: await pass(mallory, malloryId, m.i, Date.now() - 1000) });
  await refused({ ap: await pass(mallory, malloryId, m.i, Date.now() + 30 * day) });
  await refused({ ap: await pass(mallory, malloryId, xi, Date.now() + day) });
  await refused({ ap: await pass(mallory, olga.chats.e2e.identityHex(), m.i, Date.now() + day) });
  await refused({ ap: await pass(olga, malloryId, m.i, Date.now() + day) });
  // A pass not in the one form the account signs.
  const good = await pass(mallory, malloryId, m.i, Date.now() + day);
  await refused({ ap: { ...good, b: toBase64Url(utf8Encode(utf8Decode(fromBase64Url(good.b)).replace('{', '{ '))) } });
  // All of it holding: Mallory's account, as a request, from that device.
  const took = await erin.chats.e2e.receive(await opening({}));
  assert.deepEqual(took.kind === 'message' && [took.identity, took.text, took.from, took.request], [malloryId, 'hello', m.i, true]);
  assert.deepEqual([erin.chats.e2e.record(malloryId)?.sender, erin.chats.e2e.record(malloryId)?.list?.n, erin.chats.e2e.record(malloryId)?.byDevice], ['ab'.repeat(24), 5, true]);
  // The same again is a replay; blocked, none is taken.
  await erin.chats.e2e.deleteContact(malloryId, { block: true });
  const blocked = await erin.chats.e2e.receive(await opening({ tag: 'cccccccccccc' }));
  assert.equal(blocked.kind === 'refused' && blocked.reason, 'blocked');
  assert.ok(!erin.chats.e2e.record(malloryId));
  for (const p of [erin, mallory, olga]) p.links.close();
});

test('a contact, a phone and a device on an Erevos from before endpoints: everything goes through the phone, as before', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const olga = await asOld(() => phone(2, false));
  const carol = await phone(3, false);
  const old = await asOld(() => phone(4, false));
  const account = pixel.chats.e2e.identityHex();
  const olgaId = olga.chats.e2e.identityHex();
  await asOld(() => olga.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, olga.queue.senderHex, where));
  await asOld(() => write(olga, account, 'hello'));
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(olgaId);
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && Object.keys(list.r ?? {}).length === 4 && dell.chats.e2e.contacts().length === 1;
  });

  // A contact from before says nothing of devices: the phone never gives her the list, she writes
  // to the account only, and the computer has it through the phone.
  await giveKeys(relay, where, pixel);
  assert.deepEqual([pixel.chats.e2e.record(olgaId)?.dv, pixel.chats.e2e.record(olgaId)?.listSent], [undefined, undefined]);
  const tag = await asOld(() => write(olga, account, 'from before'));
  assert.deepEqual(olga.chats.e2e.copies(), []);
  await take(pixel);
  assert.deepEqual((await take(dell)).map((m) => m.tag), [tag]);
  // Kept there as taken, as any contact's is on a linked device: one that comes again later, as
  // from a contact the computer did not know yet knows of devices, is taken once.
  assert.deepEqual(dell.chats.e2e.record(olgaId)?.took?.map((t) => t.t), [tag]);
  // What the computer answers goes through the phone, never to her directly.
  const answer = await write(dell, olgaId, 'through the phone');
  assert.deepEqual((await asOld(() => take(olga))).filter((m) => m.tag), []);
  await dell.links.settled();
  await take(pixel);
  await pixel.links.settled();
  assert.deepEqual((await asOld(() => take(olga))).filter((m) => m.tag).map((m) => [m.tag, m.from]), [[answer, '']]);

  // A phone from before: what Carol writes goes to it alone.
  const oldId = old.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: old.queue.senderHex, key: toBase64Url(old.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, oldId, 'hello');
  await asOld(async () => {
    await take(old);
    await old.chats.e2e.acceptRequest(carol.chats.e2e.identityHex());
    await write(old, carol.chats.e2e.identityHex(), 'hi');
  });
  await take(carol);
  assert.equal(carol.chats.e2e.record(oldId)?.dv, undefined);
  await write(carol, oldId, 'only to the phone');
  assert.deepEqual(carol.chats.e2e.copies(), []);
  assert.deepEqual((await asOld(() => take(old))).map((m) => m.text), ['only to the phone']);

  for (const p of [pixel, dell, olga, carol, old]) p.links.close();
});

test('two accounts each with a linked device: each device takes what the other account and its device write, and with both phones off the devices still reach each other', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2);
  const asus = await phone(3);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await linkUp(carol, asus);
  const routed = (p: Phone) => {
    const list = p.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4;
  };
  const all = async () => {
    for (const p of [pixel, dell, carol, asus]) await takeKept(relay, p);
  };
  await until(async () => {
    await all();
    return routed(pixel) && routed(carol) && dell.chats.e2e.contacts().length === 1 && asus.chats.e2e.contacts().length === 1 && !!dell.chats.e2e.own()?.list && !!asus.chats.e2e.own()?.list;
  });
  const [dells, asuss] = [dell.chats.e2e.endpoint()!, asus.chats.e2e.endpoint()!];
  const tagged = (p: Phone, tag: string) => p.chats.history.messages().filter((m) => m.tag === tag);

  // Each phone gives the other its list, and each device learns the other account's: directly, and
  // from its phone.
  await giveKeys(relay, where, pixel);
  await takeKept(relay, carol);
  assert.ok((await giveKeys(relay, where, carol)).includes(account));
  await until(async () => {
    await all();
    return [dell.chats.e2e.record(carolId)?.list?.n, asus.chats.e2e.record(account)?.list?.n].join() === [carol.chats.e2e.signedList()!.n, pixel.chats.e2e.signedList()!.n].join();
  });
  assert.equal(pixel.chats.e2e.record(carolId)?.list?.n, carol.chats.e2e.signedList()!.n);
  // The phone keeps what it told its computer of her devices in short, no more than tells it changed.
  const told = (await loadDevicesData(pixel.space, pixel.key)).devices.flatMap((d) => Object.values(d.ways ?? {}));
  assert.ok(told.length > 0 && told.every((short) => /^[0-9a-f]{16}$/.test(short)));

  // The phone writes: Carol's computer has it directly and through her phone, once.
  const fromPixel = await write(pixel, carolId, 'from the phone');
  await sendCopies(pixel.chats.e2e, relay);
  await takeKept(relay, carol);
  assert.equal((await takeKept(relay, asus)).filter((m) => m.tag === fromPixel).length, 2);
  assert.equal(tagged(asus, fromPixel).length, 1);
  // Her computer answers itself: the phone has it from that computer's endpoint, and the computer
  // here from a conversation that endpoint started with it, saying it speaks for Carol's account.
  assert.equal(asus.chats.e2e.record(account)?.dv, carol.chats.e2e.signedList()!.n);
  const fromAsus = await write(asus, account, 'from her computer');
  await sendCopies(asus.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, pixel)).filter((m) => m.tag === fromAsus).map((m) => [m.identity, m.from]), [[carolId, asuss.id]]);
  // And through the phone too, while it is on: kept once.
  assert.deepEqual((await takeKept(relay, dell)).filter((m) => m.tag === fromAsus).map((m) => [m.identity, m.from]), [[carolId, asuss.id], [carolId, '']]);
  assert.equal(tagged(dell, fromAsus).length, 1);
  await all();

  // Both phones off: the computers still reach each other, each as its account.
  pixel.links.close();
  carol.links.close();
  const off = await write(dell, carolId, 'both phones off');
  await sendCopies(dell.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, asus)).map((m) => [m.tag, m.identity, m.from]), [[off, account, dells.id]]);
  const back = await write(asus, account, 'still here');
  await sendCopies(asus.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, dell)).map((m) => [m.tag, m.identity, m.from]), [[back, carolId, asuss.id]]);
  assert.deepEqual([tagged(dell, back).length, tagged(asus, off).length], [1, 1]);

  // The account moves Carol's chat into its hidden chats, telling her first, as those say it:
  // nothing of devices. Her computer, which wrote to the account itself, lets go of all it knew of
  // the account's devices, and of its own way to it, though her phone is off.
  const bye = await pixel.chats.e2e.seal(carolId, '', pixel.queue.senderHex, { at: where, leaving: true });
  await sendMessage(relay, fromHex(bye.sender), bye.packet);
  await pixel.chats.e2e.copiesGo(bye.copies);
  assert.equal(await sendCopies(pixel.chats.e2e, relay), 4);
  await takeKept(relay, asus);
  const forgot = asus.chats.e2e.record(account)!;
  assert.deepEqual([forgot.dv, forgot.list, forgot.endpoints, forgot.direct], [undefined, undefined, undefined, undefined]);

  for (const p of [pixel, dell, carol, asus]) p.links.close();
});

test('a chat made in hidden chats writes to a contact\'s device as a space\'s chat does, so with the contact\'s phone off the device takes it and answers it itself', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, write, linkUp } = await setup();
  const carol = await phone(2);
  const asus = await phone(3);
  const carolId = carol.chats.e2e.identityHex();
  await linkUp(carol, asus);
  // Hidden chats of another space, with a queue of their own: no links, so nothing of them reaches
  // that space's devices.
  const hiddenKey = randomBytes(32);
  const ids = await createQueue(relay);
  const hidden = { chats: { e2e: await E2E.open('hidden', 4, hiddenKey), history: await History.open('hidden', 4, hiddenKey) }, queue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } };
  const hiddenId = hidden.chats.e2e.identityHex();
  const takeHidden = async () => {
    const came: Opened[] = [];
    for (let bytes; (bytes = await receiveMessage(relay, fromHex(hidden.queue.recipientHex))); ) {
      const received = await hidden.chats.e2e.receive(bytes);
      if (received.kind === 'message') came.push(received);
    }
    return came;
  };
  await hidden.chats.e2e.addContact({ senderHex: carol.queue.senderHex, key: toBase64Url(carol.chats.e2e.bundle), relayUrl: url }, hidden.queue.senderHex, where);
  await write(hidden as unknown as Phone, carolId, 'hello from hidden chats');
  await takeKept(relay, carol);
  await carol.chats.e2e.acceptRequest(hiddenId);
  // It says, as a space's chat does, that it holds none of Carol's lists: her phone gives it hers.
  assert.equal(carol.chats.e2e.record(hiddenId)?.dv, 0);
  await until(async () => {
    await takeKept(relay, carol);
    await takeKept(relay, asus);
    const list = carol.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4 && asus.chats.e2e.own()?.list?.n === list.n && asus.chats.e2e.contacts().some((c) => c.identity === hiddenId);
  });
  assert.ok((await giveKeys(relay, where, carol)).includes(hiddenId));
  await takeHidden();
  const theirs = hidden.chats.e2e.record(carolId)!;
  assert.deepEqual([theirs.list?.n, theirs.endpoints?.length], [carol.chats.e2e.signedList()!.n, 4]);
  // With her phone off, what hidden chats write reaches her computer from them directly.
  carol.links.close();
  const tag = await write(hidden as unknown as Phone, carolId, 'with her phone off');
  assert.ok((await sendCopies(hidden.chats.e2e, relay)) >= 4);
  const came = await takeKept(relay, asus);
  assert.deepEqual(came.filter((m) => m.text).map((m) => [m.tag, m.identity]), [[tag, hiddenId]]);
  // The computer answers them itself, once it knows they hold Carol's list; hidden chats take it
  // from the computer's endpoint.
  await until(async () => {
    await takeKept(relay, asus);
    return asus.chats.e2e.record(hiddenId)?.dv === carol.chats.e2e.signedList()!.n;
  });
  const answer = await write(asus, hiddenId, 'from her computer');
  await sendCopies(asus.chats.e2e, relay);
  assert.deepEqual((await takeHidden()).filter((m) => m.text).map((m) => [m.tag, m.identity, m.from]), [[answer, carolId, asus.chats.e2e.endpoint()!.id]]);
  asus.links.close();
});

test('hidden chats, the contact\'s queue full: what they write goes to the endpoints of the contact\'s account at once and is owed to the account, which takes it as the same message once tried again, and no endpoint is copied it twice', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, write, linkUp } = await setup();
  const carol = await phone(2);
  const asus = await phone(3);
  const carolId = carol.chats.e2e.identityHex();
  await linkUp(carol, asus);
  const hiddenKey = randomBytes(32);
  const ids = await createQueue(relay);
  const hidden = { chats: { e2e: await E2E.open('hidden', 4, hiddenKey), history: await History.open('hidden', 4, hiddenKey) }, queue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } };
  const hiddenId = hidden.chats.e2e.identityHex();
  const e2e = hidden.chats.e2e;
  const takeHidden = async () => {
    for (let bytes; (bytes = await receiveMessage(relay, fromHex(hidden.queue.recipientHex))); ) await e2e.receive(bytes);
  };
  await e2e.addContact({ senderHex: carol.queue.senderHex, key: toBase64Url(carol.chats.e2e.bundle), relayUrl: url }, hidden.queue.senderHex, where);
  await write(hidden as unknown as Phone, carolId, 'hello from hidden chats');
  await takeKept(relay, carol);
  await carol.chats.e2e.acceptRequest(hiddenId);
  await until(async () => {
    await takeKept(relay, carol);
    await takeKept(relay, asus);
    const list = carol.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4 && asus.chats.e2e.own()?.list?.n === list.n && asus.chats.e2e.contacts().some((c) => c.identity === hiddenId);
  });
  assert.ok((await giveKeys(relay, where, carol)).includes(hiddenId));
  await takeHidden();
  assert.equal(e2e.record(carolId)!.endpoints?.length, 4);
  await write(hidden as unknown as Phone, carolId, 'with her list');
  assert.ok((await sendCopies(e2e, relay)) >= 4);
  await takeKept(relay, carol);
  await takeKept(relay, asus);
  const tagged = (p: Phone, tag: string) => p.chats.history.messages().filter((m) => m.tag === tag);

  // Her phone off, its queue full: a text and a voice message each throw OwedError, and their
  // copies go to her computer, which keeps each once.
  carol.links.close();
  const filled = await fill(relay, carol.queue.senderHex);
  const audio = randomBytes(40_000);
  const sealText = async (tag?: string) => {
    const sealed = await e2e.seal(carolId, 'her queue full', hidden.queue.senderHex, { at: where, tag });
    return { sealed, packets: [sealed.packet], tag: sealed.tag };
  };
  const sealVoice = async (tag?: string) => {
    const sealed = await e2e.sealVoice(carolId, audio, 3000, hidden.queue.senderHex, { at: where, tag });
    return { sealed, packets: sealed.packets, tag: sealed.tag };
  };
  const owed = new Owed();
  const at = Date.now();
  const packets: number[] = [];
  for (const seal of [sealText, sealVoice]) {
    const { tag, ...first } = await seal();
    packets.push(first.packets.length);
    await assert.rejects(handOverHidden(e2e, relay, carolId, first, 'message', true), (error) => error instanceof OwedError && /queue is full/.test(error.message));
    owed.add(carolId, tag, () => seal(tag), at);
  }
  const [text, voice] = owed.tags();
  assert.ok(packets[1] > 1);
  assert.equal(await sendCopies(e2e, relay), 4 * (packets[0] + packets[1]));
  const onAsus = await takeKept(relay, asus);
  assert.deepEqual([tagged(asus, text).length, tagged(asus, voice).length, onAsus.filter((m) => m.tag === text).length], [1, 1, 1]);
  // Without `waits` (a walkie-talkie message, what says only what came), it is not owed, and copies nothing.
  const talk = await e2e.sealVoice(carolId, audio, 3000, hidden.queue.senderHex, { at: where, talk: true });
  await assert.rejects(handOverHidden(e2e, relay, carolId, { sealed: talk, packets: talk.packets }, 'message', false), (error) => !(error instanceof OwedError) && /queue is full/.test(String(error)));
  assert.equal(await sendCopies(e2e, relay), 0);
  // Nor with the relay out of reach: not sent, as hidden chats keep nothing waiting.
  const { tag: _away, ...unsent } = await sealText();
  offline = true;
  await assert.rejects(handOverHidden(e2e, relay, carolId, unsent, 'message', true), (error) => error instanceof RelayUnreachableError);
  offline = false;
  assert.equal(await sendCopies(e2e, relay), 0);

  // Tried again while still full: owed still, the first the queue stops holds back the next.
  assert.deepEqual(await owed.retry(e2e, relay, at), []);
  assert.deepEqual(await owed.retry(e2e, relay, at + 60_000), []);
  assert.deepEqual(owed.tags(), [text, voice]);
  assert.equal(await sendCopies(e2e, relay), 0);
  // Her phone empties its queue: tried again later, both go, and she keeps each once, as her
  // computer does, which is copied neither again.
  let drained = 0;
  while (await receiveMessage(relay, fromHex(carol.queue.recipientHex))) drained += 1;
  assert.equal(drained, filled);
  assert.deepEqual(await owed.retry(e2e, relay, at + 120_000), [text, voice]);
  assert.deepEqual(owed.tags(), []);
  assert.equal(await sendCopies(e2e, relay), 0);
  const onCarol = await takeKept(relay, carol);
  assert.deepEqual([tagged(carol, text).length, tagged(carol, voice).length], [1, 1]);
  assert.equal(onCarol.filter((m) => m.tag === text).length, 1);
  assert.deepEqual((await takeKept(relay, asus)).filter((m) => m.tag === text || m.tag === voice), []);
  // One deleted before it went is owed no more.
  owed.add(carolId, 'aabbccddeeff', () => sealText('aabbccddeeff'), at);
  owed.forget(carolId, 'aabbccddeeff');
  assert.deepEqual(owed.tags(), []);
  asus.links.close();
});

test('hidden chats that ring say their ring queue to a contact, and in what they copy to the endpoints of their list, but none of it reaches the phone\'s own computer, though that list names it', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, take, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const mallory = await phone(2, false);
  const malloryId = mallory.chats.e2e.identityHex();
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && list.real.length === 1 && !!dell.chats.e2e.endpoint() && dell.chats.e2e.own()?.list?.n === list.n;
  });
  const onDell = dell.chats.e2e.endpoint()!;
  // The phone's hidden chats, which ring, with a queue of their own and a ring queue there: no
  // links, so nothing of them goes to the computer through the phone.
  const hiddenKey = randomBytes(32);
  const ids = await createQueue(relay);
  const hidden = { chats: { e2e: await E2E.open('hidden', pixel.space, hiddenKey), history: await History.open('hidden', pixel.space, hiddenKey) }, queue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } };
  const hiddenId = hidden.chats.e2e.identityHex();
  const ring = toHex((await createQueue(relay)).senderId);
  await hidden.chats.e2e.addContact({ senderHex: mallory.queue.senderHex, key: toBase64Url(mallory.chats.e2e.bundle), relayUrl: url }, hidden.queue.senderHex, where);
  for (const p of hidden.chats.e2e.pending()) {
    await sendMessage(relay, fromHex(p.sender), p.first);
    await hidden.chats.e2e.firstSent(p.identity);
  }
  await take(mallory);
  await mallory.chats.e2e.acceptRequest(hiddenId);
  assert.equal(mallory.chats.e2e.record(hiddenId)?.dv, 0);
  // Mallory's list names an endpoint of hers and the phone's computer, each where it reads, and
  // she gives it to hidden chats in their conversation.
  const secret = await newAccount();
  const x = { i: toHex(await accountIdentity(secret)), b: toBase64Url(await accountBundle(secret)) };
  const xq = await createQueue(relay);
  const signed = await signList((context, message) => mallory.chats.e2e.sign(context, message), { a: malloryId, n: 10, d: [x, { i: onDell.id, b: onDell.bundle }].map(({ i, b }) => ({ i, b, f: 1 })) });
  const r = { [x.i]: { s: toHex(xq.senderId), relay: url, rk: '' }, [onDell.id]: { s: dell.queue.senderHex, relay: url, rk: '' } };
  await mallory.chats.e2e.keepList({ b: signed.b, s: signed.s, n: 10, real: [], r });
  assert.deepEqual(await giveKeys(relay, where, mallory), [hiddenId]);
  for (let bytes; (bytes = await receiveMessage(relay, fromHex(hidden.queue.recipientHex))); ) await hidden.chats.e2e.receive(bytes);
  assert.deepEqual(hidden.chats.e2e.record(malloryId)!.endpoints?.map((w) => w.id).sort(), [x.i, onDell.id].sort());

  // Hidden chats write, saying their ring queue: Mallory's phone takes it, and the copy to her
  // endpoint says it alike.
  const sealed = await hidden.chats.e2e.seal(malloryId, 'ring me', hidden.queue.senderHex, { at: where, rf: ring });
  await sendMessage(relay, fromHex(sealed.sender), sealed.packet, 'message');
  await hidden.chats.e2e.copiesGo(sealed.copies);
  assert.equal(await sendCopies(hidden.chats.e2e, relay), 4);
  await take(mallory);
  assert.equal(mallory.chats.e2e.ringOf(hiddenId)?.sender, ring);
  const first = (await receiveMessage(relay, xq.recipientId))!;
  const opened = await acceptConversation(secret, first);
  const copy = await openIn(opened.conversation, (await receiveMessage(relay, xq.recipientId))!);
  assert.deepEqual([JSON.parse(utf8Decode(opened.plaintext)).to, JSON.parse(utf8Decode(copy.plaintext)).text, JSON.parse(utf8Decode(copy.plaintext)).rf], [malloryId, 'ring me', ring]);

  // The phone's computer opens none of what came to it, as each conversation says it is for
  // Mallory's account, and keeps nothing of it to try again; the phone tells it nothing either.
  assert.deepEqual(await takeKept(relay, dell), []);
  assert.deepEqual(await take(pixel), []);
  assert.deepEqual(await take(dell), []);
  assert.equal(dell.chats.e2e.record(hiddenId), null);
  assert.equal(dell.chats.e2e.ringOf(hiddenId), null);
  const kept = await loadE2EData('space', dell.space, dell.key);
  assert.deepEqual([kept.early ?? [], kept.unverified ?? []], [[], []]);
  for (const p of [pixel, dell, mallory]) p.links.close();
});

test('a contact who deletes the account and adds it again: the account\'s device starts its ways to their devices again, so with both phones off the devices still reach each other', { skip: !coreReady || !relayReady, timeout: 150_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2);
  const asus = await phone(3);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await linkUp(carol, asus);
  const routed = (p: Phone) => {
    const list = p.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4;
  };
  const all = async () => {
    for (const p of [pixel, dell, carol, asus]) await takeKept(relay, p);
  };
  await until(async () => {
    await all();
    return routed(pixel) && routed(carol) && dell.chats.e2e.contacts().length === 1 && asus.chats.e2e.contacts().length === 1 && !!dell.chats.e2e.own()?.list && !!asus.chats.e2e.own()?.list;
  });
  const lists = async () => {
    for (let i = 0; i < 4; i++) {
      await giveKeys(relay, where, pixel);
      await giveKeys(relay, where, carol);
      await all();
    }
    await until(async () => {
      await all();
      return [dell.chats.e2e.record(carolId)?.list?.n, asus.chats.e2e.record(account)?.list?.n].join() === [carol.chats.e2e.signedList()!.n, pixel.chats.e2e.signedList()!.n].join();
    });
  };
  await lists();
  const [dells, asuss] = [dell.chats.e2e.endpoint()!, asus.chats.e2e.endpoint()!];
  const tagged = (p: Phone, tag: string) => p.chats.history.messages().filter((m) => m.tag === tag);
  // Each writes once, so every way has a conversation: her computer's to the one here was started
  // by hers, and is the one the computer here writes to it in.
  await write(pixel, carolId, 'from the phone');
  await sendCopies(pixel.chats.e2e, relay);
  await all();
  await write(asus, account, 'from her computer');
  await sendCopies(asus.chats.e2e, relay);
  await all();
  const before = await write(dell, carolId, 'from my computer');
  await sendCopies(dell.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, asus)).filter((m) => m.tag === before).map((m) => m.from), [dells.id]);
  await all();

  // Carol deletes the account, and her computer lets go of it too, and what it spoke with the
  // computer here. She adds it again, and the lists are given again.
  await carol.chats.e2e.removeContact(account);
  await carol.chats.history.clear(`contact:${account}`);
  await until(async () => {
    await all();
    return asus.chats.e2e.contacts().length === 0;
  });
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'again');
  await until(async () => {
    await all();
    return asus.chats.e2e.contacts().length === 1;
  });
  await lists();
  // Her phone writes: it starts its way to the computer here anew, which starts each of its ways to
  // her devices again with what it writes next.
  await write(carol, account, 'after adding it again');
  await sendCopies(carol.chats.e2e, relay);
  await all();
  assert.notEqual(dell.chats.e2e.record(carolId)?.endpoints?.find((w) => w.id === asuss.id)?.again, undefined);

  // Both phones off: what the computer here writes reaches hers, though hers never wrote since.
  pixel.links.close();
  carol.links.close();
  const off = await write(dell, carolId, 'both phones off, after she added it again');
  await sendCopies(dell.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, asus)).filter((m) => m.tag === off).map((m) => [m.identity, m.from]), [[account, dells.id]]);
  assert.equal(tagged(asus, off).length, 1);
  const back = await write(asus, account, 'and hers answers');
  await sendCopies(asus.chats.e2e, relay);
  assert.deepEqual((await takeKept(relay, dell)).filter((m) => m.tag === back).map((m) => [m.identity, m.from]), [[carolId, asuss.id]]);

  for (const p of [pixel, dell, carol, asus]) p.links.close();
});

// A phone's or device's links opened again, what is kept of them changed first (`change`), as a
// version from before kept them.
async function reopenWith(p: Phone, change: (data: DevicesData) => DevicesData): Promise<void> {
  p.links.close();
  await saveDevicesData(p.space, p.key, change(await loadDevicesData(p.space, p.key)));
  p.links = await Links.open(p.space, p.key, p.chats, 60 * 60_000);
  opened.push(p.links);
  await p.links.settled();
}

test('a device that says no key for contacts is listed as a place no device takes, and with an endpoint anew once it says one, and a phone put back from a backup signs a later list, naming none of the devices linked since', { skip: !coreReady || !relayReady, timeout: 150_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp, reopen } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  // A backup made before anything was linked: no list in it, and backups hold no links.
  const beforeLinking = await loadE2EData('space', pixel.space, pixel.key);
  assert.equal(beforeLinking.list, undefined);
  const entry = (list: { b: string }, id: string) => (bodyOf(list) as Body).d.find((e) => e.i === id);
  // Carol given the list as last signed, and what she keeps of the account then.
  const tell = async (p: Phone) => {
    assert.ok((await giveKeys(relay, where, p)).includes(carolId));
    await take(carol);
    return carol.chats.e2e.record(account)!;
  };
  const writesTo = async (p: Phone, id: string) => (await tell(p)).endpoints!.some((w) => w.id === id);
  const routedWith = (p: Phone, real: number) => {
    const list = p.chats.e2e.signedList();
    return !!list && list.real.length === real && Object.values(list.r ?? {}).filter((r) => r.pk).length === 4;
  };

  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    return routedWith(pixel, 1);
  });
  const dells = dell.chats.e2e.endpoint()!;
  const first = pixel.chats.e2e.signedList()!;
  assert.equal(await writesTo(pixel, dells.id), true);

  // The computer said its endpoint as the version before this one does: without the key contacts
  // seal what they send it with, so they cannot reach it. The phone lists it as it lists a place no
  // device takes: saying it takes messages, with a queue on the phone's relay that the phone
  // empties, and a key of its own, so nothing in the list tells it from those. Carol writes to it as
  // to them.
  await reopenWith(pixel, (data) => ({ ...data, devices: data.devices.map((d) => (d.endpoint ? { ...d, endpoint: { id: d.endpoint.id, bundle: d.endpoint.bundle } } : d)) }));
  const keyless = pixel.chats.e2e.signedList()!;
  const filled = keyless.r![dells.id];
  assert.deepEqual([entry(keyless, dells.id)?.f, filled.relay, filled.pk === dell.chats.e2e.endpointKey(), Object.keys(keyless.q ?? {}).length], [entry(first, dells.id)?.f, url, false, 4]);
  assert.ok((bodyOf(keyless) as Body).d.every((e) => e.f === entry(first, dells.id)?.f && keyless.r![e.i].relay === url && !!keyless.r![e.i].pk));
  assert.equal((await tell(pixel)).endpoints!.find((w) => w.id === dells.id)?.sender, filled.s);
  await sendMessage(relay, fromHex(filled.s), randomBytes(64));
  await pixel.links.drainFillers();
  assert.equal(await receiveMessage(relay, fromHex(keyless.q![dells.id])), null);
  // Updated, it says its key, with an endpoint made anew, as the one it had was listed as a place
  // no device takes: that one goes from the list and the new one comes, as when a device is linked,
  // the others staying, and Carol writes to it, starting anew.
  await reopenWith(dell, (data) => ({ ...data, primary: data.primary && { ...data.primary, endpoint: data.primary.endpoint && { id: data.primary.endpoint.id, bundle: data.primary.endpoint.bundle } } }));
  await until(async () => {
    await take(pixel);
    await take(dell);
    return pixel.chats.e2e.signedList()!.n > keyless.n && routedWith(pixel, 1);
  });
  const keyed = pixel.chats.e2e.signedList()!;
  const renewed = dell.chats.e2e.endpoint()!;
  assert.notEqual(renewed.id, dells.id);
  assert.deepEqual([entry(keyed, dells.id), entry(keyed, renewed.id)?.f, keyed.r?.[renewed.id]?.pk, keyed.real], [undefined, entry(first, dells.id)?.f, dell.chats.e2e.endpointKey(), [renewed.id]]);
  assert.ok(Object.keys(keyless.q!).filter((id) => id !== dells.id).every((id) => keyed.q?.[id] === keyless.q![id]));
  assert.equal(await writesTo(pixel, renewed.id), true);
  // Said once with its key, it is not made anew again.
  await reopenWith(dell, (data) => data);
  assert.equal(dell.chats.e2e.endpoint()!.id, renewed.id);

  // Unlinked, the list names no device, and a backup made then holds that list.
  const dellPeer = (await loadDevicesData(pixel.space, pixel.key)).devices.find((d) => d.endpoint?.id === renewed.id)!;
  await pixel.links.unlink(dellPeer.id);
  await until(async () => {
    await take(pixel);
    return pixel.chats.e2e.signedList()!.n > keyed.n && routedWith(pixel, 0);
  });
  assert.equal(await writesTo(pixel, renewed.id), false);
  const afterUnlinking = await loadE2EData('space', pixel.space, pixel.key);

  // Another computer, linked after that backup was made: named too.
  const lenovo = await phone(3);
  await linkUp(pixel, lenovo);
  await until(async () => {
    for (const p of [pixel, lenovo]) await take(p);
    return routedWith(pixel, 1);
  });
  const lenovos = lenovo.chats.e2e.endpoint()!;
  const both = pixel.chats.e2e.signedList()!;
  assert.equal(await writesTo(pixel, lenovos.id), true);

  // The phone lost, that backup is put back on another, with no links, and its list as it was
  // then, naming no device as none is linked here. One may have been signed since that names
  // others, so it signs a later one, which Carol takes: she writes to the computer linked since no more.
  for (const p of [pixel, dell, lenovo]) p.links.close();
  await markRestore();
  const put = await phone(4, true, afterUnlinking);
  await put.links.settled();
  const again = put.chats.e2e.signedList()!;
  assert.ok(again.n > both.n);
  assert.deepEqual(again.real, []);
  const told = await tell(put);
  assert.deepEqual([told.list?.n, told.endpoints!.length, told.endpoints!.some((w) => w.id === lenovos.id)], [again.n, 4, false]);
  // Signed since it was put back: opened again, it signs nothing new.
  await reopen(put);
  assert.equal(put.chats.e2e.signedList()!.n, again.n);

  // Put back from the backup made before anything was linked: no list, until Carol says she holds
  // one, as each of her messages does. Then it signs a later one, naming no device.
  put.links.close();
  const bare = await phone(5, true, beforeLinking);
  await bare.links.settled();
  assert.equal(bare.chats.e2e.signedList(), null);
  await write(carol, account, 'to the phone put back');
  for (let bytes = await receiveMessage(relay, fromHex(put.queue.recipientHex)); bytes; bytes = await receiveMessage(relay, fromHex(put.queue.recipientHex))) await bare.chats.e2e.receive(bytes);
  assert.equal(bare.chats.e2e.record(carolId)?.dv, again.n);
  await reopen(bare);
  const anew = bare.chats.e2e.signedList()!;
  assert.ok(anew.n > again.n);
  assert.deepEqual(anew.real, []);
  const last = await tell(bare);
  assert.deepEqual([last.list?.n, last.endpoints!.length, last.endpoints!.some((w) => told.endpoints!.some((t) => t.id === w.id))], [anew.n, 4, false]);

  secureStore.delete('erevos.restored');
  for (const p of [put, bare]) p.links.close();
});

test('a phone that never linked a device signs no list for what anyone says of one, a stranger\'s request or a contact, and what a contact says moves no list it signs', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp, reopen } = await setup();
  const bob = await phone(0);
  const dave = await phone(1, false);
  const bobId = bob.chats.e2e.identityHex();
  const daveId = dave.chats.e2e.identityHex();
  await dave.chats.e2e.addContact({ senderHex: bob.queue.senderHex, key: toBase64Url(bob.chats.e2e.bundle), relayUrl: url }, dave.queue.senderHex, where);
  await write(dave, bobId, 'hello');
  await take(bob);
  await bob.chats.e2e.acceptRequest(daveId);
  // Someone with Bob's contact link sends a message request saying they hold a list of his.
  const secret = await newAccount();
  const stranger = toHex(await accountIdentity(secret));
  const says = (dv: number) => utf8Encode(JSON.stringify({ from: toHex(randomBytes(24)), relay: url, relayKey: '', text: '', dv }));
  const started = await startConversation(secret, bob.chats.e2e.bundle, says(5));
  await sendMessage(relay, fromHex(bob.queue.senderHex), started.packet);
  await take(bob);
  assert.deepEqual([bob.chats.e2e.record(stranger)?.request, bob.chats.e2e.record(stranger)?.dv], [true, 5]);
  await reopen(bob);
  assert.equal(bob.chats.e2e.signedList(), null);
  // Accepted, they say they hold one from just before Bob's clock is a day on: nothing still, as no
  // backup was put back here, so none of his lists can be later than the one he keeps.
  await bob.chats.e2e.acceptRequest(stranger);
  const ahead = Date.now() + 23 * 60 * 60_000;
  await sendMessage(relay, fromHex(bob.queue.senderHex), (await sealIn(started.conversation, says(ahead))).packet);
  await take(bob);
  assert.equal(bob.chats.e2e.record(stranger)?.dv, ahead);
  await reopen(bob);
  assert.equal(bob.chats.e2e.signedList(), null);
  // He links a computer: the list he signs is of now, not of what they said.
  const dell = await phone(2);
  await linkUp(bob, dell);
  await until(async () => {
    await take(bob);
    await take(dell);
    return !!bob.chats.e2e.signedList();
  });
  const list = bob.chats.e2e.signedList()!;
  assert.ok(list.n <= Date.now() && list.n < ahead);
  for (const p of [bob, dell]) p.links.close();
});

test('a phone put back from a backup whose clock is behind the list signed since signs once more, once a contact says they hold that one, above any a contact can say', { skip: !coreReady || !relayReady, timeout: 150_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  const tell = async (p: Phone) => {
    await giveKeys(relay, where, p);
    await take(carol);
    return carol.chats.e2e.record(account)!;
  };
  const routedWith = (p: Phone, real: number) => {
    const list = p.chats.e2e.signedList();
    return !!list && list.real.length === real && Object.values(list.r ?? {}).filter((r) => r.pk).length === 4;
  };
  // A computer linked, then a backup made, then another computer linked, whose list Carol holds.
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    return routedWith(pixel, 1);
  });
  const backup = await loadE2EData('space', pixel.space, pixel.key);
  const lenovo = await phone(3);
  await linkUp(pixel, lenovo);
  await until(async () => {
    for (const p of [pixel, lenovo]) await take(p);
    return routedWith(pixel, 2);
  });
  const lenovos = lenovo.chats.e2e.endpoint()!;
  const both = pixel.chats.e2e.signedList()!;
  assert.ok((await tell(pixel)).endpoints!.some((w) => w.id === lenovos.id));

  // The phone lost, the backup is put back on one whose clock is two minutes behind: the list it
  // signs is earlier than Carol's, which she keeps, still writing to the computer linked since.
  for (const p of [pixel, dell, lenovo]) p.links.close();
  await markRestore();
  const realNow = Date.now.bind(Date);
  const skew = realNow() - both.n + 2 * 60_000;
  Date.now = () => realNow() - skew;
  try {
    const put = await phone(4, true, backup);
    await put.links.settled();
    await until(async () => {
      await take(put);
      return routedWith(put, 0);
    }, 20_000);
    const first = put.chats.e2e.signedList()!;
    assert.ok(first.n < both.n);
    let held = await tell(put);
    assert.deepEqual([held.list?.n, held.endpoints!.some((w) => w.id === lenovos.id)], [both.n, true]);
    // Carol writes to it, saying the list she holds: with the next tick it signs once more, above
    // any list a contact can say it holds, which Carol takes, writing to the computer no more.
    put.links.close();
    put.links = await Links.open(put.space, put.key, put.chats, 200);
    opened.push(put.links);
    await put.links.settled();
    await write(carol, account, 'to the phone put back');
    await take(put);
    assert.equal(put.chats.e2e.record(carolId)?.dv, both.n);
    await until(async () => {
      await put.links.settled();
      return put.chats.e2e.signedList()!.n > both.n && routedWith(put, 0);
    });
    const again = put.chats.e2e.signedList()!;
    assert.ok(again.n > put.chats.e2e.heldAtMost() && put.chats.e2e.heldAtMost() >= put.chats.e2e.newestHeld());
    held = await tell(put);
    assert.deepEqual([held.list?.n, held.endpoints!.length, held.endpoints!.some((w) => w.id === lenovos.id)], [again.n, 4, false]);
    // Carol says she holds it now: nothing more is signed.
    await write(carol, account, 'I hold it');
    await take(put);
    assert.equal(put.chats.e2e.record(carolId)?.dv, again.n);
    await sleep(600);
    await put.links.settled();
    assert.equal(put.chats.e2e.signedList()!.n, again.n);
    put.links.close();
  } finally {
    Date.now = realNow;
    secureStore.delete('erevos.restored');
  }
});

test('a device unlinked is left out of the list contacts are given at once, though a place that fills it has no queue yet, and that queue is made with a later tick', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2, false);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4;
  });
  const dells = dell.chats.e2e.endpoint()!;
  const linked = pixel.chats.e2e.signedList()!;
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await take(carol);
  // She writes, so the phone knows she holds the list that names the computer.
  await write(carol, account, 'to all of you');
  await take(pixel);
  assert.equal(pixel.chats.e2e.record(carolId)?.dv, linked.n);
  assert.ok(carol.chats.e2e.record(account)!.endpoints!.some((w) => w.id === dells.id));

  // The computer is lost and unlinked while the relay makes no queue (full, or the day's queues of a
  // lent place used up): the place it leaves is filled anew, with no queue yet. Carol is given the
  // list all the same, and writes to the computer no more; the new place she cannot reach yet.
  pixel.links.close();
  pixel.links = await Links.open(pixel.space, pixel.key, pixel.chats, 200);
  opened.push(pixel.links);
  await pixel.links.settled();
  refused.add(CREATE);
  const peer = (await loadDevicesData(pixel.space, pixel.key)).devices.find((d) => d.endpoint?.id === dells.id)!;
  await pixel.links.unlink(peer.id);
  await until(async () => {
    await pixel.links.settled();
    return pixel.chats.e2e.signedList()!.n > linked.n;
  });
  const unlinked = pixel.chats.e2e.signedList()!;
  const ids = (bodyOf(unlinked) as Body).d.map((e) => e.i);
  const bare = ids.filter((id) => !unlinked.r?.[id]);
  assert.deepEqual([unlinked.real, ids.includes(dells.id), bare.length], [[], false, 1]);
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await take(carol);
  let held = carol.chats.e2e.record(account)!;
  assert.deepEqual([held.list?.n, held.endpoints!.some((w) => w.id === dells.id), held.endpoints!.find((w) => w.id === bare[0])?.sender], [unlinked.n, false, '']);
  // The relay makes queues again: with a later tick the place has one, and Carol is told where it is.
  refused.clear();
  await until(async () => {
    await pixel.links.settled();
    return !!pixel.chats.e2e.signedList()!.r?.[bare[0]];
  }, 5000);
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await take(carol);
  held = carol.chats.e2e.record(account)!;
  assert.equal(held.endpoints!.find((w) => w.id === bare[0])?.sender, pixel.chats.e2e.signedList()!.r![bare[0]].s);
  for (const p of [pixel, dell]) p.links.close();
});

test('the places that fill the list keep their queues and keys while the relay\'s key is not known, offline, or a queue cannot be made again', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  files.clear();
  blobs.clear();
  // A relay with a key, which this process has not asked yet, as when the app starts.
  const url = await startRelay(true);
  const relay = { url };
  const where = { relay: url, relayKey: '' };
  const session = await RelaySession.open(relay);
  const said = await session.call(Uint8Array.of(KEY_ASKED));
  session.close();
  assert.equal(said.length, 33);
  const relayKey = toBase64Url(said.slice(1));
  const space = async (n: number): Promise<Phone> => {
    const key = randomBytes(32);
    const ids = await createQueue(relay);
    const queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    await saveSpaceData(n, key, { ...EMPTY_SPACE, url, ownQueue: queue });
    const chats = { e2e: await E2E.open('space', n, key), history: await History.open('space', n, key), voiceParts: new VoiceAssembler() };
    return { chats, queue, links: null as unknown as Links, space: n, key };
  };
  const takeAll = async ({ chats, queue }: Phone) => {
    for (let bytes = await receiveMessage(relay, fromHex(queue.recipientHex)); bytes; bytes = await receiveMessage(relay, fromHex(queue.recipientHex))) await chats.e2e.receive(bytes);
  };
  const open = async (p: Phone, tick = 60 * 60_000) => {
    p.links?.close();
    p.links = await Links.open(p.space, p.key, p.chats, tick);
    opened.push(p.links);
    await p.links.settled();
  };
  const pixel = await space(0);
  const carol = await space(1);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  const hello = await carol.chats.e2e.seal(account, 'hello', carol.queue.senderHex, { at: where });
  await sendMessage(relay, fromHex(hello.sender), hello.first!);
  await carol.chats.e2e.firstSent(account);
  await sendMessage(relay, fromHex(hello.sender), hello.packet);
  await takeAll(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  // The phone's list, of places that fill it only, each with a queue on its relay and that relay's
  // key, as the phone made them once it knew it; Carol holds it.
  const body = await nextList(account, [], null);
  const list = await signList((context, message) => pixel.chats.e2e.sign(context, message), body);
  const r: Record<string, { s: string; relay: string; rk: string; pk: string }> = {};
  const q: Record<string, string> = {};
  for (const { i } of body.d) {
    const ids = await createQueue(relay);
    r[i] = { s: toHex(ids.senderId), relay: url, rk: relayKey, pk: toBase64Url(randomBytes(32)) };
    q[i] = toHex(ids.recipientId);
  }
  await pixel.chats.e2e.keepList({ b: list.b, s: list.s, n: body.n, real: [], r, q });
  const before = pixel.chats.e2e.signedList()!;
  assert.ok((await giveKeys(relay, where, pixel)).includes(carolId));
  await takeAll(carol);
  assert.equal(carol.chats.e2e.record(account)!.list?.n, body.n);
  const same = () => {
    const now = pixel.chats.e2e.signedList()!;
    return [JSON.stringify(now.r), JSON.stringify(now.q), now.rAt, pixel.chats.e2e.keysDue().includes(carolId)].join(' ');
  };
  const kept = [JSON.stringify(before.r), JSON.stringify(before.q), before.rAt, false].join(' ');
  assert.equal(same(), kept);

  // The app starts and the relay does not answer for its key: the places stay as they are.
  refused.add(KEY_ASKED);
  await open(pixel);
  assert.equal(same(), kept);
  // It starts again with no network at all: the same.
  refused.clear();
  offline = true;
  await open(pixel);
  assert.equal(same(), kept);
  // Back online, the key is known, and is theirs: nothing is made anew.
  offline = false;
  await pixel.links.drainFillers();
  await pixel.links.settled();
  assert.equal(same(), kept);

  // A queue the relay lost, while it makes none: the place keeps where it was and its key, and is
  // made again with a later tick, with that key.
  const [lostId, lostQueue] = Object.entries(before.q!)[0];
  await deleteQueue(relay, fromHex(lostQueue));
  refused.add(CREATE);
  await open(pixel, 200);
  await pixel.links.drainFillers();
  await pixel.links.settled();
  const lost = pixel.chats.e2e.signedList()!;
  assert.deepEqual([JSON.stringify(lost.r), lost.rAt, lost.q?.[lostId]], [JSON.stringify(before.r), before.rAt, undefined]);
  refused.clear();
  await until(async () => {
    await pixel.links.settled();
    return !!pixel.chats.e2e.signedList()!.q?.[lostId];
  }, 5000);
  const remade = pixel.chats.e2e.signedList()!;
  assert.deepEqual([remade.r![lostId].s !== before.r![lostId].s, remade.r![lostId].pk, remade.r![lostId].rk], [true, before.r![lostId].pk, relayKey]);
  assert.ok(Object.keys(before.q!).filter((id) => id !== lostId).every((id) => remade.q![id] === before.q![id]));
  pixel.links.close();
});

test('a contact blocked on the computer is blocked on the phone, whose queues all move: the places that fill the list, the computer\'s, and a new list; the computer never rings a contact itself', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await linkUp(pixel, dell);
  await until(async () => {
    await take(pixel);
    await take(dell);
    const list = pixel.chats.e2e.signedList();
    return !!list && list.real.length === 1 && !!dell.chats.e2e.endpoint() && dell.chats.e2e.own()?.list?.n === list.n;
  });
  // Carol writes, saying her ring queue: the phone may ring her, the computer, which gets her message through it, not.
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  const ring = toHex((await createQueue(relay)).senderId);
  const sealed = await carol.chats.e2e.seal(account, 'ring me', carol.queue.senderHex, { at: where, rf: ring });
  await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
  await take(pixel);
  await take(dell);
  assert.equal(pixel.chats.e2e.ringOf(carolId)?.sender, ring);
  assert.ok(dell.chats.e2e.record(carolId));
  assert.equal(dell.chats.e2e.ringOf(carolId), null);

  // The computer blocks her: the phone blocks her too, and its queue is due to move.
  const before = pixel.chats.e2e.signedList()!;
  const fillers = Object.values(before.q ?? {});
  assert.ok(fillers.length > 0);
  await dell.chats.e2e.deleteContact(carolId, { block: true });
  assert.equal(dell.chats.e2e.moveDue(), 0);
  await take(dell);
  await take(pixel);
  assert.equal(pixel.chats.e2e.record(carolId), null);
  assert.equal(pixel.chats.e2e.isBlocked(carolId), true);
  assert.ok(pixel.chats.e2e.moveDue() > 0);

  // The phone's queue moves: the places that fill the list get new queues, the old ones still
  // emptied, a new list is signed, and the computer is asked to move its own.
  try {
    setCurrentSpace(pixel.space, pixel.key);
    const moved = (await spaceMover(pixel.chats).moveNow(relay))!.queue;
    assert.notEqual(moved.senderHex, pixel.queue.senderHex);
    await pixel.links.settled();
    const after = pixel.chats.e2e.signedList()!;
    assert.ok(after.n > before.n);
    assert.ok(Object.values(after.q ?? {}).every((q) => !fillers.includes(q)));
    assert.deepEqual(after.qWas?.map((w) => w.q).sort(), [...fillers].sort());
    assert.ok((await loadDevicesData(pixel.space, pixel.key)).moving! > Date.now());
    pixel.queue = moved;
    await take(dell);
    assert.ok(dell.chats.e2e.moveDue() > 0);

    // The computer moves its own with its next look, and the phone routes contacts there.
    setCurrentSpace(dell.space, dell.key);
    const computer = (await spaceMover(dell.chats).moveNow(relay))!.queue;
    assert.equal((await loadSpaceData(dell.space, dell.key)).ownQueue?.senderHex, computer.senderHex);
    await dell.links.settled();
    dell.queue = computer;
    await take(pixel);
    const endpoint = dell.chats.e2e.endpoint()!.id;
    assert.equal(pixel.chats.e2e.signedList()!.r?.[endpoint]?.s, computer.senderHex);
    // Within the hour of the last, the next new list waits for a later tick.
    assert.ok((await loadDevicesData(pixel.space, pixel.key)).resign! > 0);
    // The old places that fill the list are still emptied, then deleted once their grace is over.
    await pixel.links.drainFillers();
    assert.equal(pixel.chats.e2e.signedList()!.qWas?.length, fillers.length);
  } finally {
    forgetSpaceMover();
  }
  for (const p of [pixel, dell, carol]) p.links.close();
});

test('who is blocked is known on a linked computer too: their link asks to unblock there as on the phone, and once unblocked there the phone adds them', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { url, where, phone, take, write, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const carol = await phone(2);
  const account = pixel.chats.e2e.identityHex();
  const carolId = carol.chats.e2e.identityHex();
  await linkUp(pixel, dell);
  await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'hello');
  await take(pixel);
  await pixel.chats.e2e.acceptRequest(carolId);
  await take(dell);
  assert.ok(dell.chats.e2e.record(carolId));
  const link = { senderHex: carol.queue.senderHex, key: toBase64Url(carol.chats.e2e.bundle), relayUrl: url };

  // Blocked on the computer: the phone blocks her, and tells the computer so.
  await dell.chats.e2e.deleteContact(carolId, { block: true });
  await take(dell);
  await take(pixel);
  assert.equal(pixel.chats.e2e.isBlocked(carolId), true);
  await take(dell);
  assert.deepEqual(dell.chats.e2e.blocked().map((b) => b.identity), [carolId]);
  // Her link, added there, asks to unblock her first, before anything is made for it.
  await assert.rejects(dell.chats.e2e.refuseBlocked(link), BlockedContactError);
  await assert.rejects(dell.chats.e2e.addContact(link, dell.queue.senderHex, where), BlockedContactError);
  await take(pixel);
  assert.equal(pixel.chats.e2e.record(carolId), null);

  // Unblocked there, and added at once: the phone unblocks her first, so adds her as asked.
  await dell.chats.e2e.unblock(carolId);
  assert.equal(dell.chats.e2e.isBlocked(carolId), false);
  await dell.chats.e2e.addContact(link, dell.queue.senderHex, where);
  await take(pixel);
  assert.equal(pixel.chats.e2e.isBlocked(carolId), false);
  assert.ok(pixel.chats.e2e.record(carolId));
  await take(dell);
  assert.deepEqual(dell.chats.e2e.blocked(), []);
  assert.ok(dell.chats.e2e.record(carolId));

  // Blocked on the phone: the computer knows it too.
  await pixel.chats.e2e.deleteContact(carolId, { block: true });
  await take(pixel);
  await take(dell);
  assert.equal(dell.chats.e2e.record(carolId), null);
  assert.equal(dell.chats.e2e.isBlocked(carolId), true);

  // Unlinked: who the phone blocked leaves the computer with its chats.
  assert.equal(await pixel.links.unlink(pixel.links.devices()[0].id), true);
  await take(dell);
  await until(() => dell.links.role() === null);
  await dell.links.settled();
  assert.deepEqual(dell.chats.e2e.blocked(), []);
  assert.equal(pixel.chats.e2e.isBlocked(carolId), true);
  for (const p of [pixel, dell, carol]) p.links.close();
});

test('a computer linked anew is told who is blocked on the phone', { skip: !coreReady || !relayReady, timeout: 60_000 }, async () => {
  const { phone, take, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const someone = toHex(randomBytes(32));
  await pixel.chats.e2e.deleteContact(someone, { block: true });
  assert.equal(pixel.chats.e2e.isBlocked(someone), true);
  await linkUp(pixel, dell);
  await take(dell);
  assert.equal(dell.chats.e2e.isBlocked(someone), true);
  for (const p of [pixel, dell]) p.links.close();
});

test('the fast way on the same Wi-Fi: each side tells the other inside their link where it gives chunks and the key for it alone; unlinked, the key is let go', { skip: !coreReady || !relayReady, timeout: 60_000 }, async () => {
  const allowed = new Map<string, string[]>();
  const forgot: string[] = [];
  handChunks({
    serve: async (on) => (on ? { port: 40123, hosts: ['192.168.1.20', 'not an address'] } : null),
    allow: (key, ids) => void allowed.set(key, ids),
    forget: (key) => void forgot.push(key),
    take: async () => true,
  });
  try {
    const { phone, take, linkUp } = await setup();
    const pixel = await phone(0);
    const dell = await phone(1);
    await linkUp(pixel, dell);
    await take(dell);
    const id = 'ab'.repeat(16);
    assert.equal(await pixel.links.offerChunks(pixel.links.devices()[0].id, [id]), true);
    assert.equal(await pixel.links.offerChunks('cd'.repeat(32), [id]), false);
    await until(async () => (await take(dell), dell.links.chunkWays().length > 0));
    const ways = dell.links.chunkWays();
    assert.equal(ways.length, 1);
    assert.equal(ways[0].name, 'lan');
    assert.deepEqual([...allowed.values()], [[id]]);
    // Unlinked from the phone: the key goes, and the computer has no way there left.
    await pixel.links.unlink(pixel.links.devices()[0].id);
    assert.deepEqual(forgot, [...allowed.keys()]);
    await until(async () => (await take(dell), dell.links.chunkWays().length === 0));
    for (const p of [pixel, dell]) p.links.close();
  } finally {
    handChunks(null);
  }
});

test('the Collection on the linked computer once turned on: its catalogue through the space\'s log, a file deleted there deleted on the phone', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { phone, take, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  await linkUp(pixel, dell);
  await take(dell);
  const onPixel = { holder: 'space' as const, space: pixel.space, key: pixel.key };
  const onDell = { holder: 'space' as const, space: dell.space, key: dell.key };
  const item = await addToCollection(onPixel, bytesSource(new Uint8Array(3000).fill(5)), { name: 'sea.jpg', mime: 'image/jpeg', kind: 'photo' }, { thumb: new Uint8Array(200).fill(9) });
  await setCollectionOption(onPixel, 'devices', true);
  await until(async () => (await take(dell), await dell.links.collectionSettled(), (await loadCollection(onDell)).items.length === 1), 20_000);
  const there = (await loadCollection(onDell)).items[0];
  assert.deepEqual([there.id, there.file.name, there.file.key], [item.id, 'sea.jpg', item.file.key]);
  assert.equal((await loadCollection(onDell)).devices, true);
  // Deleted on the computer: deleted on the phone.
  await deleteItems(onDell, [item.id]);
  await until(async () => (await take(pixel), await pixel.links.collectionSettled(), (await loadCollection(onPixel)).items.length === 0), 20_000);
  for (const p of [pixel, dell]) p.links.close();
});

test('Chat with myself goes between the phone and a linked computer: words, reminders, photos and voice messages, both ways, and deleting', { skip: !coreReady || !relayReady, timeout: 90_000 }, async () => {
  const { phone, take, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const at = (p: Phone): NotesPlace => ({ holder: 'space', space: p.space, key: p.key });
  const ids = async (p: Phone) => (await loadNotes(at(p))).map((n) => n.id);
  const both = async () => {
    for (let i = 0; i < 4; i++) {
      await take(pixel);
      await take(dell);
    }
  };
  // Before linking: on the phone a note with a reminder, a photo and a voice message; on the computer a note.
  const now = Date.now();
  const words = await addNote(at(pixel), { id: newNoteId(), at: now - 4000, text: 'buy bread', due: now + 3_600_000 });
  const photoBytes = randomBytes(50_000);
  const photo = await addNote(at(pixel), { id: newNoteId(), at: now - 3000, text: 'the shop', file: await keepFile(bytesSource(photoBytes), { name: 'shop.jpg', mime: 'image/jpeg', kind: 'photo' }) });
  const audio = randomBytes(20_000);
  const voice = await addNote(at(pixel), { id: newNoteId(), at: now - 2000, text: '', voice: await saveClip(audio, 2500) });
  const own = await addNote(at(dell), { id: newNoteId(), at: now - 1000, text: 'from the computer' });

  // Once linked each says it takes them, and is told the other's.
  await linkUp(pixel, dell);
  await both();
  assert.deepEqual(await ids(dell), [words.id, photo.id, voice.id, own.id]);
  assert.deepEqual(await ids(pixel), [words.id, photo.id, voice.id, own.id]);
  const onDell = await loadNotes(at(dell));
  assert.equal(onDell[0].text, 'buy bread');
  assert.equal(onDell[0].due, words.due);
  assert.equal(onDell[1].file?.from, undefined);
  assert.deepEqual(await readFile(onDell[1].file!), photoBytes);
  assert.deepEqual(await loadClip(onDell[2].voice!), audio);

  // A reminder moved on the computer, then seen on the phone, and a note written on the computer.
  await changeNote(at(dell), words.id, { due: now + 7_200_000 });
  await both();
  assert.equal((await loadNotes(at(pixel)))[0].due, now + 7_200_000);
  await markTold(at(pixel), [words.id]);
  const later = await addNote(at(dell), { id: newNoteId(), at: Date.now(), text: 'later' });
  await both();
  assert.equal((await loadNotes(at(dell)))[0].told, true);
  assert.deepEqual(await ids(pixel), [words.id, photo.id, voice.id, own.id, later.id]);

  // Deleted on the phone: gone on the computer, with its sound; and the other way.
  await removeNote(at(pixel), voice.id);
  await removeNote(at(dell), own.id);
  await both();
  assert.deepEqual(await ids(dell), [words.id, photo.id, later.id]);
  assert.deepEqual(await ids(pixel), [words.id, photo.id, later.id]);
  for (const p of [pixel, dell]) p.links.close();
});

test('Chat with myself between two linked computers with the phone off: each tells the other directly, photos stay on the relay for both, and the phone takes them later', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  const { phone, take, linkUp } = await setup();
  const pixel = await phone(0);
  const dell = await phone(1);
  const lenovo = await phone(2);
  const at = (p: Phone): NotesPlace => ({ holder: 'space', space: p.space, key: p.key });
  await linkUp(pixel, dell);
  await linkUp(pixel, lenovo);
  const siblingsOf = async (p: Phone) => (await loadDevicesData(p.space, p.key)).siblings;
  await until(async () => {
    for (const p of [pixel, dell, lenovo]) await take(p);
    const [a, b] = [await siblingsOf(dell), await siblingsOf(lenovo)];
    return !!a?.list[0]?.sealTo && !!b?.list[0]?.sealTo;
  });
  // The phone off: a note with a photo written on one computer reaches the other directly.
  const bytes = randomBytes(40_000);
  const note = await addNote(at(dell), { id: newNoteId(), at: Date.now(), text: 'plan', file: await keepFile(bytesSource(bytes), { name: 'plan.jpg', mime: 'image/jpeg', kind: 'photo' }) });
  await until(async () => {
    await take(dell);
    await take(lenovo);
    const there = (await loadNotes(at(lenovo))).find((n) => n.id === note.id);
    return !!there?.file && !there.file.from;
  }, 20_000);
  assert.deepEqual(await readFile((await loadNotes(at(lenovo)))[0].file!), bytes);
  // The phone, on again, takes it too: the photo was left on the relay for it.
  await until(async () => {
    for (const p of [pixel, dell, lenovo]) await take(p);
    const there = (await loadNotes(at(pixel))).find((n) => n.id === note.id);
    return !!there?.file && !there.file.from;
  }, 20_000);
  assert.deepEqual(await readFile((await loadNotes(at(pixel)))[0].file!), bytes);
  // Deleted on the other computer: gone everywhere.
  await removeNote(at(lenovo), note.id);
  await until(async () => {
    for (const p of [pixel, dell, lenovo]) await take(p);
    return (await loadNotes(at(pixel))).length === 0 && (await loadNotes(at(dell))).length === 0;
  }, 20_000);
  for (const p of [pixel, dell, lenovo]) p.links.close();
});

test('a hidden place links on its own: its own link and list, messages both ways, its contacts writing to the device\'s place directly, its own accounts, unlinking, and nothing of it in the space or on the space\'s devices', { skip: !coreReady || !relayReady, timeout: 150_000 }, async () => {
  const { relay, url, where, phone, take, write, linkUp } = await setup();
  // The phone and the computer, their spaces linked as spaces are.
  const pixel = await phone(0);
  const dell = await phone(1);
  await linkUp(pixel, dell);
  // Hidden chats on each, in pockets of their own, each with its own relay queue and links.
  const place = async (space: number, pocket: number): Promise<Phone> => {
    const key = randomBytes(32);
    const ids = await createQueue(relay);
    const own = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    await saveHiddenData(space, pocket, key, { ...EMPTY_SPACE, url, ownQueue: own });
    const chats = { e2e: await E2E.open(hiddenHolder(pocket), space, key), history: await History.open(hiddenHolder(pocket), space, key), voiceParts: new VoiceAssembler() };
    const links = await Links.open(space, key, chats, 60 * 60_000, pocket);
    opened.push(links);
    return { chats, queue: own, links, space, key };
  };
  const hiddenPixel = await place(0, 2);
  const hiddenDell = await place(1, 0);
  // A code shown in the computer's hidden chats, read by another phone's space, as its own camera
  // may hand it there: the computer takes nothing of a space, and its code goes.
  const stray = await phone(4);
  await stray.links.prepare(await hiddenDell.links.makeOffer('DELL'));
  await stray.links.link({ since: 0, files: false }, 'Stray');
  await take(hiddenDell);
  const refused = await loadDevicesData(1, hiddenDell.key, hiddenHolder(0));
  assert.deepEqual([refused.offer, refused.answer, refused.primary], [null, null, null]);
  const placeAccount = hiddenPixel.chats.e2e.identityHex();
  // Carol, a contact of the phone's hidden chats only.
  const carol = await phone(3);
  const carolId = carol.chats.e2e.identityHex();
  await carol.chats.e2e.addContact({ senderHex: hiddenPixel.queue.senderHex, key: toBase64Url(hiddenPixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, placeAccount, 'before the hidden link');
  await take(hiddenPixel);
  await hiddenPixel.chats.e2e.acceptRequest(carolId);
  const sized = () => files.get(DEVICES_FILE)?.length ?? 0;
  const size = sized();
  assert.ok(size > 0);

  // Linked from inside the hidden chats on both: codes, then the place's history.
  await linkUp(hiddenPixel, hiddenDell, { since: 0, files: true });
  assert.deepEqual([hiddenPixel.links.role(), hiddenDell.links.role()], ['primary', 'linked']);
  await until(async () => {
    await take(hiddenDell);
    return hiddenDell.chats.history.messages().some((m) => m.text === 'before the hidden link');
  });
  assert.deepEqual(
    hiddenDell.chats.e2e.contacts().map((c) => c.identity),
    [carolId],
  );
  assert.ok(hiddenDell.links.accountLink()?.includes(hiddenPixel.queue.senderHex));
  // The spaces see nothing of it: their links name only each other, their chats have no Carol,
  // the file of the links is the size it was, and the space's key opens no place's value.
  assert.deepEqual([pixel.links.role(), dell.links.role()], ['primary', 'linked']);
  assert.deepEqual(
    pixel.links.devices().map((d) => d.name),
    ['DELL'],
  );
  for (const p of [pixel, dell]) assert.equal(p.chats.e2e.record(carolId), null);
  assert.equal(sized(), size);
  assert.equal((await loadDevicesData(1, dell.key, hiddenHolder(0))).primary, null);
  assert.ok((await loadDevicesData(1, hiddenDell.key, hiddenHolder(0))).primary);
  assert.notEqual((await loadDevicesData(1, dell.key)).primary?.id, (await loadDevicesData(1, hiddenDell.key, hiddenHolder(0))).primary?.id);

  // Carol writes: the phone's hidden chats pass it on to the computer's, never to its space.
  await write(carol, placeAccount, 'hello hidden both');
  await take(hiddenPixel);
  const [came] = await take(hiddenDell);
  assert.deepEqual([came.identity, came.text], [carolId, 'hello hidden both']);
  assert.deepEqual(await take(dell), []);
  // The computer's hidden chats write: the phone's seal it for Carol, as the place's account.
  const fromDell = await write(hiddenDell, carolId, 'from the hidden computer');
  await take(hiddenPixel);
  const [toCarol] = await take(carol);
  assert.deepEqual([toCarol.identity, toCarol.text, toCarol.tag], [placeAccount, 'from the hidden computer', fromDell]);
  assert.equal(hiddenPixel.chats.history.messages().find((m) => m.tag === fromDell)?.mine, true);

  // The place's own account signs its own list, naming the computer's place: Carol is given it,
  // and with the phone's hidden chats closed she reaches the computer's directly.
  await until(async () => {
    await take(hiddenPixel);
    await take(hiddenDell);
    const list = hiddenPixel.chats.e2e.signedList();
    return !!list && list.real.length === 1 && Object.keys(list.r ?? {}).length === 4 && hiddenDell.chats.e2e.own()?.list?.n === list.n;
  });
  const onHiddenDell = hiddenDell.chats.e2e.endpoint()!;
  const placeList = (bodyOf(hiddenPixel.chats.e2e.signedList()!) as Body).d.map((e) => e.i);
  assert.ok(placeList.includes(onHiddenDell.id));
  assert.ok(!placeList.includes(dell.chats.e2e.endpoint()?.id ?? ''));
  const spaceList = pixel.chats.e2e.signedList();
  assert.ok(!spaceList || !(bodyOf(spaceList) as Body).d.some((e) => e.i === onHiddenDell.id));
  assert.ok((await giveKeys(relay, where, hiddenPixel)).includes(carolId));
  await take(carol);
  assert.ok(carol.chats.e2e.record(placeAccount)!.endpoints!.some((w) => w.id === onHiddenDell.id));
  hiddenPixel.links.close();
  const direct = await write(carol, placeAccount, 'with the hidden phone closed');
  await sendCopies(carol.chats.e2e, relay);
  const atDell = await takeKept(relay, hiddenDell);
  assert.deepEqual(atDell.filter((m) => m.tag === direct).map((m) => [m.identity, m.text]), [[carolId, 'with the hidden phone closed']]);
  assert.equal(hiddenDell.chats.history.messages().filter((m) => m.tag === direct).length, 1);
  assert.deepEqual(await take(dell), []);
  assert.equal(dell.chats.e2e.record(carolId), null);
  hiddenPixel.links = await Links.open(0, hiddenPixel.key, hiddenPixel.chats, 60 * 60_000, 2);
  opened.push(hiddenPixel.links);
  await take(hiddenPixel);

  // The place's own Matrix, XMPP and Nostr accounts go to the computer's place, said by its pocket;
  // the space's are its own.
  const given: GivenAccounts = { xmpp: { jid: 'hidden@example.org', password: 'two words' } };
  const took: { space: number; pocket: number | null; given: GivenAccounts }[] = [];
  const gone: { space: number; pocket: number | null; brought: Brought }[] = [];
  handAccounts({
    give: async (space, _key, pocket) => (space === 0 && pocket === 2 ? given : {}),
    who: async () => ({}),
    take: async (space, _key, said, pocket) => {
      took.push({ space, pocket, given: said });
      return { left: {}, brought: { xmpp: said.xmpp!.jid }, problems: [] };
    },
    letGo: async (space, _key, brought, pocket) => {
      gone.push({ space, pocket, brought });
    },
  });
  try {
    const [hiddenDellId] = hiddenPixel.links.devices().map((d) => d.id);
    assert.deepEqual(await pixel.links.giveAccounts(pixel.links.devices()[0].id), []);
    assert.deepEqual(await hiddenPixel.links.giveAccounts(hiddenDellId), ['xmpp']);
    await until(async () => {
      await take(hiddenDell);
      return took.length > 0;
    });
    await take(dell);
    assert.deepEqual(took, [{ space: 1, pocket: 0, given }]);
    assert.deepEqual(hiddenDell.links.accountsHere(), { left: {}, brought: { xmpp: 'hidden@example.org' }, problems: [] });
    assert.equal(dell.links.accountsHere(), null);

    // Unlinked from the phone's hidden chats: the computer's let go of their chats and the accounts
    // brought; the spaces stay linked.
    assert.ok(await hiddenPixel.links.unlink(hiddenDellId));
    await take(hiddenDell);
    await hiddenDell.links.settled();
    assert.equal(hiddenDell.links.role(), null);
    assert.deepEqual(hiddenDell.chats.e2e.contacts(), []);
    assert.deepEqual(hiddenDell.chats.history.messages(), []);
    assert.deepEqual(gone, [{ space: 1, pocket: 0, brought: { xmpp: 'hidden@example.org' } }]);
    assert.equal(hiddenPixel.links.role(), null);
    assert.deepEqual([pixel.links.role(), dell.links.role()], ['primary', 'linked']);
    assert.equal(sized(), size);
  } finally {
    handAccounts(null);
  }
  for (const p of [pixel, dell, carol, hiddenPixel, hiddenDell]) p.links.close();
});
