// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A photo's bytes as something an Image can show, as photo-uri.ts, on a computer.

export function photoUri(bytes: Uint8Array, mime: string): string {
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
}

export function releaseUri(uri: string): void {
  URL.revokeObjectURL(uri);
}
