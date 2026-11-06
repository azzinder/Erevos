// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
  'These hidden chats are linked already.': 'Αυτές οι κρυφές συνομιλίες είναι ήδη συνδεδεμένες.',
  'These hidden chats have chats of their own. Link from hidden chats with none, such as those a new PIN sets.':
    'Αυτές οι κρυφές συνομιλίες έχουν δικές τους συνομιλίες. Κάνε τη σύνδεση από κρυφές συνομιλίες χωρίς καμία, όπως αυτές που ανοίγει ένα νέο PIN.',
  'Too long to go through the phone.': 'Πολύ μεγάλο για να περάσει από το τηλέφωνο.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Γράψε πρώτα τη διεύθυνση του relay στο «Relay»: οι συνδεδεμένες συσκευές φτάνουν σε αυτό το τηλέφωνο μέσω αυτού.',
  '{n} devices are linked already, the most there can be.': 'Είναι ήδη συνδεδεμένες {n} συσκευές, όσες μπορούν να είναι το πολύ.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Συνδεδεμένες συσκευές',
  'Not sent by the phone': 'Δεν το έστειλε το τηλέφωνο',
  'These chats came from a linked device’s backup: you can read them here, but not write in them. To write, link this device to the phone again, in Linked devices.': 'Αυτές οι συνομιλίες ήρθαν από το αντίγραφο ασφαλείας μιας συνδεδεμένης συσκευής: εδώ μπορείς να τις διαβάσεις, όχι να γράψεις σε αυτές. Για να γράψεις, σύνδεσε ξανά αυτή τη συσκευή με το τηλέφωνο, στις Συνδεδεμένες συσκευές.',
  'This account on a computer or in a browser too': 'Αυτός ο λογαριασμός και σε υπολογιστή ή σε browser',
  "This chat is the phone's: move it into hidden chats there.": 'Αυτή η συνομιλία είναι του τηλεφώνου: μετέφερέ την στις κρυφές συνομιλίες από εκεί.',
  'These hidden chats are linked to a phone: move the chat into them there.':
    'Αυτές οι κρυφές συνομιλίες είναι συνδεδεμένες με τηλέφωνο: μετέφερε τη συνομιλία σε αυτές από εκεί.',
  "This chat is the phone's: move it out of the hidden chats there.": 'Αυτή η συνομιλία είναι του τηλεφώνου: βγάλ’ την από τις κρυφές συνομιλίες από εκεί.',

  // A call answered on another device of the account (components/call-screen.tsx, lib/call-lines.ts).
  'Answered on another device': 'Απαντήθηκε σε άλλη συσκευή',
  'answered on another device': 'απαντήθηκε σε άλλη συσκευή',

  // Linked devices (app/devices.tsx).
  'All of it': 'Όλα',
  'The last month': 'Τον τελευταίο μήνα',
  'The last week': 'Την τελευταία εβδομάδα',
  None: 'Κανένα',
  'Web browser': 'Browser',
  'Code copied. Paste it on the phone in Settings → Data and devices → Linked devices.': 'Ο κωδικός αντιγράφηκε. Επικόλλησέ τον στο τηλέφωνο, στο Ρυθμίσεις → Δεδομένα και συσκευές → «Συνδεδεμένες συσκευές».',
  'Code copied. Paste it on the phone, in Linked devices of the same hidden chats.':
    'Ο κωδικός αντιγράφηκε. Επικόλλησέ τον στο τηλέφωνο, στις «Συνδεδεμένες συσκευές» των ίδιων κρυφών συνομιλιών.',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Συνδέθηκε. Οι συνομιλίες έρχονται από το τηλέφωνο, και μαζί τους τα μηνύματα που διάλεξε να φέρει.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Δεν συνδέθηκε. Μπορεί να διάβασε τον κωδικό κάποιος άλλος. Φτιάξε νέο και κάνε ξανά τη σύνδεση.',
  'Now the computer shows a code too. If it is {code}, tap They match there.': 'Τώρα δείχνει κωδικό και ο υπολογιστής. Αν είναι ο {code}, πάτα εκεί «Ταιριάζουν».',
  'Unlink this device': 'Αποσύνδεση αυτής της συσκευής',
  'Unlink {name}': 'Αποσύνδεση: {name}',
  "The account's chats leave this device, messages and all, and so do the accounts it brought over from the phone. The phone keeps them.":
    'Οι συνομιλίες του λογαριασμού φεύγουν από αυτή τη συσκευή, μαζί με τα μηνύματα, και το ίδιο οι λογαριασμοί που έφερε από το τηλέφωνο. Το τηλέφωνο τα κρατά.',
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
  'This device has the chats and groups of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls ring here too. New groups, public groups and group calls stay on the phone for now.':
    'Αυτή η συσκευή έχει τις συνομιλίες και τις ομάδες του τηλεφώνου που έχει τον λογαριασμό. Ό,τι γράφεις εδώ περνά από το τηλέφωνο, που πρέπει να είναι ανοιχτό και να φτάνει στο relay. Οι κλήσεις χτυπούν κι εδώ. Νέες ομάδες, δημόσιες ομάδες και ομαδικές κλήσεις μένουν στο τηλέφωνο προς το παρόν.',
  'These hidden chats have the chats and groups of the same hidden chats on the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay, with these hidden chats open or receiving while closed there. Calls ring here too. New groups and group calls stay on the phone for now.':
    'Αυτές οι κρυφές συνομιλίες έχουν τις συνομιλίες και τις ομάδες των ίδιων κρυφών συνομιλιών του τηλεφώνου που έχει τον λογαριασμό. Ό,τι γράφεις εδώ περνά από το τηλέφωνο, που πρέπει να είναι ανοιχτό και να φτάνει στο relay, με αυτές τις κρυφές συνομιλίες ανοιχτές εκεί ή με λήψη όσο είναι κλειστές. Οι κλήσεις χτυπούν κι εδώ. Νέες ομάδες και ομαδικές κλήσεις μένουν στο τηλέφωνο προς το παρόν.',
  'Make or join groups on the phone that holds this account.': 'Φτιάξε ομάδες ή μπες σε ομάδες από το τηλέφωνο που έχει τον λογαριασμό.',
  'Group calls ring on the phone that holds this account, for now. Call from there.':
    'Οι ομαδικές κλήσεις χτυπούν στο τηλέφωνο που έχει τον λογαριασμό, προς το παρόν. Κάλεσε από εκεί.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go with it: each links on its own, from inside it.':
    'Ο ίδιος λογαριασμός σε υπολογιστή ή σε browser. Ο λογαριασμός μένει στο τηλέφωνο: αυτό περνά, κρυπτογραφημένα από άκρη σε άκρη, ό,τι έρχεται κι ό,τι γράφει ο υπολογιστής, οπότε οι επαφές δεν βλέπουν τίποτα καινούργιο. Οι κρυφές συνομιλίες κι ό,τι ανοίγει ένας δεύτερος κωδικός δεν πηγαίνουν ποτέ μαζί του: καθένα συνδέεται μόνο του, από μέσα.',
  'These hidden chats on a computer or in a browser, linked on their own. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Nothing of it shows in the space, nor goes to its linked devices.':
    'Αυτές οι κρυφές συνομιλίες σε υπολογιστή ή σε browser, συνδεδεμένες μόνες τους. Ο λογαριασμός μένει στο τηλέφωνο: αυτό περνά, κρυπτογραφημένα από άκρη σε άκρη, ό,τι έρχεται κι ό,τι γράφει ο υπολογιστής, οπότε οι επαφές δεν βλέπουν τίποτα καινούργιο. Τίποτα από αυτό δεν φαίνεται στον χώρο, ούτε πηγαίνει στις συνδεδεμένες συσκευές του.',
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
  'Signed in as {name}: this device has a token of its own there. Now tap Link to my phone.':
    'Συνδέθηκες ως {name}: αυτή η συσκευή έχει εκεί δικό της token. Τώρα πάτα «Σύνδεση με το τηλέφωνό μου».',
  'Link a computer to this phone': 'Σύνδεση υπολογιστή με αυτό το τηλέφωνο',
  "On the computer, open Settings → Data and devices → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'Στον υπολογιστή, άνοιξε Ρυθμίσεις → Δεδομένα και συσκευές → «Συνδεδεμένες συσκευές» → «Σύνδεση με το τηλέφωνό μου». Μετά σκάναρε τον κωδικό του με την κάμερα αυτού του τηλεφώνου, ή αντίγραψέ τον από εκεί και επικόλλησέ τον εδώ.',
  "On the computer, open the same hidden chats with their PIN, then Linked devices → Link to my phone in them. Then scan its code with this phone's camera while these hidden chats are open, or copy it there and paste it here.":
    'Στον υπολογιστή, άνοιξε τις ίδιες κρυφές συνομιλίες με το PIN τους, και μέσα σε αυτές «Συνδεδεμένες συσκευές» → «Σύνδεση με το τηλέφωνό μου». Μετά σκάναρε τον κωδικό του με την κάμερα αυτού του τηλεφώνου, όσο αυτές οι κρυφές συνομιλίες είναι ανοιχτές, ή αντίγραψέ τον από εκεί και επικόλλησέ τον εδώ.',
  'Code from the computer': 'Κωδικός από τον υπολογιστή',
  Next: 'Επόμενο',
  'Link to my phone': 'Σύνδεση με το τηλέφωνό μου',
  'The phone read the code. Does it show this one too?': 'Το τηλέφωνο διάβασε τον κωδικό. Δείχνει κι αυτό τον ίδιο;',
  'They match': 'Ταιριάζουν',
  'They differ': 'Διαφέρουν',
  'On the phone that holds the account, scan this code with the camera, or paste it in Settings → Data and devices → Linked devices. This space must have no chats of its own.':
    'Στο τηλέφωνο που έχει τον λογαριασμό, σκάναρε αυτόν τον κωδικό με την κάμερα, ή επικόλλησέ τον στο Ρυθμίσεις → Δεδομένα και συσκευές → «Συνδεδεμένες συσκευές». Αυτός ο χώρος δεν πρέπει να έχει δικές του συνομιλίες.',
  'On the phone that holds the account, open the same hidden chats with their PIN, then scan this code with the camera, or paste it in Linked devices in them. These hidden chats must have no chats of their own.':
    'Στο τηλέφωνο που έχει τον λογαριασμό, άνοιξε τις ίδιες κρυφές συνομιλίες με το PIN τους, και μετά σκάναρε αυτόν τον κωδικό με την κάμερα, ή επικόλλησέ τον στις «Συνδεδεμένες συσκευές» τους. Αυτές οι κρυφές συνομιλίες δεν πρέπει να έχουν δικές τους συνομιλίες.',
  'Copy the code': 'Αντιγραφή του κωδικού',
  'Share the code': 'Κοινοποίηση του κωδικού',
  'Waiting for the phone. The code works for half an hour.': 'Περιμένει το τηλέφωνο. Ο κωδικός ισχύει για μισή ώρα.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Χρησιμοποίησέ το όταν αυτή η συσκευή είναι ο υπολογιστής: οι συνομιλίες του γίνονται του τηλεφώνου που έχει τον λογαριασμό.',
  'Use this when this device is the computer: these hidden chats become those of the same hidden chats on the phone that holds the account.':
    'Χρησιμοποίησέ το όταν αυτή η συσκευή είναι ο υπολογιστής: αυτές οι κρυφές συνομιλίες γίνονται οι ίδιες κρυφές συνομιλίες του τηλεφώνου που έχει τον λογαριασμό.',
  'These hidden chats have no relay queue yet: in them, type the relay address under For advanced users, then create their queue.':
    'Αυτές οι κρυφές συνομιλίες δεν έχουν ακόμα ουρά στο relay: μέσα σε αυτές, γράψε τη διεύθυνση του relay στο «Για προχωρημένους» και μετά φτιάξε την ουρά τους.',
  'The phone answers on a queue of this device on a relay: the one the phone uses, or any other. If the relay asks for a token, sign in when it offers that, or type one.':
    'Το τηλέφωνο απαντά σε μια ουρά αυτής της συσκευής σε ένα relay: σε αυτό που χρησιμοποιεί το τηλέφωνο ή σε οποιοδήποτε άλλο. Αν το relay χρειάζεται token, συνδέσου όταν σου προσφέρει σύνδεση, ή γράψε ένα.',
  'Name of this device': 'Όνομα αυτής της συσκευής',
  'Tap Link to my phone, and a QR code for the phone shows here.':
    'Πάτα «Σύνδεση με το τηλέφωνό μου» και εδώ εμφανίζεται ένας κωδικός QR για το τηλέφωνο.',
  'Send the accounts to {name}': 'Αποστολή των λογαριασμών στη συσκευή {name}',
  "This space's Matrix, XMPP and Nostr accounts go to it, end-to-end encrypted, and it signs in to each as a new device. Once unlinked, it signs out of them.":
    'Οι λογαριασμοί Matrix, XMPP και Nostr αυτού του χώρου πηγαίνουν σε αυτήν, κρυπτογραφημένοι από άκρη σε άκρη, και αυτή συνδέεται σε καθέναν από αυτούς ως νέα συσκευή. Μόλις αποσυνδεθεί, βγαίνει από αυτούς.',
  "These hidden chats' own Matrix, XMPP and Nostr accounts go to it, end-to-end encrypted, into the same hidden chats there, and it signs in to each as a new device. Once unlinked, it signs out of them.":
    'Οι δικοί λογαριασμοί Matrix, XMPP και Nostr αυτών των κρυφών συνομιλιών πηγαίνουν σε αυτήν, κρυπτογραφημένοι από άκρη σε άκρη, στις ίδιες κρυφές συνομιλίες εκεί, και αυτή συνδέεται σε καθέναν από αυτούς ως νέα συσκευή. Μόλις αποσυνδεθεί, βγαίνει από αυτούς.',
  'Sent to {name}: {accounts}.': 'Στάλθηκαν στη συσκευή {name}: {accounts}.',
  'Nothing went: this space has no Matrix, XMPP or Nostr account, or too much waits for that device already.':
    'Δεν στάλθηκε τίποτα: αυτός ο χώρος δεν έχει λογαριασμό Matrix, XMPP ή Nostr, ή περιμένουν ήδη πάρα πολλά για εκείνη τη συσκευή.',
  'Nothing went: these hidden chats have no Matrix, XMPP or Nostr account of their own, or too much waits for that device already.':
    'Δεν στάλθηκε τίποτα: αυτές οι κρυφές συνομιλίες δεν έχουν δικό τους λογαριασμό Matrix, XMPP ή Nostr, ή περιμένουν ήδη πάρα πολλά για εκείνη τη συσκευή.',
  'Accounts from the phone': 'Λογαριασμοί από το τηλέφωνο',
  'Matrix: {id}, signed in here as a new device.': 'Matrix: {id}, συνδέθηκε εδώ ως νέα συσκευή.',
  'Matrix: sign in to {id} here once, with its password. Its keys come from the phone, so no Security Key or check by emoji is needed.':
    'Matrix: συνδέσου εδώ μία φορά στο {id}, με τον κωδικό του. Τα κλειδιά του έρχονται από το τηλέφωνο, οπότε δεν χρειάζεται Κλειδί Ασφαλείας ούτε έλεγχος με emoji.',
  'Sign in to Matrix': 'Σύνδεση στο Matrix',
  'XMPP: {id}, signed in here as a new device.': 'XMPP: {id}, συνδέθηκε εδώ ως νέα συσκευή.',
  'Nostr: the key of the Nostr chats is here too.': 'Nostr: το κλειδί των συνομιλιών Nostr είναι κι εδώ.',
  'Not brought over yet: {accounts}. Tried again each time this space opens.':
    'Δεν έχουν έρθει ακόμα: {accounts}. Δοκιμάζεται ξανά κάθε φορά που ανοίγει αυτός ο χώρος.',
  'Not brought over yet: {accounts}. Tried again each time these hidden chats open.':
    'Δεν έχουν έρθει ακόμα: {accounts}. Δοκιμάζεται ξανά κάθε φορά που ανοίγουν αυτές οι κρυφές συνομιλίες.',
  'Once this device is unlinked, it signs out of the accounts it brought over.':
    'Μόλις αποσυνδεθεί αυτή η συσκευή, βγαίνει από τους λογαριασμούς που έφερε από το τηλέφωνο.',
  'Send the accounts': 'Στείλε τους λογαριασμούς',
  'Same settings on every device': 'Ίδιες ρυθμίσεις σε όλες τις συσκευές',
  'The language and the look change on the other devices too. A photo behind the screens, passwords, PINs and what is about this device alone stay as they are on each.':
    'Η γλώσσα και η εμφάνιση αλλάζουν και στις άλλες συσκευές. Μια φωτογραφία πίσω από τις οθόνες, οι κωδικοί, τα PIN και ό,τι αφορά μόνο αυτή τη συσκευή μένουν όπως είναι στην καθεμία.',
};
