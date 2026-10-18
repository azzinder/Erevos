import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View } from 'react-native';

import { AlertHost } from '../components/alert-host';
import { CallHost } from '../components/call-host';
import { ScreenBackdrop, useBackdropSpec } from '../components/backdrop';
import { KeyboardProvider } from '../components/keyboard';
import { Text } from '../components/ui';
import { startBackground } from '../lib/background';
import { runAutoBackup } from '../lib/backup-folder';
import { currentCall } from '../lib/call';
import { onCallChange } from '../lib/calls';
import { cryptoReady, setupCrypto } from '../lib/crypto-setup';
import { startIntegrityAlarm } from '../lib/integrity';
import { setAppShown, startReceiver } from '../lib/receiver';
import { forgetSmsLink } from '../lib/sms-relay';
import { forgetSpaceChats } from '../lib/space-chats';
import { loadLockConfig, type LockConfig } from '../lock/config';
import { LockContext, type LockState } from '../lock/context';
import { PasswordGate } from '../lock/gate';
import { prepareHidden } from '../lock/hidden';
import { loadOpenKey, setCurrentSpace } from '../lock/keys';
import { firstSpaceKey, loadSpaceData, updateCurrentSpaceData } from '../lock/space-data';
import { space as gap } from '../theme/colors';
import { ThemeProvider, useTheme } from '../theme/context';
import { ensureStyleFonts } from '../theme/fonts';
import { DEFAULT_LOOK, loadLockScreenLook, saveLockScreenLook, type Look } from '../theme/look';

setupCrypto();

// Lock again after the app has been in the background this long.
const RELOCK_AFTER_MS = 30_000;
// An automatic backup, when one is due, waits this long after a space opens, so the chats show first.
const BACKUP_AFTER_MS = 10_000;

// Whether this start made sure every space has its hidden chats slot and entry (lock/hidden.ts).
let hiddenPrepared = false;

type Phase =
  | { kind: 'loading' }
  | { kind: 'locked'; config: LockConfig }
  | { kind: 'open'; space: number; passwordLock: boolean };

// Shows the password screen when the lock is on, and the app once a space is open. The space
// decides what the chat finds on the phone (lock/space-data.ts) and how the app looks
// (theme/look.ts), and the screens start afresh in each space, so nothing of one shows in another.
// The password screen shows the look last used.
export default function RootLayout() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  const backgroundAt = useRef<number | null>(null);
  const relockAfterCall = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const fail = useCallback((e: unknown) => setError(e instanceof Error ? e.message : String(e)), []);

  // A look is shown once its style's fonts are ready, so no screen shows without them.
  const show = useCallback(async (next: Look) => {
    await ensureStyleFonts(next.style);
    setLook(next);
  }, []);

  const openSpace = useCallback(
    async (space: number, passwordLock: boolean, key: Uint8Array) => {
      setCurrentSpace(space, key);
      const kept = (await loadSpaceData(space, key)).look ?? (await loadLockScreenLook());
      await show(kept);
      setPhase({ kind: 'open', space, passwordLock });
      saveLockScreenLook(kept).catch(() => undefined);
      setTimeout(() => void runAutoBackup().catch(() => undefined), BACKUP_AFTER_MS);
    },
    [show],
  );

  const start = useCallback(async () => {
    // Nothing of the space that was open stays in memory, nor its screens: they start afresh
    // once a space opens (after a backup is restored too).
    setCurrentSpace(null);
    forgetSpaceChats();
    forgetSmsLink();
    setPhase({ kind: 'loading' });
    // The keystore holds the same entries whatever is in use: made once per start, beside the
    // rest, since the password screen need not wait for them.
    if (!hiddenPrepared) {
      hiddenPrepared = true;
      void prepareHidden().catch(() => undefined);
    }
    // On a computer the core loads beside the app, and nothing that needs it opens before it.
    await cryptoReady();
    const config = await loadLockConfig();
    if (config.direct !== null) {
      // The lock was turned off in a later space: that one opens directly, with its key from the keystore.
      await openSpace(config.direct, false, await loadOpenKey(config.direct));
    } else if (config.slots.length > 0) {
      await show(await loadLockScreenLook());
      setPhase({ kind: 'locked', config });
    } else {
      await openSpace(0, false, await firstSpaceKey());
    }
  }, [openSpace, show]);

  useEffect(() => {
    start().catch(fail);
  }, [start, fail]);

  // The web app's service worker refused code from the server: said at once, locked or open.
  useEffect(() => startIntegrityAlarm(), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state !== 'active' || backgroundAt.current === null) return;
      const away = Date.now() - backgroundAt.current;
      backgroundAt.current = null;
      const current = phaseRef.current;
      if (current.kind !== 'open' || !current.passwordLock || away <= RELOCK_AFTER_MS) return;
      // A call that rang in the background, or goes on, would end with the space: it locks once
      // the call ends.
      if (currentCall()) relockAfterCall.current = true;
      else start().catch(fail);
    });
    const stopCalls = onCallChange(() => {
      if (!relockAfterCall.current || currentCall()) return;
      relockAfterCall.current = false;
      if (phaseRef.current.kind === 'open') start().catch(fail);
    });
    return () => {
      subscription.remove();
      stopCalls();
    };
  }, [start, fail]);

  // A look changed on the Appearance screen: kept in the open space, and copied for the password screen.
  const keepLook = useCallback(async (next: Look) => {
    setLook(next);
    if (phaseRef.current.kind !== 'open') return;
    await Promise.all([updateCurrentSpaceData({ look: next }), saveLockScreenLook(next)]);
  }, []);

  const lockState = useMemo<LockState>(
    () => ({
      space: phase.kind === 'open' ? phase.space : 0,
      passwordLock: phase.kind === 'open' && phase.passwordLock,
      setPasswordLock: (on) => setPhase((p) => (p.kind === 'open' ? { ...p, passwordLock: on } : p)),
      lockNow: () => {
        start().catch(fail);
      },
      openSpace: ({ space, key }) => {
        openSpace(space, true, key).catch(fail);
      },
    }),
    [phase, start, openSpace, fail],
  );

  // Keyboard tracking for every screen and sheet, the password screen too (components/keyboard.tsx).
  return (
    <KeyboardProvider>
      <ThemeProvider look={look} onChange={keepLook}>
        <Shell phase={phase} error={error} lockState={lockState} onUnlock={({ space, key }) => openSpace(space, true, key)} />
      </ThemeProvider>
    </KeyboardProvider>
  );
}

function Shell({ phase, error, lockState, onUnlock }: {
  phase: Phase;
  error: string | null;
  lockState: LockState;
  onUnlock: (space: { space: number; key: Uint8Array }) => Promise<void>;
}) {
  const { colors, scheme } = useTheme();
  const spec = useBackdropSpec();
  const bar = <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;

  if (error) {
    return (
      <ScreenBackdrop>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: gap.xl, gap: gap.sm, backgroundColor: colors.ground }}>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            Erevos could not open
          </Text>
          <Text tone="muted" style={{ textAlign: 'center' }}>
            {error}
          </Text>
        </View>
        {bar}
      </ScreenBackdrop>
    );
  }
  if (phase.kind === 'loading') {
    return (
      <ScreenBackdrop>
        <View style={{ flex: 1, backgroundColor: colors.ground }} />
        {bar}
      </ScreenBackdrop>
    );
  }
  if (phase.kind === 'locked') {
    return (
      <ScreenBackdrop>
        <PasswordGate config={phase.config} onUnlock={onUnlock} />
        <AlertHost />
        {bar}
      </ScreenBackdrop>
    );
  }
  // Each screen shows its own title, so the header only carries the back arrow. The home screen
  // has no header. Under a backdrop (Nocturne's glow, the glass's wallpaper) every screen lies on
  // it, and the header is drawn over it: the glass's dense pane, or see-through.
  const headerColor = !spec ? colors.sheet : spec.kind === 'wall' ? colors.sheet : 'transparent';
  return (
    <LockContext.Provider value={lockState}>
      <Stack
        key={phase.space}
        // A chat draws its own backdrop, in its own look (theme/chat-theme.tsx).
        screenLayout={({ children, route }) => (route.name === 'chat' ? children : <ScreenBackdrop>{children}</ScreenBackdrop>)}
        screenOptions={{
          title: '',
          headerStyle: { backgroundColor: headerColor },
          headerTransparent: spec !== null,
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.ground },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
      </Stack>
      <Receiver key={`receiver-${phase.space}`} />
      <CallHost key={`call-${phase.space}`} />
      <AlertHost />
      {bar}
    </LockContext.Provider>
  );
}

// Takes the space's messages while it is open, whatever screen shows (lib/receiver.ts), and tells
// it whether the app shows: only then do contacts hear the phone is open.
function Receiver() {
  useEffect(() => startReceiver(), []);
  // On Android, it goes on while Erevos is in the background, so a call rings (lib/background.ts).
  useEffect(() => startBackground(), []);
  useEffect(() => {
    setAppShown(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => setAppShown(state === 'active'));
    return () => subscription.remove();
  }, []);
  return null;
}
