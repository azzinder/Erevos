import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { MatrixVerifyCard } from '../components/matrix-verify-card';
import { Button, Input, Page, Row, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { fileSize } from '../lib/attachments';
import { toBase64 } from '../lib/crypto';
import { t } from '../lib/i18n';
import type { MatrixFile, MatrixMessage } from '../lib/matrix';
import { MATRIX_MOST, MatrixFileTooLargeError, mimeOfName, type OutgoingFile } from '../lib/matrix-media';
import { matrixFile, matrixLeave, matrixNow, matrixRead, matrixSend, matrixSendFile, matrixVerifications, matrixVerify, onMatrixChange, runMatrix } from '../lib/matrix-store';
import { isVerified } from '../lib/matrix-verify';
import { pickFile, TooLargeError } from '../lib/pick-file';
import { pickPhoto } from '../lib/pick-photo';
import { saveBytes } from '../lib/save-file';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One Matrix chat (lib/matrix-store.ts): its messages, oldest first, and a field to write in.
// It is marked as not anonymous, and as not encrypted when the room is not. Opening it marks its
// messages read on the homeserver. Photos and files go encrypted when the room is
// (lib/matrix-media.ts); a photo is fetched only when tapped, so the homeserver does not learn
// which were looked at merely by scrolling.

export default function MatrixChatScreen() {
  const router = useRouter();
  const { room: roomId } = useLocalSearchParams<{ room?: string }>();
  const [now, setNow] = useState(matrixNow());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

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

  const fail = (error: unknown) => setNote(error instanceof Error ? error.message : String(error));
  // A chat with one person can check their devices by emoji; the latest check in it shows.
  const other = room.direct ? Object.keys(room.members).find((who) => who !== state.userId) : undefined;
  const check = matrixVerifications().find((v) => v.roomId === roomId);

  async function sendPicked(pick: () => Promise<OutgoingFile | null>) {
    if (!roomId || sending) return;
    setNote('');
    setSending(true);
    try {
      const file = await pick();
      if (file) await matrixSendFile(roomId, file);
    } catch (error) {
      fail(error instanceof TooLargeError ? new MatrixFileTooLargeError() : error);
    } finally {
      setSending(false);
    }
  }

  const sendPhoto = () => sendPicked(() => pickPhoto('photos', 90));
  const sendAnyFile = () =>
    sendPicked(async () => {
      const picked = await pickFile(MATRIX_MOST);
      return picked ? { ...picked, mime: mimeOfName(picked.name) } : null;
    });

  return (
    <Page>
      <Text variant="title" numberOfLines={2}>
        {room.name}
      </Text>
      <Text variant="caption" tone="muted">
        {room.encrypted ? t('Matrix · encrypted, not anonymous') : t('Not encrypted: the Matrix server can read this chat.')}
      </Text>
      {other ? (
        isVerified(state, other) ? (
          <Text variant="caption" tone="muted">
            ✓ {t('Checked by emoji')}
          </Text>
        ) : !check || check.phase === 'done' || check.phase === 'cancelled' ? (
          <Row>
            <Button title={t('Check by emoji')} kind="secondary" compact onPress={() => matrixVerify(other, roomId).catch(fail)} />
          </Row>
        ) : null
      ) : null}
      {check ? <MatrixVerifyCard check={check} name={room.members[check.userId]?.name || check.userId} /> : null}
      {room.messages.map((message) => (
        <Bubble key={message.id} message={message} mine={message.sender === state.userId} sender={room.members[message.sender]?.name || message.sender} />
      ))}
      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim()} onPress={send} />
      </Row>
      <Row>
        <Button title={t('Photo')} kind="secondary" compact disabled={sending} onPress={() => void sendPhoto()} />
        <Button title={t('File')} kind="secondary" compact disabled={sending} onPress={() => void sendAnyFile()} />
        {sending ? <Text tone="muted">{t('Sending…')}</Text> : null}
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
      {message.locked ? (
        <Text tone="muted">{t('Locked: the key for this message has not come to this device.')}</Text>
      ) : message.file ? (
        <FilePart file={message.file} />
      ) : (
        <Text selectable>{message.text}</Text>
      )}
      <Text variant="caption" tone="faint">
        {status}
      </Text>
    </View>
  );
}

// A photo or file in a message: fetched only when asked for, a photo then shown, any file saved.
function FilePart({ file }: { file: MatrixFile }) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const fetchable = !!(file.encrypted || file.url);

  async function get(): Promise<Uint8Array | null> {
    if (bytes) return bytes;
    setBusy(true);
    setNote('');
    try {
      const got = await matrixFile(file);
      setBytes(got);
      return got;
    } catch (error) {
      setNote(error instanceof Error ? error.message : t('The file could not be fetched.'));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const got = await get();
    if (!got) return;
    try {
      if (await saveBytes(file.name, file.mime, got)) setNote(t('Saved.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  const photo = file.kind === 'image' && bytes;
  const ratio = file.w && file.h ? file.w / file.h : 4 / 3;
  return (
    <View style={{ gap: space.xs }}>
      {photo ? (
        <Image
          source={{ uri: `data:${file.mime.startsWith('image/') ? file.mime : 'image/jpeg'};base64,${toBase64(bytes)}` }}
          style={{ width: 240, height: 240 / ratio, borderRadius: radius.sm }}
          resizeMode="contain"
          accessibilityLabel={file.name}
        />
      ) : (
        <Text numberOfLines={2}>
          {file.name}
          {file.size ? ` · ${fileSize(file.size)}` : ''}
        </Text>
      )}
      {fetchable ? (
        <Row>
          {file.kind === 'image' && !bytes ? <Button title={t('Show photo')} compact disabled={busy} onPress={() => void get()} /> : null}
          <Button title={t('Save')} kind="secondary" compact disabled={busy} onPress={() => void save()} />
        </Row>
      ) : null}
      {busy ? <Text variant="caption" tone="muted">{t('Fetching…')}</Text> : null}
      {note ? <Text variant="caption" tone="muted">{note}</Text> : null}
    </View>
  );
}
