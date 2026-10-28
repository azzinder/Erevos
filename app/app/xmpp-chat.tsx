import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { isXmppId, nameOf, xmppDevices, type XmppMessage } from '../lib/xmpp';
import { fingerprint, NoOmemoError } from '../lib/xmpp-omemo';
import { onXmppChange, runXmpp, xmppForgetChat, xmppNow, xmppRead, xmppSend, xmppSetPlain } from '../lib/xmpp-store';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One XMPP chat (lib/xmpp-store.ts): its messages, oldest first, and a field to write in. It is
// marked as not anonymous, and as not encrypted when the person's apps have no OMEMO and the chat
// was chosen to go without it. Opening it marks its messages read, and tells the other person's app
// when it asked. The keys of their devices are listed below, to compare with them.

const MARKS = { sent: '✓', received: '✓✓', read: '✓✓✓' } as const;

export default function XmppChatScreen() {
  const router = useRouter();
  const { jid: given } = useLocalSearchParams<{ jid?: string }>();
  const jid = given?.toLowerCase();
  const [now, setNow] = useState(xmppNow());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  // The text that could not be sent with OMEMO, kept while the person decides about writing without it.
  const [unsent, setUnsent] = useState<string | null>(null);

  useEffect(() => {
    runXmpp();
    setNow(xmppNow());
    return onXmppChange(() => setNow(xmppNow()));
  }, []);

  const state = now.state;
  const chat = jid && state ? state.chats[jid] : undefined;
  const count = chat?.messages.length ?? 0;
  useEffect(() => {
    if (jid && chat?.unread) xmppRead(jid).catch(() => undefined);
  }, [jid, count, chat?.unread]);

  if (!state || !jid || !isXmppId(jid)) {
    return (
      <Page>
        <Text variant="title">XMPP</Text>
        <Text tone="muted">{now.loaded ? t('This XMPP chat is not here any more.') : ''}</Text>
      </Page>
    );
  }

  const fail = (error: unknown) => setNote(error instanceof Error ? error.message : String(error));

  async function send(text: string) {
    if (!jid) return;
    setNote('');
    try {
      await xmppSend(jid, text);
    } catch (error) {
      // Their apps have no OMEMO: the text waits for the person to say whether to write without it.
      if (error instanceof NoOmemoError) setUnsent(text);
      fail(error);
    }
  }

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void send(text);
  }

  const name = nameOf(state, jid);
  const plain = !!chat?.plain;
  const devices = xmppDevices(state, jid);
  return (
    <Page>
      <Text variant="title" numberOfLines={2}>
        {name}
      </Text>
      <Text variant="caption" tone="muted">
        {jid}
      </Text>
      <Text variant="caption" tone="muted">
        {plain ? t('Not encrypted: the XMPP server can read this chat.') : t('XMPP · encrypted with OMEMO, not anonymous')}
      </Text>
      {plain ? <Button title={t('Encrypt again')} kind="secondary" compact onPress={() => xmppSetPlain(jid, false).catch(fail)} /> : null}

      {(chat?.messages ?? []).map((message) => (
        <Bubble key={message.id} message={message} />
      ))}

      {unsent !== null ? (
        <Card>
          <Text>{t('{name} has no app with OMEMO that Erevos can find. You can write to them without encryption: the XMPP server, and anyone who can read what passes through it, can then read it.', { name })}</Text>
          <Row wrap>
            <Button
              title={t('Write without encryption')}
              compact
              onPress={() => {
                const text = unsent;
                setUnsent(null);
                setNote('');
                xmppSetPlain(jid, true)
                  .then(() => send(text))
                  .catch(fail);
              }}
            />
            <Button
              title={t('Cancel')}
              kind="secondary"
              compact
              onPress={() => {
                setDraft(unsent);
                setUnsent(null);
                setNote('');
              }}
            />
          </Row>
        </Card>
      ) : null}

      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim()} onPress={submit} />
      </Row>
      {note || now.problem ? <Text tone="muted">{note || now.problem}</Text> : null}

      {devices.length ? (
        <>
          <SectionTitle title={t('Their keys')} />
          <Card>
            <Text tone="muted">{t('Compare these with what their app shows, by another way than this chat, to be sure nobody sits in between.')}</Text>
            {devices.map((device) => (
              <View key={device.id} style={{ gap: 2 }}>
                <Text selectable variant="bodyStrong" style={{ fontFamily: 'monospace' }}>
                  {device.identity ? fingerprint(device.identity) : t('Not seen yet')}
                </Text>
                {device.changed ? (
                  <Text variant="caption" tone="muted">
                    {t('This key changed since it was first seen.')}
                  </Text>
                ) : null}
                {!device.listed ? (
                  <Text variant="caption" tone="faint">
                    {t('No longer in their device list.')}
                  </Text>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Button
        title={t('Remove this chat')}
        kind="secondary"
        onPress={() =>
          ask(t('Remove this chat?'), t('Its messages are removed from this phone. The contact stays in your XMPP account, and the other person keeps theirs.'), [
            { text: t('Cancel'), style: 'cancel' },
            {
              text: t('Remove'),
              style: 'destructive',
              onPress: () =>
                void xmppForgetChat(jid)
                  .then(() => router.back())
                  .catch(fail),
            },
          ])
        }
      />
    </Page>
  );
}

function Bubble({ message }: { message: XmppMessage }) {
  const colors = useColors();
  const mine = message.mine;
  const when = new Date(message.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const status =
    message.state === 'sending'
      ? t('Sending…')
      : message.state === 'failed'
        ? t('Not sent.')
        : `${when}${mine && message.state ? ` ${MARKS[message.state]}` : ''}`;
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
      {message.locked ? <Text tone="muted">{t('Locked: this message could not be opened on this device.')}</Text> : <Text selectable>{message.text}</Text>}
      <Text variant="caption" tone="faint">
        {status}
        {!message.encrypted && !message.locked ? ` · ${t('not encrypted')}` : ''}
      </Text>
    </View>
  );
}
