// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A call's ring where Erevos runs in a page (modules/erevos-call/page-ring.web.ts): the web app, the
// computer's app and Sailfish OS's, where no module of the phone rings.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

// The browser, as the page sees it: its sound (Web Audio), which waits for a touch until allowed,
// its vibration, and the touches.
const played: number[] = [];
const vibrated: unknown[] = [];
const listeners: Record<string, () => void> = {};
let allowed = false;

class FakeSound {
  state: 'suspended' | 'running' | 'closed' = allowed ? 'running' : 'suspended';
  currentTime = 0;
  destination = {};
  async resume(): Promise<void> {
    if (allowed) this.state = 'running';
  }
  createGain() {
    const at = () => undefined;
    return { gain: { setValueAtTime: at, linearRampToValueAtTime: at }, connect: () => undefined };
  }
  createOscillator() {
    return { frequency: { value: 0 }, connect: () => undefined, start: (when: number) => void played.push(when), stop: () => undefined };
  }
}

Object.assign(globalThis, {
  AudioContext: FakeSound,
  window: { addEventListener: (type: string, listener: () => void) => void (listeners[type] = listener) },
});
Object.defineProperty(globalThis, 'navigator', { value: { vibrate: (pattern: unknown) => vibrated.push(pattern) }, configurable: true });

// As on Sailfish OS, where out of sight the phone's own ringtone rings instead (lib/shell-watch.ts).
process.env.EXPO_PUBLIC_SHELL = 'sailfish';
mock.timers.enable({ apis: ['setInterval'] });
const { pageRing } = await import('../modules/erevos-call/page-ring.web');
const settled = () => new Promise((done) => setImmediate(done));

test('before the page was touched a call does not ring late; after a touch it rings, two rings of two tones every 3 seconds', async () => {
  pageRing.ring(false, false);
  await settled();
  assert.equal(played.length, 0);
  // The browser lets the page sound once touched.
  allowed = true;
  listeners.pointerdown();
  await settled();
  mock.timers.tick(3000);
  assert.equal(played.length, 4);
  mock.timers.tick(3000);
  assert.equal(played.length, 8);
  pageRing.stopRinging();
  mock.timers.tick(9000);
  assert.equal(played.length, 8);
  assert.deepEqual(vibrated.at(-1), 0);
});

test('answered or ended, it stops; a chat whose ring is none does not ring', async () => {
  played.length = 0;
  pageRing.ring(true, true);
  assert.equal(played.length, 4);
  pageRing.stop();
  mock.timers.tick(6000);
  assert.equal(played.length, 4);
  pageRing.ring(false, false, '');
  mock.timers.tick(6000);
  assert.equal(played.length, 4);
  // A second call while one rings rings once, not twice.
  pageRing.ring(false, false);
  pageRing.ring(false, false);
  mock.timers.tick(3000);
  assert.equal(played.length, 4 + 4 + 4 + 4);
  pageRing.stopRinging();
});

test('on Sailfish OS, out of sight, the page does not ring too; once Erevos shows, it does', () => {
  played.length = 0;
  const page = { visibilityState: 'hidden' };
  Object.assign(globalThis, { document: page });
  pageRing.ring(false, false);
  mock.timers.tick(6000);
  assert.equal(played.length, 0);
  page.visibilityState = 'visible';
  mock.timers.tick(3000);
  assert.equal(played.length, 4);
  pageRing.stopRinging();
});
