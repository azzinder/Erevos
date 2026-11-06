// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';
import { photoUri, releaseUri } from './photo-uri';

// What the Collection's screens hold decrypted in memory to show, as addresses a picture, a player
// or a frame can open (lib/photo-uri.ts): on the phone data: addresses, in the desktop app blob:
// ones, which stay valid until let go of. Every blob: address made here is kept in a list, so all
// of them can be let go of at once (dropCollectionMemory): when the space locks or closes, and
// with the panic button (lib/collection-play.ts, lib/panic.ts). Those who show one are told, to
// close what showed it. Nothing of it is ever written to the disk.

/** The largest file the desktop app opens in memory to play or show: the whole file is held there. */
export const MOST_IN_MEMORY = 1024 * 1024 * 1024;

export class TooLargeToOpenError extends Error {
  constructor() {
    super(t('This file is too large to open here: at most {size}. Save it to the computer to open it with another app.', { size: '1 GB' }));
  }
}

const made = new Set<string>();
const dropped = new Set<() => void>();

/** An address of `bytes`, of type `mime`, to show; let go of it with releaseMemoryUri. */
export function memoryUri(bytes: Uint8Array, mime: string): string {
  const uri = photoUri(bytes, mime);
  if (uri.startsWith('blob:')) made.add(uri);
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
