// Τα ελληνικά του αντιγράφου σε server (lib/backup-cloud.ts, app/backup.tsx, Ρυθμίσεις →
// Δεδομένα και συσκευές → Αντίγραφα ασφαλείας) (i18n/el/index.ts).
export const cloudBackup: Record<string, string> = {
  'Made a backup in {folder}, but it did not go to the server. {error}': 'Έγινε αντίγραφο στο {folder}, αλλά δεν πήγε στον server. {error}',
  'Made a backup in {folder} and sent it to {server}.': 'Έγινε αντίγραφο στο {folder} και στάλθηκε στο {server}.',
  'Stop sending to the server': 'Τέλος η αποστολή στον server',
  'Automatic backups will go only to the folder from now on. Those already on the server stay there until you delete them.':
    'Τα αυτόματα αντίγραφα θα πηγαίνουν από τώρα μόνο στον φάκελο. Όσα είναι ήδη στον server μένουν εκεί μέχρι να τα σβήσεις.',
  'Backups no longer go to the server.': 'Τα αντίγραφα δεν πηγαίνουν πια στον server.',
  'To a server too': 'Και σε server',
  'To {server}': 'Στο {server}',
  'Last one sent {when}.': 'Το τελευταίο στάλθηκε {when}.',
  'None sent yet.': 'Δεν έχει σταλεί κανένα ακόμα.',
  'Each automatic backup goes there too, and the server keeps the {n} newest.': 'Κάθε αυτόματο αντίγραφο πηγαίνει και εκεί, και ο server κρατά τα {n} πιο πρόσφατα.',
  'The last one did not go: {error} Erevos tries again next time it opens.': 'Το τελευταίο δεν πήγε: {error} Το Erevos ξαναδοκιμάζει την επόμενη φορά που θα ανοίξει.',
  'Stop sending': 'Τέλος η αποστολή',
  'Folder address (WebDAV)': 'Διεύθυνση φακέλου (WebDAV)',
  'In Nextcloud: Files → Files settings → WebDAV gives the start; add a folder you made for backups, like …/remote.php/dav/files/NAME/Backups':
    'Στο Nextcloud: Αρχεία → Ρυθμίσεις αρχείων → WebDAV δίνει την αρχή· πρόσθεσε έναν φάκελο που έφτιαξες για τα αντίγραφα, π.χ. …/remote.php/dav/files/ΟΝΟΜΑ/Backups',
  'User name': 'Όνομα χρήστη',
  "Best an app password made for Erevos alone, in the server's security settings: you can take it back there without changing your own.":
    'Καλύτερα ένας κωδικός εφαρμογής μόνο για το Erevos, από τις ρυθμίσεις ασφαλείας του server: τον παίρνεις πίσω από εκεί χωρίς να αλλάξεις τον δικό σου.',
  'Add a server': 'Προσθήκη server',
  'That is not a folder address. It starts with https://': 'Αυτό δεν είναι διεύθυνση φακέλου. Αρχίζει με https://',
  'The address has to start with https://, so the password and backups go encrypted.':
    'Η διεύθυνση πρέπει να αρχίζει με https://, ώστε ο κωδικός και τα αντίγραφα να πηγαίνουν κρυπτογραφημένα.',
  'Put the user name and password in their own fields, not in the address.': 'Βάλε το όνομα χρήστη και τον κωδικό στα δικά τους πεδία, όχι στη διεύθυνση.',
  'The server did not take that user name and password.': 'Ο server δεν δέχτηκε αυτό το όνομα χρήστη και τον κωδικό.',
  'That folder is not on the server. Make it there first.': 'Αυτός ο φάκελος δεν υπάρχει στον server. Φτιάξ’ τον εκεί πρώτα.',
  'The server has no room left for it.': 'Ο server δεν έχει άλλο χώρο γι’ αυτό.',
  'The server answered {status}.': 'Ο server απάντησε {status}.',
  'Could not reach the server. {error}': 'Δεν βρέθηκε ο server. {error}',
  "Each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. The server gets random bytes under a random name: it cannot open them or tell they are Erevos's. It still sees your account, when one comes and roughly how big it is, and your address unless the backup goes through Tor, as the space's Tor setting says. Nothing goes until you add one.":
    "Κάθε αυτόματο αντίγραφο μπορεί να πηγαίνει και σε έναν φάκελο σε server που διαλέγεις εσύ, όπως το Nextcloud σου, μέσω WebDAV. Ο server παίρνει τυχαία bytes με τυχαίο όνομα: δεν μπορεί να τα ανοίξει ούτε να καταλάβει ότι είναι του Erevos. Βλέπει όμως τον λογαριασμό σου, πότε έρχεται ένα και περίπου πόσο μεγάλο είναι, και τη διεύθυνσή σου, εκτός αν το αντίγραφο πηγαίνει μέσω Tor, όπως λέει η ρύθμιση Tor του χώρου. Τίποτα δεν στέλνεται μέχρι να προσθέσεις server.",
  "This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.":
    "Αυτός ο χώρος στέλνει τα Όλα μέσω Tor, και το Tor εδώ δεν μπορεί να φτάσει σε server, οπότε δεν πήγε τίποτα.",
  "Through Tor: the server does not see your address.":
    "Μέσω Tor: ο server δεν βλέπει τη διεύθυνσή σου.",
  "Not through Tor now: the server sees your address. Tor is under Settings → Relay and networks → Tor.":
    "Όχι μέσω Tor τώρα: ο server βλέπει τη διεύθυνσή σου. Το Tor είναι στις Ρυθμίσεις → Relay και δίκτυα → Tor.",
  "There is no Erevos backup in that folder.":
    "Δεν υπάρχει αντίγραφο του Erevos σε αυτόν τον φάκελο.",
  "Restore from a server":
    "Επαναφορά από server",
  "The folder on your server that automatic backups went to. The password is used for this restore only and not kept.":
    "Ο φάκελος στον server σου όπου πήγαιναν τα αυτόματα αντίγραφα. Ο κωδικός χρησιμοποιείται μόνο για αυτή την επαναφορά και δεν κρατιέται.",
  "Look there":
    "Αναζήτηση εκεί",
  "Backups on {server}, newest first. Choose one, then type its password.":
    "Αντίγραφα στο {server}, τα νεότερα πρώτα. Διάλεξε ένα και μετά γράψε τον κωδικό του.",
};
