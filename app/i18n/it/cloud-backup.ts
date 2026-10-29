// L’italiano dei backup su un server (lib/backup-cloud.ts, app/backup.tsx) (i18n/it/index.ts).
export const cloudBackup: Record<string, string> = {
  'Made a backup in {folder}, but it did not go to the server. {error}': 'Backup fatto in {folder}, ma non è arrivato al server. {error}',
  'Made a backup in {folder} and sent it to {server}.': 'Backup fatto in {folder} e inviato a {server}.',
  'Stop sending to the server': 'Smetti di inviare al server',
  'Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.':
    'D’ora in poi i backup automatici andranno solo nella cartella. Quelli già sul server restano lì finché non li cancelli.',
  'Backups no longer go to the server.': 'I backup non vanno più al server.',
  'To a server too': 'Anche su un server',
  'To {server}': 'A {server}',
  'Last one sent {when}.': 'L’ultimo inviato {when}.',
  'None sent yet.': 'Nessuno inviato ancora.',
  'Each automatic backup goes there too, and the server keeps the {n} newest.': 'Ogni backup automatico va anche lì, e il server tiene i {n} più recenti.',
  'The last one did not go: {error} Erevos tries again next time it opens.': 'L’ultimo non è partito: {error} Erevos riprova la prossima volta che si apre.',
  'Stop sending': 'Smetti di inviare',
  'Folder address (WebDAV)': 'Indirizzo della cartella (WebDAV)',
  'In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups':
    'In Nextcloud: File → Impostazioni file → WebDAV dà l’inizio; aggiungi una cartella creata per i backup, come …/remote.php/dav/files/NOME/Backups',
  'User name': 'Nome utente',
  "Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.":
    'Meglio una password per app solo per Erevos, dalle impostazioni di sicurezza del server: puoi revocarla lì senza cambiare la tua.',
  'Add a server': 'Aggiungi un server',
  'That is not a folder address. It starts with https://': 'Questo non è l’indirizzo di una cartella. Inizia con https://',
  'The address has to start with https://, so the password and backups go encrypted.': 'L’indirizzo deve iniziare con https://, così password e backup viaggiano cifrati.',
  'Put the user name and password in their own fields, not in the address.': 'Metti nome utente e password nei loro campi, non nell’indirizzo.',
  'The server did not take that user name and password.': 'Il server non ha accettato questo nome utente e questa password.',
  'That folder is not on the server. Make it there first.': 'Questa cartella non è sul server. Creala prima lì.',
  'The server has no room left for it.': 'Il server non ha più spazio per esso.',
  'The server answered {status}.': 'Il server ha risposto {status}.',
  'Could not reach the server. {error}': 'Impossibile raggiungere il server. {error}',
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.":
    "Ogni backup automatico può andare anche in una cartella su un server che scegli tu, come il tuo Nextcloud, via WebDAV. Il server riceve byte casuali con un nome casuale: non può aprirli né capire che sono di Erevos. Vede comunque il tuo account, quando ne arriva uno e più o meno quanto è grande, e il tuo indirizzo, a meno che il backup non passi per Tor, come dice l'impostazione Tor dello spazio. Non parte nulla finché non ne aggiungi uno.",
  "This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.":
    "Questo spazio invia Tutto tramite Tor, e qui Tor non può raggiungere un server, quindi non gli è andato nulla.",
  "Through Tor: the server does not see your address.":
    "Tramite Tor: il server non vede il tuo indirizzo.",
  "Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.":
    "Ora non tramite Tor: il server vede il tuo indirizzo. Tor è in Impostazioni → Relay e reti → Tor.",
};
