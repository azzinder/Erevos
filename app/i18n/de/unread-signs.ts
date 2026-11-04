// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The German of the dots that say messages came unread elsewhere (lib/unread-signs.ts): on the home
// screen, the switch of a hidden place (app/chat.tsx) and of a space's door (app/security.tsx) (i18n/de/index.ts).
export const unreadSigns: Record<string, string> = {
  "Unread messages elsewhere":
    "Ungelesene Nachrichten anderswo",
  "Dot in the other spaces":
    "Punkt in den anderen Bereichen",
  "No dot":
    "Kein Punkt",
  "When a message comes here while another space is open, a small dot shows on the padlock at the top of that space's chats, until you open this one: never how many, nor which space. Whoever sees those chats sees the dot too, and may guess there is another space.":
    "Kommt hier eine Nachricht, während ein anderer Bereich offen ist, zeigt sich ein kleiner Punkt auf dem Schloss über den Chats jenes Bereichs, bis du diesen öffnest: nie wie viele, noch welcher Bereich. Wer jene Chats sieht, sieht auch den Punkt und kann vermuten, dass es einen weiteren Bereich gibt.",
  "The other spaces show no sign of this one: only the notice says a message came.":
    "Die anderen Bereiche zeigen kein Zeichen von diesem: nur die Mitteilung sagt, dass eine Nachricht kam.",
  "Dot for unread messages":
    "Punkt für Ungelesenes",
  "While one of these hidden chats has a message unread, a small dot shows on the magnifier of Search chats in this space: never how many, nor where. Whoever sees the space's chats sees it too, and may guess there are hidden chats.":
    "Solange einer dieser versteckten Chats eine ungelesene Nachricht hat, zeigt sich ein kleiner Punkt auf der Lupe von „Chats durchsuchen“ in diesem Bereich: nie wie viele, noch wo. Wer die Chats des Bereichs sieht, sieht ihn auch und kann vermuten, dass es versteckte Chats gibt.",
  "Messages unread here show only once you open these hidden chats.":
    "Ungelesenes hier zeigt sich erst, wenn du diese versteckten Chats öffnest.",
};
