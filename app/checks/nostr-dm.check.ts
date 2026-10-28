// Chats with other Nostr apps (lib/nostr-dm.ts, lib/nostr-dm-store.ts, docs/nostr-chats.md), with
// the real core built to WebAssembly (crates/erevos-nostr chat) and relays played here
// (checks/nostr-relay.ts): keys as people write them; NIP-17's own example message opens, for its
// reader and for its sender's copy; a space and someone on another app write both ways through
// each other's inbox relays, the space's guarded one asking who reads (NIP-42) and told only by
// the connection that reads; relays keep only wraps signed by keys made for them, with times set
// back; someone who names no inbox gets nothing; the space's own other app reads both sides; a chat
// survives the space closing and opening again, without anything twice.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCurrentSpace } from '../lock/keys';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { addMessage, BACKDATE, CHATS_MOST, chatCore, inboxEvent, LOOKUP_RELAYS, newNostrDm, npubOf, profileEvent, readKey, shortNpub, takeWrap, wrapText, type NostrDmState } from '../lib/nostr-dm';
import { inboxParts, nostrInboxRows, showsIn } from '../lib/inbox';
import { lookUpNip05, NostrRelay, setNostrOpen } from '../lib/nostr-dm-net';
import { networkNotify, networkUnreadAt, onNetworkMessage, onNetworkRead } from '../lib/network-notices';
import {
  nostrDmForgetChat,
  nostrDmMake,
  nostrDmNow,
  nostrDmRead,
  nostrDmSend,
  nostrDmSetNotify,
  nostrDmSetInbox,
  nostrDmSetName,
  nostrDmStart,
  nostrDmUnread,
  runNostrDm,
  stopNostrDm,
} from '../lib/nostr-dm-store';
import { FakeRelay } from './nostr-relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).nostrChat === 'function';
if (!coreReady) console.log('Skipping the Nostr chat checks: build the core first with node checks/build-core.mjs');

const relays = new Map<string, FakeRelay>();
const relay = (url: string, options?: { guarded?: boolean; refuses?: boolean }) => {
  const made = new FakeRelay(url, options);
  relays.set(url, made);
  return made;
};
const aliceInbox = relay('wss://inbox.alice.example', { guarded: true });
const bobInbox = relay('wss://inbox.bob.example');
// The relays names and lists are looked up on: one keeps them, the others are away.
const index = relay(LOOKUP_RELAYS[0]);
for (const url of LOOKUP_RELAYS.slice(1)) relay(url, { refuses: true });

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  setNostrOpen(async (url) => {
    const found = relays.get(url);
    if (!found) throw new Error(`No relay at ${url}`);
    return found.link();
  });
});

after(() => {
  stopNostrDm();
  setNostrOpen(null);
  setCore(null);
});

async function until(done: () => boolean, what: string, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error(`Waited in vain for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const vector = (name: string) => JSON.parse(readFileSync(new URL(`../../crates/erevos-nostr/tests/${name}`, import.meta.url), 'utf8')) as unknown;

test('Nostr keys are read as people write them', { skip: !coreReady }, async () => {
  const npub = await readKey('nostr:npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg');
  assert.equal(npub.public, '7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e');
  const profile = await readKey('nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p');
  assert.deepEqual(profile.relays, ['wss://r.x.com', 'wss://djbas.sadkb.com']);
  await assert.rejects(readKey('npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjpth'), /typo/);
  await assert.rejects(readKey('hello'), /npub1/);
  assert.equal(shortNpub('npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg'), 'npub10elf…jptg');
  // Shown at once, the same as the core writes it.
  assert.equal(npubOf(npub.public), 'npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg');
  for (let i = 0; i < 20; i += 1) {
    const key = (await newNostrDm()).public;
    assert.equal(npubOf(key), (await chatCore<{ npub: string }>('npub', { public: key })).npub);
  }
});

test("NIP-17's own example opens, for its reader and as its sender's copy", { skip: !coreReady }, async () => {
  const receiver = await newNostrDm((await readKey('nsec12ywtkplvyq5t6twdqwwygavp5lm4fhuang89c943nf2z92eez43szvn4dt')).secret);
  const sender = await newNostrDm((await readKey('nsec1w8udu59ydjvedgs3yv5qccshcj8k05fh3l60k9x57asjrqdpa00qkmr89m')).secret);
  assert.equal(await takeWrap(receiver, vector('nip17-receiver.json')), sender.public);
  assert.deepEqual(
    receiver.chats[sender.public].messages.map((m) => [m.mine, m.text]),
    [[false, 'Hola, que tal?']],
  );
  assert.equal(receiver.chats[sender.public].unread, 1);
  // Again: taken once.
  assert.equal(await takeWrap(receiver, vector('nip17-receiver.json')), null);
  assert.equal(await takeWrap(sender, vector('nip17-sender.json')), receiver.public);
  assert.deepEqual(
    sender.chats[receiver.public].messages.map((m) => [m.mine, m.text]),
    [[true, 'Hola, que tal?']],
  );
  // Not for this key: let be.
  assert.equal(await takeWrap(sender, vector('nip17-receiver.json')), null);
  assert.equal(Object.keys(sender.chats).length, 1);
});

test('a message to three people is let be, a note to oneself is kept', { skip: !coreReady }, async () => {
  const me = await newNostrDm();
  const a = await newNostrDm();
  const b = await newNostrDm();
  const group = await chatCore<{ wraps: { to: string; event: string }[] }>('wrap', {
    secret: a.secret,
    rumor: { kind: 14, created_at: 1, tags: [['p', me.public], ['p', b.public]], content: 'all of us' },
    to: [me.public],
    now: 1_800_000_000,
  });
  assert.equal(await takeWrap(me, JSON.parse(group.wraps[0].event)), null);
  // A time to come is shown as now.
  const later = await chatCore<{ wraps: { to: string; event: string }[] }>('wrap', {
    secret: a.secret,
    rumor: { kind: 14, created_at: 4_000_000_000, tags: [['p', me.public]], content: 'from the future' },
    to: [me.public],
    now: 1_800_000_000,
  });
  assert.equal(await takeWrap(me, JSON.parse(later.wraps[0].event), 1_800_000_000_000), a.public);
  assert.equal(me.chats[a.public].messages[0].at, 1_800_000_000_000);
  const note = await wrapText(me, me.public, 'a note');
  assert.equal(await takeWrap(me, note.theirs), me.public);
  assert.equal(me.chats[me.public].messages[0].mine, true);
});

const spaceKey = randomBytes(32);

test('a space and someone on another app write both ways through their inbox relays', { skip: !coreReady }, async () => {
  // Bob, on another app: his inbox, his name, said where people look.
  const bob: NostrDmState = await newNostrDm();
  bob.inbox = [bobInbox.url];
  bob.name = 'Bob';
  for (const event of [await inboxEvent(bob), await profileEvent(bob)]) {
    const r = await NostrRelay.open(index.url, null);
    assert.equal((await r.publish(event)).ok, true);
    r.close();
  }

  // What it tells of the messages that come and are read (lib/network-notices.ts).
  const came: [string, number][] = [];
  const read: string[][] = [];
  const stopCame = onNetworkMessage((where, times) => came.push([where, times]));
  const stopRead = onNetworkRead((where) => read.push(where));

  setCurrentSpace(1, spaceKey);
  runNostrDm();
  await until(() => nostrDmNow().loaded, 'the account to load');
  assert.equal(nostrDmNow().state, null);
  await nostrDmMake();
  await nostrDmSetInbox([aliceInbox.url]);
  await nostrDmSetName('Alice');
  const alice = nostrDmNow().state!;
  assert.equal(alice.madeHere, true);
  // Reading her guarded inbox: she said who reads, on that connection only.
  await until(() => nostrDmNow().reading === 1, 'the inbox to be read');
  await until(() => aliceInbox.authed.length === 1, 'the inbox to ask who reads');
  assert.deepEqual(aliceInbox.authed, [alice.public]);
  // Her list of where she reads, and her name, are out.
  await until(() => index.events.some((e) => e.kind === 10050 && e.pubkey === alice.public) && index.events.some((e) => e.kind === 0 && e.pubkey === alice.public), 'her lists');
  assert.deepEqual(
    index.events.find((e) => e.kind === 10050 && e.pubkey === alice.public)!.tags,
    [['relay', aliceInbox.url]],
  );

  // She starts a chat with Bob's npub: his name comes from what he said.
  const bobNpub = npubOf(bob.public);
  const key = await nostrDmStart(bobNpub);
  assert.equal(key, bob.public);
  await until(() => nostrDmNow().state?.people[bob.public]?.name === 'Bob', "Bob's name");

  await nostrDmSend(bob.public, 'γεια σου, Bob');
  const sent = nostrDmNow().state!.chats[bob.public].messages;
  assert.deepEqual(
    sent.map((m) => [m.mine, m.text, m.state]),
    [[true, 'γεια σου, Bob', 'sent']],
  );
  // Bob's inbox has his wrap; hers, her copy; none of them signed by either, nor saying when.
  // (Her inbox has her lists too, as NIP-17 asks.)
  const wraps = (r: FakeRelay) => r.events.filter((e) => e.kind === 1059);
  await until(() => wraps(bobInbox).length === 1 && wraps(aliceInbox).length === 1, 'the wraps');
  const now = Math.floor(Date.now() / 1000);
  for (const wrap of [...wraps(bobInbox), ...wraps(aliceInbox)]) {
    assert.equal(wrap.kind, 1059);
    assert.notEqual(wrap.pubkey, alice.public);
    assert.notEqual(wrap.pubkey, bob.public);
    assert.ok(wrap.created_at <= now && wrap.created_at >= now - BACKDATE);
    assert.ok(!wrap.content.includes('Bob'));
  }
  assert.equal(wraps(bobInbox)[0].tags[0][1], bob.public);
  assert.equal(wraps(aliceInbox)[0].tags[0][1], alice.public);
  assert.ok(!index.events.some((e) => e.kind === 1059));
  // Only the reading connection ever said who it is.
  assert.deepEqual(aliceInbox.authed, [alice.public]);
  assert.deepEqual(bobInbox.authed, []);

  // Bob reads it, and answers to where she reads.
  const r = await NostrRelay.open(bobInbox.url, null);
  for (const wrap of await r.query([{ kinds: [1059], '#p': [bob.public] }])) await takeWrap(bob, wrap);
  r.close();
  assert.deepEqual(
    bob.chats[alice.public].messages.map((m) => [m.mine, m.text]),
    [[false, 'γεια σου, Bob']],
  );
  const answer = await wrapText(bob, alice.public, 'γεια σου, Alice');
  addMessage(bob, alice.public, answer.message);
  // A guarded inbox takes wraps from anyone, never asking who sends.
  const w = await NostrRelay.open(aliceInbox.url, null);
  assert.equal((await w.publish(answer.theirs)).ok, true);
  w.close();
  await until(() => nostrDmNow().state!.chats[bob.public].messages.length === 2, 'his answer');
  assert.deepEqual(
    nostrDmNow().state!.chats[bob.public].messages.map((m) => [m.mine, m.text]),
    [
      [true, 'γεια σου, Bob'],
      [false, 'γεια σου, Alice'],
    ],
  );
  assert.equal(nostrDmUnread(), 1);
  // It told of his answer, once, as the home row knows the chat; her own message, of nothing.
  const where = `nostr:${bob.public}`;
  assert.deepEqual(came, [[where, 1]]);
  assert.deepEqual([...networkUnreadAt()], [[where, 1]]);
  // Muted, it is left out of the icon's number; then as the app has it again.
  await nostrDmSetNotify(bob.public, { until: Date.now() + 60_000 });
  assert.deepEqual([...networkUnreadAt()], []);
  assert.ok(networkNotify(where)?.until);
  await nostrDmSetNotify(bob.public, null);
  assert.equal(networkNotify(where), null);
  assert.deepEqual(read, []);
  await nostrDmRead(bob.public);
  assert.equal(nostrDmUnread(), 0);
  assert.deepEqual(read, [[where]]);

  // Her other app, with the same key, reads both sides from her inbox.
  const other = await newNostrDm(alice.secret);
  const reader = await NostrRelay.open(aliceInbox.url, (url, challenge) => import('../lib/nostr-dm').then((m) => m.authEvent(other, url, challenge)));
  const got = await new Promise<unknown[]>((resolve) => {
    const events: unknown[] = [];
    reader.subscribe([{ kinds: [1059], '#p': [other.public] }], (e) => events.push(e), () => resolve(events));
  });
  reader.close();
  for (const wrap of got) await takeWrap(other, wrap);
  assert.deepEqual(
    other.chats[bob.public].messages.map((m) => [m.mine, m.text]),
    [
      [true, 'γεια σου, Bob'],
      [false, 'γεια σου, Alice'],
    ],
  );

  // Someone who never said where they read gets nothing, and is told so.
  const carol = await newNostrDm();
  const carolNpub = npubOf(carol.public);
  await nostrDmStart(carolNpub, 'Carol');
  await assert.rejects(nostrDmSend(carol.public, 'hello?'), /does not say where/);
  assert.equal(nostrDmNow().state!.chats[carol.public].name, 'Carol');
  await nostrDmForgetChat(carol.public);

  // A note to herself goes to her own inbox, and shows once.
  await nostrDmSend(alice.public, 'a note');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(
    nostrDmNow().state!.chats[alice.public].messages.map((m) => m.text),
    ['a note'],
  );

  // Closed and opened again: the same chats, nothing twice, and still reading.
  stopNostrDm();
  await new Promise((resolve) => setTimeout(resolve, 700));
  runNostrDm();
  await until(() => nostrDmNow().loaded && nostrDmNow().reading === 1, 'the account to come back');
  await new Promise((resolve) => setTimeout(resolve, 100));
  const back = nostrDmNow().state!;
  assert.equal(back.public, alice.public);
  assert.equal(back.chats[bob.public].messages.length, 2);
  assert.equal(back.chats[alice.public].messages.length, 1);
  assert.equal(nostrDmUnread(), 0);
  // Loading again told of nothing.
  assert.deepEqual(came, [[where, 1]]);
  stopCame();
  stopRead();

  // A relay that goes away is read again.
  const before = aliceInbox.connections;
  aliceInbox.drop();
  await until(() => aliceInbox.connections > before && nostrDmNow().reading === 1, 'the inbox to be read again', 10_000);
  stopNostrDm();
});

test('a NIP-05 name gives its key and relays', { skip: !coreReady }, async () => {
  const fetched: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    fetched.push(url);
    return new Response(JSON.stringify({ names: { bob: 'b'.repeat(64) }, relays: { ['b'.repeat(64)]: ['wss://inbox.bob.example'] } }), { status: 200 });
  }) as typeof fetch;
  try {
    assert.deepEqual(await lookUpNip05('Bob@Example.org'), { public: 'b'.repeat(64), relays: ['wss://inbox.bob.example'] });
    assert.deepEqual(fetched, ['https://example.org/.well-known/nostr.json?name=bob']);
    assert.equal(await lookUpNip05('carol@example.org'), null);
    assert.equal(await lookUpNip05('not a name'), null);
  } finally {
    globalThis.fetch = real;
  }
});

test('strangers cannot make chats without end', { skip: !coreReady }, async () => {
  const me = await newNostrDm();
  const someone = await newNostrDm();
  for (let i = 0; i < CHATS_MOST; i += 1) me.chats[i.toString(16).padStart(64, '0')] = { key: i.toString(16).padStart(64, '0'), messages: [{ id: `${i}`, mine: true, text: '', at: i }], unread: 0, lastAt: i };
  // Every chat has something of ours: the new one waits.
  const first = await wrapText(someone, me.public, 'one');
  assert.equal(await takeWrap(me, first.theirs), null);
  // Once chat 7 has only theirs, it makes room; the message comes again from the relay, and is taken.
  me.chats[(7).toString(16).padStart(64, '0')].messages[0].mine = false;
  assert.equal(await takeWrap(me, first.theirs), someone.public);
  assert.equal(Object.keys(me.chats).length, CHATS_MOST);
  assert.equal(me.chats[(7).toString(16).padStart(64, '0')], undefined);
});

test('Nostr chats are rows of the home list, a part of their own', () => {
  const ann = 'a'.repeat(64);
  const bob = 'b'.repeat(64);
  const state = {
    public: 'c'.repeat(64),
    people: { [bob]: { name: 'Bob there', at: 1 } },
    chats: {
      [ann]: { key: ann, name: 'Ann', unread: 2, lastAt: 10, messages: [{ id: '1', mine: true, text: 'hi', at: 100, state: 'sending' }] },
      [bob]: { key: bob, unread: 0, lastAt: 20, messages: [{ id: '2', mine: false, text: '', at: 50, file: true }] },
      ['d'.repeat(64)]: { key: 'd'.repeat(64), unread: 0, lastAt: 30, messages: [] },
    },
  } as unknown as NostrDmState;
  const rows = nostrInboxRows(state);
  const by = Object.fromEntries(rows.map((row) => [row.identity, row]));
  assert.deepEqual([by[`nostr:${ann}`].name, by[`nostr:${ann}`].last, by[`nostr:${ann}`].mark, by[`nostr:${ann}`].unread, by[`nostr:${ann}`].at], ['Ann', 'hi', -1, 2, 100]);
  // The name they gave themselves; a file as such; with no name, their npub's start and end.
  assert.deepEqual([by[`nostr:${bob}`].name, by[`nostr:${bob}`].last], ['Bob there', 'A file']);
  assert.equal(by[`nostr:${'d'.repeat(64)}`].name, shortNpub(npubOf('d'.repeat(64))));
  assert.equal(by[`nostr:${'d'.repeat(64)}`].at, 30);
  for (const row of rows) assert.deepEqual([showsIn(row, 'nostr'), showsIn(row, 'xmpp'), showsIn(row, 'erevos'), showsIn(row, 'all')], [true, false, false, true]);
  assert.deepEqual(inboxParts([], false, false, true), ['nostr']);
  assert.deepEqual(inboxParts(rows, true), ['matrix', 'nostr']);
});
