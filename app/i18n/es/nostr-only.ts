// The Spanish of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/es/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Ningún relay de Nostr lo aceptó: {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers and reactions go through Nostr, over Tor; photos, voice messages and calls need a relay or their phone nearby.': 'Contacto añadido. Los mensajes a él están cifrados de extremo a extremo. Compara el número de seguridad con el suyo. Sin relay entre vosotros, los textos, stickers y reacciones van por Nostr, a través de Tor; las fotos, los mensajes de voz y las llamadas necesitan un relay o su teléfono cerca.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': '{name} te dio por sí solo un sitio en su relay. Las fotos, los mensajes de voz y las llamadas ahora también van por ahí, con todos.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Un contacto te dio por sí solo un sitio en su relay. Las fotos, los mensajes de voz y las llamadas ahora también van por ahí, con todos.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'Llegó una invitación al relay de un contacto, pero no se aceptó. {error}',
};
