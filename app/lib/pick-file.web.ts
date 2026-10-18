import { bytesSource, type Source } from './attachments';
import { SHELL, shellFetch } from './shell';

// A file the owner picks to open, as pick-file.ts: in the desktop app its own file dialog
// (lib/shell.ts), in a plain browser the browser's.

export class TooLargeError extends Error {}

export type PickedSource = { name: string; mime: string; source: Source; close(): void };

/** A file to send, as pick-file.ts, read whole: a computer has the memory. */
export async function pickSource(most: number): Promise<PickedSource | null> {
  const picked = await pickFile(most);
  return picked && { name: picked.name, mime: '', source: bytesSource(picked.bytes), close: () => undefined };
}

export async function pickFile(most: number): Promise<{ name: string; bytes: Uint8Array } | null> {
  if (SHELL) {
    const response = await shellFetch(`/__pick?most=${most}`);
    if (response.status === 404) return null;
    if (response.status === 413) throw new TooLargeError();
    return { name: decodeURIComponent(response.headers.get('X-Erevos-Name') ?? ''), bytes: new Uint8Array(await response.arrayBuffer()) };
  }
  const file = await new Promise<globalThis.File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
  if (!file) return null;
  if (file.size > most) throw new TooLargeError();
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}
