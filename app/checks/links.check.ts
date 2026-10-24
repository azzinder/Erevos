// Web addresses in messages (lib/links.ts), and links that open Erevos (lib/open-link.ts).
// Run with: npm run check
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handOverCall, takeCall } from '../lib/call-handoff';
import { splitLinks } from '../lib/links';
import { holdLink, ICON_LINK, KEEP_MS, linkHref, linkMove, linkParts, lockingKeepsLink, onLinkHeld, peekLink, RELOCK_MS, screenParams, takeLink } from '../lib/open-link';

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

test("another app's Share opens Send to with its words, and a photo or file by the name of its copy", () => {
  // As ShareActivity.kt makes it: Android's Uri.Builder writes a space as %20 and + as %2B.
  const href = linkHref('erevos://share?text=https%3A%2F%2Fexample.org%2Fa%3Fb%3D1%2B2%20%CE%B5&file=erevos-shared-0123456789abcdef&name=IMG%201.jpg&mime=image%2Fjpeg');
  assert.equal(linkMove(href, { path: '/', hidden: false }), 'push');
  assert.deepEqual(linkParts(href), {
    path: '/share',
    params: { text: 'https://example.org/a?b=1+2 ε', file: 'erevos-shared-0123456789abcdef', name: 'IMG 1.jpg', mime: 'image/jpeg' },
  });
  assert.equal(linkMove(linkHref('erevos://share?large=1'), { path: '/share', hidden: false }), 'params');
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

test('the home screen with details is a link too, as the widget gives it', () => {
  assert.equal(linkHref('erevos://?show=sms'), '/?show=sms');
  assert.equal(linkHref('erevos:///?show=erevos'), '/?show=erevos');
  assert.equal(linkHref('erevos://?'), '');
  assert.deepEqual(linkParts('/?show=sms'), { path: '/', params: { show: 'sms' } });
});

test("the launcher's icons and the widget show what they name each time, also a second time", () => {
  const on = (path: string, hidden = false) => ({ path, hidden });
  const sms = linkHref('erevos://?show=sms');
  const chats = linkHref(ICON_LINK);
  assert.equal(chats, '/?show=erevos&from=launcher');
  // The home screen is gone back to, from wherever, with the link's tab, also when it shows already.
  assert.equal(linkMove(sms, on('/')), 'back');
  assert.equal(linkMove(sms, on('/chat')), 'back');
  assert.equal(linkMove(chats, on('/')), 'back');
  assert.equal(linkMove(chats, on('/sms')), 'back');
  assert.equal(linkMove(chats, on('/phone')), 'back');
  assert.equal(linkMove(linkHref('erevos://?show=erevos'), on('/chat')), 'back', "the widget's Messages button");
  // Erevos's own icon leaves one of its chats as it was.
  assert.equal(linkMove(chats, on('/chat')), 'stay');
  assert.equal(linkMove(chats, on('/group')), 'stay');
  assert.equal(linkMove(chats, on('/public-group')), 'stay');
  // The Phone and Contacts showing take the link afresh; a hidden place's Contacts is left, and
  // the space's open over it, as a screen that is not there opens over the one on top.
  assert.equal(linkMove('/phone', on('/phone')), 'back');
  assert.equal(linkMove('/phone?tab=recents', on('/phone')), 'back');
  assert.equal(linkMove('/contacts', on('/contacts')), 'back');
  assert.equal(linkMove('/contacts', on('/contacts', true)), 'push');
  assert.equal(linkMove('/phone', on('/contacts')), 'push');
  assert.equal(linkMove('/contacts', on('/')), 'push');
  // Another screen showing only takes the link's details, as before.
  assert.equal(linkMove('/sms?to=123', on('/sms')), 'params');
  // Opened again, a link's details change each time, so the screen shows its tab again.
  assert.deepEqual(screenParams(sms, 1000), { show: 'sms', opened: '1000' });
  assert.notDeepEqual(screenParams(sms, 2000), screenParams(sms, 1000));
  assert.deepEqual(screenParams('/phone', 5), { opened: '5' });
});

test('a held link can be looked at, as the locked Phone does, and stays held', () => {
  holdLink('erevos://phone?tab=recents', 1000);
  assert.equal(peekLink(2000), '/phone?tab=recents');
  assert.equal(peekLink(1000 + KEEP_MS + 1), null, 'too old');
  assert.equal(takeLink(2000), '/phone?tab=recents');
  assert.equal(peekLink(2000), null);
});

test('a call starts with a chat only when a tap in Erevos asked for it, once, for that contact', () => {
  const alice = 'a'.repeat(64);
  const bob = 'b'.repeat(64);
  // A link from outside names a chat and nothing more: no call waits for it.
  assert.deepEqual(linkParts(linkHref('erevos://chat?contact=' + alice + '&call=video')).params.call, 'video');
  assert.equal(takeCall(alice), null);
  handOverCall(alice, 'video', 1000);
  assert.equal(takeCall(alice, 2000), 'video');
  assert.equal(takeCall(alice, 2000), null);
  handOverCall(alice, 'voice', 1000);
  assert.equal(takeCall(bob, 2000), null);
  assert.equal(takeCall(alice, 2000), null);
  handOverCall(alice, 'voice', 1000);
  assert.equal(takeCall(alice, 1000 + 31_000), null);
});
