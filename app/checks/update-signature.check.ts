// An Android update installs only with the release computer's signature (lib/update-signature.ts),
// made by pwa/release.mjs as deploy/web/publish.sh runs it, and a new version is told at the top of
// the chats only with it too (lib/release-notice.ts). Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createPublicKey, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { loadNotice, lookForRelease, mayAsk, NOTICE_EVERY, NOTICE_SERVER, noticeSeen, setNoticeOn, shownRelease, toldBy } from '../lib/release-notice';
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

// A release computer of this check's own, signing a web app's list and an APK as publish.sh does.
function releaseComputer() {
  const dir = mkdtempSync(join(tmpdir(), 'erevos-notice-'));
  const env = { ...process.env, EREVOS_RELEASE_PASSPHRASE: 'only-for-this-check' };
  const run = (...args: string[]) => execFileSync('node', [join(PWA, 'release.mjs'), ...args], { env, stdio: 'pipe' });
  run('keygen', join(dir, 'key'), join(dir, 'key.pub'));
  const pub = readFileSync(join(dir, 'key.pub'), 'utf8').trim();
  writeFileSync(join(dir, 'sw.js'), `const KEY = '${pub}';\n`);
  const publish = (build: number, label: string) => {
    writeFileSync(join(dir, 'release.json'), JSON.stringify({ version: 1, label, files: {} }));
    run('sign', dir, join(dir, 'key'), '--android', String(build), SHA);
    return {
      statement: readFileSync(join(dir, 'android-update.json'), 'utf8'),
      body: new Uint8Array(readFileSync(join(dir, 'release.json'))),
      sig: readFileSync(join(dir, 'release.sig'), 'utf8'),
    };
  };
  return { pub, publish, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('a new version is told only when the release computer signed both its build and its name', async () => {
  const computer = releaseComputer();
  setCore(nodeCore());
  try {
    const { statement, body, sig } = computer.publish(29, '3.2.1');
    assert.deepEqual(await toldBy(statement, body, sig, computer.pub), { build: 29, name: '3.2.1' });
    // Another key (the real one), a changed name or build, a signature swapped, or no name: nothing.
    assert.equal(await toldBy(statement, body, sig), null);
    const other = new TextEncoder().encode(new TextDecoder().decode(body).replace('3.2.1', '9.9.9'));
    assert.equal(await toldBy(statement, other, sig, computer.pub), null);
    const s = JSON.parse(statement) as { statement: string; signature: string };
    assert.equal(await toldBy(JSON.stringify({ ...s, statement: s.statement.replace('build 29', 'build 30') }), body, sig, computer.pub), null);
    assert.equal(await toldBy(statement, body, s.signature, computer.pub), null);
    assert.equal(await toldBy('not json', body, sig, computer.pub), null);
    assert.equal(await toldBy(statement, body, 'not base64!', computer.pub), null);
    const unnamed = computer.publish(29, '');
    assert.equal(await toldBy(unnamed.statement, unnamed.body, unnamed.sig, computer.pub), null);
    const odd = computer.publish(29, 'v3.2.1');
    assert.equal(await toldBy(odd.statement, odd.body, odd.sig, computer.pub), null);
    // A test release is told by its name.
    const rc = computer.publish(45, '4.0.0-rc.1');
    assert.deepEqual(await toldBy(rc.statement, rc.body, rc.sig, computer.pub), { build: 45, name: '4.0.0-rc.1' });
  } finally {
    setCore(null);
    computer.done();
  }
});

test("only a space on LPHL's relay that does not send everything through Tor asks", () => {
  assert.equal(mayAsk({ url: 'wss://erevos.lphl.nekten.eu', tor: 'messages' }), true);
  assert.equal(mayAsk({ url: ' wss://erevos.lphl.nekten.eu/ ', tor: 'nothing' }), true);
  assert.equal(mayAsk({ url: 'wss://erevos.lphl.nekten.eu', tor: 'all' }), false);
  assert.equal(mayAsk({ url: 'wss://relay.example.org', tor: 'messages' }), false);
  assert.equal(mayAsk({ url: '', tor: 'messages' }), false);
});

test('the server is asked once a day, and a release is told once, while it is newer than this app', async () => {
  const computer = releaseComputer();
  setCore(nodeCore());
  const serving = (files: ReturnType<typeof computer.publish>) => {
    const asked: string[] = [];
    const fetchImpl = (async (url: string) => {
      asked.push(url);
      const name = url.slice(NOTICE_SERVER.length);
      const bytes = name === 'android-update.json' ? files.statement : name === 'release.json' ? files.body : name === 'release.sig' ? files.sig : null;
      return bytes === null ? new Response('', { status: 404 }) : new Response(bytes);
    }) as unknown as typeof fetch;
    return { asked, fetchImpl };
  };
  const lphl = { url: 'wss://erevos.lphl.nekten.eu', tor: 'messages' };
  const day = Date.UTC(2026, 9, 25);
  try {
    const v321 = serving(computer.publish(29, '3.2.1'));
    // Signed by a key that is not the app's: asked, and nothing told.
    assert.equal(await lookForRelease(lphl, 28, day, v321.fetchImpl), null);
    assert.deepEqual([...v321.asked].sort(), ['android-update.json', 'release.json', 'release.sig'].map((n) => NOTICE_SERVER + n).sort());
    // Not asked again the same day, nor by a space that may not ask, nor when turned off.
    v321.asked.length = 0;
    assert.equal(await lookForRelease(lphl, 28, day + NOTICE_EVERY - 1, v321.fetchImpl, computer.pub), null);
    assert.equal(await lookForRelease({ ...lphl, tor: 'all' }, 28, day + NOTICE_EVERY, v321.fetchImpl, computer.pub), null);
    await setNoticeOn(false);
    assert.equal(await lookForRelease(lphl, 28, day + NOTICE_EVERY, v321.fetchImpl, computer.pub), null);
    assert.deepEqual(v321.asked, []);
    await setNoticeOn(true);
    // The next day, signed by the app's key: told, once, and kept as not opened yet.
    assert.deepEqual(await lookForRelease(lphl, 28, day + NOTICE_EVERY, v321.fetchImpl, computer.pub), { build: 29, name: '3.2.1' });
    assert.deepEqual(shownRelease(await loadNotice(), 28), { build: 29, name: '3.2.1' });
    assert.equal((await loadNotice()).seen, false);
    assert.equal(await lookForRelease(lphl, 28, day + 2 * NOTICE_EVERY, v321.fetchImpl, computer.pub), null);
    await noticeSeen();
    // A release no newer than this app is not told; one newer than the last told is.
    const v330 = serving(computer.publish(30, '3.3.0'));
    assert.equal(await lookForRelease(lphl, 30, day + 3 * NOTICE_EVERY, v330.fetchImpl, computer.pub), null);
    assert.deepEqual(await lookForRelease(lphl, 28, day + 4 * NOTICE_EVERY, v330.fetchImpl, computer.pub), { build: 30, name: '3.3.0' });
    assert.equal((await loadNotice()).seen, false);
    // Once installed, it is shown no more.
    assert.equal(shownRelease(await loadNotice(), 30), null);
    // A server that does not answer throws, and is not asked again that day.
    const down = (async () => new Response('', { status: 502 })) as unknown as typeof fetch;
    await assert.rejects(lookForRelease(lphl, 30, day + 5 * NOTICE_EVERY, down, computer.pub));
    assert.equal(await lookForRelease(lphl, 30, day + 5 * NOTICE_EVERY + 1, down, computer.pub), null);
  } finally {
    setCore(null);
    computer.done();
  }
});

test('what is kept says which release to show, until it is installed, and whether it was opened', async () => {
  const kept = { on: true, at: 0, build: 29, name: '3.2.1', seen: false };
  assert.deepEqual(shownRelease(kept, 28), { build: 29, name: '3.2.1' });
  assert.equal(shownRelease(kept, 29), null);
  assert.equal(shownRelease({ ...kept, on: false }, 28), null);
  assert.equal(shownRelease({ ...kept, name: '' }, 28), null);
  await noticeSeen();
  assert.equal((await loadNotice()).seen, true);
});
