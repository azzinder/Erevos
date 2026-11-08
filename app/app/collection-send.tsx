// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { FoundRow } from '../components/found-row';
import { Button, Input, Page, Text } from '../components/ui';
import { copyToSend } from '../lib/collection-out';
import { forwardTo } from '../lib/forward';
import { hiddenCollection } from '../lib/collection-place';
import { enterHiddenScreen, hiddenScreens, useOpenHiddenPlace } from '../lib/hidden-contacts';
import { collectionIds, hiddenTargets, type HiddenTarget } from '../lib/hidden-send';
import { t } from '../lib/i18n';
import { handShared, type SharedFile } from '../lib/share-in';
import { loadCollection, type CollectionItem } from '../lock/collection-data';
import { useColors } from '../theme/context';

// Send to, for a hidden place's Collection: Send to… (app/share.tsx) never reaches hidden chats,
// so the files chosen in the Collection of the hidden place open now (app/collection.tsx with
// `hidden`) are sent from here, to one of that hidden place's own contacts or groups only, which
// the place lends while it is open (lib/hidden-contacts.ts). Nothing of the space's chats is read
// here, and the space's Send to never reads a hidden place's Collection. A file other than a photo
// is handed as a source read from its encrypted chunks (lib/collection-out.ts); the chat or group
// picked opens in the hidden chats and sends it, as a photo or file picked there would. A radio
// station's or TV channel's name and link (`text`, components/collection-radio.tsx sendLinkToChat)
// go the same way, to the same chats only: a contact's chat sends it as a message once it opens,
// a group's has it ready to send.

/** The most of a text sent from here: a name and a link. */
const MOST_TEXT = 2200;

export default function CollectionSendScreen() {
  const params = useLocalSearchParams<{ collection?: string; text?: string }>();
  const text = String(params.text ?? '').trim().slice(0, MOST_TEXT);
  const colors = useColors();
  const open = useOpenHiddenPlace();
  const [sending, setSending] = useState<CollectionItem[] | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => enterHiddenScreen(), []);

  // The files of the hidden place's Collection asked to be sent, those that are still there.
  useEffect(() => {
    if (!open) return;
    const ids = new Set(collectionIds(String(params.collection ?? '')));
    let active = true;
    void loadCollection(hiddenCollection(open))
      .then((c) => active && setSending(c.items.filter((i) => ids.has(i.id))))
      .catch(() => active && setSending([]));
    return () => {
      active = false;
    };
  }, [open, params.collection]);

  useEffect(() => {
    if (!open?.groups) return;
    let active = true;
    void open.groups().then(
      (list) => active && setGroups(list),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [open]);

  const targets = useMemo(() => hiddenTargets(open?.erevos() ?? [], groups, query), [open, groups, query]);

  async function choose(target: HiddenTarget) {
    if (!open || busy) return;
    if (text) {
      forwardTo(target.to, { text, photo: null });
      if (target.kind === 'group') open.openGroup?.(target.to.slice('group:'.length));
      else open.open(target.to.slice('contact:'.length));
      router.dismiss(hiddenScreens());
      return;
    }
    if (!sending || sending.length === 0) return;
    setBusy(true);
    try {
      const copies: SharedFile[] = [];
      for (const item of sending) copies.push(await copyToSend(item));
      handShared(target.to, copies);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
      setBusy(false);
      return;
    }
    if (target.kind === 'group') open.openGroup?.(target.to.slice('group:'.length));
    else open.open(target.to.slice('contact:'.length));
    // Back to the hidden chats, over which the Collection and this screen lie.
    router.dismiss(hiddenScreens());
  }

  if (!open) {
    return (
      <Page>
        <Text tone="muted">{t('The hidden chats are closed.')}</Text>
        <Button title={t('Back')} kind="secondary" compact onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Page>
    );
  }

  return (
    <Page>
      <Text variant="title">{t('Send to')}</Text>
      {note ? <Text color={colors.warning}>{note}</Text> : null}
      {text ? (
        <Text numberOfLines={4} tone="muted">
          {text}
        </Text>
      ) : sending && sending.length > 0 ? (
        <Text numberOfLines={4} tone="muted">
          {sending.map((i) => i.file.name).join(', ')}
        </Text>
      ) : sending ? (
        <Text tone="muted">{t('Nothing came to send.')}</Text>
      ) : null}
      {text || (sending && sending.length > 0) ? (
        <>
          <Input value={query} onChangeText={setQuery} placeholder={t('Search chats')} accessibilityLabel={t('Search chats')} />
          <Text variant="caption" tone="muted">
            {text
              ? t('The name and link go to the chat or group you pick: a chat sends them as it opens, a group has them ready to send. Only the chats of this hidden place are listed.')
              : t('The files go as soon as the chat or group you pick opens. Only the chats of this hidden place are listed.')}
          </Text>
          {targets.length === 0 ? <Text tone="muted">{t('No chat matches.')}</Text> : null}
          {targets.map((target) => (
            <FoundRow key={target.key} name={target.name} line={target.kind === 'group' ? t('Group') : t('Erevos chat')} at={0} now={Date.now()} onPress={() => void choose(target)} />
          ))}
        </>
      ) : null}
    </Page>
  );
}
