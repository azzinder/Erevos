// Contact codes: what a phone shows, as a QR code, so another phone can write to it through
// the relay. The code is a link,
//   erevos://contact?id=<relay sender id>&relay=<relay address>&key=<public keys>&rk=<relay key>
// so the phone's own camera app can open Erevos with it. The keys are the chat's account bundle
// (lib/e2e.ts) in base64url, about 1800 characters, which end-to-end encryption starts from.
// `rk` is the relay's key for sealed sends (43 characters), so a phone on another relay can write
// to this queue through its own relay; codes from before it have none. The relay token is never
// part of it. Self-contained on purpose, so it can run under plain
// Node for checks.

export type ContactCode = { senderHex: string; relayUrl: string; key: string; relayKey?: string };

const LINK = 'erevos://contact?';
// A bundle is about 1800 characters. Anything far longer is not one.
const MAX_KEY = 4096;

export function contactLink({ senderHex, relayUrl, key, relayKey }: ContactCode): string {
  return `${LINK}id=${senderHex}&relay=${encodeURIComponent(relayUrl)}${key ? `&key=${key}` : ''}${relayKey ? `&rk=${relayKey}` : ''}`;
}

/** Checks the parts of a code. The relay and the key may be empty, when the code has none. */
export function checkContact(senderHex: unknown, relayUrl: unknown, key: unknown = '', relayKey: unknown = ''): ContactCode | null {
  if (typeof senderHex !== 'string' || typeof relayUrl !== 'string' || typeof key !== 'string') return null;
  if (typeof relayKey !== 'string' || (relayKey && !/^[A-Za-z0-9_-]{43}$/.test(relayKey))) return null;
  const id = senderHex.trim().toLowerCase();
  const relay = relayUrl.trim();
  const keys = key.trim();
  if (!/^[0-9a-f]{48}$/.test(id)) return null;
  if (relay && !/^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(relay)) return null;
  if (keys.length > MAX_KEY || !/^[A-Za-z0-9_-]*$/.test(keys)) return null;
  return relayKey ? { senderHex: id, relayUrl: relay, key: keys, relayKey } : { senderHex: id, relayUrl: relay, key: keys };
}

/** Reads a contact link, or a bare 48-character relay sender id. Null if the text is neither. */
export function parseContact(text: string): ContactCode | null {
  const clean = text.trim();
  if (!clean.toLowerCase().startsWith(LINK)) return checkContact(clean, '');
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
  return checkContact(fields.id, fields.relay ?? '', fields.key ?? '', fields.rk ?? '');
}

// Hands a contact from the screen a scanned link opens to the chat screen, which owns the
// contact list. Kept in memory only: the chat saves the contact once it has it.

type Listener = (code: ContactCode) => void;

let waiting: ContactCode | null = null;
let listener: Listener | null = null;

/** Gives a contact to the chat: now if the chat is open, otherwise when it next opens. */
export function offerContact(code: ContactCode): void {
  if (listener) listener(code);
  else waiting = code;
}

/** For the chat: receives offered contacts until unsubscribed, starting with one that waited. */
export function onContactOffered(next: Listener): () => void {
  listener = next;
  if (waiting) {
    const code = waiting;
    waiting = null;
    next(code);
  }
  return () => {
    if (listener === next) listener = null;
  };
}
