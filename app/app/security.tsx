import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { PasswordSheet } from '../components/PasswordSheet';
import { loadLockConfig, lockWithPassword, removePasswordLock, removeSecondPassword, setLockPassword, type LockConfig } from '../lock/config';
import { useLock } from '../lock/context';
import { prepareHidden, removeHiddenPassword, setHiddenPassword } from '../lock/hidden';
import { currentSpace, newSpaceKey } from '../lock/keys';
import { EMPTY_SPACE, prepareSpaces, saveSpaceData } from '../lock/space-data';

// What the password sheet sets: this space's own password, its second password, or the
// password of its hidden chats.
type Editing = 'own' | 'second' | 'hidden' | null;

// Lock settings, as in LPHL FASOULI. Every space shows exactly the same screen, and nothing on it
// says whether a second password or hidden chats are set (see lock/config.ts and
// lock/hidden.ts), so the space a second password opens cannot be told apart from the real one.
export default function Security() {
  const { space, setPasswordLock, lockNow, openSpace } = useLock();
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [note, setNote] = useState('');

  const reload = () => loadLockConfig().then(setConfig);
  useEffect(() => {
    reload();
  }, []);

  if (!config) return <View style={styles.container} />;
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
      'Remove hidden chats password',
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
      await saveSpaceData(next, nextKey, EMPTY_SPACE);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Lock</Text>

      <Text style={styles.section}>Lock when Erevos opens</Text>
      <View style={styles.chips}>
        <Chip label="No lock" selected={!locked} onPress={() => (locked ? turnOff() : undefined)} />
        <Chip label="Password" selected={locked} onPress={() => (locked ? undefined : setEditing('own'))} />
      </View>

      {locked ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Password lock is on</Text>
            <Text style={styles.hint}>Erevos asks for the password every time it opens and after 30 seconds in the background.</Text>
            <View style={styles.buttons}>
              <Button title="Change password" onPress={() => setEditing('own')} />
              <Button title="Lock now" onPress={lockNow} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Second password</Text>
            <Text style={styles.hint}>
              If someone forces you to open the app, type the second password instead. It opens a separate, empty Erevos with
              its own contacts and relay. Your real chats stay hidden, and nothing in the app shows that they exist.
            </Text>
            <Text style={styles.hint}>
              For privacy, the app never shows whether a second password is set. Setting one replaces the one before.
            </Text>
            <View style={styles.buttons}>
              <Button title="Set second password" onPress={() => setEditing('second')} />
              <Button title="Remove second password" onPress={removeSecond} />
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.hint}>
          Anyone who opens this phone can open Erevos. With a password you can also set a second password that opens a
          separate, empty space.
        </Text>
      )}

      <Text style={styles.section}>Hidden chats</Text>
      <View style={styles.card}>
        <Text style={styles.hint}>
          Chats that open only with their own password, from Hidden chats in the chat screen. They have their own relay
          queue, so while they are closed their messages wait on the relay and never show among your other chats.
        </Text>
        <Text style={styles.hint}>
          For privacy, the app never shows whether hidden chats are set. A new password here starts them empty and
          replaces the ones before. To keep them and change only the password, open them and change it there.
        </Text>
        <View style={styles.buttons}>
          <Button title="Set hidden chats password" onPress={() => setEditing('hidden')} />
          <Button title="Remove hidden chats password" onPress={removeHidden} />
        </View>
      </View>

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <PasswordSheet
        visible={editing !== null}
        title={
          editing === 'hidden'
            ? 'Set hidden chats password'
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
      <StatusBar style="light" />
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Button({ title, onPress, primary, disabled }: { title: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{title}</Text>
    </Pressable>
  );
}

// Alert has no buttons on the web preview, where the browser's own dialog stands in.
function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: title, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0B09',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5EFE6',
  },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#BFB6AA',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A4036',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: '#D9A441',
    borderColor: '#D9A441',
  },
  chipText: {
    fontSize: 15,
    color: '#F5EFE6',
  },
  chipTextOn: {
    color: '#0D0B09',
    fontWeight: '600',
  },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E2822',
    backgroundColor: '#17140F',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EFE6',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#BFB6AA',
  },
  note: {
    fontSize: 14,
    color: '#7FB2A8',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#4A4036',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#D9A441',
    borderColor: '#D9A441',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5EFE6',
  },
  buttonTextPrimary: {
    color: '#0D0B09',
  },
});
