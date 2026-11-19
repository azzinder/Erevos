// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { mimeOfName } from './matrix-media';

// What a chat's file is opened as with another app (lib/open-with.ts), and what is never handed
// over. The name is what the owner sees, so it wins over the type the sender said: a file named
// «invoice.pdf» said to be a web page opens as a PDF, not in the browser.

/** The type to open a file by: its name's ending when that is known, else the one it came with. */
export function openType(name: string, type: string): string {
  const byName = mimeOfName(name);
  if (byName !== 'application/octet-stream') return byName;
  const said = type.split(';')[0].trim().toLowerCase();
  return said || 'application/octet-stream';
}

// Web pages and drawings run in the other app and may fetch from the internet outside Tor, with no
// warning first; an app package goes to the installer with Erevos as where it came from.
const REFUSED_TYPES = new Set(['text/html', 'application/xhtml+xml', 'image/svg+xml', 'application/vnd.android.package-archive', 'application/xml', 'text/xml']);
const REFUSED_ENDINGS = new Set(['html', 'htm', 'xhtml', 'shtml', 'mht', 'mhtml', 'svg', 'svgz', 'apk', 'apks', 'xapk', 'xml']);

/** Whether a file must not be opened with another app, by its name's ending or by either type. */
export function refusedToOpen(name: string, type: string): boolean {
  const end = /\.([a-z0-9]+)$/i.exec(name.trim())?.[1]?.toLowerCase() ?? '';
  const said = type.split(';')[0].trim().toLowerCase();
  return REFUSED_ENDINGS.has(end) || REFUSED_TYPES.has(said) || REFUSED_TYPES.has(openType(name, type));
}
