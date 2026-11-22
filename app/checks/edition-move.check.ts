// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Updates and moves for the three editions (docs/editions.md): each edition's channels, repository
// and Android package, and the move.json one edition leaves for another (lib/edition-move.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { MOVE_WAITS, readMoveNote } from '../lib/move-note';
import { channelsOf, packageOf, PACKAGES, updateEditionName, updateEditionOf } from '../lib/update-channel';
import { channelPage, channelRepo, channelUrl, LITE_RELEASES_REPO, RELEASES_REPO } from '../lib/updates';

test('each edition has its own channels, repository and package', () => {
  assert.deepEqual(channelsOf({ edition: 'lite', beta: false }), ['lite']);
  assert.deepEqual(channelsOf({ edition: 'lite', beta: true }), ['lite', 'lite-beta']);
  assert.equal(channelRepo('lite'), LITE_RELEASES_REPO);
  assert.equal(channelRepo('lite-beta'), LITE_RELEASES_REPO);
  assert.equal(channelRepo('plus-beta'), RELEASES_REPO);
  assert.equal(channelUrl('lite'), `https://github.com/${LITE_RELEASES_REPO}/releases/latest/download/version.json`);
  assert.equal(channelUrl('lite-beta'), `https://github.com/${LITE_RELEASES_REPO}/releases/download/channel-beta/version.json`);
  assert.equal(channelUrl('plus'), `https://github.com/${RELEASES_REPO}/releases/download/channel-plus/version.json`);
  assert.equal(channelPage('lite-beta'), `https://github.com/${LITE_RELEASES_REPO}/releases/tag/channel-beta`);
  assert.equal(updateEditionOf('lite'), 'erevos');
  assert.equal(updateEditionOf('plus'), 'plus');
  assert.equal(updateEditionName('lite'), 'Erevos Lite');
  assert.equal(updateEditionName('erevos'), 'Erevos');
  // Erevos+ was app.erevos until 3.1.0; what version.json names wins, when it is one of the three.
  assert.equal(packageOf('plus', '7.3.0-rc.2'), 'app.erevos');
  assert.equal(packageOf('plus', '3.1.0-beta.1'), 'app.erevos.plus');
  assert.equal(packageOf('lite', '3.2.0-beta.1'), 'app.erevos.lite');
  assert.equal(packageOf('erevos', '3.0.0', 'app.erevos.plus'), 'app.erevos.plus');
  assert.equal(packageOf('erevos', '3.0.0', 'com.other'), 'app.erevos');
  assert.equal(new Set(Object.values(PACKAGES)).size, 3);
});

test("the Android side knows the same packages, and the app's config gives each edition its own", () => {
  const kt = readFileSync('modules/erevos-device/android/src/main/java/expo/modules/erevosdevice/Move.kt', 'utf8');
  for (const pkg of Object.values(PACKAGES)) assert.ok(kt.includes(`"${pkg}"`), pkg);
  const manifest = readFileSync('modules/erevos-device/android/src/main/AndroidManifest.xml', 'utf8');
  assert.match(manifest, /android:authorities="\$\{applicationId\}\.move"/);
  // Answered only to an app signed as this one: checked in code, with no permission of our own.
  assert.match(kt, /checkSignatures\(caller, Process\.myUid\(\)\)/);
  assert.doesNotMatch(manifest, /<permission /);
});

test('a move note is read only whole, for another edition, and within a day', () => {
  const now = 1_800_000_000_000;
  const good = { v: 1, from: 'erevos', to: 'plus', made: now - 1000, backup: 'move.erevos', parts: ['move-part-1.erevos'], password: 'ab'.repeat(32) };
  const read = (over: Record<string, unknown> = {}) => readMoveNote(JSON.stringify({ ...good, ...over }), now);
  assert.deepEqual(read(), good);
  assert.equal(readMoveNote('not json', now), null);
  assert.equal(readMoveNote('null', now), null);
  assert.equal(read({ v: 2 }), null);
  assert.equal(read({ to: 'erevos' }), null);
  assert.equal(read({ to: 'other' }), null);
  assert.equal(read({ made: now - MOVE_WAITS }), null);
  assert.equal(read({ made: now + 120_000 }), null);
  // Names only of the move's own files: no paths.
  assert.equal(read({ backup: '../files/x.erevos' }), null);
  assert.equal(read({ parts: ['move-part-1.erevos', '../lock.db'] }), null);
  assert.equal(read({ password: 'short' }), null);
  assert.equal(read({ password: 'AB'.repeat(32) }), null);
});
