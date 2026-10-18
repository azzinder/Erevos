import { newTag, type Message } from '../lock/history';
import { loadCurrentSpaceData, updateCurrentSpaceData, type Queue } from '../lock/space-data';
import { saveClip } from '../lock/voice-clips';
import { offerRef } from './attachments';
import { canRelaySeal, hasCore } from './core';
import { ONLINE, toBase64Url, type Extra, type Received, type Where } from './e2e';
import { nearby } from './nearby';
import { carryTo, createQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, sendMessage, toHex, type Relay } from './relay';
import { answerInvites, linkInviter, refreshSmsLink, takeInviteAnswer } from './sms-relay';
import { isGroupPacket } from './groups';
import { contactTarget, relayFor, spaceChats, type SpaceChats } from './space-chats';
import { lookAtSpare, spareBackup } from './spare';
import { flushGroups, takeGroupPacket, takeGroupSignal } from './space-groups';

// Messages that come while a space is open, whatever screen shows. The chat screen takes them
// itself while it is open, and holds this meanwhile (holdReceiver). Otherwise this looks at the
// space's relay queue every few seconds, keeps what came in the space's history as the chat
// would, tells the contacts' phones that it came, and tells the home screen (onReceived). What
// only the chat says, such as that a contact set a timer, is not said. A photo or file is taken
// from the relay once its chat opens. A contact whose chat appears offline is told nothing: what
// came waits with the contact (E2E.hold). Otherwise, while the app shows, what is told says the
// phone is open, and so does an answer to a contact who asks. Hidden chats are not looked at: their key is in memory only
// while they are open. What this phone carries from phones nearby goes to its relays meanwhile.

const EVERY = 3000;
// Messages taken in one look, at most.
const BATCH = 50;
const CONTACT_PREFIX = 'contact:';

type Receipts = Record<string, string[]>;
type State = { place: Place | null; seen: number; receipts: Receipts; answers: Set<string> };

// Where this space's messages come and go: our relay, the relay that sends (through the second
// one when set), our queue, and where contacts reach us, said in every message.
type Place = { own: Relay; sends: Relay; queue: Queue; here: Where; keyAsked: boolean };

let holds = 0;
// Bumped each time a hold ends: the chat may have changed the relay or the queue meanwhile.
let released = 0;
let look: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
// Whether the app shows on the screen: only then is a contact told this phone is open.
let shows = true;

/** Says whether the app shows on the screen (AppState 'active'). */
export function setAppShown(shown: boolean): void {
  shows = shown;
}

/** Whether the app shows on the screen, as last said. */
export function appShown(): boolean {
  return shows;
}

/** Whether to answer a contact who asks if this phone is open: the app shows, and it was not just said. */
export function answersAsk(toldAt: number, now = Date.now()): boolean {
  return shows && now - toldAt > (ONLINE * 1000) / 2;
}
const messageListeners = new Set<(received: Extract<Received, { kind: 'message' }>) => void>();
// How long to wait before the next look, asked each time.
let pace = () => EVERY;

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

/** Tells the screens that listen (onReceived) that the space's chats changed, as when a call left its line. */
export function announceReceived(): void {
  listeners.forEach((listener) => listener());
}

/** Calls `listener` with each message the receiver opens, after it is kept; not those the chat screen opens itself. */
export function onMessage(listener: (received: Extract<Received, { kind: 'message' }>) => void): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

/** Sets how long the receiver waits between looks, milliseconds, asked before each: shorter while something waits for an answer. */
export function setReceiverPace(next: () => number): void {
  pace = next;
}

/** Looks at the open space's relay queue every few seconds (or every `every` milliseconds) until the function it gives is called. */
export function startReceiver(every?: number): () => void {
  const state: State = { place: null, seen: -1, receipts: {}, answers: new Set() };
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const next = () => {
    if (!stopped) timer = setTimeout(tick, every ?? pace());
  };
  const tick = () => {
    if (stopped) return;
    if (holds > 0) return next();
    look = lookOnce(state, () => stopped || holds > 0)
      .then((changed) => {
        if (changed && !stopped) listeners.forEach((listener) => listener());
      })
      .catch(() => {
        // The relay could not be reached: tried again with the next look.
      })
      .finally(next);
  };
  next();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
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
async function lookOnce(state: State, stop: () => boolean): Promise<boolean> {
  if (!hasCore()) return false;
  if (state.seen !== released) {
    state.place = await placeNow();
    state.seen = released;
  }
  let place = state.place;
  if (!place) return false;
  const chats = await spaceChats();
  // Sends go through the space's backup relay when ours cannot be reached, once it is ready.
  const backup = spareBackup();
  if (backup && !place.sends.backup) {
    place = { ...place, sends: { ...place.sends, backup: { ...backup, via: place.sends.via } } };
    state.place = place;
  }
  // Contacts on other relays reach us through our relay's key, said with every message. Asked
  // again with the next look when the relay cannot be reached.
  if (!place.keyAsked) {
    const key = await relayKey(place.own).catch(() => undefined);
    if (key !== undefined) {
      place.here = { ...place.here, relayKey: key ? toBase64Url(key) : '' };
      place.keyAsked = true;
    }
  }
  await sendPending(chats, place.sends);
  // What this phone carries for its relays, from phones nearby or its own (lib/nearby.ts).
  void nearby.uploadCarried((url, sealed) => carryTo(place.sends, url, sealed)).catch(() => undefined);
  // An SMS invite sent from the SMS screen since: its answer may be on its way.
  await refreshSmsLink().catch(() => undefined);
  let changed = false;
  const here = place;
  // One message from our queue, or from the backup queue.
  const take = async (bytes: Uint8Array) => {
    // A group's message (lib/groups.ts): the group screens hear of it themselves.
    if (isGroupPacket(bytes)) {
      await takeGroupPacket(bytes).catch(() => undefined);
      return;
    }
    // Taken from the relay, so kept whatever happens meanwhile.
    try {
      // An answer to an SMS invite sent from here: a new contact, linked to the number.
      if (await takeInviteAnswer(chats.e2e, bytes, here.queue.senderHex, here.here).catch(() => null)) {
        changed = true;
        return;
      }
      let received = await chats.e2e.receive(bytes);
      // Someone whose SMS invite was answered here: no message request.
      if (received.kind === 'message' && received.added && (await linkInviter(chats.e2e, received.identity).catch(() => null))) {
        received = { ...received, request: false };
      }
      changed = (await keep(chats, received, state)) || changed;
      if (received.kind === 'message') messageListeners.forEach((listener) => listener(received));
      if (received.kind === 'message' && received.group) await takeGroupSignal(received.identity, received.group, received.request).catch(() => undefined);
    } catch {
      // This one is lost, as in the chat; the next ones still come.
    }
  };
  const recipient = fromHex(place.queue.recipientHex);
  let failed: unknown = null;
  try {
    for (let i = 0; i < BATCH && !stop(); i++) {
      const bytes = await receiveMessage(place.own, recipient);
      if (!bytes) break;
      await take(bytes);
    }
  } catch (error) {
    failed = error;
  }
  // What came to the backup queue, whether or not our relay answered.
  await lookAtSpare(chats.e2e, take, stop).catch(() => undefined);
  // Our relay could not be reached: tried again with the next look. What came to the backup
  // queue still goes on, and so do the receipts, through the backup relay.
  if (failed && isQueueNotFound(failed)) {
    // The relay no longer has our queue: a new one, which contacts learn from our next message.
    const ids = await createQueue(place.own);
    const queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    await updateCurrentSpaceData({ ownQueue: queue });
    state.place = { ...place, queue };
    return changed;
  }
  await answerInvites(chats.e2e, place.queue.senderHex, place.here, place.sends).catch(() => undefined);
  await sendReceipts(chats, place, state);
  await flushGroups().catch(() => undefined);
  return changed;
}

// Keeps what one message brought, as the chat's own handling does. Says whether anything changed.
async function keep({ e2e, history, voiceParts }: SpaceChats, received: Received, { receipts, answers }: State): Promise<boolean> {
  if (received.kind === 'refused') return false;
  const peer = `${CONTACT_PREFIX}${received.identity}`;
  const { identity, tag, timer } = received;
  const at = Date.now();
  const hidden = e2e.contacts().some((contact) => contact.identity === identity && contact.hide);
  // Their phone says it is open: the home screen shows it.
  let changed = received.added || received.timerChanged || received.online > 0;
  const add = async (message: Partial<Message>) => {
    await history.add({ peer, text: '', mine: false, at, tag: tag || newTag(), lasts: timer, ...message });
    // A message request hears nothing back, not even that its message came, until accepted.
    if (tag && !received.request) {
      if (hidden) await e2e.hold(identity, 'got', [tag]);
      else receipts[peer] = [...(receipts[peer] ?? []), tag];
    }
    changed = true;
  };
  if (received.ask && !received.request && !hidden && answersAsk(e2e.toldAt(identity), at)) answers.add(peer);
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

// Tells contacts' phones which of their messages came, and, while the app shows, that this phone
// is open, as the ones who asked wait to hear. What the relay cannot take now is told with the
// next look.
async function sendReceipts(chats: SpaceChats, place: Place, { receipts, answers }: State) {
  for (const peer of new Set([...Object.keys(receipts), ...answers])) {
    const got = receipts[peer] ?? [];
    delete receipts[peer];
    answers.delete(peer);
    const identity = peer.slice(CONTACT_PREFIX.length);
    // A contact deleted meanwhile is told nothing.
    if (!chats.e2e.contacts().some((contact) => contact.identity === identity)) continue;
    try {
      await tell(chats, place, identity, { got, on: shows ? ONLINE : 0 });
    } catch {
      if (got.length > 0) receipts[peer] = [...got, ...(receipts[peer] ?? [])];
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
