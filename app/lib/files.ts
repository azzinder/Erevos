import { Platform } from 'react-native';

import { SHELL, shellFetch } from './shell';
import { webDeleteFile, webListFiles, webReadFile, webWriteFile } from './web-store';

// Files in the app's own folder, for what is too large for the OS keystore (lib/secure.ts). Only
// sealed data goes here. A write goes to a new file first and then takes the old one's place, so
// a write cut short leaves the old file whole. Text, or bytes (voice messages). On a computer the
// desktop app keeps them in its own folder the same way (lib/shell.ts), and the web app in the
// browser's storage (lib/web-store.ts).

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

const path = (name: string) => `/__file?name=${encodeURIComponent(name)}`;

async function shellRead(name: string): Promise<Response | null> {
  const response = await shellFetch(path(name));
  return response.status === 204 ? null : response;
}

export async function readFile(name: string): Promise<string | null> {
  const fs = fileSystem();
  if (fs) {
    const file = new fs.File(fs.Paths.document, name);
    return file.exists ? file.text() : null;
  }
  if (SHELL) return (await shellRead(name))?.text() ?? null;
  if (Platform.OS === 'web') {
    const value = await webReadFile(name);
    return typeof value === 'string' ? value : null;
  }
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
  if (SHELL) {
    await shellFetch(path(name), { method: 'PUT', body: text });
    return;
  }
  if (Platform.OS === 'web') await webWriteFile(name, text);
  else memory.set(name, text);
}

export async function readBytes(name: string): Promise<Uint8Array | null> {
  const fs = fileSystem();
  if (fs) {
    const file = new fs.File(fs.Paths.document, name);
    return file.exists ? file.bytes() : null;
  }
  if (SHELL) {
    const response = await shellRead(name);
    return response ? new Uint8Array(await response.arrayBuffer()) : null;
  }
  if (Platform.OS === 'web') {
    const value = await webReadFile(name);
    return value instanceof Uint8Array ? value : null;
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
  if (SHELL) {
    await shellFetch(path(name), { method: 'PUT', body: bytes as BodyInit });
    return;
  }
  if (Platform.OS === 'web') await webWriteFile(name, bytes);
  else blobs.set(name, bytes);
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
  if (SHELL) return (await (await shellFetch(`/__files?prefix=${encodeURIComponent(prefix)}`)).json()) as string[];
  if (Platform.OS === 'web') return webListFiles(prefix);
  return [...new Set([...memory.keys(), ...blobs.keys()])].filter((name) => name.startsWith(prefix));
}

export async function deleteFile(name: string): Promise<void> {
  const fs = fileSystem();
  if (fs) {
    const file = new fs.File(fs.Paths.document, name);
    if (file.exists) file.delete();
    return;
  }
  if (SHELL) {
    await shellFetch(path(name), { method: 'DELETE' });
    return;
  }
  if (Platform.OS === 'web') await webDeleteFile(name);
  memory.delete(name);
  blobs.delete(name);
}
