// The French of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/fr/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Aucun relais Nostr ne l’a pris : {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers and reactions go through Nostr, over Tor; photos, voice messages and calls need a relay or their phone nearby.': 'Contact ajouté. Les messages qui lui sont envoyés sont chiffrés de bout en bout. Compare le numéro de sécurité avec le sien. Sans relais entre vous, les textes, autocollants et réactions passent par Nostr, via Tor ; les photos, messages vocaux et appels demandent un relais ou son téléphone à proximité.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': '{name} t’a donné de lui-même une place sur son relais. Les photos, messages vocaux et appels passent maintenant aussi par là, avec tout le monde.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Un contact t’a donné de lui-même une place sur son relais. Les photos, messages vocaux et appels passent maintenant aussi par là, avec tout le monde.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'Une invitation au relais d’un contact est arrivée, mais elle n’a pas été prise. {error}',
};
