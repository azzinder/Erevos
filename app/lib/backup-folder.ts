// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { hardBackupKey, isBackupPassword, makeBackup, newBackupHard, type BackupKey } from '../lock/backup';

import { loadCloudBackup, sendToCloud, stopCloudBackup, type CloudBackup } from './backup-cloud';
import { writeBackup } from './backup-place';
import { phoneSmsForBackup } from './backup-sms';
import { panicFolderChanged } from './panic';
import { fromBase64, isHardCost, toBase64, type HardCost } from './crypto';
import { secureDelete, secureGet, secureSet } from './secure';

export { CAN_AUTO_BACKUP, CAN_BACK_UP, CAN_CLOUD_BACKUP, CAN_CLOUD_RESTORE, CLOUD_NEEDS_CORS, folderLabel, pickFolder, writeBackup } from './backup-place';

// Backups (lock/backup.ts) written to a folder the owner picks (lib/backup-place.ts): on the
// phone with Android's folder picker, on a computer in the desktop app.
//
// Automatic backups are made when a space opens and the last one is older than the days chosen,
// into the folder chosen, which keeps the KEEP newest. Their settings are kept in the keystore
// entry AUTO, outside every space and out of backups, with the key their password gives, so
// they need no password each time. Whichever space opens, the setting is the same, and the
// backups are of all of them. Settings from before Argon2id kept PBKDF2's key: the next automatic
// backup gives it Argon2id (lock/backup.ts), without the password, and keeps that key instead.
// When the owner gave a server (lib/backup-cloud.ts), each automatic backup goes there too, bare,
// on the phone and in the desktop app,
// and one the server missed goes the next time a space opens, even when the folder's is not due.

/** How automatic backups are made. `every` is days, 0 when off; `last` milliseconds, 0 if never.
 *  `hard` is Argon2id's salt and cost, null in settings from before it. */
export type AutoBackup = {
  every: number;
  folder: string;
  key: string;
  salt: string;
  iter: number;
  hard: (HardCost & { salt: string }) | null;
  last: number;
  error: string;
};

const hardOf = (value: unknown): AutoBackup['hard'] =>
  !!value && typeof (value as { salt?: unknown }).salt === 'string' && isHardCost(value as Partial<HardCost>)
    ? (value as NonNullable<AutoBackup['hard']>)
    : null;

const AUTO = 'erevos.backup-auto';
const DAY = 24 * 3600 * 1000;
export const KEEP = 3;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
      hard: hardOf(value.hard),
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
export async function startAutoBackup(every: number, folder: string, { key, salt, iter, hard }: BackupKey): Promise<AutoBackup> {
  const auto: AutoBackup = {
    every,
    folder,
    key: toBase64(key),
    salt: toBase64(salt),
    iter,
    hard: hard && { salt: toBase64(hard.salt), m: hard.m, t: hard.t },
    last: 0,
    error: '',
  };
  await secureSet(AUTO, JSON.stringify(auto));
  panicFolderChanged(folder);
  return auto;
}

export async function changeAutoBackup(patch: Partial<Pick<AutoBackup, 'every' | 'folder'>>): Promise<AutoBackup | null> {
  const auto = await loadAutoBackup();
  if (!auto) return null;
  const next = { ...auto, ...patch, error: '' };
  await secureSet(AUTO, JSON.stringify(next));
  panicFolderChanged(next.folder);
  return next;
}

/** Stops automatic backups, and their copies to a server with them. */
export async function stopAutoBackup(): Promise<void> {
  await secureDelete(AUTO);
  await stopCloudBackup();
  panicFolderChanged('');
}

/** Automatic backups' settings, and the server's, as they are after a run. */
export type AutoRun = { auto: AutoBackup | null; cloud: CloudBackup | null };

let running: Promise<AutoRun> | null = null;

/**
 * Makes an automatic backup if one is due (or `now` anyway, with `force`), and sends one to the
 * server if it has not the newest. Returns the settings as they are after it; a backup that failed
 * says why in `error`, and is tried again next time.
 */
export function runAutoBackup(force = false, now = Date.now()): Promise<AutoRun> {
  running ??= (async () => {
    let auto = await loadAutoBackup();
    let cloud = await loadCloudBackup();
    if (!auto || !auto.every) return { auto, cloud };
    const due = force || now - auto.last >= auto.every * DAY;
    const cloudDue = !!cloud && (due || cloud.last < auto.last);
    if (!due && !cloudDue) return { auto, cloud };
    try {
      let hard = auto.hard;
      if (!hard) {
        const fresh = newBackupHard();
        hard = { salt: toBase64(fresh.salt), m: fresh.m, t: fresh.t };
        auto = { ...auto, key: toBase64(await hardBackupKey(fromBase64(auto.key), fresh)), hard };
        await secureSet(AUTO, JSON.stringify(auto));
      }
      // With the phone's SMS, when the owner wants them (lib/backup-sms.ts).
      const sms = await phoneSmsForBackup();
      const key = { key: fromBase64(auto.key), salt: fromBase64(auto.salt), iter: auto.iter, hard: { ...hard, salt: fromBase64(hard.salt) } };
      if (due) {
        try {
          await writeBackup(auto.folder, await makeBackup(key, sms), now, KEEP);
          auto = { ...auto, last: now, error: '' };
        } catch (error) {
          auto = { ...auto, error: errorText(error) };
        }
        await secureSet(AUTO, JSON.stringify(auto));
      }
      if (cloud && cloudDue) cloud = await sendToCloud(cloud, await makeBackup(key, sms, true), KEEP, now);
    } catch (error) {
      auto = { ...auto, error: errorText(error) };
      await secureSet(AUTO, JSON.stringify(auto));
    }
    return { auto, cloud };
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * Whether `password` is automatic backups' own: the key it gives, with their salt and cost, is
 * the one kept. Null when there are no automatic backups to compare with.
 */
export async function isAutoBackupPassword(password: string): Promise<boolean | null> {
  const auto = await loadAutoBackup();
  if (!auto) return null;
  const hard = auto.hard && { salt: fromBase64(auto.hard.salt), m: auto.hard.m, t: auto.hard.t };
  return isBackupPassword(password, { key: fromBase64(auto.key), salt: fromBase64(auto.salt), iter: auto.iter, hard });
}
