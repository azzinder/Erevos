import { AppRegistry, PermissionsAndroid, Platform } from 'react-native';

import { callAudio, type BackgroundState } from '../modules/erevos-call';
import { secureGet, secureSet } from './secure';

// Ringing while Erevos is in the background, on Android: while a space is open, Erevos keeps
// running with a quiet notice that says no more than its name, so it keeps looking at the relay,
// and a call rings with the phone's ringtone and a notice that says only "Incoming call", over the
// lock screen. On by default; a switch on the Lock screen turns it off on this phone. Swiped away
// from the recent apps, or stopped by Android, Erevos looks at nothing and cannot ring.

const KEY = 'erevos.ring-background';

/** Whether this phone can ring in the background at all: Android, in a build with the call module. */
export const canRingInBackground = Platform.OS === 'android' && !!callAudio?.startReceiving;

// React Native stops timers while the app is in the background, unless a background task runs:
// the call module starts this one with the receiving (ErevosCallModule.keepTimers), and it lasts
// until the receiving stops, so the receiver goes on looking at the relay.
const KEEP_TASK = 'ErevosReceive';
const keeping = new Set<() => void>();
if (canRingInBackground) {
  AppRegistry.registerHeadlessTask(KEEP_TASK, () => () => new Promise<void>((done) => keeping.add(done)));
}

export async function loadRingInBackground(): Promise<boolean> {
  const kept = await secureGet(KEY).catch(() => null);
  return kept !== 'off';
}

const changes = new Set<() => void>();

/** Keeps the choice, and starts or stops the receiving in the open space at once. */
export async function saveRingInBackground(on: boolean): Promise<void> {
  await secureSet(KEY, on ? 'on' : 'off');
  changes.forEach((change) => change());
}

/** What Android lets Erevos do for it, or null where it cannot ring in the background. */
export function backgroundState(): BackgroundState | null {
  if (!canRingInBackground) return null;
  try {
    return callAudio!.backgroundState?.() ?? null;
  } catch {
    return null;
  }
}

/** Android 13 and later ask once whether Erevos may show notices; without them, it rings with no notice. */
async function askNotices(): Promise<void> {
  if (Number(Platform.Version) < 33) return;
  await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => undefined);
}

/**
 * Receives in the background for the open space while this phone rings in the background, and
 * follows the switch. Returns how to stop. Android lets it start only while Erevos shows, as it
 * does when a space opens or the switch is turned on.
 */
export function startBackground(): () => void {
  if (!canRingInBackground) return () => undefined;
  let stopped = false;
  let running = false;
  const stop = () => {
    running = false;
    callAudio!.stopReceiving!();
    keeping.forEach((done) => done());
    keeping.clear();
  };
  const follow = async () => {
    const on = await loadRingInBackground();
    if (stopped) return;
    if (!on) {
      if (running) stop();
      return;
    }
    if (running) return;
    await askNotices();
    if (stopped || running) return;
    try {
      callAudio!.startReceiving!();
      running = true;
    } catch {
      // Android refused (Erevos was already in the background): it rings while it shows.
    }
  };
  void follow();
  changes.add(follow);
  return () => {
    stopped = true;
    changes.delete(follow);
    if (running) stop();
  };
}

/** Android's own question to leave Erevos out of battery saving, so it is not stopped in the background. */
export function askBattery(): void {
  callAudio?.askBattery?.();
}

/** Android's setting that lets Erevos show a call over the lock screen. */
export function askFullScreen(): void {
  callAudio?.askFullScreen?.();
}
