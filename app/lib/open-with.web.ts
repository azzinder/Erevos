// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';

// In the desktop and web apps a chat's file is saved, not handed to another app (lib/open-with.ts).

export const CAN_OPEN_FILE = false;

export { openType } from './open-type';

export const openFileWith = (_name: string, _type: string, _bytes: Uint8Array): Promise<void> => Promise.reject(new Error(t('This build of Erevos cannot do this. Update Erevos for it.')));
