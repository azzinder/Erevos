// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Whether the guide shows (app/guide), so what opened it to be read can wait until it is closed
// again: a warning that the internet address can be seen (components/ip-warning.tsx) asks again
// then, and what was about to go waits for it, not lost.

// How many of the guide's screens are open now.
let shown = 0;
// Waiting for the guide to close.
const waiting = new Set<() => void>();
// One section replaces another (app/guide/[id].tsx go): the guide is closed only once none shows a while.
const CLOSED_AFTER = 400;
// Should the guide not open at all, the wait ends after this.
const NEVER_OPENED = 3000;
let closing: ReturnType<typeof setTimeout> | null = null;

function closed(): void {
  closing = null;
  if (shown > 0) return;
  const now = [...waiting];
  waiting.clear();
  for (const done of now) done();
}

/** A screen of the guide shows: call what it gives once it no longer does. */
export function guideShown(): () => void {
  shown += 1;
  if (closing) clearTimeout(closing);
  closing = null;
  let gone = false;
  return () => {
    if (gone) return;
    gone = true;
    shown = Math.max(0, shown - 1);
    if (shown === 0) closing = setTimeout(closed, CLOSED_AFTER);
  };
}

/** Resolves once the guide, about to open, has opened and closed again; or should it not open in time. */
export function afterGuide(): Promise<void> {
  return new Promise((resolve) => {
    let opened = shown > 0;
    const done = () => {
      clearInterval(look);
      waiting.delete(done);
      resolve();
    };
    waiting.add(done);
    const began = Date.now();
    // Without a screen of the guide shown in time, it did not open: nothing to wait for.
    const look = setInterval(() => {
      if (shown > 0) opened = true;
      if (!opened && Date.now() - began >= NEVER_OPENED) done();
      if (opened) clearInterval(look);
    }, 250);
  });
}
