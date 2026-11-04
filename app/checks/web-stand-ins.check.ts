// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Some libraries are for the phone only. A file beside its .web twin (components/keyboard.tsx and
// components/keyboard.web.tsx) takes them, and every screen takes its parts from that file, so the
// web app and the computer's get the stand-in. A screen that took the library itself put it in the
// web build too: 6.0.0-rc.1's first-start setup did, and the web page threw "PromiseResolve called
// on non-object" as it opened.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const APP = join(import.meta.dirname, '..');

/** Each phone-only library, and the one file allowed to take it. */
const PHONE_ONLY: Record<string, string> = {
  'react-native-keyboard-controller': 'components/keyboard.tsx',
};

const sources = execFileSync('git', ['ls-files', '-z', '--', '*.ts', '*.tsx'], { cwd: APP, encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && !f.startsWith('checks/'));

test('a phone-only library is taken by its own file alone, so the web build gets the stand-in', () => {
  for (const [library, own] of Object.entries(PHONE_ONLY)) {
    const from = new RegExp(`from '${library.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
    const takers = sources.filter((f) => from.test(readFileSync(join(APP, f), 'utf8')));
    assert.deepEqual(takers, [own], `${library} outside ${own}`);
  }
});
