// Contact codes: what a phone shows, as a QR code, so another phone can write to it through
// the relay. The code is a link,
//   erevos://contact?id=<relay sender id>&relay=<relay address>&key=<public keys>&rk=<relay key>
// so the phone's own camera app can open Erevos with it. The keys are the chat's account bundle
// (lib/e2e.ts) in base64url, about 1800 characters, which end-to-end encryption starts from.
// `rk` is the relay's key for sealed sends (43 characters), so a phone on another relay can write
// to this queue through its own relay; codes from before it have none. A code from a phone with
// no relay queue yet has no id and no relay, only the keys: whoever adds it reaches that phone
// nearby (lib/nearby.ts) until it says where its queue is. The relay token is never part of it.
// A phone with a backup relay (lib/spare.ts) adds its queue there:
//   &sid=<sender id there>&srelay=<backup relay address>&srk=<its key>
// so a contact writes there while the first relay cannot be reached.
// A phone whose relay lends places (crates/erevos-relay/src/lend.rs) adds a ticket for one:
//   &lend=ticket.<80 hex characters>
// so whoever adds it with no relay of their own takes a place there (lib/relay.ts, borrowPlace).
// Self-contained on purpose, so it can run under plain Node for checks.

export type SpareCode = { senderHex: string; relayUrl: string; relayKey?: string };
export type ContactCode = { senderHex: string; relayUrl: string; key: string; relayKey?: string; spare?: SpareCode; lend?: string };

const LINK = 'erevos://contact?';
// A bundle is about 1800 characters. Anything far longer is not one.
const MAX_KEY = 4096;
const TICKET = /^ticket\.[0-9a-f]{80}$/;

export function contactLink({ senderHex, relayUrl, key, relayKey, spare, lend }: ContactCode): string {
  const backup = spare
    ? `&sid=${spare.senderHex}&srelay=${encodeURIComponent(spare.relayUrl)}${spare.relayKey ? `&srk=${spare.relayKey}` : ''}`
    : '';
  const ticket = lend && relayUrl && TICKET.test(lend) ? `&lend=${lend}` : '';
  return `${LINK}id=${senderHex}&relay=${encodeURIComponent(relayUrl)}${key ? `&key=${key}` : ''}${relayKey ? `&rk=${relayKey}` : ''}${backup}${ticket}`;
}

/** Checks a backup queue of a link: null when it is not one, as when a part is missing. */
export function checkSpare(senderHex: unknown, relayUrl: unknown, relayKey: unknown = ''): SpareCode | null {
  if (typeof senderHex !== 'string' || typeof relayUrl !== 'string' || typeof relayKey !== 'string') return null;
  const id = senderHex.trim().toLowerCase();
  const relay = relayUrl.trim();
  if (!/^[0-9a-f]{48}$/.test(id) || !/^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(relay)) return null;
  if (relayKey && !/^[A-Za-z0-9_-]{43}$/.test(relayKey)) return null;
  return relayKey ? { senderHex: id, relayUrl: relay, relayKey } : { senderHex: id, relayUrl: relay };
}

/** Checks the parts of a code. The relay and the key may be empty, when the code has none, and the id too when it has the key. */
export function checkContact(senderHex: unknown, relayUrl: unknown, key: unknown = '', relayKey: unknown = ''): ContactCode | null {
  if (typeof senderHex !== 'string' || typeof relayUrl !== 'string' || typeof key !== 'string') return null;
  if (typeof relayKey !== 'string' || (relayKey && !/^[A-Za-z0-9_-]{43}$/.test(relayKey))) return null;
  const id = senderHex.trim().toLowerCase();
  const relay = relayUrl.trim();
  const keys = key.trim();
  if (!/^[0-9a-f]{48}$/.test(id) && !(id === '' && keys && !relay)) return null;
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
  const code = checkContact(fields.id, fields.relay ?? '', fields.key ?? '', fields.rk ?? '');
  // A backup queue or a ticket that does not read is left out: the link still works without it.
  const spare = code?.relayUrl && fields.sid ? checkSpare(fields.sid, fields.srelay ?? '', fields.srk ?? '') : null;
  const lend = code?.relayUrl && fields.lend && TICKET.test(fields.lend) ? fields.lend : '';
  return code ? { ...code, ...(spare ? { spare } : {}), ...(lend ? { lend } : {}) } : code;
}

// Hands a contact from the screen a scanned link opens, or from a contact's Erevos ID
// (app/contact-card.tsx), to the chat screen, which owns the contact list. Kept in memory only: the
// chat saves the contact once it has it, and then tells `added` who it is, to link the contact to.

/** What is told who the contact added is (its identity), once it is. */
export type Added = (identity: string) => void;
type Listener = (code: ContactCode, added?: Added) => void;

let waiting: { code: ContactCode; added?: Added } | null = null;
let listener: Listener | null = null;

/** Gives a contact to the chat: now if the chat is open, otherwise when it next opens. */
export function offerContact(code: ContactCode, added?: Added): void {
  if (listener) listener(code, added);
  else waiting = { code, added };
}

/** For the chat: receives offered contacts until unsubscribed, starting with one that waited. */
export function onContactOffered(next: Listener): () => void {
  listener = next;
  if (waiting) {
    const { code, added } = waiting;
    waiting = null;
    next(code, added);
  }
  return () => {
    if (listener === next) listener = null;
  };
}
