// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Serbo-Croatian of the dots that say messages came unread elsewhere (lib/unread-signs.ts): on the home
// screen, the switch of a hidden place (app/chat.tsx) and of a space's door (app/security.tsx) (i18n/sh/index.ts).
export const unreadSigns: Record<string, string> = {
  "Unread messages elsewhere":
    "Nepročitane poruke na drugom mjestu",
  "Dot in the other spaces":
    "Tačka u drugim prostorima",
  "No dot":
    "Bez tačke",
  "When a message comes here while another space is open, a small dot shows on the padlock at the top of that space's chats, until you open this one: never how many, nor which space. Whoever sees those chats sees the dot too, and may guess there is another space.":
    "Kad ovdje stigne poruka dok je otvoren drugi prostor, mala tačka se pojavi na lokotu iznad razgovora tog prostora, dok ne otvorite ovaj: nikad koliko, ni koji prostor. Ko vidi te razgovore vidi i tačku, i može pretpostaviti da postoji još jedan prostor.",
  "The other spaces show no sign of this one: only the notice says a message came.":
    "Drugi prostori ne pokazuju nikakav znak ovog: samo obavijest kaže da je stigla poruka.",
  "Dot for unread messages":
    "Tačka za nepročitano",
  "While one of these hidden chats has a message unread, a small dot shows on the magnifier of Search chats in this space: never how many, nor where. Whoever sees the space's chats sees it too, and may guess there are hidden chats.":
    "Dok jedan od ovih skrivenih razgovora ima nepročitanu poruku, mala tačka se pojavi na lupi u Traži razgovore u ovom prostoru: nikad koliko, ni gdje. Ko vidi razgovore prostora vidi i nju, i može pretpostaviti da postoje skriveni razgovori.",
  "Messages unread here show only once you open these hidden chats.":
    "Nepročitane poruke ovdje vide se tek kad otvorite ove skrivene razgovore.",
};
