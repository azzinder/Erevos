// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { canPublicGroup } from './core';
import { appShown } from './receiver';
import { spaceGroups, spaceGroupTransport } from './space-groups';

// The doors of the open space's public groups (lib/public-groups.ts): looked at beside the
// receiver while the space is open (app/_layout.tsx), every few seconds while Erevos shows and
// about every minute in the background, only when the space owns a public group. Nothing goes to
// the relay for it otherwise.

const SHOWN_EVERY = 5_000;
const AWAY_EVERY = 60_000;

/** Takes the requests to join at the doors of the open space's public groups, and answers them. */
export async function lookAtPublicDoors(): Promise<void> {
  if (!canPublicGroup()) return;
  const groups = await spaceGroups();
  // Burner groups whose time is up go, whether or not this phone owns one.
  if (groups.endsSome()) await groups.endDue(spaceGroupTransport);
  if (groups.ownsDoors()) await groups.lookAtDoors(spaceGroupTransport);
}

/** Looks at the doors until the function it gives is called. */
export function startPublicDoors(): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let last = 0;
  const tick = () => {
    timer = null;
    if (stopped) return;
    // Shown again after a while away, it looks within a few seconds.
    const due = last + (appShown() ? SHOWN_EVERY : AWAY_EVERY);
    if (Date.now() < due) return next(Math.min(due - Date.now(), SHOWN_EVERY));
    last = Date.now();
    lookAtPublicDoors()
      .catch(() => {
        // The relay could not be reached: tried again with the next look.
      })
      .finally(() => next(SHOWN_EVERY));
  };
  const next = (wait: number) => {
    if (!stopped) timer = setTimeout(tick, wait);
  };
  next(SHOWN_EVERY);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
