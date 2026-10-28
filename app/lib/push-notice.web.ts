import { currentSpace } from '../lock/keys';
import { desktopWords, followDesktop } from './desktop';
import type { Lang } from './i18n';
import { iconNumber, iconNumberOn, onIconNumberChange } from './icon-number';
import { WEB_APP } from './integrity';
import { onReceived } from './receiver';
import { lastTakenAt } from './relay';
import { spaceUnread } from './unread';
import { healPush, notificationsOn } from './web-push';

// The notice the service worker shows while the web app is closed counts the pushes since Erevos
// was last open, in the app's language (pwa/sw.js). The worker cannot read the app's settings, so
// the app tells it the language, and that Erevos is open again, which clears the notice. With it,
// and with the number below, when the app last took from its relay: a push its push service held
// back, sent before then, is of messages the app has, so it counts nothing.
//
// The worker also puts a number on Erevos's icon, from what the app counts (lib/icon-number.ts):
// as Erevos shows and as it leaves, as messages come, every few seconds while it shows, so a chat
// read there is no longer counted, and when the number is turned on or off. Not while it is out of
// sight in a tab: what that tab takes then, the pushes count.
//
// As Erevos shows again, and when the worker says the browser changed its push address, the relay
// is given the new one, if it changed (lib/web-push.web.ts).

type Page = Window & { erevosWorker?: (question: unknown) => Promise<unknown> };

// The worker's answer, or null when there is none.
function ask(question: Record<string, unknown>): Promise<unknown> {
  const worker = WEB_APP ? (window as Page).erevosWorker : undefined;
  return worker ? worker(question).catch(() => null) : Promise.resolve(null);
}

function tell(question: Record<string, unknown>): void {
  void ask(question);
}

export function noticeLanguage(lang: Lang): void {
  tell({ erevos: 'lang', lang });
  // The computer's app: its tray's words (lib/desktop.ts).
  desktopWords();
}

// When the app last took from its relay, in seconds since 1970, as the relay says when it pushed.
const takenAt = () => Math.floor(lastTakenAt() / 1000);

export function noticeSeen(): void {
  tell({ erevos: 'seen', at: takenAt() });
  // The computer's app has a notice of its own, while its window is closed or behind another (lib/desktop.ts).
  followDesktop();
  if (!WEB_APP) return;
  follow();
  icon.seen();
  if (document.visibilityState === 'visible') void healPush();
}

// How often the number is counted again while Erevos shows, in milliseconds.
const EVERY = 10_000;

const openSpace = () => {
  try {
    return currentSpace();
  } catch {
    return null;
  }
};

const icon = iconNumber({
  wanted: iconNumberOn,
  space: openSpace,
  on: notificationsOn,
  unread: () => spaceUnread(),
  tell: (said) => ask(said === 'off' ? { erevos: 'badge', off: true, at: takenAt() } : { erevos: 'badge', unread: said, at: takenAt() }),
  showing: () => typeof document === 'undefined' || document.visibilityState === 'visible',
});

let following = false;

function follow(): void {
  if (following) return;
  following = true;
  onReceived(() => icon.changed());
  setInterval(() => icon.changed(), EVERY);
  onIconNumberChange(() => icon.seen());
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.erevos === 'push-changed') void healPush(true);
  });
}
