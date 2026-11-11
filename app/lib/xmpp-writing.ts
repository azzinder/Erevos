// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sentOrShown, type HeldText } from './chat-writing';
import { forwardXmpp, replyXmppText, sendXmppFile, sendXmppText, type XmppConnection, type XmppMessage, type XmppState } from './xmpp';
import { nameFor } from './xmpp-actions';

// An XMPP message of ours that did not go, sent again (app/xmpp-chat.tsx, Send again), and one held
// to go later sent at its time (lib/chat-writing.ts), each as lib/xmpp-store.ts runs them. One that
// did not go is shown as Not sent: the server did not take it, or sent it back as an error. Sent
// again, it goes as new, in its place: its words with what they answered, or its file's link (its
// upload went), marked forwarded when it was.

/** One of ours in a chat that did not go, by its ID; undefined when there is none. */
export function unsentIn(state: XmppState, jid: string, id: string): XmppMessage | undefined {
  return state.chats[jid]?.messages.find((m) => m.id === id && m.mine && m.state === 'failed' && !m.deleted && !m.call);
}

/** Forgets one of ours that did not go. */
export function dropUnsent(state: XmppState, jid: string, id: string): void {
  const chat = state.chats[jid];
  const failed = unsentIn(state, jid, id);
  if (chat && failed) chat.messages.splice(chat.messages.indexOf(failed), 1);
}

// Words as typed: as an answer to one still in the chat that can be answered, or as they are.
async function sendWords(state: XmppState, connection: XmppConnection, jid: string, text: string, replyTo?: string): Promise<void> {
  const chat = state.chats[jid];
  const answered = replyTo ? chat?.messages.find((m) => m.id === replyTo && !m.deleted && !m.call && m.state !== 'failed' && m.state !== 'sending') : undefined;
  if (answered && nameFor(answered, !!chat?.room)) await replyXmppText(state, connection, jid, text, answered.id);
  else await sendXmppText(state, connection, jid, text);
}

/** Sends again one of ours that did not go, in its place, and forgets the one that did not. One
 *  that does not go again shows as Not sent once more. */
export async function sendAgain(state: XmppState, connection: XmppConnection, jid: string, id: string): Promise<void> {
  const failed = unsentIn(state, jid, id);
  if (!failed) return;
  dropUnsent(state, jid, id);
  if (failed.forwarded) await forwardXmpp(state, connection, jid, failed.file ? { file: failed.file } : { text: failed.text });
  else if (failed.file) await sendXmppFile(state, connection, jid, failed.file);
  else if (failed.preview && !failed.replyTo) await sendXmppText(state, connection, jid, failed.text, failed.preview);
  else await sendWords(state, connection, jid, failed.text, failed.replyTo);
}

/** Sends a message held for later, as typed now. Done once it shows in the chat, sent or not
 *  sent; throws when nothing of it could be tried (lib/chat-writing.ts, sentOrShown). */
export function sendHeld(state: XmppState, connection: XmppConnection, held: HeldText): Promise<void> {
  return sentOrShown(
    () => state.chats[held.chat]?.messages,
    (m) => m.mine && m.state === 'failed',
    () => sendWords(state, connection, held.chat, held.text, held.replyTo),
  );
}
