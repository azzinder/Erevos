import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

// The phone's contacts, for Android: reading and changing Android's own contacts (ContactsContract),
// so they stay where every other app finds them, their groups, photos and ringtones, the SIM's
// contacts, the calls with a number, birthday reminders, and reading a QR code from a photo. Other
// apps' requests to add, change, show or pick a contact come here too (the module's manifest).
// On other platforms, and in an app built before this module, there are none: contactsReady() is false.

/** A number, an email or an address, as Android keeps it: the rows it is in (the same value kept
 *  twice is given once), its value, Android's type for it, and its label when the type is custom. */
export type PhoneEntry = { ids: number[]; value: string; type: number; label: string };

/** A text Android keeps once (a note, a birthday): the rows it is in, and the text. */
export type PhoneText = { ids: number[]; value: string };

/** An account the phone's contacts are kept in; an empty type and name: on this phone only. */
export type ContactAccount = { type: string; name: string };

/** One of the phone's contacts. `photo` is Android's id of its photo, 0 for none. */
export type PhoneContact = {
  id: number;
  lookup: string;
  name: string;
  given: string;
  family: string;
  starred: boolean;
  photo: number;
  ringtone: string;
  phones: PhoneEntry[];
  emails: PhoneEntry[];
  addresses: PhoneEntry[];
  note: PhoneText | null;
  birthday: PhoneText | null;
  company: string;
  title: string;
  /** The rows its company and job title are in. */
  org: number[];
  /** The groups it is in, by id. */
  groups: number[];
  /** The accounts it is kept in (one for each of its raw contacts). */
  accounts: ContactAccount[];
};

/** A contact as it is saved: `id` 0 for a new one, kept in `account`. An entry without rows is new;
 *  a row of the contact that no entry names is deleted. */
export type ContactSave = {
  id: number;
  account: ContactAccount | null;
  given: string;
  family: string;
  company: string;
  title: string;
  org: number[];
  phones: PhoneEntry[];
  emails: PhoneEntry[];
  addresses: PhoneEntry[];
  note: PhoneText;
  birthday: PhoneText;
  starred: boolean;
};

/** A group (a label) of the phone's contacts, in an account. `readOnly`: its account does not let it be renamed or deleted. */
export type PhoneGroup = { id: number; title: string; account: ContactAccount; count: number; readOnly: boolean };

/** A contact on a SIM card. */
export type SimContact = { name: string; number: string; sim: number };

/** A call with a number, from the phone's call log. `at` is milliseconds, `seconds` how long it lasted. */
export type CallEntry = { number: string; at: number; seconds: number; kind: 'in' | 'out' | 'missed' | 'rejected' | 'blocked' | 'other' };

export type ContactsStatus = { read: boolean; write: boolean; calls: boolean; birthdays: boolean };

export type ContactsEvents = {
  /** Android's contacts changed, here or in another app. */
  onContactsChanged: () => void;
};

type NativeContacts = {
  status(): ContactsStatus;
  watch(): void;
  all(): Promise<PhoneContact[]>;
  one(id: number): Promise<PhoneContact | null>;
  save(contact: string): Promise<number>;
  remove(ids: number[]): Promise<void>;
  setStarred(id: number, starred: boolean): Promise<void>;
  accounts(): Promise<ContactAccount[]>;
  photo(id: number, large: boolean): Promise<string | null>;
  setPhoto(id: number, data: Uint8Array): Promise<void>;
  pickRingtone(id: number): Promise<string | null>;
  ringtoneName(uri: string): Promise<string>;
  groups(): Promise<PhoneGroup[]>;
  createGroup(title: string, accountType: string, accountName: string): Promise<number>;
  renameGroup(id: number, title: string): Promise<void>;
  deleteGroup(id: number): Promise<void>;
  addToGroup(group: number, contact: number): Promise<boolean>;
  removeFromGroup(group: number, contact: number): Promise<void>;
  takeOver(keeper: number, others: number[]): Promise<void>;
  simContacts(): Promise<SimContact[]>;
  calls(numbers: string[], limit: number): Promise<CallEntry[]>;
  setBirthdays(on: boolean): Promise<void>;
  readQr(uri: string): Promise<string | null>;
  addListener<Name extends keyof ContactsEvents>(name: Name, listener: ContactsEvents[Name]): EventSubscription;
};

const native = requireOptionalNativeModule<NativeContacts>('ErevosContacts');

const none = () => Promise.reject(new Error('This build of Erevos has no contacts part yet.'));

export function contactsReady(): boolean {
  return native !== null;
}

/** Whether Erevos may read and change the phone's contacts and read its calls, and whether birthday reminders are on. */
export function contactsStatus(): ContactsStatus {
  return native ? native.status() : { read: false, write: false, calls: false, birthdays: false };
}

/** Tells onContactsChanged from now on, once Erevos may read the contacts. */
export function watchContacts(): void {
  native?.watch();
}

/** Every one of the phone's contacts, by name. None until Erevos may read them. */
export function phoneContacts(): Promise<PhoneContact[]> {
  return native ? native.all() : Promise.resolve([]);
}

export function phoneContact(id: number): Promise<PhoneContact | null> {
  return native ? native.one(id) : Promise.resolve(null);
}

/** Saves a contact in Android's contacts; returns its id. */
export function savePhoneContact(contact: ContactSave): Promise<number> {
  return native ? native.save(JSON.stringify(contact)) : none();
}

/** Deletes contacts from Android's contacts, in every account they are kept in. */
export function removePhoneContacts(ids: number[]): Promise<void> {
  return native ? native.remove(ids) : none();
}

/** A favourite, or not: Android's own, which every phone app lists. */
export function starPhoneContact(id: number, starred: boolean): Promise<void> {
  return native ? native.setStarred(id, starred) : none();
}

/** The accounts a new contact or group can be kept in, besides on this phone only. */
export function contactAccounts(): Promise<ContactAccount[]> {
  return native ? native.accounts() : Promise.resolve([]);
}

/** A contact's photo, base64 (its thumbnail, or `large`), or null. */
export function phoneContactPhoto(id: number, large = false): Promise<string | null> {
  return native ? native.photo(id, large) : Promise.resolve(null);
}

/** Gives a contact a photo (JPEG or PNG), or takes it away with none. */
export function setPhoneContactPhoto(id: number, data: Uint8Array | null): Promise<void> {
  return native ? native.setPhoto(id, data ?? new Uint8Array(0)) : none();
}

/** Android's ringtone picker for a contact: the ringtone chosen and kept, '' for the phone's own, or null if the owner went back. */
export function pickRingtone(id: number): Promise<string | null> {
  return native ? native.pickRingtone(id) : none();
}

/** A ringtone's name, as the phone shows it. */
export function ringtoneName(uri: string): Promise<string> {
  return native && uri ? native.ringtoneName(uri) : Promise.resolve('');
}

export function phoneGroups(): Promise<PhoneGroup[]> {
  return native ? native.groups() : Promise.resolve([]);
}

export function createPhoneGroup(title: string, account: ContactAccount): Promise<number> {
  return native ? native.createGroup(title, account.type, account.name) : none();
}

export function renamePhoneGroup(id: number, title: string): Promise<void> {
  return native ? native.renameGroup(id, title) : none();
}

/** Deletes a group; its contacts stay. */
export function deletePhoneGroup(id: number): Promise<void> {
  return native ? native.deleteGroup(id) : none();
}

/** Puts a contact in a group. False when the contact is kept in none of the group's account. */
export function addToPhoneGroup(group: number, contact: number): Promise<boolean> {
  return native ? native.addToGroup(group, contact) : none();
}

export function removeFromPhoneGroup(group: number, contact: number): Promise<void> {
  return native ? native.removeFromGroup(group, contact) : none();
}

/** After merging: the keeper takes the others' photo and ringtone when it has none, and their
 *  groups, and the others are deleted. */
export function takeOverContacts(keeper: number, others: number[]): Promise<void> {
  return native ? native.takeOver(keeper, others) : none();
}

/** The contacts on the phone's SIM cards. */
export function simContacts(): Promise<SimContact[]> {
  return native ? native.simContacts() : Promise.resolve([]);
}

/** The latest calls with these numbers, newest first, once Erevos may read the call log. */
export function phoneCalls(numbers: string[], limit = 50): Promise<CallEntry[]> {
  return native && numbers.length > 0 ? native.calls(numbers, limit) : Promise.resolve([]);
}

/** Turns birthday reminders on or off: a notice in the morning of each phone contact's birthday. */
export function setBirthdayReminders(on: boolean): Promise<void> {
  return native ? native.setBirthdays(on) : none();
}

/** The text of the QR code in a photo (a file:// or content:// address), or null if it has none. */
export function readQrCode(uri: string): Promise<string | null> {
  return native ? native.readQr(uri) : none();
}

export function onContactsEvent<Name extends keyof ContactsEvents>(name: Name, listener: ContactsEvents[Name]): EventSubscription | null {
  return native ? native.addListener(name, listener) : null;
}
