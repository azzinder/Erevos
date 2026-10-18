import { requireOptionalNativeModule } from 'expo-modules-core';

/** What Android lets Erevos do for ringing in the background. */
export type BackgroundState = { notices: boolean; fullScreen: boolean; battery: boolean };

// What came after the first calls is missing in a build made before it, so it is optional.
type CallAudio = {
  /** Sets the sound up for a call, through the loudspeaker or the earpiece. */
  start(speaker: boolean): void;
  setSpeaker(speaker: boolean): void;
  /** Puts the sound and the screen back as they were before the call. */
  stop(): void;
  /** Keeps Erevos running while it is in the background, with a quiet notice that says no more than its name. */
  startReceiving?(): void;
  stopReceiving?(): void;
  /** Plays the phone's ringtone; with `notice`, also shows the call notice, over the lock screen. */
  ring?(video: boolean, notice: boolean): void;
  stopRinging?(): void;
  /** Lets Erevos show over the lock screen and wake the screen, while a call shows. */
  showOverLock?(on: boolean): void;
  backgroundState?(): BackgroundState;
  /** Android's own question to leave Erevos out of battery saving. */
  askBattery?(): void;
  /** Android's setting to let Erevos show a call over the lock screen. */
  askFullScreen?(): void;
};

// The phone's side of a call on Android (sound route, screen, ringing in the background). Null in
// a build made before this module was added, and on other platforms: calls still work, with the
// sound where the phone puts it, and ring only while Erevos shows.
export const callAudio = requireOptionalNativeModule<CallAudio>('ErevosCall');
