// The Greek of a closed space that says a message came while another is open (app/security.tsx,
// lib/closed-notices.ts), and of a message that came or went through Nostr (app/chat.tsx) (i18n/el/index.ts).
export const closedSpaces: Record<string, string> = {
  'Went through Nostr.': 'Πήγε μέσω Nostr.',
  'Came through Nostr.': 'Ήρθε μέσω Nostr.',
  'This space only while open': 'Αυτός ο χώρος μόνο όταν είναι ανοιχτός',
  'Also while another space is open': 'Και όσο είναι ανοιχτός άλλος χώρος',
  'While another space is open, this one says only "New message", as that one does, never which space; its hidden chats say nothing then. For it the phone keeps the addresses of its queues at its relay outside its password, never its keys, contacts or messages, and its relay may tell that the two spaces are on one phone. Through Tor, if this space goes through Tor, and only while the open one has Tor ready.': 'Όσο είναι ανοιχτός άλλος χώρος, αυτός λέει μόνο «Νέο μήνυμα», όπως κι εκείνος, ποτέ ποιος χώρος· οι κρυφές του συνομιλίες δεν λένε τίποτα τότε. Γι’ αυτό το τηλέφωνο κρατά έξω από τον κωδικό του τις διευθύνσεις των ουρών του στο relay του, ποτέ τα κλειδιά, τις επαφές ή τα μηνύματά του, και το relay του μπορεί να καταλάβει ότι οι δύο χώροι είναι στο ίδιο τηλέφωνο. Μέσω Tor, αν αυτός ο χώρος πηγαίνει μέσω Tor, και μόνο όσο ο ανοιχτός έχει το Tor έτοιμο.',
  'Closed, this space receives nothing: its messages wait at its relay and come when it opens.': 'Κλειστός, αυτός ο χώρος δεν λαμβάνει τίποτα: τα μηνύματά του περιμένουν στο relay του και έρχονται όταν ανοίξει.',
  'This space has no queue at a relay yet: it can say nothing while closed.': 'Αυτός ο χώρος δεν έχει ακόμη ουρά σε relay: κλειστός δεν μπορεί να πει τίποτα.',
  'Tor is not ready.': 'Το Tor δεν είναι έτοιμο.',
};
