import type { Lang } from './i18n';
import { WEB_APP } from './integrity';

// The notice the service worker shows while the web app is closed counts the pushes since Erevos
// was last open, in the app's language (pwa/sw.js). The worker cannot read the app's settings, so
// the app tells it the language, and that Erevos is open again, which clears the notice.

type Page = Window & { erevosWorker?: (question: unknown) => Promise<unknown> };

function tell(question: Record<string, unknown>): void {
  const ask = WEB_APP ? (window as Page).erevosWorker : undefined;
  ask?.(question).catch(() => undefined);
}

export function noticeLanguage(lang: Lang): void {
  tell({ erevos: 'lang', lang });
}

export function noticeSeen(): void {
  tell({ erevos: 'seen' });
}
