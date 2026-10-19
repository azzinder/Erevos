import { lang, mark } from './i18n';

// When a message or an SMS sent for later should go (app/chat.tsx, app/sms.tsx), as chosen with
// components/later-picker.tsx: a time ahead, to the minute, the minutes in steps of five. Times are
// the phone's own, so a later one follows its clock and its time zone.

const MINUTE = 60_000;
/** The minutes go in steps of this many. */
export const STEP = 5;

function on(day: number, hour: number, minute: number, days = 0): number {
  const d = new Date(day);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/** The time the picker starts at: an hour from now, up to the next step. */
export function firstLater(now = Date.now()): number {
  const step = STEP * MINUTE;
  return Math.ceil((now + 60 * MINUTE) / step) * step;
}

/** The times offered at a tap: in an hour, tonight at 20:00 while that is still ahead, tomorrow at 09:00. */
export function quickTimes(now = Date.now()): { label: string; at: number }[] {
  const tonight = on(now, 20, 0);
  return [
    { label: mark('In 1 hour'), at: Math.ceil((now + 60 * MINUTE) / MINUTE) * MINUTE },
    ...(tonight > now ? [{ label: mark('Tonight 20:00'), at: tonight }] : []),
    { label: mark('Tomorrow 09:00'), at: on(now, 9, 0, 1) },
  ];
}

/**
 * `at` a day, an hour or a step of minutes on (`by` 1) or back (-1). The hour and the minutes go
 * round on the same day, as on a clock; a minute between steps moves to the nearest.
 */
export function stepLater(at: number, unit: 'day' | 'hour' | 'minute', by: number): number {
  const d = new Date(at);
  if (unit === 'day') d.setDate(d.getDate() + by);
  else if (unit === 'hour') d.setHours((((d.getHours() + by) % 24) + 24) % 24);
  else d.setMinutes((((Math.round(d.getMinutes() / STEP) * STEP + by * STEP) % 60) + 60) % 60);
  d.setSeconds(0, 0);
  return d.getTime();
}

function shown(at: number, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(at);
  try {
    return date.toLocaleString(lang() === 'el' ? 'el-GR' : undefined, options);
  } catch {
    return date.toLocaleString();
  }
}

/** The day, as the picker shows it: its weekday and date. */
export function laterDay(at: number): string {
  return shown(at, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** When it goes, as the chat and the SMS screen say it: weekday, date and time. */
export function laterLabel(at: number): string {
  return shown(at, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const two = (n: number) => String(n).padStart(2, '0');

/** The hour and the minutes, as 09 and 05. */
export function laterClock(at: number): { hour: string; minute: string } {
  const d = new Date(at);
  return { hour: two(d.getHours()), minute: two(d.getMinutes()) };
}
