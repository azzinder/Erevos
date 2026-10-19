// The German of what a chat's messages can do beyond words: replies, reactions, links, forwarding and the like (i18n/de/index.ts).
export const messages: Record<string, string> = {
  'Open this link?': 'Diesen Link öffnen?',
  // A message's menu (components/message-menu.tsx), replies and reactions.
  'Take back {emoji}': '{emoji} zurücknehmen',
  'React with {emoji}': 'Mit {emoji} reagieren',
  'More reactions': 'Weitere Reaktionen',
  'Goes to the message it answers': 'Springt zur Nachricht, auf die sie antwortet',
  'The message is not on this phone.': 'Die Nachricht ist nicht auf diesem Telefon.',
  'Reactions: {list}': 'Reaktionen: {list}',
  'That message is not on this phone.': 'Diese Nachricht ist nicht auf diesem Telefon.',
  'Copied. Any app that reads the clipboard can read it now.': 'Kopiert. Jede App, die die Zwischenablage liest, kann es jetzt lesen.',
  'Not copied.': 'Nicht kopiert.',
  Reply: 'Antworten',
  Copy: 'Kopieren',
  'Tap to play, hold for more': 'Tippen zum Abspielen, halten für mehr',
  'Tap to open, hold for more': 'Tippen zum Öffnen, halten für mehr',
  'Hold for more': 'Halten für mehr',
  // Pinned messages (components/message-parts.tsx, Pinned).
  Pin: 'Anheften',
  Pinned: 'Angeheftet',
  'Pinned, {n} of {count}': 'Angeheftet, {n} von {count}',
  'Goes to the pinned message': 'Springt zur angehefteten Nachricht',
  // Starred messages (app/starred.tsx, and a chat's details).
  Star: 'Mit Stern markieren',
  Unstar: 'Stern entfernen',
  'Starred messages': 'Markierte Nachrichten',
  'The messages you starred, in all your chats': 'Die Nachrichten, die du mit einem Stern markiert hast, in all deinen Chats',
  'No starred messages. Press and hold a message in a chat, then tap Star.':
    'Keine markierten Nachrichten. Halte eine Nachricht in einem Chat gedrückt und tippe auf „Mit Stern markieren“.',
  'You to {name}': 'Du an {name}',
  // Stickers (lib/stickers.ts, components/stickers.tsx).
  'Send a sticker': 'Sticker senden',
  'Sticker: {name}': 'Sticker: {name}',
  'Smiling moon': 'Lächelnder Mond',
  'Laughing moon': 'Lachender Mond',
  'Moon in love': 'Verliebter Mond',
  'Winking moon': 'Zwinkernder Mond',
  'Surprised moon': 'Überraschter Mond',
  'Sad moon': 'Trauriger Mond',
  'Angry moon': 'Wütender Mond',
  'Sleeping moon': 'Schlafender Mond',
  Heart: 'Herz',
  Sunshine: 'Sonnenschein',
  Coffee: 'Kaffee',
  'All good': 'Alles gut',
  // A place sent once (lib/place.ts, components/message-parts.tsx).
  Location: 'Standort',
  'Finding where you are…': 'Standort wird ermittelt…',
  'Send where you are?': 'Deinen Standort senden?',
  'Within about {m} m': 'Auf etwa {m} m genau',
  '{name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    '{name} bekommt diesen Ort einmal, Ende-zu-Ende-verschlüsselt. Erevos verfolgt nicht, wohin du danach gehst.',
  'Open in maps': 'In Karten öffnen',
  'Open in maps?': 'In Karten öffnen?',
  'Your maps app opens at this place. It may load its map from the internet, as it does.':
    'Deine Karten-App öffnet sich an diesem Ort. Sie lädt ihre Karte vielleicht aus dem Internet, wie sonst auch.',
  'This build of Erevos cannot send a place.': 'Diese Version von Erevos kann keinen Standort senden.',
  "Erevos may not use the phone's location. Allow it in the phone settings to send where you are.":
    'Erevos darf den Standort des Telefons nicht nutzen. Erlaube es in den Einstellungen des Telefons, um deinen Standort zu senden.',
  "The phone's location is off. Turn it on to send where you are.": 'Der Standort des Telefons ist aus. Schalte ihn ein, um deinen Standort zu senden.',
  'Where you are was not found in time. Try again outdoors, or in a while.':
    'Dein Standort wurde nicht rechtzeitig gefunden. Versuche es draußen erneut oder etwas später.',
  // Polls (components/poll.tsx).
  Poll: 'Umfrage',
  'Poll: {question}': 'Umfrage: {question}',
  'Poll · choose one': 'Umfrage · eine Antwort wählen',
  'Poll · choose one or more': 'Umfrage · eine oder mehrere wählen',
  'New poll': 'Neue Umfrage',
  Question: 'Frage',
  'Ask something': 'Frag etwas',
  Options: 'Optionen',
  'Option {n}': 'Option {n}',
  'Add an option': 'Option hinzufügen',
  'More than one answer': 'Mehrere Antworten',
  // Typing, under a contact's name in their chat.
  'typing…': 'schreibt…',
  // Searching the messages, in a chat and on the home screen (lib/message-search.ts).
  'Search in this chat': 'In diesem Chat suchen',
  '{n} of {count}': '{n} von {count}',
  Earlier: 'Früher',
  Later: 'Später',
  // Forwarding a message to another chat (lib/forward.ts).
  'Forward to': 'Weiterleiten an',
  Forwarded: 'Weitergeleitet',
  'Forwarding…': 'Wird weitergeleitet…',
  '{name} (group)': '{name} (Gruppe)',
  'It goes as a copy, sent anew and end-to-end encrypted, marked as forwarded but not from where.':
    'Sie geht als Kopie, neu gesendet und Ende-zu-Ende-verschlüsselt, als weitergeleitet markiert, aber ohne Herkunft.',
  // Writing a chat out as text (lib/chat-export.ts).
  'Export chat': 'Chat exportieren',
  'Export this chat?': 'Diesen Chat exportieren?',
  Export: 'Exportieren',
  'Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.':
    'Seine Nachrichten werden in eine Textdatei geschrieben, mit ihren Zeiten und wer sie geschrieben hat, und dort gespeichert, wo du willst. Die Datei ist nicht verschlüsselt: Wer sie hat, oder jede App, die dort lesen kann, wo sie liegt, kann den Chat lesen. Fotos, Dateien und Sprachnachrichten werden nur genannt, und verschwindende Nachrichten bleiben draußen.',
  'Chat with {name}, written out of Erevos': 'Chat mit {name}, aus Erevos exportiert',
  'Written out {when}. This file is not encrypted: anyone who has it can read it.':
    'Exportiert: {when}. Diese Datei ist nicht verschlüsselt: Wer sie hat, kann sie lesen.',
  'Photo: {name}': 'Foto: {name}',
  forwarded: 'weitergeleitet',
  'answering “{line}”': 'Antwort auf „{line}“',
  // Link previews, made by the sender's phone (lib/make-preview.ts).
  'Link previews': 'Linkvorschauen',
  'Making the link’s preview…': 'Linkvorschau wird erstellt…',
  'None while this space goes through Tor: Erevos sends only relay requests through it.':
    'Keine, solange dieser Bereich über Tor geht: Erevos sendet darüber nur Anfragen an das Relay.',
  "When you send a link, this phone fetches its page straight from the site and sends its title, a line and a small picture inside the message. The site sees this phone's internet address. In all chats of this space, not in hidden chats.":
    'Wenn du einen Link sendest, lädt dieses Telefon seine Seite direkt von der Website und sendet ihren Titel, eine Zeile und ein kleines Bild in der Nachricht mit. Die Website sieht die Internetadresse dieses Telefons. In allen Chats dieses Bereichs, nicht in versteckten Chats.',
  "Links go as they are. Turned on, this phone fetches a link's page as you send it, and the site sees this phone's internet address. The phone that gets it fetches nothing.":
    'Links gehen, wie sie sind. Eingeschaltet lädt dieses Telefon die Seite eines Links, wenn du ihn sendest, und die Website sieht die Internetadresse dieses Telefons. Das Telefon, das ihn bekommt, lädt nichts.',
  // A group's messages (components/group-messages.tsx).
  Everyone: 'Für alle',
  'Everyone in {name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    'Alle in {name} bekommen diesen Ort einmal, Ende-zu-Ende-verschlüsselt. Erevos verfolgt nicht, wohin du danach gehst.',
  'You in {name}': 'Du in {name}',
  'It went without the link’s preview, which is too much for LoRa.': 'Sie ging ohne die Linkvorschau, die für LoRa zu groß ist.',
};
