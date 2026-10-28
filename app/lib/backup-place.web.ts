import { backupName } from '../lock/backup';

import { handOver } from './hand-over.web';
import { SHELL, shellFetch } from './shell';
import { t } from './i18n';

// Where backups go on a computer (lib/backup-folder.ts): a folder the owner picks in the desktop
// app (lib/shell.ts), which then writes there and nowhere else. A folder is known by its path.
// In a plain browser (the web app) there is no folder: each backup is handed over as a file
// (lib/hand-over.web.ts), to the share sheet on a phone or the downloads on a computer. A browser
// gives a file out only after a tap, so it makes no backups by itself.

/** Whether backups can be made here. */
export const CAN_BACK_UP = true;

/** Whether backups can be made by themselves, every day or week: in the desktop app. */
export const CAN_AUTO_BACKUP = SHELL !== null;

/** Whether automatic backups can go to a server too (lib/backup-cloud.ts): not yet. A browser
 *  reaches no server that does not let it, as WebDAV servers do not. */
export const CAN_CLOUD_BACKUP = false;

// The one "folder" of a plain browser.
const HANDED = 'browser';

/** A folder picked by the owner, or null if they went back. */
export async function pickFolder(): Promise<string | null> {
  if (!SHELL) return HANDED;
  const response = await shellFetch('/__folder');
  if (response.status === 404) return null;
  return ((await response.json()) as { path: string }).path;
}

/** The folder's path, from the home folder on. */
export function folderLabel(path: string): string {
  if (path === HANDED) return t('the place you chose');
  return path.replace(/^\/(home|Users)\/[^/]+/, '~');
}

/** Writes a backup into the folder. With `keep`, deletes the older ones there but the `keep` newest. */
export async function writeBackup(folder: string, bytes: Uint8Array, now = Date.now(), keep = 0): Promise<{ name: string; size: number; where?: string }> {
  const name = backupName(now);
  if (!SHELL) {
    const how = await handOver(name, 'application/octet-stream', bytes);
    if (!how) throw new Error(t('Not saved: the share sheet was closed.'));
    return { name, size: bytes.length, where: how === 'shared' ? t('the place you chose') : t('the downloads folder') };
  }
  const query = `folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(name)}&keep=${keep}`;
  const response = await shellFetch(`/__backup?${query}`, { method: 'PUT', body: bytes as BodyInit });
  if (response.status === 404) throw new Error(t('That folder is not there any more. Choose it again.'));
  return { name, size: bytes.length };
}
