import { router, useLocalSearchParams } from 'expo-router';

import { Button, Field, Page, Text, TextButton } from '../components/ui';
import { checkContact, offerContact } from '../lib/contact-code';

// Opens from a scanned contact code, erevos://contact?id=...&relay=...&key=... (see lib/contact-code.ts).
// Nothing is added until the person confirms, because any link can open this screen.

export default function Contact() {
  const { id, relay, key, rk } = useLocalSearchParams<{ id?: string; relay?: string; key?: string; rk?: string }>();
  const code = checkContact(id, relay ?? '', key ?? '', rk ?? '');

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
          {code.senderHex || 'None yet: their phone has no relay queue. You reach them nearby, over Wi-Fi or Bluetooth, until it has.'}
        </Text>
      </Field>
      <Field label="Relay">
        <Text selectable variant="mono" style={{ fontSize: 13 }}>
          {code.relayUrl || (code.senderHex ? 'Not given. The chat uses the relay this phone already has.' : 'None yet.')}
        </Text>
      </Field>
      <Field label="Keys">
        <Text tone="muted">
          {code.key
            ? 'Included. Messages to this contact are end-to-end encrypted.'
            : 'Missing. This code is from an older version of Erevos and cannot be added. Ask for a new one.'}
        </Text>
      </Field>
      <Text tone="muted">
        Add it only if you scanned it from the other person's phone yourself. Then compare the safety number in
        the chat with theirs.
      </Text>
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
