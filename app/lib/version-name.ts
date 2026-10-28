// A release's name, as the release workflow (.github/workflows/release.yml) accepts it: 2.1.0, or a
// test release before one, 4.0.0-rc.1 (a release candidate; also -alpha.<n> and -beta.<n>), which
// comes before 4.0.0 and after 3.x. Updates (lib/updates.ts), the notice of a new version
// (lib/release-notice.ts) and What's new (lib/whats-new.ts) read names by it.

export const VERSION_NAME = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(alpha|beta|rc)\.[1-9]\d*)?$/;

/** A version's numbers and its test part, for comparing: "3.10.0" is [3, 10, 0]; "4.0.0-rc.2" is [4, 0, 0] and ["rc", 2]. */
function parts(version: string): { numbers: number[]; test: (string | number)[] } {
  const at = version.indexOf('-');
  const core = at < 0 ? version : version.slice(0, at);
  const test = at < 0 ? [] : version.slice(at + 1).split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  return { numbers: core.split('.').map((n) => Number.parseInt(n, 10) || 0), test };
}

/** Whether `a` comes after `b`: "3.10.0" after "3.9.1", "4.0.0-rc.10" after "4.0.0-rc.9", and "4.0.0" after both. */
export function laterThan(a: string, b: string): boolean {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.numbers.length, y.numbers.length); i++) {
    if ((x.numbers[i] ?? 0) !== (y.numbers[i] ?? 0)) return (x.numbers[i] ?? 0) > (y.numbers[i] ?? 0);
  }
  // The same numbers: the release comes after its test releases.
  if (!x.test.length || !y.test.length) return !x.test.length && y.test.length > 0;
  for (let i = 0; i < Math.max(x.test.length, y.test.length); i++) {
    const p = x.test[i];
    const q = y.test[i];
    if (p === q) continue;
    if (p === undefined || q === undefined) return q === undefined;
    if (typeof p === 'number' && typeof q === 'number') return p > q;
    // A word comes after a number; words by their letters (alpha, beta, rc).
    if (typeof p !== typeof q) return typeof p === 'string';
    return String(p) > String(q);
  }
  return false;
}
