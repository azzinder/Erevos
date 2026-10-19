import type { Spare } from '../lock/e2e-data';
import type { Message } from '../lock/history';
import { loadClip } from '../lock/voice-clips';
import { uploadFile } from './attachments';
import type { E2E, Where } from './e2e';
import { nearby, NoWayError, TooLargeForLoraError } from './nearby';
import { canTryLater, fromHex, sendMessage, type Relay } from './relay';
import { carriedFor, contactTarget, type SpaceChats } from './space-chats';
import { t } from './i18n';

type Chats = Pick<SpaceChats, 'e2e' | 'history'>;

// Our messages that wait (lock/history.ts, marked WAITING): nothing could take them when they were
// sent, as the relay could not be reached and the contact's phone was not near, or LoRa was the
// only way and they are not text. They stay in the chat, marked, and go by themselves, oldest
// first and each contact's in order, once the relay or the contact's phone nearby can take them:
// with each look at the relay that answers (the chat screen's, or the receiver's beside the
// screens), and when a contact is heard nearby. A waiting text goes over LoRa too, once a radio
// is linked. Each keeps its tag, so it can still be deleted on both phones once it went.
//
// Each try seals the message anew, which moves the conversation on, and a contact's phone can skip
// only so many it never got. So a message is tried only when there is a way for it, and after a
// failed try it waits longer each time before the next.

const CONTACT_PREFIX = 'contact:';
// The first wait after a failed try, and the longest, milliseconds.
const FIRST_WAIT = 30_000;
const LONGEST_WAIT = 30 * 60_000;

/** Whether what failed failed only because nothing could take it now, so it can wait and go later. */
export function canWait(error: unknown): boolean {
  return error instanceof NoWayError || error instanceof TooLargeForLoraError || canTryLater(error);
}

/**
 * Where the space's messages go from, as the chat screen or the receiver knows it: the relay that
 * sends (null without one), our own relay, for photos and files (null without one), our queue's
 * sender id, where contacts reach us, our relay's key (base64url, or empty), and whether the relay
 * answered just now.
 */
export type SendPlace = { sends: Relay | null; own: Relay | null; senderHex: string; here: Where; ownKey: string; relayUp: boolean };

/** A message that waited and went: its chat, its tag, and how long it lasts once read (seconds). */
export type Went = { peer: string; tag: string; lasts: number };

// Failed tries so far, by tag, and when the next may be.
const tries = new Map<string, { count: number; next: number }>();
let sending: Promise<Went[]> | null = null;

/**
 * Sends what waits in the space's chats that can go now, oldest first; a contact's next ones wait
 * while one of theirs cannot go. Marks each that went as the relay took it. Returns those.
 */
export function sendWaiting(chats: Chats, place: SendPlace, now = Date.now()): Promise<Went[]> {
  if (!sending) {
    sending = sendAll(chats, place, now).finally(() => {
      sending = null;
    });
  }
  return sending;
}

async function sendAll({ e2e, history }: Chats, place: SendPlace, now: number): Promise<Went[]> {
  const went: Went[] = [];
  const stuck = new Set<string>();
  for (const message of history.waiting()) {
    const { peer, tag } = message;
    if (stuck.has(peer) || !peer.startsWith(CONTACT_PREFIX)) continue;
    const identity = peer.slice(CONTACT_PREFIX.length);
    const tried = tries.get(tag);
    if ((tried && tried.next > now) || !canGo(e2e, place, identity, message)) {
      stuck.add(peer);
      continue;
    }
    try {
      const lasts = await sendOne(e2e, place, identity, message);
      tries.delete(tag);
      if (await history.sent(peer, tag, lasts)) went.push({ peer, tag, lasts });
    } catch {
      const count = (tried?.count ?? 0) + 1;
      tries.set(tag, { count, next: now + Math.min(LONGEST_WAIT, FIRST_WAIT * 2 ** (count - 1)) });
      stuck.add(peer);
    }
  }
  return went;
}

// Whether there is a way for it now, before sealing it: the relay answers and can reach their
// queue, their phone is near, or, for a text, a LoRa radio is linked. A photo or file goes to our
// relay first in any case.
function canGo(e2e: E2E, place: SendPlace, identity: string, message: Message): boolean {
  const queue = e2e.queueOf(identity);
  if (!queue) return false;
  if (message.file) return !!place.own && place.relayUp && (nearby.isNear(identity) || throughRelay(place, queue));
  return nearby.isNear(identity) || (place.relayUp && throughRelay(place, queue)) || (!message.voice && nearby.hasSlow());
}

function throughRelay(place: SendPlace, queue: { sender: string; relay: string; relayKey: string }): boolean {
  if (!place.sends || !queue.sender) return false;
  try {
    contactTarget(place.sends, queue);
    return true;
  } catch {
    return false;
  }
}

// Seals the message, with its tag, and hands it on as the chat does: nearby when they are, and
// through the relay, after the conversation's first packet if the relay has not taken that yet.
// Returns how long it lasts once read.
async function sendOne(e2e: E2E, place: SendPlace, identity: string, message: Message): Promise<number> {
  const options = { at: place.here, tag: message.tag, lasts: message.lasts ?? 0 };
  let sealed: { sender: string; relay: string; relayKey: string; spare: Spare | null; first: Uint8Array | null; tag: string; timer: number };
  let packets: Uint8Array[];
  let worthCarrying = true;
  if (message.voice) {
    const audio = await loadClip(message.voice);
    if (!audio) throw new Error(t("This voice message's sound is gone."));
    const voice = await e2e.sealVoice(identity, audio, message.voice.ms, place.senderHex, options);
    sealed = voice;
    packets = voice.packets;
  } else if (message.file) {
    // On the relay again with each try; what a try left there that did not go expires there.
    const offer = await uploadFile(place.own!, message.file);
    const file = await e2e.sealFile(identity, offer, place.senderHex, options);
    sealed = file;
    packets = [file.packet];
    worthCarrying = false;
  } else {
    const text = await e2e.seal(identity, message.text, place.senderHex, options);
    sealed = text;
    packets = [text.packet];
  }
  const sends = place.sends;
  const relay =
    sends && sealed.sender
      ? async () => {
          const to = contactTarget(sends, sealed);
          if (sealed.first) {
            await sendMessage(to, fromHex(sealed.sender), sealed.first);
            await e2e.firstSent(identity);
          }
          for (const packet of packets) await sendMessage(to, fromHex(sealed.sender), packet);
        }
      : null;
  const all = sealed.first ? [sealed.first, ...packets] : packets;
  const carry = worthCarrying ? () => carriedFor(sealed, all, { url: place.own?.url ?? '', key: place.ownKey }) : null;
  await nearby.deliver(identity, all, relay, carry, worthCarrying);
  return sealed.timer;
}
