// The Spanish of the Phone and Contacts screens (app/phone.tsx and what goes with it) (i18n/es/index.ts).
export const phone: Record<string, string> = {
  // The Phone screen (app/phone.tsx) and its place in the menu.
  Phone: 'Teléfono',
  'This build of Erevos has no phone part yet. It comes with the next build of the app.':
    'Esta versión de Erevos aún no tiene la parte de teléfono. Llegará con la próxima versión de la app.',
  'Only Android lets another app be the phone app.': 'Solo Android permite que otra app sea la app de teléfono.',
  'Erevos may not make calls. Make it the phone app under Settings.': 'Erevos no tiene permiso para hacer llamadas. Haz que sea la app de teléfono en «Ajustes».',
  'Not called. {error}': 'No se ha llamado. {error}',
  Contacts: 'Contactos',
  Settings: 'Ajustes',
  'Back to the call': 'Volver a la llamada',
  'Erevos is not the phone app': 'Erevos no es la app de teléfono',
  "Calls made here show on Android's own call screen until you make Erevos the phone app, under Settings.":
    'Las llamadas que hagas aquí se muestran en la pantalla de llamada del propio Android hasta que hagas que Erevos sea la app de teléfono, en «Ajustes».',
  Number: 'Número',
  'Call on': 'Llamar con',
  "Without that, calls go on the phone's default SIM.": 'Si no, las llamadas salen por la SIM predeterminada del teléfono.',
  'Erevos keeps this SIM for the number, sealed in this space, and calls it on the same SIM next time.':
    'Erevos recuerda esta SIM para el número, sellada en este espacio, y la próxima vez lo llama con la misma SIM.',
  Keypad: 'Teclado',
  Recents: 'Recientes',
  Favourites: 'Favoritos',

  // The calls (Android's call history) and the favourites, on the Phone screen (lib/phone-log.ts).
  All: 'Todo',
  Missed: 'Perdidas',
  Incoming: 'Entrantes',
  Outgoing: 'Salientes',
  Blocked: 'Bloqueadas',
  'Incoming call': 'Llamada entrante',
  'Outgoing call': 'Llamada saliente',
  'Declined call': 'Llamada rechazada',
  'Blocked call': 'Llamada bloqueada',
  'Private number': 'Número privado',
  Payphone: 'Teléfono público',
  'Unknown number': 'Número desconocido',
  'Wi-Fi calling': 'Llamada por Wi-Fi',
  'HD voice': 'Voz HD',
  'Android does not let Erevos read the call history yet.': 'Android aún no deja que Erevos lea el historial de llamadas.',
  'Allow the call history': 'Permitir el historial de llamadas',
  'Android did not allow it. Under Settings, Allow calls and contacts says how to.':
    'Android no lo ha permitido. En «Ajustes», «Permitir llamadas y contactos» explica cómo hacerlo.',
  'No calls of this kind.': 'No hay llamadas de este tipo.',
  'No calls yet.': 'Aún no hay llamadas.',
  'Call on {sim}': 'Llamar con {sim}',
  'Call {name}': 'Llamar a {name}',
  'Send an SMS': 'Enviar un SMS',
  'Change the number before calling': 'Cambiar el número antes de llamar',
  'Block this number': 'Bloquear este número',
  'Unblock this number': 'Desbloquear este número',
  'Blocked {who}.': 'Bloqueado: {who}.',
  'Unblocked {who}.': 'Desbloqueado: {who}.',
  'Delete this call': 'Eliminar esta llamada',
  'Delete these {n} calls': 'Eliminar estas {n} llamadas',
  'Delete every call with this number': 'Eliminar todas las llamadas con este número',
  'Call deleted.': 'Llamada eliminada.',
  '{n} calls deleted.': '{n} llamadas eliminadas.',
  'The calls with {who} were deleted.': 'Se han eliminado las llamadas con {who}.',
  'The calls were not deleted. {error}': 'No se han eliminado las llamadas. {error}',
  "Android does not let Erevos read the phone's contacts yet.": 'Android aún no deja que Erevos lea los contactos del teléfono.',
  'Allow the contacts': 'Permitir los contactos',
  'No favourites yet. The contacts you star show here, to call at a tap.':
    'Aún no hay favoritos. Los contactos que marques con una estrella aparecen aquí, para llamarlos con un toque.',

  // The phone's settings (app/phone-settings.tsx).
  'Phone settings': 'Ajustes del teléfono',
  'Erevos is the phone app': 'Erevos es la app de teléfono',
  "As the phone app, Erevos shows every call on its own screen: who calls, with their photo, over the lock screen too, without unlocking Erevos. Its Phone screen, with the keypad, the calls and the favourites, stays behind Erevos's password, unless you let it open without it, below. Phone calls are plain phone calls: the phone company carries them, as it carries every call.":
    'Como app de teléfono, Erevos muestra cada llamada en su propia pantalla: quién llama, con su foto, también sobre la pantalla de bloqueo, sin desbloquear Erevos. Su pantalla «Teléfono», con el teclado, las llamadas y los favoritos, queda tras la contraseña de Erevos, salvo que permitas abajo que se abra sin ella. Las llamadas de teléfono son llamadas normales: las lleva la operadora, como todas las llamadas.',
  'Make Erevos the phone app': 'Hacer que Erevos sea la app de teléfono',
  'Android did not make Erevos the phone app': 'Android no ha hecho que Erevos sea la app de teléfono',
  "Choose Erevos in Android's Default apps → Phone app. If Android says it is a restricted setting, open Erevos's App info, tap ⋮ at the top right → Allow restricted settings, and choose Erevos again.":
    'Elige Erevos en «Aplicaciones predeterminadas → Aplicación de teléfono» de Android. Si Android dice que es un ajuste restringido, abre la información de la aplicación de Erevos, toca ⋮ arriba a la derecha → «Permitir ajustes restringidos», y vuelve a elegir Erevos.',
  "Android did not allow it all. In Erevos's App info, under Permissions, call logs may say Restricted setting: then go back, tap ⋮ at the top right → Allow restricted settings, and allow Phone, Call logs and Contacts under Permissions.":
    'Android no lo ha permitido todo. En la información de la aplicación de Erevos, en «Permisos», los registros de llamadas pueden poner «Ajuste restringido»: entonces vuelve atrás, toca ⋮ arriba a la derecha → «Permitir ajustes restringidos», y permite «Teléfono», «Registros de llamadas» y «Contactos» en «Permisos».',
  'Android holds back part of what the phone app needs': 'Android retiene parte de lo que necesita la app de teléfono',
  'Calls, the SIMs, the call history or the names of your contacts may not show. Android holds this back from an app installed from a browser, until you allow it.':
    'Puede que no aparezcan las llamadas, las SIM, el historial de llamadas o los nombres de tus contactos. Android se lo niega a una app instalada desde un navegador, hasta que lo permitas.',
  'Allow calls and contacts': 'Permitir llamadas y contactos',
  'So a call that comes shows no Answer and Decline outside the call screen.':
    'Por eso, una llamada entrante no muestra «Responder» y «Rechazar» fuera de la pantalla de llamada.',
  'Android does not let Erevos show a call that comes over the lock screen: it shows as a notice only.':
    'Android no deja que Erevos muestre una llamada entrante sobre la pantalla de bloqueo: solo aparece como aviso.',
  'This device has no phone part, so it cannot make calls.': 'Este dispositivo no tiene función de teléfono, así que no puede hacer llamadas.',
  'Quick replies': 'Respuestas rápidas',
  'Message, on the call screen of a call that rings, declines it with one of these, which the phone sends the caller as an SMS. They are kept on the phone, not sealed, as the call screen shows them with Erevos locked.':
    '«Mensaje», en la pantalla de una llamada que suena, la rechaza con una de estas, que el teléfono envía por SMS a quien llama. Se guardan en el teléfono sin sellar, porque la pantalla de llamada las muestra con Erevos bloqueado.',
  Remove: 'Quitar',
  'Add a reply': 'Añadir una respuesta',
  'Use the usual replies': 'Usar las respuestas habituales',

  // Opening the Phone without the password (app/phone-settings.tsx, lib/phone-open.ts).
  'Open Erevos': 'Abrir Erevos',
  'Open the Phone without the password': 'Abrir el Teléfono sin la contraseña',
  "With Erevos locked, the Phone's icon, a tel: link and the notice of a missed call then open the keypad, the calls and the favourites, which Android keeps for every phone app. Anyone holding the unlocked phone sees your calls and favourites, with the names of the phone's contacts only, never those kept only in Erevos or in hidden chats. Calls can be made there, nothing changed; everything else stays behind the password.":
    'Con Erevos bloqueado, el icono del Teléfono, un enlace tel: y el aviso de una llamada perdida abren entonces el teclado, las llamadas y los favoritos, que Android guarda para toda app de teléfono. Quien tenga el móvil desbloqueado ve tus llamadas y favoritos, solo con los nombres de los contactos del móvil, nunca los que guardan solo Erevos o los chats ocultos. Desde ahí se puede llamar, sin cambiar nada; todo lo demás queda tras la contraseña.',
  'The Phone opens without the password.': 'El Teléfono se abre sin la contraseña.',
  'Keep the Phone behind the password': 'Volver a poner el Teléfono tras la contraseña',

  // Blocking calls (app/phone-settings.tsx, lib/phone-rules.ts).
  Blocking: 'Bloqueo de llamadas',
  "A blocked call does not ring and leaves no notice; it shows under Blocked in the calls. The telemarketing ranges and your prefixes never block a number in the phone's contacts. What is blocked is the same in every space, and keeps no names.":
    'Una llamada bloqueada no suena ni deja aviso; aparece en «Bloqueadas», en las llamadas. Los rangos de telemarketing y tus prefijos nunca bloquean un número que esté en los contactos del teléfono. Lo bloqueado es lo mismo en todos los espacios, y no guarda nombres.',
  'Block telemarketing': 'Bloquear el telemarketing',
  'Stop blocking telemarketing': 'Dejar de bloquear el telemarketing',
  'The numbers these countries keep for telemarketing calls:': 'Los números que estos países reservan para las llamadas de telemarketing:',
  France: 'Francia',
  Spain: 'España',
  Chile: 'Chile',
  India: 'India',
  Brazil: 'Brasil',
  'optional for the callers since August 2025': 'desde agosto de 2025, opcional para quien llama',
  'Numbers starting with': 'Números que empiezan por',
  Block: 'Bloquear',
  'Type the start of the numbers to block, with the country code or as you dial it here: +33 162 or 0162.':
    'Escribe el principio de los números que quieres bloquear, con el prefijo del país o como lo marcas aquí: +33 162 o 0162.',
  'Erevos does not screen calls yet, so a blocked call rings a moment before Erevos ends it.':
    'Erevos aún no filtra las llamadas, así que una llamada bloqueada suena un momento antes de que Erevos la corte.',
  'Let Erevos screen calls': 'Dejar que Erevos filtre las llamadas',
  "Android's own blocked numbers, the same list as under SMS: Android rejects their calls before they ring, and their SMS and MMS. Every space sees the same list.":
    'Los números bloqueados del propio Android, la misma lista que en «SMS»: Android rechaza sus llamadas antes de que suenen, y sus SMS y MMS. Todos los espacios ven la misma lista.',
  'Only the phone app or the SMS app may see them: make Erevos the phone app above.':
    'Solo la app de teléfono o la app de SMS pueden verlos: haz que Erevos sea la app de teléfono más arriba.',
  'Block a contact group': 'Bloquear un grupo de contactos',
  "The calls of a group's contacts, as your phone's contacts label them, are blocked for a while: for an hour, until tomorrow morning, or until you lift it.":
    'Las llamadas de los contactos de un grupo, según las etiquetas de los contactos de tu teléfono, se bloquean durante un tiempo: una hora, hasta mañana por la mañana, o hasta que lo desbloquees.',
  'Your phone has no contact groups yet.': 'Tu teléfono aún no tiene grupos de contactos.',
  Lift: 'Desbloquear',
  '{n} contact': '{n} contacto',
  '{n} contacts': '{n} contactos',
  'For an hour': 'Durante una hora',
  'Until tomorrow morning': 'Hasta mañana por la mañana',
  'Until I lift it': 'Hasta que lo desbloquee',
  'Blocked until you lift it': 'Bloqueado hasta que lo desbloquees',
  'Blocked until {time}': 'Bloqueado hasta las {time}',
  'Blocked until tomorrow, {time}': 'Bloqueado hasta mañana a las {time}',
  'Calls from the group {group} are blocked': 'Las llamadas del grupo {group} están bloqueadas',
  'Calls from a contact group are blocked': 'Las llamadas de un grupo de contactos están bloqueadas',
  // The Phone's search for a contact to call.
  'Clear the search': 'Borrar la búsqueda',
  'No contact with a number matches.': 'Ningún contacto con número coincide.',
  // A plain call from the top of a chat or an SMS conversation (components/dial-tile.tsx).
  'Mobile call, not encrypted': 'Llamada móvil, sin cifrar',
  'This phone has no app to call {number}.': 'Este teléfono no tiene una app para llamar al {number}.',
};
