import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export type DeviceEvents = {
  /** Where the phone was found, once findPlace started: `acc` metres, -1 when not said; or `error`. */
  onPlace: (event: { lat?: number; lon?: number; acc?: number; error?: 'timeout' }) => void;
};

type Device = {
  /** Puts the text on the phone's clipboard, marked sensitive. False when it could not. */
  copyText(text: string): boolean;
  /** Starts looking for where the phone is, once: '' when it did, else why not. Missing in a build before places. */
  findPlace?(): '' | 'permission' | 'off';
  addListener<Name extends keyof DeviceEvents>(name: Name, listener: DeviceEvents[Name]): EventSubscription;
};

// What a chat asks of the phone itself on Android (lib/clipboard.ts, lib/place.ts). Null in a build
// made before this module was added, and on other platforms, which have their own ways or none.
export const device = requireOptionalNativeModule<Device>('ErevosDevice');
