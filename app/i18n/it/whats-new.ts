// The Italian of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/it/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Novità',
  'What each version changed': 'Cosa è cambiato in ogni versione',
  'What each version of Erevos changed, the newest first.': 'Cosa è cambiato in ogni versione di Erevos, dalla più recente.',
  'Not out yet': 'Non ancora uscita',
  'This version': 'Questa versione',
  'For you': 'Per te',
  'Under the hood': 'Sotto il cofano',
  // Not out yet.
  '**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).':
    '**Le novità in due parti**: ogni versione dice prima cosa cambia per te, poi cosa è cambiato sotto il cofano: correzioni, velocità, batteria e sicurezza all’interno. Vedi [Aggiornamenti](#updates).',
  '**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.':
    '**Gli SMS di un contatto non restano più contati come nuovi**: aprire la sua chat li legge tutti, anche i precedenti, non solo quelli visibili.',
  '**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).':
    '**Un messaggio non resta più in attesa quando Tor non raggiunge il relay**: con Tor per i messaggi, parte subito in diretta, come dicono le impostazioni di Tor. Vedi [Tramite Tor](#tor).',
  '**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).':
    '**Gli avvisi in background non si fermano più dopo un cambio di rete**: quando la connessione di un’attesa al relay moriva per strada (da Wi-Fi a dati mobili, riavvio del relay), Erevos prendeva il relay per uno vecchio, che non sa aspettare, per tutta l’esecuzione: i messaggi dei contatti arrivavano fino a dieci minuti dopo, e le chat nascoste, gli spazi chiusi e gli squilli nascosti non dicevano nulla fino al riavvio di Erevos. Vedi [Chat tramite un relay](#relay).',
  '**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).':
    '**Una chiamata chiusa subito non squilla più**: quando la chiusura arrivava nello stesso sguardo della chiamata, il telefono squillava 45 secondi per una chiamata in cui non c’era nessuno; lo stesso per una chiamata di gruppo che chi l’ha avviata ha lasciato subito. Vedi [Chat tramite un relay](#relay).',
  '**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).':
    '**Una chiamata nascosta squilla una volta**: un posto con Ricevere da chiuse e una coda di squillo squillava due volte per una chiamata, e una chiamata presa mentre le chat nascoste erano aperte squillava di nuovo alla loro chiusura. Vedi [Chat nascoste](#hidden).',
  '**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).':
    '**Il link di contatto di un membro non dice più Nuovo messaggio**: la risposta a una richiesta da un gruppo aggiunge solo il contatto, senza avviso. Vedi [Chat di gruppo](#groups).',
  '**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).':
    '**L’avviso di compleanno e la chiamata in arrivo del telefono non si sostituiscono più**: avevano lo stesso numero di avviso. Vedi [Contatti](#contacts).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**La guida è in tutte le lingue dell’app**: appare in quella che hai scelto e chiama i pulsanti come li mostra l’app. Vedi [Lingua](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Posizione trova dove ti trovi, anche al chiuso**: il telefono cerca via satellite e con la sua rete insieme, un foglio dice che sta cercando, e se non trova niente dice perché, con Riprova. Vedi [Chat tramite un relay](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**L\'icona della web app conta i non letti**: su un iPhone, con le notifiche attive per lo spazio, l\'icona di Erevos nella schermata Home mostra quanti messaggi non sono letti, mai quelli di una chat nascosta, a meno che tu non lo spenga in Impostazioni → Notifiche → Numero sull\'icona. Vedi [Su un iPhone](#iphone).',
  "**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).":
    "**Notifiche per ogni chat**: su Android, metti in silenzio una chat o un gruppo per 8 ore, una settimana o sempre, e dai ai suoi messaggi e alle sue chiamate un suono proprio, o nessuno. Vedi [Chat tramite un relay](#relay).",
  "**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden).":
    "**Una chat bloccata con un PIN suo resta bloccata**: quando l’Erevos del contatto iniziava una nuova conversazione, come fa circa una volta al mese, la chat perdeva il suo PIN, e un gruppo pubblico in cui sei rientrato perdeva il suo. Vedi [Chat nascoste](#hidden).",
  "**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay).":
    "**L'icona di Erevos tiene il numero dei messaggi non letti, su Android**: uscendo da Erevos con messaggi non letti, una notifica senza suono tiene quanti sono finché non li leggi, e il launcher la mostra sull'icona, come numero o punto. Impostazioni → Notifiche → Numero sull'icona lo disattiva. Vedi [Chat tramite un relay](#relay).",
  // 3.4.2
  '**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.':
    '**Un messaggio inviato mentre una chat si apre la aspetta**, segnato Invio…, e parte appena la chat è aperta, senza dire che Erevos non può cifrare.',
  '**What you read as a chat opens stays read**: the home screen no longer counts it as new.':
    '**Ciò che leggi mentre una chat si apre resta letto**: la schermata iniziale non lo conta più come nuovo.',
  '**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).':
    '**Nessuna domanda di Samsung sulla sua condivisione**: su un telefono Samsung, Wi-Fi Aware e la rete Wi-Fi con i telefoni vicini restano spenti finché non li attivi. Vedi [Chattare con un telefono vicino](#nearby).',
  '**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.':
    '**Il campo dell’SMS mantiene la sua larghezza su uno schermo piccolo**: Foto e Invia accanto sono pulsanti rotondi, come in una chat.',
  // 3.4.1
  '**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.':
    '**Invia risponde subito**: una breve vibrazione quando lo premi, il campo si svuota e il messaggio compare, segnato Invio…, così non parte mai due volte.',
  '**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.':
    '**Lo schermo non resta più spinto in alto** dopo che la tastiera si è chiusa dietro un pannello, una finestra di dialogo o un’altra app.',
  '**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).':
    '**Importare una chat con le sue foto non blocca più Erevos**: lo schermo resta attivo mentre arrivano i file, dice quale parte è arrivata e **Annulla** la ferma. Una chat spostata nelle chat nascoste porta con sé le chat importate in essa. Vedi [Chat importate](#import).',
  // 3.4.0
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Il tuo relay dimostra la sua chiave**: ogni connessione inizia con un controllo che solo il relay con quella chiave può superare, così nessuno nel mezzo può spacciarsi per lui. Dopo averla dimostrata, Erevos non lo raggiunge più senza il controllo. Per questo il tuo relay va aggiornato.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Trasparenza](#transparency), una nuova parte della guida: cosa conserva il server dietro Erevos e per quanto tempo, cosa non conserva, e chi altro vede qualcosa.',
  "**What's new**: this list, in Settings → General, by version.": '**Novità**: questo elenco, in Impostazioni → Generali, per versione.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Dietro il PIN di una chat non si vede niente**: nessun messaggio di una chat bloccata con un PIN viene mostrato prima che il suo PIN sia scritto, e con il vetro, uno sfondo o uno stile con una scena propria, la schermata del PIN è un vetro smerigliato fitto che non lascia vedere niente.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Una videochiamata di gruppo dalla parte alta del gruppo**: una videocamera blu accanto alla cornetta verde, come nella chat con un contatto.",
  "**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it.":
    "**Una coda del relay per ogni contatto**: ogni contatto scrive in una coda che conosce solo lui, così il relay non può capire che due contatti scrivono allo stesso telefono, ed eliminare o bloccare qualcuno cancella solo la sua. Il tuo relay deve essere aggiornato per questo.",
  "**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden).":
    "**Le chat nascoste, più come le altre**: si chiudono dopo 30 secondi in background, non subito, e mai durante una chiamata o mentre scegli una foto o un file; mentre sono aperte, un messaggio fa il suo suono, e le anteprime dei link hanno lì un interruttore proprio. Vedi [Chat nascoste](#hidden).",
  "**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden).":
    "**Chat nascoste che ricevono da chiuse**: un interruttore in cima a ogni posto, attivo nei posti nuovi, le fa ricevere come le tue altre chat: i loro contatti vedono subito che un messaggio è arrivato, una notifica dice solo «Nuovo messaggio», e una chiamata squilla senza nome. Vedi [Chat nascoste](#hidden).",
  "**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden).":
    "**Anche le chat nascoste aspettano e importano**: ciò che non può partire ora resta in attesa, segnato «In attesa», e parte da solo tramite il loro relay; «Invia più tardi» funziona lì come nelle tue altre chat; e una chat di Telegram, WhatsApp o Viber può essere importata in una chat nascosta, tenuta solo lì. Vedi [Chat nascoste](#hidden).",
  "**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden).":
    "**Le chat nascoste in un elenco come le tue chat**: si aprono su un elenco come quello della schermata iniziale, con l’ultima cosa detta e quanti non sono letti, e ogni posto ha in cima la sua Chat con me stesso. Vedi [Chat nascoste](#hidden).",
  "**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden).":
    "**Di più nelle chat nascoste**: con Ricevere da chiuse, ciò che arriva loro tramite Nostr si legge anche mentre sono chiuse; e lì si può aggiungere un contatto da una foto del suo codice QR e dare una foto a un contatto nascosto. Vedi [Chat nascoste](#hidden).",
  "**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden).":
    "**Chat nascoste senza relay**: come le tue altre chat, possono iniziare solo tramite Nostr: il loro link di contatto e il codice QR dicono dove leggono lì, e testi e reazioni vanno lì. Vedi [Chat nascoste](#hidden).",
  "**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden).":
    "**Gruppi nelle chat nascoste**: sotto il loro elenco, Nuovo gruppo crea un gruppo con i loro contatti; compare tra le loro chat, passa solo dal loro relay e viene letto mentre sono chiuse se Ricevere da chiuse è attivo. Vedi [Chat nascoste](#hidden).",
  "**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy).":
    "**Niente più riga sulla versione di prova**: la schermata iniziale non finisce più dicendo che è una versione di prova. La guida dice ancora esattamente cosa è protetto, e che niente è stato ancora verificato. Vedi [Cosa è protetto oggi](#privacy).",
  "**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts).":
    "**Il menu dei contatti nelle chat nascoste**: i loro Contatti hanno di nuovo un menu, solo con ciò che è loro: un file .vcf importato in esse, i loro contatti salvati come file .vcf e il codice QR di un contatto letto da una foto. Un ID Erevos scritto lì lo aggiunge alle chat nascoste. Vedi [Contatti](#contacts).",
  // 3.3.2
  '**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.':
    '**Il pulsante di chiamata normale per più contatti**: il tastierino arancione in cima alla chat di un contatto usa anche il numero del contatto a cui l’hai collegato (**Collega a uno dei miei contatti**), prima il cellulare.',
  // 3.3.1
  '**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.':
    '**Si possono importare le chat di Viber**: dal file HTML dell’app Android Backup Text for Viber, solo i testi.',
  // 3.3.0
  '**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.':
    '**Inizia senza relay, tramite Nostr**: **Inizia senza relay** in Nuova chat. Testi, sticker, reazioni, modifiche e i segni di consegna e lettura passano per Nostr, tramite Tor. Foto, messaggi vocali, file e chiamate richiedono ancora un relay o un telefono vicino.',
  '**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.':
    '**Il relay arriva da solo**: chi ha un relay che fa inviti manda una volta un invito a un contatto senza relay, dentro la chat, e l’altro telefono lo accetta da solo.',
  '**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.':
    '**Avviso quando esce una nuova versione** (Android): una volta al giorno Erevos chiede al server di LPHL, poi mostra una riga Erevos fissata in alto e una notifica, solo per una versione firmata dal computer delle versioni. Si disattiva in Impostazioni → Generali → Aggiornamenti.',
  '**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.':
    '**Blocca una chat con un PIN**: Dettagli → Blocca con un PIN, per chat e gruppi. Niente di quella chat compare nella ricerca, nei messaggi importanti o nelle importazioni. Nelle chat nascoste non chiede nessun PIN.',
  '**A new handset** on the green tiles: Phone, and the call in a chat.': '**Una nuova cornetta** sui riquadri verdi: Telefono, e la chiamata in una chat.',
  '**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.':
    '**Una nuova schermata Nuova chat**: «Come ti colleghi ora» in alto, tre grandi schede per un telefono senza relay (Ho un invito, Accedi con LPHL, Inizia senza relay), e la parte tecnica in «Per utenti esperti».',
  '**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.':
    '**Nostr più stabile tramite Tor**: ogni relay Nostr ha il suo percorso in Tor, e dopo un errore prova una nuova uscita. Un messaggio di errore più chiaro nella schermata Nostr.',
  '**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.':
    '**Quando la connessione al relay cade** mentre Erevos aspetta una risposta, Erevos se ne accorge e si ricollega, dove prima restava bloccato.',
  '**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.':
    '**Invita via SMS** (Android): nella scheda di un contatto del telefono, per una persona, per 2 giorni. Il link apre una pagina che offre Erevos (l’APK per Android, la web app per iPhone o computer), poi apre l’invito. Il codice QR e Condividi l’invito restano come prima.',
  '**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.':
    '**Correzioni all’invito via SMS**: funziona anche un link copiato come /i/#…, anche una web app più vecchia apre l’invito, e su iOS 26 dice che Condividi è dentro •••.',
  '**A phone call button** in Erevos chats and SMS chats.': '**Un pulsante per le telefonate** nelle chat Erevos e nelle chat SMS.',
  // 3.2.1
  '**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.':
    '**Modifica un messaggio** che hai inviato, fino a un giorno dopo: per contatti, gruppi e dispositivi collegati, con Modificato accanto all’ora.',
  '**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.':
    '**Nostr dice cosa ha fatto**: «Inviato tramite Nostr», e nella schermata Nostr cosa ha fatto per ultimo ogni relay.',
  '**Coloured call buttons** at the top of a chat: video blue, voice green.': '**Pulsanti di chiamata colorati** in cima a una chat: video blu, voce verde.',
  // 3.2.0
  'Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.':
    'Frecce per andare all’inizio e alla fine di una chat; i messaggi precedenti arrivano da soli mentre scorri.',
  'Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.':
    'Le chat importate da Telegram e WhatsApp sembrano messaggi di Erevos: fumetti, giorni, foto, messaggi vocali, ricerca.',
  'Dogs instead of cats in the stickers.': 'Cani al posto dei gatti negli sticker.',
  'Screenshots: a switch in Settings → Privacy and security.': 'Screenshot: un interruttore in Impostazioni → Privacy e sicurezza.',
  'Hidden chats from New chat: hold it for a second.': 'Chat nascoste da Nuova chat: tienila premuta per un secondo.',
  'Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.': 'Riquadri colorati nella schermata principale: Telefono verde, Contatti viola, il lucchetto arancione.',
  '**Chat with myself**, always first, and **Remind me**, the orange bell.': '**Chat con me stesso**, sempre in cima, e **Ricordamelo**, la campanella arancione.',
  '**Media, links and files** in a chat’s Details, with a calendar and Go to a day.':
    '**Media, link e file** nei Dettagli di una chat, con un calendario e Vai a un giorno.',
  'Import a chat from inside the chat: Details → Imported chats.': 'Importa una chat da dentro la chat stessa: Dettagli → Chat importate.',
  'A closed space can say that a message came while another space is open.': 'Uno spazio chiuso può dire che è arrivato un messaggio mentre è aperto un altro spazio.',
  'The message menu says when a message went or came through Nostr.': 'Il menu del messaggio dice quando un messaggio è partito o arrivato tramite Nostr.',
  '**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.': '**Sostieni Erevos**: Liberapay, PayPal, Monero, Bitcoin.',
  'Who makes Erevos and why, in About Erevos; the guide says why everywhere.': 'Chi fa Erevos e perché, in Informazioni su Erevos; la guida spiega ovunque il perché.',
  // 3.1.2
  '**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.':
    '**Impostazioni in 8 gruppi**, con una ricerca: Generali, Aspetto, Notifiche, Privacy e sicurezza, Relay e reti, Telefono e SMS, Dati e dispositivi, Per i test. Il ⋯ della schermata principale tiene solo le schermate, e per ultime le Impostazioni.',
  // 3.1.1
  'Check for updates says what stopped an update.': 'Cerca aggiornamenti dice cosa ha bloccato un aggiornamento.',
  'Invite someone is not made from a token for all; it asks you to sign in to the relay first.':
    'Invita qualcuno non parte più da un token condiviso; prima ti chiede di accedere al relay.',
  'The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).':
    'Il token condiviso del relay diventa da solo un token tutto del telefono (serve il relay aggiornato).',
  'A relay that refuses through Tor says why.': 'Un relay che rifiuta tramite Tor dice perché.',
  // 3.1.0
  'Less battery in the background: the relay, Tor and the nearby radios.': 'Meno batteria in background: il relay, Tor e le radio per i telefoni vicini.',
  'Erevos no longer closes when you make a sticker from a photo.': 'Erevos non si chiude più quando crei uno sticker da una foto.',
  'Hidden chats’ notices are right.': 'Le notifiche delle chat nascoste sono corrette.',
  'Hidden chats by holding New chat.': 'Chat nascoste tenendo premuto Nuova chat.',
  'A search for contacts on the Phone.': 'Una ricerca dei contatti nel Telefono.',
  'New chat shows first how to add a contact.': 'Nuova chat mostra per prima cosa come aggiungere un contatto.',
  'A call shows over the screen saver, and the screen wakes.': 'Una chiamata appare sopra il salvaschermo, e lo schermo si riaccende.',
  'Erevos in other apps’ Share.': 'Erevos in Condividi delle altre app.',
  'A sound for every new message, also while Erevos shows.': 'Un suono per ogni nuovo messaggio, anche mentre Erevos è aperto.',
  'The SMS settings say right what holding does.': 'Le impostazioni SMS dicono bene cosa succede tenendo premuto.',
  // 3.0.0
  'Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.': 'Ogni icona apre ciò che indica: Erevos, SMS, Telefono, Contatti, il widget.',
  '**Messages through Tor by default**: Messages, Everything or Nothing.': '**Messaggi tramite Tor in modo predefinito**: Messaggi, Tutto o Niente.',
  '**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.':
    '**I testi tramite Nostr**: tre relay pubblici, tramite Tor, con il tuo relay come riserva dopo 5 minuti.',
  // 2.0.3
  'One invite for everything: the relay and the contact together.': 'Un solo invito per tutto: il relay e il contatto insieme.',
  'Spam rules for senders and numbers abroad, with the reason.': 'Regole antispam per mittenti e numeri esteri, con il motivo.',
  '480 stickers in 20 sets.': '480 sticker in 20 set.',
  'Lighter chats on older phones; QR codes at once.': 'Chat più leggere sui telefoni più vecchi; codici QR subito.',
  'Copy code for one-time codes in SMS.': 'Copia codice per i codici monouso negli SMS.',
  'Locked, Erevos keeps receiving.': 'Anche bloccato, Erevos continua a ricevere.',
  'Faster contacts; the hidden chats’ notice counts only messages.': 'Contatti più veloci; la notifica delle chat nascoste conta solo i messaggi.',
  'The relay tries every address: push, other relays, the LPHL sign-in.': 'Il relay prova ogni indirizzo: push, altri relay, l’accesso con LPHL.',
  // 2.0.2
  'Swiping on the tabs only changes the tab.': 'Scorrere sulle schede cambia solo la scheda.',
  'The icons fill the launcher’s shape.': 'Le icone riempiono la forma del launcher.',
  // 2.0.1
  'Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.':
    'Icone colorate (Erevos rosso, Telefono verde, SMS blu, Contatti viola) e una nuova icona SMS.',
  'A colour for each icon, and the order of the widget’s buttons.': 'Un colore per ogni icona, e l’ordine dei pulsanti del widget.',
  'Swipe to go back, and between tabs.': 'Scorri per tornare indietro, e tra le schede.',
  // 2.0.0
  'An update of the WebView no longer closes Erevos.': 'Un aggiornamento della WebView non chiude più Erevos.',
  'Deleting or blocking a contact gives you a new queue on the relay.': 'Eliminare o bloccare un contatto ti dà una nuova coda sul relay.',
  'A new contact can take the name of a contact on the phone.': 'Un nuovo contatto può prendere il nome di un contatto del telefono.',
  '**Sign in to the relay with LPHL**, and **invites to the relay**.': '**Accesso al relay con LPHL**, e **inviti al relay**.',
  'Permissions in the web app, and more on Android; the web app’s notice says how many came.':
    'Permessi nella web app, e altri su Android; la notifica della web app dice quanti messaggi sono arrivati.',
  'Hidden chats can ring calls while they are closed.': 'Le chat nascoste possono far squillare le chiamate mentre sono chiuse.',
  'New keys every month in chats, every week in groups.': 'Chiavi nuove ogni mese nelle chat, ogni settimana nei gruppi.',
  'Linked devices work with the phone off.': 'I dispositivi collegati funzionano con il telefono spento.',
  'A new chat screen; QR codes from a photo; the Phone for small screens.': 'Una nuova schermata della chat; codici QR da una foto; il Telefono per schermi piccoli.',
  'Add as contact inside a group.': 'Aggiungi come contatto dentro un gruppo.',
  'Stickers in sets, moving, and your own.': 'Sticker in set, animati, e i tuoi.',
  'SMS inside the Erevos chat.': 'Gli SMS dentro la chat di Erevos.',
  'Android updates need the release computer’s signature.': 'Gli aggiornamenti Android richiedono la firma del computer delle versioni.',
  'An F-Droid build; Serbo-Croatian; new version numbers.': 'Una versione per F-Droid; il serbo-croato; nuovi numeri di versione.',
  'Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.':
    'Molto per la sicurezza: Argon2id, messaggi cifrati anche per il relay, un token per ogni telefono, nessun link avvia una chiamata.',
  // 0.1.16
  'Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.': 'Le importazioni da Telegram e WhatsApp portano foto, video, messaggi vocali e file.',
  'A phone without a relay talks through a place on a contact’s relay.': 'Un telefono senza relay comunica tramite un posto sul relay di un contatto.',
  // 0.1.14
  'Back to my chats, for hidden chats.': 'Riporta nelle mie chat, per le chat nascoste.',
  'Erevos receives and rings even after you swipe it away from the recent apps.': 'Erevos riceve e squilla anche dopo che lo togli dalle app recenti.',
  // 0.1.12
  'Hidden chats can say a message came.': 'Le chat nascoste possono dire che è arrivato un messaggio.',
  'Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.': 'Correzioni: menu, codici QR da una foto, Bluetooth su Android 17, elenchi lunghi.',
  // 0.1.11
  'The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.':
    'Il Telefono senza password, se lo permetti; un widget per la schermata principale; un filtro SMS ed Erevos.',
  // 0.1.10
  'Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.': 'I link aspettano la password; icone di Telefono e Contatti; l’ID Erevos su un contatto.',
  // 0.1.8
  '61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.':
    '61 nuove funzioni: 5 nuove lingue, dispositivi collegati, gruppi pubblici, risposte, reazioni, sondaggi, invio più tardi, Erevos come app per telefono e contatti, bridge Tor, l’impronta, Windows e altro.',
  // 0.1.7 to 0.1.2
  'SMS notices in the background.': 'Notifiche SMS in background.',
  'The web app comes out with every release.': 'La web app esce con ogni versione.',
  'Greek in the whole app.': 'Il greco in tutta l’app.',
  'Web Push in the web app.': 'Web Push nella web app.',
  'The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.':
    'La prima versione Android firmata: chat cifrate, chiamate, gruppi, chat nascoste, backup, importazioni, e telefoni vicini senza internet.',
  "**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls.":
    "**Due nuovi set di adesivi con 24 stati d'animo**: **Tux**, il pinguino di Linux così com'è disegnato, e **Aikido**, un aikidoka in keikogi e ampio hakama, che si inchina anche, siede in seiza e fa una capriola.",
};
