import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

// The phone's SMS, for Android: Erevos as the default SMS app, its conversations, sending, and
// the hidden SMS invites between Erevos phones (data SMS to a port, see lib/sms-invite.ts).
// On other platforms, and in an app built before this module, there is no SMS: smsReady() is false.

/** `slots`: how many SIMs the phone can hold (0 in an app built before it). */
export type SmsStatus = { sdk: number; phone: boolean; isDefault: boolean; slots?: number };

/** A SIM in the phone: `id` is what sending takes, `slot` counts from 0. */
export type Sim = { id: number; slot: number; name: string };

/** The latest message of a conversation. `at` is milliseconds. */
export type SmsThread = { thread: number; address: string; text: string; at: number; mine: boolean; unread: number };

/** A picture of an MMS, as an address the app may show. */
export type SmsPicture = { uri: string; type: string };

/** `sim` is the SIM it came or went on (-1 if unknown); `kind` and `pictures` are missing in an app
 *  built before MMS. */
export type SmsMessage = {
  id: number;
  kind?: 'sms' | 'mms';
  text: string;
  at: number;
  mine: boolean;
  state: 'done' | 'sending' | 'failed';
  read: boolean;
  sim?: number;
  pictures?: SmsPicture[];
};

/** A piece of an SMS invite that came, base64. */
export type SmsInvitePart = { from: string; data: string; at: number };

export type SmsEvents = {
  onSms: (event: { address: string; mms?: number }) => void;
  onSmsSent: (event: { id: number; ok: boolean; mms?: boolean }) => void;
  onInvite: (event: { from: string }) => void;
};

type NativeSms = {
  status(): SmsStatus;
  requestDefault(): void;
  threads(limit: number): Promise<SmsThread[]>;
  messages(address: string, limit: number): Promise<SmsMessage[]>;
  markRead(address: string): Promise<void>;
  /** `sim` only in a build with MMS (an older one takes two arguments). */
  send(address: string, text: string, sim?: number): Promise<number>;
  sendMms?(address: string, text: string, data: Uint8Array, type: string, sim: number): Promise<number>;
  sims?(): Promise<Sim[]>;
  contactNames?(numbers: string[]): Promise<Record<string, string>>;
  sendData(address: string, data: Uint8Array): Promise<void>;
  takeInvites(): Promise<SmsInvitePart[]>;
  addListener<Name extends keyof SmsEvents>(name: Name, listener: SmsEvents[Name]): EventSubscription;
};

const native = requireOptionalNativeModule<NativeSms>('ErevosSms');

export function smsReady(): boolean {
  return native !== null;
}

export function smsStatus(): SmsStatus | null {
  return native ? native.status() : null;
}

/** Shows Android's question whether Erevos should be the phone's SMS app. */
export function requestDefaultSms(): void {
  native?.requestDefault();
}

export function smsThreads(limit = 200): Promise<SmsThread[]> {
  return native ? native.threads(limit) : Promise.resolve([]);
}

export function smsMessages(address: string, limit = 300): Promise<SmsMessage[]> {
  return native ? native.messages(address, limit) : Promise.resolve([]);
}

export function markSmsRead(address: string): Promise<void> {
  return native ? native.markRead(address) : Promise.resolve();
}

/** Sends a plain, unencrypted SMS, on a SIM (-1: the phone's default). Returns its row in the
 *  phone's SMS store, or -1. */
export function sendSms(address: string, text: string, sim = -1): Promise<number> {
  if (!native) return Promise.reject(new Error('This app was built without SMS.'));
  return mmsReady() ? native.send(address, text, sim) : native.send(address, text);
}

/** Whether this build can send and receive MMS. */
export function mmsReady(): boolean {
  return typeof native?.sendMms === 'function';
}

/** Sends a picture as an MMS, with text if any; as plain as an SMS. Returns its row, or -1. */
export function sendMms(address: string, text: string, picture: { bytes: Uint8Array; mime: string }, sim = -1): Promise<number> {
  if (!native?.sendMms) return Promise.reject(new Error('This build of Erevos cannot send MMS yet.'));
  return native.sendMms(address, text, picture.bytes, picture.mime, sim);
}

/** The SIMs in the phone, once Erevos may read the phone's state; else none. */
export function smsSims(): Promise<Sim[]> {
  return native?.sims ? native.sims() : Promise.resolve([]);
}

/** The names the phone's contacts give these numbers, once Erevos may read them; else none. */
export function contactNames(numbers: string[]): Promise<Record<string, string>> {
  return native?.contactNames && numbers.length > 0 ? native.contactNames(numbers) : Promise.resolve({});
}

export function sendSmsData(address: string, data: Uint8Array): Promise<void> {
  if (!native) return Promise.reject(new Error('This app was built without SMS.'));
  return native.sendData(address, data);
}

/** The invite pieces that came since the last call. Each is given once. */
export function takeSmsInvites(): Promise<SmsInvitePart[]> {
  return native ? native.takeInvites() : Promise.resolve([]);
}

export function onSmsEvent<Name extends keyof SmsEvents>(name: Name, listener: SmsEvents[Name]): EventSubscription | null {
  return native ? native.addListener(name, listener) : null;
}
