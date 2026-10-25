import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { FoundRow } from '../components/found-row';
import { Page, Text } from '../components/ui';
import { hasCore } from '../lib/core';
import { t } from '../lib/i18n';
import { shownName } from '../lib/inbox';
import { canGroup } from '../lib/core';
import { foundAt, foundName, groupFindables, starredOf, type Found } from '../lib/message-search';
import { spaceChats } from '../lib/space-chats';
import { spaceGroups } from '../lib/space-groups';

// The starred messages of the open space's chats and groups, the latest first, from the home
// screen's menu: a tap opens the chat at the message. A message is starred, or not, from its menu in the chat
// (held down), on this phone only. Hidden chats' starred messages are in each chat's details.

const CONTACT_PREFIX = 'contact:';

export default function StarredScreen() {
  const [found, setFound] = useState<Found[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasCore()) {
        setFound([]);
        return;
      }
      void Promise.all([spaceChats(), canGroup() ? spaceGroups().catch(() => null) : null])
        .then(([{ e2e, history }, groups]) => {
          if (!active) return;
          const listed = groups?.list() ?? [];
          setNames(
            new Map([
              ...e2e.contacts().map((c): [string, string] => [`${CONTACT_PREFIX}${c.identity}`, shownName(c)]),
              ...listed.map((g): [string, string] => [`group:${g.id}`, g.name]),
            ]),
          );
          const said = listed.filter((g) => !g.locked).flatMap((g) => groupFindables(g.id, groups!.messages(g.id)));
          // None from a chat locked with its PIN: it shows them once opened with it.
          const locked = new Set(e2e.contacts().filter((c) => c.locked).map((c) => `${CONTACT_PREFIX}${c.identity}`));
          setFound(starredOf([...history.messages().filter((m) => !locked.has(m.peer)), ...said]));
        })
        .catch(() => active && setFound([]));
      return () => {
        active = false;
      };
    }, []),
  );

  const nameOf = (peer: string) => names.get(peer) ?? shownName({ identity: peer.slice(CONTACT_PREFIX.length), name: '' });
  const now = Date.now();

  return (
    <Page>
      <Text variant="title">{t('Starred messages')}</Text>
      {found && found.length === 0 ? (
        <Text tone="muted">{t('No starred messages. Press and hold a message in a chat, then tap Star.')}</Text>
      ) : null}
      {(found ?? []).map((m) => (
        <FoundRow
          key={`${m.peer}|${m.tag}`}
          name={foundName(m, nameOf(m.peer))}
          line={m.line}
          at={m.at}
          now={now}
          starred
          onPress={() => router.push(foundAt(m))}
        />
      ))}
    </Page>
  );
}
