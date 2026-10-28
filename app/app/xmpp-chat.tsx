import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { NetworkChatNotify, useNetworkChatShown } from '../components/network-chat-notify';
import { NetworkFile } from '../components/network-file';
import { PhoneSign, ShortcutTile, VideoSign } from '../components/shortcut-tile';
import { Button, Card, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { currentCall } from '../lib/call';
import { shownLine } from '../lib/call-lines';
import { callPermissions } from '../lib/call-permissions';
import { currentGroupCall } from '../lib/group-call';
import { t } from '../lib/i18n';
import { mimeOfName } from '../lib/matrix-media';
import { pickFile } from '../lib/pick-file';
import { pickPhoto } from '../lib/pick-photo';
import { rtc } from '../lib/webrtc';
import { isXmppId, nameOf, xmppDevices, type XmppMessage } from '../lib/xmpp';
import { startXmppCall } from '../lib/xmpp-calls';
import { XMPP_FILE_MOST } from '../lib/xmpp-files';
import { fingerprint, NoOmemoError } from '../lib/xmpp-omemo';
import {
  onXmppChange,
  runXmpp,
  xmppFile,
  xmppForgetChat,
  xmppNow,
  xmppRead,
  xmppSend,
  xmppSendFile,
  xmppSetNotify,
  xmppSetPlain,
  type XmppOutgoingFile,
} from '../lib/xmpp-store';
import { checkedChatNotify } from '../lock/chat-notify';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One XMPP chat (lib/xmpp-store.ts): its messages, oldest first, and a field to write in. It is
// marked as not anonymous, and as not encrypted when the person's apps have no OMEMO and the chat
// was chosen to go without it. Opening it, with Erevos on the screen, marks its messages read, and
// tells the other person's app when it asked; while it shows, what comes in it only sounds, and it
// can be muted or given sounds of its own (components/network-chat-notify.tsx). Photo and File send
// one through the server's HTTP upload, encrypted as the chat is (lib/xmpp-files.ts). The keys of
// their devices are listed below, to compare with them. The two tiles at the top call them
// (lib/xmpp-calls.ts), on the same call screen as Erevos's own calls.

const MARKS = { sent: '✓', received: '✓✓', read: '✓✓✓' } as const;

export default function XmppChatScreen() {
  const router = useRouter();
  const { jid: given } = useLocalSearchParams<{ jid?: string }>();
  const jid = given?.toLowerCase();
  const [now, setNow] = useState(xmppNow());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  // What could not be sent with OMEMO, a text or a file, kept while the person decides about writing without it.
  const [unsent, setUnsent] = useState<{ text: string } | { file: XmppOutgoingFile } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    runXmpp();
    setNow(xmppNow());
    return onXmppChange(() => setNow(xmppNow()));
  }, []);

  const state = now.state;
  const chat = jid && state ? state.chats[jid] : undefined;
  const count = chat?.messages.length ?? 0;
  const shown = useNetworkChatShown(jid ? `xmpp:${jid}` : undefined);
  useEffect(() => {
    if (shown && jid && chat?.unread) xmppRead(jid).catch(() => undefined);
  }, [shown, jid, count, chat?.unread]);

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
      // Their apps have no OMEMO: the text waits for the person to say whether to write without it,
      // which the card below explains.
      if (error instanceof NoOmemoError) setUnsent({ text });
      else fail(error);
    }
  }

  async function sendFile(file: XmppOutgoingFile) {
    if (!jid) return;
    setNote('');
    setSending(true);
    try {
      await xmppSendFile(jid, file);
    } catch (error) {
      if (error instanceof NoOmemoError) setUnsent({ file });
      else fail(error);
    } finally {
      setSending(false);
    }
  }

  async function sendPicked(pick: () => Promise<XmppOutgoingFile | null>) {
    try {
      const file = await pick();
      if (file) await sendFile(file);
    } catch (error) {
      fail(error);
    }
  }
  const sendPhoto = () =>
    sendPicked(async () => {
      const photo = await pickPhoto('photos', 90);
      return photo ? { bytes: photo.bytes, name: photo.name, mime: photo.mime } : null;
    });
  const sendAnyFile = () =>
    sendPicked(async () => {
      const picked = await pickFile(XMPP_FILE_MOST);
      return picked ? { ...picked, mime: mimeOfName(picked.name) } : null;
    });

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void send(text);
  }

  async function call(video: boolean) {
    if (!jid) return;
    setNote('');
    if (currentCall() || currentGroupCall()) {
      setNote(t('There is a call already.'));
      return;
    }
    if (!(await callPermissions(video))) {
      setNote(video ? t('A video call needs the camera and the microphone.') : t('A call needs the microphone.'));
      return;
    }
    await startXmppCall(jid, video, rtc).catch(fail);
  }

  const name = nameOf(state, jid);
  const plain = !!chat?.plain;
  const devices = xmppDevices(state, jid);
  return (
    <Page>
      <Row>
        <Text variant="title" numberOfLines={2} style={{ flex: 1 }}>
          {name}
        </Text>
        <ShortcutTile label={t('Video call')} tint="blue" onPress={() => void call(true)}>
          <VideoSign />
        </ShortcutTile>
        <ShortcutTile label={t('Voice call')} tint="green" onPress={() => void call(false)}>
          <PhoneSign />
        </ShortcutTile>
      </Row>
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
                const held = unsent;
                setUnsent(null);
                setNote('');
                xmppSetPlain(jid, true)
                  .then(() => ('text' in held ? send(held.text) : sendFile(held.file)))
                  .catch(fail);
              }}
            />
            <Button
              title={t('Cancel')}
              kind="secondary"
              compact
              onPress={() => {
                if ('text' in unsent) setDraft(unsent.text);
                setUnsent(null);
                setNote('');
              }}
            />
          </Row>
        </Card>
      ) : null}

      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim() || unsent !== null} onPress={submit} />
      </Row>
      <Row>
        <Button title={t('Photo')} kind="secondary" compact disabled={sending || unsent !== null} onPress={() => void sendPhoto()} />
        <Button title={t('File')} kind="secondary" compact disabled={sending || unsent !== null} onPress={() => void sendAnyFile()} />
        {sending ? <Text tone="muted">{t('Sending…')}</Text> : null}
      </Row>
      {note || now.problem ? <Text tone="muted">{note || now.problem}</Text> : null}
      <NetworkChatNotify notify={checkedChatNotify(chat?.notify)} onChange={(next) => xmppSetNotify(jid, next)} />

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
  // A call's line: kept in English, shown in the app's language, with no marks.
  if (message.call) {
    return (
      <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: space.sm + 2, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, gap: 2 }}>
        <Text>{shownLine(message.text)}</Text>
        <Text variant="caption" tone="faint">
          {when}
        </Text>
      </View>
    );
  }
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
      {message.locked ? (
        <Text tone="muted">{t('Locked: this message could not be opened on this device.')}</Text>
      ) : message.file ? (
        <NetworkFile name={message.file.name} type={message.file.type} size={message.file.size} fetch={() => xmppFile(message.file!)} />
      ) : (
        <Text selectable>{message.text}</Text>
      )}
      <Text variant="caption" tone="faint">
        {status}
        {!message.encrypted && !message.locked ? ` · ${t('not encrypted')}` : ''}
      </Text>
    </View>
  );
}
