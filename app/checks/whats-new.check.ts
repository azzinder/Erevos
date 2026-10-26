// What's new (lib/whats-new.ts): a version for each release of CHANGELOG.md, in its order, each
// with words; what is not out yet shows under the number of the version that runs; its links go
// to sections of the guide.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { GUIDE_SOURCES } from '../guide/index';
import { parseGuide, parseInline } from '../lib/guide';
import { laterThan, NEXT, VERSIONS, whatsNewFor } from '../lib/whats-new';

import { ROOT } from './words';

// "## 3.3.2 (2026-10-25)": the releases, newest first; "## Unreleased" is NEXT.
const releases = () =>
  [...readFileSync(join(ROOT, '..', 'CHANGELOG.md'), 'utf8').matchAll(/^## (\d+\.\d+\.\d+)\b/gm)].map((m) => m[1]);

test('a version for each release of CHANGELOG.md, in its order, by its number alone', () => {
  // After a release, NEXT's words move under its number here, as the CHANGELOG's do.
  assert.deepEqual(
    VERSIONS.map((v) => v.version),
    releases(),
  );
  for (const v of VERSIONS) assert.ok(v.items.length > 0, v.version);
});

test('each line once', () => {
  const all = [...NEXT, ...VERSIONS.flatMap((v) => v.items)];
  assert.deepEqual(
    all.filter((item, i) => all.indexOf(item) !== i),
    [],
  );
});

test('what is not out yet shows under the version that runs, once it comes after the last release', () => {
  const last = VERSIONS[0].version;
  assert.equal(laterThan('3.10.0', '3.9.1'), true);
  assert.equal(laterThan('3.3.2', '3.3.2'), false);
  assert.equal(laterThan('0.0.1', last), false);
  const shown = whatsNewFor('99.0.0');
  assert.equal(shown.length, VERSIONS.length + (NEXT.length > 0 ? 1 : 0));
  if (NEXT.length > 0) assert.deepEqual(shown[0], { version: '99.0.0', items: NEXT });
  // A build of a release: no list of what is to come.
  assert.deepEqual(whatsNewFor(last), VERSIONS);
  // A build of main for testing: with no number.
  if (NEXT.length > 0) assert.equal(whatsNewFor('0.0.1')[0].version, null);
});

test("its links go to the guide's sections, in both of its languages", () => {
  const links = [...NEXT, ...VERSIONS.flatMap((v) => v.items)].flatMap((item) => parseInline(item).flatMap((span) => (span.link ? [span.link] : [])));
  for (const source of Object.values(GUIDE_SOURCES)) {
    const ids = new Set(parseGuide(source).map((s) => s.id));
    for (const link of links) {
      assert.ok(link.startsWith('#'), link);
      assert.ok(ids.has(link.slice(1)), link);
    }
  }
});
