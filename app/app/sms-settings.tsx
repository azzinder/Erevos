import { startActivityAsync } from 'expo-intent-launcher';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';

import { Button, Card, Chip, Field, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { mark, plural, t } from '../lib/i18n';
import { smsOrderChanged } from '../lib/sms-folders';
import { smsAddress, smsNumbers } from '../lib/sms-group';
import { SmsLink } from '../lib/sms-link';
import { currentSpace } from '../lock/keys';
import { MAX_WORDS, WORD } from '../lock/sms-data';
import { blockedNumbers, blockNumber, canBlockNumbers, requestDefaultSms, smsReady, smsStatus, smsThreads, smsToolsReady, unblockNumber, type SmsStatus } from '../modules/erevos-sms';

// Erevos as the phone's SMS app: then the home screen shows SMS and Erevos chats in one list, and
// writing to a number that has Erevos goes through Erevos. Whether to look for Erevos on a number
// with a hidden SMS invite, whether SMS numbers show the names the phone's contacts give them, and
// a new SMS conversation. The space's SMS folders, its spam filter's rules, and the numbers blocked
// in Android's own list.

// What the SMS app needs from Android. Becoming the SMS app gives them, except to an app installed
// from a browser on Android 15 and later, which Android holds them back from until its owner allows
// "restricted settings" for it.
const SMS_PERMISSIONS = [
  'android.permission.READ_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.SEND_SMS',
  'android.permission.RECEIVE_MMS',
] as const;
// Android 15 and later also hold the SMS app role back from an app installed from a browser: its
// question then does not come, or says the setting is restricted.
const NOT_CHOSEN = mark(
  "Choose Erevos in Android's Default apps → SMS app. If Android says it is a restricted setting, open Erevos's App info, tap ⋮ at the top right → Allow restricted settings, and choose Erevos again.",
);
const RESTRICTED = mark(
  "Android did not allow it. In Erevos's App info, under Permissions → SMS, it may say Restricted setting: then go back, tap ⋮ at the top right → Allow restricted settings, and allow SMS under Permissions.",
);

export default function SmsSettings() {
  const [status, setStatus] = useState<SmsStatus | null>(smsStatus());
  // Whether Android lets Erevos read the phone's SMS; null until known.
  const [canRead, setCanRead] = useState<boolean | null>(null);
  const [readNote, setReadNote] = useState('');
  // Whether Android lets Erevos show a notice when an SMS comes (Android 13 and later ask); null until known.
  const [canNotify, setCanNotify] = useState<boolean | null>(null);
  // Set once the owner asked Android to make Erevos the SMS app, until it is.
  const [asked, setAsked] = useState(false);
  // What reading the phone's SMS gave, as the SMS app: how many conversations, or why it failed.
  const [reading, setReading] = useState<{ count: number } | { error: string } | null>(null);
  const [link, setLink] = useState<SmsLink | null>(null);
  const [invites, setInvites] = useState(true);
  const [names, setNames] = useState(false);
  const [number, setNumber] = useState('');
  const [note, setNote] = useState('');
  // The spam filter (lib/sms-folders.ts), as the space keeps it.
  const [spam, setSpam] = useState({ on: true, links: false, words: [] as string[] });
  const [word, setWord] = useState('');
  // Android's list of blocked numbers, or null when Erevos may not read it.
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [toBlock, setToBlock] = useState('');
  const [blockNote, setBlockNote] = useState('');

  useEffect(() => {
    const { space, key } = currentSpace();
    SmsLink.open(space, key)
      .then((opened) => {
        setLink(opened);
        setInvites(opened.invites);
        setNames(opened.names);
        setSpam({ on: opened.state.spam, links: opened.state.spamLinks, words: [...opened.state.spamWords] });
      })
      .catch(() => setNote(t('The SMS settings of this space could not open.')));
    const look = () => {
      const now = smsStatus();
      setStatus(now);
      if (Platform.OS !== 'android') return;
      void PermissionsAndroid.check('android.permission.READ_SMS').then(setCanRead, () => setCanRead(null));
      if (Number(Platform.Version) >= 33) {
        void PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS').then(setCanNotify, () => setCanNotify(null));
      } else setCanNotify(true);
      void canBlockNumbers().then((can) => (can ? blockedNumbers().then(setBlocked) : setBlocked(null)));
      if (now?.isDefault) {
        smsThreads().then(
          (threads) => setReading({ count: threads.length }),
          (error) => setReading({ error: error instanceof Error ? error.message : String(error) }),
        );
      } else setReading(null);
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
            ? t('This build of Erevos has no SMS part yet. It comes with the next build of the app.')
            : t('Only Android lets another app be the SMS app.')}
        </Text>
      </Page>
    );
  }

  async function makeDefault() {
    setNote('');
    setAsked(true);
    try {
      requestDefaultSms();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    if (Number(Platform.Version) >= 33) await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => undefined);
  }

  async function openDefaultApps() {
    await startActivityAsync('android.settings.MANAGE_DEFAULT_APPS_SETTINGS').catch(() => Linking.openSettings());
  }

  async function allowSms() {
    setReadNote('');
    const answers = await PermissionsAndroid.requestMultiple([...SMS_PERMISSIONS]).catch(() => null);
    const granted = answers?.['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED;
    setCanRead(granted);
    if (!granted) setReadNote(t(RESTRICTED));
  }

  // Android asks only until it was refused twice; then only Erevos's App info turns them on.
  async function allowNotices() {
    const answer = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => null);
    if (answer === PermissionsAndroid.RESULTS.GRANTED) setCanNotify(true);
    else void Linking.openSettings();
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
        setNote(t("Erevos may not read the phone's contacts, so numbers stay as they are."));
        return;
      }
    }
    await link.setNames(!names);
    setNames(!names);
  }

  async function changeSpam(change: (opened: SmsLink) => Promise<unknown>) {
    if (!link) return;
    await change(link);
    setSpam({ on: link.state.spam, links: link.state.spamLinks, words: [...link.state.spamWords] });
    smsOrderChanged();
  }

  async function addWord() {
    const typed = word.trim();
    if (!typed || !link) return;
    if (!(await link.addSpamWord(typed))) {
      setNote(t('At most {n} words, each up to {length} letters.', { n: MAX_WORDS, length: WORD }));
      return;
    }
    setWord('');
    await changeSpam(async () => undefined);
  }

  async function block() {
    setBlockNote('');
    const numbers = smsNumbers(toBlock);
    if (numbers.length !== 1) {
      setBlockNote(t('Type one phone number.'));
      return;
    }
    try {
      await blockNumber(numbers[0]);
      setToBlock('');
      setBlocked(await blockedNumbers());
      smsOrderChanged();
    } catch (error) {
      setBlockNote(error instanceof Error ? error.message : String(error));
    }
  }

  function unblock(number: string) {
    ask(t('Unblock {number}?', { number }), t('Its SMS, MMS and calls reach the phone again.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Unblock'),
        onPress: () =>
          void unblockNumber(number)
            .then(async () => {
              setBlocked(await blockedNumbers());
              smsOrderChanged();
            })
            .catch((error) => setBlockNote(error instanceof Error ? error.message : String(error))),
      },
    ]);
  }

  function open() {
    // Several numbers, separated by commas, make a group's conversation.
    const numbers = smsNumbers(number);
    if (numbers.length === 0) {
      setNote(t('Type a phone number.'));
      return;
    }
    setNumber('');
    router.push(`/sms?to=${encodeURIComponent(smsAddress(numbers))}`);
  }

  return (
    <Page>
      <Text variant="title">SMS</Text>
      <Card>
        <Text variant="bodyStrong">{status?.isDefault ? t('Erevos is the SMS app') : t('Erevos is not the SMS app')}</Text>
        <Text tone="muted">
          {t('As the SMS app, Erevos shows SMS and Erevos chats in one list. Writing to a number that has Erevos goes through Erevos, end-to-end encrypted. To everyone else it goes as a plain SMS, marked SMS: the phone company can read it, as it reads every SMS.')}
        </Text>
        {status?.isDefault ? null : (
          <>
            <Button title={t('Make Erevos the SMS app')} onPress={() => void makeDefault()} />
            {asked ? (
              <>
                <Text variant="bodyStrong">{t('Android did not make Erevos the SMS app')}</Text>
                <Text tone="muted">{t(NOT_CHOSEN)}</Text>
                <Button title={t('Open Default apps')} kind="secondary" onPress={() => void openDefaultApps()} />
                <Button title={t("Open Erevos's App info")} kind="secondary" onPress={() => void Linking.openSettings()} />
              </>
            ) : null}
          </>
        )}
        {status?.isDefault && canRead === false ? (
          <>
            <Text variant="bodyStrong">{t('Android does not let Erevos read the SMS')}</Text>
            <Text tone="muted">
              {t('So no SMS show yet. Android holds this back from an app installed from a browser, until you allow it.')}
            </Text>
            <Button title={t('Allow SMS')} onPress={() => void allowSms()} />
            <Button title={t("Open Erevos's App info")} kind="secondary" onPress={() => void Linking.openSettings()} />
            {readNote ? <Text tone="muted">{readNote}</Text> : null}
          </>
        ) : null}
        {status?.isDefault && canRead !== false && reading ? (
          <Text tone="muted">
            {'error' in reading
              ? t("Erevos could not read the phone's SMS: {error}", { error: reading.error })
              : reading.count === 0
                ? t('Erevos found no SMS on this phone.')
                : plural(reading.count, 'Erevos reads {n} SMS conversation on this phone.', 'Erevos reads {n} SMS conversations on this phone.')}
          </Text>
        ) : null}
        {status?.isDefault && canNotify === false ? (
          <>
            <Text variant="bodyStrong">{t('Notifications are off')}</Text>
            <Text tone="muted">{t('So nothing tells you when an SMS comes.')}</Text>
            <Button title={t('Allow notifications')} onPress={() => void allowNotices()} />
          </>
        ) : null}
        {status && !status.phone ? <Text tone="muted">{t('This device has no phone part, so it cannot send SMS.')}</Text> : null}
      </Card>

      <SectionTitle title={t('Find Erevos on a number')} />
      <Card>
        <Text tone="muted">
          {t('With the first SMS to a number that is not a contact, Erevos also sends a hidden invite. A phone without Erevos shows nothing. A phone with Erevos answers through the relay, and the two become contacts. The phone company sees one more short SMS. Each number is asked once a month at most.')}
        </Text>
        <Button title={invites ? t('Turn invites off') : t('Turn invites on')} kind="secondary" onPress={() => void toggleInvites()} />
        <Text variant="caption" tone="faint">
          {t('A number can also be linked by hand: open its SMS conversation and choose the contact.')}
        </Text>
      </Card>

      <SectionTitle title={t('Names from your contacts')} />
      <Card>
        <Text tone="muted">
          {t("SMS numbers that are no Erevos contact can show the names your phone's contacts give them. Erevos reads them only to show them, keeps no copy, and sends them nowhere. Android asks first.")}
        </Text>
        <Button title={names ? t('Show numbers only') : t('Show names from my contacts')} kind="secondary" onPress={() => void toggleNames()} />
      </Card>

      <SectionTitle title={t('Archived, Spam and Trash')} />
      <Card>
        <Text tone="muted">
          {t("In the list, swipe an SMS conversation to the right to archive it, to the left to delete it, or hold it down to pin it at the top and more. This space keeps its own pins, archived conversations, Trash and spam marks, sealed with its password; the SMS stay in the phone's SMS, where another space sees them as they are.")}
        </Text>
        <Row wrap>
          <Button title={t('Archived conversations')} kind="secondary" compact onPress={() => router.push('/sms-folder?folder=archived')} />
          <Button title={t('Spam')} kind="secondary" compact onPress={() => router.push('/sms-folder?folder=spam')} />
          <Button title={t('Trash')} kind="secondary" compact onPress={() => router.push('/sms-folder?folder=trash')} />
        </Row>
      </Card>

      <SectionTitle title={t('Spam filter')} />
      <Card>
        <Text tone="muted">
          {t('It works on this phone alone, by rules, and sends nothing anywhere. An SMS from a number that is no contact and was never answered goes to Spam when it has a link with words that try to fool, like a parcel held or a prize, or one of your words below. A number you marked as spam always goes there, one you marked not spam never does.')}
        </Text>
        <Button title={spam.on ? t('Turn the spam filter off') : t('Turn the spam filter on')} kind="secondary" onPress={() => void changeSpam((l) => l.setSpam(!spam.on))} />
        {spam.on ? (
          <>
            <Button
              title={spam.links ? t('Let links from unknown numbers through') : t('Send every link from unknown numbers to Spam')}
              kind="ghost"
              compact
              onPress={() => void changeSpam((l) => l.setSpamLinks(!spam.links))}
            />
            <Field label={t('Your words')} hint={t('An SMS with one of them goes to Spam, from any number or sender that is no contact. Tap a word to remove it.')}>
              <Row>
                <Input value={word} onChangeText={setWord} placeholder={t('A word or a few')} style={{ flex: 1 }} onSubmitEditing={() => void addWord()} maxLength={WORD} />
                <Button title={t('Add')} compact kind="secondary" onPress={() => void addWord()} />
              </Row>
            </Field>
            {spam.words.length > 0 ? (
              <Row wrap>
                {spam.words.map((w) => (
                  <Chip key={w} label={`${w} ×`} onPress={() => void changeSpam((l) => l.removeSpamWord(w))} />
                ))}
              </Row>
            ) : null}
          </>
        ) : null}
        <Text variant="caption" tone="faint">
          {t('A notice still says "New message" when spam comes, as it shows before Erevos is opened. Block a number to hear nothing more from it.')}
        </Text>
      </Card>

      <SectionTitle title={t('Blocked numbers')} />
      <Card>
        <Text tone="muted">
          {t("These are Android's own blocked numbers: Android rejects their SMS, MMS and calls. Every space, and the phone app, sees the same list. Block one from its conversation, with ⋮, or here.")}
        </Text>
        {blocked === null ? (
          <Text variant="caption" tone="faint">
            {smsToolsReady() ? t('Only the SMS app can see and change them: make Erevos the SMS app above.') : t('This build of Erevos cannot block numbers yet.')}
          </Text>
        ) : (
          <>
            {blocked.length === 0 ? (
              <Text variant="caption" tone="faint">
                {t('No number is blocked.')}
              </Text>
            ) : null}
            <Row wrap>
              {blocked.map((b) => (
                <Chip key={b} label={`${b} ×`} onPress={() => unblock(b)} />
              ))}
            </Row>
            <Row>
              <Input value={toBlock} onChangeText={setToBlock} keyboardType="phone-pad" placeholder={t('Phone number')} style={{ flex: 1 }} onSubmitEditing={() => void block()} />
              <Button title={t('Block')} compact kind="secondary" onPress={() => void block()} />
            </Row>
            {blockNote ? (
              <Text variant="caption" tone="muted">
                {blockNote}
              </Text>
            ) : null}
          </>
        )}
      </Card>

      {(status?.slots ?? 0) >= 2 ? (
        <>
          <SectionTitle title={t('Two SIMs')} />
          <Card>
            <Text tone="muted">
              {t('In an SMS conversation, choose the SIM above the message field. Erevos keeps that choice for the number; until then, it answers on the SIM the last message came on. Each message shows its SIM.')}
            </Text>
          </Card>
        </>
      ) : null}

      <SectionTitle title={t('New SMS')} />
      <Field label={t('Phone number')} hint={t('For a group MMS, several numbers separated by commas.')}>
        <Input value={number} onChangeText={setNumber} keyboardType="phone-pad" placeholder="+30 69…, +30 69…" onSubmitEditing={open} />
      </Field>
      <Button title={t('Write')} kind="secondary" onPress={open} />
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
