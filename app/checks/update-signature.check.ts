// An Android update installs only with the release computer's signature (lib/update-signature.ts),
// made by pwa/release.mjs as deploy/web/publish.sh runs it. Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createPublicKey, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { RELEASE_KEY, signingOf, signsRelease, statementOf } from '../lib/update-signature';
import type { Release } from '../lib/updates';

const PWA = join(import.meta.dirname, '../../pwa');
const SHA = 'ab'.repeat(32);
const release: Release = { version: '2.0.0', build: 17, date: '2026-10-21', apk: { url: 'https://github.com/x', size: 1, sha256: SHA } };

// Ed25519 as the core checks it, from Node's own.
function nodeCore(): Core {
  const spki = (raw: Uint8Array) => createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' });
  return { signatureVerify: async (key: Uint8Array, message: Uint8Array, signature: Uint8Array) => Uint8Array.of(verify(null, message, spki(key), signature) ? 1 : 0) } as unknown as Core;
}

test("the app knows the release key's public half, and makes the statement as the release tool does", async () => {
  assert.equal(readFileSync(join(PWA, 'release-key.pub'), 'utf8').trim(), RELEASE_KEY);
  const tool = (await import('../../pwa/release.mjs')) as { androidStatement: (build: number, sha256: string) => string };
  assert.equal(tool.androidStatement(17, SHA), statementOf(17, SHA));
});

test('an APK signed by the release computer installs; any other, or another build, does not', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'erevos-sign-'));
  setCore(nodeCore());
  try {
    const env = { ...process.env, EREVOS_RELEASE_PASSPHRASE: 'only-for-this-check' };
    const run = (...args: string[]) => execFileSync('node', [join(PWA, 'release.mjs'), ...args], { env, stdio: 'pipe' });
    run('keygen', join(dir, 'key'), join(dir, 'key.pub'));
    const pub = readFileSync(join(dir, 'key.pub'), 'utf8').trim();
    // The least of a web app that the tool signs: its worker carrying the key, and its list.
    writeFileSync(join(dir, 'sw.js'), `const KEY = '${pub}';\n`);
    writeFileSync(join(dir, 'release.json'), JSON.stringify({ version: 1, files: {} }));
    run('sign', dir, join(dir, 'key'), '--android', '17', SHA);
    const text = readFileSync(join(dir, 'android-update.json'), 'utf8');
    assert.equal(await signsRelease(text, release, pub), true);
    // Signed by another key (the real one's), for another build or APK, or changed: refused.
    assert.equal(await signsRelease(text, release), false);
    assert.equal(await signsRelease(text, { ...release, build: 18 }, pub), false);
    assert.equal(await signsRelease(text, { ...release, apk: { ...release.apk!, sha256: 'cd'.repeat(32) } }, pub), false);
    const changed = JSON.parse(text) as { statement: string; signature: string };
    assert.equal(await signsRelease(JSON.stringify({ ...changed, signature: changed.signature.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) }), release, pub), false);
    assert.equal(await signsRelease('not json', release, pub), false);
    assert.equal(await signsRelease(text, { ...release, apk: null }, pub), false);
    // And Check for updates says which: none yet, or still the last build's, is not signed yet; one
    // for this build that does not check is refused.
    assert.equal(await signingOf(text, release, pub), 'signed');
    assert.equal(await signingOf(null, release, pub), 'not yet');
    assert.equal(await signingOf(text, { ...release, build: 18 }, pub), 'not yet');
    assert.equal(await signingOf(text, { ...release, build: 16 }, pub), 'refused');
    assert.equal(await signingOf(text, release), 'refused');
    assert.equal(await signingOf(text, { ...release, apk: { ...release.apk!, sha256: 'cd'.repeat(32) } }, pub), 'refused');
    assert.equal(await signingOf('not json', release, pub), 'refused');
    assert.equal(await signingOf('null', release, pub), 'refused');
    // The tool refuses a statement that is not one.
    assert.throws(() => run('sign', dir, join(dir, 'key'), '--android', '17', 'XYZ'));
    // And checks one it finds.
    run('verify', dir, join(dir, 'key.pub'));
  } finally {
    setCore(null);
    rmSync(dir, { recursive: true, force: true });
  }
});
