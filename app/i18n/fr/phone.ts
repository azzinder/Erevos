// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The French of the Phone and Contacts screens (app/phone.tsx and what goes with it) (i18n/fr/index.ts).
export const phone: Record<string, string> = {
  // The Phone screen (app/phone.tsx) and its place in the menu.
  Phone: 'Téléphone',
  'This build of Erevos has no phone part yet. It comes with the next build of the app.':
    'Cette version d’Erevos n’a pas encore la partie Téléphone. Elle arrive avec la prochaine version de l’app.',
  'Only Android lets another app be the phone app.': 'Seul Android permet à une autre app d’être l’app Téléphone.',
  'Erevos may not make calls. Make it the phone app under Settings.': 'Erevos n’a pas le droit de passer des appels. Fais-en l’app Téléphone dans « Réglages ».',
  'Not called. {error}': 'Appel non passé. {error}',
  Contacts: 'Contacts',
  Settings: 'Réglages',
  'Back to the call': 'Retour à l’appel',
  'Erevos is not the phone app': 'Erevos n’est pas l’app Téléphone',
  "Calls made here show on Android's own call screen until you make Erevos the phone app, under Settings.":
    'Les appels passés d’ici s’affichent sur l’écran d’appel d’Android, jusqu’à ce que tu fasses d’Erevos l’app Téléphone, dans « Réglages ».',
  Number: 'Numéro',
  'Call on': 'Appeler avec',
  "Without that, calls go on the phone's default SIM.": 'Sinon, les appels passent par la SIM par défaut du téléphone.',
  'Erevos keeps this SIM for the number, sealed in this space, and calls it on the same SIM next time.':
    'Erevos garde cette SIM pour ce numéro, scellée dans cet espace, et l’appelle avec la même SIM la prochaine fois.',
  Keypad: 'Clavier',
  Recents: 'Récents',
  Favourites: 'Favoris',

  // The calls (Android's call history) and the favourites, on the Phone screen (lib/phone-log.ts).
  All: 'Tous',
  Missed: 'Manqués',
  Incoming: 'Entrants',
  Outgoing: 'Sortants',
  Blocked: 'Bloqués',
  'Incoming call': 'Appel entrant',
  'Outgoing call': 'Appel sortant',
  'Declined call': 'Appel refusé',
  'Blocked call': 'Appel bloqué',
  'Private number': 'Numéro masqué',
  Payphone: 'Cabine téléphonique',
  'Unknown number': 'Numéro inconnu',
  'Wi-Fi calling': 'Appel Wi-Fi',
  'HD voice': 'Voix HD',
  'Android does not let Erevos read the call history yet.': 'Android ne laisse pas encore Erevos lire l’historique des appels.',
  'Allow the call history': 'Autoriser l’historique des appels',
  'Android did not allow it. Under Settings, Allow calls and contacts says how to.':
    'Android ne l’a pas autorisé. Dans « Réglages », « Autoriser les appels et les contacts » explique comment faire.',
  'No calls of this kind.': 'Aucun appel de ce type.',
  'No calls yet.': 'Pas encore d’appels.',
  'Call on {sim}': 'Appeler avec {sim}',
  'Call {name}': 'Appeler {name}',
  'Send an SMS': 'Envoyer un SMS',
  'Change the number before calling': 'Modifier le numéro avant d’appeler',
  'Block this number': 'Bloquer ce numéro',
  'Unblock this number': 'Débloquer ce numéro',
  'Blocked {who}.': 'Bloqué : {who}.',
  'Unblocked {who}.': 'Débloqué : {who}.',
  'Delete this call': 'Supprimer cet appel',
  'Delete these {n} calls': 'Supprimer ces {n} appels',
  'Delete every call with this number': 'Supprimer tous les appels avec ce numéro',
  'Call deleted.': 'Appel supprimé.',
  '{n} calls deleted.': '{n} appels supprimés.',
  'The calls with {who} were deleted.': 'Les appels avec {who} ont été supprimés.',
  'The calls were not deleted. {error}': 'Les appels n’ont pas été supprimés. {error}',
  "Android does not let Erevos read the phone's contacts yet.": 'Android ne laisse pas encore Erevos lire les contacts du téléphone.',
  'Allow the contacts': 'Autoriser les contacts',
  'No favourites yet. The contacts you star show here, to call at a tap.':
    'Pas encore de favoris. Les contacts que tu marques d’une étoile s’affichent ici, pour les appeler d’un appui.',

  // The phone's settings (app/phone-settings.tsx).
  'Phone settings': 'Réglages Téléphone',
  'Erevos is the phone app': 'Erevos est l’app Téléphone',
  "As the phone app, Erevos shows every call on its own screen: who calls, with their photo, over the lock screen too, without unlocking Erevos. Its Phone screen, with the keypad, the calls and the favourites, stays behind Erevos's password, unless you let it open without it, below. Phone calls are plain phone calls: the phone company carries them, as it carries every call.":
    'En tant qu’app Téléphone, Erevos affiche chaque appel sur son propre écran : qui appelle, avec sa photo, même sur l’écran de verrouillage, sans déverrouiller Erevos. Son écran « Téléphone », avec le clavier, les appels et les favoris, reste derrière le mot de passe d’Erevos, sauf si tu le laisses s’ouvrir sans, ci-dessous. Les appels téléphoniques sont des appels ordinaires : l’opérateur les achemine, comme tous les appels.',
  'Make Erevos the phone app': 'Faire d’Erevos l’app Téléphone',
  'Android did not make Erevos the phone app': 'Android n’a pas fait d’Erevos l’app Téléphone',
  "Choose Erevos in Android's Default apps → Phone app. If Android says it is a restricted setting, open Erevos's App info, tap ⋮ at the top right → Allow restricted settings, and choose Erevos again.":
    'Choisis Erevos dans « Applis par défaut → Appli de téléphone » d’Android. Si Android indique un paramètre restreint, ouvre les infos sur l’appli Erevos, appuie sur ⋮ en haut à droite → « Autoriser les paramètres restreints », et choisis de nouveau Erevos.',
  "Android did not allow it all. In Erevos's App info, under Permissions, call logs may say Restricted setting: then go back, tap ⋮ at the top right → Allow restricted settings, and allow Phone, Call logs and Contacts under Permissions.":
    'Android n’a pas tout autorisé. Dans les infos sur l’appli Erevos, sous « Autorisations », les journaux d’appels peuvent indiquer « Paramètre restreint » : reviens alors en arrière, appuie sur ⋮ en haut à droite → « Autoriser les paramètres restreints », et autorise Téléphone, Journaux d’appels et Contacts dans « Autorisations ».',
  'Android holds back part of what the phone app needs': 'Android retient une partie de ce dont l’app Téléphone a besoin',
  'Calls, the SIMs, the call history or the names of your contacts may not show. Android holds this back from an app installed from a browser, until you allow it.':
    'Les appels, les SIM, l’historique des appels ou les noms de tes contacts peuvent ne pas s’afficher. Android refuse ces droits à une app installée depuis un navigateur, tant que tu ne les autorises pas.',
  'Allow calls and contacts': 'Autoriser les appels et les contacts',
  'So a call that comes shows no Answer and Decline outside the call screen.':
    'Un appel entrant n’affiche donc pas « Answer » et « Decline » en dehors de l’écran d’appel.',
  'Android does not let Erevos show a call that comes over the lock screen: it shows as a notice only.':
    'Android ne laisse pas Erevos afficher un appel entrant sur l’écran de verrouillage : il n’apparaît que sous forme de notification.',
  'This device has no phone part, so it cannot make calls.': 'Cet appareil n’a pas de fonction téléphone, il ne peut donc pas passer d’appels.',
  'Quick replies': 'Réponses rapides',
  'Message, on the call screen of a call that rings, declines it with one of these, which the phone sends the caller as an SMS. They are kept on the phone, not sealed, as the call screen shows them with Erevos locked.':
    '« Message », sur l’écran d’un appel qui sonne, le refuse avec l’une de ces réponses, que le téléphone envoie par SMS à la personne qui appelle. Elles sont gardées sur le téléphone, non scellées, car l’écran d’appel les affiche quand Erevos est verrouillé.',
  Remove: 'Retirer',
  'Add a reply': 'Ajouter une réponse',
  'Use the usual replies': 'Utiliser les réponses habituelles',

  // Opening the Phone without the password (app/phone-settings.tsx, lib/phone-open.ts).
  'Open Erevos': 'Ouvrir Erevos',
  'Open the Phone without the password': 'Ouvrir le Téléphone sans le mot de passe',
  "With Erevos locked, the Phone's icon, a tel: link and the notice of a missed call then open the keypad, the calls and the favourites, which Android keeps for every phone app. Anyone holding the unlocked phone sees your calls and favourites, with the names of the phone's contacts only, never those kept only in Erevos or in hidden chats. Calls can be made there, nothing changed; everything else stays behind the password.":
    'Erevos verrouillé, l’icône du Téléphone, un lien tel: et la notification d’un appel manqué ouvrent alors le clavier, les appels et les favoris, qu’Android garde pour toute app Téléphone. Qui tient le téléphone déverrouillé voit tes appels et tes favoris, avec les noms des contacts du téléphone seulement, jamais ceux que gardent seulement Erevos ou les discussions cachées. On peut y appeler, sans rien changer ; tout le reste reste derrière le mot de passe.',
  'The Phone opens without the password.': 'Le Téléphone s’ouvre sans le mot de passe.',
  'Keep the Phone behind the password': 'Remettre le Téléphone derrière le mot de passe',

  // Blocking calls (app/phone-settings.tsx, lib/phone-rules.ts).
  Blocking: 'Blocage',
  "A blocked call does not ring and leaves no notice; it shows under Blocked in the calls. The telemarketing ranges and your prefixes never block a number in the phone's contacts. What is blocked is the same in every space, and keeps no names.":
    'Un appel bloqué ne sonne pas et ne laisse aucune notification ; il apparaît sous « Bloqués » dans « Récents ». Les tranches de numéros de démarchage et tes préfixes ne bloquent jamais un numéro des contacts du téléphone. Ce qui est bloqué vaut pour tous les espaces, et ne garde aucun nom.',
  'Block telemarketing': 'Bloquer le démarchage',
  'Stop blocking telemarketing': 'Ne plus bloquer le démarchage',
  'The numbers these countries keep for telemarketing calls:': 'Les numéros que ces pays réservent au démarchage téléphonique :',
  France: 'France',
  Spain: 'Espagne',
  Chile: 'Chili',
  India: 'Inde',
  Brazil: 'Brésil',
  'optional for the callers since August 2025': 'facultatif pour les appelants depuis août 2025',
  'Numbers starting with': 'Numéros commençant par',
  Block: 'Bloquer',
  'Type the start of the numbers to block, with the country code or as you dial it here: +33 162 or 0162.':
    'Saisis le début des numéros à bloquer, avec l’indicatif du pays ou comme tu le composes ici : +33 162 ou 0162.',
  'Erevos does not screen calls yet, so a blocked call rings a moment before Erevos ends it.':
    'Erevos ne filtre pas encore les appels, donc un appel bloqué sonne un instant avant qu’Erevos y mette fin.',
  'Let Erevos screen calls': 'Laisser Erevos filtrer les appels',
  "Android's own blocked numbers, the same list as under SMS: Android rejects their calls before they ring, and their SMS and MMS. Every space sees the same list.":
    'Les numéros bloqués d’Android lui-même, la même liste que dans « SMS » : Android rejette leurs appels avant qu’ils sonnent, ainsi que leurs SMS et MMS. Chaque espace voit la même liste.',
  'Only the phone app or the SMS app may see them: make Erevos the phone app above.':
    'Seule l’app Téléphone ou l’app SMS peut les voir : fais d’Erevos l’app Téléphone ci-dessus.',
  'Block a contact group': 'Bloquer un groupe de contacts',
  "The calls of a group's contacts, as your phone's contacts label them, are blocked for a while: for an hour, until tomorrow morning, or until you lift it.":
    'Les appels des contacts d’un groupe, selon les groupes des contacts de ton téléphone, sont bloqués pour un temps : une heure, jusqu’à demain matin, ou jusqu’à ce que tu lèves le blocage.',
  'Your phone has no contact groups yet.': 'Ton téléphone n’a pas encore de groupes de contacts.',
  Lift: 'Lever',
  '{n} contact': '{n} contact',
  '{n} contacts': '{n} contacts',
  'For an hour': 'Pendant une heure',
  'Until tomorrow morning': 'Jusqu’à demain matin',
  'Until I lift it': 'Jusqu’à ce que je lève le blocage',
  'Blocked until you lift it': 'Bloqué jusqu’à ce que tu lèves le blocage',
  'Blocked until {time}': 'Bloqué jusqu’à {time}',
  'Blocked until tomorrow, {time}': 'Bloqué jusqu’à demain, {time}',
  'Calls from the group {group} are blocked': 'Les appels du groupe {group} sont bloqués',
  'Calls from a contact group are blocked': 'Les appels d’un groupe de contacts sont bloqués',
  // The Phone's search for a contact to call.
  'Clear the search': 'Effacer la recherche',
  'No contact with a number matches.': 'Aucun contact avec un numéro ne correspond.',
  // A plain call from the top of a chat or an SMS conversation (components/dial-tile.tsx).
  'Mobile call, not encrypted': 'Appel mobile, non chiffré',
  'This phone has no app to call {number}.': 'Ce téléphone n’a pas d’app pour appeler le {number}.',
  "More for this number": "Plus pour ce numéro",
  "Add to an existing contact": "Ajouter à un contact existant",
  "Copy the number": "Copier le numéro",
  "Open the contact": "Ouvrir le contact",
  "No contact has this number.": "Aucun contact n’a ce numéro.",
};
