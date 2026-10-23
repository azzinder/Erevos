import { router, Stack, useGlobalSearchParams, useRootNavigationState, usePathname, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View } from 'react-native';

import { AlertHost } from '../components/alert-host';
import { CallHost, watchCalls } from '../components/call-host';
import { HiddenRingHost } from '../components/hidden-ring-screen';
import { ScreenBackdrop, useBackdropSpec } from '../components/backdrop';
import { KeyboardProvider } from '../components/keyboard';
import { SwipeBack } from '../components/swipe-back';
import { Text } from '../components/ui';
import { startBackground } from '../lib/background';
import { runAutoBackup } from '../lib/backup-folder';
import { currentCall } from '../lib/call';
import { endCall, onCallChange } from '../lib/calls';
import { forgetOffered } from '../lib/contact-code';
import { cryptoReady, setupCrypto } from '../lib/crypto-setup';
import { forgetLinks } from '../lib/devices';
import { endGroupCall } from '../lib/group-calls';
import { loadLang, t, useLang, type Lang } from '../lib/i18n';
import { startIntegrityAlarm } from '../lib/integrity';
import { startNearbyLinks } from '../lib/nearby-links';
import { linkMove, linkParts, lockingKeepsLink, onLinkHeld, peekLink, RELOCK_MS, screenParams, takeLink } from '../lib/open-link';
import { phoneOpensLocked } from '../lib/phone-open';
import { forgetHistory } from '../lib/phone-log';
import { noticeLanguage, noticeSeen } from '../lib/push-notice';
import { refreshKnownNames, watchKnownNames } from '../lib/known-names';
import { forgetSpaceMover } from '../lib/queue-move';
import { setAppShown, startReceiver } from '../lib/receiver';
import { setThroughTor } from '../lib/relay';
import { startSmsLater } from '../lib/sms-later';
import { forgetSmsLink } from '../lib/sms-relay';
import { forgetSpaceChats } from '../lib/space-chats';
import { keepSpaceRunning, onSpaceGatedChange, setSpaceGated, spaceGated, stopSpaceRunning } from '../lib/space-running';
import { forgetSpare } from '../lib/spare';
import { callAudio } from '../modules/erevos-call';
import { clearKnownNames, forgetKnownNamesAfter } from '../modules/erevos-phone';
import { refreshWidget } from '../modules/erevos-widget';
import { forgetSpaceGroups } from '../lib/space-groups';
import { startPublicDoors } from '../lib/space-public-groups';
import { applyTor } from '../lib/tor';
import { forgetWelcome } from '../lib/welcome';
import { hardenLock, loadLockConfig, type LockConfig } from '../lock/config';
import { LockContext, type LockState } from '../lock/context';
import { PasswordGate } from '../lock/gate';
import { prepareHidden } from '../lock/hidden';
import { forgetOpenedQueues } from '../lock/queues-data';
import { currentSpace, loadOpenKey, setCurrentSpace } from '../lock/keys';
import { firstSpaceKey, loadSpaceData, updateCurrentSpaceData } from '../lock/space-data';
import { space as gap } from '../theme/colors';
import { ThemeProvider, useTheme } from '../theme/context';
import { ensureStyleFonts } from '../theme/fonts';
import { DEFAULT_LOOK, loadLockScreenLook, saveLockScreenLook, type Look } from '../theme/look';
import { keepPrivate, loadScreenPrivacy } from '../lib/screen-privacy';
import { PhoneView } from './phone';

setupCrypto();
// Erevos keeps no cookies, so its relay connections do not load the phone's WebView, which Android
// would close Erevos with at each update of it, in the background too (modules/erevos-call, NoCookies).
callAudio?.noCookies?.();

// Lock again after the app has been in the background this long.
const RELOCK_AFTER_MS = 30_000;
// An automatic backup, when one is due, waits this long after a space opens, so the chats show first.
const BACKUP_AFTER_MS = 10_000;

// Whether this start made sure every space has its hidden chats slot and entry (lock/hidden.ts).
let hiddenPrepared = false;

type Phase =
  | { kind: 'loading' }
  // `behind`: the space that goes on behind the password screen, until its password opens it again.
  | { kind: 'locked'; config: LockConfig; behind?: number }
  | { kind: 'open'; space: number; passwordLock: boolean };

// The space that was open when Android took the screens away (Erevos swiped away from the recent
// apps), its look, and since when Erevos was away. The space goes on without them
// (lib/space-running.ts), and the screens that start again find it as after the background.
// `gated`: the password screen showed in front of it, and shows again.
let left: { space: number; passwordLock: boolean; look: Look; at: number; gated: boolean } | null = null;

// Shows the password screen when the lock is on, and the app once a space is open. The space
// decides what the chat finds on the phone (lock/space-data.ts) and how the app looks
// (theme/look.ts), and the screens start afresh in each space, so nothing of one shows in another.
// The password screen shows the look last used. With the password lock, locking puts the password
// screen in front of the open space, which goes on behind it, taking messages and ringing calls
// (lib/space-running.ts): its screens go, and with them the hidden chats. Its password shows it
// again; another space's closes it first.
export default function RootLayout() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  const lookRef = useRef(look);
  const backgroundAt = useRef<number | null>(null);
  const relockAfterCall = useRef(false);
  const lang = useLang();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    lookRef.current = look;
  }, [look]);
  // A space with a password lock keeps its screens out of screenshots and the recent apps
  // preview, unless turned off in Lock (lib/screen-privacy.ts).
  const privateLock = phase.kind === 'open' && phase.passwordLock;
  useEffect(() => {
    let live = true;
    if (!privateLock) keepPrivate('lock', false);
    else void loadScreenPrivacy().then((on) => live && keepPrivate('lock', on)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [privateLock]);

  const fail = useCallback((e: unknown) => {
    stopSpaceRunning();
    setError(e instanceof Error ? e.message : String(e));
  }, []);

  // A look is shown once its style's fonts are ready, so no screen shows without them.
  const show = useCallback(async (next: Look) => {
    await ensureStyleFonts(next.style);
    setLook(next);
  }, []);

  const openSpace = useCallback(
    async (space: number, passwordLock: boolean, key: Uint8Array) => {
      setCurrentSpace(space, key);
      const data = await loadSpaceData(space, key);
      // Tor starts in the background, through the space's bridges if it has any; until it is
      // ready, the space's requests wait for it.
      applyTor(data.tor, data.bridges).catch(() => undefined);
      const kept = data.look ?? (await loadLockScreenLook());
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
    closeSpace();
    // A link Erevos came back with opens after the password (lib/open-link.ts).
    lockingKeepsLink();
    setPhase({ kind: 'loading' });
    // The keystore holds the same entries whatever is in use: made once per start, beside the
    // rest, since the password screen need not wait for them.
    if (!hiddenPrepared) {
      hiddenPrepared = true;
      void cryptoReady().then(() => prepareHidden()).catch(() => undefined);
    }
    // On a computer the core loads beside the app, and nothing that needs it opens before it.
    await cryptoReady();
    // Password slots from before Argon2id get it now, while the password screen shows (after a
    // backup is restored too); whatever changes the lock waits for it.
    void hardenLock().catch(() => undefined);
    await loadLang();
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

  // The password screen in front of the open space, which goes on behind it. Its contacts' names
  // leave the call screen, and a link Erevos came back with opens after the password.
  const gate = useCallback(
    async (space: number) => {
      setSpaceGated(true);
      clearKnownNames();
      lockingKeepsLink();
      const config = await loadLockConfig();
      if (config.direct !== null || config.slots.length === 0) return start();
      setPhase({ kind: 'locked', config, behind: space });
    },
    [start],
  );

  // Locks the space that shows: behind the password screen with the password lock, otherwise as Erevos starts.
  const relock = useCallback(() => {
    const current = phaseRef.current;
    return current.kind === 'open' && current.passwordLock ? gate(current.space) : start();
  }, [gate, start]);

  // A password typed or a fingerprint given: the space behind the password screen shows again, or,
  // for another, it closes and that one opens.
  const unlocked = useCallback(
    async ({ space, key }: { space: number; key: Uint8Array }) => {
      const current = phaseRef.current;
      const behind = current.kind === 'locked' ? current.behind : undefined;
      if (behind !== undefined && behind === space && spaceGated() && sameKey(openKey(), key)) {
        setSpaceGated(false);
        forgetKnownNamesAfter(-1);
        void refreshKnownNames();
        setPhase({ kind: 'open', space, passwordLock: true });
        return;
      }
      if (behind !== undefined) closeSpace();
      await openSpace(space, true, key);
    },
    [openSpace],
  );

  // Back to the space that went on without its screens, as from the background: while the lock
  // would not have closed it yet, or a call rings or goes on, which locks once it ends. Otherwise
  // the password screen comes in front of it.
  const goOn = useCallback(
    async (was: NonNullable<typeof left>) => {
      await show(was.look);
      if (was.passwordLock && Date.now() - was.at > RELOCK_AFTER_MS) relockAfterCall.current = true;
      else if (was.passwordLock) forgetKnownNamesAfter(-1);
      setPhase({ kind: 'open', space: was.space, passwordLock: was.passwordLock });
    },
    [show],
  );

  useEffect(() => {
    const was = left;
    left = null;
    let open: number | null = null;
    try {
      open = currentSpace().space;
    } catch {
      // No space is open.
    }
    if (was === null || was.space !== open) start().catch(fail);
    else if (!was.gated && (!was.passwordLock || Date.now() - was.at <= RELOCK_AFTER_MS || currentCall() !== null)) goOn(was).catch(fail);
    else
      show(was.look)
        .then(() => gate(was.space))
        .catch(fail);
  }, [start, goOn, gate, show, fail]);

  // Android took the screens away, Erevos swiped away from the recent apps: the open space goes
  // on, ready for messages and calls, and a call ends, as it would have no screen.
  useEffect(
    () => () => {
      const current = phaseRef.current;
      const at = backgroundAt.current ?? Date.now();
      if (current.kind === 'open') left = { space: current.space, passwordLock: current.passwordLock, look: lookRef.current, at, gated: false };
      else if (current.kind === 'locked' && current.behind !== undefined && spaceGated()) left = { space: current.behind, passwordLock: true, look: lookRef.current, at, gated: true };
      else left = null;
      endCall();
      endGroupCall();
    },
    [],
  );

  // Android's notices, shown while the app is closed, say it in the app's language too.
  useEffect(() => {
    callAudio?.setLanguage?.(lang);
    // The widget's words follow the app's language (modules/erevos-widget).
    refreshWidget();
    // So does the web app's notice while it is closed (pwa/sw.js).
    noticeLanguage(lang);
  }, [lang]);

  // The web app's notice tells of what came since Erevos was last on the screen: from nothing again
  // when it shows, and when it leaves (not when it opens in a tab out of sight).
  useEffect(() => {
    if (AppState.currentState === 'active') noticeSeen();
    const subscription = AppState.addEventListener('change', () => noticeSeen());
    return () => subscription.remove();
  }, []);

  // The web app's service worker refused code from the server: said at once, locked or open.
  useEffect(() => startIntegrityAlarm(), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const current = phaseRef.current;
      if (state === 'background') {
        backgroundAt.current = Date.now();
        // What was read here is no longer new on the widget.
        refreshWidget();
        // The names of the space's contacts go when it would lock, even if the app does not run then.
        if (current.kind === 'open' && current.passwordLock) forgetKnownNamesAfter(RELOCK_AFTER_MS);
      }
      if (state !== 'active' || backgroundAt.current === null) return;
      const away = Date.now() - backgroundAt.current;
      backgroundAt.current = null;
      if (current.kind !== 'open' || !current.passwordLock) return;
      if (away <= RELOCK_AFTER_MS) {
        forgetKnownNamesAfter(-1);
        return;
      }
      // A call that rang in the background, or goes on, would lose its screen behind the password:
      // it locks once the call ends.
      if (currentCall()) relockAfterCall.current = true;
      else gate(current.space).catch(fail);
    });
    const stopCalls = onCallChange(() => {
      if (!relockAfterCall.current || currentCall()) return;
      relockAfterCall.current = false;
      if (phaseRef.current.kind === 'open') relock().catch(fail);
    });
    return () => {
      subscription.remove();
      stopCalls();
    };
  }, [gate, relock, fail]);

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
        relock().catch(fail);
      },
      closeNow: () => {
        start().catch(fail);
      },
      openSpace: ({ space, key }) => {
        openSpace(space, true, key).catch(fail);
      },
    }),
    [phase, start, relock, openSpace, fail],
  );

  // Keyboard tracking for every screen and sheet, the password screen too (components/keyboard.tsx).
  return (
    <KeyboardProvider>
      <ThemeProvider look={look} onChange={keepLook}>
        <Shell lang={lang} phase={phase} error={error} lockState={lockState} onUnlock={unlocked} />
      </ThemeProvider>
    </KeyboardProvider>
  );
}

function Shell({ lang, phase, error, lockState, onUnlock }: {
  lang: Lang;
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
            {t('Erevos could not open')}
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
        <Locked lang={lang} config={phase.config} onUnlock={onUnlock} />
        {/* A call to the space behind the password screen shows over it. */}
        {phase.behind !== undefined ? <CallHost key={`call-${phase.behind}`} /> : null}
        <AlertHost />
        {bar}
      </ScreenBackdrop>
    );
  }
  // Each screen shows its own title, so the header only carries the back arrow. The home screen
  // has no header. The screens start afresh in a new language too (lib/i18n.ts), on the home
  // screen, where its menu changes it. Under a backdrop (Nocturne's glow, the glass's wallpaper) every screen lies on
  // it, and the header is drawn over it: the glass's dense pane, or see-through.
  const headerColor = !spec ? colors.sheet : spec.kind === 'wall' ? colors.sheet : 'transparent';
  return (
    <LockContext.Provider value={lockState}>
      <Stack
        key={`${phase.space}-${lang}`}
        // A chat draws its own backdrop, in its own look (theme/chat-theme.tsx), and goes back by a
        // swipe in its own way, as its back arrow does. Every other screen goes back by a swipe to
        // the right (components/swipe-back.tsx).
        screenLayout={({ children, route }) =>
          route.name === 'chat' ? (
            children
          ) : (
            <ScreenBackdrop>
              <SwipeBack>{children}</SwipeBack>
            </ScreenBackdrop>
          )
        }
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
        {/* A group draws its own bar at the top, with its back arrow, as a chat does. */}
        <Stack.Screen name="group" options={{ headerShown: false }} />
      </Stack>
      <OpenLink key={`link-${phase.space}-${lang}`} />
      <Receiver space={phase.space} />
      <CallHost key={`call-${phase.space}`} />
      <HiddenRingHost key={`ring-${phase.space}`} />
      <AlertHost />
      {bar}
    </LockContext.Provider>
  );
}

// How long before Erevos goes to the background a call made on the locked Phone may be, for it to
// be what took Erevos there.
const CALL_LEAVES_MS = 10_000;

// With Erevos locked: the password screen, or the Phone, when a link asks for it and it opens
// without the password (lib/phone-open.ts): its icon, a tel: link, the notice of a missed call.
// Any other link waits for the password. Back from the background after Erevos would have locked,
// the password screen shows again, unless a call made on the Phone took it there, or the Phone's
// link brought it back.
function Locked({ lang, config, onUnlock }: { lang: Lang; config: LockConfig; onUnlock: (space: { space: number; key: Uint8Array }) => Promise<void> }) {
  const [phone, setPhone] = useState<Record<string, string> | null>(null);
  const opens = useRef(false);
  const linkAt = useRef(0);
  const calledAt = useRef(0);
  const awayAt = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const look = () => {
      const href = peekLink();
      if (!href) return;
      if (linkParts(href).path !== '/phone' || !opens.current) {
        setPhone(null);
        return;
      }
      takeLink();
      linkAt.current = Date.now();
      setPhone(screenParams(href, linkAt.current));
    };
    void phoneOpensLocked().then((on) => {
      if (!active) return;
      opens.current = on;
      look();
    });
    const stop = onLinkHeld(look);
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'background') awayAt.current = Date.now();
      if (state !== 'active' || awayAt.current === null) return;
      const left = awayAt.current;
      awayAt.current = null;
      const now = Date.now();
      if (now - left > RELOCK_AFTER_MS && left - calledAt.current > CALL_LEAVES_MS && now - linkAt.current > RELOCK_MS) setPhone(null);
    });
    return () => {
      active = false;
      stop();
      app.remove();
    };
  }, []);

  if (phone) {
    return <PhoneView params={phone} locked={{ onOpen: () => setPhone(null), onCalled: () => (calledAt.current = Date.now()) }} />;
  }
  return <PasswordGate key={lang} config={config} onUnlock={onUnlock} />;
}

// Opens the screen a link names, held while the password screen showed (lib/open-link.ts), once
// the screens are there, and each link that comes while the space is open. The home screen is
// under every other: back to it, not a second one. It, the Phone and Contacts, as the launcher's
// icons and the widget open them, show the link's tab again each time, also the same link after
// the owner chose another tab; another screen that shows already only takes the link's details.
// Erevos's own icon leaves one of its chats open.
function OpenLink() {
  const ready = useRootNavigationState()?.key;
  const pathname = usePathname();
  const { hidden } = useGlobalSearchParams<{ hidden?: string }>();
  const here = useRef({ path: pathname, hidden: false });
  here.current = { path: pathname, hidden: hidden === '1' };
  useEffect(() => {
    if (!ready) return;
    const open = () => {
      const href = takeLink();
      if (!href) return;
      const { path, params } = linkParts(href);
      const move = linkMove(href, here.current);
      if (move === 'back') router.dismissTo({ pathname: path, params: screenParams(href) } as Href);
      else if (move === 'params') router.setParams(params);
      else if (move === 'push') router.push(href as Href);
    };
    open();
    return onLinkHeld(open);
  }, [ready]);
  return null;
}

// Takes the space's messages while it is open, whatever screen shows (lib/receiver.ts), from the
// relay and from phones nearby (lib/nearby-links.ts), and tells it whether the app shows: only then
// do contacts hear the phone is open. SMS sent for later go from here too (lib/sms-later.ts), the
// doors of the public groups the space owns are looked at (lib/space-public-groups.ts), and its
// calls ring (components/call-host.tsx). While the space is open, a call from a number linked to
// one of its contacts, or kept only in Erevos, shows their name (lib/known-names.ts). On Android,
// it goes on while Erevos is in the background, so a call rings (lib/background.ts). All of it
// stops when the space closes, not with the screens (lib/space-running.ts).
function Receiver({ space }: { space: number }) {
  useEffect(
    () =>
      keepSpaceRunning(space, () => [
        startReceiver(),
        startNearbyLinks(),
        startSmsLater(),
        startPublicDoors(),
        watchKnownNames(),
        startBackground(),
        followAppShown(),
        watchCalls(),
      ]),
    [space],
  );
  return null;
}

// The space shows while Erevos does and the password screen is not in front of it.
function followAppShown(): () => void {
  const follow = () => setAppShown(AppState.currentState === 'active' && !spaceGated());
  follow();
  const subscription = AppState.addEventListener('change', follow);
  const gated = onSpaceGatedChange(follow);
  return () => {
    subscription.remove();
    gated();
  };
}

// Nothing of the space that was open stays in memory: what goes on for it stops, and its key and
// what was read of it go.
function closeSpace(): void {
  stopSpaceRunning();
  setCurrentSpace(null);
  forgetSpaceChats();
  forgetSpaceMover();
  forgetOffered();
  forgetLinks();
  forgetSpaceGroups();
  forgetSmsLink();
  forgetSpare();
  clearKnownNames();
  forgetHistory();
  forgetOpenedQueues();
  forgetWelcome();
  setThroughTor(false);
}

function openKey(): Uint8Array | null {
  try {
    return currentSpace().key;
  } catch {
    return null;
  }
}

function sameKey(a: Uint8Array | null, b: Uint8Array): boolean {
  return a !== null && a.length === b.length && a.every((byte, i) => byte === b[i]);
}
