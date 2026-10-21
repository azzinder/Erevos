import { PermissionsAndroid, Platform } from 'react-native';

import { EMPTY_FIELDS, erevosFor, fieldsName, keeperFirst, mergeFields, phoneFields, phoneSave, plain, type ErevosPerson, type Fields } from './contacts';
import type { OpenHiddenPlace } from './hidden-contacts';
import { lang, t } from './i18n';
import { spaceChats } from './space-chats';
import { phoneContacts, savePhoneContact, takeOverContacts, type PhoneContact, type PhoneGroup } from '../modules/erevos-contacts';
import { contactCards } from '../modules/erevos-sms';
import type { ContactLink, SealedContact } from '../lock/contacts-data';
import { giveLinkedName } from './linked-name';
import { sameNumber } from './sms-invite';
import { loadPlace, placeNames, placeOf, spacePlace, type Place } from './sealed-contacts';

// The contacts screen's book (app/contacts.tsx): the phone's contacts, from Android's contacts
// (modules/erevos-contacts), those kept only in Erevos, sealed in the open space or hidden chats
// (lib/sealed-contacts.ts), and the chats' Erevos contacts, as cards the screens show alike. A
// contact that is an Erevos contact shows as one card with it.

// A number as names are found by it: its last ten digits, or all of them when fewer (sameNumber).
const numberKey = (number: string) => {
  const digits = number.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

/** The names the open space's contacts kept only in Erevos give numbers, however a number is
 *  written: for the SMS, which show them without asking Android, as they are the space's own. */
export async function sealedNamer(): Promise<(number: string) => string> {
  const names = await placeNames(spacePlace()).catch((): Record<string, string> => ({}));
  const byKey = new Map<string, string>();
  for (const [number, name] of Object.entries(names)) {
    const key = numberKey(number);
    if (key && name && !byKey.has(key)) byKey.set(key, name);
  }
  return (number) => byKey.get(numberKey(number)) ?? '';
}

/** A contact as the screens show it. `key` is 'p' and the phone contact's id, 's' and the sealed one's, or 'e' and the Erevos contact's identity. */
export type Card = Fields & {
  key: string;
  name: string;
  starred: boolean;
  /** The phone's contact, as Android gave it. */
  phone: PhoneContact | null;
  /** The contact kept only in Erevos. */
  sealed: SealedContact | null;
  /** The Erevos contact it is, by identity (hex), or ''. */
  erevos: string;
  /** Its groups in Android's contacts, by id. */
  groups: number[];
};

export function phoneCard(c: PhoneContact): Card {
  const fields = phoneFields(c);
  return { ...fields, key: `p${c.id}`, name: c.name || fieldsName(fields), starred: c.starred, phone: c, sealed: null, erevos: '', groups: c.groups };
}

/** Only what a contact says, of a sealed one. */
export function sealedFields(s: SealedContact): Fields {
  const { given, family, company, title, phones, emails, addresses, note, birthday } = s;
  return { given, family, company, title, phones, emails, addresses, note, birthday };
}

export function sealedCard(s: SealedContact): Card {
  return { ...sealedFields(s), key: `s${s.id}`, name: fieldsName(s), starred: s.starred, phone: null, sealed: s, erevos: s.erevos, groups: [] };
}

/** An Erevos contact that no contact is, as a card of its own. */
export function erevosCard(p: ErevosPerson): Card {
  const phones = p.phone ? [{ value: p.phone, kind: 'mobile' as const, label: '' }] : [];
  const name = p.name || t('contact {id}', { id: p.identity.slice(0, 8) });
  return { ...EMPTY_FIELDS, given: p.name, phones, key: `e${p.identity}`, name, starred: false, phone: null, sealed: null, erevos: p.identity, groups: [] };
}

/** Where a card opens: a phone contact by its id, a sealed one by its own, an Erevos one by its identity; among the hidden chats' screens with `hidden`. */
export function cardHref(card: Card, hidden = false): `/contact-card?${string}` {
  const among = hidden ? '&hidden=1' : '';
  if (card.sealed) return `/contact-card?sealed=${card.sealed.id}${among}`;
  if (!card.phone && card.erevos) return `/contact-card?erevos=${card.erevos}${among}`;
  return `/contact-card?id=${card.phone?.id ?? 0}`;
}

/** The Erevos contacts of the open hidden chats, or of the open space; none when its chats cannot open. */
export async function erevosPeople(hidden: OpenHiddenPlace | null): Promise<ErevosPerson[]> {
  if (hidden) return hidden.erevos();
  try {
    const { e2e } = await spaceChats();
    const phones = e2e.phones();
    return e2e
      .contacts()
      .filter((c) => !c.request)
      .map((c) => ({ identity: c.identity, name: c.name, phone: phones.find((p) => p.identity === c.identity)?.phone ?? '' }));
  } catch {
    return [];
  }
}

/** Whose contacts: the space's, the open hidden chats' (lib/hidden-contacts.ts), or none (null) while the hidden chats meant are closed. */
export type Among = 'space' | OpenHiddenPlace | null;

/** Where the contacts of `among` are kept, or null: none, or no space open. */
export function amongPlace(among: Among): Place | null {
  if (!among) return null;
  if (among !== 'space') return placeOf(among);
  try {
    return spacePlace();
  } catch {
    return null;
  }
}

/**
 * Gives the Erevos contact `identity` the name of `contact`, linked to it, while it has none of its
 * own (lib/linked-name.ts): in the space's chats, or in the open hidden chats' for theirs, and in
 * none while those are closed. Returns the name given, or ''.
 */
export async function nameErevos(among: Among, identity: string, contact: { name: string }): Promise<string> {
  if (!among) return '';
  if (among !== 'space') return among.takeName(identity, contact.name);
  return giveLinkedName((await spaceChats()).e2e, identity, contact);
}

/** Asks Android once to let Erevos read and change the phone's contacts, as one permission. Whether it may read them now. */
export async function allowPhoneContacts(): Promise<boolean> {
  const answers = await PermissionsAndroid.requestMultiple(['android.permission.READ_CONTACTS', 'android.permission.WRITE_CONTACTS']).catch(() => null);
  return answers?.['android.permission.READ_CONTACTS'] === PermissionsAndroid.RESULTS.GRANTED;
}

/** The Erevos contact a card is: linked by hand (`links`, for the phone's), else by a number. */
export function cardErevos(card: Card, links: ContactLink[], people: ErevosPerson[]): string {
  const linked = card.sealed ? card.sealed.erevos : (links.find((l) => l.lookup === card.phone?.lookup)?.identity ?? '');
  return card.phone || card.sealed ? erevosFor(linked, card.phones, people) : card.erevos;
}

/** Cards with the Erevos contact each is, then a card for each Erevos contact none is. */
export function withErevos(cards: Card[], links: ContactLink[], people: ErevosPerson[]): Card[] {
  const linked = cards.map((c) => ({ ...c, erevos: cardErevos(c, links, people) }));
  const taken = new Set(linked.map((c) => c.erevos));
  return [...linked, ...people.filter((p) => !taken.has(p.identity)).map(erevosCard)];
}

/** A place's sealed contacts as cards. */
export async function sealedCards(place: Place): Promise<Card[]> {
  return (await loadPlace(place)).contacts.map(sealedCard);
}

/** Names compared in the app's language's order. */
function compare(a: string, b: string): number {
  try {
    return a.localeCompare(b, lang() === 'el' ? 'el' : 'en', { sensitivity: 'base' });
  } catch {
    return plain(a) < plain(b) ? -1 : plain(a) > plain(b) ? 1 : 0;
  }
}

/** Cards by name, in the app's language's order. */
export function byName(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => compare(a.name, b.name));
}

/** Groups by their names. */
export function groupsByTitle(groups: PhoneGroup[]): PhoneGroup[] {
  return [...groups].sort((a, b) => compare(a.title, b.title));
}

/** The names of a card's groups, for the search. */
export function groupTitles(card: Card, groups: PhoneGroup[]): string[] {
  return groups.filter((g) => card.groups.includes(g.id)).map((g) => g.title);
}

/** The phone's contacts as cards, by name. None until Erevos may read them. */
export async function phoneCards(): Promise<Card[]> {
  return byName((await phoneContacts()).map(phoneCard));
}

/**
 * Merges phone contacts into the fullest of them: it gets every number, email and address of the
 * others, and their note, then their photo and ringtone when it has none, their star and their
 * groups; the others are deleted. Returns the one kept.
 */
export async function mergePhoneCards(cards: Card[]): Promise<Card> {
  const [keeper, ...others] = keeperFirst(cards.filter((c) => c.phone));
  if (!keeper?.phone) throw new Error(t('There is nothing to merge.'));
  const merged = mergeFields([keeper, ...others]);
  await savePhoneContact(phoneSave(merged, keeper.phone, null, keeper.starred));
  await takeOverContacts(
    keeper.phone.id,
    others.map((o) => o.phone!.id),
  );
  return keeper;
}

/**
 * Whether a number is one of the contacts, the phone's or those the space keeps only in Erevos, so
 * that one that is not can be added; null while Erevos may not read the phone's contacts.
 */
export async function isContactNumber(number: string): Promise<boolean | null> {
  if (Platform.OS !== 'android' || !(await PermissionsAndroid.check('android.permission.READ_CONTACTS').catch(() => false))) return null;
  const [cards, sealed] = await Promise.all([contactCards([number]).catch(() => null), placeNames(spacePlace()).catch(() => null)]);
  if (!cards || !sealed) return null;
  return Object.keys(cards).some((n) => sameNumber(n, number)) || Object.keys(sealed).some((n) => sameNumber(n, number));
}
