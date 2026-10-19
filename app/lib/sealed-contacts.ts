import { deletePhoto, savePhoto, type PhotoRef } from '../lock/avatar-photos';
import { loadContactsData, MAX_LINKS, MAX_SEALED, saveContactsData, type ContactsData, type SealedContact } from '../lock/contacts-data';
import { currentSpace } from '../lock/keys';
import { hiddenHolder, type Holder } from '../lock/sealed-file';
import { cleanFields, cleanNumber, fieldsName, type Fields } from './contacts';
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

/** Makes a sealed contact the Erevos contact `identity`, or no Erevos contact with ''. */
export async function linkSealed(place: Place, id: string, identity: string): Promise<void> {
  await changePlace(place, (data) => ({ ...data, contacts: data.contacts.map((c) => (c.id === id ? { ...c, erevos: identity } : c)) }));
}

/**
 * The names the contacts kept in Erevos give numbers, for the calls screen to show who calls
 * (in memory only): the open space's, and the open hidden chats' when they are. A number is
 * written as kept, without what people put between its digits (+306912345678); compare with
 * sameNumber (lib/sms-invite.ts). None while no space is open.
 */
export async function sealedNames(): Promise<Record<string, string>> {
  const places: Place[] = [];
  try {
    places.push(spacePlace());
  } catch {
    return {};
  }
  const hidden = openHiddenPlace();
  if (hidden) places.push(placeOf(hidden));
  const names: Record<string, string> = {};
  for (const place of places) {
    const data = await loadPlace(place).catch(() => null);
    for (const c of data?.contacts ?? []) {
      const name = fieldsName(c);
      for (const p of c.phones) {
        const number = cleanNumber(p.value).replace(/[^\d+]/g, '');
        if (number) names[number] = name;
      }
    }
  }
  return names;
}
