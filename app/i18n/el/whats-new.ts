// The Greek of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/el/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Τι νέο υπάρχει',
  'What each version changed': 'Τι άλλαξε σε κάθε έκδοση',
  'What each version of Erevos changed, the newest first.': 'Τι άλλαξε σε κάθε έκδοση του Erevos, η νεότερη πρώτη.',
  'Not out yet': 'Δεν έχει βγει ακόμη',
  'This version': 'Αυτή η έκδοση',
  // Not out yet.
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Το relay σου αποδεικνύει το δικό του κλειδί**: κάθε σύνδεση ξεκινά με έναν έλεγχο που περνά μόνο το relay που έχει αυτό το κλειδί, οπότε κανείς ενδιάμεσος δεν μπορεί να περάσει για αυτό. Μόλις το αποδείξει, το Erevos δεν συνδέεται πια σε αυτό χωρίς τον έλεγχο. Το relay σου χρειάζεται ενημέρωση γι’ αυτό.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Διαφάνεια](#transparency), νέο μέρος του οδηγού: τι κρατά ο server πίσω από το Erevos και για πόσο, τι δεν κρατά, και ποιος άλλος βλέπει κάτι.',
  "**What's new**: this list, in Settings → General, by version.": '**Τι νέο υπάρχει**: αυτή η λίστα, στις Ρυθμίσεις → Γενικά, ανά έκδοση.',
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
};
