// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { plainText } from './sms-folders';

// A one-time code in an SMS (a bank's, a sign-in's), for Copy code under the message (app/sms.tsx)
// and on the notice of an SMS that came (modules/erevos-sms SmsStore.kt, which finds it the same
// way). Only an SMS that says it holds a code, in one of the app's languages, has one: its digits,
// 4 to 8 of them, written whole or in two parts ("123 456", "123-456"), nearest to those words. A
// number in a phone number, an amount, a date or a time is never taken. It is found on the phone,
// and copied only when the button is tapped.

// The words that say an SMS holds a code, as plainText writes them (no accents, small letters).
const CODE_WORDS = [
  'code',
  'otp',
  'pin',
  'passcode',
  'password',
  'verification',
  'verify',
  'one-time',
  'one time',
  '2fa',
  'tan',
  'κωδικ',
  'επαληθευσ',
  'επιβεβαιωσ',
  'μιας χρησης',
  'κλειδαριθμ',
  'συνθηματικ',
  'kennwort',
  'passwort',
  'bestatigung',
  'codigo',
  'clave',
  'contrasena',
  'verificacion',
  'mot de passe',
  'codice',
  'verifica',
  'senha',
  'verificacao',
  'kod',
  'sifra',
  'lozinka',
  'potvrd',
];

// Digits, whole or in two parts.
const DIGITS = /(\d{3,4})[ -](\d{3,4})(?!\d)|\d+/g;
// What stands beside the digits of a date, a phone number, an amount or a share; and between those
// of an amount or a time, with digits on its other side ("45,20", "12:30"), not at a sentence's end.
const BESIDE = /[/+€$£%]/;
const BETWEEN = /[.,:]/;
const isLetter = (c: string | undefined) => c !== undefined && /\p{L}/u.test(c);
const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';

/** The one-time code an SMS holds, or null. */
export function oneTimeCode(text: string): string | null {
  const plain = plainText(text);
  const words: number[] = [];
  for (const word of CODE_WORDS) {
    for (let at = plain.indexOf(word); at >= 0; at = plain.indexOf(word, at + 1)) {
      // A short word only at the start of one ("pin", not the "pin" in "shopping").
      if (word.length >= 4 || !isLetter(plain[at - 1])) words.push(at);
    }
  }
  if (words.length === 0) return null;
  let best: { code: string; far: number } | null = null;
  for (const found of plain.matchAll(DIGITS)) {
    const at = found.index ?? 0;
    const end = at + found[0].length;
    const code = found[1] ? found[1] + found[2] : found[0];
    if (code.length < 4 || code.length > 8) continue;
    const before = plain[at - 1];
    const after = plain[end];
    if ((before !== undefined && BESIDE.test(before)) || (after !== undefined && BESIDE.test(after))) continue;
    if ((before !== undefined && BETWEEN.test(before) && isDigit(plain[at - 2])) || (after !== undefined && BETWEEN.test(after) && isDigit(plain[end + 1]))) continue;
    // Joined to letters it is a name or a reference ("a12345"); after a space or a dash and more
    // digits it is part of a longer number ("+30 691 234 5678"). "G-123456" is a code.
    if (isLetter(before) || isLetter(after)) continue;
    if ((before === ' ' || before === '-') && isDigit(plain[at - 2])) continue;
    if ((after === ' ' || after === '-') && isDigit(plain[end + 1])) continue;
    const far = Math.min(...words.map((w) => Math.abs(w - at)));
    if (!best || far < best.far) best = { code, far };
  }
  return best?.code ?? null;
}
