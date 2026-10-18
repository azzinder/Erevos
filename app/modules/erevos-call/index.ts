import { requireOptionalNativeModule } from 'expo-modules-core';

type CallAudio = {
  /** Sets the sound up for a call, through the loudspeaker or the earpiece. */
  start(speaker: boolean): void;
  setSpeaker(speaker: boolean): void;
  /** Puts the sound and the screen back as they were before the call. */
  stop(): void;
};

// The phone's side of a call on Android (sound route, screen). Null in a build made before this
// module was added, and on other platforms: calls still work, with the sound where the phone puts it.
export const callAudio = requireOptionalNativeModule<CallAudio>('ErevosCall');
