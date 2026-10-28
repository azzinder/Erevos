import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';

import { showOnScreen } from '../lib/background';
import { t } from '../lib/i18n';
import { appShown, onAppShown } from '../lib/receiver';
import type { ChatNotify } from '../lock/chat-notify';
import { canNotifyChats, ChatNotifySheet, notifyValue } from './chat-notify-sheet';
import { Button } from './ui';

// What a chat on Matrix, XMPP or Nostr (app/matrix-chat.tsx, app/xmpp-chat.tsx, app/nostr-chat.tsx)
// does about its notifications, as the space's own chats do: while it shows on the screen, what
// comes in it only sounds (lib/background.ts), and its own notifications are set from it.

/**
 * While the chat `where` (its home row: `matrix:`, `xmpp:` or `nostr:` and who) is the screen in
 * front, what comes in it only sounds. Says whether it shows now, with Erevos on the screen: only
 * then are its messages read, so that what comes while Erevos is away still tells of itself.
 */
export function useNetworkChatShown(where: string | undefined): boolean {
  const focused = useIsFocused();
  const [shown, setShown] = useState(appShown());
  useEffect(() => {
    setShown(appShown());
    return onAppShown(setShown);
  }, []);
  useEffect(() => (where && focused ? showOnScreen(where) : undefined), [where, focused]);
  return focused && shown;
}

/** The chat's Notifications button, with what it is set to, and its sheet: on Android only, as for the space's chats. */
export function NetworkChatNotify({ notify, onChange }: { notify: ChatNotify | null; onChange: (next: ChatNotify | null) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  if (!canNotifyChats) return null;
  const value = notifyValue(notify, false);
  return (
    <>
      <Button title={value ? `${t('Notifications')} · ${value}` : t('Notifications')} kind="secondary" compact onPress={() => setOpen(true)} />
      <ChatNotifySheet visible={open} onClose={() => setOpen(false)} title={t('Notifications')} notify={notify} hidden={false} onChange={onChange} />
    </>
  );
}
