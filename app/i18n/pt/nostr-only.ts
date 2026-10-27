// The Portuguese of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/pt/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Nenhum relay Nostr o aceitou: {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers and reactions go through Nostr, over Tor; photos, voice messages and calls need a relay or their phone nearby.': 'Contacto adicionado. As mensagens para ele são cifradas de ponta a ponta. Compara o número de segurança com o dele. Sem relay entre vocês, textos, autocolantes e reações vão pelo Nostr, através do Tor; fotos, mensagens de voz e chamadas precisam de um relay ou do telemóvel dele por perto.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': '{name} te deu por conta própria um lugar no relay dele. Fotos, mensagens de voz e chamadas também vão agora por lá, com todos.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Um contato te deu por conta própria um lugar no relay dele. Fotos, mensagens de voz e chamadas também vão agora por lá, com todos.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'Chegou um convite para o relay de um contato, mas não foi aceito. {error}',
};
