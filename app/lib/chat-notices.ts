// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { ChatNotify } from '../lock/chat-notify';
import { currentSpace } from '../lock/keys';
import { isNetworkChat, networkNotify } from './network-notices';
import { placeChatsNow } from './place-chats';
import { placeGroupsNow } from './place-groups';
import { spaceChatsNow } from './space-chats';
import { spaceGroupsNow } from './space-groups';

// A chat's own notifications (lock/chat-notify.ts) as a message or a call comes for it, found at
// once (lib/background.ts) in the chats and groups that are open: the open space's, its chats on
// other networks (lib/network-notices.ts), or one of its hidden places'. A closed hidden place, or a closed space, says nothing of which chat it was, and
// so tells of it as the app's settings say.

/** The own notifications of a chat (`chat:` and its identity), a group (`group:` and its id) or a
 *  network chat (`matrix:`, `xmpp:`, `nostr:`) in the open space, or with `pocket` in that hidden
 *  place of it; null when it has none, or its chats are not open. */
export function chatNotify(chat: string, pocket?: number): ChatNotify | null {
  if (isNetworkChat(chat)) return pocket === undefined ? networkNotify(chat) : null;
  try {
    if (chat.startsWith('chat:')) {
      const chats = pocket === undefined ? spaceChatsNow() : placeChatsNow(currentSpace().space, pocket);
      return chats?.e2e.notifyOf(chat.slice('chat:'.length)) ?? null;
    }
    if (chat.startsWith('group:')) {
      const groups = pocket === undefined ? spaceGroupsNow() : placeGroupsNow(currentSpace().space, pocket);
      return groups?.notifyOf(chat.slice('group:'.length)) ?? null;
    }
  } catch {
    // No space is open.
  }
  return null;
}
