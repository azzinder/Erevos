// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
  callsWith,
  callText,
  cleanFields,
  compareNames,
  daysToBirthday,
  EMPTY_FIELDS,
  erevosFor,
  fieldsName,
  fillText,
  findable,
  findDuplicates,
  found,
  historyLines,
  simFields,
  initials,
  keeperFirst,
  kindOf,
  matches,
  mergeByName,
  mergeFields,
  notKept,
  parseBirthday,
  phoneFields,
  phoneSave,
  searchWords,
  splitName,
  toDial,
  turns,
  typeOf,
  whenText,
  type ErevosPerson,
  type Fields,
} from '../lib/contacts';
import { setLang } from '../lib/i18n';
import type { Message } from '../lock/history';
import type { PhoneContact } from '../modules/erevos-contacts';
import type { LoggedCall } from '../modules/erevos-phone';
import type { SmsMessage } from '../modules/erevos-sms';

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

test('names sort in the language\'s order, and a few join the many already in order without sorting them again', async () => {
  await setLang('el');
  try {
    const names = ['Ζωή', 'anna', 'Άλκης', 'Βασίλης', 'Bob', 'αλέξης'];
    const sorted = [...names].sort(compareNames);
    // Greek's own order puts Greek names first, without case or accents.
    assert.deepEqual(sorted, ['αλέξης', 'Άλκης', 'Βασίλης', 'Ζωή', 'anna', 'Bob']);
    assert.ok(compareNames('Άλκης', 'αλκης') === 0);
    assert.ok(compareNames('Βασίλης', 'Ζωή') < 0);
    const many = ['Άλκης', 'Βασίλης', 'Ζωή', 'anna'].map((name, i) => ({ name, from: `phone${i}` }));
    const few = [{ name: 'Αλκης', from: 'sealed' }, { name: 'Γιάννης', from: 'erevos' }, { name: 'Ωραία', from: 'erevos' }];
    const merged = mergeByName(many, few);
    assert.deepEqual(
      merged.map((c) => c.from),
      ['phone0', 'sealed', 'phone1', 'erevos', 'phone2', 'erevos', 'phone3'],
    );
    assert.deepEqual(mergeByName([], few), few);
    assert.deepEqual(mergeByName(many, []), many);
  } finally {
    await setLang('en');
  }
});

test('the search made once for a contact finds what it would find made anew', () => {
  const card = { ...maria, name: 'Μαρία Παπαδοπούλου' };
  const made = findable(card, ['Οικογένεια']);
  for (const query of ['μαρια', 'μαρ παπ', 'μαρία γιώργος', 'πειραιας', '691-234', '00306912345678', '6999', 'οικογενεια', '']) {
    assert.equal(found(made, searchWords(query)), matches(card, query, ['Οικογένεια']), query);
  }
});

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

test("the Phone's search gives each number of the contacts it finds once, and nothing for an empty search", () => {
  const cards = [
    { ...maria, key: 'p1', name: 'Μαρία Παπαδοπούλου', phones: [...maria.phones, { value: '00306912345678', kind: 'home' as const, label: '' }, { value: '210 123 4567', kind: 'work' as const, label: '' }] },
    { ...EMPTY_FIELDS, key: 's1', name: 'Μαρίνα', given: 'Μαρίνα' },
    { ...EMPTY_FIELDS, key: 'p2', name: 'Νίκος', given: 'Νίκος', phones: [{ value: '+30 697 000 0000', kind: 'mobile' as const, label: '' }] },
  ];
  assert.deepEqual(toDial(cards, '  '), []);
  // Marina has no number to call.
  assert.deepEqual(
    toDial(cards, 'μαρ').map((row) => [row.key, row.name, row.number]),
    [
      ['p1:1', 'Μαρία Παπαδοπούλου', '+30 691 234 5678'],
      ['p1:2', 'Μαρία Παπαδοπούλου', '210 123 4567'],
    ],
  );
  assert.deepEqual(toDial(cards, '697 000').map((row) => row.key), ['p2:1']);
  assert.equal(toDial(cards, 'μαρ', new Map(), 1).length, 1);
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
  // A QR code's, as fillText writes it: its names, kinds, labels and birthday come through.
  const custom = { ...maria, phones: [...maria.phones, { value: '210 000 0000', kind: 'custom' as const, label: 'Γιαγιά' }], birthday: '1990-05-04' };
  assert.deepEqual(askedFields(fillText(custom)), cleanFields(custom));
  assert.equal(askedFields(JSON.stringify({ given: 'Ελένη', birthday: 'soon', phones: [{ value: '1', kind: 'nonsense' }] }))?.birthday, '');
  assert.equal(askedFields(JSON.stringify({ given: 'Ελένη', phones: [{ value: '1', kind: 'nonsense' }] }))?.phones[0].kind, 'mobile');
});

test('what is not on the phone yet, of a file or a SIM', () => {
  const kept = [
    { ...maria, name: 'Μαρία Παπαδοπούλου' },
    { ...EMPTY_FIELDS, given: 'Γιώργος', name: 'Γιώργος' },
  ];
  const incoming = [
    // The same name the other way round, and the same number written otherwise: kept already.
    { ...EMPTY_FIELDS, name: 'Παπαδοπουλου Μαρια', phones: [{ value: '6912345678', kind: 'mobile' as const, label: '' }] },
    // The same name, no number or email on either: kept already.
    { ...EMPTY_FIELDS, name: 'γιώργος' },
    // The same name, another number: someone else.
    { ...EMPTY_FIELDS, name: 'Μαρία Παπαδοπούλου', phones: [{ value: '210 999 9999', kind: 'home' as const, label: '' }] },
    { ...EMPTY_FIELDS, name: 'Ελένη', emails: [{ value: 'eleni@example.org', kind: 'home' as const, label: '' }] },
    // Twice in the file: once.
    { ...EMPTY_FIELDS, name: 'Ελένη', emails: [{ value: 'Eleni@Example.org', kind: 'work' as const, label: '' }] },
  ];
  assert.deepEqual(
    notKept(incoming, kept).map((c) => c.name),
    ['Μαρία Παπαδοπούλου', 'Ελένη'],
  );
  assert.deepEqual(notKept([], kept), []);
});

test('merging keeps the fullest, or the first of the fullest', () => {
  const a = { ...EMPTY_FIELDS, given: 'Α' };
  const b = { ...maria };
  const c = { ...maria, given: 'Γ' };
  assert.deepEqual(keeperFirst([a, b, c]), [b, a, c]);
  assert.deepEqual(keeperFirst([a]), [a]);
  assert.deepEqual(keeperFirst([]), []);
});

test("a SIM's contact as fields", () => {
  const sim = simFields({ name: 'Νίκος Παππάς', number: '+306944000000', sim: 0 });
  assert.equal(sim.given, 'Νίκος');
  assert.equal(sim.family, 'Παππάς');
  assert.deepEqual(sim.phones, [{ value: '+306944000000', kind: 'mobile', label: '' }]);
  assert.equal(sim.name, 'Νίκος Παππάς');
  // A number without a name is named by its number; a name without a number has none.
  assert.equal(simFields({ name: '', number: '112', sim: 1 }).name, '112');
  assert.deepEqual(simFields({ name: 'Ταξί', number: '', sim: 0 }).phones, []);
});

test('the Erevos contact a contact is: linked by hand first, else by a number linked in Erevos', () => {
  const eleni: ErevosPerson = { identity: 'aa'.repeat(32), name: 'Eleni', phone: '6912345678' };
  const nikos: ErevosPerson = { identity: 'bb'.repeat(32), name: 'Nikos', phone: '' };
  const people = [eleni, nikos];
  // +30 691 234 5678 is 6912345678 with the country code.
  assert.equal(erevosFor('', maria.phones, people), eleni.identity);
  assert.equal(erevosFor(nikos.identity, maria.phones, people), nikos.identity);
  // A link to an Erevos contact that is gone counts for nothing.
  assert.equal(erevosFor('cc'.repeat(32), maria.phones, people), eleni.identity);
  assert.equal(erevosFor('', [], people), '');
  assert.equal(erevosFor('', maria.phones, [nikos]), '');
});

test("a contact's calls, SMS and Erevos messages, as one history, the newest first", async () => {
  await setLang('en');
  const call = (id: number, number: string, at: number, duration: number, type: number): LoggedCall => ({
    id,
    number,
    shown: number,
    name: '',
    photo: '',
    at,
    duration,
    type,
    features: 0,
    account: '',
    presentation: 1,
    isNew: false,
    blocked: 0,
  });
  const calls = callsWith(
    [call(1, '6912345678', 1000, 65, 1), call(2, '6912345678', 4000, 0, 3), call(3, '+306912345678', 2000, 0, 2), call(4, '2101234567', 4500, 30, 1)],
    ['+30 691 234 5678'],
  );
  assert.deepEqual(
    calls.map((c) => c.id),
    [2, 3, 1],
  );
  const sms = (id: number, at: number, text: string): SmsMessage => ({ id, text, at, mine: false, state: 'done', read: true });
  const lists = [
    { number: '6912345678', messages: [sms(1, 3000, 'Hi'), sms(2, 500, '')] },
    { number: '+306912345678', messages: [sms(1, 3000, 'Hi')] },
  ];
  const erevos: Message[] = [
    { peer: 'contact:x', text: 'Through Erevos', mine: true, at: 3500, tag: 't1' },
    { peer: 'contact:x', text: 'Gone', mine: false, at: 3600, tag: 't2', until: 3700 },
  ];
  const lines = historyLines(calls, lists, erevos, 5000);
  assert.deepEqual(
    lines.map((l) => [l.kind, l.at, l.text]),
    [
      ['call', 4000, 'Missed call'],
      ['erevos', 3500, 'Through Erevos'],
      ['sms', 3000, 'Hi'],
      ['call', 2000, 'Outgoing call, no answer'],
      ['call', 1000, 'Incoming call, 1:05'],
      ['sms', 500, ''],
    ],
  );
  assert.equal(lines[0].missed, true);
  assert.equal(lines[1].mine, true);
  assert.equal(historyLines(calls, lists, erevos, 5000, 2).length, 2);
  assert.equal(callText({ type: 2, duration: 3725 }), 'Outgoing call, 1:02:05');
  assert.equal(callText({ type: 6, duration: 0 }), 'Blocked call');
  assert.equal(callText({ type: 5, duration: 0 }), 'Declined call');
  assert.equal(callText({ type: 1, duration: 0 }), 'Incoming call');
});

test('when a line of history was', () => {
  const now = new Date(2026, 9, 19, 18, 0).getTime();
  assert.equal(whenText(new Date(2026, 9, 19, 9, 5).getTime(), now), '09:05');
  assert.equal(whenText(new Date(2026, 2, 4, 9, 5).getTime(), now), '4/3');
  assert.equal(whenText(new Date(2025, 11, 31, 9, 5).getTime(), now), '31/12/2025');
});
