// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { test } from 'node:test';

// Metro warns at start of every file that takes, through others, a file still being loaded
// («Require cycle»): what it takes may not be there yet. Found on the DELL on 2026-11-18 (i18n,
// secure and shell; e2e and device-list; xmpp and xmpp-muc). This reads the app's own imports as
// Metro does, leaving out those of types only (gone once built) and import() (taken when called),
// and finds any circle left.

const ROOT = join(import.meta.dirname, '..');
const DIRS = ['app', 'components', 'lib', 'lock', 'theme', 'guide'];

function sources(dir: string, out: string[]): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'android' || name === 'ios') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

const FROM = /^(?:import|export)\s+(?!type\b)([^;]*?)\s+from\s+'(\.[^']+)'|^import\s+'(\.[^']+)'/gm;

function takes(file: string, known: Set<string>): string[] {
  const out: string[] = [];
  for (const m of readFileSync(file, 'utf8').matchAll(FROM)) {
    const names = m[1];
    if (names !== undefined && /^\{\s*(?:type\s+\w+\s*,?\s*)+\}$/.test(names)) continue;
    const base = normalize(join(dirname(file), m[2] ?? m[3]));
    const found = ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((ext) => base + ext).find((p) => known.has(p));
    if (found) out.push(found);
  }
  return out;
}

test('no file of the app takes, through others, itself (Metro’s «Require cycle»)', () => {
  const files = DIRS.flatMap((dir) => sources(join(ROOT, dir), []));
  const known = new Set(files);
  const graph = new Map(files.map((f) => [f, takes(f, known)]));
  const circles: string[] = [];
  const state = new Map<string, 'on' | 'done'>();
  const path: string[] = [];
  const walk = (file: string) => {
    state.set(file, 'on');
    path.push(file);
    for (const next of graph.get(file) ?? []) {
      if (state.get(next) === 'on') circles.push([...path.slice(path.indexOf(next)), next].map((p) => p.slice(ROOT.length + 1)).join(' -> '));
      else if (!state.has(next)) walk(next);
    }
    path.pop();
    state.set(file, 'done');
  };
  for (const file of files) if (!state.has(file)) walk(file);
  assert.deepEqual(circles, []);
});

test('the reading finds a circle where there is one', () => {
  // lib/xmpp.ts takes lib/xmpp-base.ts; were xmpp-base to take xmpp back, that is a circle.
  const xmpp = join(ROOT, 'lib/xmpp.ts');
  const base = join(ROOT, 'lib/xmpp-base.ts');
  const known = new Set([xmpp, base]);
  assert.ok(takes(xmpp, known).includes(base));
  assert.deepEqual(takes(base, known), []);
});
