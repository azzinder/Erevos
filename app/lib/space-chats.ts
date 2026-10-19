import { History } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { canRelaySeal, relaySeal } from './core';
import { E2E, fromBase64Url } from './e2e';
import type { Carried } from './nearby';
import type { Spare } from '../lock/e2e-data';
import { fromHex, sameRelay, type Fallback, type Relay } from './relay';
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

/** The open space's chats, opened the first time they are asked for. */
export function spaceChats(): Promise<SpaceChats> {
  const current = currentSpace();
  if (opened?.of !== current) {
    const chats = (async () => {
      const history = await History.open('space', current.space, current.key);
      const e2e = await E2E.open('space', current.space, current.key);
      return { e2e, history, voiceParts: new VoiceAssembler() };
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
 * A contact's packets sealed for their relay, for phones nearby to carry there (lib/nearby.ts):
 * the relay their messages say, or our own (`own`, with its key) when they say none. Empty when
 * that relay's key is not known, they have no relay queue, or the core cannot seal for a relay.
 */
export async function carriedFor(
  contact: { sender: string; relay: string; relayKey: string },
  packets: Uint8Array[],
  own: { url: string; key: string },
): Promise<Carried[]> {
  const url = (contact.relay || own.url).trim();
  const key = contact.relayKey || (url && sameRelay(url, own.url) ? own.key : '');
  if (!contact.sender || !url || !key || !canRelaySeal()) return [];
  const relayKey = fromBase64Url(key);
  const sender = fromHex(contact.sender);
  return Promise.all(packets.map(async (packet) => ({ url, sealed: await relaySeal(relayKey, sender, packet) })));
}
