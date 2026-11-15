// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Pairing by a code of 8 digits (lib/pair-code.ts): the code, the messages, and two phones that
// agree on a key with it through Nostr wraps on relays of the checks' own (checks/nostr-relay.ts).

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { nostrKeys, setCore, type Core } from '../lib/core';
import { setNostrOpen } from '../lib/nostr-dm-net';
import { boxKey, newPairCode, PAIR_TRIES, pairText, readPair, readPairCode, setPairNet, showCode, showPairCode, typeCode } from '../lib/pair-code';
import { FakeRelay } from './nostr-relay';

const H32 = 'ab'.repeat(32);
const S = 'cd'.repeat(16);

test('a code is 8 digits, each as likely, and reads back however it is typed', () => {
  const counts = new Array(10).fill(0);
  for (let i = 0; i < 2000; i++) {
    const code = newPairCode();
    assert.match(code, /^[0-9]{8}$/);
    for (const digit of code) counts[Number(digit)]++;
  }
  // 16,000 digits: each near 1,600.
  for (const count of counts) assert.ok(count > 1300 && count < 1900, String(counts));
  assert.equal(showPairCode('12345678'), '1234 5678');
  assert.equal(readPairCode('1234 5678'), '12345678');
  assert.equal(readPairCode(' 1234-5678 '), '12345678');
  assert.equal(readPairCode('1234567'), null);
  assert.equal(readPairCode('123456789'), null);
  assert.equal(readPairCode('1234 567a'), null);
  // The place the phones meet hangs on the first 3 digits alone.
  assert.deepEqual(boxKey('12345678'), boxKey('12399999'));
  assert.notDeepEqual(boxKey('12345678'), boxKey('12445678'));
});

test('only a message in shape is taken', () => {
  for (const message of [
    { t: 'hello', s: S, y: H32, at: 5 },
    { t: 'answer', s: S, y: H32, to: H32, k: H32, b: 'beef' },
    { t: 'done', s: S, to: H32, k: H32, b: 'beef' },
    { t: 'wrong', s: S, to: H32 },
  ] as const) {
    assert.deepEqual(readPair(pairText(message)), message);
  }
  for (const bad of [
    { v: 2, t: 'hello', s: S, y: H32, at: 5 },
    { v: 1, t: 'hello', s: 'short', y: H32, at: 5 },
    { v: 1, t: 'hello', s: S, y: H32 },
    { v: 1, t: 'answer', s: S, y: H32, to: H32, k: 'xx', b: 'beef' },
    { v: 1, t: 'done', s: S, to: H32, k: H32, b: 'not hex' },
    { v: 1, t: 'other', s: S },
  ]) {
    assert.equal(readPair(JSON.stringify(bad)), null, JSON.stringify(bad));
  }
  assert.equal(readPair('not json'), null);
});

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).pairStart === 'function';
if (!coreReady) console.log('Skipping pairing by a code through Nostr: build the core first with node checks/build-core.mjs');

const URLS = ['wss://one.example', 'wss://two.example'];
const relays = new Map<string, FakeRelay>();

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  relays.set(URLS[0], new FakeRelay(URLS[0], { guarded: true }));
  relays.set(URLS[1], new FakeRelay(URLS[1]));
  setNostrOpen(async (url) => {
    const found = relays.get(url);
    if (!found) throw new Error(`No relay at ${url}`);
    return found.link();
  });
  setPairNet(() => nostrKeys(), URLS);
});

after(() => {
  setPairNet(null);
  setNostrOpen(null);
  setCore(null);
});

const A = 'erevos://contact?link=of-the-phone-that-shows';
const B = 'erevos://contact?link=of-the-phone-that-types';

test('two phones with the same code each end with the other’s link, and no relay sees either', { skip: !coreReady }, async () => {
  const code = newPairCode();
  const shower = await showCode(code, A);
  const typer = await typeCode(showPairCode(code).replace(' ', ''), B);
  const [shown, typed] = await Promise.all([shower.done, typer.done]);
  assert.deepEqual(shown, { link: B });
  assert.deepEqual(typed, { link: A });
  for (const relay of relays.values()) {
    for (const event of relay.events) {
      assert.ok(!JSON.stringify(event).includes('of-the-phone'), 'a link in the clear');
      assert.ok(!JSON.stringify(event).includes(code), 'the code in the clear');
    }
  }
});

test('a wrong code is told as wrong, opens nothing, and the code shown closes after the tries', { skip: !coreReady }, async () => {
  const code = '55512345';
  const shower = await showCode(code, A);
  const ends = [];
  for (let i = 0; i < PAIR_TRIES; i++) {
    // The same first 3 digits, so they meet, but another secret.
    const typer = await typeCode(`555${String(99990 + i)}`, B);
    ends.push(await typer.done);
  }
  for (const end of ends) {
    assert.ok('error' in end, JSON.stringify(end));
    assert.match((end as { error: string }).error, /code/);
  }
  const shown = await shower.done;
  assert.ok('error' in shown && /wrong codes/.test(shown.error), JSON.stringify(shown));
  // And the right code, now, finds no one.
  const late = await typeCode(code, B);
  late.stop();
  assert.deepEqual(await late.done, { error: '' });
});

test('stopping ends a pairing at once', { skip: !coreReady }, async () => {
  const shower = await showCode(newPairCode(), A);
  shower.stop();
  assert.deepEqual(await shower.done, { error: '' });
});
