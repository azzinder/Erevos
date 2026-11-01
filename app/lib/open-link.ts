// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Links that open Erevos (erevos://...): its icons in the launcher and its widget, a tel: link
// through the Phone (modules/erevos-phone), another app's request about a contact
// (modules/erevos-contacts), an SMS notice, a contact code scanned with the camera. The password
// screen comes first, and the screens start afresh once a space opens (app/_layout.tsx), so a link
// is held here (app/+native-intent.ts) and opened once a space is open, if it came in the last few
// minutes. One opened just before Erevos locked, as it does when it comes back from the background
// with the link, is held again for after the password.
// Self-contained on purpose, so it can run under plain Node for checks.

/** How long a link waits for the password. */
export const KEEP_MS = 5 * 60_000;
/** A link opened this long before Erevos locks opens again after the password. */
export const RELOCK_MS = 3_000;

let held: { href: string; at: number } | null = null;
let opened: { href: string; at: number } | null = null;
const listeners = new Set<() => void>();

/** The screen a link names, as the app's routes (erevos://contacts?x=1 is /contacts?x=1, erevos://?show=sms
 *  is the home screen's /?show=sms); '' for the home screen with nothing more, or another kind of link. */
export function linkHref(url: string): string {
  const match = /^erevos:\/*([^?#]*)(\?[^#]*)?/i.exec(url.trim());
  if (!match) return '';
  const path = match[1].replace(/\/+$/, '');
  const query = match[2] && match[2] !== '?' ? match[2] : '';
  if (!path) return query ? `/${query}` : '';
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/i.test(path)) return '';
  return `/${path}${query}`;
}

/** A link's screen, and its details as the screen's params: /phone?number=%2B30 is /phone and { number: '+30' }. */
export function linkParts(href: string): { path: string; params: Record<string, string> } {
  const read = (text: string) => {
    try {
      return decodeURIComponent(text.replace(/\+/g, ' '));
    } catch {
      return text;
    }
  };
  const at = href.indexOf('?');
  const params: Record<string, string> = {};
  if (at >= 0) {
    for (const pair of href.slice(at + 1).split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      params[read(eq < 0 ? pair : pair.slice(0, eq))] = eq < 0 ? '' : read(pair.slice(eq + 1));
    }
  }
  return { path: at < 0 ? href : href.slice(0, at), params };
}

/** The link Erevos's own icon in the launcher becomes (modules/erevos-icons, ErevosIconsPackage.kt):
 *  its chats, as SMS's icon opens the SMS and the widget's Messages button the chats. */
export const ICON_LINK = 'erevos://?show=erevos&from=launcher';

/** The screens of Erevos's own chats: its icon leaves one open, as Erevos was left. */
const CHATS = new Set(['/chat', '/group', '/public-group']);
/** The screens the icons and the widget open besides the home screen: shown again with a link's details only. */
const AGAIN = new Set(['/phone', '/contacts']);

/**
 * How a link opens, by the screen on top (`top`, and whether it shows a hidden place's, as the
 * hidden chats' contacts do):
 * - 'stay': Erevos's own icon, over one of its chats;
 * - 'back': back to the home screen, or to the Phone or Contacts on top, with only the link's
 *   details and `opened` changed, so the same link a second time shows its tab again, also after
 *   the owner chose another (screenParams);
 * - 'params': the screen on top takes the link's details;
 * - 'push': the screen opens over the one on top.
 */
export function linkMove(href: string, top: { path: string; hidden: boolean }): 'stay' | 'back' | 'params' | 'push' {
  const { path, params } = linkParts(href);
  if (path === '/') return params.from === 'launcher' && CHATS.has(top.path) ? 'stay' : 'back';
  if (path !== top.path) return 'push';
  if (AGAIN.has(path)) return top.hidden ? 'push' : 'back';
  return 'params';
}

/** A link's details as its screen is opened again ('back'): with `opened`, which changes each time. */
export function screenParams(href: string, now = Date.now()): Record<string, string> {
  return { ...linkParts(href).params, opened: String(now) };
}

/** The screens (their routes' names) that a password given for the SMS opens: the SMS list on the
 *  home screen, a conversation, and the Archive, Spam and Trash. Any other screen asks for the
 *  password again first (app/_layout.tsx). */
export const SMS_ONLY_SCREENS = new Set(['index', 'sms', 'sms-folder']);

/** Whether a link (as linkHref gives it) opens the SMS: the SMS icon and the widget's SMS button
 *  (/?show=sms), an SMS notice, an SMS conversation or one of their folders. With the password
 *  lock, the password given for it opens only the SMS (SMS_ONLY_SCREENS). */
export function smsOnlyLink(href: string | null): boolean {
  if (!href) return false;
  const { path, params } = linkParts(href);
  if (path === '/') return params.show === 'sms';
  return path === '/sms' || path === '/sms-folder';
}

/** A link (erevos://…) back to a screen by its route's name and parameters, for after the
 *  password: '' for the home screen, or a screen no link can name. */
export function screenLink(name: string, params?: Record<string, unknown>): string {
  const path = name.replace(/(^|\/)index$/, '');
  if (path && !/^[a-z0-9-]+(\/[a-z0-9-]+)*$/i.test(path)) return '';
  const query = Object.entries(params ?? {})
    .filter((entry): entry is [string, string | number] => typeof entry[1] === 'string' || typeof entry[1] === 'number')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return path || query ? `erevos://${path}${query ? `?${query}` : ''}` : '';
}

/** A link's screen (as linkHref gives it) as a link again (erevos://…), to hold. */
export function hrefLink(href: string): string {
  return `erevos:/${href}`;
}

/** Holds a link Erevos was opened with, until a space is open. */
export function holdLink(url: string, now = Date.now()): void {
  const href = linkHref(url);
  if (!href) return;
  held = { href, at: now };
  for (const listener of [...listeners]) listener();
}

/** The link held, left held: null when none is, or it came too long ago. */
export function peekLink(now = Date.now()): string | null {
  return held && now - held.at <= KEEP_MS ? held.href : null;
}

/** The link held, once: null when none is, or it came too long ago. */
export function takeLink(now = Date.now()): string | null {
  const link = held;
  held = null;
  if (!link || now - link.at > KEEP_MS) return null;
  opened = { href: link.href, at: now };
  return link.href;
}

/** Erevos locks: a link opened just before is held again, to open after the password. */
export function lockingKeepsLink(now = Date.now()): void {
  if (opened && now - opened.at <= RELOCK_MS && !held) held = { href: opened.href, at: now };
  opened = null;
}

/** Forgets the link held, and the one opened last, so neither opens after the password. */
export function dropLink(): void {
  held = null;
  opened = null;
}

/** Calls `listener` each time a link is held, until stopped. */
export function onLinkHeld(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
