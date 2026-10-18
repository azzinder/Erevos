import { backupName } from '../lock/backup';

import { SHELL, shellFetch } from './shell';

// Where backups go on a computer (lib/backup-folder.ts): a folder the owner picks in the desktop
// app (lib/shell.ts), which then writes there and nowhere else. A folder is known by its path.

/** Whether backups can be made here: in the desktop app, not in a plain browser. */
export const CAN_BACK_UP = SHELL !== null;

/** A folder picked by the owner, or null if they went back. */
export async function pickFolder(): Promise<string | null> {
  const response = await shellFetch('/__folder');
  if (response.status === 404) return null;
  return ((await response.json()) as { path: string }).path;
}

/** The folder's path, from the home folder on. */
export function folderLabel(path: string): string {
  return path.replace(/^\/(home|Users)\/[^/]+/, '~');
}

/** Writes a backup into the folder. With `keep`, deletes the older ones there but the `keep` newest. */
export async function writeBackup(folder: string, bytes: Uint8Array, now = Date.now(), keep = 0): Promise<{ name: string; size: number }> {
  const name = backupName(now);
  const query = `folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(name)}&keep=${keep}`;
  const response = await shellFetch(`/__backup?${query}`, { method: 'PUT', body: bytes as BodyInit });
  if (response.status === 404) throw new Error('That folder is not there any more. Choose it again.');
  return { name, size: bytes.length };
}
