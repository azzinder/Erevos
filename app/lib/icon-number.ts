// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { secureGet, secureSet } from './secure';

// The number on Erevos's icon: how many messages are not read. On unless turned off (Settings →
// Notifications → Number on the icon), on the device, outside every space, as it is told with no
// space open too.
//
// What the web app tells its worker for it (pwa/sw.js), as lib/push-notice.web.ts asks: what the
// open space has not read, which the worker shows with what pushes say came since. Only for a
// space with notifications on; for any other, 0. With no space open (at the password) nothing is
// told: the number stays what it was. It stays on the icon once Erevos is closed, so one that does
// not match the space someone is shown may hint at another (docs/threat-model.md). Turned off,
// the worker is told to show none at all.

const KEY = 'erevos.icon-number';

const changes = new Set<() => void>();

/** Whether Erevos's icon shows how many messages are not read. */
export async function iconNumberOn(): Promise<boolean> {
  try {
    return (await secureGet(KEY)) !== 'no';
  } catch {
    return true;
  }
}

/** Shows the number on Erevos's icon, or no number. */
export async function setIconNumberOn(on: boolean): Promise<void> {
  await secureSet(KEY, on ? 'yes' : 'no');
  changes.forEach((listener) => listener());
}

/** Calls `listener` each time the number is turned on or off, until the function it gives is called. */
export function onIconNumberChange(listener: () => void): () => void {
  changes.add(listener);
  return () => {
    changes.delete(listener);
  };
}

export type IconParts = {
  /** Whether the number is on (iconNumberOn). */
  wanted: () => Promise<boolean>;
  /** The open space, or null. Only compared: one opened again is another. */
  space: () => object | null;
  /** Whether notifications are on for the open space. */
  on: () => Promise<boolean>;
  /** What the open space has not read, or null when it cannot be told. */
  unread: () => Promise<number | null>;
  /** Tells the worker the number, or that there is none ('off'): true once it took it. */
  tell: (said: number | 'off') => Promise<unknown>;
  /** Whether Erevos shows. */
  showing: () => boolean;
};

export type IconNumber = {
  /** Erevos shows or leaves, or the number was turned on or off: counted, and told even if the same, as another tab, or a worker that lost it, may hold another. */
  seen(): void;
  /** Something may have changed (a message came, or a while went by): counted while Erevos shows. */
  changed(): void;
};

export function iconNumber({ wanted, space, on, unread, tell, showing }: IconParts): IconNumber {
  // What was told last, so the same is not told again.
  let told: number | 'off' | null = null;
  // One count at a time; one asked meanwhile runs after it.
  let counting = false;
  let again = false;

  const count = (): void => {
    if (counting) {
      again = true;
      return;
    }
    counting = true;
    void (async () => {
      let said: number | 'off' | null = 'off';
      if (await wanted()) {
        const open = space();
        if (open === null) return;
        said = (await on()) ? await unread() : 0;
        // Another space opened meanwhile: counted again, for it.
        if (space() !== open) {
          again = true;
          return;
        }
      }
      if (said === null || said === told) return;
      told = said;
      // Not taken (no worker yet, or it could not keep it): told again with the next count.
      if ((await tell(said)) !== true && told === said) told = null;
    })()
      .catch(() => undefined)
      .finally(() => {
        counting = false;
        if (again) {
          again = false;
          count();
        }
      });
  };

  return {
    seen() {
      told = null;
      count();
    },
    changed() {
      if (showing()) count();
    },
  };
}
