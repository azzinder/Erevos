// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { mutedNow } from '../lock/chat-notify';
import { canGroup, hasCore } from './core';
import { buildInbox } from './inbox';
import { networkUnreadAt } from './network-notices';
import { spaceChats } from './space-chats';
import { spaceGroups } from './space-groups';

// How many messages the open space has not read, as the home screen counts them on its rows
// (app/app/index.tsx, lib/inbox.ts): its contacts' and its groups', a chat locked with its PIN too,
// and its chats on Matrix, XMPP and Nostr (lib/network-notices.ts). Never a hidden chat's: hidden
// chats are not the space's chats (lib/space-chats.ts), nor a muted chat's or group's
// (lock/chat-notify.ts). Not the phone's SMS, which Android counts, but on a linked device given them
// (lib/sms-mirror.ts), where they count as a chat on another network. For the number on Erevos's icon
// (lib/push-notice.web.ts, and on Android the messages notice, lib/background.ts).

/** The open space's unread messages, or null when no space is open or its chats cannot be read. */
export async function spaceUnread(now = Date.now()): Promise<number | null> {
  const at = await spaceUnreadAt(now);
  return at && [...at.values()].reduce((sum, n) => sum + n, 0);
}

/** The same, by chat (`chat:` and its identity), group (`group:` and its id) and network chat
 *  (`matrix:`, `xmpp:`, `nostr:`), those with any (lib/background.ts screenOfChat, screenOfGroup);
 *  null as above. */
export async function spaceUnreadAt(now = Date.now()): Promise<Map<string, number> | null> {
  if (!hasCore()) return null;
  try {
    const { e2e, history } = await spaceChats();
    const at = new Map<string, number>();
    for (const row of buildInbox(e2e.contacts(), history.messages(), [], now)) if (!row.muted && row.unread > 0) at.set(`chat:${row.identity}`, row.unread);
    if (canGroup()) for (const group of (await spaceGroups()).list()) if (!mutedNow(group.notify, now) && group.unread > 0) at.set(`group:${group.id}`, group.unread);
    for (const [where, n] of networkUnreadAt(now)) at.set(where, n);
    return at;
  } catch {
    return null;
  }
}
