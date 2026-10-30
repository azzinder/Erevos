import { useState } from 'react';

import type { AuthAsk } from '../lib/matrix-account';
import { authFor, isAccountName } from '../lib/matrix-account';
import { t } from '../lib/i18n';
import { matrixRegister } from '../lib/matrix-store';

import { openLink } from './linked-text';
import { Button, Card, Field, Input, Row, Text, TextButton } from './ui';

// A new Matrix account, on a Matrix server that makes them (lib/matrix-account.ts), from the
// sign-in screen (app/matrix.tsx): a server, a name and a password. The server may ask more first:
// to agree to its terms, a registration token, or a step on its own page (a captcha, or single
// sign-on), which opens in the browser and which Erevos never sees. Each is asked here, and the
// account is made once all are answered. One that asks for an e-mail address is said not to be
// made here: it is made on the server's website, and signed in to with Sign in.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function MatrixRegister({ onDone }: { onDone?: () => void }) {
  const [server, setServer] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [asked, setAsked] = useState<AuthAsk | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function make(ask?: AuthAsk) {
    setBusy(true);
    setNote('');
    try {
      const made = await matrixRegister(server, name.trim().toLowerCase(), password, ask ? authFor(ask, { token: token.trim(), password, userId: name.trim().toLowerCase() }) : undefined);
      if ('ask' in made) {
        setAsked(made.ask);
        return;
      }
      setPassword('');
      setToken('');
      setAsked(null);
      onDone?.();
    } catch (error) {
      setNote(errorText(error));
      setAsked(null);
    } finally {
      setBusy(false);
    }
  }

  const ready = !!server.trim() && isAccountName(name.trim().toLowerCase()) && password.length >= 8;
  return (
    <Card>
      <Text variant="bodyStrong">{t('Make a new account')}</Text>
      {asked ? (
        <>
          {asked.stage === 'm.login.terms' ? (
            <>
              <Text tone="muted">{t('This Matrix server asks you to agree to its terms first:')}</Text>
              {asked.terms?.map((doc) => (
                <TextButton key={doc.url} title={doc.name} onPress={() => openLink(doc.url)} />
              ))}
            </>
          ) : asked.stage === 'm.login.registration_token' ? (
            <Field label={t('Registration token')} hint={t('This Matrix server makes accounts only for those who have a token from it.')}>
              <Input value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Registration token')} />
            </Field>
          ) : asked.fallback ? (
            <>
              <Text tone="muted">{t('This Matrix server asks for a step on its own page, such as a captcha. The browser opens it; come back here when it says it is done.')}</Text>
              <Row>
                <Button title={t('Open the page')} kind="secondary" compact onPress={() => openLink(asked.fallback!)} />
              </Row>
            </>
          ) : null}
          <Row wrap>
            <Button
              title={asked.stage === 'm.login.terms' ? t('I agree') : asked.fallback ? t('It is done') : t('Continue')}
              compact
              loading={busy}
              disabled={busy || (asked.stage === 'm.login.registration_token' && !token.trim())}
              onPress={() => void make(asked)}
            />
            <Button title={t('Cancel')} kind="secondary" compact disabled={busy} onPress={() => setAsked(null)} />
          </Row>
        </>
      ) : (
        <>
          <Field label={t('Server')}>
            <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="matrix.org" accessibilityLabel={t('Server')} />
          </Field>
          <Field label={t('Name')} hint={t('Small letters, digits and . _ = - / + only. It becomes your Matrix ID.')}>
            <Input value={name} onChangeText={setName} autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Name')} />
          </Field>
          <Field label={t('Password')} hint={t('At least 8 characters.')}>
            <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Password')} />
          </Field>
          <Button title={busy ? t('Making…') : t('Make the account')} loading={busy} disabled={busy || !ready} onPress={() => void make()} />
          <Text variant="caption" tone="faint">
            {t('Not every Matrix server makes accounts here; one that does not says so. Erevos signs in as a new device named Erevos.')}
          </Text>
        </>
      )}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Card>
  );
}
