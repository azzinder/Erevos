import { canGroup, hasCore } from './core';
import { buildInbox } from './inbox';
import { spaceChats } from './space-chats';
import { spaceGroups } from './space-groups';

// How many messages the open space has not read, as the home screen counts them on its rows
// (app/app/index.tsx, lib/inbox.ts): its contacts' and its groups', a chat locked with its PIN too.
// Never a hidden chat's: hidden chats are not the space's chats (lib/space-chats.ts). Not the
// phone's SMS. For the number on Erevos's icon (lib/push-notice.web.ts).

/** The open space's unread messages, or null when no space is open or its chats cannot be read. */
export async function spaceUnread(now = Date.now()): Promise<number | null> {
  if (!hasCore()) return null;
  try {
    const { e2e, history } = await spaceChats();
    const rows = buildInbox(e2e.contacts(), history.messages(), [], now);
    let unread = rows.reduce((n, row) => n + row.unread, 0);
    if (canGroup()) unread += (await spaceGroups()).list().reduce((n, group) => n + group.unread, 0);
    return unread;
  } catch {
    return null;
  }
}
