// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';
import { lastSeenText } from './last-seen';

// Whether a Matrix or XMPP contact is online, as their server says (lib/matrix.ts, lib/xmpp.ts):
// online, away or busy, with the words they set, or when they were last active. Kept in memory
// only, never in the account's file or a backup, and forgotten when the connection ends.

export type NetPresence = {
  show: 'online' | 'away' | 'busy' | 'offline';
  /** The words they set, such as "At work", cleaned and short. */
  status?: string;
  /** When they were last active (ms), when their server says. */
  lastActive?: number;
};

/** The longest words of a status shown. */
export const MOST_STATUS = 140;

/** Words of a status as they can be shown on one line: no control or direction marks, short. */
export function cleanStatus(text: unknown): string | undefined {
  if (typeof text !== 'string') return undefined;
  const words = text
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!words) return undefined;
  return words.length > MOST_STATUS ? `${words.slice(0, MOST_STATUS - 1)}…` : words;
}

/** Whether they show as online now: online, away or busy. */
export const isOn = (presence: NetPresence | null | undefined): boolean => !!presence && presence.show !== 'offline';

/** What the chat says of them: "Online · At work", "Away", "last seen today at 14:32", or nothing. */
export function presenceText(presence: NetPresence | null | undefined, now = Date.now()): string {
  if (!presence) return '';
  const what =
    presence.show === 'online'
      ? t('Online')
      : presence.show === 'away'
        ? t('Away')
        : presence.show === 'busy'
          ? t('Do not disturb')
          : presence.lastActive
            ? lastSeenText(presence.lastActive, now)
            : '';
  return [what, presence.status].filter(Boolean).join(' · ');
}
