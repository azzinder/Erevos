// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { FileDamagedError, openChunk } from '../attachments';

// Bringing a large file from another of the account's devices, chunk by chunk (docs/sync.md, phase
// S3): the file's chunks as they are kept (lock/attachment-files.ts), each encrypted with the file's
// own key, by whatever way is up (`ChunkWay`: the same Wi-Fi, a file server, the relay for small
// ones), the first that answers. Made for a dropped network:
//
// - Only the chunks missing here are asked for: one kept already is not asked again, so a transfer
//   cut off goes on from the chunk that was missing, by whichever way comes back first.
// - Each chunk that comes is opened with the file's key before it is kept: the encryption's tag says
//   it is whole and the file's, and its place in the file is in it. One cut short or damaged is let
//   go and asked again; it is never kept.
// - A file is whole only once every chunk is here and opens (`whole`): until then whoever shows it
//   says it is still coming, and it does not open.
// - A file stopped (deleted while it came) keeps nothing: the chunks that came are deleted, and so
//   are those that come after.

/** What a file is to bring: its chunks' name, the file's key, the size of each chunk, how many there are. */
export type Wanted = { id: string; key: Uint8Array; chunk: number; count: number };

/**
 * A way to bring a chunk: the `n`th of the file `id` as it is kept there, null when it does not
 * have it. Throws when it cannot be reached, or is cut off while it answers.
 */
export type ChunkWay = {
  name: string;
  get(id: string, n: number): Promise<Uint8Array | null>;
  /**
   * A way that keeps the chunk here itself as it comes, opened with the file's key before it is kept
   * under its name (the fast way on the same Wi-Fi, desktop/chunks.js and ChunkChannel.kt, so the
   * chunk never goes through the app): true once kept, false when the other does not have it whole.
   * Throws as `get` does. Used in place of `get` when there.
   */
  keep?(want: Wanted, n: number): Promise<boolean>;
};

/** Where the chunks are kept here (lock/attachment-files.ts in the app). */
export type ChunkStore = {
  read(id: string, n: number): Promise<Uint8Array | null>;
  save(id: string, n: number, sealed: Uint8Array): Promise<void>;
  drop(id: string, count: number): Promise<void>;
};

/**
 * How bringing a file ended: `done`, all of it here; `cut`, no way answered for a chunk (the rest
 * waits to be brought again); `missing`, the ways up said they do not have a chunk; `stopped`, the
 * file was let go, and nothing of it is kept.
 */
export type Fetched = { end: 'done' | 'cut' | 'missing' | 'stopped'; have: number; asked: number };

/** Whether the chunk `n` of a file, as kept, is whole and the file's. */
export function opens(want: Wanted, n: number, sealed: Uint8Array | null): boolean {
  if (!sealed) return false;
  try {
    openChunk(want.key, n, sealed, want.chunk);
    return true;
  } catch (error) {
    if (error instanceof FileDamagedError) return false;
    throw error;
  }
}

/** How many of a file's chunks are here, whole, from the first: what showing it as coming counts. */
export async function chunksHere(store: ChunkStore, want: Wanted): Promise<number> {
  let have = 0;
  for (let n = 0; n < want.count; n++) if (opens(want, n, await store.read(want.id, n))) have++;
  return have;
}

/** Whether every chunk of a file is here and opens: only then does it show as there, and open. */
export async function whole(store: ChunkStore, want: Wanted): Promise<boolean> {
  return (await chunksHere(store, want)) === want.count;
}

/** Brings files, one chunk at a time, each file once at a time. */
export class ChunkFetch {
  private readonly store: ChunkStore;
  private readonly running = new Map<string, Promise<Fetched>>();
  private readonly stopped = new Set<string>();

  constructor(store: ChunkStore) {
    this.store = store;
  }

  /**
   * Brings what is missing of `want` by `ways`, tried in order for each chunk: the first that has
   * it whole gives it. `progress` hears how many chunks are here as they come. Bringing the same
   * file again while it comes answers the same.
   */
  bring(want: Wanted, ways: readonly ChunkWay[], progress?: (have: number) => void): Promise<Fetched> {
    const now = this.running.get(want.id);
    if (now) return now;
    this.stopped.delete(want.id);
    const work = this.run(want, ways, progress).finally(() => this.running.delete(want.id));
    this.running.set(want.id, work);
    return work;
  }

  /** Lets a file go (it was deleted): bringing it stops after the chunk under way, and nothing of it is kept. */
  async stop(want: Pick<Wanted, 'id' | 'count'>): Promise<void> {
    this.stopped.add(want.id);
    await this.running.get(want.id)?.catch(() => undefined);
    await this.store.drop(want.id, want.count);
  }

  private async run(want: Wanted, ways: readonly ChunkWay[], progress?: (have: number) => void): Promise<Fetched> {
    let have = 0;
    let asked = 0;
    const end = async (e: Fetched['end']): Promise<Fetched> => {
      if (e === 'stopped' || this.stopped.has(want.id)) {
        await this.store.drop(want.id, want.count);
        return { end: 'stopped', have: 0, asked };
      }
      return { end: e, have, asked };
    };
    for (let n = 0; n < want.count; n++) {
      if (this.stopped.has(want.id)) return end('stopped');
      if (opens(want, n, await this.store.read(want.id, n))) {
        have++;
        continue;
      }
      let got: Uint8Array | null = null;
      let kept = false;
      let reached = false;
      for (const way of ways) {
        if (this.stopped.has(want.id)) return end('stopped');
        let sealed: Uint8Array | null;
        try {
          asked++;
          if (way.keep) {
            kept = await way.keep(want, n);
            reached = true;
            if (kept) break;
            continue;
          }
          sealed = await way.get(want.id, n);
        } catch {
          // Cut off, or not reachable: the next way, if any.
          continue;
        }
        reached = true;
        // Cut short or damaged on the way: let go, and asked of the next way.
        if (opens(want, n, sealed)) {
          got = sealed;
          break;
        }
      }
      if (this.stopped.has(want.id)) return end('stopped');
      if (!got && !kept) return end(reached ? 'missing' : 'cut');
      if (got) await this.store.save(want.id, n, got);
      // Deleted while it was kept: what came goes too.
      if (this.stopped.has(want.id)) return end('stopped');
      have++;
      progress?.(have);
    }
    return end('done');
  }
}
