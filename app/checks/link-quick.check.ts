// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Linking a computer with the short code: the code (lib/link-quick.ts), and the two sides talking
// through Nostr wraps on relays of the checks' own (lib/link-nostr.ts, checks/nostr-relay.ts).

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { parseLinkCode } from '../lib/link-code';
import { QuickChannel, quickSecret } from '../lib/link-nostr';
import { parseQuick, QUICK_RELAYS, quickLink, quickText, readQuick, type QuickMessage } from '../lib/link-quick';
import { setNostrOpen } from '../lib/nostr-dm-net';
import { FakeRelay } from './nostr-relay';

const KEY = 'ab'.repeat(32);
const SECRET = 'cd'.repeat(16);

test('the short code is short, reads back, and is never taken for the full one', () => {
  const link = quickLink({ nostr: KEY, secret: SECRET, name: 'Γραφείο & σπίτι' });
  assert.ok(link.length < 260, `${link.length} characters`);
  assert.ok(quickLink({ nostr: KEY, secret: SECRET, name: 'Computer' }).length < 140);
  assert.deepEqual(parseQuick(link), { nostr: KEY, secret: SECRET, name: 'Γραφείο & σπίτι' });
  assert.equal(parseLinkCode(link), null);
  assert.equal(parseQuick(`erevos://link?key=x&n=${KEY}&s=${SECRET}`), null);
  assert.equal(parseQuick(`erevos://link?n=${KEY.slice(2)}&s=${SECRET}`), null);
  assert.equal(parseQuick(`erevos://link?n=${KEY}&s=${SECRET}zz`), null);
  assert.equal(parseQuick(`erevos://contact?n=${KEY}&s=${SECRET}`), null);
});

test('only a message with the code’s secret, and in shape, is taken', () => {
  const grant = quickText({ t: 'grant', s: SECRET, relay: 'wss://relay.example', to: KEY, code: 'ef'.repeat(32) });
  assert.deepEqual(readQuick(grant, SECRET), { t: 'grant', s: SECRET, relay: 'wss://relay.example', to: KEY, code: 'ef'.repeat(32) });
  assert.equal(readQuick(grant, '00'.repeat(16)), null);
  // An invite wins over a token; a token goes only where there is no invite.
  const both = JSON.stringify({ v: 1, t: 'grant', s: SECRET, relay: 'wss://relay.example', to: KEY, code: 'ef'.repeat(32), tk: 'shared' });
  assert.equal((readQuick(both, SECRET) as { tk?: string }).tk, undefined);
  const shared = quickText({ t: 'grant', s: SECRET, relay: 'wss://relay.example', to: KEY, tk: 'shared-token' });
  assert.equal((readQuick(shared, SECRET) as { tk?: string }).tk, 'shared-token');
  for (const bad of [
    { v: 1, t: 'grant', s: SECRET, relay: 'https://relay.example', to: KEY },
    { v: 1, t: 'grant', s: SECRET, relay: 'wss://relay.example', to: 'nope' },
    { v: 1, t: 'grant', s: SECRET, relay: 'wss://relay.example', to: KEY, code: 'short' },
    { v: 1, t: 'grant', s: SECRET, relay: 'wss://relay.example', to: KEY, tk: 'a b' },
    { v: 1, t: 'offer', s: SECRET, link: 'https://example.org' },
    { v: 1, t: 'linked', s: SECRET, code: '1234<script>' },
    { v: 2, t: 'linked', s: SECRET, code: '12345' },
    { v: 1, t: 'other', s: SECRET },
  ]) {
    assert.equal(readQuick(JSON.stringify(bad), SECRET), null, JSON.stringify(bad));
  }
  assert.equal(readQuick('not json', SECRET), null);
  assert.equal(readQuick(`{"v":1,"t":"offer","s":"${SECRET}","link":"erevos://link?${'x'.repeat(9000)}"}`, SECRET), null);
});

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).nostrWrap === 'function';
if (!coreReady) console.log('Skipping the short code link through Nostr: build the core first with node checks/build-core.mjs');

const relays = new Map<string, FakeRelay>();

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  // One relay that keeps wraps for their reader only, one that takes nothing, one plain.
  relays.set(QUICK_RELAYS[0], new FakeRelay(QUICK_RELAYS[0], { guarded: true }));
  relays.set(QUICK_RELAYS[1], new FakeRelay(QUICK_RELAYS[1], { refuses: true }));
  relays.set(QUICK_RELAYS[2], new FakeRelay(QUICK_RELAYS[2]));
  setNostrOpen(async (url) => {
    const found = relays.get(url);
    if (!found) throw new Error(`No relay at ${url}`);
    return found.link();
  });
});

after(() => {
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

test('the computer and the phone talk through Nostr with the code’s secret only', { skip: !coreReady }, async () => {
  const secret = quickSecret();
  const atComputer: QuickMessage[] = [];
  const atPhone: QuickMessage[] = [];
  const atStranger: QuickMessage[] = [];
  const computer = await QuickChannel.open(secret, (m) => atComputer.push(m));
  const code = parseQuick(quickLink({ nostr: computer.key, secret, name: 'Computer' }))!;
  const phone = await QuickChannel.open(code.secret, (m) => atPhone.push(m));
  // Someone who did not read the code: another secret, the same key to write to.
  const stranger = await QuickChannel.open(quickSecret(), (m) => atStranger.push(m));
  await stranger.send(code.nostr, { t: 'grant', relay: 'wss://evil.example', to: stranger.key });

  await phone.send(code.nostr, { t: 'grant', relay: 'wss://relay.example', to: phone.key, code: 'ef'.repeat(32) });
  await until(() => atComputer.length > 0, 'the grant');
  assert.deepEqual(atComputer, [{ t: 'grant', s: secret, relay: 'wss://relay.example', to: phone.key, code: 'ef'.repeat(32) }]);

  const full = 'erevos://link?key=abc&id=00&relay=wss%3A%2F%2Frelay.example&s=00&name=Computer';
  await computer.send(phone.key, { t: 'offer', link: full });
  await until(() => atPhone.length > 0, 'the offer');
  assert.deepEqual(atPhone, [{ t: 'offer', s: secret, link: full }]);

  await phone.send(code.nostr, { t: 'linked', code: '12345 67890 12345 67890' });
  await until(() => atComputer.length > 1, 'the code to compare');
  assert.deepEqual(atComputer[1], { t: 'linked', s: secret, code: '12345 67890 12345 67890' });

  // Each wrap read once, though two relays had it; the stranger's never taken.
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(atComputer.length, 2);
  assert.equal(atStranger.length, 0);
  // The guarded relay gave the wraps only to whoever showed the key they were for.
  assert.ok(relays.get(QUICK_RELAYS[0])!.authed.includes(computer.key));
  // What the relays kept names neither side's key as its author.
  for (const event of relays.get(QUICK_RELAYS[2])!.events) {
    assert.notEqual(event.pubkey, computer.key);
    assert.notEqual(event.pubkey, phone.key);
  }
  computer.close();
  phone.close();
  stranger.close();
});

test('a side whose relays are all out of reach says so', { skip: !coreReady }, async () => {
  setNostrOpen(async (url) => {
    throw new Error(`No relay at ${url}`);
  });
  try {
    const channel = await QuickChannel.open(quickSecret(), () => undefined);
    let why = '';
    channel.whenDown((said) => (why = said));
    await until(() => why !== '', 'the relays to fail');
    assert.match(why, /Nostr/);
    await assert.rejects(channel.send(channel.key, { t: 'linked', code: '1' }));
    channel.close();
  } finally {
    setNostrOpen(async (url) => relays.get(url)!.link());
  }
});
