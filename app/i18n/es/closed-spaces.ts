// The Spanish of a closed space that says a message came while another is open (app/security.tsx,
// lib/closed-notices.ts), and of a message that came or went through Nostr (app/chat.tsx) (i18n/es/index.ts).
export const closedSpaces: Record<string, string> = {
  'Went through Nostr.': 'Enviado por Nostr.',
  'Came through Nostr.': 'Llegó por Nostr.',
  'This space only while open': 'Este espacio solo mientras está abierto',
  'Also while another space is open': 'También mientras otro espacio está abierto',
  'While another space is open, this one says only "New message", as that one does, never which space; its hidden chats say nothing then. For it the phone keeps the addresses of its queues at its relay outside its password, never its keys, contacts or messages, and its relay may tell that the two spaces are on one phone. Through Tor, if this space goes through Tor, and only while the open one has Tor ready.': 'Mientras otro espacio está abierto, este dice solo «Mensaje nuevo», como aquel, nunca qué espacio; sus chats ocultos no dicen nada entonces. Para ello el teléfono guarda las direcciones de sus colas en su relay fuera de su contraseña, nunca sus claves, contactos ni mensajes, y su relay puede saber que los dos espacios están en un mismo teléfono. Por Tor, si este espacio va por Tor, y solo mientras el abierto tiene Tor listo.',
  'Closed, this space receives nothing: its messages wait at its relay and come when it opens.': 'Cerrado, este espacio no recibe nada: sus mensajes esperan en su relay y llegan cuando se abre.',
  'This space has no queue at a relay yet: it can say nothing while closed.': 'Este espacio aún no tiene una cola en un relay: cerrado no puede decir nada.',
  'Tor is not ready.': 'Tor no está listo.',
};
