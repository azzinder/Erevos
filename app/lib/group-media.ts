// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { deleteChunks, type FileMeta, type FileRef } from '../lock/attachment-files';
import type { GroupMessage, GroupParts } from '../lock/group-data';
import { AUTO_TAKE, sendFile, takeFile, type Source, takesItself } from './attachments';
import type { GroupTransport, Groups } from './groups';
import type { Relay } from './relay';
import { soundOf } from './voice';

// Photos, files and voice messages in group chats (lib/groups.ts), through the relay's file store
// as a chat's are (lib/attachments.ts). The sender's phone encrypts the file and puts it on its
// own relay, then says where it is, and its key, in one group message. Each member's phone takes
// it through its own relay and leaves it there for the others: it expires on the relay after 14
// days. A voice message is a small file too, so it goes in one group message, not in parts as to a
// contact (lib/voice.ts), and is taken by itself like the photos and files up to AUTO_TAKE.

type Progress = (done: number, count: number) => void;

/**
 * Sends a photo or file, or with `ms` a voice message, to a group: its chunks to our relay (`own`),
 * then where they are to every member, with what it answers or that it is forwarded (`parts`). If
 * any of it cannot go, nothing is kept here.
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
  parts: GroupParts = {},
): Promise<void> {
  const { ref, offer } = await sendFile(own, source, meta, progress);
  try {
    await groups.sendFile(id, ref, offer, ms, transport, parts);
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
export async function takeGroupFile(groups: Groups, id: string, own: Relay, ref: FileRef, progress?: Progress, itself = false): Promise<FileRef | null> {
  const taken = await takeFile(own, ref, progress, true, null, itself);
  if (await groups.setFile(id, taken)) return taken;
  await deleteChunks(taken.id, taken.count).catch(() => undefined);
  return null;
}

/**
 * The files of messages to take by themselves: still on the relay, up to AUTO_TAKE, not tried
 * yet (by file id), and from where a take by itself may go (lib/attachments.ts takesItself): a
 * member's relay reached straight from a lent place would see this phone's address, so such a
 * file waits for a tap. One of this phone's own is there only when another device of the account
 * sent it, or the phone put it there for this one (lib/devices.ts).
 */
export function filesToTake(messages: GroupMessage[], tried: Set<string>, own: Relay | null = null): FileRef[] {
  return messages.flatMap((m) => (m.file?.from && m.file.size <= AUTO_TAKE && !tried.has(m.file.id) && (own === null || takesItself(own, m.file.from)) ? [m.file] : []));
}

const VOICE_TYPES = { ogg: 'audio/ogg', webm: 'audio/webm', mp4: 'audio/mp4' } as const;

/**
 * The type of a voice message's sound, from how it starts (lib/voice.ts soundOf): Ogg/Opus from
 * Android 10 and later and the browsers, AAC from older phones and Safari before 18.4, WebM/Opus
 * from a browser that does not play Ogg. Ogg goes as plain audio/ogg, as Element sends voice
 * messages and Matrix's MSC3245 has it: the codec is not added, as some apps and upload servers
 * compare the type whole, and an older Erevos knows audio/ogg.
 */
export function voiceMime(audio: Uint8Array): string {
  const kind = soundOf(audio);
  return kind ? VOICE_TYPES[kind] : 'application/octet-stream';
}

/** The name and type a recorded voice message is sent under to Matrix, XMPP and Nostr: voice.ogg, voice.m4a or voice.webm. */
export function voiceNamed(audio: Uint8Array): { name: string; mime: string } {
  const kind = soundOf(audio);
  return kind === 'ogg' || kind === 'webm' ? { name: `voice.${kind}`, mime: VOICE_TYPES[kind] } : { name: 'voice.m4a', mime: 'audio/mp4' };
}
