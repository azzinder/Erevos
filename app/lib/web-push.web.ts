import { loadCurrentSpaceData, updateCurrentSpaceData, type Queue } from '../lock/space-data';

import { WEB_APP } from './integrity';
import { fromHex, pushKey, setPush, type PushKeys, type Relay } from './relay';
import { t } from './i18n';

// Notifications for the web app while it is closed (an iPhone stops it as soon as it leaves the
// screen). The browser makes a push address for the relay's key; the relay pushes to that address
// whenever a message comes into the space's queue (crates/erevos-relay/src/push.rs). It is also
// given the browser's keys for the address, so a relay that counts puts in each push how many
// messages came, encrypted for the browser, and the service worker shows "3 new messages" (pwa/sw.js);
// from an older relay the push is empty, and the notice says "New message", or "New messages" once
// more came since Erevos was last open. The push goes through the browser's push service (Apple's
// on an iPhone), which sees when a message comes, never what, how many or from whom. Off unless
// turned on, per space, for the space's own queue only: never for hidden chats.

const supported = typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window && 'serviceWorker' in navigator;

export const PUSH_AVAILABLE = WEB_APP && supported;

function same(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((byte, i) => byte === b[i]);
}

/** This browser's push address for `key`, made if there is none or it was made for another key. */
async function subscription(key: Uint8Array): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const kept = await registration.pushManager.getSubscription();
  if (kept && same(kept.options.applicationServerKey, key)) return kept;
  if (kept) await kept.unsubscribe();
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: new Uint8Array(key) });
}

// The keys the pushes are encrypted for, if this browser opens the encryption a relay uses (RFC 8291).
function keysOf(sub: PushSubscription): PushKeys | undefined {
  const encodings = (PushManager as { supportedContentEncodings?: readonly string[] }).supportedContentEncodings;
  if (encodings && !encodings.includes('aes128gcm')) return undefined;
  const p256dh = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  if (p256dh?.byteLength !== 65 || auth?.byteLength !== 16) return undefined;
  return { p256dh: new Uint8Array(p256dh), auth: new Uint8Array(auth) };
}

async function register(own: Relay, queue: Queue): Promise<string | null> {
  const key = await pushKey(own);
  if (!key) return t('Your relay does not send notifications. It needs a newer version, set up with a push key.');
  const sub = await subscription(key);
  await setPush(own, fromHex(queue.recipientHex), sub.endpoint, keysOf(sub));
  return null;
}

function spaceRelay(url: string, token: string): Relay {
  return { url: url.trim(), token: token.trim() || undefined };
}

/** Turns notifications on for the open space. Call it straight from a tap: Safari asks for the
 *  permission only then. Says what went wrong, or null. */
export async function turnOnPush(): Promise<string | null> {
  if (!PUSH_AVAILABLE) return t('This browser cannot show notifications for a closed web app. On an iPhone, add Erevos to the home screen first.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return t('Notifications are not allowed for Erevos. Allow them in the settings of this browser or phone.');
  const data = await loadCurrentSpaceData();
  if (!data.url.trim() || !data.ownQueue) return t('Set up the relay first, under Relay.');
  try {
    const problem = await register(spaceRelay(data.url, data.token), data.ownQueue);
    if (problem) return problem;
  } catch (error) {
    return t('Notifications could not be turned on: {reason}', { reason: error instanceof Error ? error.message : String(error) });
  }
  await updateCurrentSpaceData({ push: true });
  return null;
}

/** Turns notifications off for the open space: the relay forgets the push address of its queue. */
export async function turnOffPush(): Promise<void> {
  const data = await loadCurrentSpaceData();
  await updateCurrentSpaceData({ push: false });
  if (data.url.trim() && data.ownQueue) {
    await setPush(spaceRelay(data.url, data.token), fromHex(data.ownQueue.recipientHex), '').catch(() => undefined);
  }
}

/** Gives the relay the push address again when the space opens or its queue changes, if
 *  notifications are on: a browser may change the address, and a new queue has none. */
export async function keepPush(own: Relay, queue: Queue): Promise<void> {
  if (!PUSH_AVAILABLE || Notification.permission !== 'granted') return;
  const data = await loadCurrentSpaceData();
  if (!data.push) return;
  await register(own, queue).catch(() => undefined);
}
