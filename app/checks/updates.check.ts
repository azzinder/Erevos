// Reading a release's version.json (lib/updates.ts). Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildOf, isNewer, isReleaseFile, parseRelease, RELEASES_REPO } from '../lib/updates';

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
