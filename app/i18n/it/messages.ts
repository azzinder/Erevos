// The Italian of what a chat's messages can do beyond words: replies, reactions, links, forwarding and the like (i18n/it/index.ts).
export const messages: Record<string, string> = {
  'Open this link?': 'Aprire questo link?',
  // A message's menu (components/message-menu.tsx), replies and reactions.
  'Take back {emoji}': 'Rimuovi {emoji}',
  'React with {emoji}': 'Reagisci con {emoji}',
  'More reactions': 'Altre reazioni',
  'Goes to the message it answers': 'Va al messaggio a cui risponde',
  'The message is not on this phone.': 'Il messaggio non è su questo telefono.',
  'Reactions: {list}': 'Reazioni: {list}',
  'That message is not on this phone.': 'Quel messaggio non è su questo telefono.',
  'Copied. Any app that reads the clipboard can read it now.': 'Copiato. Ora qualsiasi app che legge gli appunti può leggerlo.',
  'Not copied.': 'Non copiato.',
  Reply: 'Rispondi',
  Copy: 'Copia',
  'Tap to play, hold for more': 'Tocca per riprodurre, tieni premuto per altre opzioni',
  'Tap to open, hold for more': 'Tocca per aprire, tieni premuto per altre opzioni',
  'Hold for more': 'Tieni premuto per altre opzioni',
  // Pinned messages (components/message-parts.tsx, Pinned).
  Pin: 'Fissa',
  Pinned: 'Fissato',
  'Pinned, {n} of {count}': 'Fissato, {n} di {count}',
  'Goes to the pinned message': 'Va al messaggio fissato',
  // Starred messages (app/starred.tsx, and a chat's details).
  Star: 'Importante',
  Unstar: 'Non importante',
  'Starred messages': 'Messaggi importanti',
  'The messages you starred, in all your chats': 'I messaggi che hai segnato come importanti, in tutte le tue chat',
  'No starred messages. Press and hold a message in a chat, then tap Star.':
    'Nessun messaggio importante. Tieni premuto un messaggio in una chat, poi tocca «Importante».',
  'You to {name}': 'Tu a {name}',
  // Stickers (lib/stickers.ts, components/stickers.tsx).
  'Send a sticker': 'Invia uno sticker',
  'Sticker: {name}': 'Sticker: {name}',
  'Smiling moon': 'Luna sorridente',
  'Laughing moon': 'Luna che ride',
  'Moon in love': 'Luna innamorata',
  'Winking moon': 'Luna che fa l’occhiolino',
  'Surprised moon': 'Luna sorpresa',
  'Sad moon': 'Luna triste',
  'Angry moon': 'Luna arrabbiata',
  'Sleeping moon': 'Luna che dorme',
  Heart: 'Cuore',
  Sunshine: 'Sole',
  Coffee: 'Caffè',
  'All good': 'Tutto bene',
  // A place sent once (lib/place.ts, components/message-parts.tsx).
  Location: 'Posizione',
  'Finding where you are…': 'Ricerca della tua posizione…',
  'Send where you are?': 'Inviare la tua posizione?',
  'Within about {m} m': 'Precisione di circa {m} m',
  '{name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    '{name} riceve questa posizione una sola volta, crittografata end-to-end. Erevos non segue dove vai dopo.',
  'Open in maps': 'Apri nelle mappe',
  'Open in maps?': 'Aprire nelle mappe?',
  'Your maps app opens at this place. It may load its map from the internet, as it does.':
    'La tua app di mappe si apre su questa posizione. Potrebbe caricare la mappa da internet, come fa sempre.',
  'This build of Erevos cannot send a place.': 'Questa versione di Erevos non può inviare una posizione.',
  "Erevos may not use the phone's location. Allow it in the phone settings to send where you are.":
    'Erevos non ha il permesso di usare la posizione del telefono. Consentilo nelle impostazioni del telefono per inviare la tua posizione.',
  "The phone's location is off. Turn it on to send where you are.": 'La posizione del telefono è disattivata. Attivala per inviare dove ti trovi.',
  'Where you are was not found in time. Try again outdoors, or in a while.':
    'Non è stato possibile trovare in tempo la tua posizione. Riprova all’aperto, o tra un po’.',
  // Polls (components/poll.tsx).
  Poll: 'Sondaggio',
  'Poll: {question}': 'Sondaggio: {question}',
  'Poll · choose one': 'Sondaggio · scegline una',
  'Poll · choose one or more': 'Sondaggio · scegline una o più',
  'New poll': 'Nuovo sondaggio',
  Question: 'Domanda',
  'Ask something': 'Chiedi qualcosa',
  Options: 'Opzioni',
  'Option {n}': 'Opzione {n}',
  'Add an option': 'Aggiungi un’opzione',
  'More than one answer': 'Più di una risposta',
  // Typing, under a contact's name in their chat.
  'typing…': 'sta scrivendo…',
  // Searching the messages, in a chat and on the home screen (lib/message-search.ts).
  'Search in this chat': 'Cerca in questa chat',
  '{n} of {count}': '{n} di {count}',
  Earlier: 'Precedente',
  Later: 'Successivo',
  // Forwarding a message to another chat (lib/forward.ts).
  'Forward to': 'Inoltra a',
  Forwarded: 'Inoltrato',
  'Forwarding…': 'Inoltro in corso…',
  '{name} (group)': '{name} (gruppo)',
  'It goes as a copy, sent anew and end-to-end encrypted, marked as forwarded but not from where.':
    'Parte come copia, inviata da capo e crittografata end-to-end, segnata come inoltrata ma senza dire da dove.',
  // Writing a chat out as text (lib/chat-export.ts).
  'Export chat': 'Esporta chat',
  'Export this chat?': 'Esportare questa chat?',
  Export: 'Esporta',
  'Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.':
    'I suoi messaggi vengono scritti in un file di testo, con l’ora e chi li ha scritti, salvato dove scegli. Il file non è crittografato: chiunque lo abbia, o qualsiasi app che legge dove si trova, può leggere la chat. Foto, file e messaggi vocali sono solo nominati, e i messaggi effimeri restano fuori.',
  'Chat with {name}, written out of Erevos': 'Chat con {name}, esportata da Erevos',
  'Written out {when}. This file is not encrypted: anyone who has it can read it.':
    'Esportata il {when}. Questo file non è crittografato: chiunque lo abbia può leggerlo.',
  'Photo: {name}': 'Foto: {name}',
  forwarded: 'inoltrato',
  'answering “{line}”': 'in risposta a «{line}»',
  // Link previews, made by the sender's phone (lib/make-preview.ts).
  'Link previews': 'Anteprime dei link',
  'Making the link’s preview…': 'Creazione dell’anteprima del link…',
  'None while this space goes through Tor: Erevos sends only relay requests through it.':
    'Nessuna mentre questo spazio passa da Tor: tramite Tor, Erevos invia solo le richieste al relay.',
  "When you send a link, this phone fetches its page straight from the site and sends its title, a line and a small picture inside the message. The site sees this phone's internet address. In all chats of this space, not in hidden chats.":
    'Quando invii un link, questo telefono scarica la sua pagina direttamente dal sito e invia il titolo, una riga e una piccola immagine dentro il messaggio. Il sito vede l’indirizzo internet di questo telefono. In tutte le chat di questo spazio, non nelle chat nascoste.',
  "Links go as they are. Turned on, this phone fetches a link's page as you send it, and the site sees this phone's internet address. The phone that gets it fetches nothing.":
    'I link partono così come sono. Se lo attivi, questo telefono scarica la pagina di un link quando lo invii, e il sito vede l’indirizzo internet di questo telefono. Il telefono che lo riceve non scarica nulla.',
  // A group's messages (components/group-messages.tsx).
  Everyone: 'Per tutti',
  'Everyone in {name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    'Tutti in {name} ricevono questa posizione una sola volta, crittografata end-to-end. Erevos non segue dove vai dopo.',
  'You in {name}': 'Tu in {name}',
  'It went without the link’s preview, which is too much for LoRa.': 'È partito senza l’anteprima del link, troppo grande per LoRa.',
};
