// The Spanish of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/es/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Novedades',
  'What each version changed': 'Qué cambió en cada versión',
  'What each version of Erevos changed, the newest first.': 'Qué cambió en cada versión de Erevos, primero la más reciente.',
  'Not out yet': 'Aún no ha salido',
  'This version': 'Esta versión',
  'For you': 'Para ti',
  'Under the hood': 'Bajo el capó',
  // Not out yet.
  '**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).':
    '**Novedades en dos partes**: cada versión dice primero qué cambia para ti y luego qué cambió bajo el capó: arreglos, velocidad, batería y seguridad por dentro. Ver [Actualizaciones](#updates).',
  '**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.':
    '**Los SMS de un contacto ya no siguen contando como nuevos**: al abrir su chat se leen todos, también los anteriores, no solo los que se ven.',
  '**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).':
    '**Un mensaje ya no espera cuando Tor no llega al relay**: con Tor para los mensajes, sale directo enseguida, como dicen los ajustes de Tor. Ver [Por Tor](#tor).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**La guía de uso está en todos los idiomas de la app**: se muestra en el que elegiste y nombra los botones como los muestra la app. Ver [Idioma](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Ubicación encuentra dónde estás, también en interiores**: el teléfono busca por satélite y por su red a la vez, una hoja dice que está buscando, y si no se encuentra nada dice por qué, con Volver a intentarlo. Ver [Chatear a través de un relay](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**El icono de la app web cuenta lo no leído**: en un iPhone, con las notificaciones activadas para el espacio, el icono de Erevos en la pantalla de inicio muestra cuántos mensajes no se han leído, nunca los de un chat oculto, salvo que lo desactives en Ajustes → Notificaciones → Número en el icono. Ver [En un iPhone](#iphone).',
  // 3.4.2
  '**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.':
    '**Un mensaje enviado mientras se abre un chat lo espera**, marcado Enviando…, y se va en cuanto el chat está abierto, sin decir que Erevos no puede cifrar.',
  '**What you read as a chat opens stays read**: the home screen no longer counts it as new.':
    '**Lo que lees mientras se abre un chat queda leído**: la pantalla de inicio ya no lo cuenta como nuevo.',
  '**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).':
    '**Samsung ya no pregunta por su uso compartido**: en un teléfono Samsung, Wi-Fi Aware y la Wi-Fi con teléfonos cercanos siguen desactivados hasta que los actives. Mira [Chatear con un teléfono cercano](#nearby).',
  '**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.':
    '**El campo del SMS conserva su ancho en una pantalla pequeña**: Foto y Enviar a su lado son botones redondos, como en un chat.',
  // 3.4.1
  '**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.':
    '**Enviar responde al instante**: una breve vibración al pulsarlo, el campo se vacía y el mensaje aparece, marcado Enviando…, así que nunca sale dos veces.',
  '**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.':
    '**La pantalla ya no se queda desplazada hacia arriba** después de que el teclado se cerrara tras una hoja, un diálogo u otra app.',
  '**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).':
    '**Importar un chat con sus fotos ya no congela Erevos**: la pantalla responde mientras llegan los archivos, dice qué parte ha llegado y **Cancelar** lo detiene. Un chat movido a los chats ocultos se lleva los chats importados en él. Consulta [Chats importados](#import).',
  // 3.4.0
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Tu relay demuestra su propia clave**: cada conexión con él empieza con una comprobación que solo supera el relay que tiene esa clave, así que nadie en medio puede hacerse pasar por él. Una vez que la ha superado, Erevos ya nunca se conecta a él sin la comprobación. Para ello tu relay necesita una actualización.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Transparencia](#transparency), una parte nueva de la guía: qué guarda el servidor que hay detrás de Erevos y durante cuánto tiempo, qué no guarda y quién más ve algo.',
  "**What's new**: this list, in Settings → General, by version.": '**Novedades**: esta lista, en Ajustes → General, por versión.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Nada se ve detrás del PIN de un chat**: ningún mensaje de un chat bloqueado con un PIN se muestra hasta escribir su PIN, y con cristal, un fondo de pantalla o un estilo con su propia escena, la pantalla del PIN es un esmerilado denso que no deja ver nada.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Videollamada de grupo desde arriba del grupo**: una cámara azul junto al auricular verde, como en el chat con un contacto.",
  "**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it.":
    "**Una cola del relay para cada contacto**: cada contacto escribe en una cola que solo él conoce, así el relay no puede saber que dos contactos escriben al mismo teléfono, y eliminar o bloquear a alguien borra solo la suya. Tu relay necesita una actualización para ello.",
  "**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden).":
    "**Los chats ocultos, más como los demás**: se cierran tras 30 segundos en segundo plano, no al instante, y nunca durante una llamada ni mientras eliges una foto o un archivo; mientras están abiertos, un mensaje suena, y las vistas previas de enlaces tienen allí su propio interruptor. Consulta [Chats ocultos](#hidden).",
  "**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden).":
    "**Chats ocultos que reciben estando cerrados**: un interruptor arriba de cada lugar, activado en los lugares nuevos, hace que reciban como tus otros chats: sus contactos ven al instante que un mensaje llegó, un aviso dice solo «Mensaje nuevo», y una llamada suena sin nombre. Consulta [Chats ocultos](#hidden).",
  "**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden).":
    "**Los chats ocultos también esperan e importan**: lo que no puede enviarse ahora queda en espera, marcado «En espera», y se envía solo a través de su relay; «Enviar más tarde» funciona allí como en tus otros chats; y un chat de Telegram, WhatsApp o Viber puede importarse a un chat oculto y quedarse solo allí. Consulta [Chats ocultos](#hidden).",
  "**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden).":
    "**Los chats ocultos en una lista como tus chats**: se abren en una lista como la de la pantalla de inicio, con lo último que se dijo y cuántos no se han leído, y cada posición tiene arriba su propio Chat conmigo. Consulta [Chats ocultos](#hidden).",
  "**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden).":
    "**Más en los chats ocultos**: con Recibir estando cerrados, lo que les llega por Nostr también se lee mientras están cerrados; y allí se puede añadir un contacto desde una foto de su código QR y dar una foto a un contacto oculto. Consulta [Chats ocultos](#hidden).",
  "**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden).":
    "**Chats ocultos sin relay**: como tus otros chats, pueden empezar solo por Nostr: su enlace de contacto y su código QR dicen dónde leen allí, y los textos y las reacciones van allí. Consulta [Chats ocultos](#hidden).",
  "**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden).":
    "**Grupos en chats ocultos**: bajo su lista, Grupo nuevo crea un grupo con sus contactos; aparece entre sus chats, va solo por su relay y se lee mientras están cerrados si Recibir estando cerrados está activado. Consulta [Chats ocultos](#hidden).",
  "**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy).":
    "**Sin la línea de versión de prueba**: la pantalla de inicio ya no termina diciendo que es una versión de prueba. La guía sigue diciendo exactamente qué está protegido, y que nada se ha auditado todavía. Consulta [Qué está protegido hoy](#privacy).",
  "**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts).":
    "**El menú de contactos en los chats ocultos**: sus Contactos vuelven a tener menú, solo con lo suyo: importar en ellos un archivo .vcf, guardar sus contactos como archivo .vcf y leer el código QR de un contacto desde una foto. Un ID de Erevos escrito allí lo añade a los chats ocultos. Consulta [Contactos](#contacts).",
  // 3.3.2
  '**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.':
    '**El botón de llamada normal, en más contactos**: el teclado naranja de arriba en el chat de un contacto también usa el número del contacto al que lo vinculaste (**Vincular a uno de mis contactos**), primero el móvil.',
  // 3.3.1
  '**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.':
    '**Ya se pueden importar chats de Viber**: desde el archivo HTML de la app de Android Backup Text for Viber, solo el texto.',
  // 3.3.0
  '**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.':
    '**Empezar sin relay, por Nostr**: **Empezar sin relay** en Chat nuevo. Los textos, stickers, reacciones, ediciones y las marcas de entregado y leído van por Nostr a través de Tor. Las fotos, los mensajes de voz, los archivos y las llamadas siguen necesitando un relay o un teléfono cerca.',
  '**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.':
    '**El relay llega solo**: quien tiene un relay que invita envía una vez una invitación a un contacto sin relay, dentro del chat, y el otro teléfono la acepta solo.',
  '**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.':
    '**Aviso cuando sale una versión nueva** (Android): una vez al día Erevos pregunta al servidor de LPHL y luego muestra una fila de Erevos fijada y un aviso, solo para una versión firmada por el ordenador de versiones. Se desactiva en Ajustes → General → Actualizaciones.',
  '**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.':
    '**Bloquear un chat con un PIN**: Detalles → Bloquear con un PIN, para chats y grupos. Nada de él aparece en la búsqueda, los mensajes destacados ni las importaciones. En los chats ocultos no pide PIN.',
  '**A new handset** on the green tiles: Phone, and the call in a chat.': '**Un auricular nuevo** en los recuadros verdes: Teléfono, y la llamada en un chat.',
  '**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.':
    '**Una pantalla de Chat nuevo renovada**: «Cómo te conectas ahora» arriba, tres tarjetas grandes para un teléfono sin relay (Tengo una invitación, Iniciar sesión con LPHL, Empezar sin relay), y la parte técnica en «Para usuarios avanzados».',
  '**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.':
    '**Nostr más estable por Tor**: cada relay de Nostr tiene su propio camino por Tor, y tras un fallo prueba una salida nueva. Un error más claro en la pantalla de Nostr.',
  '**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.':
    '**Cuando se corta la conexión con el relay** mientras Erevos espera su respuesta, Erevos se da cuenta y vuelve a conectarse; antes se quedaba atascado.',
  '**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.':
    '**Invitar por SMS** (Android): en la ficha de un contacto del teléfono, para una persona, durante 2 días. El enlace abre una página que ofrece Erevos (el APK para Android, la app web para un iPhone o un ordenador) y luego abre la invitación. El código QR y «Compartir la invitación» siguen como estaban.',
  '**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.':
    '**Arreglos en la invitación por SMS**: también funciona un enlace copiado como /i/#…, una app web más antigua también abre la invitación, y en iOS 26 indica que Compartir está dentro de •••.',
  '**A phone call button** in Erevos chats and SMS chats.': '**Un botón de llamada telefónica** en los chats de Erevos y en los de SMS.',
  // 3.2.1
  '**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.':
    '**Editar un mensaje** que enviaste, hasta un día después: a contactos, grupos y dispositivos vinculados, con «Editado» junto a la hora.',
  '**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.':
    '**Nostr dice lo que hizo**: «Enviado por Nostr», y en la pantalla de Nostr lo último que hizo cada relay.',
  '**Coloured call buttons** at the top of a chat: video blue, voice green.': '**Botones de llamada de colores** arriba en el chat: vídeo en azul, voz en verde.',
  // 3.2.0
  'Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.':
    'Flechas para ir al principio y al final de un chat; los mensajes anteriores se cargan solos al desplazarte.',
  'Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.':
    'Los chats importados de Telegram y WhatsApp se ven como mensajes de Erevos: burbujas, días, fotos, mensajes de voz, búsqueda.',
  'Dogs instead of cats in the stickers.': 'Perros en lugar de gatos en los stickers.',
  'Screenshots: a switch in Settings → Privacy and security.': 'Capturas de pantalla: un interruptor en Ajustes → Privacidad y seguridad.',
  'Hidden chats from New chat: hold it for a second.': 'Chats ocultos desde Chat nuevo: mantenlo pulsado un segundo.',
  'Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.': 'Recuadros de colores en la pantalla de inicio: Teléfono verde, Contactos violeta, el candado naranja.',
  '**Chat with myself**, always first, and **Remind me**, the orange bell.': '**Chat conmigo**, siempre el primero, y **Recordarme**, la campana naranja.',
  '**Media, links and files** in a chat’s Details, with a calendar and Go to a day.':
    '**Multimedia, enlaces y archivos** en los Detalles de un chat, con un calendario e «Ir a un día».',
  'Import a chat from inside the chat: Details → Imported chats.': 'Importar un chat desde dentro del chat: Detalles → Chats importados.',
  'A closed space can say that a message came while another space is open.': 'Un espacio cerrado puede avisar de que llegó un mensaje mientras otro espacio está abierto.',
  'The message menu says when a message went or came through Nostr.': 'El menú del mensaje indica cuándo un mensaje se envió o llegó por Nostr.',
  '**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.': '**Apoyar Erevos**: Liberapay, PayPal, Monero, Bitcoin.',
  'Who makes Erevos and why, in About Erevos; the guide says why everywhere.': 'Quién hace Erevos y por qué, en Acerca de Erevos; la guía explica el porqué en todas partes.',
  // 3.1.2
  '**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.':
    '**Ajustes en 8 grupos**, con búsqueda: General, Apariencia, Notificaciones, Privacidad y seguridad, Relay y redes, Teléfono y SMS, Datos y dispositivos, Para pruebas. El ⋯ de la pantalla de inicio solo conserva los lugares, y Ajustes al final.',
  // 3.1.1
  'Check for updates says what stopped an update.': '«Buscar actualizaciones» indica qué impidió una actualización.',
  'Invite someone is not made from a token for all; it asks you to sign in to the relay first.':
    '«Invitar a alguien» no se crea a partir de un token para todos; primero te pide iniciar sesión en el relay.',
  'The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).':
    'El token para todos del relay se convierte solo en un token propio del teléfono (requiere el relay actualizado).',
  'A relay that refuses through Tor says why.': 'Un relay que rechaza la conexión por Tor dice por qué.',
  // 3.1.0
  'Less battery in the background: the relay, Tor and the nearby radios.': 'Menos batería en segundo plano: el relay, Tor y las radios para teléfonos cercanos.',
  'Erevos no longer closes when you make a sticker from a photo.': 'Erevos ya no se cierra cuando haces un sticker a partir de una foto.',
  'Hidden chats’ notices are right.': 'Los avisos de los chats ocultos son correctos.',
  'Hidden chats by holding New chat.': 'Chats ocultos manteniendo pulsado Chat nuevo.',
  'A search for contacts on the Phone.': 'Búsqueda de contactos en el Teléfono.',
  'New chat shows first how to add a contact.': 'Chat nuevo muestra primero cómo añadir un contacto.',
  'A call shows over the screen saver, and the screen wakes.': 'Una llamada aparece por encima del salvapantallas, y la pantalla se enciende.',
  'Erevos in other apps’ Share.': 'Erevos en el menú Compartir de otras apps.',
  'A sound for every new message, also while Erevos shows.': 'Un sonido para cada mensaje nuevo, también con Erevos en pantalla.',
  'The SMS settings say right what holding does.': 'Los ajustes de SMS explican bien qué hace mantener pulsado.',
  // 3.0.0
  'Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.': 'Cada icono abre lo que indica: Erevos, SMS, Teléfono, Contactos, el widget.',
  '**Messages through Tor by default**: Messages, Everything or Nothing.': '**Mensajes por Tor de forma predeterminada**: Mensajes, Todo o Nada.',
  '**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.':
    '**Textos por Nostr**: tres relays públicos, por Tor, con tu propio relay como respaldo pasados 5 minutos.',
  // 2.0.3
  'One invite for everything: the relay and the contact together.': 'Una sola invitación para todo: el relay y el contacto a la vez.',
  'Spam rules for senders and numbers abroad, with the reason.': 'Reglas de spam para remitentes y números del extranjero, con el motivo.',
  '480 stickers in 20 sets.': '480 stickers en 20 paquetes.',
  'Lighter chats on older phones; QR codes at once.': 'Chats más ligeros en teléfonos antiguos; códigos QR al instante.',
  'Copy code for one-time codes in SMS.': '«Copiar código» para los códigos de un solo uso en los SMS.',
  'Locked, Erevos keeps receiving.': 'Bloqueado, Erevos sigue recibiendo.',
  'Faster contacts; the hidden chats’ notice counts only messages.': 'Contactos más rápidos; el aviso de los chats ocultos solo cuenta mensajes.',
  'The relay tries every address: push, other relays, the LPHL sign-in.': 'El relay prueba todas las direcciones: push, otros relays, el inicio de sesión con LPHL.',
  // 2.0.2
  'Swiping on the tabs only changes the tab.': 'Deslizar sobre las pestañas solo cambia de pestaña.',
  'The icons fill the launcher’s shape.': 'Los iconos llenan la forma del lanzador.',
  // 2.0.1
  'Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.':
    'Iconos de colores (Erevos rojo, Teléfono verde, SMS azul, Contactos violeta) y un icono de SMS nuevo.',
  'A colour for each icon, and the order of the widget’s buttons.': 'Un color para cada icono, y el orden de los botones del widget.',
  'Swipe to go back, and between tabs.': 'Deslizar para volver atrás, y entre pestañas.',
  // 2.0.0
  'An update of the WebView no longer closes Erevos.': 'Una actualización del WebView ya no cierra Erevos.',
  'Deleting or blocking a contact gives you a new queue on the relay.': 'Al eliminar o bloquear un contacto recibes una cola nueva en el relay.',
  'A new contact can take the name of a contact on the phone.': 'Un contacto nuevo puede tomar el nombre de un contacto del teléfono.',
  '**Sign in to the relay with LPHL**, and **invites to the relay**.': '**Iniciar sesión en el relay con LPHL**, e **invitaciones al relay**.',
  'Permissions in the web app, and more on Android; the web app’s notice says how many came.':
    'Permisos en la app web, y más en Android; el aviso de la app web dice cuántos mensajes llegaron.',
  'Hidden chats can ring calls while they are closed.': 'Los chats ocultos pueden sonar las llamadas mientras están cerrados.',
  'New keys every month in chats, every week in groups.': 'Claves nuevas cada mes en los chats, cada semana en los grupos.',
  'Linked devices work with the phone off.': 'Los dispositivos vinculados funcionan con el teléfono apagado.',
  'A new chat screen; QR codes from a photo; the Phone for small screens.': 'Una pantalla de chat nueva; códigos QR desde una foto; el Teléfono para pantallas pequeñas.',
  'Add as contact inside a group.': '«Añadir como contacto» dentro de un grupo.',
  'Stickers in sets, moving, and your own.': 'Stickers en paquetes, animados y propios.',
  'SMS inside the Erevos chat.': 'SMS dentro del chat de Erevos.',
  'Android updates need the release computer’s signature.': 'Las actualizaciones de Android necesitan la firma del ordenador de versiones.',
  'An F-Droid build; Serbo-Croatian; new version numbers.': 'Una versión para F-Droid; serbocroata; números de versión nuevos.',
  'Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.':
    'Mucho para la seguridad: Argon2id, mensajes cifrados también para el relay, un token para cada teléfono, ningún enlace inicia una llamada.',
  // 0.1.16
  'Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.': 'Las importaciones de Telegram y WhatsApp traen fotos, vídeos, mensajes de voz y archivos.',
  'A phone without a relay talks through a place on a contact’s relay.': 'Un teléfono sin relay se comunica a través de un sitio en el relay de un contacto.',
  // 0.1.14
  'Back to my chats, for hidden chats.': '«Volver a mis chats», para los chats ocultos.',
  'Erevos receives and rings even after you swipe it away from the recent apps.': 'Erevos recibe y suena incluso después de quitarlo de las apps recientes.',
  // 0.1.12
  'Hidden chats can say a message came.': 'Los chats ocultos pueden avisar de que llegó un mensaje.',
  'Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.': 'Arreglos: menús, códigos QR desde una foto, Bluetooth en Android 17, listas largas.',
  // 0.1.11
  'The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.':
    'El Teléfono sin la contraseña, si lo permites; un widget para la pantalla de inicio; un filtro de SMS y Erevos.',
  // 0.1.10
  'Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.': 'Los enlaces esperan a la contraseña; iconos de Teléfono y Contactos; el ID de Erevos en un contacto.',
  // 0.1.8
  '61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.':
    '61 funciones nuevas: 5 idiomas nuevos, dispositivos vinculados, grupos públicos, respuestas, reacciones, encuestas, enviar más tarde, Erevos como app de teléfono y contactos, puentes de Tor, la huella, Windows y más.',
  // 0.1.7 to 0.1.2
  'SMS notices in the background.': 'Avisos de SMS en segundo plano.',
  'The web app comes out with every release.': 'La app web sale con cada versión.',
  'Greek in the whole app.': 'Griego en toda la app.',
  'Web Push in the web app.': 'Web Push en la app web.',
  'The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.':
    'La primera versión firmada para Android: chats cifrados, llamadas, grupos, chats ocultos, copias de seguridad, importaciones y teléfonos cercanos sin internet.',
  "**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls.":
    "**Dos nuevos conjuntos de stickers con 24 estados de ánimo**: **Tux**, el pingüino de Linux tal como está dibujado, y **Aikido**, un aikidoka con keikogi y un hakama amplio, que también se inclina, se sienta en seiza y rueda.",
};
