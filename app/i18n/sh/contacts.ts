// The Serbo-Croatian of the Contacts screens: the phone's contacts, their groups, merging, vCards, QR codes,
// birthdays and contacts kept only in Erevos (app/contacts.tsx and what goes with it) (i18n/sh/index.ts).
export const contacts: Record<string, string> = {
  'This build of Erevos has no contacts part yet. It comes with the next build of the app.':
    'Ova verzija Erevosa još nema dio za kontakte. Dolazi sa sljedećom verzijom aplikacije.',
  "Only Erevos on Android reads the phone's contacts.": 'Kontakte telefona čita samo Erevos na Androidu.',
  'Search contacts': 'Traži kontakte',
  "Erevos may not read the phone's contacts yet": 'Erevos još ne smije čitati kontakte telefona',
  "Erevos reads and changes them only in Android's own contacts, where they stay for your other apps. It sends them nowhere.":
    'Erevos ih čita i mijenja samo u Androidovim kontaktima, gdje ostaju i za vaše druge aplikacije. Nigdje ih ne šalje.',
  'Allow contacts': 'Dozvoli kontakte',
  "Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info.":
    'Bez toga Erevos ne može prikazati kontakte telefona. Dozvolite kontakte u informacijama o aplikaciji Erevos.',
  "The phone's contacts could not be read: {error}": 'Kontakti telefona nisu se mogli pročitati: {error}',
  'No contact has “{query}” in it.': 'Nijedan kontakt ne sadrži „{query}“.',
  'No favourites yet. Tap the star on a contact.': 'Još nema favorita. Dodirnite zvjezdicu na kontaktu.',
  'No contacts yet.': 'Još nema kontakata.',
  "These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them. Those with a lock are kept only in Erevos, sealed in this space.":
    'Ovo su kontakti telefona, sačuvani u Androidovim kontaktima: vidi ih svaka aplikacija koja ih smije čitati, a račun (Google) ih može usklađivati. Oni s lokotom čuvaju se samo u Erevosu, zapečaćeni u ovom prostoru.',
  'New contact': 'Novi kontakt',

  // One contact.
  'This contact is no longer on the phone.': 'Ovaj kontakt više nije na telefonu.',
  'Delete contact': 'Obriši kontakt',
  'Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.':
    'Obrisati kontakt {name} s telefona? Nestaje iz svih računa u kojima je sačuvan i ne može se vratiti.',
  'Remove from favourites': 'Ukloni iz favorita',
  'Add to favourites': 'Dodaj u favorite',
  'Favourite': 'Favorit',
  'Birthday': 'Rođendan',
  'Note': 'Bilješka',
  'Edit': 'Uredi',
  'Mobile': 'Mobilni',
  'Home': 'Kuća',
  'Work': 'Posao',
  'Main': 'Glavni',
  'Fax': 'Faks',
  'Pager': 'Pejdžer',
  'Other': 'Ostalo',
  'Birthday today, turns {age}': 'Rođendan danas, puni {age}',
  'Birthday today': 'Rođendan danas',
  'Birthday tomorrow, turns {age}': 'Rođendan sutra, puni {age}',
  'Birthday tomorrow': 'Rođendan sutra',
  'Birthday in {n} days, turns {age}': 'Dana do rođendana: {n}, puni {age}',
  'Birthday in {n} days': 'Dana do rođendana: {n}',
  'Add a photo': 'Dodaj fotografiju',
  'Choose a photo': 'Izaberi fotografiju',
  'Remove the photo': 'Ukloni fotografiju',
  "The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.":
    'Fotografija se čuva uz kontakt u Androidovim kontaktima, gdje je telefon prikazuje kad vas ta osoba zove, a račun kontakta (Google) je usklađuje.',
  'Ringtone': 'Melodija zvona',
  "The phone's own": 'Melodija telefona',
  'A ringtone of its own': 'Vlastita melodija',
  'Choose ringtone': 'Izaberi melodiju',

  // Writing a contact.
  'Edit contact': 'Uredi kontakt',
  'First name': 'Ime',
  'Last name': 'Prezime',
  'Company': 'Firma',
  'Job title': 'Radno mjesto',
  'Phone numbers': 'Brojevi telefona',
  'Add a number': 'Dodaj broj',
  'Emails': 'E-mail adrese',
  'Add an email': 'Dodaj e-mail adresu',
  'Addresses': 'Adrese',
  'Add an address': 'Dodaj adresu',
  'Day/month/year, or day/month without the year.': 'Dan/mjesec/godina ili dan/mjesec bez godine.',
  'Write the birthday as day/month/year, or day/month.': 'Upišite rođendan kao dan/mjesec/godina ili dan/mjesec.',
  'Give the contact a name, a number or an email.': 'Dajte kontaktu ime, broj ili e-mail adresu.',
  'Kept in': 'Sačuvano u',
  'On this phone only': 'Samo na ovom telefonu',
  "In Android's contacts, synced with {account}.": 'U Androidovim kontaktima, usklađeno s računom {account}.',
  "In Android's contacts on this phone, synced nowhere.": 'U Androidovim kontaktima na ovom telefonu, bez usklađivanja.',

  // Groups.
  'Groups': 'Grupe',
  'Family, Work, and your own: make, rename, who is in them': 'Porodica, Posao i vaše vlastite: pravljenje, preimenovanje i članovi',
  "Android's own groups of contacts, such as Family or Work. Your other apps see them too, and an account (Google) syncs its own.":
    'Androidove grupe kontakata, poput „Porodica“ ili „Posao“. Vide ih i vaše druge aplikacije, a račun (Google) usklađuje svoje.',
  'No groups yet.': 'Još nema grupa.',
  'Group without a name': 'Grupa bez naziva',
  'Family': 'Porodica',
  'A contact joins a group only in the account the group is kept in.': 'Kontakt može ući u grupu samo u računu u kojem je grupa sačuvana.',
  'The group could not be made. {error}': 'Grupa se nije mogla napraviti. {error}',
  'This group is no longer on the phone.': 'Ova grupa više nije na telefonu.',
  'Delete group': 'Obriši grupu',
  'Delete the group {name}? Its contacts stay on the phone.': 'Obrisati grupu {name}? Njeni kontakti ostaju na telefonu.',
  'Add contacts': 'Dodaj kontakte',
  'No one in this group yet.': 'U ovoj grupi još nema nikoga.',
  'Take {name} out of the group': 'Ukloni kontakt {name} iz grupe',
  '{n} contact could not join: it is kept in another account than this group.':
    '{n} kontakt nije mogao ući u grupu jer je sačuvan u drugom računu, a ne u računu ove grupe.',
  '{n} contacts could not join: they are kept in another account than this group.':
    '{n} kontakt nije mogao ući u grupu jer je sačuvan u drugom računu, a ne u računu ove grupe. | {n} kontakta nisu mogla ući u grupu jer su sačuvana u drugom računu, a ne u računu ove grupe. | {n} kontakata nije moglo ući u grupu jer su sačuvani u drugom računu, a ne u računu ove grupe.',
  'Add {n} contact': 'Dodaj {n} kontakt',
  'Add {n} contacts': 'Dodaj {n} kontakt | Dodaj {n} kontakta | Dodaj {n} kontakata',
  'In no group': 'Ni u jednoj grupi',
  'Choose groups': 'Izaberi grupe',
  'No groups yet. Make one under Groups in the menu of Contacts.': 'Još nema grupa. Napravite grupu pod „Grupe“ u meniju Kontakata.',
  '{name} is kept in another account than the group {group}, so it cannot join it.':
    'Kontakt {name} je sačuvan u drugom računu, a ne u računu grupe {group}, pa ne može ući u nju.',

  // vCard files.
  'Import from a .vcf file': 'Uvezi iz .vcf datoteke',
  'Contacts another phone or app saved as a vCard': 'Kontakti sačuvani kao vCard na drugom telefonu ili u drugoj aplikaciji',
  'Save as a .vcf file': 'Sačuvaj kao .vcf datoteku',
  'The {n} contact shown, in a folder you choose': '{n} prikazani kontakt, u folder koji izaberete',
  'The {n} contacts shown, in a folder you choose': '{n} prikazani kontakt, u folder koji izaberete | {n} prikazana kontakta, u folder koji izaberete | {n} prikazanih kontakata, u folder koji izaberete',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.':
    'Sačuvano kao {name}. Datoteka je izvan Erevosa: ove kontakte mogu pročitati svi koji je imaju.',
  'Saved as {name}. The file is outside Erevos: anyone who has it can read this contact.':
    'Sačuvano kao {name}. Datoteka je izvan Erevosa: ovaj kontakt mogu pročitati svi koji je imaju.',
  'Import contacts': 'Uvezi kontakte',
  'Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.':
    'Izaberite .vcf datoteku (vCard), u kakvoj drugi telefoni i aplikacije čuvaju kontakte. Erevos je čita ovdje i nigdje je ne šalje.',
  'Choose a .vcf file': 'Izaberi .vcf datoteku',
  'There are no contacts in {file}.': 'U datoteci {file} nema kontakata.',
  'The file is larger than {n} MB.': 'Datoteka je veća od {n} MB.',
  'It has {n} contact.': 'Sadrži {n} kontakt.',
  'It has {n} contacts.': 'Sadrži {n} kontakt. | Sadrži {n} kontakta. | Sadrži {n} kontakata.',
  '{n} of them is on the phone already, and is left out.': '{n} od njih je već na telefonu i izostavljen je.',
  '{n} of them are on the phone already, and are left out.': '{n} od njih je već na telefonu i izostavljen je. | {n} od njih su već na telefonu i izostavljena su. | {n} od njih je već na telefonu i izostavljeno je.',
  'Importing… {done} of {total}': 'Uvoz… {done} od {total}',
  'Import {n} contact': 'Uvezi {n} kontakt',
  'Import {n} contacts': 'Uvezi {n} kontakt | Uvezi {n} kontakta | Uvezi {n} kontakata',
  'Nothing new to import.': 'Nema ničega novog za uvoz.',
  '{n} contact imported.': 'Uvezen je {n} kontakt.',
  '{n} contacts imported.': 'Uvezen je {n} kontakt. | Uvezena su {n} kontakta. | Uvezeno je {n} kontakata.',
  '{n} contact could not be saved.': '{n} kontakt se nije mogao sačuvati.',
  '{n} contacts could not be saved.': '{n} kontakt se nije mogao sačuvati. | {n} kontakta se nisu mogla sačuvati. | {n} kontakata se nije moglo sačuvati.',

  // QR codes.
  'This contact holds too much for a QR code. Save it as a .vcf file instead.':
    'Ovaj kontakt sadrži previše podataka za QR kod. Umjesto toga ga sačuvajte kao .vcf datoteku.',
  "Another phone's camera reads it as a contact to add: its name, numbers, emails, addresses and note, without its photo. Whoever sees the code can read it.":
    'Kamera drugog telefona čita ga kao kontakt za dodavanje: ime, brojeve, e-mail adrese, adrese i bilješku, bez fotografije. Mogu ga pročitati svi koji vide kod.',
  "Another phone's camera reads it as a contact to add, without its photo, and without its note or addresses, which do not fit. Whoever sees the code can read it.":
    'Kamera drugog telefona čita ga kao kontakt za dodavanje, bez fotografije, i bez bilješke i adresa, koje ne stanu. Mogu ga pročitati svi koji vide kod.',
  "Read a contact's QR code": 'Pročitaj QR kod kontakta',
  'From a photo of it, read on the phone': 'Iz fotografije koda, čita se na telefonu',
  'Take a photo of the code, or choose one. It is read here and not kept; what it holds starts a new contact, saved only when you save it.':
    'Snimite kod ili izaberite fotografiju. Čita se ovdje i ne čuva se; ono što sadrži upisuje se u novi kontakt, koji se čuva tek kad ga sačuvate.',
  'This QR code holds no contact.': 'Ovaj QR kod ne sadrži kontakt.',
  'No QR code was found in the photo. Take it again closer, with all of the code in it.':
    'Na fotografiji nije pronađen QR kod. Snimite je ponovo izbliza, s cijelim kodom.',

  // Duplicates.
  'Find duplicates': 'Pronađi duplikate',
  'The same person kept twice, to merge into one': 'Ista osoba sačuvana dva puta, za spajanje u jedan kontakt',
  'There is nothing to merge.': 'Nema ničega za spajanje.',
  'The same name': 'Isto ime',
  'The same number': 'Isti broj',
  'The same email': 'Ista e-mail adresa',
  'Merge': 'Spoji',
  'Merge these {n} into {name}? The others are deleted, from every account they are kept in.':
    'Spojiti ove kontakte ({n}) u kontakt {name}? Ostali se brišu iz svih računa u kojima su sačuvani.',
  'Merge all': 'Spoji sve',
  'Merge {n} set of contacts, each into its fullest? The others are deleted.':
    'Spojiti {n} skup kontakata, svaki u najpotpuniji kontakt? Ostali se brišu.',
  'Merge {n} sets of contacts, each into its fullest? The others are deleted.':
    'Spojiti {n} skup kontakata, svaki u najpotpuniji kontakt? Ostali se brišu. | Spojiti {n} skupa kontakata, svaki u najpotpuniji kontakt? Ostali se brišu. | Spojiti {n} skupova kontakata, svaki u najpotpuniji kontakt? Ostali se brišu.',
  '{n} set could not be merged.': '{n} skup se nije mogao spojiti.',
  '{n} sets could not be merged.': '{n} skup se nije mogao spojiti. | {n} skupa se nisu mogla spojiti. | {n} skupova se nije moglo spojiti.',
  'Duplicates': 'Duplikati',
  'Contacts that look like the same person: the same name, number or email. Merging keeps the fullest, with every number, email and address of the others, and deletes the others.':
    'Kontakti koji izgledaju kao ista osoba: isto ime, isti broj ili ista e-mail adresa. Spajanje zadržava najpotpuniji, sa svim brojevima, e-mail adresama i adresama ostalih, a ostale briše.',
  'No duplicates found.': 'Nisu pronađeni duplikati.',
  'Not the same': 'Nisu isti',
  'Kept, with the others in it': 'Zadržan, s podacima ostalih',

  // Birthdays.
  'Birthdays': 'Rođendani',
  "Without notices, Erevos cannot remind you of birthdays. Allow Notifications in Erevos's App info.":
    'Bez obavijesti Erevos vas ne može podsjetiti na rođendane. Dozvolite obavijesti u informacijama o aplikaciji Erevos.',
  'No contact has a birthday yet. Add one in Edit.': 'Nijedan kontakt još nema rođendan. Dodajte ga pod „Uredi“.',
  'Birthday reminders: on': 'Podsjetnici za rođendane: uključeni',
  'Birthday reminders: off': 'Podsjetnici za rođendane: isključeni',
  "A notice on the morning of each phone contact's birthday": 'Obavijest ujutro na rođendan svakog kontakta s telefona',

  // The SIM.
  'SIM contacts': 'Kontakti sa SIM kartice',
  'Copy the contacts on the SIM card to the phone': 'Kopiraj kontakte sa SIM kartice na telefon',
  "The contacts kept on the phone's SIM cards. Copied, they are in Android's contacts like the others; the SIM keeps its own.":
    'Kontakti sačuvani na SIM karticama telefona. Kad se kopiraju, nalaze se u Androidovim kontaktima kao i ostali; SIM kartica zadržava svoje.',
  'Reading the SIM…': 'Čitanje SIM kartice…',
  'No contacts on the SIM, or the phone does not let Erevos read it.': 'Na SIM kartici nema kontakata ili telefon ne dozvoljava Erevosu da je čita.',
  'The SIM has {n} contact.': 'Na SIM kartici je {n} kontakt.',
  'The SIM has {n} contacts.': 'Na SIM kartici je {n} kontakt. | Na SIM kartici su {n} kontakta. | Na SIM kartici je {n} kontakata.',
  'Copying… {done} of {total}': 'Kopiranje… {done} od {total}',
  'Copy {n} contact to the phone': 'Kopiraj {n} kontakt na telefon',
  'Copy {n} contacts to the phone': 'Kopiraj {n} kontakt na telefon | Kopiraj {n} kontakta na telefon | Kopiraj {n} kontakata na telefon',
  'Choose who to copy': 'Izaberi kontakte za kopiranje',
  '{n} contact copied to the phone.': 'Na telefon je kopiran {n} kontakt.',
  '{n} contacts copied to the phone.': 'Na telefon je kopiran {n} kontakt. | Na telefon su kopirana {n} kontakta. | Na telefon je kopirano {n} kontakata.',
  'SIM {n}': 'SIM {n}',

  // Kept only in Erevos, and in hidden chats.
  'Only in Erevos': 'Samo u Erevosu',
  "Sealed in this space, and not in the phone's contacts: no other app sees it, nor any account the phone syncs with.":
    'Zapečaćen u ovom prostoru, a ne u kontaktima telefona: ne vidi ga nijedna druga aplikacija ni ijedan račun s kojim se telefon usklađuje.',
  'No contact is kept only in Erevos yet. Choose Only in Erevos when you make one.':
    'Još nijedan kontakt nije sačuvan samo u Erevosu. Izaberite „Samo u Erevosu“ kad pravite kontakt.',
  'Erevos keeps {n} contacts of its own at most.': 'Erevos može sačuvati najviše ovoliko vlastitih kontakata: {n}.',
  'This contact is no longer kept in Erevos.': 'Ovaj kontakt više nije sačuvan u Erevosu.',
  'Delete {name}? It is kept only in Erevos, and cannot be brought back.':
    'Obrisati kontakt {name}? Sačuvan je samo u Erevosu i ne može se vratiti.',
  'Keep only in Erevos': 'Čuvaj samo u Erevosu',
  "Move {name} into Erevos? It is sealed in this space and deleted from the phone's contacts, from every account it is kept in: other apps no longer see it, and the phone no longer shows its name when it calls.":
    'Premjestiti kontakt {name} u Erevos? Zapečaćuje se u ovom prostoru i briše iz kontakata telefona, iz svih računa u kojima je sačuvan: druge aplikacije ga više ne vide, a telefon više ne prikazuje njegovo ime kad taj kontakt zove.',
  "Move to the phone's contacts": 'Premjesti u kontakte telefona',
  "Move {name} to the phone's contacts? Every app allowed to read them sees it there, and it is no longer kept in Erevos.":
    'Premjestiti kontakt {name} u kontakte telefona? Tamo ga vidi svaka aplikacija koja smije čitati kontakte, a više se ne čuva u Erevosu.',
  "Kept only in Erevos, sealed in this space. Not in the phone's contacts.":
    'Sačuvan samo u Erevosu, zapečaćen u ovom prostoru. Nije u kontaktima telefona.',
  'The photo is sealed with the contact, in a file of its own: only Erevos shows it.':
    'Fotografija je zapečaćena uz kontakt, u zasebnoj datoteci: prikazuje je samo Erevos.',
  'Hidden contacts': 'Skriveni kontakti',
  'The hidden chats are closed.': 'Skriveni razgovori su zatvoreni.',
  "Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.":
    'Čuvaju se samo ovdje, zapečaćeni sa skrivenim razgovorima: ne prikazuju se nigdje drugdje, čak ni u kontaktima prostora.',
  'Kept only in these hidden chats, sealed.': 'Čuva se samo u ovim skrivenim razgovorima, zapečaćen.',
  'favourite': 'favorit',
  'only in Erevos': 'samo u Erevosu',

  // Erevos contacts, and a contact's history.
  'Erevos contacts': 'Erevos kontakti',
  'Erevos contact': 'Erevos kontakt',
  'with an Erevos chat': 's Erevos razgovorom',
  'No Erevos contacts yet. Add one in Chat, with their link or QR code.':
    'Još nema Erevos kontakata. Dodajte ih u „Razgovor“, putem njihovog linka ili QR koda.',
  'A contact of your Erevos chats. Add it to your contacts to give it numbers, an email and more.':
    'Kontakt iz vaših Erevos razgovora. Dodajte ga u kontakte da mu upišete brojeve, e-mail adresu i drugo.',
  'In Erevos': 'U Erevosu',
  'The Erevos contact {name}': 'Erevos kontakt {name}',
  'End-to-end encrypted, through Erevos instead of the phone company.': 'Šifrirano s kraja na kraj, preko Erevosa umjesto preko mobilnog operatera.',
  'Not this Erevos contact': 'Nije ovaj Erevos kontakt',
  'One of its numbers is linked to this Erevos contact, in its chat.':
    'Jedan od njegovih brojeva povezan je s ovim Erevos kontaktom, u njegovom razgovoru.',
  'Link to an Erevos contact': 'Poveži s Erevos kontaktom',
  "The same person in your Erevos chats: this card then shows their chat and calls. The link is sealed in Erevos, never in the phone's contacts.":
    'Ista osoba u vašim Erevos razgovorima: ova kartica tada prikazuje njen razgovor i pozive. Veza je zapečaćena u Erevosu, nikad u kontaktima telefona.',
  'Add to contacts': 'Dodaj u kontakte',
  'History': 'Pozivi i poruke',
  'No calls or messages with this contact yet.': 'Još nema poziva ni poruka s ovim kontaktom.',
  "Its calls show here once Erevos may read the phone's call log. Erevos only shows them, and keeps no copy.":
    'Pozivi se ovdje prikazuju kad Erevos smije čitati popis poziva telefona. Erevos ih samo prikazuje i ne čuva kopiju.',
  'Show calls': 'Prikaži pozive',
  'Incoming call, {time}': 'Dolazni poziv, {time}',
  'Outgoing call, {time}': 'Odlazni poziv, {time}',
  'Outgoing call, no answer': 'Odlazni poziv, bez odgovora',

  // Other apps' contacts.
  'Add {what} to a contact': 'Dodaj {what} kontaktu',
  'Tap the contact to add it to, or make a new one.': 'Dodirnite kontakt kojem ga želite dodati ili napravite novi.',

  // A contact's Erevos ID (components/erevos-id.tsx).
  'Erevos ID': 'Erevos ID',
  'Erevos ID: {id}': 'Erevos ID: {id}',
  'That is not an Erevos ID: an Erevos ID is a contact link starting with erevos://contact':
    'To nije Erevos ID: Erevos ID je link za kontakt koji počinje s erevos://contact',
  'Their contact link from Erevos, to link this contact to another Erevos contact instead.':
    'Link za kontakt iz Erevosa te osobe, da biste ovaj kontakt umjesto toga povezali s drugim Erevos kontaktom.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Once saved, they join your Erevos chats, and the contact shows their chat and calls.':
    'Link za kontakt koji prikazuje Erevos te osobe, pod „Kopiraj moj link za kontakt“ ili kao QR kod. Kad ga sačuvate, ta osoba ulazi u vaše Erevos razgovore, a kontakt prikazuje njen razgovor i pozive.',
  "Choose them among these hidden chats' contacts: this card then shows their chat and calls.":
    'Izaberite osobu među kontaktima ovih skrivenih razgovora: ova kartica tada prikazuje njen razgovor i pozive.',
  'The contact link their Erevos shows, under Copy my contact link or as their QR code. Added here, they join your Erevos chats, and this card shows their chat and calls, end-to-end encrypted.':
    'Link za kontakt koji prikazuje Erevos te osobe, pod „Kopiraj moj link za kontakt“ ili kao QR kod. Kad ga dodate ovdje, ta osoba ulazi u vaše Erevos razgovore, a ova kartica prikazuje njen razgovor i pozive, šifrirane s kraja na kraj.',
  'Add to Erevos': 'Dodaj u Erevos',
  'Choose from my Erevos chats': 'Izaberi iz mojih Erevos razgovora',
  'That QR code holds no Erevos ID.': 'Taj QR kod ne sadrži Erevos ID.',
  'Take a photo of the QR code': 'Snimi QR kod',
  'Choose a photo of the QR code': 'Izaberi fotografiju QR koda',
  'The photo could not be read. Choose another one, or take it again.': 'Fotografija se nije mogla pročitati. Izaberite drugu ili je ponovo snimite.',
};
