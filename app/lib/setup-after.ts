// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkWanted, MODULES, type Module } from './modules';
import type { CheckId } from './permission-checks';
import { secureDelete, secureGet, secureSet } from './secure';

// What the first start's setup (components/setup.tsx) leaves for once the first space is open,
// which it needs (app/first-steps.tsx): the name typed for the contacts, which the space keeps; a
// screen for each module chosen, with what Android should allow for it; the password lock and the
// backups; and an invite Erevos was opened with, which opens after them. Kept in the keystore, on
// the device, until the steps are done or put off: they show again at the next start until then.
// A backup restored keeps it (the keystore holds more than a backup brings back): moving from
// another phone, its steps follow the restore, for the modules the backup turned on.

export type SetupAfter = {
  /** The name typed for the contacts, given to the space once it is open; '' for none. */
  name: string;
  /** The modules chosen, whose screens follow, in their order. */
  modules: Module[];
  /** Moving from another phone: 'wanted' until a backup is restored, then 'done'. */
  restore?: 'wanted' | 'done';
  /** On a computer or in a browser: it is linked to the phone instead. */
  linkPhone?: boolean;
  /** The invite Erevos was opened with, as a screen (lib/open-link.ts), to open once the steps are done. */
  invite?: string;
};

const KEY = 'erevos.setup-after';

/** What `raw` keeps, or null for nothing, or what is not one. */
export function parseSetupAfter(raw: string | null): SetupAfter | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const kept = value as Record<string, unknown>;
    const modules = Array.isArray(kept.modules) ? MODULES.filter((m) => (kept.modules as unknown[]).includes(m)) : [];
    const out: SetupAfter = { name: typeof kept.name === 'string' ? kept.name : '', modules };
    if (kept.restore === 'wanted' || kept.restore === 'done') out.restore = kept.restore;
    if (kept.linkPhone === true) out.linkPhone = true;
    if (typeof kept.invite === 'string' && kept.invite.startsWith('/')) out.invite = kept.invite;
    return out;
  } catch {
    return null;
  }
}

/** Keeps what the setup leaves for after the first space opens. */
export async function keepSetupAfter(next: SetupAfter): Promise<void> {
  await secureSet(KEY, JSON.stringify(next));
}

/** What the setup left for now, or null when nothing waits. */
export async function loadSetupAfter(): Promise<SetupAfter | null> {
  return parseSetupAfter(await secureGet(KEY).catch(() => null));
}

/** The steps are done, or put off for good: nothing waits any more. */
export async function setupAfterDone(): Promise<void> {
  await secureDelete(KEY).catch(() => undefined);
}

/** A backup was restored (lib/backup-settings.ts): a move from another phone goes on with the
 *  modules it turned on, `modules`. */
export async function setupRestored(modules: readonly Module[]): Promise<void> {
  const after = await loadSetupAfter();
  if (!after || after.restore !== 'wanted') return;
  await keepSetupAfter({ ...after, restore: 'done', modules: MODULES.filter((m) => modules.includes(m)) });
}

/** One of the steps after the first space opens. */
export type AfterStep = { kind: 'module'; module: Module } | { kind: 'lock' } | { kind: 'done' };

/** The steps for the modules `modules`: one for each, in their order, then the lock and the
 *  backups, then what is done. */
export function afterSteps(modules: readonly Module[]): AfterStep[] {
  return [...MODULES.filter((m) => modules.includes(m)).map((module): AfterStep => ({ kind: 'module', module })), { kind: 'lock' }, { kind: 'done' }];
}

/** The module among `modules` whose screen asks for the check `id`: the first, in their order,
 *  that needs it; one every module needs, on the first. Null when none needs it. */
export function checkOwner(id: CheckId, modules: readonly Module[]): Module | null {
  return MODULES.find((m) => modules.includes(m) && checkWanted(id, [m])) ?? null;
}

/** For the screen of `module`, among `modules`: the checks it asks for (`own`), and those it needs
 *  too that a screen before it asked for (`earlier`). */
export function checksAt<T extends { id: CheckId }>(module: Module, modules: readonly Module[], checks: readonly T[]): { own: T[]; earlier: T[] } {
  const own: T[] = [];
  const earlier: T[] = [];
  for (const check of checks) {
    const owner = checkOwner(check.id, modules);
    if (owner === module) own.push(check);
    else if (owner && checkWanted(check.id, [module]) && MODULES.indexOf(owner) < MODULES.indexOf(module)) earlier.push(check);
  }
  return { own, earlier };
}
