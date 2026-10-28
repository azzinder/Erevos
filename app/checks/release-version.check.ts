// Naming a release (.github/workflows/release.yml, its version job): 2.1.0, or a test release
// such as 4.0.0-rc.1, always newer than the latest; and the Sailfish RPM's version of a test
// release. The workflow's own script runs here, with a gh of this check's own that names the latest
// release. Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { laterThan, VERSION_NAME } from '../lib/version-name';

import { ROOT } from './words';

const workflow = readFileSync(join(ROOT, '..', '.github', 'workflows', 'release.yml'), 'utf8').split('\n');

/** The script of the step whose `id:` is `id`, as GitHub runs it. */
function stepScript(id: string): string {
  const at = workflow.findIndex((line) => line.trim() === `id: ${id}`);
  assert.ok(at >= 0, id);
  const run = workflow.findIndex((line, i) => i > at && line.trim() === 'run: |');
  const indent = (line: string) => line.length - line.trimStart().length;
  const body: string[] = [];
  for (const line of workflow.slice(run + 1)) {
    if (line.trim() && indent(line) <= indent(workflow[run])) break;
    body.push(line);
  }
  const least = Math.min(...body.filter((line) => line.trim()).map(indent));
  return body.map((line) => line.slice(least)).join('\n');
}

const dir = mkdtempSync(join(tmpdir(), 'erevos-release-version-'));
after(() => rmSync(dir, { recursive: true, force: true }));
// gh api repos/…/releases/latest --jq '"<tag> <commit>"', or no release at all.
writeFileSync(join(dir, 'gh'), '#!/bin/sh\n[ -n "$LATEST" ] || exit 1\nprintf "%s abc1234\\n" "$LATEST"\n');
chmodSync(join(dir, 'gh'), 0o755);
writeFileSync(join(dir, 'check.sh'), stepScript('check'));

/** The version the job names, with `latest` the latest release's tag and `wanted` the one asked for; an error's words when it refuses. */
function named(latest: string, wanted: string): string {
  const output = join(dir, 'output');
  writeFileSync(output, '');
  const env = {
    ...process.env,
    PATH: `${dir}:${process.env.PATH}`,
    LATEST: latest,
    WANTED: wanted,
    GITHUB_OUTPUT: output,
    GITHUB_REF_NAME: 'main',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_SHA: 'def5678',
    GH_REPO: 'example/erevos',
    EREVOS_BUILD: '45',
  };
  try {
    execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', join(dir, 'check.sh')], { env, stdio: 'pipe' });
  } catch (e) {
    const out = String((e as { stdout?: Buffer }).stdout ?? '');
    return out.match(/::error::(.*)/)?.[1] ?? out;
  }
  return /^version=(.*)$/m.exec(readFileSync(output, 'utf8'))?.[1] ?? '';
}

test('a release is named as asked, or the one after the latest', () => {
  assert.equal(named('v3.4.2', ''), '3.4.3');
  assert.equal(named('v3.4.2', '3.5.0'), '3.5.0');
  assert.equal(named('v3.4.2', 'v4.0.0'), '4.0.0');
  assert.equal(named('', ''), '2.0.0');
  assert.match(named('v3.4.2', '3.4.2'), /not newer/);
  assert.match(named('v3.4.2', '3.4.1'), /not newer/);
  assert.match(named('v3.4.2', '3.4'), /Not a version/);
});

test('a test release before a version: 4.0.0-rc.1, after 3.x, before 4.0.0, and the one after it is rc.2', () => {
  assert.equal(named('v3.4.2', '4.0.0-rc.1'), '4.0.0-rc.1');
  assert.equal(named('v3.4.2', 'v4.0.0-rc.1'), '4.0.0-rc.1');
  assert.equal(named('v4.0.0-rc.1', ''), '4.0.0-rc.2');
  assert.equal(named('v4.0.0-rc.9', ''), '4.0.0-rc.10');
  assert.equal(named('v4.0.0-rc.9', '4.0.0-rc.10'), '4.0.0-rc.10');
  assert.equal(named('v4.0.0-beta.2', '4.0.0-rc.1'), '4.0.0-rc.1');
  assert.equal(named('v4.0.0-rc.2', '4.0.0'), '4.0.0');
  assert.match(named('v4.0.0-rc.2', '4.0.0-rc.1'), /not newer/);
  assert.match(named('v4.0.0-rc.2', '4.0.0-rc.2'), /not newer/);
  assert.match(named('v4.0.0', '4.0.0-rc.3'), /not newer/);
  assert.match(named('v4.0.0-rc.1', '3.4.3'), /not newer/);
  for (const odd of ['4.0.0RC1', '4.0.0-RC1', '4.0.0-rc', '4.0.0-rc1', '4.0.0-rc.0', '4.0.0-rc.01', '4.0.0-test.1', '4.0.0-rc.1.2']) {
    assert.match(named('v3.4.2', odd), /Not a version/, odd);
  }
});

test('the app reads the names the workflow gives, in the same order', () => {
  const names = ['3.4.2', '3.4.3', '4.0.0-alpha.1', '4.0.0-beta.2', '4.0.0-rc.1', '4.0.0-rc.2', '4.0.0-rc.10', '4.0.0', '4.0.1'];
  for (const [i, name] of names.entries()) {
    assert.ok(VERSION_NAME.test(name), name);
    if (i > 0) assert.equal(named(`v${names[i - 1]}`, name), name);
    if (i > 0) assert.equal(laterThan(name, names[i - 1]), true, `${name} after ${names[i - 1]}`);
    if (i > 0) assert.equal(laterThan(names[i - 1], name), false, `${names[i - 1]} not after ${name}`);
    assert.equal(laterThan(name, name), false, name);
  }
  for (const odd of ['4.0.0RC1', '4.0.0-RC1', '4.0.0-rc', '4.0.0-rc.0', '4.0.0-rc.01', 'v4.0.0-rc.1', '4.0.0-rc.1.2']) {
    assert.equal(VERSION_NAME.test(odd), false, odd);
  }
});

test("the Sailfish RPM's version has no -: 4.0.0~rc.1, which RPM puts before 4.0.0", () => {
  const sed = workflow.map((line) => line.trim()).find((line) => line.startsWith('sed -i "s/^Version:'));
  assert.ok(sed);
  const spec = (version: string) => {
    const at = join(dir, 'sailfish');
    mkdirSync(join(at, 'rpm'), { recursive: true });
    copyFileSync(join(ROOT, '..', 'sailfish', 'rpm', 'erevos.spec'), join(at, 'rpm', 'erevos.spec'));
    execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', sed], { cwd: at, env: { ...process.env, EREVOS_VERSION: version } });
    return /^Version:\s*(\S+)$/m.exec(readFileSync(join(at, 'rpm', 'erevos.spec'), 'utf8'))?.[1];
  };
  assert.equal(spec('4.0.0-rc.1'), '4.0.0~rc.1');
  assert.equal(spec('3.4.3'), '3.4.3');
});
