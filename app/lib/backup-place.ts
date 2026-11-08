// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Directory, File } from 'expo-file-system';

import { backupFileName, backupFileOf, backupStem, freeStem, partFileName, staleBackups, type PartReader, type PartSink } from '../lock/backup';
import { whilePicking } from './picking';

// Where backups go on the phone (lib/backup-folder.ts): a folder the owner picks with Android's
// folder picker, on the phone, a memory card, or a cloud app that offers its folders there.
// Android lets Erevos write in that folder from then on. A folder is known by its uri. Hidden chats
// stay open while one is picked (lib/picking.ts), as a .vcf file of theirs is saved in one.
//
// A backup is a file, and its parts (photos, files and voice messages, lock/backup.ts) files beside
// it with the same start: each part is written as it is made, then the backup itself, last. One
// that fails leaves none of its files there. An automatic backup may also name parts earlier ones
// wrote there, under their names (lock/backup.ts). To restore one with parts, Erevos reads them by
// their names, whatever their start, from the folder it is in, which the owner picks, as Android
// lets an app read only the file picked, and what is in a folder picked.

/** Whether backups can be made here: always on the phone. */
export const CAN_BACK_UP = true;

/** Whether backups can be made by themselves, every day or week: on the phone, yes. */
export const CAN_AUTO_BACKUP = true;

/** Whether automatic backups can go to a server too (lib/backup-cloud.ts): on the phone, yes. */
export const CAN_CLOUD_BACKUP = true;

/** Whether a backup can be restored from such a server: on the phone, yes. */
export const CAN_CLOUD_RESTORE = true;

/** Whether the server has to let this app in (CORS): only a browser asks that. */
export const CLOUD_NEEDS_CORS = false;

/** Whether a backup's parts are picked as files, not as the folder they are in: on the phone, the folder. */
export const PICKS_PART_FILES = false;

/** A folder picked by the owner, or null if they went back. */
export async function pickFolder(): Promise<string | null> {
  try {
    return (await whilePicking(() => Directory.pickDirectoryAsync())).uri;
  } catch {
    return null;
  }
}

/** A folder's name as the owner knows it, like Download/Erevos. */
export function folderLabel(uri: string): string {
  const tree = uri.split('/tree/')[1];
  if (!tree) return uri;
  const path = decodeURIComponent(tree).replace(/\/+$/, '');
  return path.replace(/^primary:/, '') || path;
}

/** A backup written: its file's name, its size, how many parts went beside it, and where, when the folder does not say. */
export type Written = { name: string; size: number; parts: number; where?: string };

const filesIn = (folder: Directory): File[] => folder.list().filter((entry): entry is File => entry instanceof File);

/**
 * Makes a backup into the folder: `make` makes it, giving each part as it is made, which is
 * written at once, and the backup itself at the end, written last. With `keep`, deletes the older
 * backups there but the `keep` newest, with their parts.
 */
export async function writeBackup(folder: string, make: (part: PartSink) => Promise<Uint8Array>, now = Date.now(), keep = 0): Promise<Written> {
  const directory = new Directory(folder);
  const stem = freeStem(backupStem(now), filesIn(directory).map((file) => file.name));
  const written: File[] = [];
  let bytes: Uint8Array;
  let file: File;
  try {
    bytes = await make(async (part) => {
      const name = partFileName(stem, written.length + 1);
      const made = directory.createFile(name, 'application/octet-stream');
      written.push(made);
      made.write(part);
      return made.name || name;
    });
    file = directory.createFile(backupFileName(stem), 'application/octet-stream');
    // Last in the list, so one cut short goes too.
    written.push(file);
    file.write(bytes);
  } catch (error) {
    for (const part of written) {
      try {
        part.delete();
      } catch {
        // Left for the owner to delete, or for the next automatic backup.
      }
    }
    throw error;
  }
  if (keep) prune(directory, keep);
  return { name: file.name || backupFileName(stem), size: bytes.length, parts: written.length - 1 };
}

/** The backups' files in a folder, their own and their parts', each with its size (-1 where the
 *  folder does not say it): for automatic backups, which name again parts there (lock/backup.ts),
 *  then delete there those no backup kept names. Null where they cannot be listed; on the phone they
 *  always can. */
export async function listBackupFiles(folder: string): Promise<Map<string, number> | null> {
  return new Map(filesIn(new Directory(folder)).filter((file) => backupFileOf(file.name) !== null).map((file) => [file.name, file.size ?? -1]));
}

/** Deletes those of a folder's backup files; one that does not go is left for the next time. */
export async function deleteBackupFiles(folder: string, names: string[]): Promise<void> {
  const files = new Map(filesIn(new Directory(folder)).map((file) => [file.name, file]));
  for (const name of names) {
    try {
      files.get(name)?.delete();
    } catch {
      // Left for the next automatic backup.
    }
  }
}

function prune(folder: Directory, keep: number) {
  const files = filesIn(folder);
  const stale = new Set(staleBackups(files.map((file) => file.name), keep));
  for (const old of files) {
    if (!stale.has(old.name)) continue;
    try {
      old.delete();
    } catch {
      // Left for the owner to delete.
    }
  }
}

/** Where a backup's parts are, to restore it: which of their names are not there, and each one's bytes. */
export type PartSource = { missing(names: string[]): string[]; read: PartReader };

/** The parts in a folder Erevos may read (one the owner picked, or automatic backups' own), by their names. */
export async function partsIn(folder: string): Promise<PartSource> {
  const files = new Map(filesIn(new Directory(folder)).map((file) => [file.name, file]));
  return {
    missing: (names) => names.filter((name) => !files.has(name)),
    read: async (name) => {
      const file = files.get(name);
      return file?.exists ? file.bytes() : null;
    },
  };
}

/** Asks for the folder a backup's parts are in, or null if the owner went back. `names` are theirs, for where only the files themselves can be picked. */
export async function pickParts(_names: string[]): Promise<PartSource | null> {
  const folder = await pickFolder();
  return folder ? partsIn(folder) : null;
}
