// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { MyselfChat } from '../components/myself-chat';
import { ask } from '../lib/alert';
import { t } from '../lib/i18n';
import { laterLabel } from '../lib/later';
import { everyLabel, writeNote } from '../lib/myself';
import { linkNote, linkNoteKey, type LinkNote } from '../lib/note-link';

// Chat with myself, the open space's (components/myself-chat.tsx): its row is always at the top of
// the chats (app/index.tsx), and a reminder's notice opens it.
//
// Another app on the phone, as Fasouli for a payment to come, can open it with a note to add
// (lib/note-link.ts): Erevos asks first, as nothing tells which app sent the link.
let asked = '';

export default function MyselfScreen() {
  const params = useLocalSearchParams<{ note?: string; due?: string; every?: string }>();
  const note = linkNote(params);
  const key = note ? linkNoteKey(note) : '';
  useEffect(() => {
    if (!note || key === asked) return;
    asked = key;
    router.setParams({ note: undefined, due: undefined, every: undefined });
    offer(note);
    // Asked once for each request: `note` comes from `key`.
  }, [key]);
  return <MyselfChat />;
}

function offer(note: LinkNote): void {
  const message =
    note.due !== undefined
      ? t('An app on this phone asks to keep this note in Chat with myself, reminding you on {when}:\n\n{text}', { when: laterLabel(note.due), text: note.text })
      : t('An app on this phone asks to keep this note in Chat with myself:\n\n{text}', { text: note.text });
  const again = note.every ? `\n\n${everyLabel(note.every)}` : '';
  ask(t('Keep this note?'), message + again, [
    { text: t('Cancel'), style: 'cancel' },
    {
      text: t('Add'),
      onPress: () => {
        writeNote({ text: note.text, ...(note.due !== undefined ? { due: note.due } : {}), ...(note.every ? { every: note.every } : {}) }).catch((error: unknown) =>
          ask(t('Keep this note?'), t('Not kept. {reason}', { reason: error instanceof Error ? error.message : String(error) }), [{ text: t('OK') }]),
        );
      },
    },
  ]);
}
