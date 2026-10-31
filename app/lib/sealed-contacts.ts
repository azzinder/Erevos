// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { deletePhoto, savePhoto, type PhotoRef } from '../lock/avatar-photos';
import { loadContactsData, MAX_LINKS, MAX_SEALED, saveContactsData, type ContactsData, type SealedContact } from '../lock/contacts-data';
import { currentSpace } from '../lock/keys';
import { hiddenHolder, type Holder } from '../lock/sealed-file';
import { cleanFields, cleanNumber, fieldsName, type Entry, type Fields } from './contacts';
import { randomBytes, toBase64 } from './crypto';
import { openHiddenPlace, type OpenHiddenPlace } from './hidden-contacts';
import { t } from './i18n';

// Contacts kept only in Erevos, never in Android's contacts (lock/contacts-data.ts): the open
// space's, or the open hidden chats' (lib/hidden-contacts.ts), each sealed with its own key, and
// which phone contacts are Erevos contacts. Every change is made on what the phone holds then,
// one after another, and told to the screens showing them.

/** Where sealed contacts are kept: the open space, or hidden chats in it. */
export type Place = { holder: Holder; space: number; key: Uint8Array };

export function spacePlace(): Place {
  const { space, key } = currentSpace();
  return { holder: 'space', space, key };
}

export function placeOf(hidden: OpenHiddenPlace): Place {
  return { holder: hiddenHolder(hidden.pocket), space: hidden.space, key: hidden.key };
}

const listeners = new Set<() => void>();

/** Told each time contacts kept in Erevos change, in any place. */
export function onSealedChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadPlace(place: Place): Promise<ContactsData> {
  return loadContactsData(place.holder, place.space, place.key);
}

let changes: Promise<unknown> = Promise.resolve();

/** Changes a place's contacts as they are on the phone now, after any change asked for before. */
export function changePlace(place: Place, change: (data: ContactsData) => ContactsData): Promise<ContactsData> {
  const run = changes
    .catch(() => undefined)
    .then(async () => {
      const data = change(await loadPlace(place));
      await saveContactsData(place.holder, place.space, place.key, data);
      for (const listener of listeners) listener();
      return data;
    });
  changes = run;
  return run;
}

function newId(): string {
  return toBase64(randomBytes(12)).replace(/\+/g, '-').replace(/\//g, '_');
}

/** Keeps a contact sealed: a new one (`id` null), or the changes to one. Returns its id. */
export async function saveSealed(place: Place, id: string | null, fields: Fields, more: Partial<Pick<SealedContact, 'starred' | 'erevos' | 'photo'>> = {}): Promise<string> {
  const clean = cleanFields(fields);
  if (!fieldsName(clean)) throw new Error(t('Give the contact a name, a number or an email.'));
  const kept = id ?? newId();
  await changePlace(place, (data) => {
    const before = data.contacts.find((c) => c.id === kept);
    if (!before && data.contacts.length >= MAX_SEALED) throw new Error(t('Erevos keeps {n} contacts of its own at most.', { n: MAX_SEALED }));
    const contact: SealedContact = { ...clean, id: kept, starred: before?.starred ?? false, photo: before?.photo ?? null, erevos: before?.erevos ?? '', at: Date.now(), ...more };
    return { ...data, contacts: before ? data.contacts.map((c) => (c.id === kept ? contact : c)) : [...data.contacts, contact] };
  });
  return kept;
}

/**
 * Keeps new contacts sealed, read from a file (app/contact-import.tsx), all in one change, each
 * photo sealed in its own file, telling how many are done. Those past the most kept, or with no
 * name, number or email, are not kept.
 */
export async function importSealed(place: Place, cards: (Fields & { photo: Uint8Array | null })[], progress: (done: number) => void): Promise<{ saved: number; failed: number }> {
  const fresh: SealedContact[] = [];
  let failed = 0;
  for (const card of cards) {
    const clean = cleanFields(card);
    if (fieldsName(clean)) {
      const photo = card.photo ? await savePhoto(card.photo).catch(() => null) : null;
      fresh.push({ ...clean, id: newId(), starred: false, photo, erevos: '', at: Date.now() });
    } else failed++;
    progress(fresh.length + failed);
  }
  let room = 0;
  const forget = (gone: SealedContact[]) => Promise.all(gone.map((c) => (c.photo ? deletePhoto(c.photo.id).catch(() => undefined) : undefined)));
  try {
    await changePlace(place, (data) => {
      room = Math.max(0, Math.min(fresh.length, MAX_SEALED - data.contacts.length));
      return { ...data, contacts: [...data.contacts, ...fresh.slice(0, room)] };
    });
  } catch (error) {
    await forget(fresh);
    throw error;
  }
  await forget(fresh.slice(room));
  return { saved: room, failed: failed + fresh.length - room };
}

/** Forgets a contact kept sealed, and its photo. */
export async function removeSealed(place: Place, id: string): Promise<void> {
  let photo: PhotoRef | null = null;
  await changePlace(place, (data) => {
    photo = data.contacts.find((c) => c.id === id)?.photo ?? null;
    return { ...data, contacts: data.contacts.filter((c) => c.id !== id) };
  });
  const gone = photo as PhotoRef | null;
  if (gone) await deletePhoto(gone.id).catch(() => undefined);
}

export async function starSealed(place: Place, id: string, starred: boolean): Promise<void> {
  await changePlace(place, (data) => ({ ...data, contacts: data.contacts.map((c) => (c.id === id ? { ...c, starred } : c)) }));
}

/** Gives a sealed contact a photo, sealed in its own file (lock/avatar-photos.ts), or none. */
export async function setSealedPhoto(place: Place, id: string, bytes: Uint8Array | null): Promise<void> {
  const ref = bytes ? await savePhoto(bytes) : null;
  let old: PhotoRef | null = null;
  try {
    await changePlace(place, (data) => {
      old = data.contacts.find((c) => c.id === id)?.photo ?? null;
      return { ...data, contacts: data.contacts.map((c) => (c.id === id ? { ...c, photo: ref } : c)) };
    });
  } catch (error) {
    if (ref) await deletePhoto(ref.id).catch(() => undefined);
    throw error;
  }
  const gone = old as PhotoRef | null;
  if (gone) await deletePhoto(gone.id).catch(() => undefined);
}

/** Makes a phone contact (by Android's lookup key) the Erevos contact `identity`, or no Erevos contact with ''. */
export async function linkPhoneContact(place: Place, lookup: string, identity: string): Promise<void> {
  await changePlace(place, (data) => ({
    ...data,
    links: [...data.links.filter((l) => l.lookup !== lookup), ...(identity ? [{ lookup, identity }] : [])].slice(-MAX_LINKS),
  }));
}

/**
 * What `place` keeps of the contact linked by hand to the Erevos contact `identity`: the numbers of
 * one kept only in Erevos, else the lookup key of the phone's linked to it ('' for none).
 */
export async function linkedContact(place: Place, identity: string): Promise<{ phones: Entry[]; lookup: string }> {
  const data = await loadPlace(place);
  const kept = data.contacts.find((c) => c.erevos === identity && c.phones.length > 0);
  if (kept) return { phones: kept.phones, lookup: '' };
  return { phones: [], lookup: data.links.find((l) => l.identity === identity)?.lookup ?? '' };
}

/** Makes a sealed contact the Erevos contact `identity`, or no Erevos contact with ''. */
export async function linkSealed(place: Place, id: string, identity: string): Promise<void> {
  await changePlace(place, (data) => ({ ...data, contacts: data.contacts.map((c) => (c.id === id ? { ...c, erevos: identity } : c)) }));
}

/**
 * Makes a contact the Erevos contact `identity` in `place`: one kept only in Erevos (`sealed`) in its
 * place; one of the phone's (its lookup key) in the space only, never from hidden chats, whose
 * contacts never touch the phone's. Any link it had to another Erevos contact goes. Whether it was
 * linked: a phone contact outside the space is not.
 */
export async function linkCard(place: Place, card: { phone: { lookup: string } | null; sealed: { id: string } | null }, identity: string): Promise<boolean> {
  if (card.sealed) {
    await linkSealed(place, card.sealed.id, identity);
    return true;
  }
  if (!card.phone || place.holder !== 'space') return false;
  await linkPhoneContact(place, card.phone.lookup, identity);
  return true;
}

/**
 * The names the contacts kept in Erevos give numbers, for the calls screen to show who calls
 * (in memory only): the open space's, and the open hidden chats' when they are. A number is
 * written as kept, without what people put between its digits (+306912345678); compare with
 * sameNumber (lib/sms-invite.ts). None while no space is open.
 */
export async function sealedNames(): Promise<Record<string, string>> {
  let space: Place;
  try {
    space = spacePlace();
  } catch {
    return {};
  }
  const hidden = openHiddenPlace();
  return { ...(await placeNames(space)), ...(hidden ? await placeNames(placeOf(hidden)) : {}) };
}

/** The names one place's sealed contacts give numbers, as sealedNames writes them. */
export async function placeNames(place: Place): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  const data = await loadPlace(place).catch(() => null);
  for (const c of data?.contacts ?? []) {
    const name = fieldsName(c);
    for (const p of c.phones) {
      const number = cleanNumber(p.value).replace(/[^\d+]/g, '');
      if (number) names[number] = name;
    }
  }
  return names;
}
