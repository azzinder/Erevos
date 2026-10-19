import { startActivityAsync } from 'expo-intent-launcher';
import { useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';

import { Button, Card, Page, Text } from '../components/ui';
import { askFullScreen, backgroundState } from '../lib/background';
import { mark, t } from '../lib/i18n';
import { phoneReady, phoneStatus, requestDefaultPhone, type PhoneStatus } from '../modules/erevos-phone';

// Erevos as the phone's phone app (modules/erevos-phone): then a call, made or come, shows on
// Erevos's own call screen, over the lock screen and with Erevos locked, and tel: links and the
// phone's call button open Erevos's keypad. What Android still holds back shows here, each with
// the way to allow it.

// What the phone app needs from Android. Becoming the phone app gives them, except to an app
// installed from a browser on Android 15 and later, which Android holds back until its owner
// allows "restricted settings" for it.
const PHONE_PERMISSIONS = [
  'android.permission.CALL_PHONE',
  'android.permission.READ_PHONE_STATE',
  'android.permission.READ_CALL_LOG',
  'android.permission.READ_CONTACTS',
] as const;
const NOT_CHOSEN = mark(
  "Choose Erevos in Android's Default apps → Phone app. If Android says it is a restricted setting, open Erevos's App info, tap ⋮ at the top right → Allow restricted settings, and choose Erevos again.",
);
const RESTRICTED = mark(
  "Android did not allow it all. In Erevos's App info, under Permissions, call logs may say Restricted setting: then go back, tap ⋮ at the top right → Allow restricted settings, and allow Phone, Call logs and Contacts under Permissions.",
);

export default function PhoneSettings() {
  const [status, setStatus] = useState<PhoneStatus | null>(phoneStatus());
  // Whether Android gave the phone app all it needs; null until known.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [allowNote, setAllowNote] = useState('');
  // Whether Android lets Erevos show the call notices (Android 13 and later ask); null until known.
  const [canNotify, setCanNotify] = useState<boolean | null>(null);
  const [overLock, setOverLock] = useState(backgroundState()?.fullScreen ?? true);
  // Set once the owner asked Android to make Erevos the phone app, until it is.
  const [asked, setAsked] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const look = () => {
      setStatus(phoneStatus());
      setOverLock(backgroundState()?.fullScreen ?? true);
      if (Platform.OS !== 'android') return;
      void Promise.all(PHONE_PERMISSIONS.map((p) => PermissionsAndroid.check(p))).then(
        (answers) => setAllowed(answers.every(Boolean)),
        () => setAllowed(null),
      );
      if (Number(Platform.Version) >= 33) {
        void PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS').then(setCanNotify, () => setCanNotify(null));
      } else setCanNotify(true);
    };
    look();
    // Android answers in its own screens: look again when the app comes back.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && look());
    return () => subscription.remove();
  }, []);

  if (Platform.OS !== 'android' || !phoneReady()) {
    return (
      <Page>
        <Text variant="title">{t('Phone')}</Text>
        <Text tone="muted">
          {Platform.OS === 'android'
            ? t('This build of Erevos has no phone part yet. It comes with the next build of the app.')
            : t('Only Android lets another app be the phone app.')}
        </Text>
      </Page>
    );
  }

  async function makeDefault() {
    setNote('');
    setAsked(true);
    try {
      requestDefaultPhone();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    if (Number(Platform.Version) >= 33) await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => undefined);
  }

  async function openDefaultApps() {
    await startActivityAsync('android.settings.MANAGE_DEFAULT_APPS_SETTINGS').catch(() => Linking.openSettings());
  }

  async function allow() {
    setAllowNote('');
    const answers = await PermissionsAndroid.requestMultiple([...PHONE_PERMISSIONS]).catch(() => null);
    const all = PHONE_PERMISSIONS.every((p) => answers?.[p] === PermissionsAndroid.RESULTS.GRANTED);
    setAllowed(all);
    if (!all) setAllowNote(t(RESTRICTED));
  }

  // Android asks only until it was refused twice; then only Erevos's App info turns them on.
  async function allowNotices() {
    const answer = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => null);
    if (answer === PermissionsAndroid.RESULTS.GRANTED) setCanNotify(true);
    else void Linking.openSettings();
  }

  return (
    <Page>
      <Text variant="title">{t('Phone settings')}</Text>
      <Card>
        <Text variant="bodyStrong">{status?.isDefault ? t('Erevos is the phone app') : t('Erevos is not the phone app')}</Text>
        <Text tone="muted">
          {t("As the phone app, Erevos shows every call on its own screen: who calls, with their photo, over the lock screen too, without unlocking Erevos. Its Phone screen, with the keypad, the calls and the favourites, stays behind Erevos's password. Phone calls are plain phone calls: the phone company carries them, as it carries every call.")}
        </Text>
        {status?.isDefault ? null : (
          <>
            <Button title={t('Make Erevos the phone app')} onPress={() => void makeDefault()} />
            {asked ? (
              <>
                <Text variant="bodyStrong">{t('Android did not make Erevos the phone app')}</Text>
                <Text tone="muted">{t(NOT_CHOSEN)}</Text>
                <Button title={t('Open Default apps')} kind="secondary" onPress={() => void openDefaultApps()} />
                <Button title={t("Open Erevos's App info")} kind="secondary" onPress={() => void Linking.openSettings()} />
              </>
            ) : null}
          </>
        )}
        {status?.isDefault && allowed === false ? (
          <>
            <Text variant="bodyStrong">{t('Android holds back part of what the phone app needs')}</Text>
            <Text tone="muted">{t('Calls, the SIMs, the call history or the names of your contacts may not show. Android holds this back from an app installed from a browser, until you allow it.')}</Text>
            <Button title={t('Allow calls and contacts')} onPress={() => void allow()} />
            <Button title={t("Open Erevos's App info")} kind="secondary" onPress={() => void Linking.openSettings()} />
            {allowNote ? <Text tone="muted">{allowNote}</Text> : null}
          </>
        ) : null}
        {status?.isDefault && canNotify === false ? (
          <>
            <Text variant="bodyStrong">{t('Notifications are off')}</Text>
            <Text tone="muted">{t('So a call that comes shows no Answer and Decline outside the call screen.')}</Text>
            <Button title={t('Allow notifications')} onPress={() => void allowNotices()} />
          </>
        ) : null}
        {status?.isDefault && !overLock ? (
          <>
            <Text tone="muted">{t('Android does not let Erevos show a call that comes over the lock screen: it shows as a notice only.')}</Text>
            <Button title={t('Show calls over the lock screen')} kind="secondary" onPress={askFullScreen} />
          </>
        ) : null}
        {status && !status.phone ? <Text tone="muted">{t('This device has no phone part, so it cannot make calls.')}</Text> : null}
        {note ? <Text tone="muted">{note}</Text> : null}
      </Card>
    </Page>
  );
}
