import { secureGet, secureSet } from '../lib/secure';

// Wrong passwords are counted on the phone, across restarts, wherever a password is checked (the
// lock screen, and the lock settings, which compare a new password with the other spaces'). After
// FREE_TRIES, every further wrong one makes the next check wait, twice as long each time, up to
// an hour. One count for every space, as the lock screen comes before any space. A right
// password ends the wait.

const KEY = 'erevos.lock-tries';
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

async function load(): Promise<Tries> {
  try {
    const raw = await secureGet(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Tries>;
      if (typeof data.fails === 'number' && typeof data.until === 'number') return { fails: data.fails, until: data.until };
    }
  } catch {
    // Starts afresh.
  }
  return { fails: 0, until: 0 };
}

/** Throws LockedOutError while a wait is on. */
export async function assertNotLockedOut(now = Date.now()): Promise<void> {
  const { until } = await load();
  if (until > now) throw new LockedOutError(until);
}

/** Counts a wrong password; returns when the next check may run (now, while tries are free). */
export async function recordWrongPassword(now = Date.now()): Promise<number> {
  const fails = (await load()).fails + 1;
  const until = fails < FREE_TRIES ? 0 : now + Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** (fails - FREE_TRIES));
  await secureSet(KEY, JSON.stringify({ fails, until }));
  return until;
}

export async function recordRightPassword(): Promise<void> {
  await secureSet(KEY, JSON.stringify({ fails: 0, until: 0 }));
}

/** "Try again in …", in seconds or minutes. */
export function lockedOutMessage(until: number, now = Date.now()): string {
  const seconds = Math.max(1, Math.ceil((until - now) / 1000));
  return seconds >= 90
    ? `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`
    : `Too many attempts. Try again in ${seconds} seconds.`;
}
