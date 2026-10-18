// Makes the Erevos web app from the web build (npx expo export --platform web, with the core from
// app/scripts/build-web-core.mjs): adds the service worker with the release key's public half,
// the first script (boot.js), the icons and the manifest that let it be added to a home screen,
// and release.json, which lists every file with its SHA-256. pwa/release.mjs then signs
// release.json. See README.md.
//
//   node pwa/build.mjs <web build> <out> [--key <public key file>] [--version <n>]
//
// The key defaults to pwa/release-key.pub. The version, which must grow from one release to the
// next, defaults to the time in seconds.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { icon } from './icon.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function fail(text) {
  console.error(text);
  process.exit(2);
}

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  const [, value] = args.splice(at, 2);
  return value;
};
const keyFile = option('--key', path.join(here, 'release-key.pub'));
const version = Number(option('--version', String(Math.floor(Date.now() / 1000))));
const [from, out] = args;
if (!from || !out) fail('usage: node pwa/build.mjs <web build> <out> [--key <public key file>] [--version <n>]');
if (!Number.isSafeInteger(version) || version < 1) fail('The version must be a whole number above 0.');
if (!fs.existsSync(keyFile)) fail(`No public key at ${keyFile}. Make the release key first: node pwa/release.mjs keygen <private key file>`);
const publicKey = fs.readFileSync(keyFile, 'utf8').trim();
if (Buffer.from(publicKey, 'base64').length !== 32) fail(`${keyFile} does not hold an Ed25519 public key (32 bytes, base64).`);
if (!fs.existsSync(path.join(from, 'index.html'))) fail(`${from} has no index.html: is it the web build?`);
if (!fs.existsSync(path.join(from, 'core', 'erevos_ffi_bg.wasm'))) fail(`${from} has no core/erevos_ffi_bg.wasm: build the core first (app/scripts/build-web-core.mjs).`);

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(from, out, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(out, name), data);

// The same policy the worker adds to the page, here too in case the page is ever served without it.
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' blob: ws: wss:; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const entries = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)];
if (entries.length !== 1) fail('index.html does not have the one app script this expects.');
const head = [
  '<meta name="referrer" content="no-referrer" />',
  '<meta name="theme-color" content="#0D0B09" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Erevos" />',
  '<link rel="manifest" href="/manifest.webmanifest" />',
  '<link rel="icon" href="/icon-192.png" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<link rel="stylesheet" href="/boot.css" />',
].join('\n    ');
write(
  'index.html',
  html
    .replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    .replace(/<meta name="viewport" content="[^"]*" \/>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />')
    .replace('</head>', `  ${head}\n  </head>`)
    .replace(entries[0][0], `<script src="/boot.js" data-entry="${entries[0][1]}"></script>`),
);

write('boot.js', fs.readFileSync(path.join(here, 'boot.js')));
write('boot.css', fs.readFileSync(path.join(here, 'boot.css')));
const worker = fs.readFileSync(path.join(here, 'sw.js'), 'utf8');
if (!worker.includes('__EREVOS_PUBLIC_KEY__')) fail('pwa/sw.js has lost its key mark.');
write('sw.js', worker.replace('__EREVOS_PUBLIC_KEY__', publicKey));

write('icon-192.png', icon(192));
write('icon-512.png', icon(512));
write('apple-touch-icon.png', icon(180));
write(
  'manifest.webmanifest',
  `${JSON.stringify(
    {
      name: 'Erevos',
      short_name: 'Erevos',
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0D0B09',
      theme_color: '#0D0B09',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2,
  )}\n`,
);

// Every file, with its hash, in a fixed order: the same files give the same release.json.
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
const files = {};
for (const full of walk(out).sort()) {
  const name = `/${path.relative(out, full).split(path.sep).join('/')}`;
  if (name === '/release.json' || name === '/release.sig') continue;
  if (!/^\/[\w.@/-]+$/.test(name)) fail(`${name}: a name the worker would refuse.`);
  files[name] = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}

let commit = null;
try {
  commit = execFileSync('git', ['-C', here, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // Not built from a checkout.
}
const release = { app: 'erevos-web', version, created: new Date().toISOString(), commit, files };
write('release.json', `${JSON.stringify(release, null, 1)}\n`);
console.log(`Erevos web app, release ${version}, ${Object.keys(files).length} files, in ${out}. Sign it: node pwa/release.mjs sign ${out} <private key file>`);
