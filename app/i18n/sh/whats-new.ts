// The Serbo-Croatian of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/sh/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Šta je novo',
  'What each version changed': 'Šta je promijenila svaka verzija',
  'What each version of Erevos changed, the newest first.': 'Šta je promijenila svaka verzija Erevosa, najnovija prva.',
  'Not out yet': 'Još nije izašla',
  'This version': 'Ova verzija',
  'For you': 'Za vas',
  'Under the hood': 'Ispod haube',
  // Not out yet.
  '**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).':
    '**Šta je novo, u dva dijela**: svaka verzija prvo kaže šta se mijenja za vas, a zatim šta se promijenilo ispod haube: ispravke, brzina, baterija i sigurnost iznutra. Vidi [Ažuriranja](#updates).',
  '**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.':
    '**SMS-ovi kontakta više ne ostaju brojani kao novi**: otvaranje njegovog četa čita sve, i ranije, ne samo one koji se vide.',
  '**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).':
    '**Poruka više ne čeka kad Tor ne stigne do releja**: s Torom za poruke odmah ide direktno, kako kažu postavke Tora. Vidi [Preko Tora](#tor).',
  '**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).':
    '**Obavijesti u pozadini više ne prestaju nakon promjene mreže**: kad bi veza čekanja na relayu umrla usput (s Wi-Fi na mobilne podatke, ponovno pokretanje relaya), Erevos je relay do kraja rada smatrao starim, koji ne zna čekati: poruke kontakata stizale su do deset minuta kasnije, a skriveni razgovori, zatvoreni prostori i skrivena zvonjenja nisu javljali ništa do ponovnog pokretanja Erevosa. Vidi [Razgovor preko relaya](#relay).',
  '**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).':
    '**Poziv koji je odmah prekinut više ne zvoni**: kad bi prekid stigao u istom pogledu kao i poziv, telefon je zvonio 45 sekundi za poziv u kojem nije bilo nikoga; isto i za grupni poziv koji je onaj tko ga je započeo odmah napustio. Vidi [Razgovor preko relaya](#relay).',
  '**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).':
    '**Skriveni poziv zvoni jednom**: mjesto s Primanje dok su zatvoreni i redom za zvonjenje zvonilo je dvaput za jedan poziv, a poziv primljen dok su skriveni razgovori bili otvoreni zvonio je ponovno kad su se zatvorili. Vidi [Skriveni razgovori](#hidden).',
  '**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).':
    '**Kontaktna poveznica člana više ne javlja Nova poruka**: odgovor na zahtjev iz grupe samo dodaje kontakt, bez obavijesti. Vidi [Grupni razgovori](#groups).',
  '**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).':
    '**Obavijest o rođendanu i dolazni poziv telefona više ne zamjenjuju jedno drugo**: imali su isti broj obavijesti. Vidi [Kontakti](#contacts).',
  '**A closed space tells of its contacts\' messages too**: since each contact writes to a queue of their own, a space that says a message came while another is open told only of group messages and first messages from new contacts. It now asks about its contacts\' queues too, up to 64. See [Chat through a relay](#relay).':
    '**Zatvoren prostor javlja i poruke svojih kontakata**: pošto svaki kontakt piše u svoj red, prostor koji javlja da je stigla poruka dok je otvoren drugi javljao je samo poruke grupa i prve poruke novih kontakata. Sada pita i za redove svojih kontakata, do 64. Pogledajte [Razgovor preko relaya](#relay).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**Korisnički vodič je na svim jezicima aplikacije**: prikazuje se na onom koji ste izabrali i naziva dugmad kako ih aplikacija prikazuje. Vidi [Jezik](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Lokacija pronalazi gdje ste, i u zatvorenom**: telefon traži preko satelita i preko svoje mreže odjednom, list kaže da traži, a kad ništa ne pronađe kaže zašto, s Pokušajte ponovo. Pogledajte [Razgovor preko relaya](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**Ikona web-aplikacije broji nepročitano**: na iPhoneu, s uključenim obavijestima za prostor, ikona Erevosa na početnom ekranu pokazuje koliko poruka nije pročitano, nikad iz skrivenog razgovora, osim ako to isključite u „Postavke → Obavijesti → Broj na ikoni“. Vidi [Na iPhoneu](#iphone).',
  "**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).":
    "**Obavijesti za svaki razgovor**: na Androidu utišajte razgovor ili grupu na 8 sati, sedmicu ili zauvijek, i dajte njegovim porukama i pozivima vlastiti zvuk, ili nikakav. Pogledajte [Razgovor preko relaya](#relay).",
  "**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden).":
    "**Razgovor zaključan vlastitim PIN-om ostaje zaključan**: kad bi Erevos kontakta započeo novi razgovor, što radi otprilike jednom mjesečno, razgovor bi izgubio svoj PIN, a javna grupa u koju si se ponovo pridružio izgubila bi svoj. Vidi [Skriveni razgovori](#hidden).",
  "**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay).":
    "**Ikona Erevosa čuva broj nepročitanih poruka, na Androidu**: kad napustite Erevos s nepročitanim porukama, obavijest bez zvuka čuva koliko ih je dok ih ne pročitate, a pokretač je prikazuje na ikoni, kao broj ili tačku. Postavke → Obavijesti → Broj na ikoni to isključuje. Pogledajte [Razgovor preko relaya](#relay).",
  "**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone).":
    '**Obavijesti web-aplikacije, pouzdanije**: nema više „Nova poruka“ preko Erevosa dok je otvoren, a push zadržan dok telefon nije bio na mreži više ne broji poruke koje ste već pročitali (oboje kad je vaš relay ažuriran), svaka obavijest se oglašava zvukom u Chromeu, Firefoxu i Edgeu, same se vraćaju kad preglednik promijeni svoju push adresu, a „Obavijesti dok je Erevos zatvoren“ kažu kad ih preglednik blokira ili kad vašem relayu još nije javljeno da su isključene. Vidi [Na iPhoneu](#iphone).',
  "**Calls ring in the web app, on the computer and on Sailfish OS**: a call that comes while Erevos is open now rings, where only its screen showed, and vibrates where the phone can. On an iPhone it rings once you have touched Erevos, and not on silent. See [On an iPhone](#iphone).":
    "**Pozivi zvone u web-aplikaciji, na računaru i na Sailfish OS-u**: poziv koji stigne dok je Erevos otvoren sada zvoni, gdje se prije pokazivao samo njegov ekran, i vibrira gdje telefon može. Na iPhoneu zvoni kad ste dotakli Erevos, i ne u nečujnom načinu. Vidi [Na iPhoneu](#iphone).",
  '**Erevos on a computer keeps running with its window closed**: in the system tray (on a Mac, in the Dock) it goes on receiving, a call rings and brings the window back, and a notification says how many messages are not read, never who or what. Turn it off under Settings → Notifications → In the background. See [On a computer](#desktop).':
    '**Erevos na računaru radi i dalje sa zatvorenim prozorom**: u sistemskoj traci (na Macu, u Docku) i dalje prima, poziv zvoni i vraća prozor, a obavijest kaže koliko poruka nije pročitano, nikad od koga ni šta. Isključuje se pod Postavke → Obavijesti → U pozadini. Vidi [Na računaru](#desktop).',
  "**Erevos on Sailfish OS tells of messages and calls while it is closed**: while it is out of sight or closed, a small helper waits at the relay for the open space, a notification says how many messages came, never who or what, and a call rings with the phone's ringtone. See [On Sailfish OS](#sailfish).":
    "**Erevos na Sailfish OS-u javlja poruke i pozive dok je zatvoren**: dok nije na ekranu ili je zatvoren, mali pomoćnik čeka na relayu za otvoreni prostor, obavještenje kaže koliko je poruka stiglo, nikad od koga ni šta, a poziv zvoni melodijom telefona. Vidi [Na Sailfish OS-u](#sailfish).",
  "**The relay's pushes to the web app, sturdier**: a push the push service could not take just then is sent again, a call goes before the messages waiting their turn, and whoever runs the relay can allow another push service. Your relay needs an update for it.":
    '**Push od relaya do web-aplikacije, otporniji**: push koji push servis u tom trenutku nije mogao primiti šalje se ponovo, poziv ide prije poruka koje čekaju na red, a onaj ko vodi relay može dozvoliti drugi push servis. Za to je vašem relayu potrebno ažuriranje.',
  "**Permissions checks every notice Erevos uses**: on Android, the message notice without sound or with a chat's own sound, and the reminders', turned off, now show there, with a button to each. See [Chat through a relay](#relay).":
    '**Dozvole provjeravaju svaku obavijest koju Erevos koristi**: na Androidu se tamo sada prikazuju, kad su isključene, i obavijest o porukama bez zvuka ili s vlastitim zvukom razgovora, i obavijest o podsjetnicima, s dugmetom za svaku. Pogledajte [Razgovor preko relaya](#relay).',
  '**Hidden chats say what their switches need**: Say when a message comes and Ring calls when closed say so when Settings → Notifications → In the background lets them do nothing. See [Hidden chats](#hidden).':
    '**Skriveni razgovori kažu šta je potrebno njihovim prekidačima**: „Javi kad stigne poruka“ i „Zvonjava poziva kad su zatvoreni“ to kažu kad im „Postavke → Obavijesti → U pozadini“ ne dozvoljava da išta rade. Pogledajte [Skriveni razgovori](#hidden).',
  "**Truer words about notices**: Settings and the guide give the notices' own words and say what each one needs. See [Chat through a relay](#relay).":
    '**Tačnije riječi o obavijestima**: Postavke i vodič navode vlastite riječi obavijesti i kažu šta je kojoj potrebno. Pogledajte [Razgovor preko relaya](#relay).',
  "**Calls ring as they should**: with Do Not Disturb only when their notice may break through, with a phone's clock off too once the relay is updated, and to the end on Android 7 and 8; a second call is told busy, and a ring stops only for its own call. See [Chat through a relay](#relay).":
    '**Pozivi zvone kako treba**: uz Ne ometaj samo kad njihova obavijest smije proći kroz njega, i kad sat telefona nije tačan, nakon što se relay ažurira, i do kraja na Androidu 7 i 8; drugi poziv dobija odgovor da je zauzeto, a zvonjenje prestaje samo zbog svog poziva. Pogledajte [Razgovor preko relaya](#relay).',
  '**Hidden calls**: one turned down no longer leaves Erevos over the lock screen, one that comes while the password screen shows comes over it, and none rings twice. See [Hidden chats](#hidden).':
    '**Skriveni pozivi**: odbijeni poziv više ne ostavlja Erevos preko zaključanog ekrana, onaj koji stigne dok je prikazan ekran za lozinku prikazuje se preko njega, i nijedan ne zvoni dvaput. Pogledajte [Skriveni razgovori](#hidden).',
  '**Notices come again at once after a change of network**, and receiving starts again as Erevos shows when Android refused it. See [Chat through a relay](#relay).':
    '**Obavijesti ponovo stižu odmah nakon promjene mreže**, a primanje se ponovo pokreće kad se Erevos prikaže, ako ga je Android odbio. Pogledajte [Razgovor preko relaya](#relay).',
  "**Hidden chats' notices tell each message once**: what came since a place last looked is told as it closes, a call that rang is not told again as a message, and a place whose queue the relay lost keeps its switch on. See [Hidden chats](#hidden).":
    '**Obavijesti skrivenih razgovora javljaju svaku poruku jednom**: ono što je stiglo otkako je mjesto zadnji put provjerilo javlja se kad se zatvori, poziv koji je zvonio ne javlja se ponovo kao poruka, a mjesto čiji je red relay izgubio zadržava uključen prekidač. Pogledajte [Skriveni razgovori](#hidden).',
  '**Hidden chats close while Erevos is away**, after 30 seconds, so a call to them meanwhile rings with their PIN to answer. See [Hidden chats](#hidden).':
    '**Skriveni razgovori se zatvaraju dok je Erevos van ekrana**, nakon 30 sekundi, pa poziv za njih u međuvremenu zvoni, a javljate se njihovim PIN-om. Pogledajte [Skriveni razgovori](#hidden).',
  '**A voice message counts once**, on its last part, also when it goes again whole.':
    '**Glasovna poruka se broji jednom**, na svom zadnjem dijelu, i kad ponovo ide cijela.',
  '**The number on the icon counts only what is still there**: a message deleted for everyone, or read on a linked computer, no longer counts. See [Chat through a relay](#relay).':
    '**Broj na ikoni broji samo ono što je još tamo**: poruka obrisana za sve, ili pročitana na povezanom računaru, više se ne broji. Pogledajte [Razgovor preko relaya](#relay).',
  '**Messages sent for later** tell of themselves only while their space is open, without sound if sent so.':
    '**Poruke zakazane za kasnije** javljaju o sebi samo dok je njihov prostor otvoren, bez zvuka ako su tako poslane.',
  '**SMS**: one to the chat on screen only sounds there, they are marked read only while their screen shows, and Android names their notices SMS. See [SMS](#sms).':
    '**SMS**: onaj za razgovor na ekranu oglašava se samo tamo, označavaju se kao pročitani samo dok je njihov ekran prikazan, a Android njihove obavijesti naziva SMS. Pogledajte [SMS](#sms).',
  "**Reminders**: one seen in Chat with myself goes from the notice, a hidden place's go with a new PIN, and birthdays come at 9:00. See [Getting started](#start).":
    '**Podsjetnici**: onaj viđen u Razgovoru sa sobom nestaje iz obavijesti, podsjetnici skrivenog mjesta nestaju s novim PIN-om, a rođendani stižu u 9:00. Pogledajte [Prvi koraci](#start).',
  '**Nostr reads as soon as Tor is ready.** See [Through Nostr](#nostr).':
    '**Nostr čita čim je Tor spreman.** Pogledajte [Preko Nostra](#nostr).',
  "**Erevos's notices show its mark** in the status bar.":
    '**Obavijesti Erevosa prikazuju njegov znak** u statusnoj traci.',
  '**Notices are asked for with receiving off too**, when Say a message came is on.':
    '**Dozvola za obavijesti traži se i s isključenim primanjem**, kad je uključeno „Javi da je stigla poruka“.',
  "**Photos open on the whole screen**: tap one to see it edge to edge, zoom in with two fingers or a double tap, and tap again to hide or show what is around it; big photos open as small ones do. Erevos also turns with the phone while the phone's Auto-rotate is on, and a photo shown on its own even when it is off. See [Chat through a relay](#relay).":
    '**Fotografije se otvaraju preko cijelog ekrana**: dodirnite jednu da je vidite od ivice do ivice, uvećajte je s dva prsta ili dvostrukim dodirom, i dodirnite ponovo da sakrijete ili prikažete ono što je oko nje; velike fotografije se otvaraju kao male. Erevos se i okreće s telefonom dok je na telefonu uključeno Automatsko okretanje, a fotografija prikazana sama i kad je isključeno. Vidi [Razgovor preko relaya](#relay).',
  "**Matrix accounts in Erevos**: sign a space in to Matrix and chat with people who use Element or another Matrix app, end-to-end encrypted, under Settings → Relay and networks → Matrix. These chats are not anonymous, and say so: the Matrix server sees who talks with whom. Text, photos and files. See [Matrix](#matrix).":
    "**Matrix računi u Erevosu**: prijavite prostor na Matrix i razgovarajte s ljudima koji koriste Element ili drugu Matrix aplikaciju, šifrovano s kraja na kraj, u Postavke → Relay i mreže → Matrix. Ovi razgovori nisu anonimni, i to kažu: Matrix server vidi ko s kim razgovara. Tekst, fotografije i datoteke. Pogledajte [Matrix](#matrix).",
  "**Every network's chats on the home screen**: once you sign in to Matrix, its chats are in the list with the Erevos chats and the SMS, newest first, each marked Matrix, and the Matrix chip shows them alone, as SMS and Erevos do. See [Matrix](#matrix).":
    "**Razgovori svih mreža na početnom ekranu**: kad se prijavite na Matrix, njegovi razgovori su na listi s Erevos razgovorima i SMS porukama, najnoviji prvi, svaki označen Matrix, a dugme Matrix pokazuje samo njih, kao SMS i Erevos. Pogledajte [Matrix](#matrix).",
  '**Test versions before a release**: Erevos reads a version such as 4.0.0-rc.1, a test version that comes before 4.0.0, when it looks for updates, tells of a new version and shows what is new. See [Updates](#updates).':
    '**Probne verzije prije izdanja**: Erevos čita verziju poput 4.0.0-rc.1, probnu verziju koja dolazi prije 4.0.0, kad traži ažuriranja, javlja novu verziju i pokazuje šta je novo. Vidi [Ažuriranja](#updates).',
  "**Check Matrix devices by emoji**: in a chat with one person on Matrix, Check by emoji shows you both seven pictures; if they match, nobody sits in between, and Element sees the check too. Check this device with another of yours makes your own Element trust Erevos. See [Matrix](#matrix).":
    "**Provjera Matrix uređaja emojijima**: u razgovoru s jednom osobom na Matrixu, Provjera emojijima vama oboma pokazuje sedam slika; ako se poklapaju, niko nije u sredini, a i Element vidi provjeru. Provjerite ovaj uređaj drugim svojim čini da vaš Element vjeruje Erevosu. Pogledajte [Matrix](#matrix).",
  "**Automatic backups to your own server too**: on Android, each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. Off until you add one. The server gets random bytes under a random name and cannot open them; it still sees your account, your address and when. See [Backups](#backup).":
    "**Automatske rezervne kopije i na vaš vlastiti server**: na Androidu svaka automatska rezervna kopija može ići i u folder na serveru koji izaberete, kao vaš Nextcloud, preko WebDAV-a. Isključeno dok ne dodate server. Server dobija nasumične bajtove pod nasumičnim imenom i ne može ih otvoriti; ipak vidi vaš nalog, vašu adresu i kada. Pogledajte [Rezervne kopije](#backup).",
  "**Matrix Security Key and key backup**: enter the Security Key Element made, under Settings → Relay and networks → Matrix, and earlier messages open, new keys are backed up, and your other devices trust Erevos. An account with none can set one up there. See [Matrix](#matrix).":
    "**Matrix sigurnosni ključ i rezervna kopija ključeva**: upišite sigurnosni ključ koji je napravio Element, u Postavke → Relay i mreže → Matrix, i ranije poruke se otvaraju, novi ključevi se čuvaju, a vaši drugi uređaji vjeruju Erevosu. Račun bez njega tamo može napraviti jedan. Pogledajte [Matrix](#matrix).",
  "**Matrix through Tor**: on Android, a space's Matrix account follows its choice under Settings → Relay and networks → Tor, so the Matrix server no longer sees where you are; the Matrix screen says when it goes through Tor. See [Matrix](#matrix).":
    "**Matrix preko Tora**: na Androidu, Matrix račun prostora slijedi njegov izbor pod Postavke → Relay i mreže → Tor, pa Matrix server više ne vidi gdje ste; Matrix ekran kaže kada ide preko Tora. Pogledajte [Matrix](#matrix).",
  "**XMPP accounts in Erevos**: sign a space in to XMPP, under Settings → Relay and networks → XMPP, and chat with people who use Conversations, Monal, Gajim, Dino or another XMPP app, encrypted with OMEMO. These chats are not anonymous, and say so: the XMPP server sees who talks with whom. Text with delivery and read marks, photos and files, in the home list under an XMPP chip of its own, and through Tor on Android as you chose. See [XMPP](#xmpp).":
    "**XMPP računi u Erevosu**: prijavite prostor na XMPP, pod Postavke → Relay i mreže → XMPP, i razgovarajte s ljudima koji koriste Conversations, Monal, Gajim, Dino ili drugu XMPP aplikaciju, šifrovano OMEMO-om. Ovi razgovori nisu anonimni i to kažu: XMPP server vidi ko s kim razgovara. Tekst s oznakama isporuke i čitanja, fotografije i datoteke, na listi početnog ekrana pod vlastitim XMPP dugmetom, i preko Tora na Androidu kako ste izabrali. Pogledajte [XMPP](#xmpp).",
  "**Voice and video calls with people on XMPP**: the two tiles at the top of an XMPP chat call the person, and their calls ring on the same screen as Erevos's own, with apps that call as Conversations does. The call goes through your call relay or the XMPP server's, so they do not learn your address; the key that proves it passes through the XMPP servers, which could put themselves in between. See [XMPP](#xmpp).":
    "**Glasovni i video pozivi s ljudima na XMPP-u**: dvije pločice na vrhu XMPP razgovora zovu osobu, a njeni pozivi zvone na istom ekranu kao Erevosovi, s aplikacijama koje zovu kao Conversations. Poziv ide preko vašeg relaya za pozive ili onog XMPP servera, pa ona ne saznaje vašu adresu; ključ koji ga dokazuje ide preko XMPP servera, koji bi se mogli postaviti između. Pogledajte [XMPP](#xmpp).",
  "**Voice and video calls with people on Matrix**: on Android, the two tiles at the top of a Matrix chat call with Element Call, the call app of Element and Element X, which opens inside Erevos in a window of its own, and their calls ring here as Erevos's own do. Sound and picture are end-to-end encrypted and go through the media server your Matrix server names, never through Tor. See [Matrix](#matrix).":
    "**Glasovni i video pozivi s ljudima na Matrixu**: na Androidu, dvije pločice na vrhu Matrix razgovora zovu preko Element Calla, aplikacije za pozive Elementa i Elementa X, koja se otvara u Erevosu u svom prozoru, a njihovi pozivi ovdje zvone kao Erevosovi. Zvuk i slika su šifrovani s kraja na kraj i idu preko medijskog servera koji navodi vaš Matrix server, nikad preko Tora. Pogledajte [Matrix](#matrix).",
  "**Voice and video calls with people on Matrix, in the web app and on a computer**: the two tiles at the top of a Matrix chat call with Element Call there too, as on Android, over the app; its back arrow makes it small in a corner, so you can keep using Erevos during the call. Element Call runs apart from Erevos and can read nothing of it. See [Matrix](#matrix).":
    "**Glasovni i video pozivi s ljudima na Matrixu, u web-aplikaciji i na računaru**: dvije pločice na vrhu Matrix razgovora i tamo zovu preko Element Calla, kao na Androidu, preko aplikacije; strelica nazad u njegovom prozoru smanjuje ga u ugao, pa možete dalje koristiti Erevos tokom poziva. Element Call radi odvojeno od Erevosa i ne može pročitati ništa od njega. Vidi [Matrix](#matrix).",
  "**Chats with people on other Nostr apps**: give a space a Nostr key of its own, under Settings → Relay and networks → Nostr chats, and chat with people who use Damus, Amethyst, Primal, 0xchat or another Nostr app, one to one or in groups, encrypted as NIP-17 asks: the relays see whom a message is for, not who wrote it. These chats are not anonymous, and say so: your key is the same to everyone you write to. Text, photos, files and reactions, in the home list under a Nostr chip of its own, and through Tor on Android as you chose. See [Chats with other Nostr apps](#nostr-chats).":
    "**Razgovori s ljudima u drugim Nostr aplikacijama**: dajte prostoru vlastiti Nostr ključ, pod Postavke → Relay i mreže → Nostr razgovori, i razgovarajte s ljudima koji koriste Damus, Amethyst, Primal, 0xchat ili drugu Nostr aplikaciju, u četiri oka ili u grupama, šifrirano kako traži NIP-17: relayi vide kome je poruka namijenjena, ne i tko ju je napisao. Ovi razgovori nisu anonimni, i to kažu: vaš ključ isti je za sve kojima pišete. Tekst, fotografije, datoteke i reakcije, na popisu početnog ekrana pod vlastitim Nostr dugmetom, i preko Tora na Androidu kako ste odabrali. Pogledajte [Razgovori s drugim Nostr aplikacijama](#nostr-chats).",
  "**Notices for Matrix, XMPP and Nostr messages**: a message in a chat on Matrix, XMPP or Nostr shows a notice and counts in the number on Erevos's icon, as in Erevos's own chats. On Android, Notifications at the bottom of such a chat mutes it or gives it a sound of its own, and an XMPP or Matrix call rings with its chat's ringtone. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats).":
    "**Obavijesti za poruke na Matrixu, XMPP-u i Nostru**: poruka u razgovoru na Matrixu, XMPP-u ili Nostru prikazuje obavijest i broji se u broju na ikoni Erevosa, kao u Erevosovim vlastitim razgovorima. Na Androidu, Obavijesti na dnu takvog razgovora ga utišavaju ili mu daju vlastiti zvuk, a XMPP ili Matrix poziv zvoni melodijom svog razgovora. Pogledajte [Matrix](#matrix), [XMPP](#xmpp) i [Razgovori s drugim Nostr aplikacijama](#nostr-chats).",
  "**A closed space tells of Matrix messages**: on Android, Say a message came under While this space is closed, on the Matrix screen, has a closed space say \"New message\" when something comes on Matrix while another space is open, never what, from whom or in which chat. Off until you choose it. The Matrix server then tells the space's relay of each message, with no words in it: it learns the relay's address, and the relay when messages come. See [Matrix](#matrix).":
    "**Zatvoren prostor javlja poruke s Matrixa**: na Androidu, „Javi da je stigla poruka“ pod „Dok je ovaj prostor zatvoren“, na ekranu Matrixa, čini da zatvoren prostor kaže „Nova poruka“ kad nešto stigne na Matrixu dok je drugi prostor otvoren, nikad šta, od koga ni u kojem razgovoru. Isključeno dok to ne izabereš. Matrix server tada javlja relayu prostora svaku poruku, bez ijedne njene riječi: saznaje adresu relaya, a relay kad stižu poruke. Vidi [Matrix](#matrix).",
  "**Made with others' open source**: About Erevos, and the guide, now name the open-source projects Erevos is built on, with their makers and their licences. See [What Erevos is](#about).":
    "**Napravljeno uz otvoreni kod drugih**: U O Erevosu i u vodiču sada su navedeni projekti otvorenog koda na kojima je Erevos izgrađen, s njihovim autorima i licencama. Vidi [Šta je Erevos](#about).",
  "**Groups on XMPP**: under Settings → Relay and networks → XMPP, make a private group with your contacts, encrypted with OMEMO for every member as Conversations' private groups are, or join a group by its address, and answer invitations to groups. A group that is not private, a channel, is not encrypted, and says so. Your groups follow your account's other XMPP apps, and a channel tells only of messages that name you. See [XMPP](#xmpp).":
    "**Grupe na XMPP-u**: pod Postavke → Relay i mreže → XMPP, napravite privatnu grupu sa svojim kontaktima, šifrovanu OMEMO-om za svakog člana kao privatne grupe u Conversationsu, ili se pridružite grupi preko njene adrese, i odgovorite na pozive u grupe. Grupa koja nije privatna, kanal, nije šifrovana i to kaže. Vaše grupe prate ostale XMPP aplikacije vašeg računa, a kanal javlja samo za poruke koje vas spominju. Pogledajte [XMPP](#xmpp).",
  "**More in Matrix chats**: hold a message to react to it, reply to it, copy it and, if it is yours, edit it or delete it for everyone. Load earlier messages brings in older ones, and the microphone under the message box sends voice messages that Element plays too. Reactions are not encrypted, as Element sends them. See [Matrix](#matrix).":
    "**Više u Matrix razgovorima**: zadržite poruku da joj reagirate, odgovorite, kopirate je i, ako je vaša, uredite je ili obrišete za sve. „Učitaj ranije poruke“ donosi starije, a mikrofon ispod polja za poruku šalje glasovne poruke koje i Element pušta. Reakcije nisu šifrovane, kako ih šalje Element. Pogledajte [Matrix](#matrix).",
  "**Video added to an XMPP call**: in a voice call with someone on XMPP, either of you can turn on video with Add video; the other is asked first and can say Not now. It works with apps that add video to a call as Conversations does. See [XMPP](#xmpp).":
    "**Video dodan XMPP pozivu**: u glasovnom pozivu s nekim na XMPP-u svako od vas može uključiti video s „Dodaj video“; druga osoba se prvo pita i može reći „Ne sada“. Radi s aplikacijama koje dodaju video pozivu kao Conversations. Pogledajte [XMPP](#xmpp).",
  "**Voice messages and replies in Nostr chats**: hold the microphone under the message box to send a voice message, which plays with Play; hold a message to reply to it, and the answer shows the message it is to, here and in other Nostr apps. See [Chats with other Nostr apps](#nostr-chats).":
    "**Glasovne poruke i odgovori u Nostr razgovorima**: zadržite mikrofon ispod polja za poruku da pošaljete glasovnu poruku, koja se pušta s „Pusti“; zadržite poruku da joj odgovorite, a odgovor prikazuje poruku na koju odgovara, ovdje i u drugim Nostr aplikacijama. Pogledajte [Razgovori s drugim Nostr aplikacijama](#nostr-chats).",
  "**OMEMO 2 in XMPP chats**: a message to someone whose app speaks OMEMO 2, as Kaidan does, now goes with OMEMO 2 to that app and with OMEMO 0.3 to their others, as before. The XMPP screen shows this device's key both ways, to compare with what each app shows. See [XMPP](#xmpp).":
    "**OMEMO 2 u XMPP razgovorima**: poruka nekome čija aplikacija govori OMEMO 2, kao Kaidan, sada ide s OMEMO 2 toj aplikaciji, a s OMEMO 0.3 njihovim ostalim aplikacijama, kao i prije. XMPP ekran pokazuje ključ ovog uređaja na oba načina, za poređenje s onim što pokazuje svaka aplikacija. Pogledajte [XMPP](#xmpp).",
  "**Hidden chats can have their own Matrix, XMPP and Nostr accounts**: under the list of a place of hidden chats, Matrix, XMPP and Nostr open an account of that place alone, apart from the space's, kept encrypted with the hidden chats' key. Its chats show among the hidden chats only, and it connects only while they are open, so nothing comes and no notice shows while they are closed. Its Matrix and XMPP calls ring only while they are open. See [Hidden chats](#hidden).":
    "**Skriveni razgovori mogu imati vlastite Matrix, XMPP i Nostr račune**: ispod popisa mjesta skrivenih razgovora, Matrix, XMPP i Nostr otvaraju račun samo tog mjesta, odvojen od računa prostora i šifrovan ključem skrivenih razgovora. Njegovi razgovori vide se samo među skrivenim razgovorima, a povezuje se samo dok su otvoreni, pa dok su zatvoreni ništa ne stiže i nijedna obavijest se ne prikazuje. Njegovi Matrix i XMPP pozivi zvone samo dok su otvoreni. Pogledajte [Skriveni razgovori](#hidden).",
  "**Matrix, XMPP and Nostr in backups**: a backup now holds the Matrix, XMPP and Nostr accounts of every space and of its hidden chats. After a restore, a Nostr key comes back with its chats as they were; an XMPP account goes on as a new device of the account, with its contacts and chats; a Matrix account is let go of on this phone, and the space signs in again as a new device; its Security Key opens the messages from before. See [Backups](#backup).":
    "**Matrix, XMPP i Nostr u rezervnim kopijama**: rezervna kopija sada sadrži Matrix, XMPP i Nostr račune svakog prostora i njegovih skrivenih razgovora. Nakon vraćanja, Nostr ključ se vraća sa svojim razgovorima kakvi su bili; XMPP račun nastavlja kao novi uređaj računa, sa svojim kontaktima i razgovorima; Matrix račun se na ovom telefonu pušta, a prostor se ponovo prijavljuje kao novi uređaj; njegov sigurnosni ključ otvara ranije poruke. Pogledajte [Rezervne kopije](#backup).",
  "**Matrix voice messages show their waveform, and Nostr answers can be photos**: a voice message sent in a Matrix chat carries its waveform, which Element draws, and one that comes with a waveform shows it under Play; in a Nostr chat, a photo, file or voice message sent while a message shows over the message box answers it. See [Matrix](#matrix) and [Chats with other Nostr apps](#nostr-chats).":
    "**Matrix glasovne poruke prikazuju svoj talasni oblik, a Nostr odgovori mogu biti fotografije**: glasovna poruka poslana u Matrix razgovoru nosi svoj talasni oblik, koji Element crta, a ona koja stigne s talasnim oblikom prikazuje ga ispod Pusti; u Nostr razgovoru, fotografija, datoteka ili glasovna poruka poslana dok se poruka prikazuje iznad polja odgovara na nju. Pogledajte [Matrix](#matrix) i [Razgovori s drugim Nostr aplikacijama](#nostr-chats).",
  "**Group calls in XMPP groups**: in a private XMPP group, start a voice or video call, answer one that rings, or join one going on, together with people who use Dino. See [XMPP](#xmpp).":
    "**Grupni pozivi u XMPP grupama**: u privatnoj XMPP grupi pokrenite glasovni ili video poziv, odgovorite na onaj koji zvoni ili se pridružite onom koji traje, zajedno s ljudima koji koriste Dino. Pogledajte [XMPP](#xmpp).",
  '**A call to a slow phone rings in full**: the caller now waits up to a minute and a quarter for the other phone to say it rings, and then 45 seconds from then, so a call that reached it late no longer rings there only to stop at once; and the phone called reads a call before anything it has to send, and waits for calls again at once after its network changes. See [Chat through a relay](#relay).':
    '**Poziv na spor telefon zvoni do kraja**: onaj ko zove sada čeka do minut i četvrt da drugi telefon kaže da zvoni, a zatim 45 sekundi od tog trenutka, pa poziv koji je tamo stigao kasno više ne zvoni samo da bi odmah stao; a pozvani telefon čita poziv prije svega što ima da pošalje, i odmah ponovo čeka pozive nakon promjene mreže. Vidi [Razgovor preko relaya](#relay).',
  "**The web app and the computer reach Matrix, XMPP and Nostr servers over HTTPS**: their page policy allowed only WebSocket connections, so Matrix sign-in, XMPP server discovery and file sharing, and Nostr files and name lookups failed there. They work now. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats).":
    "**Web-aplikacija i računar dopiru do Matrix, XMPP i Nostr servera preko HTTPS-a**: politika njihove stranice dopuštala je samo WebSocket veze, pa tamo nisu radili prijava na Matrix, otkrivanje XMPP servera i dijeljenje datoteka, niti Nostr datoteke i traženje imena. Sada rade. Vidi [Matrix](#matrix), [XMPP](#xmpp) i [Razgovori s drugim Nostr aplikacijama](#nostr-chats).",
  // 3.4.2
  '**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.':
    '**Poruka poslata dok se razgovor otvara čeka ga**, označena Šalje se…, i ide čim se razgovor otvori, bez poruke da Erevos ne može da šifruje.',
  '**What you read as a chat opens stays read**: the home screen no longer counts it as new.':
    '**Ono što pročitaš dok se razgovor otvara ostaje pročitano**: početni ekran ga više ne broji kao novo.',
  '**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).':
    '**Samsung više ne pita za svoje deljenje**: na Samsung telefonu Wi-Fi Aware i Wi-Fi mreža s telefonima u blizini ostaju isključeni dok ih ne uključiš. Vidi [Razgovor s telefonom u blizini](#nearby).',
  '**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.':
    '**Polje za SMS zadržava svoju širinu na malom ekranu**: Fotografija i Pošalji pored njega su okrugla dugmad, kao u razgovoru.',
  // 3.4.1
  '**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.':
    '**Slanje odgovara odmah**: kratka vibracija kad ga pritisneš, polje se isprazni i poruka se pojavi, označena sa Šalje se…, pa nikad ne ode dvaput.',
  '**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.':
    '**Ekran više ne ostaje podignut** nakon što se tastatura zatvorila iza prozorčića, dijaloga ili druge aplikacije.',
  '**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).':
    '**Uvoz razgovora s njegovim fotografijama više ne zamrzava Erevos**: ekran radi dok datoteke stižu, kaže koliki je dio stigao, a **Otkaži** ga zaustavlja. Razgovor premješten u skrivene razgovore nosi sa sobom razgovore uvezene u njega. Vidi [Uvezeni razgovori](#import).',
  // 3.4.0
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Vaš relay dokazuje svoj ključ**: svaka veza s njim počinje provjerom koju može proći samo relay koji ima taj ključ, pa se niko između ne može predstaviti kao on. Kad je jednom prođe, Erevos mu više nikad ne pristupa bez provjere. Za to je vašem relayu potrebno ažuriranje.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Transparentnost](#transparency), novi dio vodiča: šta server iza Erevosa čuva i koliko dugo, šta ne čuva i ko još nešto vidi.',
  "**What's new**: this list, in Settings → General, by version.": '**Šta je novo**: ovaj popis, po verzijama, u „Postavke → Općenito“.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Iza PIN-a razgovora ništa se ne vidi**: nijedna poruka razgovora zaključanog PIN-om ne prikazuje se dok se ne upiše njegov PIN, a uz staklo, pozadinu ili stil s vlastitom scenom, ekran PIN-a je gusto mutno staklo kroz koje se ništa ne vidi.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Grupni video poziv s vrha grupe**: plava kamera pored zelene slušalice, kao u razgovoru s kontaktom.",
  "**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it.":
    "**Red na releju za svaki kontakt**: svaki kontakt piše u red koji zna samo on, pa relej ne može znati da dva kontakta pišu istom telefonu, a brisanje ili blokiranje nekoga briše samo njegov. Vaš relej za to treba ažuriranje.",
  "**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden).":
    "**Skriveni razgovori, više kao ostali**: zatvaraju se nakon 30 sekundi u pozadini, ne odmah, i nikad tokom poziva ni dok birate fotografiju ili datoteku; dok su otvoreni, poruka pušta svoj zvuk, a pregledi linkova tamo imaju vlastiti prekidač. Pogledajte [Skriveni razgovori](#hidden).",
  "**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden).":
    "**Skriveni razgovori koji primaju dok su zatvoreni**: prekidač na vrhu svakog mesta, uključen za nova mesta, čini da primaju kao vaši ostali razgovori: njihovi kontakti odmah vide da je poruka stigla, obaveštenje kaže samo „Nova poruka“, a poziv zvoni bez imena. Pogledajte [Skriveni razgovori](#hidden).",
  "**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden).":
    "**Skriveni razgovori takođe čekaju i uvoze**: ono što sada ne može da ode čeka, označeno „Na čekanju“, i šalje se samo preko njihovog relaya; „Pošalji kasnije“ radi tamo kao u vašim ostalim razgovorima; a razgovor iz Telegrama, WhatsAppa ili Vibera može se uvesti u skriveni razgovor i ostati samo tamo. Pogledajte [Skriveni razgovori](#hidden).",
  "**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden).":
    "**Skriveni razgovori na popisu kao vaši razgovori**: otvaraju se na popisu kao na početnom zaslonu, s onim što je posljednje rečeno i koliko nije pročitano, a svako mjesto ima na vrhu svoj Razgovor sa sobom. Pogledajte [Skriveni razgovori](#hidden).",
  "**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden).":
    "**Više u skrivenim razgovorima**: uz Primanje dok su zatvoreni, ono što im stigne preko Nostra čita se i dok su zatvoreni; a tamo se kontakt može dodati s fotografije njegovog QR koda, a skrivenom kontaktu dati fotografija. Pogledajte [Skriveni razgovori](#hidden).",
  "**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden).":
    "**Skriveni razgovori bez relaya**: kao vaši drugi razgovori, mogu početi samo preko Nostra: njihov link za kontakt i QR kod kažu gdje tamo čitaju, a tekstovi i reakcije idu tamo. Pogledajte [Skriveni razgovori](#hidden).",
  "**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden).":
    "**Grupe u skrivenim razgovorima**: ispod njihovog popisa, Nova grupa pravi grupu s njihovim kontaktima; ona stoji među njihovim razgovorima, ide samo preko njihovog relaya i čita se dok su zatvoreni ako je Primanje dok su zatvoreni uključeno. Pogledajte [Skriveni razgovori](#hidden).",
  "**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy).":
    "**Bez retka o probnoj verziji**: početni ekran više ne završava porukom da je ovo probna verzija. Vodič i dalje kaže točno što je zaštićeno i da još ništa nije provjereno. Pogledajte [Što je danas zaštićeno](#privacy).",
  "**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts).":
    "**Meni kontakata u skrivenim razgovorima**: njihovi Kontakti opet imaju meni, samo s onim što je njihovo: uvoz .vcf datoteke u njih, čuvanje njihovih kontakata kao .vcf datoteke i čitanje QR koda kontakta sa fotografije. Erevos ID upisan tamo dodaje osobu u skrivene razgovore. Pogledajte [Kontakti](#contacts).",
  // 3.3.2
  '**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.':
    '**Dugme za običan poziv za više kontakata**: narandžasta tastatura na vrhu razgovora s kontaktom uzima i broj kontakta s kojim ste ga povezali (**Poveži s jednim od mojih kontakata**), prvo broj mobilnog.',
  // 3.3.1
  '**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.':
    '**Razgovori iz Vibera mogu se uvesti**: iz HTML datoteke Android aplikacije Backup Text for Viber, samo tekst.',
  // 3.3.0
  '**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.':
    '**Počnite bez relaya, preko Nostra**: **Počnite bez relaya** u „Novi razgovor“. Tekstovi, naljepnice, reakcije, izmjene i oznake isporučeno i pročitano idu preko Nostra, kroz Tor. Fotografije, glasovne poruke, datoteke i pozivi i dalje trebaju relay ili telefon u blizini.',
  '**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.':
    '**Relay stiže sam od sebe**: ko ima relay koji šalje pozivnice, kontaktu bez relaya jednom pošalje pozivnicu, u samom razgovoru, a drugi telefon je sam prihvati.',
  '**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.':
    '**Obavijest kad izađe nova verzija** (Android): jednom dnevno Erevos pita LPHL-ov server, pa pokaže prikvačen red Erevos i obavijest, samo za verziju koju je potpisao računar za izdanja. Isključuje se u „Postavke → Općenito → Ažuriranja“.',
  '**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.':
    '**Zaključajte razgovor PIN-om**: Detalji → Zaključaj PIN-om, za razgovore i grupe. Ništa od njega se ne vidi u pretrazi, porukama sa zvjezdicom ni uvozima. U skrivenim razgovorima PIN se ne traži.',
  '**A new handset** on the green tiles: Phone, and the call in a chat.': '**Nova slušalica** na zelenim pločicama: Telefon i poziv u razgovoru.',
  '**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.':
    '**Novi ekran „Novi razgovor“**: „Kako ste sada povezani“ na vrhu, tri velike kartice za telefon bez relaya („Imam pozivnicu“, „Prijava preko LPHL“, „Počnite bez relaya“) i tehnički dio pod „Za napredne korisnike“.',
  '**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.':
    '**Stabilniji Nostr preko Tora**: svaki Nostr relay ima vlastiti put kroz Tor, a nakon neuspjeha pokušava novi izlaz. Jasnija greška na ekranu Nostr.',
  '**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.':
    '**Kad se veza s relayem prekine** dok Erevos čeka na njemu, Erevos to primijeti i ponovo se poveže, a prije bi ostao zaglavljen.',
  '**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.':
    '**Pozovi putem SMS-a** (Android): na kartici kontakta s telefona, za jednu osobu, na 2 dana. Link otvara stranicu koja nudi Erevos (APK za Android, web-aplikaciju za iPhone ili računar), a zatim otvara pozivnicu. QR kod i „Podijeli pozivnicu“ ostaju kao i prije.',
  '**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.':
    '**Ispravke pozivnice putem SMS-a**: radi i link kopiran kao /i/#…, i starija web-aplikacija otvara pozivnicu, a na iOS-u 26 piše da je „Podijeli“ pod •••.',
  '**A phone call button** in Erevos chats and SMS chats.': '**Dugme za telefonski poziv** u Erevos razgovorima i SMS razgovorima.',
  // 3.2.1
  '**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.':
    '**Uredite poruku** koju ste poslali, najkasnije dan poslije: kontaktima, grupama i povezanim uređajima, uz „Uređeno“ pored vremena.',
  '**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.':
    '**Nostr kaže šta je uradio**: „Poslano preko Nostra“, a na ekranu Nostr šta je svaki relay posljednje uradio.',
  '**Coloured call buttons** at the top of a chat: video blue, voice green.': '**Dugmad za pozive u boji** na vrhu razgovora: plavo za videopoziv, zeleno za glasovni.',
  // 3.2.0
  'Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.':
    'Strelice do početka i kraja razgovora; starije poruke se same učitavaju dok listate.',
  'Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.':
    'Razgovori uvezeni iz Telegrama i WhatsAppa izgledaju kao Erevos poruke: oblačići, dani, fotografije, glasovne poruke, pretraga.',
  'Dogs instead of cats in the stickers.': 'Psi umjesto mačaka u naljepnicama.',
  'Screenshots: a switch in Settings → Privacy and security.': 'Snimci ekrana: prekidač u „Postavke → Privatnost i sigurnost“.',
  'Hidden chats from New chat: hold it for a second.': 'Skriveni razgovori iz „Novi razgovor“: držite ga jednu sekundu.',
  'Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.':
    'Pločice u boji na početnom ekranu: zelena za Telefon, ljubičasta za Kontakte, narandžasta za lokot.',
  '**Chat with myself**, always first, and **Remind me**, the orange bell.': '**Razgovor sa sobom**, uvijek prvi, i **Podsjeti me**, narandžasto zvonce.',
  '**Media, links and files** in a chat’s Details, with a calendar and Go to a day.':
    '**Mediji, linkovi i fajlovi** u Detaljima razgovora, s kalendarom i „Idi na dan“.',
  'Import a chat from inside the chat: Details → Imported chats.': 'Uvoz razgovora iz samog razgovora: Detalji → Uvezeni razgovori.',
  'A closed space can say that a message came while another space is open.': 'Zatvoreni prostor može javiti da je stigla poruka dok je otvoren drugi prostor.',
  'The message menu says when a message went or came through Nostr.': 'Meni poruke kaže kad je poruka poslana ili stigla preko Nostra.',
  '**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.': '**Podržite Erevos**: Liberapay, PayPal, Monero, Bitcoin.',
  'Who makes Erevos and why, in About Erevos; the guide says why everywhere.': 'Ko pravi Erevos i zašto, u „O Erevosu“; vodič svuda objašnjava zašto.',
  // 3.1.2
  '**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.':
    '**Postavke u 8 grupa**, s pretragom: Općenito, Izgled, Obavijesti, Privatnost i sigurnost, Relay i mreže, Telefon i SMS, Podaci i uređaji, Za testiranje. ⋯ na početnom ekranu sadrži samo mjesta, a Postavke su posljednje.',
  // 3.1.1
  'Check for updates says what stopped an update.': '„Provjeri ažuriranja“ kaže šta je spriječilo ažuriranje.',
  'Invite someone is not made from a token for all; it asks you to sign in to the relay first.':
    '„Pozovite nekoga“ se ne pravi iz zajedničkog tokena; prvo traži da se prijavite na relay.',
  'The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).':
    'Zajednički token relaya sam postaje vlastiti token telefona (treba ažuriran relay).',
  'A relay that refuses through Tor says why.': 'Relay koji odbija preko Tora kaže zašto.',
  // 3.1.0
  'Less battery in the background: the relay, Tor and the nearby radios.': 'Manja potrošnja baterije u pozadini: relay, Tor i radio veze u blizini.',
  'Erevos no longer closes when you make a sticker from a photo.': 'Erevos se više ne zatvara kad pravite naljepnicu od fotografije.',
  'Hidden chats’ notices are right.': 'Obavijesti skrivenih razgovora su ispravne.',
  'Hidden chats by holding New chat.': 'Skriveni razgovori držanjem dugmeta „Novi razgovor“.',
  'A search for contacts on the Phone.': 'Pretraga kontakata u Telefonu.',
  'New chat shows first how to add a contact.': '„Novi razgovor“ prvo pokazuje kako dodati kontakt.',
  'A call shows over the screen saver, and the screen wakes.': 'Poziv se prikazuje preko čuvara ekrana, a ekran se budi.',
  'Erevos in other apps’ Share.': 'Erevos u dijeljenju iz drugih aplikacija.',
  'A sound for every new message, also while Erevos shows.': 'Zvuk za svaku novu poruku, i dok je Erevos na ekranu.',
  'The SMS settings say right what holding does.': 'SMS postavke ispravno kažu šta radi zadržavanje prsta.',
  // 3.0.0
  'Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.': 'Svaka ikona otvara ono što joj piše: Erevos, SMS, Telefon, Kontakti, widget.',
  '**Messages through Tor by default**: Messages, Everything or Nothing.': '**Poruke preko Tora po zadanom**: Poruke, Sve ili Ništa.',
  '**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.':
    '**Tekstovi preko Nostra**: tri javna relaya, kroz Tor, s vašim vlastitim relayem kao rezervom nakon 5 minuta.',
  // 2.0.3
  'One invite for everything: the relay and the contact together.': 'Jedna pozivnica za sve: relay i kontakt zajedno.',
  'Spam rules for senders and numbers abroad, with the reason.': 'Pravila za spam za pošiljaoce i brojeve iz inostranstva, s razlogom.',
  '480 stickers in 20 sets.': '480 naljepnica u 20 paketa.',
  'Lighter chats on older phones; QR codes at once.': 'Lakši razgovori na starijim telefonima; QR kodovi odmah.',
  'Copy code for one-time codes in SMS.': '„Kopiraj kod“ za jednokratne kodove u SMS porukama.',
  'Locked, Erevos keeps receiving.': 'I zaključan, Erevos i dalje prima poruke.',
  'Faster contacts; the hidden chats’ notice counts only messages.': 'Brži kontakti; obavijest skrivenih razgovora broji samo poruke.',
  'The relay tries every address: push, other relays, the LPHL sign-in.': 'Relay pokušava svaku adresu: push, druge relaye, prijavu preko LPHL-a.',
  // 2.0.2
  'Swiping on the tabs only changes the tab.': 'Prevlačenje po karticama samo mijenja karticu.',
  'The icons fill the launcher’s shape.': 'Ikone popunjavaju oblik pokretača.',
  // 2.0.1
  'Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.':
    'Ikone u boji (Erevos crvena, Telefon zelena, SMS plava, Kontakti ljubičasta) i nova SMS ikona.',
  'A colour for each icon, and the order of the widget’s buttons.': 'Boja za svaku ikonu i redoslijed dugmadi widgeta.',
  'Swipe to go back, and between tabs.': 'Prevlačenje za povratak i između kartica.',
  // 2.0.0
  'An update of the WebView no longer closes Erevos.': 'Ažuriranje komponente WebView više ne zatvara Erevos.',
  'Deleting or blocking a contact gives you a new queue on the relay.': 'Brisanje ili blokiranje kontakta daje vam novi red na relayu.',
  'A new contact can take the name of a contact on the phone.': 'Novi kontakt može preuzeti ime kontakta s telefona.',
  '**Sign in to the relay with LPHL**, and **invites to the relay**.': '**Prijava na relay preko LPHL-a** i **pozivnice na relay**.',
  'Permissions in the web app, and more on Android; the web app’s notice says how many came.':
    'Dozvole u web-aplikaciji, i više njih na Androidu; obavijest web-aplikacije kaže koliko ih je stiglo.',
  'Hidden chats can ring calls while they are closed.': 'Skriveni razgovori mogu zvoniti na pozive dok su zatvoreni.',
  'New keys every month in chats, every week in groups.': 'Novi ključevi svaki mjesec u razgovorima, svake sedmice u grupama.',
  'Linked devices work with the phone off.': 'Povezani uređaji rade i kad je telefon isključen.',
  'A new chat screen; QR codes from a photo; the Phone for small screens.': 'Novi ekran razgovora; QR kodovi s fotografije; Telefon za male ekrane.',
  'Add as contact inside a group.': '„Dodaj u kontakte“ unutar grupe.',
  'Stickers in sets, moving, and your own.': 'Naljepnice u paketima, pokretne i vlastite.',
  'SMS inside the Erevos chat.': 'SMS unutar Erevos razgovora.',
  'Android updates need the release computer’s signature.': 'Ažuriranja za Android trebaju potpis računara za izdanja.',
  'An F-Droid build; Serbo-Croatian; new version numbers.': 'Verzija za F-Droid; srpskohrvatski; novi brojevi verzija.',
  'Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.':
    'Mnogo toga za sigurnost: Argon2id, poruke šifrirane i za relay, token za svaki telefon, nijedan link ne pokreće poziv.',
  // 0.1.16
  'Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.': 'Uvozi iz Telegrama i WhatsAppa donose fotografije, videozapise, glasovne poruke i datoteke.',
  'A phone without a relay talks through a place on a contact’s relay.': 'Telefon bez relaya razgovara preko mjesta na relayu kontakta.',
  // 0.1.14
  'Back to my chats, for hidden chats.': '„Vrati u moje razgovore“, za skrivene razgovore.',
  'Erevos receives and rings even after you swipe it away from the recent apps.': 'Erevos prima poruke i zvoni i kad ga prevučete iz nedavnih aplikacija.',
  // 0.1.12
  'Hidden chats can say a message came.': 'Skriveni razgovori mogu javiti da je stigla poruka.',
  'Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.': 'Ispravke: meniji, QR kodovi s fotografije, Bluetooth na Androidu 17, dugi popisi.',
  // 0.1.11
  'The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.':
    'Telefon bez lozinke, ako to dozvolite; widget za početni ekran; filter za SMS i Erevos.',
  // 0.1.10
  'Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.': 'Linkovi čekaju lozinku; ikone Telefona i Kontakata; Erevos ID na kontaktu.',
  // 0.1.8
  '61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.':
    '61 nova mogućnost: 5 novih jezika, povezani uređaji, javne grupe, odgovori, reakcije, ankete, kasnije slanje, Erevos kao aplikacija za telefon i kontakte, Tor mostovi, otisak prsta, Windows i još mnogo toga.',
  // 0.1.7 to 0.1.2
  'SMS notices in the background.': 'SMS obavijesti u pozadini.',
  'The web app comes out with every release.': 'Web-aplikacija izlazi sa svakim izdanjem.',
  'Greek in the whole app.': 'Grčki u cijeloj aplikaciji.',
  'Web Push in the web app.': 'Web Push u web-aplikaciji.',
  'The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.':
    'Prvo potpisano izdanje za Android: šifrirani razgovori, pozivi, grupe, skriveni razgovori, rezervne kopije, uvozi i telefoni u blizini bez interneta.',
  "**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls.":
    "**Dva nova kompleta naljepnica s 24 raspoloženja**: **Tux**, Linuxov pingvin kakav je nacrtan, i **Aikido**, aikidoka u keikogiju i širokoj hakami, koji se i klanja, sjedi u seizi i kotrlja se.",
  "**A new sticker set, Takis**: a caricature in a dark suit and a purple tie with dots, in 24 moods that move.":
    "**Novi komplet naljepnica, Takis**: karikatura u tamnom odijelu i ljubičastoj kravati s točkicama, u 24 raspoloženja koja se miču.",
  "**Photos, files and voice messages with no relay**: when there is no relay between you and your contact and they read on Nostr, a voice message goes through Nostr like a text, a photo up to 3 MB in pieces, and a larger photo, a video or another file, up to 20 MB, to an encrypted file server (Blossom), all through Tor. See [Through Nostr](#nostr).":
    "**Fotografije, datoteke i glasovne poruke bez relaya**: kad između vas i vašeg kontakta nema relaya, a on čita na Nostru, glasovna poruka ide preko Nostra kao tekst, fotografija do 3 MB u komadima, a veća fotografija, video ili druga datoteka, do 20 MB, na šifrirani poslužitelj datoteka (Blossom), sve preko Tora. Pogledajte [Preko Nostra](#nostr).",
  "**More battery saved in the background, if you choose**: under Settings → Notifications → In the background, Only the waste stays the default; And nearby phones also turns off the radios for phones nearby while Erevos is in the background; And sleep also lets the phone sleep, so Erevos looks at your relay about once a minute and a message or a call can be a minute or two late. Android only. See [Chat through a relay](#relay).":
    "**Više uštede baterije u pozadini, ako to odaberete**: u Postavke → Obavijesti → U pozadini, Samo rasipanje ostaje zadano; I telefoni u blizini isključuje i radije za telefone u blizini dok je Erevos u pozadini; I san dopušta i telefonu da spava, pa Erevos gleda vaš relay otprilike jednom u minuti, a poruka ili poziv mogu kasniti minutu-dvije. Samo Android. Pogledajte [Razgovor preko relaya](#relay).",
  "**A contact you delete no longer comes back from an old ask**: in a group, a member you asked for their contact link, or who asked for yours, and whom you then deleted as a contact before Erevos looked at the relay again, could be added again by that old ask. Deleting them now lets go of it at once. See [Group chats](#groups).":
    "**Obrisan kontakt se više ne vraća starim zahtjevom**: u grupi je član čiji ste kontakt-link tražili, ili koji je tražio vaš, a kojeg ste zatim obrisali kao kontakt prije nego što je Erevos opet pogledao relay, mogao biti ponovo dodan tim starim zahtjevom. Sada ga brisanje odmah ispušta. Pogledajte [Grupni razgovori](#groups).",
  "**Every message says which way it went**: hold a message and its menu says whether it went or came through the relay, through Nostr, to a phone nearby or over LoRa. Messages from before say nothing. See [Through Nostr](#nostr).":
    "**Svaka poruka kaže kojim je putem išla**: zadržite prst na poruci i njen meni kaže je li otišla ili stigla preko relaya, preko Nostra, preko obližnjeg telefona ili preko LoRa. Starije poruke ne kažu ništa. Pogledajte [Preko Nostra](#nostr).",
  "**The spam filter reads words as they look**: a scam text that swaps a letter for a look-alike of another alphabet, or hides a mark that shows nothing inside a word, no longer gets past it. See [SMS](#sms).":
    "**Filter za spam čita riječi kako izgledaju**: prevarantska SMS poruka koja zamijeni slovo sličnim slovom iz drugog pisma, ili u riječ sakrije znak koji se ne vidi, više ga ne zavarava. Pogledajte [SMS](#sms).",
  "**Media, links and files in groups too**: in a group's details, a list of its photos, videos, voice messages, music, files and links, each kind apart under its months, with a calendar, as in a contact's chat. A tap opens or plays; held, each goes to its message. See [Group chats](#groups).":
    "**Mediji, linkovi i fajlovi i u grupama**: u detaljima grupe popis njenih fotografija, videa, glasovnih poruka, muzike, fajlova i linkova, svaka vrsta posebno pod svojim mjesecima, s kalendarom, kao u razgovoru s kontaktom. Dodir otvara ili pušta; držanjem svaki ide na svoju poruku. Pogledajte [Grupni razgovori](#groups).",
  "**A relay restart no longer brings a false notice**: after your relay restarted, a hidden chat or a closed space said New message once more for messages it had told of already. Your relay needs an update for it. See [Hidden chats](#hidden).":
    "**Ponovno pokretanje relaya više ne donosi lažno obavještenje**: nakon što bi se vaš relay ponovo pokrenuo, skriveni razgovor ili zatvoren prostor opet bi rekao Nova poruka za poruke koje je već javio. Za to je vašem relayu potrebno ažuriranje. Pogledajte [Skriveni razgovori](#hidden).",
  "**Backups to your server through Tor**: on Android, automatic backups sent to your own server now follow the space's choice under Settings → Relay and networks → Tor, as Matrix does, so with Tor the server no longer sees where you are. To a server too says when they go through Tor. See [Backups](#backup).":
    "**Rezervne kopije na vaš server preko Tora**: na Androidu automatske rezervne kopije koje idu na vaš server sada slijede izbor prostora pod Postavke → Relay i mreže → Tor, kao Matrix, pa uz Tor server više ne vidi gdje ste. I na server kaže kad idu preko Tora. Pogledajte [Rezervne kopije](#backup).",
};
