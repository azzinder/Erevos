// Group chats (lib/groups.ts) with the real core built to WebAssembly by checks/build-core.mjs:
// three phones, each with its own state, joined by an in-memory relay that keeps each queue in
// order but lets the queues run at their own pace. Skipped, with a note, without the core.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { decodeGroup, encodeGroup, type GroupSignal } from '../lib/group-signal';
import { Groups, isGroupPacket, noteText, type GroupTransport } from '../lib/groups';
import { EMPTY_GROUPS, type About } from '../lock/group-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
if (existsSync(built)) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the group checks: build the core first with node checks/build-core.mjs');
}

type Phone = { name: string; identity: string; groups: Groups; queue: Uint8Array[]; transport: GroupTransport };

function network() {
  const phones = new Map<string, Phone>();
  const signals: { from: string; to: string; signal: GroupSignal }[] = [];
  const phone = (name: string): Phone => {
    const identity = toHex(randomBytes(32));
    const sender = toHex(randomBytes(24));
    const me = async () => ({ id: identity, sender, relay: 'wss://relay.example.org', relayKey: '' });
    const groups = new Groups(EMPTY_GROUPS, async () => undefined, me);
    const transport: GroupTransport = {
      async post(to: About, packet: Uint8Array) {
        assert.ok(isGroupPacket(packet));
        assert.equal(to.sender.length, 48);
        phones.get(to.id)!.queue.push(packet);
      },
      async signal(to: string, signal: GroupSignal) {
        // As it travels inside a chat's message.
        signals.push({ from: identity, to, signal: decodeGroup(JSON.parse(JSON.stringify(encodeGroup(signal))))! });
      },
    };
    const it = { name, identity, groups, queue: [], transport };
    phones.set(identity, it);
    return it;
  };
  // Hands on what waits: chats' signals first, then each queue in turn, until nothing waits.
  const settle = async (only?: Phone[]) => {
    for (let round = 0; round < 20; round++) {
      let moved = false;
      while (signals.length > 0) {
        const { from, to, signal } = signals.shift()!;
        const target = phones.get(to)!;
        await target.groups.signal(from, signal, false, target.transport);
        moved = true;
      }
      for (const p of only ?? phones.values()) {
        while (p.queue.length > 0) {
          await p.groups.receive(p.queue.shift()!, p.transport);
          moved = true;
        }
      }
      if (!moved) return;
    }
  };
  return { phone, settle };
}

const texts = (p: Phone, id: string) => p.groups.messages(id).filter((m) => !m.note).map((m) => m.text);

test('three phones make a group, talk, and one is taken out', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');

  const id = await alice.groups.create('  Φίλοι ', [bob.identity, carol.identity], alice.transport);
  assert.deepEqual(alice.groups.list()[0].asked, [bob.identity, carol.identity]);
  await net.settle();
  assert.deepEqual(alice.groups.list()[0].asked, []);
  for (const p of [bob, carol]) {
    const [info] = p.groups.list();
    assert.equal(info.name, 'Φίλοι');
    assert.equal(info.admin, false);
  }
  assert.equal((await alice.groups.members(id)).length, 3);

  await carol.groups.send(id, 'γεια σε όλους', carol.transport);
  await bob.groups.send(id, 'hi', bob.transport);
  await net.settle();
  assert.deepEqual(texts(alice, id), ['γεια σε όλους', 'hi']);
  // Bob's own shows when he wrote it, before Carol's came.
  assert.deepEqual(texts(bob, id), ['hi', 'γεια σε όλους']);
  assert.equal(alice.groups.list()[0].unread, 2);
  await alice.groups.markRead(id);
  assert.equal(alice.groups.list()[0].unread, 0);
  assert.equal(bob.groups.messages(id).find((m) => m.text === 'γεια σε όλους')?.from, carol.identity);

  const names = new Map([[bob.identity, 'Bob']]);
  const notes = alice.groups.messages(id).filter((m) => m.note).map((m) => noteText(m.text, (i) => names.get(i) ?? 'someone'));
  assert.deepEqual(notes, ['You made the group.', 'Bob joined.', 'someone joined.']);

  // Bob is taken out: he gets nothing after, and the others see him go.
  const bobLeaf = (await alice.groups.members(id)).find((m) => m.about?.id === bob.identity)!.leaf;
  await alice.groups.remove(id, bobLeaf, alice.transport);
  await net.settle();
  assert.equal(bob.groups.list()[0].status, 'out');
  await alice.groups.send(id, 'without bob', alice.transport);
  await net.settle();
  assert.ok(!texts(bob, id).includes('without bob'));
  assert.ok(texts(carol, id).includes('without bob'));
  assert.equal((await carol.groups.members(id)).length, 2);
  await assert.rejects(bob.groups.send(id, 'still here?', bob.transport));
});

test('a message written before the commit reached a member waits for it', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity], alice.transport);
  await net.settle();

  // Carol joins and writes, while Bob's queue has not been looked at yet.
  await alice.groups.add(id, [carol.identity], alice.transport);
  await net.settle([alice, carol]);
  await carol.groups.send(id, 'early', carol.transport);
  // Bob's queue now has the commit, then Carol's message: shuffle them, as two relays might.
  bob.queue.reverse();
  await net.settle();
  assert.deepEqual(texts(bob, id), ['early']);
});

test('a member leaves through the admin, and only the admin renames', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();

  await carol.groups.leave(id, carol.transport);
  assert.equal(carol.groups.list()[0].status, 'leaving');
  await net.settle();
  assert.equal(carol.groups.list()[0].status, 'out');
  assert.equal((await bob.groups.members(id)).length, 2);

  await assert.rejects(bob.groups.rename(id, 'mine', bob.transport));
  await alice.groups.rename(id, 'Νέο όνομα', alice.transport);
  await net.settle();
  assert.equal(bob.groups.list()[0].name, 'Νέο όνομα');

  // A welcome nobody asked for joins nothing.
  const eve = net.phone('eve');
  await eve.groups.signal(alice.identity, { group: toHex(randomBytes(16)), kind: 'welcome', data: new Uint8Array([1, 2]), name: 'x' }, false, eve.transport);
  assert.equal(eve.groups.list().length, 0);
  // A message request gets no key package.
  await eve.groups.signal(alice.identity, { group: id, kind: 'ask' }, true, eve.transport);
  await net.settle();
  assert.equal(eve.groups.list().length, 0);
});

test('call signals go to the whole group, or only to the member named', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();
  const heard: Record<string, string[]> = { bob: [], carol: [], alice: [] };
  for (const p of [alice, bob, carol]) p.groups.onCall((group, from, signal) => heard[p.name].push(`${group === id}:${from.slice(0, 4)}:${signal.kind}`));

  const callId = 'ab'.repeat(8);
  await bob.groups.call(id, { id: callId, kind: 'start', at: Date.now() }, bob.transport);
  await net.settle();
  await alice.groups.call(id, { id: callId, kind: 'offer', to: bob.identity, sdp: 'v=0\r\nx' }, alice.transport);
  await net.settle();
  const b = bob.identity.slice(0, 4);
  const a = alice.identity.slice(0, 4);
  assert.deepEqual(heard.alice, [`true:${b}:start`]);
  assert.deepEqual(heard.carol, [`true:${b}:start`]);
  assert.deepEqual(heard.bob, [`true:${a}:offer`]);
  // Calls leave no message behind.
  assert.deepEqual(texts(carol, id), []);
  // And the group's messages still open after them.
  await carol.groups.send(id, 'after', carol.transport);
  await net.settle();
  assert.deepEqual(texts(bob, id), ['after']);
});

test('group signals travel as JSON and refuse what is not theirs', () => {
  const group = 'ab'.repeat(16);
  const keys = { group, kind: 'keys' as const, data: new Uint8Array([1, 2, 3]) };
  assert.deepEqual(decodeGroup(JSON.parse(JSON.stringify(encodeGroup(keys)))), keys);
  assert.equal(decodeGroup({ group: 'xyz', kind: 'ask' }), null);
  assert.equal(decodeGroup({ group, kind: 'keys', data: '' }), null);
  assert.equal(decodeGroup({ group, kind: 'nope' }), null);
  assert.equal((decodeGroup({ group, kind: 'welcome', data: 'AQ==', name: 'a\u0000b' }) as { name: string }).name, 'a b');
  assert.ok(!isGroupPacket(new Uint8Array([1, 2, 0])));
  assert.ok(isGroupPacket(new Uint8Array([1, 3, 0])));
});
