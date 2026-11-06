// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { ComponentType } from 'react';
import type { ViewProps } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

// The Collection's own part of Android (ErevosCollectionModule.kt): its files read where they lie,
// encrypted, to open with another app, to show a PDF, and to play music and videos with the screen
// off; and the gallery's originals deleted once brought in. Null on the web, on a computer and in
// an Android build before it: then the Collection does without.

/** A file of the Collection as the catalogue keeps it (lock/attachment-files.ts FileRef): where its chunks are, and its key, hex. */
export type SealedRef = { id: string; key: string; chunk: number; count: number; size: number };

/** A file of a list to play: the file, its name and type, and whether it is a video. */
export type PlayItem = SealedRef & { name: string; mime: string; video: boolean };

/** The player's state (Playing.kt): never a file's name. `position` and `duration` in ms, duration -1 while not known. */
export type PlayerState = {
  active: boolean;
  playing: boolean;
  index: number;
  count: number;
  position: number;
  duration: number;
  video: boolean;
  buffering: boolean;
  ended: boolean;
  /** Why the file could not play (Media3's error code name), when that is what changed. */
  error?: string | null;
};

type Native = {
  /** A link another app opens the file by, streamed as it is decrypted; forget it by its token. */
  openWith(file: SealedRef, name: string, mime: string): { token: string; uri: string };
  forget(token: string): void;
  /** Forgets every link and closes every PDF. */
  forgetAll(): void;
  /** The space locked or closed: forgetAll, and the list stops if the owner chose so. */
  locked(): void;
  /** What locked does, in `ms`, unless called again first; -1 to call it off. */
  lockAfter(ms: number): void;
  /** The panic button: everything here stops and every key goes. */
  panic(): void;
  pdfAvailable(): boolean;
  pdfOpen(file: SealedRef): Promise<{ handle: string; pages: number }>;
  /** One page `width` pixels wide, base64 PNG (or JPEG), and its size in pixels. */
  pdfPage(handle: string, index: number, width: number, format: 'png' | 'jpeg'): Promise<{ data: string; width: number; height: number }>;
  pdfClose(handle: string): void;
  playList(items: PlayItem[], start: number, options: { showTitle: boolean; neutral: string; stopOnLock: boolean; stopLabel: string }): Promise<PlayerState>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  /** To `index` in the list (-1 for the one playing), `ms` from its start. */
  seek(index: number, ms: number): Promise<void>;
  stop(): Promise<void>;
  setStopOnLock(on: boolean): void;
  playerState(): Promise<PlayerState>;
  canDeleteFromGallery(): boolean;
  /** Android's own dialog asks the owner to delete these from the gallery. */
  deleteFromGallery(uris: string[]): Promise<'deleted' | 'kept' | 'none' | 'unavailable'>;
  addListener(event: 'onPlayer', listener: (state: PlayerState) => void): EventSubscription;
};

export const collectionNative = requireOptionalNativeModule<Native>('ErevosCollection');

let videoView: ComponentType<ViewProps> | null | undefined;

/** The video of the list playing, with its controls (VideoView.kt); null where there is none. */
export function collectionVideoView(): ComponentType<ViewProps> | null {
  if (videoView !== undefined) return videoView;
  try {
    videoView = collectionNative ? requireNativeViewManager<ViewProps>('ErevosCollection') : null;
  } catch {
    videoView = null;
  }
  return videoView;
}
