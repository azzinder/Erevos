import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

// The phone's calls, for Android: Erevos as the phone app (Android's dialer role), with its own
// call screen, which shows over the lock screen and works while Erevos is locked; making calls on
// a SIM. On other platforms, and in an app built before this module, there is no phone: phoneReady()
// is false and everything here does nothing.

/** `calls`: how many calls are on now; `slots`: how many SIMs the phone can hold. */
export type PhoneStatus = { sdk: number; phone: boolean; isDefault: boolean; calls: number; slots: number };

/** A way the phone can call: a SIM. `id` is what placeCall takes and the call history keeps;
 *  `slot` counts from 0, -1 for an account that is no SIM's; `name` is "SIM 1" or the account's. */
export type PhoneAccount = { id: string; label: string; slot: number; name: string };

export type PhoneEvents = {
  /** A call came, was made, or ended: how many are on now. */
  onCalls: (event: { count: number }) => void;
};

type NativePhone = {
  status(): PhoneStatus;
  requestDefault(): void;
  accounts(): Promise<PhoneAccount[]>;
  placeCall(number: string, account: string): Promise<void>;
  showCall(): void;
  setKnownNames(names: Record<string, string>): void;
  clearKnownNames(): void;
  forgetKnownNamesAfter(ms: number): void;
  addListener<Name extends keyof PhoneEvents>(name: Name, listener: PhoneEvents[Name]): EventSubscription;
};

const native = requireOptionalNativeModule<NativePhone>('ErevosPhone');

export function phoneReady(): boolean {
  return native !== null;
}

export function phoneStatus(): PhoneStatus | null {
  return native ? native.status() : null;
}

/** Shows Android's question whether Erevos should be the phone app. */
export function requestDefaultPhone(): void {
  native?.requestDefault();
}

/** The phone's SIMs, once Erevos may read the phone's state; else none. */
export function phoneAccounts(): Promise<PhoneAccount[]> {
  return native ? native.accounts() : Promise.resolve([]);
}

/** Calls `number` on the SIM with this account id, or on the phone's default SIM for ''. Needs
 *  Android's call permission, which the phone app role gives. */
export function placeCall(number: string, account = ''): Promise<void> {
  if (!native) return Promise.reject(new Error('This app was built without the phone.'));
  return native.placeCall(number, account);
}

/** Brings the call screen back while a call is on. */
export function showCall(): void {
  native?.showCall();
}

/**
 * Names Erevos knows for phone numbers, `{ number: name }`, which the call screen and its notice
 * show for a call with one of them, before the phone's contacts: the names of contacts kept only
 * inside Erevos, sealed. Give them only while a space is open, and only the space's own, never a
 * hidden place's. They stay in the memory of Erevos's process only, never written anywhere, and
 * each call replaces the ones before; clearKnownNames() forgets them, which the app does whenever
 * the space locks (app/_layout.tsx), and forgetKnownNamesAfter() when it would, in the background.
 * With Erevos locked, a call shows the phone's contacts only.
 */
export function setKnownNames(names: Record<string, string>): void {
  native?.setKnownNames(names);
}

export function clearKnownNames(): void {
  native?.clearKnownNames();
}

/** Erevos went to the background: the names are forgotten after `ms`, when the space would lock,
 *  unless the app keeps them again first, with `ms` -1. The native side forgets them on its own,
 *  as the app may not run in the background. */
export function forgetKnownNamesAfter(ms: number): void {
  native?.forgetKnownNamesAfter(ms);
}

export function onPhoneEvent<Name extends keyof PhoneEvents>(name: Name, listener: PhoneEvents[Name]): EventSubscription | null {
  return native ? native.addListener(name, listener) : null;
}
