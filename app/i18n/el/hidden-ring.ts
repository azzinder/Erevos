// The Greek of hidden chats that ring their contacts' calls while they are closed
// (lock/hidden-ring.ts, components/hidden-ring-screen.tsx, the toggle in app/chat.tsx) (i18n/el/index.ts).
export const hiddenRing: Record<string, string> = {
  // The toggle at the top of an open hidden place, and what it says.
  'Ring calls when closed': 'Χτύπημα κλήσεων όταν είναι κλειστές',
  'While these hidden chats are closed and Erevos is in the background, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.':
    'Όσο αυτές οι κρυφές συνομιλίες είναι κλειστές και το Erevos είναι στο παρασκήνιο, μια κλήση από μια επαφή τους κάνει το τηλέφωνο να χτυπήσει και να δείξει «Εισερχόμενη κλήση» χωρίς όνομα. Στην οθόνη της κλήσης, πάτα το μικρό σημάδι και πληκτρολόγησε το PIN για να απαντήσεις. Όποιος κρατά το τηλέφωνο βλέπει μια κλήση που δεν υπάρχει σε καμία από τις συνομιλίες σου, και μπορεί να υποψιαστεί ότι υπάρχουν κι άλλες.',
  'Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.':
    'Κλειστές, αυτές οι κρυφές συνομιλίες δεν χτυπούν: μια κλήση από τις επαφές τους χτυπά μόνο όσο είναι ανοιχτές.',
  // The ring screen's PIN field (components/hidden-ring-screen.tsx).
  PIN: 'PIN',
  Connect: 'Σύνδεση',
};
