import { deleteChunks, type FileMeta, type FileRef } from '../lock/attachment-files';
import type { GroupMessage } from '../lock/group-data';
import { AUTO_TAKE, sendFile, takeFile, type Source } from './attachments';
import type { GroupTransport, Groups } from './groups';
import type { Relay } from './relay';

// Photos, files and voice messages in group chats (lib/groups.ts), through the relay's file store
// as a chat's are (lib/attachments.ts). The sender's phone encrypts the file and puts it on its
// own relay, then says where it is, and its key, in one group message. Each member's phone takes
// it through its own relay and leaves it there for the others: it expires on the relay after 14
// days. A voice message is a small file too, so it goes in one group message, not in parts as to a
// contact (lib/voice.ts), and is taken by itself like the photos and files up to AUTO_TAKE.

type Progress = (done: number, count: number) => void;

/**
 * Sends a photo or file, or with `ms` a voice message, to a group: its chunks to our relay (`own`),
 * then where they are to every member. If any of it cannot go, nothing is kept here.
 */
export async function sendGroupFile(
  groups: Groups,
  id: string,
  own: Relay,
  source: Source,
  meta: Omit<FileMeta, 'size'>,
  ms: number | undefined,
  transport: GroupTransport,
  progress?: Progress,
): Promise<void> {
  const { ref, offer } = await sendFile(own, source, meta, progress);
  try {
    await groups.sendFile(id, ref, offer, ms, transport);
  } catch (error) {
    await deleteChunks(ref.id, ref.count).catch(() => undefined);
    throw error;
  }
}

/**
 * Takes a group's photo, file or voice message from the relay it is on, through ours (`own`), and
 * keeps it here, leaving it on the relay for the other members. Returns where it is kept, or null
 * if its message went meanwhile, and then nothing is kept.
 */
export async function takeGroupFile(groups: Groups, id: string, own: Relay, ref: FileRef, progress?: Progress): Promise<FileRef | null> {
  const taken = await takeFile(own, ref, progress, true);
  if (await groups.setFile(id, taken)) return taken;
  await deleteChunks(taken.id, taken.count).catch(() => undefined);
  return null;
}

/** The files of others' messages to take by themselves: still on the relay, up to AUTO_TAKE, and not tried yet (by file id). */
export function filesToTake(messages: GroupMessage[], tried: Set<string>): FileRef[] {
  return messages.flatMap((m) => (m.from && m.file?.from && m.file.size <= AUTO_TAKE && !tried.has(m.file.id) ? [m.file] : []));
}

/** The type of a voice message's sound, from how it starts: AAC from a phone, Opus from a computer. */
export function voiceMime(audio: Uint8Array): string {
  const text = (from: number, to: number) => String.fromCharCode(...audio.subarray(from, to));
  if (text(4, 8) === 'ftyp') return 'audio/mp4';
  if (text(0, 4) === 'OggS') return 'audio/ogg';
  if (audio[0] === 0x1a && audio[1] === 0x45 && audio[2] === 0xdf && audio[3] === 0xa3) return 'audio/webm';
  return 'application/octet-stream';
}
