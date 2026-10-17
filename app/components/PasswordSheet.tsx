import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SamePasswordError } from '../lock/config';
import { LockedOutError, lockedOutMessage } from '../lock/tries';

// A sheet that asks for a password: a new one, typed twice (`repeat`), or one to open something.
// `onSubmit` returns false when the password opens nothing, and throws for the errors it shows.
export function PasswordSheet({ visible, title, repeat, submitLabel, onClose, onSubmit }: {
  visible: boolean;
  title: string;
  repeat: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean | void>;
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
    if (busy) return;
    if (repeat && first.length < 4) return setError('Use at least 4 characters.');
    if (repeat && first !== second) return setError('The passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      if ((await onSubmit(first)) === false) {
        setFirst('');
        setError('Wrong password');
      } else {
        clear();
      }
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

  const ready = !!first && (!repeat || !!second) && !busy;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>{repeat ? 'New password' : 'Password'}</Text>
          <TextInput
            value={first}
            onChangeText={setFirst}
            onSubmitEditing={repeat ? undefined : save}
            secureTextEntry
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={repeat ? 'New password' : 'Password'}
            style={styles.input}
          />
          {repeat ? (
            <>
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
            </>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttons}>
            <Pressable
              onPress={save}
              disabled={!ready}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, styles.primary, { opacity: !ready ? 0.5 : pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.buttonText, styles.primaryText]}>{busy ? 'One moment…' : submitLabel}</Text>
            </Pressable>
            <Pressable
              onPress={close}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, { opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: {
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
  primary: {
    backgroundColor: '#D9A441',
    borderColor: '#D9A441',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5EFE6',
  },
  primaryText: {
    color: '#0D0B09',
  },
});
