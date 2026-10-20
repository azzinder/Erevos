// The Spanish of the Contacts screens: the phone's contacts, their groups, merging, vCards, QR codes,
// birthdays and contacts kept only in Erevos (app/contacts.tsx and what goes with it) (i18n/es/index.ts).
export const contacts: Record<string, string> = {
  "The phone's contacts, their groups and birthdays": 'Los contactos del teléfono, sus grupos y cumpleaños',
  'This build of Erevos has no contacts part yet. It comes with the next build of the app.': 'Esta versión de Erevos aún no tiene la parte de contactos. Llegará con la próxima versión de la app.',
  "Only Erevos on Android reads the phone's contacts.": 'Solo Erevos en Android lee los contactos del teléfono.',
  'Search contacts': 'Buscar contactos',
  "Erevos may not read the phone's contacts yet": 'Erevos aún no tiene permiso para leer los contactos del teléfono',
  "Erevos reads and changes them only in Android's own contacts, where they stay for your other apps. It sends them nowhere.":
    'Erevos solo los lee y los cambia en los contactos del propio Android, donde siguen estando para tus otras apps. No los envía a ningún sitio.',
  'Allow contacts': 'Permitir contactos',
  "Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info.":
    'Sin esto, Erevos no puede mostrar los contactos del teléfono. Permite «Contactos» en la información de la aplicación de Erevos.',
  "The phone's contacts could not be read: {error}": 'No se han podido leer los contactos del teléfono: {error}',
  'No contact has “{query}” in it.': 'Ningún contacto contiene «{query}».',
  'No favourites yet. Tap the star on a contact.': 'Aún no hay favoritos. Toca la estrella de un contacto.',
  'No contacts yet.': 'Aún no hay contactos.',
  "These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them. Those with a lock are kept only in Erevos, sealed in this space.":
    'Son los contactos del teléfono, guardados en los contactos del propio Android: los ve cualquier app con permiso para leerlos, y una cuenta (Google) puede sincronizarlos. Los que tienen un candado se guardan solo en Erevos, sellados en este espacio.',
  'New contact': 'Contacto nuevo',

  // One contact.
  'This contact is no longer on the phone.': 'Este contacto ya no está en el teléfono.',
  'Delete contact': 'Eliminar contacto',
  'Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.':
    '¿Eliminar a {name} del teléfono? Se elimina de todas las cuentas donde está guardado, y no se podrá recuperar.',
  'Remove from favourites': 'Quitar de favoritos',
  'Add to favourites': 'Añadir a favoritos',
  'Favourite': 'Favorito',
  'Birthday': 'Cumpleaños',
  'Note': 'Nota',
  'Edit': 'Editar',
  'Mobile': 'Móvil',
  'Home': 'Casa',
  'Work': 'Trabajo',
  'Main': 'Principal',
  'Fax': 'Fax',
  'Pager': 'Buscapersonas',
  'Other': 'Otro',
  'Birthday today, turns {age}': 'Cumpleaños hoy: cumple {age}',
  'Birthday today': 'Cumpleaños hoy',
  'Birthday tomorrow, turns {age}': 'Cumpleaños mañana: cumple {age}',
  'Birthday tomorrow': 'Cumpleaños mañana',
  'Birthday in {n} days, turns {age}': 'Cumpleaños dentro de {n} días: cumple {age}',
  'Birthday in {n} days': 'Cumpleaños dentro de {n} días',
  'Add a photo': 'Añadir una foto',
  'Choose a photo': 'Elegir una foto',
  'Remove the photo': 'Quitar la foto',
  "The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.":
    'La foto se guarda con el contacto en los contactos de Android, donde el teléfono la muestra cuando te llama, y su cuenta (Google) la sincroniza.',
  'Ringtone': 'Tono de llamada',
  "The phone's own": 'El del teléfono',
  'A ringtone of its own': 'Un tono propio',
  'Choose ringtone': 'Elegir tono de llamada',

  // Writing a contact.
  'Edit contact': 'Editar contacto',
  'First name': 'Nombre',
  'Last name': 'Apellidos',
  'Company': 'Empresa',
  'Job title': 'Cargo',
  'Phone numbers': 'Números de teléfono',
  'Add a number': 'Añadir un número',
  'Emails': 'Correos electrónicos',
  'Add an email': 'Añadir un correo',
  'Addresses': 'Direcciones',
  'Add an address': 'Añadir una dirección',
  'Day/month/year, or day/month without the year.': 'Día/mes/año, o día/mes sin el año.',
  'Write the birthday as day/month/year, or day/month.': 'Escribe el cumpleaños como día/mes/año, o día/mes.',
  'Give the contact a name, a number or an email.': 'Ponle al contacto un nombre, un número o un correo.',
  'Kept in': 'Guardado en',
  'On this phone only': 'Solo en este teléfono',
  "In Android's contacts, synced with {account}.": 'En los contactos de Android, sincronizado con {account}.',
  "In Android's contacts on this phone, synced nowhere.": 'En los contactos de Android de este teléfono, sin sincronizar con nada.',

  // Groups.
  'Groups': 'Grupos',
  'Family, Work, and your own: make, rename, who is in them': 'Familia, Trabajo y los tuyos: crearlos, cambiarles el nombre, quién está en ellos',
  "Android's own groups of contacts, such as Family or Work. Your other apps see them too, and an account (Google) syncs its own.":
    'Los grupos de contactos del propio Android, como Familia o Trabajo. Tus otras apps también los ven, y una cuenta (Google) sincroniza los suyos.',
  'No groups yet.': 'Aún no hay grupos.',
  'Group without a name': 'Grupo sin nombre',
  'Family': 'Familia',
  'A contact joins a group only in the account the group is kept in.': 'Un contacto solo puede entrar en un grupo dentro de la cuenta donde está guardado el grupo.',
  'The group could not be made. {error}': 'No se ha podido crear el grupo. {error}',
  'This group is no longer on the phone.': 'Este grupo ya no está en el teléfono.',
  'Delete group': 'Eliminar grupo',
  'Delete the group {name}? Its contacts stay on the phone.': '¿Eliminar el grupo {name}? Sus contactos se quedan en el teléfono.',
  'Add contacts': 'Añadir contactos',
  'No one in this group yet.': 'Aún no hay nadie en este grupo.',
  'Take {name} out of the group': 'Sacar a {name} del grupo',
  '{n} contact could not join: it is kept in another account than this group.': '{n} contacto no ha podido entrar: está guardado en otra cuenta que la de este grupo.',
  '{n} contacts could not join: they are kept in another account than this group.': '{n} contactos no han podido entrar: están guardados en otra cuenta que la de este grupo.',
  'Add {n} contact': 'Añadir {n} contacto',
  'Add {n} contacts': 'Añadir {n} contactos',
  'In no group': 'En ningún grupo',
  'Choose groups': 'Elegir grupos',
  'No groups yet. Make one under Groups in the menu of Contacts.': 'Aún no hay grupos. Crea uno en «Grupos», en el menú de «Contactos».',
  '{name} is kept in another account than the group {group}, so it cannot join it.': '{name} está guardado en otra cuenta que la del grupo {group}, así que no puede entrar en él.',

  // vCard files.
  'Import from a .vcf file': 'Importar de un archivo .vcf',
  'Contacts another phone or app saved as a vCard': 'Contactos que otro teléfono o app ha guardado como vCard',
  'Save as a .vcf file': 'Guardar como archivo .vcf',
  'The {n} contact shown, in a folder you choose': '{n} contacto mostrado, en la carpeta que elijas',
  'The {n} contacts shown, in a folder you choose': '{n} contactos mostrados, en la carpeta que elijas',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.':
    'Guardado como {name}. El archivo está fuera de Erevos: cualquiera que lo tenga puede leer estos contactos.',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read this contact.':
    'Guardado como {name}. El archivo está fuera de Erevos: cualquiera que lo tenga puede leer este contacto.',
  'Import contacts': 'Importar contactos',
  'Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.':
    'Elige un archivo .vcf (una vCard), como los que guardan otros teléfonos y apps con sus contactos. Erevos lo lee aquí y no lo envía a ningún sitio.',
  'Choose a .vcf file': 'Elegir un archivo .vcf',
  'There are no contacts in {file}.': 'No hay contactos en {file}.',
  'The file is larger than {n} MB.': 'El archivo ocupa más de {n} MB.',
  'It has {n} contact.': 'Tiene {n} contacto.',
  'It has {n} contacts.': 'Tiene {n} contactos.',
  '{n} of them is on the phone already, and is left out.': '{n} de ellos ya está en el teléfono y se omite.',
  '{n} of them are on the phone already, and are left out.': '{n} de ellos ya están en el teléfono y se omiten.',
  'Importing… {done} of {total}': 'Importando… {done} de {total}',
  'Import {n} contact': 'Importar {n} contacto',
  'Import {n} contacts': 'Importar {n} contactos',
  'Nothing new to import.': 'No hay nada nuevo que importar.',
  '{n} contact imported.': '{n} contacto importado.',
  '{n} contacts imported.': '{n} contactos importados.',
  '{n} contact could not be saved.': '{n} contacto no se ha podido guardar.',
  '{n} contacts could not be saved.': '{n} contactos no se han podido guardar.',

  // QR codes.
  'This contact holds too much for a QR code. Save it as a .vcf file instead.': 'Este contacto tiene demasiado para un código QR. Guárdalo mejor como archivo .vcf.',
  "Another phone's camera reads it as a contact to add: its name, numbers, emails, addresses and note, without its photo. Whoever sees the code can read it.":
    'La cámara de otro teléfono lo lee como un contacto para añadir: su nombre, números, correos, direcciones y nota, sin su foto. Quien vea el código puede leerlo.',
  "Another phone's camera reads it as a contact to add, without its photo, and without its note or addresses, which do not fit. Whoever sees the code can read it.":
    'La cámara de otro teléfono lo lee como un contacto para añadir, sin su foto, y sin su nota ni sus direcciones, que no caben. Quien vea el código puede leerlo.',
  "Read a contact's QR code": 'Leer el código QR de un contacto',
  'From a photo of it, read on the phone': 'A partir de una foto, leída en el teléfono',
  'Take a photo of the code, or choose one. It is read here and not kept; what it holds starts a new contact, saved only when you save it.':
    'Haz una foto del código, o elige una. Se lee aquí y no se guarda; lo que contiene empieza un contacto nuevo, que solo se guarda cuando lo guardes.',
  'This QR code holds no contact.': 'Este código QR no contiene ningún contacto.',
  'No QR code was found in the photo. Take it again closer, with all of the code in it.': 'No se ha encontrado ningún código QR en la foto. Vuelve a hacerla más cerca, con todo el código dentro.',

  // Duplicates.
  'Find duplicates': 'Buscar duplicados',
  'The same person kept twice, to merge into one': 'La misma persona guardada dos veces, para combinarla en una',
  'There is nothing to merge.': 'No hay nada que combinar.',
  'The same name': 'El mismo nombre',
  'The same number': 'El mismo número',
  'The same email': 'El mismo correo',
  'Merge': 'Combinar',
  'Merge these {n} into {name}? The others are deleted, from every account they are kept in.': '¿Combinar estos {n} en {name}? Los demás se eliminan de todas las cuentas donde están guardados.',
  'Merge all': 'Combinar todos',
  'Merge {n} set of contacts, each into its fullest? The others are deleted.': '¿Combinar {n} conjunto de contactos en el más completo? Los demás se eliminan.',
  'Merge {n} sets of contacts, each into its fullest? The others are deleted.': '¿Combinar {n} conjuntos de contactos, cada uno en el más completo? Los demás se eliminan.',
  '{n} set could not be merged.': '{n} conjunto no se ha podido combinar.',
  '{n} sets could not be merged.': '{n} conjuntos no se han podido combinar.',
  'Duplicates': 'Duplicados',
  'Contacts that look like the same person: the same name, number or email. Merging keeps the fullest, with every number, email and address of the others, and deletes the others.':
    'Contactos que parecen la misma persona: el mismo nombre, número o correo. Al combinarlos se conserva el más completo, con todos los números, correos y direcciones de los demás, y se eliminan los demás.',
  'No duplicates found.': 'No se han encontrado duplicados.',
  'Not the same': 'No son iguales',
  'Kept, with the others in it': 'Se conserva, con los demás dentro',

  // Birthdays.
  'Birthdays': 'Cumpleaños',
  "Without notices, Erevos cannot remind you of birthdays. Allow Notifications in Erevos's App info.":
    'Sin avisos, Erevos no puede recordarte los cumpleaños. Permite «Notificaciones» en la información de la aplicación de Erevos.',
  'No contact has a birthday yet. Add one in Edit.': 'Aún ningún contacto tiene cumpleaños. Añade uno en «Editar».',
  'Birthday reminders: on': 'Recordatorios de cumpleaños: activados',
  'Birthday reminders: off': 'Recordatorios de cumpleaños: desactivados',
  "A notice on the morning of each phone contact's birthday": 'Un aviso la mañana del cumpleaños de cada contacto del teléfono',

  // The SIM.
  'SIM contacts': 'Contactos de la SIM',
  'Copy the contacts on the SIM card to the phone': 'Copiar al teléfono los contactos de la tarjeta SIM',
  "The contacts kept on the phone's SIM cards. Copied, they are in Android's contacts like the others; the SIM keeps its own.":
    'Los contactos guardados en las tarjetas SIM del teléfono. Una vez copiados, están en los contactos de Android como los demás; la SIM conserva los suyos.',
  'Reading the SIM…': 'Leyendo la SIM…',
  'No contacts on the SIM, or the phone does not let Erevos read it.': 'No hay contactos en la SIM, o el teléfono no deja que Erevos la lea.',
  'The SIM has {n} contact.': 'La SIM tiene {n} contacto.',
  'The SIM has {n} contacts.': 'La SIM tiene {n} contactos.',
  'Copying… {done} of {total}': 'Copiando… {done} de {total}',
  'Copy {n} contact to the phone': 'Copiar {n} contacto al teléfono',
  'Copy {n} contacts to the phone': 'Copiar {n} contactos al teléfono',
  'Choose who to copy': 'Elige a quién copiar',
  '{n} contact copied to the phone.': '{n} contacto copiado al teléfono.',
  '{n} contacts copied to the phone.': '{n} contactos copiados al teléfono.',
  'SIM {n}': 'SIM {n}',

  // Kept only in Erevos, and in hidden chats.
  'Only in Erevos': 'Solo en Erevos',
  "Sealed in this space, and not in the phone's contacts: no other app sees it, nor any account the phone syncs with.":
    'Sellado en este espacio, y no en los contactos del teléfono: no lo ve ninguna otra app, ni ninguna cuenta con la que se sincronice el teléfono.',
  'No contact is kept only in Erevos yet. Choose Only in Erevos when you make one.':
    'Aún no hay ningún contacto guardado solo en Erevos. Elige «Solo en Erevos» al crear uno.',
  'Erevos keeps {n} contacts of its own at most.': 'Erevos guarda como máximo {n} contactos propios.',
  'This contact is no longer kept in Erevos.': 'Este contacto ya no está guardado en Erevos.',
  'Delete {name}? It is kept only in Erevos, and cannot be brought back.': '¿Eliminar a {name}? Solo está guardado en Erevos, y no se podrá recuperar.',
  'Keep only in Erevos': 'Guardar solo en Erevos',
  "Move {name} into Erevos? It is sealed in this space and deleted from the phone's contacts, from every account it is kept in: other apps no longer see it, and the phone no longer shows its name when it calls.":
    '¿Mover a {name} a Erevos? Se sella en este espacio y se elimina de los contactos del teléfono, de todas las cuentas donde está guardado: las otras apps ya no lo ven, y el teléfono ya no muestra su nombre cuando llama.',
  "Move to the phone's contacts": 'Mover a los contactos del teléfono',
  "Move {name} to the phone's contacts? Every app allowed to read them sees it there, and it is no longer kept in Erevos.":
    '¿Mover a {name} a los contactos del teléfono? Ahí lo ve cualquier app con permiso para leerlos, y ya no se guarda en Erevos.',
  "Kept only in Erevos, sealed in this space. Not in the phone's contacts.": 'Guardado solo en Erevos, sellado en este espacio. No está en los contactos del teléfono.',
  'The photo is sealed with the contact, in a file of its own: only Erevos shows it.':
    'La foto se sella con el contacto, en un archivo propio: solo Erevos la muestra.',
  'Hidden contacts': 'Contactos ocultos',
  'The hidden chats are closed.': 'Los chats ocultos están cerrados.',
  "Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.":
    'Guardados solo aquí, sellados con los chats ocultos: no aparecen en ningún otro sitio, ni siquiera en los contactos del espacio.',
  'Kept only in these hidden chats, sealed.': 'Guardado solo en estos chats ocultos, sellado.',
  'favourite': 'favorito',
  'only in Erevos': 'solo en Erevos',

  // Erevos contacts, and a contact's history.
  'Erevos contacts': 'Contactos de Erevos',
  'Erevos contact': 'Contacto de Erevos',
  'with an Erevos chat': 'con un chat de Erevos',
  'No Erevos contacts yet. Add one in Chat, with their link or QR code.':
    'Aún no hay contactos de Erevos. Añade uno en «Chat», con su enlace o su código QR.',
  'A contact of your Erevos chats. Add it to your contacts to give it numbers, an email and more.':
    'Un contacto de tus chats de Erevos. Añádelo a tus contactos para ponerle números, un correo y más.',
  'In Erevos': 'En Erevos',
  'The Erevos contact {name}': 'El contacto de Erevos {name}',
  'End-to-end encrypted, through Erevos instead of the phone company.':
    'Cifrado de extremo a extremo, por Erevos en lugar de por la operadora.',
  'Not this Erevos contact': 'No es este contacto de Erevos',
  'One of its numbers is linked to this Erevos contact, in its chat.':
    'Uno de sus números está vinculado a este contacto de Erevos, en su chat.',
  'Link to an Erevos contact': 'Vincular a un contacto de Erevos',
  "The same person in your Erevos chats: this card then shows their chat and calls. The link is sealed in Erevos, never in the phone's contacts.":
    'La misma persona en tus chats de Erevos: esta ficha muestra entonces su chat y sus llamadas. El vínculo se sella en Erevos, nunca en los contactos del teléfono.',
  'Add to contacts': 'Añadir a contactos',
  'History': 'Historial',
  'No calls or messages with this contact yet.': 'Aún no hay llamadas ni mensajes con este contacto.',
  "Its calls show here once Erevos may read the phone's call log. Erevos only shows them, and keeps no copy.":
    'Sus llamadas aparecen aquí en cuanto Erevos tenga permiso para leer el registro de llamadas del teléfono. Erevos solo las muestra, y no guarda ninguna copia.',
  'Show calls': 'Mostrar llamadas',
  'Incoming call, {time}': 'Llamada entrante, {time}',
  'Outgoing call, {time}': 'Llamada saliente, {time}',
  'Outgoing call, no answer': 'Llamada saliente, sin respuesta',

  // Other apps' contacts.
  'Add {what} to a contact': 'Añadir {what} a un contacto',
  'Tap the contact to add it to, or make a new one.': 'Toca el contacto al que quieres añadirlo, o crea uno nuevo.',

  // A contact's Erevos ID (components/erevos-id.tsx).
  'Erevos ID': 'ID de Erevos',
  'Erevos ID: {id}': 'ID de Erevos: {id}',
  'That is not an Erevos ID: an Erevos ID is a contact link starting with erevos://contact':
    'Eso no es un ID de Erevos: un ID de Erevos es un enlace de contacto que empieza por erevos://contact',
  'Their contact link from Erevos, to link this contact to another Erevos contact instead.':
    'Su enlace de contacto de Erevos, para vincular este contacto a otro contacto de Erevos.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Once saved, they join your Erevos chats, and the contact shows their chat and calls.':
    'El enlace de contacto que muestra su Erevos, en «Copiar mi enlace de contacto» o como su código QR. Al guardarlo, entra en tus chats de Erevos y el contacto muestra su chat y sus llamadas.',
  "Choose them among these hidden chats' contacts: this card then shows their chat and calls.":
    'Elígelo entre los contactos de estos chats ocultos: esta ficha muestra entonces su chat y sus llamadas.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Added here, they join your Erevos chats, and this card shows their chat and calls, end-to-end encrypted.':
    'El enlace de contacto que muestra su Erevos, en «Copiar mi enlace de contacto» o como su código QR. Al añadirlo aquí, entra en tus chats de Erevos y esta ficha muestra su chat y sus llamadas, cifrados de extremo a extremo.',
  'Add to Erevos': 'Añadir a Erevos',
  'Choose from my Erevos chats': 'Elegir de mis chats de Erevos',
  'That QR code holds no Erevos ID.': 'Ese código QR no contiene ningún ID de Erevos.',
  'Take photo of their QR code': 'Hacer foto de su código QR',
  'Choose a photo of it': 'Elegir una foto del código',
};
