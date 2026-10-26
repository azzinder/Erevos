// The Spanish of hidden chats that receive while they are closed (lock/hidden-keep.ts,
// lib/place-receiver.ts, the toggle at the top of an open place in app/chat.tsx) (i18n/es/index.ts).
export const hiddenKeep: Record<string, string> = {
  'Receive while closed': 'Recibir estando cerrados',
  'Closed, these hidden chats receive as your other chats do: their contacts see at once that a message came, a notice says only "New message", and a call rings with no name, answered with the PIN. For it, their key is kept encrypted with the space, so whoever opens the space and copies what the phone keeps could open them too; the PIN still keeps them out of sight.':
    'Cerrados, estos chats ocultos reciben como tus otros chats: sus contactos ven al instante que un mensaje llegó, un aviso dice solo «New message», y una llamada suena sin nombre y se contesta con el PIN. Para ello, su clave se guarda cifrada con el espacio, así que quien abra el espacio y copie lo que guarda el teléfono también podría abrirlos; el PIN los sigue manteniendo fuera de la vista.',
  'Closed, nothing reads these hidden chats: their key is only behind the PIN, and their messages wait on the relay until you open them.':
    'Cerrados, nada lee estos chats ocultos: su clave está solo tras el PIN, y sus mensajes esperan en el relay hasta que los abras.',
};
