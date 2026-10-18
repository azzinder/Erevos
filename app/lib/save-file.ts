import { Directory, FileMode } from 'expo-file-system';

import { eachPiece } from './attachments';
import { folderLabel, pickFolder } from './backup-place';
import { secureGet, secureSet } from './secure';
import type { FileRef } from '../lock/attachment-files';

// Saving a photo or file from a chat out of Erevos, into a folder the owner picks once with
// Android's folder picker (as backups do, lib/backup-place.ts). It is written a piece at a time,
// so a large file never sits whole in memory. Once saved it is outside Erevos, not sealed. On a
// computer, save-file.web.ts.

const FOLDER = 'erevos.save-folder';

/** Whether the folder can be changed here: on the phone, yes. */
export const CAN_CHOOSE_FOLDER = true;

/** The folder files are saved in, by name, or null if none was chosen yet. */
export async function saveFolderLabel(): Promise<string | null> {
  const folder = await secureGet(FOLDER);
  return folder ? folderLabel(folder) : null;
}

/**
 * Saves a message's file in the folder chosen before, or asks for one first (with `choose`, or
 * when there is none, or Android no longer lets Erevos write there). Returns where it went, or
 * null if the owner went back.
 */
export async function saveFile(ref: FileRef, choose = false): Promise<string | null> {
  const known = choose ? null : await secureGet(FOLDER);
  let folder = known;
  let file;
  try {
    if (!folder) throw new Error('no folder');
    file = new Directory(folder).createFile(ref.name, ref.mime);
  } catch {
    folder = await pickFolder();
    if (!folder) return null;
    await secureSet(FOLDER, folder);
    file = new Directory(folder).createFile(ref.name, ref.mime);
  }
  const handle = file.open(FileMode.Truncate);
  try {
    await eachPiece(ref, (piece) => handle.writeBytes(piece));
  } catch (error) {
    handle.close();
    try {
      file.delete();
    } catch {
      // Left half written, for the owner to delete.
    }
    throw error;
  }
  handle.close();
  return `${folderLabel(folder)}/${file.name || ref.name}`;
}
