// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What a chat's file is opened as with another app, and what is never handed over (lib/open-type.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openType, refusedToOpen } from '../lib/open-type';

test('the name the owner sees wins over the type the sender said', () => {
  assert.equal(openType('invoice.pdf', 'text/html'), 'application/pdf');
  assert.equal(openType('invoice.PDF', 'application/octet-stream'), 'application/pdf');
  assert.equal(openType('notes', 'text/plain; charset=utf-8'), 'text/plain');
  assert.equal(openType('notes', ''), 'application/octet-stream');
});

test('web pages, drawings and app packages are not handed to another app', () => {
  assert.equal(refusedToOpen('page.html', 'text/html'), true);
  assert.equal(refusedToOpen('page.htm', 'application/octet-stream'), true);
  assert.equal(refusedToOpen('logo.svg', 'image/svg+xml'), true);
  assert.equal(refusedToOpen('app.apk', 'application/octet-stream'), true);
  assert.equal(refusedToOpen('thing', 'application/vnd.android.package-archive'), true);
  assert.equal(refusedToOpen('thing', 'TEXT/HTML; charset=utf-8'), true);
  assert.equal(refusedToOpen('invoice.pdf', 'application/pdf'), false);
  assert.equal(refusedToOpen('photo.jpg', 'image/jpeg'), false);
});
