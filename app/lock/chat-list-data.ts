// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sealedFile, type Holder } from './sealed-file';

// The order a space gives its chats in the list (lib/chat-list.ts), apart from its SMS, whose own
// order lock/sms-data.ts keeps: the chats pinned at the top, and those archived, out of the list
// until a message comes from them after. Every chat of the list is named by its row's identity
// (lib/inbox.ts): a contact's, `group:` and a group's id, `matrix:`, `xmpp:` or `nostr:` and who.
// Sealed in FILE like the space's contacts (sealed-file.ts), one value for the space and one for
// each of its hidden places, which keep their own: on this phone only, never sent anywhere, and
// held by backups (lock/backup.ts). A chat moved out of a place takes nothing of it along: its
// marks there are dropped as it goes (app/chat.tsx), so nothing left behind names it.

/** A chat, by its row's identity, pinned or archived at `at`. */
export type ChatMark = { id: string; at: number };

export type ChatListData = {
  /** Chats at the top of the list, the first pinned first. */
  pinned: ChatMark[];
  /** Chats out of the list, until a message comes from them after `at`. */
  archived: ChatMark[];
};

export const EMPTY_CHAT_LIST: ChatListData = { pinned: [], archived: [] };

export const FILE = 'erevos-chat-list';
const BLOCK = 4 * 1024;
/** The chats that can be pinned here at once (a Matrix room our favourite is pinned besides), and those kept archived. */
export const MAX_CHAT_PINS = 10;
export const MAX_ARCHIVED_CHATS = 500;

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 600;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function marks(value: unknown, max: number): ChatMark[] {
  const seen = new Set<string>();
  const list: ChatMark[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    const m = (item ?? {}) as Record<string, unknown>;
    if (!isId(m.id) || !isTime(m.at) || seen.has(m.id)) continue;
    seen.add(m.id);
    list.push({ id: m.id, at: m.at });
  }
  return list.slice(-max);
}

/** What was kept, anything of the wrong shape left out. */
export function checkedChatList(value: unknown): ChatListData {
  const v = (value ?? {}) as Partial<Record<keyof ChatListData, unknown>>;
  return { pinned: marks(v.pinned, MAX_CHAT_PINS), archived: marks(v.archived, MAX_ARCHIVED_CHATS) };
}

const store = sealedFile({ name: FILE, empty: EMPTY_CHAT_LIST, checked: checkedChatList, block: BLOCK });

/** The order of a space's chats (`holder` 'space'), or of one of its hidden places'. */
export function loadChatList(holder: Holder, space: number, key: Uint8Array): Promise<ChatListData> {
  return store.load(holder, space, key);
}

export function saveChatList(holder: Holder, space: number, key: Uint8Array, data: ChatListData): Promise<void> {
  return store.save(holder, space, key, checkedChatList(data));
}
