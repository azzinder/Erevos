// Builds site/donate/index.html: the ways to give to Erevos as one web page, in English and
// Greek, for anyone without the app. The ways come from app/lib/donate.ts, the same ones as in
// Settings → General → Support Erevos, so the page and the app cannot drift apart. The page is
// one file that fetches nothing: the QR codes are drawn here, as SVG, and the logo is inline.
//
//   cd app && npm ci && cd .. && node site/donate/build.mjs
//
// Then put index.html on any web server (or open it from disk).

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const qrcode = createRequire(join(root, 'app', 'package.json'))('qrcode-generator');

const source = readFileSync(join(root, 'app', 'lib', 'donate.ts'), 'utf8');
function constant(name) {
  const m = source.match(new RegExp(`export const ${name} = '([^']+)'`));
  if (!m) throw new Error(`${name} not found in app/lib/donate.ts`);
  return m[1];
}
const LIBERAPAY = constant('LIBERAPAY');
const PAYPAL = constant('PAYPAL');
const BITCOIN = constant('BITCOIN');
const MONERO = constant('MONERO');
for (const url of [LIBERAPAY, PAYPAL]) if (!url.startsWith('https://')) throw new Error(`not https: ${url}`);

// A QR code as an SVG path, dark on light, with its quiet zone.
function qrSvg(text, label) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
  const size = n + 8;
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

const logo = readFileSync(join(root, 'brand', 'erevos-mark-on-dark.svg'), 'utf8')
  .replace(/^<svg /, '<svg class="logo" aria-hidden="true" ')
  .replace(/ width="\d+" height="\d+"/, '');

const text = {
  en: {
    title: 'Support Erevos',
    lead: 'Erevos is a private messenger with no phone number, no email and no account. It has no ads, no investors and collects no data. If you want, you can help with its running costs, such as its server. Giving or not changes nothing in the app.',
    liberapay: 'Once, or every week or month. Liberapay itself keeps no share.',
    openLiberapay: 'Give through Liberapay',
    paypal: 'Known and easy, but PayPal knows who gives.',
    openPaypal: 'Give through PayPal',
    monero: 'The most private: the Monero network shows neither who gave nor how much.',
    bitcoin: 'No names, but anyone can see on the Bitcoin network what this address received.',
    copy: 'Copy address',
    copied: 'Copied',
    wallet: 'Open in a wallet',
    qr: 'QR code of the address',
    app: 'In the app, the same ways are under Settings → General → Support Erevos.',
    foot: 'This page loads nothing from anywhere else. Each way opens only when you tap it, and Erevos does not know who gave.',
  },
  el: {
    title: 'Στήριξε το Erevos',
    lead: 'Το Erevos είναι μια ιδιωτική εφαρμογή μηνυμάτων χωρίς αριθμό τηλεφώνου, χωρίς email και χωρίς λογαριασμό. Δεν έχει διαφημίσεις ούτε επενδυτές και δεν συλλέγει δεδομένα. Αν θέλεις, μπορείς να βοηθήσεις στα λειτουργικά του έξοδα, όπως ο server του. Αν δώσεις ή όχι, τίποτα δεν αλλάζει στην εφαρμογή.',
    liberapay: 'Μία φορά ή κάθε εβδομάδα ή μήνα. Το ίδιο το Liberapay δεν κρατά ποσοστό.',
    openLiberapay: 'Δωρεά μέσω Liberapay',
    paypal: 'Γνωστό και εύκολο, αλλά το PayPal ξέρει ποιος δίνει.',
    openPaypal: 'Δωρεά μέσω PayPal',
    monero: 'Το πιο ιδιωτικό: το δίκτυο του Monero δεν δείχνει ούτε ποιος έδωσε ούτε πόσα.',
    bitcoin: 'Χωρίς ονόματα, αλλά ο καθένας μπορεί να δει στο δίκτυο του Bitcoin τι έλαβε αυτή η διεύθυνση.',
    copy: 'Αντιγραφή διεύθυνσης',
    copied: 'Αντιγράφηκε',
    wallet: 'Άνοιγμα σε πορτοφόλι',
    qr: 'Κωδικός QR της διεύθυνσης',
    app: 'Στην εφαρμογή, οι ίδιοι τρόποι είναι στις Ρυθμίσεις → Γενικά → Στήριξε το Erevos.',
    foot: 'Αυτή η σελίδα δεν φορτώνει τίποτα από αλλού. Κάθε τρόπος ανοίγει μόνο όταν τον πατήσεις, και το Erevos δεν ξέρει ποιος έδωσε.',
  },
};

const coin = (t, name, scheme, address, about) => `
    <article class="card">
      <h2>${name}</h2>
      <p class="muted">${about}</p>
      ${qrSvg(address, `${t.qr} (${name})`)}
      <p class="addr">${address}</p>
      <div class="row">
        <button type="button" class="btn secondary" data-copy="${address}" data-done="${t.copied}">${t.copy}</button>
        <a class="btn secondary" href="${scheme}:${address}">${t.wallet}</a>
      </div>
    </article>`;

const section = (lang) => {
  const t = text[lang];
  return `
  <section lang="${lang}" data-lang="${lang}">
    <h1>${t.title}</h1>
    <p class="lead">${t.lead}</p>
    <article class="card">
      <h2>Liberapay</h2>
      <p class="muted">${t.liberapay}</p>
      <div class="row"><a class="btn" href="${LIBERAPAY}" rel="noopener noreferrer">${t.openLiberapay}</a></div>
    </article>
    <article class="card">
      <h2>PayPal</h2>
      <p class="muted">${t.paypal}</p>
      <div class="row"><a class="btn secondary" href="${PAYPAL}" rel="noopener noreferrer">${t.openPaypal}</a></div>
    </article>${coin(t, 'Monero', 'monero', MONERO, t.monero)}${coin(t, 'Bitcoin', 'bitcoin', BITCOIN, t.bitcoin)}
    <p class="muted small">${t.app}</p>
    <p class="faint small">${t.foot}</p>
  </section>`;
};

const html = `<!doctype html>
<html lang="en" data-show="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'">
<title>Support Erevos</title>
<meta name="description" content="The ways to give to Erevos, the private messenger: Liberapay, PayPal, Monero and Bitcoin.">
<style>
:root{--bg:#0c0b0b;--card:#1a1818;--line:#2d2b2b;--text:#f4f1f1;--muted:#b9b3b3;--faint:#857f7f;--accent:#ec3013;--accent-text:#fff}
@media (prefers-color-scheme: light){:root{--bg:#f6f3f3;--card:#fff;--line:#e2dcdc;--text:#1a1818;--muted:#5d5757;--faint:#8a8484;--accent:#c62a10}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:640px;margin:0 auto;padding:24px 16px 48px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;letter-spacing:.02em}
.logo{width:44px;height:44px}
.langs{display:flex;gap:6px}
.langs button{background:none;border:1px solid var(--line);color:var(--muted);border-radius:999px;padding:4px 12px;font:inherit;font-size:14px;cursor:pointer}
html[data-show=en] .langs [data-set=en],html[data-show=el] .langs [data-set=el]{border-color:var(--accent);color:var(--text)}
html[data-show=en] section[data-lang=el],html[data-show=el] section[data-lang=en]{display:none}
h1{font-size:28px;margin:16px 0 8px}
h2{font-size:18px;margin:0 0 4px}
.lead{color:var(--muted);margin:0 0 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:0 0 14px}
.muted{color:var(--muted);margin:0 0 12px}
.faint{color:var(--faint)}
.small{font-size:14px}
.qr{display:block;width:220px;max-width:100%;height:auto;border-radius:8px;margin:4px 0 12px}
.addr{font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-all;user-select:all;margin:0 0 12px}
.row{display:flex;flex-wrap:wrap;gap:8px}
.btn{display:inline-block;text-decoration:none;border-radius:999px;padding:10px 18px;font:inherit;font-weight:600;cursor:pointer;background:var(--accent);color:var(--accent-text);border:1px solid var(--accent)}
.btn.secondary{background:none;color:var(--text);border-color:var(--line)}
.btn:focus-visible,.langs button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
</head>
<body>
<main>
  <header>
    <div class="brand">${logo}<span>Erevos</span></div>
    <div class="langs"><button type="button" data-set="el" lang="el">Ελληνικά</button><button type="button" data-set="en" lang="en">English</button></div>
  </header>
${section('en')}
${section('el')}
</main>
<noscript><style>section[data-lang]{display:block!important}.langs,button[data-copy]{display:none}</style></noscript>
<script>
(function () {
  var root = document.documentElement;
  function show(lang) { root.setAttribute('data-show', lang); root.lang = lang; document.title = lang === 'el' ? 'Στήριξε το Erevos' : 'Support Erevos'; }
  var wanted = (location.hash || '').slice(1);
  show(wanted === 'el' || wanted === 'en' ? wanted : /^el\\b/i.test(navigator.language || '') ? 'el' : 'en');
  document.querySelectorAll('[data-set]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-set')); }); });
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    if (!navigator.clipboard) { b.style.display = 'none'; return; }
    b.addEventListener('click', function () {
      var label = b.textContent;
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        b.textContent = b.getAttribute('data-done');
        setTimeout(function () { b.textContent = label; }, 2000);
      });
    });
  });
})();
</script>
</body>
</html>
`;

writeFileSync(join(here, 'index.html'), html);
console.log(`site/donate/index.html: ${html.length} bytes`);
