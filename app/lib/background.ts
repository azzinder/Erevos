import { AppRegistry, AppState, PermissionsAndroid, Platform } from 'react-native';

import { callAudio, type BackgroundState } from '../modules/erevos-call';
import type { Received } from './e2e';
import { appShown, onMessage } from './receiver';
import { secureGet, secureSet } from './secure';
import { onSpaceGroupMessage } from './space-groups';

// Receiving while Erevos is in the background, on Android: while a space is open, Erevos keeps
// running with a quiet notice that says no more than its name, so it keeps waiting at the relay
// (lib/receiver.ts) and on the links to phones nearby (lib/nearby-links.ts). A call rings with the
// phone's ringtone and a notice that says only "Incoming call", over the lock screen, and messages
// that came show a notice that says only how many, and on a locked phone only "Erevos". Only the
// open space's chats and groups are looked at, never hidden chats, whose key is in memory only
// while they are open. On by default; switches on the Lock screen turn it off on this phone, or
// only the messages notice. Swiped away from the recent apps, or stopped by Android, Erevos
// looks at nothing and cannot ring.

const KEY = 'erevos.ring-background';
const NOTICES_KEY = 'erevos.message-notices';

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

/** Whether a notice says that messages came while Erevos was in the background: on unless turned off. */
export async function loadMessageNotices(): Promise<boolean> {
  const kept = await secureGet(NOTICES_KEY).catch(() => null);
  return kept !== 'off';
}

export async function saveMessageNotices(on: boolean): Promise<void> {
  await secureSet(NOTICES_KEY, on ? 'on' : 'off');
  changes.forEach((change) => change());
}

// While the receiving runs in the background with the messages notice on, how many messages came
// since Erevos last showed.
let telling = false;
let unseen = 0;

/** Whether what came is news to tell of: words, a voice message (once), a photo or file; not marks, deletes, calls or a group's setting up. */
export function isNews(received: Extract<Received, { kind: 'message' }>): boolean {
  if (received.erase || received.call || received.group) return false;
  if (received.voice) return received.voice.part === 0;
  return received.text.length > 0 || received.file !== null;
}

/**
 * A message came in the open space, from a contact or in a group: while Erevos is in the
 * background, the notice says one more came. One sent without sound (`quiet`) makes none: the
 * notice shows or counts on silently. The chat screen tells of what it opens itself.
 */
export function messageCame(quiet = false): void {
  if (!telling || appShown()) return;
  unseen++;
  try {
    callAudio?.tellMessages?.(unseen, quiet);
  } catch {
    // A build from before the notice: nothing shows.
  }
}

function clearMessages() {
  if (unseen === 0) return;
  unseen = 0;
  try {
    callAudio?.clearMessages?.();
  } catch {
    // As above.
  }
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
    telling = false;
    callAudio!.stopReceiving!();
    keeping.forEach((done) => done());
    keeping.clear();
  };
  const follow = async () => {
    const [on, notices] = await Promise.all([loadRingInBackground(), loadMessageNotices()]);
    if (stopped) return;
    if (!on) {
      if (running) stop();
      return;
    }
    telling = notices;
    if (!notices) clearMessages();
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
  const told = [
    onMessage((received) => {
      if (isNews(received)) messageCame(received.quiet);
    }),
    onSpaceGroupMessage(() => messageCame()),
  ];
  // Erevos shows again: what came shows there, so the notice goes.
  const shown = AppState.addEventListener('change', (state) => {
    if (state === 'active') clearMessages();
  });
  return () => {
    stopped = true;
    changes.delete(follow);
    told.forEach((stopTelling) => stopTelling());
    shown.remove();
    clearMessages();
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
