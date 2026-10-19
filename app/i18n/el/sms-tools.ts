// The Greek of the SMS screen's own tools: pinning, archive, drafts, blocking and the like (i18n/el/index.ts).
export const smsTools: Record<string, string> = {
  // The list and its folders (app/index.tsx, app/sms-folder.tsx, components/sms-actions.tsx).
  'Archived · {n}': 'Αρχειοθετημένες · {n}',
  'Trash · {n}': 'Κάδος · {n}',
  'Archive': 'Αρχειοθέτηση',
  'Unarchive': 'Κατάργηση αρχειοθέτησης',
  'Archived conversations': 'Αρχειοθετημένες συνομιλίες',
  'Trash': 'Κάδος',
  'Pin to the top': 'Καρφίτσωμα στην κορυφή',
  'Unpin': 'Ξεκαρφίτσωμα',
  'Undo': 'Αναίρεση',
  'Not done': 'Δεν έγινε',
  'OK': 'OK',
  'Archived. A new SMS from them brings it back.': 'Αρχειοθετήθηκε. Ένα νέο SMS από αυτούς τη φέρνει πίσω.',
  'Back in the list.': 'Ξανά στη λίστα.',
  'The Trash is full. Empty it first.': 'Ο κάδος είναι γεμάτος. Άδειασέ τον πρώτα.',
  'In the Trash. It goes from the phone in {days} days.': 'Στον κάδο. Φεύγει από το τηλέφωνο σε {days} ημέρες.',
  'At most {n} conversations stay pinned. Unpin one first.': 'Έως {n} συνομιλίες μένουν καρφιτσωμένες. Ξεκαρφίτσωσε πρώτα μία.',
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
  'Nothing archived.': 'Τίποτα αρχειοθετημένο.',
  "Conversations you deleted, kept {days} days in case you want them back, then deleted from the phone. Only this space hides them meanwhile: they are still in the phone's SMS.":
    'Συνομιλίες που διέγραψες, κρατημένες {days} ημέρες σε περίπτωση που τις θέλεις πίσω, και μετά διαγραμμένες από το τηλέφωνο. Ως τότε τις κρύβει μόνο αυτός ο χώρος: είναι ακόμα στα SMS του τηλεφώνου.',
  'Conversations you archived. One comes back to the list when a new SMS comes from them. Hold one down for more.':
    'Συνομιλίες που αρχειοθέτησες. Μία επιστρέφει στη λίστα όταν έρθει νέο SMS από αυτούς. Κράτα πατημένη μία για περισσότερα.',

  // A conversation (app/sms.tsx).
  'Archived': 'Αρχειοθετημένη',
  'In the Trash': 'Στον κάδο',
  'More': 'Περισσότερα',
  'The messages before are in the Trash.': 'Τα προηγούμενα μηνύματα είναι στον κάδο.',
  'It writes with a name, not a number, so it cannot be answered.': 'Γράφει με όνομα, όχι με αριθμό, οπότε δεν μπορείς να του απαντήσεις.',

  // The SMS settings (app/sms-settings.tsx).
  'Archived and Trash': 'Αρχειοθετημένες και κάδος',
  "In the list, swipe an SMS conversation to the right to archive it, to the left to delete it, or hold it down to pin it at the top and more. This space keeps its own pins, archived conversations and Trash, sealed with its password; the SMS stay in the phone's SMS, where another space sees them as they are.":
    'Στη λίστα, σύρε μια συνομιλία SMS δεξιά για να την αρχειοθετήσεις, αριστερά για να τη διαγράψεις, ή κράτα την πατημένη για να την καρφιτσώσεις στην κορυφή και άλλα. Αυτός ο χώρος κρατά τα δικά του καρφιτσώματα, αρχειοθετημένες συνομιλίες και κάδο, σφραγισμένα με τον κωδικό του· τα SMS μένουν στα SMS του τηλεφώνου, όπου ένας άλλος χώρος τα βλέπει όπως είναι.',
};
