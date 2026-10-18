import { secureGet, secureSet } from '../lib/secure';

// Wrong passwords are counted on the phone, across restarts, wherever a password is checked (the
// lock screen, and the lock settings, which compare a new password with the other spaces'). After
// FREE_TRIES, every further wrong one makes the next check wait, twice as long each time, up to
// an hour. One count for every space, as the lock screen comes before any space. A right
// password ends the wait.

const KEY = 'erevos.lock-tries';
/** Searches on the home screen are tried as the hidden chats' PIN (hidden.ts), counted apart, so
 *  searching never makes the lock screen wait. */
export const SEARCH_TRIES = 'erevos.search-tries';
export const FREE_TRIES = 5;
const FIRST_WAIT_MS = 30_000;
const MAX_WAIT_MS = 3_600_000;

interface Tries {
  fails: number;
  until: number;
}

export class LockedOutError extends Error {
  until: number;

  constructor(until: number) {
    super('lockedOut');
    this.until = until;
  }
}

async function load(entry = KEY): Promise<Tries> {
  try {
    const raw = await secureGet(entry);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Tries>;
      if (typeof data.fails === 'number' && typeof data.until === 'number') return { fails: data.fails, until: data.until };
    }
  } catch {
    // Starts afresh.
  }
  return { fails: 0, until: 0 };
}

/** The count exists from the first start, so its entry does not show that a password was ever tried. */
export async function prepareTries(): Promise<void> {
  for (const entry of [KEY, SEARCH_TRIES]) if (!(await secureGet(entry))) await secureSet(entry, JSON.stringify({ fails: 0, until: 0 }));
}

/** Throws LockedOutError while a wait is on. */
export async function assertNotLockedOut(now = Date.now(), entry = KEY): Promise<void> {
  const { until } = await load(entry);
  if (until > now) throw new LockedOutError(until);
}

/** Counts a wrong password; returns when the next check may run (now, while tries are free). */
export async function recordWrongPassword(now = Date.now(), entry = KEY): Promise<number> {
  const fails = (await load(entry)).fails + 1;
  const until = fails < FREE_TRIES ? 0 : now + Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** (fails - FREE_TRIES));
  await secureSet(entry, JSON.stringify({ fails, until }));
  return until;
}

export async function recordRightPassword(entry = KEY): Promise<void> {
  await secureSet(entry, JSON.stringify({ fails: 0, until: 0 }));
}

/** "Try again in …", in seconds or minutes. */
export function lockedOutMessage(until: number, now = Date.now()): string {
  const seconds = Math.max(1, Math.ceil((until - now) / 1000));
  return seconds >= 90
    ? `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`
    : `Too many attempts. Try again in ${seconds} seconds.`;
}
