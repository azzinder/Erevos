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

/**
 * A call in Android's call history. `type` is Android's: 1 came, 2 made, 3 missed, 5 declined,
 * 6 blocked, 7 answered on another device (lib/phone-log.ts); `features` its marks, 4 for HD voice
 * and 8 for Wi-Fi calling; `account` the SIM's id, as PhoneAccount's; `shown` the number as the
 * phone's country writes it; `name` and `photo` (a content: address) from the phone's contacts, ''
 * when it has none; `presentation` 1 when the number shows, 2 private, 3 unknown, 4 a payphone;
 * `isNew` a missed call not seen yet; `blocked` why it was blocked, 0 when it was not. `at` and
 * `duration` in milliseconds and seconds.
 */
export type LoggedCall = {
  id: number;
  number: string;
  shown: string;
  name: string;
  photo: string;
  at: number;
  duration: number;
  type: number;
  features: number;
  account: string;
  presentation: number;
  isNew: boolean;
  blocked: number;
};

/** One of the phone's starred contacts, with its numbers: `primary` is its default number, or ''. */
export type Favourite = {
  id: string;
  name: string;
  photo: string;
  numbers: { number: string; shown: string; label: string }[];
  primary: string;
};

export type PhoneEvents = {
  /** A call came, was made, or ended: how many are on now. */
  onCalls: (event: { count: number }) => void;
  /** The call history or the phone's contacts changed. */
  onHistory: (event: Record<string, never>) => void;
};

type NativePhone = {
  status(): PhoneStatus;
  requestDefault(): void;
  accounts(): Promise<PhoneAccount[]>;
  placeCall(number: string, account: string): Promise<void>;
  history(): Promise<{ allowed: boolean; calls: LoggedCall[] }>;
  favourites(): Promise<{ allowed: boolean; favourites: Favourite[] }>;
  seenMissed(): void;
  quickReplies(): { replies: string[]; own: boolean };
  setQuickReplies(replies: string[]): void;
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

/** Android's call history, its newest 500 calls; `allowed` is false while Android does not let
 *  Erevos read it. Erevos keeps no copy. */
export function callHistory(): Promise<{ allowed: boolean; calls: LoggedCall[] }> {
  return native ? native.history() : Promise.resolve({ allowed: false, calls: [] });
}

/** The phone's starred contacts, by name; `allowed` is false while Android does not let Erevos
 *  read the contacts. */
export function phoneFavourites(): Promise<{ allowed: boolean; favourites: Favourite[] }> {
  return native ? native.favourites() : Promise.resolve({ allowed: false, favourites: [] });
}

/** The missed calls were seen: Android's notice of them goes. */
export function seenMissedCalls(): void {
  native?.seenMissed();
}

/** The quick replies the call screen's Message offers, to decline a call with an SMS: the owner's
 *  own (`own`), else the usual ones in the app's language. Kept on the phone, not sealed, as the
 *  call screen shows them with Erevos locked. */
export function quickReplies(): { replies: string[]; own: boolean } {
  return native ? native.quickReplies() : { replies: [], own: false };
}

/** Keeps the owner's quick replies; [] goes back to the usual ones. */
export function setQuickReplies(replies: string[]): void {
  native?.setQuickReplies(replies);
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
