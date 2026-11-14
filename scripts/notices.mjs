// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// NOTICES.txt: the licences that have to travel with every copy of Erevos, the built ones too (the APK,
// the computer app, the Sailfish package, the web app). MIT, BSD, ISC, Apache and the others ask that
// their text and the makers' copyright lines come with each copy of the work, and the AGPL asks the
// same for its own text; CREDITS.md does this for the source code only.
//
//   node scripts/notices.mjs            writes app/public/NOTICES.txt (node scripts/credits.mjs does it too)
//   node scripts/notices.mjs --check    exits 1 when app/public/NOTICES.txt does not name exactly the
//                                       packages of the lockfiles, or holds an old AUTHORS.md or LICENSE
//
// The file is kept in the repository, like CREDITS.md, so every build carries the same one and builds
// stay reproducible: Expo copies app/public/ into the web app, which the computer app and the Sailfish
// app are made of, and app/plugins/with-notices.js copies it into the Android app's assets. The check
// is app/checks/credits.check.ts, in `npm run check`.
//
// What it holds, in order: Erevos itself (its licence and AUTHORS.md, with the additional terms under
// section 7), then every package CREDITS.md lists, with its version, licence and link, and then each
// licence text once, numbered, that the packages point to. A package's text is its own licence files
// (LICENSE, LICENCE, COPYING, UNLICENSE, NOTICE, with the makers' copyright lines), read from where
// it is installed: app/node_modules and desktop/node_modules, cargo's registry, Go's module cache.
// A package found nowhere here (an Android library, a crate this machine never fetched) gets the
// text it had in the file before, when the file had one of its own for it, so writing on a machine
// with less installed loses nothing; failing that, the standard text of its licence, from
// scripts/licence-texts/. Run `cargo fetch --locked` and `cd transports && go mod download` first for
// the crates and Go modules a build of this machine never fetched.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS, creditsText, goModuleCache, listedPackages, lockedPackages } from './credits.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANDARD = path.join(ROOT, 'scripts', 'licence-texts');
const LICENCE_FILE = /^(licen[cs]e|copying|unlicen[cs]e|notice|copyright)([-._ ].*)?$/i;
const RULE = '='.repeat(78);
export const NOTICES = path.join(ROOT, 'app', 'public', 'NOTICES.txt');

/** What a NOTICES.txt holds for each package: its own licence files, as [name, text], by "id\tname\tversion". */
function rememberedFiles(file) {
  const out = new Map();
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return out;
  }
  const bodies = new Map();
  for (const m of text.matchAll(/^\[(\d+)\]\n\n([\s\S]*?)\n\n\[end of \1\]$/gm)) bodies.set(m[1], m[2]);
  let section = null;
  let entry = null;
  for (const line of text.split('\n')) {
    const heading = SECTIONS.find((s) => line.startsWith(`${s.title} (`));
    if (heading) section = heading.id;
    else if (/^\S+ \S+$/.test(line) && section) entry = line;
    else if (entry && line.startsWith('  Text: ')) {
      const files = [];
      for (const ref of line.slice(8).split('; ')) {
        const m = /^(\S+) \[(\d+)\]$/.exec(ref);
        if (m && LICENCE_FILE.test(m[1]) && bodies.has(m[2])) files.push([m[1], bodies.get(m[2])]);
      }
      if (files.length) out.set(`${section}\t${entry.replace(' ', '\t')}`, files);
      entry = null;
    }
  }
  return out;
}

/** The packages a NOTICES.txt names, as "id\tname\tversion". */
function namedPackages(text) {
  const out = new Set();
  let section = null;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const heading = SECTIONS.find((s) => line.startsWith(`${s.title} (`));
    if (heading) section = heading.id;
    else if (section && /^\S+ \S+$/.test(line) && lines[i + 1]?.startsWith('  Licence: ')) out.add(`${section}\t${line.replace(' ', '\t')}`);
  });
  return out;
}

/** The licence files in `dir` itself, as [name, text], or [] when there is no such folder. */
function licenceFiles(dir) {
  let names;
  try {
    names = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && LICENCE_FILE.test(e.name)).map((e) => e.name);
  } catch {
    return [];
  }
  return names.sort().map((name) => [name, fs.readFileSync(path.join(dir, name), 'utf8').replace(/\r\n?/g, '\n').trim()]);
}

/** Where each npm package of a lock is installed, by name@version. */
function npmFolders(folder) {
  const out = new Map();
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(folder, 'package-lock.json'), 'utf8'));
    for (const [key, entry] of Object.entries(lock.packages)) {
      if (!key || !entry.version) continue;
      const name = entry.name ?? key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
      const id = `${name}@${entry.version}`;
      if (!out.has(id)) out.set(id, path.join(folder, key));
    }
  } catch {
    // no lock: nothing found here
  }
  return out;
}

/** cargo's registry folders that hold unpacked crates. */
function cargoRegistries() {
  const home = process.env.CARGO_HOME || path.join(os.homedir(), '.cargo');
  try {
    return fs.readdirSync(path.join(home, 'registry', 'src')).map((d) => path.join(home, 'registry', 'src', d));
  } catch {
    return [];
  }
}

/** The single licences an SPDX expression names: "(MIT OR Apache-2.0) AND Zlib" gives MIT, Apache-2.0, Zlib. */
function licenceIds(expression) {
  const spdxLike = /^(?:LicenseRef-[\w.-]+|[A-Za-z][\w.+-]*-\d[\w.+-]*|MIT|ISC|Unlicense|Zlib|0BSD|OpenSSL|LLVM-exception)$/;
  const aliases = { 'GPL-2.0': 'GPL-2.0-only', 'GPL-3.0': 'GPL-3.0-only', 'LGPL-2.1': 'LGPL-2.1-only', 'LGPL-3.0': 'LGPL-3.0-only', 'AGPL-3.0': 'AGPL-3.0-only' };
  return [...new Set(expression.replace(/[(),;]/g, ' ').split(/\s+/).map((s) => aliases[s.trim()] ?? s.trim()).filter((s) => spdxLike.test(s)))];
}

/** The standard text of a licence, from scripts/licence-texts/, or null. */
function standardText(id) {
  for (const name of [id, id.replace(/\+$/, ''), id.replace(/-(only|or-later)$/, '-or-later'), id.replace(/-(only|or-later)$/, '-only'), id.replace(/-(only|or-later)$/, '')]) {
    const file = path.join(STANDARD, `${name}.txt`);
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').trim();
  }
  return null;
}

/** Writes NOTICES.txt to `out`, and says how many packages had their own licence files. */
export function writeNotices(out = NOTICES, root = ROOT) {
  const before = rememberedFiles(out);
  const listed = [...listedPackages(creditsText(root)).values()];
  const locked = lockedPackages(root);
  const lockedIds = new Set(SECTIONS.flatMap((s) => locked[s.id].map((p) => `${s.id}\t${p.name}\t${p.version}`)));
  const rows = listed.filter((r) => lockedIds.has(`${r.id}\t${r.name}\t${r.version}`));

  const npm = { app: npmFolders(path.join(root, 'app')), desktop: npmFolders(path.join(root, 'desktop')) };
  const registries = cargoRegistries();
  const goCache = goModuleCache() ?? path.join(os.homedir(), 'go', 'pkg', 'mod');
  const goEscaped = (text) => text.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);

  const texts = new Map(); // hash -> { n, text }
  const numberOf = (text) => {
    const hash = createHash('sha256').update(text).digest('hex');
    if (!texts.has(hash)) texts.set(hash, { n: texts.size + 1, text });
    return texts.get(hash).n;
  };

  let own = 0;
  const lines = [];
  for (const s of SECTIONS) {
    const part = rows.filter((r) => r.id === s.id).sort((a, b) => a.name.localeCompare(b.name, 'en') || a.version.localeCompare(b.version, 'en', { numeric: true }));
    lines.push('', RULE, `${s.title} (${part.length})`, RULE, '');
    for (const r of part) {
      let files = [];
      if (s.id === 'app' || s.id === 'desktop') files = licenceFiles(npm[s.id].get(`${r.name}@${r.version}`) ?? '');
      else if (s.id === 'cargo') {
        for (const reg of registries) if (!files.length) files = licenceFiles(path.join(reg, `${r.name}-${r.version}`));
      } else if (s.id === 'go') files = licenceFiles(path.join(goCache, `${goEscaped(r.name)}@${goEscaped(r.version)}`));
      if (!files.length) files = before.get(`${s.id}\t${r.name}\t${r.version}`) ?? [];
      const refs = [];
      if (files.length) {
        own++;
        for (const [name, text] of files) refs.push(`${name} [${numberOf(text)}]`);
      } else {
        for (const id of licenceIds(r.license)) {
          const text = standardText(id);
          refs.push(text ? `${id}, standard text [${numberOf(text)}]` : `${id}: https://spdx.org/licenses/${id}.html`);
        }
      }
      lines.push(`${r.name} ${r.version}`, `  Licence: ${r.license}`, ...(r.link ? [`  Source: ${r.link}`] : []), `  Text: ${refs.join('; ') || 'see its source'}`, '');
    }
  }

  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n').trim();
  const head = [
    'Erevos, by azzinder',
    '',
    'Erevos is free software under the GNU Affero General Public License, version 3 or any later',
    'version, with additional terms under its section 7 (AUTHORS.md, below). It is built on the',
    'open-source work of others, listed after it with their licences: each package names the',
    'licence texts it comes with, which follow at the end, numbered, each once.',
    '',
    RULE,
    'AUTHORS.md',
    RULE,
    '',
    read('AUTHORS.md'),
    '',
    RULE,
    'Other works copied into Erevos (from CREDITS.md)',
    RULE,
    '',
    read('CREDITS.md')
      .split('<!-- other:start -->')[1]
      ?.split('<!-- other:end -->')[0]
      .trim() ?? '',
  ];
  const tail = ['', RULE, 'Licence texts', RULE];
  for (const { n, text } of [...texts.values()].sort((a, b) => a.n - b.n)) tail.push('', `[${n}]`, '', text, '', `[end of ${n}]`);
  tail.push('', RULE, "Erevos's own licence: the GNU Affero General Public License, version 3", RULE, '', read('LICENSE'), '');

  const next = [...head, ...lines, ...tail].join('\n');
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const changed = !fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== next;
  if (changed) fs.writeFileSync(out, next);
  return { packages: rows.length, own, texts: texts.size, changed };
}

/** What is wrong with the NOTICES.txt in the repository: packages of the lockfiles it lacks, packages it
 *  names that they no longer hold, and whether its AUTHORS.md and LICENSE are the ones of now. */
export function checkNotices(root = ROOT) {
  const file = path.join(root, 'app', 'public', 'NOTICES.txt');
  if (!fs.existsSync(file)) return { missing: ['app/public/NOTICES.txt itself'], gone: [], stale: [] };
  const text = fs.readFileSync(file, 'utf8');
  const named = namedPackages(text);
  const locked = lockedPackages(root);
  const want = new Set(SECTIONS.flatMap((s) => locked[s.id].map((p) => `${s.id}\t${p.name}\t${p.version}`)));
  const show = (key) => key.split('\t').slice(1).join(' ');
  const read = (name) => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n?/g, '\n').trim();
  return {
    missing: [...want].filter((k) => !named.has(k)).map(show).sort(),
    gone: [...named].filter((k) => !want.has(k)).map(show).sort(),
    stale: ['AUTHORS.md', 'LICENSE'].filter((name) => !text.includes(read(name))),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    console.error('usage: node scripts/notices.mjs [--check]');
    process.exit(2);
  }
  try {
    if (args[0] === '--check') {
      const { missing, gone, stale } = checkNotices();
      if (!missing.length && !gone.length && !stale.length) {
        console.log('app/public/NOTICES.txt names exactly the packages in the lockfiles.');
      } else {
        if (missing.length) console.error(`Not in NOTICES.txt (${missing.length}): ${missing.slice(0, 20).join(', ')}`);
        if (gone.length) console.error(`In NOTICES.txt, but not in the lockfiles any more (${gone.length}): ${gone.slice(0, 20).join(', ')}`);
        if (stale.length) console.error(`NOTICES.txt holds an old ${stale.join(' and ')}`);
        console.error('Run: node scripts/credits.mjs');
        process.exit(1);
      }
    } else {
      const { packages, own, texts, changed } = writeNotices();
      console.log(`app/public/NOTICES.txt ${changed ? 'written' : 'is up to date'}: ${packages} packages, ${own} with their own licence files, ${texts} licence texts`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
