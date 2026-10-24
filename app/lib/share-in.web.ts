import type { Source } from './attachments';

// On a computer no other app shares with Erevos (share-in.ts is Android's): nothing is ever shared in.

export type SharedFile = { file: string; name: string; mime: string };

export type SharedSource = { name: string; mime: string; source: Source; w?: number; h?: number; close(): void };

export const isSharedCopy = (_file: string) => false;

export function sharedFileOf(_params: { file?: string; name?: string; mime?: string }): SharedFile | null {
  return null;
}

export function isSharedPhoto(_shared: SharedFile): boolean {
  return false;
}

export function dropShared(_shared: SharedFile): void {}

export function handShared(_to: string, _shared: SharedFile, _now = Date.now()): void {}

export function takeShared(_to: string, _now = Date.now()): SharedFile | null {
  return null;
}

export async function readShared(_shared: SharedFile): Promise<SharedSource> {
  throw new Error('Nothing is shared in on a computer');
}
