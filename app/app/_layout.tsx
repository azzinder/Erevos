import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { setupCrypto } from '../lib/crypto-setup';
import { loadLockConfig, type LockConfig } from '../lock/config';
import { LockContext, type LockState } from '../lock/context';
import { PasswordGate } from '../lock/gate';
import { prepareHidden } from '../lock/hidden';
import { loadOpenKey, setCurrentSpace } from '../lock/keys';
import { firstSpaceKey } from '../lock/space-data';

setupCrypto();

// Lock again after the app has been in the background this long.
const RELOCK_AFTER_MS = 30_000;

// Whether this start made sure every space has its hidden chats slot and entry (lock/hidden.ts).
let hiddenPrepared = false;

type Phase =
  | { kind: 'loading' }
  | { kind: 'locked'; config: LockConfig }
  | { kind: 'open'; space: number; passwordLock: boolean };

// Shows the password screen when the lock is on, and the app once a space is open. The space
// decides what the chat finds on the phone (lock/space-data.ts), and the screens start afresh
// in each space, so nothing of one shows in another.
export default function RootLayout() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const openSpace = useCallback((space: number, passwordLock: boolean, key: Uint8Array) => {
    setCurrentSpace(space, key);
    setPhase({ kind: 'open', space, passwordLock });
  }, []);

  const start = useCallback(async () => {
    // Nothing of the space that was open stays in memory.
    setCurrentSpace(null);
    // The keystore holds the same entries whatever is in use: made once per start, beside the
    // rest, since the password screen need not wait for them.
    if (!hiddenPrepared) {
      hiddenPrepared = true;
      void prepareHidden().catch(() => undefined);
    }
    const config = await loadLockConfig();
    if (config.direct !== null) {
      // The lock was turned off in a later space: that one opens directly, with its key from the keystore.
      openSpace(config.direct, false, await loadOpenKey(config.direct));
    } else if (config.slots.length > 0) {
      setPhase({ kind: 'locked', config });
    } else {
      openSpace(0, false, await firstSpaceKey());
    }
  }, [openSpace]);

  useEffect(() => {
    start().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [start]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state !== 'active' || backgroundAt.current === null) return;
      const away = Date.now() - backgroundAt.current;
      backgroundAt.current = null;
      const current = phaseRef.current;
      if (current.kind === 'open' && current.passwordLock && away > RELOCK_AFTER_MS) {
        start().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
      }
    });
    return () => subscription.remove();
  }, [start]);

  const lockState = useMemo<LockState>(
    () => ({
      space: phase.kind === 'open' ? phase.space : 0,
      passwordLock: phase.kind === 'open' && phase.passwordLock,
      setPasswordLock: (on) => setPhase((p) => (p.kind === 'open' ? { ...p, passwordLock: on } : p)),
      lockNow: () => {
        start().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
      },
      openSpace: ({ space, key }) => openSpace(space, true, key),
    }),
    [phase, start, openSpace],
  );

  if (error) {
    return (
      <View style={styles.failed}>
        <Text style={styles.failedTitle}>Erevos could not open</Text>
        <Text style={styles.failedBody}>{error}</Text>
      </View>
    );
  }
  if (phase.kind === 'loading') return <View style={styles.failed} />;
  if (phase.kind === 'locked') {
    return <PasswordGate config={phase.config} onUnlock={async ({ space, key }) => openSpace(space, true, key)} />;
  }
  // Each screen shows its own title, so the header only carries the back arrow, in the app's
  // dark colours. The home screen has no header.
  return (
    <LockContext.Provider value={lockState}>
      <Stack
        key={phase.space}
        screenOptions={{
          title: '',
          headerStyle: { backgroundColor: '#0D0B09' },
          headerTintColor: '#F5EFE6',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0D0B09' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </LockContext.Provider>
  );
}

const styles = StyleSheet.create({
  failed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0D0B09',
  },
  failedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5EFE6',
    textAlign: 'center',
  },
  failedBody: {
    marginTop: 8,
    fontSize: 15,
    color: '#BFB6AA',
    textAlign: 'center',
  },
});
