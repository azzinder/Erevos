// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What's new (lib/whats-new.ts): a version for each release of CHANGELOG.md, in its order, each
// with words, for you and under the hood as the CHANGELOG splits them; what is not out yet shows
// under the number of the version that runs; its links go to sections of the guide.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { GUIDE_SOURCES } from '../guide/index';
import { parseGuide, parseInline } from '../lib/guide';
import { laterThan, VERSION_NAME } from '../lib/version-name';
import { NEXT, VERSIONS, whatsNewFor, type Changes } from '../lib/whats-new';

import { ROOT } from './words';

// "## 3.3.2 (2026-10-25)" or "## 4.0.0-rc.1 (…)": the releases, newest first; "## Unreleased" is NEXT.
const changelog = () => readFileSync(join(ROOT, '..', 'CHANGELOG.md'), 'utf8');
const releases = () => [...changelog().matchAll(/^## (?!Unreleased$)(\S+)/gm)].map((m) => m[1]);
const lines = (changes: Changes) => [...changes.forYou, ...changes.underTheHood];

test('a version for each release of CHANGELOG.md, in its order, by its number alone', () => {
  // After a release, NEXT's words move under its number here, as the CHANGELOG's do.
  assert.deepEqual(
    VERSIONS.map((v) => v.version),
    releases(),
  );
  for (const v of VERSIONS) assert.ok(lines(v).length > 0, v.version);
});

test('each release is named as the release workflow names it, each newer than the one below it', () => {
  const names = releases();
  for (const [i, name] of names.entries()) {
    assert.match(name, VERSION_NAME);
    if (i > 0) assert.ok(laterThan(names[i - 1], name), `${names[i - 1]} above ${name}`);
  }
});

test("the CHANGELOG splits each release as What's new does: for you first, then under the hood", () => {
  for (const section of changelog().split(/^## /m).slice(1)) {
    const name = section.slice(0, section.indexOf('\n'));
    const kinds = [...section.matchAll(/^### (.+)$/gm)].map((m) => m[1]).join(' + ');
    assert.ok(['For you', 'Under the hood', 'For you + Under the hood'].includes(kinds), `${name}: ${kinds}`);
    // No entry outside the two kinds.
    assert.doesNotMatch(section.slice(0, section.indexOf('\n### ')), /^- /m, name);
  }
});

test('each line once', () => {
  const all = [...lines(NEXT), ...VERSIONS.flatMap(lines)];
  assert.deepEqual(
    all.filter((item, i) => all.indexOf(item) !== i),
    [],
  );
});

test('what is not out yet shows under the version that runs, once it comes after the last release', () => {
  const last = VERSIONS[0].version;
  assert.equal(laterThan('3.10.0', '3.9.1'), true);
  assert.equal(laterThan('3.3.2', '3.3.2'), false);
  assert.equal(laterThan('4.0.0-rc.1', '3.4.2'), true);
  assert.equal(laterThan('4.0.0-rc.1', '4.0.0'), false);
  assert.equal(laterThan('0.0.1', last), false);
  const shown = whatsNewFor('99.0.0');
  const pending = lines(NEXT).length > 0;
  assert.equal(shown.length, VERSIONS.length + (pending ? 1 : 0));
  if (pending) assert.deepEqual(shown[0], { version: '99.0.0', ...NEXT });
  // A build of a release: no list of what is to come.
  assert.deepEqual(whatsNewFor(last), VERSIONS);
  // A build of main for testing: with no number.
  if (pending) assert.equal(whatsNewFor('0.0.1')[0].version, null);
});

test("its links go to the guide's sections, in every one of its languages", () => {
  const links = [...lines(NEXT), ...VERSIONS.flatMap(lines)].flatMap((item) => parseInline(item).flatMap((span) => (span.link ? [span.link] : [])));
  for (const source of Object.values(GUIDE_SOURCES)) {
    const ids = new Set(parseGuide(source).map((s) => s.id));
    for (const link of links) {
      assert.ok(link.startsWith('#'), link);
      assert.ok(ids.has(link.slice(1)), link);
    }
  }
});
