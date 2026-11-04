// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Spanish of the dots that say messages came unread elsewhere (lib/unread-signs.ts): on the home
// screen, the switch of a hidden place (app/chat.tsx) and of a space's door (app/security.tsx) (i18n/es/index.ts).
export const unreadSigns: Record<string, string> = {
  "Unread messages elsewhere":
    "Mensajes sin leer en otra parte",
  "Dot in the other spaces":
    "Punto en los otros espacios",
  "No dot":
    "Sin punto",
  "When a message comes here while another space is open, a small dot shows on the padlock at the top of that space's chats, until you open this one: never how many, nor which space. Whoever sees those chats sees the dot too, and may guess there is another space.":
    "Cuando llega un mensaje aquí mientras otro espacio está abierto, un pequeño punto aparece en el candado sobre los chats de ese espacio, hasta que abras este: nunca cuántos, ni qué espacio. Quien vea esos chats ve también el punto, y puede sospechar que hay otro espacio.",
  "The other spaces show no sign of this one: only the notice says a message came.":
    "Los otros espacios no muestran ninguna señal de este: solo el aviso dice que llegó un mensaje.",
  "Dot for unread messages":
    "Punto para lo no leído",
  "While one of these hidden chats has a message unread, a small dot shows on the magnifier of Search chats in this space: never how many, nor where. Whoever sees the space's chats sees it too, and may guess there are hidden chats.":
    "Mientras uno de estos chats ocultos tenga un mensaje sin leer, un pequeño punto aparece en la lupa de Buscar chats en este espacio: nunca cuántos, ni dónde. Quien vea los chats del espacio también lo ve, y puede sospechar que hay chats ocultos.",
  "Messages unread here show only once you open these hidden chats.":
    "Los mensajes sin leer aquí solo se ven cuando abres estos chats ocultos.",
};
