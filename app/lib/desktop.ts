import { plural, t } from './i18n';
import { onReceived } from './receiver';
import { SHELL, shellFetch, shellSystem, showWindow } from './shell';
import { spaceUnread } from './unread';

// Erevos on a computer (desktop/main.js) keeps running when its window is closed, in the system
// tray (on a Mac, in the Dock), unless turned off under Settings → Notifications → In the
// background. Out of sight it goes on waiting at the relay, a call rings
// (modules/erevos-call/page-ring.web.ts) and brings the window back, and a notice says how many
// messages the open space has not read, as the number on a phone's icon counts them (lib/unread.ts):
// never who or what, never a hidden chat's or a muted one's. It shows when more came while the
// window is closed, hidden or behind another, and goes once Erevos shows; a tap brings the window
// back. The tray's menu and the notice the shell shows the first time are in the app's language:
// the page gives the shell their words (push-notice.web.ts, as the language is set).

export const DESKTOP = SHELL === 'electron';

/** Whether Erevos keeps running with its window closed; null where it cannot tell (not the computer's app). */
export async function keepRunning(): Promise<boolean | null> {
  if (!DESKTOP) return null;
  try {
    const answer = await shellFetch('/__window');
    if (answer.status === 404) return null;
    const said = (await answer.json()) as { keep?: unknown };
    return typeof said.keep === 'boolean' ? said.keep : null;
  } catch {
    return null;
  }
}

export async function setKeepRunning(on: boolean): Promise<void> {
  await shellFetch(`/__window?keep=${on ? 1 : 0}`, { method: 'PUT' });
}

/** Gives the shell the words of the tray's menu, in the app's language. */
export function desktopWords(): void {
  if (!DESKTOP) return;
  const words = {
    open: t('Open Erevos'),
    quit: t('Quit Erevos'),
    kept:
      shellSystem() === 'macos'
        ? t('Erevos keeps running with its window closed: messages come and calls ring. Quit it from its menu.')
        : t('Erevos keeps running with its window closed: messages come and calls ring. Quit it from its icon in the system tray.'),
  };
  void shellFetch('/__window', { method: 'POST', body: JSON.stringify(words) }).catch(() => undefined);
}

// The notice, and how many messages were not read as Erevos was last seen or the notice last told.
let notice: Notification | null = null;
let told = 0;
let following = false;

const seen = () => document.visibilityState === 'visible' && document.hasFocus();

async function came(): Promise<void> {
  if (seen()) return;
  const now = await spaceUnread();
  if (now === null || seen()) return;
  if (now <= told) {
    // Read meanwhile: what comes next is told from there.
    told = now;
    return;
  }
  told = now;
  try {
    notice?.close();
    notice = new Notification('Erevos', { body: plural(now, '{n} new message', '{n} new messages'), tag: 'erevos-messages' });
    notice.onclick = () => showWindow();
  } catch {
    // Notices are refused here.
  }
}

// Erevos shows, or stops showing: the notice goes, and counts on from what is not read now.
async function looked(): Promise<void> {
  if (seen()) {
    notice?.close();
    notice = null;
  }
  told = (await spaceUnread()) ?? 0;
}

/** Starts the notice for messages, once; each time Erevos shows again, it goes. */
export function followDesktop(): void {
  if (!DESKTOP || following || typeof window === 'undefined') return;
  following = true;
  onReceived(() => void came());
  for (const type of ['focus', 'blur']) window.addEventListener(type, () => void looked());
  document.addEventListener('visibilitychange', () => void looked());
  void looked();
}
