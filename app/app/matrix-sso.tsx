// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Button, Page, Text } from '../components/ui';
import { t } from '../lib/i18n';
import { matrixSsoFinish } from '../lib/matrix-store';

// Where the browser comes back after signing in to Matrix with single sign-on (app/matrix.tsx):
// erevos://matrix-sso, with the mark of the sign-in Erevos started and the server's one-use login
// token, held until the space is open (lib/open-link.ts). The token signs this device in, once.
export default function MatrixSsoScreen() {
  const router = useRouter();
  const { sso, loginToken } = useLocalSearchParams<{ sso?: string; loginToken?: string }>();
  const [problem, setProblem] = useState('');
  // The token is used once, even when the screen is drawn again.
  const used = useRef(false);

  useEffect(() => {
    if (used.current) return;
    used.current = true;
    if (!sso || !loginToken) {
      setProblem(t('The browser came back without a sign-in. Start it again.'));
      return;
    }
    matrixSsoFinish(sso, loginToken).then(
      () => (router.canGoBack() ? router.back() : router.replace('/matrix')),
      (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)),
    );
  }, [sso, loginToken, router]);

  return (
    <Page>
      <Text variant="title">Matrix</Text>
      <Text tone="muted">{problem || t('Signing in…')}</Text>
      {problem ? <Button title={t('Back')} kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/matrix'))} /> : null}
    </Page>
  );
}
