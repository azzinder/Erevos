// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { ALWAYS, type ChatNotify } from '../lock/chat-notify';
import { loadChatList, MAX_ARCHIVED_CHATS, MAX_CHAT_PINS, saveChatList, type ChatListData, type ChatMark } from '../lock/chat-list-data';
import type { Holder } from '../lock/sealed-file';
import type { InboxRow } from './inbox';

// The order of a list of chats, home's (app/index.tsx) or a hidden place's (app/chat.tsx), for every
// chat in it that is not an SMS conversation, whose order is the SMS's own (lib/sms-folders.ts):
// an Erevos contact's, a group's, a Matrix room's, an XMPP chat's and a Nostr one's. Pinned ones
// show at the top of the list, archived ones out of it, under Archived, until a message comes from
// them after; Matrix rooms of low priority show at its end. A Matrix room is pinned as our favourite
// (m.favourite), which our other Matrix apps show so too; the rest is kept on this phone only, sealed
// with the space's or the place's other data (lock/chat-list-data.ts), as Matrix, XMPP and NIP-17
// have no way of their own to archive a chat, nor XMPP and NIP-17 to pin one.

/** Where a list keeps its order: the open space's ('space' and the space's key), or one of its hidden
 *  places' (its holder, `pocket` and key). */
export type ChatListPlace = { holder: Holder; space: number; key: Uint8Array; pocket?: number };

/** Whether an archived chat came back to the list: something came from them after it was archived.
 *  A group's row does not say whose its last message is: there a message not read yet says it. */
export function cameBack(row: Pick<InboxRow, 'identity' | 'at' | 'mine' | 'unread'>, mark: ChatMark): boolean {
  if (row.at <= mark.at) return false;
  return row.identity.startsWith('group:') ? row.unread > 0 : !row.mine;
}

/** A list arranged: the rows that show, pinned ones first and Matrix rooms of low priority last, each
 *  part in the order it had; those archived; and the archived ones a message brought back, whose
 *  marks can be forgotten. */
export type Arranged = { list: InboxRow[]; archived: InboxRow[]; back: string[] };

export function arrangeChats(rows: readonly InboxRow[], data: ChatListData): Arranged {
  const pins = new Set(data.pinned.map((mark) => mark.id));
  const marks = new Map(data.archived.map((mark) => [mark.id, mark]));
  const top: InboxRow[] = [];
  const middle: InboxRow[] = [];
  const end: InboxRow[] = [];
  const archived: InboxRow[] = [];
  const back: string[] = [];
  for (const row of rows) {
    const mark = row.sms ? undefined : marks.get(row.identity);
    if (mark && !cameBack(row, mark)) {
      archived.push(row);
      continue;
    }
    if (mark) back.push(mark.id);
    const pinned = row.pinned || (!row.sms && pins.has(row.identity));
    const shown = pinned && !row.pinned ? { ...row, pinned: true } : row;
    (pinned ? top : row.low ? end : middle).push(shown);
  }
  return { list: [...top, ...middle, ...end], archived, back };
}

/** A chat's notifications muted for good (`on`), or no longer, its sounds as they were: as muting it
 *  from the list does (components/chat-actions.tsx). */
export function mutedNotify(notify: ChatNotify | null | undefined, on: boolean): ChatNotify | null {
  const { until: _was, ...rest } = notify ?? {};
  const next: ChatNotify = on ? { ...rest, until: ALWAYS } : rest;
  return Object.keys(next).length ? next : null;
}

/** Whether a chat is pinned here (not counting a Matrix room pinned as a favourite), or archived. */
export const isPinnedHere = (data: ChatListData, id: string): boolean => data.pinned.some((mark) => mark.id === id);
export const isArchived = (data: ChatListData, id: string): boolean => data.archived.some((mark) => mark.id === id);

// Changes go one after another, each on what the one before kept.
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

/** Told when a list's order changed, so what shows it reads it again. */
export function onChatListChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A list's order, as kept. */
export function chatListOf(place: ChatListPlace): Promise<ChatListData> {
  return queue.then(() => loadChatList(place.holder, place.space, place.key));
}

// Changes a list's order and keeps it; `edit` returns null to keep it as it was.
function change(place: ChatListPlace, edit: (data: ChatListData) => ChatListData | null): Promise<boolean> {
  const done = queue.then(async () => {
    const data = await loadChatList(place.holder, place.space, place.key);
    const next = edit(data);
    if (!next) return false;
    await saveChatList(place.holder, place.space, place.key, next);
    listeners.forEach((listener) => listener());
    return true;
  });
  queue = done.catch(() => undefined);
  return done;
}

const without = (marks: ChatMark[], id: string) => marks.filter((mark) => mark.id !== id);

/** Pins a chat at the top of the list, or takes the pin away: out of the Archive too. False, and
 *  nothing changed, when MAX_CHAT_PINS are pinned already. */
export function pinChat(place: ChatListPlace, id: string, on: boolean, now = Date.now()): Promise<boolean> {
  return change(place, (data) => {
    const others = without(data.pinned, id);
    if (on && others.length >= MAX_CHAT_PINS) return null;
    return { pinned: on ? [...others, { id, at: now }] : others, archived: on ? without(data.archived, id) : data.archived };
  });
}

/** Archives a chat, unpinned, until a message comes from them after `at`; or takes it out of the
 *  Archive. The oldest archived go past MAX_ARCHIVED_CHATS. */
export async function archiveChat(place: ChatListPlace, id: string, on: boolean, at = Date.now()): Promise<void> {
  await change(place, (data) => ({
    pinned: on ? without(data.pinned, id) : data.pinned,
    archived: [...without(data.archived, id), ...(on ? [{ id, at }] : [])].slice(-MAX_ARCHIVED_CHATS),
  }));
}

/** Forgets that these chats were archived: a message brought them back. */
export async function forgetArchived(place: ChatListPlace, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await change(place, (data) => (data.archived.some((mark) => ids.includes(mark.id)) ? { ...data, archived: data.archived.filter((mark) => !ids.includes(mark.id)) } : null));
}

/** Forgets all a list knows of a chat: one moved to another place leaves nothing of itself here. */
export async function dropChat(place: ChatListPlace, id: string): Promise<void> {
  await change(place, (data) =>
    data.pinned.some((mark) => mark.id === id) || data.archived.some((mark) => mark.id === id) ? { pinned: without(data.pinned, id), archived: without(data.archived, id) } : null,
  );
}
