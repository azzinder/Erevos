// The Greek of what a chat's messages can do beyond words: replies, reactions, links, forwarding and the like (i18n/el/index.ts).
export const messages: Record<string, string> = {
  'Open this link?': 'Να ανοίξει αυτός ο σύνδεσμος;',
  // A message's menu (components/message-menu.tsx), replies and reactions.
  'Take back {emoji}': 'Πάρε πίσω το {emoji}',
  'React with {emoji}': 'Αντίδραση με {emoji}',
  'More reactions': 'Περισσότερες αντιδράσεις',
  'Goes to the message it answers': 'Πηγαίνει στο μήνυμα που απαντά',
  'The message is not on this phone.': 'Το μήνυμα δεν είναι σε αυτό το τηλέφωνο.',
  'Reactions: {list}': 'Αντιδράσεις: {list}',
  'That message is not on this phone.': 'Αυτό το μήνυμα δεν είναι σε αυτό το τηλέφωνο.',
  'Copied. Any app that reads the clipboard can read it now.': 'Αντιγράφηκε. Όποια εφαρμογή διαβάζει το πρόχειρο μπορεί πλέον να το διαβάσει.',
  'Not copied.': 'Δεν αντιγράφηκε.',
  Reply: 'Απάντηση',
  Copy: 'Αντιγραφή',
  'Tap to play, hold for more': 'Πάτα για αναπαραγωγή, κράτα πατημένο για περισσότερα',
  'Tap to open, hold for more': 'Πάτα για άνοιγμα, κράτα πατημένο για περισσότερα',
  'Hold for more': 'Κράτα πατημένο για περισσότερα',
  // Pinned messages (components/message-parts.tsx, Pinned).
  Pin: 'Καρφίτσωμα',
  Unpin: 'Ξεκαρφίτσωμα',
  Pinned: 'Καρφιτσωμένο',
  'Pinned, {n} of {count}': 'Καρφιτσωμένο, {n} από {count}',
  'Goes to the pinned message': 'Πηγαίνει στο καρφιτσωμένο μήνυμα',
  // Starred messages (app/starred.tsx, and a chat's details).
  Star: 'Αστέρι',
  Unstar: 'Χωρίς αστέρι',
  'Starred messages': 'Μηνύματα με αστέρι',
  'The messages you starred, in all your chats': 'Τα μηνύματα που σημείωσες με αστέρι, σε όλες τις συνομιλίες σου',
  'No starred messages. Press and hold a message in a chat, then tap Star.':
    'Κανένα μήνυμα με αστέρι. Κράτα πατημένο ένα μήνυμα σε μια συνομιλία και πάτα Αστέρι.',
  'You to {name}': 'Εσύ προς {name}',
  // Stickers (lib/stickers.ts, components/stickers.tsx).
  'Send a sticker': 'Αποστολή αυτοκόλλητου',
  'Sticker: {name}': 'Αυτοκόλλητο: {name}',
  'Smiling moon': 'Χαμογελαστό φεγγάρι',
  'Laughing moon': 'Φεγγάρι που γελάει',
  'Moon in love': 'Ερωτευμένο φεγγάρι',
  'Winking moon': 'Φεγγάρι που κλείνει το μάτι',
  'Surprised moon': 'Έκπληκτο φεγγάρι',
  'Sad moon': 'Λυπημένο φεγγάρι',
  'Angry moon': 'Θυμωμένο φεγγάρι',
  'Sleeping moon': 'Φεγγάρι που κοιμάται',
  Heart: 'Καρδιά',
  Sunshine: 'Λιακάδα',
  Coffee: 'Καφές',
  'All good': 'Όλα καλά',
  // A place sent once (lib/place.ts, components/message-parts.tsx).
  Location: 'Τοποθεσία',
  'Finding where you are…': 'Βρίσκω πού είσαι…',
  'Send where you are?': 'Να σταλεί πού είσαι;',
  'Within about {m} m': 'Με ακρίβεια περίπου {m} μ.',
  '{name} gets this place once, end-to-end encrypted. Erevos does not follow where you go after.':
    'Ο/η {name} παίρνει αυτό το σημείο μία φορά, κρυπτογραφημένο από άκρο σε άκρο. Το Erevos δεν ακολουθεί πού πας μετά.',
  'Open in maps': 'Άνοιγμα στους χάρτες',
  'Open in maps?': 'Άνοιγμα στους χάρτες;',
  'Your maps app opens at this place. It may load its map from the internet, as it does.':
    'Η εφαρμογή χαρτών σου ανοίγει σε αυτό το σημείο. Μπορεί να φορτώσει τον χάρτη της από το ίντερνετ, όπως κάνει πάντα.',
  'This build of Erevos cannot send a place.': 'Αυτή η έκδοση του Erevos δεν μπορεί να στείλει τοποθεσία.',
  "Erevos may not use the phone's location. Allow it in the phone settings to send where you are.":
    'Το Erevos δεν έχει άδεια για την τοποθεσία του τηλεφώνου. Δώσε την άδεια στις ρυθμίσεις του τηλεφώνου για να στείλεις πού είσαι.',
  "The phone's location is off. Turn it on to send where you are.": 'Η τοποθεσία του τηλεφώνου είναι κλειστή. Άνοιξέ την για να στείλεις πού είσαι.',
  'Where you are was not found in time. Try again outdoors, or in a while.':
    'Δεν βρέθηκε εγκαίρως πού είσαι. Δοκίμασε ξανά σε ανοιχτό χώρο, ή σε λίγο.',
  // Polls (components/poll.tsx).
  Poll: 'Δημοσκόπηση',
  'Poll: {question}': 'Δημοσκόπηση: {question}',
  'Poll · choose one': 'Δημοσκόπηση · διάλεξε ένα',
  'Poll · choose one or more': 'Δημοσκόπηση · διάλεξε ένα ή περισσότερα',
  'New poll': 'Νέα δημοσκόπηση',
  Question: 'Ερώτηση',
  'Ask something': 'Ρώτα κάτι',
  Options: 'Επιλογές',
  'Option {n}': 'Επιλογή {n}',
  'Add an option': 'Προσθήκη επιλογής',
  'More than one answer': 'Πάνω από μία απάντηση',
  // Typing, under a contact's name in their chat.
  'typing…': 'γράφει…',
  // Searching the messages, in a chat and on the home screen (lib/message-search.ts).
  'Search in this chat': 'Αναζήτηση σε αυτή τη συνομιλία',
  '{n} of {count}': '{n} από {count}',
  None: 'Κανένα',
  Earlier: 'Πιο πριν',
  Later: 'Πιο μετά',
  // Forwarding a message to another chat (lib/forward.ts).
  Forward: 'Προώθηση',
  'Forward to': 'Προώθηση σε',
  Forwarded: 'Προωθημένο',
  'Forwarding…': 'Προώθηση…',
  '{name} (group)': '{name} (ομάδα)',
  'It goes as a copy, sent anew and end-to-end encrypted, marked as forwarded but not from where.':
    'Πηγαίνει ως αντίγραφο, σταλμένο από την αρχή και κρυπτογραφημένο από άκρη σε άκρη, με την ένδειξη ότι προωθήθηκε αλλά όχι από πού.',
  // Writing a chat out as text (lib/chat-export.ts).
  'Export chat': 'Εξαγωγή συνομιλίας',
  'Export this chat?': 'Εξαγωγή αυτής της συνομιλίας;',
  Export: 'Εξαγωγή',
  'Its messages are written to a text file, with their times and who wrote them, saved where you choose. The file is not encrypted: anyone who has it, or any app that reads where it is, can read the chat. Photos, files and voice messages are only named, and messages that disappear are left out.':
    'Τα μηνύματά της γράφονται σε ένα αρχείο κειμένου, με την ώρα τους και ποιος τα έγραψε, και αποθηκεύεται όπου διαλέξεις. Το αρχείο δεν είναι κρυπτογραφημένο: όποιος το έχει, ή όποια εφαρμογή διαβάζει εκεί που είναι, μπορεί να διαβάσει τη συνομιλία. Οι φωτογραφίες, τα αρχεία και τα φωνητικά μηνύματα μόνο αναφέρονται, και τα μηνύματα που εξαφανίζονται μένουν έξω.',
  'Chat with {name}, written out of Erevos': 'Συνομιλία με {name}, εξαγωγή από το Erevos',
  'Written out {when}. This file is not encrypted: anyone who has it can read it.':
    'Εξαγωγή {when}. Αυτό το αρχείο δεν είναι κρυπτογραφημένο: όποιος το έχει μπορεί να το διαβάσει.',
  'Photo: {name}': 'Φωτογραφία: {name}',
  forwarded: 'προωθημένο',
  'answering “{line}”': 'απάντηση στο «{line}»',
  // Link previews, made by the sender's phone (lib/make-preview.ts).
  'Link previews': 'Προεπισκοπήσεις συνδέσμων',
  'Making the link’s preview…': 'Φτιάχνεται η προεπισκόπηση του συνδέσμου…',
  'None while this space goes through Tor: Erevos sends only relay requests through it.':
    'Καμία όσο αυτός ο χώρος περνά μέσω Tor: το Erevos στέλνει μέσω αυτού μόνο τα αιτήματα προς το relay.',
  "When you send a link, this phone fetches its page straight from the site and sends its title, a line and a small picture inside the message. The site sees this phone's internet address. In all chats of this space, not in hidden chats.":
    'Όταν στέλνεις έναν σύνδεσμο, αυτό το τηλέφωνο φέρνει τη σελίδα του κατευθείαν από τον ιστότοπο και στέλνει τον τίτλο της, μια γραμμή και μια μικρή εικόνα μέσα στο μήνυμα. Ο ιστότοπος βλέπει τη διεύθυνση ίντερνετ αυτού του τηλεφώνου. Σε όλες τις συνομιλίες αυτού του χώρου, όχι στις κρυφές συνομιλίες.',
  "Links go as they are. Turned on, this phone fetches a link's page as you send it, and the site sees this phone's internet address. The phone that gets it fetches nothing.":
    'Οι σύνδεσμοι πηγαίνουν όπως είναι. Αν το ανοίξεις, αυτό το τηλέφωνο φέρνει τη σελίδα ενός συνδέσμου όταν τον στέλνεις, και ο ιστότοπος βλέπει τη διεύθυνση ίντερνετ αυτού του τηλεφώνου. Το τηλέφωνο που το λαμβάνει δεν φέρνει τίποτα.',
};
