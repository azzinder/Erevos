import { decryptText, encryptText, randomBytes } from '../lib/crypto';
import { secureGet, secureSet } from '../lib/secure';

import { POCKETS } from './sealed-file';
import { SLOTS } from './slots';
import type { Queue } from './space-data';

// Where a space, or one of its hidden places, is reached besides its own relay queue, and the queues
// it moved away from (lib/queue-move.ts): the queue its contact link names, the one its groups say
// and the one its public groups say, the old ones still read until their grace ends, and when its
// own queue was made. One keystore entry for each space, `erevos.queues.<n>`, and for each of its
// POCKETS places, `erevos.queues<p>.<n>`, sealed with that space's or place's key, every one padded
// to SIZE characters. Each is there for every slot and every pocket from the lock's first setup,
// sealed with a random key until used (prepareQueueEntries), so neither which entries there are
// nor their size says which spaces or places are used, or moved. What is kept of each contact
// (when they were told, and heard on the new queue) is with the contact (lock/e2e-data.ts).

/** A queue with the relay it is on and that relay's token: an old one is read on the relay it was made on. */
export type KeptQueue = { queue: Queue; url: string; token: string };

/** What a queue is for: the own one, whose sender id each message says; the contact link's; the
 *  groups'; the public groups'; or the one on the home relay (lib/spare.ts). */
export type QueueKind = 'own' | 'link' | 'group' | 'public' | 'spare';

/**
 * A queue moved away from, read until `until` (ms), then emptied and deleted. `by`: when the own
 * queue that took an own one's place was made (QueuesData.moved), so it goes sooner once every
 * kept contact was heard on that one or a later one.
 */
export type OldQueue = KeptQueue & { kind: QueueKind; until: number; by?: number };

/** The queues that move for junk on them. */
export type MovingKind = Exclude<QueueKind, 'spare'>;

export type QueuesData = {
  /** The own queue (SpaceData.ownQueue) as the last move or look left it, with its relay: one set
   *  elsewhere since (a new relay, or the relay lost it) is a move too. Null until the first look. */
  now: KeptQueue | null;
  /** The queue the contact link names, when it is not the own queue: null until the first move, and
   *  again after the relay changed, when the link names the own queue. */
  link: KeptQueue | null;
  /** The queue the groups say they read on (lib/space-groups.ts), and the one public groups say; null until made, and in a hidden place. */
  group: KeptQueue | null;
  public: KeptQueue | null;
  /** The queues moved away from, oldest first, at most MAX_WAS. */
  was: OldQueue[];
  /** The own queue a move made, until it is the own queue (lib/queue-move.ts steps). */
  next: Queue | null;
  /** When the own queue was made (`qa`, ms, the hour), each later than the one before; 0 until the first look. */
  moved: number;
  /** The `moved` of the first look of this version: moves before it are none to tell of. */
  since: number;
  /** When each queue last moved for junk on it, and when junk on a new one was last said (T10). */
  junk: Partial<Record<MovingKind, number>>;
  junkSaid: Partial<Record<MovingKind, number>>;
  /** When the contact link last changed (New contact link, or junk on its queue), and until when the one before still works. */
  linkAt: number;
  linkUntil: number;
  /** In a hidden place that rings: when it opened to rings that brought no call (lib/moves.ts fakeRings). */
  rings: number[];
  /** The backup put back (lock/restored.ts) when this was last looked at: one put back since makes
   *  the own queue say a later `moved`, so contacts who learned a later queue meanwhile take it. */
  restore: string;
};

export const EMPTY_QUEUES: QueuesData = { now: null, link: null, group: null, public: null, was: [], next: null, moved: 0, since: 0, junk: {}, junkSaid: {}, linkAt: 0, linkUntil: 0, rings: [], restore: '' };

/** The length every entry is padded to. */
export const SIZE = 4096;
/** The most old queues kept, and of them old own queues (one more goes early, emptied first). */
export const MAX_WAS = 6;
export const MAX_OLD_OWN = 4;
const MAX_RINGS = 8;

const entry = (space: number) => `erevos.queues.${space}`;
const placeEntry = (space: number, pocket: number) => `erevos.queues${pocket}.${space}`;

const isHex = (v: unknown): v is string => typeof v === 'string' && v.length === 48 && /^[0-9a-f]+$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const KINDS: QueueKind[] = ['own', 'link', 'group', 'public', 'spare'];
const MOVING: MovingKind[] = ['own', 'link', 'group', 'public'];

function checkedQueue(value: unknown): Queue | null {
  const q = (value ?? {}) as Partial<Queue>;
  return isHex(q.recipientHex) && isHex(q.senderHex) ? { recipientHex: q.recipientHex, senderHex: q.senderHex } : null;
}

function checkedKept(value: unknown): KeptQueue | null {
  const v = (value ?? {}) as Partial<Record<keyof KeptQueue, unknown>>;
  const queue = checkedQueue(v.queue);
  return queue && typeof v.url === 'string' && v.url.trim() && typeof v.token === 'string' ? { queue, url: v.url, token: v.token } : null;
}

function checkedOld(value: unknown): OldQueue | null {
  const kept = checkedKept(value);
  const v = (value ?? {}) as Partial<Record<keyof OldQueue, unknown>>;
  if (!kept || !KINDS.includes(v.kind as QueueKind) || !isTime(v.until)) return null;
  return { ...kept, kind: v.kind as QueueKind, until: v.until, ...(isTime(v.by) && v.by > 0 ? { by: v.by } : {}) };
}

function checkedTimes(value: unknown): Partial<Record<MovingKind, number>> {
  const v = (value ?? {}) as Record<string, unknown>;
  return Object.fromEntries(MOVING.filter((kind) => isTime(v[kind])).map((kind) => [kind, v[kind] as number]));
}

/** What was stored, with anything of the wrong shape left out. */
export function checkedQueues(value: unknown): QueuesData {
  const v = (value ?? {}) as Partial<Record<keyof QueuesData, unknown>>;
  return {
    now: checkedKept(v.now),
    link: checkedKept(v.link),
    group: checkedKept(v.group),
    public: checkedKept(v.public),
    was: Array.isArray(v.was) ? v.was.map(checkedOld).filter((w): w is OldQueue => w !== null).slice(-MAX_WAS) : [],
    next: checkedQueue(v.next),
    moved: isTime(v.moved) ? v.moved : 0,
    since: isTime(v.since) ? v.since : 0,
    junk: checkedTimes(v.junk),
    junkSaid: checkedTimes(v.junkSaid),
    linkAt: isTime(v.linkAt) ? v.linkAt : 0,
    linkUntil: isTime(v.linkUntil) ? v.linkUntil : 0,
    rings: Array.isArray(v.rings) ? v.rings.filter(isTime).slice(-MAX_RINGS) : [],
    restore: typeof v.restore === 'string' && v.restore.length <= 64 ? v.restore : '',
  };
}

// Sealed, padded to SIZE. What would not fit, with relays of very long addresses, lets go of the
// oldest queues moved away from first; what still would not, takes the next whole SIZE.
function seal(key: Uint8Array, data: QueuesData): string {
  let kept = data;
  let json = JSON.stringify(kept);
  while (json.length > SIZE && kept.was.length > 0) {
    kept = { ...kept, was: kept.was.slice(1) };
    json = JSON.stringify(kept);
  }
  return encryptText(key, json.padEnd(Math.ceil(json.length / SIZE) * SIZE, ' '));
}

async function load(name: string, key: Uint8Array): Promise<QueuesData> {
  const raw = await secureGet(name);
  if (!raw) return { ...EMPTY_QUEUES };
  try {
    return checkedQueues(JSON.parse(decryptText(key, raw)));
  } catch {
    // Sealed with a random key: a space or place not in use, or not yet set.
    return { ...EMPTY_QUEUES };
  }
}

// Changes run one after another, each on what the one before left, as space-data.ts's do.
const writes = new Map<string, Promise<unknown>>();

function change(name: string, key: Uint8Array, update: (data: QueuesData) => QueuesData): Promise<QueuesData> {
  const run = (writes.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const data = update(await load(name, key));
      await secureSet(name, seal(key, data));
      return data;
    });
  writes.set(name, run);
  return run;
}

/** Where a space's queues are kept, or a hidden place's (`pocket`). */
export type QueuesStore = { load: () => Promise<QueuesData>; update: (change: (data: QueuesData) => QueuesData) => Promise<QueuesData> };

/** A space's, sealed with its key. */
export function spaceQueues(space: number, key: Uint8Array): QueuesStore {
  return { load: () => load(entry(space), key), update: (next) => change(entry(space), key, next) };
}

/** A hidden place's, sealed with its key. */
export function placeQueues(space: number, pocket: number, key: Uint8Array): QueuesStore {
  return { load: () => load(placeEntry(space, pocket), key), update: (next) => change(placeEntry(space, pocket), key, next) };
}

/** Every space up to `count` (and SLOTS) has an entry, and one for each of its pockets, used or not: sealed with random keys until used. */
export async function prepareQueueEntries(count = SLOTS): Promise<void> {
  for (let space = 0; space < Math.max(SLOTS, count); space++) {
    for (const name of [entry(space), ...Array.from({ length: POCKETS }, (_, pocket) => placeEntry(space, pocket))]) {
      if (!(await secureGet(name))) await secureSet(name, seal(randomBytes(32), EMPTY_QUEUES));
    }
  }
}
