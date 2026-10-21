import { t } from './i18n';
import { canVerify, verifySignature } from './core';
import { fromBase64, utf8Encode } from './crypto';
import type { Release } from './updates';

// An Android update trusts more than GitHub. The release workflow signs the APK with a key kept
// in GitHub, and version.json, whose size and SHA-256 Check for updates checks, comes from the same
// workflow: whoever held the GitHub account could put an APK of their own in both. So the release
// computer, which signs the web app with its key kept offline (pwa/README.md), also signs what it
// found in the release, the APK's build and SHA-256 (deploy/web/publish.sh, pwa/release.mjs), and
// serves that beside the web app. Check for updates installs an APK only when that statement is
// signed by the key and names the same build and SHA-256 as version.json; until the release
// computer has signed a release, the release is not installed.

/** The release key's public half, as pwa/release-key.pub has it. */
export const RELEASE_KEY = 'pjWWvp05rToqI0/s1RBLqST1pOf8OnLzMW2m3L8NhGA=';

/** Where the release computer serves the statement: beside the web app. */
export const STATEMENT_URL = 'https://erevos-web.lphl.nekten.eu/android-update.json';

/** What the release key signs for an APK, as pwa/release.mjs androidStatement makes it. */
export function statementOf(build: number, sha256: string): string {
  return `erevos android update v1\nbuild ${build}\nsha256 ${sha256}\n`;
}

/** Whether `text` (android-update.json) is the statement for this release's APK, signed by `key`. */
export async function signsRelease(text: string, release: Release, key = RELEASE_KEY): Promise<boolean> {
  if (!release.apk || !canVerify()) return false;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return false;
  }
  const d = (data ?? {}) as Partial<Record<'statement' | 'signature', unknown>>;
  if (typeof d.statement !== 'string' || typeof d.signature !== 'string') return false;
  if (d.statement !== statementOf(release.build, release.apk.sha256)) return false;
  const signature = fromBase64(d.signature);
  if (signature.length !== 64) return false;
  return verifySignature(fromBase64(key), utf8Encode(d.statement), signature);
}

/** The statement the release computer serves now, or null when there is none. Throws when its server cannot be reached. */
export async function fetchStatement(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const res = await fetchImpl(STATEMENT_URL, { headers: { 'Cache-Control': 'no-cache' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(t('The web app\'s server answered {status}.', { status: res.status }));
  return res.text();
}
