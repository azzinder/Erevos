import { Directory, File } from 'expo-file-system';

import { BACKUP_PREFIX, backupName, makeBackup, type BackupKey } from '../lock/backup';

import { fromBase64, toBase64 } from './crypto';
import { secureDelete, secureGet, secureSet } from './secure';

// Backups (lock/backup.ts) written to a folder the owner picks with Android's folder picker: on
// the phone, a memory card, or a cloud app that offers its folders there. Android lets Erevos
// write in that folder from then on.
//
// Automatic backups are made when a space opens and the last one is older than the days chosen,
// into the folder chosen, which keeps the KEEP newest. Their settings are kept in the keystore
// entry AUTO, outside every space and out of backups, with the key their password gives, so
// they need no password each time. Whichever space opens, the setting is the same, and the
// backups are of all of them.

/** How automatic backups are made. `every` is days, 0 when off; `last` milliseconds, 0 if never. */
export type AutoBackup = { every: number; folder: string; key: string; salt: string; iter: number; last: number; error: string };

const AUTO = 'erevos.backup-auto';
const DAY = 24 * 3600 * 1000;
export const KEEP = 3;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A folder picked by the owner, or null if they went back. */
export async function pickFolder(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch {
    return null;
  }
}

/** A folder's name as the owner knows it, like Download/Erevos. */
export function folderLabel(uri: string): string {
  const tree = uri.split('/tree/')[1];
  if (!tree) return uri;
  const path = decodeURIComponent(tree);
  return path.replace(/^primary:/, '') || path;
}

/** Writes a backup into `folder`. Returns the file's name and size in bytes. */
export function writeBackup(folder: Directory, bytes: Uint8Array, now = Date.now()): { name: string; size: number } {
  const name = backupName(now);
  const file = folder.createFile(name, 'application/octet-stream');
  file.write(bytes);
  return { name: file.name || name, size: bytes.length };
}

// Deletes the older backups in the folder, keeping the KEEP newest. Their names hold the date.
function prune(folder: Directory) {
  const backups = folder
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.startsWith(BACKUP_PREFIX))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const old of backups.slice(0, Math.max(0, backups.length - KEEP))) {
    try {
      old.delete();
    } catch {
      // Left for the owner to delete.
    }
  }
}

export async function loadAutoBackup(): Promise<AutoBackup | null> {
  try {
    const value = JSON.parse((await secureGet(AUTO)) ?? 'null') as Partial<AutoBackup> | null;
    if (!value || typeof value.folder !== 'string' || typeof value.key !== 'string' || typeof value.salt !== 'string') return null;
    return {
      every: typeof value.every === 'number' ? value.every : 0,
      folder: value.folder,
      key: value.key,
      salt: value.salt,
      iter: typeof value.iter === 'number' ? value.iter : 0,
      last: typeof value.last === 'number' ? value.last : 0,
      error: typeof value.error === 'string' ? value.error : '',
    };
  } catch {
    return null;
  }
}

/**
 * Turns automatic backups on, every `every` days into the folder at `folder` (its uri), with the
 * key of their password. Setting them again, with a new password, starts them anew.
 */
export async function startAutoBackup(every: number, folder: string, { key, salt, iter }: BackupKey): Promise<AutoBackup> {
  const auto: AutoBackup = { every, folder, key: toBase64(key), salt: toBase64(salt), iter, last: 0, error: '' };
  await secureSet(AUTO, JSON.stringify(auto));
  return auto;
}

export async function changeAutoBackup(patch: Partial<Pick<AutoBackup, 'every' | 'folder'>>): Promise<AutoBackup | null> {
  const auto = await loadAutoBackup();
  if (!auto) return null;
  const next = { ...auto, ...patch, error: '' };
  await secureSet(AUTO, JSON.stringify(next));
  return next;
}

export async function stopAutoBackup(): Promise<void> {
  await secureDelete(AUTO);
}

let running: Promise<AutoBackup | null> | null = null;

/**
 * Makes an automatic backup if one is due (or `now` anyway, with `force`). Returns the settings
 * as they are after it; a backup that failed says why in `error`, and is tried again next time.
 */
export function runAutoBackup(force = false, now = Date.now()): Promise<AutoBackup | null> {
  running ??= (async () => {
    const auto = await loadAutoBackup();
    if (!auto || !auto.every || (!force && now - auto.last < auto.every * DAY)) return auto;
    let next: AutoBackup;
    try {
      const folder = new Directory(auto.folder);
      writeBackup(folder, await makeBackup({ key: fromBase64(auto.key), salt: fromBase64(auto.salt), iter: auto.iter }), now);
      prune(folder);
      next = { ...auto, last: now, error: '' };
    } catch (error) {
      next = { ...auto, error: errorText(error) };
    }
    await secureSet(AUTO, JSON.stringify(next));
    return next;
  })().finally(() => {
    running = null;
  });
  return running;
}
