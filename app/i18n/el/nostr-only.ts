// The Greek of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/el/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Κανένας relay Nostr δεν το πήρε: {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers, reactions, photos, files and voice messages go through Nostr, over Tor; calls need a relay or their phone nearby.': 'Η επαφή προστέθηκε. Τα μηνύματα προς αυτήν είναι κρυπτογραφημένα από άκρο σε άκρο. Σύγκρινε τον αριθμό ασφαλείας με τον δικό τους. Χωρίς relay ανάμεσά σας, κείμενα, αυτοκόλλητα, αντιδράσεις, φωτογραφίες, αρχεία και φωνητικά μηνύματα πηγαίνουν μέσω Nostr, μέσω Tor; οι κλήσεις χρειάζονται relay ή το κινητό τους κοντά.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Ο/η {name} σού έδωσε μόνο του/της μια θέση στο relay του/της. Φωτογραφίες, φωνητικά μηνύματα και κλήσεις πηγαίνουν τώρα κι αυτά, με όλους.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Μια επαφή σού έδωσε μόνη της μια θέση στο relay της. Φωτογραφίες, φωνητικά μηνύματα και κλήσεις πηγαίνουν τώρα κι αυτά, με όλους.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'Ήρθε πρόσκληση στο relay μιας επαφής, αλλά δεν πάρθηκε. {error}',
  'Sticker sent through Nostr, end-to-end encrypted.': 'Το αυτοκόλλητο στάλθηκε μέσω Nostr, κρυπτογραφημένο από άκρο σε άκρο.',
  'Photo sent through Nostr, end-to-end encrypted.': 'Η φωτογραφία στάλθηκε μέσω Nostr, κρυπτογραφημένη από άκρο σε άκρο.',
  'File sent through Nostr, end-to-end encrypted.': 'Το αρχείο στάλθηκε μέσω Nostr, κρυπτογραφημένο από άκρο σε άκρο.',
  'Photos and files go through Nostr, which cannot be reached.': 'Οι φωτογραφίες και τα αρχεία πηγαίνουν μέσω Nostr, που δεν είναι προσιτό αυτή τη στιγμή.',
  'The photo waits, and goes by itself once Nostr can take it.': 'Η φωτογραφία περιμένει και φεύγει μόνη της μόλις το Nostr μπορέσει να την πάρει.',
  'The file waits, and goes by itself once Nostr can take it.': 'Το αρχείο περιμένει και φεύγει μόνο του μόλις το Nostr μπορέσει να το πάρει.',
  '{have} of {count} pieces of the photo have come.': 'Ήρθαν {have} από τα {count} κομμάτια της φωτογραφίας.',
  'With no relay, files can be {size} MB at most.': 'Χωρίς relay, τα αρχεία μπορούν να είναι έως {size} MB.',
  'No Nostr relay or file server took it: {reason}': 'Κανένας relay Nostr ή server αρχείων δεν το πήρε: {reason}',
};
