// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sentOrShown, type HeldText } from './chat-writing';
import { t } from './i18n';
import { sendInThread, sendLocation, sendPoll, sendReply, sendText, type MatrixMessage, type MatrixState } from './matrix';
import { sendFile, sendSticker } from './matrix-media';
import { pollShown, previewContent } from './matrix-parts';

// A Matrix message of ours that did not go, sent again (app/matrix-chat.tsx, Send again), and one
// held to go later sent at its time (lib/chat-writing.ts), each as lib/matrix-store.ts runs them.
// What did not go never reached the homeserver: it is only here, shown as Not sent. Sent again, it
// goes as new, in its place in the room: its words with what they answered or the thread they were
// in, or its photo, file, sticker, place or poll anew.

/** One of ours in a room that did not go, by its ID here; undefined when there is none. */
export function unsentIn(state: MatrixState, roomId: string, id: string): MatrixMessage | undefined {
  return state.rooms[roomId]?.messages.find((m) => m.id === id && m.state === 'failed' && m.sender === state.userId);
}

/** Forgets one of ours that did not go. */
export function dropUnsent(state: MatrixState, roomId: string, id: string): void {
  const room = state.rooms[roomId];
  const failed = unsentIn(state, roomId, id);
  if (room && failed) room.messages.splice(room.messages.indexOf(failed), 1);
}

/**
 * Sends again one of ours that did not go, in its place, and forgets the one that did not: a photo
 * or file with its `bytes`, fetched back from the homeserver (its upload went, the message did
 * not); words naming `mentions`. One that does not go again shows as Not sent once more.
 */
export async function sendAgain(state: MatrixState, roomId: string, failed: MatrixMessage, mentions: string[], bytes: Uint8Array | null): Promise<void> {
  if (unsentIn(state, roomId, failed.id) !== failed) return;
  dropUnsent(state, roomId, failed.id);
  const file = failed.file;
  if (file && bytes && failed.sticker) {
    await sendSticker(state, roomId, { bytes, mime: file.mime, label: file.name, ...(file.w && file.h ? { w: file.w, h: file.h } : {}) }, failed.thread);
  } else if (file && bytes) {
    await sendFile(state, roomId, {
      name: file.name,
      mime: file.mime,
      bytes,
      ...(file.w && file.h ? { w: file.w, h: file.h } : {}),
      ...(file.voice ? { voice: { durationMs: file.duration ?? 0, ...(file.waveform ? { waveform: file.waveform } : {}) } } : {}),
    });
  } else if (failed.place) await sendLocation(state, roomId, failed.place, failed.thread);
  else if (failed.poll) await sendPoll(state, roomId, pollShown(failed.poll).poll);
  else await sendWords(state, roomId, failed.text, { replyTo: failed.replyTo, thread: failed.thread, mentions }, failed.preview ? previewContent(failed.preview) : {});
}

// Words as typed: in a thread, as an answer to one still in the room, or as they are.
async function sendWords(state: MatrixState, roomId: string, text: string, how: { replyTo?: string; thread?: string; mentions?: string[] }, extra: Record<string, unknown> = {}): Promise<void> {
  const room = state.rooms[roomId];
  const answers = how.replyTo && room?.messages.some((m) => m.id === how.replyTo && !m.deleted && !m.state) ? how.replyTo : undefined;
  const mentions = how.mentions ?? [];
  if (how.thread) await sendInThread(state, roomId, how.thread, text, answers, mentions, extra);
  else if (answers) await sendReply(state, roomId, text, answers, mentions, extra);
  else await sendText(state, roomId, text, mentions, extra);
}

/** Sends a message held for later, as typed now. Done once it shows in the room, sent or not
 *  sent; throws when nothing of it could be tried (lib/chat-writing.ts, sentOrShown). */
export function sendHeld(state: MatrixState, held: HeldText): Promise<void> {
  // Only to a room joined here: one not here would be made anew, and without encryption.
  const room = state.rooms[held.chat];
  if (!room || room.invitedBy) return Promise.reject(new Error(t('This chat is not here any more.')));
  return sentOrShown(
    () => state.rooms[held.chat]?.messages,
    (m) => m.state === 'failed' && m.sender === state.userId,
    () => sendWords(state, held.chat, held.text, held),
  );
}
