// The French of hidden chats that receive while they are closed (lock/hidden-keep.ts,
// lib/place-receiver.ts, the toggle at the top of an open place in app/chat.tsx) (i18n/fr/index.ts).
export const hiddenKeep: Record<string, string> = {
  'Receive while closed': 'Recevoir une fois fermées',
  'Closed, these hidden chats receive as your other chats do: their contacts see at once that a message came, a notice says only "New message", and a call rings with no name, answered with the PIN. For it, their key is kept encrypted with the space, so whoever opens the space and copies what the phone keeps could open them too; the PIN still keeps them out of sight.':
    "Fermées, ces discussions masquées reçoivent comme tes autres discussions : leurs contacts voient aussitôt qu'un message est arrivé, une notification dit seulement « New message », et un appel sonne sans nom et se prend avec le code PIN. Pour cela, leur clé est gardée chiffrée avec l'espace, si bien que qui ouvre l'espace et copie ce que garde le téléphone pourrait les ouvrir aussi ; le code PIN les garde toujours hors de vue.",
  'Closed, nothing reads these hidden chats: their key is only behind the PIN, and their messages wait on the relay until you open them.':
    "Fermées, rien ne lit ces discussions masquées : leur clé n'est que derrière le code PIN, et leurs messages attendent sur le relais jusqu'à ce que tu les ouvres.",
};
