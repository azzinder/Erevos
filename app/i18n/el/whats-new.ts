// The Greek of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/el/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Τι νέο υπάρχει',
  'What each version changed': 'Τι άλλαξε σε κάθε έκδοση',
  'What each version of Erevos changed, the newest first.': 'Τι άλλαξε σε κάθε έκδοση του Erevos, η νεότερη πρώτη.',
  'Not out yet': 'Δεν έχει βγει ακόμη',
  'This version': 'Αυτή η έκδοση',
  'For you': 'Για σένα',
  'Under the hood': 'Κάτω από το καπό',
  // Not out yet.
  '**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).':
    '**Τι νέο υπάρχει, σε δύο μέρη**: κάθε έκδοση λέει πρώτα τι αλλάζει για σένα, και μετά τι άλλαξε κάτω από το καπό: διορθώσεις, ταχύτητα, μπαταρία και ασφάλεια στο εσωτερικό. Δες [Ενημερώσεις](#updates).',
  '**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.':
    '**Τα SMS μιας επαφής δεν μένουν να μετρούν ως νέα**: όταν ανοίγεις τη συνομιλία της διαβάζονται όλα, και τα παλαιότερα, όχι μόνο όσα φαίνονται.',
  '**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).':
    '**Ένα μήνυμα δεν μένει πια σε αναμονή όταν το Tor δεν φτάνει στο relay**: με το Tor για τα μηνύματα, πάει αμέσως κατευθείαν, όπως λένε οι ρυθμίσεις του Tor. Δες [Μέσω Tor](#tor).',
  '**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).':
    '**Οι ειδοποιήσεις παρασκηνίου δεν σταματούν πια μετά από αλλαγή δικτύου**: όταν η σύνδεση μιας αναμονής στο relay κοβόταν στη μέση (από Wi-Fi σε δεδομένα, επανεκκίνηση του relay), το Erevos έπαιρνε το relay για παλιό, που δεν ξέρει να περιμένει, για όσο έτρεχε: τα μηνύματα των επαφών έρχονταν έως δέκα λεπτά αργότερα, και οι κρυφές συνομιλίες, οι κλειστοί χώροι και τα κρυφά κουδουνίσματα δεν έλεγαν τίποτα ως την επανεκκίνηση του Erevos. Δες [Συνομιλία μέσω relay](#relay).',
  '**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).':
    '**Μια κλήση που κλείνει αμέσως δεν χτυπά πια**: όταν το κλείσιμο έφτανε στην ίδια ματιά με την κλήση, το τηλέφωνο χτυπούσε 45 δευτερόλεπτα για κλήση που δεν είχε κανέναν. Το ίδιο για ομαδική κλήση που όποιος την άρχισε την άφησε αμέσως. Δες [Συνομιλία μέσω relay](#relay).',
  '**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).':
    '**Μια κρυφή κλήση χτυπά μία φορά**: μια θέση με Λήψη όσο είναι κλειστές και ουρά κουδουνίσματος χτυπούσε δύο φορές για μία κλήση, και μια κλήση που πήρες όσο οι κρυφές συνομιλίες ήταν ανοιχτές ξαναχτυπούσε μόλις έκλειναν. Δες [Κρυφές συνομιλίες](#hidden).',
  '**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).':
    '**Ο σύνδεσμος επαφής ενός μέλους δεν λέει πια Νέο μήνυμα**: η απάντηση σε ζήτηση από ομάδα μόνο προσθέτει την επαφή, χωρίς ειδοποίηση. Δες [Ομαδικές συνομιλίες](#groups).',
  '**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).':
    '**Η ειδοποίηση γενεθλίων και η εισερχόμενη κλήση του τηλεφώνου δεν αντικαθιστούν πια η μία την άλλη**: είχαν τον ίδιο αριθμό ειδοποίησης. Δες [Επαφές](#contacts).',
  '**A closed space tells of its contacts\' messages too**: since each contact writes to a queue of their own, a space that says a message came while another is open told only of group messages and first messages from new contacts. It now asks about its contacts\' queues too, up to 64. See [Chat through a relay](#relay).':
    '**Ένας κλειστός χώρος λέει και για τα μηνύματα των επαφών του**: αφού κάθε επαφή γράφει σε δική της ουρά, ένας χώρος που λέει ότι ήρθε μήνυμα όσο είναι ανοιχτός άλλος έλεγε μόνο για μηνύματα ομάδων και για πρώτα μηνύματα νέων επαφών. Τώρα ρωτά και για τις ουρές των επαφών του, ως 64. Δες [Συνομιλία μέσω relay](#relay).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**Ο οδηγός χρήσης είναι σε όλες τις γλώσσες της εφαρμογής**: δείχνεται σε αυτήν που διάλεξες, και λέει τα κουμπιά όπως τα δείχνει η εφαρμογή. Δες [Γλώσσα](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Η Τοποθεσία βρίσκει πού είσαι, και σε κλειστό χώρο**: το τηλέφωνο ψάχνει μέσω δορυφόρου και μέσω δικτύου μαζί, ένα φύλλο λέει ότι ψάχνει, και όταν δεν βρεθεί τίποτα λέει γιατί, με το Δοκίμασε ξανά. Δες [Συνομιλία μέσω relay](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**Το εικονίδιο του web app μετρά τα αδιάβαστα**: σε iPhone, με τις ειδοποιήσεις ανοιχτές για τον χώρο, το εικονίδιο του Erevos στην αρχική οθόνη δείχνει πόσα μηνύματα δεν έχεις διαβάσει, ποτέ μιας κρυφής συνομιλίας, εκτός αν το κλείσεις στις Ρυθμίσεις → Ειδοποιήσεις → Αριθμός στο εικονίδιο. Δες [Σε iPhone](#iphone).',
  "**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).":
    "**Ειδοποιήσεις για κάθε συνομιλία**: στο Android, βάλε μια συνομιλία ή μια ομάδα σε σίγαση για 8 ώρες, μια εβδομάδα ή πάντα, και δώσε στα μηνύματα και στις κλήσεις της δικό τους ήχο, ή κανέναν. Δες [Συνομιλία μέσω relay](#relay).",
  "**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden).":
    "**Μια συνομιλία κλειδωμένη με δικό της PIN μένει κλειδωμένη**: όταν το Erevos της επαφής ξεκινούσε νέα συνομιλία, όπως κάνει περίπου μία φορά τον μήνα, η συνομιλία έχανε το PIN της, και μια δημόσια ομάδα στην οποία ξαναμπήκες έχανε το δικό της. Δες [Κρυφές συνομιλίες](#hidden).",
  "**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay).":
    "**Το εικονίδιο του Erevos κρατά τον αριθμό των αδιάβαστων, στο Android**: όταν φεύγεις από το Erevos με αδιάβαστα μηνύματα, μια ειδοποίηση χωρίς ήχο κρατά πόσα είναι μέχρι να τα διαβάσεις, και ο launcher τη δείχνει στο εικονίδιο, ως αριθμό ή τελεία. Το κλείνεις στις Ρυθμίσεις → Ειδοποιήσεις → Αριθμός στο εικονίδιο. Δες [Συνομιλία μέσω relay](#relay).",
  "**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone).":
    "**Οι ειδοποιήσεις του web app, πιο αξιόπιστες**: κανένα «Νέο μήνυμα» πάνω από το Erevos όσο είναι ανοιχτό, και ένα push που καθυστέρησε όσο το τηλέφωνο ήταν εκτός σύνδεσης δεν μετρά πια μηνύματα που έχεις ήδη διαβάσει (και τα δύο με το relay σου ενημερωμένο), κάθε ειδοποίηση ακούγεται στο Chrome, στο Firefox και στο Edge, επανέρχονται μόνες τους όταν ο browser αλλάζει τη διεύθυνση push του, και οι «Ειδοποιήσεις όταν είναι κλειστό» λένε πότε τις μπλοκάρει ο browser ή πότε το relay σου δεν έχει ενημερωθεί ακόμα ότι είναι κλειστές. Δες [Σε iPhone](#iphone).",
  "**Calls ring in the web app, on the computer and on Sailfish OS**: a call that comes while Erevos is open now rings, where only its screen showed, and vibrates where the phone can. On an iPhone it rings once you have touched Erevos, and not on silent. See [On an iPhone](#iphone).":
    "**Οι κλήσεις χτυπούν στο web app, στον υπολογιστή και στο Sailfish OS**: μια κλήση που έρχεται όσο το Erevos είναι ανοιχτό χτυπά πια, ενώ έδειχνε μόνο την οθόνη της, και δονεί όπου μπορεί το κινητό. Στο iPhone χτυπά αφού αγγίξεις το Erevos, και όχι στο αθόρυβο. Δες [Σε iPhone](#iphone).",
  '**Erevos on a computer keeps running with its window closed**: in the system tray (on a Mac, in the Dock) it goes on receiving, a call rings and brings the window back, and a notification says how many messages are not read, never who or what. Turn it off under Settings → Notifications → In the background. See [On a computer](#desktop).':
    '**Το Erevos στον υπολογιστή συνεχίζει να τρέχει με το παράθυρό του κλειστό**: στη γραμμή συστήματος (σε Mac, στο Dock) συνεχίζει να λαμβάνει, μια κλήση χτυπά και φέρνει πίσω το παράθυρο, και μια ειδοποίηση λέει πόσα μηνύματα δεν έχουν διαβαστεί, ποτέ ποιος ή τι. Το κλείνεις στις Ρυθμίσεις → Ειδοποιήσεις → Στο παρασκήνιο. Δες [Σε υπολογιστή](#desktop).',
  "**Erevos on Sailfish OS tells of messages and calls while it is closed**: while it is out of sight or closed, a small helper waits at the relay for the open space, a notification says how many messages came, never who or what, and a call rings with the phone's ringtone. See [On Sailfish OS](#sailfish).":
    "**Το Erevos στο Sailfish OS ειδοποιεί για μηνύματα και κλήσεις όσο είναι κλειστό**: όσο δεν φαίνεται ή είναι κλειστό, ένα μικρό βοηθητικό πρόγραμμα περιμένει στο relay για τον ανοιχτό χώρο, μια ειδοποίηση λέει πόσα μηνύματα ήρθαν, ποτέ από ποιον ή τι, και μια κλήση χτυπά με τον ήχο κλήσης του τηλεφώνου. Δες [Σε Sailfish OS](#sailfish).",
  "**The relay's pushes to the web app, sturdier**: a push the push service could not take just then is sent again, a call goes before the messages waiting their turn, and whoever runs the relay can allow another push service. Your relay needs an update for it.":
    "**Τα push του relay προς το web app, πιο ανθεκτικά**: ένα push που η υπηρεσία push δεν μπόρεσε να δεχτεί εκείνη τη στιγμή στέλνεται ξανά, μια κλήση περνά μπροστά από τα μηνύματα που περιμένουν τη σειρά τους, και όποιος τρέχει το relay μπορεί να επιτρέψει άλλη υπηρεσία push. Το relay σου χρειάζεται ενημέρωση γι’ αυτό.",
  "**Permissions checks every notice Erevos uses**: on Android, the message notice without sound or with a chat's own sound, and the reminders', turned off, now show there, with a button to each. See [Chat through a relay](#relay).":
    '**Οι Άδειες ελέγχουν κάθε ειδοποίηση που χρησιμοποιεί το Erevos**: στο Android, η ειδοποίηση μηνυμάτων χωρίς ήχο ή με τον δικό ήχο μιας συνομιλίας, και αυτή των υπενθυμίσεων, όταν είναι κλειστές, φαίνονται πλέον εκεί, με ένα κουμπί για την καθεμία. Δες [Συνομιλία μέσω relay](#relay).',
  '**Hidden chats say what their switches need**: Say when a message comes and Ring calls when closed say so when Settings → Notifications → In the background lets them do nothing. See [Hidden chats](#hidden).':
    '**Οι κρυφές συνομιλίες λένε τι χρειάζονται οι διακόπτες τους**: η «Ειδοποίηση όταν έρχεται μήνυμα» και το «Χτύπημα κλήσεων όταν είναι κλειστές» το λένε όταν οι Ρυθμίσεις → Ειδοποιήσεις → Στο παρασκήνιο δεν τους αφήνουν να κάνουν τίποτα. Δες [Κρυφές συνομιλίες](#hidden).',
  "**Truer words about notices**: Settings and the guide give the notices' own words and say what each one needs. See [Chat through a relay](#relay).":
    '**Πιο ακριβή λόγια για τις ειδοποιήσεις**: οι Ρυθμίσεις και ο οδηγός δίνουν τα ίδια τα λόγια των ειδοποιήσεων και λένε τι χρειάζεται η καθεμία. Δες [Συνομιλία μέσω relay](#relay).',
  "**Calls ring as they should**: with Do Not Disturb only when their notice may break through, with a phone's clock off too once the relay is updated, and to the end on Android 7 and 8; a second call is told busy, and a ring stops only for its own call. See [Chat through a relay](#relay).":
    '**Οι κλήσεις χτυπούν όπως πρέπει**: με το «Μην ενοχλείτε» μόνο όταν η ειδοποίησή τους επιτρέπεται να περάσει, και με λάθος ρολόι στο τηλέφωνο μόλις ενημερωθεί το relay, και ως το τέλος στο Android 7 και 8· μια δεύτερη κλήση βρίσκει κατειλημμένο, και ένα χτύπημα σταματά μόνο για τη δική του κλήση. Δες [Συνομιλία μέσω relay](#relay).',
  '**Hidden calls**: one turned down no longer leaves Erevos over the lock screen, one that comes while the password screen shows comes over it, and none rings twice. See [Hidden chats](#hidden).':
    '**Κρυφές κλήσεις**: μια κλήση που απορρίπτεις δεν αφήνει πια το Erevos πάνω από την οθόνη κλειδώματος, μια που έρχεται όσο φαίνεται η οθόνη κωδικού εμφανίζεται πάνω της, και καμία δεν χτυπά δύο φορές. Δες [Κρυφές συνομιλίες](#hidden).',
  '**Notices come again at once after a change of network**, and receiving starts again as Erevos shows when Android refused it. See [Chat through a relay](#relay).':
    '**Οι ειδοποιήσεις έρχονται ξανά αμέσως μετά από αλλαγή δικτύου**, και η λήψη ξεκινά ξανά μόλις φανεί το Erevos, όταν το Android την είχε αρνηθεί. Δες [Συνομιλία μέσω relay](#relay).',
  "**Hidden chats' notices tell each message once**: what came since a place last looked is told as it closes, a call that rang is not told again as a message, and a place whose queue the relay lost keeps its switch on. See [Hidden chats](#hidden).":
    '**Οι ειδοποιήσεις των κρυφών συνομιλιών λένε κάθε μήνυμα μία φορά**: ό,τι ήρθε από την τελευταία φορά που κοίταξε μια θέση λέγεται όταν κλείνει, μια κλήση που χτύπησε δεν λέγεται ξανά ως μήνυμα, και μια θέση που το relay έχασε την ουρά της κρατά τον διακόπτη της ανοιχτό. Δες [Κρυφές συνομιλίες](#hidden).',
  '**Hidden chats close while Erevos is away**, after 30 seconds, so a call to them meanwhile rings with their PIN to answer. See [Hidden chats](#hidden).':
    '**Οι κρυφές συνομιλίες κλείνουν όσο το Erevos δεν φαίνεται**, μετά από 30 δευτερόλεπτα, ώστε μια κλήση σε αυτές στο μεταξύ να χτυπά με το PIN τους για να απαντήσεις. Δες [Κρυφές συνομιλίες](#hidden).',
  '**A voice message counts once**, on its last part, also when it goes again whole.':
    '**Ένα φωνητικό μήνυμα μετρά μία φορά**, στο τελευταίο του κομμάτι, και όταν ξαναστέλνεται ολόκληρο.',
  '**The number on the icon counts only what is still there**: a message deleted for everyone, or read on a linked computer, no longer counts. See [Chat through a relay](#relay).':
    '**Ο αριθμός στο εικονίδιο μετρά μόνο ό,τι είναι ακόμα εκεί**: ένα μήνυμα που διαγράφηκε για όλους, ή που διαβάστηκε σε συνδεδεμένο υπολογιστή, δεν μετρά πια. Δες [Συνομιλία μέσω relay](#relay).',
  '**Messages sent for later** tell of themselves only while their space is open, without sound if sent so.':
    '**Τα μηνύματα που στέλνονται για αργότερα** ειδοποιούν μόνο όσο ο χώρος τους είναι ανοιχτός, χωρίς ήχο αν στάλθηκαν έτσι.',
  '**SMS**: one to the chat on screen only sounds there, they are marked read only while their screen shows, and Android names their notices SMS. See [SMS](#sms).':
    '**SMS**: ένα για τη συνομιλία που είναι στην οθόνη μόνο ηχεί εκεί, σημειώνονται ως διαβασμένα μόνο όσο φαίνεται η οθόνη τους, και το Android ονομάζει τις ειδοποιήσεις τους SMS. Δες [SMS](#sms).',
  "**Reminders**: one seen in Chat with myself goes from the notice, a hidden place's go with a new PIN, and birthdays come at 9:00. See [Getting started](#start).":
    '**Υπενθυμίσεις**: μια υπενθύμιση που είδες στη Συνομιλία με τον εαυτό μου φεύγει από την ειδοποίηση, όσες έχει μια κρυφή θέση φεύγουν με νέο PIN, και τα γενέθλια έρχονται στις 9:00. Δες [Πρώτα βήματα](#start).',
  '**Nostr reads as soon as Tor is ready.** See [Through Nostr](#nostr).':
    '**Το Nostr διαβάζει μόλις το Tor είναι έτοιμο.** Δες [Μέσω Nostr](#nostr).',
  "**Erevos's notices show its mark** in the status bar.":
    '**Οι ειδοποιήσεις του Erevos δείχνουν το σήμα του** στη γραμμή κατάστασης.',
  '**Notices are asked for with receiving off too**, when Say a message came is on.':
    '**Η άδεια για ειδοποιήσεις ζητείται και με τη λήψη κλειστή**, όταν η «Ειδοποίηση για μηνύματα» είναι ανοιχτή.',
  "**Photos open on the whole screen**: tap one to see it edge to edge, zoom in with two fingers or a double tap, and tap again to hide or show what is around it; big photos open as small ones do. Erevos also turns with the phone while the phone's Auto-rotate is on, and a photo shown on its own even when it is off. See [Chat through a relay](#relay).":
    '**Οι φωτογραφίες ανοίγουν σε όλη την οθόνη**: πάτα μία για να τη δεις ως τις άκρες, μεγέθυνε με δύο δάχτυλα ή με διπλό πάτημα, και πάτα ξανά για να κρύψεις ή να δεις ό,τι είναι γύρω της· οι μεγάλες φωτογραφίες ανοίγουν όπως οι μικρές. Το Erevos γυρίζει επίσης μαζί με το τηλέφωνο όσο είναι ανοιχτή η Αυτόματη περιστροφή του, και μια φωτογραφία που βλέπεις μόνη της ακόμα κι όταν είναι κλειστή. Δες [Συνομιλία μέσω relay](#relay).',
  "**Matrix accounts in Erevos**: sign a space in to Matrix and chat with people who use Element or another Matrix app, end-to-end encrypted, under Settings → Relay and networks → Matrix. These chats are not anonymous, and say so: the Matrix server sees who talks with whom. Text, photos and files. See [Matrix](#matrix).":
    "**Λογαριασμοί Matrix στο Erevos**: σύνδεσε έναν χώρο στο Matrix και συνομίλησε με ανθρώπους που χρησιμοποιούν το Element ή άλλη εφαρμογή Matrix, με κρυπτογράφηση από άκρη σε άκρη, στις Ρυθμίσεις → Relay και δίκτυα → Matrix. Αυτές οι συνομιλίες δεν είναι ανώνυμες, και το λένε: ο server του Matrix βλέπει ποιος μιλά με ποιον. Κείμενο, φωτογραφίες και αρχεία. Δες [Matrix](#matrix).",
  "**Every network's chats on the home screen**: once you sign in to Matrix, its chats are in the list with the Erevos chats and the SMS, newest first, each marked Matrix, and the Matrix chip shows them alone, as SMS and Erevos do. See [Matrix](#matrix).":
    "**Οι συνομιλίες όλων των δικτύων στην αρχική οθόνη**: μόλις συνδεθείς στο Matrix, οι συνομιλίες του μπαίνουν στη λίστα μαζί με τις συνομιλίες Erevos και τα SMS, οι πιο πρόσφατες πρώτες, η καθεμία με το σημάδι Matrix, και το κουμπί Matrix δείχνει μόνο αυτές, όπως τα SMS και το Erevos. Δες [Matrix](#matrix).",
  '**Test versions before a release**: Erevos reads a version such as 4.0.0-rc.1, a test version that comes before 4.0.0, when it looks for updates, tells of a new version and shows what is new. See [Updates](#updates).':
    '**Δοκιμαστικές εκδόσεις πριν από μια έκδοση**: το Erevos διαβάζει μια έκδοση όπως η 4.0.0-rc.1, δοκιμαστική έκδοση που έρχεται πριν από την 4.0.0, όταν ψάχνει για ενημερώσεις, όταν λέει ότι βγήκε νέα έκδοση και όταν δείχνει τι νέο υπάρχει. Δες [Ενημερώσεις](#updates).',
  "**Check Matrix devices by emoji**: in a chat with one person on Matrix, Check by emoji shows you both seven pictures; if they match, nobody sits in between, and Element sees the check too. Check this device with another of yours makes your own Element trust Erevos. See [Matrix](#matrix).":
    "**Έλεγχος συσκευών Matrix με emoji**: σε συνομιλία με ένα άτομο στο Matrix, ο Έλεγχος με emoji δείχνει και στους δύο επτά εικόνες· αν ταιριάζουν, κανείς δεν είναι στη μέση, και το Element βλέπει κι αυτό τον έλεγχο. Ο Έλεγχος αυτής της συσκευής με άλλη δική σου κάνει το δικό σου Element να εμπιστεύεται το Erevos. Δες [Matrix](#matrix).",
  "**Automatic backups to your own server too**: on Android, each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. Off until you add one. The server gets random bytes under a random name and cannot open them; it still sees your account, your address and when. See [Backups](#backup).":
    "**Αυτόματα αντίγραφα και στον δικό σου server**: στο Android, κάθε αυτόματο αντίγραφο μπορεί να πηγαίνει και σε έναν φάκελο σε server που διαλέγεις, όπως το Nextcloud σου, μέσω WebDAV. Κλειστό μέχρι να προσθέσεις έναν. Ο server παίρνει τυχαία bytes με τυχαίο όνομα και δεν μπορεί να τα ανοίξει· βλέπει όμως τον λογαριασμό σου, τη διεύθυνσή σου και πότε. Δες [Αντίγραφα ασφαλείας](#backup).",
  "**Matrix Security Key and key backup**: enter the Security Key Element made, under Settings → Relay and networks → Matrix, and earlier messages open, new keys are backed up, and your other devices trust Erevos. An account with none can set one up there. See [Matrix](#matrix).":
    "**Κλειδί Ασφαλείας και αντίγραφο κλειδιών στο Matrix**: γράψε το Κλειδί Ασφαλείας που έφτιαξε το Element, στις Ρυθμίσεις → Relay και δίκτυα → Matrix, και ανοίγουν τα παλιότερα μηνύματα, τα νέα κλειδιά φυλάγονται, και οι άλλες συσκευές σου εμπιστεύονται το Erevos. Ένας λογαριασμός χωρίς κλειδί μπορεί να φτιάξει ένα εκεί. Δες [Matrix](#matrix).",
  "**Matrix through Tor**: on Android, a space's Matrix account follows its choice under Settings → Relay and networks → Tor, so the Matrix server no longer sees where you are; the Matrix screen says when it goes through Tor. See [Matrix](#matrix).":
    "**Matrix μέσω Tor**: σε Android, ο λογαριασμός Matrix ενός χώρου ακολουθεί την επιλογή του στις Ρυθμίσεις → Relay και δίκτυα → Tor, οπότε ο server του Matrix δεν βλέπει πια πού βρίσκεσαι· η οθόνη του Matrix λέει πότε πάει μέσω Tor. Δες [Matrix](#matrix).",
  "**XMPP accounts in Erevos**: sign a space in to XMPP, under Settings → Relay and networks → XMPP, and chat with people who use Conversations, Monal, Gajim, Dino or another XMPP app, encrypted with OMEMO. These chats are not anonymous, and say so: the XMPP server sees who talks with whom. Text with delivery and read marks, in the home list under an XMPP chip of its own, and through Tor on Android as you chose. See [XMPP](#xmpp).":
    "**Λογαριασμοί XMPP στο Erevos**: σύνδεσε έναν χώρο στο XMPP, στις Ρυθμίσεις → Relay και δίκτυα → XMPP, και συνομίλησε με ανθρώπους που χρησιμοποιούν το Conversations, το Monal, το Gajim, το Dino ή άλλη εφαρμογή XMPP, κρυπτογραφημένα με OMEMO. Αυτές οι συνομιλίες δεν είναι ανώνυμες και το λένε: ο server XMPP βλέπει ποιος μιλά με ποιον. Κείμενο με σημάδια παράδοσης και ανάγνωσης, στη λίστα της αρχικής οθόνης κάτω από δικό τους κουμπί XMPP, και μέσω Tor σε Android όπως επέλεξες. Δες [XMPP](#xmpp).",
  "**Voice and video calls with people on XMPP**: the two tiles at the top of an XMPP chat call the person, and their calls ring on the same screen as Erevos's own, with apps that call as Conversations does. The call goes through your call relay or the XMPP server's, so they do not learn your address; the key that proves it passes through the XMPP servers, which could put themselves in between. See [XMPP](#xmpp).":
    "**Κλήσεις φωνής και βίντεο με ανθρώπους στο XMPP**: τα δύο πλακίδια στην κορυφή μιας συνομιλίας XMPP καλούν τον άλλον, και οι δικές του κλήσεις χτυπούν στην ίδια οθόνη με του ίδιου του Erevos, με εφαρμογές που καλούν όπως το Conversations. Η κλήση περνά από το relay κλήσεών σου ή του server XMPP, ώστε να μη μαθαίνει τη διεύθυνσή σου· το κλειδί που την αποδεικνύει περνά από τους servers XMPP, που θα μπορούσαν να μπουν στη μέση. Δες [XMPP](#xmpp).",
  "**Voice and video calls with people on Matrix**: on Android, the two tiles at the top of a Matrix chat call with Element Call, the call app of Element and Element X, which opens inside Erevos in a window of its own, and their calls ring here as Erevos's own do. Sound and picture are end-to-end encrypted and go through the media server your Matrix server names, never through Tor. See [Matrix](#matrix).":
    "**Κλήσεις φωνής και βίντεο με ανθρώπους στο Matrix**: στο Android, τα δύο πλακίδια στην κορυφή μιας συνομιλίας Matrix καλούν με το Element Call, την εφαρμογή κλήσεων του Element και του Element X, που ανοίγει μέσα στο Erevos σε δικό της παράθυρο, και οι δικές τους κλήσεις χτυπούν εδώ όπως του ίδιου του Erevos. Ήχος και εικόνα είναι κρυπτογραφημένα από άκρο σε άκρο και περνούν από τον server πολυμέσων που ορίζει ο server Matrix σου, ποτέ από Tor. Δες [Matrix](#matrix).",
  "**Chats with people on other Nostr apps**: give a space a Nostr key of its own, under Settings → Relay and networks → Nostr chats, and chat with people who use Damus, Amethyst, Primal, 0xchat or another Nostr app, one to one or in groups, encrypted as NIP-17 asks: the relays see whom a message is for, not who wrote it. These chats are not anonymous, and say so: your key is the same to everyone you write to. Text, photos, files and reactions, in the home list under a Nostr chip of its own, and through Tor on Android as you chose. See [Chats with other Nostr apps](#nostr-chats).":
    "**Συνομιλίες με ανθρώπους σε άλλες εφαρμογές Nostr**: δώσε σε έναν χώρο δικό του κλειδί Nostr, στις Ρυθμίσεις → Relay και δίκτυα → Συνομιλίες Nostr, και συνομίλησε με ανθρώπους που χρησιμοποιούν το Damus, το Amethyst, το Primal, το 0xchat ή άλλη εφαρμογή Nostr, ένας με έναν ή σε ομάδες, κρυπτογραφημένα όπως ορίζει το NIP-17: τα relays βλέπουν σε ποιον πάει ένα μήνυμα, όχι ποιος το έγραψε. Αυτές οι συνομιλίες δεν είναι ανώνυμες και το λένε: το κλειδί σου είναι το ίδιο για όλους όσους γράφεις. Κείμενο, φωτογραφίες, αρχεία και αντιδράσεις, στη λίστα της αρχικής οθόνης κάτω από δικό τους κουμπί Nostr, και μέσω Tor σε Android όπως επέλεξες. Δες [Συνομιλίες με άλλες εφαρμογές Nostr](#nostr-chats).",
  "**Notices for Matrix, XMPP and Nostr messages**: a message in a chat on Matrix, XMPP or Nostr shows a notice and counts in the number on Erevos's icon, as in Erevos's own chats. On Android, Notifications at the bottom of such a chat mutes it or gives it a sound of its own, and an XMPP call rings with its chat's ringtone. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats).":
    "**Ειδοποιήσεις για μηνύματα Matrix, XMPP και Nostr**: ένα μήνυμα σε συνομιλία Matrix, XMPP ή Nostr δείχνει ειδοποίηση και μετράει στον αριθμό στο εικονίδιο του Erevos, όπως στις συνομιλίες του ίδιου του Erevos. Στο Android, οι Ειδοποιήσεις στο κάτω μέρος μιας τέτοιας συνομιλίας τη βάζουν σε σίγαση ή της δίνουν δικό της ήχο, και μια κλήση XMPP χτυπά με τον ήχο κλήσης της συνομιλίας της. Δες [Matrix](#matrix), [XMPP](#xmpp) και [Συνομιλίες με άλλες εφαρμογές Nostr](#nostr-chats).",
  '**A call to a slow phone rings in full**: the caller now waits up to a minute and a quarter for the other phone to say it rings, and then 45 seconds from then, so a call that reached it late no longer rings there only to stop at once; and the phone called reads a call before anything it has to send, and waits for calls again at once after its network changes. See [Chat through a relay](#relay).':
    '**Μια κλήση σε αργό τηλέφωνο χτυπά ολόκληρη**: όποιος καλεί περιμένει πλέον μέχρι ένα λεπτό και ένα τέταρτο να πει το άλλο τηλέφωνο ότι χτυπά, και μετά 45 δευτερόλεπτα από τότε, ώστε μια κλήση που έφτασε εκεί αργά να μη χτυπά για να σταματήσει αμέσως· και το τηλέφωνο που καλείται διαβάζει μια κλήση πριν από ό,τι έχει να στείλει, και περιμένει ξανά κλήσεις αμέσως μόλις αλλάξει δίκτυο. Δες [Συνομιλία μέσω relay](#relay).',
  // 3.4.2
  '**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.':
    '**Ένα μήνυμα που στέλνεις όσο ανοίγει μια συνομιλία την περιμένει**, με την ένδειξη Αποστολή…, και φεύγει μόλις ανοίξει, χωρίς να λέει ότι το Erevos δεν μπορεί να κρυπτογραφήσει.',
  '**What you read as a chat opens stays read**: the home screen no longer counts it as new.':
    '**Ό,τι διαβάζεις όσο ανοίγει μια συνομιλία μένει διαβασμένο**: η αρχική οθόνη δεν το μετρά πια ως νέο.',
  '**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).':
    '**Καμία ερώτηση από τη Samsung για την «Κοινή χρήση» της**: σε τηλέφωνο Samsung, το Wi-Fi Aware και το Wi-Fi με κοντινά τηλέφωνα μένουν κλειστά μέχρι να τα ανοίξεις. Δες [Συνομιλία με κοντινό τηλέφωνο](#nearby).',
  '**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.':
    '**Το πεδίο του SMS κρατά το πλάτος του σε μικρή οθόνη**: η Φωτογραφία και η Αποστολή δίπλα του είναι στρογγυλά κουμπιά, όπως σε μια συνομιλία.',
  // 3.4.1
  '**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.':
    '**Η αποστολή απαντά αμέσως**: μια σύντομη δόνηση μόλις την πατήσεις, το πεδίο αδειάζει και το μήνυμα φαίνεται, με την ένδειξη «Αποστολή…», ώστε να μη φύγει ποτέ δύο φορές.',
  '**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.':
    '**Η οθόνη δεν μένει πια ανεβασμένη** αφού το πληκτρολόγιο έκλεισε πίσω από ένα παράθυρο, ένα μήνυμα του συστήματος ή μια άλλη εφαρμογή.',
  '**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).':
    '**Η εισαγωγή συνομιλίας με τις φωτογραφίες της δεν παγώνει πια το Erevos**: η οθόνη κινείται όσο έρχονται τα αρχεία, λέει τι ποσοστό τους έχει έρθει, και το **Άκυρο** τη σταματά. Μια συνομιλία που μεταφέρεται στις κρυφές παίρνει μαζί τις συνομιλίες που εισήχθησαν σε αυτή. Δες [Εισαγμένες συνομιλίες](#import).',
  // 3.4.0
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Το relay σου αποδεικνύει το δικό του κλειδί**: κάθε σύνδεση ξεκινά με έναν έλεγχο που περνά μόνο το relay που έχει αυτό το κλειδί, οπότε κανείς ενδιάμεσος δεν μπορεί να περάσει για αυτό. Μόλις το αποδείξει, το Erevos δεν συνδέεται πια σε αυτό χωρίς τον έλεγχο. Το relay σου χρειάζεται ενημέρωση γι’ αυτό.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Διαφάνεια](#transparency), νέο μέρος του οδηγού: τι κρατά ο server πίσω από το Erevos και για πόσο, τι δεν κρατά, και ποιος άλλος βλέπει κάτι.',
  "**What's new**: this list, in Settings → General, by version.": '**Τι νέο υπάρχει**: αυτή η λίστα, στις Ρυθμίσεις → Γενικά, ανά έκδοση.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Τίποτα δεν φαίνεται πίσω από το PIN μιας συνομιλίας**: κανένα μήνυμα μιας συνομιλίας κλειδωμένης με PIN δεν εμφανίζεται πριν γραφτεί το PIN της, και με γυαλί, ταπετσαρία ή στυλ με δική του σκηνή, η οθόνη του PIN είναι πυκνό παγωμένο τζάμι που δεν αφήνει να φανεί τίποτα.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Βιντεοκλήση ομάδας από την κορυφή της ομάδας**: μια μπλε κάμερα δίπλα στο πράσινο ακουστικό, όπως στη συνομιλία με μια επαφή.",
  "**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it.":
    "**Μια ουρά στο relay για κάθε επαφή**: κάθε επαφή γράφει σε ουρά που ξέρει μόνο εκείνη, οπότε το relay δεν μπορεί να καταλάβει ότι δύο επαφές γράφουν στο ίδιο τηλέφωνο, και η διαγραφή ή ο αποκλεισμός κάποιου σβήνει μόνο τη δική του. Το relay σου χρειάζεται ενημέρωση γι’ αυτό.",
  "**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden).":
    "**Οι κρυφές συνομιλίες, πιο κοντά στις άλλες**: κλείνουν μετά από 30 δευτερόλεπτα στο παρασκήνιο, όχι αμέσως, και ποτέ στη διάρκεια κλήσης ή όσο διαλέγεις φωτογραφία ή αρχείο· όσο είναι ανοιχτές, ένα μήνυμα παίζει τον ήχο του, και οι προεπισκοπήσεις συνδέσμων έχουν εκεί δικό τους διακόπτη. Δες [Κρυφές συνομιλίες](#hidden).",
  "**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden).":
    "**Κρυφές συνομιλίες που λαμβάνουν όσο είναι κλειστές**: ένας διακόπτης στην κορυφή κάθε θέσης, ανοιχτός στις νέες θέσεις, τις κάνει να λαμβάνουν όπως οι άλλες συνομιλίες σου: οι επαφές τους βλέπουν αμέσως ότι ένα μήνυμα έφτασε, μια ειδοποίηση λέει μόνο «Νέο μήνυμα», και μια κλήση χτυπά χωρίς όνομα. Δες [Κρυφές συνομιλίες](#hidden).",
  "**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden).":
    "**Οι κρυφές συνομιλίες κρατούν σε αναμονή και κάνουν εισαγωγή**: ό,τι δεν μπορεί να φύγει τώρα περιμένει, με την ένδειξη «Σε αναμονή», και φεύγει μόνο του μέσω του relay τους· η «Αποστολή αργότερα» δουλεύει εκεί όπως στις άλλες συνομιλίες σου· και μια συνομιλία από Telegram, WhatsApp ή Viber μπορεί να εισαχθεί σε μια κρυφή συνομιλία και να μείνει μόνο εκεί. Δες [Κρυφές συνομιλίες](#hidden).",
  "**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden).":
    "**Οι κρυφές συνομιλίες σε λίστα όπως οι δικές σου**: ανοίγουν σε μια λίστα σαν της αρχικής οθόνης, με ό,τι ειπώθηκε τελευταίο και πόσα δεν έχουν διαβαστεί, και κάθε θέση έχει τη δική της Συνομιλία με τον εαυτό μου στην κορυφή της. Δες [Κρυφές συνομιλίες](#hidden).",
  "**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden).":
    "**Περισσότερα στις κρυφές συνομιλίες**: με τη «Λήψη όσο είναι κλειστές», ό,τι τους έρχεται μέσω Nostr διαβάζεται και όσο είναι κλειστές· κι εκεί μια επαφή προστίθεται από φωτογραφία του κωδικού QR της και μια κρυφή επαφή παίρνει φωτογραφία. Δες [Κρυφές συνομιλίες](#hidden).",
  "**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden).":
    "**Κρυφές συνομιλίες χωρίς relay**: όπως οι άλλες συνομιλίες σου, μπορούν να ξεκινήσουν μόνο μέσω Nostr: ο σύνδεσμος επαφής τους και ο κωδικός QR τους λένε πού διαβάζουν εκεί, και τα κείμενα και οι αντιδράσεις πηγαίνουν εκεί. Δες [Κρυφές συνομιλίες](#hidden).",
  "**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden).":
    "**Ομάδες στις κρυφές συνομιλίες**: κάτω από τη λίστα τους, η Νέα ομάδα φτιάχνει μια ομάδα με τις επαφές τους· φαίνεται ανάμεσα στις συνομιλίες τους, πηγαίνει μόνο μέσω του relay τους, και διαβάζεται όσο είναι κλειστές αν η Λήψη όσο είναι κλειστές είναι ανοιχτή. Δες [Κρυφές συνομιλίες](#hidden).",
  "**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy).":
    "**Χωρίς τη γραμμή «δοκιμαστική έκδοση»**: η αρχική οθόνη δεν τελειώνει πια λέγοντας ότι αυτή είναι δοκιμαστική έκδοση. Ο οδηγός λέει ακόμα ακριβώς τι προστατεύεται, και ότι τίποτα δεν έχει ελεγχθεί ακόμα. Δες [Τι προστατεύεται σήμερα](#privacy).",
  "**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts).":
    "**Μενού επαφών στις κρυφές συνομιλίες**: οι Επαφές τους έχουν πια μενού, μόνο με ό,τι είναι δικό τους: εισαγωγή αρχείου .vcf σε αυτές, αποθήκευση των επαφών τους ως αρχείο .vcf, και ανάγνωση κωδικού QR επαφής από φωτογραφία. Ένα Erevos ID που γράφεις εκεί την προσθέτει στις κρυφές συνομιλίες. Δες [Επαφές](#contacts).",
  // 3.3.2
  '**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.':
    '**Το κουμπί απλής κλήσης για περισσότερες επαφές**: το πορτοκαλί πληκτρολόγιο πάνω στη συνομιλία μιας επαφής παίρνει και τον αριθμό της επαφής με την οποία τη συνέδεσες (**Σύνδεση με μια επαφή μου**), πρώτα το κινητό.',
  // 3.3.1
  '**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.':
    '**Εισαγωγή συνομιλιών Viber**: από το αρχείο HTML της εφαρμογής Android Backup Text for Viber, μόνο τα κείμενα.',
  // 3.3.0
  '**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.':
    '**Ξεκίνημα χωρίς relay, μέσω Nostr**: **Ξεκίνα χωρίς relay** στη Νέα συνομιλία. Κείμενα, αυτοκόλλητα, αντιδράσεις, διορθώσεις και τα σημάδια «ήρθε» και «διαβάστηκε» πάνε μέσω Nostr πάνω από Tor. Φωτογραφίες, φωνητικά, αρχεία και κλήσεις θέλουν ακόμη relay ή ένα κοντινό τηλέφωνο.',
  '**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.':
    '**Το relay έρχεται μόνο του**: όποιος έχει relay που κάνει προσκλήσεις στέλνει μία φορά πρόσκληση σε μια επαφή χωρίς relay, μέσα στη συνομιλία, και το άλλο τηλέφωνο την παίρνει μόνο του.',
  '**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.':
    '**Ειδοποίηση για νέα έκδοση** (Android): μία φορά τη μέρα το Erevos ρωτά τον server του LPHL και δείχνει μια καρφιτσωμένη γραμμή Erevos και μια ειδοποίηση, μόνο για έκδοση υπογεγραμμένη από τον υπολογιστή εκδόσεων. Κλείνει από Ρυθμίσεις → Γενικά → Ενημερώσεις.',
  '**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.':
    '**Κλείδωμα συνομιλίας με PIN**: Λεπτομέρειες → Κλείδωμα με PIN, για συνομιλίες και ομάδες. Τίποτα από αυτή δεν φαίνεται στην αναζήτηση, στα μηνύματα με αστέρι ή στις εισαγωγές. Στις κρυφές συνομιλίες δεν ζητά PIN.',
  '**A new handset** on the green tiles: Phone, and the call in a chat.': '**Νέο ακουστικό** στα πράσινα πλακίδια: Τηλέφωνο, και η κλήση μέσα στη συνομιλία.',
  '**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.':
    '**Νέα οθόνη Νέα συνομιλία**: το «Πώς συνδέεσαι τώρα» πάνω πάνω, τρεις μεγάλες κάρτες για τηλέφωνο χωρίς relay (Έχω πρόσκληση, Σύνδεση με LPHL, Ξεκίνα χωρίς relay), και τα τεχνικά κάτω από το «Για προχωρημένους».',
  '**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.':
    '**Nostr πιο σταθερό μέσω Tor**: κάθε Nostr relay έχει δική του διαδρομή μέσω Tor, και μετά από αποτυχία δοκιμάζει νέα έξοδο. Πιο καθαρό μήνυμα λάθους στην οθόνη Nostr.',
  '**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.':
    '**Όταν κόβεται η σύνδεση με το relay** ενώ το Erevos περιμένει, το Erevos το καταλαβαίνει και ξανασυνδέεται, εκεί που πριν έμενε κολλημένο.',
  '**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.':
    '**Πρόσκληση με SMS** (Android): στην κάρτα μιας επαφής του τηλεφώνου, για ένα άτομο, για 2 μέρες. Ο σύνδεσμος ανοίγει μια σελίδα που προσφέρει το Erevos (το APK για Android, το web app για iPhone ή υπολογιστή) και μετά ανοίγει την πρόσκληση. Το QR και η Κοινοποίηση της πρόσκλησης μένουν όπως ήταν.',
  '**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.':
    '**Διορθώσεις στην πρόσκληση με SMS**: δέχεται και σύνδεσμο που αντιγράφηκε ως /i/#…, ένα παλαιότερο web app ανοίγει κι αυτό την πρόσκληση, και στο iOS 26 λέει ότι η Κοινοποίηση είναι στο •••.',
  '**A phone call button** in Erevos chats and SMS chats.': '**Κουμπί τηλεφωνικής κλήσης** στις συνομιλίες Erevos και στις συνομιλίες SMS.',
  // 3.2.1
  '**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.':
    '**Διόρθωση μηνύματος** που έστειλες, έως μία μέρα μετά: σε επαφές, ομάδες και συνδεδεμένες συσκευές, με «Επεξεργασμένο» δίπλα στην ώρα.',
  '**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.':
    '**Το Nostr λέει τι έκανε**: «Στάλθηκε μέσω Nostr», και στην οθόνη Nostr τι έκανε τελευταία κάθε relay.',
  '**Coloured call buttons** at the top of a chat: video blue, voice green.': '**Χρωματιστά κουμπιά κλήσης** πάνω στη συνομιλία: βίντεο μπλε, φωνή πράσινο.',
  // 3.2.0
  'Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.':
    'Βέλη για την αρχή και το τέλος της συνομιλίας· τα παλαιότερα μηνύματα έρχονται μόνα τους καθώς κυλάς.',
  'Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.':
    'Οι συνομιλίες που εισάγονται από Telegram και WhatsApp φαίνονται σαν μηνύματα του Erevos: φούσκες, ημέρες, φωτογραφίες, φωνητικά, αναζήτηση.',
  'Dogs instead of cats in the stickers.': 'Σκύλοι αντί για γάτες στα αυτοκόλλητα.',
  'Screenshots: a switch in Settings → Privacy and security.': 'Στιγμιότυπα οθόνης: διακόπτης στις Ρυθμίσεις → Απόρρητο και ασφάλεια.',
  'Hidden chats from New chat: hold it for a second.': 'Κρυφές συνομιλίες από τη Νέα συνομιλία: κράτησέ τη πατημένη ένα δευτερόλεπτο.',
  'Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.': 'Χρωματιστά πλακίδια στην αρχική: Τηλέφωνο πράσινο, Επαφές μωβ, κλειδαριά πορτοκαλί.',
  '**Chat with myself**, always first, and **Remind me**, the orange bell.': '**Συνομιλία με τον εαυτό μου**, πάντα πρώτη, και **Υπενθύμιση**, το πορτοκαλί καμπανάκι.',
  '**Media, links and files** in a chat’s Details, with a calendar and Go to a day.':
    '**Πολυμέσα, σύνδεσμοι και αρχεία** στις Λεπτομέρειες μιας συνομιλίας, με ημερολόγιο και Μετάβαση σε ημέρα.',
  'Import a chat from inside the chat: Details → Imported chats.': 'Εισαγωγή συνομιλίας μέσα από τη συνομιλία: Λεπτομέρειες → Εισαγμένες συνομιλίες.',
  'A closed space can say that a message came while another space is open.': 'Ένας κλειστός χώρος μπορεί να πει ότι ήρθε μήνυμα ενώ είναι ανοιχτός άλλος.',
  'The message menu says when a message went or came through Nostr.': 'Το μενού του μηνύματος λέει πότε ένα μήνυμα πήγε ή ήρθε μέσω Nostr.',
  '**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.': '**Στήριξε το Erevos**: Liberapay, PayPal, Monero, Bitcoin.',
  'Who makes Erevos and why, in About Erevos; the guide says why everywhere.': 'Ποιος φτιάχνει το Erevos και γιατί, στο Σχετικά με το Erevos· ο οδηγός λέει παντού το γιατί.',
  // 3.1.2
  '**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.':
    '**Ρυθμίσεις σε 8 ομάδες**, με αναζήτηση: Γενικά, Εμφάνιση, Ειδοποιήσεις, Απόρρητο και ασφάλεια, Relay και δίκτυα, Τηλέφωνο και SMS, Δεδομένα και συσκευές, Για δοκιμές. Το ⋯ της αρχικής κρατά μόνο τα μέρη, και τελευταίες τις Ρυθμίσεις.',
  // 3.1.1
  'Check for updates says what stopped an update.': 'Ο Έλεγχος για ενημερώσεις λέει τι εμπόδισε μια ενημέρωση.',
  'Invite someone is not made from a token for all; it asks you to sign in to the relay first.':
    'Η Πρόσκληση σε κάποιον δεν φτιάχνεται από κοινό token· ζητά πρώτα σύνδεση στο relay.',
  'The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).':
    'Το κοινό token του relay γίνεται μόνο του token του ίδιου του τηλεφώνου (θέλει ενημερωμένο relay).',
  'A relay that refuses through Tor says why.': 'Ένα relay που αρνείται μέσω Tor λέει γιατί.',
  // 3.1.0
  'Less battery in the background: the relay, Tor and the nearby radios.': 'Λιγότερη μπαταρία στο παρασκήνιο: relay, Tor και κοντινά ραδιόφωνα.',
  'Erevos no longer closes when you make a sticker from a photo.': 'Το Erevos δεν κλείνει πια όταν φτιάχνεις αυτοκόλλητο από φωτογραφία.',
  'Hidden chats’ notices are right.': 'Σωστές ειδοποιήσεις για τις κρυφές συνομιλίες.',
  'Hidden chats by holding New chat.': 'Κρυφές συνομιλίες με κράτημα της Νέας συνομιλίας.',
  'A search for contacts on the Phone.': 'Αναζήτηση επαφών στο Τηλέφωνο.',
  'New chat shows first how to add a contact.': 'Η Νέα συνομιλία δείχνει πρώτα πώς προσθέτεις επαφή.',
  'A call shows over the screen saver, and the screen wakes.': 'Η κλήση φαίνεται πάνω από την προφύλαξη οθόνης, και η οθόνη ξυπνά.',
  'Erevos in other apps’ Share.': 'Το Erevos στην Κοινοποίηση των άλλων εφαρμογών.',
  'A sound for every new message, also while Erevos shows.': 'Ήχος για κάθε νέο μήνυμα, και όσο φαίνεται το Erevos.',
  'The SMS settings say right what holding does.': 'Οι ρυθμίσεις SMS λένε σωστά τι κάνει το κράτημα.',
  // 3.0.0
  'Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.': 'Κάθε εικονίδιο ανοίγει αυτό που γράφει: Erevos, SMS, Τηλέφωνο, Επαφές, widget.',
  '**Messages through Tor by default**: Messages, Everything or Nothing.': '**Μηνύματα μέσω Tor εξ ορισμού**: Μηνύματα, Όλα ή Τίποτα.',
  '**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.':
    '**Κείμενα μέσω Nostr**: τρία δημόσια relay, μέσω Tor, με εφεδρεία το δικό σου relay μετά από 5 λεπτά.',
  // 2.0.3
  'One invite for everything: the relay and the contact together.': 'Μία πρόσκληση για όλα: το relay και η επαφή μαζί.',
  'Spam rules for senders and numbers abroad, with the reason.': 'Κανόνες spam για αποστολείς και αριθμούς εξωτερικού, με το γιατί.',
  '480 stickers in 20 sets.': '480 αυτοκόλλητα σε 20 σετ.',
  'Lighter chats on older phones; QR codes at once.': 'Πιο ελαφριές συνομιλίες σε παλαιότερα τηλέφωνα· QR αμέσως.',
  'Copy code for one-time codes in SMS.': 'Αντιγραφή κωδικού για τους κωδικούς μιας χρήσης στα SMS.',
  'Locked, Erevos keeps receiving.': 'Κλειδωμένο, το Erevos συνεχίζει να λαμβάνει.',
  'Faster contacts; the hidden chats’ notice counts only messages.': 'Γρηγορότερες επαφές· η ειδοποίηση των κρυφών συνομιλιών μετρά μόνο μηνύματα.',
  'The relay tries every address: push, other relays, the LPHL sign-in.': 'Το relay δοκιμάζει κάθε διεύθυνση: push, άλλα relay, σύνδεση με LPHL.',
  // 2.0.2
  'Swiping on the tabs only changes the tab.': 'Το σύρσιμο στις καρτέλες αλλάζει μόνο καρτέλα.',
  'The icons fill the launcher’s shape.': 'Τα εικονίδια γεμίζουν το σχήμα του launcher.',
  // 2.0.1
  'Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.':
    'Χρωματιστά εικονίδια (Erevos κόκκινο, Τηλέφωνο πράσινο, SMS μπλε, Επαφές μωβ) και νέο εικονίδιο SMS.',
  'A colour for each icon, and the order of the widget’s buttons.': 'Χρώμα για κάθε εικονίδιο, και η σειρά των κουμπιών του widget.',
  'Swipe to go back, and between tabs.': 'Σύρσιμο για πίσω, και ανάμεσα σε καρτέλες.',
  // 2.0.0
  'An update of the WebView no longer closes Erevos.': 'Μια ενημέρωση του WebView δεν κλείνει πια το Erevos.',
  'Deleting or blocking a contact gives you a new queue on the relay.': 'Η διαγραφή ή ο αποκλεισμός μιας επαφής σού δίνει νέα ουρά στο relay.',
  'A new contact can take the name of a contact on the phone.': 'Μια νέα επαφή μπορεί να πάρει το όνομα μιας επαφής του τηλεφώνου.',
  '**Sign in to the relay with LPHL**, and **invites to the relay**.': '**Σύνδεση στο relay με LPHL**, και **προσκλήσεις στο relay**.',
  'Permissions in the web app, and more on Android; the web app’s notice says how many came.':
    'Άδειες στο web app, και περισσότερες στο Android· η ειδοποίηση του web app λέει πόσα ήρθαν.',
  'Hidden chats can ring calls while they are closed.': 'Οι κρυφές συνομιλίες μπορούν να χτυπούν κλήσεις ενώ είναι κλειστές.',
  'New keys every month in chats, every week in groups.': 'Νέα κλειδιά κάθε μήνα στις συνομιλίες, κάθε εβδομάδα στις ομάδες.',
  'Linked devices work with the phone off.': 'Οι συνδεδεμένες συσκευές δουλεύουν με το τηλέφωνο κλειστό.',
  'A new chat screen; QR codes from a photo; the Phone for small screens.': 'Νέα οθόνη συνομιλίας· QR από φωτογραφία· το Τηλέφωνο για μικρές οθόνες.',
  'Add as contact inside a group.': 'Προσθήκη ως επαφή μέσα σε ομάδα.',
  'Stickers in sets, moving, and your own.': 'Αυτοκόλλητα σε σετ, κινούμενα, και δικά σου.',
  'SMS inside the Erevos chat.': 'SMS μέσα στη συνομιλία του Erevos.',
  'Android updates need the release computer’s signature.': 'Οι ενημερώσεις Android θέλουν την υπογραφή του υπολογιστή εκδόσεων.',
  'An F-Droid build; Serbo-Croatian; new version numbers.': 'Έκδοση για το F-Droid· Σερβοκροατικά· νέα αρίθμηση εκδόσεων.',
  'Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.':
    'Πολλά για την ασφάλεια: Argon2id, μηνύματα κρυπτογραφημένα και για το relay, token για κάθε τηλέφωνο, κανένας σύνδεσμος δεν ξεκινά κλήση.',
  // 0.1.16
  'Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.': 'Οι εισαγωγές από Telegram και WhatsApp φέρνουν φωτογραφίες, βίντεο, φωνητικά και αρχεία.',
  'A phone without a relay talks through a place on a contact’s relay.': 'Ένα τηλέφωνο χωρίς relay μιλά μέσω μιας θέσης στο relay μιας επαφής.',
  // 0.1.14
  'Back to my chats, for hidden chats.': 'Επιστροφή στις συνομιλίες μου, για τις κρυφές συνομιλίες.',
  'Erevos receives and rings even after you swipe it away from the recent apps.': 'Το Erevos λαμβάνει και χτυπά ακόμη και αφού το διώξεις από τις πρόσφατες εφαρμογές.',
  // 0.1.12
  'Hidden chats can say a message came.': 'Οι κρυφές συνομιλίες μπορούν να πουν ότι ήρθε μήνυμα.',
  'Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.': 'Διορθώσεις: μενού, QR από φωτογραφία, Bluetooth στο Android 17, μεγάλες λίστες.',
  // 0.1.11
  'The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.':
    'Το Τηλέφωνο χωρίς τον κωδικό, αν το επιτρέψεις· widget για την αρχική οθόνη· φίλτρο SMS και Erevos.',
  // 0.1.10
  'Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.': 'Οι σύνδεσμοι περιμένουν τον κωδικό· εικονίδια Τηλεφώνου και Επαφών· το Erevos ID σε μια επαφή.',
  // 0.1.8
  '61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.':
    '61 νέες λειτουργίες: 5 νέες γλώσσες, συνδεδεμένες συσκευές, δημόσιες ομάδες, απαντήσεις, αντιδράσεις, δημοσκοπήσεις, αποστολή αργότερα, το Erevos ως εφαρμογή τηλεφώνου και επαφών, γέφυρες Tor, δακτυλικό αποτύπωμα, Windows και άλλα.',
  // 0.1.7 to 0.1.2
  'SMS notices in the background.': 'Ειδοποιήσεις SMS στο παρασκήνιο.',
  'The web app comes out with every release.': 'Το web app βγαίνει μαζί με κάθε έκδοση.',
  'Greek in the whole app.': 'Ελληνικά σε όλη την εφαρμογή.',
  'Web Push in the web app.': 'Web Push στο web app.',
  'The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.':
    'Η πρώτη υπογεγραμμένη έκδοση για Android: κρυπτογραφημένες συνομιλίες, κλήσεις, ομάδες, κρυφές συνομιλίες, αντίγραφα ασφαλείας, εισαγωγές, και κοντινά τηλέφωνα χωρίς internet.',
  "**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls.":
    "**Δύο νέα σετ αυτοκόλλητων με 24 διαθέσεις**: ο **Tux**, ο πιγκουίνος του Linux όπως είναι σχεδιασμένος, και το **Αϊκίντο**, ένας αϊκιντόκα με κεικόγκι και φαρδύ χακάμα, που επίσης υποκλίνεται, κάθεται σε σέιζα και κάνει κυβίστηση.",
};
