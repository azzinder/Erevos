// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { openItem, openItemPieces, type CollectionItem, type FillOptions } from '../lock/collection-data';
import { t } from './i18n';
import { photoUri, releaseUri } from './photo-uri';
import { SHELL } from './shell';

// What the Collection's screens hold decrypted in memory to show, as addresses a picture, a player
// or a frame can open (lib/photo-uri.ts): on the phone data: addresses, in the web build (the
// desktop app, a browser, Sailfish OS) blob: ones, which stay valid until let go of. Every blob:
// address made here is kept in a list, so all of them can be let go of at once
// (dropCollectionMemory): when the space locks or closes, and with the panic button (lib/
// collection-play.ts, lib/panic.ts). Those who show one are told, to close what showed it. Nothing
// of it is ever written to the disk.
//
// A file is made a Blob straight from its chunks' pieces as they are decrypted (openItemUri), never
// put together into one array first, which the Blob would copy again. The desktop app holds up to
// 1 GB so; a browser (an iPhone's above all) and Sailfish OS, whose memory is smaller, 256 MB.

/** The largest file the web build opens in memory to play or show, in the desktop app (`shell` 'electron') or elsewhere: the whole file is held there. */
export function mostInMemory(shell: typeof SHELL = SHELL): number {
  return shell === 'electron' ? 1024 * 1024 * 1024 : 256 * 1000 * 1000;
}

/** The largest file opened in memory here (mostInMemory). */
export const MOST_IN_MEMORY = mostInMemory();

export class TooLargeToOpenError extends Error {
  constructor(shell: typeof SHELL = SHELL) {
    super(
      shell === 'electron'
        ? t('This file is too large to open here: at most {size}. Save it to the computer to open it with another app.', { size: '1 GB' })
        : t('This file is too large to open here: at most {size}.', { size: '256 MB' }),
    );
  }
}

/**
 * The largest file saved out of the Collection here: a plain browser holds the whole file in
 * memory to give it out, so there as much as is opened in memory. The phone, the desktop app and
 * Sailfish OS (`shell`) write it out a piece at a time (lib/save-file.web.ts saveInPieces): no
 * limit. `page` is whether this is the web build.
 */
export function mostSavedOut(shell: typeof SHELL = SHELL, page: boolean = typeof document !== 'undefined'): number {
  return page && !shell ? mostInMemory(shell) : Infinity;
}

export class TooLargeToSaveError extends Error {
  constructor() {
    super(t('This file is too large to save from here: at most {size}.', { size: '256 MB' }));
  }
}

const made = new Set<string>();
const dropped = new Set<() => void>();

/** An address of `bytes`, of type `mime`, to show (a small picture); let go of it with releaseMemoryUri. */
export function memoryUri(bytes: Uint8Array, mime: string): string {
  const uri = photoUri(bytes, mime);
  if (uri.startsWith('blob:')) made.add(uri);
  return uri;
}

/** A Blob of a file's pieces, in order, of type `mime`: the pieces themselves, not one array made of them. */
export function blobOfPieces(pieces: Uint8Array[], mime: string): Blob {
  return new Blob(pieces as BlobPart[], { type: mime || 'application/octet-stream' });
}

/**
 * An address of the file `item` decrypted, of type `mime`, to show or play; let go of it with
 * releaseMemoryUri. Null when its chunks are not here and cannot be fetched (lock/collection-data.ts
 * openItem: those missing are fetched first, told to `options.progress`, stopped by its signal). Throws
 * TooLargeToOpenError for a file larger than `most`. In a page it is a blob: address made from
 * the chunks' pieces; on the phone a data: address of its bytes.
 */
export async function openItemUri(item: CollectionItem, mime: string = item.file.mime, most: number = MOST_IN_MEMORY, options?: FillOptions): Promise<string | null> {
  if (item.file.size > most) throw new TooLargeToOpenError();
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    const bytes = await openItem(item, options);
    return bytes && memoryUri(bytes, mime);
  }
  const pieces = await openItemPieces(item, options);
  if (!pieces) return null;
  const uri = URL.createObjectURL(blobOfPieces(pieces, mime));
  made.add(uri);
  return uri;
}

/** Lets go of an address memoryUri made. */
export function releaseMemoryUri(uri: string): void {
  made.delete(uri);
  releaseUri(uri);
}

/** Lets go of every address made, and tells those who showed one. */
export function dropCollectionMemory(): void {
  for (const uri of made) releaseUri(uri);
  made.clear();
  dropped.forEach((listener) => listener());
}

/** Calls `listener` each time everything is let go of, until the function it gives is called. */
export function onCollectionMemoryDropped(listener: () => void): () => void {
  dropped.add(listener);
  return () => {
    dropped.delete(listener);
  };
}
