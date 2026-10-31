// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';
// What Erevos keeps in a plain browser (the web app, installed on an iPhone's home screen): the
// browser's IndexedDB, in one database. lib/files.ts keeps its files there, text or bytes, and
// lib/secure.ts its small secrets, each sealed with a key the browser made and will not give out
// (a non-extractable Web Crypto key; Safari keeps it wrapped with a key in the system's
// Keychain). Code of this site can still use that key, which is why the app's own code is
// checked before it runs (pwa/), and why the password lock matters most here.
//
// The browser is asked to keep this data (persistent storage), so it does not clear it when space
// runs low. Safari clears a site's data after 7 days without a visit, but not an app added to the
// home screen.

const DB = 'erevos';
const FILES = 'files';
const SECRETS = 'secrets';
const KEYS = 'keys';
const SEAL_KEY = 'seal';

let opened: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  opened ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      for (const name of [FILES, SECRETS, KEYS]) request.result.createObjectStore(name);
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the database: this one lets go, and opens it again when next asked.
      db.onversionchange = () => {
        db.close();
        opened = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      opened = null;
      reject(request.error ?? new Error(t('The browser did not open its storage.')));
    };
  });
  void keepData();
  return opened;
}

let askedToKeep = false;

async function keepData(): Promise<void> {
  if (askedToKeep) return;
  askedToKeep = true;
  try {
    if (!(await navigator.storage?.persisted?.())) await navigator.storage?.persist?.();
  } catch {
    // Not offered here: the data is kept as the browser keeps any site's.
  }
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return (await database()).transaction(name, mode).objectStore(name);
}

async function get<T>(name: string, key: string): Promise<T | undefined> {
  return done((await store(name, 'readonly')).get(key)) as Promise<T | undefined>;
}

async function put(name: string, key: string, value: unknown): Promise<void> {
  await done((await store(name, 'readwrite')).put(value, key));
}

async function remove(name: string, key: string): Promise<void> {
  await done((await store(name, 'readwrite')).delete(key));
}

// Files: text or bytes, each written whole in one transaction, so a write cut short leaves the old.

export async function webReadFile(name: string): Promise<string | Uint8Array | null> {
  const value = await get<string | Uint8Array>(FILES, name);
  return value ?? null;
}

export async function webWriteFile(name: string, value: string | Uint8Array): Promise<void> {
  // A copy: the caller's array may be a view on a larger buffer, which would all be stored.
  await put(FILES, name, typeof value === 'string' ? value : value.slice());
}

export async function webDeleteFile(name: string): Promise<void> {
  await remove(FILES, name);
}

export async function webListFiles(prefix: string): Promise<string[]> {
  const keys = (await done((await store(FILES, 'readonly')).getAllKeys())) as IDBValidKey[];
  return keys.filter((key): key is string => typeof key === 'string' && key.startsWith(prefix));
}

// Secrets, sealed with AES-GCM under the browser's own key.

type Sealed = { iv: Uint8Array; data: ArrayBuffer };

let sealKey: Promise<CryptoKey> | null = null;

function theSealKey(): Promise<CryptoKey> {
  sealKey ??= (async () => {
    const kept = await get<CryptoKey>(KEYS, SEAL_KEY);
    if (kept) return kept;
    const made = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    // Two tabs making one at once: whichever stored first is the one both use.
    const db = await database();
    return new Promise<CryptoKey>((resolve, reject) => {
      const transaction = db.transaction(KEYS, 'readwrite');
      const keys = transaction.objectStore(KEYS);
      let key = made;
      const read = keys.get(SEAL_KEY);
      read.onsuccess = () => {
        if (read.result) key = read.result as CryptoKey;
        else keys.put(made, SEAL_KEY);
      };
      transaction.oncomplete = () => resolve(key);
      transaction.onerror = () => reject(transaction.error);
    });
  })();
  sealKey.catch(() => {
    sealKey = null;
  });
  return sealKey;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function webGetSecret(key: string): Promise<string | null> {
  const sealed = await get<Sealed>(SECRETS, key);
  if (!sealed) return null;
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv as BufferSource }, await theSealKey(), sealed.data);
  return decoder.decode(plain);
}

export async function webSetSecret(key: string, value: string): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await theSealKey(), encoder.encode(value));
  await put(SECRETS, key, { iv, data } satisfies Sealed);
}

export async function webDeleteSecret(key: string): Promise<void> {
  await remove(SECRETS, key);
}

/** Deletes everything Erevos keeps in this browser: its whole database, files, secrets and the key that seals them (lib/panic.ts). */
export async function webWipe(): Promise<void> {
  const db = await opened?.catch(() => null);
  db?.close();
  opened = null;
  sealKey = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
