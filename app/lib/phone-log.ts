// The Phone screen's calls (app/phone.tsx): Android's own call history (modules/erevos-phone),
// read each time the screen shows it, and kept only in memory, so that it shows at once the next
// time. What each call was, the filters, and the calls one after another with the same number
// drawn as one row, under the day they were on.

import { mark, t } from './i18n';
import type { LoggedCall } from '../modules/erevos-phone';

export type CallKind = 'incoming' | 'outgoing' | 'missed' | 'declined' | 'blocked';

/** The call history as Android gives it (callHistory in modules/erevos-phone). */
export type CallHistory = { allowed: boolean; calls: LoggedCall[] };

// The history as last read, and the space it was read in (its key; null with Erevos locked), as
// its names are partly the space's (lib/known-names.ts): it shows only there, and goes as Erevos
// locks (app/_layout.tsx).
let kept: { space: object | null; history: CallHistory } | null = null;

/** The call history last read in this space, to show while it is read again; null if none was. */
export function keptHistory(space: object | null): CallHistory | null {
  return kept && kept.space === space ? kept.history : null;
}

/** Keeps the call history just read in this space, in memory only. */
export function keepHistory(space: object | null, history: CallHistory): void {
  kept = { space, history };
}

/** Erevos locks: the call history last read goes. */
export function forgetHistory(): void {
  kept = null;
}

/** What the history shows: every call, or one kind; `incoming` takes the declined ones too. */
export type CallFilter = 'all' | 'missed' | 'incoming' | 'outgoing' | 'blocked';

export const CALL_FILTERS: { filter: CallFilter; label: string }[] = [
  { filter: 'all', label: mark('All') },
  { filter: 'missed', label: mark('Missed') },
  { filter: 'incoming', label: mark('Incoming') },
  { filter: 'outgoing', label: mark('Outgoing') },
  { filter: 'blocked', label: mark('Blocked') },
];

export const KIND_LABELS: Record<CallKind, string> = {
  incoming: mark('Incoming call'),
  outgoing: mark('Outgoing call'),
  missed: mark('Missed call'),
  declined: mark('Declined call'),
  blocked: mark('Blocked call'),
};

// Android's call types (CallLog.Calls.TYPE) and marks (FEATURES).
const OUTGOING = 2;
const MISSED = 3;
const DECLINED = 5;
const BLOCKED = 6;
const HD_VOICE = 4;
const WIFI_CALLING = 8;

/** What a call was. One answered on another device, or a voicemail, came in. */
export function callKind(type: number): CallKind {
  if (type === OUTGOING) return 'outgoing';
  if (type === MISSED) return 'missed';
  if (type === DECLINED) return 'declined';
  if (type === BLOCKED) return 'blocked';
  return 'incoming';
}

/** Whether a call went over Wi-Fi (Wi-Fi calling), and with HD voice. */
export function callMarks(features: number): { wifi: boolean; hd: boolean } {
  return { wifi: (features & WIFI_CALLING) !== 0, hd: (features & HD_VOICE) !== 0 };
}

/** The calls the filter keeps, on the SIM with this account id, or on any for ''. */
export function filterCalls(calls: LoggedCall[], filter: CallFilter, account = ''): LoggedCall[] {
  return calls.filter((call) => {
    if (account && call.account !== account) return false;
    const kind = callKind(call.type);
    if (filter === 'all') return true;
    if (filter === 'incoming') return kind === 'incoming' || kind === 'declined';
    return kind === filter;
  });
}

/** Whether the network hid the call's number: private, unknown, or a payphone's. */
export function hiddenNumber(call: Pick<LoggedCall, 'number' | 'presentation'>): boolean {
  return call.presentation > 1 || !call.number;
}

/** Who the call was with: the contact's name, the number, or what the network said of it. */
export function callWho(call: Pick<LoggedCall, 'name' | 'number' | 'shown' | 'presentation'>): string {
  if (call.name) return call.name;
  if (call.presentation === 2) return t('Private number');
  if (call.presentation === 4) return t('Payphone');
  if (hiddenNumber(call)) return t('Unknown number');
  return call.shown || call.number;
}

/** How numbers are matched: their last ten digits, as the native side matches them. */
function numberKey(call: LoggedCall): string {
  if (hiddenNumber(call)) return `hidden:${call.presentation}`;
  return call.number.replace(/\D/g, '').slice(-10) || call.number;
}

/** The calls with the same number as `call`, as deleting every call of a number matches them. */
export function callsWith(calls: LoggedCall[], call: LoggedCall): LoggedCall[] {
  if (hiddenNumber(call)) return [];
  return calls.filter((c) => !hiddenNumber(c) && numberKey(c) === numberKey(call));
}

/** The calls without those being deleted. */
export function withoutCalls(calls: LoggedCall[], gone: ReadonlySet<number>): LoggedCall[] {
  return gone.size ? calls.filter((c) => !gone.has(c.id)) : calls;
}

const dayKey = (at: number) => new Date(at).toDateString();

/** Calls one after another, newest first, with the same number, of the same kind, on the same day. */
export type CallRow = { key: string; kind: CallKind; calls: LoggedCall[] };

/** The calls, newest first, drawn together into rows. */
export function groupCalls(calls: LoggedCall[]): CallRow[] {
  const rows: CallRow[] = [];
  for (const call of calls) {
    const kind = callKind(call.type);
    const last = rows[rows.length - 1];
    const first = last?.calls[0];
    if (last && first && last.kind === kind && numberKey(first) === numberKey(call) && dayKey(first.at) === dayKey(call.at)) {
      last.calls.push(call);
    } else {
      rows.push({ key: String(call.id), kind, calls: [call] });
    }
  }
  return rows;
}

export type HistoryItem = { kind: 'day'; key: string; label: string } | { kind: 'row'; key: string; row: CallRow };

const pad = (n: number) => String(n).padStart(2, '0');

/** The day a call was on, as its heading says it: Today, Yesterday, or the date. */
export function dayLabel(at: number, now: number): string {
  const d = new Date(at);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return t('Today');
  if (d.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString()) return t('Yesterday');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

/** The rows, under a heading for each day. */
export function withDays(rows: CallRow[], now: number): HistoryItem[] {
  const items: HistoryItem[] = [];
  let day = '';
  for (const row of rows) {
    const at = row.calls[0].at;
    if (dayKey(at) !== day) {
      day = dayKey(at);
      items.push({ kind: 'day', key: `day:${day}`, label: dayLabel(at, now) });
    }
    items.push({ kind: 'row', key: row.key, row });
  }
  return items;
}

/** "14:05", when a call was, in its day. */
export function callClock(at: number): string {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
