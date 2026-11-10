// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Das Deutsche für Backups auf einen Server (lib/backup-cloud.ts, app/backup.tsx) (i18n/de/index.ts).
export const cloudBackup: Record<string, string> = {
  'Made a backup in {folder}, but it did not go to the server. {error}': 'Backup in {folder} gemacht, aber es ging nicht an den Server. {error}',
  'Made a backup in {folder} and sent it to {server}.': 'Backup in {folder} gemacht und an {server} gesendet.',
  'Stop sending to the server': 'Nicht mehr an den Server senden',
  'Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.':
    'Automatische Backups gehen ab jetzt nur in den Ordner. Die schon auf dem Server bleiben dort, bis du sie löschst.',
  'Backups no longer go to the server.': 'Backups gehen nicht mehr an den Server.',
  'To a server too': 'Auch auf einen Server',
  'To {server}': 'An {server}',
  'Last one sent {when}.': 'Das letzte gesendet {when}.',
  'None sent yet.': 'Noch keines gesendet.',
  'Each automatic backup goes there too, and the server keeps the {n} newest.': 'Jedes automatische Backup geht auch dorthin, und der Server behält die {n} neuesten.',
  'The last one did not go: {error} Erevos tries again next time it opens.': 'Das letzte ging nicht: {error} Erevos versucht es wieder, wenn es das nächste Mal öffnet.',
  'Stop sending': 'Nicht mehr senden',
  'Folder address (WebDAV)': 'Ordneradresse (WebDAV)',
  'In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups':
    'In Nextcloud: Dateien → Datei-Einstellungen → WebDAV gibt den Anfang; füge einen Ordner an, den du für Backups gemacht hast, etwa …/remote.php/dav/files/NAME/Backups',
  'User name': 'Benutzername',
  "Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.":
    'Am besten ein App-Passwort nur für Erevos, aus den Sicherheitseinstellungen des Servers: Du kannst es dort zurücknehmen, ohne dein eigenes zu ändern.',
  'Add a server': 'Server hinzufügen',
  'That is not a folder address. It starts with https://': 'Das ist keine Ordneradresse. Sie beginnt mit https://',
  'The address has to start with https://, so the password and backups go encrypted.': 'Die Adresse muss mit https:// beginnen, damit Passwort und Backups verschlüsselt gehen.',
  'Put the user name and password in their own fields, not in the address.': 'Gib Benutzername und Passwort in ihren eigenen Feldern ein, nicht in der Adresse.',
  'The server did not take that user name and password.': 'Der Server hat diesen Benutzernamen und dieses Passwort nicht angenommen.',
  'That folder is not on the server. Make it there first.': 'Diesen Ordner gibt es auf dem Server nicht. Lege ihn dort zuerst an.',
  'The server has no room left for it.': 'Der Server hat keinen Platz mehr dafür.',
  'The server answered {status}.': 'Der Server antwortete {status}.',
  'Could not reach the server. {error}': 'Der Server war nicht erreichbar. {error}',
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.":
    "Jedes automatische Backup kann auch in einen Ordner auf einem Server deiner Wahl gehen, etwa deiner Nextcloud, über WebDAV. Der Server bekommt zufällige Bytes unter einem zufälligen Namen: Er kann sie nicht öffnen und nicht erkennen, dass sie von Erevos sind. Er sieht aber dein Konto, wann eines kommt und ungefähr wie groß es ist, und deine Adresse, außer das Backup geht über Tor, wie die Tor-Einstellung des Bereichs sagt. Nichts geht los, bis du einen hinzufügst.",
  "This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.":
    "Dieser Bereich sendet Alles über Tor, und Tor kann hier keinen Server erreichen, also ging nichts dorthin.",
  "Through Tor: the server does not see your address.":
    "Über Tor: Der Server sieht deine Adresse nicht.",
  "Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.":
    "Gerade nicht über Tor: Der Server sieht deine Adresse. Tor findest du unter Einstellungen → Relay und Netze → Tor.",
  "There is no Erevos backup in that folder.":
    "In diesem Ordner ist kein Erevos-Backup.",
  "Restore from a server":
    "Von einem Server wiederherstellen",
  "The folder on your server that automatic backups went to. The password is used for this restore only and not kept.":
    "Der Ordner auf deinem Server, in den die automatischen Backups gingen. Das Passwort wird nur für diese Wiederherstellung benutzt und nicht aufbewahrt.",
  "Look there":
    "Dort nachsehen",
  "Backups on {server}, newest first. Choose one, then type its password.":
    "Backups auf {server}, die neuesten zuerst. Wähle eines und gib dann sein Passwort ein.",
  "In a browser the server has to let the web app in (CORS), and this one did not, or could not be reached.":
    "In einem Browser muss der Server die Web-App hereinlassen (CORS), und dieser tat es nicht oder war nicht erreichbar.",
  "Erevos forgets the server and its password here. The backups already on it stay there until you delete them.":
    "Erevos vergisst hier den Server und sein Passwort. Die Backups, die schon darauf sind, bleiben dort, bis du sie löschst.",
  "Sent a backup to {server}. Keep its password: nothing opens the backup without it.":
    "Ein Backup ging an {server}. Bewahre sein Passwort auf: Ohne es öffnet nichts das Backup.",
  "Send a backup there now and then; the server keeps the {n} newest.":
    "Schick ab und zu ein Backup dorthin; der Server behält die {n} neuesten.",
  "The last one did not go: {error}":
    "Das letzte ging nicht: {error}",
  "Send a backup now":
    "Jetzt ein Backup senden",
  "A backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV, each time you send one. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Ein Backup kann auch in einen Ordner auf einem Server deiner Wahl gehen, etwa deiner Nextcloud, über WebDAV, jedes Mal, wenn du eines sendest. Der Server bekommt zufällige Bytes unter einem zufälligen Namen: Er kann sie nicht öffnen und nicht erkennen, dass sie von Erevos sind. Er sieht aber dein Konto, deine Adresse, wann eines kommt und ungefähr wie groß es ist. Nichts geht los, bis du einen hinzufügst.",
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, your address, when one comes and roughly how big it is. Nothing goes until you add one.":
    "Jedes automatische Backup kann auch in einen Ordner auf einem Server deiner Wahl gehen, etwa deiner Nextcloud, über WebDAV. Der Server bekommt zufällige Bytes unter einem zufälligen Namen: Er kann sie nicht öffnen und nicht erkennen, dass sie von Erevos sind. Er sieht aber dein Konto, deine Adresse, wann eines kommt und ungefähr wie groß es ist. Nichts geht los, bis du einen hinzufügst.",
  "In a browser this works only with a server set to let the web app in (CORS), which Nextcloud is not as it comes. The desktop app and Android need nothing of it.":
    "In einem Browser geht das nur mit einem Server, der so eingestellt ist, dass er die Web-App hereinlässt (CORS), was Nextcloud von Haus aus nicht ist. Die Desktop-App und Android brauchen nichts davon.",
  "A backup larger than {size} MB does not come from a server. Download it from the server and tap Restore a backup.": "Ein Backup über {size} MB kommt nicht von einem Server. Lade es vom Server herunter und tippe auf Backup wiederherstellen.",
  "Automatic backups need a folder on {device}: choose one.":
    "Automatische Backups brauchen einen Ordner auf {device}: Wähle einen.",
  "Sent a backup to {server}.":
    "Backup an {server} gesendet.",
  "Making the backup: photos, files and voice messages, {percent}%…":
    "Backup wird erstellt: Fotos, Dateien und Sprachnachrichten, {percent} %…",
  "Putting back photos, files and voice messages: {percent}%…":
    "Fotos, Dateien und Sprachnachrichten werden wiederhergestellt: {percent} %…",
  "Choose the files":
    "Dateien wählen",
  "Choose the folder":
    "Ordner wählen",
  "No folder on {device} yet":
    "Noch kein Ordner auf {device}",
  "These automatic backups came with a backup made on another device, with their password; the folder they went to stays with that device. Choose a folder here, and they go on into it.":
    "Diese automatischen Backups kamen mit einem Backup von einem anderen Gerät, samt ihrem Passwort; der Ordner, in den sie gingen, bleibt bei jenem Gerät. Wähle hier einen Ordner, dann gehen sie dort weiter.",
  "Until then they go only to the server.":
    "Bis dahin gehen sie nur an den Server.",
  "Choose a folder":
    "Einen Ordner wählen",
  "What stays with each device and comes with no backup: the fingerprint, the folders Erevos may write in, what the phone lets it do and which apps make calls and send SMS. An XMPP account comes back as a new device of itself, and Matrix asks you to sign in again.":
    "Was bei jedem Gerät bleibt und mit keinem Backup kommt: der Fingerabdruck, die Ordner, in die Erevos schreiben darf, was das Telefon ihm erlaubt und welche Apps Anrufe und SMS übernehmen. Ein XMPP-Konto kommt als neues Gerät seiner selbst zurück, und Matrix bittet dich, dich erneut anzumelden.",
  "Its photos, files and voice messages are in {n} more file beside it, with the same start: keep them together.":
    "Seine Fotos, Dateien und Sprachnachrichten sind in {n} weiteren Datei daneben, mit demselben Anfang: Halte sie zusammen.",
  "Its photos, files and voice messages are in {n} more files beside it, with the same start: keep them together.":
    "Seine Fotos, Dateien und Sprachnachrichten sind in {n} weiteren Dateien daneben, mit demselben Anfang: Halte sie zusammen.",
  "A file of this backup is not there: {name}.":
    "Eine Datei dieses Backups ist nicht da: {name}.",
  "{n} files of this backup are not there, {name} among them.":
    "{n} Dateien dieses Backups sind nicht da, darunter {name}.",
  "This backup's photos, files and voice messages are in {n} more file beside it, whose name starts as its own or as an earlier backup's. Choose it.":
    "Die Fotos, Dateien und Sprachnachrichten dieses Backups sind in {n} weiteren Datei daneben, deren Name wie seiner oder wie der eines früheren Backups anfängt. Wähle sie.",
  "This backup's photos, files and voice messages are in {n} more files beside it, whose names start as its own or as an earlier backup's. Choose them all.":
    "Die Fotos, Dateien und Sprachnachrichten dieses Backups sind in {n} weiteren Dateien daneben, deren Namen wie seiner oder wie der eines früheren Backups anfangen. Wähle sie alle.",
  "This backup's photos, files and voice messages are in {n} more file beside it. Choose the folder the backup is in.":
    "Die Fotos, Dateien und Sprachnachrichten dieses Backups sind in {n} weiteren Datei daneben. Wähle den Ordner, in dem das Backup liegt.",
  "This backup's photos, files and voice messages are in {n} more files beside it. Choose the folder the backup is in.":
    "Die Fotos, Dateien und Sprachnachrichten dieses Backups sind in {n} weiteren Dateien daneben. Wähle den Ordner, in dem das Backup liegt.",
  "A file of this backup is missing: {name}. Nothing was changed.":
    "Eine Datei dieses Backups fehlt: {name}. Nichts wurde geändert.",
  "A file of this backup is damaged, or belongs to another backup: {name}. Nothing was changed.":
    "Eine Datei dieses Backups ist beschädigt oder gehört zu einem anderen Backup: {name}. Nichts wurde geändert.",
  "A file of this backup is damaged, or belongs to another backup: {name}.":
    "Eine Datei dieses Backups ist beschädigt oder gehört zu einem anderen Backup: {name}.",
  "Restore everything else without it? The photos, files and voice messages on {device} stay as they are, and those it holds do not come back.":
    "Alles andere ohne sie wiederherstellen? Die Fotos, Dateien und Sprachnachrichten auf {device} bleiben, wie sie sind, und die in ihr kommen nicht zurück.",
  "Restore everything else without them? The photos, files and voice messages on {device} stay as they are, and those they hold do not come back.":
    "Alles andere ohne sie wiederherstellen? Die Fotos, Dateien und Sprachnachrichten auf {device} bleiben, wie sie sind, und die in ihnen kommen nicht zurück.",
  "Restore the rest":
    "Den Rest wiederherstellen",
  "Restored without {n} file of the backup, {name}: the photos, files and voice messages in it did not come back.":
    "Ohne {n} Datei des Backups wiederhergestellt, {name}: Die Fotos, Dateien und Sprachnachrichten darin kamen nicht zurück.",
  "Restored without {n} files of the backup, {name} among them: the photos, files and voice messages in them did not come back.":
    "Ohne {n} Dateien des Backups wiederhergestellt, darunter {name}: Die Fotos, Dateien und Sprachnachrichten darin kamen nicht zurück.",
  "What takes room":
    "Was Platz belegt",
  "How much room Erevos takes on {device}, by kind: each automatic backup holds it all. Only the files’ names and sizes are looked at, here, and nothing is sent.":
    "Wie viel Platz Erevos auf {device} belegt, nach Art: Jedes automatische Backup enthält alles davon. Nur Namen und Größen der Dateien werden angesehen, hier, und nichts wird gesendet.",
  "In all: {size}":
    "Insgesamt: {size}",
  "Measure":
    "Messen",
  "Measure again":
    "Erneut messen",
  "The Collection, and photos and files in chats":
    "Die Sammlung sowie Fotos und Dateien in Chats",
  "Contact pictures":
    "Kontaktbilder",
  "Chat history":
    "Chatverlauf",
  "Backups kept inside Erevos":
    "Backups in Erevos selbst",
  "Left over from writes that did not end":
    "Reste unvollendeter Schreibvorgänge",
  "Cache":
    "Cache",
  "Other: {name}":
    "Sonstiges: {name}",
  "Some of what a place keeps could not be read, so nothing is taken for a leftover. Try again later.":
    "Einiges, was ein Ort aufbewahrt, ließ sich nicht lesen, daher gilt nichts als Rest. Versuche es später noch einmal.",
  "Nothing opens with that. Check it and type it again.":
    "Damit öffnet sich nichts. Prüfe es und gib es erneut ein.",
  "Opened, and it is read with the rest.":
    "Geöffnet, und es wird mit dem Rest gelesen.",
  "That one is read already.":
    "Das wird schon gelesen.",
  "Delete the leftovers?":
    "Die Reste löschen?",
  "{size} of photos and files that none of the places read here names (places read: {n}). A place you did not open here loses its photos and files for good: open every one first. Backups already made keep them.":
    "{size} an Fotos und Dateien, die keiner der hier gelesenen Orte nennt (gelesene Orte: {n}). Ein Ort, den du hier nicht geöffnet hast, verliert seine Fotos und Dateien für immer: Öffne zuerst alle. Bereits erstellte Backups behalten sie.",
  "{size} freed.":
    "{size} freigegeben.",
  "Photos and files that nothing on the phone names any more, as those of an import that stopped in its middle, stay on it and in every backup. Only a place opened with its key can say which are its own: so first type here, one at a time, the PIN of each of your hidden chats and the password of any other space you have. This space is read by itself. Nothing is deleted before you see how much and say so; a file written in the last day is never taken.":
    "Fotos und Dateien, die nichts auf dem Telefon mehr nennt, etwa die eines Imports, der mittendrin abbrach, bleiben darauf und in jedem Backup. Nur ein mit seinem Schlüssel geöffneter Ort kann sagen, welche ihm gehören: Gib deshalb hier zuerst, einzeln, die PIN jedes deiner versteckten Chats und das Passwort jedes anderen Bereichs ein, den du hast. Dieser Bereich wird von selbst gelesen. Nichts wird gelöscht, bevor du siehst, wie viel es ist, und zustimmst; eine Datei, die am letzten Tag geschrieben wurde, wird nie erfasst.",
  "PIN or password":
    "PIN oder Passwort",
  "Read with this space: {n}":
    "Mit diesem Bereich gelesen: {n}",
  "Leftovers: {size} in {n} chunks.":
    "Reste: {size} in {n} Teilen.",
  "No leftovers.":
    "Keine Reste.",
  "Find leftovers":
    "Reste suchen",
  "Delete them":
    "Sie löschen",
  "Leftovers":
    "Reste",
};
