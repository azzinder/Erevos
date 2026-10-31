// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Message } from '../lock/history';
import type { ContactAccount, ContactSave, PhoneContact, PhoneEntry, SimContact } from '../modules/erevos-contacts';
import type { LoggedCall } from '../modules/erevos-phone';
import type { SmsMessage } from '../modules/erevos-sms';
import { callKind, KIND_LABELS as CALL_LABELS } from './phone-log';
import { lang, mark, t } from './i18n';
import { sameNumber } from './sms-invite';

// The contacts Erevos shows (app/contacts.tsx): the phone's own, kept in Android's contacts
// (modules/erevos-contacts), and those kept only in Erevos, sealed in the space or in its hidden
// chats (lock/contacts-data.ts). Here is what both have alike, worked on without the phone: their
// fields, the name shown, the search over every field, finding the same person kept twice and
// merging the two, birthdays, the Erevos contact each is, and its calls and messages.

/** What a number, an email or an address is: as Android's contacts and vCards name them. */
export type Kind = 'mobile' | 'home' | 'work' | 'main' | 'fax' | 'pager' | 'other' | 'custom';

/**
 * A number, an email or an address with its kind; `label` is the owner's own name for a custom
 * one. A phone contact's also has the rows it is in, in Android's contacts (`ids`: the same
 * value kept twice is shown once), and Android's own type for it (`type`), kept as it was while
 * its kind does not change.
 */
export type Entry = { value: string; kind: Kind; label: string; ids?: number[]; type?: number };

/** Everything a contact says about someone. `birthday` as Android keeps it: 1990-05-04, or --05-04 without the year. */
export type Fields = {
  given: string;
  family: string;
  company: string;
  title: string;
  phones: Entry[];
  emails: Entry[];
  addresses: Entry[];
  note: string;
  birthday: string;
};

export const EMPTY_FIELDS: Fields = { given: '', family: '', company: '', title: '', phones: [], emails: [], addresses: [], note: '', birthday: '' };

/** The most of each, and the longest text of each, a contact keeps. */
export const MAX_ENTRIES = 20;
export const MAX_LINE = 200;
export const MAX_TEXT = 4000;

export const KINDS: Kind[] = ['mobile', 'home', 'work', 'main', 'fax', 'pager', 'other', 'custom'];
/** The kinds offered when a number, an email or an address is typed. */
export const CHOSEN_KINDS: Record<'phones' | 'emails' | 'addresses', Kind[]> = {
  phones: ['mobile', 'home', 'work', 'other'],
  emails: ['home', 'work', 'other'],
  addresses: ['home', 'work', 'other'],
};

const KIND_LABELS: Record<Kind, string> = {
  mobile: mark('Mobile'),
  home: mark('Home'),
  work: mark('Work'),
  main: mark('Main'),
  fax: mark('Fax'),
  pager: mark('Pager'),
  other: mark('Other'),
  custom: mark('Other'),
};

/** A kind as the app shows it, or the owner's own label. */
export function kindLabel(entry: Pick<Entry, 'kind' | 'label'>): string {
  return entry.kind === 'custom' && entry.label.trim() ? entry.label.trim() : t(KIND_LABELS[entry.kind]);
}

// Android's types (ContactsContract.CommonDataKinds): each field numbers its own.
const PHONE_TYPES: Record<number, Kind> = { 0: 'custom', 1: 'home', 2: 'mobile', 3: 'work', 4: 'fax', 5: 'fax', 6: 'pager', 7: 'other', 12: 'main', 17: 'mobile', 18: 'pager' };
const MAIL_TYPES: Record<number, Kind> = { 0: 'custom', 1: 'home', 2: 'work', 3: 'other', 4: 'mobile' };
const PLACE_TYPES: Record<number, Kind> = { 0: 'custom', 1: 'home', 2: 'work', 3: 'other' };
const TYPES = { phones: PHONE_TYPES, emails: MAIL_TYPES, addresses: PLACE_TYPES };
const OWN_TYPE: Record<'phones' | 'emails' | 'addresses', Partial<Record<Kind, number>>> = {
  phones: { custom: 0, home: 1, mobile: 2, work: 3, fax: 4, pager: 6, other: 7, main: 12 },
  emails: { custom: 0, home: 1, work: 2, other: 3, mobile: 4 },
  addresses: { custom: 0, home: 1, work: 2, other: 3 },
};

/** The kind of Android's type for a field; one it has no kind for is 'other'. */
export function kindOf(field: 'phones' | 'emails' | 'addresses', type: number): Kind {
  return TYPES[field][type] ?? 'other';
}

/** Android's type for an entry: the one it had while its kind is the same, else the kind's own. */
export function typeOf(field: 'phones' | 'emails' | 'addresses', entry: Pick<Entry, 'kind' | 'type'>): number {
  if (entry.type !== undefined && kindOf(field, entry.type) === entry.kind) return entry.type;
  return OWN_TYPE[field][entry.kind] ?? OWN_TYPE[field].other!;
}

/** One line of text as kept: no control or direction marks, spaces made one, at most `most` characters. */
export function cleanLine(text: string, most = MAX_LINE): string {
  const line = text.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2028\u2029\u2066-\u2069]/g, ' ');
  return [...line.replace(/\s+/g, ' ').trim()].slice(0, most).join('').trim();
}

/** Text of several lines as kept (an address, a note): each line clean, at most `most` characters. */
export function cleanText(text: string, most = MAX_TEXT): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((line) => cleanLine(line, most));
  return [...lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()].slice(0, most).join('').trim();
}

/** A number as kept: the digits, a + in front and the marks people write between them. */
export function cleanNumber(text: string): string {
  return cleanLine(text.replace(/[^\d+*#()\-./ ,;pwPW]/g, ''), 40);
}

/** Fields as kept: every text clean, empty entries left out, at most MAX_ENTRIES of each. */
export function cleanFields(f: Fields): Fields {
  const entries = (list: Entry[], clean: (value: string) => string) =>
    list
      .map((e) => ({ ...e, value: clean(e.value), label: e.kind === 'custom' ? cleanLine(e.label, 40) : '' }))
      .filter((e) => e.value.length > 0)
      .slice(0, MAX_ENTRIES);
  return {
    given: cleanLine(f.given),
    family: cleanLine(f.family),
    company: cleanLine(f.company),
    title: cleanLine(f.title),
    phones: entries(f.phones, cleanNumber),
    emails: entries(f.emails, (v) => cleanLine(v).replace(/\s/g, '')),
    addresses: entries(f.addresses, (v) => cleanText(v, 1000)),
    note: cleanText(f.note),
    // One Erevos cannot read (another app wrote it its own way) is kept as it is.
    birthday: parseBirthday(f.birthday) ? birthdayText(parseBirthday(f.birthday)!) : cleanLine(f.birthday, 40),
  };
}

/** A phone contact's fields, as Android's contacts keep them (modules/erevos-contacts). */
export function phoneFields(c: PhoneContact): Fields {
  const entries = (list: PhoneEntry[], field: 'phones' | 'emails' | 'addresses'): Entry[] =>
    list.map((e) => ({ value: e.value, kind: kindOf(field, e.type), label: e.label, ids: e.ids, type: e.type }));
  return {
    given: c.given,
    family: c.family,
    company: c.company,
    title: c.title,
    phones: entries(c.phones, 'phones'),
    emails: entries(c.emails, 'emails'),
    addresses: entries(c.addresses, 'addresses'),
    note: c.note?.value ?? '',
    birthday: c.birthday?.value ?? '',
  };
}

/** A SIM card's contact as fields: its name split as Android splits it, its number a mobile. */
export function simFields(s: SimContact): Fields & { name: string } {
  const fields = cleanFields({ ...EMPTY_FIELDS, ...splitName(s.name), phones: [{ value: s.number, kind: 'mobile', label: '' }] });
  return { ...fields, name: fieldsName(fields) };
}

/** What saving `fields` as the phone contact `c` (null: a new one, in `account`) asks of Android. */
export function phoneSave(fields: Fields, c: PhoneContact | null, account: ContactAccount | null, starred: boolean): ContactSave {
  const f = cleanFields(fields);
  const entries = (list: Entry[], field: 'phones' | 'emails' | 'addresses'): PhoneEntry[] =>
    list.map((e) => ({ ids: c ? (e.ids ?? []) : [], value: e.value, type: typeOf(field, e), label: e.kind === 'custom' ? e.label : '' }));
  return {
    id: c?.id ?? 0,
    account: c ? null : account,
    given: f.given,
    family: f.family,
    company: f.company,
    title: f.title,
    org: c?.org ?? [],
    phones: entries(f.phones, 'phones'),
    emails: entries(f.emails, 'emails'),
    addresses: entries(f.addresses, 'addresses'),
    note: { ids: c?.note?.ids ?? [], value: f.note },
    birthday: { ids: c?.birthday?.ids ?? [], value: f.birthday },
    starred,
  };
}

/** The name a contact shows: its given and family name, else its company, number or email. */
export function fieldsName(f: Fields): string {
  return [f.given, f.family].filter((part) => part.trim()).join(' ') || f.company || f.phones[0]?.value || f.emails[0]?.value || '';
}

/** A whole name split as Android splits it when only the name is given: the last word is the family name. */
export function splitName(name: string): { given: string; family: string } {
  const words = cleanLine(name).split(' ').filter(Boolean);
  if (words.length < 2) return { given: words[0] ?? '', family: '' };
  return { given: words.slice(0, -1).join(' '), family: words[words.length - 1] };
}

/** One or two letters for a contact without a photo. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w));
  return words
    .slice(0, 2)
    .map((w) => [...w.replace(/^[^\p{L}]+/u, '')][0] ?? '')
    .join('')
    .toUpperCase();
}

/** Text as searched: no case, no Greek accents, and σ for ς. */
export function plain(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ');
}

const digits = (text: string) => text.replace(/\D/g, '');

// One collator for each language, made once: a localeCompare that names a language makes a new one
// at every comparison on the phone (Hermes), which made sorting a few hundred contacts take seconds.
const collators = new Map<string, Intl.Collator | null>();

function collator(): Intl.Collator | null {
  const tag = lang() === 'el' ? 'el' : 'en';
  let made = collators.get(tag);
  if (made === undefined) {
    try {
      made = new Intl.Collator(tag, { sensitivity: 'base' });
    } catch {
      made = null;
    }
    collators.set(tag, made);
  }
  return made;
}

/** Names compared in the app's language's order: Greek's in Greek, the others' in English. */
export function compareNames(a: string, b: string): number {
  const by = collator();
  if (by) return by.compare(a, b);
  return plain(a) < plain(b) ? -1 : plain(a) > plain(b) ? 1 : 0;
}

/** Two lists by name as one, by name, the first's before the second's of the same name: the
 *  phone's many contacts, already in order, are not sorted again for the few others. */
export function mergeByName<T extends { name: string }>(a: T[], b: T[]): T[] {
  const merged: T[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) merged.push(compareNames(b[j].name, a[i].name) < 0 ? b[j++] : a[i++]);
  return merged.concat(a.slice(i), b.slice(j));
}

/** What a search looks in, of a contact (`findable`): made once for a list, so a search typed
 *  letter by letter only compares. */
export type Findable = { text: string; numbers: string[] };

/** A contact's fields as a search looks in them, with `extra` (its groups' names). */
export function findable(f: Fields & { name?: string }, extra: string[] = []): Findable {
  return {
    text: plain(
      [f.name ?? '', f.given, f.family, f.company, f.title, f.note, f.birthday, ...f.phones.map((p) => p.value), ...f.emails.map((e) => e.value), ...f.addresses.map((a) => a.value), ...extra].join('\n'),
    ),
    numbers: f.phones.map((p) => digits(p.value)).filter(Boolean),
  };
}

/** The words of a search, as `found` takes them. */
export function searchWords(query: string): string[] {
  return plain(query).split(/\s+/).filter(Boolean);
}

/** Whether every word is in what `findable` made of a contact, as `matches` says. */
export function found(f: Findable, words: string[]): boolean {
  return words.every((word) => {
    if (f.text.includes(word)) return true;
    const d = digits(word);
    if (d.length < 3 || d.length < word.replace(/[+\-()./]/g, '').length) return false;
    return f.numbers.some((n) => n.includes(d) || (d.length >= 7 && sameNumber(n, d)));
  });
}

/** Whether every word of `query` is in some field of the contact: its names, numbers, emails,
 *  addresses, note, company, its groups' names, or its birthday. A number matches whatever is
 *  written between its digits, and with or without its country code. */
export function matches(f: Fields & { name?: string }, query: string, extra: string[] = []): boolean {
  const words = searchWords(query);
  return words.length === 0 || found(findable(f, extra), words);
}

/** A number to call, found by the Phone's search: whose it is, and what kind of number. */
export type DialRow = { key: string; name: string; kind: string; number: string };

/**
 * The numbers of the contacts (`cards`, in their order) that every word of `query` finds, as
 * `matches` does, each number once, `most` at most; none for an empty search. `findables` keeps
 * what the search looks in, made once for each card.
 */
export function toDial(cards: (Fields & { key: string; name: string })[], query: string, findables = new Map<string, Findable>(), most = 50): DialRow[] {
  const words = searchWords(query);
  const rows: DialRow[] = [];
  if (words.length === 0) return rows;
  for (const card of cards) {
    if (card.phones.length === 0) continue;
    let f = findables.get(card.key);
    if (!f) findables.set(card.key, (f = findable(card)));
    if (!found(f, words)) continue;
    const seen: string[] = [];
    for (const phone of card.phones) {
      if (!digits(phone.value) || seen.some((n) => sameNumber(n, phone.value))) continue;
      seen.push(phone.value);
      rows.push({ key: `${card.key}:${seen.length}`, name: card.name, kind: kindLabel(phone), number: phone.value });
      if (rows.length >= most) return rows;
    }
  }
  return rows;
}

/** A name as compared: its words in any order, without case or accents. */
function nameKey(name: string): string {
  return plain(name).split(/\s+/).filter((w) => /\p{L}/u.test(w)).sort().join(' ');
}

// Whether two contacts of the same name are one: alike in a number or an email, or neither has any.
function sameReach(a: Fields, b: Fields): boolean {
  if (a.phones.length + a.emails.length === 0 && b.phones.length + b.emails.length === 0) return true;
  return (
    a.phones.some((p) => b.phones.some((q) => sameNumber(p.value, q.value))) ||
    a.emails.some((e) => b.emails.some((f) => e.value.trim().toLowerCase() === f.value.trim().toLowerCase()))
  );
}

/**
 * The contacts of `incoming` (a vCard file's, the SIM's) not kept already, in `kept` or earlier
 * in `incoming` itself: one is kept when a contact has its name and a number or email alike, or
 * neither has any.
 */
export function notKept<T extends Fields & { name: string }>(incoming: T[], kept: (Fields & { name: string })[]): T[] {
  const known = new Map<string, Fields[]>();
  const keep = (c: Fields & { name: string }) => {
    const key = nameKey(c.name);
    known.set(key, [...(known.get(key) ?? []), c]);
  };
  kept.forEach(keep);
  const out: T[] = [];
  for (const c of incoming) {
    if ((known.get(nameKey(c.name)) ?? []).some((k) => sameReach(k, c))) continue;
    out.push(c);
    keep(c);
  }
  return out;
}

/** A contact, for finding the same person kept twice: its key, and its fields. */
export type Comparable = { key: string; name: string; fields: Fields };

/** Why contacts look like the same person. */
export type Same = 'name' | 'number' | 'email';

/**
 * The contacts that look like the same person, in sets of two or more: the same name (its words
 * in any order, without case or accents), the same number, or the same email. Each set says why
 * its first two met.
 */
export function findDuplicates(contacts: Comparable[]): { keys: string[]; why: Same }[] {
  const parent = contacts.map((_, i) => i);
  const why = new Map<number, Same>();
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const join = (a: number, b: number, reason: Same) => {
    const ra = root(a);
    const rb = root(b);
    if (ra === rb) return;
    const keep = Math.min(ra, rb);
    const reasons = [why.get(ra), why.get(rb)].filter((r): r is Same => r !== undefined);
    parent[Math.max(ra, rb)] = keep;
    why.set(keep, reasons[0] ?? reason);
  };
  const seen = new Map<string, number>();
  const meet = (key: string, i: number, reason: Same) => {
    const before = seen.get(key);
    if (before === undefined) seen.set(key, i);
    else join(before, i, reason);
  };
  contacts.forEach((c, i) => {
    const name = nameKey(c.name);
    if (name) meet(`n:${name}`, i, 'name');
    for (const p of c.fields.phones) {
      const d = digits(p.value);
      if (d.length >= 7) meet(`p:${d.slice(-10)}`, i, 'number');
    }
    for (const e of c.fields.emails) {
      const mail = e.value.trim().toLowerCase();
      if (mail.includes('@')) meet(`e:${mail}`, i, 'email');
    }
  });
  const sets = new Map<number, string[]>();
  contacts.forEach((c, i) => sets.set(root(i), [...(sets.get(root(i)) ?? []), c.key]));
  return [...sets.entries()].filter(([, keys]) => keys.length > 1).map(([r, keys]) => ({ keys, why: why.get(r) ?? 'name' }));
}

/** How much a contact holds, to keep the fullest when merging. */
export function fullness(f: Fields): number {
  return [f.given, f.family, f.company, f.title, f.note, f.birthday].filter(Boolean).length + f.phones.length + f.emails.length + f.addresses.length;
}

/** Contacts to merge, the one kept first: the fullest, or the first of the fullest. */
export function keeperFirst<T extends Fields>(list: T[]): T[] {
  let best = 0;
  list.forEach((f, i) => {
    if (fullness(f) > fullness(list[best])) best = i;
  });
  return [list[best], ...list.filter((_, i) => i !== best)].filter((f) => f !== undefined);
}

/**
 * The fields of contacts merged into the first: its names, company and birthday, else the next
 * one's; every number, email and address once; their notes one after another. What came from the
 * others has no rows of its own (`ids`), so it is added to the first.
 */
export function mergeFields(list: Fields[]): Fields {
  const [first, ...rest] = list;
  if (!first) return { ...EMPTY_FIELDS };
  const pick = (get: (f: Fields) => string) => list.map(get).find((v) => v.trim()) ?? '';
  const union = (get: (f: Fields) => Entry[], same: (a: string, b: string) => boolean) => {
    const out = [...get(first)];
    for (const f of rest) for (const e of get(f)) if (!out.some((o) => same(o.value, e.value))) out.push({ value: e.value, kind: e.kind, label: e.label, ...(e.type !== undefined ? { type: e.type } : {}) });
    return out.slice(0, MAX_ENTRIES);
  };
  const notes: string[] = [];
  for (const f of list) if (f.note.trim() && !notes.includes(f.note.trim())) notes.push(f.note.trim());
  const birthdays = list.map((f) => parseBirthday(f.birthday)).filter((b): b is Birthday => b !== null);
  const birthday = birthdays.find((b) => b.year !== null) ?? birthdays[0];
  return {
    given: pick((f) => f.given),
    family: pick((f) => f.family),
    company: pick((f) => f.company),
    title: pick((f) => f.title),
    phones: union((f) => f.phones, (a, b) => digits(a) === digits(b) || sameNumber(a, b)),
    emails: union((f) => f.emails, (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()),
    addresses: union((f) => f.addresses, (a, b) => plain(a).replace(/\W/g, '') === plain(b).replace(/\W/g, '')),
    note: [...notes.join('\n\n')].slice(0, MAX_TEXT).join(''),
    birthday: birthday ? birthdayText(birthday) : '',
  };
}

/** A birthday: its month (1 to 12) and day, and its year if known. */
export type Birthday = { year: number | null; month: number; day: number };

const daysIn = (month: number, year: number) => new Date(year, month, 0).getDate();
const leap = (year: number) => daysIn(2, year) === 29;

/** A birthday as Android, a vCard or a person writes it: 1990-05-04, 19900504, --05-04, --0504,
 *  with a time after it or not; also 4/5/1990 and 4/5, the day first. Null when it is none. */
export function parseBirthday(text: string): Birthday | null {
  const s = text.trim();
  let year: number | null = null;
  let month: number;
  let day: number;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:$|[T\s])/))) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/))) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = s.match(/^--(\d{2})-?(\d{2})$/))) [month, day] = [Number(m[1]), Number(m[2])];
  else if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?$/))) [day, month, year] = [Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null];
  else return null;
  if (year !== null && (year < 1800 || year > 2200)) return null;
  if (month < 1 || month > 12 || day < 1 || day > daysIn(month, year ?? 2000)) return null;
  return { year, month, day };
}

const two = (n: number) => String(n).padStart(2, '0');

/** A birthday as Android keeps it: 1990-05-04, or --05-04 without the year. */
export function birthdayText(b: Birthday): string {
  return `${b.year !== null ? String(b.year).padStart(4, '0') : '-'}-${two(b.month)}-${two(b.day)}`;
}

/** The day a birthday falls on in `year`: on 28 February when it is 29 February and the year has none. */
function dayIn(b: Birthday, year: number): Date {
  const day = b.month === 2 && b.day === 29 && !leap(year) ? 28 : b.day;
  return new Date(year, b.month - 1, day);
}

/** Days from `now`'s day to the next birthday: 0 on the day. */
export function daysToBirthday(b: Birthday, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = dayIn(b, today.getFullYear());
  if (next < today) next = dayIn(b, today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** How old they turn on their next birthday (or today's), when the year is known. */
export function turns(b: Birthday, now: Date): number | null {
  if (b.year === null) return null;
  const next = new Date(now.getTime() + daysToBirthday(b, now) * 86_400_000);
  return next.getFullYear() - b.year;
}

/** A birthday as the app shows it: 4 May 1990, or 4 May, in the app's language. */
export function birthdayLabel(b: Birthday): string {
  const date = new Date(b.year ?? 2000, b.month - 1, b.day);
  const options: Intl.DateTimeFormatOptions = b.year !== null ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' };
  try {
    return date.toLocaleDateString(lang() === 'el' ? 'el-GR' : 'en-GB', options);
  } catch {
    return b.year !== null ? `${b.day}/${b.month}/${b.year}` : `${b.day}/${b.month}`;
  }
}

/** When the next birthday is, said: today, tomorrow, or in some days, with the age they turn. */
export function birthdayComing(b: Birthday, now: Date): string {
  const days = daysToBirthday(b, now);
  const age = turns(b, now);
  if (days === 0) return age !== null ? t('Birthday today, turns {age}', { age }) : t('Birthday today');
  if (days === 1) return age !== null ? t('Birthday tomorrow, turns {age}', { age }) : t('Birthday tomorrow');
  return age !== null ? t('Birthday in {n} days, turns {age}', { n: days, age }) : t('Birthday in {n} days', { n: days });
}

/**
 * The fields a new contact starts with, as the contact screen is handed them (`fill`): another
 * app's (Android's insert intent, as modules/erevos-contacts hands it over, with Android's types
 * and the whole name), or a QR code's (fillText). Checked: anything of the wrong shape is left out.
 */
export function askedFields(json: string): Fields | null {
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const text = (x: unknown) => (typeof x === 'string' ? x : '');
  const entries = (x: unknown, field: 'phones' | 'emails' | 'addresses'): Entry[] =>
    (Array.isArray(x) ? x : []).slice(0, MAX_ENTRIES).map((item) => {
      const e = (item ?? {}) as Record<string, unknown>;
      const type = typeof e.type === 'number' && Number.isInteger(e.type) ? e.type : -1;
      const kind = KINDS.find((k) => k === e.kind) ?? (type >= 0 ? kindOf(field, type) : field === 'phones' ? 'mobile' : 'home');
      return { value: text(e.value), kind, label: text(e.label) };
    });
  const name = text(v.given) || text(v.family) ? { given: text(v.given), family: text(v.family) } : splitName(text(v.name));
  const fields = cleanFields({
    ...EMPTY_FIELDS,
    given: name.given,
    family: name.family,
    company: text(v.company),
    title: text(v.title),
    phones: entries(v.phones, 'phones'),
    emails: entries(v.emails, 'emails'),
    addresses: entries(v.addresses, 'addresses'),
    note: text(v.note),
    birthday: parseBirthday(text(v.birthday)) ? text(v.birthday) : '',
  });
  return fieldsName(fields) ? fields : null;
}

/** Fields as the contact screen's `fill` (askedFields reads them). */
export function fillText(f: Fields): string {
  const entries = (list: Entry[]) => list.map(({ value, kind, label }) => ({ value, kind, label }));
  return JSON.stringify({
    given: f.given,
    family: f.family,
    company: f.company,
    title: f.title,
    phones: entries(f.phones),
    emails: entries(f.emails),
    addresses: entries(f.addresses),
    note: f.note,
    birthday: f.birthday,
  });
}

/** The form of a new contact with this number in it (app/contact-edit.tsx), for one that is no contact yet. */
export function newContactHref(number: string): `/contact-edit?fill=${string}` {
  return `/contact-edit?fill=${encodeURIComponent(fillText({ ...EMPTY_FIELDS, phones: [{ value: number, kind: 'mobile', label: '' }] }))}`;
}

/** An Erevos contact as the contacts screens show it: its identity (hex), its name, and the number linked to it in Erevos ('' for none). */
export type ErevosPerson = { identity: string; name: string; phone: string };

/** The number to call from a contact's numbers: a mobile one first, '' for none. */
export function callNumber(phones: Entry[]): string {
  return (phones.find((p) => p.kind === 'mobile') ?? phones[0])?.value ?? '';
}

/**
 * The Erevos contact a contact is: the one it was linked to by hand (`linked`), while Erevos still
 * has it, else the one whose number in Erevos is one of its numbers. '' for none.
 */
export function erevosFor(linked: string, phones: Entry[], people: ErevosPerson[]): string {
  if (linked && people.some((p) => p.identity === linked)) return linked;
  return people.find((p) => p.phone && phones.some((e) => sameNumber(e.value, p.phone)))?.identity ?? '';
}

/**
 * The contacts an Erevos contact can be connected to (components/connect-picker.tsx): the phone's
 * and those kept only in Erevos, or in hidden chats (`hidden`) only theirs, never the phone's.
 */
export function linkChoices<T extends Fields & { name: string }>(phone: T[], sealed: T[], hidden: boolean): T[] {
  return [...(hidden ? [] : phone), ...sealed];
}

/** Whether choosing a contact moves its link: it is another Erevos contact than `identity` now ('' while that is not known yet). */
export function linkedElsewhere(card: { erevos: string }, identity: string): boolean {
  return card.erevos !== '' && card.erevos !== identity;
}

/** A line of a contact's history: a call in the phone's call log, an SMS, or a message in Erevos. */
export type HistoryLine = { key: string; at: number; kind: 'call' | 'sms' | 'erevos'; mine: boolean; missed: boolean; text: string; number: string };

/** What a call in the phone's call history (lib/phone-log.ts) was: which way, and how long it lasted (0:42, 1:02:09). */
export function callText(call: Pick<LoggedCall, 'type' | 'duration'>): string {
  const s = Math.max(0, Math.floor(call.duration));
  const time = s >= 3600 ? `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}` : `${Math.floor(s / 60)}:${two(s % 60)}`;
  const kind = callKind(call.type);
  if (kind === 'incoming' && s > 0) return t('Incoming call, {time}', { time });
  if (kind === 'outgoing') return s > 0 ? t('Outgoing call, {time}', { time }) : t('Outgoing call, no answer');
  return t(CALL_LABELS[kind]);
}

/** A contact's calls among the phone's call history: those with one of its numbers, the newest first. */
export function callsWith(calls: LoggedCall[], numbers: string[]): LoggedCall[] {
  return calls.filter((c) => numbers.some((n) => sameNumber(n, c.number))).sort((a, b) => b.at - a.at);
}

/** What an Erevos message says, or what it holds. */
function erevosText(m: Message): string {
  if (m.voice) return t('Voice message');
  if (m.file) return m.file.mime.startsWith('image/') ? t('Photo') : m.file.name || t('File');
  return m.text;
}

/**
 * A contact's calls, SMS (by number) and Erevos messages, as one history: the latest `most`,
 * the newest first. Disappearing messages whose time has come are left out, and an SMS kept under
 * two of its numbers shows once.
 */
export function historyLines(calls: LoggedCall[], sms: { number: string; messages: SmsMessage[] }[], erevos: Message[], now: number, most = 30): HistoryLine[] {
  const lines: HistoryLine[] = calls.map((c) => {
    const kind = callKind(c.type);
    return { key: `c${c.id}`, at: c.at, kind: 'call', mine: kind === 'outgoing', missed: kind === 'missed' || kind === 'declined', text: callText(c), number: c.number };
  });
  const seen = new Set<number>();
  for (const { number, messages } of sms) {
    for (const m of messages) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      lines.push({ key: `s${m.id}`, at: m.at, kind: 'sms', mine: m.mine, missed: false, text: m.text || (m.pictures?.length ? t('Photo') : ''), number });
    }
  }
  for (const m of erevos) {
    if (m.until && m.until <= now) continue;
    lines.push({ key: `e${m.tag}${m.at}`, at: m.at, kind: 'erevos', mine: m.mine, missed: false, text: erevosText(m), number: '' });
  }
  return lines.sort((a, b) => b.at - a.at).slice(0, most);
}

/** When a line of history was: its time today, the day and month this year, else the date too. */
export function whenText(at: number, now: number): string {
  const d = new Date(at);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return `${two(d.getHours())}:${two(d.getMinutes())}`;
  if (d.getFullYear() === today.getFullYear()) return `${d.getDate()}/${d.getMonth() + 1}`;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
