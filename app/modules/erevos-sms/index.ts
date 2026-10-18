import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

// The phone's SMS, for Android: Erevos as the default SMS app, its conversations, sending, and
// the hidden SMS invites between Erevos phones (data SMS to a port, see lib/sms-invite.ts).
// On other platforms, and in an app built before this module, there is no SMS: smsReady() is false.

export type SmsStatus = { sdk: number; phone: boolean; isDefault: boolean };

/** The latest message of a conversation. `at` is milliseconds. */
export type SmsThread = { thread: number; address: string; text: string; at: number; mine: boolean; unread: number };

export type SmsMessage = { id: number; text: string; at: number; mine: boolean; state: 'done' | 'sending' | 'failed'; read: boolean };

/** A piece of an SMS invite that came, base64. */
export type SmsInvitePart = { from: string; data: string; at: number };

export type SmsEvents = {
  onSms: (event: { address: string }) => void;
  onSmsSent: (event: { id: number; ok: boolean }) => void;
  onInvite: (event: { from: string }) => void;
};

type NativeSms = {
  status(): SmsStatus;
  requestDefault(): void;
  threads(limit: number): Promise<SmsThread[]>;
  messages(address: string, limit: number): Promise<SmsMessage[]>;
  markRead(address: string): Promise<void>;
  send(address: string, text: string): Promise<number>;
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

/** Sends a plain, unencrypted SMS. Returns its row in the phone's SMS store, or -1. */
export function sendSms(address: string, text: string): Promise<number> {
  if (!native) return Promise.reject(new Error('This app was built without SMS.'));
  return native.send(address, text);
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
