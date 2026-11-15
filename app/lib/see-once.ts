// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { FileRef } from '../lock/attachment-files';
import { t } from './i18n';

// A photo to see once: sent from the panel under "+", in a contact's chat or a group, it goes as a
// photo hidden till tapped that says it is to see once (FileMeta `once`). It never shows in the
// chat, nor among the chat's photos, and cannot be forwarded, saved or put in the Collection. Their
// phone opens it once, on its own, with the screen kept from screenshots and recordings where the
// phone allows (lib/screen-privacy.ts), and lets go of it as it closes: its chunks are deleted and
// the message stays, saying it was seen (lock/history.ts seeOnce). The sender's phone lets go of
// its own copy once it reached them, as it is theirs to see. Nothing stops a camera pointed at the
// screen, and an Erevos from before shows it as a hidden photo, whole each time it is opened.

/** Whether `file` is a photo to see once. */
export const isOnce = (file: Pick<FileRef, 'once'> | undefined | null): boolean => file?.once === true;

/** What shows in the chat in place of a photo to see once: ours, theirs still to see, or theirs seen. */
export function onceLine(mine: boolean, seen: boolean): string {
  if (mine) return t('Photo to see once');
  return seen ? t('Photo seen once') : t('Photo to see once · tap to see it');
}

/** Said when the sender taps their own photo to see once. */
export const notYoursToSee = () => t('A photo to see once is for them to see, not for you.');
