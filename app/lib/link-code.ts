// The code a device shows to be linked to the phone that holds its account (lib/devices.ts): a link
// in the shape of a contact link (lib/contact-code.ts), so the phone's own camera app opens Erevos
// with it,
//   erevos://link?key=<link key>&id=<relay sender id>&relay=<relay address>&rk=<relay key>&s=<secret>&name=<name>
// `key` is the bundle of a key the device made for this link only, in base64url, which the phone
// starts the link's conversation with. `id` is the sender id of the device's queue on its relay,
// where the phone answers, and `rk` that relay's key for sealed sends, when it has one, so a phone on
// another relay reaches it through its own. `s` is a secret of 16 random bytes, in hex, that the
// phone's first message has to carry. `name` is what the device is called on the phone. Nothing of
// the account is in it, and the relay token never is.
// Self-contained on purpose, so it can run under plain Node for checks.

export type LinkCode = { key: string; senderHex: string; relayUrl: string; relayKey?: string; secret: string; name: string };

const LINK = 'erevos://link?';
// A bundle is about 1800 characters. Anything far longer is not one.
const MAX_KEY = 4096;

/** The longest name of a device. */
export const MAX_DEVICE_NAME = 40;

/** A device's name as kept: one line of at most MAX_DEVICE_NAME characters, without control or direction marks. */
export function cleanDeviceName(text: string): string {
  const line = text.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2028\u2029\u2066-\u2069]/g, ' ');
  return [...line.replace(/\s+/g, ' ').trim()].slice(0, MAX_DEVICE_NAME).join('').trim();
}

export function linkCodeLink({ key, senderHex, relayUrl, relayKey, secret, name }: LinkCode): string {
  return `${LINK}key=${key}&id=${senderHex}&relay=${encodeURIComponent(relayUrl)}${relayKey ? `&rk=${relayKey}` : ''}&s=${secret}&name=${encodeURIComponent(name)}`;
}

/** Checks the parts of a code: null when one is missing or is not what it should be. */
export function checkLinkCode(key: unknown, senderHex: unknown, relayUrl: unknown, relayKey: unknown, secret: unknown, name: unknown): LinkCode | null {
  if ([key, senderHex, relayUrl, secret].some((part) => typeof part !== 'string')) return null;
  const keys = (key as string).trim();
  const id = (senderHex as string).trim().toLowerCase();
  const relay = (relayUrl as string).trim();
  const said = typeof secret === 'string' ? secret.trim().toLowerCase() : '';
  const rk = typeof relayKey === 'string' ? relayKey.trim() : '';
  if (!keys || keys.length > MAX_KEY || !/^[A-Za-z0-9_-]+$/.test(keys)) return null;
  if (!/^[0-9a-f]{48}$/.test(id) || !/^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(relay)) return null;
  if (rk && !/^[A-Za-z0-9_-]{43}$/.test(rk)) return null;
  if (!/^[0-9a-f]{32}$/.test(said)) return null;
  const shown = cleanDeviceName(typeof name === 'string' ? name : '');
  return { key: keys, senderHex: id, relayUrl: relay, ...(rk ? { relayKey: rk } : {}), secret: said, name: shown };
}

/** Reads a device's link code. Null if the text is not one. */
export function parseLinkCode(text: string): LinkCode | null {
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
  return checkLinkCode(fields.key, fields.id, fields.relay, fields.rk ?? '', fields.s, fields.name ?? '');
}

/**
 * What the phone and the device compare before the device takes the account's chats: the first four
 * groups of the safety number of their two link keys (the core's, 60 digits in groups of five). Two
 * keys that differ give the same four groups once in about 10^20 tries.
 */
export function linkSafetyCode(number: string): string {
  return number.trim().split(/\s+/).slice(0, 4).join(' ');
}
