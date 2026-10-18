import { Platform } from 'react-native';

import { SHELL, shellFetch } from './shell';

// Small secrets in the OS keystore (Android Keystore, iOS Keychain) through expo-secure-store,
// and on a computer in the desktop app's keyring (lib/shell.ts). The plain web build is only a
// preview and keeps them in localStorage. A phone build made without the secure store keeps them
// in memory, so they are gone when the app closes.

type SecureStoreModule = typeof import('expo-secure-store');

function secureStore(): SecureStoreModule | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

const memory = new Map<string, string>();

const path = (key: string) => `/__secret?key=${encodeURIComponent(key)}`;

export async function secureGet(key: string): Promise<string | null> {
  const store = secureStore();
  if (store) return store.getItemAsync(key);
  if (SHELL) {
    const response = await shellFetch(path(key));
    return response.status === 204 ? null : response.text();
  }
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return memory.get(key) ?? null;
}

export async function secureSet(key: string, value: string): Promise<void> {
  const store = secureStore();
  if (store) return store.setItemAsync(key, value);
  if (SHELL) {
    await shellFetch(path(key), { method: 'PUT', body: value });
    return;
  }
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
  else memory.set(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  const store = secureStore();
  if (store) return store.deleteItemAsync(key);
  if (SHELL) {
    await shellFetch(path(key), { method: 'DELETE' });
    return;
  }
  if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
  else memory.delete(key);
}
