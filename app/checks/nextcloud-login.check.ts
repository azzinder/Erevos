// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Signing in with Nextcloud (lib/nextcloud-login.ts): the address cleaned, a flow refused when its
// addresses are elsewhere, the app password waited for and the flow stopped, the owner's own files
// found, and Erevos's folders made there, ones already there kept.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CloudError, setCloudHttp, type CloudAnswer } from '../lib/backup-cloud';
import { utf8Decode, utf8Encode } from '../lib/crypto';
import { nextcloudBase, nextcloudFolder, SignInCancelled, startLoginFlow, waitForLogin } from '../lib/nextcloud-login';

const BASE = 'https://cloud.example/nextcloud';
const said = (status: number, value?: unknown): CloudAnswer => ({ status, bytes: utf8Encode(value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value)) });

test('the address is cleaned to the Nextcloud itself', () => {
  assert.equal(nextcloudBase(' cloud.example/nextcloud/ '), BASE);
  assert.equal(nextcloudBase('https://cloud.example/nextcloud/index.php/apps/files/?dir=/'), BASE);
  assert.equal(nextcloudBase('https://cloud.example/remote.php/dav/files/me/'), 'https://cloud.example');
  assert.throws(() => nextcloudBase('http://cloud.example'), CloudError);
});

test('a flow is taken only on the Nextcloud’s own address', async () => {
  try {
    let poll = `${BASE}/index.php/login/v2/poll`;
    setCloudHttp(async (method, url) => {
      assert.equal(method, 'POST');
      assert.equal(url, `${BASE}/index.php/login/v2`);
      return said(200, { login: `${BASE}/index.php/login/v2/flow/abc`, poll: { endpoint: poll, token: 'tok' } });
    });
    assert.deepEqual(await startLoginFlow(BASE), { login: `${BASE}/index.php/login/v2/flow/abc`, poll: { endpoint: poll, token: 'tok' } });
    poll = 'https://elsewhere.example/poll';
    await assert.rejects(startLoginFlow(BASE), CloudError);
    setCloudHttp(async () => said(404));
    await assert.rejects(startLoginFlow(BASE), CloudError);
  } finally {
    setCloudHttp(null);
  }
});

test('the app password is waited for, and the wait can be stopped', async () => {
  const flow = { login: `${BASE}/flow`, poll: { endpoint: `${BASE}/poll`, token: 'a&b' } };
  try {
    let asked = 0;
    setCloudHttp(async (_method, _url, _headers, body) => {
      assert.equal(utf8Decode(body!), 'token=a%26b');
      asked++;
      return asked < 3 ? said(404) : said(200, { server: BASE, loginName: 'me', appPassword: 'app-pass' });
    });
    assert.deepEqual(await waitForLogin(BASE, flow, new AbortController().signal, { every: 1 }), { base: BASE, user: 'me', password: 'app-pass' });
    assert.equal(asked, 3);

    setCloudHttp(async () => said(404));
    const stop = new AbortController();
    setTimeout(() => stop.abort(), 20);
    await assert.rejects(waitForLogin(BASE, flow, stop.signal, { every: 5 }), SignInCancelled);
    let now = 0;
    await assert.rejects(waitForLogin(BASE, flow, new AbortController().signal, { every: 1, lifetime: 10, now: () => (now += 6) }), CloudError);
  } finally {
    setCloudHttp(null);
  }
});

test('Erevos’s folders are made in the owner’s own files', async () => {
  const made: string[] = [];
  try {
    setCloudHttp(async (method, url, headers) => {
      assert.equal(headers.Authorization, `Basic ${Buffer.from('me@lphl:app-pass').toString('base64')}`);
      if (method === 'PROPFIND') {
        assert.equal(url, `${BASE}/remote.php/dav/`);
        return said(207, '<d:multistatus xmlns:d="DAV:"><d:response><d:propstat><d:prop><d:current-user-principal><d:href>/nextcloud/remote.php/dav/principals/users/u42/</d:href></d:current-user-principal></d:prop></d:propstat></d:response></d:multistatus>');
      }
      assert.equal(method, 'MKCOL');
      made.push(url);
      return said(url.endsWith('/Erevos/') ? 405 : 201);
    });
    const server = await nextcloudFolder({ base: BASE, user: 'me@lphl', password: 'app-pass' }, 'collection');
    assert.deepEqual(server, { url: `${BASE}/remote.php/dav/files/u42/Erevos/Collection/`, user: 'me@lphl', password: 'app-pass' });
    assert.deepEqual(made, [`${BASE}/remote.php/dav/files/u42/Erevos/`, `${BASE}/remote.php/dav/files/u42/Erevos/Collection/`]);

    setCloudHttp(async (method) => (method === 'PROPFIND' ? said(207, '') : said(507)));
    await assert.rejects(nextcloudFolder({ base: BASE, user: 'me', password: 'x' }, 'backups'), CloudError);
  } finally {
    setCloudHttp(null);
  }
});
