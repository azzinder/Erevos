// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Every file the computer app's main.js loads from beside it goes into the packaged build
// (desktop/package.json, build.files), or the AppImage, pacman, dmg and Windows builds all stop at
// start with "Cannot find module". The Linux check in CI starts the unpackaged app, which has every
// file, so it would not tell: chunks.js was left out once, and every packaged 7 build would have
// failed.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const DESKTOP = join(import.meta.dirname, '..', '..', 'desktop');

test('every file main.js loads from beside it is in the packaged build', () => {
  const main = readFileSync(join(DESKTOP, 'main.js'), 'utf8');
  const loaded = [...main.matchAll(/require\('\.\/([\w-]+)'\)/g)].map((m) => `${m[1]}.js`);
  assert.ok(loaded.length >= 3, 'main.js loads its own files');
  const { build } = JSON.parse(readFileSync(join(DESKTOP, 'package.json'), 'utf8')) as { build: { files: string[] } };
  for (const file of loaded) assert.ok(build.files.includes(file), `desktop/package.json build.files lists ${file}`);
  assert.ok(build.files.includes('main.js'));
});
