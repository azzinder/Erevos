// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { register } from 'node:module';

register('./node-hooks.mjs', import.meta.url);

// The checks read the app's words as Erevos has them, whichever edition they run as: what Erevos+
// says in its own name, checks/edition.check.ts checks apart (lib/edition.ts ownNames).
globalThis.__EREVOS_PLAIN_NAMES__ = true;
