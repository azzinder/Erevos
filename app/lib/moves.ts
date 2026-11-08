// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Told } from '../lock/e2e-data';
import type { MovingKind, OldQueue, QueuesData } from '../lock/queues-data';
import { MAX_OLD_OWN, MAX_OLD_SPARE, MAX_WAS } from '../lock/queues-data';

// When a relay queue moves (lib/queue-move.ts), and what follows from it, as pure functions the
// checks reach (checks/moves.check.ts): the junk meter that says a queue is flooded, the time each
// own queue says it was made (`qa`), when each kept contact is told the new one, and how long an
// old queue is still read.
//
// A `qa` says only which of two own queues is the later: the one the first look of this version
// found says FIRST_QA, whenever that was; each one a move makes, the hour, put off by the space's or
// place's own random offset and a few random hours more (QUEUE_JITTER), and later than the one
// before whatever the clock says. So it tells no contact when Erevos was updated, nor when the
// queue moved to the hour, and two spaces or places that move in the same hour say different ones.
//
// Junk is what comes to a queue that is for no one here: it opens in no conversation and is no
// group's, nor a word between this account's devices, nor an answer to an SMS invite; and a first
// packet from someone blocked. Who floods a queue with it (a contact deleted or blocked, or anyone
// a contact link or group gave it to) keeps everyone else's messages out once it is full
// (crates/erevos-relay keeps MAX_QUEUED). Three looks within JUNK_WITHIN, each of which took a whole
// batch nearly all junk, move it; what one person sends in a broken conversation never comes near.

/** How many packets one look takes at most, of which at least JUNK_MOST junk is a flooded look, and how many of those within JUNK_WITHIN move the queue. */
export const JUNK_BATCH = 50;
export const JUNK_MOST = 45;
export const JUNK_LOOKS = 3;
export const JUNK_WITHIN = 10 * 60_000;
/** A queue moves for junk once a day at most; junk on the new one within that day is said, not moved for. */
export const JUNK_AGAIN = 24 * 60 * 60_000;
/** After a backup is put back, many conversations are stale: no junk is counted for a day. */
export const RESTORED_QUIET = 24 * 60 * 60_000;
/** How long an old queue is read: the relay's own lifetime of a message (crates/erevos-relay DEFAULT_TTL). */
export const GRACE = 14 * 24 * 60 * 60_000;
/** Kept contacts not heard on the new queue are told again this long after the last time, three times more. */
export const TELL_AGAIN = 7 * 24 * 60 * 60_000;
export const TELLS = 4;
/** A kept contact heard on an old queue is told the new one at once, at most once in this long. */
export const HEAL_EVERY = 60 * 60_000;
/** A hidden place that opens to this many rings within a day that brought no call moves its ring queue. */
export const FAKE_RINGS = 3;
export const FAKE_RINGS_WITHIN = 24 * 60 * 60_000;
const HOUR = 60 * 60_000;
/** The `qa` of the own queue the first look of this version found. */
export const FIRST_QA = 1;
/** A space's or place's own offset of its `qa` is less than this, in whole hours (newOffset); each move's few random hours more, less than QUEUE_JITTER. */
export const QUEUE_OFFSET = 30 * 24 * HOUR;
export const QUEUE_JITTER = 12 * HOUR;

/** A random number of whole hours less than `most` (ms). */
export function randomHours(most: number, random: () => number = Math.random): number {
  return Math.floor(random() * Math.floor(most / HOUR)) * HOUR;
}

/** A space's or place's own offset of its `qa`: a random number of whole hours, one at least. */
export function newOffset(random: () => number = Math.random): number {
  return HOUR + randomHours(QUEUE_OFFSET - HOUR, random);
}

/** What one look at a queue found. */
export type Look = { taken: number; junk: number };

/** What the junk on a queue calls for: nothing, a move, or saying junk comes to the new one (T10). */
export type JunkStep = 'none' | 'move' | 'say';

/**
 * Counts the looks at each queue that took a whole batch nearly all junk: three within
 * JUNK_WITHIN flood it. Only in memory: a phone that comes back to a full queue finds it in its
 * first looks.
 */
export class JunkMeter {
  private readonly floods = new Map<string, number[]>();

  /** One look at the queue `id` took `taken` packets, `junk` of them junk: whether it is flooded now. */
  look(id: string, { taken, junk }: Look, now = Date.now()): boolean {
    const kept = (this.floods.get(id) ?? []).filter((at) => now - at < JUNK_WITHIN);
    if (taken >= JUNK_BATCH && junk >= JUNK_MOST) kept.push(now);
    if (kept.length >= JUNK_LOOKS) {
      this.floods.delete(id);
      return true;
    }
    if (kept.length > 0) this.floods.set(id, kept);
    else this.floods.delete(id);
    return false;
  }

  /** Forgets what was counted of a queue: it moved, or is an old one now. */
  forget(id: string): void {
    this.floods.delete(id);
  }
}

/**
 * What a flood of a queue of `kind` calls for: a move, unless one moved it within JUNK_AGAIN (then
 * a kept contact, a device or the relay sends it, and it is said once a day), and nothing for a
 * day after a backup was put back (`putBack`, ms, or 0).
 */
export function junkStep(queues: Pick<QueuesData, 'junk' | 'junkSaid'>, kind: MovingKind, putBack: number, now = Date.now()): JunkStep {
  if (putBack > 0 && now - putBack < RESTORED_QUIET) return 'none';
  const moved = queues.junk[kind] ?? 0;
  if (moved > 0 && now - moved < JUNK_AGAIN) return now - (queues.junkSaid[kind] ?? 0) < JUNK_AGAIN ? 'none' : 'say';
  return 'move';
}

/**
 * The `qa` of an own queue made now: the hour, put off by the space's or place's `offset` and by
 * `jitter` (randomHours of QUEUE_JITTER for a move, QUEUE_JITTER itself after a backup was put back,
 * so it is later than any made since), and later than the one before whatever the clock says.
 */
export function queueAge(before: number, now = Date.now(), offset = 0, jitter = 0): number {
  return Math.max(now - (now % HOUR) + offset + jitter, before + 1);
}

/**
 * The backup queue a contact link carries (`spare`): the own queue's while the link names it
 * (`linkSender` none or the own queue's sender), none once the link names a queue of its own, as
 * it does after a move. That backup queue moves with the own queue, so a link that kept it would
 * name the new own queue to whoever has it.
 */
export function linkSpare<S>(linkSender: string, ownSender: string, spare: S): S | undefined {
  return !linkSender || linkSender === ownSender ? spare : undefined;
}

/** Whether a contact's message takes where they read (`from` and the rest) over what is kept: from an Erevos that says no `qa`, or one as late as the one kept. */
export function takesPlace(said: number | undefined, kept: number | undefined): boolean {
  return said === undefined || said >= (kept ?? 0);
}

/**
 * Whether a kept contact is due a tell of the own queue made at `moved`: one not told it yet, then
 * again TELL_AGAIN after each time while they are not heard on it (`onNew`, the `qa` of the own
 * queue they were last heard on), TELLS times in all. None for the queue the first look of this
 * version found (`since`), which every contact knows already.
 */
export function tellDue(told: Told | undefined, onNew: number | undefined, moved: number, since: number, now = Date.now()): boolean {
  if (moved <= since) return false;
  if (!told || told.qa < moved) return true;
  if ((onNew ?? 0) >= moved || told.n >= TELLS) return false;
  return now >= told.at + told.n * TELL_AGAIN;
}

/** A contact told the own queue of `qa` once more. */
export function toldOnce(told: Told | undefined, qa: number, now = Date.now()): Told {
  return told?.qa === qa ? { ...told, n: told.n + 1 } : { qa, at: now, n: 1 };
}

/**
 * Whether an old queue's grace is over, so it is emptied and deleted: never while a group of this
 * space names it (`named`), as one does the own queue from before this version until it renews
 * there, whatever kind it is now; else a group or public one at once, and any other once its 14
 * days ended, or, of an own one, once every kept contact was heard on the queue that took its place
 * or a later one (`heardSince`, the least `onNew` of them, Infinity with none). So too a backup one
 * given a `by`, as after the phone a backup came from was lost: each contact heard on that own
 * queue was told the backup queue that took its place with it.
 */
export function graceOver(old: OldQueue, heardSince: number, named: boolean, now = Date.now()): boolean {
  if (named) return false;
  if (old.kind === 'group' || old.kind === 'public') return true;
  if (now >= old.until) return true;
  return (old.kind === 'own' || old.kind === 'spare') && old.by !== undefined && heardSince >= old.by;
}

/**
 * The old queues once `old` is added: at most MAX_OLD_OWN own ones, MAX_OLD_SPARE backup ones and
 * MAX_WAS in all, those over going early (`early`, emptied first then deleted), oldest first.
 */
export function withOld(was: OldQueue[], old: OldQueue): { was: OldQueue[]; early: OldQueue[] } {
  const all = [...was.filter((w) => w.queue.recipientHex !== old.queue.recipientHex), old];
  const early: OldQueue[] = [];
  for (const [kind, most] of [['own', MAX_OLD_OWN], ['spare', MAX_OLD_SPARE]] as const) {
    while (all.filter((w) => w.kind === kind).length > most) {
      const at = all.findIndex((w) => w.kind === kind);
      early.push(...all.splice(at, 1));
    }
  }
  while (all.length > MAX_WAS) early.push(...all.splice(0, 1));
  return { was: all, early };
}

/** Whether rings that brought no call (`rings`, ms) are enough to move a hidden place's ring queue. */
export function fakeRings(rings: number[], now = Date.now()): boolean {
  return rings.filter((at) => now - at < FAKE_RINGS_WITHIN).length >= FAKE_RINGS;
}
