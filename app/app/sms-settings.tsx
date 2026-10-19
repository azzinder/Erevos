import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';

import { Button, Card, Field, Input, Page, SectionTitle, Text } from '../components/ui';
import { smsAddress, smsNumbers } from '../lib/sms-group';
import { SmsLink } from '../lib/sms-link';
import { currentSpace } from '../lock/keys';
import { requestDefaultSms, smsReady, smsStatus, type SmsStatus } from '../modules/erevos-sms';

// Erevos as the phone's SMS app: then the home screen shows SMS and Erevos chats in one list, and
// writing to a number that has Erevos goes through Erevos. Whether to look for Erevos on a number
// with a hidden SMS invite, whether SMS numbers show the names the phone's contacts give them, and
// a new SMS conversation.

// What the SMS app needs from Android. Becoming the SMS app gives them, except to an app installed
// from a browser on Android 15 and later, which Android holds them back from until its owner allows
// "restricted settings" for it.
const SMS_PERMISSIONS = [
  'android.permission.READ_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.SEND_SMS',
  'android.permission.RECEIVE_MMS',
] as const;
const RESTRICTED =
  'Android did not allow it. In Erevos\'s App info, under Permissions → SMS, it may say Restricted setting: then go ' +
  'back, tap ⋮ at the top right → Allow restricted settings, and allow SMS under Permissions.';

export default function SmsSettings() {
  const [status, setStatus] = useState<SmsStatus | null>(smsStatus());
  // Whether Android lets Erevos read the phone's SMS; null until known.
  const [canRead, setCanRead] = useState<boolean | null>(null);
  const [readNote, setReadNote] = useState('');
  const [link, setLink] = useState<SmsLink | null>(null);
  const [invites, setInvites] = useState(true);
  const [names, setNames] = useState(false);
  const [number, setNumber] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const { space, key } = currentSpace();
    SmsLink.open(space, key)
      .then((opened) => {
        setLink(opened);
        setInvites(opened.invites);
        setNames(opened.names);
      })
      .catch(() => setNote('The SMS settings of this space could not open.'));
    const look = () => {
      setStatus(smsStatus());
      if (Platform.OS === 'android') void PermissionsAndroid.check('android.permission.READ_SMS').then(setCanRead, () => setCanRead(null));
    };
    look();
    // Android answers in its own screens: look again when the app comes back.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && look());
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

  async function allowSms() {
    setReadNote('');
    const answers = await PermissionsAndroid.requestMultiple([...SMS_PERMISSIONS]).catch(() => null);
    const granted = answers?.['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED;
    setCanRead(granted);
    if (!granted) setReadNote(RESTRICTED);
  }

  async function toggleInvites() {
    if (!link) return;
    const next = !invites;
    await link.setInvites(next);
    setInvites(next);
  }

  // Names from the phone's contacts: Android asks once, when the owner turns them on.
  async function toggleNames() {
    if (!link) return;
    setNote('');
    if (!names) {
      const answer = await PermissionsAndroid.request('android.permission.READ_CONTACTS').catch(() => null);
      if (answer !== PermissionsAndroid.RESULTS.GRANTED) {
        setNote('Erevos may not read the phone\'s contacts, so numbers stay as they are.');
        return;
      }
    }
    await link.setNames(!names);
    setNames(!names);
  }

  function open() {
    // Several numbers, separated by commas, make a group's conversation.
    const numbers = smsNumbers(number);
    if (numbers.length === 0) {
      setNote('Type a phone number.');
      return;
    }
    setNumber('');
    router.push(`/sms?to=${encodeURIComponent(smsAddress(numbers))}`);
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
        {status?.isDefault && canRead === false ? (
          <>
            <Text variant="bodyStrong">Android does not let Erevos read the SMS</Text>
            <Text tone="muted">
              So no SMS show yet. Android holds this back from an app installed from a browser, until you allow it.
            </Text>
            <Button title="Allow SMS" onPress={() => void allowSms()} />
            <Button title="Open Erevos's App info" kind="secondary" onPress={() => void Linking.openSettings()} />
            {readNote ? <Text tone="muted">{readNote}</Text> : null}
          </>
        ) : null}
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

      <SectionTitle title="Names from your contacts" />
      <Card>
        <Text tone="muted">
          SMS numbers that are no Erevos contact can show the names your phone's contacts give them. Erevos reads them
          only to show them, keeps no copy, and sends them nowhere. Android asks first.
        </Text>
        <Button title={names ? 'Show numbers only' : 'Show names from my contacts'} kind="secondary" onPress={() => void toggleNames()} />
      </Card>

      {(status?.slots ?? 0) >= 2 ? (
        <>
          <SectionTitle title="Two SIMs" />
          <Card>
            <Text tone="muted">
              In an SMS conversation, choose the SIM above the message field. Erevos keeps that choice for the number;
              until then, it answers on the SIM the last message came on. Each message shows its SIM.
            </Text>
          </Card>
        </>
      ) : null}

      <SectionTitle title="New SMS" />
      <Field label="Phone number" hint="For a group MMS, several numbers separated by commas.">
        <Input value={number} onChangeText={setNumber} keyboardType="phone-pad" placeholder="+30 69…, +30 69…" onSubmitEditing={open} />
      </Field>
      <Button title="Write" kind="secondary" onPress={open} />
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
