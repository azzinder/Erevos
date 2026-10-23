import { AppRegistry, AppState, PermissionsAndroid, Platform } from 'react-native';

import { callAudio, type BackgroundState } from '../modules/erevos-call';
import { currentCall, RING_MS } from './call';
import { currentGroupCall } from './group-call';
import { startHiddenNotices } from './hidden-notices';
import { hiddenRinging, onHiddenRingingChange, setHiddenRinging } from './hidden-ring';
import { startHiddenRinging } from './hidden-ring-notices';
import { showsAt } from './later';
import { appShown, isNews, onAppShown, onMessage } from './receiver';
import { secureGet, secureSet } from './secure';
import { onSpaceGroupMessage } from './space-groups';

// Receiving while Erevos is in the background, on Android: while a space is open, Erevos keeps
// running with a quiet notice that says no more than its name, so it keeps waiting at the relay
// (lib/receiver.ts) and on the links to phones nearby (lib/nearby-links.ts). A call rings with the
// phone's ringtone and a notice that says only "Incoming call", over the lock screen, and messages
// that came show a notice that says only how many, and on a locked phone only "Erevos". Only the
// open space's chats and groups are read, never hidden chats, whose key is in memory only while
// they are open; those that asked for it only say how many messages came (lib/hidden-notices.ts).
// On by default; switches on the Lock screen turn it off on this phone, or only the messages
// notice. Swiped away from the recent apps, it goes on without its screens (lib/space-running.ts);
// stopped by Android, Erevos looks at nothing and cannot ring, and a quiet notice says so
// (modules/erevos-call, ReceiveService). So does one when the space that received locked and
// Erevos leaves the screen with the password asked: it receives nothing until it is open again.

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

// Whether the space that closed last was receiving: Erevos then leaves the screen with no space
// open, and the "Locked" notice says it receives nothing, until a space opens (startBackground).
let closedReceiving = false;
if (canRingInBackground) {
  AppState.addEventListener('change', (state) => {
    if (!closedReceiving) return;
    try {
      callAudio?.setLocked?.(state === 'background');
    } catch {
      // A build from before the notice.
    }
  });
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

/** As messageCame, at `at` (milliseconds) when that is ahead: for a message that came before its time (lib/later.ts, showsAt). */
export function messageCameAt(at: number, quiet = false): void {
  const wait = at - Date.now();
  if (wait <= 0) messageCame(quiet);
  else setTimeout(() => messageCame(quiet), Math.min(wait, 2 ** 31 - 1));
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
  // The hidden chats' notices, while the messages notice is on (lib/hidden-notices.ts).
  let hidden: (() => void) | null = null;
  const tellHidden = (on: boolean) => {
    if (on && !hidden)
      hidden = startHiddenNotices((count) => {
        for (let i = 0; i < count; i++) messageCame();
      });
    if (!on && hidden) {
      hidden();
      hidden = null;
    }
  };
  // A hidden place that rings its contacts' calls (lib/hidden-ring-notices.ts). On whenever
  // receiving runs, not with the messages notice: ringing is its own per-place setting. One hidden
  // call rings at a time, and none while a call is in progress.
  let ringWatch: (() => void) | null = null;
  let ringTimer: ReturnType<typeof setTimeout> | null = null;
  const stopRing = () => {
    if (ringTimer) {
      clearTimeout(ringTimer);
      ringTimer = null;
    }
    try {
      callAudio?.stopRinging?.();
    } catch {
      // A build from before ringing: nothing was playing.
    }
  };
  // A ring came for a hidden place: play the phone's ringtone and the "Incoming call" notice over
  // the lock screen, naming no one, and stop after it has rung a while unanswered (a missed call).
  const onRing = (space: number, pocket: number) => {
    if (currentCall() || currentGroupCall() || hiddenRinging()) return;
    setHiddenRinging({ space, pocket, at: Date.now() });
    try {
      callAudio?.ring?.(false, true);
      callAudio?.showOverLock?.(true);
    } catch {
      // As above.
    }
    if (ringTimer) clearTimeout(ringTimer);
    ringTimer = setTimeout(() => setHiddenRinging(null), RING_MS);
  };
  // Answered, turned down, or timed out: the ringtone and notice stop (the call, if answered, took
  // over the sound itself).
  const ringChange = onHiddenRingingChange(() => {
    if (!hiddenRinging()) stopRing();
  });
  const ringHidden = (on: boolean) => {
    if (on && !ringWatch) ringWatch = startHiddenRinging(onRing);
    if (!on && ringWatch) {
      ringWatch();
      ringWatch = null;
      if (hiddenRinging()) setHiddenRinging(null);
      stopRing();
    }
  };
  const stop = () => {
    running = false;
    telling = false;
    tellHidden(false);
    ringHidden(false);
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
    if (running) {
      tellHidden(notices);
      ringHidden(true);
      return;
    }
    await askNotices();
    if (stopped || running) return;
    try {
      callAudio!.startReceiving!();
      running = true;
      closedReceiving = false;
      tellHidden(notices);
      ringHidden(true);
    } catch {
      // Android refused (Erevos was already in the background): it rings while it shows.
    }
  };
  void follow();
  changes.add(follow);
  const told = [
    onMessage((received) => {
      if (isNews(received)) messageCameAt(showsAt(received.due), received.quiet);
    }),
    onSpaceGroupMessage(() => messageCame()),
  ];
  // The space shows again (not the password screen in front of it): what came shows there, so the notice goes.
  const shown = onAppShown((on) => {
    if (on) clearMessages();
  });
  return () => {
    stopped = true;
    changes.delete(follow);
    told.forEach((stopTelling) => stopTelling());
    shown();
    ringChange();
    ringHidden(false);
    clearMessages();
    if (running) {
      stop();
      // The space closes (locked): unless it opens again first, Erevos leaving the screen says so.
      closedReceiving = true;
      if (AppState.currentState === 'background') callAudio?.setLocked?.(true);
    }
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
