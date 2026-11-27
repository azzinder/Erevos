// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Gradle's own download, and the plugins it fetches before it builds anything (React Native's from
// the Gradle Plugin Portal), fail now and then: on 2026-11-27 a plugin was "not found" twice on
// GitHub's machines, in a test build of the F-Droid APK and in the check build. Every build of the
// Android app fetches them first, tried four times, a plugin not found asked for again after the
// first try (Gradle remembers it otherwise); the releases do so before the release key is there, so
// that `help` configures the app as an unsigned build and that step holds no secret.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const TOP = join(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(TOP, path), 'utf8');
// Where a workflow's step starts, by its name; -1 when it has none.
const at = (workflow: string, name: string) => workflow.indexOf(`\n      - name: ${name}\n`);
// A workflow's step, from its name to the next step or job.
const step = (workflow: string, name: string) => {
  const start = at(workflow, name);
  if (start < 0) return '';
  const rest = workflow.slice(start + 1);
  const end = rest.search(/\n {6}- |\n {2}[a-z-]+:\n/);
  return end < 0 ? rest : rest.slice(0, end);
};

const FETCH = 'Fetch Gradle and its plugins';

// The loop: Gradle, then `help`, which configures the build and builds nothing; four tries, 15, 30
// and 60 seconds apart, the plugins asked for again from the second on; failing at the end.
function assertLoop(text: string, gradle: string, arch: string, inWorkflow: boolean, where: string) {
  const lines = text.split('\n').map((line) => line.trim());
  const start = lines.indexOf('refresh=""');
  assert.ok(start >= 0, `${where}: no refresh=""`);
  assert.deepEqual(
    lines.slice(start, start + 8),
    [
      'refresh=""',
      'for wait in 15 30 60 0; do',
      `${gradle} --version --no-daemon && ${gradle} help --no-daemon $refresh -PreactNativeArchitectures=${arch} && ${inWorkflow ? 'exit 0' : 'break'}`,
      inWorkflow ? '[ "$wait" = 0 ] && break' : '[ "$wait" = 0 ] && exit 1',
      `echo "${inWorkflow ? '::warning::' : ''}Gradle, or a plugin it needs, could not be fetched; again in $wait s"`,
      'sleep "$wait"',
      'refresh=--refresh-dependencies',
      'done',
    ],
    where,
  );
  if (inWorkflow) assert.equal(lines[start + 8], 'exit 1', `${where}: fails after the fourth try`);
}

test('the releases fetch Gradle and its plugins first, tried four times, before the release key is there', () => {
  for (const name of ['release.yml', 'release-lite.yml', 'release-android.yml']) {
    const workflow = read(`.github/workflows/${name}`);
    assert.equal(workflow.split(`- name: ${FETCH}\n`).length, 2, `${name}: one step ${FETCH}`);
    assert.equal(at(workflow, 'Fetch Gradle'), -1, `${name}: the old step is gone`);
    const fetch = step(workflow, FETCH);
    assert.match(fetch, /\n {8}working-directory: app\/android\n/, name);
    assert.doesNotMatch(fetch, /secrets\.|ANDROID_KEY/, `${name}: no secret where the plugins are fetched`);
    assertLoop(fetch, './gradlew', 'arm64-v8a', true, name);
    // After the Android project is made, before the key is written and the APK built with it.
    const made = at(workflow, 'Generate the Android project');
    const key = at(workflow, 'Set up the release signing key');
    const built = at(workflow, 'Build the release APK');
    assert.ok(made >= 0 && key >= 0 && built >= 0, name);
    assert.ok(made < at(workflow, FETCH) && at(workflow, FETCH) < key && key < built, `${name}: ${FETCH} comes between the project and the key`);
  }
});

test('the check build fetches them the same way before it builds', () => {
  const name = 'android.yml';
  const workflow = read(`.github/workflows/${name}`);
  const fetch = step(workflow, FETCH);
  assert.ok(fetch, name);
  assert.match(fetch, /\n {8}working-directory: app\/android\n/, name);
  assertLoop(fetch, './gradlew', 'x86_64', true, name);
  const gradle = at(workflow, 'Gradle');
  assert.ok(gradle > at(workflow, FETCH), `${name}: fetched before it builds`);
  assert.match(step(workflow, 'Gradle'), /\n {8}run: \.\/gradlew assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon/, name);
});

test("the F-Droid build fetches them the same way, in F-Droid's Gradle, before it builds", () => {
  const name = 'deploy/fdroid/build.sh';
  const script = read(name);
  assertLoop(script, 'gradle', 'arm64-v8a', false, name);
  const loop = script.indexOf('refresh=""');
  const build = script.indexOf('\ngradle assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a\n');
  assert.ok(loop > script.indexOf('\ncd android\n') && build > loop, `${name}: fetched in android/, before it builds`);
});
