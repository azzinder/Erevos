// The contacts screens' logic (lib/contacts.ts): fields as kept, the search over every field,
// birthdays, finding the same person kept twice and merging them, and what is asked of Android.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  askedFields,
  birthdayComing,
  birthdayText,
  cleanFields,
  daysToBirthday,
  EMPTY_FIELDS,
  fieldsName,
  findDuplicates,
  initials,
  kindOf,
  matches,
  mergeFields,
  parseBirthday,
  phoneFields,
  phoneSave,
  splitName,
  turns,
  typeOf,
  type Fields,
} from '../lib/contacts';
import { setLang } from '../lib/i18n';
import type { PhoneContact } from '../modules/erevos-contacts';

const maria: Fields = {
  ...EMPTY_FIELDS,
  given: 'Μαρία',
  family: 'Παπαδοπούλου',
  company: 'Λιμάνι Πειραιά',
  phones: [{ value: '+30 691 234 5678', kind: 'mobile', label: '' }],
  emails: [{ value: 'maria@example.org', kind: 'work', label: '' }],
  addresses: [{ value: 'Ακτή Μιαούλη 10\n185 38 Πειραιάς', kind: 'home', label: '' }],
  note: 'Συνάντηση την Τρίτη',
  birthday: '1990-05-04',
};

test('the search finds every field, without case or accents, and numbers however they are written', () => {
  const card = { ...maria, name: 'Μαρία Παπαδοπούλου' };
  assert.ok(matches(card, 'μαρια'));
  assert.ok(matches(card, 'ΠΑΠΑΔΟΠΟΥΛΟΥ'));
  assert.ok(matches(card, 'μαρ παπ'));
  assert.ok(!matches(card, 'μαρία γιώργος'));
  assert.ok(matches(card, 'πειραιας'));
  assert.ok(matches(card, 'λιμανι'));
  assert.ok(matches(card, 'example.org'));
  assert.ok(matches(card, 'τριτη'));
  assert.ok(matches(card, 'Ακτή Μιαούλη'));
  // The digits whatever stands between them, and the number with or without its country code.
  assert.ok(matches(card, '6912345'));
  assert.ok(matches(card, '691-234'));
  assert.ok(matches(card, '6912345678'));
  assert.ok(matches(card, '00306912345678'));
  assert.ok(!matches(card, '6999'));
  // A group's name, given beside the fields.
  assert.ok(matches(card, 'οικογενεια', ['Οικογένεια']));
  assert.ok(matches(card, '   '));
  // A final sigma is a sigma.
  assert.ok(matches({ ...EMPTY_FIELDS, given: 'Νίκος' }, 'νικοσ'));
});

test('fields are kept clean: one line each, no direction marks, empty entries left out', () => {
  const clean = cleanFields({
    ...EMPTY_FIELDS,
    given: '  Νίκος \u202e ',
    phones: [
      { value: ' +30 (210) 123-4567 ', kind: 'home', label: 'ignored' },
      { value: '   ', kind: 'mobile', label: '' },
    ],
    emails: [{ value: ' a @b.org', kind: 'custom', label: 'Σχολή' }],
    note: 'one\r\n\r\n\r\n\ntwo',
    birthday: '19900504',
  });
  assert.equal(clean.given, 'Νίκος');
  assert.deepEqual(clean.phones, [{ value: '+30 (210) 123-4567', kind: 'home', label: '' }]);
  assert.deepEqual(clean.emails, [{ value: 'a@b.org', kind: 'custom', label: 'Σχολή' }]);
  assert.equal(clean.note, 'one\n\ntwo');
  assert.equal(clean.birthday, '1990-05-04');
  // A birthday another app wrote its own way stays as it is.
  assert.equal(cleanFields({ ...EMPTY_FIELDS, birthday: 'May 4' }).birthday, 'May 4');
});

test('names: the one shown, split as Android splits them, and initials', () => {
  assert.equal(fieldsName(maria), 'Μαρία Παπαδοπούλου');
  assert.equal(fieldsName({ ...EMPTY_FIELDS, company: 'ΔΕΗ' }), 'ΔΕΗ');
  assert.equal(fieldsName({ ...EMPTY_FIELDS, phones: [{ value: '112', kind: 'other', label: '' }] }), '112');
  assert.deepEqual(splitName('Μαρία Ελένη Παπαδοπούλου'), { given: 'Μαρία Ελένη', family: 'Παπαδοπούλου' });
  assert.deepEqual(splitName(' Νίκος '), { given: 'Νίκος', family: '' });
  assert.equal(initials('Μαρία Παπαδοπούλου'), 'ΜΠ');
  assert.equal(initials('(Dr) ana'), 'DA');
  assert.equal(initials('+30 210'), '');
});

test("Android's types become kinds and back, an unknown one kept while its kind stays", () => {
  assert.equal(kindOf('phones', 2), 'mobile');
  assert.equal(kindOf('emails', 2), 'work');
  assert.equal(kindOf('phones', 99), 'other');
  assert.equal(typeOf('phones', { kind: 'mobile' }), 2);
  assert.equal(typeOf('emails', { kind: 'mobile' }), 4);
  assert.equal(typeOf('addresses', { kind: 'pager' }), 3);
  // Work mobile (17) stays work mobile until its kind is changed.
  assert.equal(typeOf('phones', { kind: 'mobile', type: 17 }), 17);
  assert.equal(typeOf('phones', { kind: 'home', type: 17 }), 1);
});

test('birthdays: read however they are written, and the days to the next one', () => {
  assert.deepEqual(parseBirthday('1990-05-04'), { year: 1990, month: 5, day: 4 });
  assert.deepEqual(parseBirthday('19900504'), { year: 1990, month: 5, day: 4 });
  assert.deepEqual(parseBirthday('1990-05-04T00:00:00.000Z'), { year: 1990, month: 5, day: 4 });
  assert.deepEqual(parseBirthday('--05-04'), { year: null, month: 5, day: 4 });
  assert.deepEqual(parseBirthday('--0504'), { year: null, month: 5, day: 4 });
  assert.deepEqual(parseBirthday('4/5/1990'), { year: 1990, month: 5, day: 4 });
  assert.deepEqual(parseBirthday('4.5'), { year: null, month: 5, day: 4 });
  assert.equal(parseBirthday('1990-02-30'), null);
  assert.equal(parseBirthday('31/4'), null);
  assert.equal(parseBirthday('May 4'), null);
  assert.deepEqual(parseBirthday('--02-29'), { year: null, month: 2, day: 29 });
  assert.equal(birthdayText({ year: null, month: 2, day: 9 }), '--02-09');
  assert.equal(birthdayText({ year: 1990, month: 12, day: 31 }), '1990-12-31');

  const b = parseBirthday('1990-05-04')!;
  assert.equal(daysToBirthday(b, new Date(2026, 4, 4, 23, 30)), 0);
  assert.equal(daysToBirthday(b, new Date(2026, 4, 3, 8)), 1);
  assert.equal(daysToBirthday(b, new Date(2026, 4, 5)), 364);
  assert.equal(turns(b, new Date(2026, 4, 4)), 36);
  assert.equal(turns(b, new Date(2026, 4, 5)), 37);
  // 29 February falls on the 28th in a year without one.
  const leapling = parseBirthday('2000-02-29')!;
  assert.equal(daysToBirthday(leapling, new Date(2027, 1, 28)), 0);
  assert.equal(daysToBirthday(leapling, new Date(2028, 1, 28)), 1);
});

test('the coming birthday is said in the app’s language', async () => {
  await setLang('en');
  const b = parseBirthday('--05-04')!;
  assert.equal(birthdayComing(b, new Date(2026, 4, 4)), 'Birthday today');
  assert.equal(birthdayComing(parseBirthday('1990-05-04')!, new Date(2026, 4, 3)), 'Birthday tomorrow, turns 36');
  await setLang('el');
  assert.equal(birthdayComing(b, new Date(2026, 4, 1)), 'Γενέθλια σε 3 ημέρες');
  await setLang('en');
});

test('the same person kept twice is found by name, number or email', () => {
  const card = (key: string, name: string, f: Partial<Fields> = {}) => ({ key, name, fields: { ...EMPTY_FIELDS, ...f } });
  const found = findDuplicates([
    card('a', 'Μαρία Παπαδοπούλου'),
    card('b', 'Παπαδοπούλου Μαρία'),
    card('c', 'Νίκος', { phones: [{ value: '+30 691 234 5678', kind: 'mobile', label: '' }] }),
    card('d', 'Nick', { phones: [{ value: '6912345678', kind: 'home', label: '' }] }),
    card('e', 'Ελένη', { emails: [{ value: 'Eleni@Example.org', kind: 'home', label: '' }] }),
    card('f', 'Eleni K', { emails: [{ value: 'eleni@example.org ', kind: 'work', label: '' }] }),
    card('g', 'Γιώργος', { phones: [{ value: '112', kind: 'other', label: '' }] }),
    card('h', 'George', { phones: [{ value: '112', kind: 'other', label: '' }] }),
    card('i', '+30 210', {}),
    card('j', '+30 210', {}),
  ]);
  assert.deepEqual(found, [
    { keys: ['a', 'b'], why: 'name' },
    { keys: ['c', 'd'], why: 'number' },
    { keys: ['e', 'f'], why: 'email' },
  ]);
  // A chain makes one set.
  const chain = findDuplicates([card('x', 'Άννα', { phones: [{ value: '2101234567', kind: 'home', label: '' }] }), card('y', 'Anna'), card('z', 'anna', { phones: [{ value: '+30 210 123 4567', kind: 'work', label: '' }] })]);
  assert.deepEqual(chain.map((s) => s.keys), [['x', 'y', 'z']]);
});

test('merged contacts keep the first one’s names and every number, email and address once', () => {
  const first: Fields = { ...maria, phones: [{ value: '+30 691 234 5678', kind: 'mobile', label: '', ids: [7] }], note: 'Πρώτη' };
  const second: Fields = {
    ...EMPTY_FIELDS,
    given: 'Mary',
    title: 'Λιμενάρχης',
    phones: [
      { value: '6912345678', kind: 'home', label: '', ids: [9] },
      { value: '210 555 0100', kind: 'work', label: '', ids: [10], type: 3 },
    ],
    emails: [{ value: 'MARIA@example.org', kind: 'home', label: '' }],
    addresses: [{ value: 'Ακτή Μιαούλη 10, 185 38 Πειραιάς', kind: 'work', label: '' }],
    note: 'Δεύτερη',
    birthday: '--05-04',
  };
  const merged = mergeFields([first, second]);
  assert.equal(merged.given, 'Μαρία');
  assert.equal(merged.title, 'Λιμενάρχης');
  assert.deepEqual(merged.phones, [
    { value: '+30 691 234 5678', kind: 'mobile', label: '', ids: [7] },
    { value: '210 555 0100', kind: 'work', label: '', type: 3 },
  ]);
  assert.equal(merged.emails.length, 1);
  assert.equal(merged.addresses.length, 1);
  assert.equal(merged.note, 'Πρώτη\n\nΔεύτερη');
  // The birthday with its year wins.
  assert.equal(mergeFields([{ ...EMPTY_FIELDS, birthday: '--05-04' }, { ...EMPTY_FIELDS, birthday: '1990-05-04' }]).birthday, '1990-05-04');
});

const phone: PhoneContact = {
  id: 12,
  lookup: '0r12-ABC',
  name: 'Μαρία Παπαδοπούλου',
  given: 'Μαρία',
  family: 'Παπαδοπούλου',
  starred: false,
  photo: 0,
  ringtone: '',
  phones: [{ ids: [100, 101], value: '+30 691 234 5678', type: 17, label: '' }],
  emails: [{ ids: [102], value: 'maria@example.org', type: 0, label: 'Σχολή' }],
  addresses: [],
  note: { ids: [103], value: 'Σημείωση' },
  birthday: null,
  company: '',
  title: '',
  org: [],
  groups: [5],
  accounts: [{ type: '', name: '' }],
};

test('a phone contact becomes fields, and saving them keeps its rows and its types', () => {
  const fields = phoneFields(phone);
  assert.deepEqual(fields.phones, [{ value: '+30 691 234 5678', kind: 'mobile', label: '', ids: [100, 101], type: 17 }]);
  assert.deepEqual(fields.emails, [{ value: 'maria@example.org', kind: 'custom', label: 'Σχολή', ids: [102], type: 0 }]);
  const saved = phoneSave({ ...fields, emails: [], phones: [...fields.phones, { value: '210 1234567', kind: 'home', label: '' }], birthday: '4/5' }, phone, null, true);
  assert.equal(saved.id, 12);
  assert.equal(saved.account, null);
  assert.deepEqual(saved.phones, [
    { ids: [100, 101], value: '+30 691 234 5678', type: 17, label: '' },
    { ids: [], value: '210 1234567', type: 1, label: '' },
  ]);
  assert.deepEqual(saved.emails, []);
  assert.deepEqual(saved.note, { ids: [103], value: 'Σημείωση' });
  assert.deepEqual(saved.birthday, { ids: [], value: '--05-04' });
  assert.equal(saved.starred, true);
  // A new one has no rows yet, whatever the fields came with, and goes in the account chosen.
  const fresh = phoneSave(fields, null, { type: 'com.google', name: 'me@example.org' }, false);
  assert.equal(fresh.id, 0);
  assert.deepEqual(fresh.phones[0].ids, []);
  assert.deepEqual(fresh.account, { type: 'com.google', name: 'me@example.org' });
});

test("another app's new contact is checked before it fills the form", () => {
  const asked = askedFields(JSON.stringify({ name: 'Νίκος Γεωργίου', phones: [{ value: '+30 210 1234567', type: 3 }, { value: 7 }], emails: [{ value: 'n@example.org' }], note: 'από QR' }));
  assert.ok(asked);
  assert.equal(asked.given, 'Νίκος');
  assert.equal(asked.family, 'Γεωργίου');
  assert.deepEqual(asked.phones, [{ value: '+30 210 1234567', kind: 'work', label: '' }]);
  assert.deepEqual(asked.emails, [{ value: 'n@example.org', kind: 'home', label: '' }]);
  assert.equal(askedFields('not json'), null);
  assert.equal(askedFields(JSON.stringify({ note: 'only a note' })), null);
  assert.equal(birthdayText(parseBirthday('--12-24')!), '--12-24');
});
