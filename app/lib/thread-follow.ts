// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Whether a chat thread's scrolling is the person's, or the thread's own as it goes to its end
// (app/chat.tsx). As a chat opens, or grows while it is read at its end, it goes there by itself,
// and on the way it passes what is near its top: the person's scrolling there draws earlier
// messages, and keeps in place what was read, so the chat stayed at a message long read. The
// thread's own scrolling draws none, and does not leave the end. It ends at the end, as the person
// takes hold of the thread, or after GOING_MOST, should it never get there.

/** The longest a scroll to the end that the thread makes by itself takes, animated. */
export const GOING_MOST = 1500;

export class ThreadFollow {
  private until = 0;

  /** The thread goes to its end by itself, from `now`. */
  go(now = Date.now()): void {
    this.until = now + GOING_MOST;
  }

  /** The person took hold of the thread: what it does from now is theirs. */
  take(): void {
    this.until = 0;
  }

  /** Whether the thread is going to its end by itself. */
  going(now = Date.now()): boolean {
    if (this.until && now >= this.until) this.until = 0;
    return this.until > 0;
  }

  /** Whether a scroll at `now` is the person's; `atEnd`, whether it is at the thread's end. */
  person(atEnd: boolean, now = Date.now()): boolean {
    if (!this.going(now)) return true;
    if (atEnd) this.until = 0;
    return false;
  }
}
