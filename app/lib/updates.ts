import { t } from './i18n';
// New versions, as in LPHL FASOULI. Every release (.github/workflows/release.yml) also goes to the
// public repository RELEASES_REPO, one release per version (tag v0.1.<build>) with its packages
// and version.json, which says what the release is. Erevos reads the latest version.json only when
// its owner taps Check for updates: it never looks by itself, since a regular check would tell
// GitHub, every day, that this device has Erevos.

export const RELEASES_REPO = 'azzinder/erevos-releases';
export const RELEASES_PAGE = `https://github.com/${RELEASES_REPO}/releases/latest`;
export const LATEST_URL = `https://github.com/${RELEASES_REPO}/releases/latest/download/version.json`;

export interface Release {
  /** 0.1.<build> */
  version: string;
  build: number;
  /** YYYY-MM-DD */
  date: string;
  /** The Android package, when the release has one, with its SHA-256 (lowercase hex). */
  apk: { url: string; size: number; sha256: string } | null;
}

/** The build number of a release's version, 0.<minor>.<build>; 0 for a build made on a computer (0.0.x). */
export function buildOf(version: string | null | undefined): number {
  const m = /^0\.[1-9]\d*\.(\d+)$/.exec(version ?? '');
  return m ? Number(m[1]) : 0;
}

/**
 * Downloads come only from the public repository's own releases: an https address of github.com
 * whose path, decoded and resolved (no "..", encoded or not), is under its download path.
 */
export function isReleaseFile(url: string): boolean {
  let parsed: URL;
  try {
    const raw = new URL(url);
    if (raw.username || raw.password) return false;
    parsed = new URL(decodeURIComponent(raw.pathname), raw.origin);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && parsed.host === 'github.com' && parsed.pathname.startsWith(`/${RELEASES_REPO}/releases/download/`);
}

/** version.json, checked; null if it is not a release this app understands. */
export function parseRelease(text: string): Release | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const build = typeof d.build === 'number' && Number.isInteger(d.build) && d.build > 0 ? d.build : 0;
  if (!build || typeof d.version !== 'string' || buildOf(d.version) !== build) return null;
  const date = typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : '';
  const apk = d.apk as Record<string, unknown> | undefined;
  const apkOk =
    !!apk &&
    typeof apk.url === 'string' &&
    isReleaseFile(apk.url) &&
    typeof apk.size === 'number' &&
    apk.size > 0 &&
    typeof apk.sha256 === 'string' &&
    /^[0-9a-f]{64}$/i.test(apk.sha256);
  return {
    version: d.version,
    build,
    date,
    apk: apkOk ? { url: apk.url as string, size: apk.size as number, sha256: (apk.sha256 as string).toLowerCase() } : null,
  };
}

/** Whether `release` is newer than the running build (a build made on a computer, 0, never updates). */
export function isNewer(release: Release, currentBuild: number): boolean {
  return currentBuild > 0 && release.build > currentBuild;
}

/** The latest release, or null when there is none yet. Throws when it cannot be reached. */
export async function fetchLatestRelease(fetchImpl: typeof fetch = fetch): Promise<Release | null> {
  const res = await fetchImpl(LATEST_URL, { headers: { 'Cache-Control': 'no-cache' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(t('GitHub answered {status}.', { status: res.status }));
  return parseRelease(await res.text());
}

/** "111 MB" */
export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}
