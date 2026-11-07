// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The home relay a space takes by itself (lib/pair.ts): what the first home relay becomes from the
// pair the space's relay names, and that pair as a real relay tells it (crates/erevos-relay,
// EREVOS_RELAY_PAIR) to a phone with a token of its own and to nobody else. The relay part is
// skipped, with a note, when the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { before, test } from 'node:test';

import { sha256Bytes } from '../lib/crypto';
import { pairChange, pairHere } from '../lib/pair';
import { newPhoneToken, pairOf, relayPair, toHex, type Relay } from '../lib/relay';
import { EMPTY_SPACE, type SpaceData, type SpareRelay } from '../lock/space-data';
import { freePort, ready, relayNote, startRelay } from './real-relay';

const binary = new URL('../../target/debug/erevos-relay', import.meta.url).pathname;
relayNote('the relay pair checks');

const OWN = 'wss://relay.example.org';
const HOME = 'wss://home.example.org';
const OTHER = 'wss://other.example.org';
const none: SpareRelay = { url: '', token: '', queue: null };
const taken = (url: string): SpareRelay => ({ url, token: '', queue: null, tor: true, auto: true });

function space(patch: Partial<SpaceData> = {}): SpaceData {
  return { ...EMPTY_SPACE, url: OWN, ...patch };
}

test('a space with no home relay takes the first of the pair that is not its own relay, through Tor', () => {
  assert.equal(EMPTY_SPACE.pairHome, true);
  assert.deepEqual(pairChange(space(), [HOME]), taken(HOME));
  assert.deepEqual(pairChange(space(), [`${OWN}/`, HOME, OTHER]), taken(HOME));
  assert.equal(pairChange(space(), []), null);
  assert.equal(pairChange(space(), [OWN]), null);
});

test('nothing is taken when it is turned off, the space is stopped, or it has no relay', () => {
  assert.equal(pairChange(space({ pairHome: false }), [HOME]), null);
  assert.equal(pairChange(space({ stopped: 1 }), [HOME]), null);
  assert.equal(pairChange(space({ url: ' ' }), [HOME]), null);
});

test('a home relay the owner typed stays, whatever the relay names', () => {
  assert.equal(pairChange(space({ spare: { url: OTHER, token: 'typed', queue: null } }), [HOME]), null);
  assert.equal(pairChange(space({ spare: { url: OTHER, token: '', queue: null, tor: true } }), [HOME]), null);
  assert.equal(pairChange(space({ spare: { url: OWN, token: '', queue: null } }), [HOME]), null);
});

test('one set by itself follows the pair', () => {
  // Still named: it stays, with its queue.
  const kept: SpareRelay = { ...taken(HOME), queue: { recipientHex: 'a'.repeat(48), senderHex: 'b'.repeat(48) } };
  assert.equal(pairChange(space({ spare: kept }), [OTHER, HOME]), null);
  // Named no more: the new one.
  assert.deepEqual(pairChange(space({ spare: kept }), [OTHER]), taken(OTHER));
  // The relay names none for now: it stays.
  assert.equal(pairChange(space({ spare: kept }), []), null);
  // It became the space's own relay: another, or none.
  assert.deepEqual(pairChange(space({ spare: taken(OWN) }), [OWN, HOME]), taken(HOME));
  assert.deepEqual(pairChange(space({ spare: taken(OWN) }), []), none);
});

test('one the space has among its other home relays is not taken again', () => {
  const spare: SpareRelay = { ...none, more: [{ url: HOME, token: 'typed', queue: null }] };
  assert.deepEqual(pairChange(space({ spare }), [HOME, OTHER]), taken(OTHER));
  assert.equal(pairChange(space({ spare }), [HOME]), null);
});

test('only on Android, where Erevos has Tor', () => {
  assert.equal(pairHere(), false);
});

function reply(urls: string[], count = urls.length): Uint8Array {
  const out = [0, count];
  for (const url of urls) {
    const bytes = new TextEncoder().encode(url);
    out.push(bytes.length >> 8, bytes.length & 0xff, ...bytes);
  }
  return Uint8Array.from(out);
}

test('a reply to PAIR keeps only relay addresses, and stops where it is cut short', () => {
  assert.deepEqual(pairOf(reply([HOME, 'https://web.example.org', 'ws://lan.example.org:7879/path', 'wss://a b'])), [HOME, 'ws://lan.example.org:7879/path']);
  assert.deepEqual(pairOf(reply([`wss://${'a'.repeat(250)}.org`])), []);
  assert.deepEqual(pairOf(reply([HOME, OTHER], 3)), [HOME, OTHER]);
  assert.deepEqual(pairOf(reply([HOME, OTHER]).slice(0, -2)), [HOME]);
  assert.deepEqual(pairOf(Uint8Array.of(0)), []);
});

const hashLine = (token: string, name: string) => `${toHex(sha256Bytes(new TextEncoder().encode(token)))} ${name}\n`;

let dir = '';
let key = '';
let tokens = '';
let member = '';

before(() => {
  if (!ready) return;
  dir = mkdtempSync(join(tmpdir(), 'erevos-pair-'));
  key = join(dir, 'coupon.key');
  execFileSync(binary, ['new-coupon-key', key], { stdio: 'ignore' });
  member = newPhoneToken();
  tokens = join(dir, 'phones.tokens');
  writeFileSync(tokens, hashLine(member, 'member'));
});

test('a relay tells a phone with a token of its own the relays it is paired with', { skip: !ready }, async () => {
  const url = await startRelay(false, '', false, {
    EREVOS_RELAY_TOKENS: tokens,
    EREVOS_RELAY_COUPON_KEY: key,
    EREVOS_RELAY_PAIR: `${HOME}/, ws://lan.example.org:7879 ${HOME.toUpperCase()}`,
  });
  const relay: Relay = { url, token: member };
  assert.deepEqual(await relayPair(relay), [HOME, 'ws://lan.example.org:7879']);
});

test('none from a relay that names no pair, signs no coupons, or for a phone without a token of its own', { skip: !ready }, async () => {
  const unpaired = await startRelay(false, '', false, { EREVOS_RELAY_TOKENS: tokens, EREVOS_RELAY_COUPON_KEY: key });
  assert.deepEqual(await relayPair({ url: unpaired, token: member }), []);
  const unsigned = await startRelay(false, '', false, { EREVOS_RELAY_TOKENS: tokens, EREVOS_RELAY_PAIR: HOME });
  assert.deepEqual(await relayPair({ url: unsigned, token: member }), []);
  const open = await startRelay(false, '', false, { EREVOS_RELAY_COUPON_KEY: key, EREVOS_RELAY_PAIR: HOME });
  assert.deepEqual(await relayPair({ url: open }), []);
});

test('a relay given a pair that is not relay addresses does not start', { skip: !ready }, async () => {
  const [tcp, ws] = [await freePort(), await freePort()];
  for (const pair of ['https://home.example.org', 'wss://a, wss://b, wss://c, wss://d', 'wss://home.example.org/?x']) {
    const run = spawnSync(binary, [`127.0.0.1:${tcp}`, `127.0.0.1:${ws}`], {
      env: { ...process.env, EREVOS_RELAY_TOKEN: '', EREVOS_RELAY_COUPON_KEY: key, EREVOS_RELAY_PAIR: pair },
      timeout: 10_000,
      encoding: 'utf8',
    });
    assert.equal(run.status, 1, pair);
    assert.match(run.stderr, /EREVOS_RELAY_PAIR/);
  }
});
