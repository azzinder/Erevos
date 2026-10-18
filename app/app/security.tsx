import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { IntegrityCard } from '../components/integrity-card';
import { PasswordSheet } from '../components/PasswordSheet';
import { Button, Card, Chip, Page, Row, SectionTitle, Text } from '../components/ui';
import { confirm } from '../lib/alert';
import { askBattery, askFullScreen, backgroundState, canRingInBackground, loadRingInBackground, saveRingInBackground } from '../lib/background';
import { loadLockConfig, lockWithPassword, removePasswordLock, removeSecondPassword, setLockPassword, type LockConfig } from '../lock/config';
import { useLock } from '../lock/context';
import { prepareHidden, removeHiddenPassword, setHiddenPassword } from '../lock/hidden';
import { currentSpace, newSpaceKey } from '../lock/keys';
import { EMPTY_SPACE, prepareSpaces, saveSpaceData } from '../lock/space-data';
import { useTheme } from '../theme/context';

// What the password sheet sets: this space's own password, its second password, or the
// password of its hidden chats.
type Editing = 'own' | 'second' | 'hidden' | null;

// Lock settings, as in LPHL FASOULI. Every space shows exactly the same screen, and nothing on it
// says whether a second password or hidden chats are set (see lock/config.ts and
// lock/hidden.ts), so the space a second password opens cannot be told apart from the real one.
export default function Security() {
  const { space, setPasswordLock, lockNow, openSpace } = useLock();
  const { colors, look } = useTheme();
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [note, setNote] = useState('');

  const reload = () => loadLockConfig().then(setConfig);
  useEffect(() => {
    reload();
  }, []);

  if (!config) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  const locked = config.slots.length > 0 && config.direct !== space;

  async function turnOff() {
    const ok = await confirm('Turn off the lock', 'Erevos will open without a password. The second password stops working too.');
    if (!ok) return;
    await removePasswordLock(space, currentSpace().key);
    setPasswordLock(false);
    await reload();
    setNote('The lock is off.');
  }

  async function removeSecond() {
    const ok = await confirm(
      'Remove second password',
      'The second password will stop working. What was in that space stays on the phone, and nothing opens it.',
    );
    if (!ok) return;
    await removeSecondPassword(space);
    await reload();
    setNote('Saved.');
  }

  async function removeHidden() {
    const ok = await confirm(
      'Remove hidden chats PIN',
      'The hidden chats will stop opening. They stay on the phone, and nothing opens them.',
    );
    if (!ok) return;
    await removeHiddenPassword(space);
    setNote('Saved.');
  }

  async function submit(password: string) {
    const { key } = currentSpace();
    if (editing === 'hidden') {
      await setHiddenPassword(space, password, null);
    } else if (editing === 'second') {
      // A new space with a new key, and no hidden chats. Whatever was there before cannot be opened any more.
      const next = space + 1;
      const nextKey = newSpaceKey();
      await setLockPassword(next, password, nextKey);
      // It looks like this space, so the two cannot be told apart by their look.
      await saveSpaceData(next, nextKey, { ...EMPTY_SPACE, look });
      await removeHiddenPassword(next);
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
    setNote('Password saved.');
  }

  return (
    <Page>
      <Text variant="title">Lock</Text>

      <SectionTitle title="Lock when Erevos opens" />
      <Row wrap>
        <Chip label="No lock" selected={!locked} onPress={() => (locked ? turnOff() : undefined)} />
        <Chip label="Password" selected={locked} onPress={() => (locked ? undefined : setEditing('own'))} />
      </Row>

      {locked ? (
        <>
          <Card>
            <Text variant="bodyStrong">Password lock is on</Text>
            <Text variant="caption" tone="muted" style={hint}>
              Erevos asks for the password every time it opens and after 30 seconds in the background.
            </Text>
            <Row wrap>
              <Button title="Change password" kind="secondary" compact onPress={() => setEditing('own')} />
              <Button title="Lock now" kind="secondary" compact onPress={lockNow} />
            </Row>
          </Card>

          <Card>
            <Text variant="bodyStrong">Second password</Text>
            <Text variant="caption" tone="muted" style={hint}>
              If someone forces you to open the app, type the second password instead. It opens a separate, empty Erevos with
              its own contacts and relay. Your real chats stay hidden, and nothing in the app shows that they exist.
            </Text>
            <Text variant="caption" tone="muted" style={hint}>
              For privacy, the app never shows whether a second password is set. Setting one replaces the one before.
            </Text>
            <Row wrap>
              <Button title="Set second password" kind="secondary" compact onPress={() => setEditing('second')} />
              <Button title="Remove second password" kind="secondary" compact onPress={removeSecond} />
            </Row>
          </Card>
        </>
      ) : (
        <Text variant="caption" tone="muted" style={hint}>
          Anyone who opens this phone can open Erevos. With a password you can also set a second password that opens a
          separate, empty space.
        </Text>
      )}

      <SectionTitle title="Hidden chats" />
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          Chats that open only with their own PIN: type it in the search on the home screen and press Enter. A wrong one is
          just a search. A chat moves into them from its details. They have their own relay queue, so while they are closed
          their messages wait on the relay and never show among your other chats.
        </Text>
        <Text variant="caption" tone="muted" style={hint}>
          For privacy, the app never shows whether hidden chats are set. A new PIN here starts them empty and
          replaces the ones before. To keep them and change only the PIN, open them and change it there.
        </Text>
        <Row wrap>
          <Button title="Set hidden chats PIN" kind="secondary" compact onPress={() => setEditing('hidden')} />
          <Button title="Remove hidden chats PIN" kind="secondary" compact onPress={removeHidden} />
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
            ? 'Set hidden chats PIN'
            : editing === 'second'
              ? 'Set second password'
              : locked
                ? 'Change password'
                : 'Set password'
        }
        repeat
        submitLabel="Save"
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />
    </Page>
  );
}

// Ringing while Erevos is in the background (lib/background.ts), on this phone: the switch, and
// what Android still has to allow, each with the way to allow it.
function BackgroundCalls() {
  const [on, setOn] = useState<boolean | null>(null);
  const [allowed, setAllowed] = useState(backgroundState);

  useEffect(() => {
    loadRingInBackground().then(setOn);
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

  if (on === null) return null;
  return (
    <>
      <SectionTitle title="Calls in the background" />
      <Row wrap>
        <Chip label="Ring" selected={on} onPress={() => choose(true)} />
        <Chip label="Only while Erevos shows" selected={!on} onPress={() => choose(false)} />
      </Row>
      <Card>
        <Text variant="caption" tone="muted" style={hint}>
          {on
            ? 'While a space is open, Erevos keeps running in the background and a call rings with the phone\'s ringtone, over the lock screen too. The notices say only "Erevos" and "Incoming call", never who calls. Swiped away from the recent apps, Erevos cannot ring.'
            : 'A call rings only while Erevos shows. Otherwise it shows as a missed call once you open Erevos.'}
        </Text>
        {on && allowed && !allowed.notices ? (
          <Text variant="caption" tone="muted" style={hint}>
            Notices are off for Erevos in Android's settings: calls still ring, with no notice to tap.
          </Text>
        ) : null}
        {on && allowed && (!allowed.battery || !allowed.fullScreen) ? (
          <Row wrap>
            {!allowed.battery ? <Button title="Keep running on battery" kind="secondary" compact onPress={askBattery} /> : null}
            {!allowed.fullScreen ? <Button title="Show calls over the lock screen" kind="secondary" compact onPress={askFullScreen} /> : null}
          </Row>
        ) : null}
        {on && allowed && !allowed.battery ? (
          <Text variant="caption" tone="muted" style={hint}>
            Without it, Android's battery saving may stop Erevos after a while in the background.
          </Text>
        ) : null}
      </Card>
    </>
  );
}

// Hints read better a little larger and looser than captions.
const hint = { fontSize: 14, lineHeight: 20 };
