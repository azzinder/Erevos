// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { CollectionItem } from '../lock/collection-data';
import type { SharedFile } from './share-in';

// Taking a file out of the Collection (collection-out.ts), on a computer: the Collection is a
// module of the phone for now (lib/modules.ts), so nothing is taken out here.

export const copyToSend = (_item: CollectionItem): Promise<SharedFile> => Promise.reject(new Error('The Collection is on the phone only.'));
export const dropOpened = (): void => undefined;
export const openWithOtherApp = (_item: CollectionItem): Promise<void> => Promise.reject(new Error('The Collection is on the phone only.'));
