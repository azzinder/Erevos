// The Greek of the Phone and Contacts screens (app/phone.tsx and what goes with it) (i18n/el/index.ts).
export const phone: Record<string, string> = {
  // The Phone screen (app/phone.tsx) and its place in the menu.
  Phone: 'Τηλέφωνο',
  'Erevos as the phone app: the keypad, the calls and the favourites': 'Το Erevos ως εφαρμογή τηλεφώνου: πληκτρολόγιο, κλήσεις και αγαπημένα',
  'This build of Erevos has no phone part yet. It comes with the next build of the app.':
    'Αυτή η έκδοση του Erevos δεν έχει ακόμα τηλέφωνο. Θα έρθει με την επόμενη έκδοση της εφαρμογής.',
  'Only Android lets another app be the phone app.': 'Μόνο το Android επιτρέπει σε άλλη εφαρμογή να γίνει η εφαρμογή τηλεφώνου.',
  'Erevos may not make calls. Make it the phone app under Settings.': 'Το Erevos δεν μπορεί να κάνει κλήσεις. Κάνε το εφαρμογή τηλεφώνου στις «Ρυθμίσεις».',
  'Not called. {error}': 'Η κλήση δεν έγινε. {error}',
  Contacts: 'Επαφές',
  Settings: 'Ρυθμίσεις',
  'Back to the call': 'Πίσω στην κλήση',
  'Erevos is not the phone app': 'Το Erevos δεν είναι η εφαρμογή τηλεφώνου',
  "Calls made here show on Android's own call screen until you make Erevos the phone app, under Settings.":
    'Οι κλήσεις από εδώ φαίνονται στην οθόνη κλήσης του ίδιου του Android, μέχρι να κάνεις το Erevos εφαρμογή τηλεφώνου, στις «Ρυθμίσεις».',
  Number: 'Αριθμός',
  'Call on': 'Κλήση από',
  "Without that, calls go on the phone's default SIM.": 'Χωρίς αυτό, οι κλήσεις γίνονται από την προεπιλεγμένη SIM του τηλεφώνου.',
  'Erevos keeps this SIM for the number, sealed in this space, and calls it on the same SIM next time.':
    'Το Erevos κρατά αυτή τη SIM για τον αριθμό, σφραγισμένη σε αυτόν τον χώρο, και την επόμενη φορά τον καλεί από την ίδια SIM.',
  Keypad: 'Πληκτρολόγιο',
  Recents: 'Πρόσφατα',
  Favourites: 'Αγαπημένα',

  // The calls (Android's call history) and the favourites, on the Phone screen (lib/phone-log.ts).
  All: 'Όλες',
  Missed: 'Αναπάντητες',
  Incoming: 'Εισερχόμενες',
  Outgoing: 'Εξερχόμενες',
  Blocked: 'Αποκλεισμένες',
  'Incoming call': 'Εισερχόμενη κλήση',
  'Outgoing call': 'Εξερχόμενη κλήση',
  'Declined call': 'Κλήση που απέρριψες',
  'Blocked call': 'Αποκλεισμένη κλήση',
  'Private number': 'Απόκρυψη αριθμού',
  Payphone: 'Τηλέφωνο κοινού',
  'Unknown number': 'Άγνωστος αριθμός',
  'Wi-Fi calling': 'Κλήση μέσω Wi-Fi',
  'HD voice': 'Φωνή HD',
  'Android does not let Erevos read the call history yet.': 'Το Android δεν αφήνει ακόμα το Erevos να διαβάσει το ιστορικό κλήσεων.',
  'Allow the call history': 'Να επιτρέπεται το ιστορικό κλήσεων',
  'Android did not allow it. Under Settings, Allow calls and contacts says how to.':
    'Το Android δεν το επέτρεψε. Στις «Ρυθμίσεις», το «Να επιτρέπονται κλήσεις και επαφές» λέει πώς.',
  'No calls of this kind.': 'Καμία κλήση αυτού του είδους.',
  'No calls yet.': 'Καμία κλήση ακόμα.',
  'Call on {sim}': 'Κλήση από {sim}',
  'Call {name}': 'Κλήση: {name}',
  'Send an SMS': 'Αποστολή SMS',
  'Change the number before calling': 'Αλλαγή αριθμού πριν την κλήση',
  "Android does not let Erevos read the phone's contacts yet.": 'Το Android δεν αφήνει ακόμα το Erevos να διαβάσει τις επαφές του τηλεφώνου.',
  'Allow the contacts': 'Να επιτρέπονται οι επαφές',
  'No favourites yet. The contacts you star show here, to call at a tap.':
    'Κανένα αγαπημένο ακόμα. Οι επαφές που σημειώνεις με αστέρι φαίνονται εδώ, για να τις καλείς με ένα πάτημα.',

  // The phone's settings (app/phone-settings.tsx).
  'Phone settings': 'Ρυθμίσεις τηλεφώνου',
  'Erevos is the phone app': 'Το Erevos είναι η εφαρμογή τηλεφώνου',
  "As the phone app, Erevos shows every call on its own screen: who calls, with their photo, over the lock screen too, without unlocking Erevos. Its Phone screen, with the keypad, the calls and the favourites, stays behind Erevos's password. Phone calls are plain phone calls: the phone company carries them, as it carries every call.":
    'Ως εφαρμογή τηλεφώνου, το Erevos δείχνει κάθε κλήση στη δική του οθόνη: ποιος καλεί, με τη φωτογραφία του, και πάνω από την οθόνη κλειδώματος, χωρίς να ξεκλειδώσεις το Erevos. Η οθόνη «Τηλέφωνο», με το πληκτρολόγιο, τις κλήσεις και τα αγαπημένα, μένει πίσω από τον κωδικό του Erevos. Οι κλήσεις τηλεφώνου είναι απλές κλήσεις: τις μεταφέρει η εταιρεία κινητής, όπως κάθε κλήση.',
  'Make Erevos the phone app': 'Κάνε το Erevos εφαρμογή τηλεφώνου',
  'Android did not make Erevos the phone app': 'Το Android δεν έκανε το Erevos εφαρμογή τηλεφώνου',
  "Choose Erevos in Android's Default apps → Phone app. If Android says it is a restricted setting, open Erevos's App info, tap ⋮ at the top right → Allow restricted settings, and choose Erevos again.":
    'Διάλεξε το Erevos στις «Προεπιλεγμένες εφαρμογές» του Android → «Εφαρμογή τηλεφώνου». Αν το Android πει ότι είναι ρύθμιση με περιορισμό, άνοιξε τις «Πληροφορίες εφαρμογής» του Erevos, πάτα ⋮ πάνω δεξιά → «Να επιτρέπονται οι ρυθμίσεις με περιορισμό», και διάλεξε ξανά το Erevos.',
  "Android did not allow it all. In Erevos's App info, under Permissions, call logs may say Restricted setting: then go back, tap ⋮ at the top right → Allow restricted settings, and allow Phone, Call logs and Contacts under Permissions.":
    'Το Android δεν τα επέτρεψε όλα. Στις «Πληροφορίες εφαρμογής» του Erevos, στο «Άδειες», τα αρχεία καταγραφής κλήσεων μπορεί να γράφουν «Ρύθμιση με περιορισμό»: τότε γύρνα πίσω, πάτα ⋮ πάνω δεξιά → «Να επιτρέπονται οι ρυθμίσεις με περιορισμό», και επίτρεψε το Τηλέφωνο, τα Αρχεία καταγραφής κλήσεων και τις Επαφές στις «Άδειες».',
  'Android holds back part of what the phone app needs': 'Το Android κρατά πίσω μέρος από όσα χρειάζεται η εφαρμογή τηλεφώνου',
  'Calls, the SIMs, the call history or the names of your contacts may not show. Android holds this back from an app installed from a browser, until you allow it.':
    'Μπορεί να μη φαίνονται οι κλήσεις, οι SIM, το ιστορικό κλήσεων ή τα ονόματα των επαφών σου. Το Android το κρατά πίσω για μια εφαρμογή που εγκαταστάθηκε από browser, μέχρι να το επιτρέψεις.',
  'Allow calls and contacts': 'Να επιτρέπονται κλήσεις και επαφές',
  'So a call that comes shows no Answer and Decline outside the call screen.':
    'Γι’ αυτό μια κλήση που έρχεται δεν δείχνει «Απάντηση» και «Απόρριψη» έξω από την οθόνη κλήσης.',
  'Android does not let Erevos show a call that comes over the lock screen: it shows as a notice only.':
    'Το Android δεν αφήνει το Erevos να δείχνει μια κλήση που έρχεται πάνω από την οθόνη κλειδώματος: φαίνεται μόνο ως ειδοποίηση.',
  'This device has no phone part, so it cannot make calls.': 'Αυτή η συσκευή δεν έχει τηλέφωνο, οπότε δεν μπορεί να κάνει κλήσεις.',
};
