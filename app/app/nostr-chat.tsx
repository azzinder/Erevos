import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { NetworkChatNotify, useNetworkChatShown } from '../components/network-chat-notify';
import { Button, Input, Page, Row, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { nameOf, npubOf, shortNpub, type NostrDmMessage } from '../lib/nostr-dm';
import { nostrDmForgetChat, nostrDmFreshen, nostrDmNow, nostrDmRead, nostrDmRename, nostrDmRetry, nostrDmSend, nostrDmSetNotify, onNostrDmChange, runNostrDm } from '../lib/nostr-dm-store';
import { checkedChatNotify } from '../lock/chat-notify';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One chat with someone on another Nostr app (lib/nostr-dm-store.ts): its messages, oldest first,
// and a field to write in. It is marked as not anonymous. Opening it, with Erevos on the screen,
// marks its messages read here only (NIP-17 tells the other app nothing), and looks up again, once
// a week, where they take messages and the name they gave themselves. A name given here shows in
// place of theirs. While it shows, what comes in it only sounds, and it can be muted or given a
// sound of its own (components/network-chat-notify.tsx).

export default function NostrChatScreen() {
  const router = useRouter();
  const { key: given } = useLocalSearchParams<{ key?: string }>();
  const key = given && /^[0-9a-f]{64}$/.test(given) ? given : undefined;
  const [now, setNow] = useState(nostrDmNow());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [naming, setNaming] = useState<string | null>(null);

  useEffect(() => {
    runNostrDm();
    setNow(nostrDmNow());
    return onNostrDmChange(() => setNow(nostrDmNow()));
  }, []);

  const state = now.state;
  const chat = key && state ? state.chats[key] : undefined;
  const count = chat?.messages.length ?? 0;
  const shown = useNetworkChatShown(key ? `nostr:${key}` : undefined);
  useEffect(() => {
    if (shown && key && chat?.unread) nostrDmRead(key).catch(() => undefined);
  }, [shown, key, count, chat?.unread]);
  useEffect(() => {
    if (key && chat) nostrDmFreshen(key);
  }, [key, !!chat]);

  if (!state || !key || !chat) {
    return (
      <Page>
        <Text variant="title">{t('Nostr chats')}</Text>
        <Text tone="muted">{now.loaded ? t('This Nostr chat is not here any more.') : ''}</Text>
      </Page>
    );
  }

  const fail = (error: unknown) => setNote(error instanceof Error ? error.message : String(error));

  function send() {
    const text = draft.trim();
    if (!text || !key) return;
    setDraft('');
    setNote('');
    nostrDmSend(key, text).catch(fail);
  }

  const self = key === state.public;
  const npub = npubOf(key);
  const name = self ? t('Chat with myself') : nameOf(state, key) || shortNpub(npub);
  return (
    <Page>
      <Text variant="title" numberOfLines={2}>
        {name}
      </Text>
      <Text selectable variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
        {npub}
      </Text>
      <Text variant="caption" tone="muted">
        {t('Nostr · encrypted (NIP-17), not anonymous')}
      </Text>

      {chat.messages.map((message) => (
        <Bubble key={message.id} message={message} onRetry={() => nostrDmRetry(key, message.id).catch(fail)} />
      ))}

      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim()} onPress={send} />
      </Row>
      {note ? <Text tone="muted">{note}</Text> : null}
      <NetworkChatNotify notify={checkedChatNotify(chat.notify)} onChange={(next) => nostrDmSetNotify(key, next)} />

      {self ? null : naming === null ? (
        <Button title={t('Name them here')} kind="secondary" compact onPress={() => setNaming(chat.name ?? '')} />
      ) : (
        <View style={{ gap: space.xs }}>
          <Row>
            <Input style={{ flex: 1 }} value={naming} onChangeText={setNaming} maxLength={64} placeholder={state.people[key]?.name || shortNpub(npub)} accessibilityLabel={t('Name them here')} />
            <Button
              title={t('Save')}
              compact
              onPress={() =>
                void nostrDmRename(key, naming)
                  .then(() => setNaming(null))
                  .catch(fail)
              }
            />
          </Row>
          <Text variant="caption" tone="faint">
            {t('Only in this space: they are not told. Empty, it shows the name they gave themselves.')}
          </Text>
        </View>
      )}

      <Button
        title={t('Remove this chat')}
        kind="secondary"
        onPress={() =>
          ask(t('Remove this chat?'), t('Its messages are removed from this phone. The other person keeps theirs, and a new message from them starts the chat again.'), [
            { text: t('Cancel'), style: 'cancel' },
            {
              text: t('Remove'),
              style: 'destructive',
              onPress: () =>
                void nostrDmForgetChat(key)
                  .then(() => router.back())
                  .catch(fail),
            },
          ])
        }
      />
    </Page>
  );
}

function Bubble({ message, onRetry }: { message: NostrDmMessage; onRetry: () => void }) {
  const colors = useColors();
  const mine = message.mine;
  const when = new Date(message.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // NIP-17 says nothing back: one tick once a relay of theirs took it, no more.
  const status = message.state === 'sending' ? t('Sending…') : message.state === 'failed' ? t('Not sent.') : `${when}${mine ? ' ✓' : ''}`;
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        padding: space.sm + 2,
        borderRadius: radius.md,
        backgroundColor: mine ? colors.primarySoft : colors.surfaceAlt,
        gap: 2,
      }}
    >
      {message.file ? <Text tone="muted">{t('A file: Erevos cannot open files sent this way yet.')}</Text> : <Text selectable>{message.text}</Text>}
      <Text variant="caption" tone="faint">
        {status}
      </Text>
      {message.state === 'failed' ? <Button title={t('Try again')} kind="secondary" compact onPress={onRetry} /> : null}
    </View>
  );
}
