// Contact queues: each kept contact writes to a queue of their own on this chat's relay, named
// to no one else, as SimpleX does, so the relay cannot tell from where messages go that two
// contacts write to the same phone, and deleting or blocking someone deletes only their queue.
// The contact link names a queue of its own (lib/queue-move.ts `link`), for first messages only;
// the own queue stays for those who have no queue of their own yet, and for an Erevos before.
// Each contact's queue is said inside the encrypted messages (`from`, with when it was made, `qa`,
// lib/e2e.ts fromNow), later than the own queue they knew, so their phone, of any version, takes
// it. Queues are made ahead (E2EData.ready), so even the first message to someone new says a queue
// of their own; contacts from before take one a few at a time, each told it quietly.
//
// They are read on the relay's `/read` path, which needs no token (lib/relay.ts readerOf): the
// token names this phone, so read with it the queues would all be tied to it. Only making and
// deleting one uses the token, so a relay that keeps logs can tie them when they are made
// (docs/threat-model.md). They are read in groups of CONTACT_GROUP, each group on its own way
// through Tor (named circuits, lib/relay.ts TorLine), so the relay does not see them read from
// one place; one wait at the relay asks of a whole group (WAIT_ANY), and only the queues it says
// have something are read. Without Tor the relay sees one address anyway: the waits then ask of
// up to MAX_ANY at once. Only at a relay that showed it reads them so: an older one keeps every
// contact on the own queue.

import type { Mine } from '../lock/e2e-data';
import { onNetworkChange } from './network-change';
import { fromHex, MAX_ANY, sameRelay, throughTor, waitForAny, type AnyFound, type Relay } from './relay';

/** How many contacts' queues are read together, on one way through Tor. */
export const CONTACT_GROUP = 8;
// One wait of the watch at the relay, seconds; the first and longest pause after one that failed;
// and how long a group that found something waits for a look to take it before it waits again.
const WATCH_FOR = 60;
const WATCH_RETRY = 5000;
const WATCH_RETRY_MOST = 120_000;
const TAKEN_WITHIN = 15_000;
// How long before a relay that could not wait on many queues is asked to again.
const CANNOT_RETRY = 5 * 60_000;

/** One queue a contact writes to: theirs now, or the one it took the place of while that is read (`was`). */
export type ContactQueue = { identity: string; r: string; g: number; was?: true };

/** The queues read together on one way through Tor (`way`), at most MAX_ANY. */
export type Bunch = { way: string; queues: ContactQueue[] };

/** The contacts' own queues on the relay at `url` (E2E.contactQueues), with the ones they took the place of there. */
export function contactQueuesAt(mines: { identity: string; mine: Mine }[], url: string): ContactQueue[] {
  return mines.flatMap(({ identity, mine }) => [
    ...(sameRelay(mine.u, url) ? [{ identity, r: mine.r, g: mine.g }] : []),
    ...(mine.was && sameRelay(mine.was.u, url) ? [{ identity, r: mine.was.r, g: mine.g, was: true as const }] : []),
  ]);
}

/**
 * The queues as they are read: through Tor each group of CONTACT_GROUP on a way of its own, named
 * from `way` (one for each space, so two spaces never share one); without Tor as many at once as the
 * relay takes, as it sees one address anyway.
 */
export function bunches(queues: ContactQueue[], way: string, tor = throughTor()): Bunch[] {
  if (!tor) {
    const all: Bunch[] = [];
    for (let i = 0; i < queues.length; i += MAX_ANY) all.push({ way, queues: queues.slice(i, i + MAX_ANY) });
    return all;
  }
  const groups = new Map<number, ContactQueue[]>();
  for (const q of queues) groups.set(q.g, [...(groups.get(q.g) ?? []), q]);
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([g, list]) => ({ way: `${way}-${g}`, queues: list.slice(0, MAX_ANY) }));
}

const cameListeners = new Set<() => void>();
const changeListeners = new Set<() => void>();
// The watches going on, to tell whether one found something no look has taken yet.
const watches = new Set<ContactWatch>();

/** Calls `listener` each time something came to a contact's queue, for a look to take it at once, until the function it gives is called. */
export function onContactsCame(listener: () => void): () => void {
  cameListeners.add(listener);
  return () => cameListeners.delete(listener);
}

/** Calls `listener` each time the contacts' queues a watch waits on change, as a contact takes a queue of their own or is deleted, until the function it gives is called: a closed space's door names them (lib/closed-notices.ts followDoor). */
export function onContactQueuesChanged(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/** Whether a watch found something in a contact's queue that no look has asked for yet (ContactWatch came): a look then does not wait at the relay first. */
export function cameUnread(): boolean {
  for (const watch of watches) if (watch.unread()) return true;
  return false;
}

// A bunch's waits: `stop` ends them for good, `round` the one under way, `rest` a pause between two.
type Loop = { ids: string; stop: AbortController; round: AbortController | null; rest: (() => void) | null };

// The phone's network changed: a wait on the network gone may hang until its reply timer, up to three
// minutes through Tor, with what comes meanwhile not heard of, a call's offer too. Each wait ends,
// and asks again at once on the network now (lib/network-change.ts), as the receiver's does.
onNetworkChange(() => watches.forEach((watch) => watch.renew()));

// Waits `ms`, or less once `signal` ends it or `wake` is called.
function pause(ms: number, signal: AbortSignal, loop: Loop): Promise<void> {
  return new Promise((done) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      loop.rest = null;
      done();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish);
    loop.rest = finish;
  });
}

/**
 * Waits at the relay on the contacts' queues while the space is open, each bunch held there until
 * something comes to one of its queues (lib/relay.ts waitForAny, on `/read`, with no token), so what
 * comes is taken at once (onContactsCame) and the phone's radio rests in between. What came is kept
 * for the look to read (`came`); that bunch waits again once the look took it, or TAKEN_WITHIN.
 */
export class ContactWatch {
  private relay: Relay | null = null;
  private readonly loops = new Map<string, Loop>();
  private readonly found = new Set<string>();
  private stopped = false;
  // The queues waited on, to tell when they change; null before the first use.
  private named: string | null = null;

  /** Waits on `list` at `relay` from now on; bunches no longer in it stop waiting. */
  use(relay: Relay, list: Bunch[]): void {
    if (this.stopped) return;
    watches.add(this);
    if (this.relay && (this.relay.url !== relay.url || this.relay.key !== relay.key)) this.stopLoops();
    this.relay = relay;
    const wanted = new Map(list.map((b) => [b.way, b]));
    for (const [way, loop] of this.loops) {
      const b = wanted.get(way);
      if (b && idsOf(b) === loop.ids) continue;
      loop.stop.abort();
      this.loops.delete(way);
    }
    for (const b of list) if (!this.loops.has(b.way)) this.start(relay, b);
    const named = `${relay.url} ${list.map(idsOf).join(';')}`;
    if (this.named !== null && named !== this.named) changeListeners.forEach((listener) => listener());
    this.named = named;
  }

  /** The queues (recipient ids in hex) a wait found something in, or gone, since this was last asked; their bunches wait again. */
  came(): Set<string> {
    const found = new Set(this.found);
    this.found.clear();
    for (const loop of this.loops.values()) loop.rest?.();
    return found;
  }

  /** Whether a wait found something since this was last asked (came). */
  unread(): boolean {
    return this.found.size > 0;
  }

  /** Ends every wait under way, and every pause between two, so each asks again at once: the network changed. */
  renew(): void {
    for (const loop of this.loops.values()) {
      loop.round?.abort();
      loop.rest?.();
    }
  }

  /** Stops every wait, for good: the space closed. */
  stop(): void {
    this.stopped = true;
    watches.delete(this);
    this.stopLoops();
  }

  private stopLoops() {
    for (const loop of this.loops.values()) loop.stop.abort();
    this.loops.clear();
    this.found.clear();
  }

  private start(relay: Relay, b: Bunch) {
    const loop: Loop = { ids: idsOf(b), stop: new AbortController(), round: null, rest: null };
    this.loops.set(b.way, loop);
    const { signal } = loop.stop;
    const recipients = b.queues.map((q) => fromHex(q.r));
    void (async () => {
      let failures = 0;
      while (!signal.aborted) {
        let found: AnyFound[] | null;
        // This wait alone, ended by `stop` or a network change (renew): then it finds nothing and waits again.
        const round = new AbortController();
        const end = () => round.abort();
        signal.addEventListener('abort', end);
        loop.round = round;
        try {
          found = await waitForAny(relay, recipients, WATCH_FOR, b.way, round.signal);
          failures = 0;
        } catch {
          failures++;
          await pause(Math.min(WATCH_RETRY_MOST, WATCH_RETRY * 2 ** (failures - 1)), signal, loop);
          continue;
        } finally {
          signal.removeEventListener('abort', end);
          if (loop.round === round) loop.round = null;
        }
        if (signal.aborted) return;
        // A relay that cannot, or seemed not to as the wait died on the way (lib/relay.ts canReadManyAt):
        // the looks read the queues as they can, and it is asked to wait again after a while.
        if (!found) {
          await pause(CANNOT_RETRY, signal, loop);
          continue;
        }
        const came = b.queues.filter((_, i) => found[i] !== 'none');
        if (came.length === 0) continue;
        for (const q of came) this.found.add(q.r);
        cameListeners.forEach((listener) => listener());
        // What came stays on the relay until a look takes it: not waited on again before.
        await pause(TAKEN_WITHIN, signal, loop);
      }
    })();
  }
}

const idsOf = (b: Bunch) => b.queues.map((q) => q.r).join(',');
