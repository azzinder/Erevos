// Das Deutsche für versteckte Chats, die Anrufe ihrer Kontakte klingeln lassen, während sie
// geschlossen sind (lock/hidden-ring.ts, components/hidden-ring-screen.tsx, der Schalter in
// app/chat.tsx) (i18n/de/index.ts).
export const hiddenRing: Record<string, string> = {
  'Ring calls when closed': 'Klingeln bei Anrufen, wenn geschlossen',
  'While these hidden chats are closed and Erevos is in the background, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.':
    'Solange diese versteckten Chats geschlossen sind und Erevos im Hintergrund läuft, lässt ein Anruf von einem ihrer Kontakte das Telefon klingeln und zeigt „Eingehender Anruf“ ohne Namen. Tippe auf dem Anrufbildschirm auf das kleine Zeichen und gib die PIN ein, um abzunehmen. Wer das Telefon hält, sieht einen Anruf, der in keinem deiner Chats steht, und kann ahnen, dass es mehr gibt.',
  'Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.':
    'Geschlossen klingeln diese versteckten Chats nicht: ein Anruf von ihren Kontakten klingelt nur, solange sie geöffnet sind.',
  PIN: 'PIN',
  Connect: 'Verbinden',
};
