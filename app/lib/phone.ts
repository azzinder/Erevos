// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Numbers on the Phone screen (app/phone.tsx): what the keypad types, and what is called. The
// calls themselves are Android's, made and shown by modules/erevos-phone.

/** The keypad's keys, row by row. Holding 0 types a +. */
export const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
] as const;

// The letters under each key, as a phone's dialer prints them: Greek for an app in Greek, Latin for
// the others. A name is found by either on any (lib/contacts.ts keysOf).
const LATIN_LETTERS: Record<string, string> = { '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ' };
const GREEK_LETTERS: Record<string, string> = { '2': 'ΑΒΓ', '3': 'ΔΕΖ', '4': 'ΗΘΙ', '5': 'ΚΛΜ', '6': 'ΝΞΟ', '7': 'ΠΡΣ', '8': 'ΤΥΦ', '9': 'ΧΨΩ' };

/** The letters shown under `key` for an app in `lang`; '' for 1, 0, * and #. */
export function keyLetters(key: string, lang: string): string {
  return (lang === 'el' ? GREEK_LETTERS : LATIN_LETTERS)[key] ?? '';
}

/** What can be called of what was typed or pasted: digits, * and #, and the , and ; that wait
 *  before the tones of an extension; a + only at the start. Spaces, dashes and brackets go. */
export function dialNumber(text: string): string {
  const kept = text.replace(/[^\d+*#,;]/g, '');
  return (kept.startsWith('+') ? '+' : '') + kept.replace(/\+/g, '');
}

/** The number with one more key: a + only as its first sign. */
export function typeKey(number: string, key: string): string {
  if (key === '+') return number === '' ? '+' : number;
  return number + key;
}

/** Whether what was typed is a number a contact or an SMS can have: digits, a + only at the start, at least three. Codes with * or # (such as *#06#) are not. */
export function textable(number: string): boolean {
  return /^\+?\d{3,}$/.test(dialNumber(number));
}

/** The names a space gives the numbers linked to its contacts, `{ number: name }`, for the call
 *  screen while the space is open (setKnownNames in modules/erevos-phone). A message request, not
 *  accepted yet, gives none. */
export function knownNames(contacts: { name: string; phone: string; request: boolean }[]): Record<string, string> {
  const names: Record<string, string> = {};
  for (const c of contacts) if (c.phone && c.name.trim() && !c.request) names[c.phone] = c.name.trim();
  return names;
}

/** The most quick replies the call screen offers, and the longest one. */
export const MAX_REPLIES = 6;
export const MAX_REPLY = 300;

/** Quick replies as the owner typed them, to keep: each on one line, none empty or twice. */
export function cleanReplies(replies: string[]): string[] {
  const kept: string[] = [];
  for (const reply of replies) {
    const line = reply.replace(/\s+/g, ' ').trim().slice(0, MAX_REPLY);
    if (line && !kept.includes(line)) kept.push(line);
  }
  return kept.slice(0, MAX_REPLIES);
}

/** "0:42", "12:05", "1:02:03", for a call that lasted `seconds`. */
export function callLength(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}
