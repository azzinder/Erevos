// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The phone a backup came from said lost (lock/restored.ts markLost, lib/queue-move.ts lostNow),
// through a real relay, a real home relay and the real core: a space that backup put back moves
// every queue that phone knows, once, with its next look: the own one, its backup queues on the
// home relay, the contact link's, the groups' and the public groups', and each contact's own one.
// The kept contact is told and follows; the old own and backup queues, and his old one, are deleted
// once he was heard on his new one, while the link's works on through its grace. A space made here
// moves nothing for it, and a move cut short goes on with the steps it had left.
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
import { GRACE } from '../lib/moves';
import { QueueMove, tookOf, type MoveGroups, type Take } from '../lib/queue-move';
import { createQueue, fromHex, isQueueNotFound, receiveMessage, sendMessage, toHex, type Relay } from '../lib/relay';
import { readySpare, type SpareStore } from '../lib/spare';
import { spaceQueues } from '../lock/queues-data';
import { lostMark, markLost, markRestore } from '../lock/restored';
import { loadSpaceData, updateSpaceData, type Queue } from '../lock/space-data';
import { files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the lost phone checks: build the core first with node checks/build-core.mjs');
}
relayNote('the lost phone checks');

const gone = (error: unknown) => isQueueNotFound(error);

// A space on the relay at `url`, with a home relay at `home`, its groups asked to renew (`asked`),
// and one look as the receiver makes it, which says what showed.
async function spaceOn(relay: Relay, url: string, home: string, space: number) {
  const where = { relay: url, relayKey: '' };
  const key = randomBytes(32);
  const e2e = await E2E.open('space', space, key);
  const ids = await createQueue(relay);
  const first: Queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
  await updateSpaceData(space, key, { url, ownQueue: first, spare: { url: home, token: '', queue: null } });
  const data: SpareStore = { of: {}, load: () => loadSpaceData(space, key), update: (patch) => updateSpaceData(space, key, patch) };
  await readySpare(data);
  const queues = spaceQueues(space, key);
  const asked: string[] = [];
  const groups: MoveGroups = { renewAgain: async (kind) => void asked.push(kind), named: async () => new Set() };
  const at = { e2e, mover: new QueueMove({ e2e, queues, data, groups, contacts: { way: `contacts-${space}` } }) };
  const own = async () => (await data.load()).ownQueue!;
  const look = async () => {
    const shown: string[] = [];
    const open = async (bytes: Uint8Array, options: Parameters<E2E['receive']>[1]) => {
      let received: Received;
      try {
        received = await at.e2e.receive(bytes, options);
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
    await at.mover.look({
      own: relay,
      found: { taken, junk: 0 },
      take,
      takeMine: (bytes, r) => open(bytes, { onMine: r }),
      tell: async (identity) => {
        const sealed = await at.e2e.seal(identity, '', (await own()).senderHex, { at: where });
        await sendMessage(relay, fromHex(sealed.sender), sealed.packet, 'quiet');
      },
      shows: false,
    });
    return shown;
  };
  // Opens anew, as after a restore, with a new mover.
  const reopen = async () => {
    at.mover.stop();
    at.e2e = await E2E.open('space', space, key);
    at.mover = new QueueMove({ e2e: at.e2e, queues, data, groups, contacts: { way: `contacts-${space}` } });
  };
  return { at, key, first, queues, data, asked, own, look, reopen };
}

test('the old phone said lost: a space a backup put back moves every queue it knows, once, and its kept contact follows', { skip: !coreReady || !relayReady, timeout: 180_000 }, async () => {
  files.clear();
  const url = await startRelay();
  const home = await startRelay();
  const relay = { url };
  const where = { relay: url, relayKey: '' };
  const alice = await spaceOn(relay, url, home, 0);
  const firstSpare = (await alice.data.load()).spare.queue!;
  try {
    // Bob asks with Alice's link, and once taken writes to a queue of his own.
    const bob = await E2E.open('space', 1, randomBytes(32));
    const ids = await createQueue(relay);
    const bobQ: Queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    const { identity: aliceId } = await bob.addContact({ senderHex: alice.first.senderHex, key: toBase64Url(alice.at.e2e.bundle), relayUrl: url }, bobQ.senderHex, where);
    const [hello] = bob.pending();
    await sendMessage(relay, fromHex(hello.sender), hello.first);
    await bob.firstSent(aliceId);
    const write = async (text: string) => {
      const sealed = await bob.seal(aliceId, text, bobQ.senderHex, { at: where });
      await sendMessage(relay, fromHex(sealed.sender), sealed.packet);
      return sealed.sender;
    };
    const read = async () => {
      for (let bytes = await receiveMessage(relay, fromHex(bobQ.recipientHex)); bytes; bytes = await receiveMessage(relay, fromHex(bobQ.recipientHex))) await bob.receive(bytes);
    };
    const until = async (text: string) => {
      for (let i = 0; i < 30; i++) {
        if ((await alice.look()).includes(text)) return;
        await new Promise((done) => setTimeout(done, 100));
      }
      assert.fail(`${text} never came`);
    };
    await alice.look();
    const bobId = alice.at.e2e.contacts()[0].identity;
    await alice.at.e2e.acceptRequest(bobId);
    await alice.look();
    await read();
    assert.equal(bob.record(aliceId)!.sender, alice.at.e2e.record(bobId)!.mine!.s);
    assert.equal(await write('hello'), alice.at.e2e.record(bobId)!.mine!.s);
    await until('hello');
    // A first move, as for someone deleted: the link keeps a queue of its own, the first one.
    await alice.at.e2e.moveSoon();
    await alice.at.mover.moveNow(relay);
    let q = await alice.queues.load();
    assert.equal(q.link?.queue.senderHex, alice.first.senderHex);
    assert.ok(q.group && q.public);
    assert.ok(q.was.some((w) => w.kind === 'spare' && w.queue.senderHex === firstSpare.senderHex && w.by === undefined));

    // A backup of all that is put back here: nothing moves for it alone.
    await markRestore();
    await alice.reopen();
    assert.ok(alice.at.e2e.putBackAt() > 0);
    await alice.look();
    q = await alice.queues.load();
    const before = { own: await alice.own(), link: q.link!.queue, group: q.group!.queue, public: q.public!.queue, spare: (await alice.data.load()).spare.queue!, mine: alice.at.e2e.record(bobId)!.mine! };
    await alice.look();
    assert.equal((await alice.own()).senderHex, before.own.senderHex);
    assert.equal((await alice.queues.load()).link?.queue.senderHex, before.link.senderHex);

    // The old phone is said lost: the next look moves each queue it knows.
    await markLost();
    const mark = await lostMark();
    alice.asked.length = 0;
    const said = Date.now();
    await alice.look();
    q = await alice.queues.load();
    const after = { own: await alice.own(), link: q.link!.queue, group: q.group!.queue, public: q.public!.queue, spare: (await alice.data.load()).spare.queue!, mine: alice.at.e2e.record(bobId)!.mine! };
    for (const what of ['own', 'link', 'group', 'public', 'spare'] as const) assert.notEqual(after[what].senderHex, before[what].senderHex, what);
    assert.notEqual(after.mine.r, before.mine.r);
    assert.equal(after.mine.was?.r, before.mine.r);
    assert.deepEqual([q.lost, q.losing, q.lostDone], [mark, '', []]);
    assert.deepEqual(alice.asked, ['group', 'public']);
    // The old own and backup queues go once each kept contact was heard on a new one, those from
    // before too; the link's works through its grace; the groups' go once no group names them.
    const was = (queue: Queue) => q.was.find((w) => w.queue.senderHex === queue.senderHex);
    assert.deepEqual([was(before.own)?.kind, was(before.own)?.by], ['own', q.moved]);
    assert.deepEqual([was(before.spare)?.kind, was(before.spare)?.by], ['spare', q.moved]);
    assert.deepEqual([was(firstSpare)?.kind, was(firstSpare)?.by], ['spare', q.moved]);
    const link = was(before.link)!;
    assert.equal(link.kind, 'link');
    assert.equal(link.by, undefined);
    assert.ok(link.until >= said + GRACE);
    await assert.rejects(sendMessage(relay, fromHex(before.group.senderHex), randomBytes(40)), gone);
    await assert.rejects(sendMessage(relay, fromHex(before.public.senderHex), randomBytes(40)), gone);

    // Bob is told his new queue quietly, and writes there.
    await read();
    assert.equal(bob.record(aliceId)!.sender, after.mine.s);
    assert.equal(await write('on the new one'), after.mine.s);
    await until('on the new one');
    await alice.look();
    // Once heard there, the queues the old phone knew are deleted, but the link's.
    await assert.rejects(sendMessage(relay, fromHex(before.mine.s), randomBytes(40)), gone);
    await assert.rejects(sendMessage(relay, fromHex(before.own.senderHex), randomBytes(40)), gone);
    await assert.rejects(sendMessage({ url: home }, fromHex(before.spare.senderHex), randomBytes(40)), gone);
    await assert.rejects(sendMessage({ url: home }, fromHex(firstSpare.senderHex), randomBytes(40)), gone);
    await sendMessage(relay, fromHex(before.link.senderHex), randomBytes(40));

    // Once only: the looks after move nothing more.
    await alice.look();
    q = await alice.queues.load();
    assert.equal((await alice.own()).senderHex, after.own.senderHex);
    assert.deepEqual([q.link?.queue.senderHex, q.group?.queue.senderHex, (await alice.data.load()).spare.queue?.senderHex], [after.link.senderHex, after.group.senderHex, after.spare.senderHex]);
    assert.equal(alice.at.e2e.record(bobId)!.mine!.r, after.mine.r);

    // Said again, a move cut short after its first steps goes on with those it had left.
    await markLost();
    const again = await lostMark();
    await alice.queues.update((d) => ({ ...d, losing: again, lostDone: ['mines', 'own'] }));
    await alice.look();
    q = await alice.queues.load();
    assert.equal((await alice.own()).senderHex, after.own.senderHex);
    assert.notEqual(q.link?.queue.senderHex, after.link.senderHex);
    assert.notEqual(q.group?.queue.senderHex, after.group.senderHex);
    assert.deepEqual([q.lost, q.losing, q.lostDone], [again, '', []]);

    // A space made here was on no phone lost: it moves nothing.
    const made = await spaceOn(relay, url, home, 2);
    try {
      await made.look();
      const q2 = await made.queues.load();
      assert.equal(made.at.e2e.putBackAt(), 0);
      assert.equal(q2.lost, again);
      assert.equal((await made.own()).senderHex, made.first.senderHex);
    } finally {
      made.at.mover.stop();
    }
  } finally {
    alice.at.mover.stop();
  }
});
