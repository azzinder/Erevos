// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Element Call, as its package on npm has it built (@element-hq/element-call-embedded, in
// app/package.json), made ready for the web app (pwa/build.mjs) and the computer (desktop/main.js)
// to show in a frame, for Matrix calls (app/lib/element-call-window.web.ts). The frame comes from an
// origin of its own, so Element Call can read nothing of the app's (its keys, its chats): the web
// app's second address (build.mjs --call-origin), on the computer app://element-call.
//
//   node pwa/element-call.mjs <Element Call's dist> <out>
//
// It copies the files the Android window carries (app/modules/erevos-webcall/android/build.gradle):
// all but the source maps, the background blur's model and WebAssembly, Matrix's own encryption in
// WebAssembly, which a widget does not use, and the older font files. Then:
// - index.html runs no script of its own: its two small inline scripts go into erevos-call.js, so
//   the page's policy (CALL_CSP) allows scripts only from files. erevos-call.js also tells Erevos
//   when Element Call's back arrow is pressed (the frame then goes small), and in the web app
//   checks a new service worker the browser fetched by itself, as pwa/boot.js does for the app;
// - config.json is empty, so it reports to no one;
// - start.html, the page the web app opens first: it runs Element Call only once the web app's
//   service worker (pwa/sw.js) serves it on this origin too, from the signed release.
// It stops if Element Call's page is not the one this expects, so an update of the package is
// looked at before it goes out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The policy of Element Call's pages, without frame-ancestors (the app's origin), which the server
 *  adds: pwa/sw.js on the web, desktop/main.js on the computer, each with a copy of this.
 *  'wasm-unsafe-eval' for its noise suppression, blob: for its media keys' worker (LiveKit), and
 *  https: and wss: for the media server of the homeserver's choice (LiveKit), which only Element
 *  Call talks to. */
export const CALL_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' blob: data: https: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'";

/** What Erevos leaves out of Element Call, as on Android. */
const LEFT_OUT = [/\.map$/, /vision_wasm_internal/, /selfie_segmenter/, /matrix_sdk_crypto_wasm/, /\.woff$/];

// The two scripts Element Call's index.html has inline, as they are in it.
const INLINE = [/^window\.global = window;$/, /^if \(!Promise\.withResolvers\) \{[\s\S]*\}$/];

// What erevos-call.js adds after them.
const ADDED = `
// Erevos (pwa/element-call.mjs): Element Call's host is Erevos's page, whose origin is in the
// address Element Call was opened at (#?…&parentUrl=…).
(function () {
  // Its scheme and host, as a page of the computer's app://erevos has them too.
  var match = /^([a-z][a-z0-9+.-]*:\\/\\/[^/?#]+)/i.exec(new URLSearchParams(location.hash.replace(/^#\\??/, '')).get('parentUrl') || '');
  var parent = match ? match[1].toLowerCase() : null;
  if (!parent || window.parent === window) return;
  function tell(message) {
    window.parent.postMessage({ erevos: message }, parent);
  }
  // Its back arrow, or Escape: the frame goes small, as Android's window does.
  window.addEventListener('load', function () {
    if (window.controls) window.controls.onBackButtonPressed = function () { tell('back'); };
  });
  // Erevos says when the frame is small, for Element Call's own small layout.
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || event.origin !== parent) return;
    var small = event.data && event.data.erevos && event.data.erevos.small;
    if (typeof small !== 'boolean' || !window.controls) return;
    try {
      if (small) window.controls.enablePip();
      else window.controls.disablePip();
    } catch (e) {}
  });
  // In the web app, the service worker serves this page (start.html saw to it). The browser fetches
  // the worker's script by itself, at least once a day, and installs a different one without
  // asking: is it one a signed release lists? If not, Erevos raises the alarm.
  var workers = navigator.serviceWorker;
  if (!workers || !workers.controller) return;
  var checked = false;
  function ask(question) {
    return new Promise(function (resolve) {
      var channel = new MessageChannel();
      channel.port1.onmessage = function (event) { resolve(event.data); };
      workers.controller.postMessage(question, [channel.port2]);
      setTimeout(function () { resolve(null); }, 20000);
    });
  }
  function check() {
    if (checked || !workers.controller) return;
    checked = true;
    fetch('/sw.js', { cache: 'no-store' })
      .then(function (response) { return response.arrayBuffer(); })
      .then(function (bytes) { return crypto.subtle.digest('SHA-256', bytes); })
      .then(function (hash) {
        var hex = Array.prototype.map.call(new Uint8Array(hash), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        return ask({ erevos: 'check-loader', hash: hex });
      })
      .then(function (answer) { if (answer && !answer.known) tell('bad-loader'); }, function () { tell('bad-loader'); });
  }
  workers.register('/sw.js', { updateViaCache: 'none' }).then(function (registration) {
    registration.addEventListener('updatefound', check);
    if (registration.installing || registration.waiting) check();
  }, function () {});
})();
`;

const START_PAGE = (csp) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="referrer" content="no-referrer" />
    <meta name="viewport" content="viewport-fit=cover,width=device-width,initial-scale=1" />
    <title>Element Call</title>
    <script src="./start.js"></script>
  </head>
  <body style="margin: 0; background: #000"></body>
</html>
`;

const START_SCRIPT = `// Erevos web app (pwa/element-call.mjs): the first page of Element Call's frame, on its own origin.
// Element Call runs only once the web app's service worker (pwa/sw.js) serves it here too, from the
// signed release, as pwa/boot.js does for the app: the first time this page installs the worker,
// which checks the release and keeps Element Call's files, then opens Element Call from it, with
// the same address after the #. Erevos hears if it could not.
(function () {
  var match = /^([a-z][a-z0-9+.-]*:\\/\\/[^/?#]+)/i.exec(new URLSearchParams(location.hash.replace(/^#\\??/, '')).get('parentUrl') || '');
  var parent = match ? match[1].toLowerCase() : null;
  var done = false;
  function go() {
    if (done) return;
    done = true;
    location.replace('index.html' + location.hash);
  }
  function failed(reason) {
    if (done) return;
    done = true;
    if (parent && window.parent !== window) window.parent.postMessage({ erevos: { failed: String(reason || '') } }, parent);
  }
  var workers = navigator.serviceWorker;
  if (!workers || !window.isSecureContext) return failed('This browser does not let Erevos check Element Call here (it needs a service worker).');
  if (workers.controller) return go();
  var reason = '';
  workers.addEventListener('message', function (event) {
    var news = event.data && event.data.erevos;
    if (news && news.kind === 'install-failed') reason = news.reason;
  });
  workers.addEventListener('controllerchange', go);
  workers.register('/sw.js', { updateViaCache: 'none' }).then(
    function (registration) {
      var worker = registration.installing || registration.waiting;
      if (!worker) {
        // In charge already, only not of this page (opened past it): what it opens next is its.
        if (registration.active) go();
        return;
      }
      worker.addEventListener('statechange', function () {
        if (worker.state === 'redundant') setTimeout(function () { failed(reason); }, 100);
      });
    },
    function (error) { failed(error && error.message ? error.message : error); },
  );
})();
`;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** Writes Element Call from `dist` into `out`, as said above. Throws if its page is not as expected. */
export function makeElementCall(dist, out) {
  const page = path.join(dist, 'index.html');
  if (!fs.existsSync(page)) throw new Error(`${dist} has no index.html: run npm ci in app/ first.`);
  let html = fs.readFileSync(page, 'utf8');
  // Only the inline scripts above, and no handler or address that runs script.
  if (/\son[a-z]+\s*=/i.test(html) || /javascript:/i.test(html)) throw new Error("Element Call's index.html runs script in an attribute: look at it before it goes out.");
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)];
  if (inline.length !== INLINE.length || inline.some((match, i) => !INLINE[i].test(match[1].trim()))) {
    throw new Error("Element Call's index.html does not have the inline scripts this expects: look at it before it goes out.");
  }
  if (scripts.length !== inline.length + 1 || !/^<script type="module" crossorigin src="\.\/assets\/[\w.-]+\.js">$/.test(scripts.find((s) => s[0] !== '<script>')?.[0] ?? '')) {
    throw new Error("Element Call's index.html does not load the one module this expects: look at it before it goes out.");
  }
  html = html.replace(inline[0][0], '<script src="./erevos-call.js"></script>');
  for (const match of inline.slice(1)) html = html.replace(match[0], '');
  if (!html.includes('<meta charset="UTF-8">')) throw new Error("Element Call's index.html has lost its charset line.");
  html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${CALL_CSP}"><meta name="referrer" content="no-referrer">`);

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const full of walk(dist)) {
    const name = path.relative(dist, full).split(path.sep).join('/');
    if (name === 'index.html' || name === 'config.json' || LEFT_OUT.some((r) => r.test(name))) continue;
    fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
    fs.copyFileSync(full, path.join(out, name));
  }
  fs.writeFileSync(path.join(out, 'index.html'), html);
  fs.writeFileSync(path.join(out, 'erevos-call.js'), `${inline.map((match) => match[1].trim()).join('\n')}\n${ADDED}`);
  fs.writeFileSync(path.join(out, 'config.json'), '{}\n');
  fs.writeFileSync(path.join(out, 'start.html'), START_PAGE(CALL_CSP));
  fs.writeFileSync(path.join(out, 'start.js'), START_SCRIPT);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [dist, out] = process.argv.slice(2);
  if (!dist || !out) {
    console.error("usage: node pwa/element-call.mjs <Element Call's dist> <out>");
    process.exit(2);
  }
  try {
    makeElementCall(dist, out);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  console.log(`Element Call, for a frame of its own, in ${out}.`);
}
