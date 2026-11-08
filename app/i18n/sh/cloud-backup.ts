// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
  "There is no Erevos backup in that folder.":
    "U tom folderu nema Erevos rezervne kopije.",
  "Restore from a server":
    "Vrati sa servera",
  "The folder on your server that automatic backups went to. The password is used for this restore only and not kept.":
    "Folder na vašem serveru u koji su išle automatske rezervne kopije. Lozinka se koristi samo za ovo vraćanje i ne čuva se.",
  "Look there":
    "Potraži tamo",
  "Backups on {server}, newest first. Choose one, then type its password.":
    "Rezervne kopije na {server}, najnovije prve. Izaberite jednu, pa upišite njenu lozinku.",
  "In a browser the server has to let the web app in (CORS), and this one did not, or could not be reached.":
    "U pregledniku server mora pustiti web aplikaciju (CORS), a ovaj nije, ili nije bio dostupan.",
  "Erevos forgets the server and its password here. The backups already on it stay there until you delete them.":
    "Erevos ovdje zaboravlja server i njegovu lozinku. Rezervne kopije koje su već na njemu ostaju tamo dok ih ne obrišete.",
  "Sent a backup to {server}. Keep its password: nothing opens the backup without it.":
    "Rezervna kopija je poslana na {server}. Čuvajte njenu lozinku: ništa ne otvara kopiju bez nje.",
  "Send a backup there now and then; the server keeps the {n} newest.":
    "Šaljite tamo rezervnu kopiju s vremena na vrijeme; server čuva {n} najnovije.",
  "The last one did not go: {error}":
    "Posljednja nije otišla: {error}",
  "Send a backup now":
    "Pošalji rezervnu kopiju sada",
  "A backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV, each time you send one. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Rezervna kopija može ići i u folder na serveru koji izaberete, kao vaš Nextcloud, preko WebDAV-a, svaki put kad je pošaljete. Server dobija nasumične bajtove pod nasumičnim imenom: ne može ih otvoriti niti znati da su Erevosovi. Ipak vidi vaš nalog, vašu adresu, kad jedna stigne i otprilike koliko je velika. Ništa ne ide dok ne dodate server.",
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Svaka automatska rezervna kopija može ići i u folder na serveru koji izaberete, kao vaš Nextcloud, preko WebDAV-a. Server dobija nasumične bajtove pod nasumičnim imenom: ne može ih otvoriti niti znati da su Erevosovi. Ipak vidi vaš nalog, vašu adresu, kad jedna stigne i otprilike koliko je velika. Ništa ne ide dok ne dodate server.",
  "In a browser this works only with a server set to let the web app in (CORS), which Nextcloud is not as it comes. The desktop app and Android need nothing of it.":
    "U pregledniku ovo radi samo sa serverom podešenim da pusti web aplikaciju (CORS), što Nextcloud sam po sebi nije. Aplikacija za računar i Android ne trebaju ništa od toga.",
  "A backup larger than {size} MB does not come from a server. Download it from the server and tap Restore a backup.": "Rezervna kopija veća od {size} MB ne stiže sa servera. Preuzmite je sa servera i dodirnite Vrati rezervnu kopiju.",
  "Automatic backups need a folder on {device}: choose one.":
    "Automatskim rezervnim kopijama treba folder na {device}: izaberite jedan.",
  "Sent a backup to {server}.":
    "Rezervna kopija poslana na {server}.",
  "Making the backup: photos, files and voice messages, {percent}%…":
    "Pravi se rezervna kopija: fotografije, datoteke i glasovne poruke, {percent}%…",
  "Putting back photos, files and voice messages: {percent}%…":
    "Vraćaju se fotografije, datoteke i glasovne poruke: {percent}%…",
  "Choose the files":
    "Izaberi datoteke",
  "Choose the folder":
    "Izaberi folder",
  "No folder on {device} yet":
    "Još nema foldera na {device}",
  "These automatic backups came with a backup made on another device, with their password; the folder they went to stays with that device. Choose a folder here, and they go on into it.":
    "Ove automatske rezervne kopije stigle su s rezervnom kopijom napravljenom na drugom uređaju, zajedno sa svojom lozinkom; folder u koji su išle ostaje uz taj uređaj. Izaberite folder ovdje i one nastavljaju u njega.",
  "Until then they go only to the server.":
    "Do tada idu samo na server.",
  "Choose a folder":
    "Izaberi folder",
  "What stays with each device and comes with no backup: the fingerprint, the folders Erevos may write in, what the phone lets it do and which apps make calls and send SMS. An XMPP account comes back as a new device of itself, and Matrix asks you to sign in again.":
    "Ono što ostaje uz svaki uređaj i ne dolazi ni s jednom rezervnom kopijom: otisak prsta, folderi u koje Erevos smije pisati, ono što mu telefon dozvoljava i koje aplikacije obavljaju pozive i šalju SMS. XMPP račun se vraća kao novi uređaj samog sebe, a Matrix traži da se ponovo prijavite.",
  "Its photos, files and voice messages are in {n} more file beside it, with the same start: keep them together.":
    "Njene fotografije, datoteke i glasovne poruke su u još {n} datoteci pored nje, s istim početkom imena: držite ih zajedno.",
  "Its photos, files and voice messages are in {n} more files beside it, with the same start: keep them together.":
    "Njene fotografije, datoteke i glasovne poruke su u još {n} datoteci pored nje, s istim početkom imena: držite ih zajedno. | Njene fotografije, datoteke i glasovne poruke su u još {n} datoteke pored nje, s istim početkom imena: držite ih zajedno. | Njene fotografije, datoteke i glasovne poruke su u još {n} datoteka pored nje, s istim početkom imena: držite ih zajedno.",
  "A file of this backup is not there: {name}.":
    "Jedna datoteka ove rezervne kopije nije tu: {name}.",
  "{n} files of this backup are not there, {name} among them.":
    "{n} datoteka ove rezervne kopije nije tu, među njima {name}. | {n} datoteke ove rezervne kopije nisu tu, među njima {name}. | {n} datoteka ove rezervne kopije nije tu, među njima {name}.",
  "This backup's photos, files and voice messages are in {n} more file beside it, whose name starts as its own or as an earlier backup's. Choose it.":
    "Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteci pored nje, čije ime počinje kao njeno ili kao ime neke ranije kopije. Izaberite je.",
  "This backup's photos, files and voice messages are in {n} more files beside it, whose names start as its own or as an earlier backup's. Choose them all.":
    "Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteci pored nje, čija imena počinju kao njeno ili kao ime neke ranije kopije. Izaberite ih sve. | Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteke pored nje, čija imena počinju kao njeno ili kao ime neke ranije kopije. Izaberite ih sve. | Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteka pored nje, čija imena počinju kao njeno ili kao ime neke ranije kopije. Izaberite ih sve.",
  "This backup's photos, files and voice messages are in {n} more file beside it. Choose the folder the backup is in.":
    "Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteci pored nje. Izaberite folder u kojem je rezervna kopija.",
  "This backup's photos, files and voice messages are in {n} more files beside it. Choose the folder the backup is in.":
    "Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteci pored nje. Izaberite folder u kojem je rezervna kopija. | Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteke pored nje. Izaberite folder u kojem je rezervna kopija. | Fotografije, datoteke i glasovne poruke ove rezervne kopije su u još {n} datoteka pored nje. Izaberite folder u kojem je rezervna kopija.",
  "A file of this backup is missing: {name}. Nothing was changed.":
    "Nedostaje datoteka ove rezervne kopije: {name}. Ništa nije promijenjeno.",
  "A file of this backup is damaged, or belongs to another backup: {name}. Nothing was changed.":
    "Datoteka ove rezervne kopije je oštećena ili pripada drugoj rezervnoj kopiji: {name}. Ništa nije promijenjeno.",
  "A file of this backup is damaged, or belongs to another backup: {name}.":
    "Datoteka ove rezervne kopije je oštećena ili pripada drugoj rezervnoj kopiji: {name}.",
  "Restore everything else without it? The photos, files and voice messages on {device} stay as they are, and those it holds do not come back.":
    "Vratiti sve ostalo bez nje? Fotografije, datoteke i glasovne poruke na {device} ostaju kakve jesu, a one koje ona sadrži se ne vraćaju.",
  "Restore everything else without them? The photos, files and voice messages on {device} stay as they are, and those they hold do not come back.":
    "Vratiti sve ostalo bez njih? Fotografije, datoteke i glasovne poruke na {device} ostaju kakve jesu, a one koje one sadrže se ne vraćaju. | Vratiti sve ostalo bez njih? Fotografije, datoteke i glasovne poruke na {device} ostaju kakve jesu, a one koje one sadrže se ne vraćaju. | Vratiti sve ostalo bez njih? Fotografije, datoteke i glasovne poruke na {device} ostaju kakve jesu, a one koje one sadrže se ne vraćaju.",
  "Restore the rest":
    "Vrati ostalo",
  "Restored without {n} file of the backup, {name}: the photos, files and voice messages in it did not come back.":
    "Vraćeno bez {n} datoteke rezervne kopije, {name}: fotografije, datoteke i glasovne poruke u njoj nisu se vratile.",
  "Restored without {n} files of the backup, {name} among them: the photos, files and voice messages in them did not come back.":
    "Vraćeno bez {n} datoteke rezervne kopije, među njima {name}: fotografije, datoteke i glasovne poruke u njima nisu se vratile. | Vraćeno bez {n} datoteke rezervne kopije, među njima {name}: fotografije, datoteke i glasovne poruke u njima nisu se vratile. | Vraćeno bez {n} datoteka rezervne kopije, među njima {name}: fotografije, datoteke i glasovne poruke u njima nisu se vratile.",
};
