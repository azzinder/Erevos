// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Lang } from './i18n';

// The web app's notice while it is closed (push-notice.web.ts). The phone app shows its own.

export function noticeLanguage(_lang: Lang): void {}

export function noticeSeen(): void {}
