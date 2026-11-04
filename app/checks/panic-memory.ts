// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The panic button (lib/panic.ts) for checks under Node: it only keeps the folder a wipe would
// delete automatic backups in, as it was told last.
export const panic = { folder: null as string | null };

export function panicFolderChanged(folder: string): void {
  panic.folder = folder;
}
