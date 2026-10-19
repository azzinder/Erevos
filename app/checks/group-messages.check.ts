// What a group's messages do beyond words and files (lib/group-parts.ts, lib/groups.ts): replies,
// stickers, places, polls and previews in a message's fields, and reactions, votes, pins and
// deleting for everyone as kinds of their own, with the real core built to WebAssembly by
// checks/build-core.mjs (skipped, with a note, without it); and what lock/group-data.ts keeps of them.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { decodeGroup, encodeGroup, type GroupSignal } from '../lib/group-signal';
import { asChatMessage, groupPartsOf, markedOf, withMarked } from '../lib/group-parts';
import { Groups, type GroupTransport } from '../lib/groups';
import { groupFindables, searchMessages, starredOf } from '../lib/message-search';
import { EMPTY_GROUPS, loadGroupData, saveGroupData, type About, type GroupData, type GroupMessage } from '../lock/group-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
if (existsSync(built)) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the group message checks with the core: build it first with node checks/build-core.mjs');
}

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);

test('a member’s message carries what it answers and what it is, each checked', () => {
  const poll = { q: 'Tea?', o: ['Yes', 'No'] };
  assert.deepEqual(groupPartsOf({ re: '0123456789ab', sticker: 'moon-smile', poll, forwarded: true }, true), {
    re: '0123456789ab',
    sticker: 'moon-smile',
    poll,
    forwarded: true,
  });
  // A file carries no sticker nor poll, and what is not of its shape is none.
  assert.deepEqual(groupPartsOf({ re: '0123456789ab', sticker: 'moon-smile', poll }, false), { re: '0123456789ab' });
  assert.deepEqual(groupPartsOf({ re: 'x', sticker: 'Big Sticker', place: { lat: 200, lon: 0 }, forwarded: 'yes' }, true), {});
  assert.deepEqual(markedOf({ t: 'react', tag: '0123456789ab', emoji: '👍' }), { t: 'react', tag: '0123456789ab', emoji: '👍' });
  assert.deepEqual(markedOf({ t: 'react', tag: '0123456789ab', emoji: 'nice' }), null);
  assert.deepEqual(markedOf({ t: 'pin', tag: '0123456789ab', on: 'yes' }), null);
  assert.deepEqual(markedOf({ t: 'vote', tag: '0123456789ab', chose: [1, 1] }), { t: 'vote', tag: '0123456789ab', chose: [1] });
  assert.deepEqual(markedOf({ t: 'erase', tag: 'nope' }), null);
  assert.deepEqual(markedOf({ t: 'text', tag: '0123456789ab' }), null);
});

test('reactions and votes are each member’s own, a pin is everyone’s, and only the sender deletes for everyone', () => {
  const tag = '0123456789ab';
  const poll = { q: 'Which?', o: ['a', 'b', 'c'] };
  let messages: GroupMessage[] = [
    { at: 1, from: '', text: 'joined', tag: '', note: true },
    { at: 2, from: A, text: '📊 Which?', tag, poll },
  ];
  messages = withMarked(messages, '', { t: 'react', tag, emoji: '👍' }, 5)!;
  messages = withMarked(messages, B, { t: 'react', tag, emoji: '❤️' }, 6)!;
  assert.equal(withMarked(messages, B, { t: 'react', tag, emoji: '❤️' }, 7), null, 'the same again changes nothing');
  messages = withMarked(messages, '', { t: 'react', tag, emoji: '' }, 8)!;
  assert.deepEqual(messages[1].reactions, { [B]: '❤️' });
  messages = withMarked(messages, B, { t: 'vote', tag, chose: [0, 2] }, 9)!;
  assert.deepEqual(messages[1].votes, { [B]: [0] }, 'one choice only, as the poll allows');
  messages = withMarked(messages, B, { t: 'vote', tag, chose: [] }, 10)!;
  assert.equal(messages[1].votes, undefined);
  messages = withMarked(messages, B, { t: 'pin', tag, on: true }, 11)!;
  assert.equal(messages[1].pinned, 11);
  messages = withMarked(messages, '', { t: 'pin', tag, on: false }, 12)!;
  assert.equal('pinned' in messages[1], false);
  assert.equal(withMarked(messages, B, { t: 'erase', tag }, 13), null, 'not hers to delete');
  assert.equal(withMarked(messages, A, { t: 'erase', tag: 'ffffffffffff' }, 13), null);
  assert.deepEqual(withMarked(messages, A, { t: 'erase', tag }, 13), [messages[0]]);
  assert.equal(withMarked([{ at: 1, from: A, text: 'x', tag }], A, { t: 'vote', tag, chose: [0] }, 1), null, 'a vote only on a poll');
});

test('a group keeps its messages’ parts and marks, and drops what is not of their shape', async () => {
  const key = randomBytes(32);
  const tag = '0123456789ab';
  const good: GroupMessage = {
    at: 1,
    from: A,
    text: '📊 Tea?',
    tag,
    re: 'ba9876543210',
    poll: { q: 'Tea?', o: ['Yes', 'No'], m: true },
    votes: { '': [0, 1], [B]: [1] },
    reactions: { [A]: '👍' },
    pinned: 5,
    starred: true,
    forwarded: true,
  };
  const odd = { at: 2, from: B, text: 'x', tag: 'ba9876543210', votes: { [B]: [0] }, reactions: { nobody: '👍', [A]: 'nice' }, put: 'ab'.repeat(24), sticker: 'Big' };
  const ours = { at: 3, from: '', text: '', tag: 'aaaaaaaaaaaa', put: 'ab'.repeat(24) };
  const data = { ...EMPTY_GROUPS, groups: [{ id: 'cd'.repeat(16), name: 'G', admin: true, status: 'in', asked: [], later: [], outbox: [], messages: [good, odd, ours], readAt: 0 }] };
  await saveGroupData(0, key, data as unknown as GroupData);
  const [kept] = (await loadGroupData(0, key)).groups;
  assert.deepEqual(kept.messages, [good, { at: 2, from: B, text: 'x', tag: 'ba9876543210' }, ours]);
});

test('a group’s messages are found and starred as a chat’s are, a voice message by none of its words', () => {
  const messages: GroupMessage[] = [
    { at: 1, from: '', text: 'Bob joined', tag: '', note: true },
    { at: 2, from: A, text: 'Coffee at five', tag: '000000000001', starred: true },
    { at: 3, from: '', text: '', tag: '000000000002', file: { name: 'voice', mime: 'audio/mp4', kind: 'file', size: 9, id: 'ab'.repeat(16), key: 'cd'.repeat(32), chunk: 65536, count: 1 }, ms: 4000 },
  ];
  const found = groupFindables('ef'.repeat(16), messages);
  assert.deepEqual(searchMessages(found, 'coffee').map((m) => [m.peer, m.tag, m.mine]), [[`group:${'ef'.repeat(16)}`, '000000000001', false]]);
  assert.deepEqual(searchMessages(found, 'voice'), []);
  assert.deepEqual(starredOf(found).map((m) => m.line), ['Coffee at five']);
  assert.deepEqual(asChatMessage(messages[2]).voice, { ms: 4000 });
});

// Through the core.
type Phone = { identity: string; groups: Groups; queue: Uint8Array[]; transport: GroupTransport };

function network() {
  const phones = new Map<string, Phone>();
  const signals: { from: string; to: string; signal: GroupSignal }[] = [];
  const phone = (): Phone => {
    const identity = toHex(randomBytes(32));
    const sender = toHex(randomBytes(24));
    const groups = new Groups(EMPTY_GROUPS, async () => undefined, async () => ({ id: identity, sender, relay: 'wss://relay.example.org', relayKey: '' }));
    const transport: GroupTransport = {
      async post(to: About, packet: Uint8Array) {
        phones.get(to.id)!.queue.push(packet);
      },
      async signal(to: string, signal: GroupSignal) {
        signals.push({ from: identity, to, signal: decodeGroup(JSON.parse(JSON.stringify(encodeGroup(signal))))! });
      },
    };
    const it = { identity, groups, queue: [], transport };
    phones.set(identity, it);
    return it;
  };
  const settle = async () => {
    for (let round = 0; round < 20; round++) {
      let moved = false;
      while (signals.length > 0) {
        const { from, to, signal } = signals.shift()!;
        const target = phones.get(to)!;
        await target.groups.signal(from, signal, false, target.transport);
        moved = true;
      }
      for (const p of phones.values()) {
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

const said = (p: Phone, id: string) => p.groups.messages(id).filter((m) => !m.note);

test('replies, stickers, polls, reactions, votes, pins and deleting go to every member', { skip: !existsSync(built) }, async () => {
  const net = network();
  const alice = net.phone();
  const bob = net.phone();
  const id = await alice.groups.create('Friends', [bob.identity], alice.transport);
  await net.settle();

  const poll = { q: 'Tea?', o: ['Yes', 'No'] };
  await alice.groups.send(id, '📊 Tea?\n1. Yes\n2. No', alice.transport, { poll });
  await net.settle();
  const asked = said(bob, id)[0];
  assert.deepEqual([asked.from, asked.poll], [alice.identity, poll]);
  await bob.groups.send(id, '🌝', bob.transport, { sticker: 'moon-smile', re: asked.tag });
  await bob.groups.mark(id, { t: 'vote', tag: asked.tag, chose: [1] }, bob.transport);
  await bob.groups.mark(id, { t: 'react', tag: asked.tag, emoji: '👍' }, bob.transport);
  await net.settle();
  const [onAlice, answer] = said(alice, id);
  assert.deepEqual(onAlice.votes, { [bob.identity]: [1] });
  assert.deepEqual(onAlice.reactions, { [bob.identity]: '👍' });
  assert.deepEqual([answer.text, answer.sticker, answer.re], ['🌝', 'moon-smile', asked.tag]);
  // Bob's own show on his phone as ours.
  assert.deepEqual(said(bob, id)[0].votes, { '': [1] });

  await alice.groups.mark(id, { t: 'pin', tag: answer.tag, on: true }, alice.transport);
  await net.settle();
  assert.ok(said(bob, id)[1].pinned);
  // Alice cannot delete Bob's for everyone; Bob can.
  assert.equal(await alice.groups.mark(id, { t: 'erase', tag: answer.tag }, alice.transport), null);
  const gone = await bob.groups.mark(id, { t: 'erase', tag: answer.tag }, bob.transport);
  assert.equal(gone?.tag, answer.tag);
  await net.settle();
  assert.deepEqual(said(alice, id).map((m) => m.tag), [asked.tag]);
  assert.deepEqual(said(bob, id).map((m) => m.tag), [asked.tag]);

  // A star, and deleting here only, stay on this phone.
  await alice.groups.star(id, asked.tag, true);
  assert.equal(said(alice, id)[0].starred, true);
  assert.equal(said(bob, id)[0].starred, undefined);
  await bob.groups.deleteHere(id, asked.tag);
  assert.equal(said(bob, id).length, 0);
  assert.equal(said(alice, id).length, 1);
});
