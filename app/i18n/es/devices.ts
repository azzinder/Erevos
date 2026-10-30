// The Spanish of linked devices: the account on the phone and on a computer (lib/devices.ts, app/devices.tsx; i18n/es/index.ts).
export const devices: Record<string, string> = {
  // Linking and the links (lib/devices.ts).
  Computer: 'Ordenador',
  'Linked devices could not open.': 'No se han podido abrir los dispositivos vinculados.',
  'That device is linked already.': 'Ese dispositivo ya está vinculado.',
  'That is not a code from Linked devices.': 'Eso no es un código de «Dispositivos vinculados».',
  'The code changed. Compare it again.': 'El código ha cambiado. Vuelve a compararlo.',
  'This device is no longer linked to a phone.': 'Este dispositivo ya no está vinculado a un teléfono.',
  'This is a linked device. Link from the phone that holds the account.': 'Este es un dispositivo vinculado. Vincula desde el teléfono que tiene la cuenta.',
  'This space has chats of its own. Link from a space with none, such as one that opens with a new password.':
    'Este espacio tiene chats propios. Vincula desde un espacio sin ninguno, como uno que se abra con una contraseña nueva.',
  'This space is linked already.': 'Este espacio ya está vinculado.',
  'Too long to go through the phone.': 'Demasiado largo para pasar por el teléfono.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Escribe primero la dirección del relay en «Relay»: los dispositivos vinculados llegan a este teléfono a través de él.',
  '{n} devices are linked already, the most there can be.': 'Ya hay {n} dispositivos vinculados, el máximo posible.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Dispositivos vinculados',
  'Not sent by the phone': 'El teléfono no lo envió',
  'These chats came from a linked device’s backup: you can read them here, but not write in them. To write, link this device to the phone again, in Linked devices.':
    'Estos chats vienen de la copia de seguridad de un dispositivo vinculado: puedes leerlos aquí, pero no escribir en ellos. Para escribir, vuelve a vincular este dispositivo al teléfono en Dispositivos vinculados.',
  'This account on a computer or in a browser too': 'Esta cuenta también en un ordenador o en un navegador',
  "This chat is the phone's: move it into hidden chats there.": 'Este chat es del teléfono: muévelo a los chats ocultos desde ahí.',

  // A call answered on another device of the account (components/call-screen.tsx, lib/call-lines.ts).
  'Answered on another device': 'Respondida en otro dispositivo',
  'answered on another device': 'respondida en otro dispositivo',

  // Linked devices (app/devices.tsx).
  'All of it': 'Todos',
  'The last month': 'El último mes',
  'The last week': 'La última semana',
  None: 'Ninguno',
  'Web browser': 'Navegador web',
  'Code copied. Paste it on the phone in Settings → Data and devices → Linked devices.': 'Código copiado. Pégalo en el teléfono, en «Ajustes → Datos y dispositivos → Dispositivos vinculados».',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Vinculado. Los chats llegan desde el teléfono, y con ellos los mensajes que se eligió traer.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'No vinculado. Puede que otra persona haya leído el código. Crea uno nuevo y vuelve a vincular.',
  'Now the computer shows a code too. If it is {code}, tap They match there.': 'Ahora el ordenador también muestra un código. Si es {code}, toca «Coinciden» ahí.',
  'Unlink this device': 'Desvincular este dispositivo',
  'Unlink {name}': 'Desvincular {name}',
  "The account's chats leave this device, messages and all. The phone keeps them.": 'Los chats de la cuenta salen de este dispositivo, con todos sus mensajes. El teléfono los conserva.',
  'Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.':
    'Ya no se le envía nada, y no se acepta nada de lo que envíe. Lo que tiene se queda en él, tras su propio bloqueo.',
  'Unlinked.': 'Desvinculado.',
  'Unlinked here. The phone was not told: unlink this device there too.': 'Desvinculado aquí. El teléfono no se ha enterado: desvincula este dispositivo también desde ahí.',
  'Unlinked. The device was not told, and gets nothing more.': 'Desvinculado. El dispositivo no se ha enterado, y ya no recibe nada.',
  'The messages go to it now. What it has already is not kept twice.': 'Ahora se le envían los mensajes. Lo que ya tiene no se guarda dos veces.',
  'Messages to bring over': 'Mensajes que traer',
  'Photos and files too': 'También fotos y archivos',
  'Linked to {name}': 'Vinculado a {name}',
  'Since {when}. Last heard from {last}.': 'Desde el {when}. Última conexión: {last}.',
  'This device has the chats and groups of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls ring here too. New groups, public groups and group calls stay on the phone for now.':
    'Este dispositivo tiene los chats y los grupos del teléfono que tiene la cuenta. Lo que escribes aquí pasa por el teléfono, que tiene que estar encendido y llegar al relay. Las llamadas también suenan aquí. Por ahora, los grupos nuevos, los grupos públicos y las llamadas de grupo se quedan en el teléfono.',
  'Make or join groups on the phone that holds this account.': 'Crea grupos o únete a ellos desde el teléfono que tiene esta cuenta.',
  'Group calls ring on the phone that holds this account, for now. Call from there.':
    'Por ahora, las llamadas de grupo suenan en el teléfono que tiene esta cuenta. Llama desde ahí.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go.':
    'La misma cuenta en un ordenador o en un navegador. La cuenta sigue en el teléfono: él reenvía, cifrado de extremo a extremo, lo que llega y lo que escribe el ordenador, así que tus contactos no ven nada nuevo. Los chats ocultos y lo que abre una segunda contraseña nunca se pasan.',
  'Link {name}': 'Vincular {name}',
  'Once you tap Link, the computer shows this code. Link only if it shows the same:': 'Cuando toques «Vincular», el ordenador mostrará este código. Vincula solo si muestra el mismo:',
  Link: 'Vincular',
  Devices: 'Dispositivos',
  'Linked {when}. Last heard from {last}.': 'Vinculado el {when}. Última conexión: {last}.',
  'Linked {when}.': 'Vinculado el {when}.',
  'Waiting for They match to be tapped on it.': 'Esperando a que se toque «Coinciden» en él.',
  'Bringing over messages: {n} so far.': 'Trayendo mensajes: {n} hasta ahora.',
  'Bring over': 'Traer',
  'Bring over messages again': 'Volver a traer los mensajes',
  'Signed in as {name}: this device has a token of its own there. Now tap Link to my phone.':
    'Sesión iniciada como {name}: este dispositivo tiene ahí un token propio. Ahora toca «Vincular a mi teléfono».',
  'Link a computer to this phone': 'Vincular un ordenador a este teléfono',
  "On the computer, open Settings → Data and devices → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'En el ordenador, abre «Ajustes → Datos y dispositivos → Dispositivos vinculados → Vincular a mi teléfono». Luego escanea su código con la cámara de este teléfono, o cópialo ahí y pégalo aquí.',
  'Code from the computer': 'Código del ordenador',
  Next: 'Siguiente',
  'Link to my phone': 'Vincular a mi teléfono',
  'The phone read the code. Does it show this one too?': 'El teléfono ha leído el código. ¿Muestra también este?',
  'They match': 'Coinciden',
  'They differ': 'No coinciden',
  'On the phone that holds the account, scan this code with the camera, or paste it in Settings → Data and devices → Linked devices. This space must have no chats of its own.':
    'En el teléfono que tiene la cuenta, escanea este código con la cámara, o pégalo en «Ajustes → Datos y dispositivos → Dispositivos vinculados». Este espacio no debe tener chats propios.',
  'Copy the code': 'Copiar el código',
  'Share the code': 'Compartir el código',
  'Waiting for the phone. The code works for half an hour.': 'Esperando al teléfono. El código vale durante media hora.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Usa esto cuando este dispositivo sea el ordenador: sus chats pasan a ser los del teléfono que tiene la cuenta.',
  'The phone answers on a queue of this device on a relay: the one the phone uses, or any other. If the relay asks for a token, sign in when it offers that, or type one.':
    'El teléfono responde en una cola de este dispositivo en un relay: el que usa el teléfono, u otro cualquiera. Si el relay pide un token, inicia sesión cuando lo ofrezca, o escribe uno.',
  'Name of this device': 'Nombre de este dispositivo',
  'Tap Link to my phone, and a QR code for the phone shows here.': 'Toca «Vincular a mi teléfono» y aquí aparece un código QR para el teléfono.',
};
