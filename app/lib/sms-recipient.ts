// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { kindLabel, toDial, type DialRow, type Findable } from './contacts';
import { smsNumbers } from './sms-group';
import { sameNumber } from './sms-invite';

// The recipient of a new SMS (components/sms-recipient.tsx): the numbers typed, separated by commas,
// and the contacts that can fill them in, from the same cards the Phone's search looks in
// (lib/contact-book.ts dialCards).

type Card = Parameters<typeof toDial>[0][number];

/** What is being typed after the last comma: the part a contact can complete. */
export function typedPart(value: string): string {
  return value.split(/[,;\n]/).pop()?.trim() ?? '';
}

/**
 * The recipient with `number` added: as the part being typed (`replaceTyped`, when it was picked
 * from the suggestions), or after the numbers there are. A number already there stays once.
 */
export function withRecipient(value: string, number: string, replaceTyped: boolean): string {
  const parts = value.split(/[,;\n]/).map((p) => p.trim());
  if (replaceTyped) parts.pop();
  const kept = parts.filter(Boolean);
  if (smsNumbers(number).length === 0) return kept.join(', ');
  if (!kept.some((p) => sameNumber(p, number))) kept.push(number.trim());
  return kept.join(', ');
}

/**
 * The numbers of the contacts that every word of `query` finds, as the Phone's search does (names
 * and numbers, without case or accents); with no query, every number of every contact, in order.
 */
export function recipientRows(cards: Card[], query: string, findables = new Map<string, Findable>(), most = 50): DialRow[] {
  if (query.trim()) return toDial(cards, query, findables, most);
  const rows: DialRow[] = [];
  for (const card of cards) {
    const seen: string[] = [];
    for (const phone of card.phones) {
      if (!/\d/.test(phone.value) || seen.some((n) => sameNumber(n, phone.value))) continue;
      seen.push(phone.value);
      rows.push({ key: `${card.key}:${seen.length}`, name: card.name, kind: kindLabel(phone), number: phone.value });
      if (rows.length >= most) return rows;
    }
  }
  return rows;
}
