// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Field, Input, Page, Text, TextButton } from '../components/ui';
import { t } from '../lib/i18n';
import { offerWelcome, welcomeOf } from '../lib/welcome';
import { currentSpace } from '../lock/keys';
import { MAX_NAME } from '../lock/e2e-data';

// Opens from a scanned invite for someone new, erevos://welcome?... (lib/welcome.ts). Nothing is
// taken until the person says so, because any link can open this screen; then the space's chat
// takes it: this phone joins as the invite lets it, and whoever invited is a contact at once.
export default function WelcomeScreen() {
  const fields = useLocalSearchParams<Record<string, string>>();
  const welcome = welcomeOf(fields);
  const [name, setName] = useState(welcome?.name ?? '');

  if (!welcome) {
    return (
      <Page>
        <Text variant="title">{t('Not an invite')}</Text>
        <Text tone="muted">{t('This link does not hold an invite that Erevos can take. Ask for a new one.')}</Text>
        <Button title={t('Close')} onPress={() => router.dismissTo('/')} />
      </Page>
    );
  }

  return (
    <Page>
      <Text variant="title">{welcome.name ? t('{name} invites you to Erevos', { name: welcome.name }) : t('An invite to Erevos')}</Text>
      <Text tone="muted">
        {t('Join, and whoever invited you is your contact at once. What you write to each other is end-to-end encrypted. Erevos sets itself up to reach them, typing nothing. Take it only if it came from them.')}
      </Text>
      <Card>
        <Field label={t('Their name')} hint={t('Only on this phone. You can change it later.')}>
          <Input value={name} onChangeText={setName} placeholder={t('Their name')} maxLength={MAX_NAME} />
        </Field>
      </Card>
      <Button
        title={t('Join')}
        onPress={() => {
          offerWelcome({ ...welcome, name: name.trim() }, currentSpace().space);
          router.dismissTo('/chat');
        }}
      />
      <TextButton title={t('Cancel')} onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
