// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The look of the battery mode Sleep (lib/sleep-look.ts): when the phone may sleep again early.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { awakeWhile, briefLook, joinSleepLooks, sleepLook, stayAwakeWhen, type LookEnd } from '../lib/sleep-look';

/** A part that ends each look it is kicked for with the next of `ends`, a moment later. */
function part(...ends: LookEnd[]) {
  let kicks = 0;
  const joined = joinSleepLooks(() => {
    kicks++;
    const began = joined.begin();
    const how = ends.shift() ?? 'quiet';
    setTimeout(() => joined.ended(began, how), 5);
  });
  return { kicks: () => kicks, leave: joined.leave };
}

test('with nothing that looks, the phone sleeps again at once', async () => {
  assert.equal(await sleepLook(), true);
  assert.equal(briefLook(), false);
});

test('each part looks once, without waiting at the relay, and nothing came: sleep', async () => {
  const a = part();
  const b = part();
  const look = sleepLook();
  assert.equal(briefLook(), true);
  assert.equal(await look, true);
  assert.equal(briefLook(), false);
  assert.deepEqual([a.kicks(), b.kicks()], [1, 1]);
  a.leave();
  b.leave();
});

test('something came: the phone is not let go early', async () => {
  const a = part('came');
  const b = part();
  assert.equal(await sleepLook(), false);
  a.leave();
  b.leave();
});

test('a look that failed is tried again, all parts anew', async () => {
  const a = part('failed', 'quiet');
  const b = part();
  assert.equal(await sleepLook(), true);
  assert.deepEqual([a.kicks(), b.kicks()], [2, 2]);
  a.leave();
  b.leave();
});

test('a look from before the alarm does not count', async () => {
  let began = -1;
  const joined = joinSleepLooks(() => undefined);
  // Under way as the alarm goes: it began with no look on.
  began = joined.begin();
  const look = sleepLook();
  joined.ended(began, 'quiet');
  assert.equal(briefLook(), true);
  joined.ended(joined.begin(), 'quiet');
  assert.equal(await look, true);
  joined.leave();
});

test('a part that leaves is waited for no more; work under way and Nostr keep the phone awake', async () => {
  const joined = joinSleepLooks(() => undefined);
  const look = sleepLook();
  joined.leave();
  assert.equal(await look, true);
  let done: () => void = () => undefined;
  const work = awakeWhile(new Promise<void>((resolve) => (done = resolve)));
  assert.equal(await sleepLook(), false);
  done();
  await work;
  assert.equal(await sleepLook(), true);
  const stop = stayAwakeWhen(() => true);
  assert.equal(await sleepLook(), false);
  stop();
  assert.equal(await sleepLook(), true);
});
