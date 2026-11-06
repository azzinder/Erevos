// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import type { CollectionItem } from '../lock/collection-data';
import type { FileRef } from '../lock/attachment-files';
import { collectionNative, type PlayerState, type SealedRef } from '../modules/erevos-collection';
import { playKind } from './collection-view';
import { t } from './i18n';

// The Collection's music and videos, played on the phone by its Android part
// (modules/erevos-collection, Playing.kt) straight from their encrypted chunks. One list plays at a
// time; it goes on with the screen off and after the space locks, as the owner chose, unless the
// place's Stop playing when the space locks is on (lock/collection-data.ts stopOnLock). Android's
// notice and lock screen then let only play, pause, next and previous within the list, and show a
// file's name only when Show the title in the notification is on (showTitle); otherwise "Playing".
// The keys of the list's files are held in Android's memory only while it plays.
//
// What the space's locking, closing and the panic button do to what the Collection opened here is
// told from here too: links to open files with other apps, PDFs shown, and the list.

/** Whether this device plays the Collection's music and videos. */
export const CAN_PLAY = !!collectionNative;

/** A file of the catalogue as the Android part reads it: where its chunks are, and its key. */
export const sealedRef = (file: FileRef): SealedRef => ({ id: file.id, key: file.key, chunk: file.chunk, count: file.count, size: file.size });

// The names of the list playing, by place in it: Android is never told them unless shown in the notice.
let names: string[] = [];
let ids: string[] = [];

/** Plays `list` from `start`, with the place's own choices. */
export async function playItems(list: CollectionItem[], start: number, { showTitle, stopOnLock }: { showTitle: boolean; stopOnLock: boolean }): Promise<void> {
  if (!collectionNative) throw new Error(t('This build of Erevos cannot do this. Update Erevos for it.'));
  names = list.map((i) => i.file.name);
  ids = list.map((i) => i.id);
  const items = list.map((i) => ({ ...sealedRef(i.file), name: showTitle ? i.file.name : '', mime: i.file.mime, video: playKind(i) === 'video' }));
  await collectionNative.playList(items, start, { showTitle, neutral: t('Playing'), stopOnLock, stopLabel: t('Stop') });
}

/** The name of the file at `index` in the list playing, and its id in the Collection. */
export const playingFile = (index: number): { name: string; id: string } | null => (index >= 0 && index < names.length ? { name: names[index], id: ids[index] } : null);

export const pausePlaying = () => collectionNative?.pause().catch(() => undefined);
export const resumePlaying = () => collectionNative?.resume().catch(() => undefined);
export const nextPlaying = () => collectionNative?.next().catch(() => undefined);
export const previousPlaying = () => collectionNative?.previous().catch(() => undefined);
export const seekPlaying = (ms: number) => collectionNative?.seek(-1, ms).catch(() => undefined);

/** Stops the list: its keys go. */
export async function stopPlaying(): Promise<void> {
  names = [];
  ids = [];
  await collectionNative?.stop().catch(() => undefined);
}

/** The place's Stop playing when the space locks changed while its list plays. */
export function stopOnLockChanged(on: boolean): void {
  collectionNative?.setStopOnLock(on);
}

/**
 * The player's state, followed while the screen that asks is shown (and `on`): as it changes, and
 * its position every half second. Null where nothing plays here.
 */
export function usePlayer(on = true): PlayerState | null {
  const [state, setState] = useState<PlayerState | null>(null);
  useEffect(() => {
    const native = collectionNative;
    if (!native || !on) return;
    let active = true;
    const ask = () =>
      void native
        .playerState()
        .then((s) => active && setState(s))
        .catch(() => undefined);
    ask();
    const subscription = native.addListener('onPlayer', (s) => active && setState(s));
    const timer = setInterval(ask, 500);
    return () => {
      active = false;
      subscription.remove();
      clearInterval(timer);
    };
  }, [on]);
  return state;
}

/** The space locked or closed: links and PDFs go, and the list stops if the owner chose so. */
export function collectionLocked(): void {
  collectionNative?.locked();
}

/** The space locks in `ms` unless Erevos shows again first (-1): then what collectionLocked does happens, in Android. */
export function collectionLockAfter(ms: number): void {
  collectionNative?.lockAfter(ms);
}

/** The panic button: everything the Collection opened stops, and every key goes. */
export function collectionPanic(): void {
  names = [];
  ids = [];
  collectionNative?.panic();
}

/** A time in ms as the player shows it: 3:07, 1:02:05. */
export function playTime(ms: number): string {
  if (!(ms >= 0)) return '–:––';
  const all = Math.floor(ms / 1000);
  const h = Math.floor(all / 3600);
  const m = Math.floor((all % 3600) / 60);
  const s = String(all % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
