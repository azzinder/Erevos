// The Greek of the SMS screen's own tools: pinning, archive, drafts, blocking and the like (i18n/el/index.ts).
export const smsTools: Record<string, string> = {
  // The list and its folders (app/index.tsx, app/sms-folder.tsx, components/sms-actions.tsx).
  Names: 'Ονόματα',
  'All messages': 'Όλα',
  'Archived · {n}': 'Αρχειοθετημένες · {n}',
  'Spam · {n}': 'Ανεπιθύμητα · {n}',
  'Trash · {n}': 'Κάδος · {n}',
  'Draft': 'Πρόχειρο',
  'Archive': 'Αρχειοθέτηση',
  'Unarchive': 'Κατάργηση αρχειοθέτησης',
  'Archived conversations': 'Αρχειοθετημένες συνομιλίες',
  'Spam': 'Ανεπιθύμητα',
  'Trash': 'Κάδος',
  'Pin to the top': 'Καρφίτσωμα στην κορυφή',
  'Unpin': 'Ξεκαρφίτσωμα',
  'Mark as spam': 'Σήμανση ως ανεπιθύμητο',
  'Not spam': 'Δεν είναι ανεπιθύμητο',
  'Block {number}': 'Αποκλεισμός του {number}',
  'Unblock {number}': 'Άρση αποκλεισμού του {number}',
  'Undo': 'Αναίρεση',
  'Not done': 'Δεν έγινε',
  'OK': 'OK',
  'Archived. A new SMS from them brings it back.': 'Αρχειοθετήθηκε. Ένα νέο SMS από αυτούς τη φέρνει πίσω.',
  'Back in the list.': 'Ξανά στη λίστα.',
  'The Trash is full. Empty it first.': 'Ο κάδος είναι γεμάτος. Άδειασέ τον πρώτα.',
  'In the Trash. It goes from the phone in {days} days.': 'Στον κάδο. Φεύγει από το τηλέφωνο σε {days} ημέρες.',
  'At most {n} conversations stay pinned. Unpin one first.': 'Έως {n} συνομιλίες μένουν καρφιτσωμένες. Ξεκαρφίτσωσε πρώτα μία.',
  'Not spam: back in the list.': 'Δεν είναι ανεπιθύμητο: ξανά στη λίστα.',
  'Marked as spam: it is in Spam.': 'Σημειώθηκε ως ανεπιθύμητο: είναι στα «Ανεπιθύμητα».',
  'Block {number}?': 'Αποκλεισμός του {number};',
  "It goes into Android's own list of blocked numbers: Android rejects its SMS, MMS and calls, in every space and in the phone app too, until you unblock it. The conversation goes to Spam.":
    'Μπαίνει στη λίστα αποκλεισμένων αριθμών του ίδιου του Android: το Android απορρίπτει τα SMS, τα MMS και τις κλήσεις του, σε κάθε χώρο και στην εφαρμογή τηλεφώνου, μέχρι να άρεις τον αποκλεισμό. Η συνομιλία πηγαίνει στα «Ανεπιθύμητα».',
  'Blocked.': 'Αποκλείστηκε.',
  'Unblocked.': 'Ο αποκλεισμός άρθηκε.',
  'Empty the Trash': 'Άδειασμα κάδου',
  'Delete {n} conversation from the phone now? They cannot be brought back.': 'Διαγραφή {n} συνομιλίας από το τηλέφωνο τώρα; Δεν μπορεί να επανέλθει.',
  'Delete {n} conversations from the phone now? They cannot be brought back.': 'Διαγραφή {n} συνομιλιών από το τηλέφωνο τώρα; Δεν μπορούν να επανέλθουν.',
  'Delete the SMS with {name} from the phone now? They cannot be brought back.': 'Διαγραφή των SMS με {name} από το τηλέφωνο τώρα; Δεν μπορούν να επανέλθουν.',
  'Delete for good': 'Οριστική διαγραφή',
  'Some could not be deleted. Try again.': 'Κάποιες δεν διαγράφηκαν. Δοκίμασε ξανά.',
  'Only the SMS app can delete SMS: make Erevos the SMS app under SMS in the menu.': 'Μόνο η εφαρμογή SMS μπορεί να διαγράψει SMS: κάνε το Erevos εφαρμογή SMS από το SMS στο μενού.',
  'This build of Erevos cannot delete SMS yet.': 'Αυτή η έκδοση του Erevos δεν μπορεί ακόμα να διαγράψει SMS.',
  'Deleted on {when}. Goes from the phone on {then}.': 'Διαγράφηκε στις {when}. Φεύγει από το τηλέφωνο στις {then}.',
  'Bring back': 'Επαναφορά',
  'Delete now': 'Διαγραφή τώρα',
  'The Trash is empty.': 'Ο κάδος είναι άδειος.',
  'No spam.': 'Κανένα ανεπιθύμητο.',
  'Nothing archived.': 'Τίποτα αρχειοθετημένο.',
  "Conversations you deleted, kept {days} days in case you want them back, then deleted from the phone. Only this space hides them meanwhile: they are still in the phone's SMS.":
    'Συνομιλίες που διέγραψες, κρατημένες {days} ημέρες σε περίπτωση που τις θέλεις πίσω, και μετά διαγραμμένες από το τηλέφωνο. Ως τότε τις κρύβει μόνο αυτός ο χώρος: είναι ακόμα στα SMS του τηλεφώνου.',
  'SMS from numbers you blocked or marked as spam, and those the spam filter caught. The filter works on this phone alone and sends nothing anywhere. Hold one down to say it is not spam.':
    'SMS από αριθμούς που απέκλεισες ή σημείωσες ως ανεπιθύμητους, και όσα έπιασε το φίλτρο. Το φίλτρο δουλεύει μόνο σε αυτό το τηλέφωνο και δεν στέλνει τίποτα πουθενά. Κράτα πατημένο ένα για να πεις ότι δεν είναι ανεπιθύμητο.',
  'Conversations you archived. One comes back to the list when a new SMS comes from them. Hold one down for more.':
    'Συνομιλίες που αρχειοθέτησες. Μία επιστρέφει στη λίστα όταν έρθει νέο SMS από αυτούς. Κράτα πατημένη μία για περισσότερα.',

  // A conversation (app/sms.tsx).
  'In Spam': 'Στα «Ανεπιθύμητα»',
  'Archived': 'Αρχειοθετημένη',
  'In the Trash': 'Στον κάδο',
  'More': 'Περισσότερα',
  'The messages before are in the Trash.': 'Τα προηγούμενα μηνύματα είναι στον κάδο.',
  'Tap to send it again.': 'Πάτησε για να σταλεί ξανά.',
  'Send it again?': 'Να σταλεί ξανά;',
  'Send again': 'Αποστολή ξανά',
  'This build of Erevos cannot send an MMS again yet.': 'Αυτή η έκδοση του Erevos δεν μπορεί ακόμα να στείλει ξανά MMS.',
  'Message deleted.': 'Το μήνυμα διαγράφηκε.',
  'Hold the words down to copy them.': 'Κράτα πατημένες τις λέξεις για να τις αντιγράψεις.',
  'Goes in {n} s · tap to take it back': 'Φεύγει σε {n} δ. · πάτησε για να το πάρεις πίσω',
  'It writes with a name, not a number, so it cannot be answered.': 'Γράφει με όνομα, όχι με αριθμό, οπότε δεν μπορείς να του απαντήσεις.',
  'Forward': 'Προώθηση',
  'It opens in the conversation you choose, to read and send there. To a number its picture goes too, as an MMS; into a chat only its words.':
    'Ανοίγει στη συνομιλία που διαλέγεις, για να το διαβάσεις και να το στείλεις εκεί. Σε αριθμό πηγαίνει και η εικόνα του, ως MMS· σε συνομιλία μόνο οι λέξεις του.',
  'It opens in the conversation you choose, to read and send there.': 'Ανοίγει στη συνομιλία που διαλέγεις, για να το διαβάσεις και να το στείλεις εκεί.',
  'Into an Erevos chat': 'Σε συνομιλία του Erevos',

  // The SMS settings (app/sms-settings.tsx).
  'With the names come the pictures your contacts have, in the list and in the conversation. They too are read only to show them.':
    'Μαζί με τα ονόματα έρχονται και οι εικόνες των επαφών σου, στη λίστα και στη συνομιλία. Κι αυτές διαβάζονται μόνο για να φανούν.',
  'Archived, Spam and Trash': 'Αρχειοθετημένες, ανεπιθύμητα και κάδος',
  "In the list, swipe an SMS conversation to the right to archive it, to the left to delete it, or hold it down to pin it at the top and more. This space keeps its own pins, archived conversations, Trash and spam marks, sealed with its password; the SMS stay in the phone's SMS, where another space sees them as they are.":
    'Στη λίστα, σύρε μια συνομιλία SMS δεξιά για να την αρχειοθετήσεις, αριστερά για να τη διαγράψεις, ή κράτα την πατημένη για να την καρφιτσώσεις στην κορυφή και άλλα. Αυτός ο χώρος κρατά τα δικά του καρφιτσώματα, αρχειοθετημένες συνομιλίες, κάδο και σημάνσεις ανεπιθύμητων, κρυπτογραφημένα με τον κωδικό του· τα SMS μένουν στα SMS του τηλεφώνου, όπου ένας άλλος χώρος τα βλέπει όπως είναι.',
  'Spam filter': 'Φίλτρο ανεπιθύμητων',
  'It works on this phone alone, by rules, and sends nothing anywhere. An SMS from a number that is no contact and was never answered goes to Spam when it has a link with words that try to fool, like a parcel held or a prize, or one of your words below. A number you marked as spam always goes there, one you marked not spam never does.':
    'Δουλεύει μόνο σε αυτό το τηλέφωνο, με κανόνες, και δεν στέλνει τίποτα πουθενά. Ένα SMS από αριθμό που δεν είναι επαφή και στον οποίο δεν απάντησες ποτέ πηγαίνει στα «Ανεπιθύμητα» όταν έχει σύνδεσμο με λόγια που πάνε να ξεγελάσουν, όπως ένα δέμα που κρατιέται ή ένα έπαθλο, ή μία από τις λέξεις σου παρακάτω. Ένας αριθμός που σημείωσες ως ανεπιθύμητο πηγαίνει πάντα εκεί, ένας που σημείωσες ότι δεν είναι ποτέ.',
  'Turn the spam filter off': 'Απενεργοποίηση φίλτρου',
  'Turn the spam filter on': 'Ενεργοποίηση φίλτρου',
  'Let links from unknown numbers through': 'Να περνούν οι σύνδεσμοι από άγνωστους αριθμούς',
  'Send every link from unknown numbers to Spam': 'Κάθε σύνδεσμος από άγνωστο αριθμό στα «Ανεπιθύμητα»',
  'Your words': 'Οι λέξεις σου',
  'An SMS with one of them goes to Spam, from any number or sender that is no contact. Tap a word to remove it.':
    'Ένα SMS με μία από αυτές πηγαίνει στα «Ανεπιθύμητα», από κάθε αριθμό ή αποστολέα που δεν είναι επαφή. Πάτησε μια λέξη για να την αφαιρέσεις.',
  'A word or a few': 'Μια λέξη ή λίγες',
  'At most {n} words, each up to {length} letters.': 'Έως {n} λέξεις, η καθεμία έως {length} γράμματα.',
  'A notice still says "New message" when spam comes, as it shows before Erevos is opened. Block a number to hear nothing more from it.':
    'Μια ειδοποίηση λέει ακόμα «Νέο μήνυμα» όταν έρχεται ανεπιθύμητο, γιατί φαίνεται πριν ανοίξει το Erevos. Απόκλεισε έναν αριθμό για να μην ακούς τίποτα πια από αυτόν.',
  'Blocked numbers': 'Αποκλεισμένοι αριθμοί',
  "These are Android's own blocked numbers: Android rejects their SMS, MMS and calls. Every space, and the phone app, sees the same list. Block one from its conversation, with ⋮, or here.":
    'Αυτοί είναι οι αποκλεισμένοι αριθμοί του ίδιου του Android: το Android απορρίπτει τα SMS, τα MMS και τις κλήσεις τους. Κάθε χώρος, και η εφαρμογή τηλεφώνου, βλέπει την ίδια λίστα. Απόκλεισε έναν από τη συνομιλία του, με το ⋮, ή εδώ.',
  'Only the SMS app or the phone app can see and change them: make Erevos the SMS app above.':
    'Μόνο η εφαρμογή SMS ή η εφαρμογή τηλεφώνου μπορεί να τους δει και να τους αλλάξει: κάνε το Erevos εφαρμογή SMS παραπάνω.',
  'This build of Erevos cannot block numbers yet.': 'Αυτή η έκδοση του Erevos δεν μπορεί ακόμα να αποκλείσει αριθμούς.',
  'No number is blocked.': 'Κανένας αριθμός δεν είναι αποκλεισμένος.',
  'Type one phone number.': 'Γράψε έναν αριθμό τηλεφώνου.',
  'Unblock {number}?': 'Άρση αποκλεισμού του {number};',
  'Its SMS, MMS and calls reach the phone again.': 'Τα SMS, τα MMS και οι κλήσεις του φτάνουν ξανά στο τηλέφωνο.',
  'Unblock': 'Άρση αποκλεισμού',
  'Taking an SMS back': 'Ανάκληση SMS',
  'An SMS you send waits this long at the end of the conversation before it goes: tap it then to take it back. When you leave Erevos, it goes at once.':
    'Ένα SMS που στέλνεις περιμένει τόσο στο τέλος της συνομιλίας πριν φύγει: πάτησέ το τότε για να το πάρεις πίσω. Όταν βγαίνεις από το Erevos, φεύγει αμέσως.',

  // The phone's SMS in backups (app/backup.tsx).
  "The phone's SMS": 'Τα SMS του τηλεφώνου',
  "Backups can hold the phone's SMS and MMS too, with up to {mb} MB of their pictures, sealed with the backup's password. Restoring the backup puts back into the phone's SMS each one it does not have, and deletes none.":
    'Τα αντίγραφα μπορούν να έχουν και τα SMS και τα MMS του τηλεφώνου, με έως {mb} MB από τις εικόνες τους, κρυπτογραφημένα με τον κωδικό του αντιγράφου. Η επαναφορά του αντιγράφου βάζει πίσω στα SMS του τηλεφώνου όσα δεν έχει, και δεν διαγράφει κανένα.',
  'Erevos reads them only while it is the SMS app: make it the SMS app under SMS in the menu.': 'Το Erevos τα διαβάζει μόνο όσο είναι η εφαρμογή SMS: κάνε το εφαρμογή SMS από το SMS στο μενού.',
  'Put the SMS in backups': 'Να μπαίνουν τα SMS στα αντίγραφα',
  'Leave the SMS out': 'Να μη μπαίνουν τα SMS',
  "It holds {sms} SMS and {mms} MMS of the phone's.": 'Έχει {sms} SMS και {mms} MMS του τηλεφώνου.',
  '{n} picture did not fit and stayed out.': '{n} εικόνα δεν χώρεσε και έμεινε έξω.',
  '{n} pictures did not fit and stayed out.': '{n} εικόνες δεν χώρεσαν και έμειναν έξω.',
  'SMS in this backup': 'SMS σε αυτό το αντίγραφο',
  "This backup also holds the phone's SMS. They go back into the phone's SMS only while Erevos is the SMS app: make it the SMS app under SMS in the menu, then restore again. Or restore the rest now, without them.":
    'Αυτό το αντίγραφο έχει και τα SMS του τηλεφώνου. Επιστρέφουν στα SMS του τηλεφώνου μόνο όσο το Erevos είναι η εφαρμογή SMS: κάνε το εφαρμογή SMS από το SMS στο μενού, και μετά κάνε ξανά επαναφορά. Ή επανάφερε τώρα τα υπόλοιπα, χωρίς αυτά.',
  'Without the SMS': 'Χωρίς τα SMS',
  'Putting the SMS back into the phone…': 'Τα SMS επιστρέφουν στο τηλέφωνο…',
  "{sms} SMS and {mms} MMS went back into the phone's SMS. Those it had already stayed as they were.": '{sms} SMS και {mms} MMS επέστρεψαν στα SMS του τηλεφώνου. Όσα είχε ήδη έμειναν όπως ήταν.',
  'A newer Erevos made this backup: what this one does not know yet stays out. Update Erevos first to restore all of it.':
    'Αυτό το αντίγραφο το έφτιαξε ένα νεότερο Erevos: ό,τι δεν γνωρίζει ακόμα αυτό εδώ μένει έξω. Ενημέρωσε πρώτα το Erevos για να τα επαναφέρεις όλα.',
  "The SMS could not go back into the phone's SMS: {error}": 'Τα SMS δεν μπόρεσαν να επιστρέψουν στα SMS του τηλεφώνου: {error}',
};
