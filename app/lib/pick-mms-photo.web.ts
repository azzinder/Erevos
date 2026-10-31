// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// MMS, as pick-mms-photo.ts, on a computer: there is no SMS there, so no photo for one.

export const MMS_MAX = 280 * 1024;

export type MmsPhoto = { bytes: Uint8Array; mime: 'image/jpeg' };

export async function pickMmsPhoto(): Promise<MmsPhoto | null> {
  return null;
}
