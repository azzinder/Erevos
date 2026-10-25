import { DOOR_QUEUES, hearDoor, loadDoor, openDoors, saveDoor, type Door } from '../lock/doors';
import { heardOf, type Watched } from '../lock/hidden-watch';
import { currentSpace } from '../lock/keys';
import { spaceQueues } from '../lock/queues-data';
import { loadSpaceData } from '../lock/space-data';
import { t } from './i18n';
import { canTellNewsAt, canWaitAt, fromHex, isQueueNotFound, newsSince, NO_NEWS, torFor, waitForNews, type News, type Relay } from './relay';

// While a space is open, the other spaces that asked for it say how many messages came to them,
// with the same notice as the open space's chats ("New message", "3 new messages"), never which
// space: the relay is asked to wait until what came into each queue of their doors (lock/doors.ts)
// changes, without taking it, as for hidden chats (lib/hidden-notices.ts). The relay counts what
// came by what each send said it carries: messages, calls and sends that did not say are told of;
// word between phones, as that a message came or was read, is not. What came is told of once, as
// what the relay said is kept with the door; what came while that space was open was read there,
// and is heard as it is when it closes (keepDoor). A space that goes through Tor is waited on only
// through Tor, while the open space has it ready. A space's door is written anew each time it opens,
// its own queue moves, and it closes, so it names the queues it reads on.

const WAIT_FOR = 60;
const MOST_PAUSE = 60_000;
const NO_WAITING = 5 * 60_000;

const sameNews = (a: News, b: News) => a.round === b.round && a.messages === b.messages && a.unmarked === b.unmarked && a.rings === b.rings;

const relayOf = (door: Door, kept: Watched): Relay => ({ url: kept.url, token: kept.token || undefined, ...(door.tor !== 'off' ? { torOnly: true } : {}) });

/** The door of the space `space` opens with `key`: its queues as it reads on them now, and its Tor way. Null with no queue yet. */
export async function doorOf(space: number, key: Uint8Array): Promise<Door | null> {
  const [data, queues] = await Promise.all([loadSpaceData(space, key), spaceQueues(space, key).load()]);
  const own = queues.now ?? (data.ownQueue && data.url.trim() ? { queue: data.ownQueue, url: data.url.trim(), token: data.token.trim() } : null);
  const kept: Watched[] = [];
  for (const one of [own, queues.link, queues.group, queues.public]) {
    if (!one || kept.some((k) => k.recipientHex === one.queue.recipientHex)) continue;
    kept.push({ url: one.url, token: one.token, recipientHex: one.queue.recipientHex });
  }
  return kept.length > 0 ? { tor: data.tor, queues: kept.slice(0, DOOR_QUEUES) } : null;
}

/**
 * Writes the space's door anew, when it is open: with the queues it reads on now, all heard anew,
 * and, as it closes (`closing`), what came into each so far, read while it was open, as heard.
 */
export async function keepDoor(space: number, key: Uint8Array, closing = false): Promise<void> {
  if (!(await loadDoor(space))) return;
  const door = await doorOf(space, key);
  await saveDoor(space, door, true);
  if (!closing || !door) return;
  for (const kept of door.queues) {
    const relay = relayOf(door, kept);
    if (!canWaitAt(relay) || !canTellNewsAt(relay)) continue;
    const now = await waitForNews(relay, fromHex(kept.recipientHex), 0, NO_NEWS).catch(() => null);
    if (now) await hearDoor(space, kept.recipientHex, now).catch(() => undefined);
  }
}

/** Whether the open space says a message came while another is open. */
export async function doorIsOpen(): Promise<boolean> {
  return (await loadDoor(currentSpace().space)) !== null;
}

/** Lets the open space say a message came while another is open, or no more. Throws when it has no relay queue yet. */
export async function setDoorOpen(on: boolean): Promise<void> {
  const { space, key } = currentSpace();
  if (!on) return saveDoor(space, null);
  const door = await doorOf(space, key);
  if (!door) throw new Error(t('This space has no queue at a relay yet: it can say nothing while closed.'));
  await saveDoor(space, door, true);
}

/** Starts waiting for the closed spaces that asked for it; `tell(count, space)` says that many messages came there. Returns how to stop. */
export function startClosedNotices(tell: (count: number, space: number) => void): () => void {
  let open: number;
  try {
    open = currentSpace().space;
  } catch {
    return () => undefined;
  }
  let stopped = false;
  const heard = new Map<string, News>();
  const waits = new Set<AbortController>();
  const wakers = new Set<() => void>();
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

  async function watch(space: number, index: number) {
    let failures = 0;
    while (!stopped) {
      const door = await loadDoor(space).catch(() => null);
      const kept = door?.queues[index];
      // Shut, or no such queue: nothing is waited on for it until that space opens again.
      if (!door || !kept) return;
      const relay = relayOf(door, kept);
      if (!canWaitAt(relay) || !canTellNewsAt(relay)) {
        await pause(NO_WAITING);
        continue;
      }
      if (relay.torOnly && !torFor(false)) {
        await pause(MOST_PAUSE);
        continue;
      }
      const wait = new AbortController();
      waits.add(wait);
      try {
        const before = heard.get(kept.recipientHex) ?? heardOf(kept);
        const now = await waitForNews(relay, fromHex(kept.recipientHex), WAIT_FOR, before ?? NO_NEWS, wait.signal);
        failures = 0;
        if (!now) continue;
        if (stopped || (before && sameNews(before, now))) continue;
        heard.set(kept.recipientHex, now);
        await hearDoor(space, kept.recipientHex, now).catch(() => undefined);
        const came = newsSince(before, now);
        const count = came.messages + came.unmarked + came.rings;
        if (count > 0 && !stopped) tell(count, space);
      } catch (error) {
        // A queue the relay no longer has: the space reads elsewhere now, and its door says where once it opens.
        if (isQueueNotFound(error)) return;
        failures++;
        await pause(Math.min(MOST_PAUSE, 5_000 * 2 ** failures));
      } finally {
        waits.delete(wait);
      }
    }
  }

  void openDoors(open)
    .then((doors) => {
      for (const { space, door } of doors) for (let index = 0; index < door.queues.length; index++) if (!stopped) void watch(space, index);
    })
    .catch(() => undefined);

  return () => {
    stopped = true;
    waits.forEach((wait) => wait.abort());
    [...wakers].forEach((up) => up());
    wakers.clear();
  };
}
