// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import { secureGet, secureSet } from './secure';

// The order of the services on home, and those hidden from it (components/services.tsx): kept for
// the device, outside the spaces, as the modules are (lib/modules.ts). A hidden service stays on:
// its chats still show under All messages and it still notifies; only its card and its part of the
// list are left out, until it is shown again. All messages is always first and never hidden.

const KEY = 'erevos.home-services';

export type ServiceOrder = { order: string[]; hidden: string[] };

const NONE: ServiceOrder = { order: [], hidden: [] };
let now: ServiceOrder = NONE;
let loaded: Promise<void> | null = null;
const listeners = new Set<(order: ServiceOrder) => void>();

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length <= 64).slice(0, 64) : []);

/** What was kept, read once; anything that is not a list of names counts as nothing kept. */
export function readServiceOrder(raw: string | null): ServiceOrder {
  if (!raw) return NONE;
  try {
    const kept = JSON.parse(raw) as { order?: unknown; hidden?: unknown };
    return { order: strings(kept.order), hidden: strings(kept.hidden).filter((key) => key !== 'all') };
  } catch {
    return NONE;
  }
}

function load(): Promise<void> {
  loaded ??= secureGet(KEY).then(
    (raw) => {
      now = readServiceOrder(raw);
      for (const listener of listeners) listener(now);
    },
    () => undefined,
  );
  return loaded;
}

async function keep(next: ServiceOrder): Promise<void> {
  now = next;
  for (const listener of listeners) listener(now);
  await secureSet(KEY, JSON.stringify(next)).catch(() => undefined);
}

/** The order and the hidden ones, read again whenever they change. */
export function useServiceOrder(): ServiceOrder {
  const [order, setOrder] = useState(now);
  useEffect(() => {
    listeners.add(setOrder);
    void load();
    setOrder(now);
    return () => {
      listeners.delete(setOrder);
    };
  }, []);
  return order;
}

/**
 * The services in the order chosen: All messages first, then each in its place in `order`, and
 * those never moved after them in the order they come (`keys`). `shown` leaves the hidden out.
 */
export function arrangeServices<T extends string>(keys: readonly T[], kept: ServiceOrder): { shown: T[]; hidden: T[] } {
  const rank = (key: T, at: number) => (key === 'all' ? -1 : kept.order.includes(key) ? kept.order.indexOf(key) : 1000 + at);
  const sorted = keys.map((key, at) => ({ key, at: rank(key, at) })).sort((a, b) => a.at - b.at).map((one) => one.key);
  return { shown: sorted.filter((key) => key === 'all' || !kept.hidden.includes(key)), hidden: sorted.filter((key) => key !== 'all' && kept.hidden.includes(key)) };
}

/** Moves a service one place earlier (-1) or later (1) among those shown (`shown`, as arranged). */
export function moveService(shown: readonly string[], key: string, by: -1 | 1): Promise<void> {
  const list = shown.filter((k) => k !== 'all');
  const at = list.indexOf(key);
  const to = at + by;
  if (at < 0 || to < 0 || to >= list.length) return Promise.resolve();
  [list[at], list[to]] = [list[to], list[at]];
  // The hidden keep their places among the rest, after those shown.
  const rest = now.order.filter((k) => !list.includes(k));
  return keep({ order: [...list, ...rest], hidden: now.hidden });
}

export function hideService(key: string, hidden: boolean): Promise<void> {
  if (key === 'all') return Promise.resolve();
  const others = now.hidden.filter((k) => k !== key);
  return keep({ order: now.order, hidden: hidden ? [...others, key] : others });
}
