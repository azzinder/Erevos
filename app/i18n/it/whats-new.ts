// The Italian of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/it/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Novità',
  'What each version changed': 'Cosa è cambiato in ogni versione',
  'What each version of Erevos changed, the newest first.': 'Cosa è cambiato in ogni versione di Erevos, dalla più recente.',
  'Not out yet': 'Non ancora uscita',
  'This version': 'Questa versione',
  // Not out yet.
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
};
