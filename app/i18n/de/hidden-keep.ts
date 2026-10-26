// The German of hidden chats that receive while they are closed (lock/hidden-keep.ts,
// lib/place-receiver.ts, the toggle at the top of an open place in app/chat.tsx) (i18n/de/index.ts).
export const hiddenKeep: Record<string, string> = {
  'Receive while closed': 'Empfangen, wenn geschlossen',
  'Closed, these hidden chats receive as your other chats do: their contacts see at once that a message came, a notice says only "New message", and a call rings with no name, answered with the PIN. For it, their key is kept encrypted with the space, so whoever opens the space and copies what the phone keeps could open them too; the PIN still keeps them out of sight.':
    'Geschlossen empfangen diese versteckten Chats wie deine anderen Chats: Ihre Kontakte sehen sofort, dass eine Nachricht ankam, eine Mitteilung sagt nur „New message“, und ein Anruf klingelt ohne Namen und wird mit der PIN angenommen. Dafür wird ihr Schlüssel verschlüsselt beim Bereich aufbewahrt, sodass, wer den Bereich öffnet und kopiert, was das Telefon speichert, sie ebenfalls öffnen könnte; die PIN hält sie weiterhin verborgen.',
  'Closed, nothing reads these hidden chats: their key is only behind the PIN, and their messages wait on the relay until you open them.':
    'Geschlossen liest nichts diese versteckten Chats: Ihr Schlüssel liegt nur hinter der PIN, und ihre Nachrichten warten auf dem Relay, bis du sie öffnest.',
};
