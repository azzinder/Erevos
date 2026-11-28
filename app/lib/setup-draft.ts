// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { StartStep } from './first-start';
import { MODULES, type Module } from './modules';
import { secureDelete, secureGet, secureSet } from './secure';
import { parseChosen, type SetupChosen } from './setup-after';

// The first start's setup as far as it went (components/setup.tsx), all of it before the first
// space opens: the step it is on, the name typed, the modules, the mode, the server, the password
// lock with the fingerprint or face, and the backups. Next and Back only move through it, so each
// step shows as it was left, and nothing is used until the last step's Done: then the first space
// is made with it, opening in its mode and locked with its password (app/_layout.tsx), and the
// rest follows once it is open (app/first-steps.tsx, lib/setup-after.ts). Kept in the keystore, on
// the device, as it changes: a setup Erevos left half way (closed, or taken away by Android while
// its settings showed) goes on from where it was. The password itself is never kept: it is held
// in memory only, until the first space has it, and typed again should Erevos close before.

/** The first start's setup as far as it went. */
export type SetupDraft = SetupChosen & {
  /** The step it is on. */
  step: StartStep;
  /** The name for the contacts, as typed. */
  name: string;
  /** The modules chosen. */
  modules: Module[];
};

const KEY = 'erevos.setup-draft';
const STEPS: readonly StartStep[] = ['welcome', 'modules', 'mode', 'permissions', 'keep'];

/** A new setup: on the welcome, with the modules `on`, SPEED, LPHL's server, no lock yet (the
 *  fingerprint or face ready to go with one), and no automatic backups. */
export function newDraft(on: readonly Module[]): SetupDraft {
  return { step: 'welcome', name: '', modules: MODULES.filter((m) => on.includes(m)), mode: 'speed', server: 'lphl', lock: false, fingerprint: true, backup: null };
}

/** What `raw` keeps, with only the modules of `here`; null for nothing, or what is not one. */
export function parseDraft(raw: string | null, here: readonly Module[]): SetupDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    const chosen = parseChosen(value);
    if (!chosen) return null;
    const kept = value as Record<string, unknown>;
    const step = STEPS.find((s) => s === kept.step);
    if (!step || !Array.isArray(kept.modules)) return null;
    const modules = MODULES.filter((m) => here.includes(m) && (kept.modules as unknown[]).includes(m));
    return { ...chosen, step, name: typeof kept.name === 'string' ? kept.name : '', modules };
  } catch {
    return null;
  }
}

// The setup now, in memory, and its keeping: one write at a time, the last state written last.
let now: SetupDraft | null = null;
let writing: Promise<void> | null = null;
let again = false;

/** The setup kept, read as Erevos starts before it shows (app/_layout.tsx), with only the modules of `here`. */
export async function loadDraft(here: readonly Module[]): Promise<SetupDraft | null> {
  now = parseDraft(await secureGet(KEY).catch(() => null), here);
  return now;
}

/** The setup as it is now; null when none was begun, or it is done. */
export function draftNow(): SetupDraft | null {
  return now;
}

/** Keeps `next` as the setup now: in memory at once, in the keystore once a write going on is done. */
export function keepDraft(next: SetupDraft): void {
  now = next;
  if (writing) {
    again = true;
    return;
  }
  writing = (async () => {
    do {
      again = false;
      const value = now;
      // Done meanwhile: nothing more is kept.
      if (!value) return;
      await secureSet(KEY, JSON.stringify(value)).catch(() => undefined);
    } while (again);
  })().finally(() => {
    writing = null;
  });
}

/** The setup is over (its first space made, or a move or a linked phone instead): it goes from
 *  memory and the keystore. The password stays for the first steps (forgetPassword). */
export async function dropDraft(): Promise<void> {
  now = null;
  again = false;
  await writing;
  await secureDelete(KEY).catch(() => undefined);
}

// The password typed on the last step, and again: in memory only, never kept anywhere, until the
// first space is locked with it and its fingerprint or face set (app/first-steps.tsx).
let typed = { password: '', again: '' };

/** The password as typed on the last step, and typed again. */
export function typedPassword(): { password: string; again: string } {
  return typed;
}

/** What is typed in the password's two fields. */
export function typePassword(next: { password: string; again: string }): void {
  typed = { password: next.password, again: next.again };
}

/** The password did its part, or is not wanted: it goes from memory. */
export function forgetPassword(): void {
  typed = { password: '', again: '' };
}
