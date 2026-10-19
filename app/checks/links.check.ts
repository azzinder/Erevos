// Web addresses in messages (lib/links.ts).
// Run with: npm run check
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitLinks } from '../lib/links';

const urls = (text: string) => splitLinks(text).flatMap((part) => (part.url ? [part.url] : []));

test('finds web addresses, and leaves the words around them', () => {
  assert.deepEqual(splitLinks('see https://example.org/a?b=1 now'), [{ text: 'see ' }, { text: 'https://example.org/a?b=1', url: 'https://example.org/a?b=1' }, { text: ' now' }]);
  assert.deepEqual(urls('www.example.org and http://x.y/z'), ['https://www.example.org', 'http://x.y/z']);
  assert.equal(splitLinks('no links here').length, 1);
  assert.equal(splitLinks('').length, 0);
});

test('a sentence mark or an unopened bracket after it is not part of it', () => {
  assert.deepEqual(urls('Go to https://example.org/page.'), ['https://example.org/page']);
  assert.deepEqual(urls('(at https://example.org/x)'), ['https://example.org/x']);
  assert.deepEqual(urls('https://en.wikipedia.org/wiki/Foo_(bar)'), ['https://en.wikipedia.org/wiki/Foo_(bar)']);
  assert.deepEqual(urls('«https://example.org»'), ['https://example.org']);
});

test('only web addresses: no other kinds of link', () => {
  assert.deepEqual(urls('javascript:alert(1) file:///etc/passwd tel:123'), []);
});
