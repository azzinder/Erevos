import type { Lang } from './i18n';

// The web app's notice while it is closed (push-notice.web.ts). The phone app shows its own.

export function noticeLanguage(_lang: Lang): void {}

export function noticeSeen(): void {}
