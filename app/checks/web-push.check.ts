// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The web app's notifications (lib/web-push.web.ts) when a browser opens more than one space: each
// space that turns them on has a push address of its own, from a registration of its own of the
// app's worker, so every space gets them, and no relay is ever given an address another space gave
// its relay: nothing at the relays ties two spaces together by it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire, register } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { setCurrentSpace } from '../lock/keys';
import { loadSpaceData, updateSpaceData, type Queue } from '../lock/space-data';

import { relayAt } from './push-relay-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the web push checks: build the core first with node checks/build-core.mjs');
}

// The web app, as lib/web-push.web.ts finds it (lib/integrity.web.ts), and its relays, in memory.
const PUSH = new URL('../lib/web-push.web.ts', import.meta.url).href;
const RELAYS = new URL('./push-relay-memory.ts', import.meta.url).href;
const hooks = `export async function resolve(specifier, context, next) {
  if (context.parentURL === ${JSON.stringify(PUSH)} && specifier === './integrity') return { url: 'data:text/javascript,export const WEB_APP = true;', shortCircuit: true };
  if (context.parentURL === ${JSON.stringify(PUSH)} && specifier === './relay') return { url: ${JSON.stringify(RELAYS)}, shortCircuit: true };
  return next(specifier, context);
}`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`);

// The browser: notifications allowed, and registrations of the app's worker by scope, the app's
// own at the root, each with one push address at a time. A new registration's worker becomes
// active a moment after it is registered.
const ORIGIN = 'https://erevos.example';
type Address = { endpoint: string; options: { applicationServerKey: ArrayBuffer }; getKey: (name: string) => ArrayBuffer; unsubscribe: () => Promise<boolean> };
type Registration = {
  scope: string;
  active: object | null;
  installing: (EventTarget & { state: string }) | null;
  waiting: null;
  address: Address | null;
  pushManager: { getSubscription: () => Promise<Address | null>; subscribe: (options: { applicationServerKey: Uint8Array }) => Promise<Address> };
  unregister: () => Promise<boolean>;
};
const registrations = new Map<string, Registration>();
let made = 0;
// The browser's push service refuses the next address asked of it.
let refuse = false;
function newAddress(registration: Registration, key: Uint8Array): Address {
  const fresh = { endpoint: `https://web.push.apple.com/address-${++made}`, options: { applicationServerKey: new Uint8Array(key).buffer }, getKey: (name: string) => new Uint8Array(name === 'p256dh' ? 65 : 16).buffer } as Address;
  fresh.unsubscribe = async () => {
    if (registration.address === fresh) registration.address = null;
    return true;
  };
  return fresh;
}
function registrationAt(scope: string, starting = false): Registration {
  const registration: Registration = {
    scope,
    active: starting ? null : {},
    installing: null,
    waiting: null,
    address: null,
    pushManager: {
      getSubscription: async () => registration.address,
      subscribe: async (options) => {
        if (!registration.active) throw new Error('InvalidStateError: no active worker');
        if (refuse) {
          refuse = false;
          throw new Error('AbortError: the push service did not answer');
        }
        return (registration.address = newAddress(registration, options.applicationServerKey));
      },
    },
    unregister: async () => registrations.delete(scope),
  };
  if (starting) {
    const worker = Object.assign(new EventTarget(), { state: 'installing' });
    registration.installing = worker;
    setTimeout(() => {
      worker.state = 'activated';
      registration.active = worker;
      registration.installing = null;
      worker.dispatchEvent(new Event('statechange'));
    }, 5);
  }
  registrations.set(scope, registration);
  return registration;
}
const app = registrationAt(`${ORIGIN}/`);
const serviceWorker = {
  ready: Promise.resolve(app),
  // The registration whose scope is the longest that `url` starts with, as a browser finds it.
  getRegistration: async (url: string) => [...registrations.values()].filter((r) => url.startsWith(r.scope)).sort((a, b) => b.scope.length - a.scope.length)[0],
  getRegistrations: async () => [...registrations.values()],
  register: async (script: string, options: { scope: string }) => {
    assert.equal(script, '/sw.js');
    return registrations.get(options.scope) ?? registrationAt(options.scope, true);
  },
};
class PushManager {
  static supportedContentEncodings = ['aes128gcm'];
}
const Notification = { permission: 'granted', requestPermission: async () => 'granted' };
Object.assign(globalThis, {
  window: { PushManager, Notification, crypto: globalThis.crypto },
  PushManager,
  Notification,
  location: { origin: ORIGIN },
});
Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker }, configurable: true });

const { healPush, keepPush, pushSubscribed, turnOffPush, turnOnPush } = await import('../lib/web-push.web');

/** A space, with its own relay, or the one at `url`, and its queue. */
async function space(number: number, url = `wss://relay-${number}.example`) {
  const key = randomBytes(32);
  const queue: Queue = { recipientHex: `${number}`.repeat(48), senderHex: `${(number + 1) % 10}`.repeat(48) };
  await updateSpaceData(number, key, { url, ownQueue: queue });
  const data = () => loadSpaceData(number, key);
  return {
    number,
    key,
    queue,
    open: () => setCurrentSpace(number, key),
    own: { url },
    relay: relayAt(url),
    data,
    registration: async () => registrations.get(`${ORIGIN}/__erevos/push/${(await data()).pushScope}/`),
    given: () => relayAt(url).everFor.get(queue.recipientHex) ?? new Set<string>(),
  };
}

const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((e) => b.has(e));

test('each space that turns them on has a push address of its own, and keeps it when another does', { skip: !coreReady }, async () => {
  const one = await space(1, 'wss://relay-shared.example');
  const two = await space(2, 'wss://relay-shared.example');
  const three = await space(3);

  for (const s of [one, two, three]) {
    s.open();
    assert.equal(await turnOnPush(), null);
  }
  // Each opens again, as Erevos does, and is shown again: all keep theirs.
  for (const s of [one, two, three, one]) {
    s.open();
    await keepPush(s.own, s.queue);
    await healPush();
    await healPush(true);
    assert.equal((await s.data()).push, true);
    assert.equal(await pushSubscribed(), true);
  }
  const addresses = await Promise.all([one, two, three].map(async (s) => (await s.registration())!.address!.endpoint));
  assert.equal(new Set(addresses).size, 3);
  [one, two, three].forEach((s, i) => {
    assert.deepEqual([...s.given()], [addresses[i]]);
    assert.equal(s.relay.queues.get(s.queue.recipientHex), addresses[i]);
  });
  // The relay both spaces use never saw one address for both.
  assert.deepEqual(overlap(one.given(), two.given()), []);
  // Each its own scope, at random; the app's own registration made no address.
  const scopes = await Promise.all([one, two, three].map(async (s) => (await s.data()).pushScope));
  assert.equal(new Set(scopes).size, 3);
  scopes.forEach((scope) => assert.match(scope, /^[0-9a-f]{32}$/));
  assert.equal(app.address, null);
  assert.equal(registrations.size, 4);
});

test("turned off, the space's registration and address go, and turned on again it makes new ones", { skip: !coreReady }, async () => {
  const four = await space(4);
  four.open();
  assert.equal(await turnOnPush(), null);
  const before = (await four.registration())!;
  const first = before.address!.endpoint;
  await turnOffPush();
  assert.equal(before.address, null);
  assert.equal(registrations.has(before.scope), false);
  assert.equal(four.relay.queues.has(four.queue.recipientHex), false);
  assert.equal((await four.data()).pushScope, '');
  assert.equal(await pushSubscribed(), false);
  assert.equal(await turnOnPush(), null);
  const after = (await four.registration())!;
  assert.notEqual(after.scope, before.scope);
  assert.notEqual(after.address!.endpoint, first);
  assert.equal(four.relay.queues.get(four.queue.recipientHex), after.address!.endpoint);
});

test("an address the browser changed is given to its space's relay, and no other's", { skip: !coreReady }, async () => {
  const five = await space(5);
  const six = await space(6);
  for (const s of [five, six]) {
    s.open();
    assert.equal(await turnOnPush(), null);
  }
  const ofSix = (await six.registration())!;
  ofSix.address = newAddress(ofSix, six.relay.key);
  five.open();
  await healPush(true);
  six.open();
  await healPush(true);
  assert.equal(six.relay.queues.get(six.queue.recipientHex), ofSix.address.endpoint);
  assert.equal(five.given().has(ofSix.address.endpoint), false);
  assert.equal(five.given().size, 1);
});

test("spaces whose notifications were on before, with the browser's first address, each make their own, and that one is not given again", { skip: !coreReady }, async () => {
  const seven = await space(7, 'wss://relay-before.example');
  const eight = await space(8, 'wss://relay-before.example');
  // From an older Erevos: both gave their relay the one address of the app's registration.
  app.address = newAddress(app, seven.relay.key);
  const shared = app.address.endpoint;
  for (const s of [seven, eight]) {
    await updateSpaceData(s.number, s.key, { push: true });
    s.relay.queues.set(s.queue.recipientHex, shared);
    s.relay.everFor.set(s.queue.recipientHex, new Set([shared]));
  }
  for (const s of [seven, eight, seven]) {
    s.open();
    await healPush();
    await keepPush(s.own, s.queue);
  }
  for (const s of [seven, eight]) {
    const own = (await s.registration())!.address!.endpoint;
    assert.equal(s.relay.queues.get(s.queue.recipientHex), own);
    assert.deepEqual([...s.given()], [shared, own]);
    assert.equal((await s.data()).push, true);
  }
  assert.deepEqual(overlap(seven.given(), eight.given()), [shared]);
});

test('turning them on that fails leaves the browser no registration for the space', { skip: !coreReady }, async () => {
  const nine = await space(9);
  nine.open();
  const before = registrations.size;
  refuse = true;
  assert.match((await turnOnPush())!, /the push service did not answer/);
  assert.equal(registrations.size, before);
  assert.equal((await nine.data()).pushScope, '');
  assert.equal((await nine.data()).push, false);
  assert.equal(await turnOnPush(), null);
  assert.equal(registrations.size, before + 1);
});
