// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The French of the dots that say messages came unread elsewhere (lib/unread-signs.ts): on the home
// screen, the switch of a hidden place (app/chat.tsx) and of a space's door (app/security.tsx) (i18n/fr/index.ts).
export const unreadSigns: Record<string, string> = {
  "Unread messages elsewhere":
    "Messages non lus ailleurs",
  "Dot in the other spaces":
    "Point dans les autres espaces",
  "No dot":
    "Pas de point",
  "When a message comes here while another space is open, a small dot shows on the padlock at the top of that space's chats, until you open this one: never how many, nor which space. Whoever sees those chats sees the dot too, and may guess there is another space.":
    "Quand un message arrive ici pendant qu'un autre espace est ouvert, un petit point s'affiche sur le cadenas au-dessus des discussions de cet espace, jusqu'à ce que tu ouvres celui-ci : jamais combien, ni quel espace. Qui voit ces discussions voit aussi le point, et peut deviner qu'il existe un autre espace.",
  "The other spaces show no sign of this one: only the notice says a message came.":
    "Les autres espaces ne montrent aucun signe de celui-ci : seule la notification dit qu'un message est arrivé.",
  "Dot for unread messages":
    "Point pour les non-lus",
  "While one of these hidden chats has a message unread, a small dot shows on the magnifier of Search chats in this space: never how many, nor where. Whoever sees the space's chats sees it too, and may guess there are hidden chats.":
    "Tant qu'une de ces discussions masquées a un message non lu, un petit point s'affiche sur la loupe de Rechercher dans les discussions dans cet espace : jamais combien, ni où. Qui voit les discussions de l'espace le voit aussi, et peut deviner qu'il y a des discussions masquées.",
  "Messages unread here show only once you open these hidden chats.":
    "Les messages non lus ici ne se voient qu'une fois ces discussions masquées ouvertes.",
};
