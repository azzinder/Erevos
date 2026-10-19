import type { Preview } from './chat-parts';

// Link previews, as make-preview.ts, on a computer: none are made. The desktop app lets the page
// reach only its relays, and a browser most sites not at all. One that comes is shown all the same.

export const CAN_PREVIEW = false;

export async function makePreview(_url: string): Promise<Preview | null> {
  return null;
}
