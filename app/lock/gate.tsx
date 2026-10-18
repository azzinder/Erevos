import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { KeyboardAvoidingView } from '../components/keyboard';
import { Button, Input, Text } from '../components/ui';
import { useColors, useTheme } from '../theme/context';

import { unlock, type LockConfig, type Unlocked } from './config';
import { LockedOutError, lockedOutMessage } from './tries';

// The password screen shown before any space is opened. It looks the same whichever password is
// typed, and the password decides which space opens. Wrong passwords are counted on the phone
// (tries.ts): after a few, the next try must wait. It shows in the look last used (theme/look.ts).
export function PasswordGate({ config, onUnlock }: { config: LockConfig; onUnlock: (space: Unlocked) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useColors();

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Every slot is tried whatever the password, so the time says nothing about which one opened.
      const space = await unlock(config, password);
      if (space) {
        setPassword('');
        await onUnlock(space);
        return;
      }
      setError('Wrong password');
      setPassword('');
    } catch (e) {
      setError(e instanceof LockedOutError ? lockedOutMessage(e.until) : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.ground }]}>
      <View style={styles.column}>
        <Logo />
        <Text variant="title">Erevos</Text>
        <Text tone="muted" style={styles.body}>
          Enter your password
        </Text>
        <Input
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Password"
          placeholder="Password"
          style={styles.input}
        />
        {error ? (
          <Text variant="label" color={colors.danger} style={styles.stretch}>
            {error}
          </Text>
        ) : null}
        <Button title="Unlock" onPress={submit} disabled={!password} loading={busy} style={styles.stretch} />
      </View>
    </KeyboardAvoidingView>
  );
}

// The Erevos mark (brand/), white on a dark look and black on a light one.
const MARK = {
  dark: require('../assets/icon/mark-on-dark.png'),
  light: require('../assets/icon/mark-on-light.png'),
};

export function Logo({ size = 56 }: { size?: number }) {
  const { scheme } = useTheme();
  return (
    <Image
      source={MARK[scheme]}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  column: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 16,
  },
  body: {
    marginBottom: 12,
  },
  input: {
    alignSelf: 'stretch',
    fontSize: 18,
  },
  stretch: {
    alignSelf: 'stretch',
  },
});
