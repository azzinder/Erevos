import { AppRegistry, AppState, PermissionsAndroid, Platform } from 'react-native';

import { currentSpace } from '../lock/keys';
import { callAudio, type BackgroundState } from '../modules/erevos-call';
import { currentCall, RING_MS } from './call';
import { keepDoor, startClosedNotices } from './closed-notices';
import { currentGroupCall } from './group-call';
import { startHiddenNotices } from './hidden-notices';
import { hiddenRinging, onHiddenRingingChange, setHiddenRinging } from './hidden-ring';
import { startHiddenRinging } from './hidden-ring-notices';
import { showsAt } from './later';
import { onPlaceMessage, onPlaceRing } from './place-receiver';
import { onSpaceMoved } from './queue-move';
import { appShown, isNews, onAppShown, onMessage } from './receiver';
import { secureGet, secureSet } from './secure';
import { onSpaceGroupMessage } from './space-groups';

// Receiving while Erevos is in the background, on Android: while a space is open, Erevos keeps
// running with a quiet notice that says no more than its name, so it keeps waiting at the relay
// (lib/receiver.ts) and on the links to phones nearby (lib/nearby-links.ts). A call rings with the
// phone's ringtone and a notice that says only "Incoming call", over the lock screen, and messages
// that came show a notice that says only how many, and on a locked phone only "Erevos". Only the
// open space's chats and groups are read, never hidden chats, whose key is in memory only while
// they are open; those that asked for it only say how many messages came (lib/hidden-notices.ts),
// and so do the other spaces that asked for it, while closed (lib/closed-notices.ts).
// While Erevos shows, a message shows the same notice, with sound, except in the chat or group on
// the screen, where it only sounds; what came in one goes from the count once it is open.
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

/** Whether a notice says that messages came, while Erevos shows too: on unless turned off. */
export async function loadMessageNotices(): Promise<boolean> {
  const kept = await secureGet(NOTICES_KEY).catch(() => null);
  return kept !== 'off';
}

export async function saveMessageNotices(on: boolean): Promise<void> {
  await secureSet(NOTICES_KEY, on ? 'on' : 'off');
  changes.forEach((change) => change());
}

// While the messages notice is on, how many messages came, by where they show (a chat, a group,
// a hidden place: screenOf...), since Erevos last came back from the background.
let telling = false;
const unseen = new Map<string, number>();
// The chat, group or hidden place that shows on the screen now (showOnScreen).
let onScreen: string | null = null;

/** Where a contact's messages show, for messageCame and showOnScreen. */
export const screenOfChat = (identity: string) => `chat:${identity}`;
/** Where a group's messages show. */
export const screenOfGroup = (id: string) => `group:${id}`;
/** Where a hidden place's chats show. */
export const screenOfHidden = (pocket: number) => `hidden:${pocket}`;
/** Where a closed space's chats show: in it, once it is open. */
export const screenOfSpace = (space: number) => `space:${space}`;

const unseenCount = () => [...unseen.values()].reduce((sum, count) => sum + count, 0);

/**
 * A message came in the open space, from a contact or in a group, shown at `where`: the notice
 * says one more came and sounds, whether Erevos shows or not; where it shows on the screen just
 * then, it only sounds. One sent without sound (`quiet`) makes none: the notice shows or counts on
 * silently. The chat screen tells of what it opens itself.
 */
export function messageCame(quiet = false, where = ''): void {
  if (!telling) return;
  if (where && where === onScreen && appShown()) {
    if (!quiet) chime();
    return;
  }
  unseen.set(where, (unseen.get(where) ?? 0) + 1);
  try {
    callAudio?.tellMessages?.(unseenCount(), quiet);
  } catch {
    // A build from before the notice: nothing shows.
  }
}

function chime() {
  try {
    callAudio?.chime?.();
  } catch {
    // A build from before the sound: none plays.
  }
}

/**
 * While `where` (screenOf...) shows on the screen, what comes there only sounds, and the notice
 * no longer counts what came there before. Returns how to stop.
 */
export function showOnScreen(where: string): () => void {
  onScreen = where;
  if (unseen.delete(where)) {
    try {
      if (unseen.size === 0) callAudio?.clearMessages?.();
      else callAudio?.recountMessages?.(unseenCount());
    } catch {
      // As above.
    }
  }
  return () => {
    if (onScreen === where) onScreen = null;
  };
}

/** As messageCame, at `at` (milliseconds) when that is ahead: for a message that came before its time (lib/later.ts, showsAt). */
export function messageCameAt(at: number, quiet = false, where = ''): void {
  const wait = at - Date.now();
  if (wait <= 0) messageCame(quiet, where);
  else setTimeout(() => messageCame(quiet, where), Math.min(wait, 2 ** 31 - 1));
}

function clearMessages() {
  if (unseen.size === 0) return;
  unseen.clear();
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
  // The other spaces' notices, while closed, those that asked for it (lib/closed-notices.ts).
  let closed: (() => void) | null = null;
  const tellHidden = (on: boolean) => {
    if (on && !hidden)
      hidden = startHiddenNotices((count, pocket) => {
        for (let i = 0; i < count; i++) messageCame(false, screenOfHidden(pocket));
      });
    if (!on && hidden) {
      hidden();
      hidden = null;
    }
    if (on && !closed)
      closed = startClosedNotices((count, space) => {
        for (let i = 0; i < count; i++) messageCame(false, screenOfSpace(space));
      });
    if (!on && closed) {
      closed();
      closed = null;
    }
  };
  // This space's door names the queues it reads on, should it say a message came once closed: written
  // as it opens, as its own queue moves, and as it closes, with what came so far heard.
  let own: { space: number; key: Uint8Array } | null = null;
  try {
    own = currentSpace();
  } catch {
    // No space is open: none to keep a door for.
  }
  const door = own;
  if (door) void keepDoor(door.space, door.key).catch(() => undefined);
  const moved = onSpaceMoved(async () => {
    if (door) await keepDoor(door.space, door.key).catch(() => undefined);
  });
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
  // Hidden chats that receive while closed (lib/place-receiver.ts): a message says "New message"
  // with no name, as the space's chats do, and a call rings with none, as a hidden ring does.
  const places = [
    onPlaceMessage((_space, pocket, received) => {
      if (isNews(received)) messageCameAt(showsAt(received.due), received.quiet, screenOfHidden(pocket));
    }),
    onPlaceRing(onRing),
  ];
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
    tellHidden(false);
    ringHidden(false);
    callAudio!.stopReceiving!();
    keeping.forEach((done) => done());
    keeping.clear();
  };
  const follow = async () => {
    const [on, notices] = await Promise.all([loadRingInBackground(), loadMessageNotices()]);
    if (stopped) return;
    // While Erevos shows, the notice tells of messages with the receiving off too.
    telling = notices;
    if (!notices) clearMessages();
    if (!on) {
      if (running) stop();
      return;
    }
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
      if (isNews(received)) messageCameAt(showsAt(received.due), received.quiet, screenOfChat(received.identity));
    }),
    onSpaceGroupMessage((group) => messageCame(false, screenOfGroup(group))),
  ];
  // The space shows again (not the password screen in front of it): what came shows there, so the notice goes.
  const shown = onAppShown((on) => {
    if (on) clearMessages();
  });
  return () => {
    stopped = true;
    telling = false;
    moved();
    if (door) void keepDoor(door.space, door.key, true).catch(() => undefined);
    changes.delete(follow);
    told.forEach((stopTelling) => stopTelling());
    places.forEach((stopPlace) => stopPlace());
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
