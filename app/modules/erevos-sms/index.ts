import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

// The phone's SMS, for Android: Erevos as the default SMS app, its conversations, sending, and
// the hidden SMS invites between Erevos phones (data SMS to a port, see lib/sms-invite.ts).
// On other platforms, and in an app built before this module, there is no SMS: smsReady() is false.

/** `slots`: how many SIMs the phone can hold (0 in an app built before it). */
export type SmsStatus = { sdk: number; phone: boolean; isDefault: boolean; slots?: number };

/** A SIM in the phone: `id` is what sending takes, `slot` counts from 0. */
export type Sim = { id: number; slot: number; name: string };

/** The latest message of a conversation. `at` is milliseconds. `replied`: any message in it is
 *  ours (missing in an app built before it). */
export type SmsThread = { thread: number; address: string; text: string; at: number; mine: boolean; unread: number; replied?: boolean };

/** What the phone's contacts have for a number: its name, and its picture as an address the app
 *  may show (empty when none). */
export type ContactCard = { name: string; photo: string };

/** A picture of an MMS, as an address the app may show. */
export type SmsPicture = { uri: string; type: string };

/** `sim` is the SIM it came or went on (-1 if unknown); `kind` and `pictures` are missing in an app
 *  built before MMS. One of ours that went is `sent`, then `delivered` or `undelivered` when the
 *  network sends a delivery report (an older build says `done`). */
export type SmsMessage = {
  id: number;
  kind?: 'sms' | 'mms';
  text: string;
  at: number;
  mine: boolean;
  state: 'done' | 'sending' | 'failed' | 'sent' | 'delivered' | 'undelivered';
  read: boolean;
  sim?: number;
  pictures?: SmsPicture[];
  /** Who wrote it, in a group's conversation (an MMS that came). */
  from?: string;
};

/** Where an SMS sent for later is, as Android holds it: waiting there for its time, went, or
 *  never given to it (kept before this build, or it could not be opened). */
export type LaterSmsState = 'waiting' | 'went' | 'unknown';

/** Android holding SMS sent for later until their time, so they go with Erevos closed. */
export type LaterSmsHolder = {
  schedule(sms: { id: string; to: string; text: string; sim: number; at: number }): Promise<void>;
  cancel(id: string): Promise<boolean>;
  state(ids: string[]): Promise<Record<string, LaterSmsState>>;
};

/** A piece of an SMS invite that came, base64. */
export type SmsInvitePart = { from: string; data: string; at: number };

export type SmsEvents = {
  onSms: (event: { address: string; mms?: number }) => void;
  onSmsSent: (event: { id: number; ok: boolean; mms?: boolean }) => void;
  onSmsDelivered: (event: { id: number; ok: boolean }) => void;
  /** An SMS sent for later went, held by Android until its time (`id`: lock/sms-data.ts's). */
  onSmsLaterSent: (event: { id: string }) => void;
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
  scheduleLater?(id: string, to: string, text: string, sim: number, at: number): Promise<void>;
  cancelLater?(id: string): Promise<boolean>;
  laterState?(ids: string[]): Promise<Record<string, LaterSmsState>>;
  deleteThread?(address: string, upTo: number): Promise<number>;
  deleteMessages?(ids: string[]): Promise<number>;
  resend?(kind: string, id: number, sim: number): Promise<number>;
  pictureBytes?(uri: string): Promise<Uint8Array>;
  contactCards?(numbers: string[]): Promise<Record<string, ContactCard>>;
  canBlock?(): Promise<boolean>;
  blocked?(): Promise<string[]>;
  block?(number: string): Promise<boolean>;
  unblock?(number: string): Promise<boolean>;
  exportSms?(): Promise<Uint8Array>;
  importSms?(data: Uint8Array): Promise<{ sms: number; mms: number }>;
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

/** Sends an MMS to one number, or to a group's numbers comma-separated: a picture with text, or
 *  text alone (a group's). As plain as an SMS. Returns its row, or -1. */
export function sendMms(address: string, text: string, picture: { bytes: Uint8Array; mime: string } | null, sim = -1): Promise<number> {
  if (!native?.sendMms) return Promise.reject(new Error('This build of Erevos cannot send MMS yet.'));
  return native.sendMms(address, text, picture?.bytes ?? new Uint8Array(0), picture?.mime ?? '', sim);
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

/** Android's hold on SMS sent for later, or null in a build without it (and with no SMS). */
export function laterSmsHolder(): LaterSmsHolder | null {
  const sms = native;
  if (!sms?.scheduleLater || !sms.cancelLater || !sms.laterState) return null;
  return {
    schedule: (l) => sms.scheduleLater!(l.id, l.to, l.text, l.sim, l.at),
    cancel: (id) => sms.cancelLater!(id),
    state: (ids) => (ids.length > 0 ? sms.laterState!(ids) : Promise.resolve({})),
  };
}

/** The names and pictures the phone's contacts give these numbers, once Erevos may read them;
 *  else none. A build before pictures gives the names alone. */
export async function contactCards(numbers: string[]): Promise<Record<string, ContactCard>> {
  if (numbers.length === 0) return {};
  if (native?.contactCards) return native.contactCards(numbers);
  const names = await contactNames(numbers);
  return Object.fromEntries(Object.entries(names).map(([number, name]) => [number, { name, photo: '' }]));
}

/** Whether this build can delete SMS, send again, block numbers and back up the phone's SMS. */
export function smsToolsReady(): boolean {
  return typeof native?.deleteThread === 'function';
}

const notInBuild = () => Promise.reject(new Error('This build of Erevos cannot do this yet.'));

/** Deletes from the phone a conversation's SMS and MMS up to `upTo` (milliseconds), as the SMS app. */
export function deleteSmsThread(address: string, upTo: number): Promise<number> {
  return native?.deleteThread ? native.deleteThread(address, upTo) : notInBuild();
}

/** Deletes messages from the phone, each by its kind and row: "sms:12", "mms:3". */
export function deleteSmsMessages(ids: string[]): Promise<number> {
  return native?.deleteMessages ? native.deleteMessages(ids) : notInBuild();
}

/** Sends one of ours that did not go again, in its place, on `sim` (-1: the SIM it was for). */
export function resendSms(message: Pick<SmsMessage, 'kind' | 'id'>, sim = -1): Promise<number> {
  return native?.resend ? native.resend(message.kind ?? 'sms', message.id, sim) : notInBuild();
}

/** The bytes of an MMS's picture, by its address (SmsPicture.uri). */
export function smsPictureBytes(uri: string): Promise<Uint8Array> {
  return native?.pictureBytes ? native.pictureBytes(uri) : notInBuild();
}

/** Whether Erevos may block numbers in Android's own list: as the SMS app, in a build with it. */
export function canBlockNumbers(): Promise<boolean> {
  return native?.canBlock ? native.canBlock().catch(() => false) : Promise.resolve(false);
}

/** The numbers in Android's list of blocked numbers, as the SMS app may read them; else none. */
export function blockedNumbers(): Promise<string[]> {
  return native?.blocked ? native.blocked().catch(() => []) : Promise.resolve([]);
}

/** Puts a number in Android's list: Android then rejects its SMS, MMS and calls. */
export function blockNumber(number: string): Promise<boolean> {
  return native?.block ? native.block(number) : notInBuild();
}

export function unblockNumber(number: string): Promise<boolean> {
  return native?.unblock ? native.unblock(number) : notInBuild();
}

/** Every SMS and MMS on the phone, for a backup (lib/backup-sms.ts reads them); null in a build
 *  without it. */
export function exportPhoneSms(): Promise<Uint8Array | null> {
  return native?.exportSms ? native.exportSms() : Promise.resolve(null);
}

/** Puts the SMS and MMS of a backup into the phone's, those it does not have yet, as the SMS app. */
export function importPhoneSms(data: Uint8Array): Promise<{ sms: number; mms: number }> {
  return native?.importSms ? native.importSms(data) : notInBuild();
}

/** The invite pieces that came since the last call. Each is given once. */
export function takeSmsInvites(): Promise<SmsInvitePart[]> {
  return native ? native.takeInvites() : Promise.resolve([]);
}

export function onSmsEvent<Name extends keyof SmsEvents>(name: Name, listener: SmsEvents[Name]): EventSubscription | null {
  return native ? native.addListener(name, listener) : null;
}
