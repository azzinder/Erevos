import { Directory, File } from 'expo-file-system';

import { BACKUP_PREFIX, backupName } from '../lock/backup';

// Where backups go on the phone (lib/backup-folder.ts): a folder the owner picks with Android's
// folder picker, on the phone, a memory card, or a cloud app that offers its folders there.
// Android lets Erevos write in that folder from then on. A folder is known by its uri.

/** Whether backups can be made here: always on the phone. */
export const CAN_BACK_UP = true;

/** Whether backups can be made by themselves, every day or week: on the phone, yes. */
export const CAN_AUTO_BACKUP = true;

/** A folder picked by the owner, or null if they went back. */
export async function pickFolder(): Promise<string | null> {
  try {
    return (await Directory.pickDirectoryAsync()).uri;
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

/** Writes a backup into the folder. With `keep`, deletes the older ones there but the `keep` newest. */
export async function writeBackup(folder: string, bytes: Uint8Array, now = Date.now(), keep = 0): Promise<{ name: string; size: number; where?: string }> {
  const directory = new Directory(folder);
  const name = backupName(now);
  const file = directory.createFile(name, 'application/octet-stream');
  file.write(bytes);
  if (keep) prune(directory, keep);
  return { name: file.name || name, size: bytes.length };
}

// Their names hold the date, so the oldest sort first.
function prune(folder: Directory, keep: number) {
  const backups = folder
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.startsWith(BACKUP_PREFIX))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const old of backups.slice(0, Math.max(0, backups.length - keep))) {
    try {
      old.delete();
    } catch {
      // Left for the owner to delete.
    }
  }
}
