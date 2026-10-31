// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useState } from 'react';

import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { xmppChangePassword, xmppDeleteAccount } from '../lib/xmpp-store';

import { Button, Card, Input, Row, Text } from './ui';

// The signed-in XMPP account's own matters (app/xmpp.tsx): a new password on its server, and
// deleting the account from the server for good (XEP-0077). Deleting asks twice: once as an
// alert, and then for the account's address to be written, as it cannot be brought back.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function XmppAccount({ jid, busy: outside }: { jid: string; busy: boolean }) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

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

  const same = password.length >= 8 && password === again;
  const off = busy || outside;
  return (
    <Card>
      <Text variant="bodyStrong">{t('New password')}</Text>
      <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder={t('New password')} accessibilityLabel={t('New password')} />
      <Input value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder={t('The same again')} accessibilityLabel={t('The same again')} />
      <Row>
        <Button
          title={t('Change the password')}
          kind="secondary"
          compact
          disabled={off || !same}
          onPress={() =>
            void work(async () => {
              await xmppChangePassword(password);
              setPassword('');
              setAgain('');
              setNote(t('The password is changed. Your other XMPP apps ask for the new one.'));
            })
          }
        />
      </Row>
      <Text variant="caption" tone="faint">
        {password && password.length < 8 ? t('At least 8 characters.') : password && again && !same ? t('The two are not the same.') : ' '}
      </Text>

      {deleting ? (
        <>
          <Text tone="muted">{t('Write {jid} to delete the account.', { jid })}</Text>
          <Input value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('XMPP address')} />
          <Row wrap>
            <Button
              title={t('Delete the account for good')}
              compact
              disabled={off || typed.trim().toLowerCase() !== jid.toLowerCase()}
              onPress={() =>
                void work(async () => {
                  await xmppDeleteAccount();
                })
              }
            />
            <Button title={t('Cancel')} kind="secondary" compact disabled={off} onPress={() => (setDeleting(false), setTyped(''))} />
          </Row>
        </>
      ) : (
        <Button
          title={t('Delete the account')}
          kind="secondary"
          disabled={off}
          onPress={() =>
            ask(t('Delete this XMPP account?'), t('The account, its contacts and its chats are deleted from the XMPP server, and Erevos forgets its keys. It cannot be brought back, and the address may not be made again.'), [
              { text: t('Cancel'), style: 'cancel' },
              { text: t('Go on'), style: 'destructive', onPress: () => setDeleting(true) },
            ])
          }
        />
      )}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Card>
  );
}
