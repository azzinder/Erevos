// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The day over the first message of each day in a chat (lib/day-mark.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { setLang } from '../lib/i18n';
import { dayLabel, sameDay } from '../lib/day-mark';

// Saturday 21 November 2026, 09:30 on this machine's clock.
const NOW = new Date(2026, 10, 21, 9, 30).getTime();
const on = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

test('today and yesterday by name, also just past midnight', async () => {
  await setLang('en');
  assert.equal(dayLabel(on(2026, 11, 21, 0), NOW), 'Today');
  assert.equal(dayLabel(on(2026, 11, 20, 23), NOW), 'Yesterday');
  assert.equal(dayLabel(on(2026, 11, 20, 0), NOW), 'Yesterday');
});

test('the weekday within the last week, then weekday and date', async () => {
  await setLang('en');
  assert.equal(dayLabel(on(2026, 11, 17), NOW), 'Tuesday');
  assert.equal(dayLabel(on(2026, 11, 15), NOW), 'Sunday');
  assert.equal(dayLabel(on(2026, 11, 14), NOW), 'Saturday, November 14');
  assert.equal(dayLabel(on(2026, 1, 3), NOW), 'Saturday, January 3');
});

test('the year once it is another year, and a day ahead (a clock off) as a date', async () => {
  await setLang('en');
  assert.equal(dayLabel(on(2025, 12, 30), NOW), 'Tuesday, December 30, 2025');
  assert.equal(dayLabel(on(2026, 11, 23), NOW), 'Monday, November 23');
});

test('in Greek, with the weekday first in upper case', async () => {
  await setLang('el');
  assert.equal(dayLabel(on(2026, 11, 21), NOW), 'Σήμερα');
  assert.equal(dayLabel(on(2026, 11, 20), NOW), 'Χθες');
  assert.equal(dayLabel(on(2026, 11, 17), NOW), 'Τρίτη');
  assert.equal(dayLabel(on(2026, 11, 10), NOW), 'Τρίτη 10 Νοεμβρίου');
  await setLang('en');
});

test('same day by the calendar, not by 24 hours', () => {
  assert.equal(sameDay(on(2026, 11, 21, 0), on(2026, 11, 21, 23)), true);
  assert.equal(sameDay(on(2026, 11, 20, 23), on(2026, 11, 21, 0)), false);
});
