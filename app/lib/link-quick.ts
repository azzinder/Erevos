// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { cleanDeviceName } from './link-code';

// The short code a new computer shows at once to be linked to the phone (app/devices.tsx), before
// it has a relay of its own: a link the phone's camera opens Erevos with,
//   erevos://link?n=<Nostr key, 64 hex>&s=<secret, 32 hex>&name=<name>
// `n` is the public key of a Nostr key the computer made for this link alone, which it reads for on
// QUICK_RELAYS; `s` a secret of 16 random bytes that every message between the two carries, so only
// whoever read the code can answer. Nothing of the account is in it. About 140 characters, so a QR
// code any camera reads, where the full code (lib/link-code.ts) is some 2000.
//
// Then, in Nostr wraps (lib/link-nostr.ts), JSON:
//   phone → computer  {v:1, t:'grant', s, relay, rk?, code?, to}: the phone's relay, an invite to it
//                      for the computer's own token when the relay needs one (lib/relay-invite.ts),
//                      or, where the phone cannot invite, the relay's token for all that was typed
//                      in it (`tk`, never a token of the phone's own), and the key the phone reads its answer on (`to`, made for this link alone);
//   computer → phone  {v:1, t:'offer', s, link}: the computer's full code, as Link to my phone shows it;
//   phone → computer  {v:1, t:'linked', s, code}: the code to compare, which the computer compares by
//                      itself and takes, so nothing has to be compared by eye.
// Self-contained on purpose, so it can run under plain Node for checks.

export type QuickCode = { nostr: string; secret: string; name: string };

export type QuickGrant = { t: 'grant'; s: string; relay: string; rk?: string; code?: string; tk?: string; to: string };
export type QuickOffer = { t: 'offer'; s: string; link: string };
export type QuickLinked = { t: 'linked'; s: string; code: string };
export type QuickMessage = QuickGrant | QuickOffer | QuickLinked;

/** The Nostr relays both read and write on for a link: the ones Erevos's Nostr chats start with. */
export const QUICK_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];

/** How long a short code is good for, as the full one (lib/devices.ts OFFER_LASTS). */
export const QUICK_LASTS = 30 * 60_000;

const LINK = 'erevos://link?';
const HEX64 = /^[0-9a-f]{64}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const RELAY = /^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i;
// The most characters of what comes in a wrap: a full code is about 2000.
const MOST = 8192;

export function quickLink({ nostr, secret, name }: QuickCode): string {
  return `${LINK}n=${nostr}&s=${secret}&name=${encodeURIComponent(name)}`;
}

/** Checks the parts of a short code: null when one is missing or is not what it should be. */
export function checkQuick(nostr: unknown, secret: unknown, name: unknown): QuickCode | null {
  if (typeof nostr !== 'string' || typeof secret !== 'string') return null;
  const n = nostr.trim().toLowerCase();
  const s = secret.trim().toLowerCase();
  if (!HEX64.test(n) || !HEX32.test(s)) return null;
  return { nostr: n, secret: s, name: cleanDeviceName(typeof name === 'string' ? name : '') };
}

/** Reads a short code. Null if the text is not one (a full code is not). */
export function parseQuick(text: string): QuickCode | null {
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
  if (fields.key !== undefined) return null;
  return checkQuick(fields.n, fields.s, fields.name ?? '');
}

/** What goes in a wrap. */
export function quickText(message: QuickMessage): string {
  return JSON.stringify({ v: 1, ...message });
}

/** What came in a wrap, when it is one of these with `secret`: null for anything else. */
export function readQuick(text: string, secret: string): QuickMessage | null {
  if (text.length > MOST) return null;
  let said: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    said = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  if (said.v !== 1 || said.s !== secret) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  if (said.t === 'grant') {
    const relay = str(said.relay)?.trim() ?? '';
    const to = str(said.to) ?? '';
    const rk = str(said.rk) ?? '';
    const code = str(said.code) ?? '';
    if (!RELAY.test(relay) || !HEX64.test(to)) return null;
    if (rk && !/^[A-Za-z0-9_-]{43}$/.test(rk)) return null;
    const tk = str(said.tk) ?? '';
    if (code && !HEX64.test(code)) return null;
    if (tk && !/^[\x21-\x7e]{1,256}$/.test(tk)) return null;
    return { t: 'grant', s: secret, relay, to, ...(rk ? { rk } : {}), ...(code ? { code } : tk ? { tk } : {}) };
  }
  if (said.t === 'offer') {
    const link = str(said.link) ?? '';
    return link.toLowerCase().startsWith(LINK) ? { t: 'offer', s: secret, link } : null;
  }
  if (said.t === 'linked') {
    const code = str(said.code) ?? '';
    return /^[0-9 ]{1,40}$/.test(code) ? { t: 'linked', s: secret, code } : null;
  }
  return null;
}
