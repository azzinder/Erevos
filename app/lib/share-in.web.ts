// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Source } from './attachments';

// On a computer no other app shares with Erevos (share-in.ts is Android's): nothing is ever shared
// in. Only files of the Collection sent to a chat in the desktop app (lib/collection-out.web.ts)
// go through here, each held in memory as a source (`held`) and never as a copy on the disk: handed
// to the chat or group about to open, for a minute at most, and read there as a picked file is.

export type SharedFile = { file: string; name: string; mime: string; held?: Source; w?: number; h?: number };

export type SharedSource = { name: string; mime: string; source: Source; w?: number; h?: number; close(): void };

// What goes as a photo, as share-in.ts says.
const PHOTOS = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']);
const FRESH = 60_000;

export const isSharedCopy = (_file: string) => false;

export function sharedFileOf(_params: { file?: string; name?: string; mime?: string }): SharedFile | null {
  return null;
}

export function isSharedPhoto(shared: SharedFile): boolean {
  return !!shared.held && PHOTOS.has(shared.mime);
}

// Nothing lies on the disk to delete.
export function dropShared(_shared: SharedFile): void {}

let handed: { to: string; shared: SharedFile[]; until: number } | null = null;

/** Hands files of the Collection to the screen of `to` about to open (`contact:` and an identity, or `group:` and an id). */
export function handShared(to: string, shared: SharedFile | SharedFile[], now = Date.now()): void {
  const list = (Array.isArray(shared) ? shared : [shared]).filter((s) => s.held);
  handed = list.length > 0 ? { to, shared: list, until: now + FRESH } : null;
}

/** The next file handed to `to`, once each. */
export function takeShared(to: string, now = Date.now()): SharedFile | null {
  const kept = handed;
  if (!kept || kept.to !== to) return null;
  if (kept.until <= now) {
    handed = null;
    return null;
  }
  const next = kept.shared.shift() ?? null;
  if (kept.shared.length === 0) handed = null;
  return next;
}

/** A file handed to a chat, read from memory or from its encrypted chunks as it goes. */
export async function readShared(shared: SharedFile): Promise<SharedSource> {
  if (!shared.held) throw new Error('Nothing is shared in on a computer');
  return { name: shared.name, mime: shared.mime, source: shared.held, w: shared.w, h: shared.h, close: () => undefined };
}
