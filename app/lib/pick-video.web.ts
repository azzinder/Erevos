// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { cleanVideo, videoNamed } from './message-carry';
import { TooLargeError } from './pick-file';

// A video to send, as pick-video.ts, on a computer: from the computer's files.

export type PickedVideo = { name: string; mime: string; bytes: Uint8Array; w?: number; h?: number; ms?: number };

function choose(): Promise<globalThis.File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function pickVideo(most: number): Promise<PickedVideo | null> {
  const file = await choose();
  if (!file) return null;
  if (file.size > most) throw new TooLargeError();
  return { ...videoNamed(file.type), bytes: cleanVideo(new Uint8Array(await file.arrayBuffer())) };
}
