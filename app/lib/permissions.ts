// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import Constants from 'expo-constants';
import { Linking, PermissionsAndroid, Platform, type Permission } from 'react-native';

import { callAudio, type NoticeChannel, type SettingsScreen } from '../modules/erevos-call';
import { askBattery, askFullScreen, backgroundState, loadMessageNotices, loadRingInBackground, noticesAsked } from './background';
import { checkWanted, modulesOn, type Module } from './modules';
import { checksFrom, known, offerFor, type Check, type CheckId } from './permission-checks';
import { HAS_RADIO, nearbyPermissions } from './radio';
import { secureGet, secureSet } from './secure';
import type { Browser } from './web-permission-checks';

// The permissions check on an Android phone (app/permissions.tsx): what Android, and the phone
// maker, let Erevos do, read again after each new version, since an update, the maker's battery
// settings or the owner may have taken some away. A friend's Huawei rang only once Erevos was
// opened. What it reads stays on the phone; each button opens Android's own question or screen.
// After a backup is restored it shows once more, whatever it finds: what Android allows, and which
// app is the phone's for calls and SMS, stay with each phone and come with no backup. The web
// app's is lib/permissions.web.ts.

const SEEN_KEY = 'erevos.permissions-seen';
const MAKER_KEY = 'erevos.permissions-maker';
// What SEEN_KEY says after a restore, till the check shows.
const RESTORED = 'restored';

const SDK = Platform.OS === 'android' ? Number(Platform.Version) : 0;

/** The installed version and build, which the check offers itself once for. */
const INSTALLED = `${Constants.expoConfig?.version ?? '0.0.0'}+${String(Constants.expoConfig?.extra?.build ?? 0)}`;

export const HAS_CHECKS = Platform.OS === 'android';

/** The browser, in the web app (lib/permissions.web.ts); none here. */
export const BROWSER: Browser | null = null;

export const IOS_OTHER_BROWSER = false;

/** Every check that applies to this phone, for what the modules `of` use (lib/modules.ts), those on unless given; none elsewhere. */
export async function readChecks(of: Iterable<Module> = modulesOn()): Promise<Check[]> {
  if (!HAS_CHECKS) return [];
  const modules = [...of];
  const checks = await checksFrom({
    background: backgroundState(),
    granted: (permission) => PermissionsAndroid.check(permission as Permission),
    sdk: SDK,
    nearby: HAS_RADIO ? nearbyPermissions() : null,
    makerDone: (await secureGet(MAKER_KEY).catch(() => null)) === 'done',
    messageNotices: await loadMessageNotices(),
  });
  return checks.filter((check) => checkWanted(check.id, modules));
}

let offered = false;

/**
 * Whether the check should show by itself now, and why: once for each version installed, and only
 * when calls and messages in the background need something ('update'); and once after a backup
 * was restored, whatever they need ('restore'). Asked once each start, and again after a restore;
 * checksOffered then counts it as seen, so "back" waits for the next version.
 */
export async function offerChecks(): Promise<false | 'update' | 'restore'> {
  if (!HAS_CHECKS || offered) return false;
  offered = true;
  const seen = await secureGet(SEEN_KEY).catch(() => null);
  if (seen === INSTALLED) return false;
  // Android's own question whether Erevos may show notices, put as the space opened, is answered
  // first: the screen then shows what was chosen, not over the question.
  await noticesAsked();
  if (seen === RESTORED) return 'restore';
  const [rings, checks] = await Promise.all([loadRingInBackground(), readChecks()]);
  // Nothing to show this version: not looked at again until the next.
  if (!offerFor(seen, INSTALLED, rings, checks)) {
    await checksOffered();
    return false;
  }
  return 'update';
}

/** A backup was restored here: the check shows the next time a space opens (offerChecks). */
export async function offerChecksAfterRestore(): Promise<void> {
  if (!HAS_CHECKS) return;
  await secureSet(SEEN_KEY, RESTORED).catch(() => undefined);
  offered = false;
}

/** The check showed for the installed version. */
export async function checksOffered(): Promise<void> {
  await secureSet(SEEN_KEY, INSTALLED).catch(() => undefined);
}

/** The owner looked at the phone maker's setting: it counts as done from now on. */
export async function makerDone(done: boolean): Promise<void> {
  await secureSet(MAKER_KEY, done ? 'done' : '');
}

function open(which: SettingsScreen): void {
  let opened = false;
  try {
    opened = callAudio?.openSettings?.(which) ?? false;
  } catch {
    // A build from before it.
  }
  if (!opened) void Linking.openSettings().catch(() => undefined);
}

/** Android's question for these, or, where Android no longer asks (refused for good before), Erevos's page in its settings. */
async function ask(wanted: readonly string[]): Promise<void> {
  // One this Android does not know would count as refused for good.
  const permissions = known(wanted, SDK) as Permission[];
  if (permissions.length === 0) return;
  const answers = await PermissionsAndroid.requestMultiple(permissions).catch(() => null);
  if (!answers || permissions.some((p) => answers[p] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) open('app');
}

/** Asks for what the check `id` needs: Android's own question where it has one, else its screen for it. */
export async function fix(id: CheckId): Promise<void> {
  switch (id) {
    case 'notices': {
      if (SDK >= 33) {
        const answer = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => null);
        // Refused now: as the owner wants. Allowed, but turned off in the settings: only there.
        if (answer === PermissionsAndroid.RESULTS.DENIED || backgroundState()?.notices) return;
      }
      open('notices');
      return;
    }
    case 'calls':
    case 'data':
    case 'alarms':
    case 'unused':
    case 'saver':
      open(id);
      return;
    // The message notice's channel that is off: "Messages", else the one without sound, else the one with a chat's own sound.
    case 'messages': {
      const state = backgroundState();
      const off = (channel: NoticeChannel | undefined) => channel !== undefined && channel.importance === 0;
      open(off(state?.messageChannel) ? 'messages' : off(state?.quietChannel) ? 'quiet' : off(state?.ownChannel) ? 'own' : 'messages');
      return;
    }
    case 'reminders':
      open('reminders');
      return;
    case 'messageSound':
      open('messages');
      return;
    // The lock screen is set in Erevos's notices; letting calls through Do Not Disturb in its call notice.
    case 'lockScreen':
      open('notices');
      return;
    case 'dnd':
      open('calls');
      return;
    case 'ringer':
      open('sound');
      return;
    // Battery use is on Erevos's page in the settings.
    case 'restricted':
      open('app');
      return;
    case 'fullScreen':
      askFullScreen();
      return;
    case 'battery':
      askBattery();
      return;
    case 'maker': {
      let opened = false;
      try {
        opened = callAudio?.openMaker?.() ?? false;
      } catch {
        // As above.
      }
      if (!opened) open('app');
      return;
    }
    case 'microphone':
      return ask(['android.permission.RECORD_AUDIO']);
    case 'camera':
      return ask(['android.permission.CAMERA']);
    case 'nearby':
      return ask(nearbyPermissions());
    case 'contacts':
      return ask(['android.permission.READ_CONTACTS']);
    // The web app's (lib/permissions.web.ts).
    case 'home':
    case 'push':
    case 'storage':
      return;
  }
}
