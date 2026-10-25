import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Field, Input, Page, Text, TextButton } from '../components/ui';
import { t } from '../lib/i18n';
import { offerTextInvite, textInviteOf } from '../lib/text-invite';
import { currentSpace } from '../lock/keys';
import { MAX_NAME } from '../lock/e2e-data';

// Opens from an invite by SMS, erevos://text-invite?d=... (lib/text-invite.ts), as the page its
// link goes to opens it. Nothing is taken until the person says so, because any link can open this
// screen; then the space's chat takes it: this phone joins the inviting phone's relay with access
// of its own, and answers the invite, so the two are each other's contacts.
export default function TextInviteScreen() {
  const { d } = useLocalSearchParams<{ d?: string }>();
  const invite = textInviteOf(d);
  const [name, setName] = useState(invite?.name ?? '');

  if (!invite || invite.expires < Date.now()) {
    return (
      <Page>
        <Text variant="title">{invite ? t('This invite is over') : t('Not an invite')}</Text>
        <Text tone="muted">
          {invite ? t('An invite by SMS lasts two days. Ask whoever sent it for a new one.') : t('This link does not hold an invite that Erevos can take. Ask for a new one.')}
        </Text>
        <Button title={t('Close')} onPress={() => router.dismissTo('/')} />
      </Page>
    );
  }

  return (
    <Page>
      <Text variant="title">{invite.name ? t('{name} invites you to Erevos', { name: invite.name }) : t('An invite to Erevos')}</Text>
      <Text tone="muted">
        {t('Join, and whoever invited you is your contact as soon as their phone hears of it. What you write to each other is end-to-end encrypted. Erevos sets itself up to reach them, typing nothing. Take it only if it came from them.')}
      </Text>
      <Card>
        <Field label={t('Their name')} hint={t('Only on this phone. You can change it later.')}>
          <Input value={name} onChangeText={setName} placeholder={t('Their name')} maxLength={MAX_NAME} />
        </Field>
      </Card>
      <Button
        title={t('Join')}
        onPress={() => {
          offerTextInvite({ ...invite, name: name.trim() }, currentSpace().space);
          router.dismissTo('/chat');
        }}
      />
      <TextButton title={t('Cancel')} onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
