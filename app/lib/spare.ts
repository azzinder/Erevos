import type { Spare } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, updateCurrentSpaceData, type Queue, type SpareRelay } from '../lock/space-data';
import type { SpareCode } from './contact-code';
import type { E2E } from './e2e';
import { toBase64Url } from './e2e';
import { createQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, toHex, type Relay } from './relay';

// The space's backup relay, as Briar's Mailbox: a second relay (one at home, on a Raspberry Pi or
// an old computer, say) with a queue of its own. The contact link and every message say that
// queue beside the main one (lib/contact-code.ts, lib/e2e.ts), so a contact writes there while
// the main relay cannot be reached, and sends to contacts go through it when ours cannot
// (lib/space-chats.ts). The chat screen, or the receiver beside the other screens, takes what
// came there with each look. Hidden chats have none: a backup relay would see both.

// Messages taken from the backup queue in one look, at most.
const BATCH = 50;

type Ready = { of: object; url: string; relay: Relay; queue: Queue; said: Spare };

let ready: Ready | null = null;

/** The open space's backup relay, to send through when its own relay cannot be reached, if it has one ready. */
export function spareBackup(): Relay | undefined {
  return ready && ready.of === currentSpace() ? ready.relay : undefined;
}

/** The backup queue a contact link gives, from what the chat says of it. */
export function spareCode(spare: Spare | null): SpareCode | undefined {
  return spare ? { senderHex: spare.sender, relayUrl: spare.relay, relayKey: spare.relayKey || undefined } : undefined;
}

/** Lets go of the space's backup relay when it closes, or its address changes. */
export function forgetSpare(): void {
  ready = null;
}

/** Saves the space's backup relay. A new address gets a new queue there with the next look. */
export async function setSpareRelay(url: string, token: string): Promise<void> {
  const data = await loadCurrentSpaceData();
  const same = data.spare.url.trim() === url.trim();
  await updateCurrentSpaceData({ spare: { url: url.trim(), token: token.trim(), queue: same ? data.spare.queue : null } });
  forgetSpare();
}

/** Makes the space's backup queue now, if it has a backup relay without one. Throws when that relay cannot be reached. */
export async function readySpare(): Promise<boolean> {
  return (await prepare((await loadCurrentSpaceData()).spare)) !== null;
}

// The space's backup queue, made the first time, and what to say of it: its sender id, the relay
// and the relay's key. Null when the space has no backup relay.
async function prepare(spare: SpareRelay): Promise<Ready | null> {
  const current = currentSpace();
  const url = spare.url.trim();
  if (!url) return null;
  if (ready && ready.of === current && ready.url === url && ready.queue.recipientHex === spare.queue?.recipientHex) return ready;
  const relay: Relay = { url, token: spare.token.trim() || undefined };
  let queue = spare.queue;
  if (!queue) {
    const ids = await createQueue(relay);
    queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    await updateCurrentSpaceData({ spare: { ...spare, queue } });
  }
  const key = await relayKey(relay).catch(() => null);
  const next: Ready = { of: current, url, relay, queue, said: { sender: queue.senderHex, relay: url, relayKey: key ? toBase64Url(key) : '' } };
  ready = next;
  return next;
}

/**
 * One look at the space's backup queue: says it to contacts from now on (E2E.setSpare), and hands
 * each message that came there to `take`, as one from the main queue. Says nothing when the
 * backup relay cannot be reached: the main relay's note says enough, and it is tried again.
 */
export async function lookAtSpare(e2e: E2E, take: (bytes: Uint8Array) => Promise<void>, stop: () => boolean): Promise<void> {
  const data = await loadCurrentSpaceData();
  let place: Ready | null;
  try {
    place = await prepare(data.spare);
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
        await updateCurrentSpaceData({ spare: { ...data.spare, queue: null } }).catch(() => undefined);
        forgetSpare();
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
