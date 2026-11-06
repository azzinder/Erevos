// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { CollectionItem, CollectionPlace } from '../lock/collection-data';
import type { FileRef } from '../lock/attachment-files';
import type { SharedFile } from './share-in';

// Bringing files into the Collection (collection-import.ts), on a computer: the Collection is a
// module of the phone for now (lib/modules.ts), so nothing is brought in here.

export const CAN_COLLECT = false;
export const CAN_DELETE_ORIGINALS = false;
export const THUMB_SIDE = 256;

export type Progress = (done: number, count: number) => void;

const unavailable = () => Promise.reject(new Error('The Collection is on the phone only.'));

export const isPhotoType = (mime: string) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime);
export const thumbOf = (_bytes: Uint8Array): Promise<Uint8Array | undefined> => Promise.resolve(undefined);
export const importFromCamera = (_place: CollectionPlace, _folder: string, _progress?: Progress): Promise<CollectionItem | null> => unavailable();
export const isGalleryType = (mime: string) => mime.startsWith('image/') || mime.startsWith('video/');
export const importFromFiles = (_place: CollectionPlace, _folder: string, _progress?: Progress, _options: { deleteOriginal?: boolean } = {}): Promise<CollectionItem | null> => unavailable();
export const importShared = (_place: CollectionPlace, _shared: SharedFile, _folder: string, _progress?: Progress): Promise<CollectionItem> => unavailable();
export const importFromChat = (_place: CollectionPlace, _ref: FileRef, _folder = '', _progress?: Progress): Promise<CollectionItem> => unavailable();
