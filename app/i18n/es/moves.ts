// The Spanish of a relay queue that moves on a deletion, a block or junk (lib/queue-move.ts), and of
// deleting and blocking a contact in chat details (app/chat.tsx), as in i18n/el/moves.ts.
export const moves: Record<string, string> = {
  // Chat details: deleting and blocking.
  'Block contact': 'Bloquear contacto',
  'Delete {name}? Your chat with them goes from this phone. Erevos gives you a new relay queue and tells your other contacts quietly, so {name} can no longer write to you. With your contact link they can still ask to talk again.':
    '¿Eliminar a {name}? Tu chat con esta persona se borra de este teléfono. Erevos te da una nueva cola en el relay y se la comunica en silencio a tus otros contactos, para que {name} ya no pueda escribirte. Con tu enlace de contacto aún puede pedirte volver a hablar.',
  'Block {name}? As with deleting, and what they send later is dropped, a request too. You can unblock them under Blocked contacts.':
    '¿Bloquear a {name}? Como al eliminar, y además lo que envíe después se descarta, también una solicitud. Puedes desbloquear en «Contactos bloqueados».',
  '{name} is deleted. Your other contacts learn your new queue as soon as the relay answers.':
    'Has eliminado a {name}. Tus otros contactos conocerán tu nueva cola en cuanto responda el relay.',
  '{name} is blocked. Your other contacts learn your new queue as soon as the relay answers.':
    'Has bloqueado a {name}. Tus otros contactos conocerán tu nueva cola en cuanto responda el relay.',
  'The relay could not be reached, so your queue changes as soon as it can. Until then {name} can still write to it, but nothing they send shows.':
    'No se pudo contactar con el relay, así que tu cola cambiará en cuanto se pueda. Hasta entonces {name} aún puede escribir en ella, pero nada de lo que envíe se mostrará.',
  '{name} is still in one of your groups, and can write to you there. Leave it, or ask its admin to take them out.':
    '{name} sigue en uno de tus grupos y puede escribirte allí. Sal del grupo o pide a quien lo administra que saque a {name}.',
  '{name} is still in {n} of your groups, and can write to you there. Leave them, or ask their admins to take {name} out.':
    '{name} sigue en {n} de tus grupos y puede escribirte allí. Sal de ellos o pide a quienes los administran que saquen a {name}.',
  // Relay and new contacts: a new contact link, and who is blocked.
  'New contact link': 'Nuevo enlace de contacto',
  'Make a new contact link? The links and QR codes you gave before work until {date}, then no more. Your contacts are not affected.':
    '¿Crear un nuevo enlace de contacto? Los enlaces y códigos QR que diste antes funcionan hasta el {date} y después ya no. Tus contactos no se ven afectados.',
  'You have a new contact link. The links and QR codes you gave before work until {date}.':
    'Tienes un nuevo enlace de contacto. Los enlaces y códigos QR que diste antes funcionan hasta el {date}.',
  'Create your relay queue first, under Relay and new contacts.': 'Crea primero tu cola en el relay, en «Relay y contactos nuevos».',
  'Blocked contacts': 'Contactos bloqueados',
  'No one is blocked.': 'No hay nadie bloqueado.',
  // What a move says once it is made.
  'Junk filled your relay queue, so Erevos gave you a new one and told your contacts. Whoever sent it does not know the new one.':
    'La basura llenó tu cola del relay, así que Erevos te dio una nueva y avisó a tus contactos. Quien la enviaba no conoce la nueva.',
  'Junk comes to your new queue too, so one of your contacts or the relay sends it. Erevos does not change it again before tomorrow.':
    'También llega basura a tu nueva cola, así que la envía uno de tus contactos o el propio relay. Erevos no la cambiará otra vez antes de mañana.',
  'Junk filled the queue your contact link names, so you have a new link. The links and QR codes you gave before work until {date}.':
    'La basura llenó la cola que indica tu enlace de contacto, así que tienes un enlace nuevo. Los enlaces y códigos QR que diste antes funcionan hasta el {date}.',
  'The relay had lost your queue, so you have a new one. Your contacts are told quietly.':
    'El relay había perdido tu cola, así que tienes una nueva. Se avisa a tus contactos en silencio.',
};
