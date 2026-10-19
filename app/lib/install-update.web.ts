import type { Release } from './updates';

// The computer and Sailfish OS versions open the download page instead (see install-update.ts).

export const canInstall = false;

export function clearDownloads(): void {}

export async function downloadAndInstall(
  _release: Release,
  _onProgress: (received: number, total: number) => void,
  _signal: AbortSignal,
): Promise<void> {
  throw new Error('This version installs from the download page.');
}
