import { Platform } from 'react-native';

// Files in the app's own folder, for what is too large for the OS keystore (lib/secure.ts). Only
// sealed data goes here. A write goes to a new file first and then takes the old one's place, so
// a write cut short leaves the old file whole. Text, or bytes (voice messages). The web build is
// only a preview and keeps text in localStorage, and bytes in memory.

type FileSystemModule = typeof import('expo-file-system');

function fileSystem(): FileSystemModule | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-file-system') as FileSystemModule;
  } catch {
    return null;
  }
}

const memory = new Map<string, string>();
// Bytes, where there is no file system: they last as long as the app is open.
const blobs = new Map<string, Uint8Array>();

export async function readFile(name: string): Promise<string | null> {
  const fs = fileSystem();
  if (fs) {
    const file = new fs.File(fs.Paths.document, name);
    return file.exists ? file.text() : null;
  }
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(name) ?? null;
  return memory.get(name) ?? null;
}

export async function writeFile(name: string, text: string): Promise<void> {
  const fs = fileSystem();
  if (fs) {
    const next = new fs.File(fs.Paths.document, `${name}.new`);
    next.write(text);
    next.moveSync(new fs.File(fs.Paths.document, name), { overwrite: true });
    return;
  }
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(name, text);
  else memory.set(name, text);
}

export async function readBytes(name: string): Promise<Uint8Array | null> {
  const fs = fileSystem();
  if (fs) {
    const file = new fs.File(fs.Paths.document, name);
    return file.exists ? file.bytes() : null;
  }
  return blobs.get(name) ?? null;
}

export async function writeBytes(name: string, bytes: Uint8Array): Promise<void> {
  const fs = fileSystem();
  if (fs) {
    const next = new fs.File(fs.Paths.document, `${name}.new`);
    next.write(bytes);
    next.moveSync(new fs.File(fs.Paths.document, name), { overwrite: true });
    return;
  }
  blobs.set(name, bytes);
}

/** The names of the files whose names start with `prefix`. */
export async function listFiles(prefix: string): Promise<string[]> {
  const fs = fileSystem();
  if (fs) {
    return new fs.Directory(fs.Paths.document)
      .list()
      .filter((entry) => entry instanceof fs.File && entry.name.startsWith(prefix) && !entry.name.endsWith('.new'))
      .map((entry) => entry.name);
  }
  const stored = Platform.OS === 'web' ? Object.keys(globalThis.localStorage ?? {}) : [...memory.keys()];
  return [...new Set([...stored, ...blobs.keys()])].filter((name) => name.startsWith(prefix));
}

export async function deleteFile(name: string): Promise<void> {
  const fs = fileSystem();
  if (fs) {
    const file = new fs.File(fs.Paths.document, name);
    if (file.exists) file.delete();
    return;
  }
  if (Platform.OS === 'web') globalThis.localStorage?.removeItem(name);
  memory.delete(name);
  blobs.delete(name);
}
