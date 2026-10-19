import { cleanFields, EMPTY_FIELDS, KINDS, MAX_ENTRIES, type Entry, type Fields, type Kind } from '../lib/contacts';
import { isPhotoRef, type PhotoRef } from './avatar-photos';
import { sealedFile, type Holder } from './sealed-file';

// What each space, and each space's hidden chats, keeps of the contacts screen (app/contacts.tsx),
// sealed like its chats (sealed-file.ts): the contacts kept only in Erevos, never in Android's
// contacts, with their photos sealed in files of their own (avatar-photos.ts); and which of the
// phone's contacts are the same person as an Erevos contact, so the two show as one card. A hidden
// place's contacts are in its own value, so they show only while it is open. The phone's
// contacts themselves stay in Android's contacts, where every app with the permission reads them.

export type { Holder };

/** A contact kept only in Erevos. `erevos`: the Erevos contact it is (identity, hex), or empty. */
export type SealedContact = Fields & {
  id: string;
  starred: boolean;
  photo: PhotoRef | null;
  erevos: string;
  /** When it was last changed, milliseconds. */
  at: number;
};

/** A phone contact (Android's lookup key, which stays the same as the phone syncs it) that is an Erevos contact. */
export type ContactLink = { lookup: string; identity: string };

export type ContactsData = { contacts: SealedContact[]; links: ContactLink[] };

export const EMPTY_CONTACTS: ContactsData = { contacts: [], links: [] };

export const FILE = 'erevos-contacts';
const BLOCK = 16 * 1024;
/** The most contacts kept only in Erevos, in each space and each hidden place, and the most links. */
export const MAX_SEALED = 2000;
export const MAX_LINKS = 2000;

const isText = (v: unknown): v is string => typeof v === 'string';
const isIdentity = (v: unknown): v is string => isText(v) && /^[0-9a-f]{64}$/.test(v);
const isId = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9_-]{8,32}$/.test(v);

function checkedEntries(v: unknown): Entry[] {
  return (Array.isArray(v) ? v : []).slice(0, MAX_ENTRIES).flatMap((item) => {
    const e = (item ?? {}) as Partial<Record<keyof Entry, unknown>>;
    if (!isText(e.value) || !KINDS.includes(e.kind as Kind)) return [];
    return [{ value: e.value, kind: e.kind as Kind, label: isText(e.label) ? e.label : '' }];
  });
}

function checkedContact(value: unknown): SealedContact | null {
  const v = (value ?? {}) as Partial<Record<keyof SealedContact, unknown>>;
  if (!isId(v.id)) return null;
  const text = (x: unknown) => (isText(x) ? x : '');
  const fields = cleanFields({
    ...EMPTY_FIELDS,
    given: text(v.given),
    family: text(v.family),
    company: text(v.company),
    title: text(v.title),
    phones: checkedEntries(v.phones),
    emails: checkedEntries(v.emails),
    addresses: checkedEntries(v.addresses),
    note: text(v.note),
    birthday: text(v.birthday),
  });
  return {
    ...fields,
    id: v.id,
    starred: v.starred === true,
    photo: isPhotoRef(v.photo) ? { id: v.photo.id, key: v.photo.key } : null,
    erevos: isIdentity(v.erevos) ? v.erevos : '',
    at: typeof v.at === 'number' && Number.isFinite(v.at) && v.at >= 0 ? v.at : 0,
  };
}

function checked(value: unknown): ContactsData {
  const v = (value ?? {}) as Partial<Record<keyof ContactsData, unknown>>;
  const contacts = (Array.isArray(v.contacts) ? v.contacts : []).map(checkedContact).filter((c): c is SealedContact => c !== null);
  const links = (Array.isArray(v.links) ? v.links : []).flatMap((item) => {
    const l = (item ?? {}) as Partial<Record<keyof ContactLink, unknown>>;
    return isText(l.lookup) && l.lookup.length > 0 && l.lookup.length <= 1000 && isIdentity(l.identity) ? [{ lookup: l.lookup, identity: l.identity }] : [];
  });
  return { contacts: contacts.slice(0, MAX_SEALED), links: links.slice(-MAX_LINKS) };
}

const store = sealedFile({ name: FILE, empty: EMPTY_CONTACTS, checked, block: BLOCK });

export const loadContactsData = store.load;
export const saveContactsData = store.save;
