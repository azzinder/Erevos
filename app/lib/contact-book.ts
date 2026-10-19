import { fieldsName, keeperFirst, mergeFields, phoneFields, phoneSave, plain, type Fields } from './contacts';
import { lang, t } from './i18n';
import { phoneContacts, savePhoneContact, takeOverContacts, type PhoneContact, type PhoneGroup } from '../modules/erevos-contacts';
import type { SealedContact } from '../lock/contacts-data';
import { loadPlace, type Place } from './sealed-contacts';

// The contacts screen's book (app/contacts.tsx): the phone's contacts, from Android's contacts
// (modules/erevos-contacts), and those kept only in Erevos, sealed in the open space or hidden
// chats (lib/sealed-contacts.ts), as cards the screens show alike.

/** A contact as the screens show it. `key` is 'p' and the phone contact's id, or 's' and the sealed one's. */
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

/** Where a card opens: a phone contact by its id, a sealed one by its own, among the hidden chats' screens with `hidden`. */
export function cardHref(card: Card, hidden = false): `/contact-card?${string}` {
  if (card.sealed) return `/contact-card?sealed=${card.sealed.id}${hidden ? '&hidden=1' : ''}`;
  return `/contact-card?id=${card.phone?.id ?? 0}`;
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
