// A space's relay queue moving (lib/queue-move.ts), through a real relay and the real core: Alice
// deletes Carol, so her own queue moves and Bob is told the new one quietly, while the queue her
// contact link names stays, and what Bob sent there before still shows; junk that fills her queue
// moves it once, Bob gets through again, and junk left on the old one moves nothing; an old queue
// is emptied and deleted once every kept contact was heard on a later one, and is gone for whoever
// writes to it after. What a contact holds for later on the relay follows her queue as it moves
// (lib/waiting.ts, holdAgain), and what is held for one deleted goes no more (heldFor, dropHeld).
// A link made at any step of a move names the queue before, never the new one; junk on the link's
// or the groups' queue moves it; a relay that lost the link's or the groups' gives new ones, and
// moves the own queue for neither, nor does a wait in the background; one a group still names stays;
// old queues let go of early are deleted after a new start, and a move cut short finishes as it
// started; a hidden place's ring queue moves though the relay was away at first, and its kept
// contacts are told.
// Skipped, with a note, when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { FIRST_QA, GRACE } from '../lib/moves';
import { linkOf, QueueMove, tookOf, type MoveAt, type MoveGroups, type Take } from '../lib/queue-move';
import { setAppShown, waitWhileAway } from '../lib/receiver';
import { createQueue, deleteQueue, fromHex, isQueueFull, isQueueNotFound, receiveMessage, sendMessage, toHex, type Mark, type Relay } from '../lib/relay';
import type { SpareStore } from '../lib/spare';
import { dropHeld, heldFor, sendWaiting, takeBack, type SendPlace } from '../lib/waiting';
import { History, WAITING } from '../lock/history';
import { hiddenHolder } from '../lock/sealed-file';
import { MAX_OLD_OWN, placeQueues, spaceQueues, type QueuesStore } from '../lock/queues-data';
import { loadSpaceData, updateSpaceData, type Queue } from '../lock/space-data';
import { files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the queue move checks: build the core first with node checks/build-core.mjs');
}
relayNote('the queue move checks');

test('a deletion and junk move the queue, kept contacts follow, and the one deleted reaches nothing', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  const where = { relay: url, relayKey: '' };
  const queue = async (): Promise<Queue> => {
    const ids = await createQueue(relay);
    return { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  };

  // Alice, with her space's settings and queues, and the moves made with them.
  const aliceKey = randomBytes(32);
  const alice = await E2E.open('space', 0, aliceKey);
  const first = await queue();
  await updateSpaceData(0, aliceKey, { url, ownQueue: first });
  const store: SpareStore = { of: {}, load: () => loadSpaceData(0, aliceKey), update: (patch) => updateSpaceData(0, aliceKey, patch) };
  const queues = spaceQueues(0, aliceKey);
  const groupsAsked: string[] = [];
  const pushed: { keep: string[]; drop: string[] } = { keep: [], drop: [] };
  const mover = new QueueMove({
    e2e: alice,
    queues,
    data: store,
    groups: { renewAgain: async (kind) => void groupsAsked.push(kind), named: async () => new Set() },
    push: { keep: async (_own, q) => void pushed.keep.push(q.senderHex), drop: async (_own, q) => void pushed.drop.push(q.senderHex) },
  });
  const own = async () => (await store.load()).ownQueue!;
  const marks: Mark[] = [];

  // One look, as the receiver makes it: up to 50 from the own queue, then the move's.
  const look = async () => {
    const shown: string[] = [];
    const take: Take = async (bytes, kind) => {
      let received: Received;
      try {
        received = await alice.receive(bytes, kind === 'own' ? { onOwn: ownNow.senderHex } : { old: true });
      } catch {
        return { junk: true };
      }
      if (received.kind === 'message') shown.push(received.text);
      return tookOf(received);
    };
    let taken = 0;
    let junk = 0;
    const ownNow = await own();
    for (; taken < 50; taken++) {
      const bytes = await receiveMessage(relay, fromHex(ownNow.recipientHex));
      if (!bytes) break;
      if ((await take(bytes, 'own')).junk) junk++;
    }
    const news = await mover.look({
      own: relay,
      found: { taken, junk },
      take,
      tell: async (identity) => {
        const sealed = await alice.seal(identity, '', (await own()).senderHex, { at: where });
        marks.push('quiet');
        await sendMessage(relay, fromHex(sealed.sender), sealed.packet, 'quiet');
      },
      shows: false,
    });
    return { shown, news };
  };

  // Bob, Carol and later Dave each have a queue and Alice's contact link.
  const person = async (space: number) => {
    const e2e = await E2E.open('space', space, randomBytes(32));
    const q = await queue();
    const { identity } = await e2e.addContact({ senderHex: first.senderHex, key: toBase64Url(alice.bundle), relayUrl: url }, q.senderHex, where);
    const [hello] = e2e.pending();
    await sendMessage(relay, fromHex(hello.sender), hello.first);
    await e2e.firstSent(identity);
    const write = async (text: string) => {
      const sealed = await e2e.seal(identity, text, q.senderHex, { at: where });
      await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
      return sealed.sender;
    };
    const read = async () => {
      for (let bytes = await receiveMessage(relay, fromHex(q.recipientHex)); bytes; bytes = await receiveMessage(relay, fromHex(q.recipientHex))) await e2e.receive(bytes);
    };
    return { e2e, q, identity, write, read, alice: () => e2e.record(identity)!.sender };
  };
  const bob = await person(1);
  const carol = await person(2);

  // Alice's first look finds both asking, and takes them; the queue she has now is none to tell of.
  const opened = await look();
  assert.equal(opened.news.queue, null);
  assert.equal(alice.contacts().length, 2);
  for (const c of alice.contacts()) await alice.acceptRequest(c.identity);
  const [bobId, carolId] = [bob, carol].map((p) => alice.contacts().find((c) => c.sender === p.q.senderHex)!.identity);
  let q = await queues.load();
  assert.equal(q.now?.queue.recipientHex, first.recipientHex);
  assert.equal(q.since, q.moved);
  // Its `qa` says nothing of when this version first looked.
  assert.equal(q.moved, FIRST_QA);
  // The groups' and the public groups' queues are made with it, each its own, and the groups told.
  assert.ok(q.group && q.public && q.group.queue.senderHex !== q.public.queue.senderHex && q.group.queue.senderHex !== first.senderHex);
  assert.deepEqual(groupsAsked, ['group', 'public']);

  // Alice deletes Carol: her own queue moves at once, in the same turn as the deletion is kept.
  await alice.deleteContact(carolId);
  const second = (await mover.moveNow(relay))!.queue;
  assert.notEqual(second.senderHex, first.senderHex);
  assert.equal((await own()).senderHex, second.senderHex);
  assert.equal(alice.moveDue(), 0);
  q = await queues.load();
  // The queue her link names stays: links and QR codes given before keep working.
  assert.equal(linkOf(q, second).senderHex, first.senderHex);
  assert.ok(q.moved > q.since);
  assert.ok(pushed.keep.includes(second.senderHex) && pushed.drop.includes(first.senderHex));

  // Bob wrote before he was told, Carol writes after: Bob's shows, Carol's does not.
  assert.equal(await bob.write('before'), first.senderHex);
  await carol.write('still here?');
  marks.length = 0;
  const told = await look();
  assert.deepEqual(told.shown, ['before']);
  assert.ok(marks.length >= 1 && marks.every((m) => m === 'quiet'));
  await bob.read();
  assert.equal(bob.alice(), second.senderHex);
  assert.equal(bob.e2e.record(bob.identity)!.qa, q.moved);
  // What he sends now goes to the new queue.
  assert.equal(await bob.write('after'), second.senderHex);
  assert.deepEqual((await look()).shown, ['after']);
  assert.equal(alice.record(bobId)!.onNew, q.moved);
  // Carol never learned it.
  assert.equal(carol.alice(), first.senderHex);

  // Someone new with the link Alice gave before: a request, through the queue it names.
  const dave = await person(3);
  await look();
  assert.ok(alice.contacts().some((c) => c.sender === dave.q.senderHex && c.request));

  // Junk fills her queue: Bob's message no longer goes.
  for (let i = 0; i < 1000; i++) await sendMessage(relay, fromHex(second.senderHex), randomBytes(120));
  await assert.rejects(bob.write('full?'), (error) => isQueueFull(error));
  // Three looks of a whole batch of junk move it, and Bob is told the new one.
  const notes: string[] = [];
  for (let i = 0; i < 3; i++) notes.push(...(await look()).news.notes);
  const third = await own();
  assert.notEqual(third.senderHex, second.senderHex);
  assert.equal(notes.length, 1);
  q = await queues.load();
  assert.equal(q.junk.own !== undefined, true);
  assert.ok(q.was.some((w) => w.queue.senderHex === second.senderHex && w.kind === 'own' && w.by === q.moved));
  await look();
  await bob.read();
  assert.equal(bob.alice(), third.senderHex);
  // The junk left on the old queue, read a little with each look, moves nothing.
  for (let i = 0; i < 4; i++) await look();
  assert.equal((await own()).senderHex, third.senderHex);

  // Bob is heard on the new queue: no kept contact needs the old one, so it is emptied and deleted.
  assert.equal(await bob.write('through'), third.senderHex);
  assert.deepEqual((await look()).shown, ['through']);
  q = await queues.load();
  assert.ok(!q.was.some((w) => w.queue.senderHex === second.senderHex));
  await assert.rejects(sendMessage(relay, fromHex(second.senderHex), randomBytes(40)), (error) => isQueueNotFound(error));
  // The queue the link names is never one of those: it stays until a new link, or junk on it.
  assert.equal(linkOf(q, third).senderHex, first.senderHex);
  await sendMessage(relay, fromHex(first.senderHex), randomBytes(40));
});

test('a new contact link moves the queue the link names, and the one before works for its grace', { skip: !coreReady || !relayReady, timeout: 60_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  const ids = await createQueue(relay);
  const key = randomBytes(32);
  const e2e = await E2E.open('space', 0, key);
  const first = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  await updateSpaceData(0, key, { url, ownQueue: first });
  const store: SpareStore = { of: {}, load: () => loadSpaceData(0, key), update: (patch) => updateSpaceData(0, key, patch) };
  const queues = spaceQueues(0, key);
  // The space's groups from before this version say the own queue, until each renews there.
  let named = new Set([first.senderHex]);
  const groups: MoveGroups = { renewAgain: async () => undefined, named: async () => named };
  const mover = new QueueMove({ e2e, queues, data: store, groups });
  const look = (m = mover) => m.look({ own: relay, found: { taken: 0, junk: 0 }, take: async () => ({ junk: false }), tell: async () => undefined, shows: false });
  await look();
  // While the own queue is the link's, the own queue moves, and the one before stays a while.
  const before = Date.now();
  const made = await mover.newLink(relay);
  assert.ok(made.queue && made.queue.senderHex !== first.senderHex);
  assert.ok(made.until >= before + GRACE);
  let q = await queues.load();
  assert.equal(q.link, null);
  assert.ok(q.was.some((w) => w.kind === 'link' && w.queue.senderHex === first.senderHex));
  assert.ok(q.linkUntil >= before + GRACE);
  // Its grace over, it is still read while a group says it.
  await queues.update((d) => ({ ...d, was: d.was.map((w) => ({ ...w, until: 0 })) }));
  await look();
  assert.ok((await queues.load()).was.some((w) => w.queue.senderHex === first.senderHex));
  await sendMessage(relay, fromHex(first.senderHex), randomBytes(40));
  // Once none does, it goes.
  named = new Set();
  await look(new QueueMove({ e2e, queues, data: store, groups }));
  assert.ok(!(await queues.load()).was.some((w) => w.queue.senderHex === first.senderHex));
  await assert.rejects(sendMessage(relay, fromHex(first.senderHex), randomBytes(40)), (error) => isQueueNotFound(error));
  // A move for a deletion makes the queue before the link's; a new link then moves only that one.
  await e2e.moveSoon();
  const own = (await mover.moveNow(relay))!.queue;
  assert.equal(linkOf(await queues.load(), own).senderHex, made.queue.senderHex);
  const again = await mover.newLink(relay);
  assert.equal(again.queue, null);
  q = await queues.load();
  assert.ok(q.link && q.link.queue.senderHex !== own.senderHex);
  assert.equal((await loadSpaceData(0, key)).ownQueue!.senderHex, own.senderHex);
});

test('what a contact holds for later reaches her though she moved twice and the queue it was held for is gone, and none of it once she is deleted', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  const where = { relay: url, relayKey: '' };
  const queue = async (): Promise<Queue> => {
    const ids = await createQueue(relay);
    return { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  };

  // Alice and the moves of her space.
  const aliceKey = randomBytes(32);
  const alice = await E2E.open('space', 0, aliceKey);
  const first = await queue();
  await updateSpaceData(0, aliceKey, { url, ownQueue: first });
  const store: SpareStore = { of: {}, load: () => loadSpaceData(0, aliceKey), update: (patch) => updateSpaceData(0, aliceKey, patch) };
  const queues = spaceQueues(0, aliceKey);
  const mover = new QueueMove({ e2e: alice, queues, data: store });
  const own = async () => (await store.load()).ownQueue!;
  // One look, as the receiver makes it, saying what showed.
  const look = async () => {
    const shown: string[] = [];
    const take: Take = async (bytes, kind) => {
      let received: Received;
      try {
        received = await alice.receive(bytes, kind === 'own' ? { onOwn: ownNow.senderHex } : { old: true });
      } catch {
        return { junk: true };
      }
      if (received.kind === 'message' && received.text) shown.push(received.text);
      return tookOf(received);
    };
    const ownNow = await own();
    let taken = 0;
    for (; taken < 50; taken++) {
      const bytes = await receiveMessage(relay, fromHex(ownNow.recipientHex));
      if (!bytes) break;
      await take(bytes, 'own');
    }
    await mover.look({
      own: relay,
      found: { taken, junk: 0 },
      take,
      tell: async (identity) => {
        const sealed = await alice.seal(identity, '', (await own()).senderHex, { at: where });
        await sendMessage(relay, fromHex(sealed.sender), sealed.packet, 'quiet');
      },
      shows: false,
    });
    return shown;
  };

  // Bob, with his chats and what they keep, has Alice's contact link and asks to talk.
  const bobKey = randomBytes(32);
  const bob = { e2e: await E2E.open('space', 1, bobKey), history: await History.open('space', 1, bobKey) };
  const mine = await queue();
  const { identity: aliceId } = await bob.e2e.addContact({ senderHex: first.senderHex, key: toBase64Url(alice.bundle), relayUrl: url }, mine.senderHex, where);
  const [hello] = bob.e2e.pending();
  await sendMessage(relay, fromHex(hello.sender), hello.first);
  await bob.e2e.firstSent(aliceId);
  const read = async () => {
    for (let bytes = await receiveMessage(relay, fromHex(mine.recipientHex)); bytes; bytes = await receiveMessage(relay, fromHex(mine.recipientHex))) await bob.e2e.receive(bytes);
  };
  const place: SendPlace = { sends: relay, own: relay, senderHex: mine.senderHex, here: where, ownKey: '', relayUp: true };
  const peer = `contact:${aliceId}`;
  await look();
  await alice.acceptRequest(alice.contacts()[0].identity);

  // Alice moves once: Bob is told, and holds a message for her for later, for where she reads now.
  await alice.moveSoon();
  const second = (await mover.moveNow(relay))!.queue;
  await look();
  await read();
  assert.equal(bob.e2e.queueOf(aliceId)!.sender, second.senderHex);
  const at = Date.now() + 12_000;
  await bob.history.add({ peer, text: 'later', mine: true, at, tag: 'aaaaaaaaaaaa', mark: WAITING });
  const [held] = await sendWaiting(bob, place);
  assert.equal(held.heldFor, second.senderHex);
  assert.equal(bob.history.messages()[0].heldFor, second.senderHex);

  // She moves again. Bob, told, holds it anew for her new queue, and the one held before is taken back.
  await alice.moveSoon();
  const third = (await mover.moveNow(relay))!.queue;
  await look();
  await read();
  assert.equal(bob.e2e.queueOf(aliceId)!.sender, third.senderHex);
  const [again] = await sendWaiting(bob, place);
  assert.equal(again.tag, 'aaaaaaaaaaaa');
  assert.equal(again.heldFor, third.senderHex);
  assert.notEqual(again.held!.id, held.held!.id);
  assert.equal(await takeBack(relay, held.held!), false);
  assert.deepEqual(bob.history.waiting(), []);
  assert.deepEqual(
    bob.history.messages().map((m) => [m.held?.id, m.heldFor]),
    [[again.held!.id, third.senderHex]],
  );
  // Held where she reads now, it is let be with each look after.
  assert.deepEqual(await sendWaiting(bob, place), []);

  // Bob is heard on her new queue, so the one the message was held for first is emptied and deleted.
  const sealed = await bob.e2e.seal(aliceId, 'through', mine.senderHex, { at: where });
  await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
  assert.deepEqual(await look(), ['through']);
  assert.ok(!(await queues.load()).was.some((w) => w.queue.senderHex === second.senderHex));
  await assert.rejects(sendMessage(relay, fromHex(second.senderHex), randomBytes(40)), (error) => isQueueNotFound(error));
  assert.ok(Date.now() < at);

  // Its time comes, Bob's phone gone: it reaches her, once.
  await new Promise((r) => setTimeout(r, at - Date.now() + 2000));
  assert.deepEqual(await look(), ['later']);
  assert.deepEqual(await look(), []);

  // Bob holds another, then deletes her: what is held for her is kept with the removal, as the
  // chats keep it, whatever a screen shows, and dropped; it never comes.
  const soon = Date.now() + 4000;
  await bob.history.add({ peer, text: 'secret', mine: true, at: soon, tag: 'bbbbbbbbbbbb', mark: WAITING });
  assert.equal((await sendWaiting(bob, place)).length, 1);
  const toDrop = heldFor(bob.history, aliceId);
  assert.equal(toDrop.length, 1);
  await bob.e2e.deleteContact(aliceId, { held: toDrop });
  const reopened = await E2E.open('space', 1, bobKey);
  assert.deepEqual(reopened.undropped(), toDrop);
  await dropHeld(reopened, relay);
  assert.deepEqual(reopened.undropped(), []);
  assert.equal(await takeBack(relay, toDrop[0]), false);
  // One whose relay cannot be reached is asked again later; one no relay set here holds, or whose time is past, is forgotten.
  const away = { id: 'c'.repeat(32), relay: 'ws://127.0.0.1:9', at: Date.now() + 60_000 };
  await reopened.removeContact('d'.repeat(64), { held: [away] });
  await dropHeld(reopened, { url: away.relay });
  assert.deepEqual(reopened.undropped(), [away]);
  await dropHeld(reopened, relay);
  assert.deepEqual(reopened.undropped(), []);
  await reopened.removeContact('d'.repeat(64), { held: [away] });
  await dropHeld(reopened, { url: away.relay }, away.at);
  assert.deepEqual(reopened.undropped(), []);
  await new Promise((r) => setTimeout(r, soon - Date.now() + 2000));
  assert.deepEqual(await look(), []);
});

// A space on a real relay with its queues and the moves made with them, `wrap` seeing each store.
async function spaceOn(relay: Relay, url: string, { groups, ring, wrap }: { groups?: MoveGroups; ring?: MoveAt['ring']; wrap?: (store: QueuesStore, data: SpareStore) => { queues: QueuesStore; data: SpareStore } } = {}) {
  const key = randomBytes(32);
  const e2e = await E2E.open('space', 0, key);
  const ids = await createQueue(relay);
  const first: Queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  await updateSpaceData(0, key, { url, ownQueue: first });
  const plain = { queues: spaceQueues(0, key), data: { of: {}, load: () => loadSpaceData(0, key), update: (patch) => updateSpaceData(0, key, patch) } as SpareStore };
  const { queues, data } = wrap ? wrap(plain.queues, plain.data) : plain;
  const mover = () => new QueueMove({ e2e, queues, data, groups, ring });
  const made = mover();
  const told: string[] = [];
  const look = (m = made) => m.look({ own: relay, found: { taken: 0, junk: 0 }, take: async () => ({ junk: true }), tell: async (identity) => void told.push(identity), shows: false });
  return { key, e2e, first, queues: plain.queues, mover: made, again: mover, look, told, own: async () => (await loadSpaceData(0, key)).ownQueue! };
}

test('a link made at any step of a move never names the new own queue; junk on the link’s or the groups’ queue moves it; a relay that lost the link’s gives a new link, never the own queue', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  // The queue a link would name, as each write of a move leaves the space, read as a screen does.
  const links: string[] = [];
  let at: { queues: QueuesStore; data: SpareStore } | null = null;
  const snap = async () => {
    if (at) links.push(linkOf(await at.queues.load(), (await at.data.load()).ownQueue!).senderHex);
  };
  const asked: string[] = [];
  const space = await spaceOn(relay, url, {
    groups: { renewAgain: async (kind) => void asked.push(kind), named: async () => new Set() },
    wrap: (queues, data) => {
      at = { queues, data };
      return {
        queues: {
          load: queues.load,
          update: async (change) => {
            const d = await queues.update(change);
            await snap();
            return d;
          },
        },
        data: { ...data, update: async (patch) => (await data.update(patch), await snap()) },
      };
    },
  });
  await space.look();
  let q = await space.queues.load();
  assert.ok(q.group && q.public);
  for (let n = 0; n < 2; n++) {
    await space.e2e.moveSoon();
    links.length = 0;
    const moved = (await space.mover.moveNow(relay))!;
    assert.notEqual(moved.queue.senderHex, space.first.senderHex);
    assert.equal(moved.link.senderHex, space.first.senderHex);
    assert.ok(links.length >= 3);
    assert.ok(!links.includes(moved.queue.senderHex), 'never the new own queue');
  }

  // Junk fills the link's queue and the groups': three looks of whole batches move each.
  const group = q.group!.queue.senderHex;
  for (const sender of [space.first.senderHex, group]) for (let i = 0; i < 160; i++) await sendMessage(relay, fromHex(sender), randomBytes(120));
  const notes: string[] = [];
  for (let i = 0; i < 3; i++) notes.push(...(await space.look()).notes);
  q = await space.queues.load();
  assert.ok(q.link && q.link.queue.senderHex !== space.first.senderHex);
  assert.ok(q.was.some((w) => w.kind === 'link' && w.queue.senderHex === space.first.senderHex));
  assert.ok(q.group && q.group.queue.senderHex !== group);
  assert.deepEqual(asked, ['group', 'public', 'group']);
  assert.ok(notes.some((note) => note.startsWith('Junk filled the queue your contact link names, so you have a new link.')));

  // The relay lost the link's queue: a new one, never the own queue, and the links before no longer work.
  const lost = q.link.queue;
  await deleteQueue(relay, fromHex(lost.recipientHex));
  const said = (await space.look()).notes;
  q = await space.queues.load();
  assert.ok(q.link && q.link.queue.senderHex !== lost.senderHex && q.link.queue.senderHex !== (await space.own()).senderHex);
  assert.ok(said.some((note) => note.startsWith('The relay had lost the queue your contact link names')));
  await sendMessage(relay, fromHex(q.link.queue.senderHex), randomBytes(40));
});

test('a relay that forgot only the groups’ queue has it made anew; the own queue stays, and a wait in the background ends at once without moving it', { skip: !coreReady || !relayReady, timeout: 60_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  const asked: string[] = [];
  const space = await spaceOn(relay, url, { groups: { renewAgain: async (kind) => void asked.push(kind), named: async () => new Set() } });
  await space.look();
  const group = (await space.queues.load()).group!.queue;
  await deleteQueue(relay, fromHex(group.recipientHex));
  setAppShown(false);
  try {
    const started = Date.now();
    await waitWhileAway(relay, fromHex(space.first.recipientHex), [fromHex(group.recipientHex)]);
    assert.ok(Date.now() - started < 10_000);
  } finally {
    setAppShown(true);
  }
  await space.look();
  const q = await space.queues.load();
  assert.ok(q.group && q.group.queue.senderHex !== group.senderHex);
  assert.deepEqual(asked, ['group', 'public', 'group']);
  assert.equal((await space.own()).senderHex, space.first.senderHex);
  assert.equal(q.now?.queue.senderHex, space.first.senderHex);
});

test('old queues let go of early are deleted though the app stopped first; a move cut short finishes as the one it was', { skip: !coreReady || !relayReady, timeout: 60_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  const space = await spaceOn(relay, url);
  await space.look();
  // The first move makes the queue before the link's; each after leaves an old own one, the oldest let go of early.
  for (let i = 0; i < MAX_OLD_OWN + 2; i++) {
    await space.e2e.moveSoon();
    await space.mover.moveNow(relay);
  }
  let q = await space.queues.load();
  assert.equal(q.was.filter((w) => w.kind === 'own').length, MAX_OLD_OWN);
  assert.equal(q.early.length, 1);
  const early = q.early[0].queue;
  await sendMessage(relay, fromHex(early.senderHex), randomBytes(40));
  // Started again: it is still emptied and deleted.
  await space.look(space.again());
  q = await space.queues.load();
  assert.deepEqual(q.early, []);
  await assert.rejects(sendMessage(relay, fromHex(early.senderHex), randomBytes(40)), (error) => isQueueNotFound(error));

  // A move for an own queue the relay lost, cut short once its `next` was kept: it finishes as
  // such, and the queue before is read nowhere, though a kept contact was heard on none since.
  const bob = await E2E.open('space', 1, randomBytes(32));
  await space.e2e.addContact({ senderHex: toHex(randomBytes(24)), key: toBase64Url(bob.bundle), relayUrl: url }, (await space.own()).senderHex, { relay: url, relayKey: '' });
  const before = await space.own();
  const ids = await createQueue(relay);
  const next: Queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  await space.queues.update((d) => ({ ...d, next, nextWhy: 'lost' }));
  await space.look(space.again());
  q = await space.queues.load();
  assert.equal((await space.own()).senderHex, next.senderHex);
  assert.equal(q.next, null);
  assert.ok(!q.was.some((w) => w.queue.senderHex === before.senderHex));
  // One for a deletion, the same way, keeps the queue before read for its grace.
  await space.e2e.moveSoon();
  const ids2 = await createQueue(relay);
  await space.queues.update((d) => ({ ...d, next: { recipientHex: toHex(ids2.recipientId), senderHex: toHex(ids2.senderId) }, nextWhy: 'due' }));
  await space.look(space.again());
  assert.ok((await space.queues.load()).was.some((w) => w.kind === 'own' && w.queue.senderHex === next.senderHex));
});

test('a hidden place’s ring queue moves for rings that brought no call, with a later look when the relay is away at first, and each kept contact is told the new one', { skip: !coreReady || !relayReady, timeout: 60_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  const key = randomBytes(32);
  const e2e = await E2E.open(hiddenHolder(1), 0, key);
  const ids = await createQueue(relay);
  const first: Queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  await updateSpaceData(0, key, { url, ownQueue: first });
  const store: SpareStore = { of: {}, load: () => loadSpaceData(0, key), update: (patch) => updateSpaceData(0, key, patch) };
  const queues = placeQueues(0, 1, key);
  let away = true;
  let rings = 0;
  const ring = async () => {
    rings++;
    if (away) throw new Error('The relay cannot be reached.');
    return true;
  };
  const mover = new QueueMove({ e2e, queues, data: store, ring });
  const told: string[] = [];
  const look = (m = mover) => m.look({ own: relay, found: { taken: 0, junk: 0 }, take: async () => ({ junk: false }), tell: async (identity) => void told.push(identity), shows: false });
  // Bob is a kept contact of the place.
  const bob = await E2E.open('space', 1, randomBytes(32));
  const { identity: bobId } = await e2e.addContact({ senderHex: toHex(randomBytes(24)), key: toBase64Url(bob.bundle), relayUrl: url }, first.senderHex, { relay: url, relayKey: '' });
  await look();
  assert.deepEqual(told, []);
  // Away: due, and tried again with each look, from what is kept, after a new start too.
  assert.equal(await mover.ringMove(), false);
  assert.equal((await queues.load()).ringDue, true);
  await look(new QueueMove({ e2e, queues, data: store, ring }));
  assert.deepEqual([rings, told], [2, []]);
  away = false;
  await look();
  assert.equal(rings, 3);
  assert.equal((await queues.load()).ringDue, false);
  assert.deepEqual(told, [bobId]);
  assert.equal(e2e.record(bobId)!.ringTell, undefined);
  assert.equal(e2e.record(bobId)!.told, undefined, 'the own queue was told no one');
  await look();
  assert.deepEqual(told, [bobId]);
  // Reached at once: moved, and told with the next look.
  assert.equal(await mover.ringMove(), true);
  await look();
  assert.deepEqual(told, [bobId, bobId]);
});
