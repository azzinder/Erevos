// The French of a closed space that says a message came while another is open (app/security.tsx,
// lib/closed-notices.ts), and of a message that came or went through Nostr (app/chat.tsx) (i18n/fr/index.ts).
export const closedSpaces: Record<string, string> = {
  'Went through Nostr.': 'Envoyé par Nostr.',
  'Came through Nostr.': 'Arrivé par Nostr.',
  'This space only while open': 'Cet espace seulement quand il est ouvert',
  'Also while another space is open': 'Aussi quand un autre espace est ouvert',
  'While another space is open, this one says only "New message", as that one does, never which space; its hidden chats say nothing then. For it the phone keeps the addresses of its queues at its relay outside its password, never its keys, contacts or messages, and its relay may tell that the two spaces are on one phone. Through Tor, if this space goes through Tor, and only while the open one has Tor ready.': 'Quand un autre espace est ouvert, celui-ci dit seulement « Nouveau message », comme celui-là, jamais quel espace ; ses discussions masquées ne disent rien alors. Pour cela le téléphone garde les adresses de ses files sur son relais hors de son mot de passe, jamais ses clés, ses contacts ou ses messages, et son relais peut savoir que les deux espaces sont sur un même téléphone. Par Tor, si cet espace passe par Tor, et seulement tant que l’espace ouvert a Tor prêt.',
  'Closed, this space receives nothing: its messages wait at its relay and come when it opens.': 'Fermé, cet espace ne reçoit rien : ses messages attendent sur son relais et arrivent quand il s’ouvre.',
  'This space has no queue at a relay yet: it can say nothing while closed.': 'Cet espace n’a pas encore de file sur un relais : fermé, il ne peut rien dire.',
  'Tor is not ready.': 'Tor n’est pas prêt.',
};
