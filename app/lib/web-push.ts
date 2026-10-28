import type { Queue } from '../lock/space-data';
import type { Relay } from './relay';
import { t } from './i18n';

// Notifications through Web Push are for the web app only (web-push.web.ts). The phone app
// receives in the background itself (background.ts).

export const PUSH_AVAILABLE = false;

export function turnOnPush(): Promise<string | null> {
  return Promise.resolve(t('Notifications through the browser are for the web app.'));
}

export function turnOffPush(): Promise<void> {
  return Promise.resolve();
}

export function notificationsOn(): Promise<boolean> {
  return Promise.resolve(false);
}

export function keepPush(_own: Relay, _queue: Queue): Promise<void> {
  return Promise.resolve();
}

export function dropPush(_own: Relay, _queue: Queue): Promise<void> {
  return Promise.resolve();
}
