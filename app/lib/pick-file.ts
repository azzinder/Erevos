import { File } from 'expo-file-system';

import { fileName } from './imports';

// A file the owner picks to open (a backup, a chat export), read whole into memory. On the phone,
// with the system's file picker; on a computer, in the desktop app (pick-file.web.ts).

export class TooLargeError extends Error {}

/** The file's name and bytes, or null if the owner went back. Throws TooLargeError above `most` bytes. */
export async function pickFile(most: number): Promise<{ name: string; bytes: Uint8Array } | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['*/*'] });
  if (picked.canceled) return null;
  const file = picked.result;
  if (file.size > most) throw new TooLargeError();
  // On Android the address, a content URI, holds the name the owner sees.
  return { name: fileName(file.uri), bytes: await file.bytes() };
}
