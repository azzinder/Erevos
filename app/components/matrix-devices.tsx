import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { authFor, type AccountDevice, type AuthAsk } from '../lib/matrix-account';
import { matrixDevices, matrixRenameDevice, matrixSignOutDevices } from '../lib/matrix-store';

import { openLink } from './linked-text';
import { Button, Card, Input, Row, Text } from './ui';

// The Matrix account's devices (lib/matrix-account.ts) in the Matrix screen: this one and the
// others signed in, each with when it was last seen, a new name for any, and signing the others
// out, which takes their keys: they can no longer read what comes. The Matrix server asks for the
// password first, or a step on its own page.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function MatrixDevices({ userId }: { userId: string }) {
  const [devices, setDevices] = useState<AccountDevice[] | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [asked, setAsked] = useState<AuthAsk | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      setDevices(await matrixDevices());
    } catch (error) {
      setNote(errorText(error));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function work(job: () => Promise<void>) {
    setBusy(true);
    setNote('');
    try {
      await job();
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  const others = (devices ?? []).filter((device) => !device.ours);

  // Signs the others out; the server's ask is answered with the password typed, or its page.
  const signOut = (answer?: AuthAsk) =>
    work(async () => {
      const done = await matrixSignOutDevices(
        others.map((device) => device.id),
        answer ? authFor(answer, { password, userId }) : undefined,
      );
      if ('ask' in done) {
        setAsked(done.ask);
        return;
      }
      setAsked(null);
      setPassword('');
      setNote(t('The other devices are signed out.'));
      await load();
    });

  return (
    <Card>
      {devices === null ? <Text tone="muted">{note || t('Looking…')}</Text> : null}
      {devices?.map((device) => (
        <View key={device.id} style={{ gap: 4 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {device.name}
            {device.ours ? ` · ${t('this device')}` : ''}
          </Text>
          <Text variant="caption" tone="faint">
            {device.lastSeen ? t('Last seen {when}', { when: new Date(device.lastSeen).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }) : device.id}
          </Text>
          {naming === device.id ? (
            <Row>
              <Input style={{ flex: 1 }} value={name} onChangeText={setName} maxLength={100} accessibilityLabel={t('Name')} />
              <Button
                title={t('Save')}
                compact
                disabled={busy || !name.trim()}
                onPress={() =>
                  void work(async () => {
                    await matrixRenameDevice(device.id, name);
                    setNaming(null);
                    await load();
                  })
                }
              />
            </Row>
          ) : (
            <Row>
              <Button
                title={t('Rename')}
                kind="secondary"
                compact
                onPress={() => {
                  setNaming(device.id);
                  setName(device.name);
                }}
              />
            </Row>
          )}
        </View>
      ))}
      {others.length && !asked ? (
        <Button
          title={t('Sign out the other devices')}
          kind="secondary"
          disabled={busy}
          onPress={() =>
            ask(t('Sign out the other devices?'), t('They are taken off your Matrix account and lose their keys: they can no longer read what comes. This device stays.'), [
              { text: t('Cancel'), style: 'cancel' },
              { text: t('Sign out'), style: 'destructive', onPress: () => void signOut() },
            ])
          }
        />
      ) : null}
      {asked ? (
        <>
          {asked.stage === 'm.login.password' ? (
            <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder={t('Password')} accessibilityLabel={t('Password')} />
          ) : asked.fallback ? (
            <Row>
              <Button title={t('Open the page')} kind="secondary" compact onPress={() => openLink(asked.fallback!)} />
            </Row>
          ) : null}
          <Row wrap>
            <Button title={t('Continue')} compact loading={busy} disabled={busy || (asked.stage === 'm.login.password' && !password)} onPress={() => void signOut(asked)} />
            <Button title={t('Cancel')} kind="secondary" compact disabled={busy} onPress={() => setAsked(null)} />
          </Row>
        </>
      ) : null}
      {note && devices !== null ? <Text tone="muted">{note}</Text> : null}
    </Card>
  );
}
