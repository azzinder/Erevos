// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/**
 * Where a chat was left, as it opens: the oldest of the `unread` newest messages that did not come
 * from us (`mine` says which), by its id. Null when nothing is new, and when everything is: the
 * start of the chat is where it was left then, and its arrow says so.
 */
export function leftOff<T>(list: readonly T[], unread: number, idOf: (message: T) => string, mine: (message: T) => boolean): string | null {
  let from: string | null = null;
  for (let i = list.length - 1, found = 0; i >= 0 && found < unread; i--) {
    if (mine(list[i])) continue;
    from = idOf(list[i]);
    found++;
  }
  return from !== null && list.length > 0 && from !== idOf(list[0]) ? from : null;
}
