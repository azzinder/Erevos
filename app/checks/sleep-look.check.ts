// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The look of the battery mode Sleep (lib/sleep-look.ts): when the phone may sleep again early.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { awakeWhile, briefLook, forgetSleepLooks, joinSleepLooks, lookBegan, lookEnded, setLightSleep, sleepLook, stayAwakeWhen, waitBegan, waitEnded, type LookEnd } from '../lib/sleep-look';

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('light sleep: an answer from the relay holds the phone awake, and it is let go once every look waits there again', async () => {
  const log: string[] = [];
  setLightSleep({ hold: () => log.push('hold'), release: () => log.push('release') });
  try {
    // A look goes on, not waiting yet: the phone is not let go.
    lookBegan();
    await sleep(1700);
    assert.deepEqual([...log], []);
    // It waits at the relay: let go, a moment later.
    waitBegan(true);
    await sleep(1700);
    assert.deepEqual([...log], ['release']);
    // The wait ran out with nothing come: held while the look goes on, let go once it waits again.
    waitEnded(true, false);
    await sleep(1700);
    assert.deepEqual([...log], ['release', 'hold']);
    lookEnded();
    lookBegan();
    waitBegan(true);
    await sleep(1700);
    assert.deepEqual([...log], ['release', 'hold', 'release']);
    // A wait that failed takes no hold: with no network there is nothing to stay awake for.
    waitEnded(true, false, true);
    waitBegan(true);
    await sleep(100);
    assert.deepEqual([...log], ['release', 'hold', 'release']);
    // Something came: held, and not let go early though the look waits again.
    waitEnded(true, true);
    waitBegan(true);
    await sleep(1700);
    assert.deepEqual([...log], ['release', 'hold', 'release', 'hold']);
    // The waits on the contacts' queues alone, with no look under way, are enough to sleep on; none is not.
    forgetSleepLooks();
    setLightSleep({ hold: () => log.push('hold'), release: () => log.push('release') });
    log.length = 0;
    await sleep(1700);
    assert.deepEqual([...log], []);
    waitBegan(false);
    await sleep(1700);
    assert.deepEqual([...log], ['release']);
  } finally {
    forgetSleepLooks();
  }
});
