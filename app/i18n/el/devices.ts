// The Greek of linked devices: the account on the phone and on a computer (lib/devices.ts, app/devices.tsx; i18n/el/index.ts).
export const devices: Record<string, string> = {
  // Linking and the links (lib/devices.ts).
  Computer: 'Υπολογιστής',
  'Linked devices could not open.': 'Οι συνδεδεμένες συσκευές δεν άνοιξαν.',
  'That device is linked already.': 'Αυτή η συσκευή είναι ήδη συνδεδεμένη.',
  'That is not a code from Linked devices.': 'Αυτός δεν είναι κωδικός από τις «Συνδεδεμένες συσκευές».',
  'The code changed. Compare it again.': 'Ο κωδικός άλλαξε. Σύγκρινέ τον ξανά.',
  'This device is no longer linked to a phone.': 'Αυτή η συσκευή δεν είναι πια συνδεδεμένη με τηλέφωνο.',
  'This is a linked device. Link from the phone that holds the account.': 'Αυτή είναι συνδεδεμένη συσκευή. Κάνε τη σύνδεση από το τηλέφωνο που έχει τον λογαριασμό.',
  'This space has chats of its own. Link from a space with none, such as one that opens with a new password.':
    'Αυτός ο χώρος έχει δικές του συνομιλίες. Κάνε τη σύνδεση από έναν χώρο χωρίς καμία, όπως έναν που ανοίγει με νέο κωδικό.',
  'This space is linked already.': 'Αυτός ο χώρος είναι ήδη συνδεδεμένος.',
  'Too long to go through the phone.': 'Πολύ μεγάλο για να περάσει από το τηλέφωνο.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Γράψε πρώτα τη διεύθυνση του relay στο «Relay»: οι συνδεδεμένες συσκευές φτάνουν σε αυτό το τηλέφωνο μέσω αυτού.',
  '{n} devices are linked already, the most there can be.': 'Είναι ήδη συνδεδεμένες {n} συσκευές, όσες μπορούν να είναι το πολύ.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Συνδεδεμένες συσκευές',
  'This account on a computer or in a browser too': 'Αυτός ο λογαριασμός και σε υπολογιστή ή σε browser',
  'Calls ring on the phone that holds this account, for now. Call from there.': 'Οι κλήσεις χτυπούν στο τηλέφωνο που έχει αυτόν τον λογαριασμό, προς το παρόν. Κάλεσε από εκεί.',
  "This chat is the phone's: move it into hidden chats there.": 'Αυτή η συνομιλία είναι του τηλεφώνου: μετέφερέ την στις κρυφές συνομιλίες από εκεί.',

  // Linked devices (app/devices.tsx).
  'All of it': 'Όλα',
  'The last month': 'Τον τελευταίο μήνα',
  'The last week': 'Την τελευταία εβδομάδα',
  None: 'Κανένα',
  'Web browser': 'Browser',
  Phone: 'Τηλέφωνο',
  'Code copied. Paste it on the phone in Menu → Linked devices.': 'Ο κωδικός αντιγράφηκε. Επικόλλησέ τον στο τηλέφωνο, στο Μενού → «Συνδεδεμένες συσκευές».',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Συνδέθηκε. Οι συνομιλίες έρχονται από το τηλέφωνο, και μαζί τους τα μηνύματα που διάλεξε να φέρει.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Δεν συνδέθηκε. Μπορεί να διάβασε τον κωδικό κάποιος άλλος. Φτιάξε νέο και κάνε ξανά τη σύνδεση.',
  'Now the computer shows a code too. If it is {code}, tap They match there.': 'Τώρα δείχνει κωδικό και ο υπολογιστής. Αν είναι ο {code}, πάτα εκεί «Ταιριάζουν».',
  'Unlink this device': 'Αποσύνδεση αυτής της συσκευής',
  'Unlink {name}': 'Αποσύνδεση: {name}',
  "The account's chats leave this device, messages and all. The phone keeps them.": 'Οι συνομιλίες του λογαριασμού φεύγουν από αυτή τη συσκευή, μαζί με τα μηνύματα. Το τηλέφωνο τις κρατά.',
  'Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.':
    'Δεν πηγαίνει τίποτα άλλο σε αυτήν, και ό,τι στέλνει δεν γίνεται δεκτό. Ό,τι έχει μένει σε αυτήν, πίσω από το δικό της κλείδωμα.',
  'Unlinked.': 'Αποσυνδέθηκε.',
  'Unlinked here. The phone was not told: unlink this device there too.': 'Αποσυνδέθηκε εδώ. Το τηλέφωνο δεν ενημερώθηκε: αποσύνδεσε αυτή τη συσκευή κι από εκεί.',
  'Unlinked. The device was not told, and gets nothing more.': 'Αποσυνδέθηκε. Η συσκευή δεν ενημερώθηκε, και δεν παίρνει τίποτα πια.',
  'The messages go to it now. What it has already is not kept twice.': 'Τα μηνύματα πηγαίνουν τώρα. Ό,τι έχει ήδη δεν κρατιέται δύο φορές.',
  'Messages to bring over': 'Μηνύματα που θα έρθουν',
  'Photos and files too': 'Και φωτογραφίες και αρχεία',
  'Linked to {name}': 'Συνδεδεμένη με: {name}',
  'Since {when}. Last heard from {last}.': 'Από {when}. Τελευταία επαφή {last}.',
  'This device has the chats of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls and groups stay on the phone for now.':
    'Αυτή η συσκευή έχει τις συνομιλίες του τηλεφώνου που έχει τον λογαριασμό. Ό,τι γράφεις εδώ περνά από το τηλέφωνο, που πρέπει να είναι ανοιχτό και να φτάνει στο relay. Οι κλήσεις και οι ομάδες μένουν στο τηλέφωνο προς το παρόν.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go.':
    'Ο ίδιος λογαριασμός σε υπολογιστή ή σε browser. Ο λογαριασμός μένει στο τηλέφωνο: αυτό περνά, κρυπτογραφημένα από άκρη σε άκρη, ό,τι έρχεται κι ό,τι γράφει ο υπολογιστής, οπότε οι επαφές δεν βλέπουν τίποτα καινούργιο. Οι κρυφές συνομιλίες κι ό,τι ανοίγει ένας δεύτερος κωδικός δεν πηγαίνουν ποτέ.',
  'Link {name}': 'Σύνδεση: {name}',
  'Once you tap Link, the computer shows this code. Link only if it shows the same:': 'Μόλις πατήσεις «Σύνδεση», ο υπολογιστής δείχνει αυτόν τον κωδικό. Κάνε τη σύνδεση μόνο αν δείχνει τον ίδιο:',
  Link: 'Σύνδεση',
  Devices: 'Συσκευές',
  'Linked {when}. Last heard from {last}.': 'Συνδέθηκε {when}. Τελευταία επαφή {last}.',
  'Linked {when}.': 'Συνδέθηκε {when}.',
  'Waiting for They match to be tapped on it.': 'Περιμένει να πατηθεί εκεί το «Ταιριάζουν».',
  'Bringing over messages: {n} so far.': 'Έρχονται τα μηνύματα: {n} ως τώρα.',
  'Bring over': 'Φέρε τα',
  'Bring over messages again': 'Φέρε ξανά τα μηνύματα',
  'Link a computer to this phone': 'Σύνδεση υπολογιστή με αυτό το τηλέφωνο',
  "On the computer, open Menu → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'Στον υπολογιστή, άνοιξε Μενού → «Συνδεδεμένες συσκευές» → «Σύνδεση με το τηλέφωνό μου». Μετά σκάναρε τον κωδικό του με την κάμερα αυτού του τηλεφώνου, ή αντίγραψέ τον από εκεί και επικόλλησέ τον εδώ.',
  'Code from the computer': 'Κωδικός από τον υπολογιστή',
  Next: 'Επόμενο',
  'Link to my phone': 'Σύνδεση με το τηλέφωνό μου',
  'The phone read the code. Does it show this one too?': 'Το τηλέφωνο διάβασε τον κωδικό. Δείχνει κι αυτό τον ίδιο;',
  'They match': 'Ταιριάζουν',
  'They differ': 'Διαφέρουν',
  'On the phone that holds the account, scan this code with the camera, or paste it in Menu → Linked devices. This space must have no chats of its own.':
    'Στο τηλέφωνο που έχει τον λογαριασμό, σκάναρε αυτόν τον κωδικό με την κάμερα, ή επικόλλησέ τον στο Μενού → «Συνδεδεμένες συσκευές». Αυτός ο χώρος δεν πρέπει να έχει δικές του συνομιλίες.',
  'Copy the code': 'Αντιγραφή του κωδικού',
  'Share the code': 'Κοινοποίηση του κωδικού',
  'Waiting for the phone. The code works for half an hour.': 'Περιμένει το τηλέφωνο. Ο κωδικός ισχύει για μισή ώρα.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Χρησιμοποίησέ το όταν αυτή η συσκευή είναι ο υπολογιστής: οι συνομιλίες του γίνονται του τηλεφώνου που έχει τον λογαριασμό.',
  'Name of this device': 'Όνομα αυτής της συσκευής',
};
