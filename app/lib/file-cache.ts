// Files fetched from the other networks' servers while Erevos runs (lib/nostr-dm-store.ts,
// lib/xmpp-store.ts), by their address, so one looked at again is not fetched again: the newest
// few, up to `most` bytes in all. Kept in memory only, never written to the phone, and let go as
// the space closes.

export type FileCache = {
  /** The file at `key`, fetched with `fetch` unless kept from before. */
  get(key: string, fetch: () => Promise<Uint8Array>): Promise<Uint8Array>;
  clear(): void;
};

export function fileCache(most: number): FileCache {
  const kept = new Map<string, Uint8Array>();
  return {
    async get(key, fetch) {
      const had = kept.get(key);
      if (had) return had;
      const bytes = await fetch();
      kept.set(key, bytes);
      let total = [...kept.values()].reduce((sum, b) => sum + b.length, 0);
      for (const [other, b] of kept) {
        if (total <= most || other === key) continue;
        kept.delete(other);
        total -= b.length;
      }
      return bytes;
    },
    clear: () => kept.clear(),
  };
}

/** How long a picture that could not be fetched is not asked for again. */
const FAILED_FOR_MS = 10 * 60_000;

/**
 * As fileCache, for profile and room pictures, which every row of a list asks for each time it is
 * drawn: one fetch at a time for each, however many rows ask at once, and one that failed (as a
 * server that lets only contacts have a picture refuses it) is not asked for again for a while.
 */
export function pictureCache(most: number): FileCache {
  const files = fileCache(most);
  const going = new Map<string, Promise<Uint8Array>>();
  const failed = new Map<string, number>();
  return {
    get(key, fetch) {
      const until = failed.get(key);
      if (until !== undefined && until > Date.now()) return Promise.reject(new Error('Not fetched'));
      const already = going.get(key);
      if (already) return already;
      const now = files.get(key, fetch).then(
        (bytes) => {
          failed.delete(key);
          return bytes;
        },
        (error: unknown) => {
          if (failed.size >= 500) failed.clear();
          failed.set(key, Date.now() + FAILED_FOR_MS);
          throw error;
        },
      );
      going.set(key, now);
      void now.finally(() => going.delete(key)).catch(() => undefined);
      return now;
    },
    clear: () => {
      files.clear();
      going.clear();
      failed.clear();
    },
  };
}
