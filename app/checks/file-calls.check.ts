// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// expo-file-system's File and Directory write, move and copy return promises (their Sync forms do
// not): one called and not awaited lets what follows read a file still being written or moved, as
// a photo sent with its place, or a model downloaded but not found. So in every file of the app that
// uses expo-file-system, each such call is awaited, returned, handed on, or its Sync form.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = new URL('..', import.meta.url).pathname;

function sources(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) return name === 'node_modules' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

test('expo-file-system writes, moves and copies are awaited, or their Sync forms', () => {
  const loose: string[] = [];
  for (const path of ['lib', 'components', 'app', 'lock'].flatMap(sources)) {
    const text = readFileSync(join(root, path), 'utf8');
    if (!text.includes("'expo-file-system'")) continue;
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      if (!/\.(write|move|copy)\(/.test(line)) return;
      if (/\bawait\b|\breturn\b|\bvoid\b|\.then\(|=>\s*\w+\.(write|move|copy)\(/.test(line)) return;
      loose.push(`${path}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(loose, []);
});
