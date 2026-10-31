// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sealedFile, type Holder } from './sealed-file';

// The pieces of photos that came through Nostr and wait for the message that offers them
// (lib/nostr-pieces.ts), each space's and each hidden place's apart: which pieces it holds, when
// each came and where it lies, kept in FILE, one value for each space and each hidden place
// (sealed-file.ts), sealed with its key, so neither whether a place waits for pieces nor how many
// shows outside its password. Each piece lies in two pages sealed with the same key, of PAGE
// bytes each and named by a random id after PAGE_PREFIX, among the history's pages and alike to
// them. A space writes its own value as it opens, should it find none it opens, so the file is
// there whether or not any place ever waited for a piece. In backups, with the pages.

/** A piece kept: its id (lib/nostr-pieces.ts pieceId), when it came (ms) and its two pages' ids, one after the other. */
export type KeptPiece = [id: string, at: number, pages: string];

export type PiecesData = { pieces: KeptPiece[] };

export const EMPTY_PIECES: PiecesData = { pieces: [] };

export const FILE = 'erevos-nostr-pieces';
const BLOCK = 4 * 1024;

const ID = /^[0-9a-f]{48}$/;

function checked(value: unknown): PiecesData {
  const list = (value as { pieces?: unknown } | null)?.pieces;
  if (!Array.isArray(list)) return { pieces: [] };
  const seen = new Set<string>();
  const pieces: KeptPiece[] = [];
  for (const entry of list) {
    if (!Array.isArray(entry) || entry.length !== 3) continue;
    const [id, at, pages] = entry as unknown[];
    if (typeof id !== 'string' || !ID.test(id) || seen.has(id) || !Number.isSafeInteger(at) || (at as number) < 0 || typeof pages !== 'string' || !ID.test(pages)) continue;
    seen.add(id);
    pieces.push([id, at as number, pages]);
  }
  return { pieces };
}

const store = sealedFile({ name: FILE, empty: EMPTY_PIECES, checked, block: BLOCK });

export const loadPiecesData = (holder: Holder, space: number, key: Uint8Array) => store.load(holder, space, key);
export const savePiecesData = (holder: Holder, space: number, key: Uint8Array, data: PiecesData) => store.save(holder, space, key, data);

/** Writes a space's value, empty, when it does not open with its key: FILE is not there yet, or another space wrote it first. */
export async function keepPiecesFile(space: number, key: Uint8Array): Promise<void> {
  if (!(await store.opens('space', space, key))) await store.save('space', space, key, EMPTY_PIECES);
}
