// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { ChatNotify } from '../lock/chat-notify';
import { checkedChatPin, type ChatPin } from '../lock/chat-pin';
import type { SmsOwn } from '../lock/sms-own';
import type { Look } from '../theme/look';

import type { InboxSms } from './inbox';
import { sameConversation } from './sms-group';

// A chat on Matrix, XMPP or Nostr, or an SMS conversation, kept from other eyes as a space's own
// chats are (app/chat.tsx): locked with a PIN of its own (lock/chat-pin.ts), which it asks each
// time it opens and again once Erevos was away more than RELOCK_MS, the list then showing its name
// with a lock and nothing of its messages, and the search none of them; and its screenshots
// blocked while it shows (lib/screen-privacy.ts). None of the networks has a way to tell the
// others either, so both stay on this device, with the chat's other settings in the space's
// encrypted data: a Matrix room, an XMPP chat and a Nostr chat in their account's value, a hidden
// place's in its own; an SMS conversation in the space's SMS data (lock/sms-own.ts), with its own
// look and notifications. The PIN never: only Argon2id of it (lock/chat-pin.ts). Hidden chats ask
// no PIN of their own, as the hidden chats' PIN guards them, and keep out of screenshots always.

/** What a chat keeps of it, beside its notifications and look: its PIN, as kept, and whether its
 *  screenshots are blocked. */
export type ChatGuard = { pin?: ChatPin; shots?: true };

/** A change to it: a new PIN, or null to take it off; screenshots blocked or allowed again. What is
 *  missing stays. */
export type GuardChange = { pin?: ChatPin | null; shots?: boolean };

/** Changes a chat's guard in place, as the stores keep their chats. */
export function changeGuard(chat: ChatGuard, change: GuardChange): void {
  if (change.pin !== undefined) {
    if (change.pin) chat.pin = change.pin;
    else delete chat.pin;
  }
  if (change.shots !== undefined) {
    if (change.shots) chat.shots = true;
    else delete chat.shots;
  }
}

/** The PIN a chat opens with, as kept, or null when it has none (or of the wrong shape). */
export const pinOf = (chat: { pin?: unknown } | null | undefined): ChatPin | null => checkedChatPin(chat?.pin);

/** Whether a chat is locked with a PIN of its own. */
export const lockedChat = (chat: { pin?: unknown } | null | undefined): boolean => pinOf(chat) !== null;

/** Whether a chat's screenshots are blocked. */
export const shotsBlocked = (chat: { shots?: unknown } | null | undefined): boolean => chat?.shots === true;

/** What a row of the list says of a chat locked with its PIN (lib/inbox.ts): that it moved, and how
 *  many came, but nothing of what. */
export const LOCKED_ROW = { last: '', mine: false, mark: 0, fades: false, locked: true } as const;

/** A change to what an SMS conversation has of its own: what is given is set, null takes it off. */
export type SmsOwnChange = GuardChange & { look?: Look | null; notify?: ChatNotify | null };

/** What the conversation with `address` has of its own, or null. */
export function smsOwnOf(list: readonly SmsOwn[], address: string): SmsOwn | null {
  return list.find((own) => sameConversation(own.address, address)) ?? null;
}

/** The list with that conversation's changed; one left with nothing of its own goes from it. */
export function withSmsOwn(list: readonly SmsOwn[], address: string, change: SmsOwnChange): SmsOwn[] {
  const was = smsOwnOf(list, address);
  const own: SmsOwn = { ...(was ?? { address }) };
  changeGuard(own, change);
  if (change.look !== undefined) {
    if (change.look) own.look = change.look;
    else delete own.look;
  }
  if (change.notify !== undefined) {
    if (change.notify) own.notify = change.notify;
    else delete own.notify;
  }
  const rest = list.filter((other) => other !== was);
  return Object.keys(own).length > 1 ? [...rest, own] : rest;
}

/** The phone's SMS conversations, those locked with their PIN in the space marked so: the list
 *  shows nothing of them (lib/inbox.ts). */
export function lockSmsThreads<T extends InboxSms>(threads: T[], list: readonly SmsOwn[]): T[] {
  if (!list.some(lockedChat)) return threads;
  return threads.map((thread) => (lockedChat(smsOwnOf(list, thread.address)) ? { ...thread, locked: true } : thread));
}
