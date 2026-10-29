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
  "Backups to a server do not work here yet.":
    "Backups auf einen Server gehen hier noch nicht.",
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
};
