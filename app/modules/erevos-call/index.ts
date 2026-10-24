import { requireOptionalNativeModule } from 'expo-modules-core';

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
export type SettingsScreen = 'notices' | 'calls' | 'messages' | 'data' | 'alarms' | 'unused' | 'saver' | 'sound' | 'app';

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
  /** While `on`, a quiet notice says Erevos is locked and receives nothing until it is open again. */
  setLocked?(on: boolean): void;
  /** Plays the phone's ringtone; with `notice`, also shows the call notice, over the lock screen. */
  ring?(video: boolean, notice: boolean): void;
  stopRinging?(): void;
  /** A notice that `count` messages came, no more; hidden on a locked phone. Each one sounds;
   *  `quiet`: the last one came without sound, so it makes none (a build before it sounds as before). */
  tellMessages?(count: number, quiet?: boolean): void;
  /** Some were read in Erevos: the notice, if it shows, says `count` without sound. */
  recountMessages?(count: number): void;
  clearMessages?(): void;
  /** A message came where Erevos shows it on the screen: only the messages notice's sound plays. */
  chime?(): void;
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
};

// The phone's side of a call on Android (sound route, screen, ringing in the background). Null in
// a build made before this module was added, and on other platforms: calls still work, with the
// sound where the phone puts it, and ring only while Erevos shows.
export const callAudio = requireOptionalNativeModule<CallAudio>('ErevosCall');
