// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Greek of the dots that say messages came unread elsewhere (lib/unread-signs.ts): on the home
// screen, the switch of a hidden place (app/chat.tsx) and of a space's door (app/security.tsx) (i18n/el/index.ts).
export const unreadSigns: Record<string, string> = {
  "Unread messages elsewhere":
    "Αδιάβαστα μηνύματα αλλού",
  "Dot in the other spaces":
    "Κουκκίδα στους άλλους χώρους",
  "No dot":
    "Χωρίς κουκκίδα",
  "When a message comes here while another space is open, a small dot shows on the padlock at the top of that space's chats, until you open this one: never how many, nor which space. Whoever sees those chats sees the dot too, and may guess there is another space.":
    "Όταν έρχεται μήνυμα εδώ ενώ είναι ανοιχτός άλλος χώρος, μια μικρή κουκκίδα φαίνεται στο λουκέτο πάνω από τις συνομιλίες εκείνου του χώρου, μέχρι να ανοίξεις αυτόν: ποτέ πόσα, ούτε ποιος χώρος. Όποιος βλέπει εκείνες τις συνομιλίες βλέπει και την κουκκίδα, και μπορεί να μαντέψει ότι υπάρχει κι άλλος χώρος.",
  "The other spaces show no sign of this one: only the notice says a message came.":
    "Οι άλλοι χώροι δεν δείχνουν κανένα σημάδι αυτού του χώρου: μόνο η ειδοποίηση λέει ότι ήρθε μήνυμα.",
  "Dot for unread messages":
    "Κουκκίδα για αδιάβαστα",
  "While one of these hidden chats has a message unread, a small dot shows on the magnifier of Search chats in this space: never how many, nor where. Whoever sees the space's chats sees it too, and may guess there are hidden chats.":
    "Όσο μία από αυτές τις κρυφές συνομιλίες έχει αδιάβαστο μήνυμα, μια μικρή κουκκίδα φαίνεται στον μεγεθυντικό φακό της Αναζήτησης συνομιλιών σε αυτόν τον χώρο: ποτέ πόσα, ούτε πού. Όποιος βλέπει τις συνομιλίες του χώρου τη βλέπει κι αυτός, και μπορεί να μαντέψει ότι υπάρχουν κρυφές συνομιλίες.",
  "Messages unread here show only once you open these hidden chats.":
    "Τα αδιάβαστα μηνύματα εδώ φαίνονται μόνο όταν ανοίξεις αυτές τις κρυφές συνομιλίες.",
};
