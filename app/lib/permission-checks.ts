import type { BackgroundState, NoticeChannel } from '../modules/erevos-call';

// What the permissions check (app/permissions.tsx, lib/permissions.ts) looks at on an Android
// phone, read from what Android says: kept apart from React Native, so the checks run in Node.
// The web app's are in lib/web-permission-checks.ts, the same kind of checks.

export type CheckId =
  | 'notices'
  | 'calls'
  | 'messages'
  | 'fullScreen'
  | 'battery'
  | 'restricted'
  | 'unused'
  | 'data'
  | 'maker'
  | 'microphone'
  | 'messageSound'
  | 'lockScreen'
  | 'dnd'
  | 'ringer'
  | 'saver'
  | 'camera'
  | 'nearby'
  | 'contacts'
  | 'alarms'
  | 'reminders'
  // The web app's.
  | 'home'
  | 'push'
  | 'storage';

/**
 * ok: allowed. missing: not allowed. yours: Erevos cannot read it, only you can look (the phone
 * maker's setting). ask: not decided yet, the browser asks the first time it is used. none: this
 * browser cannot do it. note: nothing to allow, how the phone is set now (battery saver on).
 */
export type CheckState = 'ok' | 'missing' | 'yours' | 'ask' | 'none' | 'note';

/** needed: calls and messages need it (or, on the web, the data). asks: in the web app, whether a
 *  button asks the browser's own question now; without one the screen says how to change it. */
export type Check = { id: CheckId; state: CheckState; needed: boolean; asks?: boolean };

/** What calls and messages need while Erevos is in the background; each of the others is for one thing. */
export const NEEDED: ReadonlySet<CheckId> = new Set<CheckId>(['notices', 'calls', 'messages', 'fullScreen', 'battery', 'restricted', 'unused', 'data', 'maker', 'microphone']);

/** The phone makers whose own settings stop apps in the background beyond Android's (dontkillmyapp.com). */
export type Maker = 'huawei' | 'xiaomi' | 'oppo' | 'vivo' | 'samsung' | 'asus';

export function makerOf(maker: string | undefined): Maker | null {
  switch (maker?.toLowerCase()) {
    case 'huawei':
    case 'honor':
      return 'huawei';
    case 'xiaomi':
    case 'redmi':
    case 'poco':
      return 'xiaomi';
    case 'oppo':
    case 'realme':
    case 'oneplus':
      return 'oppo';
    case 'vivo':
    case 'iqoo':
      return 'vivo';
    case 'samsung':
      return 'samsung';
    case 'asus':
      return 'asus';
    default:
      return null;
  }
}

// The Android version each permission came with: an older phone does not know it, and gives it
// without asking. Up to Android 12 the radios need the location instead (lib/radio.ts).
const SINCE: Partial<Record<string, number>> = {
  'android.permission.POST_NOTIFICATIONS': 33,
  'android.permission.NEARBY_WIFI_DEVICES': 33,
  'android.permission.BLUETOOTH_SCAN': 31,
  'android.permission.BLUETOOTH_ADVERTISE': 31,
  'android.permission.BLUETOOTH_CONNECT': 31,
  'android.permission.ACCESS_LOCAL_NETWORK': 37,
};

/** The permissions of `wanted` that this Android version knows. */
export function known(wanted: readonly string[], sdk: number): string[] {
  return wanted.filter((permission) => (SINCE[permission] ?? 0) <= sdk);
}

export type CheckInput = {
  /** What the call module reads; null in a build without it. */
  background: BackgroundState | null;
  /** Whether Android gives this app a permission. */
  granted: (permission: string) => Promise<boolean>;
  sdk: number;
  /** The permissions the links to phones nearby ask for (lib/radio.ts); null on a phone without them. */
  nearby: readonly string[] | null;
  /** Whether the owner said the phone maker's setting is done. */
  makerDone: boolean;
  /** Whether a notice says that messages came (Settings → Notifications → In the background, lib/background.ts). */
  messageNotices: boolean;
};

// Android's numbers for them (NotificationManager, AudioManager).
const POPS_UP = 4;
const SOUNDS = 3;
const HIDDEN_ON_LOCK = -1;
const RINGS = 2;

/** Every check that applies to this phone, in the order the screen shows them. */
export async function checksFrom({ background, granted, sdk, nearby, makerDone, messageNotices }: CheckInput): Promise<Check[]> {
  const out: Check[] = [];
  const put = (id: CheckId, state: CheckState) => out.push({ id, state, needed: NEEDED.has(id) });
  const add = (id: CheckId, ok: boolean | undefined) => {
    // Missing from a build made before it: not shown.
    if (ok !== undefined) put(id, ok ? 'ok' : 'missing');
  };
  const has = async (wanted: readonly string[]) => {
    for (const permission of known(wanted, sdk)) if (!(await granted(permission).catch(() => false))) return false;
    return true;
  };
  // With all its notices off, the channels' own settings are no matter yet; nor the messages
  // notice's, when the owner turned it off.
  const on = (channel: NoticeChannel | undefined) => (background?.notices && channel && channel.importance > 0 ? channel : undefined);
  const calls = on(background?.callChannel);
  const messages = messageNotices ? on(background?.messageChannel) : undefined;
  // The same notice without sound, or with a chat's own sound: each also keeps the number on the icon.
  const alike = messageNotices ? [on(background?.quietChannel), on(background?.ownChannel)] : [];
  if (background) {
    add('notices', background.notices);
    // The call notice must not be off, and must pop up: its sound is the app's own ringtone.
    if (background.notices) add('calls', background.calls === undefined ? undefined : background.calls && (background.callChannel?.importance ?? POPS_UP) >= POPS_UP);
    if (background.notices && messageNotices && background.messageChannel) {
      add('messages', [background.messageChannel, background.quietChannel, background.ownChannel].every((channel) => !channel || channel.importance > 0));
    }
    add('fullScreen', background.fullScreen);
    add('battery', background.battery);
    // Android lifts its own Restricted standby bucket the moment Erevos opens, so only the owner's
    // Restricted battery use can be read here.
    if (background.restricted !== undefined) add('restricted', !background.restricted);
    add('unused', background.unusedExempt);
    add('data', background.data);
    if (makerOf(background.maker)) put('maker', makerDone ? 'ok' : 'yours');
  }
  add('microphone', await has(['android.permission.RECORD_AUDIO']));
  if (background) {
    if (messages) add('messageSound', messages.importance >= SOUNDS && messages.sound);
    const shown = [calls, messages, ...alike].filter((channel): channel is NoticeChannel => channel !== undefined);
    if (background.notices && (background.lockScreen !== undefined || shown.length)) {
      add('lockScreen', background.lockScreen !== false && shown.every((channel) => channel.lockScreen !== HIDDEN_ON_LOCK));
    }
    // Letting calls through Do Not Disturb is the owner's choice; while it is on, the more so.
    if (calls) put('dnd', calls.bypassDnd ? 'ok' : background.dnd ? 'note' : 'missing');
    if (background.ringer !== undefined && (background.ringer !== RINGS || background.ringVolume === 0)) put('ringer', 'note');
    if (background.saver) put('saver', 'note');
  }
  add('camera', await has(['android.permission.CAMERA']));
  if (nearby) add('nearby', await has(nearby));
  add('contacts', await has(['android.permission.READ_CONTACTS']));
  if (background) add('alarms', background.alarms);
  // A reminder's notice, once one made its channel.
  if (background?.notices && background.reminderChannel) add('reminders', background.reminderChannel.importance > 0);
  return out;
}

/** Whether it is something needed that is not allowed, or not looked at. */
export function lacking(check: Check): boolean {
  return check.needed && (check.state === 'missing' || check.state === 'yours' || check.state === 'none');
}

/** Whether something calls and messages need is not allowed, or not looked at. */
export function needsLook(checks: readonly Check[]): boolean {
  return checks.some(lacking);
}

/** Whether the check shows by itself: once for each new version (or the first start), only when calls and messages need something. */
export function offerFor(seen: string | null, current: string, ringsInBackground: boolean, checks: readonly Check[]): boolean {
  return seen !== current && ringsInBackground && needsLook(checks);
}
