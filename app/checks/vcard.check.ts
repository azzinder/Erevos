// vCards and MECARDs (lib/vcard.ts): reading what phones and computers write, in each version and
// character set, and writing 3.0 that reads back the same.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EMPTY_FIELDS, type Fields } from '../lib/contacts';
import { contactFromQr, parseMeCard, parseVCards, qrBytes, writeVCard } from '../lib/vcard';

const bytes = (text: string) => Uint8Array.from([...text].map((c) => c.charCodeAt(0) & 255));
const utf8 = (text: string) => [...new TextEncoder().encode(text)];
const hex = (list: number[]) => list.map((b) => `=${b.toString(16).toUpperCase().padStart(2, '0')}`).join('');
// Greek in ISO-8859-7: 0x2d0 below Unicode.
const iso7 = (text: string) => [...text].map((c) => (c.charCodeAt(0) < 0x80 ? c.charCodeAt(0) : c.charCodeAt(0) - 0x2d0));

test("Android's own 2.1 export: quoted-printable UTF-8, with soft breaks", () => {
  const note = hex(utf8('Συνάντηση την Τρίτη στο λιμάνι'));
  const file = [
    'BEGIN:VCARD',
    'VERSION:2.1',
    `N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:${hex(utf8('Παπαδοπούλου'))};${hex(utf8('Μαρία'))};;;`,
    `FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:${hex(utf8('Μαρία Παπαδοπούλου'))}`,
    'TEL;CELL:+30 691 234 5678',
    'TEL;HOME;VOICE:210 123 4567',
    'EMAIL;WORK:maria@example.org',
    `NOTE;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:${note.slice(0, 60)}=`,
    note.slice(60),
    'END:VCARD',
  ].join('\r\n');
  const [card] = parseVCards(bytes(file));
  assert.equal(card.name, 'Μαρία Παπαδοπούλου');
  assert.equal(card.given, 'Μαρία');
  assert.equal(card.family, 'Παπαδοπούλου');
  assert.deepEqual(
    card.phones.map((p) => [p.value, p.kind]),
    [
      ['+30 691 234 5678', 'mobile'],
      ['210 123 4567', 'home'],
    ],
  );
  assert.deepEqual(card.emails.map((e) => [e.value, e.kind]), [['maria@example.org', 'work']]);
  assert.equal(card.note, 'Συνάντηση την Τρίτη στο λιμάνι');
});

test("an old Greek phone's ISO-8859-7 and Windows-1253", () => {
  const file = ['BEGIN:VCARD', 'VERSION:2.1', `N;CHARSET=ISO-8859-7;ENCODING=QUOTED-PRINTABLE:${hex(iso7('Παπάς'))};${hex(iso7('Γιώργος'))}`, 'TEL:6944000000', 'END:VCARD'].join('\n');
  const [card] = parseVCards(bytes(file));
  assert.equal(card.given, 'Γιώργος');
  assert.equal(card.family, 'Παπάς');
  assert.equal(card.phones[0].kind, 'mobile');
  // Ά is 0xa2 in Windows-1253, 0xb6 in ISO-8859-7.
  const windows = ['BEGIN:VCARD', 'N;CHARSET=windows-1253;ENCODING=QUOTED-PRINTABLE:;=A2=ED=ED=E1', 'END:VCARD'].join('\n');
  assert.equal(parseVCards(bytes(windows))[0].given, 'Άννα');
  const iso = ['BEGIN:VCARD', 'N;CHARSET=ISO-8859-7;ENCODING=QUOTED-PRINTABLE:;=B6=ED=ED=E1', 'END:VCARD'].join('\n');
  assert.equal(parseVCards(bytes(iso))[0].given, 'Άννα');
});

test('3.0: folded lines, escapes, labels, the address, birthday, groups and photo', () => {
  const file = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Smith;John;Q;;',
    'FN:John Smith',
    'ORG:ACME\\, Inc.;Sales',
    'TITLE:Boss',
    "item1.TEL:+44 20 7946 0000",
    "item1.X-ABLabel:Grandma's",
    'item2.TEL:+44 20 7946 0001',
    'item2.X-ABLabel:_$!<HomeFAX>!$_',
    'TEL;TYPE=WORK,VOICE:020 7946 0002',
    'TEL;TYPE="CELL,PREF":07700 900000',
    'EMAIL;TYPE=INTERNET,HOME:john@example.org',
    'ADR;TYPE=WORK:;;1 Main St;London;;SW1A 1AA;UK',
    'NOTE:Line one\\nLine two\\, with a comma\\; that is long enough to be folded over the',
    '  75 octet limit',
    'BDAY:1980-02-29',
    'CATEGORIES:Work,Friends\\, close',
    'PHOTO;ENCODING=b;TYPE=JPEG:/9j/',
    ' 4AAQ',
    'END:VCARD',
  ].join('\r\n');
  const [card] = parseVCards(file);
  assert.equal(card.given, 'John Q');
  assert.equal(card.family, 'Smith');
  assert.equal(card.company, 'ACME, Inc., Sales');
  assert.equal(card.title, 'Boss');
  assert.deepEqual(
    card.phones.map((p) => [p.value, p.kind, p.label]),
    [
      ['+44 20 7946 0000', 'custom', "Grandma's"],
      ['+44 20 7946 0001', 'fax', ''],
      ['020 7946 0002', 'work', ''],
      ['07700 900000', 'mobile', ''],
    ],
  );
  assert.deepEqual(card.emails.map((e) => e.kind), ['home']);
  assert.deepEqual(card.addresses, [{ value: '1 Main St\nSW1A 1AA London\nUK', kind: 'work', label: '' }]);
  assert.equal(card.note, 'Line one\nLine two, with a comma; that is long enough to be folded over the 75 octet limit');
  assert.equal(card.birthday, '1980-02-29');
  assert.deepEqual(card.groups, ['Work', 'Friends, close']);
  assert.deepEqual([...(card.photo ?? [])], [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
});

test("4.0: a tel: address, a data: photo, a birthday without its year, an address's own label", () => {
  const file = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    'FN:Ελένη',
    'TEL;VALUE=uri;TYPE="voice,cell":tel:+30-691-000-0000',
    'PHOTO:data:image/png;base64,iVBORw==',
    'BDAY:--0504',
    'ADR;TYPE=home;LABEL="Οδός 1\\nΑθήνα, Ελλάδα":;;Οδός 1;Αθήνα;;;Ελλάδα',
    'PHOTO:https://example.org/photo.jpg',
    'END:VCARD',
  ].join('\n');
  const [card] = parseVCards(file);
  assert.equal(card.name, 'Ελένη');
  assert.equal(card.given, 'Ελένη');
  assert.deepEqual(card.phones.map((p) => [p.value, p.kind]), [['+30-691-000-0000', 'mobile']]);
  assert.deepEqual([...(card.photo ?? [])].slice(0, 4), [0x89, 0x50, 0x4e, 0x47]);
  assert.equal(card.birthday, '--05-04');
  assert.equal(card.addresses[0].value, 'Οδός 1\nΑθήνα, Ελλάδα');
});

test('many in one file: empty ones and a vCard inside another are left out', () => {
  const file = [
    'BEGIN:VCARD\nVERSION:3.0\nFN:ACME\nORG:ACME\nEND:VCARD',
    'BEGIN:VCARD\nVERSION:3.0\nEND:VCARD',
    'BEGIN:VCARD\nVERSION:2.1\nFN:Mom\nAGENT:\nBEGIN:VCARD\nFN:Secretary\nEND:VCARD\nTEL:123\nEND:VCARD',
  ].join('\n');
  const cards = parseVCards(file);
  assert.deepEqual(
    cards.map((c) => [c.name, c.given, c.company, c.phones.length]),
    [
      ['ACME', '', 'ACME', 0],
      ['Mom', 'Mom', '', 1],
    ],
  );
  assert.deepEqual(parseVCards(''), []);
  assert.deepEqual(parseVCards('not a vcard at all'), []);
});

test('written as 3.0, it reads back the same, its lines no longer than 75 octets', () => {
  const maria: Fields = {
    ...EMPTY_FIELDS,
    given: 'Μαρία',
    family: 'Παπαδοπούλου',
    company: 'Λιμάνι; Πειραιά, Α.Ε.',
    title: 'Λογίστρια',
    phones: [
      { value: '+30 691 234 5678', kind: 'mobile', label: '' },
      { value: '210 000 0000', kind: 'custom', label: 'Γιαγιά' },
      { value: '210 000 0001', kind: 'fax', label: '' },
    ],
    emails: [{ value: 'maria@example.org', kind: 'work', label: '' }],
    addresses: [{ value: 'Ακτή Μιαούλη 10\n185 38 Πειραιάς', kind: 'home', label: '' }],
    note: 'Μια μεγάλη σημείωση, με κόμματα; και ερωτηματικά, που χρειάζεται να διπλωθεί σε περισσότερες από μία γραμμές.\nΚαι δεύτερη γραμμή \\ με ανάποδη κάθετο.',
    birthday: '--05-04',
  };
  const photo = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) & 255);
  photo[0] = 0xff;
  const text = writeVCard({ ...maria, name: 'Μαρία Π.', photo, groups: ['Οικογένεια', 'Work'] });
  assert.ok(text.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));
  assert.ok(text.endsWith('END:VCARD\r\n'));
  for (const line of text.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  const [back] = parseVCards(new TextEncoder().encode(text));
  assert.equal(back.name, 'Μαρία Π.');
  for (const key of ['given', 'family', 'company', 'title', 'note', 'birthday'] as const) assert.equal(back[key], maria[key], key);
  assert.deepEqual(
    back.phones.map((p) => [p.value, p.kind, p.label]),
    maria.phones.map((p) => [p.value, p.kind, p.label]),
  );
  assert.deepEqual(back.emails, maria.emails);
  assert.deepEqual(back.addresses, maria.addresses);
  assert.deepEqual(back.groups, ['Οικογένεια', 'Work']);
  assert.deepEqual([...(back.photo ?? [])], [...photo]);
  // Two written one after the other are two.
  assert.equal(parseVCards(text + writeVCard({ ...EMPTY_FIELDS, given: 'Νίκος' })).length, 2);
});

test('a MECARD, and what a QR code holds', () => {
  const me = parseMeCard('MECARD:N:Papadopoulou,Maria;TEL:+306912345678;EMAIL:maria@example.org;NOTE:Hi\\; there;BDAY:19900504;;');
  assert.equal(me?.given, 'Maria');
  assert.equal(me?.family, 'Papadopoulou');
  assert.equal(me?.phones[0].value, '+306912345678');
  assert.equal(me?.note, 'Hi; there');
  assert.equal(me?.birthday, '1990-05-04');
  assert.equal(parseMeCard('MECARD:N:Νίκος Παππάς;;')?.family, 'Παππάς');
  assert.equal(parseMeCard('BEGIN:VCARD'), null);

  assert.equal(contactFromQr('BEGIN:VCARD\nVERSION:3.0\nFN:Ελένη\nTEL:123\nEND:VCARD')?.name, 'Ελένη');
  assert.equal(contactFromQr(' mecard:N:Doe,Jane;;')?.name, 'Jane Doe');
  assert.equal(contactFromQr('https://example.org'), null);
  assert.equal(contactFromQr('erevos://contact?x=1'), null);
});

test('text for a QR code: its UTF-8, a character for each byte', () => {
  assert.equal(qrBytes('A'), 'A');
  assert.deepEqual([...qrBytes('Α')].map((c) => c.charCodeAt(0)), [0xce, 0x91]);
  assert.ok([...qrBytes('Μαρία €')].every((c) => c.charCodeAt(0) < 256));
});
