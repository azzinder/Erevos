// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedLog, type Log } from '../lib/sync/log';

import { sealedFile, type Holder } from './sealed-file';

// The account's log (lib/sync/log.ts, docs/sync.md) as this device keeps it: one for each space and
// one for each hidden place that links on its own, sealed with its key, in FILE, one value for each
// (sealed-file.ts), padded to BLOCK and in pages past it. Like the links (lock/devices-data.ts), a
// backup leaves it out: put back, a device has no log, and takes the whole log from another of the
// account's devices, so it never numbers an op again as one it made before. Each space writes its
// own value again as it opens (keepSyncFile), so the file's being there says nothing of who links.

export type SyncData = { log: Log | null };

export const EMPTY_SYNC: SyncData = { log: null };

export const FILE = 'erevos-sync';

const BLOCK = 4 * 1024;

function checked(value: unknown): SyncData {
  const v = (value ?? {}) as Partial<Record<keyof SyncData, unknown>>;
  return { log: checkedLog(v.log) };
}

const store = sealedFile({ name: FILE, empty: EMPTY_SYNC, checked, block: BLOCK });

/** A space's log, or a hidden place's (`holder`). */
export const loadSyncData = (space: number, key: Uint8Array, holder: Holder = 'space') => store.load(holder, space, key);
export const saveSyncData = (space: number, key: Uint8Array, data: SyncData, holder: Holder = 'space') => store.save(holder, space, key, data);

/** Writes a space's log again as it opens, so FILE is there whichever space links. */
export async function keepSyncFile(space: number, key: Uint8Array, data: SyncData): Promise<void> {
  await store.save('space', space, key, data);
}
