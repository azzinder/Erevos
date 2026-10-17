import { Platform } from 'react-native';

// Files in the app's own folder, for what is too large for the OS keystore (lib/secure.ts). Only
// sealed data goes here. A write goes to a new file first and then takes the old one's place, so
// a write cut short leaves the old file whole. The web build is only a preview and keeps them in
// localStorage.

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
