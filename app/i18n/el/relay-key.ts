// The Greek of a relay proving its own key (lib/relay.ts, Channels; components/relay-key-note.tsx) (i18n/el/index.ts).
export const relayKey: Record<string, string> = {
  "✓ Your relay proved its own key: no one in between can pass for it.": "✓ Το relay σου απέδειξε το δικό του κλειδί: κανείς ενδιάμεσος δεν μπορεί να περάσει για αυτό.",
  "Your relay does not prove its own key yet: it is older than this app. It works as before; once its operator updates it, Erevos checks its key every time.": "Το relay σου δεν αποδεικνύει ακόμη το δικό του κλειδί: είναι παλαιότερο από αυτή την εφαρμογή. Λειτουργεί όπως πριν· μόλις το ενημερώσει ο διαχειριστής του, το Erevos ελέγχει το κλειδί του κάθε φορά.",
  "Forget the key kept for this relay?": "Να ξεχαστεί το κλειδί που κρατά το Erevos για αυτό το relay;",
  "Only when its operator told you it has a new key. Erevos then takes the key the relay gives next, and checks it every time from then on.": "Μόνο αν ο διαχειριστής του σού είπε ότι έχει νέο κλειδί. Τότε το Erevos παίρνει το κλειδί που θα δώσει το relay την επόμενη φορά και το ελέγχει κάθε φορά από εκεί και πέρα.",
  "Forget it": "Να ξεχαστεί",
  "Your relay did not prove the key Erevos keeps for it: someone may be in between, or it has a new key. Nothing goes to it until it proves it; your messages wait.": "Το relay σου δεν απέδειξε το κλειδί που κρατά το Erevos για αυτό: μπορεί να είναι κάποιος στη μέση ή να έχει νέο κλειδί. Τίποτα δεν πηγαίνει σε αυτό μέχρι να το αποδείξει· τα μηνύματά σου περιμένουν.",
  "It has a new key": "Έχει νέο κλειδί",
  "the relay at {url} did not prove its key: someone may be in between, or the relay has a new key": "το relay στο {url} δεν απέδειξε το κλειδί του: μπορεί να είναι κάποιος στη μέση ή το relay να έχει νέο κλειδί",
  "the relay sent what its channel does not hold": "το relay έστειλε κάτι που δεν ανήκει στο κανάλι του",
  "the relay has no channel": "το relay δεν έχει κανάλι",
};
