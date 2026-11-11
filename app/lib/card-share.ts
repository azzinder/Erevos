// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedCard } from './chat-parts';
import { EMPTY_FIELDS, type Entry, type Fields } from './contacts';
import { parseVCards, writeVCard } from './vcard';

// A contact sent in a chat, with a contact or in a group (components/card-share.tsx): a vCard of its
// name, numbers and emails only, which any contacts app reads, and nothing else of it (no address,
// note, birthday, photo or group). It rides in a message's own field (lib/chat-parts.ts `card`),
// with its words for an Erevos from before. Unlike Introduce (lib/intros.ts), it makes no one a
// contact of anyone: it is only what a card says, to save on this phone if wanted.

/** The most numbers, and the most emails, a contact card carries. */
export const MAX_CARD_ENTRIES = 8;

/** A contact card as people read it: the name, then each number and email. */
export type CardShown = { name: string; phones: string[]; emails: string[] };

// The numbers or emails a card takes: each once, at most MAX_CARD_ENTRIES, as they were kept.
const kept = (list: Entry[]): Entry[] => {
  const seen = new Set<string>();
  return list.filter((e) => e.value.trim() && !seen.has(e.value) && seen.add(e.value)).slice(0, MAX_CARD_ENTRIES).map(({ value, kind, label }) => ({ value, kind, label }));
};

/** A contact as its card goes, from its fields and the name it shows: null when it has no name, or is too long to go. */
export function cardOf(contact: Fields & { name: string }): string | null {
  return checkedCard(writeVCard({ ...EMPTY_FIELDS, given: contact.given, family: contact.family, name: contact.name, phones: kept(contact.phones), emails: kept(contact.emails) }));
}

/** What a contact card shows: its name, numbers and emails, read from it as it came, and no more of them than one sent here. */
export function cardShown(card: string): CardShown {
  const read = parseVCards(card)[0];
  if (!read) return { name: '', phones: [], emails: [] };
  return { name: read.name, phones: kept(read.phones).map((p) => p.value), emails: kept(read.emails).map((e) => e.value) };
}

/** The fields a contact card fills a new contact with (app/contact-edit.tsx `fill`): only its name, numbers and emails. */
export function cardFields(card: string): Fields | null {
  const read = parseVCards(card)[0];
  if (!read) return null;
  return { ...EMPTY_FIELDS, given: read.given, family: read.family, phones: kept(read.phones), emails: kept(read.emails) };
}

/** A contact card's words, for an Erevos from before: a person and the name, then each number and email. */
export function cardWords(card: string): string {
  const { name, phones, emails } = cardShown(card);
  return [`👤 ${name}`, ...phones, ...emails].join('\n');
}
