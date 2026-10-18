import { readFile } from './attachments';
import { handOver } from './hand-over.web';
import { SHELL, shellFetch } from './shell';
import type { FileRef } from '../lock/attachment-files';

// Saving a photo or file from a chat, as save-file.ts, on a computer: the desktop app asks where
// (lib/shell.ts); a plain browser hands it over (lib/hand-over.web.ts): on a phone to the share
// sheet, elsewhere to its downloads.

export const CAN_CHOOSE_FOLDER = false;

export async function saveFolderLabel(): Promise<string | null> {
  return null;
}

export async function saveFile(ref: FileRef): Promise<string | null> {
  const bytes = await readFile(ref);
  if (!bytes) throw new Error('This file is not on this computer.');
  if (SHELL) {
    const response = await shellFetch(`/__save?name=${encodeURIComponent(ref.name)}`, { method: 'POST', body: bytes as BodyInit });
    if (response.status === 404) return null;
    return ((await response.json()) as { path: string }).path;
  }
  const how = await handOver(ref.name, ref.mime, bytes);
  if (!how) return null;
  return how === 'shared' ? 'the place you chose' : 'the downloads folder';
}
