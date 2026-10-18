import { File, FileMode } from 'expo-file-system';

import { type Source } from './attachments';
import { fileName } from './imports';

// A file the owner picks to open (a backup, a chat export), read whole into memory, or to send,
// read a piece at a time. On the phone, with the system's file picker; on a computer, in the
// desktop app (pick-file.web.ts).

export class TooLargeError extends Error {}

/** A file picked to send: its name, its type if the phone knows it, and where to read it from. Close it when done. */
export type PickedSource = { name: string; mime: string; source: Source; close(): void };

/** A file to send, or null if the owner went back. Throws TooLargeError above `most` bytes. */
export async function pickSource(most: number): Promise<PickedSource | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['*/*'] });
  if (picked.canceled) return null;
  const file = picked.result;
  if (file.size > most) throw new TooLargeError();
  const handle = file.open(FileMode.ReadOnly);
  const read = async (at: number, length: number) => {
    if (handle.offset !== at) handle.offset = at;
    return handle.readBytes(length);
  };
  return { name: fileName(file.uri), mime: file.type, source: { size: file.size, read }, close: () => handle.close() };
}

/** The file's name and bytes, or null if the owner went back. Throws TooLargeError above `most` bytes. */
export async function pickFile(most: number): Promise<{ name: string; bytes: Uint8Array } | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['*/*'] });
  if (picked.canceled) return null;
  const file = picked.result;
  if (file.size > most) throw new TooLargeError();
  // On Android the address, a content URI, holds the name the owner sees.
  return { name: fileName(file.uri), bytes: await file.bytes() };
}
