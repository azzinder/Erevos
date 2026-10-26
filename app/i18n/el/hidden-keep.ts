// The Greek of hidden chats that receive while they are closed (lock/hidden-keep.ts,
// lib/place-receiver.ts, the toggle at the top of an open place in app/chat.tsx) (i18n/el/index.ts).
export const hiddenKeep: Record<string, string> = {
  'Receive while closed': 'Λήψη όσο είναι κλειστές',
  'Closed, these hidden chats receive as your other chats do: their contacts see at once that a message came, a notice says only "New message", and a call rings with no name, answered with the PIN. For it, their key is kept encrypted with the space, so whoever opens the space and copies what the phone keeps could open them too; the PIN still keeps them out of sight.':
    'Κλειστές, αυτές οι κρυφές συνομιλίες λαμβάνουν όπως οι άλλες συνομιλίες σου: οι επαφές τους βλέπουν αμέσως ότι ένα μήνυμα έφτασε, μια ειδοποίηση λέει μόνο «Νέο μήνυμα», και μια κλήση χτυπά χωρίς όνομα και απαντιέται με το PIN. Γι’ αυτό το κλειδί τους φυλάγεται κρυπτογραφημένο μαζί με τον χώρο, οπότε όποιος ανοίξει τον χώρο και αντιγράψει ό,τι κρατά το τηλέφωνο θα μπορούσε να τις ανοίξει κι αυτός· το PIN εξακολουθεί να τις κρατά κρυμμένες.',
  'Closed, nothing reads these hidden chats: their key is only behind the PIN, and their messages wait on the relay until you open them.':
    'Κλειστές, τίποτα δεν διαβάζει αυτές τις κρυφές συνομιλίες: το κλειδί τους είναι μόνο πίσω από το PIN, και τα μηνύματά τους περιμένουν στο relay μέχρι να τις ανοίξεις.',
};
