// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { mark, t } from './i18n';

// A call's line in a chat (lib/calls.ts, lib/group-calls.ts) is kept in English, as it was
// written, and shown in the app's language: here. So is the line a Matrix or XMPP chat keeps when
// someone's device is new, or comes with another key (lib/matrix.ts, lib/xmpp.ts): what goes in
// the chat is encrypted to their devices, so the person should know when those change.

const PREFIX = '📞 ';

const KINDS: string[] = [mark('Voice call'), mark('Video call'), mark('Group call'), mark('Group video call')];
const MISSED: Record<string, string> = {
  'voice call': mark('Missed voice call'),
  'video call': mark('Missed video call'),
  'group call': mark('Missed group call'),
  'group video call': mark('Missed group video call'),
};
const ENDINGS: string[] = [mark('turned down'), mark('could not connect'), mark('they were in another call'), mark('not answered'), mark('answered on another device')];

const KEY_PREFIX = '🔑 ';
const KEY_LINES = {
  new: mark('New device of {who}: your messages go to it too.'),
  changed: mark('A device of {who} changed its key: your messages do not go to it.'),
};
// Each as written in English, `who` taken out of it again.
const KEY_WRITTEN = Object.values(KEY_LINES).map((line) => ({ line, english: new RegExp(`^${line.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('{who}', '(.+)')}$`) }));

/** The line kept in a chat when a device of `who` is new, or changed its key, in English as the
 *  chat keeps it. */
export function deviceLine(kind: keyof typeof KEY_LINES, who: string): string {
  return KEY_PREFIX + KEY_LINES[kind].replace('{who}', who);
}

/** `text` of a message in the app's language, if it is a call's line or a device's; as it is otherwise. */
export function shownLine(text: string): string {
  if (text.startsWith(KEY_PREFIX)) {
    const line = text.slice(KEY_PREFIX.length);
    for (const { line: shown, english } of KEY_WRITTEN) {
      const found = english.exec(line);
      if (found) return KEY_PREFIX + t(shown, { who: found[1] });
    }
    return text;
  }
  if (!text.startsWith(PREFIX)) return text;
  const line = text.slice(PREFIX.length);
  const missed = /^Missed (.+?)(, while in another call)?$/.exec(line);
  if (missed && MISSED[missed[1]]) {
    const shown = t(MISSED[missed[1]]);
    return PREFIX + (missed[2] ? t('{missed}, while in another call', { missed: shown }) : shown);
  }
  const comma = line.indexOf(', ');
  const kind = comma < 0 ? '' : line.slice(0, comma);
  if (!KINDS.includes(kind)) return text;
  const rest = line.slice(comma + 2);
  // The rest is the call's length, or why it did not happen.
  return `${PREFIX}${t(kind)}, ${ENDINGS.includes(rest) ? t(rest) : rest}`;
}
