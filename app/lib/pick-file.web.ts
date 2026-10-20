import { bytesSource, type Source } from './attachments';
import { SHELL, shellFetch } from './shell';

// A file the owner picks to open, as pick-file.ts: in the desktop app its own file dialog
// (lib/shell.ts), in a plain browser and on Sailfish OS the browser's.

export class TooLargeError extends Error {}

export type PickedSource = { name: string; mime: string; source: Source; close(): void };

/**
 * A file to send, as pick-file.ts: in the desktop app read whole, as a computer has the memory; in
 * a browser read a piece at a time, as a chat export with its videos may be larger than a tab may hold.
 */
export async function pickSource(most: number): Promise<PickedSource | null> {
  if (SHELL !== 'electron') {
    const file = await browserPick();
    if (!file) return null;
    if (file.size > most) throw new TooLargeError();
    const read = async (at: number, length: number) => new Uint8Array(await file.slice(at, at + length).arrayBuffer());
    return { name: file.name, mime: file.type, source: { size: file.size, read }, close: () => undefined };
  }
  const picked = await pickFile(most);
  return picked && { name: picked.name, mime: '', source: bytesSource(picked.bytes), close: () => undefined };
}

export async function pickFile(most: number): Promise<{ name: string; bytes: Uint8Array } | null> {
  if (SHELL === 'electron') {
    const response = await shellFetch(`/__pick?most=${most}`);
    if (response.status === 404) return null;
    if (response.status === 413) throw new TooLargeError();
    return { name: decodeURIComponent(response.headers.get('X-Erevos-Name') ?? ''), bytes: new Uint8Array(await response.arrayBuffer()) };
  }
  const file = await browserPick();
  if (!file) return null;
  if (file.size > most) throw new TooLargeError();
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

function browserPick(): Promise<globalThis.File | null> {
  return new Promise<globalThis.File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
