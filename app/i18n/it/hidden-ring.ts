// L'italiano delle chat nascoste che fanno squillare le chiamate dei loro contatti mentre sono
// chiuse (lock/hidden-ring.ts, components/hidden-ring-screen.tsx, l'interruttore in app/chat.tsx)
// (i18n/it/index.ts).
export const hiddenRing: Record<string, string> = {
  'Ring calls when closed': 'Fai squillare le chiamate quando sono chiuse',
  'While these hidden chats are closed and Erevos is in the background, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.':
    'Finché queste chat nascoste sono chiuse ed Erevos è in background, una chiamata da uno dei loro contatti fa squillare il telefono e mostra «Chiamata in arrivo» senza nome. Nella schermata della chiamata, tocca il piccolo segno e digita il PIN per rispondere. Chi tiene il telefono vede una chiamata che non è in nessuna delle tue chat, e può intuire che ce ne sono altre.',
  'Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.':
    'Chiuse, queste chat nascoste non squillano: una chiamata dai loro contatti squilla solo mentre sono aperte.',
  PIN: 'PIN',
  Connect: 'Connetti',
};
