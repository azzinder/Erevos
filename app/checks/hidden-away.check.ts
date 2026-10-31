// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Hidden chats close once Erevos was in the background more than RELOCK_MS (lib/hidden-away.ts):
// by a timer while it is away, or as it comes back when the timer could not run; not during a
// call, then once it ends; not while a photo or a file is picked for them; once each time away.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { watchHiddenAway } from '../lib/hidden-away';
import { RELOCK_MS } from '../lock/chat-pin';

// A fake clock, app state and calls, with timers that run only when told.
function world() {
  let clock = 1_000_000;
  let inCall = false;
  let picking = false;
  const timers = new Map<number, { at: number; run: () => void }>();
  let next = 1;
  const states = new Set<(state: string) => void>();
  const calls = new Set<() => void>();
  let closed = 0;
  const stop = watchHiddenAway(() => closed++, {
    onAppState: (listener) => {
      states.add(listener);
      return () => states.delete(listener);
    },
    onCallChange: (listener) => {
      calls.add(listener);
      return () => calls.delete(listener);
    },
    inCall: () => inCall,
    picking: () => picking,
    now: () => clock,
    setTimer: (run, ms) => {
      const id = next++;
      timers.set(id, { at: clock + ms, run });
      return id;
    },
    clearTimer: (id) => void timers.delete(id as number),
  });
  return {
    closed: () => closed,
    timers: () => timers.size,
    state: (state: string) => states.forEach((listener) => listener(state)),
    // Time passes; with `run`, the timers due run (Erevos receiving in the background), else not.
    pass: (ms: number, run = true) => {
      clock += ms;
      if (!run) return;
      for (const [id, timer] of [...timers]) {
        if (timer.at > clock) continue;
        timers.delete(id);
        timer.run();
      }
    },
    call: (on: boolean) => {
      inCall = on;
      calls.forEach((listener) => listener());
    },
    pick: (on: boolean) => {
      picking = on;
    },
    stop,
  };
}

test('away more than RELOCK_MS, the hidden chats close then, once', () => {
  const w = world();
  w.state('background');
  w.pass(RELOCK_MS - 1000);
  assert.equal(w.closed(), 0);
  w.pass(2000);
  assert.equal(w.closed(), 1);
  w.state('active');
  assert.equal(w.closed(), 1);
  // Away again: closed again.
  w.state('background');
  w.pass(RELOCK_MS + 1);
  assert.equal(w.closed(), 2);
  w.stop();
});

test('back sooner, nothing closes and the timer goes', () => {
  const w = world();
  w.state('background');
  w.pass(RELOCK_MS / 2);
  w.state('active');
  assert.equal(w.timers(), 0);
  w.pass(RELOCK_MS * 2);
  assert.equal(w.closed(), 0);
  w.stop();
});

test('with timers that could not run, they close as Erevos comes back, once', () => {
  const w = world();
  w.state('background');
  w.pass(RELOCK_MS + 5000, false);
  w.state('active');
  assert.equal(w.closed(), 1);
  w.pass(RELOCK_MS, true);
  assert.equal(w.closed(), 1);
  w.stop();
});

test('in a call they stay open until it ends, whether away or back', () => {
  const w = world();
  w.call(true);
  w.state('background');
  w.pass(RELOCK_MS + 1);
  assert.equal(w.closed(), 0);
  w.call(false);
  assert.equal(w.closed(), 1);

  const back = world();
  back.call(true);
  back.state('background');
  back.pass(RELOCK_MS + 1, false);
  back.state('active');
  assert.equal(back.closed(), 0);
  back.call(false);
  assert.equal(back.closed(), 1);
  w.stop();
  back.stop();
});

test('while a photo or a file is picked for them they stay open', () => {
  const w = world();
  w.pick(true);
  w.state('background');
  w.pass(RELOCK_MS + 1);
  assert.equal(w.closed(), 0);
  w.state('active');
  assert.equal(w.closed(), 0);
  w.stop();
});
