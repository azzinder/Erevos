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
const CALLS = [
  new RegExp(String.raw`\b(?:t|mark)\(\s*` + LITERAL, 'g'),
  new RegExp(String.raw`\bplural\(\s*[^,]+,\s*` + LITERAL + String.raw`\s*,\s*` + LITERAL, 'g'),
];

function unquote(literal: string): string {
  if (literal.startsWith('`')) return literal.slice(1, -1).replace(/\\`/g, '`');
  return JSON.parse(literal.startsWith("'") ? `"${literal.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"` : literal);
}

/** Each English word the code shows, with a file it is in. */
export function englishInCode(): Map<string, string> {
  const found = new Map<string, string>();
  for (const dir of DIRS) {
    // lib/i18n.ts itself only shows how t is called.
    for (const path of files(join(ROOT, dir)).filter((p) => !p.endsWith(join('lib', 'i18n.ts')))) {
      const source = readFileSync(path, 'utf8');
      for (const pattern of CALLS) {
        for (const match of source.matchAll(pattern)) {
          for (const literal of match.slice(1)) if (literal) found.set(unquote(literal), path.slice(ROOT.length + 1));
        }
      }
    }
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
