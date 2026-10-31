// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What waits a few seconds before it is done, to be taken back meanwhile (app/sms.tsx): an SMS
// about to go, a message about to be deleted. Kept in memory only, never on the phone: each is done
// at its time whatever screen shows then, and all at once with flush(), which the app calls when it
// goes to the background, so none is lost if Android then closes it.

type Waiting<T> = { item: T; at: number; timer: ReturnType<typeof setTimeout>; run: (item: T) => unknown };

export class Held<T extends { id: string }> {
  private readonly waiting = new Map<string, Waiting<T>>();
  private readonly listeners = new Set<() => void>();

  /** Does `run(item)` in `ms` milliseconds, unless it is taken back before. */
  hold(item: T, ms: number, run: (item: T) => unknown, now = Date.now()): void {
    this.take(item.id);
    const timer = setTimeout(() => this.done(item.id), Math.max(0, ms));
    this.waiting.set(item.id, { item, at: now + ms, timer, run });
    this.tell();
  }

  /** Takes one back before it is done: it is not done, and is given back. Null when it was done. */
  take(id: string): T | null {
    const waiting = this.waiting.get(id);
    if (!waiting) return null;
    clearTimeout(waiting.timer);
    this.waiting.delete(id);
    this.tell();
    return waiting.item;
  }

  /** Does every one now. */
  flush(): void {
    for (const id of [...this.waiting.keys()]) this.done(id);
  }

  /** What waits, the soonest first, each with when it is done. */
  list(): { item: T; at: number }[] {
    return [...this.waiting.values()].map(({ item, at }) => ({ item, at })).sort((a, b) => a.at - b.at);
  }

  /** Calls `listener` each time one waits, is taken back or is done, until the function it gives
   *  is called. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private done(id: string): void {
    const waiting = this.waiting.get(id);
    if (!waiting) return;
    clearTimeout(waiting.timer);
    this.waiting.delete(id);
    this.tell();
    try {
      void Promise.resolve(waiting.run(waiting.item)).catch(() => undefined);
    } catch {
      // What it does says itself why it failed.
    }
  }

  private tell(): void {
    this.listeners.forEach((listener) => listener());
  }
}
