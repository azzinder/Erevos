import type { Spare } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, updateCurrentSpaceData, updateHiddenData, type Queue, type SpaceData, type SpareRelay } from '../lock/space-data';
import type { SpareCode } from './contact-code';
import type { E2E } from './e2e';
import { toBase64Url } from './e2e';
import { createQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, toHex, type Relay } from './relay';

// The space's backup relay, as Briar's Mailbox: a second relay (one at home, on a Raspberry Pi or
// an old computer, say) with a queue of its own. The contact link and every message say that
// queue beside the main one (lib/contact-code.ts, lib/e2e.ts), so a contact writes there while
// the main relay cannot be reached, and sends to contacts go through it when ours cannot
// (lib/space-chats.ts). The chat screen, or the receiver beside the other screens, takes what
// came there with each look. Each hidden place (lock/hidden.ts) can have one of its own, kept
// sealed with that place's key and never the space's: one relay seeing both queues would tie them
// together. A hidden place's is looked at only while it is open, as its key is in memory only then.

// Messages taken from the backup queue in one look, at most.
const BATCH = 50;

type Ready = { url: string; relay: Relay; queue: Queue; said: Spare };

/** Where a backup relay's settings are kept: the open space's, or a hidden place's. `of` stands for
 *  whose they are while they are open. */
export type SpareStore = { of: object; load: () => Promise<SpaceData>; update: (patch: Partial<SpaceData>) => Promise<void> };

/** The open space's. */
export function spaceSpare(): SpareStore {
  return { of: currentSpace(), load: loadCurrentSpaceData, update: updateCurrentSpaceData };
}

/** A hidden place's, while it is open with its key. */
export function hiddenSpare(space: number, pocket: number, key: Uint8Array): SpareStore {
  return { of: key, load: () => loadHiddenData(space, pocket, key), update: (patch) => updateHiddenData(space, pocket, key, patch) };
}

const ready = new Map<object, Ready>();

/** The backup relay to send through when the relay cannot be reached, if it has one ready. */
export function spareBackup(store: SpareStore = spaceSpare()): Relay | undefined {
  return ready.get(store.of)?.relay;
}

/** The backup queue a contact link gives, from what the chat says of it. */
export function spareCode(spare: Spare | null): SpareCode | undefined {
  return spare ? { senderHex: spare.sender, relayUrl: spare.relay, relayKey: spare.relayKey || undefined } : undefined;
}

/** Lets go of one backup relay, when its address changes or its hidden place closes, or, with
 *  none named, of all of them, when the space closes. */
export function forgetSpare(store?: SpareStore): void {
  if (store) ready.delete(store.of);
  else ready.clear();
}

/** Saves a backup relay. A new address gets a new queue there with the next look. */
export async function setSpareRelay(url: string, token: string, store: SpareStore = spaceSpare()): Promise<void> {
  const data = await store.load();
  const same = data.spare.url.trim() === url.trim();
  await store.update({ spare: { url: url.trim(), token: token.trim(), queue: same ? data.spare.queue : null } });
  forgetSpare(store);
}

/** Makes the backup queue now, if there is a backup relay without one. Throws when that relay cannot be reached. */
export async function readySpare(store: SpareStore = spaceSpare()): Promise<boolean> {
  return (await prepare(store, (await store.load()).spare)) !== null;
}

// The backup queue, made the first time, and what to say of it: its sender id, the relay and the
// relay's key. Null when there is no backup relay.
async function prepare(store: SpareStore, spare: SpareRelay): Promise<Ready | null> {
  const url = spare.url.trim();
  if (!url) return null;
  const known = ready.get(store.of);
  if (known && known.url === url && known.queue.recipientHex === spare.queue?.recipientHex) return known;
  const relay: Relay = { url, token: spare.token.trim() || undefined };
  let queue = spare.queue;
  if (!queue) {
    const ids = await createQueue(relay);
    queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    await store.update({ spare: { ...spare, queue } });
  }
  const key = await relayKey(relay).catch(() => null);
  const next: Ready = { url, relay, queue, said: { sender: queue.senderHex, relay: url, relayKey: key ? toBase64Url(key) : '' } };
  ready.set(store.of, next);
  return next;
}

/**
 * One look at the space's backup queue: says it to contacts from now on (E2E.setSpare), and hands
 * each message that came there to `take`, as one from the main queue. Says nothing when the
 * backup relay cannot be reached: the main relay's note says enough, and it is tried again.
 */
export async function lookAtSpare(
  e2e: E2E,
  take: (bytes: Uint8Array) => Promise<void>,
  stop: () => boolean,
  store: SpareStore = spaceSpare(),
): Promise<void> {
  const data = await store.load();
  let place: Ready | null;
  try {
    place = await prepare(store, data.spare);
  } catch {
    return;
  }
  e2e.setSpare(place?.said ?? null);
  if (!place) return;
  const recipient = fromHex(place.queue.recipientHex);
  for (let i = 0; i < BATCH && !stop(); i++) {
    let bytes: Uint8Array | null;
    try {
      bytes = await receiveMessage(place.relay, recipient);
    } catch (error) {
      // The backup relay lost the queue: a new one, which contacts learn from the next message.
      if (isQueueNotFound(error)) {
        await store.update({ spare: { ...data.spare, queue: null } }).catch(() => undefined);
        forgetSpare(store);
      }
      return;
    }
    if (!bytes) return;
    try {
      await take(bytes);
    } catch {
      // This one is lost, as from the main queue; the next ones still come.
    }
  }
}
