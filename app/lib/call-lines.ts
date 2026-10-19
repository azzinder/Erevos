import { mark, t } from './i18n';

// A call's line in a chat (lib/calls.ts, lib/group-calls.ts) is kept in English, as it was
// written, and shown in the app's language: here.

const PREFIX = '📞 ';

const KINDS: string[] = [mark('Voice call'), mark('Video call'), mark('Group call'), mark('Group video call')];
const MISSED: Record<string, string> = {
  'voice call': mark('Missed voice call'),
  'video call': mark('Missed video call'),
  'group call': mark('Missed group call'),
  'group video call': mark('Missed group video call'),
};
const ENDINGS: string[] = [mark('turned down'), mark('could not connect'), mark('they were in another call'), mark('not answered'), mark('answered on another device')];

/** `text` of a message in the app's language, if it is a call's line; as it is otherwise. */
export function shownLine(text: string): string {
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
