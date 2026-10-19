// Erevos web app: the service worker. It stands between the browser and the server and gives the
// app only code that the owner of the release key signed (README.md). pwa/build.mjs writes the
// public key in place of the mark below.
//
// A release is /release.json, which lists every file of the app with its SHA-256, and
// /release.sig, the Ed25519 signature of release.json's bytes. This worker:
// - on its install, fetches the release, checks the signature and every file's hash, and keeps the
//   files in a cache of their own. Anything that does not match, and it does not install;
// - serves the app from that cache only: a file the release does not list is not served, and
//   nothing of the app comes from the network once installed, so the server cannot change it;
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
};

// Same as the Content-Security-Policy in index.html, for every page served.
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: ws: wss:; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

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
let state = null;

async function readState() {
  if (state) return state;
  const kept = await (await caches.open(META)).match(STATE);
  state = kept ? await kept.json() : { current: null, pending: null, refused: [], checked: 0, error: '' };
  return state;
}

async function writeState(next) {
  state = next;
  await (await caches.open(META)).put(STATE, new Response(JSON.stringify(next), { headers: { 'Content-Type': 'application/json' } }));
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

function respond(path, bytes) {
  const headers = { 'Content-Type': typeOf(path), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  if (path.endsWith('.html')) headers['Content-Security-Policy'] = CSP;
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

/** Puts every file of the release in its cache, taking unchanged ones from the release in use. */
async function store(release, from) {
  const cache = await caches.open(cacheName(release.version));
  const old = from ? await caches.open(cacheName(from.version)) : null;
  for (const [path, hash] of Object.entries(release.files)) {
    if (path === LOADER) continue;
    if (await cache.match(path)) continue;
    const kept = old && from.files[path] === hash ? await old.match(path) : undefined;
    const bytes = kept ? await kept.arrayBuffer() : await fetchFile(path, hash);
    await cache.put(path, respond(path, bytes));
  }
}

async function tell(message) {
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage({ erevos: message });
}

async function refuse(next, reason, version) {
  next.refused = [{ at: Date.now(), reason, version: version ?? null }, ...next.refused].slice(0, REFUSALS);
  await writeState(next);
  await tell({ kind: 'refused', reason });
}

/** Removes the caches of releases neither in use nor waiting. */
async function sweep(next) {
  const keep = new Set([next.current, next.pending].filter(Boolean).map((r) => cacheName(r.version)));
  for (const name of await caches.keys()) if (name.startsWith('erevos-r') && !keep.has(name)) await caches.delete(name);
}

/** Takes the waiting release into use. */
async function promote() {
  const now = await readState();
  if (!now.pending) return;
  const next = { ...now, current: now.pending, pending: null };
  await writeState(next);
  await sweep(next);
}

let checking = null;

/** Looks for a newer release, and gets it ready if it is one. */
function check() {
  checking ??= (async () => {
    const now = await readState();
    const next = { ...now, checked: Date.now(), error: '' };
    let release;
    try {
      release = await fetchRelease();
    } catch (error) {
      if (error instanceof RefusedError) return refuse(next, error.message);
      next.error = `Could not reach the server: ${error.message}`;
      return writeState(next);
    }
    const base = next.pending ?? next.current;
    if (base && release.version < base.version) {
      return refuse(next, `The server offered release ${release.version}, older than ${base.version} in use. An older release may have faults fixed since, so it is refused.`, release.version);
    }
    if (base && release.version === base.version) {
      if (JSON.stringify(release.files) !== JSON.stringify(base.files)) return refuse(next, `The server offered a second, different release ${release.version}.`, release.version);
      return writeState(next);
    }
    try {
      await store(release, next.current);
    } catch (error) {
      await caches.delete(cacheName(release.version));
      if (error instanceof RefusedError) return refuse(next, error.message, release.version);
      next.error = `Could not fetch release ${release.version}: ${error.message}`;
      return writeState(next);
    }
    if (next.current) next.pending = release;
    else next.current = release;
    await writeState(next);
    await sweep(next);
    await tell({ kind: 'update-ready', version: release.version });
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
          const next = { ...now, checked: Date.now(), error: '' };
          if (next.current) next.pending = release;
          else next.current = release;
          await writeState(next);
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
  if (!hash || path === LOADER) return new Response('Not part of this Erevos release.', { status: 404 });
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

async function open(event) {
  // A new release waits for the app to open again in its only window.
  const now = await readState();
  if (now.pending) {
    const windows = await self.clients.matchAll({ type: 'window' });
    if (windows.length <= 1) await promote();
  }
  const response = await serve('/index.html');
  if (Date.now() - (await readState()).checked > CHECK_EVERY_MS) event.waitUntil(check().catch(() => undefined));
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Relays and everything else elsewhere: as the page asked.
  if (url.origin !== self.location.origin) return;
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
  const brief = (release) => release && { version: release.version, created: release.created ?? null, commit: release.commit ?? null };
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
  else if (ask === 'check-loader') {
    event.waitUntil(
      knownLoader(String(event.data.hash)).then(async (known) => {
        // Kept to show; the page that asked raises the alarm itself.
        if (!known) {
          const next = { ...(await readState()) };
          const reason = 'The server sent a new service worker that no signed release lists. It may take over when Erevos next opens.';
          next.refused = [{ at: Date.now(), reason, version: null }, ...next.refused].slice(0, REFUSALS);
          await writeState(next);
        }
        answer({ known });
      }),
    );
  }
});

// A push from the relay (crates/erevos-relay/src/push.rs) carries nothing: it only says that a
// message waits. A browser must show something for each push, and nothing more is known here.
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Erevos', { body: 'New message', tag: 'erevos-new-message', icon: '/icon-192.png' }),
  );
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
