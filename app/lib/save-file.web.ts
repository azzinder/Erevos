// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { FileMissingError, readFile, refSource, type Source } from './attachments';
import { utf8Encode } from './crypto';
import { handOver } from './hand-over.web';
import { SHELL, ShellError, shellFetch } from './shell';
import type { FileRef } from '../lock/attachment-files';
import { t } from './i18n';

// Saving a photo or file from a chat, as save-file.ts, on a computer: the desktop app asks where
// (lib/shell.ts); a plain browser hands it over (lib/hand-over.web.ts): on a phone to the share
// sheet, elsewhere to its downloads. A chat written out as text (lib/chat-export.ts) too.
//
// A file of a chat or of the Collection goes to the shell (the desktop app, Sailfish OS) a piece at
// a time, decrypted as it goes (saveInPieces), so one of some GB is never held whole; a browser
// needs it whole, so there the Collection saves up to 256 MB (lib/collection-memory.ts).

// A piece of a file saved through the shell: small, as Sailfish OS holds each one in memory twice.
const SAVE_PIECE = 4 * 1024 * 1024;

export const CAN_CHOOSE_FOLDER = false;

export async function saveFolderLabel(): Promise<string | null> {
  return null;
}

export async function saveFile(ref: FileRef): Promise<string | null> {
  if (SHELL) return saveInPieces(ref.name, refSource(ref));
  const bytes = await readFile(ref);
  if (!bytes) throw new Error(t('This file is not on this computer.'));
  return save(ref.name, ref.mime, bytes);
}

/**
 * Saves `source` through the shell a piece at a time (/__save?pieces=1, then /__saving): the
 * desktop app writes it where the owner chose, Sailfish OS in Downloads, each under its name only
 * once it is all there. The first piece is read before anything is asked, so a file that is not
 * here says so at once. Null when the owner cancelled.
 */
async function saveInPieces(name: string, source: Source): Promise<string | null> {
  const piece = (at: number) => source.read(at, Math.min(SAVE_PIECE, source.size - at));
  let first: Uint8Array;
  try {
    first = await piece(0);
  } catch (error) {
    if (error instanceof FileMissingError) throw new Error(t('This file is not on this computer.'));
    throw error;
  }
  const begun = await shellFetch(`/__save?name=${encodeURIComponent(name)}&pieces=1`, { method: 'POST' });
  if (begun.status === 404) return null;
  const saving = `/__saving?id=${encodeURIComponent(((await begun.json()) as { id: string }).id)}`;
  // 404 and 413 are not errors to shellFetch: here they are (the shell forgot the file, or a piece too large).
  const sure = (response: Response) => {
    if (!response.ok) throw new ShellError(t('The desktop app answered {status}.', { status: response.status }));
    return response;
  };
  try {
    for (let at = 0; at < source.size; at += SAVE_PIECE) {
      const bytes = at === 0 ? first : await piece(at);
      sure(await shellFetch(`${saving}&at=${at}`, { method: 'PUT', body: bytes as BodyInit }));
    }
    const done = sure(await shellFetch(`${saving}&done=1`, { method: 'POST' }));
    return ((await done.json()) as { path: string }).path;
  } catch (error) {
    await shellFetch(saving, { method: 'DELETE' }).catch(() => undefined);
    if (error instanceof FileMissingError) throw new Error(t('This file is not on this computer.'));
    throw error;
  }
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
