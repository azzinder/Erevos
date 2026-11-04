// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Portuguese of the dots that say messages came unread elsewhere (lib/unread-signs.ts): on the home
// screen, the switch of a hidden place (app/chat.tsx) and of a space's door (app/security.tsx) (i18n/pt/index.ts).
export const unreadSigns: Record<string, string> = {
  "Unread messages elsewhere":
    "Mensagens não lidas em outro lugar",
  "Dot in the other spaces":
    "Ponto nos outros espaços",
  "No dot":
    "Sem ponto",
  "When a message comes here while another space is open, a small dot shows on the padlock at the top of that space's chats, until you open this one: never how many, nor which space. Whoever sees those chats sees the dot too, and may guess there is another space.":
    "Quando chega uma mensagem aqui enquanto outro espaço está aberto, um pequeno ponto aparece no cadeado acima das conversas desse espaço, até você abrir este: nunca quantas, nem qual espaço. Quem vê essas conversas vê também o ponto, e pode suspeitar que há outro espaço.",
  "The other spaces show no sign of this one: only the notice says a message came.":
    "Os outros espaços não mostram nenhum sinal deste: só o aviso diz que chegou uma mensagem.",
  "Dot for unread messages":
    "Ponto para não lidas",
  "While one of these hidden chats has a message unread, a small dot shows on the magnifier of Search chats in this space: never how many, nor where. Whoever sees the space's chats sees it too, and may guess there are hidden chats.":
    "Enquanto uma destas conversas ocultas tiver uma mensagem não lida, um pequeno ponto aparece na lupa de Buscar conversas neste espaço: nunca quantas, nem onde. Quem vê as conversas do espaço também o vê, e pode suspeitar que há conversas ocultas.",
  "Messages unread here show only once you open these hidden chats.":
    "As mensagens não lidas aqui só aparecem quando você abre estas conversas ocultas.",
};
