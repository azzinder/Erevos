// Naming members of a group with @ (lib/mentions.ts, lib/group-parts.ts, lib/background.ts): only
// whole names count, the list that travels is checked as it comes, and a member named is told of
// it in a muted group too.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { groupPartsOf } from '../lib/group-parts';
import { isMentions, mentionsIn, MOST_NAMED, namesFor, typingMention, withMention } from '../lib/mentions';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);
const MEMBERS = [
  { identity: A, name: 'Anna' },
  { identity: B, name: 'Anna Maria' },
  { identity: C, name: 'Kostas' },
];

test('the @word being typed is found at the end only, and made a whole name', () => {
  assert.equal(typingMention('hi @An'), 'An');
  assert.equal(typingMention('@'), '');
  assert.equal(typingMention('mail@example.org'), null);
  assert.equal(typingMention('@Anna said'), null);
  assert.deepEqual(
    namesFor('an', MEMBERS).map((m) => m.name),
    ['Anna', 'Anna Maria'],
  );
  assert.equal(withMention('hi @An', 'Anna Maria'), 'hi @Anna Maria ');
});

test('only whole names count, longest first', () => {
  assert.deepEqual(mentionsIn('@Anna Maria come', MEMBERS), [B]);
  assert.deepEqual(mentionsIn('@Anna and @Kostas!', MEMBERS).sort(), [A, C].sort());
  assert.deepEqual(mentionsIn('@Annabel @Kostass x@Kostas', MEMBERS), []);
  assert.deepEqual(mentionsIn('no one', MEMBERS), []);
});

test('the list that travels is checked: identities only, a few', () => {
  assert.ok(isMentions([A]));
  assert.ok(!isMentions([]));
  assert.ok(!isMentions(['x']));
  assert.ok(!isMentions(Array.from({ length: MOST_NAMED + 1 }, () => A)));
  assert.deepEqual(groupPartsOf({ named: [A] }, true), { named: [A] });
  assert.deepEqual(groupPartsOf({ named: [A] }, false), {}, 'a file names no one');
  assert.deepEqual(groupPartsOf({ named: 'x' }, true), {});
});

test('a member named is told in a muted group too, and only then', () => {
  const background = readFileSync(join(import.meta.dirname, '..', 'lib', 'background.ts'), 'utf8');
  assert.match(background, /if \(mutedNow\(notify\) && !named\) return;/);
  const groups = readFileSync(join(import.meta.dirname, '..', 'lib', 'groups.ts'), 'utf8');
  assert.match(groups, /const named = said\.text\.includes\('@'\) && !!parts\.named\?\.includes\(\(await this\.me\(\)\)\.id\);/);
});
