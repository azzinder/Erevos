// The French of the Contacts screens: the phone's contacts, their groups, merging, vCards, QR codes,
// birthdays and contacts kept only in Erevos (app/contacts.tsx and what goes with it) (i18n/fr/index.ts).
export const contacts: Record<string, string> = {
  "The phone's contacts, their groups and birthdays": 'Les contacts du téléphone, leurs groupes et anniversaires',
  'This build of Erevos has no contacts part yet. It comes with the next build of the app.': 'Cette version d’Erevos n’a pas encore la partie Contacts. Elle arrive avec la prochaine version de l’app.',
  "Only Erevos on Android reads the phone's contacts.": 'Seul Erevos sur Android lit les contacts du téléphone.',
  'Search contacts': 'Rechercher des contacts',
  "Erevos may not read the phone's contacts yet": 'Erevos n’a pas encore accès aux contacts du téléphone',
  "Erevos reads and changes them only in Android's own contacts, where they stay for your other apps. It sends them nowhere.":
    'Erevos ne les lit et ne les modifie que dans les contacts d’Android lui-même, où ils restent pour tes autres apps. Il ne les envoie nulle part.',
  'Allow contacts': 'Autoriser les contacts',
  "Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info.":
    'Sans cela, Erevos ne peut pas afficher les contacts du téléphone. Autorise « Contacts » dans les infos sur l’appli Erevos.',
  "The phone's contacts could not be read: {error}": 'Impossible de lire les contacts du téléphone : {error}',
  'No contact has “{query}” in it.': 'Aucun contact ne contient « {query} ».',
  'No favourites yet. Tap the star on a contact.': 'Pas encore de favoris. Appuie sur l’étoile d’un contact.',
  'No contacts yet.': 'Pas encore de contacts.',
  "These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them. Those with a lock are kept only in Erevos, sealed in this space.":
    'Ce sont les contacts du téléphone, enregistrés dans les contacts d’Android lui-même : toute app autorisée à les lire les voit, et un compte (Google) peut les synchroniser. Ceux qui ont un cadenas ne sont gardés que dans Erevos, scellés dans cet espace.',
  'New contact': 'Nouveau contact',

  // One contact.
  'This contact is no longer on the phone.': 'Ce contact n’est plus sur le téléphone.',
  'Delete contact': 'Supprimer le contact',
  'Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.':
    'Supprimer {name} du téléphone ? Ce contact disparaît de chaque compte où il est enregistré, et ne pourra pas être récupéré.',
  'Remove from favourites': 'Retirer des favoris',
  'Add to favourites': 'Ajouter aux favoris',
  'Favourite': 'Favori',
  'Birthday': 'Anniversaire',
  'Note': 'Note',
  'Edit': 'Modifier',
  'Mobile': 'Mobile',
  'Home': 'Domicile',
  'Work': 'Travail',
  'Main': 'Principal',
  'Fax': 'Fax',
  'Pager': 'Bipeur',
  'Other': 'Autre',
  'Birthday today, turns {age}': 'Anniversaire aujourd’hui, {age} ans',
  'Birthday today': 'Anniversaire aujourd’hui',
  'Birthday tomorrow, turns {age}': 'Anniversaire demain, {age} ans',
  'Birthday tomorrow': 'Anniversaire demain',
  'Birthday in {n} days, turns {age}': 'Anniversaire dans {n} jours, {age} ans',
  'Birthday in {n} days': 'Anniversaire dans {n} jours',
  'Add a photo': 'Ajouter une photo',
  'Choose a photo': 'Choisir une photo',
  'Remove the photo': 'Retirer la photo',
  "The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.":
    'La photo est enregistrée avec le contact dans les contacts d’Android, où le téléphone l’affiche quand il appelle, et son compte (Google) la synchronise.',
  'Ringtone': 'Sonnerie',
  "The phone's own": 'Celle du téléphone',
  'A ringtone of its own': 'Sa propre sonnerie',
  'Choose ringtone': 'Choisir la sonnerie',

  // Writing a contact.
  'Edit contact': 'Modifier le contact',
  'First name': 'Prénom',
  'Last name': 'Nom',
  'Company': 'Entreprise',
  'Job title': 'Poste',
  'Phone numbers': 'Numéros de téléphone',
  'Add a number': 'Ajouter un numéro',
  'Emails': 'E-mails',
  'Add an email': 'Ajouter un e-mail',
  'Addresses': 'Adresses',
  'Add an address': 'Ajouter une adresse',
  'Day/month/year, or day/month without the year.': 'Jour/mois/année, ou jour/mois sans l’année.',
  'Write the birthday as day/month/year, or day/month.': 'Écris l’anniversaire sous la forme jour/mois/année, ou jour/mois.',
  'Give the contact a name, a number or an email.': 'Donne au contact un nom, un numéro ou un e-mail.',
  'Kept in': 'Enregistré dans',
  'On this phone only': 'Seulement sur ce téléphone',
  "In Android's contacts, synced with {account}.": 'Dans les contacts d’Android, synchronisé avec {account}.',
  "In Android's contacts on this phone, synced nowhere.": 'Dans les contacts d’Android sur ce téléphone, synchronisé nulle part.',

  // Groups.
  'Groups': 'Groupes',
  'Family, Work, and your own: make, rename, who is in them': 'Famille, Travail, et les tiens : créer, renommer, qui en fait partie',
  "Android's own groups of contacts, such as Family or Work. Your other apps see them too, and an account (Google) syncs its own.":
    'Les groupes de contacts d’Android lui-même, comme Famille ou Travail. Tes autres apps les voient aussi, et un compte (Google) synchronise les siens.',
  'No groups yet.': 'Pas encore de groupes.',
  'Group without a name': 'Groupe sans nom',
  'Family': 'Famille',
  'A contact joins a group only in the account the group is kept in.': 'Un contact ne rejoint un groupe que dans le compte où le groupe est enregistré.',
  'The group could not be made. {error}': 'Impossible de créer le groupe. {error}',
  'This group is no longer on the phone.': 'Ce groupe n’est plus sur le téléphone.',
  'Delete group': 'Supprimer le groupe',
  'Delete the group {name}? Its contacts stay on the phone.': 'Supprimer le groupe {name} ? Ses contacts restent sur le téléphone.',
  'Add contacts': 'Ajouter des contacts',
  'No one in this group yet.': 'Personne dans ce groupe pour l’instant.',
  'Take {name} out of the group': 'Retirer {name} du groupe',
  '{n} contact could not join: it is kept in another account than this group.': '{n} contact n’a pas pu rejoindre le groupe : il est enregistré dans un autre compte que ce groupe.',
  '{n} contacts could not join: they are kept in another account than this group.': '{n} contacts n’ont pas pu rejoindre le groupe : ils sont enregistrés dans un autre compte que ce groupe.',
  'Add {n} contact': 'Ajouter {n} contact',
  'Add {n} contacts': 'Ajouter {n} contacts',
  'In no group': 'Dans aucun groupe',
  'Choose groups': 'Choisir les groupes',
  'No groups yet. Make one under Groups in the menu of Contacts.': 'Pas encore de groupes. Crées-en un dans « Groupes », dans le menu de « Contacts ».',
  '{name} is kept in another account than the group {group}, so it cannot join it.': '{name} est enregistré dans un autre compte que le groupe {group}, il ne peut donc pas le rejoindre.',

  // vCard files.
  'Import from a .vcf file': 'Importer depuis un fichier .vcf',
  'Contacts another phone or app saved as a vCard': 'Des contacts qu’un autre téléphone ou une autre app a enregistrés en vCard',
  'Save as a .vcf file': 'Enregistrer en fichier .vcf',
  'The {n} contact shown, in a folder you choose': '{n} contact affiché, dans un dossier de ton choix',
  'The {n} contacts shown, in a folder you choose': 'Les {n} contacts affichés, dans un dossier de ton choix',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.':
    'Enregistré sous {name}. Le fichier est hors d’Erevos : toute personne qui l’a peut lire ces contacts.',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read this contact.':
    'Enregistré sous {name}. Le fichier est hors d’Erevos : toute personne qui l’a peut lire ce contact.',
  'Import contacts': 'Importer des contacts',
  'Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.':
    'Choisis un fichier .vcf (une vCard), comme ceux où d’autres téléphones et apps enregistrent leurs contacts. Erevos le lit ici et ne l’envoie nulle part.',
  'Choose a .vcf file': 'Choisir un fichier .vcf',
  'There are no contacts in {file}.': 'Il n’y a aucun contact dans {file}.',
  'The file is larger than {n} MB.': 'Le fichier dépasse {n} Mo.',
  'It has {n} contact.': 'Il contient {n} contact.',
  'It has {n} contacts.': 'Il contient {n} contacts.',
  '{n} of them is on the phone already, and is left out.': '{n} d’entre eux est déjà sur le téléphone, et est laissé de côté.',
  '{n} of them are on the phone already, and are left out.': '{n} d’entre eux sont déjà sur le téléphone, et sont laissés de côté.',
  'Importing… {done} of {total}': 'Importation… {done} sur {total}',
  'Import {n} contact': 'Importer {n} contact',
  'Import {n} contacts': 'Importer {n} contacts',
  'Nothing new to import.': 'Rien de nouveau à importer.',
  '{n} contact imported.': '{n} contact importé.',
  '{n} contacts imported.': '{n} contacts importés.',
  '{n} contact could not be saved.': '{n} contact n’a pas pu être enregistré.',
  '{n} contacts could not be saved.': '{n} contacts n’ont pas pu être enregistrés.',

  // QR codes.
  'This contact holds too much for a QR code. Save it as a .vcf file instead.': 'Ce contact contient trop d’informations pour un code QR. Enregistre-le plutôt en fichier .vcf.',
  "Another phone's camera reads it as a contact to add: its name, numbers, emails, addresses and note, without its photo. Whoever sees the code can read it.":
    'L’appareil photo d’un autre téléphone le lit comme un contact à ajouter : son nom, ses numéros, e-mails, adresses et sa note, sans sa photo. Quiconque voit le code peut le lire.',
  "Another phone's camera reads it as a contact to add, without its photo, and without its note or addresses, which do not fit. Whoever sees the code can read it.":
    'L’appareil photo d’un autre téléphone le lit comme un contact à ajouter, sans sa photo, et sans sa note ni ses adresses, qui ne tiennent pas. Quiconque voit le code peut le lire.',
  "Read a contact's QR code": 'Lire le code QR d’un contact',
  'From a photo of it, read on the phone': 'À partir d’une photo du code, lue sur le téléphone',
  'Take a photo of the code, or choose one. It is read here and not kept; what it holds starts a new contact, saved only when you save it.':
    'Prends une photo du code, ou choisis-en une. Elle est lue ici et n’est pas gardée ; son contenu commence un nouveau contact, enregistré seulement quand tu l’enregistres.',
  'This QR code holds no contact.': 'Ce code QR ne contient aucun contact.',
  'No QR code was found in the photo. Take it again closer, with all of the code in it.': 'Aucun code QR trouvé sur la photo. Reprends-la de plus près, avec tout le code dedans.',

  // Duplicates.
  'Find duplicates': 'Trouver les doublons',
  'The same person kept twice, to merge into one': 'La même personne enregistrée deux fois, à fusionner en une seule',
  'There is nothing to merge.': 'Il n’y a rien à fusionner.',
  'The same name': 'Même nom',
  'The same number': 'Même numéro',
  'The same email': 'Même e-mail',
  'Merge': 'Fusionner',
  'Merge these {n} into {name}? The others are deleted, from every account they are kept in.': 'Fusionner ces {n} contacts dans {name} ? Les autres sont supprimés, de chaque compte où ils sont enregistrés.',
  'Merge all': 'Tout fusionner',
  'Merge {n} set of contacts, each into its fullest? The others are deleted.': 'Fusionner {n} série de doublons, chacune dans son contact le plus complet ? Les autres sont supprimés.',
  'Merge {n} sets of contacts, each into its fullest? The others are deleted.': 'Fusionner {n} séries de doublons, chacune dans son contact le plus complet ? Les autres sont supprimés.',
  '{n} set could not be merged.': '{n} série n’a pas pu être fusionnée.',
  '{n} sets could not be merged.': '{n} séries n’ont pas pu être fusionnées.',
  'Duplicates': 'Doublons',
  'Contacts that look like the same person: the same name, number or email. Merging keeps the fullest, with every number, email and address of the others, and deletes the others.':
    'Des contacts qui semblent être la même personne : même nom, même numéro ou même e-mail. La fusion garde le plus complet, avec chaque numéro, e-mail et adresse des autres, et supprime les autres.',
  'No duplicates found.': 'Aucun doublon trouvé.',
  'Not the same': 'Pas la même personne',
  'Kept, with the others in it': 'Gardé, avec les autres fusionnés dedans',

  // Birthdays.
  'Birthdays': 'Anniversaires',
  "Without notices, Erevos cannot remind you of birthdays. Allow Notifications in Erevos's App info.":
    'Sans notifications, Erevos ne peut pas te rappeler les anniversaires. Autorise « Notifications » dans les infos sur l’appli Erevos.',
  'No contact has a birthday yet. Add one in Edit.': 'Aucun contact n’a encore d’anniversaire. Ajoutes-en un dans « Modifier ».',
  'Birthday reminders: on': 'Rappels d’anniversaire : activés',
  'Birthday reminders: off': 'Rappels d’anniversaire : désactivés',
  "A notice on the morning of each phone contact's birthday": 'Une notification le matin de l’anniversaire de chaque contact du téléphone',

  // The SIM.
  'SIM contacts': 'Contacts de la SIM',
  'Copy the contacts on the SIM card to the phone': 'Copier les contacts de la carte SIM sur le téléphone',
  "The contacts kept on the phone's SIM cards. Copied, they are in Android's contacts like the others; the SIM keeps its own.":
    'Les contacts enregistrés sur les cartes SIM du téléphone. Une fois copiés, ils sont dans les contacts d’Android comme les autres ; la SIM garde les siens.',
  'Reading the SIM…': 'Lecture de la SIM…',
  'No contacts on the SIM, or the phone does not let Erevos read it.': 'Aucun contact sur la SIM, ou le téléphone ne laisse pas Erevos la lire.',
  'The SIM has {n} contact.': 'La SIM contient {n} contact.',
  'The SIM has {n} contacts.': 'La SIM contient {n} contacts.',
  'Copying… {done} of {total}': 'Copie… {done} sur {total}',
  'Copy {n} contact to the phone': 'Copier {n} contact sur le téléphone',
  'Copy {n} contacts to the phone': 'Copier {n} contacts sur le téléphone',
  'Choose who to copy': 'Choisis qui copier',
  '{n} contact copied to the phone.': '{n} contact copié sur le téléphone.',
  '{n} contacts copied to the phone.': '{n} contacts copiés sur le téléphone.',
  'SIM {n}': 'SIM {n}',

  // Kept only in Erevos, and in hidden chats.
  'Only in Erevos': 'Seulement dans Erevos',
  "Sealed in this space, and not in the phone's contacts: no other app sees it, nor any account the phone syncs with.":
    'Scellé dans cet espace, et pas dans les contacts du téléphone : aucune autre app ne le voit, ni aucun compte avec lequel le téléphone se synchronise.',
  'No contact is kept only in Erevos yet. Choose Only in Erevos when you make one.':
    'Aucun contact n’est encore gardé seulement dans Erevos. Choisis « Seulement dans Erevos » quand tu en crées un.',
  'Erevos keeps {n} contacts of its own at most.': 'Erevos garde au plus {n} contacts à lui.',
  'This contact is no longer kept in Erevos.': 'Ce contact n’est plus gardé dans Erevos.',
  'Delete {name}? It is kept only in Erevos, and cannot be brought back.': 'Supprimer {name} ? Ce contact n’est gardé que dans Erevos, et ne pourra pas être récupéré.',
  'Keep only in Erevos': 'Garder seulement dans Erevos',
  "Move {name} into Erevos? It is sealed in this space and deleted from the phone's contacts, from every account it is kept in: other apps no longer see it, and the phone no longer shows its name when it calls.":
    'Déplacer {name} dans Erevos ? Ce contact est scellé dans cet espace et supprimé des contacts du téléphone, de chaque compte où il est enregistré : les autres apps ne le voient plus, et le téléphone n’affiche plus son nom quand il appelle.',
  "Move to the phone's contacts": 'Déplacer dans les contacts du téléphone',
  "Move {name} to the phone's contacts? Every app allowed to read them sees it there, and it is no longer kept in Erevos.":
    'Déplacer {name} dans les contacts du téléphone ? Toute app autorisée à les lire l’y voit, et il n’est plus gardé dans Erevos.',
  "Kept only in Erevos, sealed in this space. Not in the phone's contacts.": 'Gardé seulement dans Erevos, scellé dans cet espace. Pas dans les contacts du téléphone.',
  'The photo is sealed with the contact, in a file of its own: only Erevos shows it.':
    'La photo est scellée avec le contact, dans un fichier à part : seul Erevos l’affiche.',
  'Hidden contacts': 'Contacts masqués',
  'The hidden chats are closed.': 'Les discussions masquées sont fermées.',
  "Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.":
    'Gardés seulement ici, scellés avec les discussions masquées : ils n’apparaissent nulle part ailleurs, pas même dans les contacts de l’espace.',
  'Kept only in these hidden chats, sealed.': 'Gardé seulement dans ces discussions masquées, scellé.',
  'favourite': 'favori',
  'only in Erevos': 'seulement dans Erevos',

  // Erevos contacts, and a contact's history.
  'Erevos contacts': 'Contacts Erevos',
  'Erevos contact': 'Contact Erevos',
  'with an Erevos chat': 'avec une discussion Erevos',
  'No Erevos contacts yet. Add one in Chat, with their link or QR code.':
    'Pas encore de contacts Erevos. Ajoutes-en un dans « Discussion », avec son lien ou son code QR.',
  'A contact of your Erevos chats. Add it to your contacts to give it numbers, an email and more.':
    'Un contact de tes discussions Erevos. Ajoute-le à tes contacts pour lui donner des numéros, un e-mail et plus encore.',
  'In Erevos': 'Dans Erevos',
  'The Erevos contact {name}': 'Le contact Erevos {name}',
  'End-to-end encrypted, through Erevos instead of the phone company.':
    'Chiffré de bout en bout, par Erevos au lieu de l’opérateur.',
  'Not this Erevos contact': 'Pas ce contact Erevos',
  'One of its numbers is linked to this Erevos contact, in its chat.':
    'L’un de ses numéros est associé à ce contact Erevos, dans sa discussion.',
  'Link to an Erevos contact': 'Associer à un contact Erevos',
  "The same person in your Erevos chats: this card then shows their chat and calls. The link is sealed in Erevos, never in the phone's contacts.":
    'La même personne dans tes discussions Erevos : cette fiche affiche alors sa discussion et ses appels. L’association est scellée dans Erevos, jamais dans les contacts du téléphone.',
  'Add to contacts': 'Ajouter aux contacts',
  'History': 'Historique',
  'No calls or messages with this contact yet.': 'Pas encore d’appels ni de messages avec ce contact.',
  "Its calls show here once Erevos may read the phone's call log. Erevos only shows them, and keeps no copy.":
    'Ses appels s’affichent ici dès qu’Erevos peut lire le journal d’appels du téléphone. Erevos ne fait que les afficher, et n’en garde aucune copie.',
  'Show calls': 'Afficher les appels',
  'Incoming call, {time}': 'Appel entrant, {time}',
  'Outgoing call, {time}': 'Appel sortant, {time}',
  'Outgoing call, no answer': 'Appel sortant, sans réponse',

  // Other apps' contacts.
  'Add {what} to a contact': 'Ajouter {what} à un contact',
  'Tap the contact to add it to, or make a new one.': 'Appuie sur le contact auquel l’ajouter, ou crées-en un nouveau.',

  // A contact's Erevos ID (components/erevos-id.tsx).
  'Erevos ID': 'ID Erevos',
  'Erevos ID: {id}': 'ID Erevos : {id}',
  'That is not an Erevos ID: an Erevos ID is a contact link starting with erevos://contact':
    'Ce n’est pas un ID Erevos : un ID Erevos est un lien de contact qui commence par erevos://contact',
  'Their contact link from Erevos, to link this contact to another Erevos contact instead.':
    'Son lien de contact Erevos, pour associer plutôt ce contact à un autre contact Erevos.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Once saved, they join your Erevos chats, and the contact shows their chat and calls.':
    'Le lien de contact que montre son Erevos, sous « Copier mon lien de contact » ou en code QR. Une fois enregistré, la personne rejoint tes discussions Erevos, et le contact affiche sa discussion et ses appels.',
  "Choose them among these hidden chats' contacts: this card then shows their chat and calls.":
    'Choisis-la parmi les contacts de ces discussions cachées : cette fiche affiche alors sa discussion et ses appels.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Added here, they join your Erevos chats, and this card shows their chat and calls, end-to-end encrypted.':
    'Le lien de contact que montre son Erevos, sous « Copier mon lien de contact » ou en code QR. Ajoutée ici, la personne rejoint tes discussions Erevos, et cette fiche affiche sa discussion et ses appels, chiffrés de bout en bout.',
  'Add to Erevos': 'Ajouter à Erevos',
  'Choose from my Erevos chats': 'Choisir dans mes discussions Erevos',
  'That QR code holds no Erevos ID.': 'Ce code QR ne contient aucun ID Erevos.',
  'Take a photo of the QR code': 'Photographier le code QR',
  'Choose a photo of the QR code': 'Choisir une photo du code QR',
  'The photo could not be read. Choose another one, or take it again.': "La photo n'a pas pu être lue. Choisis-en une autre ou reprends-la.",
};
