import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import { Button, Card, Field, Input, Page, SectionTitle, Text } from '../components/ui';
import { plainNumber } from '../lib/sms-invite';
import { SmsLink } from '../lib/sms-link';
import { currentSpace } from '../lock/keys';
import { requestDefaultSms, smsReady, smsStatus, type SmsStatus } from '../modules/erevos-sms';

// Erevos as the phone's SMS app: then the home screen shows SMS and Erevos chats in one list, and
// writing to a number that has Erevos goes through Erevos. Whether to look for Erevos on a number
// with a hidden SMS invite, and a new SMS conversation.

export default function SmsSettings() {
  const [status, setStatus] = useState<SmsStatus | null>(smsStatus());
  const [link, setLink] = useState<SmsLink | null>(null);
  const [invites, setInvites] = useState(true);
  const [number, setNumber] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const { space, key } = currentSpace();
    SmsLink.open(space, key)
      .then((opened) => {
        setLink(opened);
        setInvites(opened.invites);
      })
      .catch(() => setNote('The SMS settings of this space could not open.'));
    // Android answers the question in its own screen: look again when the app comes back.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && setStatus(smsStatus()));
    return () => subscription.remove();
  }, []);

  if (Platform.OS !== 'android' || !smsReady()) {
    return (
      <Page>
        <Text variant="title">SMS</Text>
        <Text tone="muted">
          {Platform.OS === 'android'
            ? 'This build of Erevos has no SMS part yet. It comes with the next build of the app.'
            : 'Only Android lets another app be the SMS app.'}
        </Text>
      </Page>
    );
  }

  async function makeDefault() {
    setNote('');
    try {
      requestDefaultSms();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    if (Number(Platform.Version) >= 33) await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => undefined);
  }

  async function toggleInvites() {
    if (!link) return;
    const next = !invites;
    await link.setInvites(next);
    setInvites(next);
  }

  function open() {
    const to = plainNumber(number);
    if (to.replace('+', '').length < 3) {
      setNote('Type a phone number.');
      return;
    }
    setNumber('');
    router.push(`/sms?to=${encodeURIComponent(to)}`);
  }

  return (
    <Page>
      <Text variant="title">SMS</Text>
      <Card>
        <Text variant="bodyStrong">{status?.isDefault ? 'Erevos is the SMS app' : 'Erevos is not the SMS app'}</Text>
        <Text tone="muted">
          As the SMS app, Erevos shows SMS and Erevos chats in one list. Writing to a number that has Erevos goes
          through Erevos, end-to-end encrypted. To everyone else it goes as a plain SMS, marked SMS: the phone company
          can read it, as it reads every SMS.
        </Text>
        {status?.isDefault ? null : <Button title="Make Erevos the SMS app" onPress={() => void makeDefault()} />}
        {status && !status.phone ? <Text tone="muted">This device has no phone part, so it cannot send SMS.</Text> : null}
      </Card>

      <SectionTitle title="Find Erevos on a number" />
      <Card>
        <Text tone="muted">
          With the first SMS to a number that is not a contact, Erevos also sends a hidden invite. A phone without
          Erevos shows nothing. A phone with Erevos answers through the relay, and the two become contacts. The phone
          company sees one more short SMS. Each number is asked once a month at most.
        </Text>
        <Button title={invites ? 'Turn invites off' : 'Turn invites on'} kind="secondary" onPress={() => void toggleInvites()} />
        <Text variant="caption" tone="faint">
          A number can also be linked by hand: open its SMS conversation and choose the contact.
        </Text>
      </Card>

      <SectionTitle title="New SMS" />
      <Field label="Phone number">
        <Input value={number} onChangeText={setNumber} keyboardType="phone-pad" placeholder="+30 69…" onSubmitEditing={open} />
      </Field>
      <Button title="Write" kind="secondary" onPress={open} />
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
