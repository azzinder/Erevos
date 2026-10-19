// The French of linked devices: the account on the phone and on a computer (lib/devices.ts, app/devices.tsx; i18n/fr/index.ts).
export const devices: Record<string, string> = {
  // Linking and the links (lib/devices.ts).
  Computer: 'Ordinateur',
  'Linked devices could not open.': 'Impossible d’ouvrir les appareils associés.',
  'That device is linked already.': 'Cet appareil est déjà associé.',
  'That is not a code from Linked devices.': 'Ce n’est pas un code de l’écran « Appareils associés ».',
  'The code changed. Compare it again.': 'Le code a changé. Compare-le de nouveau.',
  'This device is no longer linked to a phone.': 'Cet appareil n’est plus associé à un téléphone.',
  'This is a linked device. Link from the phone that holds the account.': 'Ceci est un appareil associé. Associe depuis le téléphone qui détient le compte.',
  'This space has chats of its own. Link from a space with none, such as one that opens with a new password.':
    'Cet espace a ses propres discussions. Associe depuis un espace qui n’en a aucune, comme un espace qui s’ouvre avec un nouveau mot de passe.',
  'This space is linked already.': 'Cet espace est déjà associé.',
  'Too long to go through the phone.': 'Trop long pour passer par le téléphone.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Saisis d’abord l’adresse du relais dans « Relais » : les appareils associés joignent ce téléphone par lui.',
  '{n} devices are linked already, the most there can be.': '{n} appareils sont déjà associés, le maximum possible.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Appareils associés',
  'Not sent by the phone': 'Pas envoyé par le téléphone',
  'These chats came from a linked device’s backup: you can read them here, but not write in them. To write, link this device to the phone again, in Linked devices.':
    'Ces discussions viennent de la sauvegarde d’un appareil associé : tu peux les lire ici, mais pas y écrire. Pour écrire, associe de nouveau cet appareil au téléphone, dans Appareils associés.',
  'This account on a computer or in a browser too': 'Ce compte aussi sur un ordinateur ou dans un navigateur',
  "This chat is the phone's: move it into hidden chats there.": 'Cette discussion appartient au téléphone : déplace-la dans les discussions masquées depuis celui-ci.',

  // A call answered on another device of the account (components/call-screen.tsx, lib/call-lines.ts).
  'Answered on another device': 'Répondu sur un autre appareil',
  'answered on another device': 'répondu sur un autre appareil',

  // Linked devices (app/devices.tsx).
  'All of it': 'Tout',
  'The last month': 'Le dernier mois',
  'The last week': 'La dernière semaine',
  None: 'Aucun',
  'Web browser': 'Navigateur web',
  'Code copied. Paste it on the phone in Menu → Linked devices.': 'Code copié. Colle-le sur le téléphone dans « Menu → Appareils associés ».',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Associé. Les discussions arrivent depuis le téléphone, avec les messages qu’il a choisi de transférer.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Non associé. Quelqu’un d’autre a peut-être lu le code. Crées-en un nouveau, et recommence l’association.',
  'Now the computer shows a code too. If it is {code}, tap They match there.': 'Maintenant, l’ordinateur affiche lui aussi un code. Si c’est {code}, appuie là-bas sur « Ils correspondent ».',
  'Unlink this device': 'Dissocier cet appareil',
  'Unlink {name}': 'Dissocier {name}',
  "The account's chats leave this device, messages and all. The phone keeps them.": 'Les discussions du compte quittent cet appareil, avec tous leurs messages. Le téléphone les garde.',
  'Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.':
    'Plus rien ne lui est envoyé, et rien de ce qu’il envoie n’est accepté. Ce qu’il a reste sur lui, derrière son propre verrou.',
  'Unlinked.': 'Dissocié.',
  'Unlinked here. The phone was not told: unlink this device there too.': 'Dissocié ici. Le téléphone n’a pas été prévenu : dissocie aussi cet appareil depuis celui-ci.',
  'Unlinked. The device was not told, and gets nothing more.': 'Dissocié. L’appareil n’a pas été prévenu, et ne reçoit plus rien.',
  'The messages go to it now. What it has already is not kept twice.': 'Les messages lui sont envoyés maintenant. Ce qu’il a déjà n’est pas gardé en double.',
  'Messages to bring over': 'Messages à transférer',
  'Photos and files too': 'Les photos et fichiers aussi',
  'Linked to {name}': 'Associé à {name}',
  'Since {when}. Last heard from {last}.': 'Depuis le {when}. Dernier contact le {last}.',
  'This device has the chats and groups of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls ring here too. New groups, public groups and group calls stay on the phone for now.':
    'Cet appareil a les discussions et les groupes du téléphone qui détient le compte. Ce que tu écris ici passe par le téléphone, qui doit être allumé et joindre le relais. Les appels sonnent aussi ici. Les nouveaux groupes, les groupes publics et les appels de groupe restent sur le téléphone pour l’instant.',
  'Make or join groups on the phone that holds this account.': 'Crée des groupes ou rejoins-en depuis le téléphone qui détient ce compte.',
  'Group calls ring on the phone that holds this account, for now. Call from there.':
    'Pour l’instant, les appels de groupe sonnent sur le téléphone qui détient ce compte. Appelle depuis celui-ci.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go.':
    'Le même compte sur un ordinateur ou dans un navigateur. Le compte reste celui du téléphone : il transmet, chiffré de bout en bout, ce qui arrive et ce que l’ordinateur écrit, donc tes contacts ne voient rien de nouveau. Les discussions masquées et ce qu’ouvre un second mot de passe ne sont jamais transmis.',
  'Link {name}': 'Associer {name}',
  'Once you tap Link, the computer shows this code. Link only if it shows the same:': 'Dès que tu appuies sur « Associer », l’ordinateur affiche ce code. N’associe que s’il affiche le même :',
  Link: 'Associer',
  Devices: 'Appareils',
  'Linked {when}. Last heard from {last}.': 'Associé le {when}. Dernier contact le {last}.',
  'Linked {when}.': 'Associé le {when}.',
  'Waiting for They match to be tapped on it.': 'Attend qu’on y appuie sur « Ils correspondent ».',
  'Bringing over messages: {n} so far.': 'Transfert des messages : {n} pour l’instant.',
  'Bring over': 'Transférer',
  'Bring over messages again': 'Transférer de nouveau les messages',
  'Link a computer to this phone': 'Associer un ordinateur à ce téléphone',
  "On the computer, open Menu → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'Sur l’ordinateur, ouvre « Menu → Appareils associés → Associer à mon téléphone ». Scanne ensuite son code avec l’appareil photo de ce téléphone, ou copie-le là-bas et colle-le ici.',
  'Code from the computer': 'Code de l’ordinateur',
  Next: 'Suivant',
  'Link to my phone': 'Associer à mon téléphone',
  'The phone read the code. Does it show this one too?': 'Le téléphone a lu le code. Affiche-t-il aussi celui-ci ?',
  'They match': 'Ils correspondent',
  'They differ': 'Ils sont différents',
  'On the phone that holds the account, scan this code with the camera, or paste it in Menu → Linked devices. This space must have no chats of its own.':
    'Sur le téléphone qui détient le compte, scanne ce code avec l’appareil photo, ou colle-le dans « Menu → Appareils associés ». Cet espace ne doit avoir aucune discussion à lui.',
  'Copy the code': 'Copier le code',
  'Share the code': 'Partager le code',
  'Waiting for the phone. The code works for half an hour.': 'En attente du téléphone. Le code est valable une demi-heure.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'À utiliser quand cet appareil est l’ordinateur : ses discussions deviennent celles du téléphone qui détient le compte.',
  'Name of this device': 'Nom de cet appareil',
};
