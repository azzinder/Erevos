import { fillWatched, loadWatched, unwatchPocket } from '../lock/hidden-watch';
import { currentSpace } from '../lock/keys';
import { POCKETS } from '../lock/sealed-file';
import { loadCurrentSpaceData } from '../lock/space-data';
import { onHiddenPlaceChange, openHiddenPlace } from './hidden-contacts';
import { hiddenRangAt } from './hidden-ring';
import { appShown, onAppShown } from './receiver';
import { canTellNewsAt, canWaitAt, fromHex, isQueueNotFound, newsSince, NO_NEWS, waitForMessage, waitForNews, type News, type Relay } from './relay';

// While Erevos is in the background (lib/background.ts), hidden chats that asked for it say how many
// messages came, with the same notice as the space's chats ("New message", "3 new messages"): for
// every pocket of the open space, the relay is asked to wait until what came into the queue kept
// for it (lock/hidden-watch.ts) changes, without taking it. The relay counts what came by what each
// send said it carries (lib/relay.ts, waitForNews): messages, and sends that did not say, are told
// of; word between phones, as that a message came or was read, is not. A call is told of only when
// it did not ring (lib/hidden-ring-notices.ts). What came is told of once, though Erevos comes and
// goes, until the place opens and takes it. The queues made for nothing are waited on the same way,
// so the relay and the network see the same for every space. A relay from before it can say only
// that something waits: then a pocket tells "New message" once, and again only after its chats
// opened, as what came stays on the relay until then.

const WAIT_FOR = 60;
// How long a pocket waits before asking again after a failure, at most; and at a relay that cannot wait.
const MOST_PAUSE = 60_000;
const NO_WAITING = 5 * 60_000;
// How long a call that came waits to see whether it rang, as its ring comes on a queue of its own.
const RING_SETTLES = 10_000;

// What each queue waited on had come, as last told, by its recipient id, for this run.
const heard = new Map<string, News>();

/** Starts waiting for the open space's hidden chats; `tell(count)` says that many messages came. Returns how to stop. */
export function startHiddenNotices(tell: (count: number) => void): () => void {
  let open: { space: number; key: Uint8Array };
  try {
    open = currentSpace();
  } catch {
    return () => undefined;
  }
  const { space, key } = open;
  let stopped = false;
  // The pockets that said something waits, at a relay that cannot say what (from before NEWS).
  const told = new Set<number>();
  const waits = new Set<AbortController>();
  const wakers = new Set<() => void>();
  const wake = () => {
    const now = [...wakers];
    wakers.clear();
    now.forEach((up) => up());
  };
  // Until `ms` pass, or something changes (shown, hidden chats opened, stopped).
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
  const quiet = (pocket: number) => stopped || appShown() || openHiddenPlace()?.pocket === pocket;

  // Tells of what came: a call only once it is clear it did not ring.
  async function tellOf(pocket: number, came: Omit<News, 'round'>) {
    let count = came.messages + came.unmarked;
    if (came.rings > 0) {
      const at = Date.now();
      await new Promise((done) => setTimeout(done, RING_SETTLES));
      if (hiddenRangAt(space, pocket) < at - RING_SETTLES) count += came.rings;
    }
    if (count > 0 && !quiet(pocket)) tell(count);
  }

  async function watch(pocket: number) {
    let failures = 0;
    while (!stopped) {
      if (quiet(pocket)) {
        await pause(MOST_PAUSE);
        continue;
      }
      const kept = (await loadWatched(space, key).catch(() => null))?.[pocket] ?? null;
      if (!kept) {
        await pause(MOST_PAUSE);
        continue;
      }
      const relay: Relay = { url: kept.url, token: kept.token || undefined };
      if (!canWaitAt(relay)) {
        await pause(NO_WAITING);
        continue;
      }
      const wait = new AbortController();
      waits.add(wait);
      try {
        if (canTellNewsAt(relay)) {
          const before = heard.get(kept.recipientHex) ?? null;
          const now = await waitForNews(relay, fromHex(kept.recipientHex), WAIT_FOR, before ?? NO_NEWS, wait.signal);
          failures = 0;
          if (now) {
            if (!quiet(pocket)) {
              heard.set(kept.recipientHex, now);
              await tellOf(pocket, newsSince(before, now));
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
          tell(1);
        }
      } catch (error) {
        // A queue the relay no longer has: one made for nothing takes its place.
        if (isQueueNotFound(error)) await unwatchPocket(space, key, pocket, relay).catch(() => undefined);
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

  // Hidden chats that open read what came: they may tell again once closed.
  const opened = onHiddenPlaceChange(() => {
    const open = openHiddenPlace();
    if (open && open.space === space) told.delete(open.pocket);
    wake();
  });
  const shown = onAppShown((now) => {
    if (now) waits.forEach((wait) => wait.abort());
    wake();
  });
  return () => {
    stopped = true;
    opened();
    shown();
    waits.forEach((wait) => wait.abort());
    wake();
  };
}
