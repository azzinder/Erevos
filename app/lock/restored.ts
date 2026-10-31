// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { randomBytes, toHex } from '../lib/crypto';
import { secureGet, secureSet } from '../lib/secure';

// Which restore of a backup this phone last had. A backup holds each chat's conversations as
// they were when it was made, and a conversation put back that way would seal its next messages
// with the very message keys it used after the backup, key and nonce alike: whoever kept the
// packets of both could read what the two say together. So restoring a backup marks the phone
// with a new random id, kept outside the backup, and each chat that opens with conversations
// from before that mark first moves them past the keys they may have used (lib/e2e.ts).
//
// The mark says only that a backup was restored here, not which spaces or chats it held.

const KEY = 'erevos.restored';

/** The id of the last restore of a backup on this phone, or '' when none was restored. */
export async function lastRestore(): Promise<string> {
  const id = await secureGet(KEY);
  return id && /^[0-9a-f]{32}$/.test(id) ? id : '';
}

/** Marks a restore of a backup. */
export async function markRestore(): Promise<void> {
  await secureSet(KEY, toHex(randomBytes(16)));
}
