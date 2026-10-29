// The battery mode (lib/battery-mode.ts): kept for the phone, normal until chosen, told to those who follow it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { batteryMode, loadBatteryMode, onBatteryMode, saveBatteryMode } from '../lib/battery-mode';
import './secure-memory';

test('the battery mode is normal until chosen, then kept, and those who follow it are told', async () => {
  assert.equal(batteryMode(), 'normal');
  assert.equal(await loadBatteryMode(), 'normal');
  const told: string[] = [];
  const stop = onBatteryMode((mode) => told.push(mode));
  await saveBatteryMode('sleep');
  await saveBatteryMode('nearby');
  stop();
  await saveBatteryMode('normal');
  assert.deepEqual(told, ['sleep', 'nearby'], 'one that stopped is told no more');
  await saveBatteryMode('sleep');
  assert.equal(batteryMode(), 'sleep');
  assert.equal(await loadBatteryMode(), 'sleep', 'kept');
});
