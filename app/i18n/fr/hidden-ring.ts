// Le français des discussions masquées qui font sonner les appels de leurs contacts pendant
// qu'elles sont fermées (lock/hidden-ring.ts, components/hidden-ring-screen.tsx, l'interrupteur
// dans app/chat.tsx) (i18n/fr/index.ts).
export const hiddenRing: Record<string, string> = {
  'Ring calls when closed': 'Faire sonner les appels quand elles sont fermées',
  'While these hidden chats are closed, with Erevos in the background or on any screen, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.':
    "Tant que ces discussions masquées sont fermées, avec Erevos en arrière-plan ou sur n'importe quel écran, un appel de l'un de leurs contacts fait sonner le téléphone et affiche « Incoming call » sans nom. Sur l'écran d'appel, touche le petit signe et saisis le code PIN pour répondre. Qui tient le téléphone voit un appel qui n'est dans aucune de tes discussions, et peut deviner qu'il y en a d'autres.",
  'Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.':
    "Fermées, ces discussions masquées ne sonnent pas : un appel de leurs contacts ne sonne que lorsqu'elles sont ouvertes.",
  'Nothing rings for now: it needs Receive and ring, under Settings → Notifications → In the background.':
    'Pour l’instant rien ne sonne : il faut « Recevoir et sonner », sous Réglages → Notifications → En arrière-plan.',
  PIN: 'PIN',
  Connect: 'Connecter',
};
