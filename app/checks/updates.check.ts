// Reading a release's version.json (lib/updates.ts). Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildNumber, buildOf, isNewer, isReleaseFile, PACKAGE_FILES, packageFile, parseRelease, RELEASES_REPO } from '../lib/updates';

const SHA = 'a'.repeat(64);
const url = (name: string) => `https://github.com/${RELEASES_REPO}/releases/download/v0.1.7/${name}`;
const json = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ version: '0.1.7', build: 7, date: '2026-10-19', apk: { url: url('erevos-android.apk'), size: 1000, sha256: SHA }, ...over });

test('a release is read with its package', () => {
  assert.deepEqual(parseRelease(json()), { version: '0.1.7', build: 7, date: '2026-10-19', apk: { url: url('erevos-android.apk'), size: 1000, sha256: SHA } });
});

test('the version and build must agree', () => {
  assert.equal(parseRelease(json({ build: 8 })), null);
  assert.equal(parseRelease(json({ version: '1.0.7' })), null);
  assert.equal(parseRelease('not json'), null);
});

test('since 2.0.0 a release is read by its name, and Erevos 0.1.16 and before still find it', () => {
  const v2 = json({ name: '2.0.0', version: '0.1.17', build: 17 });
  assert.equal(parseRelease(v2)?.version, '2.0.0');
  assert.equal(parseRelease(v2)?.build, 17);
  assert.equal(isNewer(parseRelease(v2)!, 16), true);
  // What those versions check: a 0.1.<build> version with the same build, which the workflow writes.
  assert.equal(buildOf('0.1.17'), 17);
  const workflow = readFileSync(join(import.meta.dirname, '../../.github/workflows/release.yml'), 'utf8');
  assert.ok(workflow.includes('--arg name "$EREVOS_VERSION" --arg version "0.1.$EREVOS_BUILD" --argjson build "$EREVOS_BUILD"'));
  for (const name of ['2.0', 'v2.0.0', '2.0.0-beta', '02.0.0', 2]) {
    assert.equal(parseRelease(json({ name, version: '2.0.0', build: 17 })), null, String(name));
  }
  assert.equal(parseRelease(json({ name: '2.0.0', build: 0 })), null);
});

test("the running app's build number: apart from the version since 2.0.0, in it before", () => {
  assert.equal(buildNumber(17, '2.0.0'), 17);
  assert.equal(buildNumber(undefined, '0.1.16'), 16);
  assert.equal(buildNumber(undefined, '2.0.0'), 0);
  assert.equal(buildNumber('17', '2.0.0'), 0);
  assert.equal(buildNumber(undefined, '0.0.1'), 0);
  // app.config.js puts a release's build in extra.build and Android's versionCode.
  const config = createRequire(import.meta.url)('../app.config.js') as (c: { config: Record<string, unknown> }) => Record<string, any>;
  const env = { ...process.env };
  try {
    Object.assign(process.env, { EREVOS_BUILD: '17', EREVOS_VERSION: '2.0.0' });
    const made = config({ config: { version: '0.0.1', android: {}, extra: { other: 1 }, plugins: [] } });
    assert.equal(made.version, '2.0.0');
    assert.equal(made.android.versionCode, 17);
    assert.deepEqual(made.extra, { other: 1, build: 17 });
    delete process.env.EREVOS_BUILD;
    delete process.env.EREVOS_VERSION;
    const local = config({ config: { version: '0.0.1', android: {}, plugins: [] } });
    assert.equal(local.version, '0.0.1');
    assert.equal(local.android.versionCode, undefined);
    assert.equal(buildNumber(local.extra?.build, local.version), 0);
  } finally {
    process.env = env;
  }
});

test('a package from anywhere else, or without its SHA-256, is not offered', () => {
  for (const apk of [
    { url: 'https://example.com/erevos.apk', size: 1, sha256: SHA },
    { url: `https://github.com/${RELEASES_REPO}/releases/download/../../other/x.apk`, size: 1, sha256: SHA },
    { url: url('erevos-android.apk'), size: 1 },
    { url: url('erevos-android.apk'), size: 0, sha256: SHA },
  ]) {
    assert.equal(parseRelease(json({ apk }))?.apk, null, JSON.stringify(apk));
  }
  assert.equal(isReleaseFile(`https://github.com/${RELEASES_REPO}/releases/download/%2e%2e/%2e%2e/x/y`), false);
  assert.equal(isReleaseFile(`http://github.com/${RELEASES_REPO}/releases/download/v1/x`), false);
});

test('only a newer build of a release is offered, never to a build from a computer', () => {
  const release = parseRelease(json())!;
  assert.equal(buildOf('0.1.7'), 7);
  assert.equal(buildOf('0.0.1'), 0);
  assert.equal(isNewer(release, 6), true);
  assert.equal(isNewer(release, 7), false);
  assert.equal(isNewer(release, 0), false);
});

test('a computer is told the file of its own package, as the release names it', () => {
  assert.equal(packageFile('electron', 'windows'), 'erevos-windows-x64-setup.exe');
  assert.equal(packageFile('electron', 'windows-portable'), 'erevos-windows-x64-portable.exe');
  assert.equal(packageFile('electron', 'linux-appimage'), 'erevos-linux-x86_64.AppImage');
  assert.equal(packageFile('sailfish', ''), 'erevos-sailfish-aarch64.rpm');
  // A shell that does not say, or says something else, gets the general note.
  assert.equal(packageFile('electron', ''), null);
  assert.equal(packageFile('electron', 'constructor'), null);
  assert.equal(packageFile(null, 'windows'), null);
  // Each is a file the release workflow publishes, and desktop/main.js says each name.
  const workflow = readFileSync(join(import.meta.dirname, '../../.github/workflows/release.yml'), 'utf8');
  const shell = readFileSync(join(import.meta.dirname, '../../desktop/main.js'), 'utf8');
  for (const [system, file] of PACKAGE_FILES) {
    assert.ok(workflow.includes(file), file);
    assert.ok(shell.includes(`'${system}'`), system);
  }
});
