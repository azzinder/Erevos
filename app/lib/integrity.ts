// What the web app's service worker (pwa/sw.js) says about the code it runs, as lib/integrity.web.ts
// tells it. The phone and desktop apps are installed whole and have none of this.

/** label: the GitHub release it came with (0.1.N), when it came with one. */
export type Release = { version: number; label: string | null; created: string | null; commit: string | null };

export type IntegrityStatus = {
  current: Release | null;
  pending: Release | null;
  refused: { at: number; reason: string; version: number | null }[];
  checked: number;
  error: string;
  key: string;
};

/** Whether this is the web app, run by its service worker. */
export const WEB_APP = false;

export async function integrityStatus(): Promise<IntegrityStatus | null> {
  return null;
}

export async function checkForUpdate(): Promise<IntegrityStatus | null> {
  return null;
}

/** Calls `onNews` when the worker has news; returns a call that stops it. */
export function watchIntegrity(_onNews: () => void): () => void {
  return () => undefined;
}

/** Raises the alarm when the worker refused code from the server. */
export function startIntegrityAlarm(): void {}
