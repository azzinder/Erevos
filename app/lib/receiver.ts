import { newTag, type Message } from '../lock/history';
import { loadCurrentSpaceData, updateCurrentSpaceData, type Queue } from '../lock/space-data';
import { saveClip } from '../lock/voice-clips';
import { offerRef } from './attachments';
import { canRelaySeal, hasCore } from './core';
import { toBase64Url, type Extra, type Received, type Where } from './e2e';
import { createQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, sendMessage, toHex, type Relay } from './relay';
import { contactTarget, relayFor, spaceChats, type SpaceChats } from './space-chats';

// Messages that come while a space is open, whatever screen shows. The chat screen takes them
// itself while it is open, and holds this meanwhile (holdReceiver). Otherwise this looks at the
// space's relay queue every few seconds, keeps what came in the space's history as the chat
// would, tells the contacts' phones that it came, and tells the home screen (onReceived). What
// only the chat says, such as that a contact set a timer, is not said. A photo or file is taken
// from the relay once its chat opens. Hidden chats are not looked at: their key is in memory only
// while they are open.

const EVERY = 3000;
// Messages taken in one look, at most.
const BATCH = 50;
const CONTACT_PREFIX = 'contact:';

type Receipts = Record<string, string[]>;

// Where this space's messages come and go: our relay, the relay that sends (through the second
// one when set), our queue, and where contacts reach us, said in every message.
type Place = { own: Relay; sends: Relay; queue: Queue; here: Where; keyAsked: boolean };

let holds = 0;
// Bumped each time a hold ends: the chat may have changed the relay or the queue meanwhile.
let released = 0;
let look: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

/**
 * Stops looking at the relay, once a look under way has ended, until the function it gives is
 * called. The chat screen holds it while it is open, and a backup being restored.
 */
export async function holdReceiver(): Promise<() => void> {
  holds++;
  await look.catch(() => undefined);
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holds--;
    released++;
  };
}

/** Calls `listener` each time messages or marks came. Returns how to stop. */
export function onReceived(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Looks at the open space's relay queue every `every` milliseconds until the function it gives is called. */
export function startReceiver(every = EVERY): () => void {
  const state: { place: Place | null; seen: number; receipts: Receipts } = { place: null, seen: -1, receipts: {} };
  let stopped = false;
  let busy = false;
  const timer = setInterval(() => {
    if (stopped || busy || holds > 0) return;
    busy = true;
    look = lookOnce(state, () => stopped || holds > 0)
      .then((changed) => {
        if (changed && !stopped) listeners.forEach((listener) => listener());
      })
      .catch(() => {
        // The relay could not be reached: tried again with the next look.
      })
      .finally(() => {
        busy = false;
      });
  }, every);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

async function placeNow(): Promise<Place | null> {
  const data = await loadCurrentSpaceData();
  const url = data.url.trim();
  if (!url || !data.ownQueue) return null;
  const own: Relay = { url, token: data.token.trim() || undefined };
  const sends = relayFor(url, data.token, data.via, data.viaToken) ?? own;
  return { own, sends, queue: data.ownQueue, here: { relay: url, relayKey: '' }, keyAsked: !canRelaySeal() };
}

// One look at the queue: what waits to be sent first, then up to BATCH messages, then the
// receipts. Says whether anything the home screen shows changed.
async function lookOnce(state: { place: Place | null; seen: number; receipts: Receipts }, stop: () => boolean): Promise<boolean> {
  if (!hasCore()) return false;
  if (state.seen !== released) {
    state.place = await placeNow();
    state.seen = released;
  }
  const place = state.place;
  if (!place) return false;
  const chats = await spaceChats();
  // Contacts on other relays reach us through our relay's key, said with every message.
  if (!place.keyAsked) {
    const key = await relayKey(place.own);
    place.here = { ...place.here, relayKey: key ? toBase64Url(key) : '' };
    place.keyAsked = true;
  }
  await sendPending(chats, place.sends);
  let changed = false;
  const recipient = fromHex(place.queue.recipientHex);
  try {
    for (let i = 0; i < BATCH && !stop(); i++) {
      const bytes = await receiveMessage(place.own, recipient);
      if (!bytes) break;
      // Taken from the relay, so kept whatever happens meanwhile.
      try {
        changed = (await keep(chats, await chats.e2e.receive(bytes), state.receipts)) || changed;
      } catch {
        // This one is lost, as in the chat; the next ones still come.
      }
    }
  } catch (error) {
    if (!isQueueNotFound(error)) throw error;
    // The relay no longer has our queue: a new one, which contacts learn from our next message.
    const ids = await createQueue(place.own);
    const queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    await updateCurrentSpaceData({ ownQueue: queue });
    state.place = { ...place, queue };
    return changed;
  }
  await sendReceipts(chats, place, state.receipts);
  return changed;
}

// Keeps what one message brought, as the chat's own handling does. Says whether anything changed.
async function keep({ e2e, history, voiceParts }: SpaceChats, received: Received, receipts: Receipts): Promise<boolean> {
  if (received.kind === 'refused') return false;
  const peer = `${CONTACT_PREFIX}${received.identity}`;
  const { tag, timer } = received;
  const at = Date.now();
  let changed = received.added || received.timerChanged;
  const add = async (message: Partial<Message>) => {
    await history.add({ peer, text: '', mine: false, at, tag: tag || newTag(), lasts: timer, ...message });
    // A message request hears nothing back, not even that its message came, until accepted.
    if (tag && !received.request) receipts[peer] = [...(receipts[peer] ?? []), tag];
    changed = true;
  };
  if (received.voice) {
    const whole = voiceParts.add(peer, received.voice);
    if (whole) await add({ voice: await saveClip(whole.audio, whole.ms) });
  }
  if (received.file) await add({ file: offerRef(received.file) });
  if (received.text) await add({ text: received.text });
  if (received.got.length > 0 && (await history.mark(peer, true, 1, at, received.got)).length > 0) changed = true;
  if (received.read.length > 0 && (await history.mark(peer, true, 2, at, received.read)).length > 0) changed = true;
  if (received.erase && 'all' in received.erase) {
    await history.clear(peer);
    changed = true;
  } else if (received.erase) {
    await history.remove(peer, received.erase.tag);
    changed = true;
  }
  return changed;
}

// Seals word for a contact and hands it to the relay, after the first packet of the conversation
// if the relay has not taken that yet.
async function tell({ e2e }: SpaceChats, place: Place, identity: string, extra: Extra) {
  const sealed = await e2e.seal(identity, '', place.queue.senderHex, { ...extra, at: place.here });
  const to = contactTarget(place.sends, sealed);
  if (sealed.first) {
    await sendMessage(to, fromHex(sealed.sender), sealed.first);
    await e2e.firstSent(identity);
  }
  await sendMessage(to, fromHex(sealed.sender), sealed.packet);
}

// Tells contacts' phones which of their messages came. What the relay cannot take now is told
// with the next look.
async function sendReceipts(chats: SpaceChats, place: Place, receipts: Receipts) {
  for (const [peer, got] of Object.entries(receipts)) {
    delete receipts[peer];
    const identity = peer.slice(CONTACT_PREFIX.length);
    // A contact deleted meanwhile is told nothing.
    if (!chats.e2e.contacts().some((contact) => contact.identity === identity)) continue;
    try {
      await tell(chats, place, identity, { got });
    } catch {
      receipts[peer] = [...got, ...(receipts[peer] ?? [])];
    }
  }
}

// The first packets of conversations started here that the relay has not taken yet.
async function sendPending({ e2e }: SpaceChats, sends: Relay) {
  for (const { identity, sender, relay, relayKey: key, first } of e2e.pending()) {
    try {
      await sendMessage(contactTarget(sends, { relay, relayKey: key }), fromHex(sender), first);
      await e2e.firstSent(identity);
    } catch {
      // Tried again with the next look.
    }
  }
}
