import { useState } from 'react';

import { SamePasswordError } from '../lock/config';
import { LockedOutError, lockedOutMessage } from '../lock/tries';
import { useColors } from '../theme/context';

import { Button, Field, Input, Row, Sheet, Text } from './ui';
import { t } from '../lib/i18n';

/** The fewest characters a password, PIN or second password has. */
export const MIN_PASSWORD = 4;
/** The fewest a backup's password has: once the file is elsewhere, it is all that guards it. */
export const MIN_BACKUP_PASSWORD = 12;

// A sheet that asks for a password: a new one, typed twice (`repeat`), of at least `least`
// characters, or one to open something. `hint` says what the new one is for, under its field.
// `onSubmit` returns false when the password opens nothing, and throws for the errors it shows.
export function PasswordSheet({ visible, title, repeat, least = MIN_PASSWORD, hint, submitLabel, onClose, onSubmit }: {
  visible: boolean;
  title: string;
  repeat: boolean;
  least?: number;
  hint?: string;
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
    if (repeat && [...first].length < least) return setError(t('Use at least {n} characters.', { n: least }));
    if (repeat && first !== second) return setError(t('The passwords do not match.'));
    setBusy(true);
    setError(null);
    try {
      if ((await onSubmit(first)) === false) {
        setFirst('');
        setError(t('Wrong password'));
      } else {
        clear();
      }
    } catch (e) {
      setError(
        e instanceof SamePasswordError
          ? t('Use a different password.')
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
      <Field label={repeat ? t('New password') : t('Password')} hint={repeat ? hint : undefined}>
        <Input
          value={first}
          onChangeText={setFirst}
          onSubmitEditing={repeat ? undefined : save}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={repeat ? t('New password') : t('Password')}
        />
      </Field>
      {repeat ? (
        <Field label={t('Repeat password')}>
          <Input
            value={second}
            onChangeText={setSecond}
            onSubmitEditing={save}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('Repeat password')}
          />
        </Field>
      ) : null}
      {error ? (
        <Text variant="label" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Row wrap>
        <Button title={busy ? t('One moment…') : submitLabel} onPress={save} disabled={!ready} compact />
        <Button title={t('Cancel')} kind="secondary" onPress={close} disabled={busy} compact />
      </Row>
    </Sheet>
  );
}
