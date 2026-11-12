// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { httpFor, type HttpAnswer, type HttpMethod } from './net-http';

// How a backup reaches a server (lib/backup-cloud.ts) on the phone: through lib/net-http.ts, so
// through Tor as the space's Tor way says, or, with `tor` (the Tor switch of what asks), only
// through Tor whatever the way. On a computer and in the web app, lib/backup-http.web.ts.

/** One request to the server; with `tor`, only through Tor. */
export function cloudRequest(method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array, most?: number, tor = false): Promise<HttpAnswer> {
  return httpFor(tor)(method, url, headers, body, most);
}
