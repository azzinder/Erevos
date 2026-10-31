// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// An Erevos contact linked to one of my contacts (lib/linked-name.ts, lib/contacts.ts,
// lib/contact-code.ts): the name it takes from it, only while it has none of its own, the contacts
// it can be connected to, and a contact handed to the chat, which brings its link and its name only
// to the chats they were made for.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { forgetOffered, offerContact, offerFor, onContactOffered, type ContactCode, type Offer } from '../lib/contact-code';
import { EMPTY_FIELDS, linkChoices, linkedElsewhere, matches, type Fields } from '../lib/contacts';
import { giveLinkedName, linkedName, type Namer } from '../lib/linked-name';
import { MAX_NAME } from '../lock/e2e-data';

const IDENTITY = 'ab'.repeat(32);
const OTHER = 'cd'.repeat(32);

test('an Erevos contact takes the name of the contact linked to it, only while it has none of its own', () => {
  assert.equal(linkedName('', { name: 'Μαρία Παπαδοπούλου' }), 'Μαρία Παπαδοπούλου');
  assert.equal(linkedName('Leni', { name: 'Eleni Papadopoulou' }), '');
  assert.equal(linkedName('   ', { name: 'Eleni' }), 'Eleni', 'only spaces is no name');
  assert.equal(linkedName('', { name: '' }), '');
  assert.equal(linkedName('', { name: '  Eleni‮\n Papa  ' }), 'Eleni Papa', 'kept as Erevos keeps names');
  assert.equal([...linkedName('', { name: '😀'.repeat(50) })].length, MAX_NAME);
  // A contact whose name is its number shows the number, and so does the chat.
  assert.equal(linkedName('', { name: '+30 691 234 5678' }), '+30 691 234 5678');
});

/** A chat's contacts in memory, which keeps the names it is given. */
function namer(contacts: { identity: string; name: string }[]): Namer & { renamed: string[] } {
  const renamed: string[] = [];
  return {
    renamed,
    contacts: () => contacts.map((c) => ({ ...c })),
    rename: async (identity, name) => {
      renamed.push(identity);
      const kept = contacts.find((c) => c.identity === identity);
      if (!kept) throw new Error('No such contact.');
      kept.name = name;
    },
  };
}

test('the name is given in the chat only when it has none, and never to a contact that is not there', async () => {
  const chats = namer([
    { identity: IDENTITY, name: '' },
    { identity: OTHER, name: 'Leni' },
  ]);
  assert.equal(await giveLinkedName(chats, IDENTITY, { name: 'Eleni Papadopoulou' }), 'Eleni Papadopoulou');
  assert.equal(chats.contacts()[0].name, 'Eleni Papadopoulou');
  assert.equal(await giveLinkedName(chats, OTHER, { name: 'Eleni Papadopoulou' }), '');
  assert.equal(chats.contacts()[1].name, 'Leni');
  assert.equal(await giveLinkedName(chats, '00'.repeat(32), { name: 'Nobody' }), '');
  assert.deepEqual(chats.renamed, [IDENTITY]);
});

/** A contact as the picker lists it: its fields, its name, and the Erevos contact it is. */
const card = (given: string, number: string, erevos = ''): Fields & { name: string; erevos: string } => ({
  ...EMPTY_FIELDS,
  given,
  phones: [{ value: number, kind: 'mobile', label: '' }],
  name: given,
  erevos,
});

test("the contacts to connect to: in hidden chats only theirs, never the phone's, found by any field without case or accents", () => {
  const maria = card('Μαρία', '+30 691 234 5678');
  const nikos = card('Νίκος', '+30 697 000 1111');
  assert.deepEqual(linkChoices([maria], [nikos], true), [nikos]);
  assert.deepEqual(linkChoices([maria], [nikos], false), [maria, nikos]);
  // The picker's search, over that list, as it is typed.
  const found = (query: string) => linkChoices([maria], [nikos], false).filter((c) => matches(c, query));
  assert.deepEqual(found('μαρια'), [maria]);
  assert.deepEqual(found('6912345678'), [maria]);
  assert.deepEqual(found(''), [maria, nikos]);
  assert.deepEqual(found('zzz'), []);
});

test('one linked to another Erevos contact says so; one linked to this one, or to none, does not', () => {
  assert.equal(linkedElsewhere({ erevos: '' }, IDENTITY), false);
  assert.equal(linkedElsewhere({ erevos: IDENTITY }, IDENTITY), false);
  assert.equal(linkedElsewhere({ erevos: OTHER }, IDENTITY), true);
  // Before it is added, who it is is not known: any linked one says so.
  assert.equal(linkedElsewhere({ erevos: OTHER }, ''), true);
  assert.equal(linkedElsewhere({ erevos: '' }, ''), false);
});

const code: ContactCode = { senderHex: 'ef'.repeat(24), relayUrl: 'wss://relay.example.org', key: 'abc' };
const space = { holder: 'space', space: 0 };

test('a contact handed to the chat brings its link and its name only to the chats they were made for', () => {
  const offer: Offer = { place: space, name: 'Eleni' };
  assert.equal(offerFor(offer, { holder: 'space', space: 0 }), offer);
  assert.equal(offerFor(offer, { holder: 'hidden1', space: 0 }), null);
  assert.equal(offerFor({ place: { holder: 'hidden1', space: 0 }, name: 'Eleni' }, space), null);
  assert.equal(offerFor(offer, { holder: 'space', space: 1 }), null);
  assert.equal(offerFor(undefined, space), null);
});

test('a contact handed over waits for the chat, with its link and name, and goes to it once', () => {
  const linked: string[] = [];
  const offer: Offer = { place: space, name: 'Eleni', added: (identity) => linked.push(identity) };
  offerContact(code, offer);
  const taken: { code: ContactCode; offer?: Offer }[] = [];
  const stop = onContactOffered((c, o) => taken.push({ code: c, offer: o }));
  assert.equal(taken.length, 1);
  assert.equal(taken[0].code, code);
  assert.equal(taken[0].offer?.name, 'Eleni');
  assert.deepEqual(taken[0].offer?.place, space);
  taken[0].offer?.added?.(IDENTITY);
  assert.deepEqual(linked, [IDENTITY]);
  stop();
  const again: ContactCode[] = [];
  const stopAgain = onContactOffered((c) => again.push(c));
  assert.deepEqual(again, [], 'it went once');
  stopAgain();
  // With no chat to take it, it waits again.
  offerContact(code, offer);
  const later: ContactCode[] = [];
  onContactOffered((c) => later.push(c))();
  assert.deepEqual(later, [code]);
  // A space that locks forgets one that waits.
  offerContact(code, offer);
  forgetOffered();
  const after: ContactCode[] = [];
  const stopAfter = onContactOffered((c) => after.push(c));
  assert.deepEqual(after, []);
  stopAfter();
});
