/** The user guide in Spanish. Its format: lib/guide.ts. The same sections, in the same order and shape, as the English one. */
export const guide = `
## Qué es Erevos {#about}

Erevos es una app de mensajería hecha para la privacidad. No necesitas cuenta, número de teléfono ni email para usarla,
y está pensada para seguir funcionando estés donde estés: a través de un teléfono cercano sin ninguna red, por Wi-Fi o
por internet.

- **Cerca, sin internet:** dos teléfonos Android hablan directamente por Bluetooth, Wi-Fi Aware o Wi-Fi Direct, con
  cifrado de extremo a extremo, y lo mismo hacen teléfonos y ordenadores en la misma Wi-Fi o en el punto de acceso de un
  teléfono. Con una radio LoRa, los textos llegan a kilómetros.
- **A través de un relay:** por Wi-Fi o por internet, a través de un pequeño servidor (un relay) que puedes tener tú
  mismo.
- **Espacios:** un bloqueo con contraseña, una segunda contraseña que abre un Erevos aparte y vacío, y chats ocultos en
  cada espacio.
- **Apariencia:** los acabados de LPHL: Classic, Modernist y Nocturne, doce paletas, y cristal como en lphl.nekten.eu.

> Los mensajes están **cifrados de extremo a extremo**, tanto a través de un relay como cerca, pero nada ha sido auditado
> todavía por expertos independientes. [Qué está protegido hoy](#privacy) dice exactamente qué lo está y qué no.

Esta guía se abre desde **Guía de uso** en el menú de la pantalla de inicio (los tres puntos de arriba). La búsqueda de su
parte superior encuentra cualquier palabra que haya en ella. La guía está en todos los idiomas de la app, y se muestra en el que
elegiste, ver [Idioma](#start).

### Quién lo hace, y por qué

- **Quién:** Erevos lo hace la misma persona que hizo FASOULI.
- **Dónde:** no importa. Lo que importa es que el relay y la app para el navegador funcionan en el servidor propio de
  quien lo hace (lphl.nekten.eu).
- **Para quién:** para cualquiera que quiera hablar con los suyos sin dar un número de teléfono, un email ni una
  cuenta: amigos, familias, grupos, y quienes viven donde internet se corta o se vigila. Y para quienes, sin nada que
  ocultar, quieren mantener su espacio personal en privado, lejos de miradas indiscretas.
- **Por qué:** porque las apps conocidas piden un número de teléfono, saben quién habla con quién y dejan de funcionar
  cuando cae internet. Porque las «condiciones de uso» de algunas no nos amparan, y tenemos dudas sobre cómo protegen
  nuestra privacidad. Porque a otras les faltan funciones que necesitamos. Erevos no pide nada y encuentra un camino a
  través de lo que haya: internet, Wi-Fi, Bluetooth, un teléfono cercano.
- **Quién paga:** nadie: sin anuncios, sin inversores, sin recogida de datos. Quien quiera puede ayudar con los gastos
  de funcionamiento, como el servidor: **Ajustes** → **General** → **Apoyar Erevos** tiene las formas, Liberapay,
  PayPal, Monero y Bitcoin. Dar o no dar no cambia nada en la app.
  **Por qué:** cada forma se abre fuera de Erevos, en el navegador o en un monedero, solo cuando la tocas, así que Erevos
  en sí no envía nada y nunca sabe quién dio. PayPal sabe quién da; Monero no muestra ni quién dio ni cuánto; Bitcoin no
  muestra nombres, pero lo que recibió la dirección es público.

Esta parte también se abre desde **Ajustes** → **General** → **Acerca de Erevos**.

## Primeros pasos {#start}

Erevos se descarga de su página de versiones, un archivo para cada sistema: ver [Actualizaciones](#updates) para saber
dónde, y cómo actualizarlo. Funciona en Android, en un ordenador (Linux, macOS y Windows), en Sailfish OS y, desde el
navegador, en un iPhone. Si eres nuevo, empieza con una invitación de alguien que lo use: un código QR o un enlace, y ya
estás dentro, con esa persona como contacto (ver Invitar a alguien nuevo, en [Chatear a través de un relay](#relay)).

La pantalla de inicio es la lista de tus chats, con el que se movió por última vez arriba. Cada uno muestra la imagen del
contacto, el último mensaje con sus marcas, cuándo llegó y cuántos de sus mensajes no has leído. Un reloj al lado
significa que sus mensajes desaparecen. **Buscar chats** encuentra un chat por su nombre o por su último mensaje y, bajo
los chats, los mensajes que contienen lo que escribes, en todos los chats del espacio: toca uno para abrir su chat en ese
punto. En un chat, sus detalles tienen **Buscar en este chat**: ▲ y ▼ van a lo que encontró antes y después. Ambas
buscan solo en este teléfono: en lo que guarda sellado, y **Buscar en este chat** también en los SMS que muestra el chat
de un contacto; los chats ocultos solo se buscan desde dentro. Un chat largo se abre en sus últimos 100 mensajes, y los
anteriores, entre ellos los importados de Telegram o WhatsApp, llegan solos al desplazarte hacia arriba (**Mostrar
mensajes anteriores**, encima de ellos, también los trae); ir a uno anterior (desde la búsqueda, un mensaje destacado o
el mensaje al que responde otro) también lo trae.
Al desplazarte un poco hacia arriba, aparecen dos flechas redondas abajo a la derecha, igual en un chat, en un grupo y en
una conversación SMS: la de arriba va al principio del chat, la de abajo vuelve a su final. Desde el principio,
**Mostrar mensajes posteriores**, bajo lo que se ve, trae más; escribir un mensaje, o la flecha de abajo, vuelve al final.

**Por qué:** un chat largo se abre en sus últimos mensajes para que se abra al instante: dibujarlo entero de una vez
sería lento, sobre todo en teléfonos antiguos. Los chats ocultos quedan fuera de la búsqueda de la pantalla de inicio
para que se vea igual tanto si un espacio tiene alguno como si no: sus mensajes solo se pueden leer mientras su PIN los
tiene abiertos.

- **La imagen** se dibuja a partir de la clave del contacto: la misma clave da siempre los mismos colores y la misma luna
  (en verdes con Matrix), así que reconoces un chat de un vistazo sin ninguna foto. No es una comprobación de la clave;
  el [número de seguridad](#relay) sí lo es.
- **La línea bajo la búsqueda** dice si hay un relay configurado y si tu cola está lista. Tócala para configurar uno.
- **Chat conmigo**, siempre el primero de los chats, con una chincheta, guarda tus notas para ti: ver Chat conmigo y
  recordatorios más abajo.
- **Chat nuevo**, abajo, abre los ajustes del relay y la opción de añadir un contacto. **Recordarme**, la campana naranja
  de al lado, te escribe un recordatorio.
- **El auricular verde y la persona violeta** de arriba, en Android, abren **Teléfono** y **Contactos** directamente, en
  los colores de sus iconos en la pantalla de inicio del teléfono. No están además en el menú de los tres puntos.
- **Todos**, **SMS** y **Erevos**, encima de los chats en cuanto hay también conversaciones SMS, muestran todo, solo los
  SMS (con los chats cuyo último mensaje fue un SMS), o solo los chats de Erevos, de cada contacto lo último que
  llegó.
- **El widget**, en Android: añade Erevos desde los widgets de tu pantalla de inicio. Sus cuatro botones abren
  **Teléfono**, los **SMS**, los **Mensajes** de Erevos y **Contactos**, tras la contraseña como cualquier enlace (el
  Teléfono sin ella, si lo permites). Sobre los tres primeros muestra cuántas llamadas perdidas, SMS sin leer y mensajes
  nuevos hay, nunca de quién ni qué; con llamadas perdidas, **Teléfono** se abre en **Recientes**. Un botón tocado otra
  vez vuelve a mostrar su pantalla, también después de haber elegido otra pestaña ahí. Sus palabras siguen el idioma de
  Erevos. **Ajustes** → **Apariencia** → **Widget** fija el orden de sus botones.
- **El candado naranja** de arriba bloquea Erevos al instante cuando hay una contraseña puesta, o abre los ajustes del
  bloqueo cuando no.
- **Los tres puntos** abren lo demás:

| En el menú | Qué abre |
| --- | --- |
| **Grupo nuevo** | Un chat de grupo con tus contactos. Ver [Chats de grupo](#groups). |
| **Grupos públicos** | Un grupo al que cualquiera con su enlace puede pedir unirse, con un propietario y admins. Ver [Grupos públicos](#public-groups). |
| **Mensajes destacados** | Los mensajes que destacaste, en todos tus chats. Ver El menú de un mensaje, en Chatear a través de un relay. |
| **Teléfonos cercanos** | Tus contactos por Bluetooth y Wi-Fi Aware, o en la misma Wi-Fi, sin internet. Ver [Chatear con un teléfono cercano](#nearby). |
| **Guía de uso** | Esta guía. |
| **Ajustes** | La última fila, con un engranaje: todo lo que puedes ajustar, en grupos, con una búsqueda. Ver Ajustes más abajo. |

Dentro de un chat, su nombre y su imagen están arriba con cómo viaja: **Cifrado** (de extremo a extremo), **En línea**,
**Cerca** mientras su teléfono está conectado al tuyo por radio, o **escribiendo…**, con un cronómetro cuando los
mensajes del chat desaparecen. A su lado, el recuadro azul con una cámara inicia una videollamada y el verde con un
auricular, una llamada de voz. Toca el nombre, o **⋯** tras ellos (**⋮** en Android), para los **Detalles** del chat: su
imagen (tócala para cambiarla), **Llamar**, **Vídeo**, **Cambiar nombre** e **Imagen**, luego **Mensajes temporales**,
**Aparecer sin conexión**, **Apariencia del chat**, el **Número de seguridad**, **Mover a chats ocultos** y **Eliminar
mensajes**. **Hecho** los cierra.

**Multimedia, enlaces y archivos**, en los detalles bajo **Buscar en este chat**, lista lo que contiene el chat, cada tipo
en su propia pestaña con cuántos hay: **Fotos** (en cuadrícula), **Vídeos**, **Mensajes de voz**, **Música**, **Archivos**
y **Enlaces**, los más nuevos primero bajo sus meses, también los importados de Telegram o WhatsApp. Un toque abre una
foto o un archivo para verlo o guardarlo, reproduce un sonido ahí mismo, o abre un enlace después de preguntar;
manteniéndolo pulsado, cada uno ofrece **Ver en el chat**, que va a su mensaje. Uno que aún no se ha recogido del relay
lleva al chat, donde un toque lo recoge. El calendario de arriba va a un día: están marcados los días que tienen algo de
ese tipo. **Ir a un día**, debajo en los detalles, hace lo mismo con el propio chat: va al primer mensaje de ese día.

**Por qué:** las listas se hacen en este teléfono a partir de lo que ya guarda, así que ningún servidor sabe qué
contiene un chat; y solo se leen las fotos que están en pantalla, como en el chat, así que un chat con miles de ellas se
abre tan rápido como uno sin ninguna.

Una buena primera hora:

1. Abre **Ajustes** → **Privacidad y seguridad** → **Bloqueo y segunda contraseña** y pon una contraseña, para que nadie
   que coja el teléfono pueda abrir Erevos.
2. Abre **Teléfonos cercanos** desde el menú en dos teléfonos que estén cerca el uno del otro, y permite lo que pida
   Android.
3. Añadíos mutuamente con **Mostrar mi código QR**, como en [Chatear con un teléfono cercano](#nearby), y envía un
   mensaje: va de cerca, cifrado de extremo a extremo, sin relay y sin internet.
4. Para hablar desde más lejos, configura un relay como en [Chatear a través de un relay](#relay).

### Chat conmigo y recordatorios

**Chat conmigo** está siempre arriba de los chats, con una chincheta, en cada espacio. Es un chat sin nadie más: escríbete
notas, enlaces, fotos, archivos y mensajes de voz, como en cualquier chat. Nada de lo que hay en él va a ninguna parte: se
queda en este teléfono, cifrado en el espacio, y no pasa a tus dispositivos vinculados. Una copia de seguridad incluye
sus notas y mensajes de voz, pero no sus fotos ni archivos, como con los chats.

- **Un recordatorio:** toca **Recordarme** (la campana naranja junto a **Chat nuevo**), escribe lo que quieres que te
  recuerde, elige una hora (**En 1 hora**, **Esta noche 20:00**, **Mañana 09:00**, o cualquier día, hora y minuto) y
  toca **Recordarme**. Va a Chat conmigo, con una campana y su hora. En el chat, **+** → **Recordarme**, o mantener
  pulsada la flecha de enviar, también da una hora a la nota que escribes.
- **A su hora**, en Android, el teléfono muestra un aviso, **Reminder** (o **3 reminders**) – «Open Chat with myself
  to read it», nunca lo que dice, también con Erevos cerrado y bloqueado; al tocarlo, abre Chat conmigo, tras la
  contraseña. Hasta que abras el chat, el recordatorio aparece en su fila arriba de los chats, con un contador, y en el
  chat con un borde de color; visto ahí, también se va del aviso. En un ordenador, en la app web, o con los avisos
  desactivados, es ahí donde lo ves. Si **Horas exactas** no está permitido (**Ajustes** → **General** →
  **Permisos**), Android puede mostrarlo unos minutos tarde.
- **Mantener pulsada una nota** ofrece **Copiar**, **Abrir** (una foto o un archivo), **Recordarme**, o **Cambiar el
  recordatorio** y **Sin recordatorio**, y **Eliminar**.
- Cada espacio tiene su propio Chat conmigo, y también cada lugar de chats ocultos, arriba de su lista (ver
  [Chats ocultos](#hidden)). Los recordatorios de un lugar oculto aparecen ahí en cuanto su PIN lo abre; el teléfono
  los avisa a su hora solo mientras **Recibir estando cerrados** está activado para ese lugar, con el mismo aviso. Un
  PIN nuevo para el lugar, que lo empieza vacío, o quitar el lugar, quita sus recordatorios del teléfono.

**Por qué:** un aviso se muestra en la pantalla bloqueada a quien tenga el teléfono, así que lo que dice un recordatorio
se queda cifrado en su espacio y a Android solo se le dice su hora: el aviso no puede contar a nadie qué querías
recordar, ni en qué espacio está. Y las notas no van a nadie, ni siquiera a tus otros dispositivos, así que ningún relay
las lleva nunca.

### Moverse deslizando

- **Atrás:** desliza hacia la derecha en cualquier punto de una pantalla para volver, como hace la flecha de volver.
  Sale una flecha redonda a la izquierda; suelta cuando esté completa, o haz un gesto rápido, y habrás vuelto. Si
  sueltas antes, te quedas. En un chat hace lo que hace su flecha de volver: vuelve a la lista de chats, o sale de los
  chats ocultos, cerrándolos. En los **Detalles** de un chat, los cierra.
- **Pestañas:** desliza hacia la izquierda o la derecha para ir a la pestaña de al lado, como al tocar su chip:
  **Todos**, **SMS** y **Erevos** en la pantalla de inicio, **Teclado**, **Recientes** y **Favoritos** en **Teléfono**,
  los filtros en **Contactos**, y los grupos de stickers.
- En una pantalla con pestañas, deslizar solo cambia de pestaña, también sobre las filas de su lista, y más allá de la
  primera o la última pestaña no hace nada: vuelve ahí con la flecha de volver. Una conversación SMS se archiva o se
  elimina manteniéndola pulsada.

### Ajustes

**Ajustes**, la última fila del menú (los tres puntos), contiene todo lo que puedes ajustar en Erevos, en grupos, como
hacen los ajustes del propio teléfono. En los idiomas que no son el inglés lleva su nombre en ese idioma y en inglés,
como **Ajustes · Settings**, para encontrarlo en un idioma que no sabes leer.

- **Buscar en los ajustes,** arriba, encuentra un ajuste por el principio de sus palabras, con o sin tildes, y muestra
  dónde está, como **Teléfono y SMS › SMS**. Tócalo para abrirlo.
- **Idioma · Language,** la fila bajo la búsqueda, abre la lista de idiomas, ver Idioma más abajo.
- **Un grupo** abre la lista de sus ajustes, y un ajuste abre su pantalla. Un ajuste con partes, como **SMS**, las
  lista, y cada parte se abre por separado.
- **Solo aparece lo que funciona aquí:** en un ordenador, en Sailfish OS y en la app web no hay **Teléfono y SMS**, Tor,
  Nostr ni LoRa, y un grupo sin nada que ajustar aquí no aparece.

| Grupo | Qué contiene |
| --- | --- |
| **General** | **Idioma**, **Actualizaciones** y **Permisos** (Android y la app web). Ver Idioma más abajo, y [Actualizaciones](#updates). |
| **Apariencia** | **Estilo y colores** (acabado, cristal, estilo, tema, colores y texto sobre zonas de color, con la vista previa), **Fondo de pantalla**, **Mensajes** (la forma de las burbujas), **Iconos del lanzador** (Android) y **Widget** (Android). Ver [Apariencia](#appearance). |
| **Notificaciones** | **En segundo plano** (Android): recibir y sonar mientras Erevos está cerrado, y el aviso de mensajes. **Notificaciones con la app cerrada** (la app web): Web Push. **Número en el icono**: cuántos mensajes no has leído, en el icono de Erevos. Ver [En un iPhone](#iphone). |
| **Privacidad y seguridad** | **Bloqueo y segunda contraseña** (bloquear al abrir Erevos, la contraseña, la privacidad de la pantalla, huella o cara, la segunda contraseña), **Chats ocultos** (los PIN de los 4 lugares) y **Esta app web** (solo la app web). Ver [Bloqueo con contraseña](#lock), [Segunda contraseña](#second) y [Chats ocultos](#hidden). |
| **Relay y redes** | **Relay** (abre **Chat nuevo** con **Para usuarios avanzados** abierto), **Relay de casa**, **Tor** (Android), **Nostr** (Android) y **Radio LoRa** (Android). Ver [Chatear a través de un relay](#relay), [Relay de casa](#home-relay), [A través de Tor](#tor), [A través de Nostr](#nostr) y [Con una radio LoRa](#lora). |
| **Teléfono y SMS** (Android) | **Teléfono**, los ajustes de la app de teléfono, los mismos que **Teléfono** → **Ajustes**. **SMS**, en partes: **Erevos como app de SMS**, **Descubrir Erevos en un número**, **Nombres de tus contactos**, **Archivadas, spam y papelera**, **Filtro de spam**, **Números bloqueados**, **Deshacer el envío de un SMS**, **Dos SIM** (solo con dos SIM) y **SMS nuevo**. Ver [Teléfono](#phone) y [SMS](#sms). |
| **Datos y dispositivos** | **Copias de seguridad**, **Dispositivos vinculados** y **Chats importados**. Ver [Copias de seguridad](#backup), [Dispositivos vinculados](#devices) y [Chats importados](#import). |
| **Para pruebas** | **Prueba del relay** y **Prueba de radio** (Android). Ver [Las pantallas de prueba](#tests). |

### Idioma

Erevos está en inglés, griego, alemán, francés, español, italiano, portugués y serbocroata. La primera vez que se
inicia, sigue el idioma del teléfono si es uno de estos (un teléfono en serbio, croata, bosnio o montenegrino empieza en
serbocroata), y si no, está en inglés. Para cambiarlo, abre el menú (los tres puntos), toca **Ajustes**, su última fila,
y luego la primera fila de ahí, **Idioma · Language**. En los idiomas que no son el inglés, los dos llevan su nombre en
ese idioma y en inglés, como **Ajustes · Settings** e **Idioma · Language**. Luego toca el idioma, cada uno con su
propio nombre: **Ελληνικά**, **English**, **Deutsch**, **Español**, **Français**, **Italiano**, **Português** o
**Srpskohrvatski**. Toda la app cambia al instante.

- **Esta guía** también está en cada uno de estos idiomas, y nombra los botones como los muestra la app en el tuyo. En
  los idiomas que no son el inglés ni el griego, una palabra nueva en la app puede aparecer en inglés durante un
  tiempo, hasta que se traduzca.
- **Guardado en el teléfono:** la elección se guarda en este teléfono, fuera de todos los espacios, así que la pantalla
  de la contraseña también se muestra en ese idioma, y todos los espacios se abren en él. No está sellada: quien tenga
  el teléfono puede ver qué idioma elegiste.
- **Los avisos de Android** (una llamada entrante, mensajes nuevos, Erevos recibiendo en segundo plano) están en griego
  cuando Erevos lo está, y en inglés en cualquier otro idioma.

## Chatear con un teléfono cercano {#nearby}

Mientras un espacio está abierto, en cualquier pantalla, Erevos busca otros teléfonos con Erevos a su alrededor, por
Bluetooth y, donde el teléfono lo tiene, Wi-Fi Aware, y en la Wi-Fi a la que está conectado, teléfonos y ordenadores por
igual. No hace falta internet, SIM ni red Wi-Fi. Lleva los mensajes a tus contactos, cifrados de extremo a extremo como
los que van por el relay.

1. Abre **Teléfonos cercanos** desde el menú en los dos teléfonos. La primera vez, Android pide permiso para encontrar
   dispositivos cercanos (en Android 12 y anteriores, también para la ubicación); permítelo, o los teléfonos no podrán
   encontrarse.
2. Si aún no sois contactos, añadíos mutuamente: en un teléfono toca **Chat nuevo**, luego **Mostrar mi código QR** (bajo
   **Empezar sin relay** mientras no tenga relay), y escanéalo con el otro, como en
   [Chatear a través de un relay](#relay). Sin relay el código solo contiene tus claves, y os podéis contactar solo cerca,
   hasta que tengáis uno.
3. Elige el contacto, escribe en la barra de mensajes de abajo y toca la flecha de enviar. En cuanto su teléfono
   responde, la parte de arriba del chat dice **Cerca**.

- **Mientras un espacio está abierto:** los enlaces empiezan cuando se abre un espacio, sea cual sea la pantalla que se
  vea, y se detienen cuando se abre otro espacio: bloqueado, el espacio sigue detrás de la pantalla de la contraseña. Un
  mensaje de cerca aparece en la pantalla de inicio como uno que llega por el relay, y una llamada también suena ahí. En
  Android siguen activos con Erevos en segundo plano, mientras **En segundo plano** está en **Recibir y sonar**. Para
  ahorrar batería en ese caso, busca teléfonos con menos frecuencia: Wi-Fi Direct cada diez minutos, Wi-Fi Aware un
  minuto de cada cinco, y en la misma Wi-Fi escucha a los demás veinte segundos de cada dos minutos. Así, un teléfono
  cercano puede encontrarse unos minutos más tarde; los enlaces que ya están activos siguen activos, y en cuanto Erevos
  se ve, busca con la misma frecuencia de antes.
- **Alcance:** unas decenas de metros al aire libre, menos a través de paredes.
- **Wi-Fi Aware:** más rápido, pero no todos los teléfonos lo tienen. Bluetooth funciona en todos. Para detenerlo,
  desactiva **Buscar con Wi-Fi Aware**, encima de **Buscar Erevos en la misma Wi-Fi**.
- **La misma Wi-Fi o un punto de acceso:** los teléfonos en una misma Wi-Fi, o en el punto de acceso de un teléfono, se
  encuentran y hablan directamente, aunque esa Wi-Fi no tenga internet; la app de escritorio también. Si Android
  pregunta si quedarse en una Wi-Fi sin internet, quédate. Cualquiera en esa Wi-Fi puede saber que hay una app Erevos,
  no de quién. El cortafuegos de un ordenador debe dejar entrar el puerto 47905 (UDP y TCP). Para detenerlo, desactiva
  **Buscar Erevos en la misma Wi-Fi** bajo **Cerca, sin internet**, en **Chat nuevo**.
- **Una Wi-Fi propia (Android 10 y posteriores):** sin ninguna Wi-Fi en común, dos teléfonos con Erevos cerca el uno del
  otro crean una pequeña Wi-Fi propia (Wi-Fi Direct) y hablan por ella como en la misma Wi-Fi: más rápido que Bluetooth,
  y una llamada va por ella sin internet. No pregunta nada; cada teléfono se queda también en su propia Wi-Fi donde
  puede. Cualquiera que esté cerca puede saber que hay un teléfono con Erevos, y podría unirse a esa pequeña Wi-Fi,
  obteniendo solo bytes sellados. Necesita **Buscar Erevos en la misma Wi-Fi** activado; para detener solo esto,
  desactiva **Crear una Wi-Fi con teléfonos cercanos**, debajo.
- **En un teléfono Samsung** **Buscar con Wi-Fi Aware** y **Crear una Wi-Fi con teléfonos cercanos** están desactivados
  hasta que los actives: mientras una app los usa, Samsung pide desactivar su propia función de compartir. Bluetooth y
  la misma Wi-Fi funcionan sin ellos.
- **Otros teléfonos cercanos** solo reciben bytes sellados que no pueden abrir, y solo hasta que se conoce el teléfono
  de tu contacto: a partir de entonces, lo que envías va solo a él. Los mensajes de voz solo van a un contacto que se
  sabe que está cerca. Las fotos y los archivos necesitan el relay.
- **Con un relay además,** cada mensaje también va por él, así que no se pierde nada si el enlace se corta; la copia que
  llega en segundo lugar no se vuelve a mostrar. Si el relay no está disponible, la copia de cerca es la que cuenta.
- **Llevados por otros teléfonos:** cuando el relay no está disponible y tu contacto no está cerca, los teléfonos con
  Erevos cercanos también se llevan tu mensaje sellado para el relay de tu contacto. Cada uno lo guarda, tres días como
  mucho, se lo da a dos teléfonos más como mucho de los que encuentre, y lo entrega a ese relay a través de su propio
  relay en cuanto puede; el tuyo hace lo mismo. No pueden leerlo, ni saber de quién es ni para quién: solo ven la
  dirección del relay. Se conserva cuando Erevos se cierra, sellado en el teléfono. Los tuyos se quedan en tu espacio, y
  solo salen mientras está abierto. Llevar mensajes de otros está desactivado salvo que actives **Llevar mensajes de
  otros** bajo **Cerca, sin internet**, en **Chat nuevo**, y entonces solo para relays en internet con TLS (wss://): un
  desconocido cercano nunca hace que tu teléfono, o tu relay, contacte con uno de una red local o del propio teléfono.
  Tus propios mensajes los llevan los teléfonos cercanos que lo tienen activado.

**Por qué:** un paquete no dice para quién es, así que nadie cercano puede saber por él de quién es. Hasta que el
teléfono de tu contacto responde en un enlace, tu teléfono tampoco puede saber cuál de los teléfonos cercanos es el suyo:
así que los paquetes cortos van a todos, cada uno los prueba, y desde el primero que lo abre, ese enlace es el de tu
contacto. Un mensaje de voz, en trozos más grandes, espera a eso.

> Un mensaje de cerca solo se abre en el espacio que tiene ese contacto. Uno para otro espacio de este teléfono espera
> en memoria, seis horas como mucho, hasta que ese espacio se abra. Los chats ocultos nunca usan el enlace de cerca.

**Por qué:** los enlaces de cerca pertenecen al teléfono, no a un espacio, y nada en ellos nombra uno: lo que llega se
prueba en los chats del espacio que está abierto, y se guarda un rato en memoria para los demás, sin escribirse nunca en
el teléfono. Los chats ocultos aún no los usan: eso todavía está por venir (ver [Qué está protegido hoy](#privacy)).

## Con una radio LoRa {#lora}

Con una radio LoRa Meshtastic conectada al teléfono por Bluetooth, Erevos llega a otro Erevos con una radio en la misma
malla, a kilómetros, sin internet: directamente, o a través de las radios Meshtastic que haya entre medias. Está
desactivado salvo que configures una radio, y solo en Android.

1. Configura primero la radio en la app Meshtastic, sobre todo su **región**: sin ella no transmite nada. Luego cierra
   la app Meshtastic, o desconéctala ahí: una radio se conecta a una sola app a la vez.
2. Abre **Ajustes** → **Relay y redes** → **Radio LoRa**, toca **Buscar mi radio**, lee lo que dice, y toca tu radio
   cuando aparezca. Una radio aún no emparejada pide su PIN: aparece en la pantalla de la radio, o es 123456.
3. Tu contacto hace lo mismo con la suya, en la misma malla: la misma región y el mismo primer canal.
4. Escribe como siempre. Cuando el relay no está disponible y no hay ningún teléfono cerca, un texto va por LoRa,
   y la línea bajo el chat lo dice.

- **Solo texto, y despacio:** un mensaje va en trozos de unos 220 bytes, cada uno un segundo o dos en el aire, y la ley
  solo permite a una radio cierto tiempo de emisión (en la UE, una décima parte de cada hora). Así que LoRa solo lleva
  textos y eliminaciones, y solo cuando nada más lo hace. Los mensajes de voz, las fotos y los archivos esperan en el
  chat, marcados como **En espera**, y salen solos en cuanto el relay o un teléfono cercano pueden recibirlos; las
  llamadas también necesitan uno de esos. El primer mensaje a un contacto tarda más, porque lleva las claves.
- **Marcas:** **✓✓** llega con su siguiente mensaje, ya que las marcas solas no van por LoRa.
- **A todas las radios al alcance:** cada mensaje lo oyen todas las radios de alrededor, y lo retransmiten las radios
  Meshtastic, como hace Meshtastic. Todos los Erevos lo prueban; solo el de tu contacto lo abre. Por LoRa no se lleva
  nada de otros.
- **Su nombre y dónde está:** las radios Meshtastic anuncian su nombre de vez en cuando a todas las radios al alcance, y
  dónde están si tienen GPS o una posición fija, sin cifrar. Erevos impide que la tuya lo haga (**Ocultos**): pone su
  rol en Client hidden, apaga su GPS y quita una posición fija. Aun así responde a una radio que le pregunte su nombre,
  así que dale un nombre que no diga nada de ti, en la app Meshtastic. **Anunciados a todos al alcance** devuelve su rol
  y su GPS, tras una advertencia; una posición fija se vuelve a poner en la app Meshtastic. Si la radio no conserva los
  ajustes, la pantalla de LoRa lo dice.
- **Sigue conectada** mientras Erevos funciona, y se vuelve a conectar sola cuando la radio vuelve a estar al alcance.
  **Desactivar LoRa** devuelve a la radio su rol y su GPS, si está conectada, y luego la desconecta y la olvida. Los
  chats ocultos nunca van por LoRa.

**Por qué:** lo que una radio Meshtastic dice de sí misma va sin cifrar, a cualquiera que escuche a kilómetros: su nombre
y dónde está podrían mostrar dónde estás tú y vincular la radio contigo, así que Erevos la mantiene en silencio salvo que
elijas otra cosa. Y como la ley solo permite a una radio cierto tiempo de emisión, LoRa se reserva para tus propios
textos, cuando nada más puede llevarlos, nunca para lo que otros teléfonos le harían llevar.

> Una radio LoRa se oye a kilómetros, y su señal se puede rastrear hasta donde está, en silencio o no. Lo que Erevos
> envía sigue cifrado de extremo a extremo, pero cualquiera con una radio puede saber que la tuya transmite, cuándo y
> cuánto. Con **Anunciados a todos al alcance**, cualquiera con una radio también puede leer su nombre y dónde está.

## Chatear a través de un relay {#relay}

Un relay es un pequeño servidor que guarda colas de un solo sentido: cada teléfono tiene su propia cola, y quien tenga su
**enlace de contacto** puede dejar mensajes en ella. El relay no guarda cuentas, nombres ni números de teléfono, y no
puede leer los mensajes: están cifrados de extremo a extremo, y solo los dos teléfonos tienen las claves. Cada teléfono
puede usar un relay propio: un mensaje para un contacto de otro relay se sella para el suyo y se entrega al tuyo, que lo
pasa, así que su relay nunca ve la dirección de tu teléfono. Un teléfono sin relay obtiene un sitio en el de su
contacto, ver **Sin relay propio** más abajo.

**Por qué:** con colas y sin cuentas, ningún servidor tiene una lista de quién conoce a quién, y nadie necesita tu número
de teléfono ni tu email para contactarte: quien tenga tu enlace de contacto puede escribir en tu cola, y solo tú la lees.

1. En la pantalla de inicio, toca **Chat nuevo**. Arriba, **Cómo te conectas ahora** dice con palabras sencillas cómo te
   contactan tus contactos: a través de tu relay, a través de Nostr sin relay, o solo de cerca. Debajo están las formas
   de entrar para un teléfono que aún no tiene relay o, con un relay, **Añadir un contacto** y **Tu enlace de contacto**.
   Los ajustes propios del relay están en **Para usuarios avanzados**, abajo; **Ajustes** → **Relay y redes** →
   **Relay** abre Chat nuevo con ellos abiertos.
2. En **Para usuarios avanzados**, escribe la **Dirección del relay**: \`ws://<dirección del ordenador>:7879\` para un
   relay en tu propia red, o \`wss://relay.example.org\` para uno en internet. Añade el **Token** si el relay lo pide.
3. Toca **Crear mi cola en el relay**. Erevos dice **Cola del relay creada**, y **Cómo te conectas ahora** dice **A
   través de tu relay**: todo funciona, textos, fotos, mensajes de voz, llamadas y grupos.
4. En **Tu enlace de contacto**, toca **Mostrar mi código QR**: se abre sobre la pantalla. Deja que el otro teléfono lo
   escanee con su cámara, y que luego abra el enlace en Erevos. La pantalla **Añadir un contacto** muestra lo que
   contiene: toca **Añadir al chat** solo si lo escaneaste tú. **Añadir y vincular a uno de mis contactos** también lo
   añade, vinculado al contacto que elijas, cuyo nombre toma el chat.
5. Si su cámara solo muestra el texto, o está lejos, toca **Compartir mi enlace de contacto** y envíaselo.
   Lo pega en el campo bajo **Añadir un contacto** y toca **Añadir**.
6. O al revés: en **Añadir un contacto**, toca **Hacer foto del código QR** en su pantalla, o **Elegir foto del código
   QR** para una captura o una foto del código que te haya enviado. Erevos lo lee y lo añade al instante. En un
   ordenador, en Sailfish OS y en la app web solo está **Elegir foto del código QR**; en un iPhone también ofrece la
   cámara. Los chats ocultos no tienen ninguna de las dos, ya que una foto sale de Erevos, lo que los cierra: pega ahí
   su enlace.

El chat nuevo aparece en la pantalla de inicio con el nombre **contacto** y los primeros caracteres de su clave, hasta
que tenga un nombre: **Cambiar nombre** en sus detalles le da uno. Justo después de añadirlo aquí, **Vincular a uno de
mis contactos**, bajo el aviso de que se ha añadido, te deja elegir en su lugar uno de tus contactos (**Ahora no** lo
deja así): el chat toma el nombre de ese contacto, si no tiene uno propio, y la ficha del contacto muestra el chat. Los
chats ocultos solo ofrecen sus propios contactos, nunca los del teléfono. Basta con que un teléfono añada al otro:
añadir un enlace inicia una conversación cifrada y le dice al otro teléfono cómo responder, así que este muestra el
chat la próxima vez que consulta su cola, cosa que hace cada pocos segundos.

**Lo que el relay ve de un chat:** todos tus contactos escriben en tu única cola. En cuanto cada teléfono ha recibido un
mensaje del otro, cada mensaje entre ellos se sella una vez más para el teléfono al que va, con una clave que ese
teléfono dio dentro del chat, así que para el relay cada uno son bytes aleatorios de uno de unos pocos tamaños, y no
puede saber por ellos a qué conversación pertenecen. El primer mensaje de un chat, y los que se envíen antes de que
llegue la respuesta, todavía lo muestran. El relay sigue viendo qué dirección deja cada mensaje, y cuándo. Y cada uno le
dice al relay, en un byte que este lee, lo que lleva: un mensaje que alguien lee, aviso entre teléfonos (que un mensaje
llegó o se leyó, escribiendo, estar en línea, reacciones, claves nuevas), o una llamada que suena. Así que el relay ve
cuáles son mensajes, y cuándo empieza una llamada, estén las notificaciones activadas o no: así es como el aviso de una
app web cerrada puede contarlos, y el aviso de los chats ocultos cerrados.

### Formas de entrar al relay

Un relay que pide token deja entrar a un teléfono de tres formas. Cada forma acaba con un token propio del teléfono ahí,
así que quien gestiona el relay puede sacar a cualquier teléfono por separado.

- **Una invitación:** un código QR o un enlace de un teléfono que ya está en el relay (ver Invitar a alguien nuevo más
  abajo). Nada que escribir, y sois contactos al instante.
- **Una cuenta:** **Iniciar sesión con LPHL**, cuando el relay lo ofrece (ver Iniciar sesión en el relay más abajo).
  Cualquier cuenta LPHL puede, en hasta 10 teléfonos.
- **El token del relay:** el token único para todos, de quien gestiona el relay, escrito en **Token**. Erevos lo cambia
  al instante, por sí solo, por un token propio del teléfono, con el nombre con el que te presentas en las invitaciones
  (\`phone\` si no diste ningún nombre), lo dice, y a partir de entonces solo usa ese. Así este teléfono también puede
  invitar. Necesita un relay que acepte invitaciones, posterior a Erevos 3.1.0; con uno más antiguo, o uno que no acepte
  invitaciones, el teléfono se queda con el token del relay y no puede invitar.
- **Los límites:** un teléfono puede tener 5 invitaciones pendientes a la vez y crear 10 al día (el día según UTC); cada
  una es para un teléfono y dura 7 días. El relay deja entrar 100 teléfonos por invitación en total, contando también
  las invitaciones pendientes, salvo que quien lo gestiona haya elegido otra cosa. Los teléfonos que entraron con una
  cuenta o con el token del relay no cuentan en esos 100: el relay da un token propio a 50 teléfonos al día que llegaron
  con su token, y una cuenta tiene 10 teléfonos. El relay atiende 512 conexiones a la vez, sean de quien sean, salvo que
  quien lo gestiona haya elegido otra cosa.
- **Sacar un teléfono:** quien gestiona el relay borra su línea en el archivo de tokens del relay: ya no puede usar el
  relay, ni tampoco los teléfonos que invitó. Si alguna vez tuvo el token del relay, también cambia ese token, para que
  no pueda volver con él. Los teléfonos con tokens propios siguen como están: solo un teléfono que todavía tenga escrito
  el token antiguo (sin abrirse desde entonces, o con un Erevos más antiguo) necesita el nuevo.
- **Los chats ocultos** conservan el token del relay escrito para ellos: cambiarlo en el mismo momento que el del
  espacio mostraría al relay que son de este teléfono. Cuando cambia el token del relay, escribe el nuevo en su **Para
  usuarios avanzados**.

**Por qué:** el relay da a cada conexión un hilo propio, así que solo atiende cierto número a la vez; y solo añade cierto
número de líneas al día para teléfonos que llegaron con su token único, así que un token que fue a parar donde no debía
no puede llenar su archivo de tokens.

### Invitar a alguien nuevo

Un código QR o un enlace trae a alguien nuevo: su teléfono se une a Erevos en tu relay, con acceso propio, sin escribir
nada, y sois contactos el uno del otro al instante, sin solicitud de mensaje.

- **Para invitar:** en los chats, sin ningún contacto elegido, toca **Invitar a alguien**. Escribe para quién es (su
  nombre en tus chats) y, si quieres, **Tu nombre, para esa persona**, y luego toca **Crear la invitación**. Se abre un
  código QR: en cuanto tenga Erevos en su teléfono, lo escanea con la cámara y abre el enlace en Erevos, o toca
  **Compartir la invitación** y envíale el enlace. Es para una persona, durante 7 días, o menos si la invitación del
  relay acaba antes. Quien la use primero se la queda, así que dásela solo a esa persona.
- **Para unirse:** en un teléfono que aún no tiene relay, **Chat nuevo** muestra **Elige cómo empezar**: toca **Tengo
  una invitación**. Escanea la invitación con la cámara y abre el enlace en Erevos, o toca **Hacer una foto de la
  invitación** o **Elegir una foto de la invitación**, o pega el enlace y toca
  **Unirse**. El enlace abre **… te invita a Erevos**: toca **Unirse** solo si viene de esa persona. Erevos obtiene
  acceso propio a su relay y una cola ahí, la añade y dice **Te damos la bienvenida a Erevos**. Su primer mensaje avisa
  a su teléfono, que añade este como contacto al instante, con el nombre que escribió.
- **Con una cuenta en su lugar:** **Iniciar sesión con LPHL**, la segunda forma de entrar, inicia sesión en el relay de
  LPHL desde este teléfono con una cuenta LPHL, en el navegador (ver Iniciar sesión en el relay más abajo); luego añade
  a tus contactos con sus invitaciones o enlaces. La tercera, **Empezar sin relay**, está en Sin ningún relay, en A
  través de Nostr. **Para usuarios avanzados** tiene los ajustes del relay, como en los pasos 1 a 6 de arriba.
- **Lo que tu relay debe permitir:** el acceso propio es una invitación a tu relay (ver Invitaciones al relay más
  abajo), así que solo sale de un teléfono con token propio en un relay que acepte invitaciones. Cuenta entre tus
  invitaciones, con el nombre que escribiste para esa persona, y va con las tuyas. Un teléfono con el token único del
  relay para todos lo cambia antes por uno propio (ver Formas de entrar al relay más arriba); donde el relay no lo hace,
  no crea ninguna invitación: inicia sesión en el relay primero (debajo del **Token**, en **Para usuarios avanzados**),
  o usa una invitación a él. Cuando tu relay no acepta invitaciones, la invitación igualmente os hace contactos, y su
  teléfono usa tu relay solo como le permite tu enlace de contacto, como en Sin relay propio más abajo.
- **Un teléfono que ya tiene relay** conserva el suyo: la invitación solo te añade, y sois contactos al instante igual.
- **Lo que se guarda:** tu teléfono guarda el secreto de cada invitación y el nombre para esa persona, sellados en el
  espacio, hasta que se usa o acaban sus 7 días, 20 como mucho a la vez. Nada de ello está en el relay salvo la
  invitación al relay.
- **Por SMS, a alguien que aún no tiene Erevos:** en Android, la ficha de un contacto que no está en Erevos tiene
  **Invitar por SMS**. Escribe un SMS a su primer número con un enlace corto, en la app de SMS (la propia de Erevos
  cuando es la app de SMS del teléfono), para que lo envíes o no. La página del enlace en el servidor web de LPHL le
  ofrece Erevos (la app de Android, o la app web en un iPhone) y luego abre en ella la invitación; en la app web en un
  iPhone, pega el enlace en **Tengo una invitación**. Toca **Unirse**: su teléfono se une a tu relay como arriba y
  responde al tuyo a través de él, lo que lo añade, vinculado a ese número y con el nombre de la ficha. Su primer
  mensaje, que sale solo, te hace su contacto, con el nombre con el que te presentaste en tu última invitación. La
  invitación va tras la **#** del enlace, que no se envía a ningún servidor web, pero la compañía telefónica ve el SMS,
  como todo SMS: por eso es para una persona, durante dos días, y cuando acaban los dos días sin que ningún teléfono la
  haya usado, tu teléfono retira su invitación al relay. Necesita un relay que deje invitar a tu teléfono, como arriba.

### Sin relay propio

Un teléfono sin relay chatea por internet igualmente: al añadir el enlace de un contacto cuyo relay presta sitios, toma
un sitio ahí, sin token.

- **Cómo:** añade su enlace como en los pasos 4 y 5, sin nada en **Relay**. Erevos dice que ahora tienes un sitio en su
  relay, prestado a través de su enlace, y a partir de entonces lo usa como propio: tu propio enlace lo nombra, así que
  los demás también te contactan ahí.
- **Quién presta:** tu enlace lleva un billete para un sitio en tu relay solo cuando activas **Compartir un sitio en mi
  relay con este enlace**, bajo **Tu enlace de contacto** en **Chat nuevo**, y solo para el enlace que se muestra
  entonces: la próxima vez que se abra el chat, vuelve a estar desactivado. El relay necesita una clave para el envío en
  dos saltos, y solo presta cuando quien lo gestiona activa el préstamo; también puede retirar los sitios de un
  billete. Un billete dura 30 días y da hasta cuatro sitios. Cualquiera que vea un enlace con billete
  puede tomar un sitio con él, así que da ese enlace solo a quien quieras.
- **Lo que no hace un sitio prestado:** los mensajes a contactos de otros relays van directamente a su relay, que
  entonces ve la dirección de tu teléfono. No guarda nada para más tarde (un mensaje enviado más tarde espera en el
  teléfono), no da relay de llamadas (las llamadas van directamente entre los teléfonos), y crea 4 colas más y envía 50
  MB de archivos al día como mucho. Tu enlace no presta nada a su vez.
- **Tu propio relay en su lugar:** escribe su dirección en **Relay**: se deja el sitio prestado, y los contactos conocen
  el nuevo con tu siguiente mensaje.
- **Un enlace sin billete** (de un relay o un Erevos más antiguo): un relay que no pide token se usa tal cual; si no,
  os podéis contactar solo cerca, hasta que tengas un relay.

**Por qué:** un enlace con billete es una llave de tu relay para quien lo vea, así que tu enlace solo lleva uno cuando
tú lo eliges, para el enlace que se muestra entonces, y el relay solo presta cuando quien lo gestiona lo permite. Los
archivos de un sitio prestado se limitan a unas pocas fotos y mensajes de voz al día, para que nunca ocupe todo el
almacenamiento del relay.

### Invitaciones al relay

Un teléfono con token propio en un relay que acepta invitaciones puede dejar que un teléfono más use ese relay, con un
token propio de ese teléfono, así que no se escribe ni se pasa ningún token.

- **Para invitar:** en **Para usuarios avanzados** de **Chat nuevo**, debajo del **Token**, toca **Invitar al relay**,
  escribe para quién es y toca **Crear la invitación**. Se abre un código QR: deja que su teléfono lo escanee con la
  cámara y abra el enlace en Erevos, o toca **Compartir la invitación** y envíasela. Vale para un teléfono durante 7
  días, y quien la use primero se la queda, así que muéstrasela solo a esa persona.
- **Para usar una:** el enlace abre **Invitación a un relay**, con la dirección del relay: toca **Usar este relay** solo
  si viene de alguien que conoces. En Erevos, **Hacer foto del código QR** y **Elegir foto del código QR** bajo
  **Añadir un contacto** también leen una invitación, y su enlace se puede pegar en el campo de ahí. Erevos crea un
  token para este teléfono, lo guarda con la dirección del relay solo en este espacio, crea tu cola ahí y dice el nombre
  que el relay dio al teléfono. Si el teléfono usa otro relay, pregunta antes, y los contactos conocen tu nueva cola con
  tu siguiente mensaje. Erevos acepta una invitación a un relay wss://, o a uno ws:// solo en una red doméstica (como
  \`ws://192.168.1.10:7879\`). Los chats ocultos no aceptan invitaciones.
- **Tus invitaciones:** listadas bajo el botón, pendientes o en uso. **Retirar** retira una todavía pendiente, o corta
  al instante el teléfono que la usó, y a los teléfonos que este invitó a su vez.
- **Mientras dure el tuyo:** un teléfono que invitaste usa el relay solo mientras el tuyo pueda. Cuando tu línea
  desaparece, porque el teléfono que te invitó la retiró, la cuenta con la que iniciaste sesión ya no puede usar el
  relay, o quien lo gestiona la sacó, desaparecen también las líneas de los teléfonos que invitaste, y las de los
  teléfonos que estos invitaron. Volver a iniciar sesión en tu teléfono las conserva.
- **Lo que guarda el relay:** el nombre que escribiste, en letras latinas (Μαρία es \`maria\`), que invitaste a ese
  teléfono, y una huella de su token, no el token. Quien gestiona el relay ve esto, y puede sacar del relay a cualquier
  teléfono. Un teléfono puede tener 5 invitaciones pendientes a la vez, y crear 10 al día, y el relay solo deja entrar
  cierto número de teléfonos por invitación (100, salvo que quien lo gestiona haya elegido otra cosa).
- **Quién puede invitar:** un teléfono con token propio, en un relay cuyo gestor activó las invitaciones (ver
  [Tener tu propio relay](#own-relay)). Un teléfono con el token único del relay para todos lo cambia antes por uno
  propio (ver Formas de entrar al relay más arriba). Con un sitio prestado no hay **Invitar al relay**.

**Por qué:** el relay solo guarda una huella de cada token, nunca el token, así que su archivo no le dice a nadie cómo
conectarse. Y una invitación nombra un relay wss://, o uno ws:// en casa, así que nunca puede enviar las peticiones de
tu teléfono por internet sin cifrar.

### Iniciar sesión en el relay

Un relay puede dejar que los teléfonos inicien sesión con una cuenta en la que confía quien lo gestiona, como LPHL, para
obtener un token propio, sin nada que escribir en Erevos.

- **Para iniciar sesión:** escribe la dirección del relay en **Relay**. Cuando el relay lo ofrece, **Iniciar sesión con
  LPHL** aparece debajo del **Token**. Tócalo: el navegador abre la página de inicio de sesión, donde escribes tu nombre
  y tu contraseña, que Erevos nunca ve. Luego la página del relay muestra seis dígitos. De vuelta en Erevos, que te deja
  directamente en **Código de la página**, escríbelos ahí y toca **Terminar de iniciar sesión**: el teléfono guarda su
  token con la dirección del relay solo en este espacio, y crea tu cola ahí. Escribe el código solo en Erevos en tu
  propio teléfono y no se lo des a nadie, aunque te lo pidan: quien lo escriba usa el relay como si fuera tú. Tras 5
  códigos incorrectos, el inicio de sesión se acaba: vuelve a iniciar sesión. Erevos solo abre una página de inicio de
  sesión en la dirección propia del relay, por https.
- **Volver a iniciar sesión** en el mismo teléfono sustituye su línea en el relay, cuando su token es el que obtuvo de
  ese relay. Cada teléfono obtiene una línea propia, 10 como mucho para una cuenta.
- **Lo que ven el relay y LPHL:** el relay nombra la línea del teléfono con tu nombre de usuario (\`lphl:nekten\`), y
  cada hora pregunta a LPHL si la cuenta todavía puede usarlo: en cuanto la cuenta se cierra o se desactiva, o no se
  puede preguntar a LPHL durante 3 días, la línea desaparece, y el teléfono ya no puede usar el relay, ni los teléfonos
  que invitó. LPHL ve cada inicio de sesión y estas comprobaciones, pero nada de tus espacios, chats o contactos.
  Iniciar sesión desde otro espacio con la misma cuenta muestra al relay que los dos son tuyos.
- **Los chats ocultos** no inician sesión.

**Por qué:** la página muestra el código y tú lo escribes en Erevos, no al revés, así que un enlace de inicio de sesión
que te envíe otra persona no le sirve de nada: solo quien inició sesión ve el código, y cinco incorrectos lo anulan.
Erevos solo abre una página de inicio de sesión en la dirección propia del relay, por https, así que nada que responda en
lugar del relay puede enviarte a una página en otro sitio. Y un proveedor al que no se puede preguntar durante un tiempo
no corta ningún teléfono al instante: solo lo hacen 3 días sin una respuesta válida.

### La clave propia del relay

En cuanto Erevos conoce la clave de tu relay (se la pide al relay la primera vez, o se la da un enlace de contacto),
cada conexión a ese relay empieza con una comprobación: el relay debe demostrar que tiene esa clave, y el token y todo lo
que sigue van cifrados con esa clave, dentro del cifrado propio de la conexión (TLS). En **Cómo te conectas ahora**,
Erevos dice entonces que tu relay demostró su propia clave. A partir de entonces, este espacio nunca contacta con ese
relay sin la comprobación.

- Un relay más antiguo que esta app no demuestra nada: funciona como antes, y **Cómo te conectas ahora** dice que es
  más antiguo. Erevos lo vuelve a intentar cada hora.
- Un relay que no puede demostrar la clave que Erevos guarda para él no recibe nada, y tus mensajes esperan; **Cómo te
  conectas ahora** lo dice en rojo. Solo si quien lo gestiona te dijo que tiene una clave nueva, toca **Tiene una clave
  nueva**: Erevos toma entonces la clave que dé el relay a continuación.

**Por qué:** el certificado de la conexión solo dice que quien responde tiene un certificado para el nombre del relay,
que una empresa que emite certificados también puede darle a otra persona, por error o cuando se la obliga. La clave
propia del relay solo está en su servidor, así que nadie entre medias puede hacerse pasar por él, y un certificado
renovado no cambia nada.

### El número de seguridad

Abre el chat, toca su nombre y luego **Número de seguridad**. Los dos teléfonos muestran los mismos 60 dígitos para
vosotros dos. Comparadlos en persona o en una llamada: si coinciden, no hay nadie en medio. Si son distintos, no confíes
en ese chat, y vuelve a añadir el enlace, escaneado de su propio teléfono. En cuanto haya vinculado un dispositivo,
también dice cuándo cambió por última vez la lista de sus dispositivos: tus mensajes van también a cada lugar de ella,
así que si no vinculó o desvinculó uno entonces, pregúntale.

### Enviado, llegado y leído

Bajo cada uno de tus mensajes a un contacto, **✓** dice que el relay o un teléfono cercano lo recogió, **✓✓** que llegó
a su teléfono, y **✓✓✓** que lo leyó. Su teléfono se lo dice al tuyo, dentro del cifrado, la próxima vez que cada uno
consulta el relay, o al instante cuando están cerca. Un mensaje cuenta como leído en cuanto su chat se ve en la
pantalla.

- **Enviando…:** en el momento en que pulsas Enviar, el teléfono da una vibración corta, el campo se vacía y el mensaje
  aparece, marcado como **Enviando…** hasta que el relay o su teléfono lo recogen. Si no puede salir y no puede esperar,
  sus palabras vuelven al campo.
- **En espera:** un mensaje que nada pudo recoger, porque el relay no está disponible y su teléfono no está cerca, se
  queda en el chat marcado como **En espera**, y sale solo, en orden, en cuanto el relay o su teléfono cercano pueden
  recibirlo, mientras haya un espacio abierto; entonces muestra **✓**. Un texto espera directamente. Un mensaje de voz,
  una foto o un archivo pregunta antes: **Dejar en espera** o **Eliminar**. Un mensaje en espera se elimina solo en este
  teléfono. En los chats ocultos también espera, pero sale solo por su relay, nunca al teléfono cercano ni por LoRa:
  mientras están abiertos, o, con **Recibir estando cerrados** activado, mientras el espacio está abierto. Cuando la
  cola del contacto en el relay está llena, un texto, mensaje de voz, foto o archivo sigue yendo a sus dispositivos
  vinculados, si tiene alguno, aparece como enviado, y se vuelve a intentar para su teléfono mientras los chats ocultos
  sigan abiertos: si se cierran antes de que salga, su teléfono nunca lo recibe.
- **Enviar más tarde:** mantén pulsada la flecha de enviar y elige **Más tarde…**, o toca **+** y luego **Enviar más
  tarde**. Elige una hora con un toque (**En 1 hora**, **Esta noche 20:00**, **Mañana 09:00**) o el día, la hora y los
  minutos, hasta un año vista, y luego **Enviar más tarde**. El mensaje se queda en el chat marcado como
  **Programado** con su hora. Va cifrado al relay, que lo guarda y lo envía a esa hora, aunque este teléfono esté
  apagado o bloqueado entonces, y su teléfono lo muestra a partir de esa hora, no antes. Sin ningún relay disponible
  ahora, espera en este teléfono y va al relay en cuanto haya uno disponible. Sin nada escrito, la hora que elijas es
  para la siguiente foto, archivo o mensaje de voz: una foto o un archivo va a tu relay al instante y se queda ahí hasta
  que lo recojan, 14 días después de su hora como mucho. Los chats ocultos también lo tienen, igual, a través de su
  relay. Hasta su hora, elimínalo para retirarlo del relay, y nunca sale. Si su cola en el relay
  cambia antes, Erevos lo vuelve a programar para la nueva la próxima vez que contacte con el relay.
  Con un token propio de este teléfono, solo sale si el teléfono todavía tiene su línea en ese relay entonces. Un
  mensaje sin sonido sigue sin sonido. Un relay anterior a esto no guarda nada para más tarde: entonces el mensaje
  espera en este teléfono y sale a su hora mientras Erevos funciona, también en segundo plano mientras **En segundo
  plano** está en **Recibir y sonar** (más abajo), o cuando Erevos se vuelva a abrir.
- **Enviar sin sonido:** mantén pulsada la flecha de enviar y elige **Sin sonido**: su teléfono muestra el aviso sin
  sonido ni vibración. Un Erevos anterior no lo sabe y suena como siempre, y lo mismo hace Erevos como app web, cuyo
  aviso viene del navegador. Lo mismo hace el aviso de un lugar de chats ocultos que está cerrado, con **Avisar cuando
  llega un mensaje** activado, y el de un espacio cerrado con **También mientras otro espacio está abierto**: estos
  solo preguntan al relay cuántos llegaron, y el relay no puede distinguir uno sin sonido de otro, ya que solo lo dice
  el mensaje cifrado.
- **Enlaces:** una dirección web en un mensaje aparece subrayada. Tócala y Erevos la muestra entera, para abrirla en el
  navegador solo si es adonde quieres ir. Antes de eso no se descarga nada.
- **Compartir desde otra app** (Android): en **Compartir** de otra app, como el del navegador para una página, elige
  **Erevos**. En cuanto hay un espacio abierto, **Enviar a** lista los chats, grupos y conversaciones SMS que mostró por
  última vez la pantalla de inicio, y luego todos los demás chats y grupos, con una búsqueda; nunca los chats ocultos.
  Las palabras y los enlaces se abren en el campo de mensaje del que elijas, para leerlos y enviarlos ahí; una foto o un
  archivo (100 MB como mucho) sale en cuanto se abre ese chat o grupo, una foto con la calidad que elegiste para las
  fotos, y nunca como SMS. Hasta entonces su copia espera en el almacenamiento propio de Erevos en el teléfono, y
  desaparece una vez enviada, o cuando sales de **Enviar a**.
- **Tu contacto ve cuándo lees:** tu teléfono se lo dice al suyo, como el suyo al tuyo, salvo que ese chat aparezca sin
  conexión (más abajo).
- **Cuando llegan mensajes:** Erevos consulta el relay cada pocos segundos mientras está abierto y desbloqueado, en
  cualquier pantalla, y la pantalla de inicio sube el chat arriba por sí sola. En Android cada mensaje nuevo suena, con
  un aviso que solo dice cuántos llegaron, también mientras Erevos está a la vista; en el chat o grupo abierto en la
  pantalla solo suena el sonido, y abrir un chat quita del contador lo que llegó ahí. Escribir, y que un mensaje llegó o
  se leyó, no hacen ninguno. En Android también sigue en segundo plano, mientras **En
  segundo plano** está en **Recibir y sonar** (más abajo): ahí espera en el relay hasta que llega algo, un minuto cada
  vez, en lugar de preguntar cada pocos segundos, y no pregunta nada más cuando no llegó nada, para que la batería dure,
  y un aviso solo dice cuántos mensajes llegaron. Cerrado, bloqueado, o
  mucho tiempo en segundo plano en otro caso, no lo hace: los mensajes esperan en el relay, hasta 14 días, y llegan en
  cuanto Erevos se vuelve a abrir. Una petición al relay sin respuesta a tiempo (una espera ahí, su minuto y medio
  minuto más; cualquier otra cosa, 45 segundos; una parte de un archivo, 2 minutos) cuenta como fallida y se vuelve a
  hacer, así que una conexión que murió por el camino, como cuando la red del teléfono se duerme o cambia, no retiene
  nada.

### En línea, y aparecer sin conexión

Mientras el chat de un contacto está abierto en tu pantalla, Erevos pregunta de vez en cuando a su teléfono si está
abierto, y dice que el tuyo lo está. Si el suyo lo está, el chat dice **En línea** bajo su nombre con un punto verde, y
la pantalla de inicio muestra el punto en su imagen. Escribirle a alguien también te muestra en línea para esa persona
durante dos minutos. Todo va dentro del cifrado, solo entre tú y ese contacto: el relay ve un mensaje de vez en cuando,
como con cualquier chat. No hay «última vez».

Mientras escribes a un contacto que aparece en línea, su chat muestra **escribiendo…** bajo tu nombre durante unos
segundos, y el tuyo bajo el suyo cuando escribe. Se dice como mucho cada pocos segundos, solo mientras aparece en línea,
nunca a una solicitud de mensaje, y no en los grupos.

**Por qué:** estar en línea solo se dice entre tú y un contacto cuyo chat está abierto, dentro del cifrado, así que el
relay no ve más que un mensaje de vez en cuando entre dos personas que hablan, y no se guarda nada de ello: por eso no
hay «última vez» que mostrar. Alguien que solo tiene tu enlace, y te escribe como solicitud de mensaje, no recibe nada
de vuelta hasta que aceptes: ni que has leído, ni que estás en línea o escribiendo.

Para ocultarlo a un contacto, abre su chat, toca su nombre y luego **Aparecer sin conexión**. Con eso activado:

- **No te ve en línea**, ni que estás escribiendo, y tu teléfono no le envía nada mientras lees.
- **Sus mensajes se quedan en ✓** en su teléfono, no en ✓✓ ni ✓✓✓, mientras los lees.
- **Cuando le escribes**, apareces en línea durante dos minutos, y cada mensaje suyo que lees pasa a ✓✓✓ al instante.
- **Tú tampoco lo ves en línea**, ya que tu teléfono no pregunta.

Se ajusta para cada chat, solo en este teléfono. Desactívalo de nuevo y verá lo que leíste en tu siguiente consulta al
relay.

### Nombres y eliminar

Abre un chat, toca su nombre y luego **Cambiar nombre** para darle un nombre. El nombre se queda en este teléfono,
sellado con el chat: el otro teléfono no lo ve. Un nombre vacío devuelve el principio de su clave, salvo que uno de tus
contactos esté vinculado a él: entonces vuelve a tomar su nombre la próxima vez que se abra su ficha, mientras el
vínculo siga (ver [Contactos](#contacts)).

Toca su nombre y luego **Imagen** para darle una imagen que elijas tú, un símbolo sobre un color, en lugar de la
dibujada a partir de su clave. O toca **Foto** (o **Hacer foto**) para una foto: recortada en cuadrado, reducida y
redibujada, para que no quede nada más que su imagen (ni un lugar ni un teléfono), y luego sellada en un archivo propio.
También se queda en este teléfono, y entra en las copias de seguridad; **Imagen a partir de su clave** devuelve la
dibujada.

Cada chat también puede tener su propio aspecto: toca su nombre y luego **Apariencia del chat** para las mismas opciones
que **Apariencia** (estilo, tema, colores, fondo de pantalla, mensajes), solo para ese chat. Como el nombre, se queda en
este teléfono, sellado con el chat. **Como la app** le devuelve el aspecto de la app.

Para guardar un chat fuera de Erevos, toca su nombre y luego **Exportar chat**: sus mensajes van a un archivo de texto,
cada día bajo su fecha y cada mensaje con su hora y quién lo escribió, guardado en la carpeta que elijas (en un
ordenador, donde elijas). El archivo no está cifrado: cualquiera que lo tenga, o cualquier app que lea esa carpeta,
puede leerlo. Las fotos, los archivos y los mensajes de voz solo se nombran, los mensajes que desaparecen se omiten, y
los chats ocultos no se exportan, para que ningún archivo fuera de Erevos muestre que existen.

**Por qué:** un mensaje que desaparece se omite, y también una cita de uno, porque quien lo envió quería que
desapareciera, no que se quedara en un archivo.

Para eliminar un mensaje, mantenlo pulsado y toca **Eliminar**. Para eliminar todos los mensajes de un chat, toca su
nombre y luego **Eliminar mensajes**.
En ambos casos Erevos pregunta dónde:

- **Este teléfono:** solo aquí. El otro teléfono conserva los suyos.
- **Los dos teléfonos:** su teléfono también los elimina, la próxima vez que consulte el relay. Su Erevos lo hace, pero
  una app modificada, una captura de pantalla o una copia todavía pueden conservarlos.

### Eliminar y bloquear un contacto

Toca el nombre de un chat y luego **Eliminar contacto** para olvidarlo: su chat desaparece de este teléfono, y Erevos te
da al instante una nueva cola en el relay. A tus otros contactos se les dice discretamente, en un mensaje sin nada
dentro, y otra vez 7, 14 y 21 días después mientras no hayan escrito a la nueva; lo que escribieron a la antigua
mientras tanto se sigue mostrando durante 14 días. Al contacto eliminado no se le dice, y nada de lo que envíe ahí
aparece. Tu enlace de contacto sigue como estaba, así que todavía puede pedir volver a hablar con él, como solicitud de
mensaje, como cualquiera que lo tenga.

**Por qué:** todos tus contactos escriben en tu única cola, así que la persona que eliminas todavía sabe dónde está; en
cuanto se mueve, ya no puede escribirte ahí, ni tampoco quien envió la basura de más abajo. Tu enlace de contacto nombra
una cola propia, que una eliminación no toca, así que todos los enlaces y códigos QR que diste siguen funcionando.

**Una cola para cada contacto:** en un relay actualizado para ello, cada contacto escribe en una cola propia, que solo
conoce él, dicha dentro de tus mensajes cifrados; la cola de tu enlace de contacto queda entonces solo para los primeros
mensajes. Así el relay no puede saber, por adónde van los mensajes, que dos contactos escriben al mismo teléfono, y
eliminar o bloquear a alguien elimina solo su cola: la tuya solo se mueve si también la conocía, como la conocen los
contactos de antes de esto, y alguien que llegó por tu enlace de contacto antes de su primer movimiento. Los contactos
de antes reciben a su vez una propia, unos pocos cada vez, discretamente, y un Erevos suyo de antes también la acepta.
Estas colas se leen sin token, así que el token, que nombra tu teléfono, no las relaciona; a través de Tor, de ocho en
ocho, cada ocho por circuitos propios. Aun así se crean y se eliminan con el token, así que un relay que guarde
registros puede relacionarlas en ese momento. Los chats ocultos y los ordenadores vinculados mantienen una sola cola
para todos, por ahora. La app web no tiene Tor, así que mientras está abierta espera en las colas de todos tus
contactos a la vez, desde una sola dirección; con las notificaciones con la app cerrada activadas, tu relay también
tiene una dirección push para las colas de todos tus contactos (ver [En un iPhone](#iphone)).

- **Bloquear contacto**, debajo, hace lo mismo, y además descarta lo que envíe después, también una solicitud.
  **Bloquear**, junto a **Rechazar**, bloquea una solicitud de mensaje: una solicitud solo conoce tu enlace de contacto,
  así que mueve tu cola solo mientras el enlace todavía nombre esa, como pasa hasta tu primer movimiento. A quien
  bloqueaste está en **Contactos bloqueados** en **Chat nuevo**, con **Desbloquear**. Volver a añadirlo desde su enlace
  te pide desbloquearlo antes;
  hasta entonces nada lo añade, ni su respuesta a una invitación por SMS ni su enlace de contacto en un grupo. Cada
  persona que escribe desde tu enlace de contacto puede hacer sonar el teléfono, como cualquier mensaje: **Rechazar** o
  **Bloquear** detiene a esa persona, **Notificaciones** → **Silenciado** en su chat la silencia sin rechazarla, y
  **Nuevo enlace de contacto** detiene a quien tenga el enlace antiguo una vez pasados sus 14 días.
- **Grupos:** alguien de uno de tus grupos todavía puede escribirte ahí. Erevos dice en cuántos estáis juntos: sal de
  ellos, o pide a su admin que lo saque.
- **Cuando el relay no está disponible**, la cola cambia en cuanto responde, y hasta entonces nada de lo que envíe
  aparece.
- **Los mensajes programados** que tenías para esa persona se retiran del relay, al instante o en cuanto responda, así
  que nunca salen.
- **Basura:** cuando tu cola se llena de lo que no es para nadie de aquí, Erevos te da una nueva de la misma manera y lo
  dice, como mucho una vez al día. Cuando la basura llena la cola que nombra tu enlace de contacto, recibes en su lugar
  un enlace nuevo. Una avalancha de solicitudes de mensaje inventadas también cuenta como basura, mientras que un lote de
  solicitudes reales sigue llegando.
- **Nuevo enlace de contacto**, junto a **Compartir mi enlace de contacto**, te da un enlace nuevo: los enlaces y
  códigos QR que diste antes funcionan 14 días más, y luego ya no. Tus contactos no se ven afectados. Si el relay pierde
  la cola que nombra tu enlace, recibes un enlace nuevo de la misma manera, pero los que diste antes dejan de funcionar
  al instante.
- **En un ordenador vinculado** va al teléfono, que también lo elimina o lo bloquea y mueve sus colas, también las del
  ordenador. El teléfono guarda quién está bloqueado y se lo dice al ordenador: añadirlo ahí desde su enlace también te
  pide desbloquearlo, y **Desbloquear** también lo desbloquea en el teléfono.
- **En los chats ocultos** solo se mueven las colas de ese lugar, su cola de llamadas al instante, para que el contacto
  eliminado ya no pueda hacer sonar el teléfono. Nada del espacio ni de los otros lugares se mueve.

El **Eliminar** de la ficha del contacto (ver [Contactos](#contacts)) solo quita la ficha, no el chat. Una copia de
seguridad hecha antes de una eliminación o un bloqueo devuelve ese contacto: elimínalo o bloquéalo de nuevo tras
restaurarla. Una vez restaurada, tu cola dice que es más nueva que cualquiera que conozcan tus contactos, y se les dice
otra vez a cada uno, para que todos escriban donde tú lees.

### El menú de un mensaje

Mantén pulsado un mensaje para su menú: las reacciones arriba, y luego lo que puedes hacer con él.

- **Reacciones:** toca una, o **+** para más. Aparece bajo el mensaje en los dos teléfonos, la tuya resaltada; tócala
  otra vez para retirarla. Cada uno de vosotros tiene una reacción por mensaje. Sale al instante, o no sale: cuando ni
  el relay ni su teléfono cercano pueden recibirla, no cambia nada.
- **Responder:** tu siguiente mensaje le responde, y lo muestra citado encima de tus palabras, en los dos teléfonos.
  Toca la cita para ir al mensaje al que responde; **✕** la quita. Un Erevos anterior a esto muestra la respuesta sin la
  cita.
- **Reenviar:** envía una copia a otro chat: elige un contacto, o un grupo. Sus palabras, sticker o lugar van de nuevo,
  una encuesta como una nueva sin respuestas todavía, y el sonido de un mensaje de voz o los bytes de una foto o un
  archivo se envían otra vez, cifrados con una clave nueva, así que nada relaciona la copia con el mensaje del que
  viene. La copia dice **Reenviado** debajo, no de dónde; un Erevos anterior a esto la muestra sin eso. Un mensaje que
  desaparece no se reenvía, y desde los chats ocultos un mensaje solo va a esos mismos chats ocultos.
- **Destacar:** lo destaca, solo en este teléfono, para encontrarlo otra vez: **Mensajes destacados** en el menú de la
  pantalla de inicio los lista de todos tus chats, y los detalles de un chat listan los suyos. Un toque va al mensaje.
  Los mensajes destacados de los chats ocultos solo aparecen en los detalles de sus chats.
- **Fijar:** lo fija arriba del chat, en los dos teléfonos; cualquiera de los dos puede **Dejar de fijar**. Con más de
  uno fijado, se ve el último; tócalo para ir a él, y se ve el siguiente.
- **Copiar:** pone sus palabras en el portapapeles, para pegarlas en otra app. En Android la copia se marca como
  privada, así que el aviso del teléfono sobre ella no muestra las palabras, pero cualquier app que lea el portapapeles
  puede leerlas.
- **Editar:** para un mensaje tuyo, hasta un día después de enviarlo. Sus palabras van al campo bajo **Editar
  mensaje**: cámbialas y envía, o **✕** para dejarlo como estaba. Los dos teléfonos muestran las nuevas palabras, con
  **Editado** junto a la hora. Solo se editan palabras, no un sticker, un lugar, una encuesta, un mensaje de voz, una
  foto ni un archivo, ni palabras que reenviaste. Uno que todavía espera salir sale con las nuevas palabras, sin marca;
  uno enviado para más tarde no se edita. La edición sale al instante, o no sale, como una reacción, y tus dispositivos
  vinculados también la muestran. Un Erevos anterior a esto conserva las palabras antiguas.
  **Por qué:** un día es tiempo suficiente para corregir un error, y nadie puede cambiar lo que dijo hace días. La marca
  muestra que las palabras no son las primeras.
- **Eliminar:** en este teléfono, o en los dos, como arriba.

Las reacciones, respuestas, mensajes fijados y ediciones viajan dentro del cifrado, como los mensajes.

### Mensajes temporales

Abre un chat, toca su nombre y luego **Mensajes temporales** para elegir cuánto duran sus mensajes nuevos una vez
leídos: 5 minutos, 1 hora, 1 día o 1 semana. Para que solo desaparezca el siguiente mensaje, toca el cronómetro junto al
campo de mensaje (o **Mensaje temporal** bajo **+**, o **Temporal** en el menú de la flecha de enviar): **Desaparece 1
hora después de leerse** aparece sobre el campo. Toca el tiempo para elegir otro, o **✕** para desactivarlo. Va con el
siguiente mensaje que envíes: palabras, un mensaje de voz, una foto o un archivo, un sticker, un lugar o una encuesta,
ahora o más tarde. Un SMS no puede desaparecer: enviado como SMS, se queda en los dos teléfonos (Erevos lo dice antes),
y el cronómetro vuelve a desactivarse. Su tiempo empieza cuando el otro teléfono lo muestra en la pantalla, y tu copia
empieza cuando su teléfono lo dice (**✓✓✓**). Cada mensaje dice cuándo desaparece. El otro teléfono conoce el ajuste del
chat la próxima vez que consulta el relay, y cualquiera de los dos teléfonos puede cambiarlo: gana el cambio más
reciente. Los mensajes que ya están en el chat se quedan.

- **Hasta que se lee**, un mensaje temporal se queda en los dos teléfonos, sellado como el resto. Si su Erevos nunca
  dice que lo leyó, tu copia se queda.
- **Mientras Erevos está cerrado:** un mensaje cuyo tiempo ha llegado se elimina la próxima vez que se abre el chat.
  Hasta entonces se queda en el teléfono, sellado como el resto.
- **No es una garantía:** su Erevos los elimina, pero una app modificada, una captura de pantalla o una copia todavía
  pueden conservarlos.

### Notificaciones de este chat

En Android, abre un chat, toca su nombre y luego **Notificaciones**; en un grupo, toca su nombre (en un grupo público,
**⋯**) y luego **Notificaciones**. **Silenciado** durante 8 horas, 1 semana o **Siempre**: sus mensajes no suenan ni
muestran notificación, así que el icono de Erevos tampoco los cuenta; la lista los sigue mostrando, con una campana
tachada, y sus llamadas siguen sonando. **Sonido de mensaje** y **Tono de llamada** le dan un sonido propio para sus
mensajes y para sus llamadas, de la propia lista de sonidos de Android, o **Sin sonido**. En los detalles de un chat la
fila dice entonces **Silenciado hasta** y la hora, o **Sonidos propios**.

**Por qué:** un chat silenciado sigue contando en la lista, para que no se pierda nada de lo que llegó: solo el
teléfono deja de llamarte a él. Sus sonidos se guardan solo en este teléfono, con el chat en los datos cifrados del
espacio, porque cada teléfono tiene sus propios sonidos: un dispositivo vinculado guarda los suyos, y el otro teléfono
no sabe nada de ellos.

- **En los chats ocultos** solo hay **Silenciado**: un sonido propio le diría a cualquiera cerca qué chat es.
- **Un espacio cerrado, y los chats ocultos mientras están cerrados,** no saben en qué chat llegó un mensaje, así que
  avisan de él como dicen los ajustes de la app.
- **Solo en Android** por ahora: la app web avisa de cada chat como dicen sus ajustes.

### Mensajes de voz

En el chat de un contacto, sin nada escrito, mantén pulsado el micrófono al final de la barra de mensajes mientras
hablas, y suelta para enviar; desliza a la izquierda antes de soltar para descartarlo. Una pulsación de menos de un
segundo se toma por un descuido y no envía nada. Al cabo de un minuto se envía solo. La primera vez, Android pregunta si
Erevos puede usar el micrófono: solo graba mientras lo mantienes pulsado. Con TalkBack, tócalo una vez para empezar y
otra para enviar. Toca un mensaje de voz para reproducirlo, y tócalo otra vez para pararlo. Los mensajes de voz tienen
las mismas marcas que el resto, y siguen el ajuste de mensajes temporales del chat.

**Por qué:** en un teléfono un mensaje de voz es AAC a 64 kbit/s, unos 480 KB por minuto: tan claro como puede ser el
habla. Más no se oiría en una voz, pero tardaría más en enviarse, sobre todo por Bluetooth.

- **Por el relay, o cerca,** cifrados de extremo a extremo como las palabras, en varios trozos. Nadie entre medias puede
  oírlos, pero por los trozos el relay, o quien escuche cerca, puede saber que se envió algo largo, y más o menos de
  qué duración. Cerca solo van al teléfono de un contacto que se sabe que está cerca.
- **En el teléfono** cada sonido se guarda en un archivo propio, sellado con su propia clave, que solo tiene el
  historial sellado del chat. Cuando el mensaje desaparece, eliminado, temporal o por ser el más antiguo, su archivo
  también. Cuántos de estos archivos hay, y sus tamaños, muestran más o menos cuántos mensajes de voz guarda el
  teléfono, en todos sus espacios juntos, no en cuál.
- **Mientras se reproduce**, el sonido queda sin sellar en la caché de Erevos, y se elimina en cuanto se detiene. Si
  Erevos se cierra mientras graba o reproduce, lo que quedó desaparece la próxima vez que se abre un chat.

### Fotos y archivos

En el chat de un contacto, toca **+** junto al campo de mensaje, que se abre donde estaba el teclado, y luego **Foto**
para elegir una de las fotos del teléfono, **Cámara** para hacer una, o **Archivo** para cualquier otra cosa, hasta 100
MB. Debajo, **Calidad de la foto** fija cómo van las fotos, y Erevos lo recuerda:

- **Original** (por defecto): la foto exactamente como era, a tamaño completo, sin perder calidad. Solo se quita lo que
  dice aparte de su imagen: dónde se hizo, el teléfono, la hora, las miniaturas. Su nombre es solo "photo".
- **90%** y **75%:** una foto nueva, más pequeña, más rápida de enviar, que no dice nada más que su imagen.

Sus fotos y archivos de hasta 16 MB llegan solos; toca uno más grande para recogerlo. Toca una foto para verla entera,
con su tamaño, o un archivo para guardarlo. **Guardar** pone una copia en una carpeta que eliges la primera vez, y
**Guardar en otra carpeta** la cambia. Las fotos y los archivos tienen las mismas marcas que el resto, y siguen el ajuste
de mensajes temporales del chat.

- **Cómo viajan:** cada archivo se cifra en el teléfono con una clave propia, en trozos todos del mismo tamaño, y se
  pone en tu relay. Solo dónde están los trozos y la clave van al contacto, cifrados de extremo a extremo. Su teléfono
  recoge los trozos a través de su propio relay, así que tu relay nunca ve la dirección de su teléfono, comprueba cada
  trozo, y luego los elimina del relay. Los trozos que nadie recoge se eliminan a los 14 días.
- **Lo que ve el relay:** cuántos trozos hay y su tamaño, así que más o menos lo grande que es el archivo, y cuándo. No
  lo que es ni para quién.
- **Un archivo va tal cual,** con lo que diga dentro: el autor de un documento, o el lugar y el teléfono de una foto si
  la envías con **Archivo**. Envía las fotos con **Foto**.
- **En el teléfono** cada archivo se guarda en sus trozos, tal como viajaron, sellado con su propia clave, que solo
  tiene el historial sellado del chat. Cuando el mensaje desaparece, sus trozos también. Cuántos trozos hay muestra más
  o menos cuánto guarda el teléfono, en todos sus espacios juntos, no en cuál. Una foto se muestra desde la memoria,
  nunca se escribe sin sellar. El selector de fotos del teléfono entrega una copia en la caché de Erevos, que se
  elimina en cuanto se lee, y una foto hecha aquí no se guarda en las fotos del teléfono.
- **Las fotos y archivos guardados** están fuera de Erevos, sin sellar: cualquiera con el teléfono puede abrirlos.
- **Solo por el relay:** los archivos necesitan su almacén de archivos, aunque el contacto esté cerca. Un relay más
  antiguo que esta versión no puede recibir archivos: actualízalo.

### Más bajo +

Bajo **+** hay más cosas que enviar aparte de fotos y archivos (la carita al final del campo de mensaje también abre
los stickers):

- **Sticker:** uno de los 528 stickers que trae Erevos, en 22 grupos de 24 (entre ellos **Lunas**, **Perros**,
  **Grecia**, **Frases** y **Antojos**), dibujados por cada teléfono: solo viaja su nombre, así que nunca se descarga
  nada. Un Erevos anterior a esto muestra su emoji en su lugar. Todos menos las frases y los antojos se mueven un poco
  durante unos segundos al llegar y al tocarlos, y luego se quedan quietos; con el ajuste de reducir el movimiento del
  teléfono activado, se quedan quietos. Las frases aparecen en el idioma de la app.
- **Míos**, entre los stickers, contiene los que haces a partir de fotos. **Nuevo sticker a partir de una foto** recorta
  uno en cuadrado, lo reduce (512 por 512, unos 100 KB como mucho) y solo conserva su imagen, nada de dónde ni con qué se
  hizo. Se guarda sellado en el espacio, o en los chats ocultos donde se hizo, y solo aparece ahí, hasta 100; mantén
  pulsado uno para eliminarlo. Como el resto, entra en una copia de seguridad, sellado, y nunca va a los otros
  dispositivos de la cuenta. Va como va una foto, cifrado de extremo a extremo por el relay, marcado como sticker, así
  que aparece solo, sin burbuja; un Erevos anterior a esto lo muestra como una foto. Mantén pulsado un sticker que te
  hayan enviado y toca **Añadir a mis stickers** para guardarlo.
- **Ubicación** (en Android): envía dónde estás, una vez, como un lugar. La primera vez, Android pregunta si Erevos
  puede usar la ubicación. El teléfono busca por todas las vías que tiene a la vez: por satélite, cuando permitiste la
  ubicación precisa, y por su ubicación de red, que en muchos teléfonos pregunta a Google o al fabricante del teléfono. Se
  abre en seguida una hoja que dice que está buscando; en interiores, donde los satélites se ven mal, eso puede tardar
  hasta un minuto. Si no llega nada a tiempo, ofrece el lugar que el teléfono encontró en los últimos diez minutos,
  diciendo hace cuánto, o dice por qué no se encontró ninguno, con **Volver a intentarlo** y la pantalla del teléfono que
  lo cambia. Erevos solo mira cuando tocas, te muestra el lugar antes de enviarlo, y no te sigue después. El mensaje solo
  contiene las coordenadas, cifradas de extremo a extremo; en Erevos no se carga ningún mapa. **Abrir en mapas** pasa el
  lugar a tu app de mapas, que puede cargar su mapa de internet. Un Erevos anterior a esto muestra las coordenadas como
  palabras.
- **Encuesta:** una pregunta con dos opciones o más, hasta 12, y, con **Más de una respuesta**, más de una para elegir.
  Toca una opción para elegirla, y otra vez para retirarla; cada opción muestra cuántos la eligieron, y quiénes. Los
  votos viajan dentro del cifrado, como las reacciones. Un Erevos anterior a esto muestra la pregunta y sus opciones
  como palabras, para responder con palabras.

**Por qué:** un paquete de stickers descargado de internet le diría a un servidor que este teléfono tiene Erevos, así
que los stickers vienen incluidos y solo viajan sus nombres. Los tuyos se listan en un único valor sellado del mismo
tamaño para cada espacio y lugar oculto, se use o no, así que una lista en uso parece igual que una que no lo está: 100
es lo que cabe. Un lugar solo se envía desde Android: en un ordenador o en la app web, el navegador preguntaría a un
servicio externo dónde está.

### Vistas previas de enlaces

Un enlace en un mensaje aparece subrayado, y solo se abre cuando lo tocas y lo confirmas. Con **Vistas previas de
enlaces** activado, en los detalles de un chat, un enlace que envías va con su vista previa: al enviarlo, este teléfono
descarga la página y toma su título, una línea sobre ella y una imagen pequeña, y van dentro del mensaje, cifrados de
extremo a extremo. El teléfono que lo recibe no descarga nada: muestra lo que llegó. Está desactivado salvo que lo
actives, y entonces está activado para todos los chats del espacio;
cada lugar de chats ocultos tiene su propio interruptor, en los detalles de un chat de ahí.

**Por qué:** solo el teléfono que envía descarga la página, así que el teléfono que recibe un enlace no contacta con
ningún sitio elegido por otra persona, y no le muestra a ese sitio nada de sí mismo, ni siquiera su dirección.

- **El sitio ve la dirección de internet de este teléfono**, y cuándo, como la vería desde un navegador, pero no para
  quién es el mensaje. A través de Tor, Erevos solo envía sus peticiones al relay, no páginas, así que mientras todo lo
  del espacio va por Tor (**Todo** en Tor) no se hace ninguna vista previa.
- Erevos en un ordenador no hace ninguna, pero muestra igualmente las que llegan.
- **Por LoRa**, que solo lleva poco, un mensaje va sin su vista previa en lugar de esperar, y aquí no guarda ninguna.
- Una vista previa es lo que la página dice de sí misma, sea cierto o no. Un Erevos anterior a esto muestra el enlace
  sin ella.

### Llamadas de voz y vídeo

En el chat de un contacto, toca el auricular verde de arriba para una llamada de voz, o la cámara azul de al lado para
una videollamada. La primera vez, Android pregunta si Erevos puede usar el micrófono, y la cámara para el vídeo. Su
teléfono suena mientras Erevos está abierto ahí, en cualquier pantalla del espacio: toca **Responder** o **Rechazar**.
Durante la llamada puedes silenciar, cambiar al altavoz, apagar tu cámara, alternar entre la cámara frontal y la
trasera, y **Colgar**. Cada llamada deja una línea en el chat, como cuánto duró, o una llamada perdida.

**Una llamada normal por la red móvil:** cuando un contacto tiene su número de teléfono vinculado, o está vinculado a
uno de tus contactos con número (**Vincular a uno de mis contactos** en su chat, primero un número de móvil), el teclado
naranja de arriba de su chat, antes de la cámara, abre un teclado con ese número escrito, y lo mismo hace el de arriba
de una conversación SMS. Es el **Teléfono** de Erevos cuando Erevos es la app de teléfono, o si no el del propio
teléfono: toca ahí la tecla de llamar. Una llamada así va por la red de la compañía telefónica y no está cifrada, igual
que un SMS normal. Los chats ocultos y los ordenadores no la tienen.

- **Cifrado de extremo a extremo:** la llamada se establece con mensajes por el relay, cifrados como el resto. Estos
  llevan la clave que cifra la propia llamada, así que nadie entre medias puede escuchar, ni siquiera el relay de
  llamadas de más abajo.
- **Por el relay de llamadas:** un relay configurado con el kit de \`deploy/relay\` tiene un relay de llamadas al lado.
  La llamada va a través de él, así que ningún teléfono conoce la dirección IP del otro. Por Wi-Fi o datos móviles, en
  cualquier sitio.
- **Sin relay de llamadas** (un relay en tu propio ordenador, por ejemplo), Erevos pregunta antes: la llamada va
  entonces directamente entre los teléfonos, solo funciona en la misma Wi-Fi, y cada teléfono ve en ella la dirección
  del otro.
- **Sin internet:** en la misma Wi-Fi, en el punto de acceso de un teléfono, o en la Wi-Fi que crean dos teléfonos
  (Wi-Fi Direct), con un espacio abierto en los dos, una llamada no necesita ningún relay: se establece por el enlace de
  cerca y va directamente entre los teléfonos (u ordenadores). Lo mismo vale para los mensajes de grupo
  y las llamadas de grupo.
- **En segundo plano (Android):** mientras un espacio está abierto, Erevos sigue funcionando cuando sales de él, con
  Inicio o quitándolo de las apps recientes, con un aviso discreto, «Erevos – Ready for calls and messages», que no
  aparece en la pantalla de bloqueo. Espera en el relay y en los enlaces a teléfonos cercanos, así que los mensajes
  llegan: un aviso solo dice «New message», o cuántos llegaron, y en un teléfono bloqueado solo «Erevos». Una solicitud
  de mensaje, de alguien que solo tiene tu enlace de contacto, hace el mismo aviso y sonido, y cuenta en el icono, como
  cualquier mensaje. Una llamada suena con el tono del teléfono y un aviso, «Incoming call» (o «Incoming video call») –
  «Open Erevos to answer», sin nombre, también sobre la pantalla de bloqueo y el salvapantallas, y la pantalla se
  enciende. Tócalo para responder. Con el bloqueo con contraseña activado, una llamada que suena aparece antes de la
  contraseña, y Erevos se bloquea en cuanto termina. Bloqueado, el espacio sigue detrás de la pantalla de la
  contraseña, así que los mensajes y las llamadas siguen llegando, y una llamada aparece sobre la pantalla de la
  contraseña. Solo llegan así los chats y grupos de ese espacio, y los chats ocultos con **Recibir estando cerrados**
  activado; los demás chats ocultos solo dicen que llegó un mensaje, o suenan sin nombre, si lo permites (ver Chats
  ocultos). Ajústalo en **Ajustes** → **Notificaciones** → **En segundo plano**: **Recibir y sonar** (por defecto) o
  **Solo mientras Erevos está a la vista**, y **Avisar de mensajes nuevos** (por defecto) o **Sin aviso**, que vale
  también mientras Erevos está a la vista. Ahí también, si Android los pide, **Seguir funcionando con ahorro de
  batería** y **Mostrar llamadas sobre la pantalla de bloqueo**.
- **El número en el icono:** con **Avisar de mensajes nuevos** activado, cuando sales de Erevos con mensajes sin leer
  en los chats y grupos del espacio abierto, el aviso se queda, sin sonido, y dice cuántos son, con los que avise
  después; se va mientras Erevos está a la vista, y vuelve al salir, hasta que los hayas leído. No cuenta los mensajes
  de un chat silenciado (ver Notificaciones de este chat), ni los de uno oculto al salir. El launcher de Android lo
  muestra en el icono de Erevos, como un número o, en algunos teléfonos, como los Pixel, como un punto. **Ajustes** →
  **Notificaciones** → **Número en el icono** lo desactiva: entonces el aviso solo habla de lo que llegó desde la
  última vez que tuviste Erevos abierto, y el número del launcher se va con él. Un mensaje eliminado para todos antes
  de que lo leas, o leído en un ordenador vinculado, ya no cuenta.

  **Por qué:** en Android solo un aviso puede poner un número en el icono de una app, así que el aviso se queda
  mientras esperan mensajes; no dice más que cuántos son, como siempre.
- **Un espacio que está cerrado:** no recibe nada, ya que su clave solo está en memoria mientras está abierto: sus
  mensajes esperan en su relay y llegan cuando lo abres. Salvo que elijas, en ese espacio, **También mientras otro
  espacio está abierto** en **Ajustes** → **Notificaciones** → **En segundo plano** (por defecto es **Este espacio solo
  mientras está abierto**): entonces, mientras otro espacio está abierto y recibe, solo dice «New message», o cuántos
  llegaron, con el mismo aviso que ese espacio, nunca qué espacio, y sus chats ocultos no dicen nada. Lo que otros
  teléfonos llevaron a su relay cuenta como mensaje, también las eliminaciones, y un mensaje que se le envía sin sonido
  suena como siempre (ver **Enviar sin sonido**). Para ello el teléfono guarda las direcciones de sus colas en su relay
  fuera de su contraseña, entre ellas la cola en la que escribe cada uno de sus contactos, hasta 64 contactos, nunca sus
  claves, quiénes son sus contactos ni sus mensajes, y solo pregunta al relay cuántos llegaron, nunca los pide: se
  quedan ahí hasta que se abre el espacio. A un espacio que va por Tor (**Mensajes**, por defecto, o **Todo**, en **Qué va
  por Tor**) solo se le pregunta a través de Tor: mientras el espacio abierto tiene Tor desactivado, o su Tor se
  está iniciando o acaba de fallar, el espacio cerrado no dice nada, y lo que llegó se avisa en cuanto Tor está listo
  ahí.

  **Por qué:** un espacio tras una segunda contraseña no debe mostrar que existe, así que esto está desactivado salvo
  que lo actives, y entonces no dice más de lo que diría el espacio abierto. Si se le preguntara directamente desde el
  teléfono mientras otro espacio está abierto, su relay o alguien que vigile la red podría relacionar los dos espacios
  por la dirección de internet del teléfono. Como cada contacto escribe en una cola propia, el espacio tiene que
  preguntar también por cada una de ellas, o sus mensajes no dirían nada. El precio es que su relay puede saber que los
  dos espacios están en un mismo teléfono, y alguien que examine el teléfono con herramientas puede descubrir que un
  segundo espacio guarda direcciones ahí, y cuántos contactos tiene.
- **Donde no puede sonar:** detenido por Android (o por el ahorro de batería del teléfono, o por el ajuste propio del
  fabricante), después de reiniciar el teléfono hasta que abras Erevos y el espacio una vez, en otro espacio (solo dice
  que llegó un mensaje, si lo permites, como arriba), o en un ordenador o en la app
  web mientras están cerrados. Una llamada ahí aparece como llamada perdida en cuanto Erevos se abre. Cuando Android
  cierra Erevos mientras recibe y lo vuelve a iniciar, como suele hacer, un aviso discreto lo dice: abre Erevos y el
  espacio para volver a recibir. Tras **Forzar detención**, con el uso de batería en Restringido, o cuando el ajuste
  propio del fabricante lo cierra, Android no vuelve a iniciar nada, así que ningún aviso lo dice: el aviso «Erevos»
  simplemente desaparece, y nada suena hasta que abras Erevos. **Permisos** (más abajo) avisa de antemano si alguno de
  estos está configurado. Lo mismo hace otro aviso, «Locked», cuando el espacio que recibía se cierra (tras restaurar
  una copia de seguridad, por ejemplo) y Erevos deja la pantalla pidiendo la contraseña. Una solicitud de mensaje no
  puede llamarte hasta que la aceptes.
- **Permisos (Android):** **Ajustes** → **General** → **Permisos** muestra lo que Android deja hacer a Erevos para las
  llamadas y los mensajes en segundo plano (avisos, el aviso de llamada y que aparezca en pantalla, el aviso de
  mensajes, con sus avisos «Messages without sound» y «Messages with a chat's own sound», que también mantienen el
  número en el icono, llamadas sobre la pantalla de bloqueo, funcionar con ahorro de batería, funcionar en segundo plano
  sin el uso de batería en Restringido, no pausarse si no se usa, datos móviles en segundo plano, el micrófono) y para
  otras cosas (el sonido de mensajes nuevos, avisos en la pantalla de bloqueo, llamadas a pesar de «No molestar»,
  cámara, teléfonos cercanos, contactos, horas exactas para los SMS enviados más tarde y los recordatorios, el aviso de
  recordatorios una vez que llegó un recordatorio), cada uno con su porqué y un botón que abre la pregunta o el ajuste
  del propio Android. También dice cuándo el teléfono está en silencio o en vibración, cuándo está activado el ahorro
  de batería, y cuándo está activado «No molestar» sin dejar pasar las llamadas de Erevos. En teléfonos Huawei, Honor,
  Xiaomi, OPPO, realme, OnePlus, vivo, Samsung y ASUS también dice dónde está el ajuste propio del fabricante, que
  Erevos no puede leer: toca **Ya lo hice** una vez configurado. Tras cada versión nueva, y la primera vez, se abre
  solo cuando las llamadas o los mensajes necesitan algo. En la app web muestra lo que permite el navegador, ver
  [En un iPhone](#iphone).
- **Una llamada a la vez.** Una llamada sigue mientras te mueves entre pantallas del espacio. Termina cuando el espacio
  se cierra, y una llamada en los chats ocultos cuando estos se cierran, cosa que no hacen durante una llamada. Quitar
  Erevos de las apps recientes también termina una llamada.
- Las llamadas no van por un teléfono cercano ni por Bluetooth. Ahí, **Talkie** bajo **+** convierte el chat en un
  walkie-talkie, y **Talkie activado** aparece sobre el campo: mantén pulsado el walkie-talkie al final de la barra
  mientras hablas, suelta, y se reproduce en su teléfono según llega, si el chat contigo está abierto
  ahí; si no, espera como mensaje de voz. Es un mensaje de voz más pequeño (unos 3 KB por segundo), así que va a todas
  partes adonde va un mensaje, Bluetooth incluido.

**Por qué:** las claves que abren los mensajes de un espacio solo están en memoria mientras está abierto, y selladas
tras su contraseña el resto del tiempo. Así que después de reiniciar el teléfono no se puede leer nada y nada suena
hasta que abras Erevos y el espacio una vez; y los chats ocultos, cuya clave solo está en memoria mientras están
abiertos salvo que **Recibir estando cerrados** la guarde con el espacio, si no solo dicen que llegó un mensaje, o
suenan sin nombre, si lo permites.

> Los ajustes del relay, tu cola, tus contactos y sus nombres, las claves de tus conversaciones y los mensajes se
> guardan en este espacio, sellados. El historial no tiene límite: se guarda en páginas selladas del mismo tamaño,
> mezcladas con las páginas de los otros espacios y chats ocultos, así que solo se ve cuánto ocupan todas juntas, no de
> quién son. El resto se guarda con el mismo tamaño para cada espacio y chats ocultos, se use o no; lo que es más grande
> va a páginas como las del historial, entre ellas. Los mensajes eliminados pueden quedarse un tiempo en el
> almacenamiento del teléfono, sellados como el resto, hasta que algo se escribe encima. Los mensajes enviados o
> recibidos de cerca se guardan de la misma manera.

## Chats de grupo {#groups}

Desde el menú de la pantalla de inicio, **Grupo nuevo**: dale un nombre, marca los contactos a los que invitar, y toca
**Crear el grupo**. Eres su admin. El teléfono de cada contacto responde solo la próxima vez que Erevos esté abierto ahí,
y se une: el grupo aparece entonces en su pantalla de inicio, con una nota de quién lo añadió. Un teléfono solo se une a
un grupo cuyo admin es el contacto que se lo pidió, y un admin solo deja entrar a un contacto como sí mismo, nunca como
otra persona. Los grupos van por el relay, así que tiene que estar configurado.

**Por qué:** solo el teléfono del admin cambia el grupo (quién está en él, su nombre), así que ningún servidor tiene que
ordenar los cambios: todos los teléfonos los toman de ese. Por eso un miembro sale pidiéndoselo al admin, y solo el admin
añade o saca miembros.

- **A quién se puede invitar:** contactos que has aceptado, en este espacio. Los miembros que no son contactos entre sí
  igualmente hablan en el grupo, y aparecen por el principio de su clave.
- **Añadir como contacto:** en la lista de miembros (**⋯**), **Añadir como contacto** bajo un miembro que no es tu
  contacto le pide, en un mensaje que solo recibe esa persona, su enlace de contacto, y le da el tuyo. En su teléfono la
  petición aparece una vez, arriba del grupo, y toca **Enviar** o **No enviar**; si toca **No enviar**, no se te dice.
  En cuanto lo envía sois contactos el uno del otro, con un chat propio, y **Nombre** le da un nombre, como lo hace bajo
  cualquier contacto que todavía no tenga uno. Que no haya respuesta puede significar que aún no ha abierto el grupo,
  que dijo que no, que tiene un Erevos más antiguo, o que todavía te tiene como contacto, lo que no le muestra nada;
  pasada una semana puedes volver a pedirlo. En cuanto sois contactos el uno del otro, en cualquier grupo o por un
  enlace de contacto, lo que se pidió en vuestros otros grupos desaparece, y su petición ya no aparece. Un miembro
  sacado del grupo ya no pide nada. Si dos miembros muestran la misma clave, uno de ellos no es quien dice ser, y ningún
  enlace de contacto va a ninguno de los dos ni se toma de ninguno. No en los grupos públicos. Pedirlo es cosa del
  teléfono que tiene la cuenta; **Nombre** también funciona en un dispositivo vinculado.
- **Cifrado de extremo a extremo para el grupo:** MLS (RFC 9420). Cada mensaje se cifra una vez para el grupo, y luego
  se sella otra vez para cada miembro, así que lo que llega a la cola de cada miembro no se parece a nada de lo que
  reciben los demás, y ningún relay puede saber quién está en un grupo. Va directamente a la cola de cada miembro, a
  través de tu relay. Cada semana las claves de cada teléfono en el grupo se renuevan, las del admin por sí solas y las
  de cada miembro a través del admin, así que unas claves sacadas una vez de un teléfono dejan de leer el grupo.
- **Miembros:** toca el nombre del grupo arriba, o **⋯** a su lado. El admin añade contactos, saca miembros y cambia el
  nombre del grupo. Un miembro sacado no lee nada de lo que diga el grupo a partir de entonces, y el grupo se queda en
  su teléfono, solo para leer, hasta que lo elimine.
- **Salir:** **Salir del grupo** se lo pide al admin, cuyo teléfono te saca la próxima vez que Erevos esté abierto ahí.
  El botón propio del admin es **Cerrar el grupo**: saca a todos los miembros.
- **Llamadas de grupo:** el auricular verde de arriba del grupo inicia una llamada de voz en él, y la cámara azul de al
  lado una videollamada (también **Videollamada** bajo **⋯**). Mientras hay una en curso, solo aparece su propio botón,
  para unirse. Suena en los teléfonos de los miembros donde Erevos está abierto, y quien responde entra. Una llamada en
  curso aparece arriba del grupo, para unirse más tarde. Hasta ocho personas: cada teléfono se conecta con cada uno de
  los otros, a través del relay de llamadas, así que ningún teléfono ve la dirección IP de otro; sin relay de llamadas,
  solo en la misma Wi-Fi. Cifrado de extremo a extremo entre cada dos teléfonos, con sus claves enviadas en el cifrado
  del grupo. En una videollamada cada teléfono envía su imagen a cada uno de los otros, así que las imágenes se ven
  para hasta cuatro personas; con más, se pausan y el sonido sigue, hasta que se monte un servidor para videollamadas
  más grandes.
- **Fotos, archivos y mensajes de voz:** **+** junto al campo envía una foto o un archivo, como en el chat de un
  contacto, con la misma **Calidad de la foto**; mantén pulsado el micrófono mientras hablas, y suelta para enviar.
  Cada uno se cifra con una clave propia y se pone una vez en tu relay, y solo dónde está y su clave van al grupo, en
  su cifrado. El teléfono de cada miembro lo recoge de ahí a través de su propio relay: hasta 16 MB solo mientras el
  grupo está abierto, uno más grande al tocarlo. Toca una foto para verla entera, un archivo para guardarlo, un mensaje
  de voz para reproducirlo.
  - **El relay lo guarda 14 días,** cifrado, ya que no puede saber cuándo lo han recogido todos los miembros.
  - **Solo por el relay,** aunque los miembros estén cerca.
  - **Un miembro que se une más tarde** no recibe lo que llegó antes, como con las palabras. Un miembro cuyo Erevos
    sea anterior a esta versión no ve nada de ello.
  - **En el teléfono** cada uno se guarda en sus trozos, sellado, como en el chat de un contacto. Eliminar el grupo
    aquí los elimina.
- **El menú de un mensaje,** al mantenerlo pulsado, como en el chat de un contacto: las reacciones, **Responder**,
  **Reenviar**, **Destacar**, **Fijar**, **Copiar**, **Editar** y **Eliminar**. Cada miembro tiene una reacción por
  mensaje, y una encuesta muestra quién eligió qué. Un mensaje fijado es para todos, y cualquier miembro puede **Dejar
  de fijar**. **Editar** da a tus propias palabras otras nuevas para todos los miembros, hasta un día después de que
  salieran, marcadas como **Editado**. **Eliminar** pregunta **Este teléfono** o, para un mensaje tuyo, **Para todos**:
  el Erevos de los miembros también lo elimina, y una foto, archivo o mensaje de voz tuyo sale de tu relay al instante
  en lugar de a los 14 días. **+** también tiene aquí **Sticker**, **Ubicación** y **Encuesta**. Los enlaces aparecen
  subrayados y se pregunta antes de abrirlos, y las **Vistas previas de enlaces**, cuando están activadas, van con los
  tuyos. En la hoja de miembros, o en la pantalla propia de un grupo público, **Buscar en este chat** recorre los
  mensajes del grupo y **Exportar chat** los escribe en un archivo; **Mensajes destacados** y la búsqueda de la pantalla
  de inicio también incluyen los grupos. Un miembro cuyo Erevos sea anterior a esta versión ve las palabras, el emoji de
  un sticker, las coordenadas de un lugar y la pregunta de una encuesta, y nada de reacciones, mensajes fijados,
  ediciones y eliminaciones.
- **Todavía no:** marcas, escribiendo y mensajes temporales en los grupos, y grupos a través de un teléfono cercano.

## Grupos públicos {#public-groups}

Un grupo público es uno al que cualquiera con su enlace, o su código QR, puede pedir unirse: para un club, una calle o
una clase, donde no todos son tus contactos. Desde el menú de la pantalla de inicio, **Grupos públicos**: dale un nombre
y el nombre con el que te presentas en él, elige quién entra, y toca **Crear el grupo público**. Eres su propietario.
Sus mensajes están cifrados de extremo a extremo con MLS y van a cada miembro como en cualquier grupo, y ningún relay
sabe quién está en él.

- **El enlace:** toca el nombre del grupo arriba para su enlace y su código QR, y **Compartir el enlace**. Quien lo abre,
  o escanea el código con la cámara del teléfono, elige el nombre que ve el grupo y toca **Pedir unirse**. Un enlace
  también se puede pegar en **Unirse con un enlace**. Todos los miembros tienen el enlace, y pueden pasarlo.
- **Unirse mientras no estás:** la petición espera en tu relay, sellada para que solo tu teléfono la abra, hasta que
  Erevos esté abierto en tu teléfono: mira cada pocos segundos mientras Erevos está a la vista, y más o menos cada
  minuto en segundo plano. Entonces lo deja entrar, y el grupo aparece en su teléfono.
- **Quién entra:** **Cualquiera con el enlace**, o **Un admin les deja entrar**: entonces quien lo pide espera en
  **Quieren unirse**, a que tú o un admin toquéis **Dejar entrar** o **Rechazar**. Tu teléfono lo deja entrar igualmente,
  en cuanto se entera.
- **Admins:** en **Miembros**, toca **Moderar** junto a un miembro, y luego **Hacer admin**. Los admins silencian,
  expulsan y vetan miembros, dejan entrar a quien lo pide, y eliminan un mensaje para todos; solo tú moderas a los
  admins, y nadie te modera a ti.
  - **Silenciar:** su teléfono no envía nada en el grupo, y ningún teléfono muestra lo que el suyo envíe de todos
    modos. **Dejar que escriba** lo deshace.
  - **Expulsar:** no lee nada de lo que diga el grupo a partir de entonces, y puede volver a pedir unirse por el
    enlace.
  - **Vetar:** expulsado, y lo que su teléfono pida después se rechaza. **Levantar el veto**, en **Vetados**, lo
    deshace. Un veto detiene al mismo teléfono, no a alguien que vuelve con una nueva cola en el relay: contra eso,
    elige **Un admin les deja entrar**, o cambia el enlace.
  - **Eliminar para todos:** los últimos mensajes aparecen listados abajo; **Eliminar** quita uno del teléfono de
    todos los miembros. Quien ya lo haya leído puede haber guardado una copia.
- **Cambiar el enlace:** el enlace y el código QR compartidos hasta ahora dejan de funcionar al instante, y todos los
  miembros reciben el nuevo. Las peticiones que todavía esperaban en el antiguo se pierden.
- **Ceder el grupo:** en **Moderar** de un miembro. Su teléfono pasa a ser el propietario y deja entrar a la gente, así
  que el enlace cambia a uno de su relay; tú sigues siendo admin. Si tu teléfono se pierde antes de cederlo, nadie podrá
  volver a dejar entrar a nadie, aunque el grupo sigue para quienes están en él.
- **Cerrar el grupo** saca a todos los miembros. **Salir del grupo** de un miembro le pide a tu teléfono que lo saque.
- **Hasta 100 miembros,** ya que todo el grupo tiene que caber en el único mensaje que deja entrar a alguien.
- **Todos los teléfonos de un grupo público necesitan esta versión de Erevos.** Los grupos creados a partir de
  contactos funcionan como antes.

**Por qué:** solo el teléfono del propietario cambia el grupo y deja entrar a la gente, así que los cambios nunca
compiten y ningún servidor tiene que ordenarlos. Por eso el grupo sigue sin él, pero no entra nadie nuevo: cédelo antes
de cambiar de teléfono.

### Lo que revela un grupo público

> Cualquiera con el enlace puede leer el grupo desde que se le deja entrar, nunca lo que se dijo antes, y el enlace se
> puede pasar: cámbialo para impedirlo.

- **El enlace** muestra el nombre del grupo y la dirección de tu relay a quien lo vea.
- **Cada miembro ve de cada miembro** el nombre elegido, una clave hecha solo para este grupo, la dirección de su relay
  y el sender id de su cola. La clave no dice nada de quién es en sus chats, ni en qué otros grupos está. La cola es
  una en la que solo leen sus grupos públicos, no la de su enlace de contacto, la misma en cada uno de sus grupos
  públicos (un Erevos anterior a 2.0.0 da la de su enlace de contacto).
- **Los nombres se eligen, no se demuestran:** cualquiera puede llamarse como quiera. El principio de la clave de cada
  miembro aparece junto al nombre, y el propietario y los admins están marcados.
- **Lo que se diga se puede copiar** por cualquiera del grupo: el cifrado de extremo a extremo deja fuera a los relays,
  no a los miembros.
- **Los relays** no leen nada ni conocen a nadie del grupo. El tuyo ve llegar peticiones a la puerta del grupo, cuántas
  y cuándo, no de quién. Los miembros pueden llenarse la cola unos a otros con lo que no se puede leer, hasta lo que
  admita el relay.

## Cómo elige Erevos el camino {#paths}

Cuando envías un mensaje, Erevos elige el camino por sí solo:

1. **Su teléfono está cerca** (la parte de arriba del chat dice **Cerca**): va por el enlace de cerca, y también por el
   relay cuando hay uno.
2. **Si no, con un relay:** va por el relay, y un mensaje corto también va a los teléfonos con Erevos conectados cerca,
   para que el suyo pueda responder de cerca si es uno de ellos. Si el relay no está disponible, esa copia es la que
   cuenta, y esos teléfonos también la llevan al relay de tu contacto, como en
   [Chatear con un teléfono cercano](#nearby).
3. **Si no, sin relay,** va a los teléfonos con Erevos conectados cerca, como en el 2.
4. **Y por LoRa,** cuando hay una radio configurada y el relay no pudo recibir un texto, como en
   [Con una radio LoRa](#lora). Sin ningún camino, el mensaje espera, marcado como **En espera**, y sale solo en cuanto
   haya uno, como en [Enviado, llegado y leído](#relay); una línea bajo el chat dice por qué.

Todos los caminos están cifrados de extremo a extremo: ningún relay ni ningún teléfono entre medias puede leer lo que
envías.

| Línea bajo el chat | Qué hacer |
| --- | --- |
| **Enviado cerca, cifrado de extremo a extremo.** | Nada: su teléfono está cerca y lo tiene. |
| **Enviado por el relay, cifrado de extremo a extremo.** | Nada: está en camino. |
| **Enviado a los teléfonos con Erevos cercanos, cifrado de extremo a extremo, porque el relay no estaba disponible.** | Solo llega si uno de ellos es el suyo: espera a **✓✓**, o revisa el relay. |
| **… Si el suyo no está entre ellos, se lo entregan a su relay en cuanto tengan internet, y este teléfono también.** | Nada: llega en cuanto uno de ellos, o este teléfono, tenga internet. Espera a **✓✓**. |
| **Enviado por LoRa, cifrado de extremo a extremo, porque el relay no estaba disponible.** | Llega si su Erevos tiene una radio en la misma malla, al alcance: espera a **✓✓**, o revisa el relay. |
| **En espera. El relay no está disponible (o No hay relay), y su teléfono no está cerca.** | Nada: sale solo en cuanto el relay o su teléfono cercano puedan recibirlo, y entonces muestra **✓**. Sin relay, rellena su dirección, como en [Chatear a través de un relay](#relay), o acércate a su teléfono. |
| **En espera. Es demasiado largo para LoRa.** | Nada: sale en cuanto el relay o su teléfono cercano puedan recibirlo. O envíalo en partes más cortas. |
| **No enviado. El relay ya no tiene la cola de este contacto.** | Pídele que te escriba, o su nuevo enlace de contacto. |
| **Esta versión no puede cifrar, así que los chats por el relay están desactivados.** | Vuelve a compilar la app: esta compilación es anterior a su cifrado. |

## Tener tu propio relay {#own-relay}

Un relay que gestionas tú es el más seguro, ya que quien gestiona un relay ve quién se conecta a él. El código fuente
lo tiene todo en \`deploy/relay\`.

- **En tu propia red:** ejecuta el relay en un ordenador, abre el puerto 7879 en su cortafuegos, y escribe
  \`ws://<su dirección>:7879\` en cada teléfono. Vuelve a cerrar el puerto cuando acabes.
- **En internet:** un servidor (VPS) con Debian 12 o Ubuntu 22.04 o posterior, un nombre de dominio (o un nombre
  gratuito de \`sslip.io\`) y los puertos 80 y 443 abiertos. Un solo comando instala el relay detrás de Caddy, con un
  certificado de Let's Encrypt y un token aleatorio. Cada teléfono usa entonces \`wss://<tu dominio>\` y ese token. El
  mismo comando configura el relay de llamadas para las llamadas, que necesita además el puerto 3478 y los puertos UDP
  50000 a 50999 abiertos.

Las colas y los mensajes en espera se guardan en el disco del servidor, y también los trozos cifrados de fotos y
archivos hasta que se recogen (1024 MB en total como mucho), así que un reinicio no pierde nada, y no se registra ninguna
petición.
Los mensajes enviados para más tarde también se guardan ahí hasta su hora, 10.000 o 256 MB como mucho: el relay ve
cuándo debe salir cada uno, no lo que dice.

**Por qué:** lo que guarda el relay tiene límites, para que los teléfonos que lo usan no puedan llenar su disco ni su
memoria.

**Su propia clave:** el archivo de clave del relay (\`EREVOS_RELAY_KEY\`, que configura el único comando) es lo que
demuestra en cada conexión, así que los teléfonos lo reconocen por esa clave y no por su certificado (ver
[La clave propia del relay](#relay)). Guarda ese archivo, también en sus copias de seguridad: con uno nuevo, todos los
teléfonos que conocían la clave antigua rechazan el relay hasta que alguien toca **Tiene una clave nueva** en ellos.

**Invitaciones:** el relay puede dejar que cada teléfono tenga un token propio, en un archivo de tokens, y luego dejar
que esos teléfonos inviten a más, cada invitación para un teléfono (ver [Invitaciones al relay](#relay)). Actívalo con
\`EREVOS_RELAY_INVITES=on\` junto a \`EREVOS_RELAY_TOKENS\`; el relay escribe entonces él mismo en ese archivo las
líneas de los teléfonos invitados, con quién los invitó y cuándo, y quitar una línea corta ese teléfono, y los teléfonos
que invitó. Deja entrar 100 teléfonos por invitación como mucho (\`EREVOS_RELAY_MAX_INVITED\`). Quién invitó a quién va
por el token, no por el nombre: una línea puesta en lugar de otra con un token nuevo corta los teléfonos que invitó la
antigua, salvo que \`erevos-relay free-line NAME\`, ejecutado con el relay parado, los libere antes. Un teléfono que
llega con el token del relay (\`EREVOS_RELAY_TOKEN\`) pide una vez una línea propia, que el relay añade como una de las
tuyas, indicando que llegó con el token del relay y cuándo, 50 al día como mucho: así puedes repartir ese token,
eliminar la línea de un teléfono cualquiera, y luego cambiar el token sin cortar a los demás. \`deploy/relay/README.md\`
explica cómo.

**Inicio de sesión:** con un archivo de tokens, el relay también puede dejar que los teléfonos inicien sesión con un
proveedor OpenID Connect, como Authentik, para obtener un token propio, y comprueba cada cuenta cada hora, quitando sus
teléfonos tras 3 días sin respuesta y otras dos comprobaciones de cada teléfono que fallen con una hora de diferencia
(ver [Iniciar sesión en el relay](#relay)). Un navegador puede empezar 10 inicios de sesión por minuto. Con
\`EREVOS_RELAY_OIDC_GROUP\`, solo pueden las cuentas de ese grupo.
Necesita un cliente en el proveedor, unos pocos ajustes, y que \`/signin/\` se pase al relay como HTTP simple:
\`deploy/relay/README.md\` explica cómo.

> No publiques nunca el token donde otros puedan leerlo. Quien gestiona el servidor ve las direcciones IP que se
> conectan, los ids de las colas, y cuándo y cuánto llega. No puede leer los mensajes, que están cifrados de extremo a
> extremo.

## Relay de casa {#home-relay}

En **Ajustes** → **Relay y redes** → **Relay de casa**, un espacio puede tener un segundo relay con una cola propia: uno
en casa, en una Raspberry Pi o en un ordenador viejo, o cualquier otro relay en el que confíes. Es opcional.

- **Lo que hace:** tu enlace de contacto y cada mensaje indican esa cola junto a tu relay. Mientras tu relay no está
  disponible, los contactos escriben ahí, y Erevos recoge lo que llega ahí en cada consulta. Lo que envías va a través
  de él cuando tu propio relay está caído.
- **Cómo configurarlo:** ejecuta un relay como en [Tener tu propio relay](#own-relay), escribe su dirección (y su
  token, si tiene) y elige **Guardar**. Los contactos lo conocen con tu siguiente mensaje, o con tu nuevo enlace de
  contacto.
- **Lo que ve:** lo que ve tu relay, la dirección de este teléfono cuando recoge mensajes, y cuándo y cuánto llega. Los
  chats ocultos no lo usan.
- **Para los chats ocultos:** cada lugar oculto puede tener un relay de casa propio, en **Para usuarios avanzados** de
  su pantalla sin ningún chat elegido, mientras está abierto. Se guarda solo con ese lugar, sellado con su PIN, así que
  el espacio no sabe nada de él, y se consulta mientras el lugar está abierto. Usa un relay distinto del del espacio: un
  relay que viera las dos colas podría relacionarlas.

## A través de Tor {#tor}

En **Ajustes** → **Relay y redes** → **Tor**, **Qué va por Tor** elige cuáles de las peticiones de este espacio a sus
relays van por la red Tor. Cada espacio tiene su propia elección:

| Opción | Qué va por Tor |
| --- | --- |
| **Mensajes** | Salvo que lo cambies. Lo que escribes, y lo que les dice algo a tus contactos, como que un mensaje se leyó. Las imágenes, los archivos y los mensajes de voz van directos, que es más rápido: para ellos el relay ve la dirección IP de tu teléfono. |
| **Todo** | También los archivos. Nada va a un relay sin Tor. |
| **Nada** | El relay ve la dirección IP de tu teléfono para todo. |

**Por qué:** con **Mensajes**, lo que escribes queda oculto por Tor y nunca lo espera, mientras que las imágenes, los
archivos y los mensajes de voz, que son grandes, van directos y por tanto más rápido.

- **Lo que oculta:** el relay ya no ve la dirección IP de tu teléfono, solo una salida de Tor (o nada, para un relay con
  una dirección \`.onion\`). Tu compañía telefónica o la Wi-Fi solo ven que usas Tor, no qué relay.
- **Lo que cuesta:** lo que va por Tor llega y sale más despacio, y el primer arranque de Tor tarda un rato. La pantalla
  muestra cuánto le falta a Tor. Para ahorrar batería, Erevos envía el relleno reducido que Tor hizo para los teléfonos:
  el relleno que Tor envía para ocultar cuándo hablas sale cada 9 a 14 segundos, no cada pocos, y no llega ninguno al
  teléfono.
- **Lo que no cubre:** las llamadas, cuyo sonido e imagen van directamente entre los teléfonos o a través del relay de
  llamadas; los teléfonos cercanos y los SMS, que no usan internet.
- **Solo en Android:** Erevos en un ordenador y la app web aún no tienen Tor, así que ahí todo va directo.

> Con **Mensajes**, un mensaje nunca espera a Tor: uno que Tor no pudo llevar al relay sale directo al instante, y lo
> mismo los mensajes mientras Tor arranca, o durante un minuto después de que no pudiera contactar con el relay; luego
> se vuelve a probar Tor. Con **Todo**, nada va a un relay sin Tor:
> cuando Tor no puede contactar con el relay, el mensaje espera y se vuelve a intentar; Erevos nunca vuelve por sí solo
> a tu propia conexión.

### Puentes

Donde Tor está bloqueado, **Puentes** en la misma pantalla deja que Tor llegue a su red a través de puentes. Está en
**Sin puentes** salvo que elijas, cada espacio tiene su propia elección, y solo cuenta mientras algo va por Tor.

| Opción | Qué es |
| --- | --- |
| **obfs4** | Los puentes obfs4 que trae Tor Browser. Para quien vigila la red, Tor parece bytes aleatorios. Un censor que los conozca puede bloquearlos. |
| **Snowflake** | A través de los navegadores de voluntarios, con WebRTC, como va una videollamada. Para encontrar uno, Erevos pregunta al broker de Snowflake a través de una CDN, tras el nombre de otro sitio, y unos servidores STUN le dicen al teléfono su propia dirección: ven esa dirección, nunca tus mensajes. Más lento, y difícil de bloquear. |
| **Los míos** | Líneas de puentes de bridges.torproject.org, de bridges@torproject.org por correo, o de @GetBridgesBot en Telegram, pegadas una por línea; luego toca **Usar estos puentes**. Funcionan obfs4, Snowflake, WebTunnel, meek y puentes normales. |

- **Solo a través de ellos:** con puentes, Tor nunca va directamente a sus relays. Cuando ningún puente responde, con
  **Todo** los mensajes esperan, como cuando Tor no puede contactar con el relay; con **Mensajes** van al relay sin Tor
  hasta que alguno responda. Las líneas que no son puentes no se aceptan, y Tor se queda apagado.
- **Cambiarlos** mientras Tor funciona cierra sus conexiones y las vuelve a hacer de la nueva manera.
- **Solo en Android:** la app lleva lyrebird, el programa propio de Tor para obfs4, Snowflake, WebTunnel y meek. Un
  ordenador y la app web aún no tienen Tor, así que tampoco puentes.

## A través de Nostr {#nostr}

En **Ajustes** → **Relay y redes** → **Nostr**, **Textos por Nostr** está **Activado** salvo que lo cambies. Entonces lo
que escribes a un contacto cuyo Erevos también lee en Nostr va por relays públicos de Nostr, a través de Tor, en lugar
de por tu relay. Cada espacio tiene su propia elección, y sus propios relays de Nostr.

- **Cómo se sella:** cifrado de extremo a extremo como siempre, luego sellado una vez más para una clave que tu contacto
  dio solo para este chat, y firmado por una clave hecha para ese único texto (un gift wrap NIP-59). Los relays de Nostr
  ven que alguien escribió a una clave que no nombra a nadie, cuándo, y de qué tamaño; no quién lo escribió, ni a quién.
  Tu relay no lo ve en absoluto.
- **Lo que pueden saber los relays de Nostr:** tu teléfono pide a cada uno todas sus claves a la vez, a través de Tor:
  un relay puede saber que esas claves se leen juntas, nunca desde dónde. A cada relay se llega por circuitos de Tor
  propios, así que ninguna salida de Tor lleva lo que va a dos de ellos, y ninguna puede saber que es de un mismo
  teléfono. Algunos relays rechazan algunas salidas de Tor, y algunas salidas no pueden llegar a un relay: tras un fallo
  así, el siguiente intento va por otra salida.
- **Solo a través de Tor:** con Tor en **Nada**, o mientras Tor arranca, los textos van por tu relay.
- **Los relays:** relay.damus.io, nos.lol y relay.primal.net salvo que los cambies; puedes añadir los tuyos, cinco como
  mucho. A tus contactos se les dicen los relays en los que lees, y te escriben ahí; basta con uno que acepte un texto.
- **Lo que se queda en tu relay:** imágenes, archivos, mensajes de voz, llamadas, reacciones, y las marcas de que un
  mensaje llegó o se leyó; y lo que escribes a contactos en un iPhone o un ordenador, que no leen en Nostr.
- **Por dónde fue:** mantén pulsado un mensaje: su menú dice **Enviado por Nostr** o **Llegó por Nostr** cuando un relay
  de Nostr lo aceptó. Uno que no dice nada fue por tu relay, o de cerca. La nota bajo los mensajes también dice
  **Enviado por Nostr**. Dos teléfonos uno al lado del otro se dan los textos de cerca primero: para probar Nostr,
  desactiva Bluetooth y **Buscar Erevos en la misma Wi-Fi** en los dos.
- **Lo último que hicieron los relays:** la pantalla de **Nostr** muestra, para cada relay, si aceptó el último texto
  que se le dio y cuántos segundos después, o por qué no, y si tu teléfono lee en él. Se guarda solo en este teléfono,
  hasta que Erevos se cierra. Un relay que aceptó un texto pero no lo dijo en 20 segundos cuenta como uno que no lo
  aceptó: el texto va entonces también por tu relay, y tu contacto lo ve una vez.
- **Solo en Android,** como Tor.

**Por qué:** los relays de Nostr son públicos, así que Erevos solo llega a ellos a través de Tor, y nunca saben dónde
está tu teléfono. Solo van ahí los textos: un texto tiene tu relay como respaldo, por si no llega, mientras que las
marcas de que un mensaje llegó o se leyó no tendrían ninguno, y un mensaje enviado para más tarde necesita que tu relay
lo guarde hasta su hora. Las imágenes y los mensajes de voz por Nostr todavía están por venir.

> Si el teléfono de tu contacto no dice en cinco minutos que un texto llegó, va también por tu relay, y lo ve una vez.
> Cuando ningún relay de Nostr lo acepta, va por tu relay al instante.

- **Chats ocultos:** también leen en Nostr, mientras están abiertos, y también cerrados mientras **Recibir estando
  cerrados** está activado para ellos y el espacio está abierto (ver [Chats ocultos](#hidden)). Cerrados, siguen
  mostrando «New message»: con cada texto por Nostr, tu contacto también envía a tu relay una campanita, un mensaje que
  no dice nada, que tu relay cuenta como uno, como antes. Sin relay, su enlace de contacto y su código QR dicen dónde
  leen en Nostr, con una clave solo de ese lugar, y los textos, las reacciones y las marcas de que un mensaje llegó van
  ahí, como desde un teléfono sin relay.

### Sin ningún relay {#nostr-only}

Un teléfono sin relay, sin invitación y sin cuenta LPHL igualmente puede empezar: su enlace de contacto y su código QR
dicen dónde lee en Nostr, y eso basta para hablar.

- **Para empezar:** en **Chat nuevo**, toca **Empezar sin relay**, luego **Mostrar mi código QR** o **Compartir mi
  enlace de contacto**, y dáselo a alguien que use Erevos. Quien lo añada te escribe por Nostr, a través de Tor, y
  aparece como solicitud de mensaje, que aceptas. Tú también puedes añadir su enlace o su código QR, de la misma
  manera.
- **Lo que va:** textos, stickers, reacciones, ediciones, y las marcas de que un mensaje llegó o se leyó, todo por
  Nostr. Las fotos, los mensajes de voz, los archivos, las llamadas y los grupos necesitan un relay, o el otro teléfono
  cerca. Los chats ocultos también funcionan así, solo por Nostr (ver [Chats ocultos](#hidden)).
- **Cuando no llega:** los relays de Nostr guardan un texto dos días. Hasta que el teléfono de tu contacto diga que
  llegó, Erevos se lo vuelve a dar una vez al día, durante dos semanas.
- **Un relay por sí solo:** cuando tu contacto tiene un relay que le deja invitar, su Erevos le envía al tuyo una
  invitación a él por sí solo, una vez, en el chat, tanto si os conocisteis por Nostr como de cerca, por Bluetooth,
  Wi-Fi o un código QR. Tu teléfono la acepta por sí solo, y a partir de entonces las fotos, los mensajes de voz y las
  llamadas también funcionan, con todos. Cuenta como una de sus invitaciones. Alguien cuya solicitud de mensaje no has
  aceptado no elige ningún relay por ti: su invitación espera hasta que lo aceptes, una semana como mucho.
- **Un Erevos más antiguo** no lee la parte de Nostr de un enlace: solo te contacta de cerca, hasta que tengas un relay.

**Por qué:** Nostr es solo la forma de entrar. Nadie necesita una invitación para empezar, y en cuanto uno de vosotros
tiene un relay, este lleva lo que es demasiado grande para Nostr.

## SMS {#sms}

En Android, Erevos puede ser la app de SMS del teléfono: en **Ajustes** → **Teléfono y SMS** → **SMS** → **Erevos como
app de SMS**, toca **Hacer que Erevos sea la app de SMS**. La pantalla de inicio muestra entonces los SMS y los chats de
Erevos en una sola lista.

> **Erevos no cifra los SMS ni los MMS.** Viajan como cualquier SMS, y se quedan en el almacén de SMS del propio
> Android, donde cualquier app con permiso para leer SMS los ve y las copias de seguridad de Android los guardan. Solo
> los chats de Erevos están cifrados de extremo a extremo.

- **SMS de antes:** nada que importar. Erevos muestra los SMS y MMS que ya hay en el teléfono, del almacén propio de
  Android, donde se quedan para cualquier otra app de SMS. Android los guarda, sin sellar por Erevos, como con cualquier
  app de SMS.
- **Si Erevos no se convierte en la app de SMS:** Android 15 y posteriores pueden impedirlo a una app instalada desde un
  navegador. En **Ajustes** → **Teléfono y SMS** → **SMS** → **Erevos como app de SMS**, toca **Abrir aplicaciones
  predeterminadas** → **Aplicación de SMS** → Erevos. Si Android dice que es un ajuste restringido, abre la
  **información de la aplicación de Erevos**, toca **⋮** arriba a la derecha → **Permitir ajustes restringidos**, y
  vuelve a elegir Erevos.
- **Cuando llega un SMS:** un aviso dice «New message», sin quién lo envió ni qué dice. Si no llega ninguno,
  **Erevos como app de SMS** muestra **Permitir notificaciones** mientras Android los retenga.
- **Códigos de un solo uso:** un SMS que dice contener un código (de un banco, de un inicio de sesión), en cualquiera de
  los idiomas de la app, lleva **Copiar código** debajo en el chat, y también en su aviso, sin que el código se vea
  ahí; en Android 12 y posteriores el botón del aviso pide desbloquear antes el teléfono. Solo se copian sus 4 a 8
  dígitos, nunca un número de teléfono, un importe, una fecha ni una hora, y Android no muestra ninguna vista previa de
  ellos. Cualquier app que lea el portapapeles puede leerlos, así que pega el código pronto.
- **Si no aparece ningún SMS:** Android 15 y posteriores retienen el permiso de SMS a una app instalada desde un
  navegador. En **Ajustes** → **Teléfono y SMS** → **SMS** → **Erevos como app de SMS**, toca **Permitir SMS**. Si
  Android dice que es un ajuste restringido, abre la **información de la aplicación de Erevos**, toca **⋮** arriba a la
  derecha → **Permitir ajustes restringidos**, y permite los SMS en **Permisos**. Los chats enviados como RCS («chat» en
  Google Mensajes) se quedan en esa app y no aparecen.
  **Erevos como app de SMS** dice cuántas conversaciones SMS lee Erevos, o por qué no pudo leerlas.
- **Escribir a alguien con Erevos:** va por Erevos, cifrado de extremo a extremo, en cuanto su número está vinculado a
  su contacto. Vincúlalo a mano en la conversación SMS, o deja que lo encuentre una invitación oculta. A partir de
  entonces su conversación SMS abre su chat.
- **Sus SMS en el chat:** los SMS y MMS con su número, los de antes y los que lleguen, aparecen entre los mensajes del
  chat por orden de hora, cada uno con un borde y marcado como **SMS (sin cifrar)**, con su ✓ y sus fotos. Mantén
  pulsado uno para copiarlo, reenviarlo o eliminarlo, como en la conversación SMS. Se quedan en los SMS del teléfono,
  nunca en el historial sellado del chat; solo aparece la conversación con ese único número, no un MMS de grupo, y solo
  mientras Erevos es la app de SMS o puede leer SMS, nunca en los chats ocultos. Los más recientes aparecen primero:
  **Mostrar SMS anteriores**, encima de ellos, trae más, y la búsqueda del chat también los encuentra. Abrir el chat
  marca como leídos todos los suyos, también los anteriores, para que ninguno quede contado en la pantalla de inicio. Un
  número en la ficha de su contacto hace lo mismo, sin vincularlo.
- **Un SMS normal a esa persona:** cuando no hay internet, por ejemplo. **SMS normal** en los **Detalles** del chat abre
  su conversación SMS para escribirlo ahí, y **+** → **Enviar como SMS**, o **Como SMS** al mantener pulsada la flecha
  de enviar, envía lo que escribiste como SMS, después de preguntar. Aparece en el chat como un SMS. La compañía
  telefónica puede leerlo. Un SMS no puede desaparecer ni responder a un mensaje: con el cronómetro activado, o con un
  mensaje respondido, Erevos lo dice al preguntar.
- **Invitaciones ocultas:** con el primer SMS a un número que no es un contacto, Erevos también envía una invitación
  oculta corta. No va ninguna al número de un contacto de Erevos, vinculado o en la ficha de su contacto. Un teléfono
  sin Erevos no muestra nada; un teléfono con Erevos responde por el relay y los dos se hacen contactos. A cada número
  se le pregunta como mucho una vez al mes, y **Desactivar invitaciones**, en **Ajustes** → **Teléfono y SMS** →
  **SMS** → **Descubrir Erevos en un número**, las detiene.

**Por qué:** para que dos teléfonos con Erevos se encuentren solo a partir de un número de teléfono, sin ningún servidor
que conozca números. La invitación es un SMS de datos, que las apps de mensajería no muestran, así que un teléfono sin
Erevos no muestra nada.

- **Todos los demás:** un SMS normal, marcado como SMS. La compañía telefónica puede leerlo, como lee cualquier SMS.
- **✓ y ✓✓✓:** un SMS tuyo muestra ✓ en cuanto salió, y ✓✓✓ en cuanto el informe de entrega de la red dice que llegó a
  su teléfono, o «no entregado». Algunas compañías telefónicas no envían informes de entrega; entonces se queda en ✓.
  Los SMS no pueden decir si se leyeron.
- **Fotos (MMS):** la imagen antes del campo de mensaje (**Foto**) añade una foto, reducida para caber en un MMS (unos
  280 KB), sin nada más que la imagen. Las fotos que llegan por MMS aparecen en la conversación. Un MMS es tan normal
  como un SMS: la compañía telefónica puede verlo.
- **MMS de grupo:** en **Ajustes** → **Teléfono y SMS** → **SMS** → **SMS nuevo**, escribe varios números separados por
  comas y toca **Escribir**. Cada mensaje va a todos ellos como un solo MMS, también el texto solo, y sus respuestas
  llegan a la misma conversación, cada una con quién la escribió. Todos los que están en ella ven el número de todos, y
  la compañía telefónica lo ve todo.
- **Dos SIM:** la SIM con la que enviar aparece encima del campo de mensaje; toca **Elegir la SIM** una vez para que
  Erevos las vea. Tu elección se guarda para ese número; hasta entonces, Erevos responde con la SIM por la que llegó el
  último mensaje. Cada mensaje muestra su SIM.
- **SMS más tarde:** mantén pulsado el botón redondo **Enviar** tras el campo y elige una hora, como en un chat. El SMS
  aparece al final de la conversación marcado como **Programado**; tócalo para cancelarlo. Sale a esa hora, también con
  Erevos cerrado y bloqueado; si el teléfono está apagado entonces, en cuanto se vuelva a encender y desbloquear. Hasta
  entonces no está en los SMS del teléfono, donde otras apps lo verían, y la compañía telefónica no lo tiene. Espera
  bloqueado con una clave del propio teléfono (Android Keystore), no con la contraseña de tu espacio, ya que Android
  tiene que enviarlo mientras Erevos está bloqueado: la protección que tiene cualquier SMS una vez enviado, ya que los
  SMS enviados se quedan en los SMS del teléfono. Solo texto, a un número.
- **Enlaces:** una dirección web en un SMS aparece subrayada, y se abre como en un chat, después de haberla visto
  entera.
- **Nombres de tus contactos:** desactivado al principio, así que los números de los SMS aparecen como números.
  **Nombres**, encima de la lista, los desbloquea (como **Mostrar nombres de mis contactos** en **Ajustes** → **Teléfono
  y SMS** → **SMS** → **Nombres de tus contactos**): los nombres que los contactos de tu teléfono dan a los números de
  SMS, y las fotos que tienen para ellos, o si no los de tus contactos guardados solo en Erevos, en la lista y en la
  conversación. Toca **Nombres** otra vez para ver solo números. Erevos solo los lee para mostrarlos, y no guarda
  ninguna copia.
- **Remitentes con nombre:** un SMS de un nombre en lugar de un número, como el de un banco, se abre para leerlo, pero
  no se puede responder.

### Mantener los SMS en orden

- **Mantener pulsado:** en la lista, mantén pulsada una conversación SMS para lo que puede hacer: **Fijar arriba**,
  **Archivar**, **Marcar como spam**, **Bloquear** y **Eliminar**, y **Añadir a contactos** para un número que no es
  ninguno de tus contactos. En una conversación, **⋮** arriba muestra lo mismo, y un número así también tiene **Añadir
  a contactos** bajo su nombre: un contacto nuevo con el número dentro.
- **Fijadas:** hasta 10 conversaciones SMS se quedan arriba de la lista, con una chincheta. **Dejar de fijar** devuelve
  una a su sitio.
- **Conversaciones archivadas:** fuera de la lista, en **Archivadas** arriba de la pantalla de inicio. Una vuelve sola
  a la lista cuando llega un SMS nuevo de ese número, o con **Desarchivar**.
- **Papelera:** una conversación eliminada espera en la **Papelera** 30 días, y luego Erevos la elimina de los SMS del
  teléfono. Hasta entonces **Recuperar** la devuelve a la lista; **Eliminar ahora** y **Vaciar la papelera** eliminan al
  instante, para siempre. Un SMS que llega después de que fuera a la Papelera aparece de nuevo en la lista. Solo la app
  de SMS puede eliminar SMS.
- **Spam:** un filtro que funciona solo en el teléfono, con reglas, y no envía nada a ninguna parte. Un SMS de un número
  que no es un contacto y al que nunca respondiste va a **Spam** cuando tiene un enlace con palabras que intentan
  engañar, como un paquete retenido o un premio, o una de las palabras que añades en **Ajustes** → **Teléfono y SMS** →
  **SMS** → **Filtro de spam**. **Marcar como spam** y **No es spam** deciden para un número de una vez por todas. Un
  aviso sigue diciendo «New message» cuando llega spam, ya que se muestra antes de abrir Erevos. Cada conversación en
  **Spam**, en la carpeta y arriba de la conversación, dice por qué está ahí: el número está bloqueado, lo marcaste, tu
  regla nombra al remitente, un número del extranjero, tu palabra, o un enlace y qué palabras.
- **Reglas sobre quién envía:** en **Filtro de spam**, **Remitentes** acepta el nombre de un remitente, como los que
  envían las tiendas y los bancos (letras, sin distinguir tildes ni mayúsculas), o un número, donde \`*\` vale por
  cualquier cosa: \`+4470*\` es cualquier número que empiece así, \`1234*\` cualquier código corto que lo haga, y con tu
  prefijo de país conocido, \`69*\` es también cualquier número \`+3069...\`. **A «Spam»** envía los suyos ahí; **Dejar
  pasar** les quita las reglas del filtro, como a los de tu banco o tu familia, aunque un número que marcaste como spam,
  o que bloqueaste, sigue yendo ahí. **Enviar a «Spam» los números del extranjero** envía cualquier número escrito con
  un prefijo de país distinto de **Tu prefijo de país**, que Erevos toma de los números a los que respondes y que puedes
  cambiar. Un número escrito sin prefijo es de aquí. Toca una regla para quitarla.
- **Bloquear:** **Bloquear** en el menú de una conversación, o **Ajustes** → **Teléfono y SMS** → **SMS** → **Números
  bloqueados**, pone un número en la lista de números bloqueados del propio Android: Android rechaza sus SMS, MMS y
  llamadas, y todos los espacios y la app de teléfono ven la misma lista. Solo la app de SMS o la app de teléfono pueden
  verla y cambiarla.
- **Borradores:** lo que escribes y no envías se queda con esa conversación, y la lista lo muestra como **Borrador**. Un
  SMS que no pudo salir también se queda ahí como borrador.
- **Deshacer el envío de un SMS:** un SMS que envías espera antes 5 segundos al final de la conversación: tócalo
  entonces para devolverlo al campo de mensaje. **Ajustes** → **Teléfono y SMS** → **SMS** → **Deshacer el envío de un
  SMS** fija **Desactivado**, 5 o 10 segundos. Cuando sales de Erevos, sale al instante.
- **Volver a enviar:** uno tuyo que no salió, o no se entregó, lo dice: tócalo para volver a enviarlo. Mantén pulsado
  cualquier mensaje para **Reenviar**, **Volver a enviar** y **Eliminar**, con sus palabras para seleccionar y copiar;
  un mensaje eliminado también tiene **Deshacer**.
- **Reenviar:** mantén pulsado un mensaje → **Reenviar**, luego escribe un número y toca **Escribir**, o elige un
  contacto en **A un chat de Erevos**. Se abre en esa conversación, para leerlo y enviarlo ahí. A un número también va
  su imagen, como MMS; a un chat solo sus palabras.
- **Cada espacio lo suyo:** las conversaciones fijadas, las archivadas, la Papelera, las marcas de spam y los borradores
  pertenecen al espacio, sellados con su contraseña. Los SMS en sí se quedan en los SMS del teléfono: otro espacio los ve
  tal cual, y uno que está en la Papelera aquí aparece ahí hasta que se elimina del teléfono.

## Teléfono {#phone}

En Android, Erevos puede ser la app de teléfono del teléfono: en **Teléfono** en el menú, toca **Ajustes** → **Hacer que
Erevos sea la app de teléfono**. Cada llamada aparece entonces en la pantalla de llamada propia de Erevos, y los enlaces
tel: y el botón de llamada del teléfono abren el teclado de Erevos. **Teléfono** también se abre desde el auricular de
arriba de la pantalla de inicio, y tiene un icono propio entre las apps del teléfono, **Teléfono**, verde con un
auricular sobre la marca de Erevos, que abre el teclado. Cada uno de estos, como un enlace tel:,
lo abre en cuanto Erevos está desbloqueado: con contraseña, después de escribirla, salvo que el Teléfono se abra sin
ella (ver La contraseña de Erevos, más abajo). Hasta entonces una tarjeta arriba dice **Erevos no es la app de
teléfono**; en un teléfono pequeño solo muestra ese título, y al tocarla se abren los **Ajustes** del Teléfono.

- **Buscar contactos:** arriba del Teléfono, escribe un nombre, un número o parte de cualquiera de los dos: los
  contactos con número aparecen en lugar de las pestañas, cada número en una línea propia. Toca uno para llamarlo, o
  mantenlo pulsado para ponerlo en el teclado. Busca en los contactos del teléfono y, con Erevos desbloqueado, en los
  guardados solo en Erevos y en tus contactos de Erevos con número; nunca en los chats ocultos.
- **La pantalla de llamada:** quién llama, o a quién llamas, con el nombre y la foto que le dan los contactos de tu
  teléfono; mientras Erevos está desbloqueado, un número vinculado a uno de tus contactos de Erevos muestra el nombre
  que le diste, y lo mismo el número de un contacto guardado solo en Erevos; el de un contacto de chats ocultos
  abiertos, solo mientras están abiertos. Aparece sobre la pantalla de bloqueo y no necesita contraseña, ya que una
  llamada tiene que poder responderse con Erevos bloqueado. Una llamada que entra muestra **Answer**, **Decline** y
  **Message**, y Android suena con el tono propio del contacto; las teclas de volumen lo silencian. En una llamada:
  **Mute**, **Keypad** para los tonos que pide un menú, **Speaker**, **Hold**, **Add call** y **End**.
  Junto a tu oreja la pantalla se apaga.
- **Por dónde va el sonido:** con un dispositivo Bluetooth o unos auriculares, el botón junto a **Keypad** dice por
  dónde va el sonido, y un toque te deja elegir: el teléfono, el altavoz, los auriculares o el dispositivo Bluetooth.
- **Una segunda llamada:** una que entra durante una llamada muestra **Hold and answer**, **End and answer** y
  **Decline**. Con una llamada retenida, la línea bajo el nombre lo dice: tócala, o **Swap**, para hablar con la
  otra. **Merge** junta las dos en una llamada, cuando tu compañía telefónica lo permite.
- **Rechazar con un mensaje:** **Message**, en una llamada que suena, la rechaza con una respuesta rápida, o una que
  escribas, que tu teléfono envía a quien llama como SMS; aparece entre tus SMS. En **Teléfono** → **Ajustes**,
  **Respuestas rápidas** las cambia: **Añadir una respuesta**, **Quitar**, **Guardar** y **Usar las respuestas
  habituales**. Se guardan en el teléfono, sin sellar, ya que la pantalla de llamada las muestra con Erevos bloqueado.
- **El teclado:** en **Teléfono**, escribe un número y toca **Llamar**; mantén pulsado **0** para el +. Al mantenerlo
  pulsado, el campo del número pega uno. **Add call**, durante una llamada, lo abre en cuanto Erevos está
  desbloqueado.
- **Dos SIM:** encima de **Llamar**, toca la SIM con la que llamar; la primera vez, **Elegir la SIM** pide a Android que
  deje a Erevos verlas. Un número al que llamas sin elegir pregunta con cuál (**Llamar con**). Erevos guarda la SIM que
  usaste para cada número, sellada en el espacio, y la próxima vez llama con la misma. La pantalla de llamada nombra la
  SIM de cada llamada.
- **Las llamadas:** en **Teléfono**, **Recientes** lista el historial de llamadas de Android, las más nuevas primero,
  bajo cada día: quién, qué llamada fue, con qué SIM, y cómo. **Todo**, **Perdidas**, **Entrantes**, **Salientes** y,
  en cuanto se bloqueó una llamada, **Bloqueadas** lo filtran; con dos SIM, **SIM 1** o **SIM 2** deja las llamadas de
  esa SIM. Las llamadas seguidas con el mismo número aparecen una vez, con cuántas fueron. **☏** devuelve la llamada; un
  toque en la fila muestra sus llamadas, cuánto duró cada una, y **Llamar** (con dos SIM, uno para cada una), **Enviar
  un SMS**, **Añadir a contactos** para un número que no es ninguno de tus contactos, y **Cambiar el número antes de
  llamar**. Vistas ahí, las llamadas perdidas salen del aviso de Android, y ese aviso abre **Recientes**.
- **Eliminar llamadas:** en las llamadas de la fila, **Eliminar esta llamada** (o **Eliminar estas 3 llamadas**, para
  una fila de varias) las elimina del historial de llamadas de Android, **Eliminar** junto a una de varias elimina solo
  esa, y **Eliminar todas las llamadas con este número**, cuando tiene más, las elimina todas, también las más antiguas.
  **Deshacer** aparece antes durante unos segundos; hasta entonces solo se ocultan.
- **Favoritos:** los contactos marcados con estrella en los contactos de tu teléfono, con sus fotos. Un toque llama al
  número predeterminado del contacto, o pregunta cuál cuando hay varios y ninguno es el predeterminado; al mantenerlo
  pulsado, los muestra todos.
- **Llamada por Wi-Fi y voz HD:** la pantalla de llamada lo dice bajo el nombre cuando una llamada va por Wi-Fi o con
  voz HD, y **Recientes** lo dice para cada llamada.
- **Bloqueo de llamadas:** en **Teléfono** → **Ajustes**, **Bloquear el telemarketing** bloquea las llamadas de los
  números que algunos países reservan para el telemarketing: Francia (01 62, 01 63, 02 70, 02 71, 03 77, 03 78, 04 24,
  04 25, 05 68, 05 69, 09 48, 09 49 y 09 475 a 09 479, por la decisión 2022-1583 de ARCEP), España (400, desde el 17 de
  octubre de 2026), Chile (809), India (140) y Brasil (0303, que quienes llaman ahí pueden omitir desde agosto de 2025).
  Otros países no reservan esos números, o Erevos no está seguro de que lo hagan, así que no se bloquea nada para ellos.
  En **Números que empiezan por**, escribe el principio de más números que bloquear, con el prefijo de país (+33 162) o
  como lo marcas aquí (0162), y toca **Bloquear**; **Quitar** elimina uno. Estos nunca bloquean un número de los
  contactos de tu teléfono. Una llamada bloqueada no suena y no deja aviso; aparece en **Recientes**, en
  **Bloqueadas**. Android pregunta una vez si Erevos puede filtrar las llamadas
  (**Dejar que Erevos filtre las llamadas**): sin eso, una llamada bloqueada suena un momento antes de que Erevos la
  corte. Lo que se bloquea es igual en todos los espacios, así que no dice nada de ninguno, y se guarda en el teléfono
  sin nombres.
- **Números bloqueados:** en **Teléfono** → **Ajustes**, **Números bloqueados** es la lista propia de Android, la misma
  que **Ajustes** → **Teléfono y SMS** → **SMS** → **Números bloqueados**: escribe un número y toca **Bloquear**, o toca
  uno para desbloquearlo. En **Recientes**, las llamadas de una fila muestran **Bloquear este número** o **Desbloquear
  este número**, con **Deshacer**. Android rechaza sus llamadas antes de que suenen, y sus SMS y MMS. Todos los
  espacios ven la misma lista.
- **Un grupo de contactos durante un tiempo:** en **Teléfono** → **Ajustes**, **Bloquear un grupo de contactos** lista
  los grupos (las etiquetas) de los contactos de tu teléfono. **Bloquear** junto a uno bloquea las llamadas de sus
  contactos **Durante una hora**, **Hasta mañana por la mañana** (7:00) o **Hasta que lo desbloquee**; la línea bajo el
  grupo dice hasta cuándo, y **Desbloquear** lo termina antes. Una llamada así se bloquea como las demás: no suena, y
  aparece en **Recientes**, en **Bloqueadas**. Erevos solo lee los grupos, y guarda el id del grupo y la hora, no su
  nombre. Mientras un grupo está bloqueado, la pantalla de **Teléfono** lo dice arriba, hasta cuándo, con
  **Desbloquear**.

**Por qué:** una llamada también se filtra con Erevos bloqueado, así que lo que se bloquea no puede estar sellado dentro
de un espacio; y guardado igual para todos los espacios, no muestra nada de ninguno.

- **La contraseña de Erevos:** la pantalla de **Teléfono**, con el teclado, las llamadas y los favoritos, está tras ella
  como el resto de Erevos. Solo la pantalla de llamada no lo está, salvo que dejes que el Teléfono se abra sin ella: en
  **Teléfono** → **Ajustes**, **Abrir el Teléfono sin la contraseña** (desactivado al principio, y solo visible mientras
  Erevos tiene contraseña). Con Erevos bloqueado, el icono del Teléfono, un enlace tel: y el aviso de una llamada
  perdida abren entonces el teclado, **Recientes** y **Favoritos**, que Android guarda para cualquier app de teléfono,
  solo con los nombres de los contactos del teléfono: nunca los guardados solo en Erevos ni los de chats ocultos, y sin
  ninguna SIM guardada para un número. Ahí puedes llamar, nada más: ni eliminar, ni bloquear, ni SMS, ni añadir a
  contactos. **Abrir Erevos** arriba muestra la pantalla de la contraseña, como el propio icono de Erevos después de que
  Erevos haya estado en segundo plano más de 30 segundos, salvo que una llamada hecha ahí lo sacara. **Volver a poner el
  Teléfono tras la contraseña** lo desactiva.
- **Si Erevos no se convierte en la app de teléfono:** como con los SMS, Android 15 y posteriores pueden impedirlo a una
  app instalada desde un navegador. En **Ajustes**, toca **Abrir aplicaciones predeterminadas** → **Aplicación de
  teléfono** → Erevos. Si Android dice que es un ajuste restringido, abre la **información de la aplicación de Erevos**,
  toca **⋮** arriba a la derecha → **Permitir ajustes restringidos**, y vuelve a elegir Erevos. **Permitir llamadas y
  contactos** aparece mientras Android todavía retiene las llamadas, el historial de llamadas o los contactos.
- **Después de reiniciar el teléfono:** hasta que desbloquees el teléfono por primera vez, responde la pantalla de
  llamada propia de Android.
- **Qué es una llamada telefónica:** una llamada telefónica normal, como con cualquier app de teléfono: la lleva la
  compañía telefónica, que puede escucharla. Las llamadas a tus contactos de Erevos desde un chat son otra cosa: cifradas
  de extremo a extremo, por internet.

## Contactos {#contacts}

En Android, **Contactos** en el menú muestra los contactos del teléfono: los que están en los contactos propios de
Android, que también usan tus otras apps, así que no hay nada que importar. Android pregunta una vez si Erevos puede
leerlos y cambiarlos (**Permitir contactos**). También se abren desde la persona de arriba de la pantalla de inicio, y
tienen un icono propio entre las apps del teléfono, **Contactos**, violeta con una persona sobre la marca de Erevos, que
los abre tras el bloqueo de Erevos: con contraseña, en cuanto la escribes.

- **Encontrar a alguien:** **Buscar contactos** busca en todos los campos: nombres, números (se escriban como se
  escriban, con o sin prefijo de país), emails, direcciones, la empresa, el cumpleaños y la nota. **Favoritos** muestra
  solo los contactos con estrella.
- **Un contacto:** toca uno para verlo entero. Toca un número para llamarlo, o **SMS** a su lado para escribirle en
  Erevos; toca un email o una dirección para abrirlo. **Añadir a favoritos** arriba le da una estrella, en los contactos
  de Android, para que la app de teléfono también lo liste entre los favoritos.
- **Contacto nuevo** y **Editar:** nombre y apellidos, empresa y cargo, tantos números, emails y direcciones como
  necesites, cada uno con su tipo (**Móvil**, **Casa**, **Trabajo**, **Otro**), un cumpleaños (día/mes/año, o
  día/mes) y una nota. Un contacto nuevo se guarda **Solo en este teléfono**, o en una cuenta con la que el teléfono
  sincroniza los contactos (Google), como elijas. Lo que Erevos no muestra de un contacto, como los datos propios de
  otra app, se queda como estaba.
- **Foto:** toca la imagen de arriba de un contacto para **Elegir una foto** de las fotos del teléfono, **Hacer foto**
  con la cámara, o **Quitar la foto**. La recortas en cuadrado, y Erevos la redibuja, para que no quede nada de lo que
  decía la foto aparte de su imagen (ni un lugar ni un teléfono). Se guarda con el contacto en los contactos de Android,
  donde el teléfono la muestra cuando llama.
- **Tono de llamada:** en un contacto, **Elegir tono de llamada** abre el selector propio de Android, con los sonidos
  del teléfono y los que añadiste; el teléfono suena con él cuando llama ese contacto. **Tono predeterminado** ahí
  devuelve el propio del teléfono.
- **Archivos .vcf:** **Importar de un archivo .vcf** en el menú de Contactos lee un archivo vCard que guardó otro
  teléfono u otra app (cualquiera de sus versiones, también la de los antiguos teléfonos griegos) y guarda los que aún
  no están en el teléfono, con sus fotos y grupos, solo en este teléfono o en una cuenta. **Guardar como archivo .vcf**
  ahí guarda los contactos que se muestran (todos, los favoritos, un grupo, o lo que encontró la búsqueda) como un
  archivo, en una carpeta que elijas; en un contacto, guarda ese. El archivo está fuera de Erevos y sin sellar:
  cualquiera que lo tenga puede leer los contactos.
- **Códigos QR:** **Código QR** en un contacto muestra su vCard como código QR, que la cámara de otro teléfono lee como
  un contacto que añadir: su nombre, números, emails, direcciones y nota, sin su foto (una nota larga o muchas
  direcciones se omiten para que quepa). Quien lo vea puede leerlo. **Leer el código QR de un contacto** en el menú lee
  uno de una foto que haces o eliges, aquí en el teléfono, y empieza un contacto nuevo con él, que solo se guarda cuando
  lo guardas. El código QR de Erevos de alguien empieza uno con su ID de Erevos.
- **Duplicados:** **Buscar duplicados** en el menú lista los contactos que parecen la misma persona guardada dos veces:
  el mismo nombre (sus palabras en cualquier orden), número o email. **Combinar** se queda con el más completo, con todos
  los números, emails y direcciones de los demás, sus notas, y su foto, tono, estrella y grupos cuando no los tiene, y
  elimina los demás; **Combinar todos** lo hace con cada conjunto. **No son iguales** oculta un conjunto hasta que
  vuelvas a abrir la lista.
- **Cumpleaños:** el chip **Cumpleaños** bajo la búsqueda lista los contactos con cumpleaños, el próximo primero, con
  cuántos días faltan y los años que cumplen. **Recordatorios de cumpleaños** en el menú (desactivado al principio) pone
  un aviso la mañana de cada uno, desde las 9:00, incluso con Erevos cerrado; en la pantalla de bloqueo solo dice que hay
  un cumpleaños. Son solo los cumpleaños de los contactos del teléfono, nunca los de contactos guardados solo en Erevos.
- **Contactos de la SIM** en el menú lee los contactos de las tarjetas SIM del teléfono y copia los que aún no están en
  el teléfono (todos elegidos al principio) a los contactos de Android, solo en este teléfono o en una cuenta. La SIM
  conserva los suyos.
- **Solo en Erevos:** en **Guardado en**, un contacto nuevo se puede guardar **Solo en Erevos** en su lugar: sellado en
  este espacio como sus chats, nunca en los contactos de Android, así que ninguna otra app ni cuenta lo ve, y las otras
  apps solo muestran su número; la pantalla de llamada de Erevos muestra su nombre mientras Erevos está desbloqueado.
  Tiene un candado en la lista, y el chip **Solo en Erevos** muestra solo esos. **Guardar solo en Erevos** en un
  contacto del teléfono lo traslada, con su foto y su estrella, y lo elimina de los contactos del teléfono; **Mover a
  los contactos del teléfono** lo vuelve a sacar. Su foto se sella con él. Los grupos, los tonos y los recordatorios de
  cumpleaños son de Android, así que no tiene ninguno. Una llamada o un SMS a él sigue yendo por el teléfono, y aparece
  en el registro de llamadas y en los SMS del teléfono como cualquier otro. Una copia de seguridad de Erevos contiene
  estos contactos, sellados.
- **En los chats ocultos:** **Contactos** arriba de los chats ocultos abiertos lista sus propios contactos, guardados
  solo ahí y sellados con ellos: no aparecen en ningún otro sitio, ni siquiera en los contactos del espacio, y la
  pantalla no muestra nada en cuanto se cierran los chats ocultos. Un contacto nuevo ahí siempre es uno de los suyos. Se
  le puede dar una foto, ya que los chats ocultos siguen abiertos mientras la eliges o la haces. Su menú solo tiene lo
  suyo: **Importar de un archivo .vcf** guarda los contactos de un archivo con ellos, sellados, nunca en los contactos
  del teléfono; **Guardar como archivo .vcf** guarda los que se muestran, o uno desde su ficha, en una carpeta que elijas
  (fuera de Erevos y sin cifrar); **Leer el código QR de un contacto** empieza uno de sus contactos. Un ID de Erevos
  escrito o leído ahí lo añade a los chats ocultos, nunca a los del espacio. Llamar a uno por la app de teléfono cierra
  los chats ocultos en cuanto Erevos está fuera más de 30 segundos, y aparece en su registro de llamadas.
- **ID de Erevos:** el ID de Erevos de un contacto es el enlace de contacto que muestra su Erevos, bajo **Copiar mi
  enlace de contacto** o como su código QR. En la ficha de un contacto, o en **ID de Erevos** al escribir uno, pégalo, o
  léelo con **Hacer foto del código QR** o **Elegir foto del código QR**: **Añadir a Erevos** (o **Guardar**) lo añade a
  tus chats de Erevos, que se abren con él, y vincula el contacto con él, y el chat toma el nombre del contacto si no
  tiene uno propio. Un contacto que es un contacto de Erevos muestra el principio de su clave como **ID de Erevos**.
- **Contactos de Erevos:** un contacto que es la misma persona que uno de los contactos de Erevos de tus chats aparece
  como una sola ficha con él: por un número vinculado a él en Erevos, por su ID de Erevos, o con **Elegir de mis chats
  de Erevos** en su ficha, un vínculo sellado en el espacio, nunca en los contactos de Android (**No es este contacto de
  Erevos** lo deshace). La ficha tiene entonces **Mensaje**, **Llamar** y **Vídeo**, cifrados de extremo a extremo por
  Erevos en lugar de por la compañía telefónica. Un contacto de los chats que no es ningún contacto tiene una ficha
  propia, con el escudo, donde **Añadir a contactos** crea uno y **Vincular a uno de mis contactos** lo vincula a uno
  que tienes, cuya ficha lo muestra entonces; el chip **Contactos de Erevos** los lista todos. Un contacto de Erevos sin
  nombre propio toma el nombre del contacto vinculado a él, al vincularse o al abrirse la ficha de ese contacto; un
  nombre que le diste en Erevos se queda, y uno que vaciaste vuelve del contacto entonces. En los chats ocultos, estos
  son los propios contactos de los chats ocultos, y su chat se abre ahí.
- **Historial:** la ficha de un contacto lista sus últimas llamadas en el registro de llamadas del teléfono, sus SMS y
  sus mensajes en Erevos, los más nuevos primero; toca uno para devolver la llamada, escribir un SMS o abrir el chat. Las
  llamadas aparecen en cuanto dejas que Erevos lea el registro de llamadas (**Mostrar llamadas**). Erevos solo las lee
  para mostrarlas, y no guarda ninguna copia.
- **Otras apps:** **Añadir a contactos** de otra app (un número en la app de teléfono, un email en el correo) puede
  abrirse en Erevos: un contacto nuevo con lo que dio esa app, o la lista para tocar el contacto al que añadirlo. Una app
  que muestra o cambia un contacto también puede abrirlo en Erevos, tras el bloqueo de Erevos. Android pregunta qué app
  usar; elige Erevos. Una app que te pide elegir un contacto, o un número, email o dirección, recibe solo el que tocas,
  de los contactos del teléfono: los guardados solo en Erevos nunca aparecen ahí.
- **Eliminar** quita el contacto del teléfono, de todas las cuentas en las que está guardado; uno guardado solo en
  Erevos, de Erevos.
- **Grupos:** **Grupos** en el menú de Contactos (los tres puntos) lista los grupos propios de Android, como Familia o
  Trabajo, con cuántos hay en cada uno, y crea otros nuevos. Abre uno para **Añadir contactos**, quita uno con **×**,
  **Cambiar nombre** o **Eliminar grupo** (sus contactos se quedan). En un contacto, **Elegir grupos** lo pone en
  grupos o lo saca. Los chips bajo la búsqueda muestran los contactos de un grupo. Un grupo se guarda en una cuenta,
  como sus contactos: un contacto solo se une a él si también está guardado en esa cuenta.

## Bloqueo con contraseña {#lock}

En **Ajustes** → **Privacidad y seguridad** → **Bloqueo y segunda contraseña**, **Bloquear al abrir Erevos** tiene dos
opciones: **Sin bloqueo** y **Contraseña**.

1. Toca **Contraseña**, escríbela dos veces (al menos 4 caracteres) y toca **Guardar**.
2. A partir de entonces Erevos la pide cada vez que se abre, y otra vez después de 30 segundos en segundo plano.
3. **Cambiar contraseña** la cambia, y **Bloquear ahora** bloquea Erevos al instante.

- **Bloqueado, sigue recibiendo:** cuando Erevos se bloquea, la pantalla de la contraseña se pone delante del espacio
  abierto, que sigue detrás: los mensajes y las llamadas siguen llegando, con sus avisos, y una llamada aparece sobre la
  pantalla de la contraseña. Sus pantallas se cierran, también los chats ocultos, y la pantalla de llamada ya no muestra
  los nombres de sus contactos. Su contraseña lo vuelve a abrir; la contraseña de otro espacio lo cierra antes, sin
  dejar nada de él en memoria.

- **Contraseñas incorrectas:** tras 5 intentos fallidos, cada intento más te hace esperar, 30 segundos al principio y el
  doble cada vez, hasta una hora. El contador sobrevive a un reinicio.
- **Lo que está sellado:** los contactos de cada espacio, las claves de sus conversaciones, sus mensajes, sus ajustes
  del relay y su aspecto se guardan en el teléfono sellados con una clave que solo abre su contraseña.
- **La lista al instante:** la pantalla de inicio guarda una copia sellada de sus primeras filas, así que la lista
  aparece en cuanto se abre el espacio y luego se actualiza. Siempre tiene el mismo tamaño, así que no le dice a nadie
  cuántos chats hay ni qué espacios se usan, y nunca contiene lo que decía un mensaje temporal.

**Por qué:** cada contraseña probada cuesta tiempo y mucha memoria a propósito (PBKDF2, luego Argon2id), para que quien
copie lo que guarda el teléfono no pueda probar contraseñas rápido; y alguien que tenga el teléfono espera más tras cada
intento fallido. El contador es uno para todo el teléfono, conservado entre reinicios, ya que la pantalla de la
contraseña va antes de que se abra ningún espacio.

> No hay forma de recuperar una contraseña olvidada: no se guarda nada que pudiera abrir los datos sin ella. Solo una
> huella o la cara, mientras esté activada, sigue abriendo el primer espacio (ver más abajo).

### Capturas de pantalla

Con el bloqueo con contraseña activado, Android deja Erevos fuera de las capturas de pantalla, las grabaciones de
pantalla y las apps recientes: ahí la última pantalla de Erevos aparece en blanco, así que quien tenga un momento el
teléfono desbloqueado no ve tus chats en ella. En **Ajustes** → **Privacidad y seguridad** → **Capturas de pantalla**,
**Desactivar** deja que las capturas vuelvan a funcionar (para enviar una, por ejemplo), y **Activar** lo restablece.
Los chats ocultos siempre se quedan fuera de ellas mientras están abiertos, sea cual sea el ajuste. El ajuste es del
teléfono, el mismo en todos los espacios. En un ordenador y en la app web no existe.

**Por qué:** sin esto, la última pantalla de Erevos se queda como imagen entre las apps recientes hasta que Erevos se
vuelve a abrir, así que los chats ocultos siempre se quedan fuera, para no aparecer nunca ahí sin su PIN. El ajuste es
el mismo en todos los espacios para que no diga nada de qué espacio se abrió.

### Huella o cara

En Android 11 y posteriores, con una huella o una cara configurada en los ajustes del teléfono, Erevos también puede
abrirse con ella. Está desactivado salvo que lo actives.

1. Con el bloqueo con contraseña activado, en **Huella o cara**, toca **Activar**.
2. Escribe la contraseña del espacio en el que estás, toca **Activar**, y toca el sensor (o mira al teléfono).
3. A partir de entonces la pantalla de la contraseña tiene un botón **Huella o cara**. La contraseña siempre funciona
   también, y **Desactivar** lo desactiva.

- **Solo el espacio de la primera contraseña:** una huella nunca abre el espacio de una segunda contraseña, ni los
  chats ocultos. Activada en el espacio que abre una segunda contraseña, no abre nada: la primera vez que se prueba se
  desactiva sola, y la contraseña abre Erevos. El ajuste se ve igual en todos los espacios.
- **Bajo presión:** alguien que te retenga puede apretar tu dedo contra el teléfono, o ponértelo delante de la cara. Si
  eso puede pasar, déjalo desactivado: así necesitan una contraseña, y puedes darles la segunda.
- **Cómo se guarda:** la clave del primer espacio está sellada por una clave del hardware seguro del teléfono (el
  Android Keystore) que solo funciona justo después de una comprobación fuerte de huella o cara, una vez por cada uso.
  Añadir o quitar una huella o una cara hace que Android descarte esa clave: entonces queda desactivado, y lo vuelves a
  activar. Nada sale del teléfono.
- **Qué cara:** una cara solo cuenta donde Android califica su desbloqueo facial como fuerte, como en el Pixel 8 y
  posteriores; en los demás, es la huella.
- **Las contraseñas incorrectas** se cuentan como antes: una huella no cambia el contador.
- **No en un ordenador ni en la web:** solo se ofrece en Android. Desactivar el bloqueo también lo desactiva.

**Por qué:** un dedo es más fácil de forzar que una contraseña, y cualquiera cuyo dedo o cara conozca el teléfono podría
usarlo, así que nunca abre el espacio de una segunda contraseña ni los chats ocultos. Activado en otro espacio, guarda
una clave que no abre nada, con la misma forma, así que lo que se guarda no muestra en qué espacio se activó.

## Segunda contraseña {#second}

Si alguien te obliga a abrir Erevos, escribe la segunda contraseña en lugar de la tuya. Abre un Erevos aparte y vacío,
con sus propios contactos, relay y aspecto. Tus chats reales siguen ocultos, y nada en la app muestra que existen.

1. Con el bloqueo con contraseña activado, toca **Poner segunda contraseña**.
2. Escríbela dos veces y toca **Guardar**. Debe ser distinta de tu propia contraseña.

- **El aspecto:** el segundo espacio empieza con el aspecto del espacio en el que se puso, para que no llame la
  atención.
- **Una cada vez:** poner otra vez una segunda contraseña sustituye a la anterior. **Quitar la segunda contraseña** la
  quita.
- **Discreción:** por privacidad, la app nunca muestra si hay una segunda contraseña puesta. En la app web con las
  notificaciones con la app cerrada activadas, el número en el icono de Erevos se queda mientras Erevos está cerrado:
  si no coincide con el espacio que abres, puede delatar otro (**Número en el icono** lo desactiva).

## Chats ocultos {#hidden}

Cada espacio tiene 4 lugares para chats ocultos, cada uno se abre solo con su propio PIN, y nunca aparecen entre tus
otros chats. No hay ningún botón para ellos en ningún sitio. Cada lugar puede contener un chat o varios, así que 2
espacios tienen 8 lugares.

**Por qué:** cada lugar ya tiene un PIN propio, así que un chat solo en un lugar tiene una clave propia, y un lugar
también puede contener varios chats bajo un mismo PIN. El número de lugares es fijo por dos razones:

- **Para que no se note nada.** Los 4 lugares existen desde el primer arranque, llenos de datos aleatorios mientras no
  se usan. Quien te obligue a abrir el teléfono, o copie lo que guarda, no puede saber si tienes chats ocultos, ni
  cuántos. Con una clave para cada chat, los archivos sellados crecerían con cada nuevo chat oculto, y delatarían
  cuántos hay.
- **Para que siga siendo rápido.** Un PIN escrito en la búsqueda se prueba en cada lugar, y cada intento es lento a
  propósito (Argon2id, que requiere mucha memoria y tiempo, para que los PIN no se puedan adivinar rápido). Con 4
  lugares, abrirlos sigue siendo breve y siempre tarda lo mismo, así que el tiempo tampoco dice cuántos se usan.

El número se puede aumentar más adelante sin perder nada, a cambio de abrir un poco más despacio; reducirlo eliminaría
lo que contienen los lugares que se quitaran.

1. Empieza un lugar de una de estas dos formas: en **Ajustes** → **Privacidad y seguridad** → **Chats ocultos**, elige
   de **Posición 1** a **Posición 4**, toca **Poner PIN de chats ocultos**, escríbelo dos veces y toca **Guardar**; o
   abre los **Detalles** de un chat, toca **Mover a chats ocultos**, escribe un PIN de 4 caracteres o más, toca **Chats
   ocultos nuevos**, elige un lugar, y luego **Crear y mover**. Recuerda qué lugares usas: por privacidad, Erevos no
   puede decir cuáles están libres.
2. Para abrirlos, escribe el PIN en **Buscar chats** en la pantalla de inicio y pulsa Intro (la tecla de búsqueda del
   teclado). O mantén pulsado **Chat nuevo** un segundo: se abre un campo para el PIN, igual en todos los espacios;
   escríbelo y toca **Abrir**. Solo abre el lugar con ese PIN. Un PIN incorrecto es solo una búsqueda, o solo cierra el
   campo: no pasa nada.
3. Se abren con el título **Chats ocultos**, con **Contactos** y **Cambiar PIN** arriba, y listan sus chats y grupos
   como la pantalla de inicio lista los tuyos: los más nuevos primero, cada uno con lo último que se dijo, cuándo, y
   cuántos no se han leído. Toca uno para abrirlo. La flecha de volver los cierra.
4. Para mover otro chat a un lugar, abre sus **Detalles**, toca **Mover a chats ocultos**, escribe el PIN de ese lugar y
   toca **Mover**. El chat sale de tu lista con sus mensajes, nombre, imagen y aspecto, y los chats importados en él, y
   su número de seguridad sigue igual. A su teléfono se le dice al instante que a partir de ahora escriba a los chats
   ocultos; un mensaje que envíe justo en ese momento puede no llegar.
5. Para devolver un chat a los chats del espacio, ábrelo en los chats ocultos, luego sus **Detalles**, toca **Volver a
   mis chats** y **Mover**. Va con sus mensajes, nombre, imagen, aspecto y chats importados, y a su teléfono se le dice
   dónde escribir.

- **Solo relay o Nostr:** los chats ocultos tienen su propia cola en el relay y sus propias claves, y nunca usan el
  enlace de cerca. Sin relay, su enlace de contacto dice dónde leen en Nostr, con una clave solo de ese lugar, y los
  textos van ahí, como desde un teléfono sin relay; las fotos, los mensajes de voz, las llamadas y los grupos necesitan
  un relay. Mientras están cerrados, sus mensajes esperan en el relay, o en Nostr dos días, salvo que **Recibir estando
  cerrados** esté activado.
- **Recibir estando cerrados:** un interruptor arriba de cada lugar. Activado, sus chats ocultos reciben como tus otros
  chats mientras el espacio está abierto, sea cual sea la pantalla que se vea y con Erevos en segundo plano: sus
  contactos ven al instante que llegó un mensaje, un aviso solo dice «New message», en Android una llamada suena con
  «Incoming call» y sin nombre (en la pantalla de llamada entrante, toca el pequeño símbolo, escribe el PIN y toca
  **Conectar** para responder), y un recordatorio de su Chat conmigo muestra un aviso que solo dice **Reminder**. Lo que
  les llega por Nostr también se lee entonces. Una llamada que terminó antes de que los abrieras, o que sonó demasiado,
  aparece como perdida. Nada de ellos aparece en ningún sitio hasta que el PIN los abre. Un lugar nuevo empieza con
  esto activado; los lugares configurados antes se quedan como estaban hasta que lo actives. Para ello, la clave del
  lugar se guarda cifrada con el espacio, entre una clave aleatoria para cada uno de los otros lugares, así que abrir el
  espacio no muestra qué lugares reciben, ni cuáles están configurados. Pero quien abra el espacio y copie lo que guarda
  el teléfono también podría abrir ese lugar, sin PIN: el PIN los mantiene entonces fuera de la vista de quien tenga el
  teléfono, no de una herramienta forense. Desactivado, su clave solo está tras el PIN, y sus mensajes esperan en el
  relay hasta que los abras. Las copias de seguridad conservan el interruptor.
- **Se cierran solos** en cuanto Erevos ha estado en segundo plano más de 30 segundos, como se vuelve a bloquear el PIN
  propio de un chat, pero no durante una llamada, ni mientras eliges una foto o un archivo para ellos o haces una foto.
- **Mientras están abiertos,** un mensaje que llega reproduce el sonido de mensajes nuevos, como en tus otros chats.
  Con Erevos en segundo plano antes de que se cierren, un aviso dice «New message» solo si **Recibir estando cerrados**
  o **Avisar cuando llega un mensaje** está activado para ese lugar.
- **Como tus otros chats:** lo que no puede salir ahora espera, marcado como **En espera**, solo por su relay, o por
  Nostr sin relay (ver **En espera** en [Chatear a través de un relay](#relay)), **Enviar más tarde** funciona como
  ahí, y un chat exportado de otra app se puede importar en los detalles de un chat oculto (ver
  [Chats importados](#import)). Ahí también se puede añadir un contacto a partir de una foto de su código QR, hecha o
  elegida mientras siguen abiertos. Cada lugar tiene su propio **Chat conmigo**, el primero de su lista (ver **Chat
  conmigo y recordatorios** en [Primeros pasos](#start)).
- **Grupos:** **Grupo nuevo**, bajo su lista, crea un grupo con sus contactos, como en la pantalla de inicio (ver
  [Chats de grupo](#groups)), y aparece en su lista entre sus chats. Sus miembros son solo contactos de ese lugar, y uno
  que añadas como contacto desde él pasa a ser un contacto de ese lugar. Lo que se escribe en él va solo por el relay
  del lugar, a una cola propia ahí, nunca a un teléfono cercano; mientras el lugar está cerrado solo se lee con
  **Recibir estando cerrados** activado, y **Avisar cuando llega un mensaje** no lo cuenta. Sus llamadas solo suenan
  mientras los chats ocultos están abiertos: una iniciada mientras están cerrados aparece como perdida. Un grupo ahí no
  tiene PIN propio, y ninguno es público.
- **Las vistas previas de enlaces** tienen un interruptor propio en los detalles de un chat oculto, para todos los chats
  de ese lugar, desactivado salvo que lo actives (ver **Vistas previas de enlaces** en
  [Chatear a través de un relay](#relay)).
- **Avisar cuando llega un mensaje** (Android): arriba de un lugar mientras **Recibir estando cerrados** está
  desactivado. Activado, mientras el lugar está cerrado un aviso solo dice «New message», o cuántos llegaron, como para
  los otros chats, con Erevos en segundo plano o a la vista, cada mensaje una vez, también cuando Erevos estaba cerrado
  y se volvió a iniciar; lo que llegó mientras el lugar estaba abierto no hace ninguno una vez que se cierra. Que un
  mensaje tuyo les llegó o se leyó, escribiendo y las claves nuevas no hacen ninguno, ni una llamada que sonó (ver
  **Sonar las llamadas cuando están cerrados**); una que no sonó cuenta como mensaje. Un mensaje o una eliminación que
  otros teléfonos con Erevos llevaron al relay (ver **Llevados por otros teléfonos** en
  [Chatear con un teléfono cercano](#nearby)) no puede decir lo que lleva, ya que los teléfonos que lo llevan no deben
  saberlo: cuenta como mensaje, así que una eliminación también muestra «New message», y el primer mensaje de un chat
  puede contar como dos; y uno enviado sin sonido suena como siempre (ver **Enviar sin sonido**). Necesita **Recibir y
  sonar** y **Avisar de mensajes nuevos** en **En segundo plano**, cosa que el interruptor dice cuando no están
  activados, y un relay que espere (del 18 de octubre de 2026 en adelante); uno anterior al 23 de octubre de 2026 solo
  puede decir que algo espera, así que entonces también aparece «New message» por eso, una vez hasta que abras ese
  lugar. Para ello, el espacio guarda una cola en el relay para cada uno de sus 4 lugares, las que no están en uso
  creadas para nada en el mismo relay, así que abrir el espacio no muestra ni si hay chats ocultos configurados ni
  cuáles, siempre que usen el relay del espacio; al relay solo se le pregunta cuántos mensajes llegaron, ya que los
  cuenta por el byte que lleva cada uno (ver lo que ve el relay, más arriba), nunca se le piden. Quien vea el aviso y no
  encuentre nada nuevo en tus chats puede suponer que hay más. Después de borrar o bloquear a alguien en el lugar, el
  primer mensaje de alguien nuevo, por el enlace de contacto o el código QR del lugar, no hace ninguno: se ve al abrir
  el lugar. Las copias de seguridad no lo conservan: vuelve a activarlo tras restaurar.
- **Sonar las llamadas cuando están cerrados** (Android): debajo de **Avisar cuando llega un mensaje**, mientras
  **Recibir estando cerrados** está desactivado. Activado, mientras el lugar está cerrado, con Erevos en segundo plano o
  en cualquier pantalla, una llamada de uno de sus contactos hace sonar el teléfono y mostrar «Incoming call» sin
  nombre, como una llamada de tus otros chats. En la pantalla de llamada entrante, toca el pequeño símbolo, escribe el
  PIN y toca **Conectar** para responder; un simple **Responder** no puede conectarla, y **Rechazar** detiene el
  timbre. El timbre dura unos 45 segundos. Necesita **Recibir y sonar** en **En segundo plano**, cosa que el
  interruptor dice cuando no está activado, y un relay que espere, y usa una cola en el relay propia para cada uno de
  los 4 lugares, las que no suenan creadas para nada en el mismo relay, igual que el
  aviso de mensajes de arriba, así que abrir el espacio no delata nada. Quien llama solo hace sonar una cola ahí; la
  llamada en sí espera en la cola propia del chat hasta que el PIN la abre. Un contacto que has eliminado todavía puede
  hacerlo sonar, pero la llamada nunca puede conectarse. Una llamada hecha desde un ordenador vinculado solo suena
  mientras los chats ocultos están abiertos. Las copias de seguridad no lo conservan: vuelve a activarlo tras restaurar.
- **Un PIN nuevo para un lugar** (desde **Chats ocultos** en **Ajustes**, o **Chats ocultos nuevos**) lo empieza vacío
  y sustituye lo que había en él. Para conservarlos y cambiar solo el PIN, ábrelos y usa **Cambiar PIN** ahí. Cada PIN
  debe ser distinto de los demás y de la contraseña que abre Erevos.
- **Los PIN incorrectos en la búsqueda** se cuentan aparte de los de la pantalla de bloqueo: tras cinco, las búsquedas
  dejan de probar durante un rato, en silencio, y la pantalla de bloqueo nunca espera por ellos.
- **Un PIN deja fuera a quien coge el teléfono,** no a quien copia lo que guarda: con una herramienta forense en un
  teléfono desbloqueado o rooteado, los PIN se pueden probar sin espera. Cada intento cuesta un Argon2id (mucha memoria
  y tiempo), pero un PIN de 4 dígitos son solo 10.000 intentos. Si eso es lo que temes, usa un PIN más largo, o unas
  cuantas palabras.
- **Discreción:** cada espacio tiene los 4 lugares desde el principio, los no usados llenos de datos aleatorios que
  parecen usados, y la búsqueda prueba cada lugar cada vez. Así que nada muestra si hay chats ocultos configurados, ni
  cuántos.

### Un chat bloqueado con un PIN {#chat-pin}

Un chat o un grupo puede tener un PIN propio, aparte de los chats ocultos: se queda entre tus chats, pero solo se abre
con su PIN.

1. Abre el chat, toca **⋮** arriba para sus **Detalles**, y luego **Bloquear con un PIN** (en un grupo: el nombre del
   grupo arriba, y luego **Bloquear con un PIN**).
2. Escribe dos veces un PIN de al menos 4 caracteres, y luego **Bloqueo**.

- **Abrirlo:** pide el PIN. Se vuelve a bloquear en cuanto sales de él, abres otro chat, o Erevos está fuera más de
  medio minuto (como el bloqueo con contraseña).
- **Tras el PIN** no se ve nada del chat: no se dibuja ninguno de sus mensajes hasta que se escribe el PIN, y con
  cristal, un fondo de pantalla o la escena propia de un estilo, la pantalla del PIN está sobre una escarcha densa que
  no deja pasar nada.
- **En la lista** muestra su nombre con un candado y **Bloqueado con un PIN**, nada de sus mensajes, ni en la búsqueda,
  en **Mensajes destacados** o en **Chats importados**. El aviso solo dice **New message**, como para cualquier chat.
- **Los PIN incorrectos** se cuentan en el teléfono, para todos los chats a la vez y aparte de los de la pantalla de
  bloqueo: tras cinco, el siguiente intento espera, más cada vez.
- **¿Olvidaste el PIN?** Bajo el PIN, donde el espacio tiene contraseña, **¿Olvidaste el PIN?** lo quita con la
  contraseña que abre el espacio. Sin contraseña, nada puede volver a abrirlo: eliminar el contacto es entonces la
  única forma.
- **A los chats ocultos:** un chat que mueves a los chats ocultos se lleva su PIN, que ahí no pide nada, ya que el PIN
  propio de los chats ocultos los protege. Devuelto a los chats, el mismo PIN vuelve a pedirse.
- **Para quitarlo:** **Detalles** → **Bloquear con un PIN** otra vez, y escribe su PIN.
- **Solo este teléfono lo conoce,** y cada dispositivo vinculado tiene el suyo. Las copias de seguridad lo conservan.

**Por qué:** algunos chats deben quedarse donde están, pero sin abrirse para quien tenga el teléfono un momento. El PIN
solo se guarda como su Argon2id, así que no se puede leer del teléfono, y los intentos de adivinarlo son lentos. Es un
bloqueo en la pantalla, no una clave propia: los mensajes del chat siguen cifrados con el resto del espacio, y quien
copie lo que guarda el teléfono mientras el espacio está abierto todavía podría leerlos. Para un chat que ni siquiera
debe verse, usa los chats ocultos.

## Copias de seguridad {#backup}

Una copia de seguridad es un archivo que contiene todo lo que Erevos guarda en este teléfono: cada espacio, con sus
contactos, las claves de sus conversaciones, sus mensajes, mensajes de voz, chats importados y chats ocultos, su Chat
conmigo, y el bloqueo. Dentro de ella cada espacio sigue sellado con su propia contraseña, y el archivo se vuelve a
sellar con una contraseña propia. Está en **Ajustes** → **Datos y dispositivos** → **Copias de seguridad**.

1. **Hacer una copia de seguridad:** toca **Hacer una copia de seguridad**, elige una carpeta (en el teléfono, una
   tarjeta de memoria, o una app en la nube que muestre ahí sus carpetas; en un ordenador, cualquier carpeta), escribe
   dos veces una contraseña para la copia (al menos 12 caracteres, o cuatro palabras) y toca **Guardar**.
2. **Copias automáticas:** elige **Cada día** o **Cada semana**, y luego una carpeta y una contraseña. Erevos hace una
   cuando se abre y la última es más antigua que eso, y la carpeta conserva las 3 más nuevas. Debajo están **Hacer
   copia ahora**, **Cambiar carpeta** y **Cambiar contraseña**; **Desactivado** las detiene, y las ya hechas se quedan
   en la carpeta.
3. **Restaurar:** toca **Restaurar una copia de seguridad**, elige el archivo y escribe su contraseña. Erevos pregunta
   una vez más, y luego pone la copia en lugar de todo lo que hay en el teléfono, y se abre como estaba cuando se hizo
   la copia, con las contraseñas de entonces.

- **Guarda la contraseña de la copia:** nada abre una copia sin ella, y nadie puede recuperarla. Sin bloqueo con
  contraseña, la contraseña de la copia es lo único que la protege. Quien tenga el archivo puede probar contraseñas en
  él tan rápido como dé su ordenador, sin ningún teléfono que lo frene, así que una corta no aguanta: Erevos no acepta
  ninguna de menos de 12 caracteres.
- **Las copias automáticas guardan su contraseña en el teléfono,** así que no necesitan contraseña cada vez. Quien abra
  su carpeta sigue necesitando las contraseñas de los espacios para leer los chats.
- **Chats que siguieron después de la copia:** restaurar devuelve las claves de cada conversación como estaban
  entonces. Los mensajes que llegaron después de la copia y ya se leyeron no están en ella, y un chat que siguió puede
  dejar de abrir mensajes nuevos. Entonces pide al contacto su enlace de contacto otra vez. Antes de que un chat
  restaurado vuelva a escribir, sus conversaciones saltan por delante de las claves que puedan haber usado desde la
  copia, para que ninguna clave selle nunca dos mensajes: uno sellado dos veces dejaría a quien guardara los dos
  paquetes leerlos juntos.
- **Un teléfono a la vez:** una copia restaurada en un segundo teléfono lee las mismas colas del relay que el primero,
  y cada uno recoge mensajes que entonces el otro nunca recibe. Úsala para pasar a un teléfono nuevo, no para tener dos.
- **Discreción:** todos los espacios muestran la misma pantalla de Copias de seguridad, y una copia contiene todos los
  espacios, así que ninguna de las dos dice cuántos espacios hay ni si hay chats ocultos configurados. El nombre del
  archivo dice que es una copia de seguridad de Erevos, y su tamaño muestra más o menos cuánto se guarda.
- **Los SMS del teléfono:** en Android, **Incluir los SMS en las copias** añade los SMS y MMS del teléfono a cada copia
  a partir de entonces, con hasta 32 MB de sus imágenes, mientras Erevos es la app de SMS. Se sellan con la contraseña
  de la copia como el resto. Restaurar la copia devuelve a los SMS del teléfono cada mensaje que aún no tiene, y no
  elimina ninguno; Erevos también tiene que ser la app de SMS entonces, o el resto se restaura sin ellos. Los SMS son
  del teléfono, los mismos en todos los espacios. Un Erevos más antiguo no abre una copia que contenga SMS.
- **Los SMS en orden:** las conversaciones fijadas, las archivadas, la Papelera, los borradores, el filtro y las marcas
  de spam de cada espacio, y cuánto espera un SMS para poder deshacer su envío, están en todas las copias, sellados con
  la contraseña del espacio como el resto. Los SMS enviados más tarde (**SMS más tarde**) no, para que una copia
  restaurada en otro teléfono nunca vuelva a enviar uno; ni tampoco las invitaciones, los nombres de tus contactos y la
  SIM elegida para cada número. Un Erevos más antiguo no abre una copia que los contenga; una hecha por un Erevos más
  antiguo se restaura como siempre, sin ellos.
- **No está en una copia:** las fotos y los archivos, todavía no: una copia se hace en la memoria del teléfono, y no
  cabrían. Una copia restaurada en el mismo teléfono los vuelve a mostrar; en otro teléfono aparecen como que no están
  en él. También se omiten: el contador de contraseñas incorrectas, y cómo están configuradas las copias automáticas.
- **Los dispositivos vinculados** no están en una copia: un vínculo se queda con el teléfono y el ordenador en los que
  se hizo. Después de restaurar una copia en otro teléfono, vuelve a vincular el ordenador: en el ordenador, toca
  **Desvincular este dispositivo**, y luego vincúlalo como la primera vez, ver [Dispositivos vinculados](#devices). Los
  contactos con esta versión dejan entonces de escribir a tus ordenadores hasta que lo hagas: el teléfono les da una
  nueva lista de sus dispositivos que no nombra ninguno. Si el reloj de este teléfono va por detrás del del teléfono
  perdido, esa lista desaparece en cuanto le escriben, y los detalles de su chat pueden decir que cambió el día después
  de que restauraras. La propia copia de un ordenador vinculado contiene los chats del teléfono como estaban, pero
  no el vínculo para escribir en ellos: restaurados, se pueden leer ahí pero no escribir, y Erevos lo dice una vez.
  Para escribir en ellos, vuelve a vincular ese ordenador al teléfono: los chats que el teléfono todavía tiene se
  quedan, con lo que llegó desde entonces, y los demás desaparecen. En el teléfono, desvincula el dispositivo que era
  antes. Haz las copias en el teléfono.
- **Una copia de un Erevos más nuevo:** Erevos 0.1.8 y posteriores también la abren, y restauran todo lo que conocen de
  ella; antes de eso, dicen que una parte se queda fuera. Actualiza Erevos primero para restaurarla entera.

## Chats importados {#import}

Tus chats antiguos de Telegram y WhatsApp pueden entrar en Erevos, para leerlos, con sus fotos, vídeos, mensajes de voz
y archivos, y los de Viber con sus palabras. Se quedan en este teléfono, sellados en el espacio al que los traes, y
nunca se envían a ninguna parte.

Primero exporta el chat desde la otra app:

- **WhatsApp:** abre el chat, luego **Más**, **Exportar chat**, **Incluir archivos**, y guarda el .zip en el teléfono.
  **Sin archivos** trae solo las palabras.
- **Telegram Desktop:** **Exportar historial del chat**, formato **JSON**, con las fotos, vídeos, mensajes de voz y
  archivos que quieras. Luego haz un .zip de la carpeta que creó (en Windows: clic derecho sobre ella, **Enviar a**,
  **Carpeta comprimida (en zip)**) y copia el .zip al teléfono. **result.json** por sí solo trae únicamente las palabras.
- **Viber:** Viber en sí no exporta chats. En Android, la app **Backup Text for Viber** guarda uno como archivo .html:
  cópialo al teléfono. Solo entran las palabras, con los emoticonos de Viber como emoji. Tus propios mensajes ahí no
  llevan nombre, así que entran como **Yo**, ya elegido como tú. Los mensajes de un día anterior a que existiera Viber,
  como 1970, son de un teléfono cuyo reloj estaba mal: entran sin hora.

Luego:

1. En Erevos, abre **Ajustes** → **Datos y dispositivos** → **Chats importados** y toca **Importar un archivo**, y luego
   elige el archivo.
2. Erevos dice lo que encontró, con cuántas fotos y archivos y lo que ocupan en total. Toca tu propio nombre, para que
   tus mensajes aparezcan a la derecha, y toca **Guardar**. Los archivos entran uno tras otro, y dice cuántos y qué
   parte de ellos han entrado. **Cancelar** lo detiene entonces, y no se queda con ninguno.
3. Elimina tú mismo el archivo exportado del teléfono: Erevos guarda su propia copia sellada, pero el archivo que
   guardaste no está sellado.

Para seguir la conversación en Erevos, la otra persona también necesita Erevos:

1. Con **Chat nuevo**, añádela como contacto a través del relay, como en [Chatear a través de un relay](#relay).
2. Abre el chat importado, toca **Continuar en Erevos** y elígela.
3. Su chat muestra ahora los mensajes antiguos antes de los nuevos, como si siempre hubieran estado en Erevos: en
   burbujas, por día, con sus horas, y **Continúa en Erevos** entre ellos y los nuevos. **Abrir el chat** te lleva ahí,
   y un contacto al que no has puesto nombre toma el nombre del chat importado.

**Desde dentro del chat:** el chat de un contacto tiene **Chats importados** en sus **Detalles**, encima de
**Privacidad**. **Importar un chat aquí** trae un archivo directamente a ese chat, sin pasar por **Ajustes**: cuando el
archivo contiene varios chats, como una exportación de Telegram de todos ellos, pregunta cuál sigue aquí, y propone el
más largo. Cada chat importado que sigue ahí aparece con tres botones:

- **Solo en el chat** lo quita de **Ajustes** → **Datos y dispositivos** → **Chats importados**: solo aparece en ese
  chat, como si siempre hubiera estado ahí. Un chat traído desde los detalles del chat se guarda así desde el principio.
  **Mostrar también en Chats importados** lo devuelve a la lista, y lo mismo hace la propia lista, cuando ese contacto
  ya no está.
- **Desvincular** hace que deje de aparecer en el chat; se queda en **Chats importados**, para leerlo o para seguirlo
  con otra persona.
- **Eliminar** lo elimina del teléfono, con sus fotos y archivos, después de preguntar.

**Por qué:** un chat antiguo pertenece a la persona con la que fue, así que se trae, se guarda y se elimina donde hablas
con ella, y la lista de **Ajustes** solo guarda lo que no tiene otro sitio. Nada de él sale del teléfono en ningún
caso.

- **Las fotos, los vídeos, los mensajes de voz y los archivos** entran desde un .zip, cada uno sellado en este espacio
  como lo está un archivo en un chat. Las fotos aparecen en el chat al desplazarte hasta ellas, y los stickers como
  stickers; toca una foto o un archivo para verlo por separado y guardarlo (**Guardar**). Los mensajes de voz y las
  canciones se reproducen en el propio chat con un toque; un vídeo se reproduce en la app propia del teléfono una vez
  guardado. Mantén pulsado un mensaje importado para copiarlo (**Copiar**) o abrir su archivo (**Abrir**). **Buscar en
  este chat** también encuentra los mensajes importados. Los archivos de más de 1 GB, y los que la exportación no
  contiene, se quedan fuera, y el chat dice dónde había uno.
- **Espacio en el teléfono:** mientras entra un .zip, el teléfono necesita libre más o menos el doble de su tamaño, ya
  que Erevos lee una copia y guarda los archivos sellados. Los archivos importados aún no están en las copias de
  seguridad, como tampoco lo están los demás archivos.
- **Solo en este teléfono, solo para leer:** los mensajes importados nunca se envían, así que el otro teléfono no los
  recibe. Erevos no puede mostrar quién los escribió realmente.
- **Los avisos y las llamadas** de la otra app se omiten, y el chat dice cuántos.
- **En los chats ocultos** también: en los **Detalles** de un chat oculto, **Importar un chat aquí** guarda el chat con
  ese lugar, cifrado con su clave, y solo lo muestra en ese chat, nunca en **Ajustes** → **Datos y dispositivos** →
  **Chats importados**; ahí solo se puede eliminar. Un chat movido a los chats ocultos se lleva los chats importados en
  él, guardados solo en él ahí, y los devuelve si vuelve.
- **Eliminar mensajes** en un chat deja los importados: elimínalos en los **Detalles** del chat, en **Chats
  importados**, o en **Ajustes** → **Datos y dispositivos** → **Chats importados**.

> El archivo de chats importados crece con lo que traes, así que su tamaño dice más o menos cuánto se importó, pero no a
> qué espacio.

## Apariencia {#appearance}

**Apariencia** sigue a LPHL FASOULI y al sitio de LPHL. Está en **Ajustes** → **Apariencia**, en partes que se abren
cada una por separado: **Estilo y colores** (el acabado, el cristal, el estilo, el tema, los colores y el texto sobre
zonas de color de abajo, con la **Vista previa**), **Fondo de pantalla**, **Mensajes**, y en Android **Iconos del
lanzador** y **Widget**.

| Ajuste | Opciones |
| --- | --- |
| **Acabado** | **Plano**, o **Glass** como en lphl.nekten.eu. Glass viene en dos tipos: **Paneles** (cada tarjeta, un panel de cristal sobre el fondo de pantalla) y **Un panel** (cada pantalla sobre un solo panel esmerilado). |
| **Estilo** | **Classic** (el oscuro y dorado de Erevos), **Modernist** (Inter Tight), **Nocturne** (siempre oscuro, con sus propios colores), **Neon** (LED cian y magenta que brillan, sobre una cuadrícula que corre hacia un sol poniente), **Matrix** (verde sobre negro en monoespaciada, con código que llueve detrás), **Paper** (azul de pluma estilográfica sobre crema, en una serif, sobre líneas pautadas con un margen rojo), **Aurora** (violeta sobre casi blanco, suave y redondeado, sobre charcos de luz menta, lila y melocotón), **Material You** (los colores del propio teléfono, en Android 12 y posteriores) y **Personalizado** (tu propio fondo y acento). |
| **Tema** | **Sistema**, **Claro** u **Oscuro**. Nocturne, Neon y Matrix son siempre oscuros, Paper y Aurora siempre claros, y Personalizado es claro u oscuro según su fondo. Material You lo sigue. |
| **Colores** | Los propios del estilo, una de las doce paletas de LPHL, o **Mi color**. Elegir una paleta con un estilo que tiene colores propios vuelve al estilo elegido antes. |
| **Personalizado** | Con **Personalizado** elegido: su **fondo** (ocho claros, ocho oscuros) y su **acento**. El texto y las superficies se crean a partir del fondo, y se comprueba que cada color se lea bien sobre él. |
| **Texto sobre zonas de color** | **Blanco**, **Como la paleta**, o **Mi color**. |
| **Fondo de pantalla** | Lo que hay detrás de cada pantalla: **Según el estilo** (la escena o el brillo propios del estilo), **Liso**, o un motivo dibujado suavemente en el color de acento: **Puntos**, **Cuadrícula**, **Rayas**, **Estrellas**, **Luces** (círculos suaves de luz) o **Degradado**; o **Foto**, una foto tuya, reducida, redibujada y sellada, bajo un velo para que el texto se lea (**Cambiar foto** elige otra). La pantalla de la contraseña muestra en su lugar el del estilo. |
| **Mensajes** | Cómo dibuja un chat los mensajes: burbujas de tipo **Redondeado**, de tipo **Cuadrado**, o **Línea**, sin burbuja sino una línea junto al texto, como un registro. |

Neon, Matrix, Paper y Aurora dibujan su propia escena detrás de cada pantalla, Personalizado mantiene el fondo que
elegiste y Material You los colores del teléfono, así que **Glass** espera mientras están elegidos. La lluvia se queda
quieta cuando el teléfono está configurado para reducir el movimiento.

La **Vista previa** muestra unos cuantos mensajes y botones con el aspecto que elegiste. Cada combinación se comprueba
para que el texto siempre se lea bien, también sobre cristal.

- **Cada espacio guarda su propio aspecto.**
- **La pantalla de la contraseña** muestra el último aspecto usado. Para ello se guarda fuera de los datos sellados: no
  dice nada de tus chats, pero quien abra el teléfono ve qué aspecto usas.
- **Material You** toma los colores que Android crea a partir de tu fondo de pantalla (Android 12 y posteriores), claros
  u oscuros según diga **Tema**, con botones redondos y tarjetas suavemente redondeadas, en la fuente propia del
  teléfono. Un fondo de pantalla nuevo también los cambia en Erevos, en cuanto se vuelve a ver. Se leen en el teléfono y
  no van a ninguna parte. En Android más antiguos y en un ordenador no se ofrece.
- **Iconos del lanzador** (Android): el color de cada uno de los iconos de Erevos entre las apps del teléfono,
  **Erevos** (rojo, abre los chats de Erevos, o el chat que dejaste abierto), **Teléfono** (verde, abre el teclado),
  **SMS** (azul, abre la lista de SMS) y **Contactos** (violeta): rojo, naranja, verde, azul, violeta u oscuro. Cada toque
  abre lo que nombra su icono, también cuando Erevos mostraba otro de ellos. El color es del teléfono, no de cada
  espacio, ya que los iconos se ven antes de desbloquear Erevos. Después de un cambio, algunos lanzadores quitan el icono
  de la pantalla de inicio: vuelve a añadirlo desde la lista de apps.
- **Widget** (Android): el orden de los cuatro botones del widget, de izquierda a derecha, con el widget dibujado como
  se verá. Toca ↑ o ↓ para mover un botón; **Orden inicial** los devuelve a su sitio.

## En un ordenador {#desktop}

Erevos también funciona en un ordenador, Linux, macOS o Windows, como app propia. Chatea a través de un relay, cifrado
de extremo a extremo como en el teléfono, y guarda sus contactos, mensajes y ajustes sellados de la misma manera.

1. Instálalo. En Linux: el paquete para sistemas basados en Arch (\`erevos-linux-x86_64.pacman\`, con
   \`sudo pacman -U\`) o la AppImage. En un Mac: abre la imagen de disco y arrastra Erevos a Aplicaciones. No tiene firma
   de pago de Apple, así que la primera vez permítelo en **Ajustes del Sistema → Privacidad y seguridad → Abrir
   igualmente**. En Windows 10 u 11: ejecuta \`erevos-windows-x64-setup.exe\`, que instala Erevos solo para ti, sin
   administrador, y lo pone en el menú Inicio; o deja \`erevos-windows-x64-portable.exe\` donde quieras y ejecútalo, sin
   instalar nada. Ninguno de los dos tiene firma de pago, así que la primera vez Windows dice que protegió tu PC: toca
   **Más información**, y luego **Ejecutar de todas formas**.
2. Configura el relay y añade contactos como en el teléfono, ver [Chatear a través de un relay](#relay). **Copiar mi
   enlace de contacto** copia tu enlace, para pegarlo donde deba ir.

- **Lo que solo hace el teléfono:** Bluetooth, Wi-Fi Aware y LoRa, y sus pruebas. A los contactos en la misma Wi-Fi
  llega como lo hace un teléfono, ver [Chatear con un teléfono cercano](#nearby). El resto es igual: espacios y la
  segunda contraseña, chats ocultos, mensajes de voz, chats importados y copias de seguridad.
- **Dónde guarda las cosas:** en su propia carpeta (en Linux \`~/.config/Erevos\`, en un Mac \`~/Library/Application
  Support/Erevos\`, en Windows \`%APPDATA%\\Erevos\`), sellado como en el teléfono. Su almacén de claves está sellado
  con el llavero del sistema (en un Mac, el Llavero; en Windows, la clave de tu cuenta de Windows). En un sistema Linux
  sin llavero (KWallet o GNOME Keyring), o con uno que Erevos no encuentra, Erevos se abre con una nota y no guarda
  nada: inicia el llavero, o pásale a Erevos \`--password-store=gnome-libsecret\`. Iniciado con \`--plain-secrets\`,
  guarda ahí su almacén de claves tal cual, legible por tu usuario: en ese caso pon un bloqueo con contraseña. La app
  portátil de Windows guarda sus cosas en la misma carpeta que la instalada, y desinstalarla las deja ahí.

**Por qué:** sin llavero, el almacén de claves quedaría en el disco tal cual, legible por tu usuario, así que Erevos no
guarda nada ahí salvo que lo elijas con \`--plain-secrets\`: ninguna ranura de contraseña queda ahí sin sellar por
sorpresa.

- **El cortafuegos de Windows** pregunta, la primera vez que se abre Erevos, si puede usar la red. Permítelo en las
  redes privadas, o los teléfonos y ordenadores en la misma Wi-Fi no podrán llegar a él; los relays funcionan en
  cualquier caso.
- **Los mensajes de voz** grabados en un ordenador son Opus, en un teléfono AAC. Los dos se reproducen en los dos.
- **Las fotos** vienen de los archivos del ordenador; no hay cámara. **Guardar** pregunta dónde poner una foto o un
  archivo.
- **Un ordenador y un teléfono pueden compartir una cuenta:** vincula el ordenador al teléfono, y los dos tienen los
  mismos chats y contactos, ver [Dispositivos vinculados](#devices). O una copia de seguridad lo pasa todo de uno a
  otro, ver [Copias de seguridad](#backup), y a partir de entonces usa solo uno.
- **Sin avisos ni sonidos:** Erevos en un ordenador no muestra ningún aviso del sistema y no hace ningún sonido.
  Mientras funciona, un mensaje nuevo solo aparece en su ventana, y una llamada muestra ahí su pantalla sin sonar, así
  que con la ventana minimizada o detrás de otra, nada te avisa. Cerrado, no recibe nada: los mensajes esperan en el
  relay, y una llamada aparece como llamada perdida en cuanto se abre.
- **Probado hasta ahora** en Linux. Las versiones de Mac y Windows se compilan y se abren en los ordenadores de GitHub,
  todavía no por una persona.

## Dispositivos vinculados {#devices}

La misma cuenta en el teléfono y en un ordenador, o en un navegador: los mismos chats, contactos y mensajes en los dos.
El teléfono sigue siendo la cuenta: solo él añade contactos, y vincula y desvincula dispositivos. Cada dispositivo
vinculado tiene claves propias, que el teléfono firma en una lista de los dispositivos de la cuenta y da a sus
contactos. Los contactos con esta versión escriben entonces también a cada dispositivo, cifrado de extremo a extremo,
así que este recibe sus mensajes con el teléfono apagado; para los que tienen versiones más antiguas, el teléfono pasa
al ordenador lo que llega, y sella para ellos lo que escribe el ordenador. Los contactos ven la misma cuenta y el mismo
número de seguridad, tengan la versión de Erevos que tengan.

**Por qué:** cada dispositivo tiene claves propias, nunca una copia de las de la cuenta: Erevos no tiene ningún
servidor que pudiera cortar un dispositivo perdido, así que un dispositivo nunca es más que una entrada en una lista que
firma el teléfono, y desvincularlo basta. La lista tiene siempre cuatro lugares, y los que no ocupa ningún dispositivo
contienen claves creadas para nada, así que los contactos no pueden saber cuántos dispositivos tienes. Y con el
teléfono como cuenta, los contactos con cualquier Erevos más antiguo te contactan como antes.

Para vincular un ordenador:

1. En el ordenador, en un espacio sin chats propios (una instalación nueva, un espacio que abre una contraseña nueva, o
   los chats de un ordenador vinculado restaurados desde su copia), abre **Ajustes** → **Datos y dispositivos** →
   **Dispositivos vinculados**. Rellena el relay si lo pide, ponle nombre al dispositivo, y toca **Vincular a mi
   teléfono**. Muestra un código QR.
2. En el teléfono, escanea el código con la cámara: Erevos se abre en **Dispositivos vinculados** con él. O copia el
   código en el ordenador, pégalo en el teléfono en **Código del ordenador**, y toca **Siguiente**.
3. El teléfono muestra el nombre del ordenador y un código de cuatro grupos de cinco dígitos. Elige qué parte del
   historial pasa (**Todos**, **El último mes**, **La última semana** o **Ninguno**) y si **También fotos y archivos**,
   y luego toca **Vincular**.
4. El ordenador también muestra un código. Si es el del teléfono, toca **Coinciden**. Si no, toca **No coinciden**:
   puede que otra persona leyera su código QR, y no le llegó nada.

Los chats llegan entonces al ordenador, y tras ellos los mensajes elegidos.

- **Los mensajes** de los contactos llegan a los dos, y cada uno los guarda una vez: uno que vuelve a llegar en 30 días
  (hasta 2000 de un mismo contacto) no se vuelve a guardar, aunque haya desaparecido o se haya eliminado ahí. Para eso
  cada uno guarda, durante 30 días, qué mensajes llegaron y qué día, no lo que decían, también una vez desaparecidos o
  eliminados, y en una copia de seguridad hecha mientras tanto; el teléfono también lo guarda para un contacto que
  vinculó un dispositivo. Lo que escribes en el ordenador va a un contacto con esta versión directamente desde él, una
  vez que haya escrito al ordenador, y a través del teléfono si no: el teléfono lo muestra como tuyo, y el contacto lo
  recibe de la cuenta. Lo que escribes en el teléfono también aparece en el ordenador. Las marcas de leído, las
  reacciones, los mensajes fijados, los votos, las eliminaciones en los dos teléfonos, los nombres, los temporizadores,
  la apariencia de los chats y las imágenes, aparecer sin conexión y aceptar solicitudes van en los dos sentidos. Una
  estrella, o una eliminación en **Este teléfono**, hecha en el teléfono también va al ordenador; hecha en el
  ordenador, se queda ahí.
- **Con el teléfono apagado**, los contactos con esta versión siguen llegando al ordenador, y el ordenador a ellos: lo
  que escriben, leen y a lo que reaccionan llega, y lo que escribes sale. Si el teléfono sigue apagado tanto tiempo que
  su cola en el relay se llena (1000 mensajes), lo que escriben y leen sigue llegando al ordenador, un mensaje de voz
  largo entero; aquello a lo que reaccionan, fijan, votan o eliminan, y sus llamadas, no pasa hasta que el teléfono se
  vuelve a encender. Para los contactos con versiones más antiguas, los grupos, las llamadas, añadir un contacto y los
  mensajes enviados para más tarde, **el teléfono tiene que estar encendido** y llegar al
  relay: lo que el ordenador escribe mientras tanto espera en el relay, y sale en cuanto vuelve el teléfono. Dos o más
  dispositivos vinculados también se comunican directamente: con el teléfono apagado, cada uno sigue mostrando lo que
  los otros escriben, leen y a lo que reaccionan, y los cambios que hacen en los contactos; uno que se perdió el primer
  mensaje de otro recibe uno nuevo un día o más después. Un ordenador que estuvo apagado más tiempo del que el relay
  guarda los mensajes (14 días), o que se perdió el primer mensaje de un contacto para él, sigue recibiendo lo que este
  escriba después: su Erevos vuelve a empezar con él un día o más después, y luego cada vez con menos frecuencia, hasta
  que responde. Después de que un contacto te elimine y te vuelva a añadir, el ordenador también vuelve a empezar con
  sus dispositivos.
- **Las fotos y los archivos** que llegan se quedan en el relay hasta que tanto el teléfono como el ordenador los han
  recogido; entonces el teléfono los elimina de ahí. Uno que el ordenador nunca recoge desaparece cuando se desvincula,
  o a los 14 días, como cualquiera que no se recoja.
- **Las llamadas** suenan en el teléfono y en el ordenador. Responde en cualquiera de los dos: el otro deja de sonar, y
  dice que se respondió en otro dispositivo. Rechazar una llamada en uno la rechaza en los dos. El ordenador también
  llama a través del teléfono; la llamada en sí va entonces directamente entre el ordenador y el contacto, cifrada entre
  ellos, y el teléfono solo tiene que seguir encendido para establecerla.
- **Los grupos** también están en el ordenador, con sus mensajes, fotos, archivos y mensajes de voz. Escribe en ellos,
  responde, reacciona, vota, fija, elimina los tuyos para todos, añade y saca miembros, cambia el nombre de uno o sal de
  él, ahí como en el teléfono: el teléfono lo hace por el ordenador, como propio. Una foto o un archivo que guarda el
  teléfono va al ordenador como copia en el relay, eliminada de ahí en cuanto el ordenador la recoge. Lo que los
  miembros hacen después con un mensaje (reaccionar, votar, fijarlo, eliminarlo para todos) también aparece en el
  ordenador, igual que una estrella o una eliminación en **Este teléfono** hecha en el teléfono. Un
  mensaje que el teléfono no pudo enviar al grupo (uno cerrado mientras tanto, por ejemplo) aparece en el ordenador
  como **El teléfono no lo envió**. Crear un grupo, los grupos públicos y las llamadas de grupo se quedan en el teléfono
  por ahora.
- **Los chats ocultos y las segundas contraseñas** nunca se vinculan. Los chats ocultos escriben a los dispositivos de
  un contacto con esta versión como tus otros chats, así que estos los reciben con el teléfono del contacto apagado, y
  para el contacto parecen los chats de un teléfono que nunca vinculó un dispositivo. Un chat movido a los chats ocultos
  en el teléfono sale del ordenador. Movido a los chats ocultos, o sacado de ellos a tus chats, un chat escribe solo al
  teléfono del contacto, como hace un Erevos más antiguo, hasta que vuelve a donde se creó: a su Erevos se le dice
  antes, para que sus dispositivos dejen de escribir a los tuyos, y por ello puede saber que el chat dejó de conocer los
  dispositivos vinculados: si le había dado la lista de tus dispositivos, que pasó a los chats ocultos. Un espacio que
  abre una segunda contraseña solo se vincula desde dentro, a dispositivos propios.
- **Volver a traer los mensajes**, en el teléfono, vuelve a enviar un periodo del historial, con sus reacciones,
  mensajes fijados, votos y estrellas; lo que el ordenador ya tiene no se guarda dos veces.
- **Desvincular**, en el teléfono, corta un dispositivo al instante: no le llega nada más, y no se acepta nada de lo
  que envíe. A los contactos con esta versión se les dice la próxima vez que el teléfono contacta con el relay: dejan de
  escribirle, y no aceptan nada más de él. Así se corta un ordenador perdido. Si está encendido, se le dice, y los chats
  de la cuenta salen de él. En el ordenador, **Desvincular este dispositivo** hace lo mismo desde ahí.
- **Hasta cuatro** dispositivos se vinculan a un teléfono. Una copia de seguridad no lleva los vínculos: después de
  restaurar una en otro teléfono, toca **Desvincular este dispositivo** en el ordenador y vuelve a vincularlo, ver
  [Copias de seguridad](#backup).

## En un iPhone, desde el navegador {#iphone}

Erevos no tiene app en la App Store. En un iPhone funciona como app web, añadida a la pantalla de inicio desde Safari,
sin cuenta de Apple. Chatea a través de un relay, cifrado de extremo a extremo como en el teléfono, y guarda sus
contactos, mensajes y ajustes sellados de la misma manera, en el almacenamiento de Safari para la app.

1. Abre en **Safari** la dirección del servidor de Erevos que te dieron. Erevos muestra cómo añadirlo: toca
   **Compartir** (en iOS 26, dentro de **•••**), luego **Añadir a pantalla de inicio**, y después abre Erevos desde la
   pantalla de inicio. Necesita iOS 17 o posterior.
2. En Erevos, abre **Ajustes** → **Privacidad y seguridad** → **Esta app web** y compara la huella de la clave de
   versión con la que te dieron con la dirección, carácter a carácter. Si es distinta, elimina la app y avisa a quien
   te dio la dirección.
3. Pon un bloqueo con contraseña (en Erevos, **Ajustes** → **Privacidad y seguridad** → **Bloqueo y segunda
   contraseña**). En la web es lo más importante: ver más abajo.
4. Configura el relay y añade contactos como en el teléfono, ver [Chatear a través de un relay](#relay).

**Cómo se comprueba a sí mismo.** Una app web es código que envía el servidor, así que un servidor que sea atacado, o
al que se le ordene, podría enviar código modificado. Erevos no se fía de ese código sin más:

- La primera vez que se abre, descarga su código con una lista de cada archivo y su huella, firmada con la clave de
  versión, que solo tiene la persona que hace las versiones; el servidor no la tiene. Comprueba la firma y cada
  archivo, los guarda en el iPhone, y a partir de entonces solo ejecuta esos. El servidor no puede cambiarlos.
- Una actualización solo se acepta si está firmada con la misma clave y es más nueva que la que está en uso; empieza la
  próxima vez que se abre Erevos. Una sin firmar o más antigua se rechaza, y Erevos lo dice.
- Quien quiera puede comprobar el servidor: \`node pwa/release.mjs verify https://<dirección>\` comprueba la firma y
  cada archivo que da el servidor, y \`scripts/reproduce-web.sh <versión> https://<dirección>\` vuelve a compilar esa
  versión a partir de su código fuente y comprueba que cada archivo sale igual.

**Lo que queda.** Son límites reales; conócelos:

- **La primera vez** que lo abres, confías en el servidor: es el que envía la parte que comprueba. El paso 2 es cómo
  descubres uno falso.
- **La propia parte que comprueba** (el service worker) la vuelve a descargar Safari al menos una vez al día, y Safari
  puede sustituirla sin preguntar a Erevos. Erevos comprueba entonces la nueva con la versión firmada y te avisa
  (**Erevos ha sido manipulado**), pero un servidor que sepa cómo podría saltarse esa comprobación. Si ves el aviso, no
  vuelvas a abrir Erevos desde ese servidor hasta que se explique. Con un bloqueo con contraseña tus chats siguen
  sellados.
- **Sin Bluetooth ni enlace de cerca**, y sin SMS: Safari no los permite.
- **Solo mientras está abierto:** iOS detiene las apps web en segundo plano, así que los mensajes llegan cuando abres
  Erevos; hasta entonces esperan en el relay.
- **Las notificaciones** con Erevos cerrado están desactivadas salvo que las actives: en Erevos, **Ajustes** →
  **Notificaciones** → **Notificaciones con la app cerrada** → **Activar** (iOS 16.4 o posterior, desde la pantalla de
  inicio). Cuando llegan mensajes, o entra una llamada, tu relay envía un push a través de Apple, y Erevos muestra
  cuántos mensajes han llegado desde la última vez que lo abriste (**3 mensajes nuevos**), o **Llamada** si solo entró
  una llamada, en el idioma de la app, nada más. El número va cifrado para tu iPhone: Apple ve cuándo llega algo para tu
  iPhone, y que usa Erevos, nunca qué ni de quién. Con un relay o un Erevos del remitente anterior a 2.0.0, o un mensaje
  que otros teléfonos llevaron al relay, no hay número: Erevos muestra **Mensaje nuevo**, o **Mensajes nuevos** en
  cuanto llegan más, hasta que lo abras. Son por espacio, nunca para los chats ocultos, y tu relay debe estar
  configurado para enviarlas. También llegan para la cola propia de cada contacto: tu relay tiene entonces una dirección
  push para las colas de todos tus contactos, y Apple recibe un push por cada contacto que escribió, con 15 segundos de
  diferencia, así que por una serie así puede suponer cuántos escribieron a la vez, nunca quiénes. El icono de Erevos
  en la pantalla de inicio muestra entonces también un número: los mensajes no leídos del espacio que tenías abierto,
  que se quedan una vez cerrado Erevos, y los que llegaron después (lo que llegó sin número cuenta como uno), nunca los
  de un chat oculto. **Ajustes** → **Notificaciones** → **Número en el icono** lo desactiva. Las notificaciones
  funcionan a través del servicio push de Apple, el de Google (Chrome, y Edge en Android, Brave y Opera), el de Mozilla
  (Firefox) y el de Microsoft (Edge en Windows): un navegador que use otro no puede activarlas, salvo que quien gestione
  tu relay permita el servicio push de ese navegador. Los espacios con relays distintos comparten las notificaciones del
  navegador: solo las recibe el último que se abrió. Una solicitud de mensaje de alguien nuevo, a través de tu enlace de
  contacto, puede que solo aparezca cuando se abra Erevos.
- **Permisos:** en Erevos, **Ajustes** → **General** → **Permisos** muestra lo que el navegador deja hacer a Erevos: si
  funciona desde la pantalla de inicio, las notificaciones con la app cerrada (necesarias en cuanto este espacio las
  activó), el micrófono para las llamadas, la cámara para las videollamadas, y si el navegador conserva los datos de
  Erevos para siempre. Sin eso, Safari puede borrar los datos cuando al iPhone le queda poco espacio, así que una copia
  de seguridad es la red de seguridad. Cada uno tiene su porqué, y un botón con la pregunta propia del navegador; donde
  el navegador ya no pregunta, dice dónde está el ajuste (**Ajustes → Notificaciones → Erevos**, o **Ajustes → Apps →
  Safari → Micrófono**). Solo lee lo que dice el navegador. Un navegador no deja a Erevos leer el ahorro de batería ni
  el modo de bajo consumo, así que no están ahí. Tras cada nueva versión firmada se abre solo cuando falta algo que
  necesitan los mensajes, las llamadas o los datos. En otro navegador (Chrome, Firefox) es igual, con los ajustes de ese
  navegador.
- **Las copias de seguridad** se hacen a mano: **Hacer una copia de seguridad** guarda el archivo a través de la hoja
  de compartir (Archivos, iCloud Drive u otra app). Un navegador solo entrega un archivo tras un toque, así que no hay
  copias automáticas.
- **Los mensajes de voz** grabados en un iPhone son AAC; se reproducen en todas partes.
- **Apple** hace Safari y podría cambiarlo, como con cualquier app en un iPhone.

## En Sailfish OS {#sailfish}

En un teléfono con Sailfish OS, Erevos es una app propia: la misma app que en el navegador, mostrada por el motor de
navegador propio de Sailfish dentro de una ventana de Sailfish, con su código instalado con la app y no descargado de un
servidor. Chatea a través de un relay, cifrado de extremo a extremo como en el teléfono, y guarda sus contactos,
mensajes y ajustes sellados de la misma manera.

1. Permite las apps de fuera de la Jolla Store: **Ajustes → Software no fiable → Permitir software no fiable**.
2. Copia \`erevos-sailfish-aarch64.rpm\` al teléfono (Descargas) y tócalo en **Archivos**, luego **Instalar**. Desde
   un terminal (modo de desarrollador) es \`pkcon install-local erevos-sailfish-aarch64.rpm\`. Necesita Sailfish OS 5
   en su versión de 64 bits (aarch64).
3. Pon un bloqueo con contraseña (en Erevos, **Ajustes** → **Privacidad y seguridad** → **Bloqueo y segunda
   contraseña**). Más abajo se explica por qué aquí importa.
4. Configura el relay y añade contactos como en el teléfono, ver [Chatear a través de un relay](#relay).

- **Lo que solo hace Android:** el enlace de cerca (Bluetooth y Wi-Fi Aware), LoRa y los SMS. El resto es igual:
  espacios y la segunda contraseña, chats ocultos, mensajes de voz, chats importados y copias de seguridad.
- **Dónde guarda las cosas:** en \`~/.local/share/erevos\` en el teléfono, sellado como en el teléfono. Sailfish no
  tiene llavero para las apps, así que el almacén de claves se guarda ahí tal cual, legible por tu usuario, y por tanto
  por cualquier app que se ejecute como tú: el bloqueo con contraseña es lo que lo sella.
- **Las copias de seguridad** van a \`Documents/Erevos\` en el teléfono, a mano o cada día; cópialas de ahí a una
  tarjeta de memoria u otro dispositivo. **Guardar** pone una foto o un archivo en Descargas.
- **Solo mientras funciona:** cuando Erevos está cerrado, los mensajes esperan en el relay hasta que se abre.
- **Probado hasta ahora** en el motor de navegador de Sailfish (Gecko 91) en un ordenador, chateando con un navegador a
  través de un relay. Todavía no en un teléfono con Sailfish.

## Actualizaciones {#updates}

Erevos pregunta a GitHub por actualizaciones solo cuando tocas el botón, como en LPHL FASOULI: una comprobación periódica
le diría a GitHub, cada día, que este teléfono u ordenador tiene Erevos. En Android también te avisa cuando sale una
versión nueva, sin preguntar a GitHub, como explica **Aviso cuando sale una versión nueva** más abajo. Para actualizar:

1. Abre **Ajustes** → **General** → **Actualizaciones** (o **Buscar actualizaciones** al final de la primera pantalla de
   esta guía).
   Muestra la versión que tienes, como **Erevos 2.0.0**.
2. Toca **Buscar actualizaciones**. GitHub ve entonces la dirección de internet de este dispositivo, nada más; en
   Android también la ve el servidor de la app web, que guarda la firma de la actualización hecha por el ordenador de
   versiones. Mientras todo lo del espacio va por Tor (**Todo** en Tor), Erevos no comprueba, ya que eso rodearía Tor.
3. Cuando hay una versión nueva: en Android toca **Instalar**. Se descarga, se comprueba con la versión publicada (su
   tamaño y su SHA-256), y se abre el instalador de Android: toca **Instalar** ahí. Erevos solo la ofrece una vez que el
   ordenador de versiones, que guarda su clave sin conexión, ha firmado esa compilación y su SHA-256: quien se hiciera
   solo con la cuenta de GitHub no podría hacer instalar un APK propio. Hasta entonces dice que la versión ha salido
   pero aún no está firmada. Cuando no se puede contactar con el servidor de la app web lo dice, con el motivo, y cuando
   la firma de ahí no coincide lo dice: en ambos casos no se instala nada. La primera vez, Android pide permitir que
   Erevos instale apps. En un ordenador y en Sailfish OS, **Abrir la página de descargas** abre la página de versiones:
   toma el archivo que nombra Erevos, el del paquete que tienes, y actualiza como en la tabla de abajo.

### Novedades {#whats-new}

**Ajustes** → **General** → **Novedades** (también **Novedades** en **Actualizaciones**) dice en breve qué cambió cada
versión, la más nueva primero, solo por su número; la versión que tienes dice **Esta versión**. Cada versión añade lo
suyo. El CHANGELOG del código fuente cuenta cada cambio en detalle.
Cada versión, allí como aquí, dice primero qué cambia **Para ti**, lo que ves y usas, y luego qué cambió
**Bajo el capó**: arreglos, velocidad, batería y seguridad por dentro.

### Aviso cuando sale una versión nueva {#release-notice}

En Android, una vez al día, Erevos pregunta al servidor de LPHL, que también gestiona el relay, si ha salido una versión
nueva. Cuando la hay, **Erevos** aparece arriba de los chats, fijado, con su icono: **Salió Erevos 3.3.0. Toca para ver
qué hay de nuevo y actualizar.**, marcado hasta que lo abras, y un aviso dice también **Erevos 3.3.0 is out**. Toca
cualquiera de los dos para ir a **Actualizaciones**, y luego **Buscar actualizaciones**. Desaparece en cuanto tienes esa
versión.

- **Solo cuando está firmada:** solo cuenta una vez que el ordenador de versiones ha firmado tanto la compilación como
  su nombre, la misma firma que permite a **Actualizaciones** instalarla. Así que llega en cuanto esa versión se puede
  instalar, y el servidor por sí solo no puede inventarse una.
- **Solo en el relay de LPHL:** un espacio solo pregunta mientras usa el relay de LPHL y no envía todo por Tor
  (**Todo** en Tor): el servidor no ve entonces nada que no vea ya. Un espacio en otro relay, o sin relay, no pregunta
  nada; ahí te lo dice **Buscar actualizaciones**.
- **Para desactivarlo:** **Ajustes** → **General** → **Actualizaciones** → **Avísame cuando salga una versión nueva**.
- Funciona a partir de la versión que lo tiene: la anterior no dice nada. No en la compilación de F-Droid, que actualiza
  F-Droid.

**Por qué:** para que nadie tenga que mirar en GitHub, una por una, cada versión nueva, y GitHub nunca sepa qué
teléfonos tienen Erevos: el servidor al que se pregunta es aquel con el que el teléfono ya habla, y lo que dice solo
cuenta con la firma del ordenador de versiones, guardada sin conexión.

El resto de esta sección es para actualizar a mano.

**Dónde están las versiones nuevas:** en la página de versiones de Erevos,
\`https://github.com/azzinder/erevos-releases/releases\`. La más nueva está arriba, como **Erevos 2.0.0**, con un
archivo para cada sistema. Las cinco más nuevas se quedan ahí.

**Comprueba el archivo** si puedes, en un ordenador: cada versión tiene \`SHA256SUMS\`, y en la carpeta con los archivos
descargados \`sha256sum -c --ignore-missing SHA256SUMS\` debe decir **OK** para cada uno.

**Haz antes una copia de seguridad** (**Ajustes** → **Datos y dispositivos** → **Copias de seguridad** → **Hacer una
copia de seguridad**), ver [Copias de seguridad](#backup). Una actualización lo conserva todo, pero una copia cuesta un
minuto y cubre cualquier sorpresa.

| En | Cómo actualizar |
| --- | --- |
| **Android** | **Ajustes** → **General** → **Actualizaciones** → **Buscar actualizaciones** → **Instalar**, o a mano: abre la página de versiones en el teléfono, toca \`erevos-android.apk\`, y luego **Instalar**. Se instala encima del que tienes y lo conserva todo. Permite instalar desde el navegador una vez, cuando Android lo pida. |
| **Linux, basado en Arch** | \`sudo pacman -U erevos-linux-x86_64.pacman\` |
| **Linux, AppImage** | Sustituye el antiguo \`erevos-linux-x86_64.AppImage\` por el nuevo y hazlo ejecutable. |
| **macOS** | Abre \`erevos-macos.dmg\` y arrastra Erevos a Aplicaciones, **Reemplazar**. Luego vuelve a permitirlo en **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente**. |
| **Windows, instalado** | Cierra Erevos y ejecuta el nuevo \`erevos-windows-x64-setup.exe\`: se instala encima del que tienes. Windows puede volver a avisar: **Más información**, y luego **Ejecutar de todas formas**. |
| **Windows, portátil** | Cierra Erevos y pon el nuevo \`erevos-windows-x64-portable.exe\` en lugar del antiguo. |
| **Sailfish OS** | Toca \`erevos-sailfish-aarch64.rpm\` en **Archivos**, luego **Instalar**, o \`pkcon install-local erevos-sailfish-aarch64.rpm\`. |
| **iPhone, navegador** | Nada que hacer: la app web toma sola una versión nueva firmada al abrirse, ver [En un iPhone](#iphone). |

- **Los contactos, los chats y los ajustes se quedan** en todos los sistemas: viven en la carpeta propia de Erevos, no
  en la app.
- **Android, la primera vez desde la página de versiones:** un Erevos compilado en un ordenador para pruebas está
  firmado con otra clave, y Android se niega a instalar encima de él (**Aplicación no instalada**). Haz una copia de
  seguridad, desinstala Erevos, instala el de la página de versiones y restaura la copia. Después de eso, cada
  actualización se instala encima.
- **Erevos de F-Droid**, cuando esté ahí, lo actualiza F-Droid: sus **Actualizaciones** muestran la versión y lo dicen,
  sin **Buscar actualizaciones**. F-Droid lo firma con una clave propia, así que Android no instala ni ese encima del
  Erevos de la página de versiones ni este encima de aquel. Para cambiar: haz una copia de seguridad, desinstala Erevos,
  instala el otro y restaura la copia.
- **Nunca uno más antiguo:** no instales una versión más antigua encima de una más nueva. Sus datos pueden estar en un
  formato que la más antigua no puede leer. Restaura en su lugar una copia hecha con esa versión más antigua.
- **Una versión a la que le falta tu sistema** lo dice en sus notas: esa compilación falló, así que usa la versión
  anterior.

## Las pantallas de prueba {#tests}

Dos pantallas en **Ajustes** → **Para pruebas** sirven para probar las conexiones, paso a paso.

- **Prueba de radio (Android):** **Permisos** pide a Android lo que necesita la radio, **Iniciar** y **Detener**
  encienden y apagan Bluetooth y Wi-Fi Aware, **Enviar hola** envía un mensaje de prueba simple a la Prueba de radio
  del teléfono cercano (un chat no lo muestra), y el **Registro** muestra lo que pasó.
- **Prueba del relay (Wi-Fi):** **Crear cola** crea una cola en un relay y muestra dos ids. Da el **sender id** al
  teléfono que te escribe, y guarda en privado el **recipient id**. **Enviar** y **Recibir** mueven mensajes a mano.

> Con un solo teléfono igualmente puedes probar un chat por el relay: tus chats y tus **Chats ocultos** tienen cada uno
> su propia cola en el relay y sus propias claves. Crea las dos colas en el mismo relay, toca **Compartir mi enlace de
> contacto** en uno y cópialo, luego añádelo en el otro, y escribe en los dos sentidos. El propio enlace de un chat se
> rechaza como contacto.

## Qué está protegido hoy {#privacy}

Erevos dice claramente lo que protege y lo que todavía no.

| Qué | Hoy | Por venir |
| --- | --- | --- |
| **Cuenta, número de teléfono, email** | No hace falta ninguno. Los contactos son pares de colas de un solo sentido en el relay. | |
| **Los contactos y sus nombres, claves, ajustes del relay, aspecto** | Sellados en el teléfono con la clave de cada espacio. | |
| **Mensajes a través de un relay** | Cifrados de extremo a extremo: PQXDH con ML-KEM-768 para empezar, luego el doble ratchet. El relay no puede leerlos, y en cuanto los dos teléfonos han recibido un mensaje el uno del otro tampoco puede distinguirlos por conversación: cada uno se sella una vez más para el teléfono al que va. Ve cuáles son mensajes que alguien lee, cuáles son avisos entre teléfonos, y cuáles son llamadas que suenan, ya que cada uno lo dice. Aún sin auditar. | Una auditoría externa. |
| **Mensajes a un teléfono cercano** | Cifrados de extremo a extremo, igual que por el relay. Quien escuche cerca puede saber que hay teléfonos con Erevos cerca unos de otros, y cuándo y cuánto envían; en la misma Wi-Fi, también cualquiera que esté en ella, y por Wi-Fi Direct cualquiera que se una a la Wi-Fi propia de los teléfonos. Hasta que se conoce el teléfono de tu contacto, los otros teléfonos con Erevos conectados cerca reciben tus mensajes cortos, sellados. | |
| **Mensajes llevados por otros teléfonos** | Sellados dos veces: de extremo a extremo para tu contacto, y para su relay. Un teléfono que lleva uno ve a qué relay va, cuándo, y de qué tamaño; no de quién es ni para quién. Su relay ve a qué relay va, y ese relay ve el relay del portador, no su teléfono. Guardados sellados en el teléfono, tres días como mucho: los de otros en un archivo del teléfono, cuyo tamaño muestra más o menos cuántos hay; los tuyos en tu espacio, sellados con su clave. Los chats ocultos nunca se llevan. | |
| **Mensajes por LoRa** | Cifrados de extremo a extremo, igual que por el relay. Cualquiera con una radio, a kilómetros, puede saber que la tuya transmite, cuándo y cuánto, y su señal se puede rastrear hasta donde está. Erevos impide que tu radio anuncie su nombre y dónde está (rol Client hidden, GPS apagado, sin posición fija) salvo que lo permitas; aun así responde a una radio que le pregunte su nombre. Todos los Erevos de la malla reciben tus mensajes LoRa, sellados. | Poner el nombre de la radio desde Erevos. |
| **Quién habla con quién** | El relay ve direcciones IP, ids de colas, y cuándo y cuánto. Con un segundo relay, tu relay nunca ve tu dirección. Desde un sitio prestado en el relay de un contacto, cada relay al que envías la ve. [A través de Tor](#tor), que lleva los mensajes salvo que lo cambies, ningún relay la ve para lo que escribes, y con **Todo** tampoco para las imágenes y los archivos; con puentes, para donde Tor está bloqueado, la red solo ve un puente. El broker de Snowflake y los servidores STUN ven tu dirección. | Tor en un ordenador. |
| **La conexión con el relay** | TLS, y dentro, en cuanto se conoce la clave del relay, un canal hacia esa clave: el relay demuestra que la tiene en cada conexión, y el token y cada petición van cifrados con ella, así que alguien entre medias con un certificado para el nombre del relay no puede hacerse pasar por él. A un relay que demostró su clave una vez nunca se vuelve a llegar sin ella. Un relay más antiguo que esta app funciona como antes, y **Cómo te conectas ahora** lo dice. La primera clave viene del relay la primera vez que se le pregunta, o de un enlace de contacto: quien esté entre medias justo esa primera vez podría dar una propia. [La clave propia del relay](#relay). Sin auditar. | La clave de nuestro relay incluida en la app, y en las invitaciones. |
| **Textos por Nostr** | Cifrados de extremo a extremo como por un relay, luego envueltos una vez más para una clave que tu contacto dio solo para ese chat, firmados por una clave hecha solo para ese texto. Los relays de Nostr ven cuándo y de qué tamaño, y que una clave que no nombra a nadie recibe un texto; tu teléfono lee todas sus claves en una sola conexión, a través de Tor, así que un relay puede saber que se leen juntas, nunca desde dónde. Tu relay solo los ve como respaldo, y una campanita para los chats ocultos. [A través de Nostr](#nostr). | Imágenes y mensajes de voz por Nostr. |
| **SMS** | Un SMS normal lo lee la compañía telefónica, como cualquier SMS. A un número vinculado a un contacto de Erevos va en su lugar por Erevos. Una invitación oculta es un SMS corto más que ve la compañía telefónica. | |
| **Los contactos del teléfono** | En los contactos propios de Android, sin sellar por Erevos, como con cualquier app de contactos: cualquier app con permiso para leerlos los ve, y una cuenta (Google) puede sincronizarlos. Erevos no los envía a ninguna parte. Un archivo .vcf guardado a partir de ellos está fuera de Erevos, sin sellar. Las llamadas y los SMS de un contacto se leen del propio registro de llamadas y de los SMS del teléfono solo para mostrar su historial, y no se guardan en ninguna parte. | |
| **Contactos guardados solo en Erevos** | Sellados con la clave del espacio, o con la de los chats ocultos para los suyos, en un archivo para todos los espacios cuyo tamaño muestra más o menos cuántos hay en total, no de quién son; sus fotos, cada una en un archivo propio. Nunca en los contactos de Android. Un archivo .vcf guardado a partir de ellos, también de los chats ocultos, está fuera de Erevos, sin cifrar. Las llamadas y los SMS a ellos van por el teléfono, y aparecen en su registro de llamadas y en sus SMS. | |
| **Llamadas telefónicas** | Llamadas telefónicas normales: las lleva la compañía telefónica, que puede escucharlas, como con cualquier app de teléfono. Android guarda el historial de llamadas, sin sellar por Erevos, como para cualquier app de teléfono; Erevos lo lee, y los favoritos, para mostrarlos, elimina de él solo las llamadas que eliminas, y no guarda ninguna copia. La SIM elegida para cada número se sella en el espacio; las respuestas rápidas, y lo que se bloquea (solo prefijos, ids de grupos y horas, lo mismo para todos los espacios), se guardan en el teléfono, sin sellar. | |
| **Chats importados** | Sellados en el espacio al que se trajeron, también sus fotos y archivos, cada uno en sus trozos como el archivo de un chat. El tamaño del archivo, y cuántos trozos hay, dicen más o menos cuánto se importó, no dónde. | Las fotos y los archivos de Viber, y archivos de más de 1 GB. |
| **Historial de mensajes** | Guardado en el teléfono, sellado en su espacio, sin límite, en páginas del mismo tamaño mezcladas para todos los espacios. Solo se ve cuánto ocupa todo, no a qué espacio pertenece. Eliminar en los dos teléfonos, y los mensajes temporales, dependen del Erevos del otro teléfono. | |
| **Mensajes de cerca** | Solo se abren en el espacio que tiene el contacto. Uno para otro espacio espera en memoria, seis horas como mucho, hasta que ese espacio se abra. Los chats ocultos nunca usan el enlace de cerca. | Chats ocultos de cerca. |
| **Mensajes de voz** | Cifrados de extremo a extremo por el relay o de cerca, en trozos: el relay, o quien escuche cerca, puede saber más o menos cuánto dura cada uno. Cada sonido se sella en un archivo propio; cuántos archivos hay, y sus tamaños, muestran más o menos cuántos se guardan, no en qué espacio. Sin sellar en la caché solo mientras se reproduce. | Archivos de sonido todos del mismo tamaño. |
| **Fotos y archivos** | Cifrados de extremo a extremo, a través del almacén de archivos del relay, en trozos del mismo tamaño: el relay ve cuántos y cuándo, así que más o menos lo grandes que son. Tu relay ve tu dirección, como para los mensajes; el contacto los recoge a través de su propio relay. Las fotos pierden su lugar, su teléfono y su hora, salvo que se envíen como archivo; un archivo conserva lo que dice dentro. Sellados en el teléfono en sus trozos, mostrados desde la memoria. Las copias guardadas están fuera de Erevos. Aún no en las copias de seguridad. | Copias de seguridad que los contengan. |
| **En un ordenador** | Sellado como en el teléfono, en la carpeta propia de la app. Su almacén de claves está sellado con el llavero del sistema (en Windows, la clave de tu cuenta); en un sistema Linux sin llavero, Erevos no guarda nada salvo que se inicie con \`--plain-secrets\`, y entonces lo guarda tal cual. | |
| **Copias de seguridad** | Un archivo sellado con su propia contraseña, que contiene cada espacio tal como está sellado en el teléfono. Su nombre dice que es una copia de seguridad de Erevos, y su tamaño muestra más o menos cuánto se guarda. Las copias automáticas guardan su contraseña en el teléfono. | Copias directamente a Nextcloud o WebDAV. |
| **Marcas ✓✓ y ✓✓✓** | El teléfono del contacto sabe cuándo el tuyo recibió y leyó sus mensajes, cifrado. El relay, o quien escuche cerca, ve un mensaje pequeño más. | Un interruptor para dejar de decir cuándo lees. |
| **Huella o cara (Android)** | Desactivado salvo que se active. Solo abre el espacio de la primera contraseña: su clave sellada en el Android Keystore, utilizable solo justo después de una comprobación fuerte de huella o cara, y descartada cuando estas cambian. Alguien que te retenga puede usar tu dedo. | |
| **Avisos (Android)** | En segundo plano: «Erevos – Ready for calls and messages» (no en la pantalla de bloqueo), «Incoming call» o «Incoming video call» – «Open Erevos to answer», y «New message» o cuántos llegaron; cuando Android o la contraseña lo detienen, «Closed by Android» o «Locked» – «Open it to receive calls and messages again»; un recordatorio, «Reminder» o cuántos; una versión nueva, «Erevos X is out». Nunca quién ni qué. En un teléfono bloqueado, el de los mensajes solo dice «Erevos». Los chats ocultos que pueden decirlo muestran el mismo aviso, contado con el resto: quien lo vea y no encuentre nada nuevo puede suponer que hay más. Como app de teléfono, el aviso de una llamada telefónica nombra a quien llama, también sobre la pantalla de bloqueo, como el de cualquier app de teléfono, pero nunca con un nombre que solo conozcan los chats ocultos: una llamada de uno de sus contactos muestra el número. | |
| **Widget y Teléfono (Android)** | El widget, una vez añadido, muestra cuántas llamadas perdidas, SMS sin leer y mensajes nuevos hay, nunca de quién ni qué. El Teléfono se abre sin la contraseña solo si lo permites: entonces cualquiera que tenga el teléfono desbloqueado ve las llamadas y los favoritos que guarda Android, solo con los nombres de los contactos del teléfono. | |
| **Llamadas** | Cifradas de extremo a extremo (DTLS-SRTP, con su clave enviada en el chat cifrado). A través del relay de llamadas, ningún teléfono ve la dirección IP del otro; el servidor que lo ejecuta ve las dos, cuándo y cuánto tiempo, y cuánto pasa. Sin relay de llamadas, solo en la misma Wi-Fi, cada teléfono ve la dirección del otro. Los relays ven cuándo empieza a sonar una llamada. | Que suenen en un ordenador y en la app web estando cerrados. Llamadas por Bluetooth (ahí funciona el walkie-talkie). |
| **Chats de grupo** | Cifrados de extremo a extremo con MLS (RFC 9420); los miembros sacados no leen nada después. La copia de cada miembro se sella aparte, así que los relays no pueden saber quién está en un grupo; cada relay sigue viendo que un mensaje llega a una cola. Los miembros ven las claves y las direcciones de relay de los demás. Las fotos, los archivos y los mensajes de voz van por el almacén de archivos del relay de quien los envía, como a un contacto, y se quedan ahí 14 días. Sin auditar. | |
| **Llamadas de grupo** | Voz y vídeo, cifrados de extremo a extremo entre cada dos teléfonos de la llamada (DTLS-SRTP, con sus claves enviadas en el cifrado del grupo). A través del relay de llamadas, ningún teléfono ve la dirección IP de otro; el servidor que lo ejecuta ve la de cada teléfono, cuándo y cuánto tiempo, y cuánto pasa. Cada miembro, esté en la llamada o no, sabe quién está en ella. Los relays ven cuándo empieza una. | Vídeo con más de cuatro personas, a través de un servidor; más de ocho personas. |
| **Grupos públicos** | Como los chats de grupo, y cualquiera con el enlace puede pedir unirse y leer desde que se le deja entrar. Las peticiones llegan al relay del propietario selladas para el teléfono del propietario: el relay ve cuántas y cuándo, no de quién. Los miembros ven los nombres elegidos de los demás, claves hechas solo para ese grupo, direcciones de relay y sender ids de las colas. Sin auditar. | |
| **Vistas previas de enlaces** | Desactivadas salvo que se activen. Entonces, al enviar un enlace, tu teléfono descarga su página directamente del sitio, que ve tu dirección IP y cuándo, no para quién es el mensaje. La vista previa va dentro del mensaje cifrado; el teléfono que lo recibe no descarga nada. Ninguna mientras el espacio va por Tor; en los chats ocultos solo con el interruptor propio de su lugar. | Vistas previas a través de Tor. |

## Transparencia {#transparency}

Lo que guarda el servidor que hay detrás de Erevos (lphl.nekten.eu), y lo que se le ha pedido. Esta página va dentro de
cada versión, así que está firmada con la versión, como la app.

**Peticiones de autoridades.** A fecha de esta versión: ninguna. Ninguna autoridad, tribunal ni empresa ha pedido datos
sobre nadie que use Erevos, y a nadie se le ha pedido guardar silencio sobre una petición así. Si este párrafo
desaparece algún día, o deja de decir «ninguna», tómalo como una señal. **Por qué:** una petición que llega con la orden
de guardar silencio no se puede contar, pero una frase que deja de escribirse se puede notar. Eso solo funciona mientras
se renueve: cada versión lo vuelve a decir.

Lo que guarda el relay, y durante cuánto tiempo:

| Qué | Durante cuánto tiempo |
| --- | --- |
| **Mensajes en espera**, cifrados de extremo a extremo | Hasta que se recogen, 14 días como mucho. |
| **Fotos y archivos**, cifrados, en trozos | Como los mensajes: hasta que se recogen, 14 días como mucho. |
| **Mensajes enviados para más tarde**, cifrados | Hasta que llega su hora. |
| **Colas**, ids aleatorios sin nombre | Hasta que su teléfono lleva 180 días sin usarlas. |
| **Líneas de acceso**: para cada teléfono, el SHA-256 de su token y un nombre: el que escribió quien lo invitó, o el nombre de usuario de LPHL para quienes iniciaron sesión con LPHL | Hasta que se quita la línea, o desaparece la línea que lo invitó. |
| **Direcciones push de la app web**, para los avisos mientras la app web está cerrada | Hasta que se desactivan en la app web. |

Lo que no guarda:

- **Ninguna lista de conexiones.** El relay no escribe ningún registro de quién se conectó ni cuándo, y el servidor web
  que está delante del relay y de la app web no guarda ningún registro de accesos desde el 24 de octubre de 2026. Los
  errores se registran, y un error puede nombrar una dirección.
- **Ningún contacto, nombre ni número de teléfono.** No tiene ninguno que guardar.

Lo que sigue viendo mientras funciona: las direcciones IP que se conectan, cuándo llegan y salen los mensajes, y de qué
tamaño son, como dice [Qué está protegido hoy](#privacy). Durante una llamada por el relay de llamadas, las direcciones
IP de los teléfonos que están en ella.

**Copias.** De la carpeta del relay se hace una copia cada día, con los mensajes en espera todavía cifrados de extremo a
extremo. Las copias contienen lo que lista la tabla de arriba, mientras se conserven.

**Otros que ven algo:** la empresa de alojamiento (Hetzner), que gestiona la máquina y su red; el inicio de sesión de
LPHL (Authentik), que ve cada inicio de sesión con LPHL; y para la app web con avisos con la app cerrada, el servicio
push del navegador (Apple, Google o Mozilla), que ve que llegó un aviso, nunca qué.

## Lo que viene {#coming}

El cifrado de extremo a extremo ya está aquí, por el relay y por el enlace de cerca, y la mayor parte de lo que sigue se
construye sobre él.

- **Más formas de seguir en contacto:** los puentes de Tor para donde Tor está bloqueado ya están aquí, ver
  [A través de Tor](#tor). Lo siguiente: Tor en un ordenador.
  - **Radios LoRa (Meshtastic):** ya están aquí, ver [Con una radio LoRa](#lora). Lo siguiente: poner el nombre de la
    radio desde Erevos.
  - **SMS:** Erevos como app de SMS ya está aquí, con fotos por MMS, MMS de grupo y dos SIM, ver [SMS](#sms).
  - **Teléfono:** Erevos como app de teléfono ya está aquí, con su propia pantalla de llamada, ver [Teléfono](#phone).
  - **Email, códigos QR, USB, NFC:** para cuando nada más consigue pasar.
- **Llamadas:** las llamadas de voz y vídeo ya están aquí, y en Android suenan en segundo plano, ver
  [Chatear a través de un relay](#relay), y también un walkie-talkie que funciona incluso por Bluetooth.
- **Grupos:** los chats de grupo, con fotos, archivos y mensajes de voz, y las llamadas de grupo de voz y vídeo ya están
  aquí, ver [Chats de grupo](#groups). Lo siguiente: vídeo con más de cuatro personas, a través de un servidor al que la
  llamada pasa sola, todavía cifrada de extremo a extremo.
- **Traer tus chats:** Telegram y WhatsApp ya entran, con sus fotos y archivos, y Viber con sus palabras, ver
  [Chats importados](#import). Lo siguiente: las fotos y los archivos de Viber.
- **Más sistemas:** grupos públicos y llamadas de grupo también en los dispositivos vinculados; la cuenta, sus llamadas
  y sus grupos ya están en un ordenador, ver [Dispositivos vinculados](#devices). Linux, macOS y Windows ya están aquí,
  ver [En un ordenador](#desktop), el iPhone desde el navegador, ver [En un iPhone](#iphone), y Sailfish OS, ver
  [En Sailfish OS](#sailfish); y también las copias de seguridad, ver [Copias de seguridad](#backup).

## Preguntas {#faq}

### Olvidé mi contraseña.

No hay forma de recuperarla. Erevos no guarda nada que pudiera abrir tus datos sin ella. Solo si el desbloqueo con
[huella o cara](#lock) está activado sigue abriendo el primer espacio: pon ahí una contraseña nueva con
**Cambiar contraseña**.

### Un contacto que está cerca nunca aparece como «Cerca».

- Escríbele: los teléfonos saben cuál es cuál por el primer mensaje que
  llega de cerca. Solo se encuentran contactos, así que añadíos primero.
- Mantén un espacio abierto en los dos teléfonos: Erevos en la pantalla, o en segundo plano con **En segundo plano** en
  **Recibir y sonar**.
- Comprueba que Bluetooth está activado (y, en Android 12 y anteriores, la ubicación), y que Erevos puede encontrar
  dispositivos cercanos (ajustes de Android → Aplicaciones → Erevos → Permisos).
- Acerca los teléfonos. Si uno de ellos no tiene Wi-Fi Aware, se encuentran por Bluetooth, que tarda más en empezar.
- O conecta los dos a una misma Wi-Fi, o al punto de acceso de un teléfono, con **Buscar Erevos en la misma Wi-Fi**
  activado. Algunas Wi-Fi públicas mantienen separados los dispositivos conectados: ahí no puede funcionar. Sin ninguna
  Wi-Fi en común, **Crear una Wi-Fi con teléfonos cercanos** les deja crear una (Android 10 y posteriores); dale hasta
  un minuto o dos.

### No llega nada por LoRa.

- Las dos radios necesitan la misma región y el mismo primer canal (su nombre y su clave) en la app Meshtastic, y estar
  al alcance la una de la otra, o de radios intermedias.
- **Radio LoRa**, en **Ajustes** → **Relay y redes**, debe decir **Conectado**. Si no lo dice, cierra la app
  Meshtastic: una radio se conecta a una sola app a la vez.
- Solo van textos, y solo cuando el relay no está disponible y no hay ningún teléfono cerca.
- En la UE una radio solo puede transmitir cierta cantidad cada hora: tras muchos mensajes, espera.

### No se añadió un código de contacto.

Un contacto de otro relay necesita un enlace con la clave de ese relay, que tienen los enlaces de un Erevos actualizado:
la línea bajo el chat nombra ese relay. Un código de un Erevos más antiguo no tiene claves y se rechaza: pide uno nuevo.

### ¿Puede el relay leer mis mensajes?

No. Los mensajes a través de un relay están cifrados de extremo a extremo, y solo los dos teléfonos tienen las claves.
El relay sigue viendo qué colas se usan, y cuándo y cuánto llega ([Tener tu propio relay](#own-relay)). Comparad el
número de seguridad, como en [Chatear a través de un relay](#relay), para estar seguros de que no hay nadie en medio.
Todavía no se ha auditado nada.

### ¿Por qué Erevos no pide mi número de teléfono?

Porque nada lo necesita. Cada contacto es un par de colas de un solo sentido en el relay, así que ningún servidor tiene
una lista de quién conoce a quién.

### ¿Funciona en un iPhone o en un ordenador?

En un ordenador, sí: Linux, macOS y Windows, ver [En un ordenador](#desktop).
En un iPhone, sí, desde el navegador, como app web, ver [En un iPhone](#iphone).
`;
