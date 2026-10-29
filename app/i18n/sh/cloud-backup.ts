// Srpskohrvatski za rezervne kopije na serveru (lib/backup-cloud.ts, app/backup.tsx) (i18n/sh/index.ts).
export const cloudBackup: Record<string, string> = {
  'Made a backup in {folder}, but it did not go to the server. {error}': 'Rezervna kopija napravljena u {folder}, ali nije otišla na server. {error}',
  'Made a backup in {folder} and sent it to {server}.': 'Rezervna kopija napravljena u {folder} i poslana na {server}.',
  'Stop sending to the server': 'Prestani slati na server',
  'Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.':
    'Automatske rezervne kopije od sada idu samo u folder. One koje su već na serveru ostaju tamo dok ih ne obrišete.',
  'Backups no longer go to the server.': 'Rezervne kopije više ne idu na server.',
  'To a server too': 'I na server',
  'To {server}': 'Na {server}',
  'Last one sent {when}.': 'Zadnja poslana {when}.',
  'None sent yet.': 'Još nijedna nije poslana.',
  'Each automatic backup goes there too, and the server keeps the {n} newest.': 'Svaka automatska rezervna kopija ide i tamo, a server čuva {n} najnovije.',
  'The last one did not go: {error} Erevos tries again next time it opens.': 'Zadnja nije otišla: {error} Erevos pokušava ponovo sljedeći put kad se otvori.',
  'Stop sending': 'Prestani slati',
  'Folder address (WebDAV)': 'Adresa foldera (WebDAV)',
  'In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups':
    'U Nextcloudu: Datoteke → Postavke datoteka → WebDAV daje početak; dodajte folder koji ste napravili za rezervne kopije, npr. …/remote.php/dav/files/IME/Backups',
  'User name': 'Korisničko ime',
  "Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.":
    'Najbolje lozinka aplikacije samo za Erevos, iz sigurnosnih postavki servera: tamo je možete povući bez mijenjanja svoje.',
  'Add a server': 'Dodaj server',
  'That is not a folder address. It starts with https://': 'To nije adresa foldera. Počinje sa https://',
  'The address has to start with https://, so the password and backups go encrypted.': 'Adresa mora počinjati sa https://, da lozinka i rezervne kopije idu šifrovane.',
  'Put the user name and password in their own fields, not in the address.': 'Upišite korisničko ime i lozinku u njihova polja, ne u adresu.',
  'The server did not take that user name and password.': 'Server nije prihvatio to korisničko ime i lozinku.',
  'That folder is not on the server. Make it there first.': 'Tog foldera nema na serveru. Prvo ga napravite tamo.',
  'The server has no room left for it.': 'Server nema više mjesta za nju.',
  'The server answered {status}.': 'Server je odgovorio {status}.',
  'Could not reach the server. {error}': 'Server nije dostupan. {error}',
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.":
    "Svaka automatska rezervna kopija može ići i u folder na serveru koji izaberete, kao vaš Nextcloud, preko WebDAV-a. Server dobija nasumične bajtove pod nasumičnim imenom: ne može ih otvoriti niti znati da su Erevosovi. Ipak vidi vaš nalog, kad jedna stigne i otprilike koliko je velika, i vašu adresu, osim ako kopija ide preko Tora, kako kaže Tor postavka prostora. Ništa ne ide dok ne dodate server.",
  "This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.":
    "Ovaj prostor šalje Sve preko Tora, a Tor ovdje ne može doći do servera, pa ništa nije otišlo.",
  "Through Tor: the server does not see your address.":
    "Preko Tora: server ne vidi vašu adresu.",
  "Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.":
    "Trenutno ne preko Tora: server vidi vašu adresu. Tor je u Postavke → Relay i mreže → Tor.",
};
