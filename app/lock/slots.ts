// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { secureGet, secureSet } from '../lib/secure';

// Secrets kept per space in the OS keystore, whose entry names are not secret on Android: one
// entry per kind of secret, holding one value per password slot (config.ts), always at least
// SLOTS of them, the unused ones random values shaped like used ones. So neither the set of
// entries nor their contents changes with the spaces in use. Only a value's position says whose
// it is, and nothing says whether it is used. The same scheme as LPHL FASOULI.

export const SLOTS = 4;

export interface SlotStore<T> {
  /** The keystore entry. */
  key: string;
  /** A fresh random value, shaped like a used one. */
  fake: () => T;
  /** Whether a stored value has the right shape (anything else is replaced by a fake one). */
  valid: (v: unknown) => v is T;
}

function padded<T>(store: SlotStore<T>, values: T[], min: number): T[] {
  const out = [...values];
  while (out.length < Math.max(min, SLOTS)) out.push(store.fake());
  return out;
}

async function load<T>(store: SlotStore<T>): Promise<T[]> {
  const raw = await secureGet(store.key);
  if (raw) {
    try {
      const data = JSON.parse(raw) as unknown;
      if (Array.isArray(data)) {
        const values = padded(store, data.map((v) => (store.valid(v) ? v : store.fake())), SLOTS);
        // A damaged value, or too few: put right once, and kept so.
        if (values.length !== data.length || data.some((v) => !store.valid(v))) await secureSet(store.key, JSON.stringify(values));
        return values;
      }
    } catch {
      // Replaced below.
    }
  }
  const fresh = padded(store, [], SLOTS);
  await secureSet(store.key, JSON.stringify(fresh));
  return fresh;
}

/** The value in slot `index` (a random one when nothing was set there). */
export async function getSlot<T>(store: SlotStore<T>, index: number): Promise<T> {
  const values = await load(store);
  return values[index] ?? store.fake();
}

export async function setSlot<T>(store: SlotStore<T>, index: number, value: T): Promise<void> {
  const values = padded(store, await load(store), index + 1);
  values[index] = value;
  await secureSet(store.key, JSON.stringify(values));
}

/** Removes a slot's value: a fresh random one takes its place. */
export async function clearSlot<T>(store: SlotStore<T>, index: number): Promise<void> {
  await setSlot(store, index, store.fake());
}

/** Puts every value through `change`, one after another, and keeps them all in one write if any
 *  came back different. */
export async function changeSlots<T>(store: SlotStore<T>, change: (value: T) => Promise<T>): Promise<void> {
  const values = await load(store);
  const next: T[] = [];
  for (const value of values) next.push(await change(value));
  if (next.some((value, i) => value !== values[i])) await secureSet(store.key, JSON.stringify(next));
}

/** Makes sure the entry holds at least `count` values (and SLOTS). */
export async function fillSlots<T>(store: SlotStore<T>, count: number): Promise<void> {
  const values = await load(store);
  if (values.length < count) await secureSet(store.key, JSON.stringify(padded(store, values, count)));
}
