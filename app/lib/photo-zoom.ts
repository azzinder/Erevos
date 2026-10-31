// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Where a photo shown on its own (components/attachment.tsx FileViewer) is, zoomed and moved by touch:
// kept apart from React Native, so the checks run in Node. Points are from the middle of where the
// photo shows; a look is how far it is zoomed and moved from there.

export type Look = { scale: number; x: number; y: number };
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** How far in a photo zooms, at most, and with a double tap. */
export const MOST_ZOOM = 5;
export const TAP_ZOOM = 2.5;

/** As it opens: all of it, not moved. */
export const WHOLE: Look = { scale: 1, x: 0, y: 0 };

/** How big a photo `w` × `h` shows when not zoomed: all of it, inside `room` (the room itself when its size is not known). */
export function fitted(room: Size, w?: number, h?: number): Size {
  if (!w || !h || !room.width || !room.height) return room;
  const fit = Math.min(room.width / w, room.height / h);
  return { width: w * fit, height: h * fit };
}

/** `look` kept to what can show: zoomed between 1 and MOST_ZOOM, moved no further than the photo's edges reach. */
export function kept(look: Look, room: Size, fit: Size): Look {
  const scale = Math.min(MOST_ZOOM, Math.max(1, look.scale));
  const maxX = Math.max(0, (fit.width * scale - room.width) / 2);
  const maxY = Math.max(0, (fit.height * scale - room.height) / 2);
  return { scale, x: Math.min(maxX, Math.max(-maxX, look.x)), y: Math.min(maxY, Math.max(-maxY, look.y)) };
}

/**
 * Two fingers that were `apartBefore` apart around `from`, as the photo showed `before`, are now
 * `apartNow` apart around `to`: the point of the photo that was between them stays between them.
 */
export function pinched(before: Look, from: Point, to: Point, apartBefore: number, apartNow: number): Look {
  const scale = Math.min(MOST_ZOOM, Math.max(1, (before.scale * apartNow) / apartBefore));
  const at = { x: (from.x - before.x) / before.scale, y: (from.y - before.y) / before.scale };
  return { scale, x: to.x - at.x * scale, y: to.y - at.y * scale };
}

/** One finger moved from `from` to `to`: a zoomed photo moves with it; one not zoomed stays. */
export function moved(before: Look, from: Point, to: Point): Look {
  return before.scale > 1 ? { scale: before.scale, x: before.x + to.x - from.x, y: before.y + to.y - from.y } : before;
}

/** A double tap at `at`: a zoomed photo shows whole again; otherwise it zooms in, the point tapped staying where it is. */
export function doubleTapped(before: Look, at: Point): Look {
  return before.scale > 1 ? WHOLE : { scale: TAP_ZOOM, x: -at.x * (TAP_ZOOM - 1), y: -at.y * (TAP_ZOOM - 1) };
}
