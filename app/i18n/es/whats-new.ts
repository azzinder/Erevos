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
  '**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).':
    '**Los avisos en segundo plano ya no se detienen tras un cambio de red**: cuando la conexión de una espera en el relay moría por el camino (de Wi-Fi a datos móviles, reinicio del relay), Erevos tomaba el relay por uno antiguo, que no sabe esperar, durante toda la ejecución: los mensajes de los contactos llegaban hasta diez minutos tarde, y los chats ocultos, los espacios cerrados y los timbres ocultos no decían nada hasta reiniciar Erevos. Ver [Chatear a través de un relay](#relay).',
  '**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).':
    '**Una llamada colgada al instante ya no suena**: cuando el colgado llegaba en la misma mirada que la llamada, el teléfono sonaba 45 segundos por una llamada en la que no había nadie; lo mismo para una llamada de grupo que quien la empezó dejó al instante. Ver [Chatear a través de un relay](#relay).',
  '**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).':
    '**Una llamada oculta suena una vez**: un lugar con Recibir estando cerrados y una cola de timbre sonaba dos veces por una llamada, y una llamada atendida con los chats ocultos abiertos volvía a sonar al cerrarse. Ver [Chats ocultos](#hidden).',
  '**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).':
    '**El enlace de contacto de un miembro ya no dice Mensaje nuevo**: la respuesta a una petición desde un grupo solo añade el contacto, sin aviso. Ver [Chats de grupo](#groups).',
  '**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).':
    '**El aviso de cumpleaños y la llamada entrante del teléfono ya no se reemplazan**: tenían el mismo número de aviso. Ver [Contactos](#contacts).',
  '**A closed space tells of its contacts\' messages too**: since each contact writes to a queue of their own, a space that says a message came while another is open told only of group messages and first messages from new contacts. It now asks about its contacts\' queues too, up to 64. See [Chat through a relay](#relay).':
    '**Un espacio cerrado avisa también de los mensajes de sus contactos**: como cada contacto escribe en una cola propia, un espacio que avisa de que llegó un mensaje mientras otro está abierto solo avisaba de mensajes de grupos y de primeros mensajes de contactos nuevos. Ahora pregunta también por las colas de sus contactos, hasta 64. Ver [Chatear a través de un relay](#relay).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**La guía de uso está en todos los idiomas de la app**: se muestra en el que elegiste y nombra los botones como los muestra la app. Ver [Idioma](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Ubicación encuentra dónde estás, también en interiores**: el teléfono busca por satélite y por su red a la vez, una hoja dice que está buscando, y si no se encuentra nada dice por qué, con Volver a intentarlo. Ver [Chatear a través de un relay](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**El icono de la app web cuenta lo no leído**: en un iPhone, con las notificaciones activadas para el espacio, el icono de Erevos en la pantalla de inicio muestra cuántos mensajes no se han leído, nunca los de un chat oculto, salvo que lo desactives en Ajustes → Notificaciones → Número en el icono. Ver [En un iPhone](#iphone).',
  "**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).":
    "**Notificaciones para cada chat**: en Android, silencia un chat o un grupo durante 8 horas, una semana o siempre, y da a sus mensajes y llamadas un sonido propio, o ninguno. Mira [Chatear a través de un relay](#relay).",
  "**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden).":
    "**Un chat bloqueado con su propio PIN sigue bloqueado**: cuando el Erevos del contacto empezaba una conversación nueva, como hace más o menos una vez al mes, el chat perdía su PIN, y un grupo público al que volviste a unirte perdía el suyo. Ver [Chats ocultos](#hidden).",
  "**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay).":
    "**El icono de Erevos guarda el número de mensajes sin leer, en Android**: al salir de Erevos con mensajes sin leer, un aviso sin sonido guarda cuántos son hasta que los leas, y el launcher lo muestra en el icono, como número o punto. Ajustes → Notificaciones → Número en el icono lo desactiva. Ver [Chatear a través de un relay](#relay).",
  "**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone).":
    "**Las notificaciones de la app web, más fiables**: ningún Mensaje nuevo encima de Erevos mientras está abierto, y un push retenido mientras el teléfono estaba sin conexión ya no cuenta los mensajes que ya leíste (las dos cosas con tu relay actualizado), cada aviso suena en Chrome, Firefox y Edge, vuelven solas cuando el navegador cambia su dirección push, y Notificaciones con la app cerrada dice cuándo el navegador las bloquea o cuándo aún no se ha avisado a tu relay de que están desactivadas. Ver [En un iPhone](#iphone).",
  "**Calls ring in the web app, on the computer and on Sailfish OS**: a call that comes while Erevos is open now rings, where only its screen showed, and vibrates where the phone can. On an iPhone it rings once you have touched Erevos, and not on silent. See [On an iPhone](#iphone).":
    "**Las llamadas suenan en la app web, en el ordenador y en Sailfish OS**: una llamada que llega mientras Erevos está abierto ahora suena, donde solo se mostraba su pantalla, y vibra donde el teléfono puede. En un iPhone suena una vez que has tocado Erevos, y no en silencio. Ver [En un iPhone](#iphone).",
  '**Erevos on a computer keeps running with its window closed**: in the system tray (on a Mac, in the Dock) it goes on receiving, a call rings and brings the window back, and a notification says how many messages are not read, never who or what. Turn it off under Settings → Notifications → In the background. See [On a computer](#desktop).':
    '**Erevos en el ordenador sigue funcionando con su ventana cerrada**: en la bandeja del sistema (en un Mac, en el Dock) sigue recibiendo, una llamada suena y trae de vuelta la ventana, y una notificación dice cuántos mensajes no se han leído, nunca de quién ni qué. Se desactiva en Ajustes → Notificaciones → En segundo plano. Ver [En un ordenador](#desktop).',
  "**Erevos on Sailfish OS tells of messages and calls while it is closed**: while it is out of sight or closed, a small helper waits at the relay for the open space, a notification says how many messages came, never who or what, and a call rings with the phone's ringtone. See [On Sailfish OS](#sailfish).":
    "**Erevos en Sailfish OS avisa de mensajes y llamadas mientras está cerrado**: mientras no se ve o está cerrado, un pequeño ayudante espera en el relay por el espacio abierto, un aviso dice cuántos mensajes llegaron, nunca de quién ni qué, y una llamada suena con el tono del teléfono. Ver [En Sailfish OS](#sailfish).",
  "**The relay's pushes to the web app, sturdier**: a push the push service could not take just then is sent again, a call goes before the messages waiting their turn, and whoever runs the relay can allow another push service. Your relay needs an update for it.":
    "**Los push del relay a la app web, más robustos**: un push que el servicio push no pudo aceptar en ese momento se envía de nuevo, una llamada pasa por delante de los mensajes que esperan su turno, y quien gestiona el relay puede permitir otro servicio push. Tu relay necesita una actualización para ello.",
  "**Permissions checks every notice Erevos uses**: on Android, the message notice without sound or with a chat's own sound, and the reminders', turned off, now show there, with a button to each. See [Chat through a relay](#relay).":
    '**Permisos comprueba cada aviso que usa Erevos**: en Android, el aviso de mensajes sin sonido o con el sonido propio de un chat, y el de los recordatorios, si están desactivados, ahora aparecen ahí, con un botón para cada uno. Ver [Chatear a través de un relay](#relay).',
  '**Hidden chats say what their switches need**: Say when a message comes and Ring calls when closed say so when Settings → Notifications → In the background lets them do nothing. See [Hidden chats](#hidden).':
    '**Los chats ocultos dicen qué necesitan sus interruptores**: Avisar cuando llega un mensaje y Sonar las llamadas cuando están cerrados lo dicen cuando Ajustes → Notificaciones → En segundo plano no les deja hacer nada. Ver [Chats ocultos](#hidden).',
  "**Truer words about notices**: Settings and the guide give the notices' own words and say what each one needs. See [Chat through a relay](#relay).":
    '**Palabras más fieles sobre los avisos**: Ajustes y la guía dan las propias palabras de los avisos y dicen qué necesita cada uno. Ver [Chatear a través de un relay](#relay).',
  "**Calls ring as they should**: with Do Not Disturb only when their notice may break through, with a phone's clock off too once the relay is updated, and to the end on Android 7 and 8; a second call is told busy, and a ring stops only for its own call. See [Chat through a relay](#relay).":
    '**Las llamadas suenan como deben**: con «No molestar», solo cuando su aviso puede saltárselo, también con el reloj de un teléfono desajustado una vez actualizado el relay, y hasta el final en Android 7 y 8; a una segunda llamada se le dice que la línea está ocupada, y un timbre solo se detiene por su propia llamada. Ver [Chatear a través de un relay](#relay).',
  '**Hidden calls**: one turned down no longer leaves Erevos over the lock screen, one that comes while the password screen shows comes over it, and none rings twice. See [Hidden chats](#hidden).':
    '**Llamadas ocultas**: una rechazada ya no deja Erevos sobre la pantalla de bloqueo, una que llega mientras se muestra la pantalla de la contraseña aparece sobre ella, y ninguna suena dos veces. Ver [Chats ocultos](#hidden).',
  '**Notices come again at once after a change of network**, and receiving starts again as Erevos shows when Android refused it. See [Chat through a relay](#relay).':
    '**Los avisos vuelven al instante tras un cambio de red**, y la recepción se reanuda al mostrarse Erevos cuando Android la había rechazado. Ver [Chatear a través de un relay](#relay).',
  "**Hidden chats' notices tell each message once**: what came since a place last looked is told as it closes, a call that rang is not told again as a message, and a place whose queue the relay lost keeps its switch on. See [Hidden chats](#hidden).":
    '**Los avisos de los chats ocultos cuentan cada mensaje una vez**: lo que llegó desde la última vez que un lugar miró se avisa al cerrarse, una llamada que sonó no se avisa otra vez como mensaje, y un lugar cuya cola perdió el relay mantiene su interruptor activado. Ver [Chats ocultos](#hidden).',
  '**Hidden chats close while Erevos is away**, after 30 seconds, so a call to them meanwhile rings with their PIN to answer. See [Hidden chats](#hidden).':
    '**Los chats ocultos se cierran mientras Erevos no está a la vista**, tras 30 segundos, así que una llamada para ellos mientras tanto suena con su PIN para responder. Ver [Chats ocultos](#hidden).',
  '**A voice message counts once**, on its last part, also when it goes again whole.':
    '**Un mensaje de voz cuenta una vez**, en su última parte, también cuando se vuelve a enviar entero.',
  '**The number on the icon counts only what is still there**: a message deleted for everyone, or read on a linked computer, no longer counts. See [Chat through a relay](#relay).':
    '**El número en el icono solo cuenta lo que sigue ahí**: un mensaje eliminado para todos, o leído en un ordenador vinculado, ya no cuenta. Ver [Chatear a través de un relay](#relay).',
  '**Messages sent for later** tell of themselves only while their space is open, without sound if sent so.':
    '**Los mensajes enviados para más tarde** solo avisan de sí mismos mientras su espacio está abierto, sin sonido si se enviaron así.',
  '**SMS**: one to the chat on screen only sounds there, they are marked read only while their screen shows, and Android names their notices SMS. See [SMS](#sms).':
    '**SMS**: uno que llega al chat que está en pantalla solo suena ahí, se marcan como leídos solo mientras su pantalla está a la vista, y Android llama SMS a sus avisos. Ver [SMS](#sms).',
  "**Reminders**: one seen in Chat with myself goes from the notice, a hidden place's go with a new PIN, and birthdays come at 9:00. See [Getting started](#start).":
    '**Recordatorios**: uno visto en Chat conmigo se va del aviso, los de un lugar oculto se van con un PIN nuevo, y los cumpleaños llegan a las 9:00. Ver [Primeros pasos](#start).',
  '**Nostr reads as soon as Tor is ready.** See [Through Nostr](#nostr).':
    '**Nostr lee en cuanto Tor está listo.** Ver [A través de Nostr](#nostr).',
  "**Erevos's notices show its mark** in the status bar.":
    '**Los avisos de Erevos muestran su marca** en la barra de estado.',
  '**Notices are asked for with receiving off too**, when Say a message came is on.':
    '**Los avisos se piden también con la recepción desactivada**, cuando Avisar de mensajes nuevos está activado.',
  "**Photos open on the whole screen**: tap one to see it edge to edge, zoom in with two fingers or a double tap, and tap again to hide or show what is around it; big photos open as small ones do. Erevos also turns with the phone while the phone's Auto-rotate is on, and a photo shown on its own even when it is off. See [Chat through a relay](#relay).":
    '**Las fotos se abren en toda la pantalla**: toca una para verla de borde a borde, amplíala con dos dedos o con un doble toque, y vuelve a tocar para ocultar o mostrar lo que hay alrededor; las fotos grandes se abren como las pequeñas. Erevos también gira con el teléfono mientras Girar automáticamente está activado en él, y una foto vista sola incluso cuando está desactivado. Ver [Chatear a través de un relay](#relay).',
  "**Matrix accounts in Erevos**: sign a space in to Matrix and chat with people who use Element or another Matrix app, end-to-end encrypted, under Settings → Relay and networks → Matrix. These chats are not anonymous, and say so: the Matrix server sees who talks with whom. Text, photos and files. See [Matrix](#matrix).":
    "**Cuentas de Matrix en Erevos**: inicia sesión en Matrix desde un espacio y chatea con personas que usan Element u otra app de Matrix, con cifrado de extremo a extremo, en Ajustes → Relay y redes → Matrix. Estos chats no son anónimos, y lo dicen: el servidor de Matrix ve quién habla con quién. Texto, fotos y archivos. Ver [Matrix](#matrix).",
  "**Every network's chats on the home screen**: once you sign in to Matrix, its chats are in the list with the Erevos chats and the SMS, newest first, each marked Matrix, and the Matrix chip shows them alone, as SMS and Erevos do. See [Matrix](#matrix).":
    "**Los chats de todas las redes en la pantalla de inicio**: una vez que inicias sesión en Matrix, sus chats están en la lista con los chats de Erevos y los SMS, los más recientes primero, cada uno marcado Matrix, y el chip Matrix muestra solo ellos, como SMS y Erevos. Ver [Matrix](#matrix).",
  '**Test versions before a release**: Erevos reads a version such as 4.0.0-rc.1, a test version that comes before 4.0.0, when it looks for updates, tells of a new version and shows what is new. See [Updates](#updates).':
    '**Versiones de prueba antes de una versión**: Erevos lee una versión como 4.0.0-rc.1, una versión de prueba que va antes de la 4.0.0, al buscar actualizaciones, al avisar de una versión nueva y al mostrar las novedades. Ver [Actualizaciones](#updates).',
  "**Check Matrix devices by emoji**: in a chat with one person on Matrix, Check by emoji shows you both seven pictures; if they match, nobody sits in between, and Element sees the check too. Check this device with another of yours makes your own Element trust Erevos. See [Matrix](#matrix).":
    "**Comprobar dispositivos de Matrix con emojis**: en un chat con una persona en Matrix, Comprobar con emojis os muestra a los dos siete imágenes; si coinciden, nadie está en medio, y Element también ve la comprobación. Comprobar este dispositivo con otro tuyo hace que tu propio Element confíe en Erevos. Ver [Matrix](#matrix).",
  "**Automatic backups to your own server too**: on Android, each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. Off until you add one. The server gets random bytes under a random name and cannot open them; it still sees your account, your address and when. See [Backups](#backup).":
    "**Copias automáticas también a tu propio servidor**: en Android, cada copia automática puede ir también a una carpeta en un servidor que elijas, como tu Nextcloud, por WebDAV. Desactivado hasta que añadas uno. El servidor recibe bytes aleatorios con un nombre aleatorio y no puede abrirlos; aun así ve tu cuenta, tu dirección y cuándo. Ver [Copias de seguridad](#backup).",
  "**Matrix Security Key and key backup**: enter the Security Key Element made, under Settings → Relay and networks → Matrix, and earlier messages open, new keys are backed up, and your other devices trust Erevos. An account with none can set one up there. See [Matrix](#matrix).":
    "**Clave de seguridad y copia de claves de Matrix**: escribe la clave de seguridad que creó Element, en Ajustes → Relay y redes → Matrix, y se abren los mensajes anteriores, se guardan copias de las claves nuevas, y tus otros dispositivos confían en Erevos. Una cuenta sin ella puede crear una allí. Ver [Matrix](#matrix).",
  "**Matrix through Tor**: on Android, a space's Matrix account follows its choice under Settings → Relay and networks → Tor, so the Matrix server no longer sees where you are; the Matrix screen says when it goes through Tor. See [Matrix](#matrix).":
    "**Matrix por Tor**: en Android, la cuenta de Matrix de un espacio sigue su elección en Ajustes → Relay y redes → Tor, así que el servidor de Matrix ya no ve dónde estás; la pantalla de Matrix dice cuándo va por Tor. Ver [Matrix](#matrix).",
  "**XMPP accounts in Erevos**: sign a space in to XMPP, under Settings → Relay and networks → XMPP, and chat with people who use Conversations, Monal, Gajim, Dino or another XMPP app, encrypted with OMEMO. These chats are not anonymous, and say so: the XMPP server sees who talks with whom. Text with delivery and read marks, photos and files, in the home list under an XMPP chip of its own, and through Tor on Android as you chose. See [XMPP](#xmpp).":
    "**Cuentas de XMPP en Erevos**: inicia sesión en XMPP desde un espacio, en Ajustes → Relay y redes → XMPP, y chatea con personas que usan Conversations, Monal, Gajim, Dino u otra app de XMPP, cifrado con OMEMO. Estos chats no son anónimos, y lo dicen: el servidor de XMPP ve quién habla con quién. Texto con marcas de entrega y de lectura, fotos y archivos, en la lista de inicio bajo un chip XMPP propio, y por Tor en Android como elijas. Ver [XMPP](#xmpp).",
  "**Voice and video calls with people on XMPP**: the two tiles at the top of an XMPP chat call the person, and their calls ring on the same screen as Erevos's own, with apps that call as Conversations does. The call goes through your call relay or the XMPP server's, so they do not learn your address; the key that proves it passes through the XMPP servers, which could put themselves in between. See [XMPP](#xmpp).":
    "**Llamadas de voz y video con personas en XMPP**: los dos recuadros de arriba de un chat de XMPP llaman a la persona, y sus llamadas suenan en la misma pantalla que las de Erevos, con apps que llaman como Conversations. La llamada pasa por tu relay de llamadas o el del servidor de XMPP, así que no conoce tu dirección; la clave que la prueba pasa por los servidores de XMPP, que podrían ponerse en medio. Mira [XMPP](#xmpp).",
  "**Voice and video calls with people on Matrix**: on Android, the two tiles at the top of a Matrix chat call with Element Call, the call app of Element and Element X, which opens inside Erevos in a window of its own, and their calls ring here as Erevos's own do. Sound and picture are end-to-end encrypted and go through the media server your Matrix server names, never through Tor. See [Matrix](#matrix).":
    "**Llamadas de voz y video con gente en Matrix**: en Android, los dos recuadros de arriba de un chat de Matrix llaman con Element Call, la app de llamadas de Element y Element X, que se abre dentro de Erevos en una ventana propia, y sus llamadas suenan aquí como las de Erevos. El sonido y la imagen van cifrados de extremo a extremo y pasan por el servidor de medios que indica tu servidor de Matrix, nunca por Tor. Ver [Matrix](#matrix).",
  "**Voice and video calls with people on Matrix, in the web app and on a computer**: the two tiles at the top of a Matrix chat call with Element Call there too, as on Android, over the app; its back arrow makes it small in a corner, so you can keep using Erevos during the call. Element Call runs apart from Erevos and can read nothing of it. See [Matrix](#matrix).":
    "**Llamadas de voz y video con gente en Matrix, en la app web y en el ordenador**: los dos recuadros de arriba de un chat de Matrix llaman también allí con Element Call, como en Android, sobre la app; la flecha de atrás de su ventana la reduce a una esquina, para que puedas seguir usando Erevos durante la llamada. Element Call funciona aparte de Erevos y no puede leer nada de él. Ver [Matrix](#matrix).",
  "**Chats with people on other Nostr apps**: give a space a Nostr key of its own, under Settings → Relay and networks → Nostr chats, and chat with people who use Damus, Amethyst, Primal, 0xchat or another Nostr app, one to one or in groups, encrypted as NIP-17 asks: the relays see whom a message is for, not who wrote it. These chats are not anonymous, and say so: your key is the same to everyone you write to. Text, photos, files and reactions, in the home list under a Nostr chip of its own, and through Tor on Android as you chose. See [Chats with other Nostr apps](#nostr-chats).":
    "**Chats con personas en otras apps de Nostr**: da a un espacio una clave de Nostr propia, en Ajustes → Relay y redes → Chats de Nostr, y chatea con personas que usan Damus, Amethyst, Primal, 0xchat u otra app de Nostr, de tú a tú o en grupos, cifrado como pide NIP-17: los relays ven para quién es un mensaje, no quién lo escribió. Estos chats no son anónimos y lo dicen: tu clave es la misma para todos a quienes escribes. Texto, fotos, archivos y reacciones, en la lista de inicio bajo un botón Nostr propio, y por Tor en Android como elegiste. Ver [Chats con otras apps de Nostr](#nostr-chats).",
  "**Notices for Matrix, XMPP and Nostr messages**: a message in a chat on Matrix, XMPP or Nostr shows a notice and counts in the number on Erevos's icon, as in Erevos's own chats. On Android, Notifications at the bottom of such a chat mutes it or gives it a sound of its own, and an XMPP or Matrix call rings with its chat's ringtone. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats).":
    "**Avisos de los mensajes de Matrix, XMPP y Nostr**: un mensaje en un chat de Matrix, XMPP o Nostr muestra un aviso y cuenta en el número del icono de Erevos, como en los chats propios de Erevos. En Android, Notificaciones, al final de un chat así, lo silencia o le da un sonido propio, y una llamada de XMPP o Matrix suena con el tono de su chat. Ver [Matrix](#matrix), [XMPP](#xmpp) y [Chats con otras apps de Nostr](#nostr-chats).",
  "**A closed space tells of Matrix messages**: on Android, Say a message came under While this space is closed, on the Matrix screen, has a closed space say \"New message\" when something comes on Matrix while another space is open, never what, from whom or in which chat. Off until you choose it. The Matrix server then tells the space's relay of each message, with no words in it: it learns the relay's address, and the relay when messages come. See [Matrix](#matrix).":
    "**Un espacio cerrado avisa de los mensajes de Matrix**: en Android, «Avisar de mensajes nuevos» en «Mientras este espacio está cerrado», en la pantalla de Matrix, hace que un espacio cerrado diga «Mensaje nuevo» cuando llega algo en Matrix mientras otro espacio está abierto, nunca qué, de quién ni en qué chat. Desactivado hasta que lo elijas. El servidor de Matrix avisa entonces al relay del espacio de cada mensaje, sin ninguna palabra suya: sabe la dirección del relay, y el relay cuándo llegan mensajes. Ver [Matrix](#matrix).",
  "**Made with others' open source**: About Erevos, and the guide, now name the open-source projects Erevos is built on, with their makers and their licences. See [What Erevos is](#about).":
    "**Hecho con el código abierto de otros**: En Acerca de Erevos y en la guía figuran ahora los proyectos de código abierto sobre los que está construido Erevos, con sus autores y sus licencias. Ver [Qué es Erevos](#about).",
  "**Groups on XMPP**: under Settings → Relay and networks → XMPP, make a private group with your contacts, encrypted with OMEMO for every member as Conversations' private groups are, or join a group by its address, and answer invitations to groups. A group that is not private, a channel, is not encrypted, and says so. Your groups follow your account's other XMPP apps, and a channel tells only of messages that name you. See [XMPP](#xmpp).":
    "**Grupos en XMPP**: en Ajustes → Relay y redes → XMPP, crea un grupo privado con tus contactos, cifrado con OMEMO para cada miembro como los grupos privados de Conversations, o entra en un grupo con su dirección, y responde a las invitaciones a grupos. Un grupo que no es privado, un canal, no está cifrado, y lo dice. Tus grupos siguen a las otras apps de XMPP de tu cuenta, y un canal avisa solo de los mensajes que te nombran. Ver [XMPP](#xmpp).",
  "**More in Matrix chats**: hold a message to react to it, reply to it, copy it and, if it is yours, edit it or delete it for everyone. Load earlier messages brings in older ones, and the microphone under the message box sends voice messages that Element plays too. Reactions are not encrypted, as Element sends them. See [Matrix](#matrix).":
    "**Más en los chats de Matrix**: mantén pulsado un mensaje para reaccionar, responderle, copiarlo y, si es tuyo, editarlo o eliminarlo para todos. «Cargar mensajes anteriores» trae los más antiguos, y el micrófono bajo el campo del mensaje envía mensajes de voz que Element también reproduce. Las reacciones no van cifradas, tal como las envía Element. Ver [Matrix](#matrix).",
  "**Video added to an XMPP call**: in a voice call with someone on XMPP, either of you can turn on video with Add video; the other is asked first and can say Not now. It works with apps that add video to a call as Conversations does. See [XMPP](#xmpp).":
    "**Video añadido a una llamada de XMPP**: en una llamada de voz con alguien en XMPP, cualquiera de los dos puede activar el video con «Añadir vídeo»; a la otra persona se le pregunta primero y puede decir «Ahora no». Funciona con apps que añaden video a una llamada como Conversations. Ver [XMPP](#xmpp).",
  "**Voice messages and replies in Nostr chats**: hold the microphone under the message box to send a voice message, which plays with Play; hold a message to reply to it, and the answer shows the message it is to, here and in other Nostr apps. See [Chats with other Nostr apps](#nostr-chats).":
    "**Mensajes de voz y respuestas en los chats de Nostr**: mantén pulsado el micrófono bajo el campo del mensaje para enviar un mensaje de voz, que se reproduce con «Reproducir»; mantén pulsado un mensaje para responderle, y la respuesta muestra el mensaje al que responde, aquí y en otras apps de Nostr. Ver [Chats con otras apps de Nostr](#nostr-chats).",
  "**OMEMO 2 in XMPP chats**: a message to someone whose app speaks OMEMO 2, as Kaidan does, now goes with OMEMO 2 to that app and with OMEMO 0.3 to their others, as before. The XMPP screen shows this device's key both ways, to compare with what each app shows. See [XMPP](#xmpp).":
    "**OMEMO 2 en los chats de XMPP**: un mensaje a alguien cuya app habla OMEMO 2, como Kaidan, ahora va con OMEMO 2 a esa app y con OMEMO 0.3 a sus otras apps, como antes. La pantalla de XMPP muestra la clave de este dispositivo de las dos maneras, para compararla con lo que muestra cada app. Ver [XMPP](#xmpp).",
  "**Hidden chats can have their own Matrix, XMPP and Nostr accounts**: under the list of a place of hidden chats, Matrix, XMPP and Nostr open an account of that place alone, apart from the space's, kept encrypted with the hidden chats' key. Its chats show among the hidden chats only, and it connects only while they are open, so nothing comes and no notice shows while they are closed. Its Matrix and XMPP calls ring only while they are open. See [Hidden chats](#hidden).":
    "**Los chats ocultos pueden tener sus propias cuentas de Matrix, XMPP y Nostr**: bajo la lista de un lugar de chats ocultos, Matrix, XMPP y Nostr abren una cuenta solo de ese lugar, aparte de la del espacio y guardada cifrada con la clave de los chats ocultos. Sus chats se ven solo entre los chats ocultos, y se conecta solo mientras están abiertos, así que mientras están cerrados no llega nada y no sale ningún aviso. Sus llamadas de Matrix y XMPP suenan solo mientras están abiertos. Ver [Chats ocultos](#hidden).",
  "**Matrix, XMPP and Nostr in backups**: a backup now holds the Matrix, XMPP and Nostr accounts of every space and of its hidden chats. After a restore, a Nostr key comes back with its chats as they were; an XMPP account goes on as a new device of the account, with its contacts and chats; a Matrix account is let go of on this phone, and the space signs in again as a new device; its Security Key opens the messages from before. See [Backups](#backup).":
    "**Matrix, XMPP y Nostr en las copias de seguridad**: una copia ahora contiene las cuentas de Matrix, XMPP y Nostr de cada espacio y de sus chats ocultos. Tras restaurar, una clave de Nostr vuelve con sus chats como estaban; una cuenta de XMPP sigue como un dispositivo nuevo de la cuenta, con sus contactos y chats; una cuenta de Matrix se suelta en este teléfono, y el espacio inicia sesión de nuevo como un dispositivo nuevo; su clave de seguridad abre los mensajes de antes. Ver [Copias de seguridad](#backup).",
  "**Matrix voice messages show their waveform, and Nostr answers can be photos**: a voice message sent in a Matrix chat carries its waveform, which Element draws, and one that comes with a waveform shows it under Play; in a Nostr chat, a photo, file or voice message sent while a message shows over the message box answers it. See [Matrix](#matrix) and [Chats with other Nostr apps](#nostr-chats).":
    "**Los mensajes de voz de Matrix muestran su forma de onda, y las respuestas en Nostr pueden ser fotos**: un mensaje de voz enviado en un chat de Matrix lleva su forma de onda, que Element dibuja, y uno que llega con forma de onda la muestra bajo Reproducir; en un chat de Nostr, una foto, un archivo o un mensaje de voz enviado mientras un mensaje aparece sobre el campo del mensaje le responde. Ver [Matrix](#matrix) y [Chats con otras apps de Nostr](#nostr-chats).",
  "**Group calls in XMPP groups**: in a private XMPP group, start a voice or video call, answer one that rings, or join one going on, together with people who use Dino. See [XMPP](#xmpp).":
    "**Llamadas de grupo en grupos de XMPP**: en un grupo privado de XMPP, inicia una llamada de voz o de video, responde a una que suena, o únete a una en curso, junto con personas que usan Dino. Ver [XMPP](#xmpp).",
  '**A call to a slow phone rings in full**: the caller now waits up to a minute and a quarter for the other phone to say it rings, and then 45 seconds from then, so a call that reached it late no longer rings there only to stop at once; and the phone called reads a call before anything it has to send, and waits for calls again at once after its network changes. See [Chat through a relay](#relay).':
    '**Una llamada a un teléfono lento suena entera**: quien llama espera ahora hasta un minuto y cuarto a que el otro teléfono diga que suena, y luego 45 segundos desde entonces, así que una llamada que le llegó tarde ya no suena allí solo para parar enseguida; y el teléfono que recibe la llamada la lee antes de todo lo que tiene que enviar, y vuelve a esperar llamadas de inmediato cuando cambia de red. Ver [Chatear a través de un relay](#relay).',
  "**The web app and the computer reach Matrix, XMPP and Nostr servers over HTTPS**: their page policy allowed only WebSocket connections, so Matrix sign-in, XMPP server discovery and file sharing, and Nostr files and name lookups failed there. They work now. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats).":
    "**La app web y el ordenador llegan a servidores de Matrix, XMPP y Nostr por HTTPS**: la política de su página solo permitía conexiones WebSocket, así que allí fallaban el inicio de sesión en Matrix, el descubrimiento del servidor XMPP y el envío de archivos, y los archivos y las búsquedas de nombres de Nostr. Ahora funcionan. Ver [Matrix](#matrix), [XMPP](#xmpp) y [Chats con otras apps de Nostr](#nostr-chats).",
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
  "**A new sticker set, Takis**: a caricature in a dark suit and a purple tie with dots, in 24 moods that move.":
    "**Un nuevo conjunto de stickers, Takis**: una caricatura con traje oscuro y corbata morada de lunares, en 24 estados de ánimo que se mueven.",
};
