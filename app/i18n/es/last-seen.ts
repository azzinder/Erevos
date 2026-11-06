// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Spanish of "last seen" (lib/last-seen.ts): the chat's header and details (app/chat.tsx), and its
// part of Settings → Privacy and security (app/security.tsx, lib/settings.ts) (i18n/es/index.ts).
export const lastSeen: Record<string, string> = {
  'last seen today at {time}': 'última vez hoy a las {time}',
  'last seen yesterday at {time}': 'última vez ayer a las {time}',
  'last seen {date} at {time}': 'última vez el {date} a las {time}',
  'Last seen': 'Última vez',
  'Who sees when you last had Erevos open: on, unless changed':
    'Quién ve cuándo tuviste Erevos abierto por última vez: activado, salvo que lo cambies',
  'Your contacts see the exact time you last had Erevos open, and you see theirs. It goes end-to-end encrypted to them only, never to the relay. In all chats of this space; hidden chats have their own switch.':
    'Tus contactos ven la hora exacta en que tuviste Erevos abierto por última vez, y tú ves la suya. Va cifrada de extremo a extremo solo a ellos, nunca al relay. En todos los chats de este espacio; los chats ocultos tienen su propio interruptor.',
  'Your contacts here see the exact time you last had these hidden chats open, and you see theirs. It goes end-to-end encrypted to them only, never to the relay. Only in these hidden chats, with a time of their own: the space’s chats have their own switch.':
    'Tus contactos de aquí ven la hora exacta en que tuviste estos chats ocultos abiertos, y tú ves la suya. Va cifrada de extremo a extremo solo a ellos, nunca al relay. Solo en estos chats ocultos, con una hora propia: los chats del espacio tienen su propio interruptor.',
  'No one here sees when you last had these hidden chats open, and you see no one’s here either. Those who saw it lose it with your next message.':
    'Nadie de aquí ve cuándo tuviste estos chats ocultos abiertos, y tú tampoco ves la de nadie de aquí. Quienes la veían la pierden con tu siguiente mensaje.',
  'No one sees when you last had Erevos open, and you see no one’s either. Those who saw it lose it with your next message.':
    'Nadie ve cuándo tuviste Erevos abierto por última vez, y tú tampoco ves la de nadie. Quienes la veían la pierden con tu siguiente mensaje.',
  'On: your contacts see the exact time you last had Erevos open, and you see theirs.':
    'Activado: tus contactos ven la hora exacta en que tuviste Erevos abierto por última vez, y tú ves la suya.',
  'Off: no one sees when you last had Erevos open, and you see no one’s either.':
    'Desactivado: nadie ve cuándo tuviste Erevos abierto por última vez, y tú tampoco ves la de nadie.',
  'It goes end-to-end encrypted, inside what goes to your contacts anyway, never to the relay. Only for the chats of this space: hidden chats have their own switch, in a chat’s details there. Whether you are online now has its own switch in each chat: Appear offline.':
    'Va cifrada de extremo a extremo, dentro de lo que ya va a tus contactos de todos modos, nunca al relay. Solo para los chats de este espacio: los chats ocultos tienen su propio interruptor, en los detalles de un chat de allí. Si estás en línea ahora tiene su propio interruptor en cada chat: Aparecer sin conexión.',
};
