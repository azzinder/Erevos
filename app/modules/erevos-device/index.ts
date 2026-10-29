import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export type DeviceEvents = {
  /** Where the phone was found, once findPlace started: `acc` metres, -1 when not said, `age` seconds before; or `error`. */
  onPlace: (event: { lat?: number; lon?: number; acc?: number; age?: number; error?: 'timeout' }) => void;
};

/** The panic button's settings (Panic.kt): `trigger` and `pending` are packages, '' for none. */
export type PanicState = { on: boolean; backups: boolean; trigger: string; triggerLabel: string; triggerThere: boolean; pending: string; pendingLabel: string };

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
  /** The panic button's settings (Panic.kt). Null with no app context. Missing in a build before it. */
  panicState?(): PanicState | null;
  /** Whether the trusted panic app may wipe, and whether automatic backups in `folder` (a tree uri) go too. */
  setPanic?(on: boolean, backups: boolean, folder: string): void;
  /** Trusts the panic app that asked (`pkg`, as panicState's `pending` names it). False when it is no longer that one. */
  allowPanicApp?(pkg: string): boolean;
  /** Says no to the panic app that asked. */
  refusePanicApp?(): void;
  /** Trusts no panic app any more. */
  forgetPanicApp?(): void;
  /** Wipes everything Erevos keeps; Android then stops Erevos. */
  wipeNow?(): boolean;
  addListener<Name extends keyof DeviceEvents>(name: Name, listener: DeviceEvents[Name]): EventSubscription;
};

// What a chat asks of the phone itself on Android (lib/clipboard.ts, lib/place.ts). Null in a build
// made before this module was added, and on other platforms, which have their own ways or none.
export const device = requireOptionalNativeModule<Device>('ErevosDevice');
