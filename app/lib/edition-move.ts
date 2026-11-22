// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Directory, File, Paths } from 'expo-file-system';

import { backupKey, backupNative, makeBackup, openBackup, restoreBackup } from '../lock/backup';
import { openCollectionSkips } from '../lock/collection-data';
import { device } from '../modules/erevos-device';
import { phoneSettingsForBackup } from './backup-native';
import { afterRestore, beforeRestore } from './backup-settings';
import { randomBytes, toHex } from './crypto';
import { MOVE_WAITS, readMoveNote, type MoveNote } from './move-note';
import { INSTALLED_EDITION, PACKAGES, type UpdateEdition } from './update-channel';

export { MOVE_WAITS, readMoveNote, type MoveNote };

// Moving to another edition on the same phone (docs/editions.md): Erevos, Erevos+ and Erevos Lite
// are apps of their own, each with its own data, signed with the same key. The one moved from makes
// a backup for the move (lock/backup.ts, as Backups does, with a password of its own, random, kept
// beside it in move.json) into its own folder for moves; the one moved to finds it through Android
// (modules/erevos-device Move.kt, which answers only an app signed with the same key), copies it
// and restores it, and tells the other its move was taken, which then deletes it. Nothing leaves
// the phone. What the backup holds is sealed as the phone keeps it: the spaces open with their
// passwords, as after any restore. A move waits a day; after that it is deleted unused.
//
// The phone's SMS and calls are not in it: they stay in Android's own stores, where the edition moved
// to finds them once it is the SMS or phone app. Without Move.kt (an Erevos from before moves, or
// one signed with another key, F-Droid's), Backups does the same by hand.

const MOVE_FILE = 'move.json';
const BACKUP_FILE = 'move.erevos';
const partName = (n: number) => `move-part-${n}.erevos`;

/** Whether this Erevos can hand over or take a move: on Android, from the build that has Move.kt. */
export const CAN_MOVE = !!device?.moveOutDir && !!device?.moveSources;

function outDir(): Directory {
  const path = device?.moveOutDir?.();
  if (!path) throw new Error('No folder for the move');
  return new Directory(`file://${path}`);
}

/** Deletes this app's move for another edition, if any. */
export function clearMove(): void {
  device?.moveClear?.();
}

/** Deletes this app's move once it waited longer than MOVE_WAITS, or is not readable. */
export function clearStaleMove(now = Date.now()): void {
  if (!CAN_MOVE) return;
  try {
    const dir = outDir();
    const note = new File(dir, MOVE_FILE);
    if (!note.exists) {
      if (dir.list().length) clearMove();
      return;
    }
    if (!readMoveNote(note.textSync(), now)) clearMove();
  } catch {
    // Looked at again next time.
  }
}

/**
 * Makes the move to `to`: a backup of everything into this app's folder for moves, its parts first,
 * then move.json last, so the edition moved to finds only a whole one. `progress` is told as the
 * photos, files and voice messages go in.
 */
export async function prepareMove(to: UpdateEdition, progress?: (done: number, all: number) => void): Promise<void> {
  if (!CAN_MOVE) throw new Error('This Erevos cannot hand over a move');
  clearMove();
  const dir = outDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const password = toHex(randomBytes(32));
  const key = await backupKey(password);
  const parts: string[] = [];
  try {
    const native = await phoneSettingsForBackup();
    const skip = await openCollectionSkips();
    const bytes = await makeBackup(key, {
      parts: async (part) => {
        const name = partName(parts.length + 1);
        new File(dir, name).writeSync(part);
        parts.push(name);
        return name;
      },
      native,
      progress,
      skip,
    });
    new File(dir, BACKUP_FILE).writeSync(bytes);
    const note: MoveNote = { v: 1, from: INSTALLED_EDITION, to, made: Date.now(), backup: BACKUP_FILE, parts, password };
    new File(dir, MOVE_FILE).writeSync(JSON.stringify(note));
  } catch (error) {
    clearMove();
    throw error;
  }
}

/** A move another edition on this phone made for this one. */
export type FoundMove = MoveNote & { pkg: string };

/** The moves waiting for this edition from the others on the phone, signed as this one is; the newest first. */
export async function findMoves(now = Date.now()): Promise<FoundMove[]> {
  if (!CAN_MOVE) return [];
  const sources = await device!.moveSources!().catch(() => []);
  const found: FoundMove[] = [];
  for (const { pkg, move } of sources) {
    const note = readMoveNote(move, now);
    // Only a move for this edition, from the app it says it is from.
    if (note && note.to === INSTALLED_EDITION && PACKAGES[note.from] === pkg) found.push({ ...note, pkg });
  }
  return found.sort((a, b) => b.made - a.made);
}

/**
 * Takes `move`: copies its files here, opens the backup and puts it in place of everything this
 * app keeps, with the settings it holds, then tells the other edition, which deletes its copy.
 * The caller holds the receiver while it runs and opens Erevos again after (as Backups' restore).
 */
export async function takeMove(move: FoundMove, progress?: (done: number, all: number) => void): Promise<void> {
  const dir = new Directory(Paths.cache, 'move-in');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true, idempotent: true });
  try {
    const copy = async (name: string): Promise<File> => {
      const file = new File(dir, name);
      await device!.moveCopy!(move.pkg, name, file.uri);
      return file;
    };
    const backupFile = await copy(move.backup);
    const backup = await openBackup(await backupFile.bytes(), move.password);
    const names = backup.parts?.names ?? [];
    // Every part the backup names is the move's own: none from elsewhere.
    if (!names.every((name) => move.parts.includes(name))) throw new Error('The move names parts it does not have');
    for (const name of names) await copy(name);
    const before = await beforeRestore();
    await restoreBackup(
      backup,
      async (name) => {
        const file = new File(dir, name);
        return file.exists ? file.bytes() : null;
      },
      progress,
    );
    await afterRestore(backupNative(backup), before);
    await device!.moveDone!(move.pkg).catch(() => false);
  } finally {
    if (dir.exists) dir.delete();
  }
}

/** Whether the app of `edition` is on the phone already (however signed): then a move needs no download. */
export function editionInstalled(edition: UpdateEdition): boolean {
  return device?.appInstalled?.(PACKAGES[edition]) ?? false;
}

/** This app's own Android package; '' where it cannot say (not Android, or a build before moves). */
export function ownPackage(): string {
  return device?.packageName?.() ?? '';
}
