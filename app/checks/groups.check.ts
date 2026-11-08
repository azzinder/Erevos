// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Group chats (lib/groups.ts) with the real core built to WebAssembly by checks/build-core.mjs:
// three phones, each with its own state, joined by an in-memory relay that keeps each queue in
// order but lets the queues run at their own pace. Skipped, with a note, without the core. Phones
// made from an account have the keys it says, and contacts kept in memory, to ask members for
// their contact links, and those blocked, whose links add no one. An admin's new keys are followed
// only while they say the same admin.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mock, test } from 'node:test';

import { accountBundle, accountIdentity, newAccount, setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { toBase64Url } from '../lib/e2e';
import { decodeGroup, encodeGroup, type GroupSignal } from '../lib/group-signal';
import { ASK_AGAIN, ASK_KEPT, Groups, isGroupPacket, MAX_ASKS, noteText, RENEW_EVERY, WANT_KEPT, type GroupMember, type GroupTransport } from '../lib/groups';
import type { Mark } from '../lib/relay';
import { checkedGroup, EMPTY_GROUPS, MAX_CONTACT_KEY, type About, type GroupData } from '../lock/group-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
let real: Core | null = null;
if (existsSync(built)) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  real = Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core;
  setCore(real);
} else {
  console.log('Skipping the group checks: build the core first with node checks/build-core.mjs');
}

type Phone = {
  name: string;
  identity: string;
  /** The id it says of itself in its groups: its own, but on a phone made to claim another's. */
  says: string;
  sender: string;
  groups: Groups;
  queue: Uint8Array[];
  transport: GroupTransport;
  /** Its account's public keys, base64url, as its contacts give them; empty for a phone with no account. */
  bundle: string;
  /** Its contacts, by identity, those that are message requests, and each member it added from a
   *  group, with the keys it gave. */
  known: Set<string>;
  requests: Set<string>;
  added: { about: About; key: string }[];
  /** Those it blocked, by identity. */
  blocked: Set<string>;
  /** How many times a member's message, or an ask for its contact link, came in a group. */
  heard: number;
  /** What each packet it posted told the relay it carries (lib/relay.ts, Mark), in turn. */
  marks: (Mark | undefined)[];
  /** Its groups as last kept, and how to put back what was kept once, as a backup does. */
  kept: GroupData;
  putBack: (data: GroupData) => void;
};

type Account = { identity: string; bundle: string };

/** A new account's identity and public keys, as its phone has them. */
async function account(): Promise<Account> {
  const made = await newAccount();
  return { identity: toHex(await accountIdentity(made)), bundle: toBase64Url(await accountBundle(made)) };
}

// Phones, each with its own state. One made from an `account` has contacts, and can be asked for its
// contact link, unless it is `old` (an Erevos from before that); with `claims`, it says that id of
// itself in its groups instead of its own.
function network() {
  const phones = new Map<string, Phone>();
  const signals: { from: string; to: string; signal: GroupSignal }[] = [];
  const phone = (name: string, made?: Account, { old = false, claims }: { old?: boolean; claims?: string } = {}): Phone => {
    const identity = made?.identity ?? toHex(randomBytes(32));
    const sender = toHex(randomBytes(24));
    const me = async () => ({ id: claims ?? identity, sender, relay: 'wss://relay.example.org', relayKey: '' });
    const store = async (data: GroupData) => void (it.kept = data);
    const groups = new Groups(EMPTY_GROUPS, store, me);
    const transport: GroupTransport = {
      async post(to: About, packet: Uint8Array, mark?: Mark) {
        assert.ok(isGroupPacket(packet));
        it.marks.push(mark);
        assert.equal(to.sender.length, 48);
        phones.get(to.id)!.queue.push(packet);
      },
      async signal(to: string, signal: GroupSignal) {
        // As it travels inside a chat's message.
        signals.push({ from: identity, to, signal: decodeGroup(JSON.parse(JSON.stringify(encodeGroup(signal))))! });
      },
    };
    const putBack = (data: GroupData) => {
      it.groups = new Groups(data, store, me);
      it.groups.onMessage(() => it.heard++);
    };
    const it: Phone = { name, identity, says: claims ?? identity, sender, groups, queue: [], transport, bundle: made?.bundle ?? '', known: new Set(), requests: new Set(), added: [], blocked: new Set(), heard: 0, marks: [], kept: EMPTY_GROUPS, putBack };
    if (made && !old) {
      // Each asked as who the phone says it is in its groups.
      const self = (me: string) => assert.equal(me, it.says);
      transport.contacts = {
        bundle: async (me) => (self(me), it.bundle),
        has: async (me, identity) => (self(me), it.known.has(identity) || it.requests.has(identity)),
        accepted: async (me, identity) => (self(me), it.known.has(identity)),
        blocked: async (me, identity) => (self(me), it.blocked.has(identity)),
        async add(me, about, key) {
          self(me);
          it.added.push({ about, key });
          it.requests.delete(about.id);
          it.known.add(about.id);
        },
      };
    }
    groups.onMessage(() => it.heard++);
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

test('each phone’s keys in a group are made new every week, and the others see the same members', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();
  const notes = (p: Phone) => p.groups.messages(id).filter((m) => m.note).map((m) => m.text);
  const before = [alice, bob, carol].map(notes);
  const due = Date.now() + RENEW_EVERY + 1000;

  // Not due yet: nothing goes.
  await bob.groups.renewKeys(bob.transport);
  assert.equal(alice.queue.length, 0);
  // Bob asks Alice only, who puts him in anew.
  await bob.groups.renewKeys(bob.transport, due);
  assert.equal(alice.queue.length, 1);
  assert.equal(carol.queue.length, 0);
  assert.ok(bob.groups.all()[0].renewing);
  await net.settle();
  assert.equal(bob.groups.all()[0].renewing, undefined);
  // Alice makes her own new, then Carol asks.
  await alice.groups.renewKeys(alice.transport, due);
  await carol.groups.renewKeys(carol.transport, due);
  await net.settle();
  assert.equal(carol.groups.all()[0].renewing, undefined);

  for (const p of [alice, bob, carol]) {
    const members = await p.groups.members(id);
    assert.deepEqual(members.map((m) => m.about?.id).sort(), [alice, bob, carol].map((q) => q.identity).sort());
  }
  assert.deepEqual([alice, bob, carol].map(notes), before, 'no one joined or left');
  await bob.groups.send(id, 'new keys', bob.transport);
  await alice.groups.send(id, 'mine too', alice.transport);
  await net.settle();
  assert.deepEqual(texts(carol, id), ['new keys', 'mine too']);
  assert.deepEqual(texts(bob, id), ['new keys', 'mine too']);
  // Not again until a week has gone by.
  for (const p of [alice, bob, carol]) await p.groups.renewKeys(p.transport);
  assert.deepEqual([alice, bob, carol].map((p) => p.queue.length), [0, 0, 0]);
});

test('a member put back from a backup after its group moved on is put in anew once it asks, and an admin asks nothing', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();
  const backup = bob.kept;
  // After the backup, Alice and Carol make their keys new: two commits, two epochs on.
  const due = Date.now() + RENEW_EVERY + 1000;
  await alice.groups.renewKeys(alice.transport, due);
  await carol.groups.renewKeys(carol.transport, due);
  await net.settle();
  // Bob's phone is put back as it was: what Carol writes now does not open there.
  bob.putBack(backup);
  await carol.groups.send(id, 'not for the old keys', carol.transport);
  await net.settle();
  assert.deepEqual(texts(bob, id), []);
  // Asked to after the restore, Bob asks Alice, from the epoch he has, and she puts him in anew.
  await bob.groups.renewAgain('group', true);
  await bob.groups.renewKeys(bob.transport);
  await net.settle();
  assert.equal(bob.groups.all()[0].renewing, undefined);
  await carol.groups.send(id, 'readable again', carol.transport);
  await bob.groups.send(id, 'back', bob.transport);
  await net.settle();
  assert.ok(texts(bob, id).includes('readable again'));
  assert.ok(texts(carol, id).includes('back'));
  // An admin makes no commit of its own for it, from an epoch that may be gone by.
  await alice.groups.renewAgain('group', true);
  await alice.groups.renewKeys(alice.transport);
  assert.deepEqual([bob.queue.length, carol.queue.length], [0, 0]);
});

test('a member put in anew before its welcome comes keeps what is written meanwhile', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();
  const notes = bob.groups.messages(id).filter((m) => m.note).length;

  await bob.groups.renewKeys(bob.transport, Date.now() + RENEW_EVERY + 1000);
  await net.settle([alice, carol]);
  await carol.groups.send(id, 'meanwhile', carol.transport);
  // Bob's queue has the welcome, the commit, then Carol's message: the welcome comes last.
  assert.equal(bob.queue.length, 3);
  bob.queue.push(bob.queue.shift()!);
  await net.settle();
  assert.equal(bob.groups.list()[0].status, 'in');
  assert.deepEqual(texts(bob, id), ['meanwhile']);
  assert.equal(bob.groups.messages(id).filter((m) => m.note).length, notes, 'he never left');
  await bob.groups.send(id, 'back', bob.transport);
  await net.settle();
  assert.deepEqual(texts(alice, id), ['meanwhile', 'back']);
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
  await bob.groups.call(id, { id: callId, kind: 'start', at: Date.now(), video: false }, bob.transport);
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

// A group Alice made with Bob and Carol, each from an account: what members ask each other for
// their contact links in.
async function trio(net: ReturnType<typeof network>, carolIs: { old?: boolean } = {}) {
  const alice = net.phone('alice', await account());
  const bob = net.phone('bob', await account());
  const carol = net.phone('carol', await account(), carolIs);
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();
  return { alice, bob, carol, id };
}

const info = (p: Phone, id: string) => p.groups.list().find((g) => g.id === id)!;
const notesOf = (p: Phone, id: string) => p.groups.messages(id).filter((m) => m.note).map((m) => m.text);
const leavesOf = async (p: Phone, id: string, of: Phone) => (await p.groups.members(id)).filter((m) => m.about?.id === of.identity);
// What Bob or Carol is called on the others' phones, for the notes.
const named = (...phones: Phone[]) => (identity: string) => phones.find((p) => p.identity === identity)?.name ?? 'someone';
// What a changed Erevos could send whenever it likes: its keys to `to`, an ask, or with `back` an answer.
const sendContact = async (from: Phone, id: string, to: Phone, back: boolean) => {
  const send = (from.groups as unknown as { sendContact(id: string, leaves: GroupMember[], to: string, back: boolean, transport: GroupTransport, me: string): Promise<void> }).sendContact;
  await send.call(from.groups, id, await leavesOf(from, id, to), to.identity, back, from.transport, from.says);
};

test('a member asked for its contact link is the only one who hears of it', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { alice, bob, carol, id } = await trio(net);
  const alicesBefore = alice.groups.messages(id).length;
  const heard = carol.heard;

  await bob.groups.askContact(id, carol.identity, bob.transport);
  assert.deepEqual([alice.queue.length, bob.queue.length, carol.queue.length], [0, 0, 1], 'one packet, to Carol only');
  await net.settle();

  const carols = info(carol, id);
  assert.deepEqual(carols.asks.map((a) => a.id), [bob.identity]);
  assert.equal(carols.unread, 1);
  assert.equal(carol.heard, heard + 1);
  assert.equal(notesOf(carol, id).at(-1), `${bob.identity}|asks link`);
  assert.equal(noteText(notesOf(carol, id).at(-1)!, named(bob)), 'bob asked for your contact link.');
  assert.deepEqual(info(bob, id).wants.map((w) => w.id), [carol.identity]);
  assert.equal(noteText(notesOf(bob, id).at(-1)!, named(carol)), 'You asked carol for their contact link.');
  assert.equal(alice.groups.messages(id).length, alicesBefore, 'Alice keeps nothing of it');
  assert.equal(info(alice, id).asks.length + info(alice, id).wants.length, 0);
  // Read, the group has nothing unread, but the ask still waits.
  await carol.groups.markRead(id);
  assert.equal(info(carol, id).unread, 0);
  assert.equal(info(carol, id).asks.length, 1);

  // The others skipped a generation of Bob's, and still read what he writes next.
  await bob.groups.send(id, 'after', bob.transport);
  await net.settle();
  assert.deepEqual(texts(alice, id), ['after']);
  assert.deepEqual(texts(carol, id), ['after']);
});

test('Send adds both, each reached where the group says', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  bob.marks.length = 0;
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  // The ask shows as unread on Carol's phone, so its notice counts it; the answer counts none.
  assert.deepEqual(bob.marks, ['message']);

  carol.marks.length = 0;
  await carol.groups.answerContact(id, bob.identity, carol.transport);
  await net.settle();
  assert.deepEqual(carol.marks, ['quiet']);
  assert.equal(bob.added.length, 1);
  assert.equal(carol.added.length, 1);
  const [toCarol] = bob.added;
  assert.deepEqual([toCarol.about.id, toCarol.about.sender, toCarol.about.relay, toCarol.key], [carol.identity, carol.sender, 'wss://relay.example.org', carol.bundle]);
  const [toBob] = carol.added;
  assert.deepEqual([toBob.about.id, toBob.about.sender, toBob.about.relay, toBob.key], [bob.identity, bob.sender, 'wss://relay.example.org', bob.bundle]);
  for (const p of [bob, carol]) assert.deepEqual([info(p, id).wants, info(p, id).asks], [[], []]);
  assert.equal(noteText(notesOf(carol, id).at(-1)!, named(bob)), 'You sent bob your contact link. You are each other’s contacts now.');
  assert.equal(noteText(notesOf(bob, id).at(-1)!, named(carol)), 'carol sent their contact link. You are each other’s contacts now.');
});

test('a contact deleted before the next look at the relay takes its asks for a contact link with it, both ways', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  assert.equal(info(carol, id).asks.length, 1);
  assert.equal(info(bob, id).wants.length, 1);
  // Carol deleted Bob, and Bob's phone Carol, as a contact, before either looked at the relay again.
  await carol.groups.contactRemoved(bob.identity);
  await bob.groups.contactRemoved(carol.identity);
  assert.deepEqual([info(carol, id).asks, info(bob, id).wants], [[], []]);
  // An ask from another member stays.
  await carol.groups.contactRemoved('00'.repeat(32));
  assert.equal(carol.groups.all().length, 1);
});

test('a member blocked here asks for nothing, and nothing adds them, though they were asked from here', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  // Carol blocked Bob: his ask is dropped, and shows nowhere.
  carol.blocked.add(bob.identity);
  const heard = carol.heard;
  const notes = notesOf(carol, id).length;
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  assert.deepEqual([info(carol, id).asks, carol.heard, notesOf(carol, id).length], [[], heard, notes]);
  // Bob, who asked her, blocks her since: her ask, which would have added her at once, adds no one.
  carol.blocked.delete(bob.identity);
  bob.blocked.add(carol.identity);
  await carol.groups.askContact(id, bob.identity, carol.transport);
  await net.settle();
  assert.deepEqual([bob.added.length, carol.added.length, info(bob, id).asks], [0, 0, []]);
});

test('an admin whose new keys say where it reads now is followed; one whose new keys would say it is someone else is refused', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice');
  const bob = net.phone('bob');
  const carol = net.phone('carol');
  const id = await alice.groups.create('g', [bob.identity, carol.identity], alice.transport);
  await net.settle();
  type Me = { id: string; sender: string; relay: string; relayKey: string };
  const admin = alice.groups as unknown as { me: () => Promise<Me> };
  const was = admin.me;
  const adminOn = async (p: Phone) => (await p.groups.members(id)).find((m) => m.leaf === 0)!.about;
  // Alice's phone says where she reads now, as herself: her members write there.
  const moved = toHex(randomBytes(24));
  admin.me = async () => ({ ...(await was()), sender: moved });
  const due = Date.now() + RENEW_EVERY + 1000;
  await alice.groups.renewKeys(alice.transport, due);
  await net.settle();
  for (const p of [bob, carol]) assert.deepEqual([(await adminOn(p))?.id, (await adminOn(p))?.sender], [alice.identity, moved]);
  // Then as someone else: refused, and kept as it was.
  admin.me = async () => ({ ...(await was()), id: toHex(randomBytes(32)), sender: toHex(randomBytes(24)) });
  await alice.groups.renewKeys(alice.transport, due + RENEW_EVERY + 1000);
  await net.settle();
  for (const p of [bob, carol]) assert.deepEqual([(await adminOn(p))?.id, (await adminOn(p))?.sender], [alice.identity, moved]);
});

test('Don’t tells the asker nothing, and keeps their asks quiet for a while', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();

  await carol.groups.declineContact(id, bob.identity);
  assert.equal(bob.queue.length, 0, 'nothing goes to Bob');
  assert.deepEqual(info(carol, id).asks, []);
  assert.equal(carol.groups.all()[0].asks?.[0].key, '', 'his keys are gone');
  await net.settle();
  assert.deepEqual(info(bob, id).wants.map((w) => w.id), [carol.identity], 'Bob still sees Asked');

  // Again too soon: nothing goes.
  await bob.groups.askContact(id, carol.identity, bob.transport);
  assert.equal(carol.queue.length, 0);
  // After a week it goes, and Carol's phone keeps it quiet.
  const notes = notesOf(carol, id).length;
  const heard = carol.heard;
  const week = Date.now() + ASK_AGAIN + 1000;
  await bob.groups.askContact(id, carol.identity, bob.transport, week);
  assert.equal(carol.queue.length, 1);
  await net.settle();
  assert.deepEqual([info(carol, id).asks, notesOf(carol, id).length, carol.heard], [[], notes, heard]);

  // Once ASK_KEPT has gone by since the Don't, an ask shows again.
  mock.timers.enable({ apis: ['Date'], now: Date.now() + ASK_KEPT + 1000 });
  try {
    await bob.groups.askContact(id, carol.identity, bob.transport, Date.now());
    await net.settle();
    assert.deepEqual(info(carol, id).asks.map((a) => a.id), [bob.identity]);
    assert.equal(carol.heard, heard + 1);
  } finally {
    mock.timers.reset();
  }
});

test('asking again while the first ask waits shows nothing new', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  const [first] = info(carol, id).asks;
  const notes = notesOf(carol, id).length;
  const heard = carol.heard;

  await bob.groups.askContact(id, carol.identity, bob.transport, Date.now() + ASK_AGAIN + 1000);
  await net.settle();
  assert.deepEqual(info(carol, id).asks, [first]);
  assert.deepEqual([notesOf(carol, id).length, carol.heard, info(carol, id).unread], [notes, heard, 1]);
  // Send still adds him.
  await carol.groups.answerContact(id, bob.identity, carol.transport);
  await net.settle();
  assert.deepEqual([bob.added.length, carol.added.length], [1, 1]);
});

test('an ask from a member who is a contact already shows nothing, and gets nothing back', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  carol.known.add(bob.identity);
  const notes = notesOf(carol, id).length;
  const heard = carol.heard;

  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  assert.deepEqual([info(carol, id).asks, info(carol, id).unread, notesOf(carol, id).length, carol.heard], [[], 0, notes, heard]);
  assert.deepEqual([bob.added, carol.added], [[], []]);
  assert.deepEqual(info(bob, id).wants.map((w) => w.id), [carol.identity], 'Bob sees only Asked');
});

test('keys that are not the sender’s own are dropped', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { alice, bob, carol, id } = await trio(net);
  bob.bundle = alice.bundle;
  const notes = notesOf(carol, id).length;
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  assert.deepEqual([info(carol, id).asks, notesOf(carol, id).length, carol.added], [[], notes, []]);
});

test('an answer nobody asked for adds no one and shows nothing', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  const notes = notesOf(carol, id).length;
  await sendContact(bob, id, carol, true);
  assert.equal(carol.queue.length, 1);
  await net.settle();
  assert.deepEqual([carol.added, info(carol, id).asks, notesOf(carol, id).length], [[], [], notes]);
});

test('two members who ask each other at once add each other once', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await carol.groups.askContact(id, bob.identity, carol.transport);
  await net.settle();
  assert.deepEqual([bob.added.map((a) => a.about.id), carol.added.map((a) => a.about.id)], [[carol.identity], [bob.identity]]);
  for (const p of [bob, carol]) assert.deepEqual([info(p, id).wants, info(p, id).asks], [[], []]);
});

test('a member who said Don’t can ask after all, and is answered', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  await carol.groups.declineContact(id, bob.identity);

  // Bob's phone still takes her link: it answers with his, and adds her.
  await carol.groups.askContact(id, bob.identity, carol.transport);
  await net.settle();
  assert.deepEqual([bob.added.map((a) => a.about.id), carol.added.map((a) => a.about.id)], [[carol.identity], [bob.identity]]);
  assert.deepEqual(info(bob, id).asks, [], 'no card for Bob');
  assert.equal(noteText(notesOf(bob, id).at(-1)!, named(carol)), 'carol sent their contact link. You are each other’s contacts now.');
});

test('a member who leaves takes its asks with it', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { alice, bob, carol, id } = await trio(net);
  await carol.groups.askContact(id, bob.identity, carol.transport);
  await net.settle();
  assert.equal(info(bob, id).asks.length, 1);

  const leaf = (await leavesOf(alice, id, carol))[0].leaf;
  await alice.groups.remove(id, leaf, alice.transport);
  await net.settle();
  assert.deepEqual(info(bob, id).asks, []);
  assert.equal(bob.groups.all()[0].asks, undefined, 'nothing kept of it');
  await assert.rejects(bob.groups.answerContact(id, carol.identity, bob.transport), /They are not in this group any more\./);
  assert.deepEqual(bob.added, []);
  // Out of the group, Carol's phone keeps no asks either.
  assert.equal(carol.groups.all()[0].wants, undefined);
});

test('a member taken out before its phone heard of it asks for nothing', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { alice, bob, carol, id } = await trio(net);
  const heard = bob.heard;
  await alice.groups.remove(id, (await leavesOf(alice, id, carol))[0].leaf, alice.transport);
  // Carol's phone has not taken the commit yet: her ask comes after it, from the epoch before.
  await carol.groups.askContact(id, bob.identity, carol.transport);
  assert.equal(bob.queue.length, 2);
  await net.settle();
  assert.deepEqual([info(bob, id).asks, info(bob, id).unread, bob.heard], [[], 0, heard]);
  assert.equal(noteText(notesOf(bob, id).at(-1)!, named(carol)), 'carol left.');
  assert.ok(!notesOf(bob, id).some((n) => n.endsWith('|asks link')));
});

test('contacts made in another group leave no ask behind to add them again', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { alice, bob, carol, id } = await trio(net);
  const other = await alice.groups.create('h', [bob.identity, carol.identity], alice.transport);
  await net.settle();

  // Bob asks Carol in one group; before she answers, she asks him in the other, and he sends.
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  await carol.groups.askContact(other, bob.identity, carol.transport);
  await net.settle();
  await bob.groups.answerContact(other, carol.identity, bob.transport);
  await net.settle();
  assert.deepEqual([bob.added.length, carol.added.length], [1, 1]);
  for (const p of [bob, carol]) for (const g of [id, other]) assert.deepEqual([info(p, g).wants, info(p, g).asks], [[], []]);

  // Bob deletes Carol's chat, or moves it into hidden chats. Neither her Send in the first group
  // nor an answer a changed Erevos sends there adds her to his space again.
  bob.known.delete(carol.identity);
  await carol.groups.answerContact(id, bob.identity, carol.transport);
  assert.equal(bob.queue.length, 0, 'nothing goes');
  await sendContact(carol, id, bob, true);
  await net.settle();
  assert.deepEqual([bob.added.length, bob.known.has(carol.identity)], [1, false]);
});

test('a member who became a contact some other way is not added again by an old ask', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();

  // They scan each other's codes: the next look lets go of the ask, both ways.
  bob.known.add(carol.identity);
  carol.known.add(bob.identity);
  for (const p of [bob, carol]) await p.groups.flush(p.transport);
  assert.deepEqual([info(bob, id).wants, info(carol, id).asks, info(carol, id).unread], [[], [], 0]);

  // Bob deletes her chat; what Carol, or a changed Erevos of hers, sends after adds nothing.
  bob.known.delete(carol.identity);
  await carol.groups.answerContact(id, bob.identity, carol.transport);
  await sendContact(carol, id, bob, true);
  await net.settle();
  assert.deepEqual([bob.added, carol.added], [[], []]);
});

test('an answer from a member who is a contact now adds nothing, even before a look', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  bob.known.add(carol.identity);
  const notes = notesOf(bob, id).length;
  const heard = bob.heard;

  // Her Send, as a contact of hers already, sends nothing, and drops the card.
  carol.known.add(bob.identity);
  await carol.groups.answerContact(id, bob.identity, carol.transport);
  assert.deepEqual([bob.queue.length, info(carol, id).asks], [0, []]);
  // An answer from a changed Erevos lets go of Bob's ask, and nothing shows.
  await sendContact(carol, id, bob, true);
  await net.settle();
  assert.deepEqual([info(bob, id).wants, notesOf(bob, id).length, bob.heard, bob.added], [[], notes, heard, []]);
  bob.known.delete(carol.identity);
  await sendContact(carol, id, bob, true);
  await net.settle();
  assert.deepEqual(bob.added, []);
});

test('an answer that comes after the member’s first packet still accepts them', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  await net.settle();
  await carol.groups.answerContact(id, bob.identity, carol.transport);
  // Her chat's first packet comes first: a message request, for which a look keeps the ask.
  bob.requests.add(carol.identity);
  await bob.groups.flush(bob.transport);
  assert.deepEqual(info(bob, id).wants.map((w) => w.id), [carol.identity]);
  await net.settle();
  assert.deepEqual([bob.added.map((a) => a.about.id), bob.requests.size, bob.known.has(carol.identity)], [[carol.identity], 0, true]);
  assert.equal(noteText(notesOf(bob, id).at(-1)!, named(carol)), 'carol sent their contact link. You are each other’s contacts now.');
});

test('a phone does not join a group whose admin says it is someone else', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice', await account());
  const bob = net.phone('bob', await account());
  // Mallory's phone says Bob's id of itself, and makes a group with both.
  const mallory = net.phone('mallory', await account(), { claims: bob.identity });
  const id = await mallory.groups.create('g', [alice.identity, bob.identity], mallory.transport);
  await net.settle();
  for (const p of [alice, bob]) {
    assert.deepEqual(p.groups.list(), []);
    assert.deepEqual(await p.groups.members(id), []);
  }
});

test('two leaves that say one id are neither asked nor heard', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { alice, bob, carol, id } = await trio(net);
  await carol.groups.askContact(id, bob.identity, carol.transport);
  await net.settle();

  // Eve says Bob's id of herself, with his public keys, as any contact of his could. An admin's
  // Erevos from before it checked whose key package a contact gives lets her in.
  const eve = net.phone('eve', await account(), { claims: bob.identity });
  eve.bundle = bob.bundle;
  setCore({ ...real!, groupEpoch: undefined });
  try {
    await alice.groups.add(id, [eve.identity], alice.transport);
    await net.settle();
  } finally {
    setCore(real);
  }
  assert.equal((await leavesOf(carol, id, bob)).length, 2);

  // Asking Bob goes to neither of them.
  const later = Date.now() + ASK_AGAIN + 1000;
  for (const [p, when] of [[carol, later], [alice, Date.now()]] as const) {
    await assert.rejects(p.groups.askContact(id, bob.identity, p.transport, when), /More than one member of this group shows this key/);
  }
  assert.deepEqual([bob.queue.length, eve.queue.length], [0, 0]);
  // Eve answers Carol's ask before Bob does, and asks her too; then Bob sends his: Carol takes none of it.
  await sendContact(eve, id, carol, true);
  await eve.groups.askContact(id, carol.identity, eve.transport);
  await bob.groups.answerContact(id, carol.identity, bob.transport);
  const notes = notesOf(carol, id).length;
  await net.settle();
  assert.deepEqual([carol.added, info(carol, id).asks, notesOf(carol, id).length], [[], [], notes]);
});

test('a linked device asks for no contact link, and no one asks a contact', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net);

  // On a linked device, the phone that holds the account does it.
  bob.groups.useLink({ through: () => true, ask: async () => assert.fail('nothing asked of the phone'), members: () => [], took: () => undefined });
  for (const call of [
    bob.groups.askContact(id, carol.identity, bob.transport),
    bob.groups.answerContact(id, carol.identity, bob.transport),
    bob.groups.declineContact(id, carol.identity),
  ]) {
    await assert.rejects(call, /Ask for contact links on the phone that holds this account\./);
  }
  bob.groups.useLink(null);
  assert.equal(carol.queue.length, 0);

  // A contact already: no-op.
  bob.known.add(carol.identity);
  await bob.groups.askContact(id, carol.identity, bob.transport);
  assert.deepEqual([carol.queue.length, info(bob, id).wants], [0, []]);
});

test('an older Erevos drops an ask for its contact link, and reads on', { skip: !existsSync(built) }, async () => {
  const net = network();
  const { bob, carol, id } = await trio(net, { old: true });
  const notes = notesOf(carol, id).length;
  await bob.groups.askContact(id, carol.identity, bob.transport);
  assert.equal(carol.queue.length, 1);
  await net.settle();
  assert.deepEqual([info(carol, id).asks, notesOf(carol, id).length], [[], notes]);
  await bob.groups.send(id, 'still here', bob.transport);
  await net.settle();
  assert.deepEqual(texts(carol, id), ['still here']);
});

test('a contact whose key package says someone else does not join', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone('alice', await account());
  const bob = net.phone('bob', await account());
  const id = await alice.groups.create('g', [bob.identity], alice.transport);
  await net.settle();

  // Eve's phone says Bob's id of itself.
  const eve = net.phone('eve', await account(), { claims: bob.identity });
  await alice.groups.add(id, [eve.identity], alice.transport);
  await net.settle();
  assert.deepEqual(info(alice, id).asked, [eve.identity], 'still asked');
  assert.equal((await alice.groups.members(id)).length, 2);
  assert.equal(eve.groups.list().length, 0);

  const dave = net.phone('dave', await account());
  await alice.groups.add(id, [dave.identity], alice.transport);
  await net.settle();
  assert.deepEqual((await alice.groups.members(id)).map((m) => m.about?.id).sort(), [alice, bob, dave].map((p) => p.identity).sort());
});

test('what a group keeps of contact asks is read back checked', () => {
  const hex = (c: string) => c.repeat(64);
  const key = 'A'.repeat(1795);
  const group = {
    id: 'ab'.repeat(16),
    wants: [{ id: hex('1'), at: 5 }, { id: 'not hex', at: 5 }, { id: hex('2'), at: -1 }, { id: hex('3') }],
    asks: [
      { id: hex('4'), at: 6, key },
      { id: hex('5'), at: 7, key: '' },
      { id: hex('6'), at: 8, key: 'not+base64url' },
      { id: hex('7'), at: 9, key: 'A'.repeat(MAX_CONTACT_KEY + 1) },
      { id: hex('8'), at: 10, key: 'A'.repeat(MAX_CONTACT_KEY) },
    ],
  };
  const kept = checkedGroup(group)!;
  assert.deepEqual(kept.wants, [{ id: hex('1'), at: 5 }]);
  assert.deepEqual(kept.asks?.map((a) => a.id), [hex('4'), hex('5'), hex('8')]);
  // None kept when there are none, and no more than a hundred of each.
  const none = checkedGroup({ id: 'ab'.repeat(16) })!;
  assert.ok(!('wants' in none) && !('asks' in none));
  const many = Array.from({ length: 150 }, (_, i) => ({ id: i.toString(16).padStart(64, '0'), at: i, key }));
  const capped = checkedGroup({ id: 'ab'.repeat(16), wants: many, asks: many })!;
  assert.deepEqual([capped.wants?.length, capped.asks?.length, capped.asks?.[0].at], [100, 100, 50]);
  // The limits hold together: an ask lives longer than the wait to ask again, an ask from here longer than one there.
  assert.ok(ASK_AGAIN < ASK_KEPT && ASK_KEPT < WANT_KEPT && MAX_ASKS <= 100);
});
