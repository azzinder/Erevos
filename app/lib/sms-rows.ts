// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { SmsData } from '../lock/sms-data';
import { blockedNumbers, contactCards, smsThreads, type ContactCard } from '../modules/erevos-sms';
import { sealedNamer } from './contact-book';
import type { InboxSms } from './inbox';
import { groupName, smsNumbers } from './sms-group';
import { SmsLink } from './sms-link';

// The phone's SMS conversations as the home screen lists them (app/index.tsx), and the SMS alone
// do, when only they are open (components/sms-home.tsx).

// The phone's SMS conversations, by their numbers only until the owner turns names on (`names`,
// in the list or under SMS): then named as the phone's contacts name them, with their pictures,
// or as the space's contacts kept only in Erevos do; with the space's own order of them
// (lib/sms-folders.ts: pinned, archived, in the Trash, spam) and the numbers Android blocks.
export type SmsList = { threads: InboxSms[]; order: SmsData | null; blocked: string[]; names: boolean };

export const NO_SMS: SmsList = { threads: [], order: null, blocked: [], names: true };

export async function smsRows(space: number, key: Uint8Array): Promise<SmsList> {
  const threads = await smsThreads();
  const link = await SmsLink.open(space, key).catch(() => null);
  const all = threads.flatMap((t) => smsNumbers(t.address));
  const cards: Record<string, ContactCard> = link?.names ? await contactCards(all).catch(() => ({})) : {};
  const sealed = link?.names ? await sealedNamer() : () => '';
  const names: Record<string, string> = {};
  for (const number of all) {
    const name = cards[number]?.name || sealed(number);
    if (name) names[number] = name;
  }
  // A group's MMS conversation: named by all its numbers.
  const rows = threads.map((t) => {
    const numbers = smsNumbers(t.address);
    const one = numbers[0] ?? t.address;
    const card = numbers.length > 1 ? undefined : cards[one];
    return { ...t, name: numbers.length > 1 ? groupName(numbers, names) : names[one], photo: card?.photo || undefined };
  });
  return { threads: rows, order: link?.state ?? null, blocked: await blockedNumbers(), names: !!link?.names };
}
