// Members of a group added as each other's contacts (lib/group-contacts.ts), with real chats
// (lib/e2e.ts) and the real core built to WebAssembly by checks/build-core.mjs: each phone adds the
// other from what the group says of it and the keys it gave, and their chat then goes both ways,
// with no message request on either side, whichever first packet comes first. A contact the space
// has already is never moved, and nothing of hidden chats is reached from here. Skipped, with a
// note, without the core.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { groupContacts } from '../lib/group-contacts';
import type { About } from '../lock/group-data';
import { files } from './files-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the group contact checks: build the core first with node checks/build-core.mjs');
}

const t = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !ready }, async () => {
    files.clear();
    await fn();
  });

const RELAY = 'wss://relay.example.org';
const sender = () => toHex(randomBytes(24));

/** A space's chats, with its queue on RELAY, what its groups say of it, and its contacts for them. */
async function phone(space: number) {
  const e2e = await E2E.open('space', space, randomBytes(32));
  const from = sender();
  const about: About = { id: toHex(e2e.identity), sender: from, relay: RELAY, relayKey: '', seal: toBase64Url(randomBytes(32)) };
  const contacts = groupContacts(async () => e2e, async () => ({ senderHex: from, relay: RELAY, relayKey: '' }));
  return { e2e, from, about, contacts, key: await contacts.bundle(about.id) };
}

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

type Phone = Awaited<ReturnType<typeof phone>>;

// Each first packet that waits, to the other phone, in that order.
async function firstPackets(...order: (readonly [Phone, Phone])[]) {
  const got: Extract<Received, { kind: 'message' }>[] = [];
  for (const [from, to] of order) {
    const [first] = from.e2e.pending();
    got.push(message(await to.e2e.receive(first.first)));
    await from.e2e.firstSent(first.identity);
  }
  return got;
}

for (const order of ['A first', 'B first'] as const) {
  t(`two members add each other from the group and talk, ${order}`, async () => {
    const a = await phone(0);
    const b = await phone(1);
    assert.equal(await a.contacts.has(a.about.id, b.about.id), false);
    await a.contacts.add(a.about.id, b.about, b.key);
    await b.contacts.add(b.about.id, a.about, a.key);
    assert.equal(await a.contacts.has(a.about.id, b.about.id), true);
    const got = order === 'A first' ? await firstPackets([a, b], [b, a]) : await firstPackets([b, a], [a, b]);
    for (const r of got) assert.deepEqual([r.request, r.added, r.text], [false, false, '']);
    for (const p of [a, b]) {
      assert.equal(p.e2e.contacts().length, 1);
      assert.equal(p.e2e.contacts()[0].request, false);
    }
    assert.equal(a.e2e.queueOf(b.about.id)?.sender, b.from);
    assert.equal(b.e2e.queueOf(a.about.id)?.sender, a.from);

    assert.equal(message(await b.e2e.receive((await a.e2e.seal(b.about.id, 'γεια', a.from)).packet)).text, 'γεια');
    assert.equal(message(await a.e2e.receive((await b.e2e.seal(a.about.id, 'hi', b.from)).packet)).text, 'hi');
  });
}

t('a member whose first packet came before the group’s answer is accepted, where it said', async () => {
  const a = await phone(0);
  const b = await phone(1);
  await b.contacts.add(b.about.id, a.about, a.key);
  const [early] = await firstPackets([b, a]);
  assert.deepEqual([early.request, early.added], [true, true]);
  // What the group says of B now names another queue: the one B's own message said stays.
  await a.contacts.add(a.about.id, { ...b.about, sender: sender() }, b.key);
  assert.equal(a.e2e.contacts()[0].request, false);
  assert.equal(a.e2e.queueOf(b.about.id)?.sender, b.from);
  assert.deepEqual(a.e2e.pending(), [], 'their conversation goes on');
});

t('a contact the space has already is left as it is', async () => {
  const a = await phone(0);
  const b = await phone(1);
  await a.e2e.addContact({ senderHex: b.from, relayUrl: RELAY, key: b.key }, a.from);
  await a.e2e.rename(b.about.id, 'Bob');
  const before = a.e2e.record(b.about.id);
  await a.contacts.add(a.about.id, { ...b.about, sender: sender(), relay: 'wss://elsewhere.example.org', relayKey: toBase64Url(randomBytes(32)) }, b.key);
  assert.deepEqual(a.e2e.record(b.about.id), before);
  assert.equal(a.e2e.queueOf(b.about.id)?.sender, b.from);
});

t('a member on another relay without its key, or with keys not its own, is not added', async () => {
  const a = await phone(0);
  const b = await phone(1);
  const c = await phone(2);
  await assert.rejects(a.contacts.add(a.about.id, { ...b.about, relay: 'wss://elsewhere.example.org', relayKey: '' }, b.key));
  await assert.rejects(a.contacts.add(a.about.id, b.about, c.key));
  assert.deepEqual([a.e2e.contacts(), a.e2e.pending()], [[], []]);
  // With that relay's key, it is.
  await a.contacts.add(a.about.id, { ...b.about, relay: 'wss://elsewhere.example.org', relayKey: toBase64Url(randomBytes(32)) }, b.key);
  assert.equal(a.e2e.contacts().length, 1);
});

t('a space opened meanwhile is neither written to nor named', async () => {
  const a = await phone(0);
  const b = await phone(1);
  const other = await phone(2);
  // A's groups ask, while the space open is another account's: once already, or once where this
  // phone is reached has been read.
  let open = a.e2e;
  let opens: typeof open | null = null;
  const contacts = groupContacts(
    async () => open,
    async () => {
      if (opens) open = opens;
      return { senderHex: a.from, relay: RELAY, relayKey: '' };
    },
  );
  open = other.e2e;
  await assert.rejects(contacts.bundle(a.about.id), /Another space is open now\./);
  await assert.rejects(contacts.has(a.about.id, b.about.id), /Another space is open now\./);
  await assert.rejects(contacts.add(a.about.id, b.about, b.key), /Another space is open now\./);
  open = a.e2e;
  opens = other.e2e;
  await assert.rejects(contacts.add(a.about.id, b.about, b.key), /Another space is open now\./);
  for (const p of [a, other]) assert.deepEqual([p.e2e.contacts(), p.e2e.pending()], [[], []]);
});

t('a message request is a contact, but not an accepted one', async () => {
  const a = await phone(0);
  const b = await phone(1);
  await b.contacts.add(b.about.id, a.about, a.key);
  await firstPackets([b, a]);
  assert.deepEqual([await a.contacts.has(a.about.id, b.about.id), await a.contacts.accepted(a.about.id, b.about.id)], [true, false]);
  await a.contacts.add(a.about.id, b.about, b.key);
  assert.equal(await a.contacts.accepted(a.about.id, b.about.id), true);
  assert.equal(await b.contacts.accepted(b.about.id, a.about.id), true);
});

test('asking members for contact links reaches nothing of hidden chats', () => {
  // A group goes only to the space's own chats: hidden ones are never opened, nor a link offered to the chat shown.
  for (const path of ['../lib/groups.ts', '../lib/group-contacts.ts', '../lib/space-groups.ts']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    for (const name of [/\bofferContact\b/, /app\/contact['"]/, /\.\.\/app\//, /\bopenHiddenPlace\b/, /\bhiddenHolder\b/, /hidden-contacts/]) {
      assert.doesNotMatch(source, name, `${path} reaches ${name}`);
    }
  }
});
