// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Greek of the notice that a new version is out, and of Updates around it (app/updates.tsx, app/index.tsx, lib/release-notice.ts) (i18n/el/index.ts).
export const releaseNotice: Record<string, string> = {
  "Erevos asks GitHub for updates only when you tap the button: a regular check would tell GitHub that this device has Erevos. GitHub then sees this device's internet address, nothing else, and on Android so does the web app's server, which holds the release computer's signature of the update.": "Το Erevos ρωτά το GitHub για ενημερώσεις μόνο όταν πατάς το κουμπί: ένας τακτικός έλεγχος θα έλεγε στο GitHub ότι αυτή η συσκευή έχει Erevos. Τότε το GitHub βλέπει τη διεύθυνση internet της συσκευής, τίποτα άλλο, και στο Android το ίδιο και ο server της web εφαρμογής, που κρατά την υπογραφή της ενημέρωσης από τον υπολογιστή των εκδόσεων.",
  "Tell me when a new version is out": "Πες μου όταν βγαίνει νέα έκδοση",
  "Once a day Erevos asks LPHL's server, which runs the relay too, whether a new version is out, and says so at the top of the chats and in a notice. It asks only while this space uses LPHL's relay and does not send everything through Tor, so the server learns nothing it did not know. The answer counts only when signed by the release computer.": "Μία φορά τη μέρα το Erevos ρωτά τον server του LPHL, που τρέχει και το relay, αν βγήκε νέα έκδοση, και το λέει στην κορυφή των συνομιλιών και με μια ειδοποίηση. Ρωτά μόνο όσο αυτός ο χώρος χρησιμοποιεί το relay του LPHL και δεν στέλνει τα πάντα μέσω Tor, άρα ο server δεν μαθαίνει τίποτα που δεν ήξερε. Η απάντηση μετράει μόνο με την υπογραφή του υπολογιστή των εκδόσεων.",
  "Erevos does not ask whether a new version is out: only Check for updates tells you.": "Το Erevos δεν ρωτά αν βγήκε νέα έκδοση: μόνο ο Έλεγχος για ενημερώσεις σού το λέει.",
  "Erevos {name} is out. Tap to see what is new and update.": "Βγήκε το Erevos {name}. Πάτα για να δεις τι νέο έχει και να ενημερώσεις.",
};
