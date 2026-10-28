import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Page, Row, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import type { MatrixMessage } from '../lib/matrix';
import { matrixLeave, matrixNow, matrixRead, matrixSend, onMatrixChange, runMatrix } from '../lib/matrix-store';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One Matrix chat (lib/matrix-store.ts): its messages, oldest first, and a field to write in.
// It is marked as not anonymous, and as not encrypted when the room is not. Opening it marks its
// messages read on the homeserver.

export default function MatrixChatScreen() {
  const router = useRouter();
  const { room: roomId } = useLocalSearchParams<{ room?: string }>();
  const [now, setNow] = useState(matrixNow());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    runMatrix();
    setNow(matrixNow());
    return onMatrixChange(() => setNow(matrixNow()));
  }, []);

  const state = now.state;
  const room = roomId && state ? state.rooms[roomId] : undefined;
  const count = room?.messages.length ?? 0;
  useEffect(() => {
    if (roomId && room?.unread) matrixRead(roomId).catch(() => undefined);
  }, [roomId, count, room?.unread]);

  if (!state || !room || !roomId) {
    return (
      <Page>
        <Text variant="title">Matrix</Text>
        <Text tone="muted">{now.loaded ? t('This Matrix chat is not here any more.') : ''}</Text>
      </Page>
    );
  }

  function send() {
    const text = draft.trim();
    if (!text || !roomId) return;
    setDraft('');
    setNote('');
    matrixSend(roomId, text).catch((error: unknown) => setNote(error instanceof Error ? error.message : String(error)));
  }

  return (
    <Page>
      <Text variant="title" numberOfLines={2}>
        {room.name}
      </Text>
      <Text variant="caption" tone="muted">
        {room.encrypted ? t('Matrix · encrypted, not anonymous') : t('Not encrypted: the Matrix server can read this chat.')}
      </Text>
      {room.messages.map((message) => (
        <Bubble key={message.id} message={message} mine={message.sender === state.userId} sender={room.members[message.sender]?.name || message.sender} />
      ))}
      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim()} onPress={send} />
      </Row>
      {note || now.problem ? <Text tone="muted">{note || now.problem}</Text> : null}
      <Button
        title={t('Leave')}
        kind="secondary"
        onPress={() =>
          ask(t('Leave this Matrix chat?'), t('You no longer get its messages, and it leaves your list. Someone in it can invite you again.'), [
            { text: t('Cancel'), style: 'cancel' },
            {
              text: t('Leave'),
              style: 'destructive',
              onPress: () =>
                void matrixLeave(roomId)
                  .then(() => router.back())
                  .catch((error: unknown) => setNote(error instanceof Error ? error.message : String(error))),
            },
          ])
        }
      />
    </Page>
  );
}

function Bubble({ message, mine, sender }: { message: MatrixMessage; mine: boolean; sender: string }) {
  const colors = useColors();
  const when = new Date(message.ts).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const status = message.state === 'sending' ? t('Sending…') : message.state === 'failed' ? t('Not sent.') : when;
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
      {!mine ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {sender}
        </Text>
      ) : null}
      {message.locked ? <Text tone="muted">{t('Locked: the key for this message has not come to this device.')}</Text> : <Text selectable>{message.text}</Text>}
      <Text variant="caption" tone="faint">
        {status}
      </Text>
    </View>
  );
}
