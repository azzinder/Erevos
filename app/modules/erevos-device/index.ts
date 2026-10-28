import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export type DeviceEvents = {
  /** Where the phone was found, once findPlace started: `acc` metres, -1 when not said, `age` seconds before; or `error`. */
  onPlace: (event: { lat?: number; lon?: number; acc?: number; age?: number; error?: 'timeout' }) => void;
};

type Device = {
  /** Puts the text on the phone's clipboard, marked sensitive. False when it could not. */
  copyText(text: string): boolean;
  /** Starts looking for where the phone is, once: '' when it did, else why not. Missing in a build before places. */
  findPlace?(): '' | 'permission' | 'off' | 'approximate';
  /** Stops looking, with nothing said. Missing in a build before it. */
  stopPlace?(): void;
  /** Keeps the app out of screenshots and the recent apps preview while on. False with no screen showing. Missing in a build before it. */
  setSecure?(on: boolean): boolean;
  /** While on, the screen turns with the phone even with its auto-rotate off; off, it follows the setting again. False with no screen showing. Missing in a build before it. */
  turnWithPhone?(on: boolean): boolean;
  /** Keeps a reminder of Chat with myself for `at` (ms), told with Erevos closed; one with this id is replaced. False when too many wait. Missing in a build before it. */
  remind?(id: string, at: number): boolean;
  /** Forgets a reminder that has not come. Missing in a build before reminders. */
  forgetReminder?(id: string): void;
  /** Reminders seen in their chat: the notice no longer tells of them, and goes once it tells of none. Missing in a build before it. */
  seenReminders?(ids: string[]): void;
  /** A notice says that Erevos `name` is out, and opens Updates (lib/release-notice.ts). Missing in a build before it. */
  tellUpdate?(name: string): void;
  addListener<Name extends keyof DeviceEvents>(name: Name, listener: DeviceEvents[Name]): EventSubscription;
};

// What a chat asks of the phone itself on Android (lib/clipboard.ts, lib/place.ts). Null in a build
// made before this module was added, and on other platforms, which have their own ways or none.
export const device = requireOptionalNativeModule<Device>('ErevosDevice');
