// Web addresses in messages (lib/links.ts), and links that open Erevos (lib/open-link.ts).
// Run with: npm run check
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitLinks } from '../lib/links';
import { holdLink, KEEP_MS, linkHref, linkParts, lockingKeepsLink, onLinkHeld, peekLink, RELOCK_MS, takeLink } from '../lib/open-link';

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

// Links that open Erevos, held while the password screen shows (lib/open-link.ts).

test('a link that opens Erevos names one of its screens, with its details', () => {
  assert.equal(linkHref('erevos://contacts'), '/contacts');
  assert.equal(linkHref('erevos://phone?number=%2B306900000000'), '/phone?number=%2B306900000000');
  assert.equal(linkHref('EREVOS://contact-edit?fill=%7B%7D'), '/contact-edit?fill=%7B%7D');
  assert.equal(linkHref('erevos:///'), '');
  assert.equal(linkHref('erevos://'), '');
  assert.equal(linkHref('https://example.org/contacts'), '');
  assert.equal(linkHref('erevos://../secret'), '');
  assert.deepEqual(linkParts('/phone?number=%2B30%20690&tab=recents'), { path: '/phone', params: { number: '+30 690', tab: 'recents' } });
  assert.deepEqual(linkParts('/contacts'), { path: '/contacts', params: {} });
  assert.deepEqual(linkParts('/sms?to=%E0%A4'), { path: '/sms', params: { to: '%E0%A4' } });
});

test('a link waits for the password, a few minutes at most, and opens once', () => {
  let told = 0;
  const stop = onLinkHeld(() => told++);
  holdLink('erevos://contacts', 1000);
  assert.equal(told, 1);
  assert.equal(takeLink(2000), '/contacts');
  assert.equal(takeLink(2000), null);
  holdLink('erevos://phone', 1000);
  assert.equal(takeLink(1000 + KEEP_MS + 1), null);
  holdLink('erevos:///', 1000);
  assert.equal(takeLink(1000), null);
  assert.equal(told, 2, 'the home screen is no link');
  stop();
  holdLink('erevos://phone', 1000);
  assert.equal(told, 2);
  takeLink(1000);
});

test('a link opened just before Erevos locks opens again after the password', () => {
  holdLink('erevos://contacts', 1000);
  assert.equal(takeLink(1000), '/contacts');
  lockingKeepsLink(1000 + RELOCK_MS);
  assert.equal(takeLink(5000), '/contacts');
  // Locking later, or again, does not bring it back.
  lockingKeepsLink(5000 + RELOCK_MS + 1);
  assert.equal(takeLink(9000), null);
  lockingKeepsLink(9000);
  assert.equal(takeLink(9000), null);
});

test('a held link can be looked at, as the locked Phone does, and stays held', () => {
  holdLink('erevos://phone?tab=recents', 1000);
  assert.equal(peekLink(2000), '/phone?tab=recents');
  assert.equal(peekLink(1000 + KEEP_MS + 1), null, 'too old');
  assert.equal(takeLink(2000), '/phone?tab=recents');
  assert.equal(peekLink(2000), null);
});
