import { currentSpace } from '../lock/keys';
import type { Lang } from './i18n';
import { iconNumber, iconNumberOn, onIconNumberChange } from './icon-number';
import { WEB_APP } from './integrity';
import { onReceived } from './receiver';
import { spaceUnread } from './unread';
import { notificationsOn } from './web-push';

// The notice the service worker shows while the web app is closed counts the pushes since Erevos
// was last open, in the app's language (pwa/sw.js). The worker cannot read the app's settings, so
// the app tells it the language, and that Erevos is open again, which clears the notice.
//
// The worker also puts a number on Erevos's icon, from what the app counts (lib/icon-number.ts):
// as Erevos shows and as it leaves, as messages come, every few seconds while it shows, so a chat
// read there is no longer counted, and when the number is turned on or off. Not while it is out of
// sight in a tab: what that tab takes then, the pushes count.

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
}

export function noticeSeen(): void {
  tell({ erevos: 'seen' });
  if (!WEB_APP) return;
  follow();
  icon.seen();
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
  tell: (said) => ask(said === 'off' ? { erevos: 'badge', off: true } : { erevos: 'badge', unread: said }),
  showing: () => typeof document === 'undefined' || document.visibilityState === 'visible',
});

let following = false;

function follow(): void {
  if (following) return;
  following = true;
  onReceived(() => icon.changed());
  setInterval(() => icon.changed(), EVERY);
  onIconNumberChange(() => icon.seen());
}
