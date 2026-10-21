import type { BackgroundState } from '../modules/erevos-call';

// What the permissions check (app/permissions.tsx, lib/permissions.ts) looks at on an Android
// phone, read from what Android says: kept apart from React Native, so the checks run in Node.

export type CheckId = 'notices' | 'calls' | 'fullScreen' | 'battery' | 'data' | 'maker' | 'microphone' | 'camera' | 'nearby' | 'contacts' | 'alarms';

/** ok: allowed. missing: not allowed. yours: Erevos cannot read it, only you can look (the phone maker's setting). */
export type CheckState = 'ok' | 'missing' | 'yours';

export type Check = { id: CheckId; state: CheckState };

/** What calls and messages need while Erevos is in the background; each of the others is for one thing. */
export const NEEDED: ReadonlySet<CheckId> = new Set<CheckId>(['notices', 'calls', 'fullScreen', 'battery', 'data', 'maker', 'microphone']);

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
};

/** Every check that applies to this phone, in the order the screen shows them. */
export async function checksFrom({ background, granted, sdk, nearby, makerDone }: CheckInput): Promise<Check[]> {
  const out: Check[] = [];
  const add = (id: CheckId, ok: boolean | undefined) => {
    // Missing from a build made before it: not shown.
    if (ok !== undefined) out.push({ id, state: ok ? 'ok' : 'missing' });
  };
  const has = async (wanted: readonly string[]) => {
    for (const permission of known(wanted, sdk)) if (!(await granted(permission).catch(() => false))) return false;
    return true;
  };
  if (background) {
    add('notices', background.notices);
    // With all its notices off, the call notice's own switch is no matter yet.
    if (background.notices) add('calls', background.calls);
    add('fullScreen', background.fullScreen);
    add('battery', background.battery);
    add('data', background.data);
    if (makerOf(background.maker)) out.push({ id: 'maker', state: makerDone ? 'ok' : 'yours' });
  }
  add('microphone', await has(['android.permission.RECORD_AUDIO']));
  add('camera', await has(['android.permission.CAMERA']));
  if (nearby) add('nearby', await has(nearby));
  add('contacts', await has(['android.permission.READ_CONTACTS']));
  if (background) add('alarms', background.alarms);
  return out;
}

/** Whether something calls and messages need is not allowed, or not looked at. */
export function needsLook(checks: readonly Check[]): boolean {
  return checks.some((check) => NEEDED.has(check.id) && check.state !== 'ok');
}

/** Whether the check shows by itself: once for each new version (or the first start), only when calls and messages need something. */
export function offerFor(seen: string | null, current: string, ringsInBackground: boolean, checks: readonly Check[]): boolean {
  return seen !== current && ringsInBackground && needsLook(checks);
}
