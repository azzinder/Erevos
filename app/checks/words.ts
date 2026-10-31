// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The words the app shows: the English, as the code writes it inside t('…'), mark('…') and
// plural(n, '…', '…'), which every language's words are keyed by, and each language's part files
// in i18n/ (checks/i18n.check.ts, checks/languages.check.ts, scripts/i18n-missing.ts).
/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = join(import.meta.dirname, '..');
const DIRS = ['app', 'components', 'lib', 'lock', 'theme', 'guide'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

// A JS string literal: '…', "…" or `…` without ${}.
const LITERAL = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\$]|\\.)*\`)`;
const SAID = new RegExp(String.raw`\b(?:t|mark)\(\s*` + LITERAL, 'g');
const PLURAL = new RegExp(String.raw`\bplural\(\s*[^,]+,\s*` + LITERAL + String.raw`\s*,\s*` + LITERAL, 'g');

function unquote(literal: string): string {
  if (literal.startsWith('`')) return literal.slice(1, -1).replace(/\\`/g, '`');
  return JSON.parse(literal.startsWith("'") ? `"${literal.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"` : literal);
}

/** Each file of the code that shows words, by its path in the app, with its source. */
function sources(): [string, string][] {
  // lib/i18n.ts itself only shows how t is called.
  const paths = DIRS.flatMap((dir) => files(join(ROOT, dir))).filter((p) => !p.endsWith(join('lib', 'i18n.ts')));
  return paths.map((path) => [path.slice(ROOT.length + 1), readFileSync(path, 'utf8')]);
}

/** The English the calls of `patterns` show, each with a file it is in. */
function inCode(patterns: RegExp[]): Map<string, string> {
  const found = new Map<string, string>();
  for (const [path, source] of sources()) {
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        for (const literal of match.slice(1)) if (literal) found.set(unquote(literal), path);
      }
    }
  }
  return found;
}

/** Each English word the code shows, with a file it is in. */
export const englishInCode = () => inCode([SAID, PLURAL]);

/** The English the code shows in t('…') and mark('…'), not in a count's words. */
export const saidInCode = () => inCode([SAID]);

/** The English of each count the code shows, plural(n, one, many): each many with its one. */
export function pluralsInCode(): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, source] of sources()) {
    for (const match of source.matchAll(PLURAL)) found.set(unquote(match[2]), unquote(match[1]));
  }
  return found;
}

/** The {names} in a text, in order of their names. */
export const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** A language's part files, i18n/<lang>/<part>.ts but its index, each with its words. */
export async function partsOf(lang: string): Promise<Map<string, Record<string, string>>> {
  const dir = join(ROOT, 'i18n', lang);
  const found = new Map<string, Record<string, string>>();
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'index.ts').sort()) {
    // Each part file holds one list of words.
    const module = (await import(pathToFileURL(join(dir, name)).href)) as Record<string, Record<string, string>>;
    const lists = Object.values(module);
    if (lists.length !== 1) throw new Error(`i18n/${lang}/${name} should hold one list of words`);
    found.set(name.slice(0, -3), lists[0]);
  }
  return found;
}
