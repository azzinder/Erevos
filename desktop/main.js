/**
 * Erevos on a computer (Linux, macOS and Windows): the app's web build in Electron, as LPHL FASOULI
 * does it.
 *
 * The app is served from its own origin, app://erevos, which also answers the shell paths the app
 * uses (app/lib/shell.ts), only with the token the page was given in its address (#erevos-token=…):
 *   /__secret?key=…            the keystore: small values sealed with the system's keyring (on a
 *                              Mac the Keychain, on Windows the user's own key), in secrets.json
 * Reading what is not there answers 204, no content.
 *   /__file?name=…             the app's own files, already sealed by the app, in the folder files/
 *   /__files?prefix=…          their names
 *   /__folder                  asks for a folder for backups and remembers it (folders.json)
 *   /__backup?folder=&name=&keep=  writes a backup there, deleting older ones but the newest `keep`
 *   /__pick?most=…             asks for a file to open (a backup, a chat export) and gives its bytes
 *   /__save?name=…             asks where to save a photo or file from a chat and writes it there
 *   /__lan                     Erevos on the same Wi-Fi (lan.js): PUT ?on=1 or 0 starts or stops
 *                              it, POST ?link=… sends the body on a link, GET ?after=… gives what
 *                              happened since, waiting a while for something
 *   /__latest                  the latest release's version.json (app/lib/updates.ts), asked for
 *                              here: GitHub's downloads do not answer a page's own requests
 *   /__webdav?method=&url=     one request to the WebDAV server automatic backups go to, or are
 *                              restored from (app/lib/backup-cloud.ts), asked for here: such
 *                              servers do not answer a page's own requests (CORS). Only https,
 *                              only PROPFIND, PUT, GET and DELETE, only the headers Authorization,
 *                              Depth and Content-Type, no cookies, no redirects; answers 200 with
 *                              the server's status in X-Erevos-Status and its body, 413 when that
 *                              body is larger than 100 MB (read as it comes and stopped there),
 *                              502 when it cannot be reached. Nothing of it is logged.
 *   /__window                  the window (app/lib/desktop.ts): GET says whether Erevos keeps
 *                              running when it is closed, PUT ?keep=1 or 0 sets it, PUT ?show=1
 *                              brings it back (a call, a tapped notice), POST gives the words of
 *                              the tray's menu in the app's language
 *   /__wipe?backups=&folder=   the panic button (app/lib/panic.ts): POST deletes everything the
 *                              app keeps (secrets.json, files/, the page's own storage, the rest
 *                              of its data folder), with backups=1 the backups Erevos named in
 *                              `folder` too, when it was chosen for them; then Erevos starts again
 *                              as if just installed. The Keychain or keyring item stays: its key
 *                              alone opens nothing, as what it sealed is gone.
 * The app's data is in the folder Electron gives it (~/.config/Erevos, on a Mac
 * ~/Library/Application Support/Erevos, on Windows %APPDATA%\Erevos). The page is also told, in its
 * address, which package it runs from (#erevos-system=…), so Check for updates names the file to take.
 *
 * Matrix calls show Element Call (web/element-call/, made by pwa/element-call.mjs) in a frame from
 * an origin of its own, app://element-call, so it can read nothing of the app's (app/lib/
 * element-call-window.web.ts): that origin serves only Element Call's files, and app://erevos never
 * serves them. It alone gets the camera, and reaches no tracker and not the homeserver itself, as
 * on Android (app/modules/erevos-webcall).
 *
 * Closing the window leaves Erevos running, unless turned off (window.json): in the system tray, on
 * a Mac in the Dock. The page goes on at full pace there, out of sight: it waits at the relay, a call
 * rings and brings the window back, and a notice says how many messages came. The tray's menu opens
 * the window again or quits; so does starting Erevos again, where the desktop shows no tray.
 *
 * With --smoke the app opens, waits for its first screen, says so and quits: the check the GitHub
 * runners make of each build (.github/workflows/desktop.yml), where nobody can look.
 */
const { app, BrowserWindow, Menu, Notification, Tray, dialog, nativeImage, net, protocol, safeStorage, session, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Lan } = require('./lan');

const ORIGIN = 'app://erevos';
const CALL_ORIGIN = 'app://element-call';
const WEB = path.join(__dirname, 'web');
const CALL_WEB = path.join(WEB, 'element-call');
const MAC = process.platform === 'darwin';
const WINDOWS = process.platform === 'win32';
const SMOKE = process.argv.includes('--smoke');
// On a Linux system with no keyring, the secrets are kept as they are only when Erevos was started
// with this: see secretStore.
const PLAIN_SECRETS = process.argv.includes('--plain-secrets');

// Its data folder, its Keychain item ("Erevos Safe Storage") and its menu are named after it; the
// name may never change, or it would start from an empty folder.
app.setName('Erevos');
app.setPath('userData', path.join(app.getPath('appData'), 'Erevos'));
// On Windows the task bar keeps the window with the installer's shortcut by this id, the build's
// appId (package.json); without it a pinned Erevos and the running one show as two.
if (WINDOWS) app.setAppUserModelId('app.erevos');
// A call rings with no click in the page first (app/modules/erevos-call/page-ring.web.ts), also
// with the window closed into the tray.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

/**
 * Which package this is, as app/lib/updates.ts packageFile names its file: the Windows installer or
 * the portable .exe (which says so in its environment), the Mac's, the AppImage (likewise) or the
 * Arch package.
 */
function system() {
  if (WINDOWS) return process.env.PORTABLE_EXECUTABLE_FILE ? 'windows-portable' : 'windows';
  if (MAC) return 'macos';
  return process.env.APPIMAGE ? 'linux-appimage' : 'linux';
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

/**
 * The page loads nothing from outside its origin. It talks to the relays the owner types in, over
 * WebSocket (ws: and wss:, any host), and to the Matrix, XMPP and Nostr servers the owner adds, over
 * HTTPS and WebSocket, and to nothing else: 'wasm-unsafe-eval' starts the Erevos
 * core (WebAssembly), 'unsafe-inline' is for the styles the interface sets from script, blob: for
 * voice messages, which play from memory. Its one frame is Element Call's.
 */
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: https: ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; frame-src app://element-call";
/** Element Call's pages: as pwa/element-call.mjs says (CALL_CSP), shown only in the app's frame. */
const CALL_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' blob: data: https: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors app://erevos";
// As on Android: what Element Call's frame may not reach.
const REFUSED_TO_CALL = ['posthog.com', 'sentry.io', 'google.com', 'googleapis.com', 'gstatic.com', 'recaptcha.net', 'jsdelivr.net'];

/** Only the app's own page knows this; the shell paths (/__…) are refused without it. */
const TOKEN = crypto.randomBytes(16).toString('hex');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

let window = null;
// Set as Erevos quits (the tray's menu, a Mac's Quit, the system shutting down): the window then
// closes for good.
let quitting = false;

/** The file of `root` at `pathname`, or null. */
function fileIn(root, pathname) {
  let decoded = '/';
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Not a path of the build.
  }
  const target = path.normalize(path.join(root, decoded));
  return target.startsWith(root + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile() ? target : null;
}

function sendFile(file, csp) {
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  if (type.startsWith('text/html')) headers['Content-Security-Policy'] = csp;
  return new Response(fs.readFileSync(file), { headers });
}

/** A file of the web build; any other path is a screen of the app (index.html). Never Element Call's. */
function serveFile(pathname) {
  const file = fileIn(WEB, pathname);
  if (file && file.startsWith(CALL_WEB + path.sep)) return new Response('', { status: 404 });
  return sendFile(file ?? path.join(WEB, 'index.html'), CSP);
}

/** A file of Element Call, on its own origin. */
function serveCall(pathname) {
  const file = fileIn(CALL_WEB, pathname);
  return file ? sendFile(file, CALL_CSP) : new Response('', { status: 404 });
}

const dataPath = (...parts) => path.join(app.getPath('userData'), ...parts);

/** Written whole into a new file that then takes the old one's place: a crash cannot leave it half-written. */
function writeWhole(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(`${file}.new`, data, { mode: 0o600 });
  fs.renameSync(`${file}.new`, file);
}

/** A JSON file's contents: `empty` when there is none yet, null when it is there but cannot be read. */
function readJson(file, empty) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return e && e.code === 'ENOENT' ? empty : null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Changes to one file wait for one another, so two never write it at once. */
const queues = new Map();
function inTurn(name, run) {
  const next = (queues.get(name) ?? Promise.resolve()).then(run);
  queues.set(name, next.catch(() => undefined));
  return next;
}

/**
 * Whether the keyring protects the secrets. A Mac always has the Keychain: when it does not give
 * the key (the owner chose Deny), nothing is read or written. A Linux system with no keyring, or
 * one Electron does not find (it then picks "basic_text", whose key is no secret), reads and
 * writes nothing either, so no password slot lies there unsealed by surprise; started with
 * --plain-secrets it keeps them as they are, readable by this user, which the app's guide says.
 */
function secretStore() {
  const linuxPlain = process.platform === 'linux' && safeStorage.getSelectedStorageBackend?.() === 'basic_text';
  if (safeStorage.isEncryptionAvailable() && !linuxPlain) return 'encrypted';
  if (MAC) return 'refused';
  return PLAIN_SECRETS ? 'plain' : 'no-keyring';
}

function secret(request, key) {
  if (!key) return new Response('no key', { status: 400 });
  const store = secretStore();
  const headers = { 'X-Erevos-Secret-Store': store };
  if (store === 'refused') return new Response('The Keychain refused. Open Erevos again and allow it.', { status: 503, headers });
  // The app says this in its own words (lib/shell.ts).
  if (store === 'no-keyring') return new Response('No keyring to seal the secrets with.', { status: 503, headers });
  const file = dataPath('secrets.json');
  if (request.method === 'GET') {
    const all = readJson(file, {});
    if (!all || typeof all !== 'object') return new Response('secrets.json cannot be read', { status: 500, headers });
    const stored = all[key];
    if (!stored || typeof stored.value !== 'string') return new Response(null, { status: 204, headers });
    const bytes = Buffer.from(stored.value, 'base64');
    return new Response(stored.encrypted ? safeStorage.decryptString(bytes) : bytes.toString('utf8'), { headers });
  }
  return inTurn(file, async () => {
    const all = readJson(file, {});
    if (!all || typeof all !== 'object') return new Response('secrets.json cannot be read', { status: 500, headers });
    if (request.method === 'PUT') {
      const value = await request.text();
      const encrypted = store === 'encrypted';
      all[key] = { encrypted, value: (encrypted ? safeStorage.encryptString(value) : Buffer.from(value, 'utf8')).toString('base64') };
    } else if (request.method === 'DELETE') {
      delete all[key];
    } else {
      return new Response('', { status: 405, headers });
    }
    writeWhole(file, JSON.stringify(all));
    return new Response(null, { status: 204, headers });
  });
}

/** The app's file names: its own, as the app makes them, never a path. */
const fileName = (name) => typeof name === 'string' && /^erevos-[a-z0-9-]+$/.test(name);

function file(request, name) {
  if (!fileName(name)) return new Response('bad name', { status: 400 });
  const target = dataPath('files', name);
  if (request.method === 'GET') {
    try {
      return new Response(fs.readFileSync(target), { headers: { 'Content-Type': 'application/octet-stream' } });
    } catch {
      return new Response(null, { status: 204 });
    }
  }
  return inTurn(target, async () => {
    if (request.method === 'PUT') writeWhole(target, Buffer.from(await request.arrayBuffer()));
    else if (request.method === 'DELETE') fs.rmSync(target, { force: true });
    else return new Response('', { status: 405 });
    return new Response(null, { status: 204 });
  });
}

function files(prefix) {
  let names = [];
  try {
    names = fs.readdirSync(dataPath('files'));
  } catch {
    // None yet.
  }
  return Response.json(names.filter((name) => fileName(name) && name.startsWith(prefix ?? '')));
}

// The folders the owner chose for backups: the only ones the page may write in.
const foldersFile = () => dataPath('folders.json');
const chosenFolders = () => {
  const list = readJson(foldersFile(), []);
  return Array.isArray(list) ? list : [];
};

async function folder() {
  const result = await dialog.showOpenDialog(window, {
    title: 'Folder for Erevos backups',
    defaultPath: app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
  });
  const chosen = result.canceled ? null : result.filePaths[0];
  if (!chosen) return new Response('', { status: 404 });
  await inTurn(foldersFile(), async () => {
    const list = chosenFolders();
    if (!list.includes(chosen)) writeWhole(foldersFile(), JSON.stringify([...list, chosen]));
  });
  return Response.json({ path: chosen });
}

const BACKUP = /^erevos-backup-[0-9-]+\.erevos$/;

async function backup(request, url) {
  const where = url.searchParams.get('folder');
  const name = url.searchParams.get('name');
  const keep = Number(url.searchParams.get('keep') ?? 0);
  if (!where || !chosenFolders().includes(where)) return new Response('That folder was not chosen for backups.', { status: 403 });
  if (!name || !BACKUP.test(name)) return new Response('bad name', { status: 400 });
  if (!fs.existsSync(where)) return new Response('', { status: 404 });
  fs.writeFileSync(path.join(where, name), Buffer.from(await request.arrayBuffer()));
  if (keep > 0) {
    const backups = fs.readdirSync(where).filter((n) => BACKUP.test(n)).sort();
    for (const old of backups.slice(0, Math.max(0, backups.length - keep))) fs.rmSync(path.join(where, old), { force: true });
  }
  return new Response(null, { status: 204 });
}

async function pick(url) {
  const most = Number(url.searchParams.get('most') ?? 0);
  const result = await dialog.showOpenDialog(window, { defaultPath: app.getPath('documents'), properties: ['openFile'] });
  const chosen = result.canceled ? null : result.filePaths[0];
  if (!chosen) return new Response('', { status: 404 });
  if (most > 0 && fs.statSync(chosen).size > most) return new Response('', { status: 413 });
  return new Response(fs.readFileSync(chosen), { headers: { 'X-Erevos-Name': encodeURIComponent(path.basename(chosen)) } });
}

async function save(request, url) {
  const name = path.basename(url.searchParams.get('name') || 'file');
  const result = await dialog.showSaveDialog(window, { defaultPath: path.join(app.getPath('downloads'), name) });
  if (result.canceled || !result.filePath) return new Response('', { status: 404 });
  fs.writeFileSync(result.filePath, Buffer.from(await request.arrayBuffer()));
  return Response.json({ path: result.filePath });
}

// Erevos on the same Wi-Fi, while the page wants it: what happens waits here for the page to ask.
let lan = null;
let lanSeq = 0;
let lanEvents = [];
let lanWaiting = [];
const LAN_KEPT = 500;
const LAN_WAIT = 20_000;

function lanEvent(event) {
  lanEvents.push({ seq: ++lanSeq, ...event });
  if (lanEvents.length > LAN_KEPT) lanEvents = lanEvents.slice(-LAN_KEPT);
  const waiting = lanWaiting;
  lanWaiting = [];
  waiting.forEach((wake) => wake());
}

async function lanRequest(request, url) {
  if (request.method === 'PUT') {
    const on = url.searchParams.get('on') === '1';
    if (on && !lan) {
      lan = new Lan({
        onLink: (link) => lanEvent({ kind: 'link', link }),
        onGone: (link) => lanEvent({ kind: 'gone', link }),
        onText: (link, text) => lanEvent({ kind: 'text', link, text }),
      });
      lan.start();
    } else if (!on && lan) {
      lan.stop();
      lan = null;
      lanEvents = [];
    }
    return Response.json({ after: lanSeq, links: lan ? [...lan.links.keys()] : [] });
  }
  if (request.method === 'POST') {
    const sent = lan?.send(url.searchParams.get('link') ?? '', await request.text());
    return new Response(null, { status: sent ? 204 : 404 });
  }
  const after = Number(url.searchParams.get('after') ?? 0);
  if (!lanEvents.some((event) => event.seq > after)) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, LAN_WAIT);
      lanWaiting.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  return Response.json({ events: lanEvents.filter((event) => event.seq > after) });
}

// The one address /__latest reads, the same as app/lib/updates.ts LATEST_URL, and how much of it.
const LATEST_URL = 'https://github.com/azzinder/erevos-releases/releases/latest/download/version.json';
const LATEST_MOST = 64 * 1024;

/** The latest release's version.json, only when the owner taps Check for updates; 502 when GitHub cannot be reached. */
async function latest() {
  try {
    const answer = await net.fetch(LATEST_URL, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
    const body = Buffer.from(await answer.arrayBuffer());
    if (body.length > LATEST_MOST) return new Response('', { status: 502 });
    return new Response(body, { status: answer.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response('', { status: 502 });
  }
}

// What /__webdav sends on, and how much it takes back: a backup, which the app takes from a server
// up to 100 MB, as any download (app/lib/net-http.ts HTTP_MOST).
const WEBDAV_METHODS = new Set(['PROPFIND', 'PUT', 'GET', 'DELETE']);
const WEBDAV_HEADERS = ['authorization', 'depth', 'content-type'];
const WEBDAV_MOST = 100 * 1024 * 1024;

/** The body of `answer`, `most` bytes at most, read as it comes: null as soon as it is larger
 *  (by the length it says, or by what came), and the rest is not fetched. */
async function readCapped(answer, most, stop) {
  const said = Number(answer.headers.get('content-length') ?? '');
  if (Number.isFinite(said) && said > most) {
    stop();
    return null;
  }
  if (!answer.body) return Buffer.alloc(0);
  const reader = answer.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value.length;
    if (got > most) {
      void reader.cancel().catch(() => undefined);
      stop();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, got);
}

/** One request to a WebDAV server, for backups (app/lib/backup-cloud.ts); see /__webdav above. */
async function webdav(request, url) {
  if (request.method !== 'POST') return new Response('', { status: 405 });
  const method = url.searchParams.get('method') ?? '';
  let target;
  try {
    target = new URL(url.searchParams.get('url') ?? '');
  } catch {
    return new Response('not a web address', { status: 400 });
  }
  if (!WEBDAV_METHODS.has(method) || target.protocol !== 'https:' || target.username || target.password) {
    return new Response('not a request for a backup server', { status: 400 });
  }
  const headers = {};
  for (const name of WEBDAV_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  const body = method === 'PUT' || method === 'PROPFIND' ? Buffer.from(await request.arrayBuffer()) : undefined;
  try {
    const stop = new AbortController();
    const answer = await net.fetch(target.href, { method, headers, body, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: stop.signal });
    const said = await readCapped(answer, WEBDAV_MOST, () => stop.abort());
    if (!said) return new Response('the answer is too large', { status: 413 });
    return new Response(said, { status: 200, headers: { 'X-Erevos-Status': String(answer.status) } });
  } catch (error) {
    // Chromium's own words (net::ERR_…), which hold no password: the request's headers are not in them.
    return new Response(String(error?.message ?? error).slice(0, 200), { status: 502 });
  }
}

// Whether Erevos keeps running with its window closed (on unless turned off), and whether it said
// so the first time it did.
const windowFile = () => dataPath('window.json');
function windowChoice() {
  const kept = readJson(windowFile(), {});
  return { keep: kept?.keep !== false, told: kept?.told === true };
}
function saveWindowChoice(change) {
  return inTurn(windowFile(), async () => writeWhole(windowFile(), JSON.stringify({ ...windowChoice(), ...change })));
}

// The tray's words, and the notice's, in the app's language once the page gives them.
const words = {
  open: 'Open Erevos',
  quit: 'Quit Erevos',
  kept: MAC ? 'Erevos keeps running with its window closed: messages come and calls ring. Quit it from its menu.' : 'Erevos keeps running with its window closed: messages come and calls ring. Quit it from its icon in the system tray.',
};
let tray = null;

function showWindow() {
  // Before it is ready, the window it opens with is on its way.
  if (!app.isReady()) return;
  if (!window) return createWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

/** The icon in the system tray while Erevos keeps running, with its menu; none on a Mac, where the Dock has it. */
function followTray() {
  const wanted = !MAC && !SMOKE && windowChoice().keep;
  if (!wanted) {
    tray?.destroy();
    tray = null;
    return;
  }
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 24, height: 24 }));
    tray.setToolTip('Erevos');
    tray.on('click', showWindow);
  }
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: words.open, click: showWindow },
      { type: 'separator' },
      { label: words.quit, click: () => app.quit() },
    ]),
  );
}

/** The window closed while Erevos keeps running: the first time, a notice says where it went. */
function kept() {
  if (windowChoice().told) return;
  void saveWindowChoice({ told: true });
  if (Notification.isSupported()) new Notification({ title: 'Erevos', body: words.kept, silent: true }).show();
}

const WORD_MOST = 300;

async function windowRequest(request, url) {
  if (request.method === 'GET') return Response.json({ keep: windowChoice().keep });
  if (request.method === 'PUT') {
    if (url.searchParams.get('show') === '1') showWindow();
    const keep = url.searchParams.get('keep');
    if (keep === '1' || keep === '0') {
      await saveWindowChoice({ keep: keep === '1' });
      followTray();
    }
    return new Response(null, { status: 204 });
  }
  if (request.method === 'POST') {
    let given = null;
    try {
      given = JSON.parse(await request.text());
    } catch {
      // Not words.
    }
    for (const key of Object.keys(words)) {
      if (typeof given?.[key] === 'string' && given[key] && given[key].length <= WORD_MOST) words[key] = given[key];
    }
    followTray();
    return new Response(null, { status: 204 });
  }
  return new Response('', { status: 405 });
}

/**
 * The panic button: everything Erevos keeps on this computer goes, then it starts again as new.
 * What the app sealed goes first (secrets.json, files/), then the page's own storage, then
 * whatever else is in its data folder; a file Chromium holds open goes as Erevos quits.
 */
async function wipe(request, url) {
  if (request.method !== 'POST') return new Response('', { status: 405 });
  lan?.stop();
  lan = null;
  const where = url.searchParams.get('folder');
  if (url.searchParams.get('backups') === '1' && where && chosenFolders().includes(where)) {
    try {
      for (const name of fs.readdirSync(where)) if (BACKUP.test(name)) fs.rmSync(path.join(where, name), { force: true });
    } catch {
      // The folder is gone, or out of reach: nothing of Erevos's to delete there.
    }
  }
  const root = app.getPath('userData');
  const rest = () => {
    let left = 0;
    for (const name of ['secrets.json', 'files', 'folders.json', 'window.json']) {
      try {
        fs.rmSync(path.join(root, name), { recursive: true, force: true });
      } catch {
        left += 1;
      }
    }
    return left;
  };
  const left = rest();
  try {
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
  } catch {
    // Its folder goes below all the same.
  }
  const everything = () => {
    let names = [];
    try {
      names = fs.readdirSync(root);
    } catch {
      return;
    }
    for (const name of names) {
      try {
        fs.rmSync(path.join(root, name), { recursive: true, force: true });
      } catch {
        // Held open by Chromium on Windows: it goes once Erevos has quit (below).
      }
    }
  };
  everything();
  // Started again, and, before that, the folder emptied once more as Erevos quits.
  setTimeout(() => {
    quitting = true;
    app.once('will-quit', everything);
    app.relaunch();
    app.quit();
  }, 300);
  return left ? new Response("Some of Erevos's files could not be deleted.", { status: 500 }) : new Response(null, { status: 204 });
}

function handle(request) {
  const url = new URL(request.url);
  if (url.host === 'element-call') return serveCall(url.pathname);
  if (url.host !== 'erevos') return new Response('', { status: 404 });
  if (url.pathname.startsWith('/__')) {
    if (request.headers.get('x-erevos-token') !== TOKEN) return new Response('', { status: 403 });
    if (url.pathname === '/__secret') return secret(request, url.searchParams.get('key'));
    if (url.pathname === '/__file') return file(request, url.searchParams.get('name'));
    if (url.pathname === '/__files') return files(url.searchParams.get('prefix'));
    if (url.pathname === '/__folder') return folder();
    if (url.pathname === '/__backup') return backup(request, url);
    if (url.pathname === '/__pick') return pick(url);
    if (url.pathname === '/__save') return save(request, url);
    if (url.pathname === '/__lan') return lanRequest(request, url);
    if (url.pathname === '/__latest') return latest();
    if (url.pathname === '/__webdav') return webdav(request, url);
    if (url.pathname === '/__window') return windowRequest(request, url);
    if (url.pathname === '/__wipe') return wipe(request, url);
    return new Response('', { status: 404 });
  }
  return serveFile(url.pathname);
}

function createWindow() {
  window = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 360,
    minHeight: 560,
    title: 'Erevos',
    autoHideMenuBar: true,
    backgroundColor: '#0D0B09',
    // On Linux and Windows the window shows this in the task bar; a Mac takes the app's own icon.
    ...(MAC ? {} : { icon: path.join(__dirname, 'icon.png') }),
    show: !SMOKE,
    // Out of sight it goes on at full pace: it waits at the relay, and a call rings at once.
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  // Links to other sites open in the browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
  // A frame shows only Element Call.
  window.webContents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame && !event.url.startsWith(`${CALL_ORIGIN}/`)) event.preventDefault();
  });
  window.loadURL(`${ORIGIN}/#erevos-token=${TOKEN}&erevos-system=${system()}`);
  // Closed while Erevos keeps running, it only hides.
  window.on('close', (event) => {
    if (quitting || SMOKE || !windowChoice().keep) return;
    event.preventDefault();
    window.hide();
    kept();
  });
  // Windows closes it as the system shuts down or the user signs out, with no Quit before.
  window.on('session-end', () => {
    quitting = true;
  });
  window.on('closed', () => {
    window = null;
  });
  if (SMOKE) smoke(window);
}

/** Says how the smoke check went and quits once it is written: on Windows a pipe is written later. */
function smokeDone(text, code) {
  process.stdout.write(`${text}\n`, () => app.exit(code));
}

/** Waits for the app's first screen (the chats, or the password screen), says what it shows, and quits. */
function smoke(win) {
  const started = Date.now();
  const look = async () => {
    const text = await win.webContents.executeJavaScript('document.body ? document.body.innerText : ""').catch(() => '');
    const core = await win.webContents.executeJavaScript('!!globalThis.erevosCore').catch(() => false);
    if (/Erevos/.test(text) && /relay|password/i.test(text)) {
      smokeDone(`SMOKE OK core=${core} secrets=${secretStore()}\n${text.slice(0, 400)}`, core ? 0 : 2);
    } else if (Date.now() - started > 60_000) {
      smokeDone(`SMOKE FAILED: no first screen after 60 s\n${text.slice(0, 400)}`, 1);
    } else {
      setTimeout(look, 1000);
    }
  };
  win.webContents.on('console-message', (_event, _level, message) => console.log(`page: ${message}`));
  win.webContents.on('did-finish-load', () => setTimeout(look, 1000));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Started again, it shows the window it has, closed into the tray or not.
  app.on('second-instance', showWindow);
  // A Mac's Dock icon brings the window back.
  app.on('activate', showWindow);
  app.on('before-quit', () => {
    quitting = true;
  });
  app.whenReady().then(() => {
    // The microphone, for voice messages, while Voice is held, and the notice that messages came
    // (app/lib/desktop.ts); the camera only for Element Call's frame, for a Matrix video call;
    // nothing else (location) is asked for, and anything else is refused without a prompt.
    // Copying a contact link is allowed too.
    const fromCall = (...urls) => urls.some((url) => typeof url === 'string' && (url === CALL_ORIGIN || url.startsWith(`${CALL_ORIGIN}/`)));
    const allowed = (permission, details = {}) =>
      permission === 'clipboard-sanitized-write' ||
      permission === 'notifications' ||
      (permission === 'media' &&
        (details.mediaTypes ?? ['audio']).every((type) => type === 'audio' || (type === 'video' && fromCall(details.securityOrigin, details.requestingUrl))));
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => callback(allowed(permission, details)));
    session.defaultSession.setPermissionCheckHandler((_contents, permission) => allowed(permission));
    // As on Android: Element Call's frame reaches no tracker, and not the homeserver itself, which
    // it reaches only through Erevos (the Widget API).
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
      let refused = false;
      try {
        if (details.frame && fromCall(details.frame.origin, details.frame.url)) {
          const url = new URL(details.url);
          refused = url.pathname.startsWith('/_matrix/') || REFUSED_TO_CALL.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
        }
      } catch {
        // The frame is gone: nothing of it to refuse.
      }
      callback({ cancel: refused });
    });
    protocol.handle('app', handle);
    createWindow();
    followTray();
  });
  app.on('window-all-closed', () => {
    lan?.stop();
    app.quit();
  });
}
