import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { unlock, type LockConfig, type Unlocked } from './config';
import { LockedOutError, lockedOutMessage } from './tries';

// The password screen shown before any space is opened. It looks the same whichever password is
// typed, and the password decides which space opens. Wrong passwords are counted on the phone
// (tries.ts): after a few, the next try must wait.
export function PasswordGate({ config, onUnlock }: { config: LockConfig; onUnlock: (space: Unlocked) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.column}>
        <Logo />
        <Text style={styles.title}>Erevos</Text>
        <Text style={styles.body}>Enter your password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Password"
          placeholder="Password"
          placeholderTextColor="#A39A8D"
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={submit}
          accessibilityRole="button"
          disabled={!password || busy}
          style={({ pressed }) => [styles.button, { opacity: !password ? 0.5 : pressed ? 0.85 : 1 }]}
        >
          {busy ? <ActivityIndicator color="#0D0B09" /> : <Text style={styles.buttonText}>Unlock</Text>}
        </Pressable>
      </View>
      <StatusBar style="light" />
    </KeyboardAvoidingView>
  );
}

// The crescent from the design: a gold disc with a dark one over its upper right.
export function Logo({ size = 56 }: { size?: number }) {
  const unit = size / 28;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.disc, { left: 2 * unit, top: 2 * unit, width: 24 * unit, height: 24 * unit, borderRadius: 12 * unit, backgroundColor: '#D9A441' }]} />
      <View style={[styles.disc, { left: 8 * unit, top: 0, width: 21 * unit, height: 21 * unit, borderRadius: 10.5 * unit, backgroundColor: '#0D0B09' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0D0B09',
  },
  column: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5EFE6',
  },
  body: {
    fontSize: 15,
    color: '#BFB6AA',
    marginBottom: 12,
  },
  input: {
    alignSelf: 'stretch',
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4A4036',
    backgroundColor: '#2A2520',
    color: '#F5EFE6',
    fontSize: 18,
  },
  error: {
    alignSelf: 'stretch',
    fontSize: 14,
    fontWeight: '600',
    color: '#E08F6E',
  },
  button: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D9A441',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0B09',
  },
  disc: {
    position: 'absolute',
  },
});
