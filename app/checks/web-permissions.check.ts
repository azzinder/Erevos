// The web app's permissions check (lib/web-permission-checks.ts): which checks each browser gets,
// what messages, calls and the data need, and when it shows by itself.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { needsLook, type Check } from '../lib/permission-checks';
import { browserOf, webChecksFrom, webOfferFor, type WebInput } from '../lib/web-permission-checks';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  chromeOnIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1',
  firefoxOnIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/141.0 Mobile/15E148 Safari/605.1.15',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
};

test('the browser is told apart: an iPhone or iPad whatever its browser, Chrome and its kin, Firefox, Safari on a Mac', () => {
  assert.equal(browserOf(UA.iphone, 'iPhone', 5), 'iphone');
  // An iPad says it is a Mac, with a touch screen.
  assert.equal(browserOf(UA.ipad, 'MacIntel', 5), 'iphone');
  assert.equal(browserOf(UA.safari, 'MacIntel', 0), 'safari');
  assert.equal(browserOf(UA.chromeOnIphone, 'iPhone', 5), 'iphone');
  assert.equal(browserOf(UA.firefoxOnIphone, 'iPhone', 5), 'iphone');
  for (const ua of [UA.chromeAndroid, UA.samsung, UA.chrome, UA.edge]) assert.equal(browserOf(ua, 'Linux armv8l', 5), 'chromium');
  assert.equal(browserOf(UA.firefox, 'Linux x86_64', 0), 'firefox');
  assert.equal(browserOf(UA.firefoxAndroid, 'Linux armv8l', 5), 'firefox');
  assert.equal(browserOf('Mozilla/5.0 (X11; Linux x86_64) Sailfish'), 'other');
});

// Chrome on a computer that allowed everything, with notifications on in this space.
const FINE: WebInput = {
  browser: 'chromium',
  android: false,
  installed: true,
  installable: false,
  pushable: true,
  notifications: 'granted',
  subscribed: true,
  pushWanted: true,
  microphone: 'granted',
  camera: 'granted',
  persisted: true,
};

const stateOf = (checks: Check[], id: string) => checks.find((c) => c.id === id)?.state;
const neededOf = (checks: Check[]) => checks.filter((c) => c.needed).map((c) => c.id);

test('a browser that allows everything shows every check as allowed, and nothing to offer', () => {
  const checks = webChecksFrom(FINE);
  assert.deepEqual(
    checks.map((c) => c.id),
    ['home', 'push', 'microphone', 'storage', 'camera'],
  );
  assert.ok(checks.every((c) => c.state === 'ok'));
  assert.deepEqual(neededOf(checks), ['push', 'microphone', 'storage']);
  assert.equal(needsLook(checks), false);
});

test('which checks each browser gets: the home screen everywhere but Firefox on a computer, needed only on an iPhone', () => {
  assert.equal(webChecksFrom({ ...FINE, browser: 'firefox' }).some((c) => c.id === 'home'), false);
  assert.equal(stateOf(webChecksFrom({ ...FINE, browser: 'firefox', android: true, installed: false }), 'home'), 'missing');
  for (const browser of ['chromium', 'safari', 'other'] as const) {
    const tab = webChecksFrom({ ...FINE, browser, installed: false });
    assert.equal(stateOf(tab, 'home'), 'missing');
    assert.equal(needsLook(tab), false);
  }
  // In a Safari tab on an iPhone: no notifications while closed, and the data goes after 7 days unused.
  const iphone = webChecksFrom({ ...FINE, browser: 'iphone', installed: false, pushable: false, pushWanted: false, notifications: null, subscribed: null });
  assert.deepEqual(neededOf(iphone), ['home', 'microphone', 'storage']);
  assert.equal(stateOf(iphone, 'push'), 'none');
  assert.equal(needsLook(iphone), true);
  assert.equal(needsLook(webChecksFrom({ ...FINE, browser: 'iphone' })), false);
  // Chrome's own question to install, where it offers one; elsewhere the screen says where it is.
  assert.equal(webChecksFrom({ ...FINE, installed: false, installable: true })[0].asks, true);
  assert.equal(webChecksFrom({ ...FINE, installed: false })[0].asks, false);
});

test('notifications are needed only once this space turned them on, and the browser keeps their address', () => {
  // Off in this space: a note, turned on under Lock.
  const off = webChecksFrom({ ...FINE, pushWanted: false, notifications: 'default', subscribed: false });
  assert.equal(stateOf(off, 'push'), 'note');
  assert.equal(needsLook(off), false);
  const cases: [Partial<WebInput>, string, boolean][] = [
    // Not asked yet in this browser (a restored backup): the button asks.
    [{ notifications: 'default', subscribed: false }, 'missing', true],
    // Refused: the browser does not ask again, only its settings change it.
    [{ notifications: 'denied', subscribed: false }, 'missing', false],
    // Allowed, but the browser dropped the address: given again.
    [{ subscribed: false }, 'missing', true],
    [{ subscribed: null }, 'yours', true],
  ];
  for (const [over, state, asks] of cases) {
    const push = webChecksFrom({ ...FINE, ...over }).find((c) => c.id === 'push');
    assert.equal(push?.state, state);
    assert.equal(push?.asks, asks);
    assert.equal(needsLook(webChecksFrom({ ...FINE, ...over })), true);
  }
  // A browser without them, with them on in this space.
  assert.equal(needsLook(webChecksFrom({ ...FINE, pushable: false, notifications: null })), true);
});

test('the microphone refused or the data not kept for good opens the check; not asked yet, or the camera, does not', () => {
  assert.equal(needsLook(webChecksFrom({ ...FINE, microphone: 'denied' })), true);
  assert.equal(needsLook(webChecksFrom({ ...FINE, persisted: false })), true);
  // A browser that does not say whether it keeps the data: the owner is asked to look.
  const unknown = webChecksFrom({ ...FINE, persisted: null });
  assert.equal(stateOf(unknown, 'storage'), 'yours');
  assert.equal(needsLook(unknown), true);
  for (const microphone of ['prompt', null] as const) {
    const later = webChecksFrom({ ...FINE, microphone });
    assert.equal(stateOf(later, 'microphone'), 'ask');
    assert.equal(needsLook(later), false);
  }
  const camera = webChecksFrom({ ...FINE, camera: 'denied' });
  assert.equal(stateOf(camera, 'camera'), 'missing');
  assert.equal(needsLook(camera), false);
});

test('the check offers itself once for each new signed release, only when something needed is missing', () => {
  const missing = webChecksFrom({ ...FINE, persisted: false });
  const fine = webChecksFrom(FINE);
  assert.equal(webOfferFor(null, '7', missing), true);
  assert.equal(webOfferFor('6', '7', missing), true);
  assert.equal(webOfferFor('7', '7', missing), false);
  assert.equal(webOfferFor('6', '7', fine), false);
  // Not run by its service worker (a development build): no release, never by itself.
  assert.equal(webOfferFor(null, null, missing), false);
});
