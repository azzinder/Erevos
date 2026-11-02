// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

/** A file of the Android app expo prebuild starts from (expo/template.tgz), by the end of its path, for the plugins' checks. */
export function templateFile(name: string): string {
  const tar = gunzipSync(readFileSync(join(import.meta.dirname, '../node_modules/expo/template.tgz')));
  const field = (from: number, length: number) => tar.toString('utf8', from, from + length).replace(/\0.*$/s, '').trim();
  for (let at = 0; at + 512 <= tar.length; ) {
    const size = parseInt(field(at + 124, 12) || '0', 8);
    if (field(at, 100).endsWith(name)) return tar.toString('utf8', at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`no ${name} in expo/template.tgz`);
}
