import type { ChatNotify } from '../lock/chat-notify';
import { currentSpace } from '../lock/keys';
import { placeChatsNow } from './place-chats';
import { placeGroupsNow } from './place-groups';
import { spaceChatsNow } from './space-chats';
import { spaceGroupsNow } from './space-groups';

// A chat's own notifications (lock/chat-notify.ts) as a message or a call comes for it, found at
// once (lib/background.ts) in the chats and groups that are open: the open space's, or one of its
// hidden places'. A closed hidden place, or a closed space, says nothing of which chat it was, and
// so tells of it as the app's settings say.

/** The own notifications of a chat (`chat:` and its identity) or a group (`group:` and its id) in
 *  the open space, or with `pocket` in that hidden place of it; null when it has none, or its
 *  chats are not open. */
export function chatNotify(chat: string, pocket?: number): ChatNotify | null {
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
