// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Serbo-Croatian of linked devices: the account on the phone and on a computer (lib/devices.ts, app/devices.tsx; i18n/sh/index.ts).
export const devices: Record<string, string> = {
  // Linking and the links (lib/devices.ts).
  Computer: 'Računar',
  'Linked devices could not open.': 'Povezani uređaji nisu se mogli otvoriti.',
  'That device is linked already.': 'Taj uređaj je već povezan.',
  'That is not a code from Linked devices.': 'To nije kod iz „Povezani uređaji“.',
  'The code changed. Compare it again.': 'Kod se promijenio. Ponovo provjerite da je isti.',
  'This device is no longer linked to a phone.': 'Ovaj uređaj više nije povezan s telefonom.',
  'This is a linked device. Link from the phone that holds the account.':
    'Ovo je povezani uređaj. Povezivanje pokrenite s telefona na kojem je račun.',
  'This space has chats of its own. Link from a space with none, such as one that opens with a new password.':
    'Ovaj prostor ima vlastite razgovore. Povezivanje pokrenite iz prostora bez njih, na primjer onog koji se otvara novom lozinkom.',
  'This space is linked already.': 'Ovaj prostor je već povezan.',
  'These hidden chats are linked already.': 'Ovi skriveni razgovori su već povezani.',
  'These hidden chats have chats of their own. Link from hidden chats with none, such as those a new PIN sets.':
    'Ovi skriveni razgovori imaju vlastite razgovore. Povežite iz skrivenih razgovora bez ijednog, poput onih koje otvara novi PIN.',
  'Too long to go through the phone.': 'Predugo za slanje preko telefona.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Prvo upišite adresu relaya u „Relay“: povezani uređaji dolaze do ovog telefona preko njega.',
  '{n} devices are linked already, the most there can be.': 'Već je povezan najveći mogući broj uređaja: {n}.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Povezani uređaji',
  'Not sent by the phone': 'Telefon nije poslao',
  'These chats came from a linked device’s backup: you can read them here, but not write in them. To write, link this device to the phone again, in Linked devices.':
    'Ovi razgovori su došli iz rezervne kopije povezanog uređaja: ovdje ih možete čitati, ali ne i pisati u njima. Da biste pisali, ponovo povežite ovaj uređaj s telefonom, u „Povezani uređaji“.',
  'This account on a computer or in a browser too': 'Ovaj račun i na računaru ili u pregledniku',
  "This chat is the phone's: move it into hidden chats there.": 'Ovaj razgovor pripada telefonu: tamo ga premjestite u skrivene razgovore.',
  'These hidden chats are linked to a phone: move the chat into them there.':
    'Ovi skriveni razgovori su povezani s telefonom: tamo premjestite razgovor u njih.',
  "This chat is the phone's: move it out of the hidden chats there.": 'Ovaj razgovor pripada telefonu: tamo ga izvadite iz skrivenih razgovora.',

  // A call answered on another device of the account (components/call-screen.tsx, lib/call-lines.ts).
  'Answered on another device': 'Javljeno na drugom uređaju',
  'answered on another device': 'javljeno na drugom uređaju',

  // Linked devices (app/devices.tsx).
  'All of it': 'Sve',
  'The last month': 'Posljednji mjesec',
  'The last week': 'Posljednja sedmica',
  None: 'Ništa',
  'Web browser': 'Web-preglednik',
  'Code copied. Paste it on the phone in Settings → Data and devices → Linked devices.': 'Kod je kopiran. Zalijepite ga na telefonu u „Postavke → Podaci i uređaji → Povezani uređaji“.',
  'Code copied. Paste it on the phone, in Linked devices of the same hidden chats.':
    'Kod je kopiran. Zalijepite ga na telefonu, u „Povezani uređaji“ istih skrivenih razgovora.',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Povezano. Razgovori dolaze s telefona, a s njima i poruke koje je izabrao da prenese.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Nije povezano. Možda je kod pročitala i druga osoba. Napravite novi i ponovo povežite.',
  'Now the computer shows a code too. If it is {code}, tap They match there.':
    'Sada i računar prikazuje kod. Ako je {code}, tamo dodirnite „Podudaraju se“.',
  'Unlink this device': 'Odvoji ovaj uređaj',
  'Unlink {name}': 'Odvoji uređaj {name}',
  "The account's chats leave this device, messages and all, and so do the accounts it brought over from the phone. The phone keeps them.":
    'Razgovori računa uklanjaju se s ovog uređaja, zajedno s porukama, a isto i računi koje je prenio s telefona. Telefon ih zadržava.',
  'Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.':
    'Na njega više ništa ne ide, a ništa što pošalje ne prima se. Ono što ima ostaje na njemu, iza njegovog zaključavanja.',
  'Unlinked.': 'Odvojeno.',
  'Unlinked here. The phone was not told: unlink this device there too.':
    'Odvojeno ovdje. Telefon nije obaviješten: odvojite ovaj uređaj i tamo.',
  'Unlinked. The device was not told, and gets nothing more.': 'Odvojeno. Uređaj nije obaviješten i više ništa ne prima.',
  'The messages go to it now. What it has already is not kept twice.':
    'Poruke sada idu na njega. Ono što već ima ne čuva se dva puta.',
  'Messages to bring over': 'Koje poruke prenijeti',
  'Photos and files too': 'I fotografije i datoteke',
  'Linked to {name}': 'Povezano s uređajem {name}',
  'Since {when}. Last heard from {last}.': 'Od {when}. Posljednji put se javio {last}.',
  'This device has the chats and groups of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls ring here too. New groups, public groups and group calls stay on the phone for now.':
    'Ovaj uređaj ima razgovore i grupe telefona na kojem je račun. Ono što ovdje napišete ide preko telefona, koji mora biti uključen i povezan s relayem. Pozivi zvone i ovdje. Nove grupe, javne grupe i grupni pozivi zasad ostaju na telefonu.',
  'These hidden chats have the chats and groups of the same hidden chats on the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay, with these hidden chats open or receiving while closed there. Calls ring here too. New groups and group calls stay on the phone for now.':
    'Ovi skriveni razgovori imaju razgovore i grupe istih skrivenih razgovora telefona na kojem je račun. Ono što ovdje napišete ide preko telefona, koji mora biti uključen i povezan s relayem, s ovim skrivenim razgovorima tamo otvorenim ili s primanjem dok su zatvoreni. Pozivi zvone i ovdje. Nove grupe i grupni pozivi zasad ostaju na telefonu.',
  'Make or join groups on the phone that holds this account.': 'Grupe pravite i pridružujete im se na telefonu na kojem je ovaj račun.',
  'Group calls ring on the phone that holds this account, for now. Call from there.':
    'Grupni pozivi zasad zvone na telefonu na kojem je ovaj račun. Pozovite odande.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go with it: each links on its own, from inside it.':
    'Isti račun na računaru ili u pregledniku. Račun ostaje na telefonu: telefon prosljeđuje, šifrirano s kraja na kraj, ono što stiže i ono što računar napiše, pa kontakti ne vide ništa novo. Skriveni razgovori i ono što otvara druga lozinka nikad ne idu s njim: svaki se povezuje zasebno, iznutra.',
  'These hidden chats on a computer or in a browser, linked on their own. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Nothing of it shows in the space, nor goes to its linked devices.':
    'Ovi skriveni razgovori na računaru ili u pregledniku, povezani zasebno. Račun ostaje na telefonu: telefon prosljeđuje, šifrirano s kraja na kraj, ono što stiže i ono što računar napiše, pa kontakti ne vide ništa novo. Ništa od toga se ne vidi u prostoru, niti ide na njegove povezane uređaje.',
  'Link {name}': 'Poveži uređaj {name}',
  'Once you tap Link, the computer shows this code. Link only if it shows the same:':
    'Kad dodirnete „Poveži“, računar prikazuje ovaj kod. Povežite samo ako prikazuje isti:',
  Link: 'Poveži',
  Devices: 'Uređaji',
  'Linked {when}. Last heard from {last}.': 'Povezan {when}. Posljednji put se javio {last}.',
  'Linked {when}.': 'Povezan {when}.',
  'Waiting for They match to be tapped on it.': 'Čeka se da se na njemu dodirne „Podudaraju se“.',
  'Bringing over messages: {n} so far.': 'Prenose se poruke: dosad {n}.',
  'Bring over': 'Prenesi',
  'Bring over messages again': 'Ponovo prenesi poruke',
  'Signed in as {name}: this device has a token of its own there. Now tap Link to my phone.':
    'Prijavljeni ste kao {name}: ovaj uređaj tamo ima vlastiti token. Sada dodirnite „Poveži s mojim telefonom“.',
  'Link a computer to this phone': 'Poveži računar s ovim telefonom',
  "On the computer, open Settings → Data and devices → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'Na računaru otvorite „Postavke → Podaci i uređaji → Povezani uređaji → Poveži s mojim telefonom“. Zatim skenirajte njegov kod kamerom ovog telefona ili ga tamo kopirajte i zalijepite ovdje.',
  "On the computer, open the same hidden chats with their PIN, then Linked devices → Link to my phone in them. Then scan its code with this phone's camera while these hidden chats are open, or copy it there and paste it here.":
    'Na računaru otvorite iste skrivene razgovore njihovim PIN-om, pa u njima „Povezani uređaji → Poveži s mojim telefonom“. Zatim skenirajte njegov kod kamerom ovog telefona dok su ovi skriveni razgovori otvoreni, ili ga tamo kopirajte i zalijepite ovdje.',
  'Code from the computer': 'Kod s računara',
  Next: 'Dalje',
  'Link to my phone': 'Poveži s mojim telefonom',
  'The phone read the code. Does it show this one too?': 'Telefon je pročitao kod. Prikazuje li i on ovaj isti?',
  'They match': 'Podudaraju se',
  'They differ': 'Razlikuju se',
  'On the phone that holds the account, scan this code with the camera, or paste it in Settings → Data and devices → Linked devices. This space must have no chats of its own.':
    'Na telefonu na kojem je račun skenirajte ovaj kod kamerom ili ga zalijepite u „Postavke → Podaci i uređaji → Povezani uređaji“. Ovaj prostor ne smije imati vlastite razgovore.',
  'On the phone that holds the account, open the same hidden chats with their PIN, then scan this code with the camera, or paste it in Linked devices in them. These hidden chats must have no chats of their own.':
    'Na telefonu na kojem je račun otvorite iste skrivene razgovore njihovim PIN-om, pa skenirajte ovaj kod kamerom, ili ga zalijepite u njihove „Povezani uređaji“. Ovi skriveni razgovori ne smiju imati vlastite razgovore.',
  'Copy the code': 'Kopiraj kod',
  'Share the code': 'Podijeli kod',
  'Waiting for the phone. The code works for half an hour.': 'Čeka se telefon. Kod vrijedi pola sata.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Koristite ovo kad je ovaj uređaj računar: njegovi razgovori postaju razgovori telefona na kojem je račun.',
  'Use this when this device is the computer: these hidden chats become those of the same hidden chats on the phone that holds the account.':
    'Koristite ovo kad je ovaj uređaj računar: ovi skriveni razgovori postaju isti skriveni razgovori telefona na kojem je račun.',
  'These hidden chats have no relay queue yet: in them, type the relay address under For advanced users, then create their queue.':
    'Ovi skriveni razgovori još nemaju red na relayu: u njima upišite adresu relaya pod „Za napredne korisnike“, a zatim napravite njihov red.',
  'The phone answers on a queue of this device on a relay: the one the phone uses, or any other. If the relay asks for a token, sign in when it offers that, or type one.':
    'Telefon odgovara na redu ovog uređaja na relayu: onom koji telefon koristi ili bilo kojem drugom. Ako relay traži token, prijavite se kad to ponudi ili upišite jedan.',
  'Name of this device': 'Naziv ovog uređaja',
  'Tap Link to my phone, and a QR code for the phone shows here.': 'Dodirnite „Poveži s mojim telefonom“ i ovdje se prikazuje QR kod za telefon.',
  'Send the accounts to {name}': 'Pošalji račune uređaju {name}',
  "This space's Matrix, XMPP and Nostr accounts go to it, end-to-end encrypted, and it signs in to each as a new device. Once unlinked, it signs out of them.":
    'Matrix, XMPP i Nostr računi ovog prostora idu na njega, šifrirano s kraja na kraj, a on se prijavljuje na svaki kao novi uređaj. Kad se odvoji, odjavljuje se s njih.',
  "These hidden chats' own Matrix, XMPP and Nostr accounts go to it, end-to-end encrypted, into the same hidden chats there, and it signs in to each as a new device. Once unlinked, it signs out of them.":
    'Vlastiti Matrix, XMPP i Nostr računi ovih skrivenih razgovora idu na njega, šifrirani s kraja na kraj, u iste skrivene razgovore tamo, i on se na svaki prijavljuje kao novi uređaj. Kad se odveže, odjavljuje se s njih.',
  'Sent to {name}: {accounts}.': 'Poslano uređaju {name}: {accounts}.',
  'Nothing went: this space has no Matrix, XMPP or Nostr account, or too much waits for that device already.':
    'Ništa nije poslano: ovaj prostor nema Matrix, XMPP ni Nostr račun, ili za taj uređaj već čeka previše.',
  'Nothing went: these hidden chats have no Matrix, XMPP or Nostr account of their own, or too much waits for that device already.':
    'Ništa nije poslano: ovi skriveni razgovori nemaju vlastiti Matrix, XMPP ili Nostr račun, ili za taj uređaj već čeka previše.',
  'Accounts from the phone': 'Računi s telefona',
  'Matrix: {id}, signed in here as a new device.': 'Matrix: {id}, prijavljen ovdje kao novi uređaj.',
  'Matrix: sign in to {id} here once, with its password. Its keys come from the phone, so no Security Key or check by emoji is needed.':
    'Matrix: prijavite se ovdje jednom na {id}, njegovom lozinkom. Njegovi ključevi dolaze s telefona, pa nisu potrebni ni sigurnosni ključ ni provjera emojijima.',
  'Sign in to Matrix': 'Prijavite se na Matrix',
  'XMPP: {id}, signed in here as a new device.': 'XMPP: {id}, prijavljen ovdje kao novi uređaj.',
  'Nostr: the key of the Nostr chats is here too.': 'Nostr: ključ Nostr razgovora je i ovdje.',
  'Not brought over yet: {accounts}. Tried again each time this space opens.':
    'Još nije preneseno: {accounts}. Pokušava se ponovo svaki put kad se ovaj prostor otvori.',
  'Not brought over yet: {accounts}. Tried again each time these hidden chats open.':
    'Još nije preneseno: {accounts}. Pokušava se ponovo svaki put kad se ovi skriveni razgovori otvore.',
  'Once this device is unlinked, it signs out of the accounts it brought over.':
    'Kad se ovaj uređaj odvoji, odjavljuje se s računa koje je prenio s telefona.',
  'Send the accounts': 'Pošalji račune',
  'Same settings on every device': 'Iste postavke na svim uređajima',
  'The language and the look change on the other devices too. A photo behind the screens, passwords, PINs and what is about this device alone stay as they are on each.':
    'Jezik i izgled mijenjaju se i na drugim uređajima. Fotografija iza ekrana, lozinke, PIN-ovi i ono što se tiče samo ovog uređaja ostaju kakvi jesu na svakom.',
};
