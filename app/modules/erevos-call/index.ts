// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

import { pageRing } from './page-ring';

/** What Android lets Erevos do for ringing in the background. What came later is missing in a build made before it. */
export type BackgroundState = {
  notices: boolean;
  fullScreen: boolean;
  battery: boolean;
  /** The call notice's channel is not turned off. */
  calls?: boolean;
  /** Mobile data in the background is not cut by Data Saver. */
  data?: boolean;
  alarms?: boolean;
  /** Who made the phone, in lowercase ("huawei", "google"). */
  maker?: string;
  /** The "Calls" and "Messages" notices as the owner left them (Android 8 and later). */
  callChannel?: NoticeChannel;
  messageChannel?: NoticeChannel;
  /** The message notice's channels without sound and with a chat's own sound, which keep the number on the icon too. */
  quietChannel?: NoticeChannel;
  ownChannel?: NoticeChannel;
  /** The "Reminders" notices, once the first reminder made their channel. */
  reminderChannel?: NoticeChannel;
  /** Whether the phone shows notices on its lock screen at all; missing where Android does not let an app read it. */
  lockScreen?: boolean;
  /** Do Not Disturb is on now (Android 6 and later). */
  dnd?: boolean;
  /** Erevos's battery use is set to Restricted (Android 9 and later). */
  restricted?: boolean;
  /** Erevos is left out of "Pause app activity if unused" (Android 11 and later). */
  unusedExempt?: boolean;
  /** Battery saver is on now. */
  saver?: boolean;
  /** The ringer: 2 rings, 1 vibrates, 0 is silent; and the ring volume. */
  ringer?: number;
  ringVolume?: number;
};

/** A notice channel's settings: importance (0 off, 2 silent, 3 sounds, 4 also pops up), whether it
 *  has a sound, its lock screen visibility (-1 hidden there), and whether it breaks through Do Not Disturb. */
export type NoticeChannel = { importance: number; sound: boolean; lockScreen: number; bypassDnd: boolean };

/** The settings screens openSettings opens; "app" is Erevos's own page in Android's settings, which
 *  a build from before a screen opens for it. */
export type SettingsScreen = 'notices' | 'calls' | 'messages' | 'quiet' | 'own' | 'reminders' | 'data' | 'alarms' | 'unused' | 'saver' | 'sound' | 'app';

// What came after the first calls is missing in a build made before it, so it is optional.
type CallAudio = {
  /** Sets the sound up for a call, through the loudspeaker or the earpiece. */
  start(speaker: boolean): void;
  setSpeaker(speaker: boolean): void;
  /** Puts the sound and the screen back as they were before the call. */
  stop(): void;
  /** React Native's WebSocket and fetch keep no cookies from now on, so they load no WebView: how many of the two took it. */
  noCookies?(): number;
  /** Keeps Erevos running while it is in the background, with a quiet notice that says no more than its name.
   *  If Android closes Erevos meanwhile, a quiet notice says so, until it receives again. */
  startReceiving?(): void;
  stopReceiving?(): void;
  /** Whether Erevos starts by itself as the phone turns on (BootStart.kt). Missing in a build before it. */
  bootStart?(): boolean;
  setBootStart?(on: boolean): void;
  /** While `on`, the service holds no wake lock: an alarm wakes the phone about once a minute to look (battery mode Sleep). */
  setSleepy?(on: boolean): void;
  /** While `on`, a quiet notice says Erevos is locked and receives nothing until it is open again. */
  setLocked?(on: boolean): void;
  /** Plays the phone's ringtone, or `tone` (a sound's address; '' for none); with `notice`, also
   *  shows the call notice, over the lock screen. */
  ring?(video: boolean, notice: boolean, tone?: string | null): void;
  stopRinging?(): void;
  /** A notice that `count` messages came, no more; hidden on a locked phone. Each one sounds;
   *  `quiet`: the last one came without sound, so it makes none (a build before it sounds as before);
   *  `sound`: it came in a chat with a sound of its own, this one (its address). */
  tellMessages?(count: number, quiet?: boolean, sound?: string | null): void;
  /** Some were read in Erevos: the notice, if it shows, says `count` without sound. */
  recountMessages?(count: number): void;
  clearMessages?(): void;
  /** A message came where Erevos shows it on the screen: only the messages notice's sound plays,
   *  or `sound` (a chat's own, its address). */
  chime?(sound?: string | null): void;
  /** Android's own sound picker, for a chat's messages or its calls, with `current` chosen: the
   *  sound's address, '' for the picker's Default, or null if the owner went back. */
  pickSound?(kind: 'message' | 'ring', current?: string | null): Promise<string | null>;
  /** The name a sound has on this phone; '' if none. */
  soundName?(uri: string): Promise<string>;
  /** The app's language ('en' or 'el'), for the notices shown while the app is closed. */
  setLanguage?(lang: string): void;
  /** Lets Erevos show over the lock screen and wake the screen, while a call shows. */
  showOverLock?(on: boolean): void;
  backgroundState?(): BackgroundState;
  /** Android's own question to leave Erevos out of battery saving. */
  askBattery?(): void;
  /** Android's setting to let Erevos show a call over the lock screen. */
  askFullScreen?(): void;
  /** Opens Android's screen for that setting, or Erevos's page in the settings; false if neither opened. */
  openSettings?(which: SettingsScreen): boolean;
  /** Opens the phone maker's own screen for apps that may run in the background; false if it has none known. */
  openMaker?(): boolean;
  /** "onNetwork": the phone's network changed (lib/network-change.ts). */
  addListener?(name: 'onNetwork', listener: () => void): EventSubscription;
};

// The phone's side of a call on Android (sound route, screen, ringing in the background). In a page
// (the web app, the computer's and Sailfish OS's app), only the ring, the page's own
// (page-ring.web.ts). Null in a build made before this module was added: calls still work, with
// the sound where the phone puts it, and ring only while Erevos shows.
export const callAudio = requireOptionalNativeModule<CallAudio>('ErevosCall') ?? pageRing;
