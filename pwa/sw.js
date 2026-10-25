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
//   address with a page of its own in the release (the invite page, /i/) gets that page, every
//   other address the app;
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

/** The page an address opens: one of its own the release lists (the invite page, /i/), else the app. */
function pageOf(pathname, release) {
  const pages = [pathname, `${pathname.replace(/\/?$/, '/')}index.html`];
  return pages.find((page) => page.endsWith('.html') && release?.files[page]) ?? '/index.html';
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
  else if (ask === 'seen') event.waitUntil(noticeSeen().then(() => true, () => false).then(answer));
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
// What a counting push holds (push.rs): version 1, flags (none yet), the queue's stream (8 bytes),
// then 4 bytes each: the round, and its totals of messages, of sends that did not say, and of
// calls that rang.
const COUNT_LENGTH = 26;
const TOTALS = ['total', 'unmarked', 'rings'];
// Streams kept to tell a round's next push from a new round: a few queues per space. And for each,
// its last rounds, so a push come late after newer rounds adds only what it had not said.
const STREAMS = 32;
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
// totals so far, so one come late or twice, of a round kept, adds only what it had not said yet.
function counting(kept = [], said) {
  const at = kept.findIndex((round) => round.round === said.round);
  const { added, round } = adding(at < 0 ? null : kept[at], said);
  return { added, stream: at < 0 ? [round, ...kept].slice(0, ROUNDS) : kept.map((was, i) => (i === at ? round : was)) };
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
    lang: knownLang(read?.lang) ? read.lang : 'en',
    streams: keptStreams(read?.streams),
  };
  return notice;
}

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
    if (!bytes || bytes.length !== COUNT_LENGTH || bytes[0] !== 1) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { stream: hex(bytes.subarray(2, 10)), round: view.getUint32(10), total: view.getUint32(14), unmarked: view.getUint32(18), rings: view.getUint32(22) };
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
    try {
      const kept = await readNotice();
      const next = { ...kept, streams: { ...kept.streams } };
      const onScreen = await erevosOnScreen();
      let added = { total: 0, unmarked: 0, rings: 0 };
      if (said) {
        const counted = counting(kept.streams[said.stream], said);
        added = counted.added;
        // Not kept while Erevos is on the screen, which says 'seen' as it leaves it: its own queues
        // are emptied there, so a new round starts.
        if (!onScreen) {
          // The latest last, so the oldest go first.
          delete next.streams[said.stream];
          next.streams[said.stream] = counted.stream;
          for (const stream of Object.keys(next.streams).slice(0, -STREAMS)) delete next.streams[stream];
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
      }
      // On the screen nothing is kept for later, but a push that only rang is still a call.
      const onlyRang = said !== null && added.rings > 0 && added.total === 0 && added.unmarked === 0;
      words = noticeWords(onScreen ? { lang: next.lang, pushes: 0, messages: 0, others: 0, exact: true, rang: onlyRang } : next);
      await writeNotice(next);
    } catch {
      // The notice below shows all the same.
    }
    const shown = Math.max(Date.now(), shownLast + 1);
    shownLast = shown;
    await self.registration.showNotification('Erevos', { body: words, tag: NOTICE, icon: '/icon-192.png', data: { shown } });
    await closeNotices(shown).catch(() => undefined);
  });
}

// Erevos open, or left, starts the count again. The streams go too: kept, they would show anyone who
// can read this browser's storage how many queues got messages, and so that it may hold more than
// one space. A round that goes on after, of a queue Erevos did not empty, then counts again what
// came before, which is still not read.
function noticeSeen() {
  return inTurn(async () => {
    await closeNotices().catch(() => undefined);
    const kept = await readNotice();
    if (kept.pushes !== 0 || kept.messages !== 0 || kept.others !== 0 || !kept.exact || kept.rang || Object.keys(kept.streams).length > 0) {
      await writeNotice({ ...kept, pushes: 0, messages: 0, others: 0, exact: true, rang: false, streams: {} });
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) => {
      const window = open.find((client) => 'focus' in client);
      return window ? window.focus() : self.clients.openWindow('/');
    }),
  );
});
