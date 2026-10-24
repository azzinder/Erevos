// The Serbo-Croatian of the SMS screen's own tools: pinning, archive, drafts, blocking and the like (i18n/sh/index.ts).
export const smsTools: Record<string, string> = {
  // The list and its folders (app/index.tsx, app/sms-folder.tsx, components/sms-actions.tsx).
  Names: 'Imena',
  'All messages': 'Sve poruke',
  'Archived · {n}': 'Arhivirano · {n}',
  'Spam · {n}': 'Spam · {n}',
  'Trash · {n}': 'Otpad · {n}',
  'Draft': 'Nacrt',
  'Archive': 'Arhiviraj',
  'Unarchive': 'Vrati iz arhive',
  'Archived conversations': 'Arhivirani razgovori',
  'Spam': 'Spam',
  'Trash': 'Otpad',
  'Pin to the top': 'Prikvači na vrh',
  'Unpin': 'Otkvači',
  'Mark as spam': 'Označi kao spam',
  'Not spam': 'Nije spam',
  'Block {number}': 'Blokiraj {number}',
  'Unblock {number}': 'Odblokiraj {number}',
  'Undo': 'Poništi',
  'Not done': 'Nije obavljeno',
  'OK': 'U redu',
  'Archived. A new SMS from them brings it back.': 'Arhivirano. Novi SMS s tog broja vraća razgovor.',
  'Back in the list.': 'Vraćeno na popis.',
  'The Trash is full. Empty it first.': 'Otpad je pun. Prvo ga ispraznite.',
  'In the Trash. It goes from the phone in {days} days.': 'U otpadu. S telefona se briše za {days} dana.',
  'At most {n} conversations stay pinned. Unpin one first.': 'Prikvačeno može biti najviše {n} razgovora. Prvo otkvačite jedan.',
  'Not spam: back in the list.': 'Nije spam: vraćeno na popis.',
  'Marked as spam: it is in Spam.': 'Označeno kao spam: nalazi se u spamu.',
  'Block {number}?': 'Blokirati {number}?',
  "It goes into Android's own list of blocked numbers: Android rejects its SMS, MMS and calls, in every space and in the phone app too, until you unblock it. The conversation goes to Spam.":
    'Ide na Androidov popis blokiranih brojeva: Android odbija njegove SMS-ove, MMS-ove i pozive, u svakom prostoru i u aplikaciji za telefon, dok ga ne odblokirate. Razgovor ide u spam.',
  'Blocked.': 'Blokirano.',
  'Unblocked.': 'Odblokirano.',
  'Empty the Trash': 'Isprazni otpad',
  'Delete {n} conversation from the phone now? They cannot be brought back.': 'Obrisati sada s telefona {n} razgovor? Neće se moći vratiti.',
  'Delete {n} conversations from the phone now? They cannot be brought back.':
    'Obrisati sada s telefona {n} razgovor? Neće se moći vratiti. | Obrisati sada s telefona {n} razgovora? Neće se moći vratiti. | Obrisati sada s telefona {n} razgovora? Neće se moći vratiti.',
  'Delete the SMS with {name} from the phone now? They cannot be brought back.':
    'Obrisati sada s telefona SMS poruke iz razgovora {name}? Neće se moći vratiti.',
  'Delete for good': 'Obriši trajno',
  'Some could not be deleted. Try again.': 'Neki se nisu mogli obrisati. Pokušajte ponovo.',
  'Only the SMS app can delete SMS: make Erevos the SMS app under SMS in the menu.':
    'Samo SMS aplikacija može brisati SMS poruke: postavite Erevos kao SMS aplikaciju pod „SMS“ u meniju.',
  'This build of Erevos cannot delete SMS yet.': 'Ova verzija Erevosa još ne može brisati SMS poruke.',
  'Deleted on {when}. Goes from the phone on {then}.': 'Obrisano {when}. S telefona se briše {then}.',
  'Bring back': 'Vrati',
  'Delete now': 'Obriši sada',
  'The Trash is empty.': 'Otpad je prazan.',
  'No spam.': 'Nema spama.',
  'Nothing archived.': 'Ništa nije arhivirano.',
  "Conversations you deleted, kept {days} days in case you want them back, then deleted from the phone. Only this space hides them meanwhile: they are still in the phone's SMS.":
    'Razgovori koje ste obrisali čuvaju se {days} dana ako ih poželite vratiti, a zatim se brišu s telefona. U međuvremenu ih skriva samo ovaj prostor: i dalje su u SMS porukama telefona.',
  'SMS from numbers you blocked or marked as spam, and those the spam filter caught. The filter works on this phone alone and sends nothing anywhere. Hold one down to say it is not spam.':
    'SMS poruke s brojeva koje ste blokirali ili označili kao spam i one koje je uhvatio filter spama. Filter radi samo na ovom telefonu i nigdje ništa ne šalje. Zadržite prst na jednoj da označite da nije spam.',
  'Conversations you archived. One comes back to the list when a new SMS comes from them. Hold one down for more.':
    'Razgovori koje ste arhivirali. Razgovor se vraća na popis kad s tog broja stigne novi SMS. Zadržite prst na jednom za više.',

  // A conversation (app/sms.tsx).
  'In Spam': 'U spamu',
  'Archived': 'Arhivirano',
  'In the Trash': 'U otpadu',
  'More': 'Više',
  'The messages before are in the Trash.': 'Ranije poruke su u otpadu.',
  'Tap to send it again.': 'Dodirnite da je ponovo pošaljete.',
  'Send it again?': 'Poslati je ponovo?',
  'Send again': 'Pošalji ponovo',
  'This build of Erevos cannot send an MMS again yet.': 'Ova verzija Erevosa još ne može ponovo poslati MMS.',
  'Message deleted.': 'Poruka je obrisana.',
  'Hold the words down to copy them.': 'Zadržite prst na tekstu da ga kopirate.',
  'Goes in {n} s · tap to take it back': 'Šalje se za {n} s · dodirnite da je povučete',
  'It writes with a name, not a number, so it cannot be answered.':
    'Poruke stižu pod imenom, a ne s broja, pa se na njih ne može odgovoriti.',
  'Forward': 'Proslijedi',
  'It opens in the conversation you choose, to read and send there. To a number its picture goes too, as an MMS; into a chat only its words.':
    'Otvara se u razgovoru koji izaberete, da je tamo pročitate i pošaljete. Na broj ide i njena slika, kao MMS; u Erevos razgovor samo tekst.',
  'It opens in the conversation you choose, to read and send there.': 'Otvara se u razgovoru koji izaberete, da je tamo pročitate i pošaljete.',
  'Into an Erevos chat': 'U Erevos razgovor',

  // The SMS settings (app/sms-settings.tsx).
  'With the names come the pictures your contacts have, in the list and in the conversation. They too are read only to show them.':
    'Uz imena dolaze i slike vaših kontakata, na popisu i u razgovoru. I one se čitaju samo da bi se prikazale.',
  'Archived, Spam and Trash': 'Arhiva, spam i otpad',
  "In the list, hold an SMS conversation down to pin it to the top, archive it, mark it as spam, block it or delete it; a swipe to the side goes to the tab beside. This space keeps its own pins, archived conversations, Trash and spam marks, sealed with its password; the SMS stay in the phone's SMS, where another space sees them as they are.":
    'Na popisu zadržite prst na SMS razgovoru da ga prikvačite na vrh, arhivirate, označite kao spam, blokirate ili obrišete; prevlačenje u stranu vodi na susjednu karticu. Ovaj prostor čuva vlastite prikvačene i arhivirane razgovore, otpad i oznake spama, zapečaćene njegovom lozinkom; SMS poruke ostaju u SMS porukama telefona, gdje ih drugi prostor vidi onakve kakve jesu.',
  'Spam filter': 'Filter spama',
  'It works on this phone alone, by rules, and sends nothing anywhere. An SMS from a number that is no contact and was never answered goes to Spam when it has a link with words that try to fool, like a parcel held or a prize, or one of your words below. A number you marked as spam always goes there, one you marked not spam never does.':
    'Radi samo na ovom telefonu, po pravilima, i nigdje ništa ne šalje. SMS s broja koji nije kontakt i kojem nikad niste odgovorili ide u spam kad sadrži link s riječima koje pokušavaju prevariti, poput zadržanog paketa ili nagrade, ili neku od vaših riječi ispod. Broj koji ste označili kao spam uvijek ide tamo, a onaj koji ste označili da nije spam nikad.',
  'Turn the spam filter off': 'Isključi filter spama',
  'Turn the spam filter on': 'Uključi filter spama',
  'Let links from unknown numbers through': 'Propuštaj linkove s nepoznatih brojeva',
  'Send every link from unknown numbers to Spam': 'Šalji svaki link s nepoznatih brojeva u spam',
  'Your words': 'Vaše riječi',
  'An SMS with one of them goes to Spam, from any number or sender that is no contact. Tap a word to remove it.':
    'SMS s nekom od njih ide u spam, s bilo kojeg broja ili naziva koji nije kontakt. Dodirnite riječ da je uklonite.',
  'A word or a few': 'Jedna ili nekoliko riječi',
  'At most {n} words, each up to {length} letters.': 'Najviše {n} riječi, svaka do {length} slova.',
  'A notice still says "New message" when spam comes, as it shows before Erevos is opened. Block a number to hear nothing more from it.':
    'Obavijest i dalje kaže „New message“ kad stigne spam, jer se prikazuje prije nego što se Erevos otvori. Blokirajte broj da s njega više ništa ne čujete.',
  'Blocked numbers': 'Blokirani brojevi',
  "These are Android's own blocked numbers: Android rejects their SMS, MMS and calls. Every space, and the phone app, sees the same list. Block one from its conversation, with ⋮, or here.":
    'Ovo su Androidovi blokirani brojevi: Android odbija njihove SMS-ove, MMS-ove i pozive. Svaki prostor i aplikacija za telefon vide isti popis. Broj blokirajte iz njegovog razgovora, preko ⋮, ili ovdje.',
  'Only the SMS app or the phone app can see and change them: make Erevos the SMS app above.':
    'Samo SMS aplikacija ili aplikacija za telefon mogu ih vidjeti i mijenjati: postavite Erevos kao SMS aplikaciju iznad.',
  'This build of Erevos cannot block numbers yet.': 'Ova verzija Erevosa još ne može blokirati brojeve.',
  'No number is blocked.': 'Nijedan broj nije blokiran.',
  'Type one phone number.': 'Upišite jedan broj telefona.',
  'Unblock {number}?': 'Odblokirati {number}?',
  'Its SMS, MMS and calls reach the phone again.': 'Njegovi SMS-ovi, MMS-ovi i pozivi ponovo stižu na telefon.',
  'Unblock': 'Odblokiraj',
  'Taking an SMS back': 'Povlačenje SMS-a',
  'An SMS you send waits this long at the end of the conversation before it goes: tap it then to take it back. When you leave Erevos, it goes at once.':
    'SMS koji pošaljete čeka ovoliko na kraju razgovora prije slanja: tada ga dodirnite da ga povučete. Kad izađete iz Erevosa, odmah se šalje.',

  // The phone's SMS in backups (app/backup.tsx).
  "The phone's SMS": 'SMS poruke telefona',
  "Backups can hold the phone's SMS and MMS too, with up to {mb} MB of their pictures, sealed with the backup's password. Restoring the backup puts back into the phone's SMS each one it does not have, and deletes none.":
    'Rezervne kopije mogu obuhvatiti i SMS i MMS poruke telefona, s najviše {mb} MB njihovih slika, zapečaćene lozinkom rezervne kopije. Pri vraćanju rezervne kopije u SMS poruke telefona vraća se svaka poruka koju telefon nema, a nijedna se ne briše.',
  'Erevos reads them only while it is the SMS app: make it the SMS app under SMS in the menu.':
    'Erevos ih čita samo dok je SMS aplikacija: postavite ga kao SMS aplikaciju pod „SMS“ u meniju.',
  'Put the SMS in backups': 'Stavljaj SMS poruke u rezervne kopije',
  'Leave the SMS out': 'Izostavi SMS poruke',
  "It holds {sms} SMS and {mms} MMS of the phone's.": 'Sadrži SMS poruke telefona: {sms} SMS i {mms} MMS.',
  '{n} picture did not fit and stayed out.': '{n} slika nije stala i izostavljena je.',
  '{n} pictures did not fit and stayed out.': '{n} slika nije stala i izostavljena je. | {n} slike nisu stale i izostavljene su. | {n} slika nije stalo i izostavljeno je.',
  'SMS in this backup': 'SMS poruke u ovoj rezervnoj kopiji',
  "This backup also holds the phone's SMS. They go back into the phone's SMS only while Erevos is the SMS app: make it the SMS app under SMS in the menu, then restore again. Or restore the rest now, without them.":
    'Ova rezervna kopija sadrži i SMS poruke telefona. One se vraćaju u SMS poruke telefona samo dok je Erevos SMS aplikacija: postavite ga kao SMS aplikaciju pod „SMS“ u meniju, pa ponovo vratite kopiju. Ili sada vratite ostalo, bez njih.',
  'Without the SMS': 'Bez SMS poruka',
  'Putting the SMS back into the phone…': 'Vraćanje SMS poruka u telefon…',
  "{sms} SMS and {mms} MMS went back into the phone's SMS. Those it had already stayed as they were.":
    'U SMS poruke telefona vraćeno je: {sms} SMS i {mms} MMS. One koje je telefon već imao ostale su kakve su bile.',
  'A newer Erevos made this backup: what this one does not know yet stays out. Update Erevos first to restore all of it.':
    'Ovu rezervnu kopiju napravio je noviji Erevos: ono što ovaj još ne poznaje izostavlja se. Prvo ažurirajte Erevos da biste vratili sve.',
  "The SMS could not go back into the phone's SMS: {error}": 'SMS poruke nisu se mogle vratiti u SMS poruke telefona: {error}',
  'Copy code': 'Kopiraj kod',
  'The code is copied: any app that reads the clipboard can read it.': 'Kod je kopiran: svaka aplikacija koja čita međuspremnik može ga pročitati.',
  'The code could not be copied.': 'Kod nije mogao biti kopiran.',
  // Spam's rules on who sends, and why an SMS is in Spam (app/sms-settings.tsx, lib/sms-folders.ts).
  'Why: the number is blocked on this phone.': 'Zašto: broj je blokiran na ovom telefonu.',
  'Why: you marked it as spam.': 'Zašto: označili ste ga kao spam.',
  'Why: your rule {rule} names the sender.': 'Zašto: vaše pravilo {rule} odgovara pošiljaocu.',
  'Why: a number from abroad.': 'Zašto: broj iz inostranstva.',
  'Why: it has your word "{word}".': 'Zašto: sadrži vašu riječ „{word}”.',
  'Why: a link, from a number that is no contact.': 'Zašto: link, s broja koji nije kontakt.',
  'Why: a link, with words that try to fool ("{phrase}").': 'Zašto: link, s riječima koje pokušavaju prevariti („{phrase}”).',
  'At most {n} senders each way, each up to {length} letters, and not * alone.': 'Najviše {n} pošiljalaca na svakoj listi, svaki do {length} znakova, i ne samo *.',
  'Senders': 'Pošiljaoci',
  'A sender’s name, as shops and banks send, or a number, where * stands for anything: +4470* is every number that starts so, 1234* every short code that does. Let through: the filter never sends theirs to Spam, as your bank’s or your family’s; a number you marked as spam, or blocked, still goes there.': 'Ime pošiljaoca, kakva šalju prodavnice i banke, ili broj, gdje * znači bilo šta: +4470* je svaki broj koji tako počinje, 1234* svaki kratki broj koji tako počinje. Propusti: filter njihove poruke nikad ne šalje u spam, kao one od vaše banke ili porodice; broj koji ste označili kao spam, ili blokirali, ipak ide tamo.',
  'PROMO, +4470*, 1234*': 'PROMO, +4470*, 1234*',
  'To Spam': 'U spam',
  'Let through': 'Propusti',
  'To Spam:': 'U spam:',
  'Let through:': 'Propusti:',
  'Let numbers from abroad through': 'Propuštaj brojeve iz inostranstva',
  'Send numbers from abroad to Spam': 'Šalji brojeve iz inostranstva u spam',
  'Your country code': 'Pozivni broj vaše zemlje',
  'A number written with another one is from abroad; one written without any is from here.': 'Broj napisan s drugim je iz inostranstva; broj napisan bez pozivnog je odavde.',
  'Type it: until then no number counts as from abroad.': 'Upišite ga: do tada nijedan broj se ne računa kao iz inostranstva.',
};
