// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { fillWatched, hearPocket, heardOf, loadWatched, lostPocket, type Watched } from '../lock/hidden-watch';
import { currentSpace } from '../lock/keys';
import { POCKETS } from '../lock/sealed-file';
import { loadCurrentSpaceData } from '../lock/space-data';
import { onHiddenPlaceChange, openHiddenPlace } from './hidden-contacts';
import { hiddenRangAt } from './hidden-ring';
import { onNetworkChange } from './network-change';
import { onPlacesChange, placesRead, receivesPocket } from './place-receiver';
import { canTellNewsAt, canWaitAt, fromHex, isQueueNotFound, newsSince, NO_NEWS, waitForMessage, waitForNews, type News, type Relay } from './relay';

// While Erevos receives (lib/background.ts), in the background or showing, hidden chats that asked
// for it say how many messages came, with the same notice as the space's chats ("New message", "3
// new messages"): for every pocket of the open space, the relay is asked to wait until what came
// into the queue kept for it (lock/hidden-watch.ts) changes, without taking it. The relay counts what came by what each
// send said it carries (lib/relay.ts, waitForNews): messages, and sends that did not say, are told
// of; word between phones, as that a message came or was read, is not. A call is told of only when
// it did not ring (lib/hidden-ring-notices.ts). What came is told of once, though Erevos comes and
// goes or starts anew, as what the relay said is kept with the queue (lock/hidden-watch.ts heard);
// what the place read while open is not told of once it closes, but what came after it last looked
// is: the relay counts from when its chats last found the queue empty. The queues
// made for nothing are waited on the same way, so the relay and the network see the same for every
// space. A relay from before it can say only that something waits: then a pocket tells "New
// message" once, and again only after its chats opened, as what came stays on the relay until then.

const WAIT_FOR = 60;
// How long a pocket waits before asking again after a failure, at most; and at a relay that cannot wait.
const MOST_PAUSE = 60_000;
const NO_WAITING = 5 * 60_000;
// How long a call that came waits to see whether it rang, as its ring comes on a queue of its own,
// through Tor or a relay that forwards it too.
const RING_SETTLES = 30_000;

const sameNews = (a: News, b: News) => a.round === b.round && a.messages === b.messages && a.unmarked === b.unmarked && a.rings === b.rings;

/**
 * Starts waiting for the open space's hidden chats; `tell(count, pocket)` says that many messages
 * came there. `settles` is how long a call waits to see whether it rang. Returns how to stop.
 */
export function startHiddenNotices(tell: (count: number, pocket: number) => void, { settles = RING_SETTLES } = {}): () => void {
  let open: { space: number; key: Uint8Array };
  try {
    open = currentSpace();
  } catch {
    return () => undefined;
  }
  const { space, key } = open;
  let stopped = false;
  // What each queue waited on had come, as last told, by its recipient id; kept with the queue too.
  const heard = new Map<string, News>();
  // The pockets whose chats closed, while what came there is heard without being told of.
  const settling = new Map<number, Promise<void>>();
  const placeOf = () => {
    const place = openHiddenPlace();
    return place && place.space === space ? place.pocket : null;
  };
  let openPocket = placeOf();
  // The pockets that said something waits, at a relay that cannot say what (from before NEWS).
  const told = new Set<number>();
  // Calls waiting to see whether they rang; and, by pocket, until when a ring is accounted for: a
  // call counts as rung only by a ring after that.
  const ringsSettling = new Set<ReturnType<typeof setTimeout>>();
  const accounted = new Map<number, number>();
  const startedAt = Date.now();
  const waits = new Set<AbortController>();
  const wakers = new Set<() => void>();
  const wake = () => {
    const now = [...wakers];
    wakers.clear();
    now.forEach((up) => up());
  };
  // Until `ms` pass, or something changes (hidden chats opened, stopped).
  const pause = (ms: number) =>
    new Promise<void>((done) => {
      const timer = setTimeout(() => {
        wakers.delete(up);
        done();
      }, ms);
      const up = () => {
        clearTimeout(timer);
        done();
      };
      wakers.add(up);
    });
  // Hidden chats that receive while closed tell of what came themselves (lib/place-receiver.ts); as
  // Erevos starts, which do is known once their receiver read it.
  const quiet = (pocket: number) => stopped || openHiddenPlace()?.pocket === pocket || !placesRead(space) || receivesPocket(space, pocket);
  const relayOf = (kept: Watched): Relay => ({ url: kept.url, token: kept.token || undefined });
  const lastHeard = (kept: Watched) => heard.get(kept.recipientHex) ?? heardOf(kept);

  async function hear(pocket: number, kept: Watched, news: News) {
    const before = lastHeard(kept) ?? NO_NEWS;
    heard.set(kept.recipientHex, news);
    if (sameNews(before, news)) return;
    await hearPocket(space, key, pocket, kept.recipientHex, news).catch(() => undefined);
  }

  // A pocket's chats closed: what they read while open was taken, and the relay's round began anew
  // as they last found the queue empty, so what it counts now came after they last looked, and is
  // told of. Heard as it is now first, so it is told of once.
  async function settle(pocket: number) {
    const kept = (await loadWatched(space, key).catch(() => null))?.[pocket] ?? null;
    if (!kept) return;
    const relay = relayOf(kept);
    if (!canWaitAt(relay) || !canTellNewsAt(relay)) return;
    const before = lastHeard(kept);
    const now = await waitForNews(relay, fromHex(kept.recipientHex), 0, before ?? NO_NEWS).catch(() => null);
    if (!now) return;
    await hear(pocket, kept, now);
    tellOf(pocket, newsSince(before, now));
  }

  // Tells of what came: messages at once, a call only once it is clear it did not ring.
  function tellOf(pocket: number, came: Omit<News, 'round'>) {
    const count = came.messages + came.unmarked;
    if (count > 0 && !quiet(pocket)) tell(count, pocket);
    if (came.rings === 0) return;
    const timer = setTimeout(() => {
      ringsSettling.delete(timer);
      const since = accounted.get(pocket) ?? startedAt;
      accounted.set(pocket, Date.now());
      if (hiddenRangAt(space, pocket) <= since && !quiet(pocket)) tell(came.rings, pocket);
    }, settles);
    ringsSettling.add(timer);
  }

  async function watch(pocket: number) {
    let failures = 0;
    while (!stopped) {
      if (quiet(pocket)) {
        await pause(MOST_PAUSE);
        continue;
      }
      await settling.get(pocket);
      const kept = (await loadWatched(space, key).catch(() => null))?.[pocket] ?? null;
      if (!kept) {
        await pause(MOST_PAUSE);
        continue;
      }
      const relay = relayOf(kept);
      if (!canWaitAt(relay)) {
        await pause(NO_WAITING);
        continue;
      }
      const wait = new AbortController();
      waits.add(wait);
      try {
        if (canTellNewsAt(relay)) {
          const before = lastHeard(kept);
          const now = await waitForNews(relay, fromHex(kept.recipientHex), WAIT_FOR, before ?? NO_NEWS, wait.signal);
          failures = 0;
          if (now) {
            if (!quiet(pocket) && !settling.has(pocket)) {
              await hear(pocket, kept, now);
              tellOf(pocket, newsSince(before, now));
            }
            continue;
          }
        }
        if (told.has(pocket)) {
          await pause(MOST_PAUSE);
          continue;
        }
        const came = await waitForMessage(relay, fromHex(kept.recipientHex), WAIT_FOR, wait.signal);
        failures = 0;
        if (came && !quiet(pocket)) {
          told.add(pocket);
          tell(1, pocket);
        }
      } catch (error) {
        // A queue the relay no longer has: one made for nothing takes its place, which keeps whose
        // it was, so the chats still find their switch on and wait on their queue again (lock/hidden-watch.ts).
        if (isQueueNotFound(error)) await lostPocket(space, key, pocket, kept.recipientHex, relay).catch(() => undefined);
        failures++;
        await pause(Math.min(MOST_PAUSE, 5_000 * 2 ** failures));
      } finally {
        waits.delete(wait);
      }
    }
  }

  // A space with a relay waits on POCKETS queues whatever hidden chats it has: those missing are made now.
  void loadCurrentSpaceData()
    .then((data) => (data.url.trim() ? fillWatched(space, key, { url: data.url.trim(), token: data.token.trim() || undefined }) : null))
    .catch(() => undefined)
    .finally(() => {
      for (let pocket = 0; pocket < POCKETS; pocket++) if (!stopped) void watch(pocket);
    });

  // What a pocket's chats read while open, or received while closed, is heard as it is now, and
  // what came after they last looked told of, before it is waited on again.
  const settleNow = (pocket: number) => {
    const done: Promise<void> = settle(pocket)
      .catch(() => undefined)
      .finally(() => {
        if (settling.get(pocket) === done) settling.delete(pocket);
      });
    settling.set(pocket, done);
  };
  // Hidden chats that open read what came: they may tell again once closed, of what comes after.
  const opened = onHiddenPlaceChange(() => {
    const now = placeOf();
    if (now !== null) told.delete(now);
    if (openPocket !== null && openPocket !== now) settleNow(openPocket);
    openPocket = now;
    wake();
  });
  // A place that no longer receives while closed: told of again, from what comes after.
  let receiving = new Set(Array.from({ length: POCKETS }, (_, pocket) => pocket).filter((pocket) => receivesPocket(space, pocket)));
  const places = onPlacesChange(() => {
    const now = new Set(Array.from({ length: POCKETS }, (_, pocket) => pocket).filter((pocket) => receivesPocket(space, pocket)));
    for (const pocket of receiving) if (!now.has(pocket)) settleNow(pocket);
    receiving = now;
    wake();
  });
  // The phone's network changed: a wait on the network gone ends, and each asks again at once.
  const network = onNetworkChange(() => {
    waits.forEach((wait) => wait.abort());
    wake();
  });
  return () => {
    stopped = true;
    opened();
    places();
    network();
    ringsSettling.forEach((timer) => clearTimeout(timer));
    ringsSettling.clear();
    waits.forEach((wait) => wait.abort());
    wake();
  };
}
