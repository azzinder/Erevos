// Safety messages (lib/safety.ts, lib/waiting.ts rearmSafety, lock/history.ts): held by the relay,
// put off only while the owner looks at Erevos, never by Erevos in the background, and kept only as
// ours.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { isSafetyHours, needsRearm, ownerLooks, REARM_AFTER, safetyDue, SAFETY_HOURS, setShownCheck } from '../lib/safety';
import { setSpaceGated } from '../lib/space-running';

const HOUR = 3_600_000;
const read = (...parts: string[]) => readFileSync(join(import.meta.dirname, '..', ...parts), 'utf8');

test('the hours are a few, from 6 hours to a week, and nothing else is kept', () => {
  assert.deepEqual([...SAFETY_HOURS], [6, 12, 24, 48, 72, 168]);
  for (const hours of SAFETY_HOURS) assert.ok(isSafetyHours(hours));
  for (const other of [0, 1, 5, 7, 169, -6, '6', null]) assert.ok(!isSafetyHours(other), String(other));
});

test('held anew only once it was held more than half an hour ago, and never once its time went', () => {
  const now = 1_000_000_000_000;
  assert.equal(safetyDue(24, now), now + 24 * HOUR);
  assert.ok(!needsRearm(safetyDue(24, now), 24, now), 'just held');
  assert.ok(!needsRearm(safetyDue(24, now - REARM_AFTER + 1000), 24, now));
  assert.ok(needsRearm(safetyDue(24, now - REARM_AFTER - 1000), 24, now));
  assert.ok(!needsRearm(now - 1, 24, now), 'gone already');
});

test('the owner looks only while Erevos shows, past its password', () => {
  setShownCheck(() => false);
  assert.ok(!ownerLooks());
  setShownCheck(() => true);
  assert.ok(ownerLooks());
  setSpaceGated(true);
  assert.ok(!ownerLooks(), 'the password screen in front');
  setSpaceGated(false);
  setShownCheck(() => false);
});

test('only a look of the owner puts them off; the old one held is taken back; kept as ours only', () => {
  const waiting = read('lib', 'waiting.ts');
  assert.match(waiting, /if \(ownerLooks\(\)\) went\.push\(\.\.\.\(await rearmSafety\(/);
  const rearm = waiting.slice(waiting.indexOf('export async function rearmSafety'), waiting.indexOf('// Takes back each of `held`'));
  assert.match(rearm, /needsRearm\(message\.at, safety, now\)/);
  assert.match(rearm, /await letGo\(e2e, place\.sends, \[ofIt\(held, message\.at\)\]\)/);
  const receiver = read('lib', 'receiver.ts');
  assert.match(receiver, /setShownCheck\(\(\) => shows\)/);
  const history = read('lock', 'history.ts');
  assert.match(history, /\.\.\.\(mine && isSafetyHours\(v\.z\) \? \{ z: v\.z \} : \{\}\)/);
  // Held anew only in place of the one held as it was read: two looks never both hold it.
  assert.match(history, /if \(!kept \|\| !kept\[9\]\?\.z \|\| kept\[9\]\?\.h !== was\) return Promise\.resolve\(false\);/);
  assert.match(rearm, /rearming\.has\(tag\)/);
});
