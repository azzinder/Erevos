// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Coupons (lib/coupons.ts, crates/erevos-relay/src/coupons.rs): a home relay's token for a coupon
// the space's relay signed blind, against two real relays and the real core built to WebAssembly
// by checks/build-core.mjs, here straight rather than through Tor, which the WebAssembly core has
// not. And what the home relay settings keep of it (lib/spare.ts). Skipped, with a note, when
// either build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { before, test } from 'node:test';

import { ready, relayNote, startRelay } from './real-relay';
import { setCore, type Core } from '../lib/core';
import { ASK_LEAST, ASK_MOST, couponEnded, couponStep, RENEW_LEAST, RENEW_MOST, RENEW_WAIT_LEAST, RENEW_WAIT_MOST, WAIT_LEAST, WAIT_MOST, wantsCoupon } from '../lib/coupons';
import { sha256Bytes } from '../lib/crypto';
import { couponIssuers, couponKey, createQueue, newPhoneToken, RelayError, signCoupon, toHex, type Relay } from '../lib/relay';
import { homeRelays, setSpareRelays, type SpareStore } from '../lib/spare';
import { EMPTY_SPACE, type SpaceData, type SpareRelay } from '../lock/space-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const binary = new URL('../../target/debug/erevos-relay', import.meta.url).pathname;
const go = ready && existsSync(built);
relayNote('the coupon checks');
if (ready && !go) console.log('Skipping the coupon checks: build the core first (node checks/build-core.mjs)');

const hashLine = (token: string, name: string) => `${toHex(sha256Bytes(new TextEncoder().encode(token)))} ${name}\n`;

// The space's relay, which signs coupons for its member, and the home relay, which takes them.
let member = '';
let primary: Relay = { url: '' };
let home = '';
let homeTokens = '';
// A relay that takes no coupons.
let open = '';

before(async () => {
  if (!go) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
  const dir = mkdtempSync(join(tmpdir(), 'erevos-coupons-'));
  const key = join(dir, 'coupon.key');
  execFileSync(binary, ['new-coupon-key', key], { stdio: 'ignore' });
  member = newPhoneToken();
  const primaryTokens = join(dir, 'primary.tokens');
  writeFileSync(primaryTokens, hashLine(member, 'member'));
  homeTokens = join(dir, 'home.tokens');
  writeFileSync(homeTokens, '');
  const issuers = join(dir, 'issuers');
  writeFileSync(issuers, readFileSync(`${key}.pub`));
  primary = { url: await startRelay(false, '', false, { EREVOS_RELAY_TOKENS: primaryTokens, EREVOS_RELAY_COUPON_KEY: key }), token: member };
  home = await startRelay(false, '', false, { EREVOS_RELAY_TOKENS: homeTokens, EREVOS_RELAY_COUPON_ISSUERS: issuers });
  open = await startRelay();
});

test('a member of the space’s relay takes a token on the home relay with a coupon, some time after it was signed', { skip: !go }, async () => {
  const spare: SpareRelay = { url: home, token: '', queue: null };
  const asked = 1_800_000_000_000;
  // First the home relay is asked which issuers it takes; the space's relay signs minutes later.
  assert.deepEqual(await couponStep(spare, primary, asked, () => 0.5), { next: null, waits: true });
  const signFrom = asked + ASK_LEAST + Math.floor(0.5 * (ASK_MOST - ASK_LEAST));
  assert.deepEqual(await couponStep(spare, primary, signFrom - 1), { next: null, waits: true });
  const now = signFrom;
  const first = await couponStep(spare, primary, now, () => 0.5);
  assert.equal(first.waits, true);
  const pending = first.next?.pending;
  assert.ok(pending);
  assert.equal(pending.after, now + WAIT_LEAST + Math.floor(0.5 * (WAIT_MOST - WAIT_LEAST)));
  assert.equal(first.next?.token, '');
  // Before its time: nothing asked.
  assert.deepEqual(await couponStep(first.next!, primary, pending.after - 1), { next: null, waits: true });
  const second = await couponStep(first.next!, primary, pending.after, () => 0.5);
  assert.equal(second.waits, false);
  assert.equal(second.next?.token, pending.token);
  assert.equal(second.next?.coupon, pending.after);
  assert.equal(second.next?.pending, undefined);
  // Renewed on a day picked at random, hours after a new coupon is signed.
  assert.equal(second.next?.renew, pending.after + RENEW_LEAST + Math.floor(0.5 * (RENEW_MOST - RENEW_LEAST)));
  const renew = second.next!.renew!;
  // The issuers said a day before are asked again first.
  assert.deepEqual(await couponStep(second.next!, primary, renew, () => 0.5), { next: null, waits: true });
  const signed = renew + ASK_MOST;
  const renewing = await couponStep(second.next!, primary, signed, () => 0.5);
  assert.equal(renewing.waits, true);
  assert.equal(renewing.next?.token, pending.token);
  assert.equal(renewing.next?.pending?.after, signed + RENEW_WAIT_LEAST + Math.floor(0.5 * (RENEW_WAIT_MOST - RENEW_WAIT_LEAST)));
  // The home relay has a line for it, named spare, and the token makes a queue there.
  assert.match(readFileSync(homeTokens, 'utf8'), new RegExp(`^${toHex(sha256Bytes(new TextEncoder().encode(pending.token)))} spare # came with a coupon`, 'm'));
  await createQueue({ url: home, token: pending.token });
  // The same coupon with another token is refused, and let go of.
  const again = await couponStep({ ...first.next!, pending: { ...pending, token: newPhoneToken() } }, primary, pending.after);
  assert.deepEqual(again, { next: { url: home, token: '', queue: null }, waits: false });
});

test('the space’s relay says its key to its member only, and the home relay its issuers to anyone', { skip: !go }, async () => {
  const key = await couponKey(primary);
  assert.ok(key);
  assert.deepEqual((await couponIssuers(home, false)).map(toHex), [toHex(sha256Bytes(key))]);
  assert.deepEqual(await couponIssuers(open, false), []);
  await assert.rejects(signCoupon(primary, new Uint8Array(10)), RelayError);
});

test('a home relay that takes no coupons goes on with no token, and one with no relay of the space’s is said', { skip: !go }, async () => {
  assert.deepEqual(await couponStep({ url: open, token: '', queue: null }, primary), { next: null, waits: false });
  const now = 1_900_000_000_000;
  assert.deepEqual(await couponStep({ url: home, token: '', queue: null }, null, now), { next: null, waits: true });
  await assert.rejects(couponStep({ url: home, token: '', queue: null }, null, now + ASK_MOST), RelayError);
  // A token still going is used while a renewal fails.
  const going: SpareRelay = { url: home, token: 'kept', queue: null, coupon: now - RENEW_LEAST };
  assert.deepEqual(await couponStep(going, null, now + ASK_MOST), { next: null, waits: false });
});

test('which home relays take a coupon, and what their settings keep of it', async () => {
  const now = 1_800_000_000_000;
  const tor: SpareRelay = { url: 'wss://home.example', token: '', queue: null, tor: true };
  assert.equal(wantsCoupon(tor, now), true);
  assert.equal(wantsCoupon({ ...tor, tor: undefined }, now), false);
  assert.equal(wantsCoupon({ ...tor, token: 'typed' }, now), false);
  assert.equal(wantsCoupon({ ...tor, token: 'from a coupon', coupon: now - RENEW_LEAST + 1 }, now), false);
  assert.equal(wantsCoupon({ ...tor, token: 'from a coupon', coupon: now - RENEW_LEAST }, now), true);
  assert.equal(wantsCoupon({ ...tor, token: 'from a coupon', coupon: now - RENEW_MOST, renew: now + 1 }, now), false);
  assert.equal(wantsCoupon({ ...tor, token: 'from a coupon', coupon: now - 1, renew: now }, now), true);
  assert.equal(couponEnded({ ...tor, coupon: now - 90 * 24 * 3600_000 }, now), true);

  let data: SpaceData = { ...EMPTY_SPACE, spare: { ...tor, token: 'from a coupon', coupon: now, renew: now + RENEW_LEAST, queue: { recipientHex: 'a'.repeat(48), senderHex: 'b'.repeat(48) } } };
  const store: SpareStore = { of: {}, load: async () => data, update: async (patch) => void (data = { ...data, ...patch }) };
  // Saved again with no token typed: the token from the coupon, and the queue, stay.
  await setSpareRelays([{ url: 'wss://home.example', token: '', tor: true }], store);
  assert.equal(data.spare.token, 'from a coupon');
  assert.equal(data.spare.coupon, now);
  assert.equal(data.spare.renew, now + RENEW_LEAST);
  assert.ok(data.spare.queue);
  // Not through Tor any more: no coupon's token goes along.
  await setSpareRelays([{ url: 'wss://home.example', token: '', tor: false }], store);
  assert.equal(data.spare.token, '');
  assert.equal(data.spare.coupon, undefined);
  assert.equal(data.spare.tor, undefined);
  // A token typed is the one used.
  await setSpareRelays([{ url: 'wss://home.example', token: 'typed', tor: true }], store);
  assert.deepEqual(homeRelays(data.spare)[0], { url: 'wss://home.example', token: 'typed', queue: data.spare.queue, tor: true });
});
