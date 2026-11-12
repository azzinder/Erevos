// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { type CloudServer } from '../lib/backup-cloud';
import { CLOUD_NEEDS_CORS } from '../lib/backup-place';
import { t } from '../lib/i18n';
import { nextcloudBase, nextcloudFolder, SignInCancelled, startLoginFlow, waitForLogin, type NextcloudFolder } from '../lib/nextcloud-login';
import { useColors } from '../theme/context';
import { Button, Field, Input, Row, Text } from './ui';

/**
 * Sign in with Nextcloud, as LPHL's, as Fasouli does (lib/nextcloud-login.ts): fills a server form
 * with Erevos's own folder there and an app password of its own. Nothing is kept until the form's
 * own Connect. Not in a browser, where a Nextcloud as it comes lets no web app in (CORS). With
 * `tor`, the Tor switch of the server it signs in for, Erevos asks the Nextcloud only through Tor;
 * the sign-in page opens in the browser, which goes as it does, and the note says so.
 */
export function NextcloudSignIn({ folder, disabled, tor = false, onSigned }: { folder: NextcloudFolder; disabled?: boolean; tor?: boolean; onSigned: (server: CloudServer) => void }) {
  const colors = useColors();
  const [address, setAddress] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);
  const stop = useRef<AbortController | null>(null);
  useEffect(() => () => stop.current?.abort(), []);

  async function signIn() {
    setNote('');
    setFailed(false);
    const controller = new AbortController();
    stop.current = controller;
    setWaiting(true);
    try {
      const base = nextcloudBase(address);
      const flow = await startLoginFlow(base, tor);
      await Linking.openURL(flow.login);
      const login = await waitForLogin(base, flow, controller.signal, { tor });
      const server = await nextcloudFolder(login, folder);
      onSigned(server);
      setNote(t('Signed in as {user}. Erevos keeps it in its own folder there, {folder}. Tap Connect.', { user: login.user, folder: server.url.replace(/^.*\/remote\.php\/dav\/files\/[^/]+\//, '').replace(/\/$/, '') }));
    } catch (error) {
      if (!(error instanceof SignInCancelled)) {
        setNote(error instanceof Error ? error.message : String(error));
        setFailed(true);
      }
    } finally {
      if (stop.current === controller) stop.current = null;
      setWaiting(false);
    }
  }

  if (CLOUD_NEEDS_CORS) return null;
  return (
    <>
      <Field label={t('Your Nextcloud')} hint={t('As LPHL’s, the one Fasouli syncs with. Erevos gets an app password of its own there, which you can take back in Nextcloud → Settings → Security.')}>
        <Input value={address} onChangeText={setAddress} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://" accessibilityLabel={t('Your Nextcloud')} editable={!waiting} />
      </Field>
      <Row wrap>
        {waiting ? (
          <Button title={t('Cancel')} kind="secondary" compact onPress={() => stop.current?.abort()} />
        ) : (
          <Button title={t('Sign in with Nextcloud')} kind="secondary" compact onPress={() => void signIn()} disabled={disabled || !address.trim()} />
        )}
      </Row>
      {waiting ? (
        <Text variant="caption" tone="muted">
          {t('Sign in in the browser and choose Grant access, then come back.')}
          {tor ? ` ${t('Erevos asks the Nextcloud only through Tor, but the browser goes as it always does.')}` : ''}
        </Text>
      ) : note ? (
        <Text variant="caption" color={failed ? colors.warning : colors.success}>
          {note}
        </Text>
      ) : null}
    </>
  );
}
