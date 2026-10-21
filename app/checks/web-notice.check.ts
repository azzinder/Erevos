// The web app's notice while it is closed (pwa/sw.js): how many messages came since Erevos was last
// open ("3 new messages"), as a relay that counts says in its pushes, or else "New message", or
// "New messages" once more pushes came, in the app's language, on an iPhone as on other browsers.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

import { LANGS } from '../lib/i18n';

const WORKER = readFileSync(join(import.meta.dirname, '../../pwa/sw.js'), 'utf8');

type Notice = { title: string; body: string; tag: string; data?: unknown; closed: boolean; close(): void };
type Listener = (event: unknown) => void;

// A browser for the worker: its cache survives a restart of the worker, as a real one does. An
// iPhone keeps every notice of a tag; other browsers replace the one of the same tag.
function browser(kind: 'iphone' | 'other', store = new Map<string, string>()) {
  let notices: Notice[] = [];
  const windows: { visibilityState: string }[] = [];
  let cacheFails = false;
  const caches = {
    open: async () => {
      if (cacheFails) throw new Error('no cache');
      return {
        match: async (key: string) => (store.has(key) ? new Response(store.get(key)) : undefined),
        put: async (key: string, response: Response) => void store.set(key, await response.text()),
      };
    },
  };
  const registration = {
    getNotifications: async ({ tag }: { tag: string }) => notices.filter((notice) => notice.tag === tag && !notice.closed),
    showNotification: async (title: string, options: { body: string; tag: string; data?: unknown }) => {
      if (kind === 'other') notices = notices.filter((notice) => notice.tag !== options.tag);
      notices.push({ title, ...options, closed: false, close() { this.closed = true; } });
    },
  };
  const listeners: Record<string, Listener> = {};
  const self = {
    addEventListener: (type: string, listener: Listener) => void (listeners[type] = listener),
    registration,
    clients: { matchAll: async () => windows },
    location: { origin: 'https://erevos.example' },
  };
  vm.runInContext(WORKER, vm.createContext({ self, caches, Response, URL, crypto, TextEncoder, TextDecoder, setTimeout, fetch: async () => { throw new Error('offline'); } }));

  // Fires an event and waits for what it asked the browser to wait for.
  function fire(type: string, data?: unknown): Promise<unknown> {
    let waiting: Promise<unknown> = Promise.resolve();
    let answer: unknown;
    listeners[type]({ data, ports: [{ postMessage: (value: unknown) => (answer = value) }], waitUntil: (work: Promise<unknown>) => (waiting = work) });
    return waiting.then(() => answer);
  }

  return {
    store,
    windows,
    failCache: () => (cacheFails = true),
    // A push, empty or with what a relay that counts puts in it, as the browser opened it.
    push: (bytes?: Uint8Array) => fire('push', bytes ? { arrayBuffer: () => bytes.slice().buffer } : null),
    tell: (question: Record<string, unknown>) => fire('message', question),
    shown: () => notices.filter((notice) => !notice.closed).map((notice) => notice.body),
    // The pushes counted since Erevos was last open, as the worker keeps them.
    count: () => (JSON.parse(store.get('/__erevos/notice') ?? '{"pushes":0}') as { pushes: number }).pushes,
  };
}

// What a relay that counts puts in a push (crates/erevos-relay/src/push.rs): version 1, flags (1:
// not all of it counted), the queue's stream, the round, and the round's total so far.
function counted(stream: number, round: number, total: number, unsure = false): Uint8Array {
  const bytes = new Uint8Array(18);
  const view = new DataView(bytes.buffer);
  bytes[0] = 1;
  bytes[1] = unsure ? 1 : 0;
  view.setUint32(6, stream);
  view.setUint32(10, round);
  view.setUint32(14, total);
  return bytes;
}

test('pushes while Erevos is closed show one notice, and opening Erevos starts again', async () => {
  const other = browser('other');
  await other.push();
  assert.deepEqual(other.shown(), ['New message']);
  await other.push();
  await other.push();
  assert.deepEqual(other.shown(), ['New messages']);
  assert.equal(other.count(), 3);
  assert.equal(await other.tell({ erevos: 'seen' }), true);
  assert.deepEqual(other.shown(), []);
  assert.equal(other.count(), 0);
  await other.push();
  assert.deepEqual(other.shown(), ['New message']);
});

test('on an iPhone, which keeps every notice, the older ones close once the new one shows', async () => {
  const iphone = browser('iphone');
  await iphone.push();
  await iphone.push();
  await iphone.push();
  assert.deepEqual(iphone.shown(), ['New messages']);
});

test('the count does not live in the notices: swiping them away does not start it again', async () => {
  const iphone = browser('iphone');
  await iphone.push();
  // Swiped away, without opening Erevos.
  const swiped = browser('iphone', iphone.store);
  await swiped.push();
  assert.deepEqual(swiped.shown(), ['New messages']);
  assert.equal(swiped.count(), 2);
});

test('pushes that come together are each counted once', async () => {
  const other = browser('other');
  await Promise.all([other.push(), other.push(), other.push()]);
  assert.equal(other.count(), 3);
  assert.deepEqual(other.shown(), ['New messages']);
  await Promise.all([other.push(), other.tell({ erevos: 'seen' }), other.push()]);
  assert.equal(other.count(), 1);
  assert.deepEqual(other.shown(), ['New message']);
});

test("the notice speaks the app's language, kept when the worker starts again", async () => {
  const first = browser('other');
  assert.equal(await first.tell({ erevos: 'lang', lang: 'el' }), true);
  await first.push();
  assert.deepEqual(first.shown(), ['Νέο μήνυμα']);
  const again = browser('other', first.store);
  await again.push();
  assert.deepEqual(again.shown(), ['Νέα μηνύματα']);
  // A name that is no language here changes nothing.
  for (const lang of ['constructor', '__proto__', 'xx', 42]) await again.tell({ erevos: 'lang', lang });
  await again.tell({ erevos: 'seen' });
  await again.push();
  assert.deepEqual(again.shown(), ['Νέο μήνυμα']);
});

test("every app language has the notice's words", async () => {
  const words: Record<string, [string, string, string]> = {
    en: ['New message', 'New messages', '3 new messages'],
    el: ['Νέο μήνυμα', 'Νέα μηνύματα', '3 νέα μηνύματα'],
    de: ['Neue Nachricht', 'Neue Nachrichten', '3 neue Nachrichten'],
    es: ['Mensaje nuevo', 'Mensajes nuevos', '3 mensajes nuevos'],
    fr: ['Nouveau message', 'Nouveaux messages', '3 nouveaux messages'],
    it: ['Nuovo messaggio', 'Nuovi messaggi', '3 nuovi messaggi'],
    pt: ['Nova mensagem', 'Novas mensagens', '3 novas mensagens'],
    sh: ['Nova poruka', 'Nove poruke', '3 nove poruke'],
  };
  assert.deepEqual(Object.keys(words).sort(), [...LANGS].sort());
  for (const [lang, [one, more, three]] of Object.entries(words)) {
    const other = browser('other');
    await other.tell({ erevos: 'lang', lang });
    await other.push();
    assert.deepEqual(other.shown(), [one]);
    await other.push();
    assert.deepEqual(other.shown(), [more]);
    await other.tell({ erevos: 'seen' });
    await other.push(counted(1, 1, 1));
    assert.deepEqual(other.shown(), [one]);
    await other.push(counted(1, 1, 3));
    assert.deepEqual(other.shown(), [three]);
  }
});

test('Serbo-Croatian says how many with the right ending', async () => {
  const other = browser('other');
  await other.tell({ erevos: 'lang', lang: 'sh' });
  const said: Record<number, string> = {
    2: '2 nove poruke',
    5: '5 novih poruka',
    11: '11 novih poruka',
    12: '12 novih poruka',
    21: '21 nova poruka',
    22: '22 nove poruke',
    101: '101 nova poruka',
    111: '111 novih poruka',
  };
  for (const [total, words] of Object.entries(said)) {
    await other.tell({ erevos: 'seen' });
    await other.push(counted(1, Number(total), Number(total)));
    assert.deepEqual(other.shown(), [words]);
  }
});

test('a relay that counts: the notice says how many messages came, and a push lost or repeated changes nothing', async () => {
  const iphone = browser('iphone');
  await iphone.push(counted(1, 7, 1));
  assert.deepEqual(iphone.shown(), ['New message']);
  // The push for the second message was lost: the next says the round's total.
  await iphone.push(counted(1, 7, 3));
  assert.deepEqual(iphone.shown(), ['3 new messages']);
  await iphone.push(counted(1, 7, 3));
  assert.deepEqual(iphone.shown(), ['3 new messages']);
  // Another space's queue counts apart.
  await iphone.push(counted(2, 9, 2));
  assert.deepEqual(iphone.shown(), ['5 new messages']);
  // Opened, but the messages not yet taken from the relay: the round goes on.
  await iphone.tell({ erevos: 'seen' });
  await iphone.push(counted(1, 7, 4));
  assert.deepEqual(iphone.shown(), ['New message']);
  // Taken: the relay starts a new round.
  await iphone.push(counted(1, 8, 2));
  assert.deepEqual(iphone.shown(), ['3 new messages']);
  // Kept when the worker starts again.
  const again = browser('iphone', iphone.store);
  await again.push(counted(1, 8, 3));
  assert.deepEqual(again.shown(), ['4 new messages']);
});

test('a push come late, from this round or the one before, adds only what it had not said', async () => {
  const other = browser('other');
  const said: string[] = [];
  for (const [round, total] of [[7, 3], [7, 4], [7, 3], [7, 5]]) {
    await other.push(counted(1, round, total));
    said.push(other.shown()[0]);
  }
  assert.deepEqual(said, ['3 new messages', '4 new messages', '4 new messages', '5 new messages']);
  await other.tell({ erevos: 'seen' });
  said.length = 0;
  for (const [round, total] of [[8, 2], [9, 1], [8, 3], [9, 2], [8, 3]]) {
    await other.push(counted(1, round, total));
    said.push(other.shown()[0]);
  }
  assert.deepEqual(said, ['2 new messages', '3 new messages', '4 new messages', '5 new messages', '5 new messages']);
  // Kept as it was when the worker starts again.
  const again = browser('other', other.store);
  await again.push(counted(1, 8, 4));
  assert.deepEqual(again.shown(), ['6 new messages']);
});

test('a push the relay could not count, or an empty one, leaves the number out until Erevos is open', async () => {
  const other = browser('other');
  await other.push(counted(1, 1, 1));
  await other.push(counted(1, 1, 2, true));
  assert.deepEqual(other.shown(), ['New messages']);
  await other.push(counted(1, 1, 3));
  assert.deepEqual(other.shown(), ['New messages']);
  await other.tell({ erevos: 'seen' });
  await other.push(counted(1, 1, 4));
  assert.deepEqual(other.shown(), ['New message']);
  await other.push();
  assert.deepEqual(other.shown(), ['New messages']);
  // What is not a count this worker knows is as an empty push.
  await other.tell({ erevos: 'seen' });
  const later = counted(1, 1, 9);
  later[0] = 2;
  for (const bytes of [later, counted(1, 1, 9).slice(0, 17), new Uint8Array(0)]) await other.push(bytes);
  assert.deepEqual(other.shown(), ['New messages']);
  assert.equal(other.count(), 3);
});

test('a count kept by the worker before counts were sent goes on without a number', async () => {
  const store = new Map([['/__erevos/notice', JSON.stringify({ count: 2, lang: 'el' })]]);
  const iphone = browser('iphone', store);
  await iphone.push(counted(1, 1, 1));
  assert.deepEqual(iphone.shown(), ['Νέα μηνύματα']);
  assert.equal(iphone.count(), 3);
  await iphone.tell({ erevos: 'seen' });
  await iphone.push(counted(1, 1, 3));
  assert.deepEqual(iphone.shown(), ['2 νέα μηνύματα']);
});

test('a push while Erevos is on the screen still shows, but is not counted', async () => {
  const other = browser('other');
  other.windows.push({ visibilityState: 'visible' });
  await other.push();
  await other.push();
  assert.deepEqual(other.shown(), ['New message']);
  assert.equal(other.count(), 0);
  other.windows[0].visibilityState = 'hidden';
  await other.push();
  await other.push();
  assert.deepEqual(other.shown(), ['New messages']);

  // Nor are the messages it says came, when the next push comes with Erevos closed.
  const counting = browser('other');
  counting.windows.push({ visibilityState: 'visible' });
  await counting.push(counted(1, 1, 2));
  counting.windows[0].visibilityState = 'hidden';
  await counting.push(counted(1, 1, 3));
  assert.deepEqual(counting.shown(), ['New message']);
});

test('without its cache the worker still shows a notice for every push', async () => {
  const other = browser('other');
  other.failCache();
  await other.push();
  assert.deepEqual(other.shown(), ['New message']);
  assert.equal(await other.tell({ erevos: 'seen' }), false);
});
