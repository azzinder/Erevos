// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FoundRow } from '../components/found-row';
import { Input, Page, Text } from '../components/ui';
import { canGroup, hasCore } from '../lib/core';
import { forwardTo } from '../lib/forward';
import { t } from '../lib/i18n';
import { shownName } from '../lib/inbox';
import { dropShared, handShared, isSharedPhoto, sharedFileOf, type SharedFile } from '../lib/share-in';
import { spaceChats } from '../lib/space-chats';
import { spaceGroups } from '../lib/space-groups';
import { loadInboxCache } from '../lock/inbox-cache';
import { currentSpace } from '../lock/keys';

// Send to: what another app shared with Erevos from its Share (lib/share-in.ts), opened once a
// space is open. The chats, groups and SMS conversations the home screen showed last come first, in
// its order, then every other chat and group of the space by name; never hidden chats. The one
// picked opens with the words in its message field, to read and send there, and a photo or file
// goes there at once. An SMS conversation takes only words.

type Target = { key: string; name: string; kind: 'chat' | 'group' | 'sms'; at: number; to: string; open: string };

const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function chatTarget(identity: string, name: string, at: number): Target {
  return { key: identity, name, kind: 'chat', at, to: `contact:${identity}`, open: `/chat?contact=${identity}` };
}

function groupTarget(id: string, name: string, at: number): Target {
  return { key: `group:${id}`, name, kind: 'group', at, to: `group:${id}`, open: `/group?id=${id}` };
}

function smsTarget(address: string, name: string, at: number): Target {
  return { key: `sms:${address}`, name, kind: 'sms', at, to: address, open: `/sms?to=${encodeURIComponent(address)}` };
}

export default function ShareScreen() {
  const params = useLocalSearchParams<{ text?: string; file?: string; name?: string; mime?: string; large?: string }>();
  const text = (params.text ?? '').trim();
  const file = useMemo(() => sharedFileOf(params), [params.file, params.name, params.mime]);
  const large = params.large === '1';
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [query, setQuery] = useState('');
  // Whether the photo or file was handed on: if not, its copy goes as Send to closes.
  const handed = useRef(false);

  useEffect(() => {
    handed.current = false;
    return () => {
      if (file && !handed.current) dropShared(file);
    };
  }, [file]);

  useEffect(() => {
    let active = true;
    const { space, key } = currentSpace();
    void Promise.all([
      loadInboxCache(space, key).catch(() => ({ rows: [] })),
      hasCore() ? spaceChats().catch(() => null) : null,
      hasCore() && canGroup() ? spaceGroups().catch(() => null) : null,
    ]).then(([cache, chats, groups]) => {
      if (!active) return;
      const contacts = (chats?.e2e.contacts() ?? []).filter((c) => !c.request);
      const listed = (groups?.list() ?? []).filter((g) => g.status === 'in');
      const recent: Target[] = [];
      for (const row of cache.rows) {
        if (row.identity.startsWith('sms:')) recent.push(smsTarget(row.identity.slice(4), shownName(row), row.at));
        else if (row.identity.startsWith('group:')) {
          const group = listed.find((g) => `group:${g.id}` === row.identity);
          if (group) recent.push(groupTarget(group.id, group.name, row.at));
        } else {
          const contact = contacts.find((c) => c.identity === row.identity);
          if (contact) recent.push(chatTarget(contact.identity, shownName(contact), row.at));
        }
      }
      const shown = new Set(recent.map((r) => r.key));
      const rest = [
        ...contacts.filter((c) => !shown.has(c.identity)).map((c) => chatTarget(c.identity, shownName(c), 0)),
        ...listed.filter((g) => !shown.has(`group:${g.id}`)).map((g) => groupTarget(g.id, g.name, 0)),
      ].sort((a, b) => a.name.localeCompare(b.name));
      setTargets([...recent, ...rest]);
    });
    return () => {
      active = false;
    };
  }, []);

  const what = file ? (isSharedPhoto(file) ? t('A photo: {name}', { name: file.name }) : t('A file: {name}', { name: file.name })) : text;
  const q = plain(query.trim());
  const shown = (targets ?? []).filter((target) => (!file || target.kind !== 'sms') && (!q || plain(target.name).includes(q)));
  const kindOf = (target: Target) => (target.kind === 'group' ? t('Group') : target.kind === 'sms' ? t('SMS') : t('Erevos chat'));

  function choose(target: Target) {
    if (text) forwardTo(target.to, { text, photo: null });
    if (file) {
      handed.current = true;
      handShared(target.to, file);
    }
    router.replace(target.open);
  }

  return (
    <Page>
      <Text variant="title">{t('Send to')}</Text>
      {large ? <Text tone="muted">{t('Not sent. Files can be 100 MB at most.')}</Text> : null}
      {what ? (
        <Text numberOfLines={4} tone="muted">
          {what}
        </Text>
      ) : !large ? (
        <Text tone="muted">{t('Nothing came to send.')}</Text>
      ) : null}
      {what ? (
        <>
          <Input value={query} onChangeText={setQuery} placeholder={t('Search chats')} accessibilityLabel={t('Search chats')} />
          <Text variant="caption" tone="muted">
            {file
              ? t('The photo or file goes as soon as the chat or group you pick opens. Never to hidden chats, nor as an SMS.')
              : t('It opens in the chat, group or SMS conversation you pick, in the message field, to read and send there. Never in hidden chats.')}
          </Text>
          {targets && shown.length === 0 ? <Text tone="muted">{t('No chat matches.')}</Text> : null}
          {shown.map((target) => (
            <FoundRow key={target.key} name={target.name} line={kindOf(target)} at={target.at} now={Date.now()} onPress={() => choose(target)} />
          ))}
        </>
      ) : null}
    </Page>
  );
}
