// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The fetch whose answer comes as a stream, so a download can be stopped as soon as it is too
// large (lib/net-http.ts readCapped). In the web app, the desktop app and the checks, the page's own
// fetch streams already. On the phone, lib/net-fetch.native.ts.

export const streamingFetch: typeof fetch = (input, init) => fetch(input, init);
