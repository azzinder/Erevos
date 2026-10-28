// Τα ελληνικά του αριθμού στο εικονίδιο του Erevos (lib/icon-number.ts, ο διακόπτης στο
// app/security.tsx, Ρυθμίσεις → Ειδοποιήσεις) (i18n/el/index.ts).
export const iconNumber: Record<string, string> = {
  'Number on the icon': 'Αριθμός στο εικονίδιο',
  "How many messages are not read, on Erevos's icon": 'Πόσα μηνύματα δεν έχεις διαβάσει, στο εικονίδιο του Erevos',
  'Show the number': 'Να φαίνεται ο αριθμός',
  'No number': 'Χωρίς αριθμό',
  "Where the browser can show it (an iPhone's or iPad's home screen, a Mac's Dock, Chrome or Edge installed on a computer), Erevos's icon shows how many messages the space you had open has not read, and those that came since, never a hidden chat's. Only for a space with notifications while closed on. The number stays while Erevos is closed: one that does not match the space you open may hint at another. For every space on this device.":
    'Όπου ο browser μπορεί να το δείξει (στην αρχική οθόνη ενός iPhone ή iPad, στο Dock ενός Mac, στο Chrome ή στο Edge εγκατεστημένο σε υπολογιστή), το εικονίδιο του Erevos δείχνει πόσα μηνύματα δεν έχει διαβάσει ο χώρος που είχες ανοιχτό, και όσα ήρθαν μετά, ποτέ μιας κρυφής συνομιλίας. Μόνο για χώρο με ενεργές τις ειδοποιήσεις όταν είναι κλειστό. Ο αριθμός μένει όσο το Erevos είναι κλειστό: αν δεν ταιριάζει με τον χώρο που ανοίγεις, μπορεί να προδώσει άλλον. Ισχύει για κάθε χώρο αυτής της συσκευής.',
  "Erevos's icon shows no number.": 'Το εικονίδιο του Erevos δεν δείχνει αριθμό.',
  // On Android, from the messages notice (lib/background.ts).
  "When you leave Erevos with messages not read in the open space's chats and groups, a notice without sound says how many, and counts on with those it tells of after, until you read them. Muted chats and hidden ones are not counted as you leave. The phone's launcher shows it on Erevos's icon: as a number, or on some phones, such as Pixels, as a dot. Only with Say a message came, under In the background. For every space on this phone.":
    "Όταν φεύγεις από το Erevos με αδιάβαστα μηνύματα στις συνομιλίες και τις ομάδες του ανοιχτού χώρου, μια ειδοποίηση χωρίς ήχο λέει πόσα είναι, και μετρά και όσα πει μετά, μέχρι να τα διαβάσεις. Οι συνομιλίες σε σίγαση και οι κρυφές δεν μετρούν τη στιγμή που φεύγεις. Ο launcher του τηλεφώνου τη δείχνει στο εικονίδιο του Erevos: ως αριθμό, ή σε κάποια τηλέφωνα, όπως τα Pixel, ως τελεία. Μόνο με την Ειδοποίηση για μηνύματα, στο Στο παρασκήνιο. Ισχύει για κάθε χώρο αυτού του τηλεφώνου.",
  "Erevos's icon keeps no number of its own: the launcher shows one only while the notice tells of messages that came since you last had Erevos open.":
    "Το εικονίδιο του Erevos δεν κρατά δικό του αριθμό: ο launcher δείχνει αριθμό μόνο όσο η ειδοποίηση λέει για μηνύματα που ήρθαν από την τελευταία φορά που είχες ανοιχτό το Erevos.",
  // The card that turns notifications on (components/integrity-card.tsx).
  "Where the browser can show it, Erevos's icon then also shows how many messages this space has not read, unless turned off under Number on the icon.":
    'Όπου ο browser μπορεί να το δείξει, το εικονίδιο του Erevos δείχνει τότε και πόσα μηνύματα δεν έχει διαβάσει αυτός ο χώρος, εκτός αν το κλείσεις στον Αριθμό στο εικονίδιο.',
};
