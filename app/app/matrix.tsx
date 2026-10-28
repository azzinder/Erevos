import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MatrixVerifyCard } from '../components/matrix-verify-card';
import { Button, Card, Field, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { canMatrix, canTor } from '../lib/core';
import { t } from '../lib/i18n';
import { isMatrixId, matrixThroughTor, roomList, type MatrixRoom, type MatrixState } from '../lib/matrix';
import {
  matrixJoin,
  matrixLeave,
  matrixNow,
  matrixRecoveryInfo,
  matrixSetUpRecovery,
  matrixSignIn,
  matrixUnlock,
  matrixSignOut,
  matrixStartChat,
  matrixVerifications,
  matrixVerify,
  onMatrixChange,
  runMatrix,
} from '../lib/matrix-store';
import { onTorReady } from '../lib/relay';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// The space's Matrix account (lib/matrix-store.ts, docs/matrix.md), under Settings → Relay and
// networks → Matrix: signing in, then its chats, invites first, a new chat with a Matrix ID, and
// signing out. Each chat opens in app/matrix-chat.tsx. Every view says these chats are not
// anonymous.

export default function MatrixScreen() {
  const router = useRouter();
  const [now, setNow] = useState(matrixNow());
  const [who, setWho] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [newId, setNewId] = useState('');

  useEffect(() => {
    runMatrix();
    setNow(matrixNow());
    const stop = onMatrixChange(() => setNow(matrixNow()));
    const stopTor = onTorReady(() => setNow(matrixNow()));
    return () => {
      stop();
      stopTor();
    };
  }, []);

  if (!canMatrix()) {
    return (
      <Page>
        <Text variant="title">Matrix</Text>
        <Text tone="muted">{t('This build of Erevos has no Matrix yet. It comes with the next build of the app.')}</Text>
      </Page>
    );
  }

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setNote('');
    try {
      await work();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const about = (
    <Text tone="muted">
      {t('Chat with people on Matrix, who use Element or another Matrix app. Messages are end-to-end encrypted, but these chats are not anonymous: the Matrix server sees who talks with whom, and when.')}
    </Text>
  );

  // Matrix follows the space's Tor way (lib/matrix.ts): the server sees this phone's address only without it.
  const tor = canTor() ? (
    <Text variant="caption" tone="muted">
      {matrixThroughTor()
        ? t('Through Tor: the Matrix server does not see your address.')
        : t('Not through Tor now: the Matrix server sees your address. Tor is under Settings → Relay and networks → Tor.')}
    </Text>
  ) : null;

  const { loaded, state, problem } = now;
  if (!loaded) {
    return (
      <Page>
        <Text variant="title">Matrix</Text>
        {about}
      </Page>
    );
  }

  if (!state) {
    return (
      <Page>
        <Text variant="title">Matrix</Text>
        {about}
        <Card>
          <Field label={t('Matrix ID')}>
            <Input value={who} onChangeText={setWho} autoCapitalize="none" autoCorrect={false} placeholder="@name:matrix.org" accessibilityLabel={t('Matrix ID')} />
          </Field>
          <Field label={t('Password')}>
            <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Password')} />
          </Field>
          <Field label={t('Server')} hint={t('Only when it is not the one in your Matrix ID.')}>
            <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="matrix.org" accessibilityLabel={t('Server')} />
          </Field>
          <Button
            title={busy ? t('Signing in…') : t('Sign in')}
            loading={busy}
            disabled={busy || !isMatrixId(who) || !password}
            onPress={() =>
              void run(async () => {
                await matrixSignIn(who, password, server);
                setPassword('');
              })
            }
          />
          <Text variant="caption" tone="faint">
            {t('Erevos signs in as a new device named Erevos, and keeps the sign-in sealed in this space only.')}
          </Text>
        </Card>
        {tor}
        {note || problem ? <Text tone="muted">{note || problem}</Text> : null}
      </Page>
    );
  }

  const rooms = roomList(state);
  // Checks between this device and another of ours go to-device, without a chat.
  const check = matrixVerifications().find((v) => !v.roomId);
  return (
    <Page>
      <Text variant="title">Matrix</Text>
      <Text tone="muted">{t('Signed in as {id}', { id: state.userId })}</Text>
      <Text variant="caption" tone="muted">
        {t('Not anonymous: the Matrix server sees who talks with whom, and when.')}
      </Text>
      {tor}
      {check ? <MatrixVerifyCard check={check} name={state.userId} /> : null}
      {!check || check.phase === 'done' || check.phase === 'cancelled' ? (
        <Button title={t('Check this device with another of yours')} kind="secondary" disabled={busy} onPress={() => void run(() => matrixVerify(state.userId))} />
      ) : null}

      <SectionTitle title={t('New chat')} />
      <Card>
        <Row>
          <Input
            style={{ flex: 1 }}
            value={newId}
            onChangeText={setNewId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="@name:matrix.org"
            accessibilityLabel={t('Matrix ID')}
          />
          <Button
            title={t('Start')}
            compact
            disabled={busy || !isMatrixId(newId)}
            onPress={() =>
              void run(async () => {
                const room = await matrixStartChat(newId);
                setNewId('');
                router.push({ pathname: '/matrix-chat', params: { room: room.id } });
              })
            }
          />
        </Row>
      </Card>

      <SectionTitle title={t('Security Key')} />
      <RecoveryCard state={state} />

      <SectionTitle title={t('Chats')} />
      {rooms.length === 0 ? <Text tone="muted">{t('No Matrix chats yet.')}</Text> : null}
      {rooms.map((room) => (
        <RoomRow
          key={room.id}
          room={room}
          onOpen={() => router.push({ pathname: '/matrix-chat', params: { room: room.id } })}
          onJoin={() => void run(() => matrixJoin(room.id))}
          onDecline={() => void run(() => matrixLeave(room.id))}
        />
      ))}

      {note || problem ? <Text tone="muted">{note || problem}</Text> : null}

      <Button
        title={t('Sign out')}
        kind="secondary"
        disabled={busy}
        onPress={() =>
          ask(t('Sign out of Matrix?'), t('This device is taken off your Matrix account, and Erevos forgets its keys. Signing in again makes a new device, which cannot read what came before.'), [
            { text: t('Cancel'), style: 'cancel' },
            { text: t('Sign out'), style: 'destructive', onPress: () => void run(matrixSignOut) },
          ])
        }
      />
    </Page>
  );
}

function RoomRow({ room, onOpen, onJoin, onDecline }: { room: MatrixRoom; onOpen: () => void; onJoin: () => void; onDecline: () => void }) {
  const colors = useColors();
  const last = room.messages.at(-1);
  if (room.invitedBy) {
    return (
      <Card>
        <Text variant="bodyStrong">{room.name}</Text>
        <Text tone="muted">{t('Invited by {name}', { name: room.invitedBy })}</Text>
        <Row wrap>
          <Button title={t('Join')} compact onPress={onJoin} />
          <Button title={t('Decline')} kind="secondary" compact onPress={onDecline} />
        </Row>
      </Card>
    );
  }
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={room.name}>
      <Card>
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {room.name}
            </Text>
            {last ? (
              <Text tone="muted" numberOfLines={1}>
                {last.locked ? t('Locked message') : last.text}
              </Text>
            ) : null}
          </View>
          {room.unread > 0 ? (
            <View style={{ minWidth: 24, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' }}>
              <Text variant="caption" color={colors.onPrimary}>
                {String(room.unread)}
              </Text>
            </View>
          ) : null}
        </Row>
        {!room.encrypted ? (
          <Text variant="caption" tone="faint" style={{ marginTop: space.xs }}>
            {t('Not encrypted: the Matrix server can read this chat.')}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

// The account's Security Key (lib/matrix-backup.ts): asked for once, to open its cross-signing
// keys and key backup; or, for an account with none, made here for the person to write down.
function RecoveryCard({ state }: { state: MatrixState }) {
  const [info, setInfo] = useState<{ storage: boolean; phrase: boolean } | null>(null);
  const [words, setWords] = useState('');
  const [made, setMade] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const open = !!state.backup && !!state.crossSigning;
  useEffect(() => {
    if (open) return;
    let live = true;
    matrixRecoveryInfo()
      .then((found) => live && setInfo(found))
      .catch((error: unknown) => live && setNote(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [open]);

  async function act(work: () => Promise<void>) {
    setBusy(true);
    setNote('');
    try {
      await work();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      {made ? (
        <>
          <Text>{t('Your new Security Key:')}</Text>
          <Text selectable variant="bodyStrong" style={{ fontFamily: 'monospace' }}>
            {made}
          </Text>
          <Text tone="muted">{t('Write it down and keep it safe: only it opens your earlier messages on a new device. Erevos does not keep it.')}</Text>
          <Button title={t('I wrote it down')} compact onPress={() => setMade('')} />
        </>
      ) : open ? (
        <Text tone="muted">{t('Key backup is on: earlier messages open with it, and new keys are kept in it.')}</Text>
      ) : !info ? null : info.storage ? (
        <>
          <Text tone="muted">
            {info.phrase
              ? t('Enter your Security Key or Security Phrase, as Element made it: earlier messages open, and your other devices trust this one.')
              : t('Enter your Security Key, as Element made it: earlier messages open, and your other devices trust this one.')}
          </Text>
          <Input value={words} onChangeText={setWords} secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Security Key')} />
          <Button
            title={t('Open')}
            compact
            loading={busy}
            disabled={busy || !words.trim()}
            onPress={() =>
              void act(async () => {
                const done = await matrixUnlock(words.trim());
                setWords('');
                setNote(t('Opened. Earlier messages that opened: {n}.', { n: done.opened }));
              })
            }
          />
        </>
      ) : (
        <>
          <Text tone="muted">{t('This account has no Security Key yet. Set one up, so a new device of yours can read earlier messages.')}</Text>
          <Button title={t('Set up a Security Key')} compact loading={busy} disabled={busy} onPress={() => void act(async () => setMade(await matrixSetUpRecovery()))} />
        </>
      )}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Card>
  );
}

