// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Italian of photos, files and voice messages in group chats (i18n/it/index.ts).
export const groups: Record<string, string> = {
  'A voice message did not come. {error}': 'Un messaggio vocale non è arrivato. {error}',
  'A file goes as it is, up to 100 MB, with whatever it says inside. The relay keeps it, encrypted, 14 days, for each member to take.':
    'Un file parte così com’è, fino a 100 MB, con tutto quello che contiene. Il relay lo conserva, crittografato, per 14 giorni, perché ogni membro possa ritirarlo.',
  'Tap to play': 'Tocca per riprodurre',
  'Tap to open': 'Tocca per aprire',
  // Who got and who read one of ours (components/group-messages.tsx, components/who-read.tsx); Who read it is in Matrix chats too.
  'Who read it': 'Chi l’ha letto',
  'Each member’s phone tells you, end-to-end encrypted. A member whose Erevos is older than these marks tells nothing, and stays under Not yet.':
    'Il telefono di ogni membro te lo dice, con crittografia end-to-end. Un membro il cui Erevos è più vecchio di questi segni non dice nulla, e resta sotto Non ancora.',
  'No one else was there when you sent it.': 'Non c’era nessun altro quando l’hai inviato.',
  'Read ✓✓✓': 'Hanno letto ✓✓✓',
  'Reached their phone ✓✓': 'Arrivato al loro telefono ✓✓',
  'Not yet': 'Non ancora',
};
