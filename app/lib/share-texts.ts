// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { collectionNative } from '../modules/erevos-collection';
import { t } from './i18n';

/**
 * Tells Android the words of the screen that shows while a large shared file is encrypted
 * (ShareActivity.kt), in the language Erevos is in, as that screen comes before any space opens.
 */
export function tellShareTexts(): void {
  try {
    collectionNative?.setShareTexts?.({ encrypting: t('Encrypting it for Erevos…'), cancel: t('Cancel') });
  } catch {
    // A build without it shows its own words.
  }
}
