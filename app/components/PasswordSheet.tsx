import { useState } from 'react';

import { SamePasswordError } from '../lock/config';
import { LockedOutError, lockedOutMessage } from '../lock/tries';
import { useColors } from '../theme/context';

import { Button, Field, Input, Row, Sheet, Text } from './ui';

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
  const colors = useColors();

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
    <Sheet visible={visible} onClose={close} title={title}>
      <Field label={repeat ? 'New password' : 'Password'}>
        <Input
          value={first}
          onChangeText={setFirst}
          onSubmitEditing={repeat ? undefined : save}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={repeat ? 'New password' : 'Password'}
        />
      </Field>
      {repeat ? (
        <Field label="Repeat password">
          <Input
            value={second}
            onChangeText={setSecond}
            onSubmitEditing={save}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Repeat password"
          />
        </Field>
      ) : null}
      {error ? (
        <Text variant="label" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Row wrap>
        <Button title={busy ? 'One moment…' : submitLabel} onPress={save} disabled={!ready} compact />
        <Button title="Cancel" kind="secondary" onPress={close} disabled={busy} compact />
      </Row>
    </Sheet>
  );
}
