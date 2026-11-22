// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { UPDATE_EDITIONS, type UpdateEdition } from './update-channel';

// The note one edition leaves beside its move for another (lib/edition-move.ts), read with care:
// it comes from another app, even if one signed as this one.

/** How long a move waits for the edition it is for. */
export const MOVE_WAITS = 24 * 60 * 60 * 1000;

/** What move.json says: from which edition to which, when made, the backup and its parts, and their password. */
export type MoveNote = { v: 1; from: UpdateEdition; to: UpdateEdition; made: number; backup: string; parts: string[]; password: string };

/** move.json, checked: null for anything else, or a move made more than MOVE_WAITS ago (or ahead of `now`). */
export function readMoveNote(text: string, now = Date.now()): MoveNote | null {
  let v: Record<string, unknown> | null;
  try {
    v = JSON.parse(text) as Record<string, unknown> | null;
  } catch {
    return null;
  }
  if (!v || v.v !== 1) return null;
  const edition = (x: unknown): x is UpdateEdition => typeof x === 'string' && (UPDATE_EDITIONS as readonly string[]).includes(x);
  const name = (x: unknown): x is string => typeof x === 'string' && /^move(-part-\d{1,6})?\.erevos$/.test(x);
  if (!edition(v.from) || !edition(v.to) || v.from === v.to) return null;
  if (typeof v.made !== 'number' || !(v.made <= now + 60_000 && now - v.made < MOVE_WAITS)) return null;
  if (!name(v.backup) || !Array.isArray(v.parts) || v.parts.length > 100_000 || !v.parts.every(name)) return null;
  if (typeof v.password !== 'string' || !/^[0-9a-f]{64}$/.test(v.password)) return null;
  return { v: 1, from: v.from, to: v.to, made: v.made, backup: v.backup, parts: v.parts as string[], password: v.password };
}
