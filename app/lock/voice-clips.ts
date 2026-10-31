// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { decryptBytes, encryptBytes, fromHex, randomBytes, toHex } from '../lib/crypto';
import { deleteFile, readBytes, writeBytes } from '../lib/files';

// The sound of each voice message, in its own file in the app's folder, sealed with a key of its
// own. The key, the file's name and how long it is are kept only in the message (lock/history.ts),
// itself sealed in its space: without them a file is noise, and its name tells nothing. Deleting
// the message deletes its file. How many files there are, and their sizes, tell roughly how many
// voice messages the phone keeps, in all its spaces together.

/** Where a voice message's sound is: its file's id and key, hex, and how long it lasts, milliseconds. */
export type VoiceRef = { id: string; key: string; ms: number };

export const PREFIX = 'erevos-voice-';
const ID = /^[0-9a-f]{32}$/;
const KEY = /^[0-9a-f]{64}$/;

export function isVoiceRef(value: unknown): value is VoiceRef {
  const v = value as Partial<VoiceRef> | null;
  return typeof v?.id === 'string' && ID.test(v.id) && typeof v.key === 'string' && KEY.test(v.key) && typeof v.ms === 'number' && v.ms >= 0;
}

/** Seals a voice message's sound in a new file. */
export async function saveClip(audio: Uint8Array, ms: number): Promise<VoiceRef> {
  const key = randomBytes(32);
  const id = toHex(randomBytes(16));
  await writeBytes(PREFIX + id, encryptBytes(key, audio));
  return { id, key: toHex(key), ms: Math.max(0, Math.round(ms)) };
}

/** The sound, or null when its file is gone. Throws if the file was changed. */
export async function loadClip(ref: VoiceRef): Promise<Uint8Array | null> {
  const sealed = await readBytes(PREFIX + ref.id);
  return sealed ? decryptBytes(fromHex(ref.key), sealed) : null;
}

export async function deleteClip(id: string): Promise<void> {
  if (ID.test(id)) await deleteFile(PREFIX + id);
}
