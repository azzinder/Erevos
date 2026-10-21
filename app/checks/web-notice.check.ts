// The web app's notice while it is closed (pwa/sw.js): "New message", or "New messages" once more
// pushes came since Erevos was last open, in the app's language, on an iPhone as on other
// browsers. Run with: npm run check
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
    push: () => fire('push'),
    tell: (question: Record<string, unknown>) => fire('message', question),
    shown: () => notices.filter((notice) => !notice.closed).map((notice) => notice.body),
    // The pushes counted since Erevos was last open, as the worker keeps them.
    count: () => (JSON.parse(store.get('/__erevos/notice') ?? '{"count":0}') as { count: number }).count,
  };
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
  const words: Record<string, [string, string]> = {
    en: ['New message', 'New messages'],
    el: ['Νέο μήνυμα', 'Νέα μηνύματα'],
    de: ['Neue Nachricht', 'Neue Nachrichten'],
    es: ['Mensaje nuevo', 'Mensajes nuevos'],
    fr: ['Nouveau message', 'Nouveaux messages'],
    it: ['Nuovo messaggio', 'Nuovi messaggi'],
    pt: ['Nova mensagem', 'Novas mensagens'],
    sh: ['Nova poruka', 'Nove poruke'],
  };
  assert.deepEqual(Object.keys(words).sort(), [...LANGS].sort());
  for (const [lang, [one, more]] of Object.entries(words)) {
    const other = browser('other');
    await other.tell({ erevos: 'lang', lang });
    await other.push();
    assert.deepEqual(other.shown(), [one]);
    await other.push();
    assert.deepEqual(other.shown(), [more]);
  }
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
});

test('without its cache the worker still shows a notice for every push', async () => {
  const other = browser('other');
  other.failCache();
  await other.push();
  assert.deepEqual(other.shown(), ['New message']);
  assert.equal(await other.tell({ erevos: 'seen' }), false);
});
