// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// How a message's words look (lib/text-style.ts, components/linked-text.tsx): marks typed around
// words, never read inside a word, a web address or code, and what is hidden stays hidden in a line.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasStyle, plainWords, styleText } from '../lib/text-style';

const looks = (text: string) => styleText(text).map((part) => [part.text, Object.keys(part.look).sort().join('+')]);

test('marks around words change how they look', () => {
  assert.deepEqual(looks('*bold* and _it_ ~gone~'), [
    ['bold', 'bold'],
    [' and ', ''],
    ['it', 'italic'],
    [' ', ''],
    ['gone', 'strike'],
  ]);
  assert.deepEqual(looks('_both *at once*_'), [
    ['both ', 'italic'],
    ['at once', 'bold+italic'],
  ]);
});

test('marks inside words, around spaces, or across lines stay as typed', () => {
  for (const text of ['2*3*4', 'snake_case_name', '* not bold *', 'ok **', 'a *b\nc* d', 'wow||x||y', 'a__b__c']) assert.ok(!hasStyle(text), text);
});

test('web addresses are never read for marks, and keep their own', () => {
  assert.ok(!hasStyle('see https://example.org/_a_b_ now'));
  assert.ok(!hasStyle('www.example.org/*x*'));
  assert.deepEqual(looks('*https://example.org/x_y*'), [['https://example.org/x_y', 'bold']]);
});

test('code takes no marks inside it, and a block may start on its own line', () => {
  assert.deepEqual(looks('`*x*` then'), [
    ['*x*', 'code'],
    [' then', ''],
  ]);
  assert.deepEqual(looks('```\nlet a = *b*;\n```'), [['let a = *b*;', 'code']]);
});

test('hidden words are numbered apart, and hidden in a line', () => {
  const parts = styleText('||one|| and ||two *b*||');
  assert.deepEqual(
    parts.map((p) => p.spoiler),
    [0, undefined, 1, 1],
  );
  assert.equal(plainWords('look ||the end|| here'), 'look ▒▒▒ here');
  assert.equal(plainWords('||a *b* c||'), '▒▒▒');
  assert.equal(plainWords('*bold* words'), 'bold words');
  assert.equal(plainWords('no marks'), 'no marks');
});

test('no message, however made, holds the screen up', () => {
  for (const text of [' *b'.repeat(2666), ' ||b'.repeat(2000), ' *www.a'.repeat(1100), '_'.repeat(8000), '*a '.repeat(2666), 'x'.repeat(100_000) + '*a*']) {
    const start = Date.now();
    styleText(text);
    plainWords(text + ' ');
    assert.ok(Date.now() - start < 500, `${text.length} characters took ${Date.now() - start} ms`);
  }
  assert.ok(!hasStyle(`${'x'.repeat(9000)} *bold*`), 'too long: shown as typed');
});
