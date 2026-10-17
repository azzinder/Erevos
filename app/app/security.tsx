import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import {
  loadLockConfig,
  lockWithPassword,
  removePasswordLock,
  removeSecondPassword,
  SamePasswordError,
  setLockPassword,
  type LockConfig,
} from '../lock/config';
import { useLock } from '../lock/context';
import { currentSpace, newSpaceKey } from '../lock/keys';
import { EMPTY_SPACE, prepareSpaces, saveSpaceData } from '../lock/space-data';
import { LockedOutError, lockedOutMessage } from '../lock/tries';

// What the password sheet sets: this space's own password, or its second password.
type Editing = 'own' | 'second' | null;

// Lock settings, as in LPHL FASOULI. Every space shows exactly the same screen, and nothing on it
// says whether a second password is set (see lock/config.ts), so the space a second password
// opens cannot be told apart from the real one.
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

  async function submit(password: string) {
    const { key } = currentSpace();
    if (editing === 'second') {
      // A new space with a new key. Whatever was there before cannot be opened any more.
      const next = space + 1;
      const nextKey = newSpaceKey();
      await setLockPassword(next, password, nextKey);
      await saveSpaceData(next, nextKey, EMPTY_SPACE);
      // The space a second password set inside the new one would open exists too.
      await prepareSpaces(next + 1);
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

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <PasswordSheet
        visible={editing !== null}
        title={editing === 'second' ? 'Set second password' : locked ? 'Change password' : 'Set password'}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />
      <StatusBar style="light" />
    </ScrollView>
  );
}

function PasswordSheet({ visible, title, onClose, onSubmit }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clear() {
    setFirst('');
    setSecond('');
    setError(null);
  }

  function close() {
    clear();
    onClose();
  }

  async function save() {
    if (first.length < 4) return setError('Use at least 4 characters.');
    if (first !== second) return setError('The passwords do not match.');
    setBusy(true);
    try {
      await onSubmit(first);
      clear();
    } catch (e) {
      setError(
        e instanceof SamePasswordError
          ? 'Use a different password.'
          : e instanceof LockedOutError
            ? lockedOutMessage(e.until)
            : e instanceof Error
              ? e.message
              : String(e),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.label}>New password</Text>
          <TextInput
            value={first}
            onChangeText={setFirst}
            secureTextEntry
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="New password"
            style={styles.input}
          />
          <Text style={styles.label}>Repeat password</Text>
          <TextInput
            value={second}
            onChangeText={setSecond}
            onSubmitEditing={save}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Repeat password"
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttons}>
            <Button title={busy ? 'Saving…' : 'Save'} primary disabled={!first || !second || busy} onPress={save} />
            <Button title="Cancel" disabled={busy} onPress={close} />
          </View>
        </View>
      </View>
    </Modal>
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    gap: 10,
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#17140F',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5EFE6',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#BFB6AA',
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A4036',
    backgroundColor: '#2A2520',
    color: '#F5EFE6',
    fontSize: 16,
  },
  error: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E08F6E',
  },
});
