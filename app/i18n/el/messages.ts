// The Greek of what a chat's messages can do beyond words: replies, reactions, links, forwarding and the like (i18n/el/index.ts).
export const messages: Record<string, string> = {
  'Open this link?': 'Να ανοίξει αυτός ο σύνδεσμος;',
  // A message's menu (components/message-menu.tsx), replies and reactions.
  'Take back {emoji}': 'Πάρε πίσω το {emoji}',
  'React with {emoji}': 'Αντίδραση με {emoji}',
  'More reactions': 'Περισσότερες αντιδράσεις',
  'Goes to the message it answers': 'Πηγαίνει στο μήνυμα που απαντά',
  'The message is not on this phone.': 'Το μήνυμα δεν είναι σε αυτό το τηλέφωνο.',
  'Reactions: {list}': 'Αντιδράσεις: {list}',
  'That message is not on this phone.': 'Αυτό το μήνυμα δεν είναι σε αυτό το τηλέφωνο.',
  'Copied. Any app that reads the clipboard can read it now.': 'Αντιγράφηκε. Όποια εφαρμογή διαβάζει το πρόχειρο μπορεί πλέον να το διαβάσει.',
  'Not copied.': 'Δεν αντιγράφηκε.',
  Reply: 'Απάντηση',
  Copy: 'Αντιγραφή',
  'Tap to play, hold for more': 'Πάτα για αναπαραγωγή, κράτα πατημένο για περισσότερα',
  'Tap to open, hold for more': 'Πάτα για άνοιγμα, κράτα πατημένο για περισσότερα',
  'Hold for more': 'Κράτα πατημένο για περισσότερα',
  // Pinned messages (components/message-parts.tsx, Pinned).
  Pin: 'Καρφίτσωμα',
  Unpin: 'Ξεκαρφίτσωμα',
  Pinned: 'Καρφιτσωμένο',
  'Pinned, {n} of {count}': 'Καρφιτσωμένο, {n} από {count}',
  'Goes to the pinned message': 'Πηγαίνει στο καρφιτσωμένο μήνυμα',
  // Starred messages (app/starred.tsx, and a chat's details).
  Star: 'Αστέρι',
  Unstar: 'Χωρίς αστέρι',
  'Starred messages': 'Μηνύματα με αστέρι',
  'The messages you starred, in all your chats': 'Τα μηνύματα που σημείωσες με αστέρι, σε όλες τις συνομιλίες σου',
  'No starred messages. Press and hold a message in a chat, then tap Star.':
    'Κανένα μήνυμα με αστέρι. Κράτα πατημένο ένα μήνυμα σε μια συνομιλία και πάτα Αστέρι.',
  'You to {name}': 'Εσύ προς {name}',
};
