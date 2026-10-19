import { cleanFileName } from '../lock/attachment-files';
import { shownLine } from './call-lines';
import { placeText, type Place, type Poll } from './chat-parts';
import { t } from './i18n';
import { messageLine, type LineOf } from './message-line';

// A chat written out, to read or keep outside Erevos: plain text, each day under its date and each
// message on a line with its time and who wrote it, saved where the owner picks (lib/save-file.ts).
// Once saved it is not sealed: anyone who has the file can read it. Photos, files and voice
// messages stay in Erevos and are only named. A message that disappears is left out, and so is a
// quote of one, as whoever sent it meant it to go.

/** A message to write out, as lock/history.ts keeps it, or a group's (lock/group-data.ts). */
export type Written = LineOf & {
  mine: boolean;
  at: number;
  tag?: string;
  re?: string;
  forwarded?: boolean;
  myReaction?: string;
  theirReaction?: string;
  place?: Place;
  poll?: Poll;
  myVote?: number[];
  theirVote?: number[];
  lasts?: number;
  until?: number;
  /** In a group: who wrote it, when not us, and each member's reaction and vote, by name. */
  by?: string;
  reactedBy?: { emoji: string; name: string }[];
  votedBy?: { chose: number[]; name: string }[];
};

const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// Under a message's first line, its next ones start past the time.
const UNDER = ' '.repeat(7);

// What a message says, a line at a time: its words, or what it is in brackets.
function linesOf(message: Written, them: string): string[] {
  if (message.file?.kind === 'photo') return [`[${t('Photo: {name}', { name: message.file.name })}]`];
  if (message.voice || message.file || message.sticker) return [`[${messageLine(message)}]`];
  if (message.place) return [`[${t('Location')}: ${placeText(message.place)}]`];
  if (message.poll) {
    const voted = message.votedBy ?? [
      { chose: message.myVote ?? [], name: t('You') },
      { chose: message.theirVote ?? [], name: them },
    ];
    const chose = (option: number) =>
      voted
        .filter((v) => v.chose.includes(option))
        .map((v) => v.name)
        .join(', ');
    return [`[${messageLine(message)}]`, ...message.poll.o.map((option, i) => `  ${option}${chose(i) ? `: ${chose(i)}` : ''}`)];
  }
  return shownLine(message.text).split('\n');
}

/** The chat with `them` as text, oldest first, written out at `now`. */
export function chatText(messages: Written[], them: string, now: number): string {
  const at = new Date(now);
  const lines = [
    t('Chat with {name}, written out of Erevos', { name: them }),
    t('Written out {when}. This file is not encrypted: anyone who has it can read it.', { when: `${dayOf(at)} ${timeOf(at)}` }),
  ];
  const kept = messages.filter((m) => !m.lasts && !m.until).sort((a, b) => a.at - b.at);
  let day = '';
  for (const message of kept) {
    const [first, ...more] = linesOf(message, them);
    if (!first && more.length === 0) continue;
    const d = new Date(message.at);
    if (dayOf(d) !== day) {
      day = dayOf(d);
      lines.push('', day);
    }
    const quoted = message.re ? kept.find((m) => m.tag === message.re) : undefined;
    const about = [message.forwarded ? t('forwarded') : '', quoted ? t('answering “{line}”', { line: messageLine(quoted) }) : ''].filter(Boolean).join(', ');
    lines.push(`${timeOf(d)}  ${message.mine ? t('You') : (message.by ?? them)}${about ? ` (${about})` : ''}: ${first}`, ...more.map((line) => UNDER + line));
    const reacted = message.reactedBy ?? [
      { emoji: message.theirReaction ?? '', name: them },
      { emoji: message.myReaction ?? '', name: t('You') },
    ];
    const reactions = reacted.filter((r) => r.emoji).map((r) => `${r.emoji} ${r.name}`);
    if (reactions.length > 0) lines.push(UNDER + reactions.join('  '));
  }
  return `${lines.join('\n')}\n`;
}

/** The written-out chat's file name, with the day it was written out. */
export function exportName(them: string, now: number): string {
  return cleanFileName(`Erevos - ${them.replace(/[\\/]/g, '-')} - ${dayOf(new Date(now))}.txt`);
}
