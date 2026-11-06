// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useMemo } from 'react';

import type { CollectionPlace } from '../lock/collection-data';
import { currentSpace } from '../lock/keys';
import { hiddenHolder } from '../lock/sealed-file';

import { openHiddenPlace, useOpenHiddenPlace, type OpenHiddenPlace } from './hidden-contacts';

// Whose Collection a screen shows: the open space's, or the hidden place's that is open now
// (lib/hidden-contacts.ts), which keeps its Collection apart from the space's. Chosen by the
// screen's `hidden` flag, as the contacts screens choose.

/** The Collection of the hidden place `open`. */
export function hiddenCollection(open: OpenHiddenPlace): CollectionPlace {
  return { holder: hiddenHolder(open.pocket), space: open.space, key: open.key };
}

/** The open space's Collection. */
export function spaceCollection(): CollectionPlace {
  const { space, key } = currentSpace();
  return { holder: 'space', space, key };
}

/** The Collection to use now, for the hidden place open now (`hidden`) or the space; null when `hidden` and it has closed. */
export function collectionPlaceNow(hidden: boolean): CollectionPlace | null {
  if (!hidden) return spaceCollection();
  const open = openHiddenPlace();
  return open ? hiddenCollection(open) : null;
}

/** The same, for a screen: null while the hidden place meant is closed, so the screen closes. */
export function useCollectionPlace(hidden: boolean): CollectionPlace | null {
  const open = useOpenHiddenPlace();
  return useMemo(() => {
    if (!hidden) return spaceCollection();
    return open ? hiddenCollection(open) : null;
  }, [hidden, open]);
}
