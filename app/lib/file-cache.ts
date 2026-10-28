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
