import { ask } from './alert';
import type { IntegrityStatus } from './integrity';
import { SHELL } from './shell';
import { t } from './i18n';

export type { IntegrityStatus, Release } from './integrity';

// The web app (pwa/) runs only code its service worker checked against the signed release.
// pwa/boot.js passes on what the worker says, as `erevos-integrity` events, and lets the app ask
// it through `window.erevosWorker`. The desktop app is the same web build, run by Electron from
// its own files, without either.

type News = { kind: 'refused' | 'bad-loader' | 'update-ready' | 'install-failed'; reason?: string; version?: number };

type Page = Window & { erevosIntegrity?: News[]; erevosWorker?: (question: unknown) => Promise<unknown> };

const page = (typeof window === 'undefined' ? {} : window) as Page;

export const WEB_APP = !SHELL && Array.isArray(page.erevosIntegrity);

async function askWorker(question: string): Promise<IntegrityStatus | null> {
  if (!WEB_APP || !page.erevosWorker) return null;
  return ((await page.erevosWorker({ erevos: question })) as IntegrityStatus | null) ?? null;
}

export function integrityStatus(): Promise<IntegrityStatus | null> {
  return askWorker('status');
}

export function checkForUpdate(): Promise<IntegrityStatus | null> {
  return askWorker('check');
}

export function watchIntegrity(onNews: () => void): () => void {
  if (!WEB_APP) return () => undefined;
  window.addEventListener('erevos-integrity', onNews);
  return () => window.removeEventListener('erevos-integrity', onNews);
}

function alarm(news: News): void {
  if (news.kind === 'bad-loader') ask(
      t('Erevos was tampered with'),
      t('The server sent this device a new service worker, the part of Erevos that checks its code, and no signed release lists it. Erevos goes on with the checked code while it is open, but once it is closed the browser may start the new one, which could show a fake Erevos. Do not open Erevos from this server again, and do not type your passwords into it, until whoever runs the server knows why. Your chats stay sealed with your password.'),
      [{ text: t('I understand') }],
    );
  else if (news.kind === 'refused')
    ask(t('Update refused'), t('{reason} Erevos keeps the release it has. Settings → Privacy and security → This web app shows what was refused.', { reason: news.reason ?? '' }).trim(), [{ text: t('OK') }]);
}

let started = false;

/** Raises the alarm when the worker refused code from the server, for news so far and to come. */
export function startIntegrityAlarm(): void {
  if (!WEB_APP || started) return;
  started = true;
  for (const news of page.erevosIntegrity ?? []) alarm(news);
  window.addEventListener('erevos-integrity', (event) => alarm((event as CustomEvent<News>).detail));
}
