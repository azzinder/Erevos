// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ask } from '../lib/alert';
import { archiveChat, arrangeChats, chatListOf, forgetArchived, isArchived, isPinnedHere, mutedNotify, onChatListChanged, pinChat, type Arranged, type ChatListPlace } from '../lib/chat-list';
import { t } from '../lib/i18n';
import { shownName, type InboxRow } from '../lib/inbox';
import { matrixNow, matrixSetNotify, matrixTag } from '../lib/matrix-store';
import { showWhere, type NetworkWhere } from '../lib/network-place';
import { nostrDmNow, nostrDmSetNotify } from '../lib/nostr-dm-store';
import { placeChats } from '../lib/place-chats';
import { placeGroupsAt } from '../lib/place-groups';
import { kindOf } from '../lib/read-all';
import { spaceChats } from '../lib/space-chats';
import { spaceGroupsAt } from '../lib/space-groups';
import { xmppNow, xmppSetNotify } from '../lib/xmpp-store';
import { EMPTY_CHAT_LIST, MAX_CHAT_PINS, type ChatListData } from '../lock/chat-list-data';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles } from '../theme/context';
import { canNotifyChats } from './chat-notify-sheet';
import { Sheet, Text } from './ui';
import { offerUndo } from './undo-bar';

// What can be done to a chat from a list of chats, held down (lib/chat-list.ts): pin it at the top or
// take the pin away, archive it or take it out of the Archive, and mute it for good or no longer, as
// its own Notifications do (lock/chat-notify.ts). For every chat that is not an SMS conversation,
// which has its own (components/sms-actions.tsx): an Erevos contact's, a group's, a Matrix room's, an
// XMPP chat's and a Nostr one's, the space's on home and a hidden place's in its hidden chats, each
// list kept apart. A Matrix room is pinned as our favourite (m.favourite), in our Matrix account.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const notDone = (error: unknown) => ask(t('Not done'), errorText(error), [{ text: t('OK') }]);

// Does what the account of `where` is to do, as if its screen were on top: the network's stores act
// on the account of the screen on top (lib/network-place.ts), and take it as they are called.
function onAccount<T>(where: NetworkWhere, act: () => Promise<T>): Promise<T> {
  const gone = showWhere(where);
  try {
    return act();
  } finally {
    gone();
  }
}

/** A list's order (`place`, kept the same while it is the same place), read again as it changes;
 *  null until read. One that cannot be read is an empty one. */
export function useChatList(place: ChatListPlace | null): ChatListData | null {
  const [data, setData] = useState<ChatListData | null>(null);
  useEffect(() => {
    setData(null);
    if (!place) return;
    let active = true;
    const read = () =>
      void chatListOf(place).then(
        (kept) => active && setData(kept),
        () => active && setData(EMPTY_CHAT_LIST),
      );
    read();
    const stop = onChatListChanged(read);
    return () => {
      active = false;
      stop();
    };
  }, [place]);
  return data;
}

/** The rows of a list arranged by its order (lib/chat-list.ts arrangeChats), null until both are
 *  read; an archived chat a message brought back has its mark forgotten. */
export function useArrangedChats(rows: readonly InboxRow[] | null, place: ChatListPlace | null): Arranged | null {
  const data = useChatList(place);
  const arranged = useMemo(() => (rows && data ? arrangeChats(rows, data) : null), [rows, data]);
  const back = arranged?.back.join('\n') ?? '';
  useEffect(() => {
    if (place && arranged && arranged.back.length > 0) void forgetArchived(place, arranged.back).catch(() => undefined);
  }, [place, back]);
  return arranged;
}

/** Mutes a chat of the list for good, or no longer: as its Notifications do. */
async function muteChat(row: InboxRow, on: boolean, place: ChatListPlace, where: NetworkWhere): Promise<void> {
  const kind = kindOf(row);
  switch (kind.kind) {
    case 'contact': {
      const { e2e } = place.pocket === undefined ? await spaceChats() : await placeChats(place.space, place.pocket, place.key);
      await e2e.setNotify(kind.identity, mutedNotify(e2e.notifyOf(kind.identity), on));
      return;
    }
    case 'group': {
      const groups = await (place.pocket === undefined ? spaceGroupsAt : placeGroupsAt(place.space, place.pocket, place.key)).groups();
      await groups.setNotify(kind.id, mutedNotify(groups.list().find((g) => g.id === kind.id)?.notify, on));
      return;
    }
    case 'matrix':
      return onAccount(where, () => matrixSetNotify(kind.room, mutedNotify(matrixNow(where).state?.rooms[kind.room]?.notify, on)));
    case 'xmpp':
      return onAccount(where, () => xmppSetNotify(kind.jid, mutedNotify(xmppNow(where).state?.chats[kind.jid]?.notify, on)));
    case 'nostr':
      return onAccount(where, () => nostrDmSetNotify(kind.key, mutedNotify(nostrDmNow(where).state?.chats[kind.key]?.notify, on)));
    case 'sms':
      return;
  }
}

/**
 * The actions of the chat held down (`target`), in a sheet. `place`: where the list keeps its order;
 * `where`: whose network accounts it shows. `undo`: Undo shows after archiving, as on home (not in
 * hidden chats, where the bar of the next screen would tell of them). `onChanged`: something of the
 * chat changed that its row shows (muted), for the list to read it again.
 */
export function ChatActions({ target, place, where, undo = false, onClose, onChanged }: {
  target: InboxRow | null;
  place: ChatListPlace | null;
  where: NetworkWhere;
  undo?: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const styles = useStyles(makeStyles);
  const [data, setData] = useState<ChatListData | null>(null);

  useEffect(() => {
    setData(null);
    if (!target || !place) return;
    let active = true;
    void chatListOf(place).then(
      (kept) => active && setData(kept),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [target?.identity, place]);

  if (!target || !place) return null;
  const row = target;
  const id = row.identity;
  const matrixRoom = row.network === 'matrix' ? id.slice('matrix:'.length) : null;
  // A Matrix room is pinned as our favourite; the others here.
  const pinned = matrixRoom ? !!row.pinned : !!data && isPinnedHere(data, id);
  const archived = !!data && isArchived(data, id);

  function pin() {
    onClose();
    if (matrixRoom) {
      onAccount(where, () => matrixTag(matrixRoom, pinned ? null : 'favourite')).catch(notDone);
      return;
    }
    pinChat(place!, id, !pinned)
      .then((done) => {
        if (!done) throw new Error(t('At most {n} conversations stay pinned. Unpin one first.', { n: MAX_CHAT_PINS }));
      })
      .catch(notDone);
  }

  function archive() {
    onClose();
    const wasPinned = !matrixRoom && pinned;
    const was = data?.archived.find((mark) => mark.id === id)?.at ?? 0;
    archiveChat(place!, id, !archived)
      .then(() => {
        if (!undo) return;
        offerUndo(
          archived
            ? { text: t('Back in the list.'), undo: () => archiveChat(place!, id, true, was || Date.now()) }
            : {
                text: t('Archived. A new message from them brings it back.'),
                undo: async () => {
                  await archiveChat(place!, id, false);
                  if (wasPinned) await pinChat(place!, id, true);
                },
              },
        );
      })
      .catch(notDone);
  }

  function mute() {
    onClose();
    muteChat(row, !row.muted, place!, where)
      .then(() => onChanged?.())
      .catch(notDone);
  }

  const rows: { label: string; run: () => void; note?: string }[] = [
    { label: pinned ? t('Unpin') : t('Pin to the top'), run: pin, ...(matrixRoom ? { note: t('As your favourite on Matrix: your other Matrix apps show it so too.') } : {}) },
    { label: archived ? t('Unarchive') : t('Archive'), run: archive },
  ];
  if (canNotifyChats) rows.push({ label: row.muted ? t('Unmute this chat') : t('Mute this chat'), run: mute });

  return (
    <Sheet visible onClose={onClose} title={shownName(row)}>
      {rows.map((item) => (
        <Pressable key={item.label} accessibilityRole="button" disabled={!data} onPress={item.run} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text variant="bodyStrong" tone={data ? undefined : 'faint'}>
            {item.label}
          </Text>
          {item.note ? (
            <Text variant="caption" tone="muted">
              {item.note}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    row: { paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.md, gap: 2 },
    pressed: { backgroundColor: colors.surfacePressed },
  });
