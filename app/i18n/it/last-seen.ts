// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Italian of "last seen" (lib/last-seen.ts): the chat's header and details (app/chat.tsx), and its
// part of Settings → Privacy and security (app/security.tsx, lib/settings.ts) (i18n/it/index.ts).
export const lastSeen: Record<string, string> = {
  'last seen today at {time}': 'ultimo accesso oggi alle {time}',
  'last seen yesterday at {time}': 'ultimo accesso ieri alle {time}',
  'last seen {date} at {time}': 'ultimo accesso il {date} alle {time}',
  'Last seen': 'Ultimo accesso',
  'Who sees when you last had Erevos open: on, unless changed':
    'Chi vede quando hai avuto Erevos aperto l’ultima volta: attivo, a meno che tu non lo cambi',
  'Your contacts see the exact time you last had Erevos open, and you see theirs. It goes end-to-end encrypted to them only, never to the relay. In all chats of this space; hidden chats have their own switch.':
    'I tuoi contatti vedono l’ora esatta in cui hai avuto Erevos aperto l’ultima volta, e tu vedi la loro. Viene inviata crittografata end-to-end solo a loro, mai al relay. In tutte le chat di questo spazio; le chat nascoste hanno un interruttore proprio.',
  'Your contacts here see the exact time you last had these hidden chats open, and you see theirs. It goes end-to-end encrypted to them only, never to the relay. Only in these hidden chats, with a time of their own: the space’s chats have their own switch.':
    'I tuoi contatti qui vedono l’ora esatta in cui hai avuto aperte queste chat nascoste, e tu vedi la loro. Viene inviata crittografata end-to-end solo a loro, mai al relay. Solo in queste chat nascoste, con un’ora propria: le chat dello spazio hanno un interruttore proprio.',
  'No one here sees when you last had these hidden chats open, and you see no one’s here either. Those who saw it lose it with your next message.':
    'Nessuno qui vede quando hai avuto aperte queste chat nascoste, e tu non vedi quella di nessuno qui. Chi la vedeva la perde con il tuo messaggio successivo.',
  'No one sees when you last had Erevos open, and you see no one’s either. Those who saw it lose it with your next message.':
    'Nessuno vede quando hai avuto Erevos aperto l’ultima volta, e tu non vedi quella di nessuno. Chi la vedeva la perde con il tuo messaggio successivo.',
  'On: your contacts see the exact time you last had Erevos open, and you see theirs.':
    'Attivo: i tuoi contatti vedono l’ora esatta in cui hai avuto Erevos aperto l’ultima volta, e tu vedi la loro.',
  'Off: no one sees when you last had Erevos open, and you see no one’s either.':
    'Disattivato: nessuno vede quando hai avuto Erevos aperto l’ultima volta, e tu non vedi quella di nessuno.',
  'It goes end-to-end encrypted, inside what goes to your contacts anyway, never to the relay. Only for the chats of this space: hidden chats have their own switch, in a chat’s details there. Whether you are online now has its own switch in each chat: Appear offline.':
    'Viene inviata crittografata end-to-end, dentro quello che va comunque ai tuoi contatti, mai al relay. Solo per le chat di questo spazio: le chat nascoste hanno un interruttore proprio, nei dettagli di una chat di lì. Se sei online adesso ha un interruttore tutto suo in ogni chat: Mostrati offline.',
};
