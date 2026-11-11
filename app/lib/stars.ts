// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';

// Messages starred in the chats on Matrix, XMPP and Nostr and in the SMS, as an Erevos chat stars
// its own (lock/history.ts): on this device only, as none of these networks has a star its apps
// share, so nothing of it goes anywhere. Each is kept sealed with the account's place, the space's
// or a hidden place's own (lock/stars-data.ts), with what the message said in a line then: these
// chats keep only their latest messages (a Matrix room, an XMPP or Nostr chat, the SMS read), so a
// starred one may be gone from the device later and still show among the starred, and its chat
// opens where it was. A message deleted, or a chat left, takes its star along. Self-contained on
// purpose, so it can run under plain Node for checks.

export type StarService = 'matrix' | 'xmpp' | 'nostr' | 'sms';

export const STAR_SERVICES: readonly StarService[] = ['matrix', 'xmpp', 'nostr', 'sms'];

/** Which message: its network, the account (a Matrix ID, an XMPP address, a Nostr key; '' for SMS), its chat, and its id there. */
export type StarId = { service: StarService; account: string; chat: string; id: string };

/**
 * A message starred. `chat` is a Matrix room's ID, an XMPP address, a Nostr chat's key or an SMS
 * conversation's numbers; `id` the message's ID there (an SMS's as lib/sms-chat.ts smsLineId names
 * it). `at` is when it was written, `line` what it said in a line when starred, `group` that it is
 * in a group's chat, and `thread`, in Matrix, the thread it is in by its first message's ID.
 */
export type Star = StarId & { at: number; mine: boolean; line: string; group?: true; thread?: string };

/** The most stars a place keeps: the ones starred first go first. */
export const MAX_STARS = 1000;
/** The longest line kept of a message. */
export const MAX_LINE = 200;
const MAX_ID = 512;

export const sameStar = (a: StarId, b: StarId): boolean => a.service === b.service && a.account === b.account && a.chat === b.chat && a.id === b.id;

const shortText = (v: unknown, most: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= most;

/** What a place kept, with anything of the wrong shape left out. */
export function checkedStars(value: unknown): Star[] {
  const list = Array.isArray(value) ? value : [];
  const stars: Star[] = [];
  for (const v of list as Record<string, unknown>[]) {
    if (!v || typeof v !== 'object') continue;
    if (!STAR_SERVICES.includes(v.service as StarService) || typeof v.account !== 'string' || v.account.length > MAX_ID) continue;
    if (!shortText(v.chat, MAX_ID) || !shortText(v.id, MAX_ID) || !Number.isFinite(v.at) || typeof v.mine !== 'boolean' || typeof v.line !== 'string') continue;
    const star: Star = { service: v.service as StarService, account: v.account, chat: v.chat, id: v.id, at: v.at as number, mine: v.mine, line: v.line.slice(0, MAX_LINE) };
    if (v.group === true) star.group = true;
    if (shortText(v.thread, MAX_ID)) star.thread = v.thread;
    if (!stars.some((s) => sameStar(s, star))) stars.push(star);
  }
  return stars.slice(-MAX_STARS);
}

/** The list with `star` starred (`on`) or not: a star given again takes the place of the one before, last. */
export function withStar(list: Star[], star: Star, on: boolean): Star[] {
  const rest = list.filter((s) => !sameStar(s, star));
  if (!on) return rest;
  return [...rest, { ...star, line: star.line.slice(0, MAX_LINE) }].slice(-MAX_STARS);
}

/** The stars of one chat of an account. */
export function starsIn(list: readonly Star[], service: StarService, account: string, chat: string): Star[] {
  return list.filter((s) => s.service === service && s.account === account && s.chat === chat);
}

/** A message of a chat as it is here now, to tell whether a starred one is gone. */
export type LiveMessage = { id: string; at: number; deleted?: boolean };

/**
 * Whether a starred message is gone, by its chat as the device has it now (`messages`, the oldest
 * first; null for a chat no longer here): one taken back or deleted, or one missing from among the
 * messages kept. Missing from before the first of them, it may only be older than what is kept,
 * and stays.
 */
export function starGone(star: Pick<Star, 'id' | 'at'>, messages: readonly LiveMessage[] | null): boolean {
  if (!messages) return true;
  const found = messages.find((m) => m.id === star.id);
  if (found) return !!found.deleted;
  return messages.length > 0 && star.at >= messages[0].at;
}

/** Where a starred message opens: its chat, at it. `hidden` for a hidden place's own account. */
export function starHref(star: Star, hidden = false): string {
  const at = `at=${encodeURIComponent(star.id)}`;
  const place = hidden ? '&hidden=1' : '';
  switch (star.service) {
    case 'matrix':
      return `/matrix-chat?room=${encodeURIComponent(star.chat)}${star.thread ? `&thread=${encodeURIComponent(star.thread)}` : ''}&${at}${place}`;
    case 'xmpp':
      return `/xmpp-chat?jid=${encodeURIComponent(star.chat)}&${at}${place}`;
    case 'nostr':
      return `/nostr-chat?key=${encodeURIComponent(star.chat)}&${at}${place}`;
    case 'sms':
      // The SMS themselves, even of a number linked to an Erevos contact.
      return `/sms?to=${encodeURIComponent(star.chat)}&plain=1&${at}`;
  }
}

/** How a network's name shows beside a chat's, in the starred messages of every chat. */
export function serviceName(service: StarService): string {
  return service === 'sms' ? t('SMS') : service === 'xmpp' ? 'XMPP' : service === 'nostr' ? 'Nostr' : 'Matrix';
}

/** A starred message as the starred messages list it: whose, what it said, when, and where it opens. */
export type StarredRow = { key: string; name: string; line: string; at: number; href: string };

/**
 * A starred message's row: `chat` is its chat's name. One of ours says to whom, or in which group,
 * as an Erevos chat's starred say it (lib/message-search.ts foundName), each with its network.
 */
export function starRow(star: Star, chat: string): StarredRow {
  const named = `${chat} · ${serviceName(star.service)}`;
  const name = !star.mine ? named : star.group ? t('You in {name}', { name: named }) : t('You to {name}', { name: named });
  return { key: `${star.service}|${star.account}|${star.chat}|${star.id}`, name, line: star.line, at: star.at, href: starHref(star) };
}

/**
 * A starred message's chat as the device has it now: its name, and its messages (the oldest
 * first), null when the chat is gone, or none when they are not known (still being read).
 */
/** A star's chat as it is now; `locked`, with a PIN of its own (lib/chat-protect.ts), its stars show only inside it. */
export type StarChat = { name: string; messages?: readonly LiveMessage[] | null; locked?: boolean };

/**
 * The rows of a place's stars, by their chats as they are now (`chatOf`: undefined while the
 * account is not here, or its network is off, which leaves its stars out for now), and those to
 * forget: of a message gone, or a chat no longer here.
 */
export function starredNow(stars: readonly Star[], chatOf: (star: Star) => StarChat | undefined): { rows: StarredRow[]; gone: Star[] } {
  const rows: StarredRow[] = [];
  const gone: Star[] = [];
  for (const star of stars) {
    const chat = chatOf(star);
    if (!chat) continue;
    if (chat.messages !== undefined && starGone(star, chat.messages)) gone.push(star);
    else if (!chat.locked) rows.push(starRow(star, chat.name));
  }
  return { rows, gone };
}

/** The rows of every chat, the Erevos ones and the others', the latest first. */
export function latestFirst(rows: StarredRow[]): StarredRow[] {
  return [...rows].sort((a, b) => b.at - a.at);
}
