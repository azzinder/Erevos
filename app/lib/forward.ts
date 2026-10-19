import type { FileMeta, FileRef } from '../lock/attachment-files';
import { loadClip, type VoiceRef } from '../lock/voice-clips';
import { bytesSource, refSource, type Source } from './attachments';
import { sendGroupFile, voiceMime } from './group-media';
import { t } from './i18n';
import { groupRelay, spaceGroups, spaceGroupTransport } from './space-groups';

// Forwarding a message to another chat: always a copy, never the message itself. Its words, a
// sticker, a place or a poll go anew; a voice message's sound and a photo's or file's bytes are
// read here and sent again, encrypted with a key of their own, so nothing ties the copy to the
// message it came from, on the relay or anywhere. A copy says it was forwarded, not from where.
// It goes only to a chat of the same place: from a hidden chat to the same hidden chats only.

/** What a message to forward is made of, in a contact's chat (lock/history.ts) or a group's. */
export type Forwardable = { text: string; voice?: VoiceRef; file?: FileRef; sticker?: string; place?: object; poll?: object };

/**
 * Whether a message can be forwarded from this phone: it says something, and a photo or file is
 * here, not still on the relay. A call's line is the chat's own, not a message: the chat leaves it out.
 */
export function canForward(message: Forwardable): boolean {
  if (message.file) return !message.file.from;
  return !!message.voice || !!message.text;
}

/** A voice message's sound, read again to go as a new one, with how long it is and its type; null when it is gone. */
export async function voiceCopy(voice: VoiceRef): Promise<{ audio: Uint8Array; ms: number; mime: string } | null> {
  const audio = await loadClip(voice);
  return audio ? { audio, ms: voice.ms, mime: voiceMime(audio) } : null;
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
  if (message.voice) {
    const copy = await voiceCopy(message.voice);
    if (!copy) throw new Error(t('This voice message\'s sound is gone.'));
    await sendGroupFile(groups, id, await groupRelay(), bytesSource(copy.audio), { name: 'voice', mime: copy.mime, kind: 'file' }, copy.ms, spaceGroupTransport);
    return;
  }
  if (message.file) {
    const { source, meta } = fileCopy(message.file);
    await sendGroupFile(groups, id, await groupRelay(), source, meta, undefined, spaceGroupTransport);
    return;
  }
  await groups.send(id, message.text, spaceGroupTransport);
}
