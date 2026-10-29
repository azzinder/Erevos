import type { Spare, Undropped } from '../lock/e2e-data';
import type { History, Message } from '../lock/history';
import { loadClip } from '../lock/voice-clips';
import { refSource, uploadFile } from './attachments';
import { offerOnNostr } from './nostr-send-files';
import { contentOf, withoutPreview } from './chat-parts';
import type { E2E, Where } from './e2e';
import { nearby, NoWayError, TooLargeForLoraError } from './nearby';
import { canHoldAt, canTryLater, CannotHoldError, dropLater, fromHex, isQueueFull, RelayError, sameRelay, sendMessage, sendMessageLater, type HeldAt, type Mark, type Relay } from './relay';
import { nostrOnlyWay, orNostr, type ForNostr } from './nostr-chats';
import { nostrReady } from './nostr';
import { carriedFor, contactTarget, sendSealed, sentMark, type SpaceChats } from './space-chats';
import { t } from './i18n';

type Chats = Pick<SpaceChats, 'e2e' | 'history'>;

// Our messages that wait (lock/history.ts, marked WAITING): nothing could take them when they were
// sent, as the relay could not be reached and the contact's phone was not near, or LoRa was the
// only way and they are not text. They stay in the chat, marked, and go by themselves, oldest
// first and each contact's in order, once the relay or the contact's phone nearby can take them:
// with each look at the relay that answers (the chat screen's, or the receiver's beside the
// screens), and when a contact is heard nearby. A waiting text goes over LoRa too, once a radio
// is linked; one too much for LoRa with its link's preview goes there without the preview. Each
// keeps its tag, so it can still be deleted on both phones once it went.
//
// Each try seals the message anew, which moves the conversation on, and a contact's phone can skip
// only so many it never got. So a message is tried only when there is a way for it, and after a
// failed try it waits longer each time before the next.
//
// A message sent for later waits the same way, kept with the time it should go as its time, and
// holds back none of that contact's others meanwhile. With the first look at a relay that answers,
// it is sealed and handed to that relay to hold till its time (holdLater): from then on it waits
// there, not here, and goes then though this phone is off. It says when it should show, so their
// phone does not show it sooner. Only while no relay can hold it (none answers, or one from before
// relays held messages) does it wait here, to go with the first look once its time came.
//
// A held message goes to the queue the contact read on when it was held. Should their queue move
// before its time (lib/queue-move.ts), the next look holds it anew for where they read now and
// takes back the one held before (holdAgain), in hidden chats too. Deleting or blocking a contact
// takes back what is held for them (heldFor, dropHeld): what the relay cannot be asked to drop now
// is kept with their removal and asked again with each look. Both go by the messages kept, not by
// what a screen shows.
//
// Hidden chats go through the relay only (handOverHidden, SendPlace.hidden), never nearby or over
// LoRa, or, with no relay between the two, through Nostr when the contact reads there, as the
// space's chats do: what waits there goes with a look at their relay that answers, or with a look
// at Nostr, while they are open or, when they receive while closed, with the place's
// (lib/place-receiver.ts). But what the relay could not
// take for a contact's account as their queue is full goes to the endpoints of their account all
// the same, as from the space's chats: then it shows as sent, and is owed to their account (Owed),
// tried again in memory only while hidden chats stay open, each contact's in order and longer after
// each failed try, sealed anew with its tag each time, so it is the same message there and no
// endpoint of theirs is copied it again. Closed before it went, their phone never gets it.
//
// Whatever waits is something someone reads (a text, a voice message, a photo or file), so each
// goes to the relay as a message (lib/relay.ts, Mark), however many tries it took: sealed anew each
// time, it says so again. A message held for later says so when it goes. From a linked device what
// is sealed for the account's phone goes quiet, to it, and it says so as it passes it on
// (lib/space-chats.ts, sentMark); what the device writes to a contact itself says so to them.

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
 * answered just now. `hidden`: hidden chats', which go through the relay only.
 */
export type SendPlace = { sends: Relay | null; own: Relay | null; senderHex: string; here: Where; ownKey: string; relayUp: boolean; hidden?: boolean };

/**
 * A message that waited and went: its chat, its tag, how long it lasts once read (seconds), and,
 * sent for later, the relay that holds it till its time. `bare`: it went over LoRa without its
 * link's preview.
 */
export type Went = { peer: string; tag: string; lasts: number; held?: HeldAt; heldFor?: string; bare?: true };

// Failed tries so far, by tag, and when the next may be.
const tries = new Map<string, { count: number; next: number }>();
// What sendWaiting is doing for each chats' history: the space's, and each hidden place's that receives.
const sending = new WeakMap<object, Promise<Went[]>>();
// What holdAgain is doing for each chats' history.
const holding = new WeakMap<object, Promise<Went[]>>();

/**
 * Sends what waits in the space's chats that can go now, oldest first; a contact's next ones wait
 * while one of theirs cannot go. Marks each that went as the relay took it. Returns those.
 */
export function sendWaiting(chats: Chats, place: SendPlace, now = Date.now()): Promise<Went[]> {
  let run = sending.get(chats.history);
  if (!run) {
    run = sendAll(chats, place, now).finally(() => sending.delete(chats.history));
    sending.set(chats.history, run);
  }
  return run;
}

async function sendAll({ e2e, history }: Chats, place: SendPlace, now: number): Promise<Went[]> {
  const went: Went[] = [];
  if (place.relayUp && place.sends) {
    went.push(...(await holdAgain({ e2e, history }, place, now)));
    await dropHeld(e2e, place.sends, now);
  }
  const stuck = new Set<string>();
  for (const message of history.waiting()) {
    const { peer, tag } = message;
    if (stuck.has(peer) || !peer.startsWith(CONTACT_PREFIX)) continue;
    const identity = peer.slice(CONTACT_PREFIX.length);
    const tried = tries.get(tag);
    if (message.at > now) {
      if ((tried && tried.next > now) || !place.relayUp || !place.sends) continue;
      try {
        const { lasts, held, heldFor } = await holdLater(e2e, place, identity, message);
        tries.delete(tag);
        if (await history.sent(peer, tag, lasts, { held, heldFor })) went.push({ peer, tag, lasts, held, heldFor });
      } catch {
        const count = (tried?.count ?? 0) + 1;
        tries.set(tag, { count, next: now + Math.min(LONGEST_WAIT, FIRST_WAIT * 2 ** (count - 1)) });
      }
      continue;
    }
    if ((tried && tried.next > now) || !canGo(e2e, place, identity, message)) {
      stuck.add(peer);
      continue;
    }
    try {
      const { lasts, bare } = await sendOne(e2e, place, identity, message);
      tries.delete(tag);
      if (await history.sent(peer, tag, lasts, { bare })) went.push({ peer, tag, lasts, ...(bare ? { bare: true as const } : {}) });
    } catch {
      const count = (tried?.count ?? 0) + 1;
      tries.set(tag, { count, next: now + Math.min(LONGEST_WAIT, FIRST_WAIT * 2 ** (count - 1)) });
      stuck.add(peer);
    }
  }
  return went;
}

/** When the next message sent for later and waiting here should go, or 0 if none waits for its time. */
export function nextDue(history: Pick<Chats['history'], 'waiting'>, now = Date.now()): number {
  return history.waiting().reduce((next, m) => (m.at > now && (next === 0 || m.at < next) ? m.at : next), 0);
}

/**
 * Seals a message sent for later, with when it should show, and hands it to the relay that would
 * take it now, to hold till its time (lib/relay.ts, sendMessageLater). A photo or file goes to our
 * relay first, kept there till a while after that time. The conversation's first packet, if the
 * relay has not taken it yet, goes now. Says how long it lasts once read, where it is held, and for
 * which of the contact's queues (their sender id), to hold it anew should they read elsewhere
 * before it goes. Throws when no relay answers or can hold it (CannotHoldError): it can wait here
 * instead.
 *
 * It does not say where we are (our queue, our relay): when it comes, that may have changed since,
 * and their phone goes on writing where we last said.
 */
export async function holdLater(e2e: E2E, place: SendPlace, identity: string, message: Message): Promise<{ lasts: number; held: HeldAt; heldFor: string }> {
  const queue = e2e.queueOf(identity);
  const sends = place.sends;
  if (!sends || !queue?.sender) throw new NoWayError();
  const to = contactTarget(sends, queue);
  if (!(await canHoldAt(to.via ?? to))) throw new CannotHoldError(t('the relay at {url} cannot keep messages for later: update it', { url: (to.via ?? to).url }));
  const options = { tag: message.tag, lasts: message.lasts ?? 0, due: message.at, re: message.re, forwarded: message.forwarded };
  let sealed: { sender: string; relay: string; relayKey: string; spare: Spare | null; first: Uint8Array | null; timer: number; copies: number; through: boolean };
  let packets: Uint8Array[];
  if (message.voice) {
    const audio = await loadClip(message.voice);
    if (!audio) throw new Error(t("This voice message's sound is gone."));
    const voice = await e2e.sealVoice(identity, audio, message.voice.ms, '', options);
    sealed = voice;
    packets = voice.packets;
  } else if (message.file) {
    if (!place.own) throw new NoWayError();
    const offer = await uploadFile(place.own, message.file, undefined, message.at);
    const file = await e2e.sealFile(identity, offer, '', options);
    sealed = file;
    packets = [file.packet];
  } else {
    const text = await e2e.seal(identity, message.text, '', { ...options, quiet: message.quiet, more: contentOf(message) });
    sealed = text;
    packets = [text.packet];
  }
  const target = contactTarget(sends, sealed);
  const held = await e2e.copiesAfter(
    sealed.copies,
    (async () => {
      if (sealed.first) {
        await sendMessage(target, fromHex(sealed.sender), sealed.first, 'quiet');
        await e2e.firstSent(identity);
      }
      return sendMessageLater(target, fromHex(sealed.sender), packets, message.at, sentMark(sealed, 'message'));
    })(),
    true,
  );
  return { lasts: sealed.timer, held, heldFor: queue.sender };
}

/**
 * Takes back a message sent for later from the relay that holds it, one of `sends` (ours, the
 * second relay, or the backup): true when it now never goes, false when it went already. Throws
 * when that relay cannot be reached, or is no longer set.
 */
export async function takeBack(sends: Relay | null, held: HeldAt): Promise<boolean> {
  const holder = holderOf(sends, held);
  if (!holder) throw new RelayError(t('The relay at {url} that keeps it is no longer set here.', { url: held.relay }));
  return dropLater({ url: holder.url, token: holder.token }, held.id);
}

// Which of `sends` holds a message held for later.
function holderOf(sends: Relay | null, held: HeldAt): Relay | undefined {
  return [sends, sends?.via, sends?.backup, sends?.backup?.via].find((relay): relay is Relay => !!relay && sameRelay(relay.url, held.relay));
}

/** What a relay holds for later for a contact (`identity`) that has not gone yet, by the messages kept: to drop when they are deleted or blocked (E2E.deleteContact). */
export function heldFor(history: Pick<History, 'heldLater'>, identity: string, now = Date.now()): Undropped[] {
  const peer = `${CONTACT_PREFIX}${identity}`;
  return history.heldLater(now).flatMap((m) => (m.peer === peer && m.held ? [{ id: m.held.id, relay: m.held.relay, at: m.at }] : []));
}

/**
 * Asks the relay that holds each of ours for later for those deleted or blocked here
 * (E2E.undropped), one of `sends`, to drop it. Each is forgotten once dropped or gone already, when
 * no relay set here holds it, or once its time is past; while the relay cannot be reached it is
 * asked again with the next look.
 */
export async function dropHeld(e2e: E2E, sends: Relay | null, now = Date.now()): Promise<void> {
  const done: string[] = [];
  for (const held of e2e.undropped()) {
    if (held.at <= now || !holderOf(sends, held)) {
      done.push(held.id);
      continue;
    }
    try {
      await takeBack(sends, held);
      done.push(held.id);
    } catch {
      // Asked again with the next look.
    }
  }
  if (done.length > 0) await e2e.dropped(done, now).catch(() => undefined);
}

/**
 * Ours a relay holds for later for a contact who reads elsewhere now, as their queue moved
 * (lib/queue-move.ts): each is held anew for where they read now, and the one held before is
 * taken back, so it does not go to a queue that may be gone by its time. Should that one go all
 * the same, their phone keeps the message once, by its tag. One held before the queue it was held
 * for was kept is let be. Returns those held anew; one that cannot be now is tried again with a
 * later look, longer after each failed try, as each try seals it anew. One already under way for
 * these chats is joined, not run again beside it, so no message is held anew twice. What the relay
 * cannot be asked to take back now, and what was held anew for a contact deleted meanwhile, is kept
 * to drop with a later look (dropHeld).
 */
export function holdAgain(chats: Chats, place: SendPlace, now = Date.now()): Promise<Went[]> {
  const under = holding.get(chats.history);
  if (under) return under;
  const run = holdAll(chats, place, now).finally(() => holding.delete(chats.history));
  holding.set(chats.history, run);
  return run;
}

async function holdAll({ e2e, history }: Chats, place: SendPlace, now: number): Promise<Went[]> {
  const again: Went[] = [];
  for (const message of history.heldLater(now)) {
    const { peer, tag, held, heldFor } = message;
    if (!held || !heldFor || !peer.startsWith(CONTACT_PREFIX)) continue;
    const identity = peer.slice(CONTACT_PREFIX.length);
    const sender = e2e.queueOf(identity)?.sender;
    if (!sender || sender === heldFor) continue;
    const tried = tries.get(tag);
    if (tried && tried.next > now) continue;
    let made: Awaited<ReturnType<typeof holdLater>>;
    try {
      made = await holdLater(e2e, place, identity, message);
    } catch {
      // Held where it was: tried again later.
      const count = (tried?.count ?? 0) + 1;
      tries.set(tag, { count, next: now + Math.min(LONGEST_WAIT, FIRST_WAIT * 2 ** (count - 1)) });
      continue;
    }
    tries.delete(tag);
    const ofIt = (h: HeldAt): Undropped => ({ id: h.id, relay: h.relay, at: message.at });
    // The message deleted meanwhile, or not kept so: the one just held goes no more either.
    if (!(await history.heldAgain(peer, tag, made.held, made.heldFor).catch(() => false))) {
      await letGo(e2e, place.sends, [ofIt(made.held)]);
      continue;
    }
    // The contact deleted or blocked meanwhile: neither goes.
    if (!e2e.record(identity)) {
      await letGo(e2e, place.sends, [ofIt(made.held), ofIt(held)]);
      continue;
    }
    await letGo(e2e, place.sends, [ofIt(held)]);
    again.push({ peer, tag, lasts: made.lasts, held: made.held, heldFor: made.heldFor });
  }
  return again;
}

// Takes back each of `held` from the relay of `sends` that holds it. One that relay cannot be asked
// now is kept to drop with a later look (dropHeld); one no relay set here holds is let go of.
async function letGo(e2e: E2E, sends: Relay | null, held: Undropped[]): Promise<void> {
  const left: Undropped[] = [];
  for (const h of held) {
    try {
      await takeBack(sends, h);
    } catch {
      if (holderOf(sends, h)) left.push(h);
    }
  }
  if (left.length > 0) await e2e.keepUndropped(left).catch(() => undefined);
}

/**
 * What a relay holds for later for a contact just deleted, blocked or removed here, as heldFor says,
 * once a holdAgain under way for these chats ended: what that held anew for them meanwhile is among
 * it. Those not among `kept` (kept with the removal already) are kept to drop too (dropHeld), before
 * their chat is cleared. Says those.
 */
export async function heldAfter({ e2e, history }: Chats, identity: string, kept: Undropped[], now = Date.now()): Promise<Undropped[]> {
  await holding.get(history)?.catch(() => undefined);
  const more = heldFor(history, identity, now).filter((h) => !kept.some((k) => k.id === h.id));
  if (more.length > 0) await e2e.keepUndropped(more);
  return more;
}

// Whether there is a way for it now, before sealing it: the relay answers and can reach their
// queue, their phone is near, or, for a text, a LoRa radio is linked. A photo or file goes to our
// relay first in any case.
function canGo(e2e: E2E, place: SendPlace, identity: string, message: Message): boolean {
  const queue = e2e.queueOf(identity);
  if (!queue) return false;
  // Photos, files and voice messages go through Nostr too, as the contact's phone puts them together.
  if (place.hidden) return (place.relayUp && (!message.file || !!place.own) && throughRelay(place, queue)) || throughNostr(e2e, place, identity, queue);
  if (message.file) return (!!place.own && place.relayUp && (nearby.isNear(identity) || throughRelay(place, queue))) || throughNostr(e2e, place, identity, queue);
  return nearby.isNear(identity) || (place.relayUp && throughRelay(place, queue)) || (!message.voice && nearby.hasSlow()) || throughNostr(e2e, place, identity, queue);
}

// Whether Nostr is the way to them now: no relay between the two, they read there, and Tor is ready (lib/nostr-chats.ts nostrOnlyWay).
function throughNostr(e2e: E2E, place: SendPlace, identity: string, queue: { sender: string }): boolean {
  return (!place.sends || !queue.sender || !place.senderHex) && nostrReady() && e2e.readsOnNostr(identity);
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
// A text only LoRa could take, but too much for it with its link's preview, is sealed again
// without the preview, for LoRa. Returns how long it lasts once read, and whether it went so (`bare`).
async function sendOne(e2e: E2E, place: SendPlace, identity: string, message: Message): Promise<{ lasts: number; bare: boolean }> {
  const options = { at: place.here, tag: message.tag, lasts: message.lasts ?? 0, re: message.re, forwarded: message.forwarded };
  let sealed: { sender: string; relay: string; relayKey: string; spare: Spare | null; first: Uint8Array | null; tag: string; timer: number; copies: number; through: boolean } & ForNostr;
  let packets: Uint8Array[];
  let worthCarrying = true;
  if (message.voice) {
    const audio = await loadClip(message.voice);
    if (!audio) throw new Error(t("This voice message's sound is gone."));
    const voice = await e2e.sealVoice(identity, audio, message.voice.ms, place.senderHex, options);
    sealed = voice;
    packets = voice.packets;
  } else if (message.file) {
    // On the relay again with each try; what a try left there that did not go expires there. With
    // no relay between the two: in Nostr wraps, or on a file server (lib/nostr-send-files.ts).
    const queue = e2e.queueOf(identity);
    const toNostr = !place.own || !queue?.sender || !place.senderHex || !place.sends ? e2e.nostrPlace(identity) : null;
    const offer = toNostr ? await offerOnNostr(refSource(message.file), message.file, toNostr) : await uploadFile(place.own!, message.file);
    const file = await e2e.sealFile(identity, offer, place.senderHex, options);
    sealed = file;
    packets = [file.packet];
    worthCarrying = false;
  } else {
    const text = await e2e.seal(identity, message.text, place.senderHex, { ...options, quiet: message.quiet, more: contentOf(message) });
    sealed = text;
    packets = [text.packet];
  }
  if (place.hidden) {
    await handOverHidden(e2e, place.sends, identity, { sealed, packets }, 'message', false);
    return { lasts: sealed.timer, bare: false };
  }
  const sends = place.sends;
  const relay =
    sends && sealed.sender
      ? orNostr(e2e, sends, identity, sealed, packets, () => sendSealed(sends, sealed, packets, sentMark(sealed, 'message'), () => e2e.firstSent(identity)))
      : nostrOnlyWay(e2e, identity, sealed, packets);
  const all = sealed.first ? [sealed.first, ...packets] : packets;
  const carry = worthCarrying ? () => carriedFor(sealed, all, { url: place.own?.url ?? '', key: place.ownKey }, sentMark(sealed, 'message')) : null;
  try {
    await e2e.copiesAfter(sealed.copies, nearby.deliver(identity, all, relay, carry, worthCarrying), true);
  } catch (error) {
    if (!(error instanceof TooLargeForLoraError) || !message.preview || message.voice || message.file) throw error;
    const bare = await e2e.seal(identity, message.text, place.senderHex, { ...options, quiet: message.quiet, more: withoutPreview(contentOf(message)) });
    const again = bare.first ? [bare.first, bare.packet] : [bare.packet];
    await e2e.copiesAfter(bare.copies, nearby.deliver(identity, again, null, () => carriedFor(bare, again, { url: place.own?.url ?? '', key: place.ownKey }, sentMark(bare, 'message')), true), true);
    return { lasts: bare.timer, bare: true };
  }
  return { lasts: sealed.timer, bare: false };
}

/**
 * In hidden chats, what the relay could not take for a contact's account as their queue is full, to
 * go again as it is, whose copies went to the endpoints of their account all the same: shown as
 * sent, and owed to their account (Owed). `reason`: what the relay said.
 */
export class OwedError extends Error {
  readonly reason: unknown;

  constructor(reason: unknown) {
    super(reason instanceof Error ? reason.message : String(reason));
    this.reason = reason;
  }
}

/** What hidden chats sealed for a contact, and its packets, in order. */
export type Resealed = { sealed: { sender: string; relay: string; relayKey: string; spare: Spare | null; first: Uint8Array | null; copies: number; through: boolean } & ForNostr; packets: Uint8Array[] };

/**
 * Hands what hidden chats sealed for a contact to the relay, through `target`, after the
 * conversation's first packet if the relay has not taken that yet, the last packet saying what they
 * carry (`mark`), and then the copies for the endpoints of their account (lib/e2e.ts copiesAfter);
 * with no relay between the two, to Nostr when they read there (lib/nostr-chats.ts nostrOnlyWay).
 * With `waits` (it is to go again as it is, with its tag), those go though the relay said their
 * queue is full, and when there were any, it throws OwedError. Otherwise it throws what failed: one
 * with the relay out of reach, say, is not sent, and copies nothing, as hidden chats keep nothing
 * waiting.
 */
export async function handOverHidden(e2e: E2E, target: Relay | null, identity: string, { sealed, packets }: Resealed, mark: Mark, waits: boolean): Promise<'relay' | 'nostr'> {
  if (!target || !sealed.sender) {
    const nostr = nostrOnlyWay(e2e, identity, sealed, packets);
    if (!nostr) throw new Error(t('Type the relay address in Relay first.'));
    return e2e.copiesAfter(sealed.copies, nostr(), waits && 'full');
  }
  try {
    const send = orNostr(e2e, target, identity, sealed, packets, () => sendSealed(target, sealed, packets, sentMark(sealed, mark), () => e2e.firstSent(identity)));
    await e2e.copiesAfter(sealed.copies, send(), waits && 'full');
  } catch (error) {
    throw waits && sealed.copies > 0 && isQueueFull(error) ? new OwedError(error) : error;
  }
  return 'relay';
}

/** What hidden chats owe contacts' accounts (OwedError), in memory only: tried again while they stay open. */
export class Owed {
  private items: { identity: string; tag: string; seal: () => Promise<Resealed>; count: number; next: number }[] = [];
  private trying: Promise<string[]> | null = null;

  /** Owes their account the message with `tag`, sealed again by `seal` for each try. */
  add(identity: string, tag: string, seal: () => Promise<Resealed>, now = Date.now()): void {
    this.items.push({ identity, tag, seal, count: 1, next: now + FIRST_WAIT });
  }

  /** The tags still owed, oldest first. */
  tags(): string[] {
    return this.items.map((item) => item.tag);
  }

  /** Owes their account no more of the contact's message with `tag`, or of any of theirs: deleted here, it never goes. */
  forget(identity: string, tag?: string): void {
    this.items = this.items.filter((item) => item.identity !== identity || (tag !== undefined && item.tag !== tag));
  }

  /**
   * Tries again what is owed and due, through `target`, each contact's in order; one that can no
   * longer go (their queue gone, the contact deleted) is let go of. Says the tags that went.
   */
  retry(e2e: E2E, target: Relay | null, now = Date.now()): Promise<string[]> {
    this.trying ??= this.tryAll(e2e, target, now).finally(() => {
      this.trying = null;
    });
    return this.trying;
  }

  private async tryAll(e2e: E2E, target: Relay | null, now: number): Promise<string[]> {
    const went: string[] = [];
    const stuck = new Set<string>();
    for (const item of [...this.items]) {
      if (stuck.has(item.identity)) continue;
      if (item.next > now) {
        stuck.add(item.identity);
        continue;
      }
      try {
        await handOverHidden(e2e, target, item.identity, await item.seal(), 'message', true);
        this.items = this.items.filter((i) => i !== item);
        went.push(item.tag);
      } catch (error) {
        if (error instanceof OwedError || canTryLater(error)) {
          item.count += 1;
          item.next = now + Math.min(LONGEST_WAIT, FIRST_WAIT * 2 ** (item.count - 1));
          stuck.add(item.identity);
        } else {
          this.items = this.items.filter((i) => i !== item);
        }
      }
    }
    return went;
  }
}
