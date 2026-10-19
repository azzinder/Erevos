import { newTag, type Message } from '../lock/history';
import { loadCurrentSpaceData, updateCurrentSpaceData, type Queue } from '../lock/space-data';
import { saveClip } from '../lock/voice-clips';
import { offerRef } from './attachments';
import { canRelaySeal, hasCore } from './core';
import { ONLINE, toBase64Url, type Extra, type Received, type Where } from './e2e';
import { nearby } from './nearby';
import {
  canWaitAt,
  carryTo,
  createQueue,
  fromHex,
  isQueueNotFound,
  receiveMessage,
  relayKey,
  sendMessage,
  toHex,
  waitForMessage,
  type Relay,
} from './relay';
import { answerInvites, linkInviter, refreshSmsLink, takeInviteAnswer } from './sms-relay';
import { isGroupPacket } from './groups';
import { showsAt } from './later';
import { contactTarget, relayFor, spaceChats, type SpaceChats } from './space-chats';
import { lookAtSpare, spareBackup } from './spare';
import { flushGroups, takeGroupPacket, takeGroupSignal } from './space-groups';
import { nextDue, sendWaiting, type SendPlace } from './waiting';
import { keepPush } from './web-push';

// Messages that come while a space is open, whatever screen shows. The chat screen takes them
// itself while it is open, and holds this meanwhile (holdReceiver). Otherwise this looks at the
// space's relay queue every few seconds, keeps what came in the space's history as the chat
// would, tells the contacts' phones that it came, and tells the home screen (onReceived). What
// only the chat says, such as that a contact set a timer, is not said. A photo or file is taken
// from the relay once its chat opens. A contact whose chat appears offline is told nothing: what
// came waits with the contact (E2E.hold). Otherwise, while the app shows, what is told says the
// phone is open, and so does an answer to a contact who asks. Hidden chats are not looked at: their key is in memory only
// while they are open. What this phone carries from phones nearby goes to its relays meanwhile.
//
// What comes from phones nearby (lib/nearby.ts, on the links lib/nearby-links.ts keeps up while
// the space is open) is opened here the same way, one packet at a time, unless the chat screen
// takes it itself (takeNearby). The marks go back to the contact's phone nearby when it is, as
// with no internet, and through the relay too.
//
// While Erevos is in the background (lib/background.ts) it does not ask every few seconds: it
// waits at the relay until something comes for the queue (waitForMessage), so the phone's radio
// rests in between, and what comes is still taken at once. At a relay that cannot wait, it asks
// every AWAY_EVERY; after a look that failed, it waits longer each time, AWAY_RETRY_MOST at most.

const EVERY = 3000;
// In the background: how long one wait at the relay lasts, seconds; how often a relay that cannot
// wait is asked; and the first and longest wait after a look that failed, milliseconds.
const WAIT_FOR = 45;
const AWAY_EVERY = 20_000;
const AWAY_RETRY = 5000;
const AWAY_RETRY_MOST = 120_000;
// Messages taken in one look, at most.
const BATCH = 50;
const CONTACT_PREFIX = 'contact:';

type Receipts = Record<string, string[]>;
type State = { place: Place | null; seen: number; receipts: Receipts; answers: Set<string>; waited: boolean; failures: number };

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
// The waits at the relay under way, ended when the app shows or the chat opens, and how to look
// again at once.
const waits = new Set<AbortController>();
let hurry: (() => void) | null = null;

/** Says whether the app shows on the screen (AppState 'active'). Shown again, it looks at once. */
export function setAppShown(shown: boolean): void {
  shows = shown;
  if (!shown) return;
  endWaits();
  hurry?.();
}

function endWaits() {
  waits.forEach((wait) => wait.abort());
  waits.clear();
}

// A look when the next message sent for later should go (lib/waiting.ts), the wait at the relay
// ended first, so it goes on time while Erevos runs.
let dueTimer: ReturnType<typeof setTimeout> | null = null;

function lookWhenDue(at: number) {
  if (dueTimer) clearTimeout(dueTimer);
  dueTimer = null;
  if (at <= 0) return;
  // Timers longer than about 24 days go off at once: one that far looks again then, and waits on.
  dueTimer = setTimeout(
    () => {
      dueTimer = null;
      endWaits();
      hurry?.();
    },
    Math.min(Math.max(0, at - Date.now()), 2 ** 31 - 1),
  );
}

/**
 * While Erevos is in the background, waits at the relay until something comes for the queue, or a
 * while: then a look takes it. Says whether it waited; false at once while the app shows, at a
 * relay that cannot wait, or once the wait was ended. Throws when the relay cannot be reached.
 */
export async function waitWhileAway(relay: Relay, recipient: Uint8Array): Promise<boolean> {
  if (shows || !canWaitAt(relay)) return false;
  const wait = new AbortController();
  waits.add(wait);
  try {
    await waitForMessage(relay, recipient, WAIT_FOR, wait.signal);
    return !wait.signal.aborted && canWaitAt(relay);
  } finally {
    waits.delete(wait);
  }
}

/** How long to wait before the next look while Erevos is in the background: after a wait at the relay, a look that did not wait, or `failures` that failed in a row. */
export function awayPace(waited: boolean, failures: number): number {
  if (failures > 0) return Math.min(AWAY_RETRY_MOST, AWAY_RETRY * 2 ** (failures - 1));
  return waited ? 500 : AWAY_EVERY;
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
// Where the last look found the space's relay and queue, once it knew the relay's key: what the
// marks for what came nearby say too.
let lastPlace: Place | null = null;
// The chat screen, while it takes what comes nearby itself, and what came nearby, one at a time.
type NearbyTaker = (link: string | null, packet: Uint8Array) => Promise<void>;
let nearbyTaker: NearbyTaker | null = null;
let nearbyTurn: Promise<unknown> = Promise.resolve();
const nearbyState: State = { place: null, seen: -1, receipts: {}, answers: new Set(), waited: false, failures: 0 };
// How long to wait before the next look, asked each time.
let pace = () => EVERY;

/**
 * Stops looking at the relay, once a look under way has ended, until the function it gives is
 * called. The chat screen holds it while it is open, and a backup being restored.
 */
export async function holdReceiver(): Promise<() => void> {
  holds++;
  endWaits();
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
  const state: State = { place: null, seen: -1, receipts: {}, answers: new Set(), waited: false, failures: 0 };
  lastPlace = null;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const next = () => {
    if (!stopped) timer = setTimeout(tick, every ?? (shows ? pace() : awayPace(state.waited, state.failures)));
  };
  const tick = () => {
    timer = null;
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
  const now = () => {
    if (stopped || !timer) return;
    clearTimeout(timer);
    timer = setTimeout(tick, 0);
  };
  hurry = now;
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (hurry === now) hurry = null;
    endWaits();
    lookWhenDue(0);
    lastPlace = null;
  };
}

/**
 * Opens a packet from a phone nearby, on `link`, or one kept for this space (null): in the chat
 * screen while it takes them, otherwise here, as one from the relay. One for none of the space's
 * chats is kept for the others.
 */
export function openNearby(link: string | null, packet: Uint8Array): Promise<void> {
  const next = nearbyTurn.catch(() => undefined).then(() => (nearbyTaker ? nearbyTaker(link, packet) : openHere(link, packet)));
  nearbyTurn = next;
  return next.catch(() => undefined);
}

/** Has the chat screen open what comes nearby itself (`taker`), until the function it gives is called. */
export function takeNearby(taker: NearbyTaker): () => void {
  nearbyTaker = taker;
  return () => {
    if (nearbyTaker === taker) nearbyTaker = null;
  };
}

async function openHere(link: string | null, packet: Uint8Array): Promise<void> {
  if (!hasCore()) {
    if (link) nearby.hold(packet);
    return;
  }
  // A group's message (lib/groups.ts), as on the same Wi-Fi with no internet.
  if (isGroupPacket(packet)) {
    const ours = await takeGroupPacket(packet).catch(() => false);
    if (!ours && link) nearby.hold(packet);
    else if (!link) nearby.dropHeld(packet);
    return;
  }
  const chats = await spaceChats();
  let received: Received;
  try {
    received = await chats.e2e.receive(packet);
  } catch {
    if (!link) nearby.dropHeld(packet);
    return;
  }
  if (received.kind === 'refused' && received.reason === 'unknown') {
    if (link) nearby.hold(packet);
    return;
  }
  if (!link) nearby.dropHeld(packet);
  if (received.kind === 'message' && link) nearby.heardOn(received.identity, link);
  const changed = await keep(chats, received, nearbyState);
  if (received.kind === 'message') {
    messageListeners.forEach((listener) => listener(received));
    if (received.group) await takeGroupSignal(received.identity, received.group, received.request).catch(() => undefined);
  }
  if (changed) listeners.forEach((listener) => listener());
  await sendReceipts(chats, lastPlace, nearbyState);
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
    if (state.place) void keepPush(state.place.own, state.place.queue);
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
  if (place.keyAsked) lastPlace = place;
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
  state.waited = false;
  try {
    if (!stop()) state.waited = await waitWhileAway(place.own, recipient);
    for (let i = 0; i < BATCH && !stop(); i++) {
      const bytes = await receiveMessage(place.own, recipient);
      if (!bytes) break;
      await take(bytes);
    }
  } catch (error) {
    failed = error;
  }
  state.failures = failed ? state.failures + 1 : 0;
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
    void keepPush(place.own, queue);
    if (state.place.keyAsked) lastPlace = state.place;
    return changed;
  }
  await answerInvites(chats.e2e, place.queue.senderHex, place.here, place.sends).catch(() => undefined);
  // What waited to go, now that the relay answers (lib/waiting.ts).
  if (!failed && (await sendWaiting(chats, sendPlace(place, true)).catch(() => [])).length > 0) changed = true;
  lookWhenDue(nextDue(chats.history));
  await sendReceipts(chats, place, state);
  await flushGroups().catch(() => undefined);
  return changed;
}

// Where what waits goes from, as the last look found it: with no relay, to phones nearby only.
function sendPlace(place: Place | null, relayUp: boolean): SendPlace {
  if (!place) return { sends: null, own: null, senderHex: '', here: { relay: '', relayKey: '' }, ownKey: '', relayUp: false };
  return { sends: place.sends, own: place.own, senderHex: place.queue.senderHex, here: place.here, ownKey: place.here.relayKey, relayUp };
}

/**
 * Sends what waits to contacts heard nearby, or over LoRa, as the links nearby change (lib/nearby-links.ts):
 * unless the chat screen is open, which does it itself.
 */
export function nearbyChanged(): void {
  if (nearbyTaker || !hasCore()) return;
  void spaceChats()
    .then((chats) => sendWaiting(chats, sendPlace(lastPlace, false)))
    .then((went) => {
      if (went.length > 0) listeners.forEach((listener) => listener());
    })
    .catch(() => undefined);
}

// Keeps what one message brought, as the chat's own handling does. Says whether anything changed.
async function keep({ e2e, history, voiceParts }: SpaceChats, received: Received, { receipts, answers }: State): Promise<boolean> {
  if (received.kind === 'refused') return false;
  const peer = `${CONTACT_PREFIX}${received.identity}`;
  const { identity, tag, timer } = received;
  const at = Date.now();
  // One sent for later that a relay sent too soon shows at its time (lib/later.ts).
  const shows = showsAt(received.due, at);
  const hidden = e2e.contacts().some((contact) => contact.identity === identity && contact.hide);
  // Their phone says it is open: the home screen shows it.
  let changed = received.added || received.timerChanged || received.online > 0;
  const add = async (message: Partial<Message>) => {
    await history.add({ peer, text: '', mine: false, at: shows, tag: tag || newTag(), lasts: timer, ...message });
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

// Seals word for a contact and hands it to their phone nearby when it is, and to the relay, after
// the first packet of the conversation if the relay has not taken that yet (lib/nearby.ts). With
// no `place`, it says nothing of where this phone's queue is, and goes nearby only.
async function tell({ e2e }: SpaceChats, place: Place | null, identity: string, extra: Extra) {
  const sealed = await e2e.seal(identity, '', place?.queue.senderHex ?? '', { ...extra, at: place?.here ?? { relay: '', relayKey: '' } });
  const relay =
    place && sealed.sender
      ? async () => {
          const to = contactTarget(place.sends, sealed);
          if (sealed.first) {
            await sendMessage(to, fromHex(sealed.sender), sealed.first);
            await e2e.firstSent(identity);
          }
          await sendMessage(to, fromHex(sealed.sender), sealed.packet);
        }
      : null;
  await nearby.deliver(identity, sealed.first ? [sealed.first, sealed.packet] : [sealed.packet], relay);
}

// Tells contacts' phones which of their messages came, and, while the app shows, that this phone
// is open, as the ones who asked wait to hear. What the relay cannot take now is told with the
// next look.
async function sendReceipts(chats: SpaceChats, place: Place | null, { receipts, answers }: State) {
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
