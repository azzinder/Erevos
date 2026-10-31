// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Greek of photos, files and voice messages in group chats (i18n/el/index.ts).
export const groups: Record<string, string> = {
  'A voice message did not come. {error}': 'Ένα φωνητικό μήνυμα δεν ήρθε. {error}',
  'A file goes as it is, up to 100 MB, with whatever it says inside. The relay keeps it, encrypted, 14 days, for each member to take.':
    'Ένα αρχείο πηγαίνει όπως είναι, έως 100 MB, με ό,τι γράφει μέσα του. Το relay το κρατά κρυπτογραφημένο 14 ημέρες, για να το πάρει κάθε μέλος.',
  'Tap to play': 'Πάτα για αναπαραγωγή',
  'Tap to open': 'Πάτα για άνοιγμα',
  // Who got and who read one of ours (components/group-messages.tsx, components/who-read.tsx); Who read it is in Matrix chats too.
  'Who read it': 'Ποιος το διάβασε',
  'Each member’s phone tells you, end-to-end encrypted. A member whose Erevos is older than these marks tells nothing, and stays under Not yet.':
    'Το τηλέφωνο κάθε μέλους σε ενημερώνει, κρυπτογραφημένα από άκρη σε άκρη. Ένα μέλος με παλιότερο Erevos από αυτά τα σημάδια δεν λέει τίποτα και μένει στο Όχι ακόμα.',
  'No one else was there when you sent it.': 'Δεν ήταν κανείς άλλος εκεί όταν το έστειλες.',
  'Read ✓✓✓': 'Διάβασαν ✓✓✓',
  'Reached their phone ✓✓': 'Έφτασε στο τηλέφωνό τους ✓✓',
  'Not yet': 'Όχι ακόμα',
};
