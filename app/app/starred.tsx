import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Page, Text } from '../components/ui';
import { hasCore } from '../lib/core';
import { t } from '../lib/i18n';
import { rowTime, shownName } from '../lib/inbox';
import { starredOf, type Found } from '../lib/message-search';
import { spaceChats } from '../lib/space-chats';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// The starred messages of the open space's chats, the latest first, from the home screen's menu: a
// tap opens the chat at the message. A message is starred, or not, from its menu in the chat
// (held down), on this phone only. Hidden chats' starred messages are in each chat's details.

const CONTACT_PREFIX = 'contact:';

export default function StarredScreen() {
  const colors = useColors();
  const [found, setFound] = useState<Found[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasCore()) {
        setFound([]);
        return;
      }
      void spaceChats()
        .then(({ e2e, history }) => {
          if (!active) return;
          setNames(new Map(e2e.contacts().map((c) => [`${CONTACT_PREFIX}${c.identity}`, shownName(c)])));
          setFound(starredOf(history.messages()));
        })
        .catch(() => active && setFound([]));
      return () => {
        active = false;
      };
    }, []),
  );

  const open = (m: Found) => {
    if (m.peer.startsWith(CONTACT_PREFIX)) router.push(`/chat?contact=${m.peer.slice(CONTACT_PREFIX.length)}&at=${m.tag}`);
  };
  const nameOf = (peer: string) => names.get(peer) ?? shownName({ identity: peer.slice(CONTACT_PREFIX.length), name: '' });
  const now = Date.now();

  return (
    <Page>
      <Text variant="title">{t('Starred messages')}</Text>
      {found && found.length === 0 ? (
        <Text tone="muted">{t('No starred messages. Press and hold a message in a chat, then tap Star.')}</Text>
      ) : null}
      {(found ?? []).map((m) => (
        <Pressable
          key={`${m.peer}|${m.tag}`}
          onPress={() => open(m)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            gap: 2,
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          })}
        >
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {m.mine ? t('You to {name}', { name: nameOf(m.peer) }) : nameOf(m.peer)}
            </Text>
            <Text variant="caption" tone="muted">
              {rowTime(m.at, now)}
            </Text>
          </View>
          <Text numberOfLines={3}>★ {m.line}</Text>
        </Pressable>
      ))}
    </Page>
  );
}
