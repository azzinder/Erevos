// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The phone's call history and Android's blocked numbers in backups (lib/backup-calls.ts): the
// switch, what a backup holds of them and only while Erevos may read the call history, and what a
// restore adds to the phone: each call and number it lacks, none deleted. Android's side
// (CallsBackup.kt) can only be tried on a phone; its bounds are kept the same as the app's.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  backsUpCalls,
  callCounts,
  missingCalls,
  MOST_BLOCKED,
  MOST_CALLS,
  phoneCallsEntry,
  phoneCallsForBackup,
  phoneCallsOf,
  putPhoneCalls,
  setBacksUpCalls,
  type BackedUpCall,
} from '../lib/backup-calls';
import { utf8Decode, utf8Encode } from '../lib/crypto';
import { clearPhone, phone } from './phone-memory';
import { store } from './secure-memory';

const t = (name: string, fn: () => Promise<void> | void) =>
  test(name, async () => {
    store.clear();
    clearPhone();
    await fn();
  });

const DAY = 24 * 3600 * 1000;
// A call as Android reads it, its fields as a backup holds them.
const call = (number: string, date: number, more: Partial<BackedUpCall> = {}): BackedUpCall => ({
  number,
  presentation: 1,
  date,
  duration: 60,
  type: 1,
  features: 0,
  new: false,
  read: true,
  sim: 0,
  ...more,
});

t('the switch is off until the owner turns it on, and kept on the phone', async () => {
  assert.equal(await backsUpCalls(), false);
  await setBacksUpCalls(true);
  assert.equal(store.get('erevos.backup-calls'), '1');
  assert.equal(await backsUpCalls(), true);
  await setBacksUpCalls(false);
  assert.equal(store.has('erevos.backup-calls'), false);
  assert.equal(await backsUpCalls(), false);
});

t('a backup holds the calls and blocked numbers only while the switch is on and Erevos may read the call history', async () => {
  phone.calls = [call('+306912345678', 5 * DAY), call('', 6 * DAY, { presentation: 2, type: 3, duration: 0, new: true, read: false, sim: 1 })];
  phone.blocked = ['+302101234567', '6990000000'];
  assert.equal(await phoneCallsForBackup(), null);
  await setBacksUpCalls(true);
  const bytes = await phoneCallsForBackup();
  assert.ok(bytes);
  // The newest first, each with all it was, and the numbers as Android wrote them.
  assert.deepEqual(phoneCallsOf(bytes), { calls: [phone.calls[1], phone.calls[0]], blocked: ['+302101234567', '6990000000'] });
  assert.deepEqual(callCounts(bytes), { calls: 2, blocked: 2 });
  // Neither the phone app nor the SMS app: the calls without the blocked numbers.
  phone.listed = false;
  assert.deepEqual(callCounts((await phoneCallsForBackup())!), { calls: 2, blocked: 0 });
  // Android does not let Erevos read the call history: the backup is made without them.
  phone.callLog = false;
  assert.equal(await phoneCallsForBackup(), null);
});

t('what a backup holds is only what Android would take back, the newest calls up to the most', async () => {
  const good = call('+306912345678', DAY);
  const json = (value: unknown) => utf8Encode(JSON.stringify(value));
  const held = phoneCallsOf(
    json({
      v: 1,
      calls: [
        good,
        // A voicemail's row, a type no Android has, a number far too long, no date, a date not whole.
        { ...good, type: 4 },
        { ...good, type: 9 },
        { ...good, number: '1'.repeat(129) },
        { ...good, date: undefined },
        { ...good, date: 1.5 },
        // What is not right of one that is a call takes Android's own value.
        { number: '2101234567', date: 2 * DAY, type: 2, presentation: 0, duration: -1, features: 'hd', new: 'yes', read: 1, sim: 12, later: 'a newer field' },
        'not a call',
        null,
      ],
      blocked: ['+302101234567', '+302101234567', '', '   ', 7, 'x'.repeat(200), '6990000000'],
    }),
  );
  assert.deepEqual(held, {
    calls: [good, { number: '2101234567', presentation: 1, date: 2 * DAY, duration: 0, type: 2, features: 0, new: false, sim: -1 }],
    blocked: ['+302101234567', '6990000000'],
  });
  // A newer Erevos's, as far as it is understood; anything else is none.
  assert.deepEqual(phoneCallsOf(json({ v: 2, calls: [good], blocked: [], more: true })), { calls: [good], blocked: [] });
  for (const bytes of [json({ v: 0, calls: [good] }), json({ calls: [good] }), json([good]), json(null), utf8Encode('EREVOS SMS 1\n'), new Uint8Array([0xff, 0xfe])]) {
    assert.equal(phoneCallsOf(bytes), null);
    assert.equal(callCounts(bytes), null);
  }
  // Never more than the most, the newest, as the phone module gives them first.
  const many = Array.from({ length: MOST_CALLS + 5 }, (_, i) => call(`+30691${String(i).padStart(7, '0')}`, (MOST_CALLS + 5 - i) * 1000));
  const blocked = Array.from({ length: MOST_BLOCKED + 5 }, (_, i) => `+30210${String(i).padStart(7, '0')}`);
  const bounded = phoneCallsOf(phoneCallsEntry({ calls: many, blocked }))!;
  assert.equal(bounded.calls.length, MOST_CALLS);
  assert.deepEqual(bounded.calls.at(-1), many[MOST_CALLS - 1]);
  assert.equal(bounded.blocked.length, MOST_BLOCKED);
  // Its words: JSON, with the version first.
  assert.match(utf8Decode(phoneCallsEntry({ calls: [good], blocked: [] })), /^\{"v":1,"calls":\[\{"number":"\+306912345678"/);
});

t('a call is on the phone already when one there has the same number, second, duration and type', () => {
  const here = { calls: [call('+30 691 234-5678', 10_000_400), call('', 20_000_000, { presentation: 2, type: 3, duration: 0 })], blocked: ['+30 210 123 4567'] };
  const backup = {
    calls: [
      // The same calls, written otherwise, a few milliseconds apart.
      call('+306912345678', 10_000_900),
      call('', 20_000_000, { presentation: 2, type: 3, duration: 0, new: true }),
      // Another second, another duration, another type, another number.
      call('+306912345678', 10_001_000),
      call('+306912345678', 10_000_400, { duration: 61 }),
      call('+306912345678', 10_000_400, { type: 2 }),
      call('+306912345679', 10_000_400),
      // One the backup holds twice goes once.
      call('+306912345679', 10_000_400),
    ],
    blocked: ['+302101234567', '6990000000', '699-000-0000', '+302101234568'],
  };
  const missing = missingCalls(backup, here);
  assert.deepEqual(missing.calls, backup.calls.slice(2, 6));
  assert.deepEqual(missing.blocked, ['6990000000', '+302101234568']);
  assert.deepEqual(missingCalls(backup, { calls: [...here.calls, ...missing.calls], blocked: [...here.blocked, ...missing.blocked] }), { calls: [], blocked: [] });
});

t('a restore adds the calls and blocked numbers the phone lacks, and deletes none', async () => {
  const theirs = [call('+306912345678', 3 * DAY), call('+306900000000', 2 * DAY, { type: 2, sim: 1 }), call('+306911111111', DAY, { type: 3, new: true, read: false })];
  phone.calls = theirs;
  phone.blocked = ['+302101234567'];
  await setBacksUpCalls(true);
  const bytes = (await phoneCallsForBackup())!;

  // The new phone: a call of its own since, one of the backup's already there (as Android's own
  // backup brought it), and a number blocked already.
  clearPhone();
  const own = call('+306955555555', 4 * DAY);
  phone.calls = [own, { ...theirs[1] }];
  phone.blocked = ['+302101234567', '+302109999999'];
  assert.deepEqual(await putPhoneCalls(bytes), { calls: 2, blocked: 0 });
  assert.deepEqual(JSON.parse(phone.restored[0]), { calls: [theirs[0], theirs[2]], blocked: [] });
  assert.deepEqual(
    [...phone.calls].sort((a, b) => b.date - a.date),
    [own, theirs[0], theirs[1], theirs[2]],
  );
  assert.deepEqual(phone.blocked, ['+302101234567', '+302109999999']);
  // Again: nothing more to add, and the phone module is not asked.
  assert.deepEqual(await putPhoneCalls(bytes), { calls: 0, blocked: 0 });
  assert.equal(phone.restored.length, 1);

  // Blocked numbers it lacks go in too.
  clearPhone();
  assert.deepEqual(await putPhoneCalls(bytes), { calls: 3, blocked: 1 });
  assert.deepEqual(phone.blocked, ['+302101234567']);
  // While Android does not let Erevos read the phone's own calls, none goes in, as some would
  // then be there twice.
  clearPhone();
  phone.callLog = false;
  await assert.rejects(putPhoneCalls(bytes), /call history/);
  assert.equal(phone.restored.length, 0);
  // What is not such an entry adds nothing.
  phone.callLog = true;
  assert.deepEqual(await putPhoneCalls(utf8Encode('not json')), { calls: 0, blocked: 0 });
  assert.equal(phone.restored.length, 0);
});

test("Android's side holds no more calls and blocked numbers than a backup does, and leaves out what it cannot put back", () => {
  const kotlin = readFileSync(join(import.meta.dirname, '../modules/erevos-phone/android/src/main/java/expo/modules/erevosphone/CallsBackup.kt'), 'utf8');
  const most = (name: string) => Number(new RegExp(`const val ${name} = ([0-9_]+)`).exec(kotlin)?.[1].replace(/_/g, ''));
  assert.equal(most('MOST_CALLS'), MOST_CALLS);
  assert.equal(most('MOST_BLOCKED'), MOST_BLOCKED);
  assert.match(kotlin, /CallLog\.Calls\.TYPE\} != \$\{CallLog\.Calls\.VOICEMAIL_TYPE\}/);
  // The fields it reads are those a backup holds.
  const read = [...kotlin.matchAll(/\.put\("([a-z]+)"/g)].map((found) => found[1]);
  const fields = Object.keys(call('', 1));
  for (const field of fields) assert.ok(read.includes(field), field);
});
