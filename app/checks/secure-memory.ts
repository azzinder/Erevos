// The OS keystore, in memory, for checks under Node (see node-hooks.mjs).
export const store = new Map<string, string>();

export async function secureGet(key: string): Promise<string | null> {
  return store.get(key) ?? null;
}

/** How long each write takes, ms, for checks of what runs meanwhile: 0, at once. */
export const slow = { set: 0 };

export async function secureSet(key: string, value: string): Promise<void> {
  if (slow.set > 0) await new Promise((done) => setTimeout(done, slow.set));
  store.set(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  store.delete(key);
}
