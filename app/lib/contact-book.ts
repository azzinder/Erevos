import { fieldsName, phoneFields, plain, type Fields } from './contacts';
import { lang } from './i18n';
import { phoneContacts, type PhoneContact } from '../modules/erevos-contacts';

// The contacts screen's book (app/contacts.tsx): the phone's contacts, from Android's contacts
// (modules/erevos-contacts), as cards the screens show alike.

/** A contact as the screens show it. `key` is 'p' and the phone contact's id. */
export type Card = Fields & {
  key: string;
  name: string;
  starred: boolean;
  /** The phone's contact, as Android gave it. */
  phone: PhoneContact | null;
  /** Its groups in Android's contacts, by id. */
  groups: number[];
};

export function phoneCard(c: PhoneContact): Card {
  const fields = phoneFields(c);
  return { ...fields, key: `p${c.id}`, name: c.name || fieldsName(fields), starred: c.starred, phone: c, groups: c.groups };
}

/** Cards by name, in the app's language's order. */
export function byName(cards: Card[]): Card[] {
  const order = lang() === 'el' ? 'el' : 'en';
  return [...cards].sort((a, b) => {
    try {
      return a.name.localeCompare(b.name, order, { sensitivity: 'base' });
    } catch {
      return plain(a.name) < plain(b.name) ? -1 : plain(a.name) > plain(b.name) ? 1 : 0;
    }
  });
}

/** The phone's contacts as cards, by name. None until Erevos may read them. */
export async function phoneCards(): Promise<Card[]> {
  return byName((await phoneContacts()).map(phoneCard));
}
