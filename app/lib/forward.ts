import type { FileMeta, FileRef } from '../lock/attachment-files';
import { loadClip, type VoiceRef } from '../lock/voice-clips';
import { bytesSource, readFile, refSource, type Source } from './attachments';
import type { Place, Poll, Preview } from './chat-parts';
import { sendGroupFile, voiceMime } from './group-media';
import { t } from './i18n';
import { spaceGroupsAt, type GroupsAt } from './space-groups';

// Passing a message on to another chat.
//
// From an SMS conversation (app/sms.tsx), a message is held for the screen that opens next for it:
// another number's SMS conversation, or an Erevos chat with a contact, which puts it in its message
// field, to be read and sent there.
//
// From an Erevos chat, a copy goes, never the message itself. Its words, a sticker, a place or a
// poll go anew; a voice message's sound and a photo's or file's bytes are read here and sent again,
// encrypted with a key of their own, so nothing ties the copy to the message it came from, on the
// relay or anywhere. A copy says it was forwarded, not from where. It goes only to a chat of the
// same place: from a hidden chat to the same hidden chats only.
//
// What is held for the next screen is held in memory only, for a minute at most.

const FRESH = 60_000;

export type Forwarded = { text: string; photo: { bytes: Uint8Array; mime: string } | null };

let held: { to: string; forwarded: Forwarded; until: number } | null = null;

/** Holds an SMS for the screen of `to`: an SMS address, or `contact:` and a contact's identity. */
export function forwardTo(to: string, forwarded: Forwarded, now = Date.now()): void {
  held = { to, forwarded, until: now + FRESH };
}

/** The message held for `to` (as `same` compares them), once: it is let go right after it is read,
 *  so a screen drawn twice still finds it. */
export function forwardedTo(to: string, same: (a: string, b: string) => boolean = (a, b) => a === b, now = Date.now()): Forwarded | null {
  const kept = held;
  if (!kept || kept.until <= now || !to || !same(kept.to, to)) return null;
  queueMicrotask(() => {
    if (held === kept) held = null;
  });
  return kept.forwarded;
}

/**
 * What a message to forward is made of, in a contact's chat (lock/history.ts) or a group's
 * (lock/group-data.ts), where a voice message is a file with how long it lasts (`ms`).
 */
export type Forwardable = { text: string; voice?: VoiceRef; file?: FileRef; ms?: number; sticker?: string; place?: Place; poll?: Poll; preview?: Preview };

// A message forwarded from a group to a contact, handed to their chat in memory as it opens.
let handed: { to: string; message: Forwardable; until: number } | null = null;

/** Hands a message to the chat of `to` (`contact:` and a contact's identity) about to open (app/chat.tsx), to forward it there. */
export function handForward(to: string, message: Forwardable, now = Date.now()): void {
  handed = { to, message, until: now + FRESH };
}

/** The message handed to forward to `to`, once: it is let go as it is read, so it goes only once. */
export function takeForward(to: string, now = Date.now()): Forwardable | null {
  const kept = handed;
  if (!kept || kept.until <= now || kept.to !== to) return null;
  handed = null;
  return kept.message;
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

/** A photo or file kept here, to go as a new one: its bytes as they are read, and what it says of itself (a sticker stays one). */
export function fileCopy(file: FileRef): { source: Source; meta: Omit<FileMeta, 'size'> } {
  const { name, mime, kind, w, h, sticker, hidden } = file;
  return { source: refSource(file), meta: { name, mime, kind, ...(w && h ? { w, h } : {}), ...(sticker ? { sticker } : {}), ...(hidden ? { hidden } : {}) } };
}

/**
 * Forwards a message to one of the space's groups (lib/groups.ts), or of a hidden place's (`at`):
 * its words, or its sound or its bytes put on its relay anew, as a member's photo, file or voice
 * message goes (lib/group-media.ts).
 */
export async function forwardToGroup(id: string, message: Forwardable, at: GroupsAt = spaceGroupsAt): Promise<void> {
  const groups = await at.groups();
  const forwarded = { forwarded: true as const };
  if (message.voice || (message.file && message.ms)) {
    const copy = await voiceCopy(message);
    if (!copy) throw new Error(t('This voice message\'s sound is gone.'));
    const meta = { name: 'voice', mime: copy.mime, kind: 'file' as const };
    await sendGroupFile(groups, id, await at.relay(), bytesSource(copy.audio), meta, copy.ms, at.transport, undefined, forwarded);
    return;
  }
  if (message.file) {
    const { source, meta } = fileCopy(message.file);
    await sendGroupFile(groups, id, await at.relay(), source, meta, undefined, at.transport, undefined, forwarded);
    return;
  }
  const { sticker, place, poll, preview } = message;
  await groups.send(id, message.text, at.transport, { sticker, place, poll, preview, ...forwarded });
}
