import { loadCurrentSpaceData, NO_OFFER, updateCurrentSpaceData, type Offered } from '../lock/space-data';
import type { Received } from './e2e';
import { isLentToken, sameRelay } from './relay';
import { checkInvite, type Invite } from './relay-invite';

// An invite to a contact's relay that came in their message (lib/chat-parts.ts `ri`). A phone with
// a relay of its own sends one by itself, once, to each contact with no queue of their own that it
// added or accepted, whatever way the two first met: a link or QR code through Nostr, or phones
// nearby over Bluetooth or Wi-Fi (app/chat.tsx offerRelays). It is one of that phone's invites
// there (lib/relay.ts makeInvite). A phone with no relay of its own, or only a place lent on one,
// takes it by itself, as a scanned invite, and its contacts are told where it reads then; one with
// a relay of its own leaves it. One from a message request waits until the request is accepted, so
// no one unknown chooses this phone's relay. What came while the chat was closed (lib/receiver.ts)
// waits in the space's settings (lock/space-data.ts `offered`) until it opens.

/** How long an offer is kept: as long as an invite is good (crates/erevos-relay/src/invites.rs). */
export const OFFER_LASTS = 7 * 24 * 3600_000;

/** The invite a message brings, and from whom; null when it brings none. */
export function offerOf(received: Received): (Invite & { from: string; request: boolean }) | null {
  if (received.kind !== 'message' || !received.more.ri) return null;
  const invite = checkInvite(received.more.ri.r, received.more.ri.c);
  return invite ? { ...invite, from: received.identity, request: received.request } : null;
}

/** Whether a space with this relay and token takes an invite to `url` by itself: it has no relay of its own, or only a place lent on one. */
export function takesOffer({ url, token }: { url: string; token: string }, to: string): boolean {
  const ours = url.trim();
  return !ours || isLentToken(token) || (sameRelay(ours, to) && !token.trim());
}

/** Keeps an offer for the chat to take when it opens, or once its sender is accepted; one the space would not take is not kept. */
export async function keepOffer(offer: Invite & { from: string }, now = Date.now()): Promise<void> {
  const data = await loadCurrentSpaceData();
  if (!takesOffer(data, offer.relayUrl)) return;
  await updateCurrentSpaceData({ offered: { relay: offer.relayUrl, code: offer.code, until: now + OFFER_LASTS, from: offer.from } });
}

/** The offer kept, while it is good: with whom it came, '' when not known. */
export function keptOffer(offered: Offered, now = Date.now()): (Invite & { from: string }) | null {
  if (offered.until <= now) return null;
  const invite = checkInvite(offered.relay, offered.code);
  return invite ? { ...invite, from: offered.from } : null;
}

/** Forgets the offer kept: taken, or of no use. */
export function forgetOffer(): Promise<void> {
  return updateCurrentSpaceData({ offered: NO_OFFER });
}
