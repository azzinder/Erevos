// Where an address points, for what a relay may send this phone to and what an invite may name
// (lib/relay.ts signInOffer, lib/relay-invite.ts): its host, and whether that host is this
// computer, or one on a private network, as a relay at home is (ws://192.168.1.10:7879).
// Self-contained on purpose, so it can run under plain Node for checks.

/**
 * The host of `url` (scheme://host:port/path), in small letters, an IPv6 address without its
 * brackets; empty when it has none, or names a user before it (user@host), which would only hide
 * where it goes.
 */
export function hostOf(url: string): string {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#\s]*)/i.exec(url.trim());
  if (!match || match[1].includes('@')) return '';
  const authority = match[1].toLowerCase();
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']');
    const rest = authority.slice(end + 1);
    return end > 1 && (rest === '' || /^:\d*$/.test(rest)) ? authority.slice(1, end) : '';
  }
  const [host, port, ...more] = authority.split(':');
  return more.length === 0 && (port === undefined || /^\d*$/.test(port)) ? host : '';
}

function ipv4(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4 || !parts.every((part) => /^(?:0|[1-9]\d{0,2})$/.test(part))) return null;
  const numbers = parts.map(Number);
  return numbers.every((n) => n <= 255) ? numbers : null;
}

/** Whether `host` (as hostOf gives it) is this computer: localhost, 127.0.0.0/8 or ::1. */
export function isLoopback(host: string): boolean {
  if (host === 'localhost' || host === '::1') return true;
  return ipv4(host)?.[0] === 127;
}

/**
 * Whether `host` (as hostOf gives it) is an address on a private network, or this computer:
 * 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, fc00::/7 or fe80::/10. A name is
 * not, whatever it stands for, as only the network it is looked up on says where it goes.
 */
export function isPrivate(host: string): boolean {
  if (isLoopback(host)) return true;
  const four = ipv4(host);
  if (four) {
    const [a, b] = four;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  return /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
}
