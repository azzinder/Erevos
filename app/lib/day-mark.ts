// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { locale, t } from './i18n';

// The day over the first message of each day, in every chat (components/chat-thread-lines.tsx
// DayMark): Today, Yesterday, the weekday within the last week, and before that the weekday and
// date, with the year once it is another year's. Self-contained on purpose (but for i18n), so it
// runs under plain Node for checks.

const pad = (n: number) => String(n).padStart(2, '0');

/** Whether two moments fall on the same day of this device's calendar. */
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

// How many calendar days `at` lies before `now`: 0 today, 1 yesterday, negative ahead of it.
// Counted from local midnights, so a day that gains or loses an hour still counts as one.
function daysBefore(at: number, now: number): number {
  const d = new Date(at);
  const n = new Date(now);
  const start = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.round((start(n) - start(d)) / 86_400_000);
}

/** The day `at` as its chat shows it, `now` being when it is read. */
export function dayLabel(at: number, now: number = Date.now()): string {
  const days = daysBefore(at, now);
  if (days === 0) return t('Today');
  if (days === 1) return t('Yesterday');
  const d = new Date(at);
  const options: Intl.DateTimeFormatOptions =
    days > 1 && days < 7
      ? { weekday: 'long' }
      : d.getFullYear() === new Date(now).getFullYear()
        ? { weekday: 'long', day: 'numeric', month: 'long' }
        : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  try {
    const text = d.toLocaleDateString(locale(), options);
    // A word in lower case, as some languages write weekdays, starts the line in upper case.
    return text ? text.charAt(0).toLocaleUpperCase(locale()) + text.slice(1) : text;
  } catch {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
