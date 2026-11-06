// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { bytesSource, type Source } from './attachments';
import { t } from './i18n';
import { SHELL, shellFetch } from './shell';

// A file the owner picks to open, as pick-file.ts: in the desktop app its own file dialog
// (lib/shell.ts), in a plain browser and on Sailfish OS the browser's. A file for the Collection,
// which may be some GB, is read a piece at a time in the desktop app too (pickPieces).

export class TooLargeError extends Error {}

export type PickedSource = { name: string; mime: string; source: Source; close(): void };

/**
 * A file to send, as pick-file.ts: in the desktop app read whole, as a computer has the memory; in
 * a browser read a piece at a time, as a chat export with its videos may be larger than a tab may hold.
 */
export async function pickSource(most: number): Promise<PickedSource | null> {
  if (SHELL !== 'electron') {
    const file = await browserPick();
    if (!file) return null;
    if (file.size > most) throw new TooLargeError();
    const read = async (at: number, length: number) => new Uint8Array(await file.slice(at, at + length).arrayBuffer());
    return { name: file.name, mime: file.type, source: { size: file.size, read }, close: () => undefined };
  }
  const picked = await pickFile(most);
  return picked && { name: picked.name, mime: '', source: bytesSource(picked.bytes), close: () => undefined };
}

/**
 * A file to bring into the Collection (lib/collection-import.web.ts), read a piece at a time as it
 * is encrypted, never whole: in the desktop app through the shell (/__pick?pieces=1, /__picked),
 * which forgets it on close; in a browser from the browser's own file.
 */
export async function pickPieces(most: number): Promise<PickedSource | null> {
  if (SHELL !== 'electron') return pickSource(most);
  const response = await shellFetch(`/__pick?most=${most}&pieces=1`);
  if (response.status === 404) return null;
  if (response.status === 413) throw new TooLargeError();
  const { id, name, size } = (await response.json()) as { id: string; name: string; size: number };
  const read = async (at: number, length: number) => {
    const piece = await shellFetch(`/__picked?id=${id}&at=${at}&length=${length}`);
    if (piece.status === 404) throw new Error(t('The file picked is not there any more.'));
    return new Uint8Array(await piece.arrayBuffer());
  };
  const close = () => void shellFetch(`/__picked?id=${id}`, { method: 'DELETE' }).catch(() => undefined);
  return { name, mime: '', source: { size, read }, close };
}

export async function pickFile(most: number): Promise<{ name: string; bytes: Uint8Array } | null> {
  if (SHELL === 'electron') {
    const response = await shellFetch(`/__pick?most=${most}`);
    if (response.status === 404) return null;
    if (response.status === 413) throw new TooLargeError();
    return { name: decodeURIComponent(response.headers.get('X-Erevos-Name') ?? ''), bytes: new Uint8Array(await response.arrayBuffer()) };
  }
  const file = await browserPick();
  if (!file) return null;
  if (file.size > most) throw new TooLargeError();
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

function browserPick(): Promise<globalThis.File | null> {
  return new Promise<globalThis.File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
