import { currentSpace } from '../lock/keys';
import { spaceQueues } from '../lock/queues-data';
import { loadCurrentSpaceData, loadSpaceData, updateSpaceData, type Queue } from '../lock/space-data';

import { WEB_APP } from './integrity';
import { leftAt, pushedQueues } from './push-queues';
import { useForMoves } from './queue-move';
import { fromHex, pushKey, relayHome, setPush, setPushes, toHex, type PushKeys, type Relay } from './relay';
import { spaceChats } from './space-chats';
import { t } from './i18n';

// Notifications for the web app while it is closed (an iPhone stops it as soon as it leaves the
// screen). The browser makes a push address for the relay's key; the relay pushes to that address
// whenever a message comes into the space's queue (crates/erevos-relay/src/push.rs). It is also
// given the browser's keys for the address, so a relay that counts puts in each push how many
// messages came, encrypted for the browser, and the service worker shows "3 new messages" (pwa/sw.js);
// from an older relay the push is empty, and the notice says "New message", or "New messages" once
// more came since Erevos was last open. The push goes through the browser's push service (Apple's
// on an iPhone), which sees when a message comes, never what, how many or from whom. Off unless
// turned on, per space, for the space's own queue, the queues its groups and public groups say
// (lib/queue-move.ts) and its contacts' own queues (lib/push-queues.ts): never for hidden chats,
// nor for the queue the contact link names (a request shows when the app opens), nor for one the
// space moved away from. The relay is given the address for them all on one connection when
// Erevos starts, and after that only for the queues it was not given it for yet.

const supported = typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window && 'serviceWorker' in navigator;

export const PUSH_AVAILABLE = WEB_APP && supported;

function same(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((byte, i) => byte === b[i]);
}

/** This browser's push address for `key`, made if there is none or it was made for another key. */
async function subscription(key: Uint8Array): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const kept = await registration.pushManager.getSubscription();
  if (kept && same(kept.options.applicationServerKey, key)) return kept;
  if (kept) await kept.unsubscribe();
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: new Uint8Array(key) });
}

// The keys the pushes are encrypted for, if this browser opens the encryption a relay uses (RFC 8291).
function keysOf(sub: PushSubscription): PushKeys | undefined {
  const encodings = (PushManager as { supportedContentEncodings?: readonly string[] }).supportedContentEncodings;
  if (encodings && !encodings.includes('aes128gcm')) return undefined;
  const p256dh = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  if (p256dh?.byteLength !== 65 || auth?.byteLength !== 16) return undefined;
  return { p256dh: new Uint8Array(p256dh), auth: new Uint8Array(auth) };
}

// The open space's chats, for its contacts' queues; none when they cannot open.
const contacts = () => spaceChats().then(({ e2e }) => e2e, () => null);

// The open space, or null when none is: a registration started for one is not finished for another.
function opened(): object | null {
  try {
    return currentSpace();
  } catch {
    return null;
  }
}

// The space's queues that push on the same relay as `queue`, its own (lib/push-queues.ts), as recipient ids in hex.
async function pushed(own: Relay, queue: Queue): Promise<string[]> {
  const { space, key } = currentSpace();
  const queues = await spaceQueues(space, key).load().catch(() => null);
  return pushedQueues(queue, queues, await contacts(), own.url);
}

// The queues the relay took this browser's push address for since Erevos started, by relay and
// address with its keys: each is given it again only once Erevos starts again, or the address
// changes. In memory only, as the ids open the queues on the relay's /read path.
const given = new Map<string, Set<string>>();
// One registration at a time: the receiver's, a move's and a tap's come close together.
let line: Promise<unknown> = Promise.resolve();

function inLine<T>(run: () => Promise<T>): Promise<T> {
  const next = line.then(run, run);
  line = next.catch(() => undefined);
  return next;
}

function givenAt(own: Relay, endpoint: string, keys: PushKeys | undefined): Set<string> {
  const at = `${relayHome(own.url)}\n${endpoint}\n${keys ? toHex(keys.p256dh) + toHex(keys.auth) : ''}`;
  let set = given.get(at);
  if (!set) given.set(at, (set = new Set()));
  return set;
}

// The relay no longer pushes for these: they are given the address again should they push again.
function taken(queues: string[]): void {
  for (const set of given.values()) for (const r of queues) set.delete(r);
}

// Gives the relay this browser's push address, made for the relay's key, for each of `queues` it
// was not given it for yet. The first `needed` (the space's own queue, when notifications are being
// turned on) must take it, before any other is asked; of the others, one the relay no longer has
// (a contact's it lost, one made ahead that ran out unused) is left out, and the rest still take it.
// Those it could not be given are asked again the next time (keepPush).
async function register(own: Relay, queues: string[], needed = 0): Promise<string | null> {
  const key = await pushKey(own);
  if (!key) return t('Your relay does not send notifications. It needs a newer version, set up with a push key.');
  const sub = await subscription(key);
  const keys = keysOf(sub);
  const done = givenAt(own, sub.endpoint, keys);
  for (const r of queues.slice(0, needed)) {
    await setPush(own, fromHex(r), sub.endpoint, keys);
    done.add(r);
  }
  const rest = queues.slice(needed).filter((r) => !done.has(r));
  const answers = await setPushes(own, rest.map(fromHex), sub.endpoint, keys).catch(() => []);
  answers.forEach((error, i) => {
    if (!error) done.add(rest[i]);
  });
  return null;
}

// Whether notifications are on for the open space, and allowed.
async function pushOn(): Promise<boolean> {
  if (!PUSH_AVAILABLE || Notification.permission !== 'granted') return false;
  return (await loadCurrentSpaceData().catch(() => null))?.push === true;
}

function spaceRelay(url: string, token: string): Relay {
  return { url: url.trim(), token: token.trim() || undefined };
}

/** Turns notifications on for the open space. Call it straight from a tap: Safari asks for the
 *  permission only then. Says what went wrong, or null. */
export async function turnOnPush(): Promise<string | null> {
  if (!PUSH_AVAILABLE) return t('This browser cannot show notifications for a closed web app. On an iPhone, add Erevos to the home screen first.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return t('Notifications are not allowed for Erevos. Allow them in the settings of this browser or phone.');
  // This space's, as tapped: the line may be held a while, and another space open by then.
  const { space, key } = currentSpace();
  const at = opened();
  const data = await loadSpaceData(space, key);
  if (!data.url.trim() || !data.ownQueue) return t('Set up the relay first, under Relay.');
  const own = spaceRelay(data.url, data.token);
  const queue = data.ownQueue;
  try {
    const queues = await pushed(own, queue);
    const problem = await inLine(() => register(own, queues, 1));
    if (problem) return problem;
  } catch (error) {
    return t('Notifications could not be turned on: {reason}', { reason: error instanceof Error ? error.message : String(error) });
  }
  await updateSpaceData(space, key, { push: true });
  // Queues made ahead meanwhile were not given it, as notifications were not on yet.
  if (opened() === at) await keepPush(own, queue);
  return null;
}

/** Turns notifications off for the open space: the relay forgets the push address of its queues,
 *  and of its contacts' queues that may still have it. */
export async function turnOffPush(): Promise<void> {
  const { space, key } = currentSpace();
  const data = await loadSpaceData(space, key);
  await updateSpaceData(space, key, { push: false });
  if (!data.url.trim() || !data.ownQueue) return;
  const own = spaceRelay(data.url, data.token);
  const queue = data.ownQueue;
  // Worked out now, for this space, as for turning them on.
  const queues = await Promise.all([pushed(own, queue), contacts()]).then(
    ([pushing, e2e]) => [...new Set([...pushing, ...leftAt(e2e, own.url)])],
    () => [queue.recipientHex],
  );
  await inLine(async () => {
    taken(queues);
    await setPushes(own, queues.map(fromHex), '');
  }).catch(() => undefined);
}

/** Gives the relay the push address when the space opens or its queues change, if notifications
 *  are on, for each queue that pushes and was not given it yet: a browser may change the address,
 *  and a new queue has none. */
export async function keepPush(own: Relay, queue: Queue): Promise<void> {
  const at = opened();
  if (!(await pushOn())) return;
  await inLine(async () => {
    const queues = await pushed(own, queue);
    // Not if notifications were turned off, or another space opened, while it waited its turn.
    if (opened() === at && (await pushOn())) await register(own, queues);
  }).catch(() => undefined);
}

/** Gives the relay the push address for queues made ahead for contacts (lib/queue-move.ts), if
 *  notifications are on, so a contact given one before the space opens again wakes the closed web app. */
export async function addPush(own: Relay, queues: string[]): Promise<void> {
  const at = opened();
  if (queues.length === 0 || !(await pushOn())) return;
  await inLine(async () => {
    if (opened() === at && (await pushOn())) await register(own, queues);
  }).catch(() => undefined);
}

/** The relay forgets the push address of a queue the space or a contact moved away from, so what comes there never wakes the closed web app. */
export async function dropPush(own: Relay, queue: Queue): Promise<void> {
  if (!PUSH_AVAILABLE) return;
  taken([queue.recipientHex]);
  await setPush(own, fromHex(queue.recipientHex), '').catch(() => undefined);
}

useForMoves({ push: { keep: keepPush, drop: dropPush, add: addPush } });
