import { requireOptionalNativeModule } from 'expo-modules-core';

type Device = {
  /** Puts the text on the phone's clipboard, marked sensitive. False when it could not. */
  copyText(text: string): boolean;
};

// What a chat asks of the phone itself on Android (lib/clipboard.ts). Null in a build made before
// this module was added, and on other platforms, which have their own ways or none.
export const device = requireOptionalNativeModule<Device>('ErevosDevice');
