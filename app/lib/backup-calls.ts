// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { backupCallLog, callsBackupReady, restoreCallLog } from '../modules/erevos-phone';
import { utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';
import { secureDelete, secureGet, secureSet } from './secure';

// The phone's call history and Android's own list of blocked numbers in Erevos's backups
// (lock/backup.ts), when the owner wants them: read from Android by the phone module
// (modules/erevos-phone, CallsBackup.kt) into the backup, sealed with its password like everything
// in it, and put back from one into the phone's, each call and blocked number the phone does not
// have yet, as the phone app; none is deleted. Android keeps them for every phone app, as it keeps
// the SMS (lib/backup-sms.ts): they are the phone's, the same in every space. The choice is kept on
// the phone, outside every space, as the SMS's is, and backups hold it too, with the phone's other
// settings.
//
// The backup's entry is JSON: { v, calls, blocked }. Each call has its number as Android wrote it
// ('' for one that did not show), how it showed (presentation), when (date, in milliseconds), how
// long (duration, in seconds), its type, its marks (features), whether it was new and read, and
// its SIM as a slot (0 for SIM 1, -1 for none known), as a SIM's own id is the phone's and names
// nothing on another. A call is on the phone already when one there has the same number, with or
// without spaces, dashes and brackets, in the same second, with the same duration and type. Android
// itself matches a blocked number written either way (+30… or 69…), so each one the phone lacks
// here is looked for there once more before it goes in.

const KEY = 'erevos.backup-calls';
const VERSION = 1;

/** The most calls a backup holds, the newest: far more than Android keeps, about 500 for each SIM. */
export const MOST_CALLS = 10_000;
/** The most blocked numbers a backup holds. */
export const MOST_BLOCKED = 5_000;
// The longest number kept: a SIP address may be long, a phone number never is.
const LONGEST = 128;
// Android's call types (CallLog.Calls.TYPE): came, made, missed, declined, blocked, answered on
// another device. A voicemail's row (4) is the phone company's, and Android takes none from an app.
const TYPES = new Set([1, 2, 3, 5, 6, 7]);

/** A call of the phone's call history, as a backup holds it (see above). */
export type BackedUpCall = {
  number: string;
  presentation: number;
  date: number;
  duration: number;
  type: number;
  features: number;
  new: boolean;
  read?: boolean;
  sim: number;
};

/** The phone's calls, the newest first, and its blocked numbers, as a backup holds them. */
export type PhoneCalls = { calls: BackedUpCall[]; blocked: string[] };

/** Whether this phone can put its calls in backups: Android, in a build that can. */
export function canBackUpCalls(): boolean {
  return callsBackupReady();
}

export async function backsUpCalls(): Promise<boolean> {
  return (await secureGet(KEY).catch(() => null)) === '1';
}

export async function setBacksUpCalls(on: boolean): Promise<void> {
  if (on) await secureSet(KEY, '1');
  else await secureDelete(KEY);
}

const whole = (v: unknown, least: number, most: number): v is number => Number.isInteger(v) && (v as number) >= least && (v as number) <= most;

// A call as this Erevos understands it, or null for what is none.
function checkedCall(value: unknown): BackedUpCall | null {
  const v = (value ?? {}) as Record<string, unknown>;
  if (typeof v.number !== 'string' || v.number.length > LONGEST || !whole(v.type, 1, 7) || !TYPES.has(v.type) || !whole(v.date, 1, Number.MAX_SAFE_INTEGER)) return null;
  const call: BackedUpCall = {
    number: v.number,
    presentation: whole(v.presentation, 1, 5) ? v.presentation : 1,
    date: v.date,
    duration: whole(v.duration, 0, 1e9) ? v.duration : 0,
    type: v.type,
    features: whole(v.features, 0, 0xffff) ? v.features : 0,
    new: v.new === true,
    sim: whole(v.sim, 0, 7) ? v.sim : -1,
  };
  if (typeof v.read === 'boolean') call.read = v.read;
  return call;
}

// The calls and blocked numbers of what the phone module read, or of a backup, as far as they are
// understood, and no more of them than a backup holds.
function checked(value: unknown): PhoneCalls {
  const v = (value ?? {}) as Record<string, unknown>;
  const calls = (Array.isArray(v.calls) ? v.calls.slice(0, MOST_CALLS) : []).map(checkedCall).filter((call): call is BackedUpCall => call !== null);
  const numbers = (Array.isArray(v.blocked) ? v.blocked.slice(0, MOST_BLOCKED) : []).filter((n): n is string => typeof n === 'string' && n.trim().length > 0 && n.length <= LONGEST);
  return { calls, blocked: [...new Set(numbers)] };
}

/** The bytes of a backup's entry for these calls and blocked numbers. */
export function phoneCallsEntry(calls: PhoneCalls): Uint8Array {
  return utf8Encode(JSON.stringify({ v: VERSION, calls: calls.calls, blocked: calls.blocked }));
}

/** The calls and blocked numbers a backup's entry holds, as far as this Erevos understands them,
 *  one from a newer Erevos too; null when the bytes are not such. */
export function phoneCallsOf(bytes: Uint8Array): PhoneCalls | null {
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = (value as { v?: unknown }).v;
  return typeof v === 'number' && v >= VERSION ? checked(value) : null;
}

/** How many calls and blocked numbers a backup's entry holds; null when the bytes are not such. */
export function callCounts(bytes: Uint8Array): { calls: number; blocked: number } | null {
  const calls = phoneCallsOf(bytes);
  return calls && { calls: calls.calls.length, blocked: calls.blocked.length };
}

// A number without what only sets it out: spaces, dashes, dots, brackets and slashes.
const bare = (number: string) => number.replace(/[\s\-.()/]/g, '');

// The same call twice: the same number, second, duration and type.
const callKey = (call: BackedUpCall) => `${bare(call.number)}|${Math.floor(call.date / 1000)}|${call.duration}|${call.type}`;

/** What of a backup's calls and blocked numbers the phone, which has `here`, lacks: each call
 *  none of the phone's matches, and each number not in its list, once. */
export function missingCalls(backup: PhoneCalls, here: PhoneCalls): PhoneCalls {
  const had = new Set(here.calls.map(callKey));
  const calls = backup.calls.filter((call) => {
    const key = callKey(call);
    if (had.has(key)) return false;
    had.add(key);
    return true;
  });
  const listed = new Set(here.blocked.map(bare));
  const blocked = backup.blocked.filter((number) => {
    const key = bare(number);
    if (listed.has(key)) return false;
    listed.add(key);
    return true;
  });
  return { calls, blocked };
}

// The phone's calls and blocked numbers, as the phone module reads them; null while Android does
// not let Erevos read the call history, or in a build that cannot.
async function phoneCalls(): Promise<PhoneCalls | null> {
  const json = await backupCallLog();
  if (json === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  return (value as { allowed?: unknown } | null)?.allowed === true ? checked(value) : null;
}

/** The phone's calls and blocked numbers for a backup being made, when the owner wants them and
 *  Android lets Erevos read the call history; else null, and the backup is made without them. */
export async function phoneCallsForBackup(): Promise<Uint8Array | null> {
  if (!canBackUpCalls() || !(await backsUpCalls())) return null;
  const calls = await phoneCalls();
  return calls && phoneCallsEntry(calls);
}

/** Adds the calls and blocked numbers a backup holds that the phone lacks to the phone's own, as
 *  the phone app, and deletes none; how many of each went in. */
export async function putPhoneCalls(bytes: Uint8Array): Promise<{ calls: number; blocked: number }> {
  const backup = phoneCallsOf(bytes);
  if (!backup) return { calls: 0, blocked: 0 };
  const here = await phoneCalls();
  // Without the phone's own calls, some would be there twice.
  if (!here) throw new Error(t('Android does not let Erevos read the call history yet.'));
  const missing = missingCalls(backup, here);
  if (!missing.calls.length && !missing.blocked.length) return { calls: 0, blocked: 0 };
  return restoreCallLog(JSON.stringify(missing));
}
