// The Italian of the Contacts screens: the phone's contacts, their groups, merging, vCards, QR codes,
// birthdays and contacts kept only in Erevos (app/contacts.tsx and what goes with it) (i18n/it/index.ts).
export const contacts: Record<string, string> = {
  'This build of Erevos has no contacts part yet. It comes with the next build of the app.': 'Questa versione di Erevos non ha ancora la parte contatti. Arriverà con la prossima versione dell’app.',
  "Only Erevos on Android reads the phone's contacts.": 'Solo Erevos su Android legge i contatti del telefono.',
  'Search contacts': 'Cerca nei contatti',
  "Erevos may not read the phone's contacts yet": 'Erevos non ha ancora il permesso di leggere i contatti del telefono',
  "Erevos reads and changes them only in Android's own contacts, where they stay for your other apps. It sends them nowhere.":
    'Erevos li legge e li modifica solo nei contatti di Android, dove restano anche per le tue altre app. Non li invia da nessuna parte.',
  'Allow contacts': 'Consenti i contatti',
  "Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info.":
    'Senza questo permesso, Erevos non può mostrare i contatti del telefono. Consenti «Contatti» in Info app di Erevos.',
  "The phone's contacts could not be read: {error}": 'Impossibile leggere i contatti del telefono: {error}',
  'No contact has “{query}” in it.': 'Nessun contatto contiene «{query}».',
  'No favourites yet. Tap the star on a contact.': 'Ancora nessun preferito. Tocca la stella su un contatto.',
  'No contacts yet.': 'Ancora nessun contatto.',
  "These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them. Those with a lock are kept only in Erevos, sealed in this space.":
    'Questi sono i contatti del telefono, salvati nei contatti di Android: li vede ogni app che ha il permesso di leggerli, e un account (Google) può sincronizzarli. Quelli con un lucchetto sono salvati solo in Erevos, sigillati in questo spazio.',
  'New contact': 'Nuovo contatto',

  // One contact.
  'This contact is no longer on the phone.': 'Questo contatto non è più sul telefono.',
  'Delete contact': 'Elimina contatto',
  'Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.':
    'Eliminare {name} dal telefono? Sparisce da ogni account in cui è salvato, e non potrà essere recuperato.',
  'Remove from favourites': 'Rimuovi dai preferiti',
  'Add to favourites': 'Aggiungi ai preferiti',
  'Favourite': 'Preferito',
  'Birthday': 'Compleanno',
  'Note': 'Nota',
  'Edit': 'Modifica',
  'Mobile': 'Cellulare',
  'Home': 'Casa',
  'Work': 'Lavoro',
  'Main': 'Principale',
  'Fax': 'Fax',
  'Pager': 'Cercapersone',
  'Other': 'Altro',
  'Birthday today, turns {age}': 'Compleanno oggi, compie {age} anni',
  'Birthday today': 'Compleanno oggi',
  'Birthday tomorrow, turns {age}': 'Compleanno domani, compie {age} anni',
  'Birthday tomorrow': 'Compleanno domani',
  'Birthday in {n} days, turns {age}': 'Compleanno tra {n} giorni, compie {age} anni',
  'Birthday in {n} days': 'Compleanno tra {n} giorni',
  'Add a photo': 'Aggiungi una foto',
  'Choose a photo': 'Scegli una foto',
  'Remove the photo': 'Rimuovi la foto',
  "The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.":
    'La foto viene salvata con il contatto nei contatti di Android, dove il telefono la mostra quando chiama, e il suo account (Google) la sincronizza.',
  'Ringtone': 'Suoneria',
  "The phone's own": 'Quella del telefono',
  'A ringtone of its own': 'Suoneria personalizzata',
  'Choose ringtone': 'Scegli la suoneria',

  // Writing a contact.
  'Edit contact': 'Modifica contatto',
  'First name': 'Nome',
  'Last name': 'Cognome',
  'Company': 'Azienda',
  'Job title': 'Qualifica',
  'Phone numbers': 'Numeri di telefono',
  'Add a number': 'Aggiungi un numero',
  'Emails': 'Email',
  'Add an email': 'Aggiungi un’email',
  'Addresses': 'Indirizzi',
  'Add an address': 'Aggiungi un indirizzo',
  'Day/month/year, or day/month without the year.': 'Giorno/mese/anno, o giorno/mese senza l’anno.',
  'Write the birthday as day/month/year, or day/month.': 'Scrivi il compleanno come giorno/mese/anno, o giorno/mese.',
  'Give the contact a name, a number or an email.': 'Dai al contatto un nome, un numero o un’email.',
  'Kept in': 'Salvato in',
  'On this phone only': 'Solo su questo telefono',
  "In Android's contacts, synced with {account}.": 'Nei contatti di Android, sincronizzato con {account}.',
  "In Android's contacts on this phone, synced nowhere.": 'Nei contatti di Android su questo telefono, senza sincronizzazione.',

  // Groups.
  'Groups': 'Gruppi',
  'Family, Work, and your own: make, rename, who is in them': 'Famiglia, Lavoro e i tuoi: crea, rinomina, chi ne fa parte',
  "Android's own groups of contacts, such as Family or Work. Your other apps see them too, and an account (Google) syncs its own.":
    'I gruppi di contatti di Android, come Famiglia o Lavoro. Li vedono anche le tue altre app, e un account (Google) sincronizza i suoi.',
  'No groups yet.': 'Ancora nessun gruppo.',
  'Group without a name': 'Gruppo senza nome',
  'Family': 'Famiglia',
  'A contact joins a group only in the account the group is kept in.': 'Un contatto entra in un gruppo solo nell’account in cui è salvato il gruppo.',
  'The group could not be made. {error}': 'Impossibile creare il gruppo. {error}',
  'This group is no longer on the phone.': 'Questo gruppo non è più sul telefono.',
  'Delete group': 'Elimina gruppo',
  'Delete the group {name}? Its contacts stay on the phone.': 'Eliminare il gruppo {name}? I suoi contatti restano sul telefono.',
  'Add contacts': 'Aggiungi contatti',
  'No one in this group yet.': 'Ancora nessuno in questo gruppo.',
  'Take {name} out of the group': 'Togli {name} dal gruppo',
  '{n} contact could not join: it is kept in another account than this group.': '{n} contatto non è potuto entrare: è salvato in un account diverso da quello del gruppo.',
  '{n} contacts could not join: they are kept in another account than this group.': '{n} contatti non sono potuti entrare: sono salvati in un account diverso da quello del gruppo.',
  'Add {n} contact': 'Aggiungi {n} contatto',
  'Add {n} contacts': 'Aggiungi {n} contatti',
  'In no group': 'In nessun gruppo',
  'Choose groups': 'Scegli i gruppi',
  'No groups yet. Make one under Groups in the menu of Contacts.': 'Ancora nessun gruppo. Creane uno in «Gruppi», nel menu di «Contatti».',
  '{name} is kept in another account than the group {group}, so it cannot join it.': '{name} è salvato in un account diverso da quello del gruppo {group}, quindi non può entrarci.',

  // vCard files.
  'Import from a .vcf file': 'Importa da un file .vcf',
  'Contacts another phone or app saved as a vCard': 'Contatti salvati come vCard da un altro telefono o da un’app',
  'Save as a .vcf file': 'Salva come file .vcf',
  'The {n} contact shown, in a folder you choose': '{n} contatto mostrato, in una cartella a tua scelta',
  'The {n} contacts shown, in a folder you choose': 'I {n} contatti mostrati, in una cartella a tua scelta',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.':
    'Salvato come {name}. Il file è fuori da Erevos: chiunque lo abbia può leggere questi contatti.',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read this contact.':
    'Salvato come {name}. Il file è fuori da Erevos: chiunque lo abbia può leggere questo contatto.',
  'Import contacts': 'Importa contatti',
  'Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.':
    'Scegli un file .vcf (una vCard), come quelli in cui altri telefoni e app salvano i loro contatti. Erevos lo legge qui e non lo invia da nessuna parte.',
  'Choose a .vcf file': 'Scegli un file .vcf',
  'There are no contacts in {file}.': 'Non ci sono contatti in {file}.',
  'The file is larger than {n} MB.': 'Il file supera i {n} MB.',
  'It has {n} contact.': 'Contiene {n} contatto.',
  'It has {n} contacts.': 'Contiene {n} contatti.',
  '{n} of them is on the phone already, and is left out.': '{n} di questi è già sul telefono, e viene tralasciato.',
  '{n} of them are on the phone already, and are left out.': '{n} di questi sono già sul telefono, e vengono tralasciati.',
  'Importing… {done} of {total}': 'Importazione… {done} di {total}',
  'Import {n} contact': 'Importa {n} contatto',
  'Import {n} contacts': 'Importa {n} contatti',
  'Nothing new to import.': 'Niente di nuovo da importare.',
  '{n} contact imported.': '{n} contatto importato.',
  '{n} contacts imported.': '{n} contatti importati.',
  '{n} contact could not be saved.': '{n} contatto non è stato salvato.',
  '{n} contacts could not be saved.': '{n} contatti non sono stati salvati.',

  // QR codes.
  'This contact holds too much for a QR code. Save it as a .vcf file instead.': 'Questo contatto ha troppi dati per un codice QR. Salvalo invece come file .vcf.',
  "Another phone's camera reads it as a contact to add: its name, numbers, emails, addresses and note, without its photo. Whoever sees the code can read it.":
    'La fotocamera di un altro telefono lo legge come un contatto da aggiungere: nome, numeri, email, indirizzi e nota, senza la foto. Chiunque veda il codice può leggerlo.',
  "Another phone's camera reads it as a contact to add, without its photo, and without its note or addresses, which do not fit. Whoever sees the code can read it.":
    'La fotocamera di un altro telefono lo legge come un contatto da aggiungere, senza la foto, e senza la nota o gli indirizzi, che non ci stanno. Chiunque veda il codice può leggerlo.',
  "Read a contact's QR code": 'Leggi il codice QR di un contatto',
  'From a photo of it, read on the phone': 'Da una sua foto, letta sul telefono',
  'Take a photo of the code, or choose one. It is read here and not kept; what it holds starts a new contact, saved only when you save it.':
    'Scatta una foto del codice, o scegline una. Viene letta qui e non conservata; quello che contiene diventa un nuovo contatto, salvato solo quando lo salvi tu.',
  'This QR code holds no contact.': 'Questo codice QR non contiene un contatto.',
  'No QR code was found in the photo. Take it again closer, with all of the code in it.': 'Nessun codice QR trovato nella foto. Scattala di nuovo più da vicino, con tutto il codice dentro.',

  // Duplicates.
  'Find duplicates': 'Trova duplicati',
  'The same person kept twice, to merge into one': 'La stessa persona salvata due volte, da unire in un solo contatto',
  'There is nothing to merge.': 'Non c’è niente da unire.',
  'The same name': 'Stesso nome',
  'The same number': 'Stesso numero',
  'The same email': 'Stessa email',
  'Merge': 'Unisci',
  'Merge these {n} into {name}? The others are deleted, from every account they are kept in.': 'Unire questi {n} in {name}? Gli altri vengono eliminati, da ogni account in cui sono salvati.',
  'Merge all': 'Unisci tutti',
  'Merge {n} set of contacts, each into its fullest? The others are deleted.': 'Unire {n} serie di contatti nel contatto più completo? Gli altri vengono eliminati.',
  'Merge {n} sets of contacts, each into its fullest? The others are deleted.': 'Unire {n} serie di contatti, ognuna nel contatto più completo? Gli altri vengono eliminati.',
  '{n} set could not be merged.': '{n} serie non è stata unita.',
  '{n} sets could not be merged.': '{n} serie non sono state unite.',
  'Duplicates': 'Duplicati',
  'Contacts that look like the same person: the same name, number or email. Merging keeps the fullest, with every number, email and address of the others, and deletes the others.':
    'Contatti che sembrano la stessa persona: stesso nome, numero o email. L’unione conserva il più completo, con ogni numero, email e indirizzo degli altri, ed elimina gli altri.',
  'No duplicates found.': 'Nessun duplicato trovato.',
  'Not the same': 'Non sono uguali',
  'Kept, with the others in it': 'Resta, con dentro gli altri',

  // Birthdays.
  'Birthdays': 'Compleanni',
  "Without notices, Erevos cannot remind you of birthdays. Allow Notifications in Erevos's App info.":
    'Senza notifiche, Erevos non può ricordarti i compleanni. Consenti «Notifiche» in Info app di Erevos.',
  'No contact has a birthday yet. Add one in Edit.': 'Ancora nessun contatto ha un compleanno. Aggiungilo in «Modifica».',
  'Birthday reminders: on': 'Promemoria dei compleanni: attivi',
  'Birthday reminders: off': 'Promemoria dei compleanni: disattivati',
  "A notice on the morning of each phone contact's birthday": 'Un avviso la mattina del compleanno di ogni contatto del telefono',

  // The SIM.
  'SIM contacts': 'Contatti della SIM',
  'Copy the contacts on the SIM card to the phone': 'Copia sul telefono i contatti della scheda SIM',
  "The contacts kept on the phone's SIM cards. Copied, they are in Android's contacts like the others; the SIM keeps its own.":
    'I contatti salvati sulle schede SIM del telefono. Una volta copiati, sono nei contatti di Android come gli altri; la SIM conserva i suoi.',
  'Reading the SIM…': 'Lettura della SIM…',
  'No contacts on the SIM, or the phone does not let Erevos read it.': 'Nessun contatto sulla SIM, oppure il telefono non consente a Erevos di leggerla.',
  'The SIM has {n} contact.': 'La SIM ha {n} contatto.',
  'The SIM has {n} contacts.': 'La SIM ha {n} contatti.',
  'Copying… {done} of {total}': 'Copia… {done} di {total}',
  'Copy {n} contact to the phone': 'Copia {n} contatto sul telefono',
  'Copy {n} contacts to the phone': 'Copia {n} contatti sul telefono',
  'Choose who to copy': 'Scegli chi copiare',
  '{n} contact copied to the phone.': '{n} contatto copiato sul telefono.',
  '{n} contacts copied to the phone.': '{n} contatti copiati sul telefono.',
  'SIM {n}': 'SIM {n}',

  // Kept only in Erevos, and in hidden chats.
  'Only in Erevos': 'Solo in Erevos',
  "Sealed in this space, and not in the phone's contacts: no other app sees it, nor any account the phone syncs with.":
    'Sigillato in questo spazio, e non nei contatti del telefono: nessun’altra app lo vede, né alcun account con cui il telefono si sincronizza.',
  'No contact is kept only in Erevos yet. Choose Only in Erevos when you make one.':
    'Ancora nessun contatto salvato solo in Erevos. Scegli «Solo in Erevos» quando ne crei uno.',
  'Erevos keeps {n} contacts of its own at most.': 'Erevos conserva al massimo {n} contatti suoi.',
  'This contact is no longer kept in Erevos.': 'Questo contatto non è più salvato in Erevos.',
  'Delete {name}? It is kept only in Erevos, and cannot be brought back.': 'Eliminare {name}? È salvato solo in Erevos, e non potrà essere recuperato.',
  'Keep only in Erevos': 'Salva solo in Erevos',
  "Move {name} into Erevos? It is sealed in this space and deleted from the phone's contacts, from every account it is kept in: other apps no longer see it, and the phone no longer shows its name when it calls.":
    'Spostare {name} in Erevos? Viene sigillato in questo spazio ed eliminato dai contatti del telefono, da ogni account in cui è salvato: le altre app non lo vedono più, e il telefono non ne mostra più il nome quando chiama.',
  "Move to the phone's contacts": 'Sposta nei contatti del telefono',
  "Move {name} to the phone's contacts? Every app allowed to read them sees it there, and it is no longer kept in Erevos.":
    'Spostare {name} nei contatti del telefono? Lì lo vede ogni app che ha il permesso di leggerli, e non è più salvato in Erevos.',
  "Kept only in Erevos, sealed in this space. Not in the phone's contacts.": 'Salvato solo in Erevos, sigillato in questo spazio. Non è nei contatti del telefono.',
  'The photo is sealed with the contact, in a file of its own: only Erevos shows it.':
    'La foto è sigillata con il contatto, in un file suo: solo Erevos la mostra.',
  'Hidden contacts': 'Contatti nascosti',
  'The hidden chats are closed.': 'Le chat nascoste sono chiuse.',
  "Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.":
    'Salvati solo qui, sigillati con le chat nascoste: non appaiono da nessun’altra parte, nemmeno nei contatti dello spazio.',
  'Kept only in these hidden chats, sealed.': 'Salvato solo in queste chat nascoste, sigillato.',
  'favourite': 'preferito',
  'only in Erevos': 'solo in Erevos',

  // Erevos contacts, and a contact's history.
  'Erevos contacts': 'Contatti Erevos',
  'Erevos contact': 'Contatto Erevos',
  'with an Erevos chat': 'con una chat Erevos',
  'No Erevos contacts yet. Add one in Chat, with their link or QR code.':
    'Ancora nessun contatto Erevos. Aggiungine uno in «Chat», con il suo link o codice QR.',
  'A contact of your Erevos chats. Add it to your contacts to give it numbers, an email and more.':
    'Un contatto delle tue chat Erevos. Aggiungilo ai tuoi contatti per dargli numeri, un’email e altro.',
  'In Erevos': 'In Erevos',
  'The Erevos contact {name}': 'Il contatto Erevos {name}',
  'End-to-end encrypted, through Erevos instead of the phone company.':
    'Crittografati end-to-end, tramite Erevos invece che tramite l’operatore.',
  'Not this Erevos contact': 'Non è questo contatto Erevos',
  'One of its numbers is linked to this Erevos contact, in its chat.':
    'Uno dei suoi numeri è collegato a questo contatto Erevos, nella sua chat.',
  'Link to an Erevos contact': 'Collega a un contatto Erevos',
  "The same person in your Erevos chats: this card then shows their chat and calls. The link is sealed in Erevos, never in the phone's contacts.":
    'La stessa persona nelle tue chat Erevos: questa scheda mostra allora la sua chat e le sue chiamate. Il collegamento è sigillato in Erevos, mai nei contatti del telefono.',
  'Add to contacts': 'Aggiungi ai contatti',
  'History': 'Cronologia',
  'No calls or messages with this contact yet.': 'Ancora nessuna chiamata o messaggio con questo contatto.',
  "Its calls show here once Erevos may read the phone's call log. Erevos only shows them, and keeps no copy.":
    'Le sue chiamate appaiono qui quando Erevos ha il permesso di leggere il registro chiamate del telefono. Erevos le mostra soltanto, e non ne tiene copia.',
  'Show calls': 'Mostra le chiamate',
  'Incoming call, {time}': 'Chiamata in arrivo, {time}',
  'Outgoing call, {time}': 'Chiamata in uscita, {time}',
  'Outgoing call, no answer': 'Chiamata in uscita, senza risposta',

  // Other apps' contacts.
  'Add {what} to a contact': 'Aggiungi {what} a un contatto',
  'Tap the contact to add it to, or make a new one.': 'Tocca il contatto a cui aggiungerlo, o creane uno nuovo.',

  // A contact's Erevos ID (components/erevos-id.tsx).
  'Erevos ID': 'ID Erevos',
  'Erevos ID: {id}': 'ID Erevos: {id}',
  'That is not an Erevos ID: an Erevos ID is a contact link starting with erevos://contact':
    'Questo non è un ID Erevos: un ID Erevos è un link di contatto che inizia con erevos://contact',
  'Their contact link from Erevos, to link this contact to another Erevos contact instead.':
    'Il suo link di contatto di Erevos, per collegare invece questo contatto a un altro contatto Erevos.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Once saved, they join your Erevos chats, and the contact shows their chat and calls.':
    'Il link di contatto che mostra il suo Erevos, in “Copia il mio link di contatto” o come codice QR. Una volta salvato, entra nelle tue chat Erevos e il contatto mostra la sua chat e le sue chiamate.',
  "Choose them among these hidden chats' contacts: this card then shows their chat and calls.":
    'Sceglilo tra i contatti di queste chat nascoste: questa scheda mostra allora la sua chat e le sue chiamate.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Added here, they join your Erevos chats, and this card shows their chat and calls, end-to-end encrypted.':
    'Il link di contatto che mostra il suo Erevos, in “Copia il mio link di contatto” o come codice QR. Aggiunto qui, entra nelle tue chat Erevos e questa scheda mostra la sua chat e le sue chiamate, crittografate end-to-end.',
  'Add to Erevos': 'Aggiungi a Erevos',
  'Choose from my Erevos chats': 'Scegli dalle mie chat Erevos',
  'That QR code holds no Erevos ID.': 'Questo codice QR non contiene un ID Erevos.',
  'Take a photo of the QR code': 'Fotografa il codice QR',
  'Choose a photo of the QR code': 'Scegli una foto del codice QR',
  'The photo could not be read. Choose another one, or take it again.': "Non è stato possibile leggere la foto. Scegline un'altra o scattala di nuovo.",
};
