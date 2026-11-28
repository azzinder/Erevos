// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Serbo-Croatian of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/sh/index.ts).
export const whatsNew: Record<string, string> = {
  "**Back and Next at the first start**: all its steps now come before the first space opens, and the back arrow, or Android's back key, goes back a step with everything as you left it. Nothing is used until **Done**: then the space opens already as visible as you chose, locked with your password if you typed one, without asking for it again. Should Erevos close in between, it starts again at the step you left. See [Getting started](#start).":
    "**Nazad i Dalje pri prvom pokretanju**: svi njegovi koraci sada dolaze prije nego se otvori prvi prostor, a strelica nazad, ili Androidova tipka za nazad, vraća korak unazad, sa svime kako ste ostavili. Ništa se ne koristi prije **Gotovo**: tada se prostor otvara već onoliko vidljiv koliko ste izabrali, zaključan vašom lozinkom ako ste je upisali, bez ponovnog traženja. Ako se Erevos u međuvremenu zatvori, ponovo počinje od koraka na kojem ste stali. Vidite [Prvi koraci](#start).",
  "Until **Done**, the first start's choices are kept only on this device and the password only in memory; the first space is made then, already as visible as chosen, so it reaches no server before, and with INVISIBLE only through Tor.":
    "Do **Gotovo**, ono što se izabere pri prvom pokretanju ostaje samo na ovom uređaju, a lozinka samo u memoriji; prvi prostor nastaje tek tada, već onoliko vidljiv koliko je izabrano, pa prije toga ne dolazi ni do jednog servera, a s INVISIBLE samo preko Tora.",
  "**Release candidate 4**: Erevos Lite with what Erevos 3.0.0-rc.4 brought to its chats: a new first start in four short steps that takes a place on LPHL's server by itself, a choice of how visible you are, with calls straight from phone to phone, the fingerprint or face at once, and backups that say why a folder did not take them.":
    "**Kandidat za izdanje 4**: Erevos Lite s onim što je Erevos 3.0.0-rc.4 donio njegovim razgovorima: novo prvo pokretanje u četiri kratka koraka koje samo uzima mjesto na LPHL-ovom serveru, izbor koliko ste vidljivi, s pozivima izravno od telefona do telefona, otisak prsta ili lice odmah, i rezervne kopije koje kažu zašto ih folder nije primio.",
  "**Release candidate 3**: Erevos Lite with what Erevos 3.0.0-rc.3 brought to its chats: it starts by itself after the phone turns on, shows nothing of a space before its password, sends backups to your own server by hand too, and can begin with a server of your own.":
    "**Kandidat za izdanje 3**: Erevos Lite s onim što je Erevos 3.0.0-rc.3 donio njegovim razgovorima: sam se pokreće kad se telefon uključi, ne pokazuje ništa od prostora prije njegove lozinke, šalje rezervne kopije na vaš server i ručno, i može početi s vlastitim serverom.",
  "**Your own server from the first start**: on a phone with no server yet, **I have no invite**, at the first start and on **New chat**, opens one screen that says where your messages wait and offers every way to begin: an account at a server such as LPHL, **I have a server of my own**, with its address and the code you were given, or **Start without a server**. See [Erevos on your own servers](#own-servers).":
    "**Vlastiti server od prvog pokretanja**: na telefonu koji još nema server, **Nemam pozivnicu**, pri prvom pokretanju i u ekranu **Novi razgovor**, otvara ekran koji kaže gdje čekaju vaše poruke i nudi sve načine da počnete: račun na serveru kao što je LPHL, **Imam vlastiti server**, s njegovom adresom i kodom koji ste dobili, ili **Počnite bez servera**. Vidite [Erevos na vlastitim serverima](#own-servers).",
  "**Speech and translation models from a server of yours**: where Erevos asks to download them, **Download from another server…** takes a web folder of yours that holds the same files; Erevos checks every file and refuses one that was changed. See [Erevos on your own servers](#own-servers).":
    "**Modeli za govor i prevođenje s vašeg servera**: tamo gdje Erevos traži da ih preuzme, **Preuzmi s drugog servera…** prima vaš web folder s istim datotekama; Erevos provjerava svaku datoteku i odbija onu koja je izmijenjena. Vidite [Erevos na vlastitim serverima](#own-servers).",
  "A contact link made for a website is read when pasted or scanned whatever web server its page is on; until now, only from LPHL's.":
    "Link za kontakt za web stranicu čita se kad ga zalijepite ili skenirate, na kojem god web serveru bila njegova stranica; dosad samo s LPHL-ovog.",
  "An invite by SMS is read the same way, whatever web server its page is on.":
    "Pozivnica SMS-om čita se na isti način, na kojem god web serveru bila njena stranica.",
  "LPHL's addresses are now in one place in the code: a community that builds Erevos for itself can name its own web server and first server for messages instead.":
    "LPHL-ove adrese sada su na jednom mjestu u kodu: zajednica koja sama gradi Erevos može umjesto njih navesti svoj web server i svoj prvi server za poruke.",
  "**Erevos starts by itself after the phone turns on**: where it receives in the background, it now does so unless you choose **Wait until I open it**, under **Settings** → **Notifications** → **In the background**; until now, only once you turned it on there. Before you open a space it reads no message and rings for no call: the spaces set to **Also while another space is open** say only that something came. See [Chat through a server](#relay).":
    "**Erevos se sam pokreće kad se telefon uključi**: gdje prima u pozadini, sada to radi, osim ako izaberete **Čekaj dok ga ne otvorim**, pod **Postavke** → **Obavijesti** → **U pozadini**; dosad samo ako ste to tamo uključili. Prije nego otvorite prostor ne čita nijednu poruku i ne zvoni ni za jedan poziv: prostori s **I dok je otvoren drugi prostor** kažu samo da je nešto stiglo. Vidite [Razgovor preko servera](#relay).",
  "**Nothing of a space shows before its password**: on Android, the phone covers Erevos's screens as it goes to the background, and back after the 30 seconds they show only after the password. **Lock now** covers them at once, and **Fingerprint or face** is there as soon as the password screen shows. See [Password lock](#lock).":
    "**Ništa od prostora se ne vidi prije njegove lozinke**: na Androidu telefon prekrije ekrane Erevosa čim ode u pozadinu, a ako se vratite nakon 30 sekundi, vide se tek nakon lozinke. **Zaključaj sada** ih odmah prekrije, a **Otisak prsta ili lice** je tu čim se pokaže ekran za lozinku. Vidite [Zaključavanje lozinkom](#lock).",
  "**Camera before the password**: on Android, with Erevos locked, the camera's icon opens the camera at once. What it takes is encrypted as it is taken and shows only after the password, in the Collection; to have the camera wait for the password, turn off **Open the camera without the password** in the Collection's settings. See [Collection](#collection).":
    "**Kamera prije lozinke**: na Androidu, sa zaključanim Erevosom, ikona kamere odmah otvara kameru. Ono što snimi šifrira se već pri snimanju i vidi se tek nakon lozinke, u Zbirci; da kamera čeka lozinku, isključite **Otvori kameru bez lozinke** u postavkama Zbirke. Vidite [Zbirka](#collection).",
  "**Backups to your own server, by hand too**: **Make a backup** offers **To a server (WebDAV)** beside **Into a folder**, also with automatic backups off; once a server is set, its button sends a backup there at once. See [Backups](#backup).":
    "**Rezervne kopije na vaš vlastiti server, i ručno**: **Napravi rezervnu kopiju** nudi **Na server (WebDAV)** pored **U folder**, i s isključenim automatskim kopijama; kad je server postavljen, njegovo dugme odmah šalje kopiju tamo. Vidite [Rezervne kopije](#backup).",
  "**Clear numbers for a backup**: once one is made, Erevos says how big it is in all, with the files beside it, when it began and when it ended, and what is not in it. See [Backups](#backup).":
    "**Jasni brojevi za rezervnu kopiju**: kad je gotova, Erevos kaže koliko je velika ukupno, s datotekama pored nje, kad je počela i kad je završila, i šta nije u njoj. Vidite [Rezervne kopije](#backup).",
  "**The Collection's server, checked and brought back**: in the Collection's settings, **Check** looks whether every piece of its files is on its WebDAV server, whole, and opens 4 picked at random; **Bring back the files not on this phone** fetches at once every file this phone lacks. See [Collection](#collection).":
    "**Server Zbirke, provjeren i vraćen**: u postavkama Zbirke, **Provjeri** gleda je li svaki dio njenih datoteka čitav na njenom WebDAV serveru i otvara 4 nasumično izabrana; **Vrati datoteke kojih nema na ovom telefonu** odjednom donosi svaku datoteku koja nedostaje ovom telefonu. Vidite [Zbirka](#collection).",
  "**New chat, as it was meant to look**: **Near me**, **Far away** and **I have their code** are three large buttons, with **My link**, **Blocked contacts** and **For advanced users** small under them; the QR code for someone beside you shows small, and large at a tap, and an invite's link shows short on the page, though what is sent is always the whole link. See [Chat through a server](#relay).":
    "**Novi razgovor, kako je zamišljen**: **Pored mene**, **Daleko** i **Imam njegov kod** su tri velika dugmeta, s **Moj link**, **Blokirani kontakti** i **Za napredne korisnike** malim ispod njih; QR kod za nekoga pored vas pokazuje se malen, a velik na dodir, a link pozivnice pokazuje se kratak na stranici, iako se uvijek šalje cijeli link. Vidite [Razgovor preko servera](#relay).",
  "**SMS conversations like Erevos's own chats**: **+** opens under the field as in them, with **Send later** among the rest, and in a short conversation the field stays at the bottom. See [SMS](#sms).":
    "**SMS razgovori kao Erevosovi razgovori**: **+** se otvara ispod polja kao u njima, s **Pošalji kasnije** među ostalim, a u kratkom razgovoru polje ostaje dolje. Vidite [SMS](#sms).",
  "**Nostr, Matrix and XMPP chats like Erevos's own**: **+** opens under the field as in them, with **Disappearing message** and **Send later**, and in a short chat the field stays at the bottom.":
    "**Nostr, Matrix i XMPP razgovori kao Erevosovi**: **+** se otvara ispod polja kao u njima, s **Poruka koja nestaje** i **Pošalji kasnije**, a u kratkom razgovoru polje ostaje dolje.",
  "The home screen no longer says, for a few seconds after the password on a phone with many chats, that there is no server yet: the line waits until it knows.":
    "Početni ekran više ne kaže nekoliko sekundi nakon lozinke, na telefonu s mnogo razgovora, da još nema servera: red čeka dok ne zna.",
  "On Android and in the desktop app, a backup made by hand is now read back from its folder, as the automatic ones are, and a backup sent to a server is checked there: it and every part it names are there, each of the size it was sent with.":
    "Na Androidu i u desktop aplikaciji, rezervna kopija napravljena ručno sada se ponovo čita iz svog foldera, kao automatske, a kopija poslana na server tamo se provjerava: ona i svaki dio koji navodi su tamo, svaki veličine s kojom je poslan.",
  "After each copy of the Collection to its WebDAV server, Erevos lists the folder again: a piece that is not there whole goes again with the next copy.":
    "Nakon svakog kopiranja Zbirke na njen WebDAV server, Erevos ponovo izlista folder: dio koji tamo nije čitav ide ponovo sa sljedećim kopiranjem.",
  "On Android, the lock's 30 seconds are counted on a clock that changing the phone's date and time does not move.":
    "Na Androidu se 30 sekundi zaključavanja broje na satu koji promjena datuma i vremena na telefonu ne pomjera.",
  "What the camera takes with Erevos locked is encrypted for the Collection of the space opened last, with a key of its own: the locked camera keeps no key that opens anything.":
    "Ono što kamera snimi dok je Erevos zaključan šifrira se za Zbirku posljednjeg otvorenog prostora, vlastitim ključem: zaključana kamera ne drži nijedan ključ koji bilo šta otvara.",
  "**QR codes and invites with SMS invites off**: a contact QR code or an invite link you take yourself now works also with the invites by SMS turned off under **Find Erevos on a number**; until now nothing happened then.":
    "**QR kodovi i pozivnice s isključenim SMS pozivnicama**: QR kod kontakta ili link pozivnice koji sami prihvatite sada radi i kad su pozivnice putem SMS-a isključene pod **Pronađi Erevos na broju**; dosad se tada ništa nije dešavalo.",
  "**Release candidate 2**: Erevos Lite with what Erevos 3.0.0-rc.2 brought to its chats: New chat that asks where the other person is, and the fixes with it.":
    "**Kandidat za izdanje 2**: Erevos Lite s onim što je Erevos 3.0.0-rc.2 donio njegovim razgovorima: Novi razgovor, koji pita gdje je druga osoba, i ispravke uz njega.",
  "**New chat asks where the other person is**: **Near me** makes two phones side by side each other's contacts with nothing typed, once both show the same six pictures; **Far away** sends an invite with any app; **I have their code** takes 8 digits, a link or a QR code. See [Chat through a server](#relay).":
    "**Novi razgovor pita gdje je druga osoba**: **Pored mene** od dva telefona jedan pored drugog pravi kontakte bez ikakvog kucanja, čim oba pokažu istih šest slika; **Daleko** šalje pozivnicu bilo kojom aplikacijom; **Imam njegov kod** prima 8 cifara, link ili QR kod. Pogledajte [Razgovor preko servera](#relay).",
  "**Camera at a tap**: on Android, **Appearance** → **Launcher icons** → **Camera** gives the Collection's camera an icon of its own among the phone's apps, and holding Erevos's icon down offers **Camera** too. See [Collection](#collection).":
    "**Kamera na jedan dodir**: na Androidu, **Izgled** → **Ikone u pokretaču** → **Kamera** daje kameri Zbirke vlastitu ikonu među aplikacijama telefona, a dugi pritisak na ikonu Erevosa također nudi **Kamera**. Pogledajte [Zbirka](#collection).",
  "**Chat options in SMS conversations**: a sliders button beside where you write opens **Chat options**, one tidy list in place of the rows of buttons: notifications, the chat's look, search, media and more.":
    "**Opcije razgovora u SMS razgovorima**: dugme s klizačima pored mjesta gdje pišete otvara **Opcije razgovora**, jednu urednu listu umjesto redova dugmadi: obavještenja, izgled razgovora, pretraga, mediji i drugo.",
  "**Chat options in Nostr, Matrix and XMPP chats**: the same sliders button beside where you write, with the contact's own options on Nostr; Nostr's **+** now holds what goes with a message.":
    "**Opcije razgovora u Nostr, Matrix i XMPP razgovorima**: isto dugme s klizačima pored mjesta gdje pišete, s opcijama samog kontakta na Nostru; Nostrov **+** sada sadrži ono što ide uz poruku.",
  "**The warning without Tor comes once**: that your internet address can be seen is now said once for a whole network, not in every chat; after that a quiet line above where you write says it, with **Through Tor for this chat**.":
    "**Upozorenje bez Tora dolazi jednom**: da se vaša internet adresa može vidjeti sada se kaže jednom za cijelu mrežu, ne u svakom razgovoru; nakon toga to kaže nenametljiv red iznad mjesta gdje pišete, uz **Preko Tora za ovaj razgovor**.",
  "**Start when the phone turns on**: after the phone restarts, Erevos now waits with a notice in the status bar and no longer stops without a word; a tap on the notice opens it for the password.":
    "**Pokreni kad se telefon uključi**: nakon ponovnog pokretanja telefona Erevos sada čeka s obavještenjem u statusnoj traci i više ne staje bez riječi; dodir na obavještenje otvara ga za lozinku.",
  "**Backup progress stays in sight**: **Make a backup** shows how far it is again when you leave the screen, or Erevos, and come back, and then how it ended.":
    "**Napredak rezervne kopije ostaje na vidiku**: **Napravi rezervnu kopiju** ponovo pokazuje dokle je stigla kad napustite ekran, ili Erevos, pa se vratite, a zatim i kako je završila.",
  "Unlocking with a fingerprint or face no longer turns itself off by mistake, when Erevos checked its key while the phone itself was locked or Android answered late.":
    "Otključavanje otiskom prsta ili licem više se ne isključuje samo greškom, kad je Erevos provjeravao svoj ključ dok je sam telefon bio zaključan ili je Android kasno odgovorio.",
  "**Near me** shows six pictures made from a key the two phones agree on then: a phone in between would show each of you different ones, and each phone gives its contact link only once its owner says the pictures are the same.":
    "**Pored mene** prikazuje šest slika napravljenih od ključa o kojem se dva telefona tada dogovore: telefon između njih svakome bi pokazao druge, a svaki telefon daje svoj link za kontakt tek kad njegov vlasnik kaže da su slike iste.",
  "**Speed dial with Erevos locked**: if you turn it on under **Phone** → **Settings**, holding 2 to 9 on the Phone opened without the password calls your speed dial numbers with Erevos locked too. See [Phone](#phone).":
    "**Brzo biranje kad je Erevos zaključan**: ako ga uključite pod **Telefon** → **Postavke**, držanje tipki od 2 do 9 u Telefonu otvorenom bez lozinke poziva vaše brojeve brzog biranja i kad je Erevos zaključan. Pogledajte [Telefon](#phone).",
  "**Release candidate**: Erevos Lite as it is meant to come out, with what Erevos 3.0.0-rc.1 brought to its chats and calls.":
    "**Kandidat za izdanje**: Erevos Lite kakav treba da izađe, s onim što je Erevos 3.0.0-rc.1 donio njegovim razgovorima i pozivima.",
  "**Search and Ways stay in sight**: on home, the search and the **Ways** line stay under the top bar while the list scrolls.":
    "**Pretraga i Putevi uvijek na vidiku**: na početnom ekranu pretraga i linija **Putevi** ostaju ispod gornje trake dok se lista pomiče.",
  "**Calls on a locked phone**: a call that rings with the phone locked or its screen off now turns the screen on by itself. See [Phone](#phone).":
    "**Pozivi na zaključanom telefonu**: poziv koji zvoni dok je telefon zaključan ili ekran ugašen sada sam pali ekran. Pogledajte [Telefon](#phone).",
  "From a code review made with the help of AI: a restore that cannot finish leaves the phone as it was, and the server keeps its lent places, held messages and deletions right, also after a power cut.":
    "Iz pregleda koda uz pomoć AI: vraćanje koje se ne može završiti ostavlja telefon kakav je bio, a server ispravno čuva posuđena mjesta, poruke za kasnije i brisanja, i nakon nestanka struje.",
  "**Erevos Lite**: Erevos's own chats, groups and calls, end-to-end encrypted, in an app of its own that asks for fewer permissions. It moves to Erevos or Erevos+, and they to it, under **Updates**. See [Updates](#updates).":
    "**Erevos Lite**: Erevosovi vlastiti razgovori, grupe i pozivi, šifrirani s kraja na kraj, u zasebnoj aplikaciji koja traži manje dozvola. Prelazi na Erevos ili Erevos+, i oni na njega, pod **Ažuriranja**. Pogledajte [Ažuriranja](#updates).",
  "**Short passwords**: a new password, or PIN of hidden chats, that is short is taken only after **Use it anyway**. See [Password lock](#lock).":
    "**Kratke lozinke**: nova lozinka, ili PIN skrivenih razgovora, koja je kratka prihvata se tek nakon **Ipak koristi**. Vidi [Zaključavanje lozinkom](#lock).",
  "Tries of a password or PIN count one at a time, also across a browser's tabs; a restore that cannot finish puts back what the phone had; a release's SHA256SUMS is signed.":
    "Pokušaji lozinke ili PIN-a broje se jedan po jedan, i između kartica preglednika; vraćanje koje se ne može završiti vraća ono što je telefon imao; SHA256SUMS svakog izdanja je potpisan.",
  "**Erevos, Erevos+ or Erevos Lite**: each is now an app of its own. Choose another under **Updates**, and this Erevos hands it everything here on the phone, encrypted: open the new one within a day and it brings your chats. See [Updates](#updates).":
    "**Erevos, Erevos+ ili Erevos Lite**: svaki je sada posebna aplikacija. Odaberite drugi u **Ažuriranjima**, i ovaj Erevos mu predaje sve ovdje na telefonu, šifrovano: otvorite novi u roku od jednog dana i donosi vaše razgovore. Pogledajte [Ažuriranja](#updates).",
  "**Make a backup** shows what it does and how far it is in its card, with a bar, and a notice says when the backup is done. See [Backups](#backup).":
    "**Napravi rezervnu kopiju** pokazuje u svojoj kartici šta radi i dokle je stigla, sa trakom, a obavještenje kaže kad je kopija napravljena. Vidite [Rezervne kopije](#backup).",
  "**MMS abroad**: while roaming, an MMS waits for a tap, **Fetch (may cost)**, unless you choose otherwise under **Settings** → **Phone and SMS** → **SMS** → **MMS**. See [SMS](#sms).":
    "**MMS u inostranstvu**: u romingu MMS čeka dodir, **Preuzmi (može koštati)**, osim ako drugačije izaberete u **Postavke** → **Telefon i SMS** → **SMS** → **MMS**. Vidite [SMS](#sms).",
  "**Quick texts**: hold the **+** in an SMS conversation down for short words you write often, and keep your own. See [SMS](#sms).":
    "**Brzi tekstovi**: držite **+** u SMS razgovoru za kratke riječi koje često pišete, i sačuvajte svoje. Vidite [SMS](#sms).",
  "**Reactions from iPhones**: a like or another reaction an iPhone or Google Messages sends by SMS, Liked “…”, shows as 👍 on your message instead of a message of its own. See [SMS](#sms).":
    "**Reakcije s iPhonea**: lajk ili druga reakcija koju iPhone ili Google Messages šalje SMS-om, Liked “…”, prikazuje se kao 👍 na vašoj poruci umjesto kao zasebna poruka. Vidite [SMS](#sms).",
  "**Videos by MMS**: **+** → **Record a video** in an SMS conversation records one in MMS quality with the phone's camera app, and a video that comes plays with a tap. See [SMS](#sms).":
    "**Video putem MMS-a**: **+** → **Snimi video** u SMS razgovoru snima video u MMS kvalitetu kamerom telefona, a video koji stigne pušta se dodirom. Vidite [SMS](#sms).",
  "**Answer an SMS from its notice**: **What an SMS says, on its notice**, under the SMS settings, off at first, shows who wrote and what on the notice while the space is open, with **Reply** and **Mark as read**. Locked, it says \"New message\" again. See [SMS](#sms).":
    "**Odgovor na SMS iz obavještenja**: **Šta SMS kaže, u svom obavještenju**, u postavkama SMS-a, u početku isključeno, pokazuje u obavještenju ko je pisao i šta dok je prostor otvoren, s **Odgovori** i **Označi kao pročitano**. Zaključano, opet kaže „Nova poruka“. Vidite [SMS](#sms).",
  "**What an SMS costs**: as you write a longer SMS, a line over the field says how many SMS it goes as, 70 letters each with Greek small letters, accents or an emoji, 160 without. **Without accents (cheaper)**, under the SMS settings, sends it without accents and Greek in capitals, as the old phones wrote it. See [SMS](#sms).":
    "**Koliko košta SMS**: kad pišete duži SMS, red iznad polja kaže u koliko SMS-ova ide, po 70 znakova s grčkim malim slovima, akcentima ili emojijem, inače 160. **Bez akcenata (jeftinije)**, u postavkama SMS-a, šalje ga bez akcenata, a grčki velikim slovima, kao stari telefoni. Vidite [SMS](#sms).",
  "**Who an unknown number is, without asking anyone**: the call screen of a number that is none of your contacts says its country, place and whether it is a mobile, from the number alone, and warns of spam from a list you download whole under **Phone** → **Settings** → **Spam list**, or numbers you reported in **Recents**. See [Phone](#phone).":
    "**Ko je nepoznat broj, bez pitanja ikoga**: ekran poziva broja koji nije među vašim kontaktima kaže državu, mjesto i da li je mobilni, samo iz broja, i upozorava na spam s liste koju preuzmete cijelu pod **Telefon** → **Postavke** → **Lista spama**, ili s brojeva koje ste prijavili u **Nedavnim**. Vidi [Telefon](#phone).",
  "**Video calls through your phone company**: where your SIM and network carry them (ViLTE), a video call that comes shows **Answer with video** and **Audio only**, a call can turn video on with **Video**, and **⋯** beside a typed number offers **Video call**. See [Phone](#phone).":
    "**Video pozivi preko operatera**: gdje ih SIM kartica i mreža podržavaju (ViLTE), dolazni video poziv prikazuje **Javi se s videom** i **Samo zvuk**, poziv uključuje video dugmetom **Video**, a **⋯** pored upisanog broja nudi **Video poziv**. Vidi [Telefon](#phone).",
  "**Who is in a conference call**: once calls are merged, the call screen lists each person, with **Separate** to talk with one alone and **End** to drop one, where your phone company allows it. See [Phone](#phone).":
    "**Ko je u konferenciji**: kad spojite pozive, ekran poziva prikazuje svaku osobu, s **Odvoji** da razgovarate samo s njom i **Prekini** da je izbacite, gdje operater to dozvoljava. Vidi [Telefon](#phone).",
  "**Speed dial**: hold a key from 2 to 9 on the Phone's empty keypad to call the number you put on it; an empty key offers to choose one, and **Phone** → **Settings** → **Speed dial** shows them all. Kept sealed in the space. See [Phone](#phone).":
    "**Brzo biranje**: zadržite tipku od 2 do 9 na praznoj tastaturi Telefona da pozovete broj koji ste joj dodijelili; prazna tipka vam da da izaberete broj, a **Telefon** → **Postavke** → **Brzo biranje** pokazuje sve. Čuvaju se šifrovano u prostoru. Vidi [Telefon](#phone).",
  "**Call settings in one place**: under **Phone** → **Settings**, **Call settings** opens Android's screens for call forwarding, call waiting, showing your number and the voicemail number, for each SIM, and asks your phone company with the usual codes where a phone has no such screen. See [Phone](#phone).":
    "**Postavke poziva na jednom mjestu**: pod **Telefon** → **Postavke**, **Postavke poziva** otvaraju Androidove ekrane za preusmjeravanje, poziv na čekanju, prikaz vašeg broja i broj govorne pošte, za svaku SIM karticu, i pitaju operatera uobičajenim kodovima gdje telefon nema takav ekran. Vidi [Telefon](#phone).",
  "**Voicemail at a hold**: on the Phone's keypad, hold **1** to call your voicemail. Where your phone company sends voicemails as recordings, **Voicemail** beside **Recents** lists them, to play, call back or delete. See [Phone](#phone).":
    "**Govorna pošta jednim držanjem**: na tastaturi Telefona drži **1** da pozoveš govornu poštu. Gdje operater šalje poruke kao snimke, **Govorna pošta** pored **Nedavni** ih prikazuje, da ih preslušaš, uzvratiš poziv ili obrišeš. Vidi [Telefon](#phone).",
  "**Emergency calls without delay**: an emergency number is called at once, never asking which SIM, and with Erevos locked, **Emergency call** on the password screen opens Android's emergency keypad. See [Phone](#phone).":
    "**Hitni pozivi bez čekanja**: hitni broj poziva se odmah, bez pitanja za SIM, a kad je Erevos zaključan, **Hitni poziv** na ekranu lozinke otvara Androidovu tastaturu za hitne pozive. Vidi [Telefon](#phone).",
  "**Gallery originals, deleted as chosen**: with **Delete the original from the gallery after importing** on, a photo picked from the phone's storage is now deleted from the gallery too, and when Android does not say which photo of the gallery it is, Erevos says so instead of keeping quiet. See [Collection](#collection).":
    "**Originali iz galerije brišu se kako ste izabrali**: s uključenim **Izbriši original iz galerije nakon uvoza**, fotografija iz memorije telefona sada se briše i iz galerije, a kad Android ne kaže koja je to fotografija galerije, Erevos to kaže umjesto da šuti. Vidi [Zbirka](#collection).",
  "**The services stay in sight**: on home, the services button stays under the top bar while the list scrolls, so another part is a tap away; the search and **Ways** scroll with the list. **Names** shows only on the **SMS** part, where it belongs.":
    "**Usluge ostaju na vidiku**: na početnom ekranu dugme usluga ostaje ispod gornje trake dok se lista pomiče, pa je drugi dio na dodir; pretraga i **Putevi** se pomiču s listom. **Imena** se vide samo u dijelu **SMS**, gdje i pripadaju.",
  "**New SMS on the SMS part**: on the **SMS** part of the chat list, the button at the bottom is **New SMS** and opens only a new SMS, also with Erevos's own chats on. See [SMS](#sms).":
    "**Novi SMS u dijelu SMS**: u dijelu **SMS** liste razgovora, dugme dolje je **Novi SMS** i otvara samo novi SMS, i kada su Erevosovi razgovori uključeni. Vidi [SMS](#sms).",
  "What's new": 'Šta je novo',
  'What each version changed': 'Šta je promijenila svaka verzija',
  'What each version of Erevos changed, the newest first.': 'Šta je promijenila svaka verzija Erevosa, najnovija prva.',
  'Not out yet': 'Još nije izašla',
  'This version': 'Ova verzija',
  'For you': 'Za vas',
  'Under the hood': 'Ispod haube',
  // Not out yet.
  "**How visible are you?** Three choices at the top of **Settings**, for who sees your phone's internet address, each space its own. **SPEED**: the servers and your contacts see it; Erevos no longer asks first, and calls with a contact go straight from phone to phone where they can, through the call server where they cannot, and work even with no server between you two. **ANONYMOUS**: only the server sees it, never your contacts; Erevos asks first, as before, and calls go through a server. **INVISIBLE**: no one sees it; everything goes through Tor, and there are no voice or video calls. A space is on SPEED until you choose another, unless Tor is on in it. See [How visible are you?](#direct).":
    '**Koliko ste vidljivi?** Tri izbora na vrhu **Postavki**, o tome ko vidi internet adresu vašeg telefona, svaki prostor sa svojim. **SPEED**: vide je serveri i vaši kontakti; Erevos više ne pita prije, a pozivi s kontaktom idu direktno s telefona na telefon gdje mogu, preko servera za pozive gdje ne mogu, i rade čak i kad između vas dvoje nema servera. **ANONYMOUS**: vidi je samo server, nikad vaši kontakti; Erevos pita prije, kao i do sada, a pozivi idu preko servera. **INVISIBLE**: niko je ne vidi; sve ide preko Tora, i nema glasovnih ni video poziva. Prostor je na SPEED dok ne izaberete drugi, osim ako je u njemu uključen Tor. Pogledajte [Koliko ste vidljivi?](#direct).',
  '**New chat says what works with no server**: messages, photos, files and voice messages, and calls too with **SPEED**.':
    '**Novi razgovor kaže šta radi bez servera**: poruke, fotografije, datoteke i glasovne poruke, a i pozivi sa **SPEED**.',
  "**Who came in with your invite**: when a contact takes the invite your phone sent them by itself, their chat says so, on this phone only, with **Take back** under that line.":
    "**Ko je ušao s vašom pozivnicom**: kad kontakt uzme pozivnicu koju mu je vaš telefon sam poslao, razgovor s tim kontaktom to kaže, samo na ovom telefonu, s **Povuci** ispod te linije.",
  "**Server, in plain words**: Erevos now says server, on every screen, in every notice and in the guide, for what keeps your messages, encrypted, until the other phone takes them. Nothing changes in how it works.":
    "**Server, jednostavnim riječima**: Erevos sada kaže server, na svakom ekranu, u svakom obavještenju i u vodiču, za ono što čuva vaše poruke, šifrirane, dok ih drugi telefon ne preuzme. U načinu rada ništa se ne mijenja.",
  "**Fingerprint or face, at once**: Android asks for the finger or face without a moment's wait, as its key is now kept in the phone's secure area, not in its separate security chip. Where it is on already, turn it off and on once under **Settings** → **Privacy and security** → **Lock and second password**. See [Password lock](#lock).":
    "**Otisak prsta ili lice, odmah**: Android traži prst ili lice bez čekanja, jer se ključ za ovo otključavanje sada čuva u sigurnom području telefona, a ne u njegovom zasebnom sigurnosnom čipu. Gdje je već uključeno, jednom ga isključite i ponovo uključite pod **Postavke** → **Privatnost i sigurnost** → **Zaključavanje i druga lozinka**. Vidite [Zaključavanje lozinkom](#lock).",
  "**Nostr on a computer, in the web app and on Sailfish OS**: texts there now go through the public Nostr servers too when your servers do not take them, as on Android, and with no server at all. There is no Tor there, so they go straight: the Nostr servers see that device's internet address. See [Through Nostr](#nostr).":
    "**Nostr na računaru, u web-aplikaciji i na Sailfish OS-u**: tekstovi tamo sada idu i preko javnih Nostr servera kad ih vaši serveri ne prime, kao na Androidu, i bez ikakvog servera. Tamo nema Tora, pa idu izravno: Nostr serveri vide IP adresu tog uređaja. Vidi [Preko Nostra](#nostr).",
  "**Backups into a cloud app's folder**: when Android does not let a backup into a folder, Erevos now says why, in plain words, and what to do. In a cloud app's folder, such as DAVx5's, the check after a backup waits for that app to send it to its server, and **Check again** under it looks once more. See [Backups](#backup).":
    "**Rezervne kopije u mapu aplikacije u oblaku**: kad Android ne dopusti kopiju u mapu, Erevos sada kaže zašto, jednostavnim riječima, i što učiniti. U mapi aplikacije u oblaku, kao što je DAVx5, provjera nakon kopije čeka da je ta aplikacija pošalje na svoj server, a **Provjeri ponovo** ispod nje pogleda još jednom. Vidi [Rezervne kopije](#backup).",
  "**A new first start**: five short steps, in each edition's own colours: your name if you like, what you will use, how visible you are, every permission in five groups with **Allow all**, a password with tips for a stronger one, and where automatic backups go. Then **They are beside me** or **They are far away** adds your first person. See [Getting started](#start).":
    "**Novo prvo pokretanje**: pet kratkih koraka, u bojama svakog izdanja: vaše ime ako želite, što ćete koristiti, koliko ste vidljivi, sve dozvole u pet grupa uz **Dopusti sve**, lozinka sa savjetima za jaču i kamo idu automatske rezervne kopije. Zatim **Uz mene je** ili **Daleko je** dodaje vašu prvu osobu. Vidi [Prvi koraci](#start).",
  "**LPHL's server, by itself**: a new phone needs no invite and no account: at the first start Erevos takes a place for your messages on LPHL's free server by itself, with nothing to type. Such a place is for your own chats, with limits for each day. Should the server let it go, after 100 days without your phone, or 30 days when it never came back after its first day, Erevos asks for it again by itself, and your chats stay as they were. See [Chat through a server](#relay).":
    "**LPHL-ov server, sam od sebe**: novom telefonu ne treba ni pozivnica ni račun: pri prvom pokretanju Erevos sam uzima mjesto za vaše poruke na besplatnom LPHL-ovom serveru, bez ikakvog tipkanja. Takvo mjesto je za vaše razgovore, s ograničenjima za svaki dan. Ako ga server pusti, nakon 100 dana bez vašeg telefona ili nakon 30 dana kad se nakon prvog dana nikad nije vratio, Erevos ga sam ponovno traži, a vaši razgovori ostaju kakvi su bili. Vidi [Razgovor preko servera](#relay).",
  "**Automatic backups only to a server**: they can now go to a WebDAV server with no folder on this device; a folder there is optional, for one more copy close at hand. See [Backups](#backup).":
    "**Automatske rezervne kopije samo na server**: sada mogu ići na WebDAV server bez foldera na ovom uređaju; folder ovdje nije obavezan, za još jednu kopiju pri ruci. Vidi [Rezervne kopije](#backup).",
  "**Automatic backups to Google Drive**: on Android they can now go to your Google Drive too, encrypted, into a folder named Erevos, or only there. Erevos first says what Google then knows: your account, when a backup comes and how big it is. Sign in with Google under **Backups** or at the first start; **Restore from Google Drive** brings one back. See [Backups](#backup).":
    "**Automatske rezervne kopije na Google Drive**: na Androidu sada mogu ići i na vaš Google Drive, šifrirane, u folder po imenu Erevos, ili samo tamo. Erevos prvo kaže što Google tada zna: vaš račun, kad stigne rezervna kopija i koliko je velika. Prijavite se na Google u **Rezervne kopije** ili pri prvom pokretanju; **Vrati s Google Drivea** vraća jednu. Pogledajte [Rezervne kopije](#backup).",
  "A call with no server between the two phones is set up through Nostr, end-to-end encrypted like a message, and the public helper servers are asked only when LPHL's does not answer.":
    "Poziv bez servera između dva telefona uspostavlja se preko Nostra, šifriran s kraja na kraj kao poruka, a javni pomoćni serveri se pitaju samo kad onaj od LPHL-a ne odgovori.",
  // 7.0.0-rc.7
  // 7.0.0-rc.6
  // 7.0.0-rc.5
  // 7.0.0-rc.4
  // 7.0.0-rc.3
  // 7.0.0-rc.2
  // 7.0.0-rc.1
  // 6.0.0-rc.2
  // 6.0.0-rc.1
  // 4.0.0-rc.10
  // 4.0.0-rc.9
  // 4.0.0-rc.8
  // 4.0.0-rc.7
  // 4.0.0-rc.6
  // 4.0.0-rc.5
  // 4.0.0-rc.4
  // 4.0.0-rc.3
  // 4.0.0-rc.2
  // 4.0.0-rc.1
  // 3.4.2
  // 3.4.1
  // 3.4.0
  // 3.3.2
  // 3.3.1
  // 3.3.0
  // 3.2.1
  // 3.2.0
  // 3.1.2
  // 3.1.1
  // 3.1.0
  // 3.0.0
  // 2.0.3
  // 2.0.2
  // 2.0.1
  // 2.0.0
  // 0.1.16
  // 0.1.14
  // 0.1.12
  // 0.1.11
  // 0.1.10
  // 0.1.8
  // 0.1.7 to 0.1.2
  "**Photos and videos, as in a gallery**: in the Collection, **Camera** is Erevos's own, so no other app sees what it takes, **From the gallery** brings in many photos and videos at once, HEIC and AVIF photos show among the photos, **Edit** turns and cuts a photo into a new one, and **Information** says whether a photo or video says where it was taken. A photo that leaves Erevos goes without where and when it was taken, unless you choose otherwise. See [Collection](#collection).": "**Fotografije i video kao u galeriji**: u Zbirci, **Kamera** je Erevosova vlastita, pa nijedna druga aplikacija ne vidi šta snimi, **Iz galerije** unosi mnogo fotografija i video snimaka odjednom, HEIC i AVIF fotografije se vide među fotografijama, **Uredi** okreće i reže fotografiju u novu, a **Informacije** kažu da li fotografija ili video govori gdje je snimljen. Fotografija koja napušta Erevos izlazi bez mjesta i vremena snimanja, osim ako izaberete drugačije. Pogledajte [Zbirka](#collection).",
  "**Night photos and HDR**: Erevos's own camera now uses the night, HDR and portrait modes of the phone's maker where the phone has them, as on a Pixel, made on the phone itself. A tap focuses there, **Darker** and **Brighter** set the light, the zoom buttons go to the wide lens, 2× and 5×, and videos can be HDR. A photo is never written anywhere, not even for a moment. See [Collection](#collection).": "**Noćne fotografije i HDR**: Erevosova vlastita kamera sada koristi noćni, HDR i portretni način proizvođača telefona gdje ih telefon ima, kao na Pixelu, rađene na samom telefonu. Dodir izoštrava tamo, **Tamnije** i **Svjetlije** podešavaju svjetlo, dugmad za zum prelaze na široki objektiv, 2× i 5×, a video može biti HDR. Fotografija se nikad nigdje ne zapisuje, ni na trenutak. Vidi [Zbirka](#collection).",
};
