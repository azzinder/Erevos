import { shownLine } from './call-lines';
import { t } from './i18n';
import { stickerOf } from './stickers';
import { voiceDuration } from './voice';

// A message in one line, in the app's language: its words, or what it is when it has none. For the
// quote above an answer, the home screen's list, the search, the starred messages and the menu.

/** What a line is made from: a contact's message (lock/history.ts) or a group's (lock/group-data.ts). */
export type LineOf = {
  text: string;
  voice?: { ms: number };
  file?: { kind: 'photo' | 'file'; name: string };
  sticker?: string;
  place?: object;
  poll?: { q: string };
};

/** The message in one line: the first of its words, or what it carries. */
export function messageLine(message: LineOf): string {
  if (message.voice) return t('Voice message, {time}', { time: voiceDuration(message.voice.ms) });
  if (message.file) return message.file.kind === 'photo' ? t('Photo') : t('File: {name}', { name: message.file.name });
  if (message.sticker) {
    const sticker = stickerOf(message.sticker);
    return sticker ? t('Sticker: {name}', { name: t(sticker.label) }) : t('Sticker');
  }
  if (message.place) return t('Location');
  if (message.poll) return t('Poll: {question}', { question: message.poll.q });
  return shownLine(message.text).split('\n')[0].trim();
}
