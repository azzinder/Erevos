// The German of a closed space that says a message came while another is open (app/security.tsx,
// lib/closed-notices.ts), and of a message that came or went through Nostr (app/chat.tsx) (i18n/de/index.ts).
export const closedSpaces: Record<string, string> = {
  'Went through Nostr.': 'Über Nostr gesendet.',
  'Came through Nostr.': 'Über Nostr gekommen.',
  'This space only while open': 'Dieser Bereich nur, wenn offen',
  'Also while another space is open': 'Auch, wenn ein anderer Bereich offen ist',
  'While another space is open, this one says only "New message", as that one does, never which space; its hidden chats say nothing then. For it the phone keeps the addresses of its queues at its relay outside its password, never its keys, contacts or messages, and its relay may tell that the two spaces are on one phone. Through Tor, if this space goes through Tor, and only while the open one has Tor ready.': 'Ist ein anderer Bereich offen, sagt dieser nur „Neue Nachricht“, wie jener, nie welcher Bereich; seine versteckten Chats sagen dann nichts. Dafür behält das Telefon die Adressen seiner Warteschlangen bei seinem Relay außerhalb seines Passworts, nie seine Schlüssel, Kontakte oder Nachrichten, und sein Relay kann erkennen, dass beide Bereiche auf einem Telefon sind. Über Tor, wenn dieser Bereich über Tor geht, und nur, solange der offene Tor bereit hat.',
  'Closed, this space receives nothing: its messages wait at its relay and come when it opens.': 'Geschlossen empfängt dieser Bereich nichts: Seine Nachrichten warten bei seinem Relay und kommen, wenn er sich öffnet.',
  'This space has no queue at a relay yet: it can say nothing while closed.': 'Dieser Bereich hat noch keine Warteschlange bei einem Relay: Geschlossen kann er nichts sagen.',
  'Tor is not ready.': 'Tor ist nicht bereit.',
};
