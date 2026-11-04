// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Italian of the dots that say messages came unread elsewhere (lib/unread-signs.ts): on the home
// screen, the switch of a hidden place (app/chat.tsx) and of a space's door (app/security.tsx) (i18n/it/index.ts).
export const unreadSigns: Record<string, string> = {
  "Unread messages elsewhere":
    "Messaggi non letti altrove",
  "Dot in the other spaces":
    "Punto negli altri spazi",
  "No dot":
    "Nessun punto",
  "When a message comes here while another space is open, a small dot shows on the padlock at the top of that space's chats, until you open this one: never how many, nor which space. Whoever sees those chats sees the dot too, and may guess there is another space.":
    "Quando arriva qui un messaggio mentre è aperto un altro spazio, un piccolo punto compare sul lucchetto sopra le chat di quello spazio, finché non apri questo: mai quanti, né quale spazio. Chi vede quelle chat vede anche il punto, e può intuire che c’è un altro spazio.",
  "The other spaces show no sign of this one: only the notice says a message came.":
    "Gli altri spazi non mostrano alcun segno di questo: solo la notifica dice che è arrivato un messaggio.",
  "Dot for unread messages":
    "Punto per i non letti",
  "While one of these hidden chats has a message unread, a small dot shows on the magnifier of Search chats in this space: never how many, nor where. Whoever sees the space's chats sees it too, and may guess there are hidden chats.":
    "Finché una di queste chat nascoste ha un messaggio non letto, un piccolo punto compare sulla lente di Cerca nelle chat in questo spazio: mai quanti, né dove. Chi vede le chat dello spazio lo vede anche lui, e può intuire che ci sono chat nascoste.",
  "Messages unread here show only once you open these hidden chats.":
    "I messaggi non letti qui si vedono solo quando apri queste chat nascoste.",
};
