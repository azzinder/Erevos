// Numbers on the Phone screen (app/phone.tsx): what the keypad types, and what is called. The
// calls themselves are Android's, made and shown by modules/erevos-phone.

/** The keypad's keys, row by row. Holding 0 types a +. */
export const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
] as const;

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

/** The names a space gives the numbers linked to its contacts, `{ number: name }`, for the call
 *  screen while the space is open (setKnownNames in modules/erevos-phone). A message request, not
 *  accepted yet, gives none. */
export function knownNames(contacts: { name: string; phone: string; request: boolean }[]): Record<string, string> {
  const names: Record<string, string> = {};
  for (const c of contacts) if (c.phone && c.name.trim() && !c.request) names[c.phone] = c.name.trim();
  return names;
}

/** "0:42", "12:05", "1:02:03", for a call that lasted `seconds`. */
export function callLength(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}
