import type { LinkedMessage } from '../lock/archive';
import type { FileRef } from '../lock/attachment-files';
import type { GroupMessage } from '../lock/group-data';
import type { Message } from '../lock/history';
import type { VoiceRef } from '../lock/voice-clips';
import { splitLinks } from './links';

// A chat's photos, videos, voice messages, music, files and links, each kind apart, the newest
// first, as Telegram lists a chat's shared media (components/chat-media.tsx, from the chat's
// details): its own messages' and what was imported into it (lock/archive.ts). Each knows where it
// is in the chat, to go to it. And the days that have any, for the calendar that goes to one.

/** What was imported, as the chat names it: by its place in it (app/chat.tsx goes to it so). */
export const IMPORTED_TAG = 'imported:';
export const importedTag = (index: number) => `${IMPORTED_TAG}${index}`;

export type MediaKind = 'photo' | 'video' | 'voice' | 'music' | 'file' | 'link';

/** The kinds, in the order their lists show. */
export const MEDIA_KINDS: MediaKind[] = ['photo', 'video', 'voice', 'music', 'file', 'link'];

export type MediaItem = {
  /** Its own in the chat's list. */
  key: string;
  kind: MediaKind;
  /** When its message was written, milliseconds; 0 when an import did not say. */
  at: number;
  mine: boolean;
  /** Who wrote it, in an imported group; empty otherwise. */
  sender: string;
  /** Its message's tag in the chat, or the imported one's (importedTag). */
  tag: string;
  file?: FileRef;
  voice?: VoiceRef;
  /** A group's voice message is a file that lasts this long, milliseconds. */
  ms?: number;
  /** A link: where it opens, and its preview's title when the message has one for it. */
  url?: string;
  title?: string;
};

// What an imported file is: a sound to play where it is (a voice message, a song), a sticker of
// Telegram's or WhatsApp's, shown as one, or else a photo, a video or a file.
const SOUND_ENDINGS = ['opus', 'oga', 'ogg', 'm4a', 'mp3', 'aac', 'wav', 'amr', 'flac'];
const VIDEO_ENDINGS = ['mp4', 'mov', 'm4v', 'webm', 'mkv', '3gp', 'avi'];
const endingOf = (file: FileRef) => file.name.toLowerCase().split('.').pop() ?? '';
export const isSound = (file: FileRef) => file.kind === 'file' && (file.mime.startsWith('audio/') || SOUND_ENDINGS.includes(endingOf(file)));
export const soundEnding = (file: FileRef) => (SOUND_ENDINGS.includes(endingOf(file)) ? endingOf(file) : 'm4a');
/** A voice message as Telegram and WhatsApp name theirs; any other sound shows its name. */
export const isVoice = (file: FileRef) => /^(audio_\d|PTT-)/i.test(file.name) || endingOf(file) === 'opus';
export const isImportedSticker = (file: FileRef) => file.kind === 'photo' && file.mime === 'image/webp' && /^(sticker|STK-)/i.test(file.name);

/** Which list a file goes in: none for a sticker. A sound is a voice message only as an import names one. */
export function fileKind(file: FileRef, imported = false): MediaKind | null {
  if (file.sticker || isImportedSticker(file)) return null;
  if (file.kind === 'photo') return 'photo';
  if (file.mime.startsWith('video/') || VIDEO_ENDINGS.includes(endingOf(file))) return 'video';
  if (isSound(file)) return imported && isVoice(file) ? 'voice' : 'music';
  return 'file';
}

/** The web addresses in words, each once. */
export function linksIn(text: string): string[] {
  return [...new Set(splitLinks(text).flatMap((part) => (part.url ? [part.url] : [])))];
}

function linkItems(key: string, base: Omit<MediaItem, 'key' | 'kind'>, text: string, preview?: { url: string; title: string }): MediaItem[] {
  return linksIn(text).map((url, n) => ({ ...base, key: `${key}|link${n}`, kind: 'link', url, ...(preview?.url === url && preview.title ? { title: preview.title } : {}) }));
}

/** The media of a chat whose messages are `messages` and whose imported ones are `imported`, the newest first. */
export function chatMedia(messages: Message[], imported: LinkedMessage[] = []): MediaItem[] {
  const items: MediaItem[] = [];
  for (const message of messages) {
    const base = { at: message.at, mine: message.mine, sender: '', tag: message.tag };
    const key = `${message.peer}|${message.tag}`;
    if (message.voice) items.push({ ...base, key, kind: 'voice', voice: message.voice });
    const kind = message.file ? fileKind(message.file) : null;
    if (message.file && kind) items.push({ ...base, key: `${key}|file`, kind, file: message.file });
    // A sticker's, a place's or a poll's words are not the sender's own.
    if (message.text && !message.sticker && !message.place && !message.poll) items.push(...linkItems(key, base, message.text, message.preview));
  }
  imported.forEach((message, index) => {
    const base = { at: message.at, mine: message.mine, sender: message.mine ? '' : message.sender, tag: importedTag(index) };
    const key = base.tag;
    message.files.forEach((file, n) => {
      const kind = fileKind(file, true);
      if (kind) items.push({ ...base, key: `${key}|${n}`, kind, file });
    });
    if (message.text) items.push(...linkItems(key, base, message.text));
  });
  return items.sort((a, b) => b.at - a.at);
}

/** The media of a group whose messages are `messages`, `nameOf` naming a member, the newest first. */
export function groupMedia(messages: GroupMessage[], nameOf: (identity: string) => string): MediaItem[] {
  const items: MediaItem[] = [];
  for (const message of messages) {
    if (message.note) continue;
    const base = { at: message.at, mine: !message.from, sender: message.from ? nameOf(message.from) : '', tag: message.tag };
    const key = `group|${message.tag}`;
    if (message.file) {
      const kind = message.ms !== undefined ? 'voice' : fileKind(message.file);
      if (kind) items.push({ ...base, key: `${key}|file`, kind, file: message.file, ...(message.ms !== undefined ? { ms: message.ms } : {}) });
    }
    if (message.text && !message.sticker && !message.place && !message.poll) items.push(...linkItems(key, base, message.text, message.preview));
  }
  return items.sort((a, b) => b.at - a.at);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A day on this phone's clock, as 2026-10-25. */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A month on this phone's clock, as 2026-10. */
export const monthKey = (at: number) => dayKey(at).slice(0, 7);

/** The days that have any of `items`, by dayKey. Those of an import that gave no time are left out. */
export function daysOf(items: { at: number }[]): Set<string> {
  return new Set(items.filter((item) => item.at > 0).map((item) => dayKey(item.at)));
}

/** The weeks of a month (0 is January), Monday first: each day's date, or 0 for a day of the month before or after. */
export function monthWeeks(year: number, month: number): number[][] {
  const first = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array<number>(first).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(0);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
