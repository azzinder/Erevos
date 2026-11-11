// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { hiddenHolder, type Holder } from '../lock/sealed-file';

// The hidden places' own accounts on one network (lib/matrix-store.ts, lib/xmpp-store.ts,
// lib/nostr-dm-store.ts), as lib/place-networks.ts says which run: the open hidden chats' place,
// and those of the open space that receive while closed (lib/place-receiver.ts), each by its
// pocket. The open one is shown: its screens show it and act on it (lib/network-place.ts). The
// others run unseen, and tell only what a closed place tells (lib/network-notices.ts).

/** What each store keeps of an account, as far as this needs it. */
export type PlaceLive = { holder: Holder; space: number; key: Uint8Array; stopped: boolean };

/** A hidden place to run the accounts of: its pocket, and its key. */
export type PlaceKey = { pocket: number; key: Uint8Array };

const sameKey = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

export class PlaceLives<L extends PlaceLive> {
  private readonly lives = new Map<number, L>();
  private shownAt: number | null = null;
  private readonly start: (holder: Holder, space: number, key: Uint8Array, pocket: number) => L;
  private readonly end: (it: L) => void;

  /** `start` loads and runs a place's account; `end` stops it and lets go of it. */
  constructor(start: (holder: Holder, space: number, key: Uint8Array, pocket: number) => L, end: (it: L) => void) {
    this.start = start;
    this.end = end;
  }

  /**
   * Runs the accounts of the `wanted` places of `space`, each once, and stops the others; the one
   * in `shown` is the open hidden chats'. Says whether any started, stopped, or another shows.
   */
  follow(space: number, wanted: PlaceKey[], shown: number | null): boolean {
    let changed = shown !== this.shownAt;
    this.shownAt = shown;
    for (const [pocket, it] of [...this.lives]) {
      const want = wanted.find((place) => place.pocket === pocket);
      if (want && !it.stopped && it.space === space && sameKey(want.key, it.key)) continue;
      this.lives.delete(pocket);
      this.end(it);
      changed = true;
    }
    for (const place of wanted) {
      if (this.lives.has(place.pocket)) continue;
      this.lives.set(place.pocket, this.start(hiddenHolder(place.pocket), space, place.key, place.pocket));
      changed = true;
    }
    return changed;
  }

  /** The open hidden chats' place's account, while it runs. */
  shown(): L | null {
    const it = this.shownAt === null ? undefined : this.lives.get(this.shownAt);
    return it && !it.stopped ? it : null;
  }

  /** Whether `it` is the account of the open hidden chats' place. */
  isShown(it: L): boolean {
    return this.shown() === it;
  }

  /** The place's pocket of a running account that is not the shown one, found by `match`; null for none. */
  closed(match: (it: L) => boolean): { pocket: number; it: L } | null {
    for (const [pocket, it] of this.lives) if (pocket !== this.shownAt && !it.stopped && match(it)) return { pocket, it };
    return null;
  }

  /** The account of the place in `pocket` of `space`, open with `key`, while it runs, or null. */
  running(space: number, pocket: number, key: Uint8Array): L | null {
    const it = this.lives.get(pocket);
    return it && !it.stopped && it.space === space && sameKey(it.key, key) ? it : null;
  }

  /** The pocket `it` runs for, or null. */
  pocketOf(it: L): number | null {
    for (const [pocket, live] of this.lives) if (live === it) return pocket;
    return null;
  }

  /** Every account that runs: the shown one's and the others'. */
  all(): L[] {
    return [...this.lives.values()].filter((it) => !it.stopped);
  }

  /** Stops them all. Says whether any ran. */
  stopAll(): boolean {
    const any = this.lives.size > 0 || this.shownAt !== null;
    this.shownAt = null;
    const all = [...this.lives.values()];
    this.lives.clear();
    all.forEach((it) => this.end(it));
    return any;
  }
}
