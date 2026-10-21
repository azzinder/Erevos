import { History } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { canRelaySeal, relaySeal } from './core';
import { randomBytes } from './crypto';
import { E2E, fromBase64Url } from './e2e';
import type { Carried } from './nearby';
import type { Spare } from '../lock/e2e-data';
import { fromHex, sameRelay, sendMessage, type Fallback, type Mark, type Relay } from './relay';
import { VoiceAssembler } from './voice';
import { t } from './i18n';

// The open space's chats through the relay, opened once while the space is: its account and
// contacts (lib/e2e.ts), the messages it keeps (lock/history.ts), and the voice messages still
// coming in parts. The chat screen, the home screen and the receiver (lib/receiver.ts) use the
// same ones: two copies of a conversation's keys would each move on without the other, and what
// one sealed the contact could no longer open. Hidden chats are not here: the chat screen opens
// them itself, only while they are open.

export type SpaceChats = { e2e: E2E; history: History; voiceParts: VoiceAssembler };

let opened: { of: object; chats: Promise<SpaceChats> } | null = null;
// What joins the space's chats as they open, before anything uses them: the links to the account's
// other devices (lib/devices.ts), which registers itself here so this file need not know it.
const joiners: ((chats: SpaceChats, space: number, key: Uint8Array) => Promise<void>)[] = [];

/** Has `join` called each time the space's chats open, before they are handed out. */
export function joinSpaceChats(join: (chats: SpaceChats, space: number, key: Uint8Array) => Promise<void>): void {
  joiners.push(join);
}

/** The open space's chats, opened the first time they are asked for. */
export function spaceChats(): Promise<SpaceChats> {
  const current = currentSpace();
  if (opened?.of !== current) {
    const chats = (async () => {
      const history = await History.open('space', current.space, current.key);
      const e2e = await E2E.open('space', current.space, current.key);
      const chats = { e2e, history, voiceParts: new VoiceAssembler() };
      // The chats still open without what could not join them.
      for (const join of joiners) await join(chats, current.space, current.key).catch(() => undefined);
      return chats;
    })();
    opened = { of: current, chats };
    // Tried again the next time they are asked for.
    chats.catch(() => {
      if (opened?.chats === chats) opened = null;
    });
  }
  return opened.chats;
}

/** Lets go of the space's chats when it closes, so nothing of it stays in memory. */
export function forgetSpaceChats(): void {
  opened = null;
}

/** A relay to send to, with the second relay to go through when one is set, and the space's
 *  backup relay (lib/spare.ts) for when it cannot be reached. Null without an address. */
export function relayFor(url: string, token: string, via: string, viaToken: string, backup?: { url: string; token?: string }): Relay | null {
  const address = url.trim();
  if (!address) return null;
  const second = via.trim();
  const through = second && !sameRelay(second, address) ? { url: second, token: viaToken.trim() || undefined } : undefined;
  const spare = backup?.url.trim();
  return {
    url: address,
    token: token.trim() || undefined,
    via: through,
    backup: spare && !sameRelay(spare, address) ? { url: spare, token: backup?.token?.trim() || undefined, via: through } : undefined,
  };
}

// A contact's queue on `where.relay` (ours, `hop`, when it says none), reached from `hop`: straight
// when it is the same relay, otherwise sealed for theirs and handed to ours (or the second relay).
function reach(hop: Relay, where: { relay: string; relayKey: string }, home: string): Relay {
  const relay = where.relay || home;
  if (sameRelay(relay, hop.url)) return { url: hop.url, token: hop.token, via: hop.via };
  // Our own relay, through the backup: its key is the one it gave this run.
  if (sameRelay(relay, home) && !where.relayKey) return { url: relay, via: hop.via ?? { url: hop.url, token: hop.token } };
  if (!where.relayKey) throw new Error(t('That contact uses the relay at {relay}, and its link has no key for it. Ask them for a new link.', { relay }));
  return { url: relay, key: fromBase64Url(where.relayKey), via: hop.via ?? { url: hop.url, token: hop.token } };
}

/**
 * Where to send to a contact: our own relay when they use it too, otherwise their relay, reached
 * through ours (or the second relay) so their relay never sees this phone's address. When that
 * cannot take it, their backup queue, and then the same through our backup relay, if there are.
 */
export function contactTarget(own: Relay, where: { relay: string; relayKey: string; spare?: Spare | null }): Relay {
  const routes: { make: () => Relay; sender?: string }[] = [{ make: () => reach(own, where, own.url) }];
  const spare = where.spare;
  if (spare) routes.push({ make: () => reach(own, spare, own.url), sender: spare.sender });
  if (own.backup) {
    const backup = own.backup;
    routes.push({ make: () => reach(backup, where, own.url) });
    if (spare) routes.push({ make: () => reach(backup, spare, own.url), sender: spare.sender });
  }
  let first: { relay: Relay; sender?: string } | null = null;
  let failed: unknown = null;
  const fallback: Fallback[] = [];
  for (const route of routes) {
    let relay: Relay;
    try {
      relay = route.make();
    } catch (error) {
      failed ??= error;
      continue;
    }
    if (!first) first = { relay, sender: route.sender };
    else fallback.push({ relay, senderId: route.sender ? fromHex(route.sender) : undefined });
  }
  if (!first) throw failed;
  // The first route is the contact's main queue unless it could not be made.
  if (first.sender) throw failed;
  return fallback.length > 0 ? { ...first.relay, fallback } : first.relay;
}

/**
 * What a message sealed for a contact carries, as the relay is told (lib/relay.ts, Mark), by its
 * words and the call signal in it, if any: words someone reads are a message; a call's offer rings,
 * so it pushes, counted as a call and not a message; all else is word between phones.
 */
export function markOf(text: string, call?: { kind: string } | null): Mark {
  if (text) return 'message';
  return call?.kind === 'offer' ? 'ring' : 'quiet';
}

/**
 * When `identity` said it has a ring queue (lib/e2e.ts ringOf, lock/hidden-ring.ts) and `signal` is
 * a call offer, sends one ring to it: `length` random bytes, the size of the sealed offer, marked
 * `ring`. The bytes name nothing and are never opened — the contact's phone drops them when its
 * hidden chats open — but their arrival rings it while those chats are closed. The ring goes to the
 * contact's relay, reached through `own` (or its second relay) as a message does. Does nothing when
 * the signal is not an offer, or the contact said no ring queue. Rejects when the relay did not
 * take it; the caller lets that pass, as the offer itself still went to the message queue.
 */
export async function ringOffer(e2e: E2E, own: Relay, identity: string, signal: { kind: string } | null | undefined, length: number): Promise<void> {
  if (signal?.kind !== 'offer') return;
  const ring = e2e.ringOf(identity);
  if (!ring?.sender) return;
  const to = contactTarget(own, { relay: ring.relay, relayKey: ring.relayKey });
  await sendMessage(to, fromHex(ring.sender), randomBytes(length), 'ring');
}

// The chats that seal what they send a contact for the account's phone, as a linked device's do
// (lib/e2e.ts, Link), by the link that says so: their links tell this file as they open and close
// (lib/devices.ts), so it need not know them.
const links = new WeakMap<E2E, { readonly through: boolean }>();

/** From now on `link` says whether what `e2e` sends goes through the account's phone; with null, none does. */
export function linkChats(e2e: E2E, link: { readonly through: boolean } | null): void {
  if (link) links.set(e2e, link);
  else links.delete(e2e);
}

/**
 * How what `e2e` sends a contact goes to the relay: as `mark` says, but all quiet from a linked
 * device, as it goes to the account's own queue, on its phone, which says what it carries as it
 * passes it on to the contact.
 */
export function sentMark(e2e: E2E, mark: Mark): Mark {
  return links.get(e2e)?.through ? 'quiet' : mark;
}

/**
 * Hands a contact's packets to the relay in turn, to where `sealed` says (contactTarget, from
 * `own`), after the conversation's first packet if the relay has not taken that yet, then
 * `firstSent`. `mark` goes with the last packet only, and the ones before it, the first packet
 * too, are quiet: what comes in parts, as a voice message does, is one message.
 */
export async function sendSealed(
  own: Relay,
  sealed: { sender: string; relay: string; relayKey: string; spare?: Spare | null; first: Uint8Array | null },
  packets: Uint8Array[],
  mark: Mark,
  firstSent: () => Promise<void>,
): Promise<void> {
  const to = contactTarget(own, sealed);
  const sender = fromHex(sealed.sender);
  if (sealed.first) {
    await sendMessage(to, sender, sealed.first, 'quiet');
    await firstSent();
  }
  for (const [i, packet] of packets.entries()) await sendMessage(to, sender, packet, i === packets.length - 1 ? mark : 'quiet');
}

/**
 * A contact's packets sealed for their relay, for phones nearby to carry there (lib/nearby.ts):
 * the relay their messages say, or our own (`own`, with its key) when they say none. Empty when
 * that relay's key is not known, they have no relay queue, or the core cannot seal for a relay.
 * `mark` goes with the last, as sendSealed does, and the ones before are quiet: this phone says it
 * as it hands its own over.
 */
export async function carriedFor(
  contact: { sender: string; relay: string; relayKey: string },
  packets: Uint8Array[],
  own: { url: string; key: string },
  mark?: Mark,
): Promise<Carried[]> {
  const url = (contact.relay || own.url).trim();
  const key = contact.relayKey || (url && sameRelay(url, own.url) ? own.key : '');
  if (!contact.sender || !url || !key || !canRelaySeal()) return [];
  const relayKey = fromBase64Url(key);
  const sender = fromHex(contact.sender);
  return Promise.all(
    packets.map(async (packet, i) => ({ url, sealed: await relaySeal(relayKey, sender, packet), ...(mark ? { mark: i === packets.length - 1 ? mark : ('quiet' as const) } : {}) })),
  );
}
