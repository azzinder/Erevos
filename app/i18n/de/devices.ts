// The German of linked devices: the account on the phone and on a computer (lib/devices.ts, app/devices.tsx; i18n/de/index.ts).
export const devices: Record<string, string> = {
  // Linking and the links (lib/devices.ts).
  Computer: 'Computer',
  'Linked devices could not open.': 'Verknüpfte Geräte ließen sich nicht öffnen.',
  'That device is linked already.': 'Dieses Gerät ist schon verknüpft.',
  'That is not a code from Linked devices.': 'Das ist kein Code aus „Verknüpfte Geräte“.',
  'The code changed. Compare it again.': 'Der Code hat sich geändert. Vergleiche ihn erneut.',
  'This device is no longer linked to a phone.': 'Dieses Gerät ist nicht mehr mit einem Telefon verknüpft.',
  'This is a linked device. Link from the phone that holds the account.': 'Das ist ein verknüpftes Gerät. Verknüpfe von dem Telefon aus, das das Konto hat.',
  'This space has chats of its own. Link from a space with none, such as one that opens with a new password.':
    'Dieser Bereich hat eigene Chats. Verknüpfe aus einem Bereich ohne Chats, etwa einem, der sich mit einem neuen Passwort öffnet.',
  'This space is linked already.': 'Dieser Bereich ist schon verknüpft.',
  'Too long to go through the phone.': 'Zu lang, um über das Telefon zu gehen.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Gib zuerst die Relay-Adresse unter „Relay“ ein: Verknüpfte Geräte erreichen dieses Telefon darüber.',
  '{n} devices are linked already, the most there can be.': 'Es sind schon {n} Geräte verknüpft, mehr geht nicht.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Verknüpfte Geräte',
  'This account on a computer or in a browser too': 'Dieses Konto auch auf einem Computer oder im Browser',
  'Calls ring on the phone that holds this account, for now. Call from there.': 'Anrufe klingeln vorerst auf dem Telefon, das dieses Konto hat. Ruf von dort an.',
  "This chat is the phone's: move it into hidden chats there.": 'Dieser Chat gehört dem Telefon: Verschiebe ihn dort in die versteckten Chats.',

  // Linked devices (app/devices.tsx).
  'All of it': 'Alle',
  'The last month': 'Den letzten Monat',
  'The last week': 'Die letzte Woche',
  None: 'Keine',
  'Web browser': 'Webbrowser',
  'Code copied. Paste it on the phone in Menu → Linked devices.': 'Code kopiert. Füge ihn auf dem Telefon unter „Menü → Verknüpfte Geräte“ ein.',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Verknüpft. Die Chats kommen vom Telefon, und mit ihnen die Nachrichten, die dort zum Übertragen gewählt wurden.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Nicht verknüpft. Vielleicht hat jemand anderes den Code gelesen. Erstelle einen neuen und verknüpfe erneut.',
  'Now the computer shows a code too. If it is {code}, tap They match there.': 'Jetzt zeigt auch der Computer einen Code. Wenn es {code} ist, tippe dort auf „Stimmen überein“.',
  'Unlink this device': 'Dieses Gerät trennen',
  'Unlink {name}': '{name} trennen',
  "The account's chats leave this device, messages and all. The phone keeps them.": 'Die Chats des Kontos verschwinden von diesem Gerät, samt Nachrichten. Das Telefon behält sie.',
  'Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.':
    'Es geht nichts mehr dorthin, und nichts, was es sendet, wird angenommen. Was es hat, bleibt darauf, hinter seiner eigenen Sperre.',
  'Unlinked.': 'Getrennt.',
  'Unlinked here. The phone was not told: unlink this device there too.': 'Hier getrennt. Das Telefon hat es nicht erfahren: Trenne dieses Gerät auch dort.',
  'Unlinked. The device was not told, and gets nothing more.': 'Getrennt. Das Gerät hat es nicht erfahren und bekommt nichts mehr.',
  'The messages go to it now. What it has already is not kept twice.': 'Die Nachrichten gehen jetzt dorthin. Was es schon hat, wird nicht doppelt gespeichert.',
  'Messages to bring over': 'Nachrichten zum Übertragen',
  'Photos and files too': 'Auch Fotos und Dateien',
  'Linked to {name}': 'Verknüpft mit {name}',
  'Since {when}. Last heard from {last}.': 'Seit {when}. Zuletzt gemeldet: {last}.',
  'This device has the chats of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls and groups stay on the phone for now.':
    'Dieses Gerät hat die Chats des Telefons, das das Konto hat. Was du hier schreibst, geht über das Telefon, das an sein und das Relay erreichen muss. Anrufe und Gruppen bleiben vorerst auf dem Telefon.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go.':
    'Dasselbe Konto auf einem Computer oder im Browser. Das Konto bleibt das Telefon: Es gibt Ende-zu-Ende-verschlüsselt weiter, was ankommt und was der Computer schreibt, Kontakte sehen also nichts Neues. Versteckte Chats und was ein zweites Passwort öffnet, gehen nie mit.',
  'Link {name}': '{name} verknüpfen',
  'Once you tap Link, the computer shows this code. Link only if it shows the same:': 'Sobald du auf „Verknüpfen“ tippst, zeigt der Computer diesen Code. Verknüpfe nur, wenn er denselben zeigt:',
  Link: 'Verknüpfen',
  Devices: 'Geräte',
  'Linked {when}. Last heard from {last}.': 'Verknüpft am {when}. Zuletzt gemeldet: {last}.',
  'Linked {when}.': 'Verknüpft am {when}.',
  'Waiting for They match to be tapped on it.': 'Wartet darauf, dass dort „Stimmen überein“ angetippt wird.',
  'Bringing over messages: {n} so far.': 'Nachrichten werden übertragen: bisher {n}.',
  'Bring over': 'Übertragen',
  'Bring over messages again': 'Nachrichten erneut übertragen',
  'Link a computer to this phone': 'Einen Computer mit diesem Telefon verknüpfen',
  "On the computer, open Menu → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'Öffne auf dem Computer „Menü → Verknüpfte Geräte → Mit meinem Telefon verknüpfen“. Scanne dann seinen Code mit der Kamera dieses Telefons, oder kopiere ihn dort und füge ihn hier ein.',
  'Code from the computer': 'Code vom Computer',
  Next: 'Weiter',
  'Link to my phone': 'Mit meinem Telefon verknüpfen',
  'The phone read the code. Does it show this one too?': 'Das Telefon hat den Code gelesen. Zeigt es auch diesen?',
  'They match': 'Stimmen überein',
  'They differ': 'Stimmen nicht überein',
  'On the phone that holds the account, scan this code with the camera, or paste it in Menu → Linked devices. This space must have no chats of its own.':
    'Scanne diesen Code auf dem Telefon, das das Konto hat, mit der Kamera, oder füge ihn dort unter „Menü → Verknüpfte Geräte“ ein. Dieser Bereich darf keine eigenen Chats haben.',
  'Copy the code': 'Code kopieren',
  'Share the code': 'Code teilen',
  'Waiting for the phone. The code works for half an hour.': 'Wartet auf das Telefon. Der Code gilt eine halbe Stunde.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Nutze das, wenn dieses Gerät der Computer ist: Seine Chats werden die des Telefons, das das Konto hat.',
  'Name of this device': 'Name dieses Geräts',
};
