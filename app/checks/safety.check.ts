// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Safety messages (lib/safety.ts, lib/waiting.ts rearmSafety, lock/history.ts): held by the relay,
// put off only while the owner looks at Erevos, never by Erevos in the background, and kept only as
// ours.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { isResend } from '../lock/history';
import { ACTIVE_MS, inTurn, isSafetyHours, needsRearm, ownerLooks, ownerTouched, REARM_AFTER, safetyDue, SAFETY_HOURS, safetyStopped, setShownCheck, stopSafety } from '../lib/safety';
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

test('the owner looks only while Erevos shows, past its password, touched lately', () => {
  const now = Date.now();
  ownerTouched(now);
  setShownCheck(() => false);
  assert.ok(!ownerLooks(now));
  setShownCheck(() => true);
  assert.ok(ownerLooks(now));
  assert.ok(!ownerLooks(now + ACTIVE_MS), 'shown, but untouched for a while');
  setSpaceGated(true);
  assert.ok(!ownerLooks(now), 'the password screen in front');
  setSpaceGated(false);
  setShownCheck(() => false);
});

test('holding anew and deleting take turns, and a deleted one is never held again', async () => {
  const order: string[] = [];
  const first = inTurn('aaaaaaaaaaaa', async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    order.push('held anew');
  });
  const second = inTurn('aaaaaaaaaaaa', async () => {
    order.push('taken back');
    stopSafety('aaaaaaaaaaaa');
  });
  await Promise.all([first, second]);
  assert.deepEqual(order, ['held anew', 'taken back']);
  assert.ok(safetyStopped('aaaaaaaaaaaa'));
  const waiting = read('lib', 'waiting.ts');
  assert.match(waiting, /safetyStopped\(message\.tag\)/);
  const chat = read('app', 'chat.tsx');
  assert.match(chat, /void inTurn\(message\.tag, async \(\) => \{\s*const dropped = await takeBack\(relayTarget\(\), heldNow\(\)\);\s*if \(dropped\) stopSafety\(message\.tag\);/);
});

test('sealed once: held anew as the same packets while the contact reads where they went', () => {
  const ok = { s: 'ab'.repeat(24), r: 'wss://relay.example.org', k: 'key', p: ['AAEC'] };
  assert.ok(isResend(ok));
  assert.ok(isResend({ ...ok, m: 'quiet' }));
  assert.ok(!isResend({ ...ok, p: [] }));
  assert.ok(!isResend({ ...ok, p: ['AAEC', 'AAEC', 'AAEC', 'AAEC', 'AAEC'] }));
  assert.ok(!isResend({ ...ok, s: 'x' }));
  assert.ok(!isResend({ ...ok, r: 'file:///etc' }));
  const waiting = read('lib', 'waiting.ts');
  const rearm = waiting.slice(waiting.indexOf('async function rearmOne'));
  assert.match(rearm, /e2e\.queueOf\(identity\)\?\.sender === kept\.s/);
  assert.match(rearm, /sendMessageLater\(target, fromHex\(kept\.s\), kept\.p\.map\(fromBase64\), at, kept\.m \?\? 'message'\)/);
});

test('only a look of the owner puts them off; the old one held is taken back; kept as ours only', () => {
  const waiting = read('lib', 'waiting.ts');
  assert.match(waiting, /if \(ownerLooks\(\)\) went\.push\(\.\.\.\(await rearmSafety\(/);
  const rearm = waiting.slice(waiting.indexOf('export async function rearmSafety'), waiting.indexOf('// Takes back each of `held`'));
  assert.match(rearm, /needsRearm\(message\.at, message\.safety, now\)/);
  assert.match(rearm, /await letGo\(e2e, place\.sends, \[ofIt\(held, message\.at\)\]\)/);
  const receiver = read('lib', 'receiver.ts');
  assert.match(receiver, /setShownCheck\(\(\) => shows\)/);
  const history = read('lock', 'history.ts');
  assert.match(history, /\.\.\.\(mine && isSafetyHours\(v\.z\) \? \{ z: v\.z, \.\.\.\(isResend\(v\.c\) \? \{ c: v\.c \} : \{\}\) \} : \{\}\)/);
  // Held anew only in place of the one held as it was read: two looks never both hold it.
  assert.match(history, /if \(!kept \|\| !kept\[9\]\?\.z \|\| kept\[9\]\?\.h !== was\) return Promise\.resolve\(false\);/);
});
