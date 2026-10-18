/**
 * Erevos on a computer (Linux and macOS): the app's web build in Electron, as LPHL FASOULI does it.
 *
 * The app is served from its own origin, app://erevos, which also answers the shell paths the app
 * uses (app/lib/shell.ts), only with the token the page was given in its address (#erevos-token=…):
 *   /__secret?key=…            the keystore: small values sealed with the system's keyring (on a
 *                              Mac the Keychain), in secrets.json
 * Reading what is not there answers 204, no content.
 *   /__file?name=…             the app's own files, already sealed by the app, in the folder files/
 *   /__files?prefix=…          their names
 *   /__folder                  asks for a folder for backups and remembers it (folders.json)
 *   /__backup?folder=&name=&keep=  writes a backup there, deleting older ones but the newest `keep`
 *   /__pick?most=…             asks for a file to open (a backup, a chat export) and gives its bytes
 * The app's data is in the folder Electron gives it (~/.config/Erevos, on a Mac
 * ~/Library/Application Support/Erevos).
 *
 * With --smoke the app opens, waits for its first screen, says so and quits: the check the GitHub
 * runners make of each build (.github/workflows/desktop.yml), where nobody can look.
 */
const { app, BrowserWindow, dialog, protocol, safeStorage, session, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ORIGIN = 'app://erevos';
const WEB = path.join(__dirname, 'web');
const MAC = process.platform === 'darwin';
const SMOKE = process.argv.includes('--smoke');

// Its data folder, its Keychain item ("Erevos Safe Storage") and its menu are named after it; the
// name may never change, or it would start from an empty folder.
app.setName('Erevos');
app.setPath('userData', path.join(app.getPath('appData'), 'Erevos'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * The page loads nothing from outside its origin. It talks to the relays the owner types in, over
 * WebSocket (ws: and wss:, any host), and to nothing else: 'wasm-unsafe-eval' starts the Erevos
 * core (WebAssembly), 'unsafe-inline' is for the styles the interface sets from script, blob: for
 * voice messages, which play from memory.
 */
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'";

/** Only the app's own page knows this; the shell paths (/__…) are refused without it. */
const TOKEN = crypto.randomBytes(16).toString('hex');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

let window = null;

/** A file of the web build; any other path is a screen of the app (index.html). */
function serveFile(pathname) {
  let decoded = '/';
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Not a path of the build.
  }
  const target = path.normalize(path.join(WEB, decoded));
  const file = target.startsWith(WEB + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(WEB, 'index.html');
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  if (type.startsWith('text/html')) headers['Content-Security-Policy'] = CSP;
  return new Response(fs.readFileSync(file), { headers });
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
 * Whether the keyring protects the secrets: without one (Linux with no keyring) they are kept as
 * they are, which the app's guide says. A Mac always has the Keychain: when it does not give the
 * key (the owner chose Deny), nothing is read or written.
 */
const secretStore = () => (safeStorage.isEncryptionAvailable() ? 'encrypted' : MAC ? 'refused' : 'plain');

function secret(request, key) {
  if (!key) return new Response('no key', { status: 400 });
  const store = secretStore();
  const headers = { 'X-Erevos-Secret-Store': store };
  if (store === 'refused') return new Response('The Keychain refused. Open Erevos again and allow it.', { status: 503, headers });
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

function handle(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/__')) {
    if (request.headers.get('x-erevos-token') !== TOKEN) return new Response('', { status: 403 });
    if (url.pathname === '/__secret') return secret(request, url.searchParams.get('key'));
    if (url.pathname === '/__file') return file(request, url.searchParams.get('name'));
    if (url.pathname === '/__files') return files(url.searchParams.get('prefix'));
    if (url.pathname === '/__folder') return folder();
    if (url.pathname === '/__backup') return backup(request, url);
    if (url.pathname === '/__pick') return pick(url);
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
    show: !SMOKE,
    webPreferences: { contextIsolation: true, sandbox: true },
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
  window.loadURL(`${ORIGIN}/#erevos-token=${TOKEN}`);
  window.on('closed', () => {
    window = null;
  });
  if (SMOKE) smoke(window);
}

/** Waits for the app's first screen (the chats, or the password screen), says what it shows, and quits. */
function smoke(win) {
  const started = Date.now();
  const look = async () => {
    const text = await win.webContents.executeJavaScript('document.body ? document.body.innerText : ""').catch(() => '');
    const core = await win.webContents.executeJavaScript('!!globalThis.erevosCore').catch(() => false);
    if (/Erevos/.test(text) && /relay|password/i.test(text)) {
      console.log(`SMOKE OK core=${core} secrets=${secretStore()}\n${text.slice(0, 400)}`);
      app.exit(core ? 0 : 2);
    } else if (Date.now() - started > 60_000) {
      console.log(`SMOKE FAILED: no first screen after 60 s\n${text.slice(0, 400)}`);
      app.exit(1);
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
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.whenReady().then(() => {
    // The microphone, for voice messages, while Voice is held; nothing else (camera,
    // notifications, location) is asked for, and anything else is refused without a prompt.
    // Copying a contact link is allowed too.
    const allowed = (permission, details = {}) =>
      permission === 'clipboard-sanitized-write' || (permission === 'media' && (details.mediaTypes ?? ['audio']).every((type) => type === 'audio'));
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => callback(allowed(permission, details)));
    session.defaultSession.setPermissionCheckHandler((_contents, permission) => allowed(permission));
    protocol.handle('app', handle);
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
