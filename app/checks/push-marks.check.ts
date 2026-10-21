// What each send tells the relay it carries (lib/relay.ts, Mark), so a closed web app's notice can
// say how many messages came (pwa/sw.js): through a real relay with a key for Web Push and the
// real core, by the app's own ways of sending (lib/space-chats.ts sendSealed, markOf and sentMark,
// which the chat screen uses too, the groups, what waits, what is sent for later, and linked
// devices). A WebSocket in front of the relay sees each request go and counts as the relay does
// (crates/erevos-relay/src/server.rs): one for each send that says it is a message, none for one
// that says it is quiet, and, for one that says nothing, a count it cannot be sure of. While
// `unreachable`, it drops the sends, as a relay that cannot be reached, so what is tried again can
// be seen to keep its mark; `dropping` drops only those it picks. The relay's own checks count
// from the marks, and from one held for later when it goes; the screens are not run here. No push
// address is given, so nothing is sent to a push service. Skipped, with a note, when the core or
// the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, before, test } from 'node:test';

import { bytesSource, sendFile } from '../lib/attachments';
import type { CallSignal } from '../lib/call-signal';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { Links } from '../lib/devices';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { Groups, type GroupTransport } from '../lib/groups';
import { carryTo, createQueue, fromHex, receiveMessage, relayKey, sendMessage, toHex, type Mark, type Relay } from '../lib/relay';
import { carriedFor, markOf, ringOffer, sendSealed, sentMark, type SpaceChats } from '../lib/space-chats';
import { spaceGroupTransport } from '../lib/space-groups';
import { VoiceAssembler } from '../lib/voice';
import { holdLater, sendWaiting, type SendPlace } from '../lib/waiting';
import { loadDevicesData, saveDevicesData } from '../lock/devices-data';
import { EMPTY_GROUPS, loadGroupData, saveGroupData, type About, type GroupData } from '../lock/group-data';
import { History, WAITING } from '../lock/history';
import { setCurrentSpace } from '../lock/keys';
import { EMPTY_SPACE, saveSpaceData, type Queue } from '../lock/space-data';
import { saveClip } from '../lock/voice-clips';
import { blobs, files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the checks of what sends say they carry: build the core first with node checks/build-core.mjs');
}
relayNote('the checks of what sends say they carry');
const ready = coreReady && relayReady;

// ---- The WebSocket in front of the relay ----

const SEND = 2;
const FORWARD = 6;
const SEALED_SEND = 7;
const LATER = 16;

// A send as the relay reads it: the queue it is for (by its sender id, hex; `sealed` when the
// relay alone can tell), what it says it carries (`none` for nothing), and whether it is held for later.
type Seen = { to: string; mark: Mark | 'none'; later: boolean };
const seen: Seen[] = [];
let unreachable = false;
let dropping: ((sent: Seen) => boolean) | null = null;

function read(bytes: Uint8Array): Seen | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // After the request, its mark, if any: a byte the relay does not know is none.
  const markAt = (end: number): Mark | 'none' => (bytes[end] === 1 ? 'message' : bytes[end] === 2 ? 'quiet' : bytes[end] === 3 ? 'ring' : 'none');
  switch (bytes[0]) {
    case SEND:
      return { to: toHex(bytes.subarray(1, 25)), mark: markAt(29 + view.getUint32(25)), later: false };
    case LATER: {
      const end = 29 + view.getUint32(25);
      const held = bytes.subarray(29, end);
      return { to: held[0] === SEND ? toHex(held.subarray(1, 25)) : 'sealed', mark: markAt(end), later: true };
    }
    case FORWARD: {
      const address = view.getUint16(1);
      return { to: 'sealed', mark: markAt(3 + address + 4 + view.getUint32(3 + address)), later: false };
    }
    case SEALED_SEND:
      return { to: 'sealed', mark: markAt(5 + view.getUint32(1)), later: false };
    default:
      return null;
  }
}

const Socket = globalThis.WebSocket;
if (typeof Socket === 'function') {
  globalThis.WebSocket = class extends Socket {
    send(data: Parameters<WebSocket['send']>[0]) {
      const sent = data instanceof Uint8Array ? read(data) : null;
      if (sent && (unreachable || dropping?.(sent))) {
        this.close();
        return;
      }
      if (sent) seen.push(sent);
      super.send(data);
    }
  } as typeof WebSocket;
}

/** What the sends to the queue `to` (its sender id) said they carry, in turn, from the `since`th send seen on. */
function marks(to: string, since = 0): (Mark | 'none')[] {
  return seen.slice(since).filter((s) => s.to === to).map((s) => s.mark);
}

/** What the relay counts for the queue `to`: one for each message, and whether a send said nothing. */
function counted(to: string, since = 0): { messages: number; unsure: boolean } {
  const all = marks(to, since);
  return { messages: all.filter((m) => m === 'message').length, unsure: all.includes('none') };
}

// ---- Phones on the relay ----

let url = '';
let relay: Relay = { url };
let where = { relay: url, relayKey: '' };

before(async () => {
  if (!ready) return;
  url = await startRelay(false, '', true);
  relay = { url };
  where = { relay: url, relayKey: '' };
});

const opened: Links[] = [];
afterEach(() => {
  unreachable = false;
  dropping = null;
  seen.length = 0;
  for (const links of opened.splice(0)) links.close();
  setCurrentSpace(null);
});

type Phone = { chats: SpaceChats; queue: Queue; space: number; key: Uint8Array };
type Opened = Extract<Received, { kind: 'message' }>;

let spaces = 0;

// A space of its own with its queue on the relay, its chats, and with `linking` its links to other devices.
async function phone(linking = false): Promise<Phone & { links: Links | null }> {
  const space = spaces++;
  const key = randomBytes(32);
  const ids = await createQueue(relay);
  const queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  await saveSpaceData(space, key, { ...EMPTY_SPACE, url, ownQueue: queue });
  const chats = { e2e: await E2E.open('space', space, key), history: await History.open('space', space, key), voiceParts: new VoiceAssembler() };
  const links = linking ? await Links.open(space, key, chats, 60 * 60_000) : null;
  if (links) opened.push(links);
  return { chats, queue, space, key, links };
}

// What comes to a phone's queue, opened, as the chat or the receiver does in short: voice messages
// put together, the others kept as they come, and read marks kept.
async function take(p: Phone & { links?: Links | null }): Promise<Opened[]> {
  const came: Opened[] = [];
  for (;;) {
    const bytes = await receiveMessage(relay, fromHex(p.queue.recipientHex));
    if (!bytes) break;
    const received = await p.chats.e2e.receive(bytes);
    if (received.kind !== 'message') continue;
    came.push(received);
    const message = { peer: `contact:${received.identity}`, text: received.text, mine: false, at: Date.now(), tag: received.tag };
    if (received.text) await p.chats.history.add(message);
    const voice = received.voice && p.chats.voiceParts.add(message.peer, received.voice);
    if (voice) await p.chats.history.add({ ...message, voice: await saveClip(voice.audio, voice.ms) });
    if (received.read.length > 0) await p.chats.history.mark(message.peer, true, 2, Date.now(), received.read);
  }
  await p.links?.settled();
  return came;
}

// Seals words, or word with `extra`, for a contact and hands it to the relay as the chat does,
// and keeps the words.
async function write(p: Phone, identity: string, text: string, extra: Parameters<E2E['seal']>[3] = {}) {
  const sealed = await p.chats.e2e.seal(identity, text, p.queue.senderHex, { at: where, ...extra });
  await sendSealed(relay, sealed, [sealed.packet], sentMark(p.chats.e2e, markOf(text, extra.call)), () => p.chats.e2e.firstSent(identity));
  if (text) await p.chats.history.add({ peer: `contact:${identity}`, text, mine: true, at: Date.now(), tag: sealed.tag });
  return sealed;
}

// Alice adds Bob's link and writes once; Bob takes it and accepts. Says each one's id for the other.
async function meet(alice: Phone, bob: Phone) {
  const { identity: bobId } = await alice.chats.e2e.addContact({ senderHex: bob.queue.senderHex, key: toBase64Url(bob.chats.e2e.bundle), relayUrl: url }, alice.queue.senderHex, where);
  await write(alice, bobId, 'hi');
  const [came] = await take(bob);
  await bob.chats.e2e.acceptRequest(came.identity);
  return { bobId, aliceId: came.identity };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(what: () => boolean | Promise<boolean>, ms = 8000): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (await what()) return;
  throw new Error('waited too long');
}

const call = (kind: 'offer' | 'answer'): CallSignal =>
  kind === 'offer' ? { id: '0123456789abcdef', kind, video: false, sdp: 'v=0\r\noffer', at: Date.now() } : { id: '0123456789abcdef', kind, sdp: 'v=0\r\nanswer' };

// ---- Chats ----

test('a text and the first packet of its conversation count once; what is said of it counts none; a call rings, as a call', { skip: !ready }, async () => {
  const alice = await phone();
  const bob = await phone();
  const { identity: bobId } = await alice.chats.e2e.addContact({ senderHex: bob.queue.senderHex, key: toBase64Url(bob.chats.e2e.bundle), relayUrl: url }, alice.queue.senderHex, where);
  const hi = await write(alice, bobId, 'hi');
  assert.ok(hi.first);
  assert.deepEqual(marks(bob.queue.senderHex), ['quiet', 'message']);
  assert.deepEqual(counted(bob.queue.senderHex), { messages: 1, unsure: false });
  // The first packet opens as the start of the conversation, with no words.
  const came = await take(bob);
  assert.deepEqual(came.map((m) => m.text), ['', 'hi']);
  const aliceId = came[1].identity;
  await bob.chats.e2e.acceptRequest(aliceId);

  // That it came, that it was read, typing, a reaction, a pin, deleting, new keys, a call's answer: none is a message.
  const words: Parameters<E2E['seal']>[3][] = [
    { got: [hi.tag] },
    { read: [hi.tag] },
    { more: { typing: true } },
    { react: { tag: hi.tag, emoji: '👍' } },
    { more: { pin: { tag: hi.tag, on: true } } },
    { erase: { tag: hi.tag } },
    { keys: true },
    { call: call('answer') },
  ];
  for (const extra of words) await write(bob, aliceId, '', extra);
  assert.deepEqual(counted(alice.queue.senderHex), { messages: 0, unsure: false });
  assert.equal((await take(alice)).length, words.length);

  // Bob answers in words: one more, on Alice's queue.
  await write(bob, aliceId, 'hello');
  assert.deepEqual(counted(alice.queue.senderHex), { messages: 1, unsure: false });
  // A call's offer rings: it pushes, as a call, and no message, and the count stays sure.
  await write(bob, aliceId, '', { call: call('offer') });
  assert.deepEqual(counted(alice.queue.senderHex), { messages: 1, unsure: false });
  assert.deepEqual(marks(alice.queue.senderHex).slice(-1), ['ring']);
  assert.deepEqual((await take(alice)).map((m) => [m.text, m.call?.kind ?? '']), [['hello', ''], ['', 'offer']]);
});

test('an offer to a contact who advertised a ring queue sends one ring there, of the offer\'s size, and nothing else ever goes there, from a space chat or a hidden one', { skip: !ready }, async () => {
  // Alice is a hidden place that rings; Bob is her contact. Which chat Bob calls from (a space one
  // or a hidden one) changes nothing of this: the caller's ringOffer, shared by both paths
  // (app/chat.tsx and lib/space-calls.ts), is what sends the ring.
  const alice = await phone();
  const bob = await phone();
  const { bobId, aliceId } = await meet(alice, bob);
  // Before Alice says she has a ring queue, calling her sends no ring anywhere.
  assert.equal(bob.chats.e2e.ringOf(aliceId), null);
  seen.length = 0;
  await ringOffer(bob.chats.e2e, relay, aliceId, call('offer'), 1024);
  assert.deepEqual(seen, []);

  // Alice's ring queue, on her own message relay, said to Bob through `rf`.
  const ids = await createQueue(relay);
  const ringSender = toHex(ids.senderId);
  await write(alice, bobId, 'ring me', { rf: ringSender });
  await take(bob);
  assert.equal(bob.chats.e2e.ringOf(aliceId)?.sender, ringSender);

  // Bob calls Alice: the offer rings her message queue, and ringOffer sends one ring of the same
  // size to her ring queue. Nothing to the ring queue is opened; it is only drained.
  seen.length = 0;
  const offer = await write(bob, aliceId, '', { call: call('offer') });
  await ringOffer(bob.chats.e2e, relay, aliceId, call('offer'), offer.packet.length);
  assert.deepEqual(marks(alice.queue.senderHex), ['ring']);
  assert.deepEqual(marks(ringSender), ['ring']);
  const rung = await receiveMessage(relay, ids.recipientId);
  assert.equal(rung?.length, offer.packet.length);
  assert.equal(await receiveMessage(relay, ids.recipientId), null);

  // A plain message, an answer, and anything that is not an offer send nothing to the ring queue;
  // only a call's offer does.
  seen.length = 0;
  await write(bob, aliceId, 'hello');
  await ringOffer(bob.chats.e2e, relay, aliceId, undefined, offer.packet.length);
  await ringOffer(bob.chats.e2e, relay, aliceId, call('answer'), offer.packet.length);
  await write(bob, aliceId, '', { call: call('answer') });
  assert.deepEqual(marks(ringSender), []);
});

test('a voice message in parts counts once, on its last part', { skip: !ready }, async () => {
  const alice = await phone();
  const bob = await phone();
  const { bobId } = await meet(alice, bob);
  seen.length = 0;
  const audio = randomBytes(35_000);
  const voice = await alice.chats.e2e.sealVoice(bobId, audio, 4000, alice.queue.senderHex, { at: where });
  assert.equal(voice.packets.length, 4);
  await sendSealed(relay, voice, voice.packets, 'message', () => alice.chats.e2e.firstSent(bobId));
  assert.deepEqual(marks(bob.queue.senderHex), ['quiet', 'quiet', 'quiet', 'message']);
  assert.deepEqual(counted(bob.queue.senderHex), { messages: 1, unsure: false });
  await take(bob);
  assert.deepEqual(bob.chats.history.messages().filter((m) => m.voice).length, 1);
});

test('a photo or a file offered counts once', { skip: !ready }, async () => {
  files.clear();
  blobs.clear();
  const alice = await phone();
  const bob = await phone();
  const { bobId } = await meet(alice, bob);
  seen.length = 0;
  for (const kind of ['photo', 'file'] as const) {
    const { offer } = await sendFile(relay, bytesSource(randomBytes(2000)), { name: kind === 'photo' ? 'photo.jpg' : 'notes.pdf', mime: kind === 'photo' ? 'image/jpeg' : 'application/pdf', kind });
    const sealed = await alice.chats.e2e.sealFile(bobId, offer, alice.queue.senderHex, { at: where });
    await sendSealed(relay, sealed, [sealed.packet], 'message', () => alice.chats.e2e.firstSent(bobId));
  }
  assert.deepEqual(counted(bob.queue.senderHex), { messages: 2, unsure: false });
  assert.deepEqual((await take(bob)).map((m) => m.file?.kind), ['photo', 'file']);
});

// ---- What waits, and what is sent for later ----

test('a text that waited counts once when it goes, with the first packet of its conversation, however many tries it took', { skip: !ready }, async () => {
  const alice = await phone();
  const bob = await phone();
  const { identity: bobId } = await alice.chats.e2e.addContact({ senderHex: bob.queue.senderHex, key: toBase64Url(bob.chats.e2e.bundle), relayUrl: url }, alice.queue.senderHex, where);
  const peer = `contact:${bobId}`;
  await alice.chats.history.add({ peer, text: 'waited', mine: true, at: Date.now(), tag: 'aaaaaaaaaaaa', mark: WAITING });
  const place: SendPlace = { sends: relay, own: relay, senderHex: alice.queue.senderHex, here: where, ownKey: '', relayUp: true };
  // The relay cannot be reached: it is tried, and waits.
  unreachable = true;
  assert.deepEqual(await sendWaiting(alice.chats, place), []);
  assert.equal(alice.chats.history.waiting().length, 1);
  unreachable = false;
  // Tried again, once its wait is over: it goes, and says so once.
  const went = await sendWaiting(alice.chats, place, Date.now() + 60_000);
  assert.deepEqual(went.map((w) => w.tag), ['aaaaaaaaaaaa']);
  assert.deepEqual(marks(bob.queue.senderHex), ['quiet', 'message']);
  assert.deepEqual(counted(bob.queue.senderHex), { messages: 1, unsure: false });
  assert.deepEqual((await take(bob)).map((m) => m.text), ['', 'waited']);
});

test('a message sent for later says it is one, for when the relay sends it', { skip: !ready, timeout: 30_000 }, async () => {
  files.clear();
  blobs.clear();
  const alice = await phone();
  const bob = await phone();
  const { bobId } = await meet(alice, bob);
  seen.length = 0;
  const place: SendPlace = { sends: relay, own: relay, senderHex: alice.queue.senderHex, here: where, ownKey: '', relayUp: true };
  const peer = `contact:${bobId}`;
  const at = Date.now() + 1500;
  await holdLater(alice.chats.e2e, place, bobId, { peer, text: 'later', mine: true, at, tag: 'bbbbbbbbbbbb', mark: WAITING });
  const voice = await saveClip(randomBytes(25_000), 3000);
  await holdLater(alice.chats.e2e, place, bobId, { peer, text: '', mine: true, at, tag: 'cccccccccccc', mark: WAITING, voice });
  // All held, nothing sent now: the text, then the voice message's three parts, its last saying it is a message.
  assert.ok(seen.every((s) => s.later));
  assert.deepEqual(marks(bob.queue.senderHex), ['message', 'quiet', 'quiet', 'message']);
  assert.deepEqual(counted(bob.queue.senderHex), { messages: 2, unsure: false });
  assert.equal(await receiveMessage(relay, fromHex(bob.queue.recipientHex)), null);
  await until(async () => {
    await take(bob);
    return bob.chats.history.messages().some((m) => m.voice);
  });
  assert.ok(bob.chats.history.messages().some((m) => m.text === 'later'));
});

// ---- Groups ----

type Member = { identity: string; queue: Queue; groups: Groups; transport: GroupTransport; data: GroupData };

test('a group message to three members counts once on each; what is done to it none; a call that starts rings, as a call; one that waited keeps its mark', { skip: !ready, timeout: 60_000 }, async () => {
  files.clear();
  const signals: { from: string; to: string; signal: Parameters<GroupTransport['signal']>[1] }[] = [];
  const members = new Map<string, Member>();
  // Each phone with its queue on the relay; signals go inside chats, here in memory.
  const member = async (): Promise<Member> => {
    const identity = toHex(randomBytes(32));
    const ids = await createQueue(relay);
    const queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    const me = async () => ({ id: identity, sender: queue.senderHex, relay: url, relayKey: '' });
    const transport: GroupTransport = {
      post: (to, packet, mark) => sendMessage({ url: to.relay }, fromHex(to.sender), packet, mark),
      async signal(to, signal) {
        signals.push({ from: identity, to, signal });
      },
    };
    const it: Member = { identity, queue, groups: new Groups(EMPTY_GROUPS, async (data) => void (it.data = data), me), transport, data: EMPTY_GROUPS };
    members.set(identity, it);
    return it;
  };
  const settle = async () => {
    for (let round = 0; round < 20; round++) {
      let moved = false;
      while (signals.length > 0) {
        const { from, to, signal } = signals.shift()!;
        const target = members.get(to)!;
        await target.groups.signal(from, signal, false, target.transport);
        moved = true;
      }
      for (const m of members.values()) {
        for (let bytes = await receiveMessage(relay, fromHex(m.queue.recipientHex)); bytes; bytes = await receiveMessage(relay, fromHex(m.queue.recipientHex))) {
          await m.groups.receive(bytes, m.transport);
          moved = true;
        }
      }
      if (!moved) return;
    }
  };
  const alice = await member();
  const others = [await member(), await member(), await member()];
  const id = await alice.groups.create('Friends', others.map((m) => m.identity), alice.transport);
  await settle();
  assert.equal((await alice.groups.members(id)).length, 4);
  // Making the group and joining it is no message.
  for (const m of members.values()) assert.deepEqual(counted(m.queue.senderHex), { messages: 0, unsure: false });

  seen.length = 0;
  await alice.groups.send(id, 'hello all', alice.transport);
  for (const m of others) assert.deepEqual(counted(m.queue.senderHex), { messages: 1, unsure: false });
  await settle();
  const tag = alice.groups.messages(id).find((m) => m.text === 'hello all')!.tag;
  for (const m of others) assert.ok(m.groups.messages(id).some((x) => x.text === 'hello all'));
  // A reaction and a new name are no message; a call that starts rings.
  await alice.groups.mark(id, { t: 'react', tag, emoji: '👍' }, alice.transport);
  await alice.groups.rename(id, 'Old friends', alice.transport);
  for (const m of others) assert.deepEqual(counted(m.queue.senderHex), { messages: 1, unsure: false });
  await alice.groups.call(id, { id: '0123456789abcdef', kind: 'start', at: Date.now(), video: false }, alice.transport);
  for (const m of others) assert.deepEqual(marks(m.queue.senderHex).slice(-1), ['ring']);
  for (const m of others) assert.deepEqual(counted(m.queue.senderHex), { messages: 1, unsure: false });
  await alice.groups.call(id, { id: '0123456789abcdef', kind: 'leave' }, alice.transport);
  await settle();

  // The relay cannot be reached: the message, and a call that starts, wait in the group's outbox,
  // with their marks, and so when Alice's phone opens the groups again; then they go, and say they
  // are a message and a ring.
  seen.length = 0;
  unreachable = true;
  await alice.groups.send(id, 'once more', alice.transport);
  await alice.groups.call(id, { id: '1123456789abcdef', kind: 'start', at: Date.now(), video: false }, alice.transport);
  unreachable = false;
  assert.equal(alice.data.groups[0].outbox.length, 6);
  const space = spaces++;
  const key = randomBytes(32);
  await saveGroupData(space, key, alice.data);
  const kept = await loadGroupData(space, key);
  assert.deepEqual(kept.groups[0].outbox.map((o) => o.mark), ['message', 'message', 'message', 'ring', 'ring', 'ring']);
  const again = new Groups(kept, async (data) => void (alice.data = data), async () => ({ id: alice.identity, sender: alice.queue.senderHex, relay: url, relayKey: '' }));
  members.set(alice.identity, { ...alice, groups: again });
  await again.flush(alice.transport);
  for (const m of others) assert.deepEqual(counted(m.queue.senderHex), { messages: 1, unsure: false });
  for (const m of others) assert.deepEqual(marks(m.queue.senderHex), ['message', 'ring']);
  await settle();
  for (const m of others) assert.ok(m.groups.messages(id).some((x) => x.text === 'once more'));
});

test("the space's group messages tell the relay what they carry", { skip: !ready }, async () => {
  const p = await phone();
  setCurrentSpace(p.space, p.key);
  const ids = await createQueue(relay);
  const to: About = { id: toHex(randomBytes(32)), sender: toHex(ids.senderId), relay: url, relayKey: '', seal: toBase64Url(randomBytes(32)) };
  await spaceGroupTransport.post(to, Uint8Array.of(1, 3, 7), 'message');
  await spaceGroupTransport.post(to, Uint8Array.of(1, 3, 8), 'quiet');
  await spaceGroupTransport.post(to, Uint8Array.of(1, 3, 9), 'ring');
  await spaceGroupTransport.post(to, Uint8Array.of(1, 3, 10));
  assert.deepEqual(marks(to.sender), ['message', 'quiet', 'ring', 'none']);
});

// ---- Linked devices ----

// Links the computer (`dell`) to the phone (`pixel`), as the screens do once the codes match, with
// the history, till `done` says the computer has it.
async function linkUp(pixel: Phone & { links: Links | null }, dell: Phone & { links: Links | null }, done: () => boolean) {
  const asked = await pixel.links!.prepare(await dell.links!.makeOffer('DELL'));
  await pixel.links!.link({ since: 0, files: true }, 'Pixel');
  await take(dell);
  await dell.links!.confirm(asked.code);
  await take(pixel);
  await until(async () => {
    await take(dell);
    return done();
  });
}

// The phone and a computer linked to it, and Carol, on an Erevos from before linked devices, who
// wrote to the phone once before. Says the account's id for Carol, and Carol's for the account.
async function linkedWithCarol() {
  const pixel = await phone(true);
  const dell = await phone(true);
  const carol = await phone();
  const { identity: account } = await carol.chats.e2e.addContact({ senderHex: pixel.queue.senderHex, key: toBase64Url(pixel.chats.e2e.bundle), relayUrl: url }, carol.queue.senderHex, where);
  await write(carol, account, 'before the computer');
  const [first] = await take(pixel);
  await pixel.chats.e2e.acceptRequest(first.identity);
  await linkUp(pixel, dell, () => dell.chats.history.messages().length === 1);
  // Linking, the contacts and the history are no message.
  assert.deepEqual(counted(dell.queue.senderHex), { messages: 0, unsure: false });
  return { pixel, dell, carol, account, carolId: first.identity };
}

test("a linked computer's notice counts a contact's message the phone passes on once, kept with it while the relay cannot be reached", { skip: !ready, timeout: 90_000 }, async () => {
  files.clear();
  blobs.clear();
  const { pixel, dell, carol, account, carolId } = await linkedWithCarol();

  // Carol writes while the relay cannot be reached from the phone: what it passes on waits, and
  // keeps that it is a message.
  seen.length = 0;
  await write(carol, account, 'hello both');
  unreachable = true;
  await take(pixel);
  const kept = (await loadDevicesData(pixel.space, pixel.key)).devices[0];
  assert.ok(kept.outbox.length > 0);
  assert.deepEqual(Object.entries(kept.marks ?? {}).map(([packet, mark]) => [kept.outbox.indexOf(packet) >= 0, mark]), [[true, 'message']]);
  unreachable = false;
  await pixel.links!.flush();
  assert.deepEqual((await take(dell)).map((m) => m.text), ['hello both']);
  assert.deepEqual(counted(dell.queue.senderHex), { messages: 1, unsure: false });
  assert.equal((await loadDevicesData(pixel.space, pixel.key)).devices[0].marks, undefined);

  // Carol calls: what the phone passes on waits as a ring, and rings the computer once it goes.
  const since = seen.length;
  await write(carol, account, '', { call: call('offer') });
  unreachable = true;
  await take(pixel);
  const ringing = (await loadDevicesData(pixel.space, pixel.key)).devices[0];
  assert.deepEqual(Object.values(ringing.marks ?? {}), ['ring']);
  unreachable = false;
  await pixel.links!.flush();
  assert.deepEqual(marks(dell.queue.senderHex, since).filter((m) => m !== 'quiet'), ['ring']);
  await take(dell);

  // That Carol read what the computer wrote, and that she types, reach it, and are no message.
  // What the computer wrote goes to the phone quiet: it is the account's own.
  const before = seen.length;
  const fromDell = await write(dell, carolId, 'from the computer');
  assert.deepEqual(counted(pixel.queue.senderHex, before), { messages: 0, unsure: false });
  await take(pixel);
  await take(carol);
  await write(carol, account, '', { read: [fromDell.tag] });
  await write(carol, account, '', { more: { typing: true } });
  await take(pixel);
  await until(async () => {
    await take(dell);
    return dell.chats.history.messages().find((m) => m.tag === fromDell.tag)?.mark === 2;
  });
  assert.deepEqual(counted(dell.queue.senderHex), { messages: 1, unsure: false });
  // What the computer wrote went on to Carol as a message.
  assert.deepEqual(counted(carol.queue.senderHex), { messages: 1, unsure: false });
});

test('what an Erevos from before marks kept for a linked computer goes with none, pushed but not counted; what is kept from then on keeps its mark', { skip: !ready, timeout: 90_000 }, async () => {
  files.clear();
  blobs.clear();
  const { pixel, dell, carol, account } = await linkedWithCarol();

  // Carol writes while the relay cannot be reached from the phone, and the phone, still on 0.1.16,
  // keeps what it passes on with no mark and closes.
  await write(carol, account, 'kept by the old phone');
  unreachable = true;
  await take(pixel);
  pixel.links!.close();
  const { marked: _, ...before } = await loadDevicesData(pixel.space, pixel.key);
  assert.ok(before.devices[0].outbox.length > 0);
  await saveDevicesData(pixel.space, pixel.key, { ...before, devices: before.devices.map(({ marks: _m, ...device }) => device) });

  // Updated, it opens again: what waited says nothing, as from the old one, and not that it is quiet.
  unreachable = false;
  const since = seen.length;
  pixel.links = await Links.open(pixel.space, pixel.key, pixel.chats, 60 * 60_000);
  opened.push(pixel.links);
  await pixel.links.flush();
  assert.deepEqual((await take(dell)).map((m) => m.text), ['kept by the old phone']);
  assert.ok(marks(dell.queue.senderHex, since).includes('none'));
  assert.equal(counted(dell.queue.senderHex, since).messages, 0);

  // What it keeps now is saved as marked, and its mark comes back with it.
  await write(carol, account, 'kept by the new one');
  unreachable = true;
  await take(pixel);
  const kept = (await loadDevicesData(pixel.space, pixel.key)).devices[0];
  assert.deepEqual(Object.values(kept.marks ?? {}), ['message']);
  unreachable = false;
  const now = seen.length;
  await pixel.links.flush();
  assert.deepEqual((await take(dell)).map((m) => m.text), ['kept by the new one']);
  assert.deepEqual(counted(dell.queue.senderHex, now), { messages: 1, unsure: false });
});

test("what the phone carries for a contact says what it carries as it hands it over, to the contact's relay or through another; what it carries for another phone says nothing", { skip: !ready }, async () => {
  files.clear();
  // Bob's relay, with its key, and another the phone reaches it through.
  const bobs = await startRelay(true, '', true);
  const other = await startRelay(false, '', true);
  const alice = await phone();
  const bob = await E2E.open('space', spaces++, randomBytes(32));
  const queue = await createQueue({ url: bobs });
  const key = await relayKey({ url: bobs });
  assert.ok(key);
  const link = { senderHex: toHex(queue.senderId), key: toBase64Url(bob.bundle), relayUrl: bobs, relayKey: toBase64Url(key!) };
  const { identity: bobId } = await alice.chats.e2e.addContact(link, alice.queue.senderHex, where);
  const opened = async () => {
    const texts: string[] = [];
    for (let bytes = await receiveMessage({ url: bobs }, queue.recipientId); bytes; bytes = await receiveMessage({ url: bobs }, queue.recipientId)) {
      const received = await bob.receive(bytes);
      if (received.kind === 'message') texts.push(received.text);
    }
    return texts;
  };

  // The conversation's first packet and a message in two parts, carried: all quiet but the last.
  const [one, two] = [await alice.chats.e2e.seal(bobId, 'one', alice.queue.senderHex, { at: where }), await alice.chats.e2e.seal(bobId, 'two', alice.queue.senderHex, { at: where })];
  const items = await carriedFor(one, [one.first!, one.packet, two.packet], { url, key: '' }, 'message');
  assert.deepEqual(items.map((item) => item.mark), ['quiet', 'quiet', 'message']);
  const since = seen.length;
  // The first straight to Bob's relay, the others through another relay, which passes them on.
  assert.equal(await carryTo({ url: bobs }, items[0].url, items[0].sealed, items[0].mark), true);
  for (const item of items.slice(1)) assert.equal(await carryTo({ url: other }, item.url, item.sealed, item.mark), true);
  assert.deepEqual(seen.slice(since).filter((s) => s.to === 'sealed').map((s) => s.mark), ['quiet', 'quiet', 'message']);
  assert.deepEqual(await opened(), ['', 'one', 'two']);

  // Carried for another phone, it cannot know: none.
  const three = await alice.chats.e2e.seal(bobId, 'three', alice.queue.senderHex, { at: where });
  const [carried] = await carriedFor(three, [three.packet], { url, key: '' });
  assert.equal(carried.mark, undefined);
  const later = seen.length;
  assert.equal(await carryTo({ url: other }, carried.url, carried.sealed), true);
  assert.deepEqual(seen.slice(later).filter((s) => s.to === 'sealed').map((s) => s.mark), ['none']);
  assert.deepEqual(await opened(), ['three']);
});

test('what a linked computer sends goes quiet to the phone, which counts it once as it passes it on: a voice message, one that waited, one sent for later, a call', { skip: !ready, timeout: 90_000 }, async () => {
  files.clear();
  blobs.clear();
  const { pixel, dell, carol, carolId } = await linkedWithCarol();
  const peer = `contact:${carolId}`;
  const place: SendPlace = { sends: relay, own: relay, senderHex: dell.queue.senderHex, here: where, ownKey: '', relayUp: true };
  seen.length = 0;

  // A voice message in parts, as the chat screen hands it over.
  const voice = await dell.chats.e2e.sealVoice(carolId, randomBytes(25_000), 3000, dell.queue.senderHex, { at: where });
  assert.equal(voice.packets.length, 3);
  await sendSealed(relay, voice, voice.packets, sentMark(dell.chats.e2e, 'message'), () => dell.chats.e2e.firstSent(carolId));
  // A text that waited, once the relay answers.
  await dell.chats.history.add({ peer, text: 'waited', mine: true, at: Date.now(), tag: 'dddddddddddd', mark: WAITING });
  assert.deepEqual((await sendWaiting(dell.chats, place)).map((w) => w.tag), ['dddddddddddd']);
  assert.deepEqual(counted(pixel.queue.senderHex), { messages: 0, unsure: false });
  assert.equal(marks(pixel.queue.senderHex).length, 4);
  await take(pixel);
  await until(async () => {
    await take(carol);
    return carol.chats.history.messages().some((m) => m.voice) && carol.chats.history.messages().some((m) => m.text === 'waited');
  });
  assert.deepEqual(counted(carol.queue.senderHex), { messages: 2, unsure: false });

  // One sent for later: held on the relay for the phone, quiet, and counted once for Carol as it
  // goes on to her.
  let since = seen.length;
  await holdLater(dell.chats.e2e, place, carolId, { peer, text: 'later', mine: true, at: Date.now() + 1500, tag: 'eeeeeeeeeeee', mark: WAITING });
  assert.deepEqual(
    seen.slice(since).map((s) => [s.to === pixel.queue.senderHex, s.mark, s.later]),
    [[true, 'quiet', true]],
  );
  await until(async () => {
    await take(pixel);
    await take(carol);
    return carol.chats.history.messages().some((m) => m.text === 'later');
  }, 15_000);
  assert.deepEqual(counted(carol.queue.senderHex, since), { messages: 1, unsure: false });

  // A call the computer starts goes quiet to the phone, which rings Carol.
  since = seen.length;
  await write(dell, carolId, '', { call: call('offer') });
  assert.deepEqual(marks(pixel.queue.senderHex, since), ['quiet']);
  await until(async () => {
    await take(pixel);
    return marks(carol.queue.senderHex, since).length > 0;
  }, 15_000);
  assert.deepEqual(marks(carol.queue.senderHex, since), ['ring']);
});

test("a linked computer's voice message counts once for the contact though a part could not go at first", { skip: !ready, timeout: 90_000 }, async () => {
  files.clear();
  blobs.clear();
  const { pixel, dell, carol, carolId } = await linkedWithCarol();
  const voice = await dell.chats.e2e.sealVoice(carolId, randomBytes(35_000), 4000, dell.queue.senderHex, { at: where });
  assert.equal(voice.packets.length, 4);
  await sendSealed(relay, voice, voice.packets, sentMark(dell.chats.e2e, 'message'), () => dell.chats.e2e.firstSent(carolId));
  // The phone passes on each part as it comes; the first cannot reach the relay, the others go.
  // Once all came, the phone sends the voice message again whole, as it waited.
  seen.length = 0;
  let dropped = 0;
  dropping = (sent) => sent.to === carol.queue.senderHex && dropped++ === 0;
  await take(pixel);
  await until(async () => {
    await take(carol);
    return carol.chats.history.messages().some((m) => m.voice);
  });
  assert.equal(dropped > 0, true);
  // Three parts that went, then the four of the whole: one message.
  assert.deepEqual(marks(carol.queue.senderHex), ['quiet', 'quiet', 'quiet', 'quiet', 'quiet', 'quiet', 'message']);
  assert.deepEqual(counted(carol.queue.senderHex), { messages: 1, unsure: false });
  assert.equal(carol.chats.history.messages().filter((m) => m.voice).length, 1);
});

test("group messages that reach a linked computer together count one each", { skip: !ready, timeout: 90_000 }, async () => {
  const pixel = await phone(true);
  const dell = await phone(true);
  // The group's members on a relay of their own, in memory: only what goes to the computer is seen.
  type Member = { identity: string; groups: Groups; queue: Uint8Array[]; transport: GroupTransport };
  const members = new Map<string, Member>();
  const signals: { from: string; to: string; signal: Parameters<GroupTransport['signal']>[1] }[] = [];
  const member = (identity: string, sender = toHex(randomBytes(24))): Member => {
    const groups = new Groups(EMPTY_GROUPS, async () => undefined, async () => ({ id: identity, sender, relay: url, relayKey: '' }));
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
  const onPixel = member(pixel.chats.e2e.identityHex(), pixel.queue.senderHex);
  const bob = member(toHex(randomBytes(32)));
  const carol = member(toHex(randomBytes(32)));
  // The computer's groups are the phone's: it sends nothing to any member itself.
  const nowhere: GroupTransport = {
    post: async () => assert.fail('sent from the computer'),
    signal: async () => assert.fail('sent from the computer'),
  };
  const onDell = new Groups(EMPTY_GROUPS, async () => undefined, async () => assert.fail('no group state on the computer'));
  pixel.links!.useGroups(onPixel.groups, onPixel.transport);
  dell.links!.useGroups(onDell, nowhere);
  const id = await onPixel.groups.create('Friends', [bob.identity, carol.identity], onPixel.transport);
  await settle();
  await linkUp(pixel, dell, () => onDell.list().length === 1);

  // The phone is off while Bob and Carol write; once it is on again, it tells the computer all they
  // wrote at once, with what Bob writes then.
  seen.length = 0;
  pixel.links!.close();
  for (const text of ['one', 'two', 'three']) await bob.groups.send(id, text, bob.transport);
  await carol.groups.send(id, 'four', carol.transport);
  await settle();
  const again = await Links.open(pixel.space, pixel.key, pixel.chats, 60 * 60_000);
  opened.push(again);
  again.useGroups(onPixel.groups, onPixel.transport);
  await bob.groups.send(id, 'five', bob.transport);
  await settle();
  const theirs = () => onDell.messages(id).filter((m) => m.from && !m.note);
  await until(async () => {
    await again.settled();
    await take(dell);
    return theirs().length === 5;
  });
  assert.deepEqual(theirs().map((m) => m.text), ['one', 'two', 'three', 'four', 'five']);
  assert.deepEqual(counted(dell.queue.senderHex), { messages: 5, unsure: false });
});
