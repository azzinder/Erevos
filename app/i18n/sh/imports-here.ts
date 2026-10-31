// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Serbo-Croatian of importing a chat from inside it, and keeping it only there (app/chat.tsx,
// components/import-flow.tsx, app/imported.tsx) (i18n/sh/index.ts).
export const importsHere: Record<string, string> = {
  'Keep only in the chat': 'Samo u razgovoru',
  'Now only in the chat with {name}. Its details there bring it back here.': 'Sada samo u razgovoru s kontaktom {name}. Njegovi detalji tamo ga vraćaju ovdje.',
  'One more is kept only in the chat it goes on in: its details there show it.': 'Još jedan je samo u razgovoru u kojem se nastavlja: tamo ga prikazuju njegovi detalji.',
  '{n} more are kept only in the chats they go on in: their details there show them.': 'Još {n} uvezeni razgovor je samo u razgovoru u kojem se nastavlja: tamo ga prikazuju njegovi detalji. | Još {n} uvezena razgovora su samo u razgovorima u kojima se nastavljaju: tamo ih prikazuju njihovi detalji. | Još {n} uvezenih razgovora je samo u razgovorima u kojima se nastavljaju: tamo ih prikazuju njihovi detalji.',
  'Import a chat here': 'Uvezi razgovor ovdje',
  'A chat exported from Telegram, WhatsApp or Viber, to read here ahead of the new messages, with its photos, videos and voice messages. It stays on this phone and is never sent.': 'Razgovor izvezen iz Telegrama, WhatsAppa ili Vibera, za čitanje ovdje prije novih poruka, sa svojim fotografijama, videima i glasovnim porukama. Ostaje na ovom telefonu i nikad se ne šalje.',
  'The file has {n} chats. Which one goes on here?': 'Datoteka ima {n} razgovora. Koji se nastavlja ovdje?',
  'Kept only in this chat.': 'Samo u ovom razgovoru.',
  'Also in Settings → Data and devices → Imported chats.': 'I u „Postavke → Podaci i uređaji → Uvezeni razgovori“.',
  'Show in Imported chats too': 'Prikaži i u „Uvezeni razgovori“',
  'It no longer shows in this chat. Settings → Data and devices → Imported chats keeps it.': 'Više se ne prikazuje u ovom razgovoru. Čuva ga „Postavke → Podaci i uređaji → Uvezeni razgovori“.',
  'Me': 'Ja',
};
