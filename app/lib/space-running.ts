// What goes on while a space is open, whatever screen shows (app/_layout.tsx): its messages taken,
// its calls rung, Erevos receiving in the background. It starts with the space's screens and stops
// when the space closes (locked, or another space opened), not with the screens: on Android,
// Erevos swiped away from the recent apps loses its screens and goes on without them, ready for
// messages and calls as when it is left with Home, until the space closes or Android stops it.

let running: { space: number; stop: () => void } | null = null;

/** Starts what `start` starts for `space`, once: nothing while it goes on for that space already; what goes on for another stops first. */
export function keepSpaceRunning(space: number, start: () => (() => void)[]): void {
  if (running?.space === space) return;
  stopSpaceRunning();
  const stops = start();
  running = { space, stop: () => stops.forEach((stop) => stop()) };
}

/** Stops what goes on for the open space, as it closes. */
export function stopSpaceRunning(): void {
  const was = running;
  running = null;
  was?.stop();
}
