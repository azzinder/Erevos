import { needsLook, type Check, type CheckId } from './permission-checks';

// What the permissions check (app/permissions.tsx, lib/permissions.web.ts) looks at in the web
// app, read from what the browser says: kept apart from the browser, so the checks run in Node.
// A browser asks for most things the first time they are used, and says little of the rest: no
// battery saving (an iPhone's Low Power Mode neither), and no location, which the web app never
// uses (lib/place.ts).

/** Where the settings differ: an iPhone or iPad (every browser there is Safari underneath),
 *  Chrome and the browsers made from it (Edge, Samsung Internet, Opera…), Firefox, Safari on a Mac. */
export type Browser = 'iphone' | 'chromium' | 'firefox' | 'safari' | 'other';

export function browserOf(userAgent: string, platform = '', touchPoints = 0): Browser {
  // An iPad says it is a Mac, but a Mac has no touch screen (as pwa/boot.js tells them apart).
  if (/iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)) return 'iphone';
  if (/Firefox\//.test(userAgent)) return 'firefox';
  if (/Chrome\/|Chromium\/|Edg\//.test(userAgent)) return 'chromium';
  if (/Macintosh/.test(userAgent) && /Safari\//.test(userAgent)) return 'safari';
  return 'other';
}

/** What the browser says of a permission (navigator.permissions); null when it does not say. */
export type Answer = 'granted' | 'denied' | 'prompt' | null;

export type WebInput = {
  browser: Browser;
  /** On Android, where Firefox too adds a web app to the home screen. */
  android: boolean;
  /** Opened from the home screen, or as an installed app (display-mode: standalone). */
  installed: boolean;
  /** The browser offers its own question to install it, now (Chrome's beforeinstallprompt). */
  installable: boolean;
  /** This browser can show notifications for the closed web app (lib/web-push.web.ts). */
  pushable: boolean;
  /** Notification.permission. */
  notifications: 'granted' | 'denied' | 'default' | null;
  /** Whether the browser keeps a push address for Erevos; null when it cannot be read. */
  subscribed: boolean | null;
  /** This space turned notifications while closed on (Lock → Notifications while closed). */
  pushWanted: boolean;
  microphone: Answer;
  camera: Answer;
  /** navigator.storage.persisted(); null when the browser does not say. */
  persisted: boolean | null;
};

function permission(id: CheckId, answer: Answer, needed: boolean): Check {
  // Not asked yet, or a browser that does not say: it asks the first time a call needs it.
  const state = answer === 'granted' ? 'ok' : answer === 'denied' ? 'missing' : 'ask';
  return { id, state, needed, asks: state === 'ask' };
}

function push({ pushable, notifications, subscribed, pushWanted }: WebInput): Check {
  if (!pushable) return { id: 'push', state: 'none', needed: pushWanted, asks: false };
  // Off in this space: turned on under Lock, where it says what the push service sees.
  if (!pushWanted) return { id: 'push', state: 'note', needed: false, asks: true };
  // Refused once, the browser does not ask again: only its settings change it.
  if (notifications === 'denied') return { id: 'push', state: 'missing', needed: true, asks: false };
  if (notifications === 'granted' && subscribed === null) return { id: 'push', state: 'yours', needed: true, asks: true };
  const ok = notifications === 'granted' && subscribed === true;
  return { id: 'push', state: ok ? 'ok' : 'missing', needed: true, asks: !ok };
}

/**
 * Every check that applies to this browser, in the order the screen shows them. Needed: the
 * notifications this space turned on, the microphone for calls, keeping the data, and on an
 * iPhone the home screen. Only the app on an iPhone's home screen gets notifications while
 * closed, and Safari clears a tab's data after 7 days without a visit; and since that app keeps
 * its data apart from Safari's, a space in a tab cannot have turned notifications on yet.
 */
export function webChecksFrom(input: WebInput): Check[] {
  const out: Check[] = [];
  // Firefox on a computer cannot install a web app.
  if (input.browser !== 'firefox' || input.android) {
    out.push({ id: 'home', state: input.installed ? 'ok' : 'missing', needed: input.browser === 'iphone', asks: input.installable });
  }
  out.push(push(input));
  out.push(permission('microphone', input.microphone, true));
  out.push({ id: 'storage', state: input.persisted === null ? 'yours' : input.persisted ? 'ok' : 'missing', needed: true, asks: input.persisted === false });
  out.push(permission('camera', input.camera, false));
  return out;
}

/** Whether the check shows by itself: once for each new signed release (none outside the web
 *  app), only when something messages, calls or the data need is missing. */
export function webOfferFor(seen: string | null, release: string | null, checks: readonly Check[]): boolean {
  return release !== null && seen !== release && needsLook(checks);
}
