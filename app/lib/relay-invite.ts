// Invites to a relay (crates/erevos-relay/src/invites.rs): what a phone with a token of its own
// shows, as a QR code, for one more phone to use its relay with a token of that phone's own. The
// code is a link,
//   erevos://relay-invite?relay=<relay address>&code=<64 hex characters>
// so the phone's own camera app can open Erevos with it (app/relay-invite.tsx). The code is the
// invite's secret, good for one phone for 7 days; the relay keeps only its SHA-256. The phone that
// takes it makes a token for itself (lib/relay.ts, redeemInvite), so no token is ever in the link.
// The relay is a wss:// address, or a ws:// one on this computer or a private network only (a relay
// at home), so an invite cannot send the phone's requests in the clear across the internet.
// Self-contained on purpose (but for lib/relay-host), so it can run under plain Node for checks.

import { hostOf, isPrivate } from './relay-host';

export type Invite = { relayUrl: string; code: string };

const LINK = 'erevos://relay-invite?';
const RELAY = /^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i;

export function inviteLink({ relayUrl, code }: Invite): string {
  return `${LINK}relay=${encodeURIComponent(relayUrl.trim())}&code=${code}`;
}

/** Checks the parts of an invite: null when they are not one. */
export function checkInvite(relayUrl: unknown, code: unknown): Invite | null {
  if (typeof relayUrl !== 'string' || typeof code !== 'string') return null;
  const relay = relayUrl.trim();
  const secret = code.trim().toLowerCase();
  if (!RELAY.test(relay) || !/^[0-9a-f]{64}$/.test(secret)) return null;
  if (/^ws:/i.test(relay) && !isPrivate(hostOf(relay))) return null;
  return { relayUrl: relay, code: secret };
}

/** Reads an invite link. Null if the text is not one. */
export function parseInvite(text: string): Invite | null {
  const clean = text.trim();
  if (!clean.toLowerCase().startsWith(LINK)) return null;
  const fields: Record<string, string> = {};
  for (const pair of clean.slice(LINK.length).split('&')) {
    const at = pair.indexOf('=');
    if (at < 0) continue;
    try {
      fields[pair.slice(0, at)] = decodeURIComponent(pair.slice(at + 1).replace(/\+/g, ' '));
    } catch {
      return null;
    }
  }
  return checkInvite(fields.relay, fields.code);
}

// Hands an invite from the screen a scanned link opens (app/relay-invite.tsx) to the chat of the
// space it was opened in, which owns the relay settings. Kept in memory only, and taken by that
// space's chat only, so it never goes to another space.

type Listener = (invite: Invite) => void;

let waiting: { invite: Invite; space: number } | null = null;
let listener: { space: number; next: Listener } | null = null;

/** Gives an invite to the chat of `space`: now if it is open, otherwise when it next opens. */
export function offerInvite(invite: Invite, space: number): void {
  if (listener?.space === space) listener.next(invite);
  else waiting = { invite, space };
}

/** For the chat of `space`: receives offered invites until unsubscribed, starting with one that
 *  waited for it. */
export function onInviteOffered(space: number, next: Listener): () => void {
  const mine = { space, next };
  listener = mine;
  if (waiting) {
    const { invite, space: wanted } = waiting;
    waiting = null;
    if (wanted === space) next(invite);
  }
  return () => {
    if (listener === mine) listener = null;
  };
}
