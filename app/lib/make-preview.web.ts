// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Preview } from './chat-parts';

// Link previews, as make-preview.ts, on a computer: none are made. The desktop app lets the page
// reach only its relays, and a browser most sites not at all. One that comes is shown all the same.

export const CAN_PREVIEW = false;

export async function makePreview(_url: string, _tor = false): Promise<Preview | null> {
  return null;
}
