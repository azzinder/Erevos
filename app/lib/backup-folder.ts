import { hardBackupKey, makeBackup, newBackupHard, type BackupKey } from '../lock/backup';

import { writeBackup } from './backup-place';
import { phoneSmsForBackup } from './backup-sms';
import { fromBase64, isHardCost, toBase64, type HardCost } from './crypto';
import { secureDelete, secureGet, secureSet } from './secure';

export { CAN_AUTO_BACKUP, CAN_BACK_UP, folderLabel, pickFolder, writeBackup } from './backup-place';

// Backups (lock/backup.ts) written to a folder the owner picks (lib/backup-place.ts): on the
// phone with Android's folder picker, on a computer in the desktop app.
//
// Automatic backups are made when a space opens and the last one is older than the days chosen,
// into the folder chosen, which keeps the KEEP newest. Their settings are kept in the keystore
// entry AUTO, outside every space and out of backups, with the key their password gives, so
// they need no password each time. Whichever space opens, the setting is the same, and the
// backups are of all of them. Settings from before Argon2id kept PBKDF2's key: the next automatic
// backup gives it Argon2id (lock/backup.ts), without the password, and keeps that key instead.

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
    let auto = await loadAutoBackup();
    if (!auto || !auto.every || (!force && now - auto.last < auto.every * DAY)) return auto;
    let next: AutoBackup;
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
      await writeBackup(auto.folder, await makeBackup(key, sms), now, KEEP);
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
