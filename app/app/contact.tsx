import { router, useLocalSearchParams } from 'expo-router';

import { Button, Field, Page, Text, TextButton } from '../components/ui';
import { checkContact, offerContact } from '../lib/contact-code';

// Opens from a scanned contact code, erevos://contact?id=...&relay=... (see lib/contact-code.ts).
// Nothing is added until the person confirms, because any link can open this screen.

export default function Contact() {
  const { id, relay } = useLocalSearchParams<{ id?: string; relay?: string }>();
  const code = checkContact(id, relay ?? '');

  if (!code) {
    return (
      <Page>
        <Text variant="title">Not a contact code</Text>
        <Text tone="muted">This link does not hold a relay sender id that Erevos can use.</Text>
        <Button title="Close" onPress={() => router.dismissTo('/')} />
      </Page>
    );
  }

  return (
    <Page>
      <Text variant="title">Add a contact</Text>
      <Field label="Relay sender id">
        <Text selectable variant="mono" style={{ fontSize: 13 }}>
          {code.senderHex}
        </Text>
      </Field>
      <Field label="Relay">
        <Text selectable variant="mono" style={{ fontSize: 13 }}>
          {code.relayUrl || 'Not given. The chat uses the relay this phone already has.'}
        </Text>
      </Field>
      <Text tone="muted">Add it only if you scanned it from the other person's phone yourself.</Text>
      <Button
        title="Add to chat"
        onPress={() => {
          offerContact(code);
          router.dismissTo('/chat');
        }}
      />
      <TextButton title="Cancel" onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
