// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The OS keystore, in memory, for checks under Node (see node-hooks.mjs).
export const store = new Map<string, string>();

/** How long each write takes, ms, and each read of a key, for checks of what runs meanwhile: 0, at once. */
export const slow: { set: number; get?: (key: string) => number } = { set: 0 };

export async function secureGet(key: string): Promise<string | null> {
  const wait = slow.get?.(key) ?? 0;
  if (wait > 0) await new Promise((done) => setTimeout(done, wait));
  return store.get(key) ?? null;
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (slow.set > 0) await new Promise((done) => setTimeout(done, slow.set));
  store.set(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  store.delete(key);
}
