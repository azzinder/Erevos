// Contact queues (lib/contact-queues.ts), through a real relay and the real core: at a relay that
// reads queues on /read, each of Alice's kept contacts is told a queue of their own, quietly, a few
// at a time, and writes to it from then on; what they write there comes, read with no token and
// woken by the watch; someone new gets one of their own with the first answer; deleting one deletes
// only theirs on the relay. The queues are read in groups, each on its own way, and many at once
// without Tor.
// Skipped, with a note, when the core or the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { bunches, CONTACT_GROUP, contactQueuesAt } from '../lib/contact-queues';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { QueueMove, tookOf, type Take } from '../lib/queue-move';
import { createQueue, fromHex, isQueueNotFound, MAX_ANY, readsManyAt, receiveMessage, receiveOnRead, sendMessage, toHex } from '../lib/relay';
import type { SpareStore } from '../lib/spare';
import { spaceQueues } from '../lock/queues-data';
import { loadSpaceData, updateSpaceData, type Queue } from '../lock/space-data';
import type { Mine } from '../lock/e2e-data';
import { files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the contact queue checks: build the core first with node checks/build-core.mjs');
}
relayNote('the contact queue checks');

const mineOf = (r: string, g: number, u = 'wss://relay.example', was?: string): Mine => ({ r, s: `${r}s`, u, qa: 2, g, ...(was ? { was: { r: was, u, until: 1 } } : {}) });

test('queues are read in groups, each on its own way, and many at once without Tor', () => {
  const mines = Array.from({ length: 20 }, (_, i) => ({ identity: `c${i}`, mine: mineOf(`r${i}`, Math.floor(i / CONTACT_GROUP)) }));
  // One taking the place of another is read with it, in the same group; one on another relay is not.
  mines.push({ identity: 'moved', mine: mineOf('new', 0, 'wss://relay.example', 'old') });
  mines.push({ identity: 'away', mine: mineOf('far', 1, 'wss://other.example') });
  const queues = contactQueuesAt(mines, 'wss://relay.example/');
  assert.equal(queues.length, 22);
  assert.ok(queues.some((q) => q.r === 'old' && q.was && q.identity === 'moved'));
  assert.ok(!queues.some((q) => q.r === 'far'));
  const tor = bunches(queues, 'contacts-0', true);
  assert.deepEqual(
    tor.map((b) => b.way),
    ['contacts-0-0', 'contacts-0-1', 'contacts-0-2'],
  );
  assert.deepEqual(
    tor.map((b) => b.queues.length),
    [10, 8, 4],
  );
  // Another space's never share a way with these.
  assert.ok(bunches(queues, 'contacts-1', true).every((b) => !tor.some((t) => t.way === b.way)));
  const plain = bunches([...queues, ...queues, ...queues], 'contacts-0', false);
  assert.deepEqual(
    plain.map((b) => b.queues.length),
    [MAX_ANY, 66 - MAX_ANY],
  );
});

test('each kept contact writes to a queue of their own, read with no token, and deleting one deletes only theirs', { skip: !coreReady || !relayReady, timeout: 120_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const relay = { url };
  const where = { relay: url, relayKey: '' };
  const queue = async (): Promise<Queue> => {
    const ids = await createQueue(relay);
    return { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  };

  // The relay reads queues on /read: one no one has is gone there, and one of Bob's is read there.
  assert.equal(await readsManyAt(relay, 'check'), true);
  const probe = await queue();
  await sendMessage(relay, fromHex(probe.senderHex), Uint8Array.of(1, 2, 3));
  assert.deepEqual([...(await receiveOnRead(relay, fromHex(probe.recipientHex), 'check'))!], [1, 2, 3]);
  assert.equal(await receiveOnRead(relay, fromHex(probe.recipientHex), 'check'), null);
  await assert.rejects(receiveOnRead(relay, randomBytes(24), 'check'), (error) => isQueueNotFound(error));

  const aliceKey = randomBytes(32);
  const alice = await E2E.open('space', 0, aliceKey);
  const first = await queue();
  await updateSpaceData(0, aliceKey, { url, ownQueue: first });
  const store: SpareStore = { of: {}, load: () => loadSpaceData(0, aliceKey), update: (patch) => updateSpaceData(0, aliceKey, patch) };
  const mover = new QueueMove({ e2e: alice, queues: spaceQueues(0, aliceKey), data: store, contacts: { way: 'contacts-0' } });
  const own = async () => (await store.load()).ownQueue!;
  try {
    // One look, as the receiver makes it.
    const look = async () => {
      const shown: string[] = [];
      const open = async (bytes: Uint8Array, options: Parameters<E2E['receive']>[1]) => {
        let received: Received;
        try {
          received = await alice.receive(bytes, options);
        } catch {
          return { junk: true };
        }
        if (received.kind === 'message') shown.push(received.text);
        return tookOf(received);
      };
      const ownNow = await own();
      const take: Take = (bytes, kind) => open(bytes, kind === 'own' ? { onOwn: ownNow.senderHex } : { old: true });
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
        takeMine: (bytes, r) => open(bytes, { onMine: r }),
        tell: async (identity) => {
          const sealed = await alice.seal(identity, '', (await own()).senderHex, { at: where });
          await sendMessage(relay, fromHex(sealed.sender), sealed.packet, 'quiet');
        },
        shows: true,
      });
      return shown;
    };
    // Looks until `text` shows, as the watch wakes them: a few at most.
    const until = async (text: string) => {
      for (let i = 0; i < 20; i++) {
        if ((await look()).includes(text)) return;
        await new Promise((done) => setTimeout(done, 100));
      }
      assert.fail(`${text} never came`);
    };

    // Bob, Carol and later Dave each have a queue and Alice's contact link, from an Erevos that gives none.
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
    await look();
    for (const c of alice.contacts()) await alice.acceptRequest(c.identity);
    const [bobId, carolId] = [bob, carol].map((p) => alice.contacts().find((c) => c.sender === p.q.senderHex)!.identity);

    // The next look makes queues ahead and tells each kept contact theirs, quietly.
    await look();
    const bobs = alice.record(bobId)!.mine!;
    const carols = alice.record(carolId)!.mine!;
    assert.ok(bobs && carols);
    assert.notEqual(bobs.s, carols.s);
    assert.ok(![first.senderHex].includes(bobs.s) && ![first.senderHex].includes(carols.s));
    await bob.read();
    await carol.read();
    assert.equal(bob.alice(), bobs.s);
    assert.equal(carol.alice(), carols.s);

    // What Bob writes goes to his own queue, and comes; once heard there, he is told it no more.
    assert.equal(await bob.write('to my own'), bobs.s);
    await until('to my own');
    assert.equal(alice.record(bobId)!.mine!.heard, true);
    assert.ok(!alice.tellsDue(0, 0).includes(bobId));

    // Someone new: the answer to their request already says a queue of their own.
    const dave = await person(3);
    await look();
    const daveId = alice.contacts().find((c) => c.sender === dave.q.senderHex)!.identity;
    await alice.acceptRequest(daveId);
    const sealed = await alice.seal(daveId, 'welcome', (await own()).senderHex, { at: where });
    await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
    await dave.read();
    const daves = alice.record(daveId)!.mine!;
    assert.ok(daves && ![bobs.s, carols.s, first.senderHex].includes(daves.s));
    assert.equal(dave.alice(), daves.s);

    // Alice deletes Carol: Carol's queue is deleted on the relay with the next look, Bob's stays.
    await alice.deleteContact(carolId);
    await look();
    await assert.rejects(sendMessage(relay, fromHex(carols.s), randomBytes(40)), (error) => isQueueNotFound(error));
    assert.equal(await bob.write('still mine'), bobs.s);
    await until('still mine');
    assert.ok(!alice.goneQueues().some((g) => g.r === carols.r));
  } finally {
    mover.stop();
  }
});
