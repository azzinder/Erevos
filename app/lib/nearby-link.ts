// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The link a phone giving Erevos nearby shows as a QR code (app/give-app.tsx, NearbyApk.kt): the
// page of its small server, which any phone's camera opens in the browser, and, after #, the
// package's SHA-256, which the browser never sends and Erevos, taking it in Updates, checks the
// package against. Only addresses of a home network or a hotspot, as only phones nearby give.

export type NearbyLink = { host: string; port: number; token: string; sha256: string };

const TOKEN = /^[0-9a-f]{32}$/;
const SHA256 = /^[0-9a-f]{64}$/;

/** Whether `host` is an IPv4 address of a home network or a hotspot (10/8, 172.16/12, 192.168/16, 169.254/16). */
export function isNearbyHost(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return false;
  const [a, b] = parts.map(Number);
  if (parts.some((p) => Number(p) > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

/** The page's address, as typed in a browser. */
export function nearbyPage(link: Omit<NearbyLink, 'sha256'>): string {
  return `http://${link.host}:${link.port}/${link.token}/`;
}

/** What the QR code holds. */
export function nearbyLink(link: NearbyLink): string {
  return `${nearbyPage(link)}#sha256=${link.sha256}`;
}

/** The link in a QR code's text, or null when it is not one a phone nearby gives. */
export function readNearbyLink(text: string): NearbyLink | null {
  const m = /^http:\/\/(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})\/([0-9a-f]{32})\/#sha256=([0-9a-f]{64})$/.exec(text.trim());
  if (!m) return null;
  const [, host, portText, token, sha256] = m;
  const port = Number(portText);
  if (!isNearbyHost(host) || port < 1 || port > 65535 || !TOKEN.test(token) || !SHA256.test(sha256)) return null;
  return { host, port, token, sha256 };
}

/** A long hash in groups of four, to compare by eye. */
export function grouped(hex: string): string {
  return (hex.match(/.{1,4}/g) ?? []).join(' ');
}
