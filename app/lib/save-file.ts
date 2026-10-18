import { Directory, File, FileMode, Paths } from 'expo-file-system';

import { eachPiece } from './attachments';
import { folderLabel, pickFolder } from './backup-place';
import { randomBytes, toHex } from './crypto';
import { secureGet, secureSet } from './secure';
import { freeName, type FileRef } from '../lock/attachment-files';

// Saving a photo or file from a chat out of Erevos, into a folder the owner picks once with
// Android's folder picker (as backups do, lib/backup-place.ts). It is written a piece at a time,
// so a large file never sits whole in memory: into the app's own cache first, as Android may close
// a folder's file while it is still being written, then copied into the folder in one go and the
// cache's copy deleted. Once saved it is outside Erevos, not sealed. On a computer, save-file.web.ts.

const FOLDER = 'erevos.save-folder';
const SAVING = 'erevos-save-';
// The cache folders being written now; any other is left over from a save that never ended.
const writing = new Set<string>();

/** Whether the folder can be changed here: on the phone, yes. */
export const CAN_CHOOSE_FOLDER = true;

/** The folder files are saved in, by name, or null if none was chosen yet. */
export async function saveFolderLabel(): Promise<string | null> {
  const folder = await secureGet(FOLDER);
  return folder ? folderLabel(folder) : null;
}

function clearLeftovers(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof Directory && entry.name.startsWith(SAVING) && !writing.has(entry.uri)) entry.delete();
    }
  } catch {
    // Tried again with the next save.
  }
}

// The names in the folder, or null when Android no longer lets Erevos see it.
function namesIn(folder: string): Set<string> | null {
  try {
    return new Set(new Directory(folder).list().map((entry) => entry.name));
  } catch {
    return null;
  }
}

/**
 * Saves a message's file in the folder chosen before, or asks for one first (with `choose`, or
 * when there is none, or Android no longer lets Erevos see it). Returns where it went, or null if
 * the owner went back.
 */
export async function saveFile(ref: FileRef, choose = false): Promise<string | null> {
  let folder = choose ? null : await secureGet(FOLDER);
  let taken = folder ? namesIn(folder) : null;
  if (!folder || !taken) {
    folder = await pickFolder();
    if (!folder) return null;
    await secureSet(FOLDER, folder);
    taken = namesIn(folder) ?? new Set();
  }
  const name = freeName(ref.name, taken);
  clearLeftovers();
  const staging = new Directory(Paths.cache, `${SAVING}${toHex(randomBytes(8))}`);
  writing.add(staging.uri);
  try {
    staging.create();
    const plain = new File(staging, name);
    plain.create();
    const handle = plain.open(FileMode.Truncate);
    try {
      await eachPiece(ref, (piece) => handle.writeBytes(piece));
    } finally {
      handle.close();
    }
    await plain.copy(new Directory(folder));
  } finally {
    writing.delete(staging.uri);
    if (staging.exists) staging.delete();
  }
  return `${folderLabel(folder)}/${name}`;
}
