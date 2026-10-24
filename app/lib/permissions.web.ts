import { loadCurrentSpaceData } from '../lock/space-data';

import { ask } from './alert';
import { integrityStatus, WEB_APP } from './integrity';
import { t } from './i18n';
import type { Check, CheckId } from './permission-checks';
import { secureGet, secureSet } from './secure';
import { SHELL } from './shell';
import { browserOf, webChecksFrom, webOfferFor, type Answer, type Browser } from './web-permission-checks';
import { PUSH_AVAILABLE, turnOnPush } from './web-push';

// The permissions check in the web app (app/permissions.tsx): what the browser lets Erevos do,
// read again after each new signed release (pwa/), since a browser, or the owner in its settings,
// may have taken some away. It only reads what the browser says; each button asks the browser's
// own question, or the screen says where its setting is. The computer's and Sailfish OS's shells
// ask for what they need when it is first used, and have none of this.

const SEEN_KEY = 'erevos.permissions-seen';

export const HAS_CHECKS = !SHELL && typeof window !== 'undefined';

const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;

export const BROWSER: Browser | null = HAS_CHECKS ? browserOf(userAgent, navigator.platform, navigator.maxTouchPoints) : null;

/** Chrome, Firefox, Edge and the like on an iPhone keep their own microphone and camera settings, not Safari's. */
export const IOS_OTHER_BROWSER = BROWSER === 'iphone' && /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent);

// Chrome and the browsers made from it have their own question to install a web app: kept from
// when they offer it, for the button. Not held back, so the browser may still offer it itself.
type InstallPrompt = Event & { prompt(): Promise<unknown>; userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let installPrompt: InstallPrompt | null = null;
// Installed from this tab, which itself stays a tab.
let justInstalled = false;
if (HAS_CHECKS) {
  window.addEventListener('beforeinstallprompt', (event) => {
    installPrompt = event as InstallPrompt;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    justInstalled = true;
  });
}

const installed = () =>
  justInstalled || window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

async function answer(name: string): Promise<Answer> {
  try {
    return (await navigator.permissions.query({ name: name as PermissionName })).state;
  } catch {
    // A browser that does not say for this one.
    return null;
  }
}

async function persisted(): Promise<boolean | null> {
  try {
    return typeof navigator.storage?.persisted === 'function' ? await navigator.storage.persisted() : null;
  } catch {
    return null;
  }
}

/** Whether the browser keeps a push address for Erevos, as lib/web-push.web.ts gave the relay. */
async function subscribed(): Promise<boolean | null> {
  if (!PUSH_AVAILABLE) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration ? (await registration.pushManager.getSubscription()) !== null : null;
  } catch {
    return null;
  }
}

/** Every check that applies to this browser; none in the shells. */
export async function readChecks(): Promise<Check[]> {
  if (!HAS_CHECKS || !BROWSER) return [];
  const [microphone, camera, kept, address, pushWanted] = await Promise.all([
    answer('microphone'),
    answer('camera'),
    persisted(),
    subscribed(),
    loadCurrentSpaceData().then(
      (data) => data.push,
      () => false,
    ),
  ]);
  return webChecksFrom({
    browser: BROWSER,
    android: /Android/.test(userAgent),
    installed: installed(),
    installable: installPrompt !== null,
    pushable: PUSH_AVAILABLE,
    notifications: typeof Notification === 'undefined' ? null : Notification.permission,
    subscribed: address,
    pushWanted,
    microphone,
    camera,
    persisted: kept,
  });
}

let offered = false;
// The signed release the check was offered for.
let release: string | null = null;

/**
 * Whether the check should show by itself now: once for each new signed release the web app
 * runs, and only when messages, calls or the data need something. Asked once each start;
 * checksOffered then counts it as seen, so "back" waits for the next release.
 */
export async function offerChecks(): Promise<boolean> {
  if (!HAS_CHECKS || !WEB_APP || offered) return false;
  offered = true;
  const current = (await integrityStatus().catch(() => null))?.current;
  release = current ? String(current.version) : null;
  if (!release) return false;
  const seen = await secureGet(SEEN_KEY).catch(() => null);
  if (seen === release) return false;
  // Nothing to show this release: not looked at again until the next.
  if (!webOfferFor(seen, release, await readChecks())) {
    await checksOffered();
    return false;
  }
  return true;
}

/** The check showed for the release that runs. */
export async function checksOffered(): Promise<void> {
  if (release) await secureSet(SEEN_KEY, release).catch(() => undefined);
}

/** The phone maker's setting is Android's only. */
export async function makerDone(_done: boolean): Promise<void> {}

/** Asks the browser's own question for what the check `id` needs. Called straight from a tap,
 *  before anything else is awaited: Safari asks only then. */
export async function fix(id: CheckId): Promise<void> {
  switch (id) {
    case 'home':
      return install();
    case 'push': {
      // As turning them on under Lock does: the browser's question, then the push address to the relay.
      const problem = await turnOnPush();
      if (problem) ask(t('Notifications while closed'), problem, [{ text: t('OK') }]);
      return;
    }
    case 'microphone':
      return media({ audio: true });
    case 'camera':
      return media({ video: true });
    case 'storage': {
      const kept = await (navigator.storage?.persist?.() ?? Promise.resolve(false)).catch(() => false);
      if (!kept) {
        ask(
          t('Keeping the data'),
          t('The browser decides by itself whether it keeps a site\'s data for good, and has not agreed yet. It agrees more readily for an app added to the home screen, or with notifications allowed. Until then, a backup (Settings → Data and devices → Backups) is the safety net.'),
          [{ text: t('OK') }],
        );
      }
      return;
    }
    default:
      return;
  }
}

async function install(): Promise<void> {
  const offer = installPrompt;
  // The browser asks once for each time it offers.
  installPrompt = null;
  try {
    await offer?.prompt();
    // appinstalled may come after the screen has read the checks again.
    if ((await offer?.userChoice)?.outcome === 'accepted') justInstalled = true;
  } catch {
    // Already asked: the screen says where else it is.
  }
}

/** The browser's question for the microphone or the camera: nothing is recorded, and they go off at once. */
async function media(constraints: MediaStreamConstraints): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // Refused, or there is none: the screen shows what the browser says now.
  }
}
