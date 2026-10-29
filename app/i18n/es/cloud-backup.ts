// El español de las copias a un servidor (lib/backup-cloud.ts, app/backup.tsx) (i18n/es/index.ts).
export const cloudBackup: Record<string, string> = {
  'Made a backup in {folder}, but it did not go to the server. {error}': 'Copia hecha en {folder}, pero no llegó al servidor. {error}',
  'Made a backup in {folder} and sent it to {server}.': 'Copia hecha en {folder} y enviada a {server}.',
  'Stop sending to the server': 'Dejar de enviar al servidor',
  'Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.':
    'Desde ahora las copias automáticas irán solo a la carpeta. Las que ya están en el servidor se quedan allí hasta que las borres.',
  'Backups no longer go to the server.': 'Las copias ya no van al servidor.',
  'To a server too': 'También a un servidor',
  'To {server}': 'A {server}',
  'Last one sent {when}.': 'La última se envió {when}.',
  'None sent yet.': 'Todavía no se envió ninguna.',
  'Each automatic backup goes there too, and the server keeps the {n} newest.': 'Cada copia automática va también allí, y el servidor guarda las {n} más recientes.',
  'The last one did not go: {error} Erevos tries again next time it opens.': 'La última no llegó: {error} Erevos lo intenta de nuevo la próxima vez que se abra.',
  'Stop sending': 'Dejar de enviar',
  'Folder address (WebDAV)': 'Dirección de la carpeta (WebDAV)',
  'In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups':
    'En Nextcloud: Archivos → Ajustes de archivos → WebDAV da el comienzo; añade una carpeta que hayas creado para las copias, como …/remote.php/dav/files/NOMBRE/Backups',
  'User name': 'Nombre de usuario',
  "Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.":
    'Mejor una contraseña de aplicación solo para Erevos, de los ajustes de seguridad del servidor: puedes retirarla allí sin cambiar la tuya.',
  'Add a server': 'Añadir un servidor',
  'That is not a folder address. It starts with https://': 'Eso no es una dirección de carpeta. Empieza por https://',
  'The address has to start with https://, so the password and backups go encrypted.':
    'La dirección tiene que empezar por https://, para que la contraseña y las copias vayan cifradas.',
  'Put the user name and password in their own fields, not in the address.': 'Pon el nombre de usuario y la contraseña en sus propios campos, no en la dirección.',
  'The server did not take that user name and password.': 'El servidor no aceptó ese nombre de usuario y esa contraseña.',
  'That folder is not on the server. Make it there first.': 'Esa carpeta no está en el servidor. Créala allí primero.',
  'The server has no room left for it.': 'El servidor no tiene más espacio para ella.',
  'The server answered {status}.': 'El servidor respondió {status}.',
  'Could not reach the server. {error}': 'No se pudo llegar al servidor. {error}',
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.":
    "Cada copia automática puede ir también a una carpeta en un servidor que elijas, como tu Nextcloud, por WebDAV. El servidor recibe bytes aleatorios con un nombre aleatorio: no puede abrirlos ni saber que son de Erevos. Aun así ve tu cuenta, cuándo llega una y más o menos cuánto ocupa, y tu dirección, salvo que la copia vaya por Tor, como dice el ajuste de Tor del espacio. No se envía nada hasta que añadas uno.",
  "This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.":
    "Este espacio envía Todo por Tor, y aquí Tor no puede llegar a un servidor, así que no se le envió nada.",
  "Through Tor: the server does not see your address.":
    "Por Tor: el servidor no ve tu dirección.",
  "Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.":
    "Ahora no va por Tor: el servidor ve tu dirección. Tor está en Ajustes → Relay y redes → Tor.",
  "There is no Erevos backup in that folder.":
    "No hay ninguna copia de seguridad de Erevos en esa carpeta.",
  "Restore from a server":
    "Restaurar desde un servidor",
  "The folder on your server that automatic backups went to. The password is used for this restore only and not kept.":
    "La carpeta de tu servidor a la que iban las copias automáticas. La contraseña se usa solo para esta restauración y no se guarda.",
  "Look there":
    "Buscar allí",
  "Backups on {server}, newest first. Choose one, then type its password.":
    "Copias en {server}, las más recientes primero. Elige una y luego escribe su contraseña.",
};
