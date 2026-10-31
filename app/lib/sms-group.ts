// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { plainNumber, sameNumber } from './sms-invite';

// SMS conversations with several numbers: a group's MMS. Android keeps one conversation for the
// group; here it is named by its numbers, comma-separated, as the native SMS module gives it and
// as app/sms.tsx takes it in its address.

/** The numbers of an address: one, or a group's. Each once, as typed numbers are kept. */
export function smsNumbers(address: string): string[] {
  const numbers: string[] = [];
  for (const part of address.split(/[,;\n]/)) {
    const number = plainNumber(part);
    if (number.replace('+', '').length >= 3 && !numbers.some((n) => sameNumber(n, number))) numbers.push(number);
  }
  return numbers;
}

/** The address for these numbers, as the SMS screen takes it. */
export function smsAddress(numbers: string[]): string {
  return numbers.join(',');
}

/** Whether two addresses are the same conversation: the same numbers, in any order. */
export function sameAddress(a: string, b: string): boolean {
  const x = smsNumbers(a);
  const y = smsNumbers(b);
  return x.length > 0 && x.length === y.length && x.every((n) => y.some((m) => sameNumber(n, m)));
}

/** Whether two addresses are the same conversation: the same numbers, or the same name of a
 *  sender that writes with a name instead of a number (a bank, say). */
export function sameConversation(a: string, b: string): boolean {
  if (smsNumbers(a).length > 0) return sameAddress(a, b);
  const name = a.trim().toLowerCase();
  return name.length > 0 && smsNumbers(b).length === 0 && name === b.trim().toLowerCase();
}

/** A group's name: its numbers, as the phone's contacts name them when allowed. */
export function groupName(numbers: string[], names: Record<string, string> = {}): string {
  return numbers.map((n) => names[n] || n).join(', ');
}
