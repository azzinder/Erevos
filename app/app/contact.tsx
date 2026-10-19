import { router, useLocalSearchParams } from 'expo-router';

import { Button, Field, Page, Text, TextButton } from '../components/ui';
import { checkContact, offerContact } from '../lib/contact-code';
import { t } from '../lib/i18n';

// Opens from a scanned contact code, erevos://contact?id=...&relay=...&key=... (see lib/contact-code.ts).
// Nothing is added until the person confirms, because any link can open this screen.

export default function Contact() {
  const { id, relay, key, rk } = useLocalSearchParams<{ id?: string; relay?: string; key?: string; rk?: string }>();
  const code = checkContact(id, relay ?? '', key ?? '', rk ?? '');

  if (!code) {
    return (
      <Page>
        <Text variant="title">{t('Not a contact code')}</Text>
        <Text tone="muted">{t('This link does not hold a relay sender id that Erevos can use.')}</Text>
        <Button title={t('Close')} onPress={() => router.dismissTo('/')} />
      </Page>
    );
  }

  return (
    <Page>
      <Text variant="title">{t('Add a contact')}</Text>
      <Field label={t('Relay sender id')}>
        <Text selectable variant="mono" style={{ fontSize: 13 }}>
          {code.senderHex || t('None yet: their phone has no relay queue. You reach them nearby, over Wi-Fi or Bluetooth, until it has.')}
        </Text>
      </Field>
      <Field label={t('Relay')}>
        <Text selectable variant="mono" style={{ fontSize: 13 }}>
          {code.relayUrl || (code.senderHex ? t('Not given. The chat uses the relay this phone already has.') : t('None yet.'))}
        </Text>
      </Field>
      <Field label={t('Keys')}>
        <Text tone="muted">
          {code.key
            ? t('Included. Messages to this contact are end-to-end encrypted.')
            : t('Missing. This code is from an older version of Erevos and cannot be added. Ask for a new one.')}
        </Text>
      </Field>
      <Text tone="muted">
        {t("Add it only if you scanned it from the other person's phone yourself. Then compare the safety number in the chat with theirs.")}
      </Text>
      <Button
        title={t('Add to chat')}
        onPress={() => {
          offerContact(code);
          router.dismissTo('/chat');
        }}
      />
      <TextButton title={t('Cancel')} onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
