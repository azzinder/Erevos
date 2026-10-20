// The German of the Contacts screens: the phone's contacts, their groups, merging, vCards, QR codes,
// birthdays and contacts kept only in Erevos (app/contacts.tsx and what goes with it) (i18n/de/index.ts).
export const contacts: Record<string, string> = {
  "The phone's contacts, their groups and birthdays": 'Die Kontakte des Telefons, ihre Gruppen und Geburtstage',
  'This build of Erevos has no contacts part yet. It comes with the next build of the app.': 'Diese Version von Erevos hat noch keine Kontakte-Funktion. Sie kommt mit der nächsten Version der App.',
  "Only Erevos on Android reads the phone's contacts.": 'Nur Erevos auf Android liest die Kontakte des Telefons.',
  'Search contacts': 'Kontakte durchsuchen',
  "Erevos may not read the phone's contacts yet": 'Erevos darf die Kontakte des Telefons noch nicht lesen',
  "Erevos reads and changes them only in Android's own contacts, where they stay for your other apps. It sends them nowhere.":
    'Erevos liest und ändert sie nur in den Kontakten von Android selbst, wo sie für deine anderen Apps bleiben. Es sendet sie nirgendwohin.',
  'Allow contacts': 'Kontakte erlauben',
  "Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info.":
    'Ohne das kann Erevos die Kontakte des Telefons nicht zeigen. Erlaube „Kontakte“ in der App-Info von Erevos.',
  "The phone's contacts could not be read: {error}": 'Die Kontakte des Telefons ließen sich nicht lesen: {error}',
  'No contact has “{query}” in it.': 'Kein Kontakt enthält „{query}“.',
  'No favourites yet. Tap the star on a contact.': 'Noch keine Favoriten. Tippe bei einem Kontakt auf den Stern.',
  'No contacts yet.': 'Noch keine Kontakte.',
  "These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them. Those with a lock are kept only in Erevos, sealed in this space.":
    'Das sind die Kontakte des Telefons, gespeichert in den Kontakten von Android selbst: Jede App, die sie lesen darf, sieht sie, und ein Konto (Google) synchronisiert sie vielleicht. Die mit einem Schloss sind nur in Erevos gespeichert, versiegelt in diesem Bereich.',
  'New contact': 'Neuer Kontakt',

  // One contact.
  'This contact is no longer on the phone.': 'Dieser Kontakt ist nicht mehr auf dem Telefon.',
  'Delete contact': 'Kontakt löschen',
  'Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.':
    '{name} vom Telefon löschen? Der Kontakt verschwindet aus jedem Konto, in dem er gespeichert ist, und lässt sich nicht wiederherstellen.',
  'Remove from favourites': 'Aus Favoriten entfernen',
  'Add to favourites': 'Zu Favoriten hinzufügen',
  'Favourite': 'Favorit',
  'Birthday': 'Geburtstag',
  'Note': 'Notiz',
  'Edit': 'Bearbeiten',
  'Mobile': 'Mobil',
  'Home': 'Privat',
  'Work': 'Geschäftlich',
  'Main': 'Hauptnummer',
  'Fax': 'Fax',
  'Pager': 'Pager',
  'Other': 'Andere',
  'Birthday today, turns {age}': 'Heute Geburtstag, wird {age}',
  'Birthday today': 'Heute Geburtstag',
  'Birthday tomorrow, turns {age}': 'Morgen Geburtstag, wird {age}',
  'Birthday tomorrow': 'Morgen Geburtstag',
  'Birthday in {n} days, turns {age}': 'Geburtstag in {n} Tagen, wird {age}',
  'Birthday in {n} days': 'Geburtstag in {n} Tagen',
  'Add a photo': 'Foto hinzufügen',
  'Choose a photo': 'Foto auswählen',
  'Remove the photo': 'Foto entfernen',
  "The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.":
    'Das Foto wird mit dem Kontakt in den Kontakten von Android gespeichert, wo das Telefon es zeigt, wenn er anruft, und sein Konto (Google) synchronisiert es.',
  'Ringtone': 'Klingelton',
  "The phone's own": 'Der des Telefons',
  'A ringtone of its own': 'Ein eigener Klingelton',
  'Choose ringtone': 'Klingelton wählen',

  // Writing a contact.
  'Edit contact': 'Kontakt bearbeiten',
  'First name': 'Vorname',
  'Last name': 'Nachname',
  'Company': 'Firma',
  'Job title': 'Position',
  'Phone numbers': 'Telefonnummern',
  'Add a number': 'Nummer hinzufügen',
  'Emails': 'E-Mail-Adressen',
  'Add an email': 'E-Mail-Adresse hinzufügen',
  'Addresses': 'Adressen',
  'Add an address': 'Adresse hinzufügen',
  'Day/month/year, or day/month without the year.': 'Tag.Monat.Jahr, oder Tag.Monat ohne das Jahr.',
  'Write the birthday as day/month/year, or day/month.': 'Gib den Geburtstag als Tag.Monat.Jahr oder Tag.Monat ein.',
  'Give the contact a name, a number or an email.': 'Gib dem Kontakt einen Namen, eine Nummer oder eine E-Mail-Adresse.',
  'Kept in': 'Gespeichert in',
  'On this phone only': 'Nur auf diesem Telefon',
  "In Android's contacts, synced with {account}.": 'In den Kontakten von Android, synchronisiert mit {account}.',
  "In Android's contacts on this phone, synced nowhere.": 'In den Kontakten von Android auf diesem Telefon, nirgendwohin synchronisiert.',

  // Groups.
  'Groups': 'Gruppen',
  'Family, Work, and your own: make, rename, who is in them': 'Familie, Arbeit und eigene: erstellen, umbenennen, wer dabei ist',
  "Android's own groups of contacts, such as Family or Work. Your other apps see them too, and an account (Google) syncs its own.":
    'Die Kontaktgruppen von Android selbst, etwa Familie oder Arbeit. Auch deine anderen Apps sehen sie, und ein Konto (Google) synchronisiert seine eigenen.',
  'No groups yet.': 'Noch keine Gruppen.',
  'Group without a name': 'Gruppe ohne Namen',
  'Family': 'Familie',
  'A contact joins a group only in the account the group is kept in.': 'Ein Kontakt kommt nur in dem Konto in eine Gruppe, in dem die Gruppe gespeichert ist.',
  'The group could not be made. {error}': 'Die Gruppe ließ sich nicht erstellen. {error}',
  'This group is no longer on the phone.': 'Diese Gruppe ist nicht mehr auf dem Telefon.',
  'Delete group': 'Gruppe löschen',
  'Delete the group {name}? Its contacts stay on the phone.': 'Die Gruppe {name} löschen? Ihre Kontakte bleiben auf dem Telefon.',
  'Add contacts': 'Kontakte hinzufügen',
  'No one in this group yet.': 'Noch niemand in dieser Gruppe.',
  'Take {name} out of the group': '{name} aus der Gruppe entfernen',
  '{n} contact could not join: it is kept in another account than this group.': '{n} Kontakt konnte nicht hinzukommen: Er ist in einem anderen Konto gespeichert als diese Gruppe.',
  '{n} contacts could not join: they are kept in another account than this group.': '{n} Kontakte konnten nicht hinzukommen: Sie sind in einem anderen Konto gespeichert als diese Gruppe.',
  'Add {n} contact': '{n} Kontakt hinzufügen',
  'Add {n} contacts': '{n} Kontakte hinzufügen',
  'In no group': 'In keiner Gruppe',
  'Choose groups': 'Gruppen wählen',
  'No groups yet. Make one under Groups in the menu of Contacts.': 'Noch keine Gruppen. Erstelle eine unter „Gruppen“ im Menü der Kontakte.',
  '{name} is kept in another account than the group {group}, so it cannot join it.': '{name} ist in einem anderen Konto gespeichert als die Gruppe {group} und kann ihr deshalb nicht hinzugefügt werden.',

  // vCard files.
  'Import from a .vcf file': 'Aus einer .vcf-Datei importieren',
  'Contacts another phone or app saved as a vCard': 'Kontakte, die ein anderes Telefon oder eine App als vCard gespeichert hat',
  'Save as a .vcf file': 'Als .vcf-Datei speichern',
  'The {n} contact shown, in a folder you choose': 'Der {n} angezeigte Kontakt, in einem Ordner deiner Wahl',
  'The {n} contacts shown, in a folder you choose': 'Die {n} angezeigten Kontakte, in einem Ordner deiner Wahl',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.':
    'Gespeichert als {name}. Die Datei liegt außerhalb von Erevos: Wer sie hat, kann diese Kontakte lesen.',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read this contact.':
    'Gespeichert als {name}. Die Datei liegt außerhalb von Erevos: Wer sie hat, kann diesen Kontakt lesen.',
  'Import contacts': 'Kontakte importieren',
  'Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.':
    'Wähle eine .vcf-Datei (eine vCard), wie andere Telefone und Apps ihre Kontakte speichern. Erevos liest sie hier und sendet sie nirgendwohin.',
  'Choose a .vcf file': '.vcf-Datei wählen',
  'There are no contacts in {file}.': 'In {file} sind keine Kontakte.',
  'The file is larger than {n} MB.': 'Die Datei ist größer als {n} MB.',
  'It has {n} contact.': 'Sie enthält {n} Kontakt.',
  'It has {n} contacts.': 'Sie enthält {n} Kontakte.',
  '{n} of them is on the phone already, and is left out.': '{n} davon ist schon auf dem Telefon und wird ausgelassen.',
  '{n} of them are on the phone already, and are left out.': '{n} davon sind schon auf dem Telefon und werden ausgelassen.',
  'Importing… {done} of {total}': 'Wird importiert… {done} von {total}',
  'Import {n} contact': '{n} Kontakt importieren',
  'Import {n} contacts': '{n} Kontakte importieren',
  'Nothing new to import.': 'Nichts Neues zu importieren.',
  '{n} contact imported.': '{n} Kontakt importiert.',
  '{n} contacts imported.': '{n} Kontakte importiert.',
  '{n} contact could not be saved.': '{n} Kontakt ließ sich nicht speichern.',
  '{n} contacts could not be saved.': '{n} Kontakte ließen sich nicht speichern.',

  // QR codes.
  'This contact holds too much for a QR code. Save it as a .vcf file instead.': 'Dieser Kontakt enthält zu viel für einen QR-Code. Speichere ihn stattdessen als .vcf-Datei.',
  "Another phone's camera reads it as a contact to add: its name, numbers, emails, addresses and note, without its photo. Whoever sees the code can read it.":
    'Die Kamera eines anderen Telefons liest ihn als Kontakt zum Hinzufügen: Name, Nummern, E-Mail-Adressen, Adressen und Notiz, ohne Foto. Wer den Code sieht, kann ihn lesen.',
  "Another phone's camera reads it as a contact to add, without its photo, and without its note or addresses, which do not fit. Whoever sees the code can read it.":
    'Die Kamera eines anderen Telefons liest ihn als Kontakt zum Hinzufügen, ohne Foto und ohne Notiz oder Adressen, die nicht hineinpassen. Wer den Code sieht, kann ihn lesen.',
  "Read a contact's QR code": 'QR-Code eines Kontakts lesen',
  'From a photo of it, read on the phone': 'Aus einem Foto davon, auf dem Telefon gelesen',
  'Take a photo of the code, or choose one. It is read here and not kept; what it holds starts a new contact, saved only when you save it.':
    'Nimm ein Foto des Codes auf oder wähle eines. Es wird hier gelesen und nicht aufbewahrt; was der Code enthält, beginnt einen neuen Kontakt, der erst gespeichert wird, wenn du ihn speicherst.',
  'This QR code holds no contact.': 'Dieser QR-Code enthält keinen Kontakt.',
  'No QR code was found in the photo. Take it again closer, with all of the code in it.': 'Im Foto wurde kein QR-Code gefunden. Nimm es noch einmal näher auf, mit dem ganzen Code darin.',

  // Duplicates.
  'Find duplicates': 'Duplikate finden',
  'The same person kept twice, to merge into one': 'Dieselbe Person doppelt gespeichert, zum Zusammenführen',
  'There is nothing to merge.': 'Es gibt nichts zusammenzuführen.',
  'The same name': 'Gleicher Name',
  'The same number': 'Gleiche Nummer',
  'The same email': 'Gleiche E-Mail-Adresse',
  'Merge': 'Zusammenführen',
  'Merge these {n} into {name}? The others are deleted, from every account they are kept in.': 'Diese {n} zu {name} zusammenführen? Die anderen werden gelöscht, aus jedem Konto, in dem sie gespeichert sind.',
  'Merge all': 'Alle zusammenführen',
  'Merge {n} set of contacts, each into its fullest? The others are deleted.': '{n} Satz Kontakte zusammenführen, jeweils in den vollständigsten? Die anderen werden gelöscht.',
  'Merge {n} sets of contacts, each into its fullest? The others are deleted.': '{n} Sätze Kontakte zusammenführen, jeweils in den vollständigsten? Die anderen werden gelöscht.',
  '{n} set could not be merged.': '{n} Satz ließ sich nicht zusammenführen.',
  '{n} sets could not be merged.': '{n} Sätze ließen sich nicht zusammenführen.',
  'Duplicates': 'Duplikate',
  'Contacts that look like the same person: the same name, number or email. Merging keeps the fullest, with every number, email and address of the others, and deletes the others.':
    'Kontakte, die nach derselben Person aussehen: gleicher Name, gleiche Nummer oder E-Mail-Adresse. Beim Zusammenführen bleibt der vollständigste, mit jeder Nummer, E-Mail-Adresse und Adresse der anderen, und die anderen werden gelöscht.',
  'No duplicates found.': 'Keine Duplikate gefunden.',
  'Not the same': 'Nicht dieselben',
  'Kept, with the others in it': 'Bleibt, mit den anderen darin',

  // Birthdays.
  'Birthdays': 'Geburtstage',
  "Without notices, Erevos cannot remind you of birthdays. Allow Notifications in Erevos's App info.":
    'Ohne Benachrichtigungen kann Erevos dich nicht an Geburtstage erinnern. Erlaube „Benachrichtigungen“ in der App-Info von Erevos.',
  'No contact has a birthday yet. Add one in Edit.': 'Noch kein Kontakt hat einen Geburtstag. Füge einen unter „Bearbeiten“ hinzu.',
  'Birthday reminders: on': 'Geburtstagserinnerungen: an',
  'Birthday reminders: off': 'Geburtstagserinnerungen: aus',
  "A notice on the morning of each phone contact's birthday": 'Eine Benachrichtigung am Morgen des Geburtstags jedes Telefonkontakts',

  // The SIM.
  'SIM contacts': 'SIM-Kontakte',
  'Copy the contacts on the SIM card to the phone': 'Die Kontakte der SIM-Karte auf das Telefon kopieren',
  "The contacts kept on the phone's SIM cards. Copied, they are in Android's contacts like the others; the SIM keeps its own.":
    'Die Kontakte, die auf den SIM-Karten des Telefons gespeichert sind. Kopiert sind sie wie die anderen in den Kontakten von Android; die SIM behält ihre eigenen.',
  'Reading the SIM…': 'SIM wird gelesen…',
  'No contacts on the SIM, or the phone does not let Erevos read it.': 'Keine Kontakte auf der SIM, oder das Telefon lässt Erevos sie nicht lesen.',
  'The SIM has {n} contact.': 'Die SIM hat {n} Kontakt.',
  'The SIM has {n} contacts.': 'Die SIM hat {n} Kontakte.',
  'Copying… {done} of {total}': 'Wird kopiert… {done} von {total}',
  'Copy {n} contact to the phone': '{n} Kontakt auf das Telefon kopieren',
  'Copy {n} contacts to the phone': '{n} Kontakte auf das Telefon kopieren',
  'Choose who to copy': 'Wähle, wen du kopierst',
  '{n} contact copied to the phone.': '{n} Kontakt auf das Telefon kopiert.',
  '{n} contacts copied to the phone.': '{n} Kontakte auf das Telefon kopiert.',
  'SIM {n}': 'SIM {n}',

  // Kept only in Erevos, and in hidden chats.
  'Only in Erevos': 'Nur in Erevos',
  "Sealed in this space, and not in the phone's contacts: no other app sees it, nor any account the phone syncs with.":
    'Versiegelt in diesem Bereich und nicht in den Kontakten des Telefons: Keine andere App sieht ihn, und auch kein Konto, mit dem das Telefon synchronisiert.',
  'No contact is kept only in Erevos yet. Choose Only in Erevos when you make one.':
    'Noch kein Kontakt ist nur in Erevos gespeichert. Wähle „Nur in Erevos“, wenn du einen erstellst.',
  'Erevos keeps {n} contacts of its own at most.': 'Erevos speichert höchstens {n} eigene Kontakte.',
  'This contact is no longer kept in Erevos.': 'Dieser Kontakt ist nicht mehr in Erevos gespeichert.',
  'Delete {name}? It is kept only in Erevos, and cannot be brought back.': '{name} löschen? Der Kontakt ist nur in Erevos gespeichert und lässt sich nicht wiederherstellen.',
  'Keep only in Erevos': 'Nur in Erevos speichern',
  "Move {name} into Erevos? It is sealed in this space and deleted from the phone's contacts, from every account it is kept in: other apps no longer see it, and the phone no longer shows its name when it calls.":
    '{name} in Erevos verschieben? Der Kontakt wird in diesem Bereich versiegelt und aus den Kontakten des Telefons gelöscht, aus jedem Konto, in dem er gespeichert ist: Andere Apps sehen ihn nicht mehr, und das Telefon zeigt seinen Namen nicht mehr, wenn er anruft.',
  "Move to the phone's contacts": 'In die Kontakte des Telefons verschieben',
  "Move {name} to the phone's contacts? Every app allowed to read them sees it there, and it is no longer kept in Erevos.":
    '{name} in die Kontakte des Telefons verschieben? Dort sieht ihn jede App, die sie lesen darf, und er ist nicht mehr in Erevos gespeichert.',
  "Kept only in Erevos, sealed in this space. Not in the phone's contacts.": 'Nur in Erevos gespeichert, versiegelt in diesem Bereich. Nicht in den Kontakten des Telefons.',
  'The photo is sealed with the contact, in a file of its own: only Erevos shows it.':
    'Das Foto wird mit dem Kontakt versiegelt, in einer eigenen Datei: Nur Erevos zeigt es.',
  'Hidden contacts': 'Versteckte Kontakte',
  'The hidden chats are closed.': 'Die versteckten Chats sind geschlossen.',
  "Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.":
    'Nur hier gespeichert, versiegelt mit den versteckten Chats: Sie erscheinen nirgendwo sonst, nicht einmal in den Kontakten des Bereichs.',
  'Kept only in these hidden chats, sealed.': 'Nur in diesen versteckten Chats gespeichert, versiegelt.',
  'favourite': 'Favorit',
  'only in Erevos': 'nur in Erevos',

  // Erevos contacts, and a contact's history.
  'Erevos contacts': 'Erevos-Kontakte',
  'Erevos contact': 'Erevos-Kontakt',
  'with an Erevos chat': 'mit Erevos-Chat',
  'No Erevos contacts yet. Add one in Chat, with their link or QR code.':
    'Noch keine Erevos-Kontakte. Füge einen unter „Chat“ hinzu, mit seinem Link oder QR-Code.',
  'A contact of your Erevos chats. Add it to your contacts to give it numbers, an email and more.':
    'Ein Kontakt aus deinen Erevos-Chats. Füge ihn zu deinen Kontakten hinzu, um ihm Nummern, eine E-Mail-Adresse und mehr zu geben.',
  'In Erevos': 'In Erevos',
  'The Erevos contact {name}': 'Der Erevos-Kontakt {name}',
  'End-to-end encrypted, through Erevos instead of the phone company.':
    'Ende-zu-Ende-verschlüsselt, über Erevos statt über den Mobilfunkanbieter.',
  'Not this Erevos contact': 'Nicht dieser Erevos-Kontakt',
  'One of its numbers is linked to this Erevos contact, in its chat.':
    'Eine seiner Nummern ist mit diesem Erevos-Kontakt verknüpft, in dessen Chat.',
  'Link to an Erevos contact': 'Mit einem Erevos-Kontakt verknüpfen',
  "The same person in your Erevos chats: this card then shows their chat and calls. The link is sealed in Erevos, never in the phone's contacts.":
    'Dieselbe Person in deinen Erevos-Chats: Diese Karte zeigt dann ihren Chat und ihre Anrufe. Die Verknüpfung wird in Erevos versiegelt, nie in den Kontakten des Telefons.',
  'Add to contacts': 'Zu Kontakten hinzufügen',
  'History': 'Verlauf',
  'No calls or messages with this contact yet.': 'Noch keine Anrufe oder Nachrichten mit diesem Kontakt.',
  "Its calls show here once Erevos may read the phone's call log. Erevos only shows them, and keeps no copy.":
    'Seine Anrufe erscheinen hier, sobald Erevos die Anrufliste des Telefons lesen darf. Erevos zeigt sie nur an und behält keine Kopie.',
  'Show calls': 'Anrufe zeigen',
  'Incoming call, {time}': 'Eingehender Anruf, {time}',
  'Outgoing call, {time}': 'Ausgehender Anruf, {time}',
  'Outgoing call, no answer': 'Ausgehender Anruf, nicht angenommen',

  // Other apps' contacts.
  'Add {what} to a contact': '{what} zu einem Kontakt hinzufügen',
  'Tap the contact to add it to, or make a new one.': 'Tippe auf den Kontakt, zu dem es hinzukommt, oder erstelle einen neuen.',

  // A contact's Erevos ID (components/erevos-id.tsx).
  'Erevos ID': 'Erevos-ID',
  'Erevos ID: {id}': 'Erevos-ID: {id}',
  'That is not an Erevos ID: an Erevos ID is a contact link starting with erevos://contact':
    'Das ist keine Erevos-ID: Eine Erevos-ID ist ein Kontaktlink, der mit erevos://contact beginnt',
  'Their contact link from Erevos, to link this contact to another Erevos contact instead.':
    'Der Kontaktlink aus Erevos, um diesen Kontakt stattdessen mit einem anderen Erevos-Kontakt zu verknüpfen.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Once saved, they join your Erevos chats, and the contact shows their chat and calls.':
    'Der Kontaktlink, den das Erevos der Person unter „Meinen Kontaktlink kopieren“ oder als QR-Code zeigt. Nach dem Speichern kommt sie in deine Erevos-Chats, und der Kontakt zeigt ihren Chat und ihre Anrufe.',
  "Choose them among these hidden chats' contacts: this card then shows their chat and calls.":
    'Wähle sie unter den Kontakten dieser versteckten Chats: Diese Karte zeigt dann ihren Chat und ihre Anrufe.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Added here, they join your Erevos chats, and this card shows their chat and calls, end-to-end encrypted.':
    'Der Kontaktlink, den das Erevos der Person unter „Meinen Kontaktlink kopieren“ oder als QR-Code zeigt. Hier hinzugefügt, kommt sie in deine Erevos-Chats, und diese Karte zeigt ihren Chat und ihre Anrufe, Ende-zu-Ende-verschlüsselt.',
  'Add to Erevos': 'Zu Erevos hinzufügen',
  'Choose from my Erevos chats': 'Aus meinen Erevos-Chats wählen',
  'That QR code holds no Erevos ID.': 'Dieser QR-Code enthält keine Erevos-ID.',
  'Take photo of their QR code': 'Foto ihres QR-Codes aufnehmen',
  'Choose a photo of it': 'Foto davon auswählen',
};
