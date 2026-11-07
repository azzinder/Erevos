// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Erevos web app: the service worker. It stands between the browser and the server and gives the
// app only code that the owner of the release key signed (README.md). pwa/build.mjs writes the
// public key in place of the mark below.
//
// A release is /release.json, which lists every file of the app with its SHA-256, and
// /release.sig, the Ed25519 signature of release.json's bytes. This worker:
// - on its install, fetches the release, checks the signature and every file's hash, and keeps the
//   files in a cache of their own. Anything that does not match, and it does not install;
// - serves the app from that cache only: a file the release does not list is not served, and
//   nothing of the app comes from the network once installed, so the server cannot change it. An
//   address with a page of its own in the release (the invite page, /i/, and the contact page,
//   /c/) gets that page, every other address the app;
// - on Element Call's own origin (CALL_ORIGIN, where the app's frame for Matrix calls comes from:
//   app/lib/element-call-window.web.ts), the same, but only Element Call's files (/element-call/),
//   and the app's origin never serves those: so Element Call, signed with the rest, runs apart from
//   the app and can read none of its storage;
// - looks for a newer release now and then, takes it only if it is signed with the same key and
//   has a higher version (an older signed release, with old faults, is refused), and switches to
//   it the next time the app opens;
// - tells the app what it found, refusals included (pwa/boot.js passes it on).
//
// What it cannot do: the browser itself fetches this file again, at least once a day, and installs
// a different one without asking it. pwa/boot.js checks such a new worker against the signed
// release and raises the alarm, but a server that knows it is being checked can answer that check
// differently. README.md says what that leaves.

const KEY = '__EREVOS_PUBLIC_KEY__';
// The app's origin and Element Call's (pwa/build.mjs --origin, --call-origin): none in a web app
// built without Element Call (--no-element-call).
const APP_ORIGIN = '__EREVOS_APP_ORIGIN__';
const CALL_ORIGIN = '__EREVOS_CALL_ORIGIN__';
const LOADER = '/sw.js';
const RELEASE = '/release.json';
const SIGNATURE = '/release.sig';
const META = 'erevos-meta';
const STATE = '/__erevos/state';
const CHECK_EVERY_MS = 6 * 3600 * 1000;
// Refusals kept to show.
const REFUSALS = 10;

const TYPES = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  wasm: 'application/wasm',
  css: 'text/css; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
};

// Same as the Content-Security-Policy in index.html, for every page served; with Element Call's
// origin as the one frame the app may show.
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: https: ws: wss:; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
// Element Call's pages, on its origin: as pwa/element-call.mjs says (CALL_CSP), shown only in the
// app's frame.
const CALL_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' blob: data: https: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'";
const ELEMENT_CALL = '/element-call/';
const CALLS = /^https?:\/\//.test(CALL_ORIGIN);
const ON_CALL_ORIGIN = CALLS && self.location.origin === CALL_ORIGIN;
const POLICY = ON_CALL_ORIGIN ? `${CALL_CSP}; frame-ancestors ${APP_ORIGIN}` : CALLS ? `${CSP}; frame-src ${CALL_ORIGIN}` : CSP;
// As on Android (app/modules/erevos-webcall): Element Call's frame reaches no tracker, and not the
// homeserver itself, which it reaches only through Erevos (the Widget API). With its empty config
// it should ask none of them anyway.
const REFUSED_HOSTS = ['posthog.com', 'sentry.io', 'google.com', 'googleapis.com', 'gstatic.com', 'recaptcha.net', 'jsdelivr.net'];
const refusedToCall = (url) => REFUSED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) || url.pathname.startsWith('/_matrix/');

const cacheName = (version) => `erevos-r${version}`;

function fromBase64(text) {
  return Uint8Array.from(atob(text.trim()), (c) => c.charCodeAt(0));
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(bytes) {
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

let publicKey = null;

async function theKey() {
  publicKey ??= crypto.subtle.importKey('raw', fromBase64(KEY), { name: 'Ed25519' }, false, ['verify']);
  return publicKey;
}

/** The key's fingerprint, as README.md and the deploy script show it: SHA-256 of the raw key. */
async function fingerprint() {
  return (await sha256(fromBase64(KEY)))
    .slice(0, 32)
    .match(/.{4}/g)
    .join(' ');
}

class RefusedError extends Error {}

// What the worker remembers between starts: the release in use, one waiting to be used, refusals.
// `state` is the last one read or written, for reading; every change goes through changeState.
let state = null;

async function loadState() {
  const kept = await (await caches.open(META)).match(STATE);
  return kept ? await kept.json() : { current: null, pending: null, refused: [], checked: 0, error: '' };
}

async function readState() {
  if (!state) {
    const loaded = await loadState();
    state ??= loaded;
  }
  return state;
}

let changes = Promise.resolve();

/**
 * Changes the state, one change at a time, each made on the state as it is kept right then, read
 * again from the cache (a new worker, installing, writes it too), never on a copy taken before an
 * await: a check that waited on the network does not undo a promote made meanwhile, which would put
 * back a release whose cache sweep had deleted. `change` edits the state it is given; when it gives
 * false, nothing is written. Gives the state as it is after.
 */
function changeState(change) {
  const done = changes.then(async () => {
    const next = await loadState();
    if (change(next) === false) return (state = next);
    await (await caches.open(META)).put(STATE, new Response(JSON.stringify(next), { headers: { 'Content-Type': 'application/json' } }));
    return (state = next);
  });
  changes = done.catch(() => undefined);
  return done;
}

function shapeOf(release) {
  if (!release || release.app !== 'erevos-web' || !Number.isSafeInteger(release.version) || release.version < 1) return false;
  if (!release.files || typeof release.files !== 'object') return false;
  for (const [path, hash] of Object.entries(release.files)) {
    if (!/^\/[\w.@/-]+$/.test(path) || path.includes('..') || !/^[0-9a-f]{64}$/.test(hash)) return false;
  }
  return Boolean(release.files['/index.html'] && release.files[LOADER]);
}

/** The release the server offers now, once its signature is checked. Throws RefusedError if it is not signed with the key. */
async function fetchRelease() {
  const [body, signature] = await Promise.all([
    fetch(RELEASE, { cache: 'no-store' }).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`release.json: ${r.status}`)))),
    fetch(SIGNATURE, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`release.sig: ${r.status}`)))),
  ]);
  let signed = false;
  try {
    signed = await crypto.subtle.verify({ name: 'Ed25519' }, await theKey(), fromBase64(signature), body);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotSupportedError') {
      throw new RefusedError('This browser cannot check Ed25519 signatures. Erevos needs iOS 17, Safari 17, Chrome 137, Firefox 129 or later.');
    }
    throw new RefusedError('The release signature could not be read.');
  }
  if (!signed) throw new RefusedError('The server offered a release that is not signed with the Erevos release key.');
  const release = JSON.parse(new TextDecoder().decode(body));
  if (!shapeOf(release)) throw new RefusedError('The server offered a signed release this worker does not understand.');
  return release;
}

function typeOf(path) {
  return TYPES[path.split('.').pop()] ?? 'application/octet-stream';
}

/** Whether `path` is served on this origin: Element Call's files only on its own. */
const servedHere = (path) => path.startsWith(ELEMENT_CALL) === ON_CALL_ORIGIN;

function respond(path, bytes) {
  const headers = { 'Content-Type': typeOf(path), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  if (path.endsWith('.html')) headers['Content-Security-Policy'] = POLICY;
  return new Response(bytes, { headers });
}

/** Fetches one file of a release and checks it against its hash. */
async function fetchFile(path, hash) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const bytes = await response.arrayBuffer();
  if ((await sha256(bytes)) !== hash) throw new RefusedError(`${path} is not the file the signed release lists.`);
  return bytes;
}

/** Puts every file of the release served here in its cache, taking unchanged ones from the release in use. */
async function store(release, from) {
  const cache = await caches.open(cacheName(release.version));
  const old = from ? await caches.open(cacheName(from.version)) : null;
  for (const [path, hash] of Object.entries(release.files)) {
    if (path === LOADER || !servedHere(path)) continue;
    if (await cache.match(path)) continue;
    const kept = old && from.files[path] === hash ? await old.match(path) : undefined;
    const bytes = kept ? await kept.arrayBuffer() : await fetchFile(path, hash);
    await cache.put(path, respond(path, bytes));
  }
}

async function tell(message) {
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage({ erevos: message });
}

/** Keeps a refusal to show (with `also`, any other change to make with it), and says so to the windows. */
async function refuse(reason, version, also = () => undefined) {
  await changeState((next) => {
    also(next);
    next.refused = [{ at: Date.now(), reason, version: version ?? null }, ...next.refused].slice(0, REFUSALS);
  });
  await tell({ kind: 'refused', reason });
}

// The release whose files check is putting in its cache now, which the state names only after.
let storing = null;

/** Removes the caches of releases neither in use, nor waiting, nor being stored. */
async function sweep(next) {
  const keep = new Set([next.current, next.pending, storing].filter(Boolean).map((r) => cacheName(r.version)));
  for (const name of await caches.keys()) if (name.startsWith('erevos-r') && !keep.has(name)) await caches.delete(name);
}

/** Takes the waiting release into use. */
async function promote() {
  let moved = false;
  const next = await changeState((now) => {
    if (!now.pending) return false;
    now.current = now.pending;
    now.pending = null;
    moved = true;
  });
  if (moved) await sweep(next);
}

/** Names `release` as the one to use, or to use next when one is in use; false if one as new or newer is named already. */
function nameRelease(now, release) {
  const base = now.pending ?? now.current;
  if (base && base.version >= release.version) return false;
  if (now.current) now.pending = release;
  else now.current = release;
  return true;
}

let checking = null;

/** Looks for a newer release, and gets it ready if it is one. */
function check() {
  checking ??= (async () => {
    const checked = Date.now();
    // Each change is made on the state as it is when it is written (changeState), not as it was
    // when this began: a promote while the server was asked stays.
    const noted =
      (error = '') =>
      (next) => {
        next.checked = checked;
        next.error = error;
      };
    let release;
    try {
      release = await fetchRelease();
    } catch (error) {
      if (error instanceof RefusedError) return refuse(error.message, undefined, noted());
      return changeState(noted(`Could not reach the server: ${error.message}`));
    }
    const now = await readState();
    const base = now.pending ?? now.current;
    if (base && release.version < base.version) {
      return refuse(`The server offered release ${release.version}, older than ${base.version} in use. An older release may have faults fixed since, so it is refused.`, release.version, noted());
    }
    if (base && release.version === base.version) {
      if (JSON.stringify(release.files) !== JSON.stringify(base.files)) return refuse(`The server offered a second, different release ${release.version}.`, release.version, noted());
      return changeState(noted());
    }
    storing = release;
    try {
      await store(release, now.current);
    } catch (error) {
      await caches.delete(cacheName(release.version));
      if (error instanceof RefusedError) return refuse(error.message, release.version, noted());
      return changeState(noted(`Could not fetch release ${release.version}: ${error.message}`));
    } finally {
      storing = null;
    }
    let named = false;
    const next = await changeState((then) => {
      noted()(then);
      named = nameRelease(then, release);
    });
    await sweep(next);
    if (named) await tell({ kind: 'update-ready', version: release.version });
  })().finally(() => {
    checking = null;
  });
  return checking;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const now = await readState();
      try {
        const release = await fetchRelease();
        const base = now.pending ?? now.current;
        if (base && release.version < base.version) throw new RefusedError(`Release ${release.version} is older than ${base.version}.`);
        if (!base || release.version > base.version) {
          await store(release, now.current);
          // On the state as it is now: the worker in use may have changed it while this fetched.
          await changeState((next) => {
            if (!nameRelease(next, release)) return false;
            next.checked = Date.now();
            next.error = '';
          });
        }
      } catch (error) {
        await tell({ kind: 'install-failed', reason: error.message });
        throw error;
      }
      // The first worker takes over at once; a later one waits until no window is open.
      if (!now.current) await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      state = null;
      await promote();
      await self.clients.claim();
    })(),
  );
});

/** A file of the release in use, from its cache, or fetched again and checked if the browser lost it. */
async function serve(path) {
  const { current } = await readState();
  if (!current) return new Response('Erevos is not installed yet.', { status: 503 });
  const hash = current.files[path];
  if (!hash || path === LOADER || !servedHere(path)) return new Response('Not part of this Erevos release.', { status: 404 });
  const cache = await caches.open(cacheName(current.version));
  const hit = await cache.match(path);
  if (hit) return hit;
  try {
    const response = respond(path, await fetchFile(path, hash));
    await cache.put(path, response.clone());
    return response;
  } catch (error) {
    return new Response(`Erevos could not load ${path}: ${error.message}`, { status: 502 });
  }
}

/** The page an address opens: one of its own the release lists (the invite page, /i/, and the
 *  contact page, /c/), else the app. On Element Call's origin only its pages, else none. */
function pageOf(pathname, release) {
  const pages = [pathname, `${pathname.replace(/\/?$/, '/')}index.html`];
  const own = pages.find((page) => page.endsWith('.html') && release?.files[page] && servedHere(page));
  return own ?? (ON_CALL_ORIGIN ? pathname : '/index.html');
}

async function open(event) {
  // A new release waits for the app to open again in its only window.
  const now = await readState();
  if (now.pending) {
    const windows = await self.clients.matchAll({ type: 'window' });
    if (windows.length <= 1) await promote();
  }
  const response = await serve(pageOf(new URL(event.request.url).pathname, (await readState()).current));
  if (Date.now() - (await readState()).checked > CHECK_EVERY_MS) event.waitUntil(check().catch(() => undefined));
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Relays and everything else elsewhere: as the page asked.
  if (url.origin !== self.location.origin) {
    if (ON_CALL_ORIGIN && refusedToCall(url)) event.respondWith(new Response('', { status: 403 }));
    return;
  }
  // The release and this worker are only read, for checks, never run from here.
  if (url.pathname === RELEASE || url.pathname === SIGNATURE || url.pathname === LOADER) return;
  if (event.request.method !== 'GET') {
    event.respondWith(new Response('', { status: 405 }));
    return;
  }
  event.respondWith(event.request.mode === 'navigate' ? open(event) : serve(url.pathname));
});

async function status() {
  const now = await readState();
  const brief = (release) =>
    release && {
      version: release.version,
      label: typeof release.label === 'string' ? release.label : null,
      created: release.created ?? null,
      commit: release.commit ?? null,
    };
  return { current: brief(now.current), pending: brief(now.pending), refused: now.refused, checked: now.checked, error: now.error, key: await fingerprint() };
}

/** Whether a worker script with this hash is one a signed release lists. */
async function knownLoader(hash) {
  const now = await readState();
  if ([now.current, now.pending].some((release) => release?.files[LOADER] === hash)) return true;
  try {
    const release = await fetchRelease();
    const base = now.pending ?? now.current;
    return release.files[LOADER] === hash && (!base || release.version >= base.version);
  } catch {
    return false;
  }
}

self.addEventListener('message', (event) => {
  const ask = event.data?.erevos;
  const answer = (value) => event.ports[0]?.postMessage(value);
  if (ask === 'status') event.waitUntil(status().then(answer));
  else if (ask === 'check') event.waitUntil(check().then(status).then(answer));
  else if (ask === 'lang') event.waitUntil(noticeLanguage(event.data.lang).then(() => true, () => false).then(answer));
  else if (ask === 'seen') event.waitUntil(noticeSeen(event.data.at).then(() => true, () => false).then(answer));
  else if (ask === 'badge') event.waitUntil(noticeUnread(event.data.unread, event.data.off === true, event.data.at).then(() => true, () => false).then(answer));
  else if (ask === 'check-loader') {
    event.waitUntil(
      knownLoader(String(event.data.hash)).then(async (known) => {
        // Kept to show; the page that asked raises the alarm itself.
        if (!known) {
          const reason = 'The server sent a new service worker that no signed release lists. It may take over when Erevos next opens.';
          await changeState((next) => {
            next.refused = [{ at: Date.now(), reason, version: null }, ...next.refused].slice(0, REFUSALS);
          });
        }
        answer({ known });
      }),
    );
  }
});

// A push from the relay (crates/erevos-relay/src/push.rs) says that something came into one of
// this browser's queues, at most once in 15 seconds. When the app gave the relay this browser's
// keys for the push address (lib/web-push.web.ts), the push carries, encrypted for this browser,
// what came into that queue since the app last took it: the queue's stream, a round that starts
// again each time the queue is emptied, and the round's totals so far: messages, sends that did not
// say what they carry, and calls that rang. So a push that was lost, or that comes late or twice,
// does not count anything twice, and word between phones (that a message came or was read, new
// keys) counts for nothing. The notice then says how many: "3 new messages", or "Call" when only a
// call rang. Otherwise it says "New message", or "New messages" once more came since Erevos was
// last open, without a number: when a push came empty (an older relay, or a browser that gave no
// keys), or a send did not say what it carries (a sender's Erevos too old to say, or a message
// phones nearby carried to the relay, which cannot know what it holds), until Erevos is open again.
// In the app's language, which the app tells this worker ('lang'); the app says when it is open
// again ('seen'). The count is kept apart from the release state above, so a release check never
// undoes it, and not in the notices themselves: an iPhone keeps every notice of the same tag and
// may list them in any order, and swiping one away would start it again.
//
// The pushes also put a number on Erevos's icon (the Badging API: an iPhone shows it from iOS 16.4,
// for the web app on the home screen once notifications are allowed): the messages the open space
// had not read when the app last counted them ('badge', lib/push-notice.web.ts), and those the
// pushes said came since, each push that did not say how many as one. Counted apart from the
// notice: Erevos opened without a space (at its password) has not read them, so only the app's
// count starts it again. The app counts only a space with notifications on, and never a hidden
// chat; no push comes for one (lib/web-push.web.ts). Turned off in the app, there is no number:
// the pushes count none until the app says one again.
const NOTICE = 'erevos-new-message';
const NOTICE_STATE = '/__erevos/notice';
// For each language: one message, more than one with no number, so many, and a call.
const NOTICE_WORDS = {
  en: ['New message', 'New messages', (n) => `${n} new messages`, 'Call'],
  el: ['Νέο μήνυμα', 'Νέα μηνύματα', (n) => `${n} νέα μηνύματα`, 'Κλήση'],
  de: ['Neue Nachricht', 'Neue Nachrichten', (n) => `${n} neue Nachrichten`, 'Anruf'],
  es: ['Mensaje nuevo', 'Mensajes nuevos', (n) => `${n} mensajes nuevos`, 'Llamada'],
  fr: ['Nouveau message', 'Nouveaux messages', (n) => `${n} nouveaux messages`, 'Appel'],
  it: ['Nuovo messaggio', 'Nuovi messaggi', (n) => `${n} nuovi messaggi`, 'Chiamata'],
  pt: ['Nova mensagem', 'Novas mensagens', (n) => `${n} novas mensagens`, 'Chamada'],
  sh: [
    'Nova poruka',
    'Nove poruke',
    (n) => {
      const ten = n % 10;
      const hundred = n % 100;
      if (ten === 1 && hundred !== 11) return `${n} nova poruka`;
      if (ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14)) return `${n} nove poruke`;
      return `${n} novih poruka`;
    },
    'Poziv',
  ],
};
// What a counting push holds (push.rs): version 1, flags, the queue's stream (8 bytes), then 4
// bytes each: the round, and its totals of messages, of sends that did not say, and of calls that
// rang; with the flag SENT_AT, 4 more: when it was sent, in seconds since 1970 (from an older relay
// none).
const COUNT_LENGTH = 26;
const SENT_AT = 1;
// A push of a round this worker had none of, sent more than this many seconds before the app last
// took from its relay (as it said with 'seen' or 'badge'), was held back by its push service (the
// phone was offline): what it says the app has, so it counts nothing, and what comes after it in
// its round counts. The relay's clock is put on the phone's by how late the last LAGS pushes came,
// by the phone's clock, the least of them: a push never comes before it is sent, so that is how far
// the phone's clock is ahead of the relay's, or a little more (when it is behind, nothing is put).
const CLOCKS_DIFFER = 30;
const LAGS = 32;
const TOTALS = ['total', 'unmarked', 'rings'];
// Streams kept to tell a round's next push from a new round: one for each queue that pushed since
// Erevos was last open, a few for each space and one for each contact who wrote (a queue of their
// own, lib/push-queues.ts). And for each, its last rounds, so a push come late after newer rounds
// adds only what it had not said. As many rounds are kept told, with no stream (noticeSeen).
const STREAMS = 128;
const ROUNDS = 8;

const knownLang = (lang) => typeof lang === 'string' && Object.hasOwn(NOTICE_WORDS, lang);
const whole = (n) => (Number.isSafeInteger(n) && n > 0 ? n : 0);
const word32 = (n) => Number.isSafeInteger(n) && n >= 0 && n < 2 ** 32;

// A round as kept: a total missing (kept by a worker from before it was told) is none.
function keptRound(at) {
  if (!word32(at?.round)) return null;
  const round = { round: at.round };
  for (const total of TOTALS) round[total] = word32(at[total]) ? at[total] : 0;
  return round;
}

// The rounds told, the latest first: none from a worker from before.
function keptTold(read) {
  return Array.isArray(read) ? read.slice(0, STREAMS).map(keptRound).filter(Boolean) : [];
}

// Each stream's rounds, the newest first. A worker from before kept a round and the one before it.
function keptStreams(read) {
  const streams = {};
  if (read && typeof read === 'object' && !Array.isArray(read)) {
    for (const [stream, at] of Object.entries(read).slice(-STREAMS)) {
      const rounds = (Array.isArray(at) ? at : [at, at?.before]).slice(0, ROUNDS).map(keptRound).filter(Boolean);
      if (/^[0-9a-f]{16}$/.test(stream) && rounds.length > 0) streams[stream] = rounds;
    }
  }
  return streams;
}

// What a push adds to a round as kept (none: a round not seen yet), and the round as it is then.
function adding(kept, said) {
  const added = {};
  const round = { round: said.round };
  for (const total of TOTALS) {
    const had = kept ? kept[total] : 0;
    added[total] = Math.max(0, said[total] - had);
    round[total] = Math.max(had, said[total]);
  }
  return { added, round };
}

// What a push adds to its stream, and the stream's rounds as they are then. A push says its round's
// totals so far, so one come late or twice, of a round kept or told, adds only what it had not said
// yet; one of a round neither, sent `before` (CLOCKS_DIFFER), adds nothing.
function counting(kept = [], said, told = [], before = false) {
  const at = kept.findIndex((round) => round.round === said.round);
  const was = at < 0 ? (told.find((round) => round.round === said.round) ?? (before ? said : null)) : kept[at];
  const { added, round } = adding(was, said);
  return { added, stream: at < 0 ? [round, ...kept].slice(0, ROUNDS) : kept.map((was, i) => (i === at ? round : was)) };
}

// The rounds of `streams` added to those told, without their streams: a round told twice keeps the
// larger totals. The latest first, as many as STREAMS.
function telling(told, streams) {
  let next = told;
  for (const rounds of Object.values(streams)) {
    for (const round of [...rounds].reverse()) {
      const was = next.find((at) => at.round === round.round);
      next = [was ? adding(was, round).round : round, ...next.filter((at) => at !== was)];
    }
  }
  return next.slice(0, STREAMS);
}

let notice = null;

async function readNotice() {
  if (notice) return notice;
  const kept = await (await caches.open(META)).match(NOTICE_STATE);
  const read = kept ? await kept.json().catch(() => null) : null;
  // Kept by a worker from before the counts: `count` was its pushes.
  const pushes = whole(read?.pushes ?? read?.count);
  const exact = typeof read?.exact === 'boolean' ? read.exact : pushes === 0;
  notice = {
    pushes,
    messages: whole(read?.messages),
    // Pushes and sends that did not say what they carry: what "New messages" counts when there is
    // no number.
    others: whole(read?.others ?? (exact ? 0 : pushes)),
    exact,
    rang: read?.rang === true,
    // For the number on the icon: what the open space had not read when the app last counted, and
    // what pushes said came since, by streams of their own.
    unread: whole(read?.unread),
    came: whole(read?.came),
    cameStreams: keptStreams(read?.cameStreams),
    iconOff: read?.iconOff === true,
    lang: knownLang(read?.lang) ? read.lang : 'en',
    streams: keptStreams(read?.streams),
    told: keptTold(read?.told),
    // When the app last took from its relay, as it said with 'seen', and with 'badge', in seconds
    // since 1970: none from a worker or an app from before.
    seenAt: word32(read?.seenAt) ? read.seenAt : 0,
    countedAt: word32(read?.countedAt) ? read.countedAt : 0,
    // How late the last pushes came, in seconds, the latest first (CLOCKS_DIFFER).
    lags: Array.isArray(read?.lags) ? read.lags.filter(Number.isSafeInteger).slice(0, LAGS) : [],
  };
  return notice;
}

// Now, in seconds since 1970, as the relay says when a push was sent.
const nowSeconds = () => Math.floor(Date.now() / 1000);

// When the app says it last took from its relay: the latest it said, as what it took stays taken.
// None from an app from before, nor a time later than now, as from a clock that was set back since.
const tookSince = (at, kept) => {
  const now = nowSeconds();
  return Math.max(kept <= now ? kept : 0, word32(at) && at <= now ? at : 0);
};

// Whether a push was sent before `since`, with the phone's clock `ahead` of the relay's
// (CLOCKS_DIFFER): never one that does not say when.
const sentBefore = (said, since, ahead) => said.sentAt !== undefined && since > 0 && said.sentAt + ahead + CLOCKS_DIFFER < since;

async function writeNotice(next) {
  notice = next;
  await (await caches.open(META)).put(NOTICE_STATE, new Response(JSON.stringify(next), { headers: { 'Content-Type': 'application/json' } }));
}

// One change of the count at a time: two pushes, or a push and 'seen', must not both read the old
// count and the later write undo the other.
let noticeTurn = Promise.resolve();

function inTurn(work) {
  const run = noticeTurn.then(work);
  noticeTurn = run.catch(() => undefined);
  return run;
}

// An iPhone keeps every notice of the same tag where other browsers replace it, so the older ones
// are closed once the new one shows. Best effort: an iPhone ignores this for a notice shown less
// than 30 seconds ago.
async function closeNotices(keep) {
  for (const shown of await self.registration.getNotifications({ tag: NOTICE })) {
    if (keep === undefined || shown.data?.shown !== keep) shown.close();
  }
}

// How long the number on the icon is waited for, in milliseconds: a browser that never answers
// must not hold back the notices after it.
const BADGE_WAIT = 2000;

// The number on Erevos's icon, or none. Best effort: a browser without badges, or an iPhone where
// notifications are not allowed, shows none.
async function showBadge({ unread, came }) {
  const badges = self.navigator;
  if (typeof badges?.setAppBadge !== 'function') return;
  const count = Math.min(unread + came, Number.MAX_SAFE_INTEGER);
  let timer;
  try {
    const asked = count > 0 ? badges.setAppBadge(count) : badges.clearAppBadge?.();
    await Promise.race([asked, new Promise((done) => (timer = setTimeout(done, BADGE_WAIT)))]);
  } catch {
    // Not allowed: nothing to show it on.
  } finally {
    clearTimeout(timer);
  }
}

// A stream's rounds as kept, the latest last, so the oldest go first.
function keepStream(streams, stream, rounds) {
  delete streams[stream];
  streams[stream] = rounds;
  for (const old of Object.keys(streams).slice(0, -STREAMS)) delete streams[old];
}

// Erevos on the screen sees the message itself, so it is not counted; the notice still shows,
// since a browser may stop the pushes of a worker that shows nothing.
async function erevosOnScreen() {
  const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return open.some((client) => client.visibilityState === 'visible');
}

// The count a push holds, or null when it holds none this worker can read.
function countIn(data) {
  try {
    const bytes = data ? new Uint8Array(data.arrayBuffer()) : null;
    if (!bytes || bytes[0] !== 1) return null;
    const timed = (bytes[1] & SENT_AT) !== 0;
    if (bytes.length !== COUNT_LENGTH + (timed ? 4 : 0)) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const said = { stream: hex(bytes.subarray(2, 10)), round: view.getUint32(10), total: view.getUint32(14), unmarked: view.getUint32(18), rings: view.getUint32(22) };
    if (timed) said.sentAt = view.getUint32(26);
    return said;
  } catch {
    return null;
  }
}

function noticeWords(kept) {
  const [one, more, many, call] = NOTICE_WORDS[kept.lang];
  if (!kept.exact) return kept.messages + kept.others > 1 ? more : one;
  // Only a call rang: no message to tell of.
  if (kept.messages === 0 && kept.rang) return call;
  return kept.messages > 1 ? many(kept.messages) : one;
}

let shownLast = 0;

function showNotice(said) {
  return inTurn(async () => {
    let words = NOTICE_WORDS.en[0];
    let icon = null;
    try {
      const kept = await readNotice();
      const next = { ...kept, streams: { ...kept.streams }, cameStreams: { ...kept.cameStreams } };
      const onScreen = await erevosOnScreen();
      let added = { total: 0, unmarked: 0, rings: 0 };
      if (said?.sentAt !== undefined) next.lags = [nowSeconds() - said.sentAt, ...kept.lags].slice(0, LAGS);
      // Put back only when the phone is ahead: lags kept of a relay that was ahead of it (another
      // relay, or a clock set right since) would make what comes now look older, and count nothing.
      const ahead = Math.max(0, Math.min(...next.lags));
      if (said) {
        const counted = counting(kept.streams[said.stream], said, kept.told, sentBefore(said, kept.seenAt, ahead));
        added = counted.added;
        // Not kept while Erevos is on the screen, which says 'seen' as it leaves it: its own queues
        // are emptied there, so a new round starts.
        if (!onScreen) keepStream(next.streams, said.stream, counted.stream);
        // The icon counts by streams of its own, kept until the app counts.
        if (!onScreen && !kept.iconOff) {
          const forIcon = counting(kept.cameStreams[said.stream], said, kept.told, sentBefore(said, kept.countedAt, ahead));
          keepStream(next.cameStreams, said.stream, forIcon.stream);
          next.came = kept.came + forIcon.added.total + forIcon.added.unmarked;
        }
      }
      if (!onScreen) {
        // A push that holds no count is one thing that came, not said what.
        const others = said === null ? 1 : added.unmarked;
        next.pushes = kept.pushes + 1;
        next.messages = kept.messages + added.total;
        next.others = kept.others + others;
        next.exact = kept.exact && others === 0;
        next.rang = kept.rang || added.rings > 0;
        if (said === null && !kept.iconOff) next.came = kept.came + 1;
      }
      // On the screen nothing is kept for later, but a push that only rang is still a call.
      const onlyRang = said !== null && added.rings > 0 && added.total === 0 && added.unmarked === 0;
      words = noticeWords(onScreen ? { lang: next.lang, pushes: 0, messages: 0, others: 0, exact: true, rang: onlyRang } : next);
      icon = next;
      await writeNotice(next);
    } catch {
      // The notice below shows all the same.
    }
    const shown = Math.max(Date.now(), shownLast + 1);
    shownLast = shown;
    // Sounds each time: other browsers replace a notice of the same tag silently without it.
    await self.registration.showNotification('Erevos', { body: words, tag: NOTICE, renotify: true, icon: '/icon-192.png', data: { shown } });
    await closeNotices(shown).catch(() => undefined);
    // After the notice, which must show whatever the icon does.
    if (icon) await showBadge(icon);
  });
}

// Erevos open, or left, starts the count again. The streams go too: kept, they would show anyone who
// can read this browser's storage how many queues got messages, so how many contacts wrote, and
// that it may hold more than one space. Their rounds stay, told, with no stream: the relay draws
// each at random, so they name no queue. A push of one that comes late, for messages Erevos took
// meanwhile, then adds nothing, and a round that goes on, of a queue Erevos did not empty, adds
// only what came since. So does a push of a round not seen here before, sent before the app last
// took from its relay (`at`, seenAt): its push service held it back. Not the number on the icon:
// that waits for the app to count ('badge').
function noticeSeen(at) {
  return inTurn(async () => {
    await closeNotices().catch(() => undefined);
    const kept = await readNotice();
    await writeNotice({ ...kept, pushes: 0, messages: 0, others: 0, exact: true, rang: false, streams: {}, told: telling(kept.told, kept.streams), seenAt: tookSince(at, kept.seenAt) });
  });
}

// What the open space has not read, as the app counted it: the number on the icon, from which the
// pushes count again. Their streams go then, as above, their rounds told: a round that goes on adds
// only what came since, so what the app had not taken of it (another space's) is no longer counted,
// nor a round not seen here before that a push sent before the app last took from its relay says
// (`at`, countedAt). Or no number at all (`off`).
function noticeUnread(unread, off, at) {
  return inTurn(async () => {
    let next = { unread: off ? 0 : whole(unread), came: 0 };
    try {
      const kept = await readNotice();
      next = { ...kept, unread: next.unread, came: 0, cameStreams: {}, told: telling(kept.told, kept.cameStreams), iconOff: off, countedAt: tookSince(at, kept.countedAt) };
      await writeNotice(next);
    } finally {
      await showBadge(next);
    }
  });
}

function noticeLanguage(lang) {
  if (!knownLang(lang)) return Promise.resolve();
  return inTurn(async () => {
    const kept = await readNotice();
    if (kept.lang !== lang) await writeNotice({ ...kept, lang });
  });
}

self.addEventListener('push', (event) => {
  // Read at once: the push's data is the event's.
  event.waitUntil(showNotice(countIn(event.data)));
});

// The browser changed its push address, or dropped it: the app, if open, gives the relay the new
// one (lib/web-push.web.ts), else it does when it next opens. The worker cannot: the queues it is
// for are the app's, sealed. Nothing is kept.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(tell('push-changed'));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) => {
      const window = open.find((client) => 'focus' in client);
      return window ? window.focus() : self.clients.openWindow('/');
    }),
  );
});
