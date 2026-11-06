// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { startActivityAsync } from 'expo-intent-launcher';
import { Directory, File, FileMode, Paths } from 'expo-file-system';

import type { CollectionItem } from '../lock/collection-data';
import { eachPiece } from './attachments';
import { randomBytes, toHex } from './crypto';
import type { SharedFile } from './share-in';

// Taking a file out of the Collection, on the phone, in the two ways that leave a plain copy in
// the app's cache for a while: to send it to a chat, as a file another app shared is sent
// (lib/share-in.ts, whose copy is deleted once the chat has read it), and to open it with another
// app, which Android lets read it through a link (the copy is deleted when the screen closes, and
// any left behind with the next start). The copy is written a piece at a time. Saving to the
// phone's own folders is lib/save-file.ts. On a computer, collection-out.web.ts.

const OPENING = 'erevos-open-';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

async function writePieces(item: CollectionItem, file: File): Promise<void> {
  file.create();
  const handle = file.open(FileMode.Truncate);
  try {
    await eachPiece(item.file, (piece) => handle.writeBytes(piece));
  } finally {
    handle.close();
  }
}

/** A plain copy of the file in the cache, named as Send to names the copies of what is shared (lib/share-in.ts), to hand to a chat; the chat deletes it once read. */
export async function copyToSend(item: CollectionItem): Promise<SharedFile> {
  const name = `erevos-shared-${toHex(randomBytes(8))}`;
  const copy = new File(Paths.cache, name);
  try {
    await writePieces(item, copy);
  } catch (error) {
    if (copy.exists) copy.delete();
    throw error;
  }
  return { file: name, name: item.file.name, mime: item.file.mime };
}

/** Deletes the copies made to open files with another app. */
export function dropOpened(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof Directory && entry.name.startsWith(OPENING)) entry.delete();
    }
  } catch {
    // Tried again with the next one.
  }
}

/** Opens the file with the app Android offers for its type, from a plain copy in the cache that stays until `dropOpened`. */
export async function openWithOtherApp(item: CollectionItem): Promise<void> {
  dropOpened();
  const folder = new Directory(Paths.cache, `${OPENING}${toHex(randomBytes(8))}`);
  folder.create();
  const copy = new File(folder, item.file.name);
  try {
    await writePieces(item, copy);
    await startActivityAsync('android.intent.action.VIEW', { data: copy.contentUri, type: item.file.mime, flags: FLAG_GRANT_READ_URI_PERMISSION });
  } catch (error) {
    if (folder.exists) folder.delete();
    throw error;
  }
}
