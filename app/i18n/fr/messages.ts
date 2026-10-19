// The French of what a chat's messages can do beyond words: replies, reactions, links, forwarding and the like (i18n/fr/index.ts).
export const messages: Record<string, string> = {
  'Open this link?': 'Ouvrir ce lien ?',
  // A message's menu (components/message-menu.tsx), replies and reactions.
  'Take back {emoji}': 'Retirer {emoji}',
  'React with {emoji}': 'Réagir avec {emoji}',
  'More reactions': 'Plus de réactions',
  'Goes to the message it answers': 'Va au message auquel il répond',
  'The message is not on this phone.': 'Le message n’est pas sur ce téléphone.',
  'Reactions: {list}': 'Réactions : {list}',
  'That message is not on this phone.': 'Ce message n’est pas sur ce téléphone.',
  'Copied. Any app that reads the clipboard can read it now.': 'Copié. Toute app qui lit le presse-papiers peut maintenant le lire.',
  'Not copied.': 'Non copié.',
  Reply: 'Répondre',
  Copy: 'Copier',
  'Tap to play, hold for more': 'Appuie pour lire, appui long pour plus d’options',
  'Tap to open, hold for more': 'Appuie pour ouvrir, appui long pour plus d’options',
  'Hold for more': 'Appui long pour plus d’options',
  // Pinned messages (components/message-parts.tsx, Pinned).
  Pin: 'Épingler',
  Pinned: 'Épinglé',
  'Pinned, {n} of {count}': 'Épinglé, {n} sur {count}',
  'Goes to the pinned message': 'Va au message épinglé',
  // Starred messages (app/starred.tsx, and a chat's details).
  Star: 'Ajouter une étoile',
  Unstar: 'Retirer l’étoile',
  'Starred messages': 'Messages avec étoile',
  'The messages you starred, in all your chats': 'Les messages auxquels tu as ajouté une étoile, dans toutes tes discussions',
  'No starred messages. Press and hold a message in a chat, then tap Star.':
    'Aucun message avec étoile. Appuie longuement sur un message dans une discussion, puis sur « Ajouter une étoile ».',
  'You to {name}': 'De toi à {name}',
  // Stickers (lib/stickers.ts, components/stickers.tsx).
  'Send a sticker': 'Envoyer un sticker',
  'Sticker: {name}': 'Sticker : {name}',
  'Smiling moon': 'Lune souriante',
  'Laughing moon': 'Lune qui rit',
  'Moon in love': 'Lune amoureuse',
  'Winking moon': 'Lune qui fait un clin d’œil',
  'Surprised moon': 'Lune surprise',
  'Sad moon': 'Lune triste',
  'Angry moon': 'Lune en colère',
  'Sleeping moon': 'Lune endormie',
  Heart: 'Cœur',
  Sunshine: 'Soleil',
  Coffee: 'Café',
  'All good': 'Tout va bien',
  // A place sent once (lib/place.ts, components/message-parts.tsx).
  Location: 'Position',
  'Finding where you are…': 'Recherche de ta position…',
  'Send where you are?': 'Envoyer ta position ?',
  'Within about {m} m': 'À environ {m} m près',
  '{name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    '{name} reçoit cette position une seule fois, chiffrée de bout en bout. Erevos ne suit pas où tu vas ensuite.',
  'Open in maps': 'Ouvrir la carte',
  'Open in maps?': 'Ouvrir la carte ?',
  'Your maps app opens at this place. It may load its map from the internet, as it does.':
    'Ton app de cartes s’ouvre à cet endroit. Elle peut charger sa carte depuis internet, comme d’habitude.',
  'This build of Erevos cannot send a place.': 'Cette version d’Erevos ne peut pas envoyer de position.',
  "Erevos may not use the phone's location. Allow it in the phone settings to send where you are.":
    'Erevos n’a pas accès à la position du téléphone. Autorise-le dans les paramètres du téléphone pour envoyer ta position.',
  "The phone's location is off. Turn it on to send where you are.": 'La localisation du téléphone est désactivée. Active-la pour envoyer ta position.',
  'Where you are was not found in time. Try again outdoors, or in a while.':
    'Ta position n’a pas été trouvée à temps. Réessaie à l’extérieur, ou dans un moment.',
  // Polls (components/poll.tsx).
  Poll: 'Sondage',
  'Poll: {question}': 'Sondage : {question}',
  'Poll · choose one': 'Sondage · choisis une réponse',
  'Poll · choose one or more': 'Sondage · choisis une ou plusieurs réponses',
  'New poll': 'Nouveau sondage',
  Question: 'Question',
  'Ask something': 'Pose une question',
  Options: 'Options',
  'Option {n}': 'Option {n}',
  'Add an option': 'Ajouter une option',
  'More than one answer': 'Plusieurs réponses possibles',
  // Typing, under a contact's name in their chat.
  'typing…': 'écrit…',
  // Searching the messages, in a chat and on the home screen (lib/message-search.ts).
  'Search in this chat': 'Rechercher dans cette discussion',
  '{n} of {count}': '{n} sur {count}',
  Earlier: 'Plus ancien',
  Later: 'Plus récent',
  // Forwarding a message to another chat (lib/forward.ts).
  'Forward to': 'Transférer à',
  Forwarded: 'Transféré',
  'Forwarding…': 'Transfert…',
  '{name} (group)': '{name} (groupe)',
  'It goes as a copy, sent anew and end-to-end encrypted, marked as forwarded but not from where.':
    'Il part en copie, envoyé à nouveau et chiffré de bout en bout, marqué comme transféré mais sans dire d’où.',
  // Writing a chat out as text (lib/chat-export.ts).
  'Export chat': 'Exporter la discussion',
  'Export this chat?': 'Exporter cette discussion ?',
  Export: 'Exporter',
  'Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.':
    'Ses messages sont écrits dans un fichier texte, avec leur heure et qui les a écrits, enregistré là où tu choisis. Le fichier n’est pas chiffré : toute personne qui l’a, ou toute app qui lit l’endroit où il se trouve, peut lire la discussion. Les photos, fichiers et messages vocaux sont seulement mentionnés, et les messages éphémères sont laissés de côté.',
  'Chat with {name}, written out of Erevos': 'Discussion avec {name}, exportée d’Erevos',
  'Written out {when}. This file is not encrypted: anyone who has it can read it.':
    'Exportée le {when}. Ce fichier n’est pas chiffré : toute personne qui l’a peut le lire.',
  'Photo: {name}': 'Photo : {name}',
  forwarded: 'transféré',
  'answering “{line}”': 'en réponse à « {line} »',
  // Link previews, made by the sender's phone (lib/make-preview.ts).
  'Link previews': 'Aperçus des liens',
  'Making the link’s preview…': 'Création de l’aperçu du lien…',
  'None while this space goes through Tor: Erevos sends only relay requests through it.':
    'Aucun tant que cet espace passe par Tor : Erevos n’y fait passer que les requêtes vers le relais.',
  "When you send a link, this phone fetches its page straight from the site and sends its title, a line and a small picture inside the message. The site sees this phone's internet address. In all chats of this space, not in hidden chats.":
    'Quand tu envoies un lien, ce téléphone récupère sa page directement sur le site et envoie son titre, une ligne et une petite image dans le message. Le site voit l’adresse internet de ce téléphone. Dans toutes les discussions de cet espace, pas dans les discussions masquées.',
  "Links go as they are. Turned on, this phone fetches a link's page as you send it, and the site sees this phone's internet address. The phone that gets it fetches nothing.":
    'Les liens partent tels quels. Si tu l’actives, ce téléphone récupère la page d’un lien quand tu l’envoies, et le site voit l’adresse internet de ce téléphone. Le téléphone qui le reçoit ne récupère rien.',
  // A group's messages (components/group-messages.tsx).
  Everyone: 'Pour tout le monde',
  'Everyone in {name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    'Tout le monde dans {name} reçoit cette position une seule fois, chiffrée de bout en bout. Erevos ne suit pas où tu vas ensuite.',
  'You in {name}': 'De toi dans {name}',
  'It went without the link’s preview, which is too much for LoRa.': 'Il est parti sans l’aperçu du lien, trop lourd pour LoRa.',
};
