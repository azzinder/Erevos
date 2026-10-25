// The Greek of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/el/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Κανένας relay Nostr δεν το πήρε: {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers and reactions go through Nostr, over Tor; photos, voice messages and calls need a relay or their phone nearby.': 'Η επαφή προστέθηκε. Τα μηνύματα προς αυτήν είναι κρυπτογραφημένα από άκρο σε άκρο. Σύγκρινε τον αριθμό ασφαλείας με τον δικό τους. Χωρίς relay ανάμεσά σας, κείμενα, αυτοκόλλητα και αντιδράσεις πηγαίνουν μέσω Nostr, μέσω Tor· φωτογραφίες, φωνητικά μηνύματα και κλήσεις χρειάζονται relay ή το κινητό τους κοντά.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Ο/η {name} σού έδωσε μόνο του/της μια θέση στο relay του/της. Φωτογραφίες, φωνητικά μηνύματα και κλήσεις πηγαίνουν τώρα κι αυτά, με όλους.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Μια επαφή σού έδωσε μόνη της μια θέση στο relay της. Φωτογραφίες, φωνητικά μηνύματα και κλήσεις πηγαίνουν τώρα κι αυτά, με όλους.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'Ήρθε πρόσκληση στο relay μιας επαφής, αλλά δεν πάρθηκε. {error}',
};
