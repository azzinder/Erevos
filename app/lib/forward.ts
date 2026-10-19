import type { FileMeta, FileRef } from '../lock/attachment-files';
import { loadClip, type VoiceRef } from '../lock/voice-clips';
import { bytesSource, readFile, refSource, type Source } from './attachments';
import type { Place, Poll, Preview } from './chat-parts';
import { sendGroupFile, voiceMime } from './group-media';
import { t } from './i18n';
import { groupRelay, spaceGroups, spaceGroupTransport } from './space-groups';

// Forwarding a message to another chat: always a copy, never the message itself. Its words, a
// sticker, a place or a poll go anew; a voice message's sound and a photo's or file's bytes are
// read here and sent again, encrypted with a key of their own, so nothing ties the copy to the
// message it came from, on the relay or anywhere. A copy says it was forwarded, not from where.
// It goes only to a chat of the same place: from a hidden chat to the same hidden chats only.

/**
 * What a message to forward is made of, in a contact's chat (lock/history.ts) or a group's
 * (lock/group-data.ts), where a voice message is a file with how long it lasts (`ms`).
 */
export type Forwardable = { text: string; voice?: VoiceRef; file?: FileRef; ms?: number; sticker?: string; place?: Place; poll?: Poll; preview?: Preview };

// A message forwarded from a group to a contact, handed to their chat in memory as it opens.
let handed: Forwardable | null = null;

/** Hands a message to the contact's chat about to open (app/chat.tsx), to forward it there. */
export function handForward(message: Forwardable): void {
  handed = message;
}

/** The message handed to forward, once. */
export function takeForward(): Forwardable | null {
  const message = handed;
  handed = null;
  return message;
}

/**
 * Whether a message can be forwarded from this phone: it says something, and a photo or file is
 * here, not still on the relay. A call's line is the chat's own, not a message: the chat leaves it out.
 */
export function canForward(message: Forwardable): boolean {
  if (message.file) return !message.file.from;
  return !!message.voice || !!message.text;
}

/**
 * A voice message's sound, read again to go as a new one, with how long it is and its type: a
 * contact's (`voice`) or a group's (a `file` with `ms`). Null when it is not one, or it is gone.
 */
export async function voiceCopy({ voice, file, ms }: Pick<Forwardable, 'voice' | 'file' | 'ms'>): Promise<{ audio: Uint8Array; ms: number; mime: string } | null> {
  const audio = voice ? await loadClip(voice) : file && ms ? await readFile(file) : null;
  const lasts = voice?.ms ?? ms ?? 0;
  return audio ? { audio, ms: lasts, mime: voiceMime(audio) } : null;
}

/** A photo or file kept here, to go as a new one: its bytes as they are read, and what it says of itself. */
export function fileCopy(file: FileRef): { source: Source; meta: Omit<FileMeta, 'size'> } {
  const { name, mime, kind, w, h } = file;
  return { source: refSource(file), meta: { name, mime, kind, ...(w && h ? { w, h } : {}) } };
}

/**
 * Forwards a message to one of the space's groups (lib/groups.ts): its words, or its sound or its
 * bytes put on our relay anew, as a member's photo, file or voice message goes (lib/group-media.ts).
 */
export async function forwardToGroup(id: string, message: Forwardable): Promise<void> {
  const groups = await spaceGroups();
  const forwarded = { forwarded: true as const };
  if (message.voice || (message.file && message.ms)) {
    const copy = await voiceCopy(message);
    if (!copy) throw new Error(t('This voice message\'s sound is gone.'));
    const meta = { name: 'voice', mime: copy.mime, kind: 'file' as const };
    await sendGroupFile(groups, id, await groupRelay(), bytesSource(copy.audio), meta, copy.ms, spaceGroupTransport, undefined, forwarded);
    return;
  }
  if (message.file) {
    const { source, meta } = fileCopy(message.file);
    await sendGroupFile(groups, id, await groupRelay(), source, meta, undefined, spaceGroupTransport, undefined, forwarded);
    return;
  }
  const { sticker, place, poll, preview } = message;
  await groups.send(id, message.text, spaceGroupTransport, { sticker, place, poll, preview, ...forwarded });
}
