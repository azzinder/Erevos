// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// O português do número no ícone do Erevos (lib/icon-number.ts, a escolha em
// app/security.tsx, Configurações → Notificações) (i18n/pt/index.ts).
export const iconNumber: Record<string, string> = {
  'Number on the icon': 'Número no ícone',
  "How many messages are not read, on Erevos's icon": 'Quantas mensagens não foram lidas, no ícone do Erevos',
  'Show the number': 'Mostrar o número',
  'No number': 'Sem número',
  "Where the browser can show it (an iPhone's or iPad's home screen, a Mac's Dock, Chrome or Edge installed on a computer), Erevos's icon shows how many messages the space you had open has not read, and those that came since, never a hidden chat's. Only for a space with notifications while closed on. The number stays while Erevos is closed: one that does not match the space you open may hint at another. For every space on this device.":
    'Onde o navegador consegue mostrá-lo (na tela de início de um iPhone ou iPad, no Dock de um Mac, no Chrome ou no Edge instalado num computador), o ícone do Erevos mostra quantas mensagens o espaço que você tinha aberto não leu, e as que chegaram depois, nunca as de uma conversa oculta. Só para um espaço com as notificações com o app fechado ativadas. O número fica enquanto o Erevos está fechado: se não bater com o espaço que você abre, pode denunciar outro. Para cada espaço deste dispositivo.',
  "Erevos's icon shows no number.": 'O ícone do Erevos não mostra nenhum número.',
  // On Android, from the messages notice (lib/background.ts).
  "When you leave Erevos with messages not read in the open space's chats and groups, a notice without sound says how many, and counts on with those it tells of after, until you read them. Muted chats and hidden ones are not counted as you leave. The phone's launcher shows it on Erevos's icon: as a number, or on some phones, such as Pixels, as a dot. Only with Say a message came, under In the background. For every space on this phone.":
    "Quando você sai do Erevos com mensagens não lidas nas conversas e grupos do espaço aberto, uma notificação sem som diz quantas são, e conta também as que avisar depois, até você lê-las. As conversas em silêncio e as ocultas não contam quando você sai. O launcher do telefone a mostra no ícone do Erevos: como um número ou, em alguns telefones, como os Pixel, como um ponto. Só com Avisar quando chega mensagem, em Em segundo plano. Para cada espaço deste telefone.",
  "Erevos's icon keeps no number of its own: the launcher shows one only while the notice tells of messages that came since you last had Erevos open.":
    "O ícone do Erevos não guarda um número próprio: o launcher só mostra um enquanto a notificação avisar de mensagens que chegaram desde a última vez que você teve o Erevos aberto.",
  // The card that turns notifications on (components/integrity-card.tsx).
  "Where the browser can show it, Erevos's icon then also shows how many messages this space has not read, unless turned off under Number on the icon.":
    'Onde o navegador consegue mostrá-lo, o ícone do Erevos mostra então também quantas mensagens este espaço não leu, a não ser que você o desligue em Número no ícone.',
};
