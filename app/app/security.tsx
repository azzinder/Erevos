import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { IntegrityCard } from '../components/integrity-card';
import { PasswordSheet } from '../components/PasswordSheet';
import { Button, Card, Chip, Page, Row, SectionTitle, Text } from '../components/ui';
import { confirm } from '../lib/alert';
import { t } from '../lib/i18n';
import { CAN_KEEP_PRIVATE, keepPrivate, loadScreenPrivacy, saveScreenPrivacy } from '../lib/screen-privacy';
import {
  askBattery,
  askFullScreen,
  backgroundState,
  canRingInBackground,
  loadMessageNotices,
  loadRingInBackground,
  saveMessageNotices,
  saveRingInBackground,
} from '../lib/background';
import { BiometricError, biometricOn, turnOffBiometric, turnOnBiometric } from '../lock/biometric';
import { loadLockConfig, lockWithPassword, removePasswordLock, removeSecondPassword, setLockPassword, type LockConfig } from '../lock/config';
import { useLock } from '../lock/context';
import { prepareHidden, removeHiddenPassword, setHiddenPassword } from '../lock/hidden';
import { POCKETS } from '../lock/sealed-file';
import { currentSpace, newSpaceKey } from '../lock/keys';
import { EMPTY_SPACE, prepareSpaces, saveSpaceData } from '../lock/space-data';
import { biometricSealer } from '../modules/erevos-biometric';
import { useTheme } from '../theme/context';

// What the password sheet sets: this space's own password, its second password, or the
// password of its hidden chats. Or it asks for this space's password, to turn on unlocking with
// a fingerprint or face.
type Editing = 'own' | 'second' | 'hidden' | 'biometric' | null;

// Lock settings, as in LPHL FASOULI. Every space shows exactly the same screen, and nothing on it
// says whether a second password or hidden chats are set (see lock/config.ts and
// lock/hidden.ts), so the space a second password opens cannot be told apart from the real one.
// Unlocking with a fingerprint or face shows the same in every space too (lock/biometric.ts).
export default function Security() {
  const { space, setPasswordLock, lockNow, openSpace } = useLock();
  const { colors, look } = useTheme();
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [note, setNote] = useState('');
  // Which of the space's places for hidden chats the PIN buttons below are for.
  const [place, setPlace] = useState(0);
  // Whether a fingerprint or face opens Erevos: null where the phone cannot.
  const [biometric, setBiometric] = useState<boolean | null>(null);

  // Whether this phone keeps a locked space out of screenshots (lib/screen-privacy.ts).
  const [screenPrivate, setScreenPrivate] = useState<boolean | null>(null);

  const reload = async () => {
    setConfig(await loadLockConfig());
    setBiometric(biometricSealer.available() ? await biometricOn(biometricSealer) : null);
    setScreenPrivate(await loadScreenPrivacy());
  };

  async function setScreenPrivacy(on: boolean) {
    await saveScreenPrivacy(on);
    keepPrivate('lock', on);
    setScreenPrivate(on);
  }
  useEffect(() => {
    reload();
  }, []);

  if (!config) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  const locked = config.slots.length > 0 && config.direct !== space;

  async function turnOff() {
    const ok = await confirm(t('Turn off the lock'), t('Erevos will open without a password. The second password stops working too.'));
    if (!ok) return;
    await removePasswordLock(space, currentSpace().key);
    await turnOffBiometric(biometricSealer);
    setPasswordLock(false);
    await reload();
    setNote(t('The lock is off.'));
  }

  async function removeSecond() {
    const ok = await confirm(
      t('Remove second password'),
      t('The second password will stop working. What was in that space stays on the phone, and nothing opens it.'),
    );
    if (!ok) return;
    await removeSecondPassword(space);
    await reload();
    setNote(t('Saved.'));
  }

  async function removeHidden() {
    const ok = await confirm(
      t('Remove hidden chats PIN'),
      t('The hidden chats in place {place} will stop opening. They stay on the phone, and nothing opens them.', { place: place + 1 }),
    );
    if (!ok) return;
    await removeHiddenPassword(space, place);
    setNote(t('Saved.'));
  }

  async function turnOffFingerprint() {
    await turnOffBiometric(biometricSealer);
    await reload();
    setNote(t('Saved.'));
  }

  async function submit(password: string) {
    const { key } = currentSpace();
    if (editing === 'biometric') {
      try {
        const prompt = { title: t('Fingerprint or face for Erevos'), cancel: t('Cancel') };
        if (!(await turnOnBiometric(biometricSealer, space, password, prompt))) return false;
        setNote(t('Erevos opens with your fingerprint or face too.'));
      } catch (e) {
        if (!(e instanceof BiometricError && e.reason === 'cancelled')) throw e;
      }
      setEditing(null);
      await reload();
      return;
    }
    if (editing === 'hidden') {
      await setHiddenPassword(space, place, password, null);
    } else if (editing === 'second') {
      // A new space with a new key, and no hidden chats. Whatever was there before cannot be opened any more.
      const next = space + 1;
      const nextKey = newSpaceKey();
      await setLockPassword(next, password, nextKey);
      // It looks like this space, so the two cannot be told apart by their look.
      await saveSpaceData(next, nextKey, { ...EMPTY_SPACE, look });
      for (let pocket = 0; pocket < POCKETS; pocket++) await removeHiddenPassword(next, pocket);
      // The space a second password set inside the new one would open exists too.
      await prepareSpaces(next + 1);
      await prepareHidden(next + 2);
    } else if (locked) {
      await setLockPassword(space, password, key);
    } else {
      const other = await lockWithPassword(space, password, key);
      if (other) {
        // The password of another space (after the lock was turned off here): open it.
        setEditing(null);
        openSpace(other);
        return;
      }
      setPasswordLock(true);
      // The spaces second passwords open exist from now on, used or not, with keys no one has
      // until a password is set.
      await prepareSpaces(space + 1);
    }
    setEditing(null);
    await reload();
    setNote(t('Password saved.'));
  }

  return (
    <Page>
      <Text variant="title">{t('Lock')}</Text>

      <SectionTitle title={t('Lock when Erevos opens')} />
      <Row wrap>
        <Chip label={t('No lock')} selected={!locked} onPress={() => (locked ? turnOff() : undefined)} />
        <Chip label={t('Password')} selected={locked} onPress={() => (locked ? undefined : setEditing('own'))} />
      </Row>

      {locked ? (
        <>
          <Card>
            <Text variant="bodyStrong">{t('Password lock is on')}</Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t('Erevos asks for the password every time it opens and after 30 seconds in the background.')}
            </Text>
            <Row wrap>
              <Button title={t('Change password')} kind="secondary" compact onPress={() => setEditing('own')} />
              <Button title={t('Lock now')} kind="secondary" compact onPress={lockNow} />
            </Row>
          </Card>

          {CAN_KEEP_PRIVATE && screenPrivate !== null ? (
            <Card>
              <Text variant="bodyStrong">{t('Screen privacy')}</Text>
              <Text variant="caption" tone="muted" style={hint}>
                {screenPrivate
                  ? t('On: Erevos stays out of screenshots, screen recordings and the recent apps, so no one sees its last screen there.')
                  : t('Off: screenshots work, and the recent apps show the last screen of Erevos.')}{' '}
                {t('Hidden chats always stay out of them.')}
              </Text>
              <Row wrap>
                <Button title={screenPrivate ? t('Turn off') : t('Turn on')} kind="secondary" compact onPress={() => void setScreenPrivacy(!screenPrivate)} />
              </Row>
            </Card>
          ) : null}

          {biometric !== null ? (
            <Card>
              <Text variant="bodyStrong">{t('Fingerprint or face')}</Text>
              <Text variant="caption" tone="muted" style={hint}>
                {biometric
                  ? t('On: Erevos opens with your fingerprint or face too. The password always works.')
                  : t('Open Erevos with your fingerprint or face instead of typing the password. The password always works too.')}
              </Text>
              <Text variant="caption" tone="muted" style={hint}>
                {t('It opens only what your first password opens, never the space of a second password or hidden chats. Someone who holds you can press your finger to the phone: if that may happen, keep it off.')}
              </Text>
              <Row wrap>
                {biometric ? (
                  <Button title={t('Turn off')} kind="secondary" compact onPress={turnOffFingerprint} />
                ) : (
                  <Button title={t('Turn on')} kind="secondary" compact onPress={() => setEditing('biometric')} />
                )}
              </Row>
            </Card>
          ) : null}

          <Card>
            <Text variant="bodyStrong">{t('Second password')}</Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t('If someone forces you to open the app, type the second password instead. It opens a separate, empty Erevos with its own contacts and relay. Your real chats stay hidden, and nothing in the app shows that they exist.')}
            </Text>
            <Text variant="caption" tone="muted" style={hint}>
              {t('For privacy, the app never shows whether a second password is set. Setting one replaces the one before.')}
            </Text>
            <Row wrap>
              <Button title={t('Set second password')} kind="secondary" compact onPress={() => setEditing('second')} />
              <Button title={t('Remove second password')} kind="secondary" compact onPress={removeSecond} />
            </Row>
          </Card>
        </>
      ) : (
        <Text variant="caption" tone="muted" style={hint}>
          {t('Anyone who opens this phone can open Erevos. With a password you can also set a second password that opens a separate, empty space.')}
        </Text>
      )}

      <SectionTitle title={t('Hidden chats')} />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {t('Chats that open only with their own PIN: type it in the search on the home screen and press Enter. A wrong one is just a search. A chat moves into them from its details. They have their own relay queue, so while they are closed their messages wait on the relay and never show among your other chats.')}
        </Text>
        <Text variant="caption" tone="muted" style={hint}>
          {t('Every space has {n} places for hidden chats, each with its own PIN. For privacy, the app never shows whether any are set, so remember which places you use. A new PIN for a place starts it empty and replaces what was there. To keep them and change only the PIN, open them and change it there.', { n: POCKETS })}
        </Text>
        <Row wrap>
          {Array.from({ length: POCKETS }, (_, pocket) => (
            <Chip key={pocket} label={t('Place {n}', { n: pocket + 1 })} selected={place === pocket} onPress={() => setPlace(pocket)} />
          ))}
        </Row>
        <Row wrap>
          <Button title={t('Set hidden chats PIN')} kind="secondary" compact onPress={() => setEditing('hidden')} />
          <Button title={t('Remove hidden chats PIN')} kind="secondary" compact onPress={removeHidden} />
        </Row>
      </Card>

      {canRingInBackground ? <BackgroundCalls /> : null}

      <IntegrityCard />

      {note ? (
        <Text variant="label" color={colors.success}>
          {note}
        </Text>
      ) : null}

      <PasswordSheet
        visible={editing !== null}
        title={
          editing === 'hidden'
            ? t('Set hidden chats PIN, place {n}', { n: place + 1 })
            : editing === 'biometric'
              ? t('Fingerprint or face')
              : editing === 'second'
                ? t('Set second password')
                : locked
                  ? t('Change password')
                  : t('Set password')
        }
        repeat={editing !== 'biometric'}
        submitLabel={editing === 'biometric' ? t('Turn on') : t('Save')}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />
    </Page>
  );
}

// Receiving while Erevos is in the background (lib/background.ts), on this phone: the switch, the
// messages notice, and what Android still has to allow, each with the way to allow it.
function BackgroundCalls() {
  const [on, setOn] = useState<boolean | null>(null);
  const [notices, setNotices] = useState(true);
  const [allowed, setAllowed] = useState(backgroundState);

  useEffect(() => {
    loadRingInBackground().then(setOn);
    loadMessageNotices().then(setNotices);
    // Back from Android's settings: what it allows now.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAllowed(backgroundState());
    });
    return () => subscription.remove();
  }, []);

  function choose(next: boolean) {
    setOn(next);
    void saveRingInBackground(next).then(() => setAllowed(backgroundState()));
  }

  function chooseNotices(next: boolean) {
    setNotices(next);
    void saveMessageNotices(next);
  }

  if (on === null) return null;
  return (
    <>
      <SectionTitle title={t('In the background')} />
      <Row wrap>
        <Chip label={t('Receive and ring')} selected={on} onPress={() => choose(true)} />
        <Chip label={t('Only while Erevos shows')} selected={!on} onPress={() => choose(false)} />
      </Row>
      {on ? (
        <Row wrap>
          <Chip label={t('Say a message came')} selected={notices} onPress={() => chooseNotices(true)} />
          <Chip label={t('No notice')} selected={!notices} onPress={() => chooseNotices(false)} />
        </Row>
      ) : null}
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {on
            ? t('While a space is open, Erevos keeps running in the background: it waits at the relay and on the links to phones nearby, so messages come and a call rings with the phone\'s ringtone, over the lock screen too. Only that space\'s chats and groups; hidden chats only say that a message came, if you let them. The notices say only "Erevos", "Incoming call" and how many messages came, never who or what; on a locked phone the one for messages says only "Erevos". Swiped away from the recent apps, it goes on the same; stopped by Android, it takes nothing and cannot ring.')
            : t('Messages come, and a call rings, only while Erevos shows. A call shows as missed once you open Erevos.')}
        </Text>
        {on && allowed && !allowed.notices ? (
          <Text variant="caption" tone="muted" style={hint}>
            {t("Notices are off for Erevos in Android's settings: calls still ring, with no notice to tap, and no notice says a message came.")}
          </Text>
        ) : null}
        {on && allowed && (!allowed.battery || !allowed.fullScreen) ? (
          <Row wrap>
            {!allowed.battery ? <Button title={t('Keep running on battery')} kind="secondary" compact onPress={askBattery} /> : null}
            {!allowed.fullScreen ? <Button title={t('Show calls over the lock screen')} kind="secondary" compact onPress={askFullScreen} /> : null}
          </Row>
        ) : null}
        {on && allowed && !allowed.battery ? (
          <Text variant="caption" tone="muted" style={hint}>
            {t("Without it, Android's battery saving may stop Erevos after a while in the background.")}
          </Text>
        ) : null}
        {on ? (
          <Row wrap>
            <Button title={t('All permissions')} kind="ghost" compact onPress={() => router.push('/permissions')} />
          </Row>
        ) : null}
      </Card>
    </>
  );
}

// Hints read better a little larger and looser than captions.
const hint = { fontSize: 14, lineHeight: 20 };
