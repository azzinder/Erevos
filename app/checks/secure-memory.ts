// The OS keystore, in memory, for checks under Node (see node-hooks.mjs).
export const store = new Map<string, string>();

export async function secureGet(key: string): Promise<string | null> {
  return store.get(key) ?? null;
}

export async function secureSet(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  store.delete(key);
}
