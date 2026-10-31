// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The user guide, checked the way LPHL FASOULI's guide.test.ts checks its own.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GUIDE_LANGS, guideFor } from '../guide/index';
import { DE } from '../i18n/de/index';
import { EL } from '../i18n/el/index';
import { ES } from '../i18n/es/index';
import { FR } from '../i18n/fr/index';
import { IT } from '../i18n/it/index';
import { PT } from '../i18n/pt/index';
import { SH } from '../i18n/sh/index';
import { blockTexts, parseGuide, parseInline, searchGuide, type GuideBlock } from '../lib/guide';
import { LANGS } from '../lib/i18n';

const WORDS: Record<string, Record<string, string>> = { de: DE, el: EL, es: ES, fr: FR, it: IT, pt: PT, sh: SH };

const SAMPLE = `
## First {#first}

A paragraph that goes on
on the next line.

### A heading

- One item
  that continues.
- Two
  - a sub-item
    that continues
1. Step one
2. Step two
   continued.

| A | B |
| --- | --- |
| 1 | 2 |
| 3 | |

> A note
> on two lines.

## Second {#second}

Text with **bold**, \`code\`, [a link](#first) and [a page](https://example.com).
`;

test('the guide format reads sections, blocks and lines that continue', () => {
  const [first, second] = parseGuide(SAMPLE);
  assert.equal(first.id, 'first');
  assert.equal(first.title, 'First');
  assert.deepEqual<GuideBlock[]>(first.blocks, [
    { kind: 'paragraph', text: 'A paragraph that goes on on the next line.' },
    { kind: 'heading', text: 'A heading' },
    {
      kind: 'bullets',
      items: [
        { text: 'One item that continues.', sub: [] },
        { text: 'Two', sub: ['a sub-item that continues'] },
      ],
    },
    { kind: 'steps', items: ['Step one', 'Step two continued.'] },
    { kind: 'table', head: ['A', 'B'], rows: [['1', '2'], ['3', '']] },
    { kind: 'note', text: 'A note on two lines.' },
  ]);
  assert.equal(second.id, 'second');
  assert.throws(() => parseGuide('## No id\n\nText'), /id/);
  assert.throws(() => parseGuide('Text\n\n## Title {#a}'), /before/);
  assert.deepEqual(parseInline('Text with **bold**, `code`, [a link](#first) and [a page](https://example.com).'), [
    { text: 'Text with ' },
    { text: 'bold', bold: true },
    { text: ', ' },
    { text: 'code', code: true },
    { text: ', ' },
    { text: 'a link', link: '#first' },
    { text: ' and ' },
    { text: 'a page', link: 'https://example.com' },
    { text: '.' },
  ]);
});

/** The shape of a block, without its words: the same in every language. */
function shape(block: GuideBlock): string {
  switch (block.kind) {
    case 'bullets':
      return `bullets:${block.items.map((i) => i.sub.length).join(',')}`;
    case 'steps':
      return `steps:${block.items.length}`;
    case 'table':
      return `table:${block.head.length}x${block.rows.length}:${block.rows.map((r) => r.length).join(',')}`;
    default:
      return block.kind;
  }
}

function inlineTexts(block: GuideBlock): string[] {
  switch (block.kind) {
    case 'bullets':
      return block.items.flatMap((i) => [i.text, ...i.sub]);
    case 'steps':
      return block.items;
    case 'table':
      return [...block.head, ...block.rows.flat()];
    default:
      return [block.text];
  }
}

const el = guideFor('el');
const en = guideFor('en');
/** The guide in every language it is written in: all of the app's. */
const all = GUIDE_LANGS.map((lang) => [lang, guideFor(lang)] as const);

test('the guide is in every language of the app', () => {
  assert.deepEqual([...GUIDE_LANGS].sort(), [...LANGS].sort());
});

test('the guide has the same sections, in the same order and shape, in every language', () => {
  assert.ok(en.length >= 12);
  assert.equal(new Set(en.map((s) => s.id)).size, en.length);
  for (const [lang, sections] of all) {
    assert.deepEqual(
      sections.map((s) => s.id),
      en.map((s) => s.id),
      lang,
    );
    sections.forEach((section, i) => {
      assert.deepEqual({ lang, id: section.id, blocks: section.blocks.map(shape) }, { lang, id: section.id, blocks: en[i].blocks.map(shape) });
    });
  }
});

test('the guide links only to sections that exist, the same ones in every language, and leaves no mark unread', () => {
  const ids = new Set(en.map((s) => s.id));
  const unread: string[] = [];
  for (const [lang, sections] of all) {
    for (const section of sections) {
      for (const text of section.blocks.flatMap(inlineTexts)) {
        for (const span of parseInline(text)) {
          if (span.link?.startsWith('#')) assert.ok(ids.has(span.link.slice(1)), `${section.id}: ${span.link}`);
          else if (span.link) assert.match(span.link, /^https:\/\//);
          if (/\*\*|`|\]\(/.test(span.text)) unread.push(`${lang} ${section.id}: ${span.text}`);
        }
      }
    }
  }
  assert.deepEqual(unread, []);
  const links = (sections: typeof el) =>
    sections.map((s) => s.blocks.flatMap(inlineTexts).flatMap((t) => parseInline(t).flatMap((sp) => (sp.link ? [sp.link] : []))));
  for (const [lang, sections] of all) assert.deepEqual(links(sections), links(en), lang);
});

test('the guide says plainly what is end-to-end encrypted, and that nothing is audited', () => {
  const about = (sections: typeof el) => sections.find((s) => s.id === 'about')!.blocks.flatMap(blockTexts).join(' ');
  assert.match(about(en), /Messages are end-to-end encrypted, through a relay and nearby alike/);
  assert.match(about(en), /nothing has been audited/);
  assert.match(about(el), /Τα μηνύματα είναι κρυπτογραφημένα από άκρη σε άκρη, μέσω relay και από κοντά/);
  assert.match(about(el), /τίποτα δεν έχει ελεγχθεί/);
  // Nowhere does either still say the nearby link is plain.
  for (const sections of [en, el]) {
    const all = sections.flatMap((s) => s.blocks.flatMap(blockTexts)).join(' ');
    assert.doesNotMatch(all, /not encrypted yet|δεν κρυπτογραφούνται ακόμα|Χωρίς κρυπτογράφηση ακόμα/);
  }
});

test('the guide is searched ignoring case and accents, titles first', () => {
  const hidden = searchGuide(el, 'ΚΡΥΦΕΣ');
  assert.equal(hidden[0].section.id, 'hidden');
  assert.equal(hidden[0].snippet, null);
  assert.ok(hidden.length > 2);
  const deep = searchGuide(en, 'safety number');
  assert.ok(deep.map((h) => h.section.id).includes('relay'));
  assert.ok(deep.find((h) => h.section.id === 'faq')?.snippet?.toLowerCase().includes('safety number'));
  // Each guide names the buttons as the app shows them in its language.
  for (const [lang, sections] of all) {
    for (const button of ['Delete messages', 'Rename', 'Both phones']) {
      const words = lang === 'en' ? button : WORDS[lang][button];
      assert.ok(searchGuide(sections, words).some((h) => h.section.id === 'relay'), `${lang}: ${words}`);
    }
  }
  assert.deepEqual(searchGuide(en, '  '), []);
  assert.deepEqual(searchGuide(en, 'zzzz-nothing'), []);
  for (const hit of searchGuide(el, 'κωδικός')) if (hit.snippet) assert.ok(hit.snippet.length <= 112);
  for (const s of en) for (const b of s.blocks) assert.ok(blockTexts(b).join('').length > 0);
});

test('no list marker is left inside a step, an item or a note', () => {
  for (const [lang, sections] of all) {
    for (const section of sections) {
      for (const block of section.blocks) {
        for (const text of blockTexts(block)) assert.doesNotMatch(text, / - \*\*|^- /, `${lang} ${section.id}: ${text}`);
      }
    }
  }
});
