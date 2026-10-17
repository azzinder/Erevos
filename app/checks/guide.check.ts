// The user guide, checked the way LPHL FASOULI's guide.test.ts checks its own.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guideFor } from '../guide/index';
import { blockTexts, parseGuide, parseInline, searchGuide, type GuideBlock } from '../lib/guide';

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

test('the guide has the same sections, in the same order and shape, in Greek and English', () => {
  assert.ok(el.length >= 12);
  assert.deepEqual(
    en.map((s) => s.id),
    el.map((s) => s.id),
  );
  assert.equal(new Set(el.map((s) => s.id)).size, el.length);
  el.forEach((section, i) => {
    assert.deepEqual({ id: section.id, blocks: en[i].blocks.map(shape) }, { id: section.id, blocks: section.blocks.map(shape) });
  });
});

test('the guide links only to sections that exist, the same ones in both languages, and leaves no mark unread', () => {
  const ids = new Set(el.map((s) => s.id));
  const unread: string[] = [];
  for (const sections of [el, en]) {
    for (const section of sections) {
      for (const text of section.blocks.flatMap(inlineTexts)) {
        for (const span of parseInline(text)) {
          if (span.link?.startsWith('#')) assert.ok(ids.has(span.link.slice(1)), `${section.id}: ${span.link}`);
          else if (span.link) assert.match(span.link, /^https:\/\//);
          if (/\*\*|`|\]\(/.test(span.text)) unread.push(`${section.id}: ${span.text}`);
        }
      }
    }
  }
  assert.deepEqual(unread, []);
  const links = (sections: typeof el) =>
    sections.map((s) => s.blocks.flatMap(inlineTexts).flatMap((t) => parseInline(t).flatMap((sp) => (sp.link ? [sp.link] : []))));
  assert.deepEqual(links(en), links(el));
});

test('the guide says plainly what is end-to-end encrypted, what is not yet, and that nothing is audited', () => {
  const about = (sections: typeof el) => sections.find((s) => s.id === 'about')!.blocks.flatMap(blockTexts).join(' ');
  assert.match(about(en), /through a relay are end-to-end encrypted/);
  assert.match(about(en), /nearby phone are not encrypted yet/);
  assert.match(about(en), /nothing has been audited/);
  assert.match(about(el), /μέσω relay είναι κρυπτογραφημένα από άκρη σε άκρη/);
  assert.match(about(el), /κοντινό τηλέφωνο δεν κρυπτογραφούνται ακόμα/);
  assert.match(about(el), /τίποτα δεν έχει ελεγχθεί/);
});

test('the guide is searched ignoring case and accents, titles first', () => {
  const hidden = searchGuide(el, 'ΚΡΥΦΕΣ');
  assert.equal(hidden[0].section.id, 'hidden');
  assert.equal(hidden[0].snippet, null);
  assert.ok(hidden.length > 2);
  const deep = searchGuide(en, 'safety number');
  assert.ok(deep.map((h) => h.section.id).includes('relay'));
  assert.ok(deep.find((h) => h.section.id === 'faq')?.snippet?.toLowerCase().includes('safety number'));
  for (const sections of [en, el]) {
    for (const words of ['Delete messages', 'Rename', 'Both phones']) {
      assert.ok(searchGuide(sections, words).some((h) => h.section.id === 'relay'), words);
    }
  }
  assert.deepEqual(searchGuide(en, '  '), []);
  assert.deepEqual(searchGuide(en, 'zzzz-nothing'), []);
  for (const hit of searchGuide(el, 'κωδικός')) if (hit.snippet) assert.ok(hit.snippet.length <= 112);
  for (const s of en) for (const b of s.blocks) assert.ok(blockTexts(b).join('').length > 0);
});

test('no list marker is left inside a step, an item or a note', () => {
  for (const sections of [en, el]) {
    for (const section of sections) {
      for (const block of section.blocks) {
        for (const text of blockTexts(block)) assert.doesNotMatch(text, / - \*\*|^- /, `${section.id}: ${text}`);
      }
    }
  }
});
