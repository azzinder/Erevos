// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { readFile } from './attachments';
import { utf8Encode } from './crypto';
import { handOver } from './hand-over.web';
import { SHELL, shellFetch } from './shell';
import type { FileRef } from '../lock/attachment-files';
import { t } from './i18n';

// Saving a photo or file from a chat, as save-file.ts, on a computer: the desktop app asks where
// (lib/shell.ts); a plain browser hands it over (lib/hand-over.web.ts): on a phone to the share
// sheet, elsewhere to its downloads. A chat written out as text (lib/chat-export.ts) too.

export const CAN_CHOOSE_FOLDER = false;

export async function saveFolderLabel(): Promise<string | null> {
  return null;
}

export async function saveFile(ref: FileRef): Promise<string | null> {
  const bytes = await readFile(ref);
  if (!bytes) throw new Error(t('This file is not on this computer.'));
  return save(ref.name, ref.mime, bytes);
}

/** Saves bytes as a file named `name` (a Matrix chat's file, lib/matrix-media.ts). */
export function saveBytes(name: string, mime: string, bytes: Uint8Array): Promise<string | null> {
  return save(name, mime, bytes);
}

export function saveText(name: string, text: string): Promise<string | null> {
  return save(name, 'text/plain', utf8Encode(text));
}

async function save(name: string, mime: string, bytes: Uint8Array): Promise<string | null> {
  if (SHELL) {
    const response = await shellFetch(`/__save?name=${encodeURIComponent(name)}`, { method: 'POST', body: bytes as BodyInit });
    if (response.status === 404) return null;
    return ((await response.json()) as { path: string }).path;
  }
  const how = await handOver(name, mime, bytes);
  if (!how) return null;
  return how === 'shared' ? t('the place you chose') : t('the downloads folder');
}
