import { fillWatched, loadWatched, unwatchPocket } from '../lock/hidden-watch';
import { currentSpace } from '../lock/keys';
import { POCKETS } from '../lock/sealed-file';
import { loadCurrentSpaceData } from '../lock/space-data';
import { onHiddenPlaceChange, openHiddenPlace } from './hidden-contacts';
import { appShown, onAppShown } from './receiver';
import { canWaitAt, fromHex, isQueueNotFound, waitForMessage, type Relay } from './relay';

// While Erevos is in the background (lib/background.ts), hidden chats that asked for it say that a
// message came, with the same notice as the space's chats ("New message"): for every pocket of the
// open space, the relay is asked to wait until something is in the queue kept for it
// (lock/hidden-watch.ts), without taking it. The queues made for nothing are waited on the same
// way, so the relay and the network see the same for every space. A pocket that told of a message
// tells of none again until its chats open, as what came stays on the relay until then.

const WAIT_FOR = 60;
// How long a pocket waits before asking again after a failure, at most; and at a relay that cannot wait.
const MOST_PAUSE = 60_000;
const NO_WAITING = 5 * 60_000;

/** Starts waiting for the open space's hidden chats; `tell` says a message came. Returns how to stop. */
export function startHiddenNotices(tell: () => void): () => void {
  let open: { space: number; key: Uint8Array };
  try {
    open = currentSpace();
  } catch {
    return () => undefined;
  }
  const { space, key } = open;
  let stopped = false;
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

  async function watch(pocket: number) {
    let failures = 0;
    while (!stopped) {
      if (appShown() || told.has(pocket)) {
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
        const came = await waitForMessage(relay, fromHex(kept.recipientHex), WAIT_FOR, wait.signal);
        failures = 0;
        if (came && !stopped && !appShown() && openHiddenPlace()?.pocket !== pocket) {
          told.add(pocket);
          tell();
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
