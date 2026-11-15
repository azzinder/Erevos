// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { confirm } from './alert';
import { t } from './i18n';

/**
 * Whether a file picked to send goes: one that is a photo Erevos cannot clean (HEIC, AVIF, or one
 * larger than lib/photo.ts CLEAN_MOST, `keepsPlace` from lib/pick-file.ts) is sent only once the
 * owner says so, as it may still say where and when it was taken. Closed when it does not go.
 */
export async function sendsWithPlace(picked: { keepsPlace?: true; close(): void }): Promise<boolean> {
  if (!picked.keepsPlace) return true;
  const go = await confirm(
    t('This photo may say where it was taken'),
    t('Erevos cannot take out where and when this photo was taken, nor the phone, from a HEIC or AVIF file or one this large. Send it with Photo instead to send it without them.'),
    t('Send anyway'),
  );
  if (!go) picked.close();
  return go;
}
