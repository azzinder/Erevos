// The Spanish of what a chat's messages can do beyond words: replies, reactions, links, forwarding and the like (i18n/es/index.ts).
export const messages: Record<string, string> = {
  'Open this link?': '¿Abrir este enlace?',
  // A message's menu (components/message-menu.tsx), replies and reactions.
  'Take back {emoji}': 'Quitar {emoji}',
  'React with {emoji}': 'Reaccionar con {emoji}',
  'More reactions': 'Más reacciones',
  'Goes to the message it answers': 'Va al mensaje al que responde',
  'The message is not on this phone.': 'El mensaje no está en este teléfono.',
  'Reactions: {list}': 'Reacciones: {list}',
  'That message is not on this phone.': 'Ese mensaje no está en este teléfono.',
  'Copied. Any app that reads the clipboard can read it now.': 'Copiado. Ahora cualquier app que lea el portapapeles puede leerlo.',
  'Not copied.': 'No copiado.',
  Reply: 'Responder',
  Copy: 'Copiar',
  'Tap to play, hold for more': 'Toca para reproducir, mantén pulsado para ver más',
  'Tap to open, hold for more': 'Toca para abrir, mantén pulsado para ver más',
  'Hold for more': 'Mantén pulsado para ver más',
  // Pinned messages (components/message-parts.tsx, Pinned).
  Pin: 'Fijar',
  Pinned: 'Fijado',
  'Pinned, {n} of {count}': 'Fijado, {n} de {count}',
  'Goes to the pinned message': 'Va al mensaje fijado',
  // Starred messages (app/starred.tsx, and a chat's details).
  Star: 'Destacar',
  Unstar: 'No destacar',
  'Starred messages': 'Mensajes destacados',
  'The messages you starred, in all your chats': 'Los mensajes que has destacado, en todos tus chats',
  'No starred messages. Press and hold a message in a chat, then tap Star.':
    'No hay mensajes destacados. Mantén pulsado un mensaje en un chat y toca «Destacar».',
  'You to {name}': 'Tú a {name}',
  // Stickers (lib/stickers.ts, components/stickers.tsx).
  'Send a sticker': 'Enviar un sticker',
  'Sticker: {name}': 'Sticker: {name}',
  'Smiling moon': 'Luna sonriente',
  'Laughing moon': 'Luna riéndose',
  'Moon in love': 'Luna enamorada',
  'Winking moon': 'Luna guiñando un ojo',
  'Surprised moon': 'Luna sorprendida',
  'Sad moon': 'Luna triste',
  'Angry moon': 'Luna enfadada',
  'Sleeping moon': 'Luna dormida',
  Heart: 'Corazón',
  Sunshine: 'Sol',
  Coffee: 'Café',
  'All good': 'Todo bien',
  // A place sent once (lib/place.ts, components/message-parts.tsx).
  Location: 'Ubicación',
  'Finding where you are…': 'Buscando dónde estás…',
  'Send where you are?': '¿Enviar dónde estás?',
  'Within about {m} m': 'Con una precisión de unos {m} m',
  '{name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    '{name} recibe esta ubicación una sola vez, cifrada de extremo a extremo. Erevos no sigue adónde vas después.',
  'Open in maps': 'Abrir en mapas',
  'Open in maps?': '¿Abrir en mapas?',
  'Your maps app opens at this place. It may load its map from the internet, as it does.':
    'Tu app de mapas se abre en esta ubicación. Puede que cargue su mapa desde internet, como hace siempre.',
  'This build of Erevos cannot send a place.': 'Esta versión de Erevos no puede enviar una ubicación.',
  "Erevos may not use the phone's location. Allow it in the phone settings to send where you are.":
    'Erevos no tiene permiso para usar la ubicación del teléfono. Permítelo en los ajustes del teléfono para enviar dónde estás.',
  "The phone's location is off. Turn it on to send where you are.": 'La ubicación del teléfono está desactivada. Actívala para enviar dónde estás.',
  'Where you are was not found in time. Try again outdoors, or in a while.':
    'No se ha encontrado a tiempo dónde estás. Vuelve a intentarlo al aire libre, o dentro de un rato.',
  // Polls (components/poll.tsx).
  Poll: 'Encuesta',
  'Poll: {question}': 'Encuesta: {question}',
  'Poll · choose one': 'Encuesta · elige una',
  'Poll · choose one or more': 'Encuesta · elige una o más',
  'New poll': 'Encuesta nueva',
  Question: 'Pregunta',
  'Ask something': 'Pregunta algo',
  Options: 'Opciones',
  'Option {n}': 'Opción {n}',
  'Add an option': 'Añadir una opción',
  'More than one answer': 'Más de una respuesta',
  // Typing, under a contact's name in their chat.
  'typing…': 'escribiendo…',
  // Searching the messages, in a chat and on the home screen (lib/message-search.ts).
  'Search in this chat': 'Buscar en este chat',
  '{n} of {count}': '{n} de {count}',
  Earlier: 'Anterior',
  Later: 'Posterior',
  // Forwarding a message to another chat (lib/forward.ts).
  'Forward to': 'Reenviar a',
  Forwarded: 'Reenviado',
  'Forwarding…': 'Reenviando…',
  '{name} (group)': '{name} (grupo)',
  'It goes as a copy, sent anew and end-to-end encrypted, marked as forwarded but not from where.':
    'Se envía como copia, de nuevo y cifrada de extremo a extremo, marcada como reenviada pero sin decir de dónde.',
  // Writing a chat out as text (lib/chat-export.ts).
  'Export chat': 'Exportar chat',
  'Export this chat?': '¿Exportar este chat?',
  Export: 'Exportar',
  'Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.':
    'Sus mensajes se escriben en un archivo de texto, con su hora y quién los escribió, y se guarda donde elijas. El archivo no está cifrado: cualquiera que lo tenga, o cualquier app que lea donde está, puede leer el chat. Las fotos, los archivos y los mensajes de voz solo se nombran, y los mensajes temporales se quedan fuera.',
  'Chat with {name}, written out of Erevos': 'Chat con {name}, exportado de Erevos',
  'Written out {when}. This file is not encrypted: anyone who has it can read it.':
    'Exportado el {when}. Este archivo no está cifrado: cualquiera que lo tenga puede leerlo.',
  'Photo: {name}': 'Foto: {name}',
  forwarded: 'reenviado',
  'answering “{line}”': 'en respuesta a «{line}»',
  // Link previews, made by the sender's phone (lib/make-preview.ts).
  'Link previews': 'Vistas previas de enlaces',
  'Making the link’s preview…': 'Creando la vista previa del enlace…',
  'None while this space goes through Tor: Erevos sends only relay requests through it.':
    'Ninguna mientras este espacio va por Tor: Erevos solo envía por Tor las peticiones al relay.',
  "When you send a link, this phone fetches its page straight from the site and sends its title, a line and a small picture inside the message. The site sees this phone's internet address. In all chats of this space, not in hidden chats.":
    'Cuando envías un enlace, este teléfono descarga su página directamente del sitio y envía su título, una línea y una pequeña imagen dentro del mensaje. El sitio ve la dirección de internet de este teléfono. En todos los chats de este espacio, no en los chats ocultos.',
  "Links go as they are. Turned on, this phone fetches a link's page as you send it, and the site sees this phone's internet address. The phone that gets it fetches nothing.":
    'Los enlaces se envían tal cual. Si lo activas, este teléfono descarga la página de un enlace al enviarlo, y el sitio ve la dirección de internet de este teléfono. El teléfono que lo recibe no descarga nada.',
  // A group's messages (components/group-messages.tsx).
  Everyone: 'Para todos',
  'Everyone in {name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    'Todos en {name} reciben esta ubicación una sola vez, cifrada de extremo a extremo. Erevos no sigue adónde vas después.',
  'You in {name}': 'Tú en {name}',
  'It went without the link’s preview, which is too much for LoRa.': 'Se ha enviado sin la vista previa del enlace, que es demasiado para LoRa.',
};
