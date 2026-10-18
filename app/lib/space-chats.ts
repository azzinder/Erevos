import { History } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { canRelaySeal, relaySeal } from './core';
import { E2E, fromBase64Url } from './e2e';
import type { Carried } from './nearby';
import { fromHex, sameRelay, type Relay } from './relay';
import { VoiceAssembler } from './voice';

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

/** A relay to send to, with the second relay to go through when one is set. Null without an address. */
export function relayFor(url: string, token: string, via: string, viaToken: string): Relay | null {
  const address = url.trim();
  if (!address) return null;
  const second = via.trim();
  return {
    url: address,
    token: token.trim() || undefined,
    via: second && !sameRelay(second, address) ? { url: second, token: viaToken.trim() || undefined } : undefined,
  };
}

/** Where to send to a contact: our own relay when they use it too, otherwise their relay,
 *  reached through ours (or the second relay) so their relay never sees this phone's address. */
export function contactTarget(own: Relay, where: { relay: string; relayKey: string }): Relay {
  if (!where.relay || sameRelay(where.relay, own.url)) return own;
  if (!where.relayKey) throw new Error(`That contact uses the relay at ${where.relay}, and its link has no key for it. Ask them for a new link.`);
  return { url: where.relay, key: fromBase64Url(where.relayKey), via: own.via ?? { url: own.url, token: own.token } };
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
