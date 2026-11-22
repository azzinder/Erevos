// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// No library of Google's services goes into the Android app: no Play services (com.google.android.gms)
// and no ML Kit (com.google.mlkit). They are closed code, ML Kit reports its use to Google, and
// F-Droid takes no app with them. expo-camera builds them in unless told not to
// (plugins/with-no-google-camera.js). Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

import { ROOT } from './words';

const require = createRequire(import.meta.url);
const GOOGLE = /com\.google\.(android\.gms|mlkit)/;

test("expo-camera is built without Google's barcode and document scanners", () => {
  const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
  const camera = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-camera');
  assert.ok(camera, 'expo-camera in app.json');
  assert.equal(camera[1].barcodeScannerEnabled, false);
  assert.match(readFileSync(join(ROOT, 'app.config.js'), 'utf8'), /'\.\/plugins\/with-no-google-camera'/);
  const { PROPERTIES } = require('../plugins/with-no-google-camera.js') as { PROPERTIES: Record<string, string> };
  // The names expo-camera's build reads: a new version that reads others fails here.
  const gradle = readFileSync(join(ROOT, 'node_modules', 'expo-camera', 'android', 'build.gradle'), 'utf8');
  for (const [key, value] of Object.entries(PROPERTIES)) {
    assert.equal(value, 'false', key);
    assert.ok(gradle.includes(`findProperty('${key}')`), key);
  }
  // Each Google library there only when its switch is on.
  for (const line of gradle.split('\n').filter((l) => GOOGLE.test(l))) {
    assert.match(line, /^\s*add\((barcode|documentScanner)DependencyConfiguration,/, line.trim());
  }
});

test("no other library or module of the app builds in Google's services", () => {
  const gradles: string[] = [];
  const modules = join(ROOT, 'modules');
  for (const name of readdirSync(modules)) gradles.push(join(modules, name, 'android', 'build.gradle'));
  const nm = join(ROOT, 'node_modules');
  for (const name of readdirSync(nm)) {
    if (name === 'expo-camera') continue;
    const names = name.startsWith('@') ? readdirSync(join(nm, name)).map((n) => join(name, n)) : [name];
    for (const n of names) gradles.push(join(nm, n, 'android', 'build.gradle'));
  }
  const found = gradles.filter((g) => existsSync(g) && GOOGLE.test(readFileSync(g, 'utf8')));
  assert.deepEqual(found, []);
});
