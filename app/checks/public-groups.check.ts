// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Public groups (lib/public-groups.ts, lib/public-rules.ts, docs/public-groups.md): phones with the
// real core built to WebAssembly by checks/build-core.mjs, as in groups.check.ts, each with its own
// queue on one of two real relays (crates/erevos-relay), so requests to a door, welcomes and group
// messages go as on the phones, two-hop where the relays differ. A phone that is off is one whose
// queue is not looked at. Skipped, with a note, without the core or the relay.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

import { ready, relayNote, startRelay } from './real-relay';
import * as core from '../lib/core';
import { setCore, type Core } from '../lib/core';
import { fromBase64, fromHex, randomBytes, toHex, utf8Encode } from '../lib/crypto';
import { fromBase64Url, toBase64Url } from '../lib/e2e';
import { decodeGroup, encodeGroup, type GroupSignal } from '../lib/group-signal';
import type { GroupContacts } from '../lib/group-contacts';
import { noteText, RENEW_EVERY, type GroupMember, type GroupTransport } from '../lib/groups';
import { setLang } from '../lib/i18n';
import { relayDoors } from '../lib/public-doors';
import { PublicGroups } from '../lib/public-groups';
import {
  decodeAnswer,
  decodeMod,
  decodeRules,
  encodeAnswer,
  encodeMod,
  encodeRules,
  isAnswer,
  joinLink,
  laterMark,
  MAX_RULES,
  mergeMarks,
  moderated,
  NO_RULES,
  parseJoinLink,
  publicName,
  type JoinLink,
  type Mark,
} from '../lib/public-rules';
import { createQueue, receiveMessage, relayKey, sendMessage, type QueueIds, type Relay } from '../lib/relay';
import { contactTarget } from '../lib/space-chats';
import { ALWAYS } from '../lock/chat-notify';
import { EMPTY_GROUPS, type About, type GroupData } from '../lock/group-data';
import { DEFAULT_LOOK } from '../theme/look';
import { EMPTY_PUBLIC, loadPublicGroupData, savePublicGroupData, type PublicData } from '../lock/public-group-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
if (existsSync(built)) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the public group checks: build the core first with node checks/build-core.mjs');
}
relayNote('the public group checks');
const live = { skip: !existsSync(built) || !ready };

type Phone = {
  name: string;
  identity: string;
  groups: PublicGroups;
  own: Relay;
  queue: QueueIds;
  transport: GroupTransport;
  data: GroupData;
  pub: PublicData;
};

let one = '';
let two = '';

before(async () => {
  if (!ready) return;
  one = await startRelay(true);
  two = await startRelay(true);
});

// Phones, each on a relay, and chats' signals between them in memory, for private groups.
function network() {
  const phones: Phone[] = [];
  const signals: { from: string; to: string; signal: GroupSignal }[] = [];
  const phone = async (name: string, relay: string): Promise<Phone> => {
    const own = { url: relay };
    const queue = await createQueue(own);
    const key = toBase64Url((await relayKey(own))!);
    const identity = toHex(randomBytes(32));
    const me = async () => ({ id: identity, sender: toHex(queue.senderId), relay, relayKey: key });
    const it = { name, identity, own, queue, data: EMPTY_GROUPS, pub: EMPTY_PUBLIC } as Phone;
    const doors = relayDoors(async () => ({ own, sends: own, relayKey: key }));
    it.groups = new PublicGroups(EMPTY_GROUPS, async (data) => void (it.data = data), me, EMPTY_PUBLIC, async (pub) => void (it.pub = pub), doors);
    it.transport = {
      async post(to: About, packet: Uint8Array) {
        await sendMessage(contactTarget(own, to), fromHex(to.sender), packet);
      },
      async signal(to: string, signal: GroupSignal) {
        signals.push({ from: identity, to, signal: decodeGroup(JSON.parse(JSON.stringify(encodeGroup(signal))))! });
      },
    };
    phones.push(it);
    return it;
  };
  // Hands on what waits for the phones that are on: chats' signals, each queue in turn, and the
  // owners' doors, until nothing waits.
  const settle = async (on: Phone[] = phones) => {
    for (let round = 0; round < 30; round++) {
      let moved = false;
      for (let at = 0; at < signals.length; ) {
        const { from, to, signal } = signals[at];
        const target = on.find((p) => p.identity === to);
        if (!target) {
          at++;
          continue;
        }
        signals.splice(at, 1);
        await target.groups.signal(from, signal, false, target.transport);
        moved = true;
      }
      for (const p of on) {
        for (;;) {
          const packet = await receiveMessage(p.own, p.queue.recipientId);
          if (!packet) break;
          await p.groups.receive(packet, p.transport);
          moved = true;
        }
        const before = JSON.stringify(p.pub);
        moved = (await p.groups.lookAtDoors(p.transport)) > 0 || JSON.stringify(p.pub) !== before || moved;
      }
      if (!moved) return;
    }
  };
  return { phone, settle };
}

const texts = (p: Phone, id: string) => p.groups.messages(id).filter((m) => !m.note).map((m) => m.text);
const notes = (p: Phone, id: string) => p.groups.messages(id).filter((m) => m.note).map((m) => noteText(m.text, (key) => p.groups.nameIn(id, key)));
const linkOf = (p: Phone, id: string) => parseJoinLink(p.groups.publicInfo(id)!.link)!;
const keyOf = async (p: Phone, id: string, name: string) => (await p.groups.publicMembers(id)).find((m) => m.name === name)!.key;
const status = (p: Phone, id: string) => p.groups.list().find((g) => g.id === id)?.status;

// A group Alice owns, on the first relay, with the others in it, each called by their name.
async function club(net: ReturnType<typeof network>, others: Phone[], approve = false) {
  const alice = await net.phone('Alice', one);
  const id = await alice.groups.createPublic('Club', 'Alice', false, alice.transport);
  for (const p of others) {
    await p.groups.ask(linkOf(alice, id), p.name);
    await net.settle();
    assert.equal(status(p, id), 'in', `${p.name} is in`);
  }
  if (approve) {
    await alice.groups.setApprove(id, true, alice.transport);
    await net.settle();
  }
  return { alice, id };
}

// A group message sealed with a copy of a member's state, as a phone that does not keep the rules
// would send it, posted to each of `to`.
async function forge(from: Phone, id: string, said: Uint8Array, to: Phone[]) {
  const sealed = await core.group.seal(fromBase64(from.data.state), fromHex(id), said);
  for (const p of to) {
    const about = (await from.groups.members(id)).find((m) => m.about?.sender === toHex(p.queue.senderId))!.about!;
    const inner = await core.relaySeal(fromBase64Url(about.seal), new Uint8Array(24), sealed.message);
    await sendMessage(contactTarget(from.own, about), fromHex(about.sender), Uint8Array.from([1, 3, ...inner]));
  }
}

test('anyone with the link joins while the owner is away, and reads only from then on', live, async () => {
  const net = network();
  const alice = await net.phone('Alice', one);
  const bob = await net.phone('Bob', two);
  const id = await alice.groups.createPublic('  Λέσχη ', 'Alice', false, alice.transport);
  const info = alice.groups.publicInfo(id)!;
  assert.equal(info.owner, true);
  assert.equal(info.admin, true);
  const link = parseJoinLink(info.link)!;
  assert.equal(link.group, id);
  assert.equal(link.name, 'Λέσχη');
  assert.equal(link.relay, one);
  await alice.groups.send(id, 'before anyone', alice.transport);

  // Bob is on the other relay: his request goes through his own, two-hop.
  await bob.groups.ask(link, 'Bob');
  assert.equal(bob.groups.asking().length, 1);
  // Alice's phone is off: the request waits at the door.
  await net.settle([bob]);
  assert.equal(bob.groups.list().length, 0);
  await net.settle();
  const [joined] = bob.groups.list();
  assert.deepEqual([joined.id, joined.name, joined.status, joined.admin], [id, 'Λέσχη', 'in', false]);
  assert.equal(bob.groups.asking().length, 0);
  assert.deepEqual(texts(bob, id), [], 'nothing from before');

  await alice.groups.send(id, 'welcome', alice.transport);
  await bob.groups.send(id, 'thanks', bob.transport);
  await net.settle();
  assert.deepEqual(texts(alice, id), ['before anyone', 'welcome', 'thanks']);
  assert.deepEqual(texts(bob, id), ['thanks', 'welcome']);

  const members = await alice.groups.publicMembers(id);
  assert.deepEqual(members.map((m) => [m.name, m.role, m.me]), [['Alice', 'owner', true], ['Bob', 'member', false]]);
  const bobKey = members[1].key;
  assert.equal(alice.groups.messages(id).find((m) => m.text === 'thanks')?.from, bobKey);
  assert.equal(alice.groups.nameIn(id, bobKey), `Bob · ${bobKey.slice(0, 4)}`);
  assert.equal(alice.groups.nameOf(bobKey), `Bob · ${bobKey.slice(0, 4)}`, 'as the home screen names him');
  assert.equal(alice.groups.nameOf(bob.identity), null);
  assert.deepEqual(notes(alice, id), ['You made the group.', `Bob · ${bobKey.slice(0, 4)} joined.`]);
  assert.deepEqual(notes(bob, id), ['You joined the group.']);
  // Bob knows the group by the key made for it, not by who he is in his chats.
  assert.notEqual(bobKey, bob.identity);
  assert.ok(!JSON.stringify([alice.pub, alice.data.groups]).includes(bob.identity));
  assert.ok(!JSON.stringify([bob.pub, bob.data.groups]).includes(alice.identity));
  assert.ok(!info.link.includes(alice.identity));
  assert.equal(bob.groups.publicInfo(id)!.link, info.link, 'every member has the link');
  // Asking again while in says so.
  await assert.rejects(bob.groups.ask(link, 'Bob'), /already/);
});

test('one whose phone forgot the group and asks again keeps the old seat until the new one is heard from', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const { alice, id } = await club(net, [bob]);
  const old = await keyOf(alice, id, 'Bob');
  await bob.groups.forget(id);
  await bob.groups.ask(linkOf(alice, id), 'Bob');
  await net.settle();
  assert.equal(status(bob, id), 'in');
  // The new seat only says it is the same phone: the old one stays, as any member could say
  // another's, to have them taken out.
  let members = await alice.groups.publicMembers(id);
  assert.equal(members.length, 3);
  assert.ok(members.some((m) => m.key === old));
  // Heard from the new seat, which only the phone whose welcome it was can be, the old one goes.
  await bob.groups.send(id, 'Back', bob.transport);
  await net.settle();
  members = await alice.groups.publicMembers(id);
  assert.equal(members.length, 2);
  assert.ok(!members.some((m) => m.key === old));
  assert.deepEqual(texts(alice, id), ['Back']);
});

test('with approval on, an admin lets in who asks, and the owner\'s phone does it when it hears', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const { alice, id } = await club(net, [bob]);
  const bobKey = await keyOf(alice, id, 'Bob');
  await alice.groups.setAdmin(id, bobKey, true, alice.transport);
  await alice.groups.setApprove(id, true, alice.transport);
  await net.settle();
  assert.equal(bob.groups.publicInfo(id)!.admin, true);
  assert.equal(bob.groups.publicInfo(id)!.approve, true);
  assert.ok(notes(bob, id).includes(`Bob · ${bobKey.slice(0, 4)} is an admin.`));

  const carol = await net.phone('Carol', one);
  await carol.groups.ask(linkOf(bob, id), 'Carol');
  await net.settle();
  assert.equal(carol.groups.list().length, 0, 'waits for an admin');
  const [waiting] = bob.groups.publicInfo(id)!.waiting;
  assert.equal(waiting.name, 'Carol');
  assert.deepEqual(alice.groups.publicInfo(id)!.waiting.map((w) => w.name), ['Carol']);

  // Bob says yes while Alice's phone is off: Carol is let in once it is on.
  await bob.groups.letIn(id, waiting.key, true, bob.transport);
  await net.settle([bob, carol]);
  assert.equal(carol.groups.list().length, 0);
  await net.settle();
  assert.equal(status(carol, id), 'in');
  assert.deepEqual(bob.groups.publicInfo(id)!.waiting, []);
  assert.deepEqual(alice.groups.publicInfo(id)!.waiting, []);

  // Dave is turned away.
  const dave = await net.phone('Dave', two);
  await dave.groups.ask(linkOf(alice, id), 'Dave');
  await net.settle();
  await bob.groups.letIn(id, bob.groups.publicInfo(id)!.waiting[0].key, false, bob.transport);
  await net.settle();
  assert.equal(status(dave, id), 'out');
  assert.deepEqual(notes(dave, id), ['Your request to join was turned down.']);
  assert.equal((await alice.groups.publicMembers(id)).length, 3);
  // Carol is no admin.
  await assert.rejects(carol.groups.letIn(id, waiting.key, true, carol.transport), /admins/);
});

test('admins mute, delete for everyone, take out and ban, and a ban turns the same phone away', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const carol = await net.phone('Carol', one);
  const dave = await net.phone('Dave', two);
  const { alice, id } = await club(net, [bob, carol, dave]);
  const [aliceKey, bobKey, carolKey, daveKey] = await Promise.all(['Alice', 'Bob', 'Carol', 'Dave'].map((n) => keyOf(alice, id, n)));
  await alice.groups.setAdmin(id, bobKey, true, alice.transport);
  await net.settle();

  // Muted, Carol's phone does not send, and what a phone sends anyway shows nowhere.
  await bob.groups.mute(id, carolKey, true, bob.transport);
  await net.settle();
  assert.equal(carol.groups.publicInfo(id)!.muted, true);
  assert.equal((await dave.groups.publicMembers(id)).find((m) => m.key === carolKey)?.muted, true);
  await assert.rejects(carol.groups.send(id, 'let me speak', carol.transport), /muted/);
  assert.ok(notes(alice, id).includes(`Carol · ${carolKey.slice(0, 4)} was muted.`));
  // An admin does not moderate the owner, nor another admin.
  await assert.rejects(bob.groups.mute(id, aliceKey, true, bob.transport), /owner/);
  await bob.groups.mute(id, carolKey, false, bob.transport);
  await net.settle();
  assert.ok(notes(dave, id).includes(`Carol · ${carolKey.slice(0, 4)} can write again.`));
  await carol.groups.send(id, 'thank you', carol.transport);
  await net.settle();
  assert.ok(texts(dave, id).includes('thank you'));
  // Muted again, what her phone would send anyway shows nowhere. (Sent from a copy of her state:
  // her own phone sends nothing in this group after it.)
  await bob.groups.mute(id, carolKey, true, bob.transport);
  await net.settle();
  await forge(carol, id, utf8Encode(JSON.stringify({ t: 'text', text: 'sent anyway', tag: 'a'.repeat(12) })), [alice, dave]);
  await net.settle([alice, dave]);
  assert.ok(!texts(alice, id).includes('sent anyway') && !texts(dave, id).includes('sent anyway'));

  // Deleted for everyone, on every phone, Dave's own too.
  await dave.groups.send(id, 'spam', dave.transport);
  await net.settle();
  assert.ok(texts(carol, id).includes('spam'));
  await assert.rejects(carol.groups.deleteForEveryone(id, carol.groups.messages(id).find((m) => m.text === 'spam')!, carol.transport), /admins/);
  await bob.groups.deleteForEveryone(id, bob.groups.messages(id).find((m) => m.text === 'spam')!, bob.transport);
  await net.settle();
  for (const p of [alice, bob, carol, dave]) {
    assert.ok(!texts(p, id).includes('spam'), p.name);
    assert.ok(notes(p, id).includes('A message was deleted for everyone.'), p.name);
  }

  // Banned, Dave is out on every phone, reads nothing after, and his phone is turned away.
  await bob.groups.ban(id, daveKey, true, bob.transport);
  await net.settle();
  assert.equal(status(dave, id), 'out');
  assert.ok(notes(dave, id).includes('An admin took you out of the group.'));
  assert.equal((await carol.groups.publicMembers(id)).length, 3);
  assert.deepEqual(bob.groups.publicInfo(id)!.bans.map((b) => b.name), ['Dave']);
  await alice.groups.send(id, 'without dave', alice.transport);
  await net.settle();
  assert.ok(!texts(dave, id).includes('without dave'));
  await dave.groups.ask(linkOf(alice, id), 'Not Dave');
  await net.settle();
  assert.equal(status(dave, id), 'out');
  assert.ok(notes(dave, id).includes('Your request to join was turned down.'));

  // Taken out, Carol can ask again, and comes back in.
  await bob.groups.takeOut(id, carolKey, bob.transport);
  await net.settle();
  assert.equal(status(carol, id), 'out');
  assert.equal((await alice.groups.publicMembers(id)).length, 2);
  // What her phone keeps for the group stays when she comes back: muted, it stays muted, and its own look stays.
  await carol.groups.setNotify(id, { until: ALWAYS });
  await carol.groups.setLook(id, { ...DEFAULT_LOOK, wallpaper: 'stars', font: 'serif' });
  await carol.groups.ask(linkOf(bob, id), 'Carol');
  await net.settle();
  assert.equal(status(carol, id), 'in');
  assert.deepEqual(carol.groups.notifyOf(id), { until: ALWAYS });
  assert.equal(carol.groups.list().find((g) => g.id === id)?.look?.font, 'serif');
  await carol.groups.setLook(id, null);
  assert.equal(carol.groups.list().find((g) => g.id === id)?.look, undefined);
  assert.equal((await alice.groups.publicMembers(id)).length, 3);

  // Bob lifts the ban: Dave can ask again.
  await bob.groups.ban(id, daveKey, false, bob.transport);
  await net.settle();
  await dave.groups.ask(linkOf(bob, id), 'Dave');
  await net.settle();
  assert.equal(status(dave, id), 'in');
});

test('an admin\'s step counts by whether they were an admin when they wrote it', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const carol = await net.phone('Carol', one);
  const dave = await net.phone('Dave', one);
  const { alice, id } = await club(net, [bob, carol, dave]);
  const [bobKey, carolKey, daveKey] = await Promise.all(['Bob', 'Carol', 'Dave'].map((n) => keyOf(alice, id, n)));
  await alice.groups.setAdmin(id, bobKey, true, alice.transport);
  await net.settle();

  // Alice takes Bob's admin away while his phone is off; he mutes Dave before he hears it, so his
  // step comes to the others after the commit. It counts: he was an admin when he wrote it.
  await alice.groups.setAdmin(id, bobKey, false, alice.transport);
  await net.settle([alice, carol, dave]);
  await bob.groups.mute(id, daveKey, true, bob.transport);
  await net.settle();
  for (const p of [alice, bob, carol, dave]) assert.equal((await p.groups.publicMembers(id)).find((m) => m.key === daveKey)?.muted, true, p.name);
  assert.equal(bob.groups.publicInfo(id)!.admin, false);

  // Now he is no admin: his phone refuses, and a step his phone sends anyway counts nowhere.
  await assert.rejects(bob.groups.mute(id, carolKey, true, bob.transport), /admins/);
  await forge(bob, id, encodeMod({ do: 'mute', key: carolKey, on: true, at: Date.now() }), [alice, carol, dave]);
  await net.settle([alice, carol, dave]);
  for (const p of [alice, carol, dave]) assert.equal((await p.groups.publicMembers(id)).find((m) => m.key === carolKey)?.muted, false, p.name);
  // What is sent so opens as any message: the step was refused by the rules, not by the seal.
  await forge(carol, id, utf8Encode(JSON.stringify({ t: 'text', text: 'from a copy', tag: 'b'.repeat(12) })), [alice]);
  await net.settle([alice]);
  assert.ok(texts(alice, id).includes('from a copy'));
});

test('a new link stops the old one, and handing over moves the door to the new owner', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const carol = await net.phone('Carol', one);
  const { alice, id } = await club(net, [bob, carol]);
  const bobKey = await keyOf(alice, id, 'Bob');

  const old = linkOf(alice, id);
  await alice.groups.changeLink(id, alice.transport);
  await net.settle();
  const fresh = linkOf(bob, id);
  assert.notEqual(fresh.door, old.door);
  assert.deepEqual(linkOf(carol, id), fresh);
  const dave = await net.phone('Dave', two);
  await assert.rejects(dave.groups.ask(old, 'Dave'), /no longer works/);
  assert.equal(dave.groups.asking().length, 0);
  await dave.groups.ask(fresh, 'Dave');
  await net.settle();
  assert.equal(status(dave, id), 'in');

  // Alice hands the group to Bob: his phone makes a door on his own relay, so the link changes.
  await alice.groups.handOver(id, bobKey, alice.transport);
  await net.settle();
  assert.equal(bob.groups.publicInfo(id)!.owner, true);
  assert.deepEqual([alice.groups.publicInfo(id)!.owner, alice.groups.publicInfo(id)!.admin], [false, true]);
  assert.deepEqual((await carol.groups.publicMembers(id)).filter((m) => m.role !== 'member').map((m) => [m.name, m.role]), [['Alice', 'admin'], ['Bob', 'owner']]);
  assert.ok(notes(carol, id).includes(`Bob · ${bobKey.slice(0, 4)} owns the group now.`));
  const handed = linkOf(carol, id);
  assert.equal(handed.relay, two);
  assert.notEqual(handed.door, fresh.door);
  await assert.rejects(alice.groups.setApprove(id, true, alice.transport), /owner/);
  const erin = await net.phone('Erin', one);
  await assert.rejects(erin.groups.ask(fresh, 'Erin'), /no longer works/);
  // Alice's phone is off: Bob's lets Erin in.
  await erin.groups.ask(handed, 'Erin');
  await net.settle([bob, carol, dave, erin]);
  assert.equal(status(erin, id), 'in');
  await erin.groups.send(id, 'hello', erin.transport);
  await net.settle();
  assert.ok(texts(alice, id).includes('hello'));
});

test('the owner and the admins say what a public group is about, for every member, and one who joins is told it', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const carol = await net.phone('Carol', one);
  const { alice, id } = await club(net, [bob, carol]);
  const about = (p: Phone) => p.groups.list().find((g) => g.id === id)?.desc;
  await alice.groups.describe(id, 'Tea on Fridays', alice.transport);
  await net.settle();
  for (const p of [alice, bob, carol]) assert.equal(about(p), 'Tea on Fridays', p.name);
  // Bob may once he is an admin.
  await assert.rejects(bob.groups.describe(id, 'Coffee', bob.transport), /admins/);
  await alice.groups.setAdmin(id, await keyOf(alice, id, 'Bob'), true, alice.transport);
  await net.settle();
  await bob.groups.describe(id, 'Coffee on Mondays', bob.transport);
  await net.settle();
  for (const p of [alice, bob, carol]) assert.equal(about(p), 'Coffee on Mondays', p.name);
  // A member's phone that says it anyway counts nowhere.
  await forge(carol, id, utf8Encode(JSON.stringify({ t: 'desc', text: 'Mine now', at: Date.now() + 60_000 })), [alice, bob]);
  await net.settle([alice, bob]);
  for (const p of [alice, bob]) assert.equal(about(p), 'Coffee on Mondays', p.name);
  // One who joins by the link reads nothing from before, but is told what the group is about.
  const dave = await net.phone('Dave', one);
  await dave.groups.ask(linkOf(alice, id), 'Dave');
  await net.settle();
  assert.equal(status(dave, id), 'in');
  assert.equal(about(dave), 'Coffee on Mondays');
});

test('the owner leaving closes the group for everyone', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const { alice, id } = await club(net, [bob]);
  const link = linkOf(alice, id);
  await alice.groups.leave(id, alice.transport);
  await net.settle();
  assert.equal(status(alice, id), 'out');
  assert.equal(status(bob, id), 'out');
  const carol = await net.phone('Carol', one);
  await assert.rejects(carol.groups.ask(link, 'Carol'), /no longer works/);
});

test('a burner group ends on every phone at its time: messages gone, link closed', live, async () => {
  const net = network();
  const alice = await net.phone('Alice', one);
  const bob = await net.phone('Bob', two);
  const ends = Date.now() + 3600_000;
  const id = await alice.groups.createPublic('Event', 'Alice', false, alice.transport, ends);
  assert.equal(alice.groups.publicInfo(id)!.ends, ends);
  const link = linkOf(alice, id);
  await bob.groups.ask(link, 'Bob');
  await net.settle();
  assert.equal(status(bob, id), 'in');
  assert.equal(bob.groups.publicInfo(id)!.ends, ends, 'the member knows when it ends, from the rules');
  await bob.groups.send(id, 'see you there', bob.transport);
  await net.settle();
  // Before its time nothing goes.
  assert.equal(await alice.groups.endDue(alice.transport, ends - 1), 0);
  assert.equal(await bob.groups.endDue(bob.transport, ends - 1), 0);
  // Bob's phone is off at the time: Alice's closes it for everyone, and Bob's deletes it when it next looks.
  assert.equal(await alice.groups.endDue(alice.transport, ends), 1);
  assert.equal(alice.groups.list().some((g) => g.id === id), false);
  assert.equal(alice.groups.publicInfo(id), null);
  await net.settle();
  assert.equal(await bob.groups.endDue(bob.transport, ends + 60_000), 1);
  assert.equal(bob.groups.list().some((g) => g.id === id), false);
  assert.ok(!JSON.stringify(bob.data.groups).includes('see you there'));
  const carol = await net.phone('Carol', one);
  await assert.rejects(carol.groups.ask(link, 'Carol'), /no longer works/);
});

test('a group that lasts carries no end, and an end reads back checked', () => {
  assert.equal(decodeRules(encodeRules(NO_RULES))!.ends, undefined);
  assert.equal(decodeRules(encodeRules({ ...NO_RULES, ends: 1_800_000_000_000 }))!.ends, 1_800_000_000_000);
  assert.equal(decodeRules(utf8Encode(JSON.stringify({ v: 1, admins: [], approve: false, door: null, mutes: [], bans: [], ends: 'soon' })))!.ends, undefined);
  assert.equal(decodeRules(utf8Encode(JSON.stringify({ v: 1, admins: [], approve: false, door: null, mutes: [], bans: [], ends: -5 })))!.ends, undefined);
});

test('keys in a public group are made new every week, with the same members, names and roles', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const carol = await net.phone('Carol', one);
  const { alice, id } = await club(net, [bob, carol]);
  await alice.groups.mute(id, await keyOf(alice, id, 'Carol'), true, alice.transport);
  await net.settle();
  const shown = async (p: Phone) => (await p.groups.publicMembers(id)).map((m) => [m.key, m.name, m.role, m.muted, m.me].join()).sort();
  const before = await Promise.all([alice, bob, carol].map(shown));
  const said = [alice, bob, carol].map((p) => notes(p, id));
  const due = Date.now() + RENEW_EVERY + 1000;

  // Members ask the owner, a muted one too; then the owner makes its own new.
  for (const p of [bob, carol, alice]) {
    await p.groups.renewKeys(p.transport, due);
    await net.settle();
    assert.equal(p.groups.all().find((g) => g.id === id)?.renewing, undefined, p.name);
  }
  assert.deepEqual(await Promise.all([alice, bob, carol].map(shown)), before);
  assert.deepEqual([alice, bob, carol].map((p) => notes(p, id)), said);
  await bob.groups.send(id, 'still here', bob.transport);
  await net.settle();
  assert.ok(texts(alice, id).includes('still here'));
  assert.ok(texts(carol, id).includes('still here'));
  // The owner still lets in whoever asks.
  const dave = await net.phone('Dave', two);
  await dave.groups.ask(linkOf(alice, id), 'Dave');
  await net.settle();
  assert.equal(status(dave, id), 'in');
});

test('public groups stay on the phone: a linked device holding the groups makes and joins none, and one asking to join keeps them on the phone', live, async () => {
  const net = network();
  const alice = await net.phone('Alice', one);
  const dell = await net.phone('DELL', two);
  const id = await alice.groups.createPublic('Λέσχη', 'Alice', false, alice.transport);
  const link = parseJoinLink(alice.groups.publicInfo(id)!.link)!;
  // A linked device that holds the groups (lib/devices.ts): not through the phone, and a device.
  dell.groups.useLink({ through: () => false, device: () => true, ask: async () => undefined, members: () => [], took: () => undefined });
  await assert.rejects(dell.groups.createPublic('Άλλη', 'DELL', false, dell.transport), /stay on the phone/);
  await assert.rejects(dell.groups.ask(link, 'DELL'), /stay on the phone/);
  // On the phone, asking to join one keeps the groups there: its welcome needs what made the request.
  const bob = await net.phone('Bob', two);
  await bob.groups.create('Φίλοι', [], bob.transport);
  await bob.groups.ask(link, 'Bob');
  await assert.rejects(bob.groups.moveOut('ab'), /Public groups stay on the phone/);
});

test('a private group goes as before beside public ones', live, async () => {
  const net = network();
  const alice = await net.phone('Alice', one);
  const bob = await net.phone('Bob', two);
  const id = await alice.groups.create('Friends', [bob.identity], alice.transport);
  await net.settle();
  assert.equal(alice.groups.isPublic(id), false);
  assert.equal(alice.groups.publicInfo(id), null);
  await bob.groups.send(id, 'hi', bob.transport);
  await net.settle();
  assert.equal(alice.groups.messages(id).find((m) => m.text === 'hi')?.from, bob.identity);
  assert.equal(alice.groups.ownsDoors(), false);
  await assert.rejects(alice.groups.mute(id, 'ab'.repeat(32), true, alice.transport));
});

test('members of a public group do not ask each other for contact links', live, async () => {
  const net = network();
  const bob = await net.phone('Bob', two);
  const { alice, id } = await club(net, [bob]);
  // Contacts kept in memory on both phones, each with an account's keys, which the group never reaches.
  const added: string[] = [];
  const contacts = async (): Promise<GroupContacts> => {
    const key = toBase64Url(await core.accountBundle(await core.newAccount()));
    return { bundle: async () => key, has: async () => false, accepted: async () => false, blocked: async () => false, add: async (_me, about) => void added.push(about.id) };
  };
  alice.transport.contacts = await contacts();
  bob.transport.contacts = await contacts();
  const aliceKey = await keyOf(bob, id, 'Alice');
  const bobKey = await keyOf(bob, id, 'Bob');

  await assert.rejects(bob.groups.askContact(id, aliceKey, bob.transport), /Not in public groups\./);
  await assert.rejects(bob.groups.answerContact(id, aliceKey, bob.transport), /Not in public groups\./);
  await assert.rejects(bob.groups.declineContact(id, aliceKey), /Not in public groups\./);

  // A phone that asks anyway, as a changed Erevos could: Alice's keeps nothing of it.
  const before = notes(alice, id);
  const send = (bob.groups as unknown as { sendContact(id: string, leaves: GroupMember[], to: string, back: boolean, transport: GroupTransport, me: string): Promise<void> }).sendContact;
  const leaves = (await bob.groups.members(id)).filter((m) => m.about?.id === aliceKey);
  assert.equal(leaves.length, 1);
  // To her key in the group, and to who she is outside it, which a member may know.
  for (const to of [aliceKey, alice.identity]) for (const back of [false, true]) await send.call(bob.groups, id, leaves, to, back, bob.transport, bobKey);
  await net.settle();
  const info = alice.groups.list().find((g) => g.id === id)!;
  assert.deepEqual([info.asks, info.wants, notes(alice, id), added], [[], [], before, []]);
  // And the group goes on.
  await bob.groups.send(id, 'still in', bob.transport);
  await net.settle();
  assert.ok(texts(alice, id).includes('still in'));
});

test('a link is read back as made, and anything else is not one', () => {
  const link: JoinLink = { group: 'ab'.repeat(16), door: 'cd'.repeat(24), relay: 'wss://relay.example.org/x', relayKey: 'A'.repeat(43), key: 'B'.repeat(43), name: 'Λέσχη & co' };
  assert.deepEqual(parseJoinLink(joinLink(link)), link);
  assert.deepEqual(parseJoinLink(joinLink({ ...link, relayKey: '', name: '' })), { ...link, relayKey: '', name: '' });
  assert.equal(parseJoinLink('erevos://join?g=zz'), null);
  assert.equal(parseJoinLink(joinLink(link).replace(encodeURIComponent('wss://'), encodeURIComponent('http://'))), null);
  assert.equal(parseJoinLink('https://example.org'), null);
});

test('the rules stay small, and the last step about a member counts on every phone', () => {
  const key = (n: number) => n.toString(16).padStart(64, '0');
  const mark = (n: number, on: boolean, at: number, by = key(900)): Mark => ({ key: key(n), on, at, by });
  const mutes = Array.from({ length: 60 }, (_, n) => mark(n, n % 2 === 0, n));
  const bytes = encodeRules({ ...NO_RULES, admins: [key(1)], mutes });
  assert.ok(bytes.length <= MAX_RULES);
  const back = decodeRules(bytes)!;
  assert.deepEqual(back.admins, [key(1)]);
  // The marks that are off went first.
  assert.ok(back.mutes.length > 0 && back.mutes.every((m) => m.on));
  assert.equal(decodeRules(new Uint8Array(0)), null);
  assert.equal(decodeRules(utf8Encode('{"v":2}')), null);

  const early = mark(5, true, 10, key(2));
  const late = mark(5, false, 20, key(3));
  assert.equal(laterMark(early, late), late);
  assert.equal(laterMark(late, early), late);
  // The same time: the admin whose key sorts first, whatever came first.
  const a = mark(5, true, 30, key(2));
  const b = mark(5, false, 30, key(3));
  assert.equal(laterMark(a, b), a);
  assert.equal(laterMark(b, a), a);
  assert.deepEqual(mergeMarks([early, mark(6, true, 1)], [late]), [late, mark(6, true, 1)]);
});

test('an admin\'s step and the owner\'s answer are read back checked', () => {
  const key = 'ef'.repeat(32);
  assert.deepEqual(decodeMod({ t: 'mod', do: 'mute', key, on: true, at: 5 }), { do: 'mute', key, on: true, at: 5 });
  assert.equal(decodeMod({ t: 'mod', do: 'mute', key: 'nope', on: true, at: 5 }), null);
  assert.equal(decodeMod({ t: 'text', text: 'hi' }), null);
  assert.equal(decodeMod({ t: 'mod', do: 'delete', from: key, tag: 'bad tag' }), null);

  const welcome = randomBytes(300);
  const answer = encodeAnswer({ group: 'ab'.repeat(16), kind: 'welcome', name: 'Club', welcome });
  assert.ok(isAnswer(answer));
  assert.deepEqual(decodeAnswer(answer), { group: 'ab'.repeat(16), kind: 'welcome', name: 'Club', welcome });
  assert.deepEqual(decodeAnswer(encodeAnswer({ group: 'ab'.repeat(16), kind: 'full' })), { group: 'ab'.repeat(16), kind: 'full' });
  // An MLS message starts with its version, 0x0001: never taken for an answer.
  assert.equal(isAnswer(Uint8Array.of(0, 1, 0, 2)), false);
});

test('what an admin did shows as a note, in each language', async () => {
  const key = 'ab'.repeat(32);
  assert.equal(publicName('Bob', key), 'Bob · abab');
  assert.equal(publicName('', key), 'member abababab');
  assert.equal(moderated('Bob', 'muted'), 'Bob was muted.');
  assert.equal(moderated('Bob', 'something else'), null);
  assert.equal(noteText(`${key}|banned`, () => 'Bob'), 'Bob was banned.');
  await setLang('el');
  assert.notEqual(noteText(`${key}|banned`, () => 'Bob'), 'Bob was banned.');
  await setLang('en');
});

test('what a space keeps for its public groups is sealed, and read back checked', async () => {
  const space = randomBytes(32);
  const data: PublicData = {
    groups: [
      {
        id: 'ab'.repeat(16),
        me: 'cd'.repeat(32),
        door: { relay: 'wss://relay.example.org', recipient: '01'.repeat(24), sender: '02'.repeat(24), relayKey: '', secret: 'c2VjcmV0', key: 'K'.repeat(43) },
        link: 'erevos://join?g=…',
        approve: true,
        waiting: [],
        asked: [{ key: 'ef'.repeat(32), name: 'Carol', at: 3 }],
        mutes: [{ key: 'ef'.repeat(32), on: true, at: 4, by: 'cd'.repeat(32) }],
        bans: [],
        outs: [],
        deleted: [`${'ef'.repeat(32)}|${'a'.repeat(12)}`],
        epochs: [{ epoch: 3, keeper: 'cd'.repeat(32), admins: [] }],
        names: { ['ef'.repeat(32)]: 'Carol' },
        again: ['ef'.repeat(32)],
      },
    ],
    asking: [{ group: '12'.repeat(16), door: '03'.repeat(24), key: '34'.repeat(32), name: 'Me', title: 'Other', at: 9 }],
  };
  await savePublicGroupData(0, space, data);
  assert.deepEqual(await loadPublicGroupData(0, space), data);
  assert.deepEqual(await loadPublicGroupData(0, randomBytes(32)), EMPTY_PUBLIC, 'another key reads nothing');
  // What is damaged is left out.
  await savePublicGroupData(0, space, { ...data, asking: [{ ...data.asking[0], key: 'x' }] } as PublicData);
  assert.deepEqual((await loadPublicGroupData(0, space)).asking, []);
});
