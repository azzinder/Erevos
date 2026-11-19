// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { startActivityAsync } from 'expo-intent-launcher';

import { collectionNative } from '../modules/erevos-collection';
import { toBase64 } from './crypto';
import { t } from './i18n';
import { mimeOfName } from './matrix-media';

// A chat's file (a PDF, a document) opened with the app Android offers for its type, as the
// Collection's files are (lib/collection-out.ts): through a link of Erevos's own
// (modules/erevos-collection, CollectionProvider.kt) that serves its bytes from memory, with no
// plain copy on the disk. The link is let go of when another file is opened this way, and with
// every other link when the space locks or closes, or the panic button (lib/collection-play.ts
// collectionLocked). In the desktop and web apps, open-with.web.ts.

/** Whether a chat's file can be opened with another app here (an Android build that has it). */
export const CAN_OPEN_FILE = typeof collectionNative?.openBytesWith === 'function';

const FLAG_GRANT_READ_URI_PERMISSION = 1;
let last: string | null = null;

/** The type to open a file by: the one it came with, or by its name's ending when that says nothing. */
export function openType(name: string, type: string): string {
  const said = type.split(';')[0].trim().toLowerCase();
  return said && said !== 'application/octet-stream' ? said : mimeOfName(name);
}

/** Opens a chat's file with another app; throws, in words, when no app on the phone opens it. */
export async function openFileWith(name: string, type: string, bytes: Uint8Array): Promise<void> {
  const native = collectionNative;
  if (!native?.openBytesWith) throw new Error(t('This build of Erevos cannot do this. Update Erevos for it.'));
  if (last) native.forget(last);
  last = null;
  const mime = openType(name, type);
  const safe = name.replace(/[/\\]/g, '_').trim() || 'file';
  const { token, uri } = native.openBytesWith(toBase64(bytes), safe, mime);
  last = token;
  try {
    await startActivityAsync('android.intent.action.VIEW', { data: uri, type: mime, flags: FLAG_GRANT_READ_URI_PERMISSION });
  } catch {
    native.forget(token);
    last = null;
    throw new Error(t('No app on this phone opens this kind of file.'));
  }
}
