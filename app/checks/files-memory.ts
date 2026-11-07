// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The app's files, in memory, for checks under Node (see node-hooks.mjs).
export const files = new Map<string, string>();
export const blobs = new Map<string, Uint8Array>();

export async function readFile(name: string): Promise<string | null> {
  return files.get(name) ?? null;
}

export async function writeFile(name: string, text: string): Promise<void> {
  files.set(name, text);
}

export async function readBytes(name: string): Promise<Uint8Array | null> {
  return blobs.get(name) ?? null;
}

export async function writeBytes(name: string, bytes: Uint8Array): Promise<void> {
  blobs.set(name, bytes);
}

export async function listFiles(prefix: string): Promise<string[]> {
  return [...new Set([...files.keys(), ...blobs.keys()])].filter((name) => name.startsWith(prefix));
}

export async function deleteFile(name: string): Promise<void> {
  files.delete(name);
  blobs.delete(name);
}

export async function filesThere(names: readonly string[], prefix: string): Promise<Set<string>> {
  const all = new Set(await listFiles(prefix));
  return new Set(names.filter((name) => all.has(name)));
}
