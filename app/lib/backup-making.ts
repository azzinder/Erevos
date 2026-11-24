// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useSyncExternalStore } from 'react';

// A backup into a folder being made (Settings → Backups → Make a backup): how far it is, and what
// came of it, kept outside the screen. So leaving the screen, or Erevos, while it is made and
// coming back shows it still going, and then how it ended, as if the screen had stayed open.

export interface Making {
  step: string;
  percent: number | null;
}

export interface MadeNote {
  text: string;
  bad: boolean;
}

export interface BackupMaking {
  making: Making | null;
  note: MadeNote | null;
}

let state: BackupMaking = { making: null, note: null };
const listeners = new Set<() => void>();

function set(next: BackupMaking): void {
  state = next;
  for (const listener of listeners) listener();
}

export function backupMaking(): BackupMaking {
  return state;
}

/** How far the backup is, or null once it is done. */
export function setBackupMaking(making: Making | null): void {
  set({ ...state, making });
}

/** What came of it (or null to clear it), shown in the card until the next one. */
export function setBackupMadeNote(note: MadeNote | null): void {
  set({ ...state, note });
}

export function onBackupMaking(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBackupMaking(): BackupMaking {
  return useSyncExternalStore(onBackupMaking, backupMaking, backupMaking);
}
