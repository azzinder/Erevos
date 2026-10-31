// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Held } from './held';
import { t } from './i18n';
import { smsNumbers } from './sms-group';
import { sameNumber } from './sms-invite';
import type { Findable } from './message-search';
import type { SmsMessage, SmsThread } from '../modules/erevos-sms';

// The phone's SMS with a contact's number, in that contact's Erevos chat (app/chat.tsx): their SMS
// and MMS show among the Erevos messages, by time, each marked as a plain SMS. The number is the
// one linked to the contact (lib/e2e.ts, linkPhone), else one on a contact card that is theirs.
// They are read where the SMS screen (app/sms.tsx) reads them, from the phone's own SMS, and shown
// as it shows them; they are never copied into the chat's sealed history. Only the conversation
// with that one number shows, never a group's MMS; only while Erevos may read SMS (it is the SMS
// app, or holds the permission); never in hidden chats. The latest SMS_PAGE show first, and more
// each time earlier ones are asked for, as the chat does with imported messages.
//
// The SMS conversation of a number linked to a contact opens that contact's chat instead, unless
// `plain` asks for the SMS screen itself, as the chat's details and the contact card do, to write
// a plain SMS (when there is no internet, say).

/** SMS shown at first in a chat, and added, four times as many, each time earlier ones are asked for. */
export const SMS_PAGE = 50;

// The phone's conversations looked through for the number's, as the contact card does.
const CONVERSATIONS = 500;

/** A message of the phone's SMS by its kind and row, as deleting it takes it: "sms:12", "mms:3". */
export const smsLineId = (m: Pick<SmsMessage, 'kind' | 'id'>): string => `${m.kind ?? 'sms'}:${m.id}`;

/** Where one of ours is: on its way, not sent, went (✓), reached their phone (✓✓✓), or not; '' when
 *  it does not say (one that came, or from a build before the delivery reports). */
export function smsMark(state: SmsMessage['state']): string {
  if (state === 'failed') return t('not sent');
  if (state === 'sending') return t('sending');
  if (state === 'undelivered') return t('not delivered');
  if (state === 'delivered') return '✓✓✓';
  return state === 'sent' ? '✓' : '';
}

/** One of ours that did not go, or did not reach their phone: a tap sends it again. */
export const smsFailed = (m: Pick<SmsMessage, 'mine' | 'state'>): boolean => m.mine && (m.state === 'failed' || m.state === 'undelivered');

/** SMS and MMS waiting to be deleted from the phone, with Undo meanwhile (lib/held.ts), on whichever
 *  screen shows them: the SMS screen or a contact's chat. */
export const deletingSms = new Held<{ id: string; to: string }>();

/**
 * The number whose SMS a chat shows: the contact's (`phone`) when it is one number, and the chat is
 * not hidden, and Erevos may read SMS (`access`); else ''.
 */
export function chatSmsNumber(chat: { hidden: boolean; access: boolean; phone: string }): string {
  if (chat.hidden || !chat.access) return '';
  const numbers = smsNumbers(chat.phone);
  return numbers.length === 1 ? numbers[0] : '';
}

/**
 * The number of a contact, for its SMS in its chat: the one linked to them, else the first mobile
 * number of a contact card that is theirs, else its first number. '' for none.
 */
export function contactSmsNumber(linked: string, cards: { phones: { value: string; kind?: string }[] }[]): string {
  if (smsNumbers(linked).length === 1) return linked;
  const phones = cards.flatMap((c) => c.phones).filter((p) => smsNumbers(p.value).length === 1);
  return (phones.find((p) => p.kind === 'mobile') ?? phones[0])?.value ?? '';
}

/** The addresses of the phone's conversations with `number` alone: never a group's MMS, which has several. */
export function smsConversations(number: string, threads: Pick<SmsThread, 'address'>[]): string[] {
  if (!number) return [];
  return threads.filter((th) => smsNumbers(th.address).length === 1 && sameNumber(th.address, number)).map((th) => th.address);
}

/** How a chat reads the phone's SMS: as the SMS module does (modules/erevos-sms). */
export type SmsReader = {
  threads: (limit: number) => Promise<Pick<SmsThread, 'address'>[]>;
  messages: (address: string, limit: number) => Promise<SmsMessage[]>;
};

/**
 * The addresses of the conversations with `number` alone. Only a conversation that is there is
 * read later: asking the phone for one by its number would start it.
 */
export async function findSmsConversations(number: string, read: Pick<SmsReader, 'threads'>): Promise<string[]> {
  return number ? smsConversations(number, await read.threads(CONVERSATIONS)) : [];
}

/**
 * As findSmsConversations, with how many of theirs the phone counts not read in them, shown in the
 * chat or not: one older than the SMS that show, or in the Trash, is counted on the home screen too.
 */
export async function findSmsUnread(number: string, read: { threads: (limit: number) => Promise<Pick<SmsThread, 'address' | 'unread'>[]> }): Promise<{ addresses: string[]; unread: number }> {
  if (!number) return { addresses: [], unread: 0 };
  const threads = await read.threads(CONVERSATIONS);
  const addresses = smsConversations(number, threads);
  return { addresses, unread: threads.reduce((n, th) => n + (addresses.includes(th.address) ? th.unread : 0), 0) };
}

/** The latest `limit` SMS and MMS of these conversations, oldest first, each once; `more` when
 *  there may be earlier ones. */
export async function latestSms(addresses: string[], limit: number, read: Pick<SmsReader, 'messages'>): Promise<{ messages: SmsMessage[]; more: boolean }> {
  const seen = new Set<string>();
  const all: SmsMessage[] = [];
  let more = false;
  for (const address of addresses) {
    const got = await read.messages(address, limit);
    if (got.length >= limit) more = true;
    for (const m of got) {
      if (seen.has(smsLineId(m))) continue;
      seen.add(smsLineId(m));
      all.push(m);
    }
  }
  all.sort((a, b) => a.at - b.at);
  return { messages: all.slice(Math.max(0, all.length - limit)), more: more || all.length > limit };
}

/** A line of a chat: one of its messages, or an SMS or MMS with their number; `earlier` on the
 *  first SMS read, when there may be earlier ones to ask for above it. */
export type ChatLine<M> = { kind: 'chat'; at: number; mine: boolean; message: M } | { kind: 'sms'; at: number; mine: boolean; sms: SmsMessage; earlier?: true };

/**
 * The chat's messages and the SMS with their number in one line, by time: both come oldest first
 * and keep their order, and at the same time the chat's message comes first.
 */
export function chatLines<M extends { at: number; mine: boolean }>(messages: M[], sms: SmsMessage[], more: boolean): ChatLine<M>[] {
  const lines: ChatLine<M>[] = [];
  let i = 0;
  let j = 0;
  while (i < messages.length || j < sms.length) {
    if (j >= sms.length || (i < messages.length && messages[i].at <= sms[j].at)) {
      const message = messages[i++];
      lines.push({ kind: 'chat', at: message.at, mine: message.mine, message });
    } else {
      const m = sms[j];
      lines.push({ kind: 'sms', at: m.at, mine: m.mine, sms: m, ...(j === 0 && more ? { earlier: true as const } : {}) });
      j++;
    }
  }
  return lines;
}

/** The SMS as the chat's search looks through them (lib/message-search.ts), in the chat of `peer`:
 *  by their words, each gone to by its id. */
export function smsFindables(peer: string, sms: SmsMessage[]): Findable[] {
  return sms.map((m) => ({ peer, tag: smsLineId(m), at: m.at, mine: m.mine, text: m.text }));
}

/** Whether a message found is one of the SMS (smsFindables), not one of the chat's. */
export const isSmsLine = (tag: string): boolean => /^(sms|mms):\d+$/.test(tag);

/**
 * The contact whose chat an SMS conversation opens instead (app/sms.tsx): the one its number is
 * linked to, unless `plain` asks for the SMS. A group's conversation, and a sender that writes with
 * a name, open as SMS; so does a number no longer linked.
 */
export function linkedContact<C extends { phone?: string }>(contacts: C[], to: string, plain: boolean): C | null {
  const numbers = smsNumbers(to);
  if (plain || numbers.length !== 1) return null;
  return contacts.find((c) => !!c.phone && sameNumber(c.phone, numbers[0])) ?? null;
}

/** Whether `number`, one number, is a contact's: linked to one of `contacts`, or on one of `cards`
 *  that are theirs. */
export function numberOwned(number: string, contacts: { phone?: string }[], cards: { phones: { value: string }[] }[]): boolean {
  const numbers = smsNumbers(number);
  if (numbers.length !== 1) return false;
  const same = (other: string | undefined) => !!other && sameNumber(other, numbers[0]);
  return contacts.some((c) => same(c.phone)) || cards.some((c) => c.phones.some((p) => same(p.value)));
}

/** The plain SMS conversation with a number, as the chat's details open it: not the chat again. */
export const plainSmsHref = (number: string): `/sms?${string}` => `/sms?to=${encodeURIComponent(number)}&plain=1`;
