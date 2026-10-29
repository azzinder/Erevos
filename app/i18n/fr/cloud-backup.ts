// Le français des sauvegardes vers un serveur (lib/backup-cloud.ts, app/backup.tsx) (i18n/fr/index.ts).
export const cloudBackup: Record<string, string> = {
  'Made a backup in {folder}, but it did not go to the server. {error}': 'Sauvegarde faite dans {folder}, mais elle n’est pas partie vers le serveur. {error}',
  'Made a backup in {folder} and sent it to {server}.': 'Sauvegarde faite dans {folder} et envoyée à {server}.',
  'Stop sending to the server': 'Ne plus envoyer au serveur',
  'Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.':
    'Les sauvegardes automatiques iront désormais seulement dans le dossier. Celles déjà sur le serveur y restent jusqu’à ce que tu les supprimes.',
  'Backups no longer go to the server.': 'Les sauvegardes ne vont plus au serveur.',
  'To a server too': 'Aussi vers un serveur',
  'To {server}': 'Vers {server}',
  'Last one sent {when}.': 'La dernière envoyée {when}.',
  'None sent yet.': 'Aucune envoyée encore.',
  'Each automatic backup goes there too, and the server keeps the {n} newest.': 'Chaque sauvegarde automatique y va aussi, et le serveur garde les {n} plus récentes.',
  'The last one did not go: {error} Erevos tries again next time it opens.': 'La dernière n’est pas partie : {error} Erevos réessaie la prochaine fois qu’il s’ouvre.',
  'Stop sending': 'Ne plus envoyer',
  'Folder address (WebDAV)': 'Adresse du dossier (WebDAV)',
  'In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups':
    'Dans Nextcloud : Fichiers → Paramètres des fichiers → WebDAV donne le début ; ajoute un dossier que tu as créé pour les sauvegardes, comme …/remote.php/dav/files/NOM/Backups',
  'User name': 'Nom d’utilisateur',
  "Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.":
    'Mieux vaut un mot de passe d’application rien que pour Erevos, pris dans les paramètres de sécurité du serveur : tu peux le retirer là-bas sans changer le tien.',
  'Add a server': 'Ajouter un serveur',
  'That is not a folder address. It starts with https://': 'Ce n’est pas une adresse de dossier. Elle commence par https://',
  'The address has to start with https://, so the password and backups go encrypted.':
    'L’adresse doit commencer par https://, pour que le mot de passe et les sauvegardes passent chiffrés.',
  'Put the user name and password in their own fields, not in the address.': 'Mets le nom d’utilisateur et le mot de passe dans leurs propres champs, pas dans l’adresse.',
  'The server did not take that user name and password.': 'Le serveur n’a pas accepté ce nom d’utilisateur et ce mot de passe.',
  'That folder is not on the server. Make it there first.': 'Ce dossier n’est pas sur le serveur. Crée-le d’abord là-bas.',
  'The server has no room left for it.': 'Le serveur n’a plus de place pour elle.',
  'The server answered {status}.': 'Le serveur a répondu {status}.',
  'Could not reach the server. {error}': 'Impossible de joindre le serveur. {error}',
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.":
    "Chaque sauvegarde automatique peut aussi aller dans un dossier sur un serveur de ton choix, comme ton Nextcloud, par WebDAV. Le serveur reçoit des octets aléatoires sous un nom aléatoire : il ne peut ni les ouvrir ni savoir qu’ils sont d’Erevos. Il voit quand même ton compte, quand une arrive et à peu près sa taille, et ton adresse, sauf si la sauvegarde passe par Tor, comme le dit le réglage Tor de l’espace. Rien ne part tant que tu n’en ajoutes pas un.",
  "This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.":
    "Cet espace envoie Tout par Tor, et ici Tor ne peut pas joindre de serveur : rien n’y est allé.",
  "Through Tor: the server does not see your address.":
    "Par Tor : le serveur ne voit pas ton adresse.",
  "Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.":
    "Pas par Tor en ce moment : le serveur voit ton adresse. Tor se trouve dans Réglages → Relais et réseaux → Tor.",
  "There is no Erevos backup in that folder.":
    "Il n’y a aucune sauvegarde Erevos dans ce dossier.",
  "Restore from a server":
    "Restaurer depuis un serveur",
  "The folder on your server that automatic backups went to. The password is used for this restore only and not kept.":
    "Le dossier de ton serveur où allaient les sauvegardes automatiques. Le mot de passe sert seulement à cette restauration et n’est pas gardé.",
  "Look there":
    "Chercher là",
  "Backups on {server}, newest first. Choose one, then type its password.":
    "Sauvegardes sur {server}, les plus récentes d’abord. Choisis-en une, puis tape son mot de passe.",
  "Backups to a server do not work here yet.":
    "Les sauvegardes vers un serveur ne marchent pas encore ici.",
  "In a browser the server has to let the web app in (CORS), and this one did not, or could not be reached.":
    "Dans un navigateur, le serveur doit laisser entrer l’app web (CORS), et celui-ci ne l’a pas fait ou n’a pas pu être joint.",
  "Erevos forgets the server and its password here. The backups already on it stay there until you delete them.":
    "Erevos oublie ici le serveur et son mot de passe. Les sauvegardes déjà dessus y restent jusqu’à ce que tu les supprimes.",
  "Sent a backup to {server}. Keep its password: nothing opens the backup without it.":
    "Une sauvegarde est partie vers {server}. Garde son mot de passe : rien n’ouvre la sauvegarde sans lui.",
  "Send a backup there now and then; the server keeps the {n} newest.":
    "Envoies-y une sauvegarde de temps en temps ; le serveur garde les {n} plus récentes.",
  "The last one did not go: {error}":
    "La dernière n’est pas partie : {error}",
  "Send a backup now":
    "Envoyer une sauvegarde maintenant",
  "A backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV, each time you send one. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Une sauvegarde peut aussi aller dans un dossier sur un serveur de ton choix, comme ton Nextcloud, par WebDAV, chaque fois que tu en envoies une. Le serveur reçoit des octets aléatoires sous un nom aléatoire : il ne peut ni les ouvrir ni savoir qu’ils sont d’Erevos. Il voit quand même ton compte, ton adresse, quand une arrive et à peu près sa taille. Rien ne part tant que tu n’en ajoutes pas un.",
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Chaque sauvegarde automatique peut aussi aller dans un dossier sur un serveur de ton choix, comme ton Nextcloud, par WebDAV. Le serveur reçoit des octets aléatoires sous un nom aléatoire : il ne peut ni les ouvrir ni savoir qu’ils sont d’Erevos. Il voit quand même ton compte, ton adresse, quand une arrive et à peu près sa taille. Rien ne part tant que tu n’en ajoutes pas un.",
  "In a browser this works only with a server set to let the web app in (CORS), which Nextcloud is not as it comes. The desktop app and Android need nothing of it.":
    "Dans un navigateur, cela ne marche qu’avec un serveur réglé pour laisser entrer l’app web (CORS), ce que Nextcloud n’est pas de base. L’app de bureau et Android n’en ont pas besoin.",
};
