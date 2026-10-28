/** The user guide in Italian. Its format: lib/guide.ts. The same sections, in the same order and shape, as the English one. */
export const guide = `
## Che cos’è Erevos {#about}

Erevos è un’app di messaggistica fatta per la privacy. Per usarla non ti servono un account, un numero di telefono o
un’email, ed è pensata per continuare a funzionare ovunque tu sia: tramite un telefono vicino senza alcuna rete, via
Wi-Fi o via internet.

- **Da vicino, senza internet:** due telefoni Android si parlano direttamente via Bluetooth, Wi-Fi Aware o Wi-Fi
  Direct, con crittografia end-to-end, e lo stesso fanno telefoni e computer sulla stessa rete Wi-Fi o sull’hotspot di
  un telefono. Con una radio LoRa, i testi arrivano a chilometri di distanza.
- **Tramite un relay:** via Wi-Fi o internet, attraverso un piccolo server (un relay) che puoi far funzionare tu stesso.
- **Spazi:** un blocco con password, una seconda password che apre un Erevos separato e vuoto, e chat nascoste in ogni
  spazio.
- **Aspetto:** gli stili di LPHL: Classic, Modernist e Nocturne, dodici tavolozze e il vetro come su lphl.nekten.eu.

> I messaggi sono **crittografati end-to-end**, sia tramite un relay sia da vicino, ma niente è stato ancora verificato
> da esperti indipendenti. [Che cosa è protetto oggi](#privacy) dice esattamente che cosa lo è e che cosa no.

Questa guida si apre da **Guida** nel menu della schermata principale (i tre puntini in alto). La ricerca in cima trova
qualsiasi parola al suo interno. La guida è in tutte le lingue dell’app, e appare in quella che hai scelto,
vedi [Lingua](#start).

### Chi lo fa, e perché

- **Chi:** Erevos è fatto dalla stessa persona che ha fatto FASOULI.
- **Dove:** non importa. Quello che conta è che il relay e l’app per il browser girano sul server di chi lo fa
  (lphl.nekten.eu).
- **Per chi:** per chiunque voglia parlare con le sue persone senza dare un numero di telefono, un’email o un
  account: amici, famiglie, gruppi, e chi vive dove internet viene tagliato o sorvegliato. E per chi, pur non avendo
  niente da nascondere, vuole tenere privato il proprio spazio personale, al riparo da occhi indiscreti.
- **Perché:** perché le app più note chiedono un numero di telefono, sanno chi parla con chi, e smettono di funzionare
  quando internet cade. Perché i «termini d’uso» di alcune non ci tutelano, e abbiamo dubbi su come proteggono la
  nostra privacy. Perché ad altre mancano funzioni di cui abbiamo bisogno. Erevos non chiede nulla, e trova una strada
  attraverso qualunque cosa ci sia: internet, il Wi-Fi, il Bluetooth, un telefono vicino.
- **Chi paga:** nessuno: niente pubblicità, niente investitori, nessuna raccolta di dati. Chi vuole può aiutare con i
  costi di gestione, come il server: **Impostazioni** → **Generali** → **Sostieni Erevos** ha i modi per farlo,
  Liberapay, PayPal, Monero e Bitcoin. Donare o no non cambia nulla nell’app.
  **Perché:** ogni modo si apre fuori da Erevos, nel browser o in un wallet, solo quando lo tocchi, quindi Erevos stesso
  non invia nulla e non sa mai chi ha donato. PayPal sa chi dona; Monero non mostra né chi ha donato né quanto; Bitcoin
  non mostra nomi, ma quello che l’indirizzo ha ricevuto è pubblico.

Questa parte si apre anche da **Impostazioni** → **Generali** → **Informazioni su Erevos**.

## Per iniziare {#start}

Erevos si scarica dalla sua pagina delle versioni, un file per ogni sistema: vedi [Aggiornamenti](#updates) per dove, e
per come aggiornarlo. Funziona su Android, su computer (Linux, macOS e Windows), su Sailfish OS e, dal browser, su
iPhone. Se sei nuovo, comincia con un invito da qualcuno che lo usa: un codice QR o un link, e sei dentro, con quella
persona già tra i tuoi contatti (vedi Invitare qualcuno di nuovo, in [Chat tramite un relay](#relay)).

La schermata principale è l’elenco delle tue chat, con in cima quella che si è mossa per ultima. Ognuna mostra
l’immagine del contatto, l’ultimo messaggio con i suoi segni, quando è arrivato, e quanti dei suoi messaggi non hai
letto. Un orologio accanto significa che i suoi messaggi scompaiono. **Cerca nelle chat** trova una chat dal nome o
dall’ultimo messaggio e, sotto le chat, i messaggi che contengono quello che scrivi, in tutte le chat dello spazio:
toccane uno per aprire la sua chat in quel punto. In una chat, i suoi dettagli hanno **Cerca in questa chat**: ▲ e ▼
vanno a quello che ha trovato prima e dopo. Entrambe cercano solo su questo telefono: in quello che conserva sigillato,
e **Cerca in questa chat** anche negli SMS che mostra la chat di un contatto; nelle chat nascoste si cerca solo dal loro
interno. Una chat lunga si apre ai suoi ultimi 100 messaggi, e quelli precedenti, tra cui quelli importati da Telegram
o WhatsApp, arrivano da soli man mano che scorri verso l’alto (li porta anche **Mostra i messaggi precedenti**, sopra
di loro); andare a uno precedente (dalla ricerca, da un messaggio importante o da quello a cui risponde un messaggio)
porta anche quello.
Se scorri un po’ verso l’alto, in basso a destra compaiono due frecce rotonde, in una chat, in un gruppo e in una
conversazione SMS allo stesso modo: quella in alto va all’inizio della chat, quella in basso torna alla fine.
Dall’inizio, **Mostra i messaggi successivi**, sotto quello che si vede, ne porta altri; scrivere un messaggio, o la
freccia in basso, riporta alla fine.

**Perché:** una chat lunga si apre ai suoi ultimi messaggi così si apre subito: disegnarla tutta in una volta sarebbe
lento, soprattutto sui telefoni più vecchi. Le chat nascoste restano fuori dalla ricerca della schermata principale
così che la schermata principale appaia uguale che uno spazio ne abbia o no: i loro messaggi si possono leggere solo
mentre il loro PIN le tiene aperte.

- **L’immagine** è disegnata dalla chiave del contatto: la stessa chiave dà sempre gli stessi colori e la stessa luna
  (nei verdi con Matrix), così riconosci una chat a colpo d’occhio senza nessuna foto. Non è una verifica della chiave;
  il [codice di sicurezza](#relay) lo è.
- **La riga sotto la ricerca** dice se è impostato un relay e se la tua coda è pronta. Toccala per impostarne uno.
- **Chat con me stesso**, sempre prima tra le chat, con una puntina, contiene le tue note per te stesso: vedi Chat con
  me stesso e promemoria più sotto.
- **Le chat Matrix**, una volta che hai fatto l’accesso a Matrix, sono nell’elenco con le altre, le più recenti
  prima, ognuna segnata **Matrix**, e un invito compare in cima. Il chip **Matrix** mostra solo loro, e lì
  **Nuova chat** avvia una chat Matrix: vedi [Matrix](#matrix).
- **Nuova chat**, in basso, apre le impostazioni del relay e l’aggiunta di un contatto. **Ricordamelo**, la campanella
  arancione accanto, scrive un promemoria per te.
- **La cornetta verde e la persona viola** in alto, su Android, aprono subito **Telefono** e **Contatti**, nei colori
  delle loro icone sulla schermata Home del telefono. Non sono anche nel menu dei tre puntini.
- **Tutti**, **SMS** ed **Erevos**, sopra le chat quando ci sono anche conversazioni SMS, mostrano tutte le chat, solo
  gli SMS (con le chat il cui ultimo messaggio era un SMS), o solo le chat Erevos, di ogni contatto quello che è
  arrivato per ultimo.
- **Il widget**, su Android: aggiungi Erevos dai widget della schermata Home. I suoi quattro pulsanti aprono
  **Telefono**, gli **SMS**, i **Messaggi** di Erevos e **Contatti**, dopo la password come qualsiasi link (il Telefono
  senza, se lo permetti). Sopra i primi tre mostra quante chiamate perse, SMS non letti e nuovi messaggi ci sono, mai
  chi o cosa; con chiamate perse, **Telefono** si apre su **Recenti**. Un pulsante toccato di nuovo mostra di nuovo la
  sua schermata, anche dopo che lì hai scelto un’altra scheda. Le sue parole seguono la lingua di Erevos.
  **Impostazioni** → **Aspetto** → **Widget** imposta l’ordine dei suoi pulsanti.
- **Il lucchetto arancione** in alto blocca subito Erevos quando è impostata una password, o apre le impostazioni del
  blocco se non lo è.
- **I tre puntini** aprono il resto:

| Nel menu | Cosa apre |
| --- | --- |
| **Nuovo gruppo** | Una chat di gruppo con i tuoi contatti. Vedi [Chat di gruppo](#groups). |
| **Gruppi pubblici** | Un gruppo in cui chiunque abbia il suo link può chiedere di entrare, con un proprietario e degli admin. Vedi [Gruppi pubblici](#public-groups). |
| **Messaggi importanti** | I messaggi che hai segnato come importanti, in tutte le tue chat. Vedi Il menu di un messaggio, in Chat tramite un relay. |
| **Telefoni vicini** | I tuoi contatti via Bluetooth e Wi-Fi Aware, o sulla stessa rete Wi-Fi, senza internet. Vedi [Chat con un telefono vicino](#nearby). |
| **Guida** | Questa guida. |
| **Impostazioni** | L’ultima riga, con un ingranaggio: tutto quello che puoi impostare, in gruppi, con una ricerca. Vedi Impostazioni più sotto. |

Dentro una chat, in alto ci sono il suo nome e la sua immagine, con il modo in cui viaggia: **Crittografato**
(end-to-end), **Online**, **Vicino** mentre il suo telefono è collegato al tuo via radio, o **sta scrivendo…**, con un
cronometro quando i messaggi della chat scompaiono. Accanto, il riquadro blu con una videocamera avvia una
videochiamata e quello verde con una cornetta una chiamata vocale. Tocca il nome, o **⋯** dopo di loro (**⋮** su
Android), per i **Dettagli** della chat: la sua immagine (toccala per cambiarla), **Chiama**, **Video**, **Rinomina** e
**Immagine**, poi **Messaggi effimeri**, **Mostrati offline**, **Aspetto della chat**, il **Codice di sicurezza**,
**Sposta nelle chat nascoste** ed **Elimina messaggi**. **Fatto** li chiude.

**Media, link e file**, nei dettagli sotto **Cerca in questa chat**, elenca quello che contiene la chat, ogni tipo
nella sua scheda con quanti ce ne sono: **Foto** (in una griglia), **Video**, **Messaggi vocali**, **Musica**, **File**
e **Link**, i più recenti per primi sotto i loro mesi, anche quelli importati da Telegram o WhatsApp. Un tocco apre una
foto o un file da guardare o salvare, riproduce un suono lì stesso, o apre un link dopo averlo chiesto; tenuto premuto,
ognuno offre **Mostra nella chat**, che va al suo messaggio. Per uno non ancora preso dal relay si va al suo punto nella
chat, dove un tocco lo prende. Il calendario in alto va a un giorno: i giorni che hanno qualcosa di quel tipo sono
segnati. **Vai a un giorno**, sotto nei dettagli, fa lo stesso per la chat stessa: va al primo messaggio di quel
giorno.

**Perché:** gli elenchi sono fatti su questo telefono da quello che conserva già, così nessun server sa che cosa
contiene una chat; e vengono lette solo le foto sullo schermo, come nella chat, così una chat con migliaia di foto si
apre veloce come una che non ne ha.

Una buona prima ora:

1. Apri **Impostazioni** → **Privacy e sicurezza** → **Blocco e seconda password** e imposta una password, così nessuno
   che prenda in mano il telefono può aprire Erevos.
2. Apri **Telefoni vicini** dal menu su due telefoni vicini tra loro, e consenti quello che chiede Android.
3. Aggiungetevi a vicenda con **Mostra il mio codice QR**, come in [Chat con un telefono vicino](#nearby), e invia un
   messaggio: va da vicino, crittografato end-to-end, senza relay e senza internet.
4. Per parlare da più lontano, imposta un relay come in [Chat tramite un relay](#relay).

### Chat con me stesso e promemoria

**Chat con me stesso** è sempre in cima alle chat, con una puntina, in ogni spazio. È una chat senza nessun altro
dentro: scrivi a te stesso note, link, foto, file e messaggi vocali, come in qualsiasi chat. Niente di quello che
contiene va da qualche parte: resta su questo telefono, crittografato nello spazio, e non viene passato ai tuoi
dispositivi collegati. Un backup prende le sue note e i suoi messaggi vocali, ma non le foto e i file, come per le chat.

- **Un promemoria:** tocca **Ricordamelo** (la campanella arancione accanto a **Nuova chat**), scrivi di che cosa
  ricordarti, scegli un’ora (**Tra 1 ora**, **Stasera 20:00**, **Domani 09:00**, o qualsiasi giorno, ora e minuto) e
  tocca **Ricordamelo**. Va nella Chat con me stesso, con una campanella e la sua ora. Nella chat, **+** →
  **Ricordamelo**, o tenere premuta la freccia di invio, dà un’ora anche alla nota che scrivi.
- **All’ora stabilita**, su Android, il telefono mostra una notifica, **Reminder** (o **3 reminders**) – «Open Chat
  with myself to read it», mai quello che dice, anche con Erevos chiuso e bloccato; se la tocchi, apre la Chat con me
  stesso, dopo la password. Finché non apri la chat, il promemoria appare sulla sua riga in cima alle chat, con un
  conteggio, e nella chat con un bordo colorato; visto lì, se ne va anche dalla notifica. Su un computer, nella web
  app, o con le notifiche disattivate, è lì che lo vedi. Se **Orari esatti** non è consentito (**Impostazioni** →
  **Generali** → **Autorizzazioni**), Android può mostrarlo con qualche minuto di ritardo.
- **Tenendo premuta una nota** hai **Copia**, **Apri** (una foto o un file), **Ricordamelo**, oppure **Cambia il
  promemoria** e **Nessun promemoria**, ed **Elimina**.
- Ogni spazio ha una sua Chat con me stesso, e così anche ogni posto di chat nascoste, in cima al loro elenco (vedi
  [Chat nascoste](#hidden)). I promemoria di un posto nascosto appaiono lì quando il suo PIN lo apre; il telefono li
  annuncia alla loro ora solo mentre **Ricevere da chiuse** è attivo per quel posto, nella stessa notifica. Un nuovo PIN
  per il posto, che lo fa ripartire vuoto, o la rimozione del posto tolgono i suoi promemoria dal telefono.

**Perché:** una notifica appare sullo schermo bloccato a chiunque abbia in mano il telefono, quindi quello che dice un
promemoria resta crittografato nel suo spazio e ad Android viene detta solo la sua ora: la notifica non può dire a
nessuno che cosa volevi ricordare, né in quale spazio si trova. E le note non vanno a nessuno, nemmeno agli altri tuoi
dispositivi, quindi nessun relay le trasporta mai.

### Spostarsi con gli scorrimenti

- **Indietro:** scorri verso destra in qualsiasi punto di una schermata per tornare indietro, come fa la freccia
  indietro. Da sinistra esce una freccia rotonda; lascia quando è completa, o fai un colpo rapido, e sei tornato
  indietro. Se lasci prima, resti dove sei. In una chat fa quello che fa la sua freccia indietro: torna all’elenco delle
  chat, o esce dalle chat nascoste, chiudendole. Nei **Dettagli** di una chat li chiude.
- **Schede:** scorri verso sinistra o verso destra per andare alla scheda accanto, come quando tocchi la sua etichetta:
  **Tutti**, **SMS** ed **Erevos** nella schermata principale, **Tastierino**, **Recenti** e **Preferiti** in
  **Telefono**, i filtri in **Contatti**, e le serie di sticker.
- In una schermata con schede, uno scorrimento cambia solo la scheda, anche sulle righe del suo elenco, e oltre la
  prima o l’ultima scheda non fa nulla: torna indietro con la freccia indietro. Una conversazione SMS si archivia o si
  elimina tenendola premuta.

### Impostazioni

**Impostazioni**, l’ultima riga del menu (i tre puntini), contiene tutto quello che puoi impostare in Erevos, in
gruppi, come fanno le impostazioni di un telefono. Nelle lingue diverse dall’inglese ha il nome in quella lingua e in
inglese, come **Impostazioni · Settings**, così la trovi anche in una lingua che non sai leggere.

- **Cerca nelle impostazioni,** in alto, trova un’impostazione dall’inizio delle sue parole, con o senza accenti, e
  mostra dove si trova, come **Telefono e SMS › SMS**. Toccala per aprirla.
- **Lingua · Language,** la riga sotto la ricerca, apre l’elenco delle lingue, vedi Lingua più sotto.
- **Un gruppo** apre l’elenco delle sue impostazioni, e un’impostazione apre la sua schermata. Un’impostazione con
  parti, come **SMS**, le elenca, e ogni parte si apre da sola.
- **Si vede solo ciò che funziona qui:** su un computer, su Sailfish OS e nella web app non ci sono **Telefono e SMS**,
  Tor, Nostr o LoRa, e un gruppo senza niente da impostare qui non appare.

| Gruppo | Cosa contiene |
| --- | --- |
| **Generali** | **Lingua**, **Aggiornamenti** e **Autorizzazioni** (Android e la web app). Vedi Lingua più sotto, e [Aggiornamenti](#updates). |
| **Aspetto** | **Stile e colori** (finitura, vetro, stile, tema, colori e testo sulle aree colorate, con l’anteprima), **Sfondo**, **Messaggi** (la forma delle nuvolette), **Icone del launcher** (Android) e **Widget** (Android). Vedi [Aspetto](#appearance). |
| **Notifiche** | **In background** (Android): ricevere e squillare mentre Erevos è chiuso, e l’avviso dei messaggi. **Notifiche ad app chiusa** (la web app): Web Push. **Numero sull’icona**: quanti messaggi non sono stati letti, sull’icona di Erevos. Vedi [Su iPhone](#iphone). |
| **Privacy e sicurezza** | **Blocco e seconda password** (blocco all’apertura di Erevos, la password, la privacy dello schermo, impronta o volto, la seconda password), **Chat nascoste** (i PIN dei 4 posti) e **Questa web app** (solo la web app). Vedi [Blocco con password](#lock), [Seconda password](#second) e [Chat nascoste](#hidden). |
| **Relay e reti** | **Relay** (apre **Nuova chat** con **Per utenti esperti** aperto), **Relay di casa**, **Tor** (Android), **Nostr** (Android), **Radio LoRa** (Android) e **Matrix**. Vedi [Chat tramite un relay](#relay), [Relay di casa](#home-relay), [Tramite Tor](#tor), [Tramite Nostr](#nostr), [Con una radio LoRa](#lora) e [Matrix](#matrix). |
| **Telefono e SMS** (Android) | **Telefono**, le impostazioni dell’app Telefono, le stesse di **Telefono** → **Impostazioni**. **SMS**, in parti: **Erevos come app per gli SMS**, **Scopri Erevos dietro un numero**, **Nomi dai tuoi contatti**, **Archiviate, Spam e Cestino**, **Filtro antispam**, **Numeri bloccati**, **Annullare l’invio di un SMS**, **Due SIM** (solo con due SIM) e **Nuovo SMS**. Vedi [Telefono](#phone) e [SMS](#sms). |
| **Dati e dispositivi** | **Backup**, **Dispositivi collegati** e **Chat importate**. Vedi [Backup](#backup), [Dispositivi collegati](#devices) e [Chat importate](#import). |
| **Per i test** | **Test del relay** e **Test radio** (Android). Vedi [Le schermate di test](#tests). |

### Lingua

Erevos è in inglese, greco, tedesco, francese, spagnolo, italiano, portoghese e serbo-croato. La prima volta che si
avvia, segue la lingua del telefono se è una di queste (un telefono in serbo, croato, bosniaco o montenegrino parte in
serbo-croato), altrimenti è in inglese. Per cambiarla, apri il menu (i tre puntini), tocca **Impostazioni**, la sua
ultima riga, e poi la prima riga lì, **Lingua · Language**. Nelle lingue diverse dall’inglese entrambe hanno il nome in
quella lingua e in inglese, come **Impostazioni · Settings** e **Lingua · Language**. Poi tocca la lingua, ognuna
chiamata con le sue parole: **Ελληνικά**, **English**,
**Deutsch**, **Español**, **Français**, **Italiano**, **Português** o **Srpskohrvatski**. Tutta l’app cambia
subito.

- **Questa guida** è anche lei in ciascuna di queste lingue, e chiama i pulsanti come li mostra l’app nella tua. Nelle
  lingue diverse dall’inglese e dal greco, una parola nuova nell’app può apparire in inglese per un po’, finché non
  viene tradotta.
- **Salvata sul telefono:** la scelta è salvata su questo telefono, fuori da ogni spazio, quindi anche la schermata
  della password appare in quella lingua, e ogni spazio si apre in quella lingua. Non è sigillata: chi ha in mano il
  telefono può vedere quale lingua hai scelto.
- **Gli avvisi di Android** (una chiamata in arrivo, nuovi messaggi, Erevos che riceve in background) sono in greco
  quando lo è Erevos, e in inglese in tutte le altre lingue.

## Chat con un telefono vicino {#nearby}

Mentre uno spazio è aperto, su qualsiasi schermata, Erevos cerca altri telefoni con Erevos intorno a sé, via Bluetooth
e, dove il telefono ce l’ha, Wi-Fi Aware, e sulla rete Wi-Fi a cui è collegato, telefoni e computer allo stesso modo.
Non servono internet, SIM o una rete Wi-Fi. Porta i messaggi ai tuoi contatti, crittografati end-to-end come quelli
tramite il relay.

1. Apri **Telefoni vicini** dal menu su entrambi i telefoni. La prima volta, Android chiede di trovare i dispositivi
   vicini (su Android 12 e precedenti, anche per la posizione); consentilo, o i telefoni non possono trovarsi.
2. Se non siete ancora contatti, aggiungetevi a vicenda: su un telefono tocca **Nuova chat**, poi **Mostra il mio
   codice QR** (sotto **Inizia senza relay** finché non ha un relay), e scansionalo con l’altro, come in [Chat tramite
   un relay](#relay). Senza un relay il codice contiene solo le tue chiavi, e vi raggiungete solo da vicino, finché non
   ne avete uno.
3. Scegli il contatto, scrivi nella barra dei messaggi in basso e tocca la freccia di invio. Appena il suo telefono
   risponde, in cima alla chat c’è scritto **Vicino**.

- **Mentre uno spazio è aperto:** i collegamenti partono quando si apre uno spazio, qualunque schermata sia visibile, e
  si fermano quando si apre un altro spazio: se è bloccato, lo spazio continua dietro la schermata della password. Un
  messaggio da vicino appare nella schermata principale come uno arrivato tramite il relay, e anche una chiamata squilla
  lì. Su Android restano attivi con Erevos in background, mentre **In background** è su **Ricevi e squilla**. Per
  risparmiare la batteria, in quel caso cerca i telefoni meno spesso: Wi-Fi Direct ogni dieci minuti, Wi-Fi Aware un
  minuto ogni cinque, e sulla stessa rete Wi-Fi ascolta gli altri venti secondi ogni due minuti. Così un telefono
  vicino può essere trovato qualche minuto dopo; i collegamenti già attivi restano attivi, e appena Erevos è visibile
  cerca con la stessa frequenza di prima.
- **Portata:** qualche decina di metri all’aperto, meno attraverso i muri.
- **Wi-Fi Aware:** più veloce, ma non tutti i telefoni ce l’hanno. Il Bluetooth funziona su tutti. Per fermarlo,
  disattiva **Cerca con Wi-Fi Aware**, sopra **Trova Erevos sulla stessa rete Wi-Fi**.
- **La stessa rete Wi-Fi o un hotspot:** i telefoni su una stessa rete Wi-Fi, o sull’hotspot di un telefono, si
  trovano e si parlano direttamente, anche quando quella rete Wi-Fi non ha internet; anche l’app desktop. Se Android
  chiede se restare su una rete Wi-Fi senza internet, resta. Chiunque sia su quella rete Wi-Fi può capire che lì c’è
  un’app Erevos, non di chi. Il firewall di un computer deve lasciar entrare la porta 47905 (UDP e TCP). Per fermarlo,
  disattiva **Trova Erevos sulla stessa rete Wi-Fi** sotto **Vicino, senza internet**, in **Nuova chat**.
- **Una rete Wi-Fi tutta loro (Android 10 e successivi):** senza una rete Wi-Fi in comune, due telefoni con Erevos
  vicini creano una piccola rete Wi-Fi tutta loro (Wi-Fi Direct) e si parlano attraverso di essa come sulla stessa
  rete Wi-Fi: più veloce del Bluetooth, e una chiamata ci passa senza internet. Non chiede nulla; dove può, ogni
  telefono resta anche sulla sua rete Wi-Fi. Chiunque sia vicino può capire che lì c’è un telefono con Erevos, e
  potrebbe entrare in quella piccola rete Wi-Fi, ricevendo solo byte sigillati. Richiede **Trova Erevos sulla stessa
  rete Wi-Fi** attivo; per fermare solo questo, disattiva **Crea una rete Wi-Fi con i telefoni vicini** sotto.
- **Su un telefono Samsung** **Cerca con Wi-Fi Aware** e **Crea una rete Wi-Fi con i telefoni vicini** sono
  disattivati finché non li attivi: mentre un’app li usa, Samsung chiede di disattivare la sua condivisione. Il
  Bluetooth e la stessa rete Wi-Fi funzionano anche senza.
- **Gli altri telefoni vicini** ricevono solo byte sigillati che non possono aprire, e solo finché il telefono del tuo
  contatto non è noto: da quel momento quello che invii va solo a lui. I messaggi vocali vanno solo a un contatto che
  si sa essere vicino. Foto e file richiedono il relay.
- **Con anche un relay,** ogni messaggio passa anche da lì, così niente va perso se il collegamento cade; la copia che
  arriva per seconda non viene mostrata di nuovo. Se il relay non è raggiungibile, conta la copia arrivata da vicino.
- **Trasportati da altri telefoni:** quando il relay non è raggiungibile e il tuo contatto non è vicino, anche i
  telefoni con Erevos vicini prendono il tuo messaggio sigillato per il relay del tuo contatto. Ognuno lo conserva, al
  massimo tre giorni, lo dà al massimo ad altri due telefoni che incontra, e lo consegna a quel relay tramite il
  proprio relay appena può; lo stesso fa il tuo. Non possono leggerlo, né capire da chi viene o per chi è: vedono solo
  l’indirizzo del relay. Resta anche quando Erevos si chiude, sigillato sul telefono. I tuoi restano nel tuo spazio, e
  partono solo mentre è aperto. Il trasporto per altri è disattivato finché non attivi **Trasporta messaggi per altri**
  sotto **Vicino, senza internet**, in **Nuova chat**, e anche allora solo per relay su internet tramite TLS (wss://):
  uno sconosciuto vicino non fa mai raggiungere al tuo telefono, o al tuo relay, uno su una rete locale o sul telefono
  stesso. I tuoi messaggi vengono trasportati dai telefoni vicini che lo hanno attivo.

**Perché:** un pacchetto non dice per chi è, quindi nessuno vicino può capire da esso di chi sia. Finché il telefono
del tuo contatto non risponde su un collegamento, nemmeno il tuo telefono può capire quale dei telefoni vicini sia il
suo: così i pacchetti brevi vanno a tutti, ognuno li prova, e dal primo che si apre, quel collegamento è del tuo
contatto. Un messaggio vocale, in pezzi più grandi, aspetta questo momento.

> Un messaggio da vicino si apre solo nello spazio che ha quel contatto. Uno per un altro spazio di questo telefono
> aspetta in memoria, al massimo sei ore, finché quello spazio non si apre. Le chat nascoste non usano mai il
> collegamento da vicino.

**Perché:** i collegamenti da vicino appartengono al telefono, non a uno spazio, e niente in essi ne nomina uno: quello
che arriva viene provato nelle chat dello spazio aperto, e conservato per un po’ in memoria per gli altri, mai scritto
sul telefono. Le chat nascoste non li usano ancora: arriverà più avanti (vedi [Che cosa è protetto oggi](#privacy)).

## Con una radio LoRa {#lora}

Con una radio LoRa Meshtastic collegata al telefono via Bluetooth, Erevos raggiunge un altro Erevos con una radio sulla
stessa mesh, a chilometri di distanza, senza internet: direttamente, o attraverso le radio Meshtastic che stanno in
mezzo. È disattivato finché non imposti una radio, e solo su Android.

1. Prima configura la radio nell’app Meshtastic, soprattutto la sua **regione**: senza, non trasmette nulla. Poi
   chiudi l’app Meshtastic, o scollegala da lì: una radio si collega a un’app alla volta.
2. Apri **Impostazioni** → **Relay e reti** → **Radio LoRa**, tocca **Trova la mia radio**, leggi quello che dice, e
   tocca la tua radio quando appare. Una radio non ancora associata chiede il suo PIN: appare sullo schermo della radio,
   oppure è 123456.
3. Il tuo contatto fa lo stesso con la sua, sulla stessa mesh: la stessa regione e lo stesso primo canale.
4. Scrivi come sempre. Quando il relay non è raggiungibile e nessun telefono è vicino, un testo va via LoRa,
   e la riga sotto la chat lo dice.

- **Solo testo, e lentamente:** un messaggio va in pezzi di circa 220 byte, ognuno un secondo o due in onda, e la legge
  concede a una radio solo un certo tempo di trasmissione (nell’UE, un decimo di ogni ora). Così LoRa trasmette solo
  testi ed eliminazioni, e solo quando nient’altro lo fa. I messaggi vocali, le foto e i file aspettano nella chat,
  segnati **In attesa**, e partono da soli appena il relay o un telefono vicino può riceverli; anche le chiamate hanno
  bisogno di uno dei due. Il primo messaggio a un contatto ci mette di più, perché contiene le chiavi.
- **Segni:** **✓✓** arriva con il suo messaggio successivo, perché i segni da soli non vanno via LoRa.
- **A tutte le radio a portata:** ogni messaggio viene sentito da tutte le radio intorno, e ritrasmesso dalle radio
  Meshtastic, come fa Meshtastic. Ogni Erevos lo prova; solo quello del tuo contatto lo apre. Via LoRa non si trasporta
  niente per altri.
- **Il suo nome e dove si trova:** le radio Meshtastic annunciano ogni tanto il loro nome a tutte le radio a portata, e
  dove si trovano se hanno il GPS o una posizione fissa, in chiaro. Erevos impedisce alla tua di farlo (**Tenuti
  nascosti**): imposta il suo ruolo su Client hidden, spegne il suo GPS e toglie una posizione fissa. Risponde comunque
  a una radio che chiede il suo nome, quindi dalle un nome che non dica niente di te, nell’app Meshtastic.
  **Annunciati a tutti quelli a portata** rimette il suo ruolo e il GPS, dopo un avviso; una posizione fissa si
  reimposta nell’app Meshtastic. Se la radio non mantiene le impostazioni, la schermata LoRa lo dice.
- **Resta collegata** mentre Erevos è in funzione, e si ricollega da sola quando la radio torna a portata. **Disattiva
  LoRa** restituisce alla radio il suo ruolo e il GPS, se è collegata, poi la scollega e la dimentica. Le chat nascoste
  non passano mai via LoRa.

**Perché:** quello che una radio Meshtastic dice di sé va in chiaro, a chiunque ascolti a chilometri di distanza: il
suo nome e dove si trova potrebbero mostrare dove sei e collegare la radio a te, quindi Erevos la tiene in silenzio a
meno che tu non scelga altrimenti. E poiché la legge concede a una radio solo un certo tempo di trasmissione, LoRa è
riservata ai tuoi testi, quando nient’altro può trasmetterli, mai a quello che altri telefoni le farebbero trasportare.

> Una radio LoRa si sente a chilometri di distanza, e il suo segnale può essere seguito fino a dove si trova, che sia
> in silenzio o no. Quello che Erevos invia resta crittografato end-to-end, ma chiunque abbia una radio può capire che
> la tua trasmette, quando e quanto. Con **Annunciati a tutti quelli a portata**, chiunque abbia una radio può anche
> leggere il suo nome e dove si trova.

## Chat tramite un relay {#relay}

Un relay è un piccolo server che tiene code a senso unico: ogni telefono ha la sua coda, e chiunque abbia il suo **link
di contatto** può lasciarvi dei messaggi. Il relay non ha account, nomi o numeri di telefono, e non può leggere i
messaggi: sono crittografati end-to-end, e solo i due telefoni hanno le chiavi. Ogni telefono può usare un suo relay: un
messaggio a un contatto su un altro relay viene sigillato per il suo e consegnato al tuo, che lo passa oltre, così il
suo relay non vede mai l’indirizzo del tuo telefono. Un telefono senza relay riceve un posto su quello del suo
contatto, vedi **Nessun relay tuo** più sotto.

**Perché:** con le code e senza account, nessun server ha un elenco di chi conosce chi, e nessuno ha bisogno del tuo
numero di telefono o della tua email per raggiungerti: chi ha il tuo link di contatto può scrivere nella tua coda, e
solo tu la leggi.

1. Nella schermata principale, tocca **Nuova chat**. In alto, **Come ti colleghi ora** dice in parole semplici come ti
   raggiungono i tuoi contatti: tramite il tuo relay, tramite Nostr senza relay, o solo da vicino. Sotto ci sono i modi
   per entrare per un telefono ancora senza relay, oppure, con un relay, **Aggiungi un contatto** e **Il tuo link di
   contatto**. Le impostazioni del relay stesso sono in **Per utenti esperti**, in fondo; **Impostazioni** → **Relay e
   reti** → **Relay** apre Nuova chat con queste impostazioni aperte.
2. In **Per utenti esperti**, scrivi l’**Indirizzo del relay**: \`ws://<indirizzo del computer>:7879\` per un relay sulla tua
   rete, o \`wss://relay.example.org\` per uno su internet. Aggiungi il **Token** se il relay lo richiede.
3. Tocca **Crea la mia coda sul relay**. Erevos dice **Coda sul relay creata**, e **Come ti colleghi ora** dice
   **Tramite il tuo relay**: funziona tutto, testi, foto, messaggi vocali, chiamate e gruppi.
4. In **Il tuo link di contatto**, tocca **Mostra il mio codice QR**: si apre sopra la schermata. Fallo scansionare
   all’altro telefono con la fotocamera, poi apri il link in Erevos. La schermata **Aggiungi un contatto** mostra cosa
   contiene: tocca **Aggiungi alla chat** solo se l’hai scansionato tu stesso. **Aggiungi e collega a uno dei miei
   contatti** aggiunge anche lui, collegato al contatto che scegli, di cui la chat prende il nome.
5. Se la sua fotocamera mostra solo il testo, o se è lontano, tocca **Condividi il mio link di contatto** e mandaglielo.
   Lo incolla nel campo sotto **Aggiungi un contatto** e tocca **Aggiungi**.
6. Oppure al contrario: in **Aggiungi un contatto**, tocca **Fotografa il codice QR** sul suo schermo, o **Scegli una
   foto del codice QR** per uno screenshot o una sua foto che ti ha mandato. Erevos lo legge e lo aggiunge subito. Su un
   computer, su Sailfish OS e nella web app c’è solo **Scegli una foto del codice QR**; su iPhone offre anche la
   fotocamera. Le chat nascoste non hanno né l’uno né l’altro, perché una foto esce da Erevos, che le chiude: incolla lì
   il suo link.

La nuova chat appare nella schermata principale con il nome **contatto** e i primi caratteri della sua chiave, finché
non ha un nome: **Rinomina** nei suoi dettagli gliene dà uno. Subito dopo averlo aggiunto qui, **Collega a uno dei miei
contatti** sotto l’avviso che è stato aggiunto ti lascia scegliere invece uno dei tuoi contatti (**Non ora** lo lascia
così): la chat prende il nome di quel contatto, se non ne ha uno suo, e la scheda del contatto mostra la chat. Le chat
nascoste offrono solo i loro contatti, mai quelli del telefono. Basta che un telefono aggiunga l’altro: aggiungere un
link avvia una conversazione crittografata e dice all’altro telefono come rispondere, così elenca la chat la prossima
volta che controlla la sua coda, cosa che fa ogni pochi secondi.

**Che cosa vede il relay di una chat:** tutti i tuoi contatti scrivono nella tua unica coda. Appena ogni telefono ha
ricevuto un messaggio dall’altro, ogni messaggio tra loro viene sigillato un’altra volta per il telefono a cui va, con
una chiave che quel telefono ha dato dentro la chat, così per il relay ognuno è fatto di byte casuali di una tra poche
dimensioni, e non può capire da essi a quale conversazione appartengano. Il primo messaggio di una chat, e quelli
inviati prima che arrivi la risposta, lo mostrano ancora. Il relay vede comunque quale indirizzo deposita ogni
messaggio, e quando. E ognuno dice al relay, in un byte che legge, che cosa trasporta: un messaggio che qualcuno legge,
una comunicazione tra telefoni (che un messaggio è arrivato o è stato letto, la scrittura in corso, l’essere online, le
reazioni, nuove chiavi), o una chiamata che squilla. Così il relay vede quali sono messaggi, e quando inizia una
chiamata, che le notifiche siano attive o no: è così che l’avviso di una web app chiusa può contarli, e l’avviso delle
chat nascoste chiuse.

### Modi per entrare nel relay

Un relay che richiede un token fa entrare un telefono in tre modi. Ogni modo finisce con un token tutto del telefono
lì, così chi gestisce il relay può togliere un singolo telefono da solo.

- **Un invito:** un codice QR o un link da un telefono già sul relay (vedi Invitare qualcuno di nuovo più sotto). Niente
  da scrivere, e siete subito contatti.
- **Un account:** **Accedi con LPHL**, quando il relay lo offre (vedi Accedere al relay più sotto). Qualsiasi account
  LPHL può farlo, su un massimo di 10 telefoni.
- **Il token del relay:** l’unico token condiviso, da chi gestisce il relay, scritto in **Token**. Erevos lo scambia
  subito, da solo, con un token tutto del telefono, con il nome che lì dai a te stesso negli inviti (\`phone\` se non
  hai dato un nome), lo dice, e da allora usa solo quello. Così anche questo telefono può invitare. Serve un relay che
  accetti inviti, successivo a Erevos 3.1.0; con uno più vecchio, o con uno che non accetta inviti, il telefono tiene il
  token del relay e non può invitare.
- **I limiti:** un telefono può avere 5 inviti in attesa insieme e farne 10 al giorno (il giorno secondo l’UTC); ognuno
  è per un telefono e dura 7 giorni. Il relay fa entrare in tutto 100 telefoni su invito, contando anche gli inviti
  ancora in attesa, a meno che il suo gestore non abbia scelto diversamente. I telefoni entrati con un account o con il
  token del relay non contano in quei 100: il relay dà un token tutto loro a 50 telefoni al giorno entrati con il suo
  token, e un account ha 10 telefoni. Il relay serve 512 connessioni insieme, chiunque siano, a meno che il suo gestore
  non abbia scelto diversamente.
- **Togliere un telefono:** chi gestisce il relay cancella la sua riga nel file dei token del relay: non può più usare
  il relay, e nemmeno i telefoni che ha invitato. Se ha mai avuto il token del relay, cambia anche quel token, così non
  può tornare con quello. I telefoni con un token tutto loro continuano come sono: solo un telefono che ha ancora
  scritto il vecchio token (non aperto da allora, o con un Erevos più vecchio) ha bisogno di quello nuovo.
- **Le chat nascoste** tengono il token del relay scritto per loro: scambiarlo nello stesso momento di quello dello
  spazio mostrerebbe al relay che sono di questo telefono. Quando il token del relay cambia, scrivi quello nuovo nel loro
  **Per utenti esperti**.

**Perché:** il relay dà a ogni connessione un suo thread, quindi ne serve solo un certo numero insieme; e aggiunge solo
un certo numero di righe al giorno per i telefoni entrati con il suo unico token, così un token finito dove non doveva
non può riempire il suo file dei token.

### Invitare qualcuno di nuovo

Un codice QR o un link fa entrare qualcuno di nuovo: il suo telefono entra in Erevos sul tuo relay, con un accesso
tutto suo, senza scrivere nulla, e siete subito l’uno contatto dell’altro, senza richiesta di messaggio.

- **Per invitare:** nelle chat, senza nessun contatto scelto, tocca **Invita qualcuno**. Scrivi per chi è (il suo nome
  nelle tue chat) e, se vuoi, **Il tuo nome, per quella persona**, poi tocca **Crea l’invito**. Si apre un codice QR:
  quando Erevos è sul suo telefono, lo scansiona con la fotocamera e apre il link in Erevos, oppure tocca **Condividi
  l’invito** e mandagli il link. È per una persona, per 7 giorni, o meno se l’invito al relay finisce prima. Chi lo
  prende per primo lo ha, quindi dallo solo a quella persona.
- **Per entrare:** su un telefono ancora senza relay, **Nuova chat** mostra **Scegli come iniziare**: tocca **Ho un
  invito**. Scansiona l’invito con la fotocamera e apri il link in Erevos, oppure tocca **Scatta una foto dell’invito**
  o **Scegli una foto dell’invito**, o incolla il link e tocca **Partecipa**. Il link apre **… ti invita su Erevos**:
  tocca **Partecipa** solo se è arrivato da quella persona. Erevos prende un accesso tutto suo al suo relay e una coda
  lì, la aggiunge e dice **Benvenuto su Erevos**. Il suo primo messaggio lo dice al suo telefono, che aggiunge subito
  questo come contatto, con il nome che ha scritto.
- **Con un account invece:** **Accedi con LPHL**, il secondo modo per entrare, fa accedere questo telefono al relay di
  LPHL con un account LPHL, nel browser (vedi Accedere al relay più sotto); poi aggiungi i tuoi contatti con i loro
  inviti o link. Il terzo, **Inizia senza relay**, è in Senza nessun relay, in Tramite Nostr. **Per utenti esperti** ha
  le impostazioni del relay, come in 1–6 sopra.
- **Cosa deve permettere il tuo relay:** l’accesso tutto suo è un invito al tuo relay (vedi Inviti al relay più sotto),
  quindi arriva solo da un telefono con un token tutto suo su un relay che accetta inviti. Conta tra i tuoi inviti, con
  il nome che hai scritto per quella persona, e va insieme al tuo. Un telefono con l’unico token condiviso del relay lo
  scambia prima con uno tutto suo (vedi Modi per entrare nel relay sopra); dove il relay non lo fa, non crea nessun
  invito: prima accedi al relay (sotto il **Token**, in **Per utenti esperti**), o prendi un invito per il relay. Quando
  il tuo relay non accetta inviti, l’invito vi rende comunque contatti, e il suo telefono usa il tuo relay solo come
  glielo permette il tuo link di contatto, come in Nessun relay tuo più sotto.
- **Un telefono che ha già un relay** tiene il suo: l’invito aggiunge solo te, e siete subito contatti lo stesso.
- **Che cosa viene conservato:** il tuo telefono conserva il segreto di ogni invito e il nome per quella persona,
  sigillati nello spazio, finché non viene usato o finiscono i suoi 7 giorni, al massimo 20 insieme. Sul relay non c’è
  niente di tutto questo, tranne l’invito al relay.
- **Via SMS, a chi non ha ancora Erevos:** su Android, la scheda di un contatto che non è in Erevos ha **Invita via
  SMS**. Scrive un SMS al suo primo numero con un link breve, nell’app per gli SMS (quella di Erevos quando è l’app per
  gli SMS del telefono), che puoi inviare o no. La pagina del link sul server web di LPHL gli offre Erevos (l’app
  Android, o la web app su iPhone) e poi vi apre l’invito; nella web app su iPhone, incolla il link sotto **Ho un
  invito**. Tocca **Partecipa**: il suo telefono entra nel tuo relay come sopra e risponde al tuo attraverso di esso, il
  che lo aggiunge, collegato a quel numero e con il nome della scheda. Il suo primo messaggio, che parte da solo, fa di
  te un suo contatto, con il nome che hai dato a te stesso nel tuo ultimo invito. L’invito sta dopo il **#** nel link,
  che non viene mai inviato a nessun server web, ma l’operatore telefonico vede l’SMS, come ogni SMS: quindi è per una
  persona, per due giorni, e quando i due giorni finiscono senza che nessun telefono l’abbia usato, il tuo telefono
  ritira il suo invito al relay. Serve un relay che lasci invitare il tuo telefono, come sopra.

### Nessun relay tuo

Un telefono senza relay chatta via internet lo stesso: aggiungendo il link di un contatto il cui relay presta posti,
prende un posto lì, senza token.

- **Come:** aggiungi il suo link come in 4 e 5, senza niente in **Relay**. Erevos dice che ora hai un posto sul suo
  relay, prestato tramite il suo link, e da allora lo usa come se fosse suo: il tuo link lo nomina, così anche gli altri
  ti raggiungono lì.
- **Chi presta:** il tuo link porta un biglietto per un posto sul tuo relay solo quando attivi **Condividi un posto sul
  mio relay con questo link**, in **Il tuo link di contatto** in **Nuova chat**, e solo per il link mostrato in quel
  momento: la prossima volta che si apre la chat, è di nuovo disattivato. Il relay ha bisogno di una chiave per l’invio
  in due passaggi, e presta solo dopo che chi lo gestisce attiva il prestito; può anche ritirare i posti di un
  biglietto. Un biglietto dura 30 giorni e dà fino a quattro posti. Chiunque veda un link con un biglietto può prendere
  un posto con esso, quindi dai un link del genere solo a chi intendi darlo.
- **Che cosa non fa un posto prestato:** i messaggi ai contatti su altri relay vanno direttamente al loro relay, che
  allora vede l’indirizzo del tuo telefono. Non conserva niente per dopo (un messaggio inviato più tardi aspetta sul
  telefono), non dà un relay per le chiamate (le chiamate vanno direttamente tra i telefoni), e crea al massimo altre 4
  code e invia al massimo 50 MB di file al giorno. Il tuo link non presta niente a sua volta.
- **Invece, un relay tuo:** scrivi il suo indirizzo in **Relay**: il posto prestato viene lasciato, e i contatti
  conoscono quello nuovo dal tuo prossimo messaggio.
- **Un link senza biglietto** (da un relay o un Erevos più vecchio): un relay che non richiede token viene usato così
  com’è; altrimenti vi raggiungete solo da vicino, finché non hai un relay.

**Perché:** un link con un biglietto è una chiave del tuo relay per chiunque lo veda, quindi il tuo link ne porta uno
solo quando lo scegli, per il link mostrato in quel momento, e il relay presta solo dopo che chi lo gestisce lo
permette. I file di un posto prestato sono limitati a poche foto e messaggi vocali al giorno, così non occupa mai tutto
lo spazio del relay.

### Inviti al relay

Un telefono con un token tutto suo su un relay che accetta inviti può lasciare che un altro telefono usi quel relay,
con un token tutto di quel telefono, così nessun token viene scritto o passato ad altri.

- **Per invitare:** in **Per utenti esperti** in **Nuova chat**, sotto il **Token**, tocca **Invita sul relay**, scrivi
  per chi è e tocca **Crea l’invito**. Si apre un codice QR: fallo scansionare al suo telefono con la fotocamera e
  aprire il link in Erevos, oppure tocca **Condividi l’invito** e mandaglielo. Vale per un telefono per 7 giorni, e chi
  lo prende per primo lo ha, quindi mostralo solo a quella persona.
- **Per prenderne uno:** il link apre **Invito a un relay**, con l’indirizzo del relay: tocca **Usa questo relay** solo
  se è arrivato da qualcuno che conosci. In Erevos, anche **Fotografa il codice QR** e **Scegli una foto del codice QR**
  in **Aggiungi un contatto** leggono un invito, e il suo link si può incollare nel campo lì. Erevos crea un token per
  questo telefono, lo conserva con l’indirizzo del relay solo in questo spazio, crea lì la tua coda e dice il nome che
  il relay ha dato al telefono. Se il telefono usa un altro relay, prima chiede, e i contatti conoscono la tua nuova
  coda dal tuo prossimo messaggio. Erevos accetta un invito a un relay wss://, o a uno ws:// solo su una rete di casa
  (come \`ws://192.168.1.10:7879\`). Le chat nascoste non accettano inviti.
- **I tuoi inviti:** elencati sotto il pulsante, in attesa o in uso. **Ritira** ritira uno ancora in attesa, o esclude
  subito il telefono che l’ha preso, e a loro volta i telefoni che ha invitato.
- **Finché vale il tuo:** un telefono che hai invitato usa il relay solo finché può farlo il tuo. Quando la tua riga se
  ne va, perché il telefono che ti ha invitato l’ha ritirata, l’account con cui hai fatto l’accesso non può più usare il
  relay, o il suo gestore l’ha tolta, se ne vanno anche le righe dei telefoni che hai invitato, e quelle dei telefoni
  che loro hanno invitato. Accedere di nuovo sul tuo telefono le mantiene.
- **Che cosa conserva il relay:** il nome che hai scritto, in lettere latine (Μαρία diventa \`maria\`), che hai invitato
  tu quel telefono, e un’impronta del suo token, non il token. Chi gestisce il relay vede questo, e può togliere
  qualsiasi telefono. Un telefono può avere 5 inviti in attesa insieme, e farne 10 al giorno, e il relay fa entrare solo
  un certo numero di telefoni su invito (100, a meno che il suo gestore non abbia scelto diversamente).
- **Chi può invitare:** un telefono con un token tutto suo, su un relay il cui gestore ha attivato gli inviti (vedi
  [Gestire un relay tuo](#own-relay)). Un telefono con l’unico token condiviso del relay lo scambia prima con uno tutto
  suo (vedi Modi per entrare nel relay sopra). Con un posto prestato non c’è **Invita sul relay**.

**Perché:** il relay conserva solo un’impronta di ogni token, mai il token, così il suo file non dice a nessuno come
connettersi. E un invito nomina un relay wss://, o uno ws:// a casa, così non può mai mandare le richieste del tuo
telefono attraverso internet in chiaro.

### Accedere al relay

Un relay può far accedere i telefoni con un account di cui il suo gestore si fida, come LPHL, per un token tutto loro,
senza niente da scrivere in Erevos.

- **Per accedere:** scrivi l’indirizzo del relay in **Relay**. Quando il relay lo offre, **Accedi con LPHL** appare
  sotto il **Token**. Toccalo: il browser apre la pagina di accesso, dove scrivi il tuo nome e la tua password, che
  Erevos non vede mai. La pagina del relay mostra poi sei cifre. Tornato in Erevos, che ti porta direttamente in
  **Codice della pagina**, scrivile lì e tocca **Completa l’accesso**: il telefono conserva il suo token con
  l’indirizzo del relay solo in questo spazio, e crea lì la tua coda. Scrivi il codice solo in Erevos sul tuo telefono
  e non darlo a nessuno, anche se te lo chiedono: chi lo scrive usa il relay come se fosse te. Dopo 5 codici sbagliati
  l’accesso è finito: accedi di nuovo. Erevos apre solo una pagina di accesso sull’indirizzo del relay stesso, tramite
  https.
- **Accedere di nuovo** sullo stesso telefono prende il posto della sua riga sul relay, quando il suo token è quello
  che ha ricevuto da quel relay. Ogni telefono riceve una riga tutta sua, al massimo 10 per un account.
- **Che cosa vedono il relay e LPHL:** il relay dà alla riga del telefono il tuo nome utente (\`lphl:nekten\`), e ogni
  ora chiede a LPHL se l’account può ancora usarlo: quando l’account viene chiuso o disattivato, o LPHL non si può
  interpellare per 3 giorni, la riga se ne va, e il telefono non può più usare il relay, e nemmeno i telefoni che ha
  invitato. LPHL vede ogni accesso e questi controlli, ma niente dei tuoi spazi, chat o contatti. Accedere da un altro
  spazio con lo stesso account mostra al relay che sono entrambi tuoi.
- **Le chat nascoste** non accedono.

**Perché:** la pagina mostra il codice e tu lo scrivi in Erevos, non il contrario, così un link di accesso che
qualcun altro ti manda non gli fa ottenere nulla: solo chi ha fatto l’accesso vede il codice, e cinque codici
sbagliati lo chiudono. Erevos apre una pagina di accesso solo sull’indirizzo del relay stesso, tramite https, così
niente che risponda al posto del relay può mandarti su una pagina da un’altra parte. E un fornitore che non si può
interpellare per un po’ non esclude subito nessun telefono: lo fanno solo 3 giorni senza una risposta valida.

### La chiave del relay

Appena Erevos conosce la chiave del tuo relay (la chiede al relay la prima volta, o gliela dà un link di contatto),
ogni connessione a quel relay inizia con un controllo: il relay deve dimostrare di avere quella chiave, e il token e
tutto quello che segue viaggiano crittografati per quella chiave, dentro la crittografia della connessione stessa
(TLS). In **Come ti colleghi ora**, Erevos dice allora che il tuo relay ha dimostrato la sua chiave. Da quel momento,
questo spazio non raggiunge mai quel relay senza il controllo.

- Un relay più vecchio di questa app non dimostra nulla: funziona come prima, e **Come ti colleghi ora** dice che è più
  vecchio. Erevos riprova ogni ora.
- Un relay che non riesce a dimostrare la chiave che Erevos conserva per lui non riceve nulla, e i tuoi messaggi
  aspettano; **Come ti colleghi ora** lo dice in rosso. Solo se il suo gestore ti ha detto che ha una chiave nuova,
  tocca **Ha una chiave nuova**: Erevos prende allora la chiave che il relay dà subito dopo.

**Perché:** il certificato della connessione dice solo che chi risponde ha un certificato per il nome del relay, che
un’azienda che emette certificati può dare anche a qualcun altro, per errore o perché costretta. La chiave del relay è
solo sul suo server, così nessuno nel mezzo può spacciarsi per lui, e un certificato rinnovato non cambia nulla.

### Il codice di sicurezza

Apri la chat, tocca il suo nome e poi **Codice di sicurezza**. Entrambi i telefoni mostrano le stesse 60 cifre per voi
due. Confrontatele di persona o durante una chiamata: se coincidono, nessuno è nel mezzo. Se sono diverse, non fidarti
di quella chat, e aggiungi di nuovo il link, scansionato dal suo telefono. Quando ha collegato un dispositivo, dice
anche quando è cambiato l’ultima volta l’elenco dei suoi dispositivi: i tuoi messaggi vanno anche a ogni voce di
quell’elenco, quindi se in quel momento non ne ha collegato o scollegato uno, chiediglielo.

### Inviato, arrivato e letto

Sotto ognuno dei tuoi messaggi a un contatto, **✓** dice che il relay o un telefono vicino l’ha preso, **✓✓** che è
arrivato al suo telefono, e **✓✓✓** che l’ha letto. Il suo telefono lo dice al tuo, dentro la crittografia, la
prossima volta che ognuno controlla il relay, o subito quando siete vicini. Un messaggio conta come letto appena la sua
chat appare sullo schermo.

- **Invio…:** nel momento in cui premi Invia, il telefono fa una breve vibrazione, il campo si svuota e il messaggio
  appare, segnato **Invio…** finché il relay o il suo telefono non lo prende. Se non può partire e non può aspettare,
  le sue parole tornano nel campo.
- **In attesa:** un messaggio che niente ha potuto prendere, perché il relay non è raggiungibile e il suo telefono non
  è vicino, resta nella chat segnato **In attesa**, e parte da solo, in ordine, appena il relay o il suo telefono vicino
  può prenderlo, mentre uno spazio è aperto; allora mostra **✓**. Un testo aspetta subito. Un messaggio vocale, una foto
  o un file prima chiede: **Lascia in attesa** o **Elimina**. Un messaggio in attesa si elimina solo su questo telefono.
  Anche nelle chat nascoste aspetta, ma passa solo dal loro relay, mai dal telefono vicino o via LoRa: mentre sono
  aperte, oppure, con **Ricevere da chiuse** attivo, mentre lo spazio è aperto. Quando la coda del contatto sul relay è
  piena, un testo, un messaggio vocale, una foto o un file va comunque ai suoi dispositivi collegati, se ne ha, appare
  come inviato, e viene ritentato per il suo telefono finché le chat nascoste restano aperte: se si chiudono prima che
  parta, il suo telefono non lo riceve mai.
- **Invia più tardi:** tieni premuta la freccia di invio e scegli **Più tardi…**, oppure tocca **+** e poi **Invia più
  tardi**. Scegli un’ora con un tocco (**Tra 1 ora**, **Stasera 20:00**, **Domani 09:00**) o il giorno, l’ora e i
  minuti, fino a un anno avanti, poi **Invia più tardi**. Il messaggio resta nella chat segnato **Programmato** con la
  sua ora. Va crittografato al relay, che lo conserva e lo invia a quell’ora, anche se allora questo telefono è spento o
  bloccato, e il suo telefono lo mostra da quell’ora, non prima. Se ora nessun relay è raggiungibile, aspetta su questo
  telefono e va al relay appena ce n’è uno raggiungibile. Senza niente di scritto, l’ora che scegli vale per la prossima
  foto, il prossimo file o messaggio vocale: una foto o un file va subito al tuo relay e resta lì finché non lo prende,
  al massimo 14 giorni dopo la sua ora. Ce l’hanno anche le chat nascoste, allo stesso modo, tramite il loro relay.
  Fino alla sua ora, eliminalo per ritirarlo dal relay, e non parte mai. Se prima di allora la sua coda sul relay
  cambia, Erevos lo trattiene di nuovo per quella nuova la prossima volta che raggiunge il relay.
  Con un token tutto di questo telefono, parte solo se il telefono ha ancora la sua riga su quel relay in quel momento.
  Un messaggio senza suono resta senza suono. Un relay di prima di questa funzione non conserva niente per dopo: allora
  il messaggio aspetta su questo telefono e parte alla sua ora mentre Erevos è in funzione, anche in background mentre
  **In background** è su **Ricevi e squilla** (più sotto), o alla prossima apertura di Erevos.
- **Invia senza suono:** tieni premuta la freccia di invio e scegli **Senza suono**: il suo telefono mostra la
  notifica senza suono né vibrazione. Un Erevos di prima non lo sa e suona come al solito, e così Erevos come web app,
  la cui notifica arriva dal browser. Così anche la notifica di un posto di chat nascoste chiuso, con **Avvisa quando
  arriva un messaggio** attivo, e di uno spazio chiuso con **Anche mentre è aperto un altro spazio**: questi chiedono
  al relay solo quanti ne sono arrivati, e il relay non sa distinguere uno senza suono da un altro, perché solo il
  messaggio crittografato lo dice.
- **Link:** un indirizzo web in un messaggio è sottolineato. Toccalo ed Erevos lo mostra intero, da aprire nel browser
  solo se è dove vuoi andare. Prima di allora non viene scaricato nulla.
- **Condividi da un’altra app** (Android): nel menu **Condividi** di un’altra app, come quello del browser per una
  pagina, scegli **Erevos**. Appena uno spazio è aperto, **Invia a** elenca le chat, i gruppi e le conversazioni SMS
  che la schermata principale ha mostrato per ultimi, poi ogni altra chat e gruppo, con una ricerca; mai le chat
  nascoste. Parole e link si aprono nel campo del messaggio di quella che scegli, da leggere e inviare lì; una foto o
  un file (al massimo 100 MB) parte appena quella chat o quel gruppo si apre, una foto con la qualità che hai scelto per
  le foto, e mai come SMS. Fino ad allora la sua copia aspetta nello spazio di Erevos sul telefono, e se ne va una
  volta inviata, o quando lasci **Invia a**.
- **Vede quando leggi:** il tuo telefono lo dice al suo, come il suo lo dice al tuo, a meno che quella chat non appaia
  offline (più sotto).
- **Quando arrivano i messaggi:** Erevos controlla il relay ogni pochi secondi mentre è aperto e sbloccato, su
  qualsiasi schermata, e la schermata principale sposta da sola la chat in cima. Su Android ogni nuovo messaggio suona,
  con una notifica che dice solo quanti ne sono arrivati, anche mentre Erevos è visibile; nella chat o nel gruppo
  aperto sullo schermo suona solo il suono, e aprire una chat toglie dal conteggio quello che vi è arrivato. La
  scrittura in corso, e il fatto che un messaggio sia arrivato o sia stato letto, non ne fanno. Su
  Android continua anche in background, mentre **In
  background** è su **Ricevi e squilla** (più sotto): lì aspetta al relay finché arriva qualcosa, un minuto alla
  volta, invece di chiedere ogni pochi secondi, e non chiede altro quando non è arrivato nulla, così la batteria dura,
  e una notifica dice solo quanti messaggi sono arrivati. Chiuso, bloccato, o
  altrimenti a lungo in background, non lo fa: i messaggi aspettano sul relay, fino a 14 giorni, e arrivano quando
  Erevos si riapre. Una richiesta al relay senza risposta in tempo (un’attesa lì il suo minuto e mezzo minuto in più,
  qualsiasi altra 45 secondi, una parte di un file 2 minuti) conta come fallita e viene ripetuta, così una connessione
  morta per strada, come quando la rete del telefono va in sospensione o cambia, non blocca nulla.

### Online, e apparire offline

Mentre la chat di un contatto è aperta sul tuo schermo, Erevos chiede ogni tanto al suo telefono se è aperta, e dice
che la tua lo è. Se la sua lo è, la chat dice **Online** sotto il suo nome con un punto verde, e la schermata
principale mostra il punto sulla sua immagine. Anche scrivere a qualcuno ti mostra online per due minuti. Tutto questo
passa dentro la crittografia, solo tra te e quel contatto: il relay vede un messaggio ogni tanto, come con qualsiasi
chat. Non c’è un «ultimo accesso».

Mentre scrivi a un contatto che appare online, la sua chat mostra **sta scrivendo…** sotto il tuo nome per qualche
secondo, e la tua sotto il suo quando scrive. Viene detto al massimo ogni pochi secondi, solo mentre appare online, mai
a una richiesta di messaggio, e non nei gruppi.

**Perché:** essere online viene detto solo tra te e un contatto la cui chat è aperta, dentro la crittografia, quindi il
relay non vede più di un messaggio ogni tanto tra due persone che parlano, e non ne viene conservato nulla: così non
c’è nessun «ultimo accesso» da mostrare. Qualcuno che ha solo il tuo link, e scrive come richiesta di messaggio, non
riceve nulla finché non accetti: né che hai letto, né che sei online o stai scrivendo.

Per nasconderlo a un contatto, apri la sua chat, tocca il suo nome e poi **Mostrati offline**. Con questo attivo:

- **Non ti vede online**, né che stai scrivendo, e il tuo telefono non gli invia nulla mentre leggi.
- **I suoi messaggi restano ✓** sul suo telefono, non ✓✓ o ✓✓✓, mentre li leggi.
- **Quando gli scrivi**, appari online per due minuti, e ogni suo messaggio che leggi diventa subito ✓✓✓.
- **Nemmeno tu lo vedi online**, perché il tuo telefono non lo chiede.

Si imposta per ogni chat, solo su questo telefono. Disattivalo di nuovo e vedrà quello che hai letto al tuo prossimo
controllo del relay.

### Nomi ed eliminazione

Apri una chat, tocca il suo nome e poi **Rinomina** per darle un nome. Il nome resta su questo telefono, sigillato con
la chat: l’altro telefono non lo vede. Un nome vuoto riporta l’inizio della sua chiave, a meno che uno dei tuoi
contatti non sia collegato a lui: allora riprende il suo nome la prossima volta che si apre la sua scheda, finché il
collegamento resta (vedi [Contatti](#contacts)).

Tocca il suo nome e poi **Immagine** per dargli un’immagine scelta da te, un segno su un colore, invece di quella
disegnata dalla sua chiave. Oppure tocca **Foto** (o **Scatta foto**) per una foto: tagliata quadrata, rimpicciolita e
ridisegnata, così non resta niente di quello che diceva oltre all’immagine (un luogo, un telefono), poi sigillata in un
file tutto suo. Anche questa resta su questo telefono, e va nei backup; **Immagine dalla sua chiave** riporta quella
disegnata.

Ogni chat può anche avere un aspetto tutto suo: tocca il suo nome e poi **Aspetto della chat** per le stesse scelte di
**Aspetto** (stile, tema, colori, sfondo, messaggi), solo per quella chat. Come il nome, resta su questo telefono,
sigillato con la chat. **Come l’app** le ridà l’aspetto dell’app.

Per tenere una chat fuori da Erevos, tocca il suo nome e poi **Esporta chat**: i suoi messaggi vanno in un file di
testo, ogni giorno sotto la sua data e ogni messaggio con la sua ora e chi l’ha scritto, salvato nella cartella che
scegli (su un computer, dove scegli). Il file non è crittografato: chiunque lo abbia, o qualsiasi app che legge quella
cartella, può leggerlo. Foto, file e messaggi vocali sono solo nominati, i messaggi effimeri sono esclusi, e le chat
nascoste non vengono esportate, così nessun file fuori da Erevos mostra che esistono.

**Perché:** un messaggio effimero viene escluso, e così una sua citazione, perché chi l’ha inviato voleva che
scomparisse, non che restasse in un file.

Per eliminare un messaggio, tienilo premuto e tocca **Elimina**. Per eliminare tutti i messaggi di una chat, tocca il
suo nome e poi **Elimina messaggi**.
In entrambi i casi Erevos chiede dove:

- **Questo telefono:** solo qui. L’altro telefono tiene i suoi.
- **Entrambi i telefoni:** anche il suo telefono li elimina, la prossima volta che controlla il relay. Il suo Erevos lo
  fa, ma un’app modificata, uno screenshot o una copia possono comunque conservarli.

### Eliminare e bloccare un contatto

Tocca il nome di una chat e poi **Elimina contatto** per dimenticarlo: la sua chat se ne va da questo telefono, ed
Erevos ti dà subito una nuova coda sul relay. Agli altri tuoi contatti viene detto in silenzio, in un messaggio senza
niente dentro, e di nuovo 7, 14 e 21 giorni dopo finché non hanno scritto in quella nuova; quello che hanno scritto
nel frattempo in quella vecchia si vede ancora per 14 giorni. Quello che hai eliminato non viene avvisato, e niente di
quello che invia lì appare. Il tuo link di contatto resta com’era, quindi può ancora chiedere di parlare di nuovo con
esso, come richiesta di messaggio, come chiunque lo abbia.

**Perché:** tutti i tuoi contatti scrivono nella tua unica coda, quindi chi elimini sa ancora dov’è; appena si sposta,
non può più scriverti lì, e nemmeno chi ha inviato la spazzatura qui sotto. Il tuo link di contatto nomina una coda
tutta sua, che un’eliminazione lascia stare, così ogni link e codice QR che hai dato continua a funzionare.

**Una coda per ogni contatto:** su un relay aggiornato per questo, ogni contatto scrive in una coda tutta sua, che
conosce solo lui, comunicata dentro i tuoi messaggi crittografati; la coda del tuo link di contatto serve allora solo
per i primi messaggi. Così il relay non può capire da dove vanno i messaggi che due contatti scrivono allo stesso
telefono, ed eliminare o bloccare qualcuno elimina solo la sua coda: la tua si sposta solo se la conosceva anche lui,
come la conoscono i contatti di prima di questa funzione, e chi è arrivato tramite il tuo link di contatto prima del
suo primo spostamento. Anche i contatti di prima ne ricevono una tutta loro a turno, pochi alla volta, in silenzio, e
anche un loro Erevos di prima la prende. Queste code si leggono senza token, così il token, che nomina il tuo telefono,
non le collega tra loro; tramite Tor, otto alla volta, ogni gruppo di otto su circuiti tutti suoi. Vengono comunque
create ed eliminate con il token, quindi un relay che tiene dei log può collegarle in quel momento. Le chat nascoste e
i computer collegati tengono per ora una coda per tutti. La web app non ha Tor, quindi mentre è aperta aspetta su tutte
le code dei tuoi contatti insieme, da un unico indirizzo; con le notifiche ad app chiusa attive, il tuo relay ha anche
un indirizzo push per tutte le code dei tuoi contatti (vedi [Su iPhone](#iphone)).

- **Blocca contatto**, sotto, fa lo stesso, e in più scarta quello che invia dopo, anche una richiesta. **Blocca**,
  accanto a **Rifiuta**, blocca una richiesta di messaggio: una richiesta conosce solo il tuo link di contatto, quindi
  sposta la tua coda solo finché il link nomina ancora quella, come fa fino al tuo primo spostamento. Chi hai bloccato
  è in **Contatti bloccati** in **Nuova chat**, con **Sblocca**. Aggiungerlo di nuovo dal suo link ti chiede prima di
  sbloccarlo; fino ad allora niente lo aggiunge, né la sua risposta a un invito via SMS né il suo link di contatto in
  un gruppo. Ogni persona che scrive dal tuo link di contatto può far suonare il telefono, come fa qualsiasi messaggio:
  **Rifiuta** o **Blocca** ferma quella persona, **Notifiche** → **In silenzio** nella sua chat la zittisce senza
  rifiutarla, e **Nuovo link di contatto** ferma chi ha il vecchio link una volta passati i suoi 14 giorni.
- **Gruppi:** qualcuno in uno dei tuoi gruppi può ancora scriverti lì. Erevos dice in quanti gruppi siete insieme:
  lasciali, o chiedi al loro admin di rimuoverlo.
- **Quando il relay non è raggiungibile**, la coda cambia appena risponde, e fino ad allora niente di quello che invia
  appare.
- **I messaggi programmati** che avevi per lui vengono ritirati dal relay, subito o appena risponde, così non partono
  mai.
- **Spazzatura:** quando la tua coda si riempie di cose che non sono per nessuno qui, Erevos ti dà una nuova coda allo
  stesso modo e lo dice, al massimo una volta al giorno. Quando la spazzatura riempie la coda che nomina il tuo link di
  contatto, ricevi invece un nuovo link. Anche un’ondata di richieste di messaggio inventate conta come spazzatura,
  mentre un gruppo di richieste vere arriva comunque.
- **Nuovo link di contatto**, accanto a **Condividi il mio link di contatto**, ti dà un nuovo link: i link e i codici
  QR che hai dato prima funzionano per altri 14 giorni, poi non più. I tuoi contatti non ne risentono. Se il relay
  perde la coda che nomina il tuo link, ricevi un nuovo link allo stesso modo, ma quelli che hai dato prima smettono
  subito di funzionare.
- **Su un computer collegato** passa al telefono, che a sua volta lo elimina o lo blocca e sposta le sue code, anche
  quella del computer. Il telefono tiene chi è bloccato e lo dice al computer: aggiungerlo lì dal suo link ti chiede di
  sbloccarlo anche lì, e **Sblocca** lo sblocca anche sul telefono.
- **Nelle chat nascoste** si spostano solo le code di quel posto, subito la sua coda per gli squilli, così quello che
  hai eliminato non può più far squillare il telefono. Niente dello spazio o degli altri posti si sposta.

Il pulsante **Elimina** della scheda del contatto (vedi [Contatti](#contacts)) toglie solo la scheda, non la chat. Un
backup fatto prima di un’eliminazione o di un blocco riporta quel contatto: eliminalo o bloccalo di nuovo dopo averlo
ripristinato. Una volta ripristinato, la tua coda dice di essere più recente di qualsiasi altra conosciuta dai tuoi
contatti, e a ognuno viene detto di nuovo, così tutti scrivono dove leggi.

### Il menu di un messaggio

Tieni premuto un messaggio per il suo menu: le reazioni in alto, poi quello che puoi farci.

- **Reazioni:** toccane una, o **+** per altre. Appare sotto il messaggio su entrambi i telefoni, la tua illuminata;
  toccala di nuovo per ritirarla. Ognuno di voi ha una reazione per messaggio. Parte subito, o per niente: quando né il
  relay né il suo telefono vicino possono prenderla, non cambia nulla.
- **Rispondi:** il tuo prossimo messaggio gli risponde, e lo mostra citato sopra le tue parole, su entrambi i
  telefoni. Tocca la citazione per andare al messaggio a cui risponde; **✕** la toglie. Un Erevos di prima di questa
  funzione mostra la risposta senza la citazione.
- **Inoltra:** ne invia una copia a un’altra chat: scegli un contatto, o un gruppo. Le sue parole, il suo sticker o il
  suo luogo partono da capo, un sondaggio come uno nuovo ancora senza risposte, e il suono di un messaggio vocale o i
  byte di una foto o di un file vengono inviati di nuovo, crittografati con una chiave nuova, così niente collega la
  copia al messaggio da cui viene. La copia dice **Inoltrato** sotto, non da dove; un Erevos di prima di questa
  funzione la mostra senza. Un messaggio effimero
  non viene inoltrato, e dalle chat nascoste un messaggio va solo alle stesse chat nascoste.
- **Importante:** lo segna come importante, solo su questo telefono, per ritrovarlo: **Messaggi importanti** nel menu
  della schermata principale li elenca da tutte le tue chat, e i dettagli di una chat elencano i suoi. Un tocco va al
  messaggio. I messaggi importanti delle chat nascoste appaiono solo nei dettagli delle loro chat.
- **Fissa:** lo fissa in cima alla chat, su entrambi i telefoni; ognuno di voi può usare **Non fissare più**. Con più di
  uno fissato, si vede l’ultimo; toccalo per andarci, e appare il successivo.
- **Copia:** mette le sue parole negli appunti, da incollare in un’altra app. Su Android la copia è segnata come
  privata, così l’avviso del telefono non mostra le parole, ma qualsiasi app che legge gli appunti può leggerle.
- **Modifica:** per un tuo messaggio, fino a un giorno dopo averlo inviato. Le sue parole vanno nel campo sotto
  **Modifica messaggio**: cambiale e invia, o **✕** per lasciarlo com’era. Entrambi i telefoni mostrano le nuove
  parole, con **Modificato** accanto all’ora. Si modificano solo le parole, non uno sticker, un luogo, un sondaggio, un
  messaggio vocale, una foto o un file, né parole che hai inoltrato. Uno che aspetta ancora di partire parte con le
  nuove parole, senza segno; uno inviato per dopo non si modifica. La modifica parte subito, o per niente, come una
  reazione, e la mostrano anche i tuoi dispositivi collegati. Un Erevos di prima di questa funzione tiene le vecchie
  parole.
  **Perché:** un giorno è tempo sufficiente per correggere un errore, e nessuno può cambiare quello che ha detto giorni
  fa. Il segno mostra che le parole non sono le prime.
- **Elimina:** su questo telefono, o su entrambi, come sopra.

Reazioni, risposte, messaggi fissati e modifiche viaggiano dentro la crittografia, come i messaggi.

### Messaggi effimeri

Apri una chat, tocca il suo nome e poi **Messaggi effimeri** per scegliere quanto durano i suoi nuovi messaggi una
volta letti: 5 minuti, 1 ora,
1 giorno o 1 settimana. Per far scomparire solo il prossimo messaggio, tocca il cronometro accanto al campo del
messaggio (o **Messaggio effimero** sotto **+**, o **Effimero** nel menu della freccia di invio): **Scompare 1 ora dopo
la lettura** appare sopra il campo. Tocca l’ora per sceglierne un’altra, o **✕** per disattivarlo. Va con il prossimo
messaggio che invii: parole, un messaggio vocale, una foto o un file, uno sticker, un luogo o un sondaggio, ora o più
tardi. Un SMS non può scomparire: inviato come SMS, resta su entrambi i telefoni (Erevos lo dice prima), e il
cronometro si disattiva di nuovo. Il suo tempo inizia quando l’altro telefono lo mostra sullo schermo, e la tua copia
inizia quando il suo telefono lo dice
(**✓✓✓**). Ogni messaggio dice quando scompare. L’altro telefono conosce l’impostazione della chat la prossima volta
che controlla il relay, ed entrambi i telefoni possono cambiarla: vince la modifica più recente. I messaggi già nella
chat restano.

- **Finché non viene letto** un messaggio effimero resta su entrambi i telefoni, sigillato come il resto. Se il suo
  Erevos non dice mai di averlo letto, la tua copia resta.
- **Mentre Erevos è chiuso:** un messaggio il cui tempo è scaduto viene eliminato alla prossima apertura della chat.
  Fino ad allora resta sul telefono, sigillato come il resto.
- **Non è una garanzia:** il suo Erevos li elimina, ma un’app modificata, uno screenshot o una copia possono comunque
  conservarli.

### Notifiche di questa chat

Su Android, apri una chat, tocca il suo nome e poi **Notifiche**; in un gruppo, tocca il suo nome (in un gruppo
pubblico, **⋯**) e poi **Notifiche**. **In silenzio** per 8 ore, 1 settimana o **Sempre**: i suoi messaggi non suonano e
non mostrano notifiche, quindi neanche l’icona di Erevos li conta; la lista li mostra comunque, con una campanella
barrata, e le sue chiamate suonano comunque. **Suono dei messaggi** e **Suoneria** le danno un suono proprio per i suoi
messaggi e per le sue chiamate, dall’elenco di suoni di Android stesso, o **Senza suono**. Nei dettagli di una chat la
riga dice allora **In silenzio fino a** e l’ora, o **Suoni propri**.

**Perché:** una chat in silenzio conta comunque nella lista, così niente di ciò che è arrivato va perso: solo il
telefono smette di chiamarti lì. I suoi suoni restano solo su questo telefono, con la chat nei dati cifrati dello
spazio, perché ogni telefono ha i suoi suoni: un dispositivo collegato tiene i suoi, e l’altro telefono non ne sa
niente.

- **Nelle chat nascoste** c’è solo **In silenzio**: un suono proprio direbbe a chiunque sia vicino di quale chat si
  tratta.
- **Uno spazio chiuso, e le chat nascoste finché sono chiuse,** non sanno in quale chat è arrivato un messaggio, quindi
  lo segnalano come dicono le impostazioni dell’app.
- **Solo su Android** per ora: la web app segnala ogni chat come dicono le sue impostazioni.

### Messaggi vocali

Nella chat di un contatto, senza niente di scritto, tieni premuto il microfono alla fine della barra dei messaggi
mentre parli, e lascia per inviare; scorri a sinistra prima di lasciare per scartarlo invece. Una pressione di meno di
un secondo viene presa per uno sbaglio e non invia nulla. Dopo un minuto si invia da solo. La prima volta, Android
chiede se Erevos può usare il microfono: registra solo mentre lo tieni premuto. Con TalkBack, toccalo una volta per
iniziare e di nuovo per inviare. Tocca un messaggio vocale per riprodurlo, e toccalo di nuovo per fermarlo. I messaggi
vocali hanno gli stessi segni degli altri, e seguono l’impostazione dei messaggi effimeri della chat.

**Perché:** su un telefono un messaggio vocale è AAC a 64 kbit/s, circa 480 KB al minuto: il massimo di chiarezza
utile per la voce. Di più non si sentirebbe in una voce, ma sarebbe più lento da inviare, soprattutto via Bluetooth.

- **Tramite il relay, o da vicino,** crittografati end-to-end come le parole, in più pezzi. Nessuno nel mezzo può
  ascoltarli, ma dai pezzi il relay, o chi ascolta da vicino, può capire che è stato inviato qualcosa di lungo, e più o
  meno quanto. Da vicino vanno solo al telefono di un contatto che si sa essere vicino.
- **Sul telefono** ogni suono è conservato in un file tutto suo, sigillato con una sua chiave, che solo la cronologia
  sigillata della chat contiene. Quando il messaggio se ne va, eliminato, scomparso o perché il più vecchio, se ne va
  anche il suo file. Quanti di questi file ci sono, e le loro dimensioni, mostrano più o meno quanti messaggi vocali
  conserva il telefono, in tutti i suoi spazi insieme, non in quale.
- **Mentre viene riprodotto** il suono è dissigillato nella cache di Erevos, ed eliminato appena si ferma. Se Erevos
  viene chiuso mentre registra o riproduce, quello che è rimasto se ne va la prossima volta che si apre una chat.

### Foto e file

Nella chat di un contatto, tocca **+** accanto al campo del messaggio, che si apre dove c’era la tastiera, poi **Foto**
per sceglierne una dalle foto del telefono, **Fotocamera** per scattarne una, o **File** per qualsiasi altra cosa, fino
a 100 MB. Sotto di essi, **Qualità della foto** imposta come partono le foto, ed
Erevos se lo ricorda:

- **Originale** (l’impostazione predefinita): la foto esattamente com’era, a dimensione piena, senza perdita di
  qualità. Viene tolto solo quello che dice oltre all’immagine: dove è stata scattata, il telefono, l’ora, le
  miniature. Il suo nome è semplicemente «photo».
- **90%** e **75%:** una foto nuova, più piccola, più veloce da inviare, che non dice nient’altro che la sua immagine.

Le sue foto e i suoi file fino a 16 MB arrivano da soli; tocca uno più grande per prenderlo. Tocca una foto per
vederla a tutto schermo, con le sue dimensioni: due dita o un doppio tocco la ingrandiscono, un dito la sposta mentre
è ingrandita, e un tocco nasconde o mostra ciò che ha intorno. Tocca un file per salvarlo. Erevos ruota con il
telefono finché la sua **Rotazione automatica** è attiva, e una foto mostrata da sola ruota anche quando è
disattivata. **Salva** mette una copia in una cartella che scegli la prima volta, e **Salva in un’altra cartella** la
cambia. Foto e file hanno gli stessi segni degli altri messaggi, e seguono l’impostazione dei messaggi effimeri della
chat.

- **Come viaggiano:** ogni file viene crittografato sul telefono con una chiave tutta sua, in pezzi tutti della stessa
  dimensione, e messo sul tuo relay. Al contatto vanno solo dove sono i pezzi e la chiave, crittografati end-to-end. Il
  suo telefono prende i pezzi tramite il suo relay, così il tuo relay non vede mai l’indirizzo del suo telefono,
  controlla ogni pezzo, e poi li elimina dal relay. I pezzi che nessuno prende vengono eliminati dopo 14 giorni.
- **Che cosa vede il relay:** quanti pezzi ci sono e la loro dimensione, quindi più o meno quanto è grande il file, e
  quando. Non che cosa sia o per chi.
- **Un file parte così com’è,** con qualsiasi cosa dica al suo interno: l’autore di un documento, o il luogo e il
  telefono di una foto se la invii con **File**. Invia le foto con **Foto**.
- **Sul telefono** ogni file è conservato nei suoi pezzi, come hanno viaggiato, sigillato con una sua chiave, che solo
  la cronologia sigillata della chat contiene. Quando il messaggio se ne va, se ne vanno anche i suoi pezzi. Quanti
  pezzi ci sono mostra più o meno quanto conserva il telefono, in tutti i suoi spazi insieme, non in quale. Una foto
  viene mostrata dalla memoria, mai scritta dissigillata. Il selettore di foto del telefono consegna una copia nella
  cache di Erevos, eliminata appena letta, e una foto scattata qui non viene conservata tra le foto del telefono.
- **Le foto e i file salvati** sono fuori da Erevos, non sigillati: chiunque abbia il telefono può aprirli.
- **Solo tramite il relay:** i file hanno bisogno del suo archivio di file, anche quando il contatto è vicino. Un relay
  più vecchio di questa versione non può accettare file: aggiornalo.

### Altro sotto +

Sotto **+** c’è altro da inviare oltre a foto e file (anche la faccina alla fine del campo del messaggio apre gli
sticker):

- **Sticker:** uno dei 528 sticker integrati in Erevos, in 22 serie da 24 (tra cui **Lune**, **Cani**, **Grecia**,
  **Parole** e **Golosità**), disegnati da ogni telefono da sé: viaggia solo il loro nome, così non viene mai scaricato
  niente. Un Erevos di prima di questa funzione mostra invece la sua emoji. Tutti tranne le parole e le golosità si
  muovono un po’ per qualche secondo quando arrivano e quando li tocchi, poi stanno fermi; con l’impostazione del
  telefono che riduce le animazioni attiva, restano fermi. Le parole appaiono nella lingua dell’app.
- **Miei**, tra gli sticker, contiene quelli che crei dalle foto. **Nuovo sticker da una foto** ne ritaglia uno
  quadrato, lo rimpicciolisce (512 per 512, al massimo circa 100 KB) e tiene solo la sua immagine, niente di dove o con
  che cosa è stata scattata. È conservato sigillato nello spazio, o nelle chat nascoste in cui è stato creato, e appare
  solo lì, fino a 100; tienine premuto uno per eliminarlo. Come il resto, va in un backup, sigillato, e mai agli altri
  dispositivi dell’account. Parte come parte una foto, crittografato end-to-end tramite il relay, segnato come sticker,
  così appare da solo senza nuvoletta; un Erevos di prima di questa funzione lo mostra come foto. Tieni premuto uno
  sticker che qualcuno ti ha inviato e tocca **Aggiungi ai miei sticker** per tenerlo.
- **Posizione** (su Android): invia dove ti trovi, una volta, come luogo. La prima volta, Android chiede se Erevos può
  usare la posizione. Il telefono cerca in tutti i modi che ha insieme: via satellite, quando hai consentito la posizione
  precisa, e con la sua posizione di rete, che su molti telefoni chiede a Google o al produttore del telefono. Si apre
  subito un foglio che dice che sta cercando; al chiuso, dove i satelliti si vedono male, può volerci fino a un minuto. Se
  non arriva niente in tempo, propone il luogo che il telefono ha trovato negli ultimi dieci minuti, dicendo quanto tempo
  fa, oppure dice perché non ne è stato trovato nessuno, con **Riprova** e la schermata del telefono che lo cambia. Erevos
  guarda solo quando tocchi, ti mostra il luogo prima che parta, e non ti segue dopo. Il messaggio contiene solo le
  coordinate, crittografate end-to-end; in Erevos non viene caricata nessuna mappa. **Apri nelle mappe** passa il luogo
  alla tua app di mappe, che potrebbe caricare la sua mappa da internet. Un Erevos di prima di questa funzione mostra le
  coordinate come parole.
- **Sondaggio:** una domanda con due opzioni o più, fino a 12, e, con **Più di una risposta**, più di una da scegliere.
  Tocca un’opzione per sceglierla, di nuovo per ritirarla; ogni opzione mostra quanti l’hanno scelta, e chi. I voti
  viaggiano dentro la crittografia, come le reazioni. Un Erevos di prima di questa funzione mostra la domanda e le sue
  opzioni come parole, a cui rispondere a parole.

**Perché:** un pacchetto di sticker scaricato da internet direbbe a un server che questo telefono ha Erevos, quindi gli
sticker sono integrati e viaggiano solo i loro nomi. I tuoi sono elencati in un unico valore sigillato della stessa
dimensione per ogni spazio e posto nascosto, usato o no, così un elenco in uso sembra uno che non lo è: 100 è quanto
contiene. Un luogo si invia solo da Android: su un computer o nella web app, il browser chiederebbe a un servizio
esterno dove si trova.

### Anteprime dei link

Un link in un messaggio è sottolineato, e si apre solo quando lo tocchi e lo confermi. Con **Anteprime dei link**
attivo, nei dettagli di una chat, un link che invii parte con la sua anteprima: mentre lo invii, questo telefono
scarica la pagina e ne prende il titolo, una riga di descrizione e una piccola immagine, che vanno dentro il messaggio,
crittografati end-to-end. Il telefono che lo riceve non scarica nulla: mostra quello che è arrivato. È disattivato
finché non lo attivi, e allora è attivo per tutte le chat dello spazio;
ogni posto di chat nascoste ha un suo interruttore, nei dettagli di una chat lì.

**Perché:** solo il telefono di chi invia scarica la pagina, così il telefono che riceve un link non raggiunge nessun
sito scelto da qualcun altro, e non mostra a quel sito niente di sé, nemmeno il suo indirizzo.

- **Il sito vede l’indirizzo internet di questo telefono**, e quando, come lo vedrebbe da un browser, ma non per chi è
  il messaggio. Tramite Tor, Erevos invia solo le sue richieste al relay, non le pagine, quindi mentre tutto nello
  spazio passa da Tor (**Tutto** in Tor) non si creano anteprime.
- Erevos su un computer non ne crea, ma mostra lo stesso quelle che arrivano.
- **Via LoRa**, che trasmette poco, un messaggio parte senza la sua anteprima piuttosto che aspettare, e qui non ne
  tiene nessuna.
- Un’anteprima è quello che la pagina dice di sé, vero o no. Un Erevos di prima di questa funzione mostra il link senza.

### Chiamate vocali e videochiamate

Nella chat di un contatto, tocca la cornetta verde in alto per una chiamata vocale, o la videocamera blu accanto per
una videochiamata. La prima volta, Android chiede se
Erevos può usare il microfono, e la fotocamera per il video. Il suo telefono squilla mentre Erevos è aperto lì, su
qualsiasi schermata dello spazio: tocca **Rispondi** o **Rifiuta**. Durante la chiamata puoi disattivare il microfono,
cambiare l’altoparlante, spegnere la tua fotocamera, passare dalla fotocamera anteriore a quella posteriore, e
**Chiudi**. Ogni chiamata lascia una riga nella chat, come quanto è durata, o
una chiamata persa.

**Una normale chiamata sulla rete mobile:** quando un contatto ha il suo numero di telefono collegato, o è collegato a
uno dei tuoi contatti con un numero (**Collega a uno dei miei contatti** nella sua chat, prima un numero di cellulare),
il tastierino arancione in cima alla sua chat, prima della videocamera, apre un tastierino con quel numero già
scritto, e lo stesso fa quello in cima a una conversazione SMS. È il **Telefono** di Erevos quando Erevos è l’app
Telefono, altrimenti quello del telefono: tocca lì il tasto di chiamata. Una chiamata del genere
passa dalla rete dell’operatore telefonico e non è crittografata, come non lo è un SMS normale. Le chat nascoste e i
computer non ce l’hanno.

- **Crittografata end-to-end:** la chiamata si avvia con messaggi tramite il relay, crittografati come gli altri.
  Questi portano la chiave che crittografa la chiamata stessa, così nessuno nel mezzo può ascoltare, nemmeno il relay
  per le chiamate qui sotto.
- **Tramite il relay per le chiamate:** un relay configurato con il kit in \`deploy/relay\` ha accanto un relay per
  le chiamate. La chiamata passa da lì, così nessuno dei due telefoni conosce l’indirizzo IP dell’altro. Via Wi-Fi o
  dati mobili, ovunque.
- **Senza un relay per le chiamate** (un relay sul tuo computer, per esempio), Erevos prima chiede: la chiamata va
  allora direttamente tra i telefoni, funziona solo sulla stessa rete Wi-Fi, e ogni telefono vi vede l’indirizzo
  dell’altro.
- **Senza internet:** sulla stessa rete Wi-Fi, sull’hotspot di un telefono, o sulla rete Wi-Fi che due telefoni creano
  (Wi-Fi Direct), con uno spazio aperto su entrambi, una chiamata non ha bisogno di nessun relay: si avvia tramite il
  collegamento da vicino e va direttamente tra i telefoni (o i computer). Lo stesso vale per i messaggi di gruppo
  e le chiamate di gruppo.
- **In background (Android):** mentre uno spazio è aperto, Erevos continua a funzionare quando lo lasci, con Home o
  togliendolo dalle app recenti, con una notifica silenziosa, «Erevos – Ready for calls and messages», che non appare
  sulla schermata di blocco. Resta in ascolto sul relay e sui collegamenti con i telefoni vicini, così i messaggi
  arrivano: una notifica dice solo «New message», o quanti ne sono arrivati, e a telefono bloccato solo «Erevos». Una
  richiesta di messaggio, da qualcuno che ha solo il tuo link di contatto, fa la stessa notifica e lo stesso suono, e
  conta sull’icona, come qualsiasi messaggio. Una chiamata squilla con la suoneria del telefono e una notifica,
  «Incoming call» (o «Incoming video call») – «Open Erevos to answer», senza nome, anche sulla schermata di blocco e
  sul salvaschermo, e lo schermo si accende. Toccala per rispondere. Con il blocco
  con password attivo, una chiamata che squilla appare prima della password, ed Erevos si blocca appena finisce. Da
  bloccato, lo spazio continua dietro la schermata della password, quindi messaggi e chiamate arrivano comunque, e una
  chiamata appare sopra la schermata della password. Solo le chat
  e i gruppi di quello spazio arrivano così, e le chat nascoste con **Ricevere da chiuse** attivo; le altre chat
  nascoste dicono solo che è arrivato un messaggio, o squillano senza nome, se lo permetti
  (vedi Chat nascoste). Impostalo in **Impostazioni** → **Notifiche** → **In background**:
  **Ricevi e squilla** (l’impostazione predefinita) o **Solo mentre Erevos è visibile**, e **Avvisa dei nuovi messaggi**
  (l’impostazione predefinita) o **Nessun avviso**, che vale anche mentre Erevos è visibile. Anche lì, se Android li
  chiede, **Continua anche col risparmio batteria** e **Mostra le chiamate sulla schermata di
  blocco**.
- **Il numero sull’icona:** con **Avvisa dei nuovi messaggi** attivo, quando esci da Erevos con messaggi non letti
  nelle chat e nei gruppi dello spazio aperto, la notifica resta, senza suono, e dice quanti sono, con quelli che
  segnala dopo; se ne va mentre Erevos è visibile, e torna quando lo lasci, finché non li hai letti. Non conta i
  messaggi di una chat in silenzio (vedi Notifiche di questa chat), né quelli di una chat nascosta quando esci. Il
  launcher di Android la mostra sull’icona di Erevos, come numero o, su alcuni telefoni come i Pixel, come punto.
  **Impostazioni** → **Notifiche** → **Numero sull’icona** lo disattiva: allora la notifica parla solo di ciò che è
  arrivato dall’ultima volta che avevi Erevos aperto, e il numero del launcher se ne va con lei. Un messaggio eliminato
  per tutti prima che tu lo legga, o letto su un computer collegato, non conta più.

  **Perché:** su Android solo una notifica può mettere un numero sull’icona di un’app, quindi la notifica resta finché
  ci sono messaggi in attesa; non dice più di quanti sono, come ha sempre fatto.
- **Uno spazio chiuso:** non riceve nulla, perché la sua chiave è in memoria solo mentre è aperto: i suoi messaggi
  aspettano sul suo relay e arrivano quando lo apri. A meno che tu non scelga, in quello spazio, **Anche mentre è aperto
  un altro spazio** in **Impostazioni** → **Notifiche** → **In background** (l’impostazione predefinita è **Questo
  spazio solo quando è aperto**): allora, mentre un altro spazio è aperto e riceve, dice solo «New message», o quanti ne
  sono arrivati, con la stessa notifica di quello spazio, mai quale spazio, e le sue chat nascoste non dicono nulla.
  Quello che altri telefoni hanno portato al suo relay conta come messaggio, anche le eliminazioni, e un messaggio
  inviatogli senza suono suona come al solito (vedi **Invia senza suono**). Per
  questo il telefono conserva gli indirizzi delle sue code sul suo relay fuori dalla sua password, tra cui quella in cui
  scrive ciascuno dei suoi contatti, fino a 64 contatti, mai le sue chiavi, chi sono i suoi contatti o i messaggi, e
  chiede al relay solo quanti ne sono arrivati, mai i messaggi stessi: restano lì finché lo spazio non si apre. A uno
  spazio che passa da Tor (**Messaggi**, l’impostazione predefinita, o **Tutto**, in **Cosa passa da Tor**) si chiede solo
  tramite Tor: mentre lo spazio aperto ha Tor disattivato, o il suo Tor si sta avviando o ha appena fallito, lo spazio
  chiuso non dice nulla, e quello che è arrivato viene detto appena lì Tor è pronto.

  **Perché:** uno spazio dietro una seconda password non deve mostrare di esistere, quindi questo è disattivato finché
  non lo attivi, e allora non dice più di quanto direbbe lo spazio aperto. Se gli si chiedesse direttamente dal
  telefono mentre un altro spazio è aperto, il suo relay o qualcuno che osserva la rete potrebbe collegare i due spazi
  tramite l’indirizzo internet del telefono. Poiché ogni contatto scrive in una coda tutta
  sua, lo spazio deve chiedere anche di ciascuna di esse, altrimenti i loro messaggi non direbbero nulla. Il prezzo è
  che il suo relay potrebbe capire che i due spazi sono su un unico telefono, e qualcuno che esamina il telefono con
  degli strumenti potrebbe scoprire che un secondo spazio conserva lì degli indirizzi, e quanti contatti ha.
- **Dove non può squillare:** fermato da Android (o dal risparmio batteria del telefono, o da un’impostazione del
  produttore del telefono), dopo il riavvio del telefono finché non apri Erevos e lo spazio una volta, in un altro
  spazio (dice solo che è arrivato un messaggio, se lo permetti, come sopra), o su un computer o nella web
  app mentre è chiusa. Lì una chiamata appare come chiamata persa quando Erevos si apre. Quando Android chiude Erevos
  mentre riceve e lo riavvia, come fa di solito, una notifica silenziosa lo dice: apri Erevos e lo spazio per ricevere
  di nuovo. Dopo **Forza interruzione**, con l’utilizzo della batteria impostato su Con restrizioni, o quando lo chiude
  l’impostazione del produttore del telefono, Android non riavvia nulla, quindi nessuna notifica lo dice: la notifica
  «Erevos» semplicemente sparisce, e niente squilla finché non apri Erevos. **Autorizzazioni** (più sotto) lo dice in
  anticipo se una di queste è impostata. Lo stesso fa una,
  «Locked», quando lo spazio che riceveva si chiude (dopo il ripristino di un backup, per esempio) ed Erevos lascia lo
  schermo chiedendo la password. Una richiesta di messaggio non può chiamarti finché
  non la accetti.
- **Autorizzazioni (Android):** **Impostazioni** → **Generali** → **Autorizzazioni** mostra che cosa Android permette a
  Erevos di fare per chiamate e messaggi in background (notifiche, la notifica delle chiamate e il suo comparire in
  primo piano, la notifica dei messaggi, con le sue notifiche «Messages without sound» e «Messages with a chat's own
  sound», che tengono anche il numero sull’icona, le chiamate sulla schermata di blocco, il funzionamento col risparmio
  batteria, il funzionamento in background con l’utilizzo della batteria non impostato su Con restrizioni, la non
  sospensione quando non è usato, i dati mobili in background, il microfono) e per altre cose (il suono per i nuovi
  messaggi, le notifiche sulla schermata di blocco, le chiamate attraverso Non disturbare, la fotocamera, i telefoni
  vicini, i contatti, gli orari esatti per gli SMS inviati più tardi e i promemoria, la notifica dei promemoria una
  volta arrivato un promemoria), ognuna con il perché e un pulsante che apre la domanda o l’impostazione di Android
  stesso. Dice anche quando il telefono è in silenzioso o in vibrazione, quando è attivo il risparmio energetico, e
  quando Non disturbare è attivo e non lascia passare le chiamate di Erevos. Sui telefoni Huawei, Honor, Xiaomi, OPPO,
  realme, OnePlus, vivo, Samsung e ASUS dice anche dov’è l’impostazione del produttore, che Erevos non può leggere:
  tocca **Fatto** quando è impostata. Dopo ogni nuova versione, e la prima volta, si apre da sola quando chiamate o
  messaggi hanno bisogno di qualcosa. Nella web app mostra che cosa permette il browser, vedi [Su iPhone](#iphone).
- **Una chiamata alla volta.** Una chiamata continua mentre passi da una schermata all’altra dello spazio. Finisce
  quando lo spazio si chiude, e una chiamata nelle chat nascoste quando queste si chiudono, cosa che non fanno durante
  una chiamata. Anche togliere Erevos dalle
  app recenti chiude una chiamata.
- Le chiamate non passano da un telefono vicino o dal Bluetooth. Lì, **Talkie** sotto **+** trasforma la chat in un
  walkie-talkie, e sopra il campo appare **Talkie attivo**: tieni premuto il walkie-talkie alla fine della barra mentre
  parli, lascia, e viene riprodotto sul suo telefono man mano che arriva, se la chat con te è aperta
  lì; altrimenti, aspetta come messaggio vocale. È un messaggio vocale più piccolo (circa 3 KB al secondo), quindi va
  ovunque vada un messaggio, Bluetooth compreso.

**Perché:** le chiavi che aprono i messaggi di uno spazio sono in memoria solo mentre è aperto, e altrimenti sigillate
dietro la sua password. Così dopo il riavvio del telefono non si può leggere nulla e niente squilla finché non apri
Erevos e lo spazio una volta; e le chat nascoste, la cui chiave è in memoria solo mentre sono aperte a meno che
**Ricevere da chiuse** non la tenga con lo spazio, altrimenti dicono solo che è arrivato un messaggio, o squillano senza
nome, se lo permetti.

> Le impostazioni del relay, la tua coda, i tuoi contatti e i loro nomi, le chiavi delle tue conversazioni e i
> messaggi sono conservati in questo spazio, sigillati. La cronologia non ha limiti: è conservata in pagine sigillate
> della stessa dimensione, mescolate con le pagine degli altri spazi e delle chat nascoste, quindi si vede solo quanto
> occupano tutte insieme, non di chi sono. Il resto è conservato della stessa dimensione per ogni spazio e per le chat
> nascoste, usati o no; quello che è più grande va in pagine come quelle della cronologia, in mezzo a loro. I messaggi
> eliminati possono restare per un po’ nella memoria del telefono, sigillati come il resto, finché qualcosa non viene
> scritto sopra di loro. I messaggi inviati o ricevuti da vicino sono conservati allo stesso modo.

## Chat di gruppo {#groups}

Dal menu della schermata principale, **Nuovo gruppo**: dagli un nome, spunta i contatti da invitare, e tocca **Crea il
gruppo**. Ne sei l’admin. Il telefono di ogni contatto risponde da solo la prossima volta che vi si apre Erevos, ed
entra: il gruppo appare allora nella sua schermata principale, con un avviso di chi l’ha aggiunto. Un telefono entra
solo in un gruppo il cui admin è il contatto che gliel’ha chiesto, e un admin fa entrare un contatto solo come se
stesso, mai come qualcun altro. I gruppi passano dal relay, quindi deve essere impostato.

**Perché:** solo il telefono dell’admin cambia il gruppo (chi ne fa parte, il suo nome), così nessun server deve
mettere in ordine le modifiche: ogni telefono le prende da quello. Per questo un membro esce chiedendolo all’admin, e
solo l’admin aggiunge o rimuove membri.

- **Chi si può invitare:** i contatti che hai accettato, in questo spazio. I membri che non sono contatti tra loro
  parlano comunque nel gruppo, e appaiono con l’inizio della loro chiave.
- **Aggiungi come contatto:** nell’elenco dei membri (**⋯**), **Aggiungi come contatto** sotto un membro che non è un
  tuo contatto gli chiede, in un messaggio che riceve solo lui, il suo link di contatto, e gli dà il tuo. Sul suo
  telefono la richiesta appare una volta, in cima al gruppo, e tocca **Invia** o **Non inviare**; se tocca **Non
  inviare**, non ti viene detto. Appena lo invia siete l’uno contatto dell’altro, con una chat tutta vostra, e **Nome**
  gli dà un nome, come fa sotto ogni contatto che non ne ha ancora uno. Nessuna risposta può voler dire che non ha
  ancora aperto il gruppo, ha detto di no, ha un Erevos più vecchio, o ti ha ancora come contatto, cosa che non gli
  mostra nulla; dopo una settimana puoi chiedere di nuovo. Appena siete l’uno contatto dell’altro, in qualsiasi gruppo
  o con un link di contatto, quello che era stato chiesto negli altri vostri gruppi se ne va, e la sua richiesta non
  appare più. Un membro rimosso dal gruppo non chiede più nulla. Se due membri mostrano la stessa chiave, uno dei due
  non è chi dice di essere, e nessun link di contatto va a nessuno dei due o viene preso da nessuno dei due. Non nei
  gruppi pubblici. La richiesta è per il telefono che ha l’account; **Nome** funziona anche su un dispositivo
  collegato.
- **Crittografato end-to-end per il gruppo:** MLS (RFC 9420). Ogni messaggio viene crittografato una volta per il
  gruppo, poi sigillato di nuovo per ogni membro, così quello che arriva alla coda di ogni membro non somiglia a niente
  di quello che ricevono gli altri, e nessun relay può capire chi fa parte di un gruppo. Va direttamente alla coda di
  ogni membro, tramite il tuo relay. Ogni settimana le chiavi di ogni telefono nel gruppo vengono rinnovate, quelle
  dell’admin da sole e quelle di ogni membro tramite l’admin, così le chiavi prese una volta da un telefono smettono di
  leggere il gruppo.
- **Membri:** tocca il nome del gruppo in alto, o **⋯** accanto. L’admin aggiunge contatti, rimuove membri e rinomina
  il gruppo. Un
  membro rimosso non legge più niente di quello che dice il gruppo da quel momento, e il gruppo resta sul suo telefono,
  in sola lettura, finché non lo elimina.
- **Uscire:** **Lascia il gruppo** lo chiede all’admin, il cui telefono ti rimuove la prossima volta che vi si apre
  Erevos. Il pulsante dell’admin è **Chiudi il gruppo**: rimuove tutti i membri.
- **Chiamate di gruppo:** la cornetta verde in cima al gruppo avvia una chiamata vocale al suo interno, e la
  videocamera blu accanto una videochiamata (anche **Videochiamata** sotto **⋯**). Mentre ne è in corso una, appare solo
  il suo pulsante, per unirsi. Squilla sui telefoni dei membri dove Erevos è aperto, e chi risponde ne fa parte. Una
  chiamata in corso appare in cima al gruppo, per unirsi più tardi. Fino a otto persone: ogni telefono si collega a
  ciascuno degli altri, tramite il relay per le chiamate, così nessun telefono vede l’indirizzo IP di un altro; senza
  un relay per le chiamate, solo sulla stessa rete Wi-Fi. Crittografata end-to-end tra ogni coppia di telefoni, con le
  loro chiavi inviate nella crittografia del gruppo. In una videochiamata ogni telefono invia la sua immagine a ciascuno
  degli altri, quindi le immagini appaiono per un massimo di quattro persone; con di più, si fermano e il suono
  continua, finché non verrà predisposto un server per videochiamate più grandi.
- **Foto, file e messaggi vocali:** **+** accanto al campo invia una foto o un file, come nella chat di un contatto,
  con la stessa **Qualità della foto**; tieni premuto il microfono mentre parli, e lascia per inviare. Ognuno viene
  crittografato con una sua chiave e messo una volta sul tuo relay, e al gruppo vanno solo dove si trova e la sua
  chiave, nella sua crittografia. Il telefono di ogni membro lo prende da lì tramite il suo relay: fino a 16 MB da solo
  mentre il gruppo è aperto, uno più grande quando lo tocca. Tocca una foto per vederla intera, un file per salvarlo, un
  messaggio vocale per riprodurlo.
  - **Il relay lo conserva 14 giorni,** crittografato, perché non può sapere quando ogni membro l’ha preso.
  - **Solo tramite il relay,** anche quando i membri sono vicini.
  - **Un membro che entra dopo** non riceve quello che è arrivato prima, come per le parole. Un membro il cui Erevos è
    di prima di questa versione non ne vede nulla.
  - **Sul telefono** ognuno è conservato nei suoi pezzi, sigillato, come nella chat di un contatto. Eliminare il gruppo
    qui li elimina.
- **Il menu di un messaggio,** tenendolo premuto, come nella chat di un contatto: le reazioni, **Rispondi**,
  **Inoltra**, **Importante**, **Fissa**, **Copia**, **Modifica** ed **Elimina**. Ogni membro ha una reazione per
  messaggio, e un sondaggio mostra chi ha scelto cosa. Un messaggio fissato lo è per tutti, e qualsiasi membro può usare
  **Non fissare più**. **Modifica** dà alle tue parole parole nuove per ogni membro, fino a un giorno dopo l’invio,
  segnate **Modificato**. **Elimina** chiede **Questo telefono** o, per un tuo messaggio, **Per tutti**:
  anche l’Erevos dei membri lo elimina, e una tua foto, un tuo file o un tuo messaggio vocale lascia subito il tuo relay
  invece che dopo 14 giorni. Anche qui **+** ha **Sticker**, **Posizione** e **Sondaggio**. I link sono sottolineati e
  prima di aprirli viene chiesto, e le **Anteprime dei link**, se attive, partono con i tuoi. Nel pannello dei membri, o
  nella schermata di un gruppo pubblico, **Cerca in questa chat** cerca tra i messaggi del gruppo ed **Esporta chat**
  li scrive su file; anche **Messaggi importanti** e la ricerca della schermata principale includono i gruppi. Un
  membro il cui Erevos è di prima di questa versione vede le parole, l’emoji di uno sticker, le coordinate di un luogo
  e la domanda di un sondaggio, e niente di reazioni, messaggi fissati, modifiche ed eliminazioni.
- **Non ancora:** segni, scrittura in corso e messaggi effimeri nei gruppi, e gruppi tramite un telefono vicino.

## Gruppi pubblici {#public-groups}

Un gruppo pubblico è un gruppo in cui chiunque abbia il suo link, o il suo codice QR, può chiedere di entrare: per un
club, una strada o una classe, dove non tutti sono tuoi contatti. Dal menu della schermata principale, **Gruppi
pubblici**: dagli un nome e il nome con cui ti presenti al suo interno, scegli chi può entrare, e tocca **Crea il
gruppo pubblico**. Ne sei il proprietario. I suoi messaggi sono crittografati end-to-end con MLS e vanno a ogni membro
come in qualsiasi gruppo, e nessun relay sa chi ne fa parte.

- **Il link:** tocca il nome del gruppo in alto per il suo link e il suo codice QR, e **Condividi il link**. Chi lo
  apre, o scansiona il codice con la fotocamera del telefono, sceglie il nome che vede il gruppo e tocca **Chiedi di
  entrare**. Un link si può anche incollare sotto **Entra con un link**. Ogni membro ha il link, e può passarlo ad
  altri.
- **Entrare mentre non ci sei:** la richiesta aspetta sul tuo relay, sigillata così che solo il tuo telefono la apra,
  finché Erevos non è aperto sul tuo telefono: controlla ogni pochi secondi mentre Erevos è visibile, e circa ogni
  minuto in background. Allora lo fa entrare, e il gruppo appare sul suo telefono.
- **Chi può entrare:** **Chiunque abbia il link**, o **Li accetta un admin**: allora chi chiede aspetta sotto **Chiedono
  di entrare**, finché tu o un admin non toccate **Fai entrare** o **Rifiuta**. È comunque il tuo telefono a farlo
  entrare, appena lo sa.
- **Admin:** in **Membri**, tocca **Modera** accanto a un membro, poi **Rendi admin**. Gli admin silenziano, rimuovono
  ed escludono membri, fanno entrare chi chiede, ed eliminano un messaggio per tutti; solo tu moderi gli admin, e
  nessuno modera te.
  - **Silenzia:** il suo telefono non invia nulla nel gruppo, e nessun telefono mostra comunque quello che il suo
    invia. **Lascia scrivere** lo annulla.
  - **Rimuovi:** non legge più nulla di quello che dice il gruppo da quel momento, e può chiedere di nuovo di entrare
    con il link.
  - **Escludi:** rimosso, e quello che il suo telefono chiede dopo viene rifiutato. **Togli l’esclusione**, sotto
    **Esclusi**, lo annulla. Un’esclusione ferma lo stesso telefono, non qualcuno che torna con una nuova coda sul
    relay: contro questo, scegli **Li accetta un admin**, o cambia il link.
  - **Elimina per tutti:** gli ultimi messaggi sono elencati in fondo; **Elimina** ne toglie uno dal telefono di ogni
    membro. Chi l’ha già letto potrebbe averne tenuto una copia.
- **Cambia il link:** il link e il codice QR condivisi finora smettono subito di funzionare, e ogni membro riceve
  quello nuovo. Le richieste ancora in attesa su quello vecchio vanno perse.
- **Cedi il gruppo:** nel **Modera** di un membro. Da quel momento il gruppo è del suo telefono, che fa entrare le
  persone, quindi il link cambia in uno sul suo relay; tu resti admin. Se perdi il telefono prima di cederlo, nessuno
  potrà più far entrare nessuno, anche se il gruppo continua per chi ne fa parte.
- **Chiudi il gruppo** rimuove tutti i membri. **Lascia il gruppo** di un membro chiede al tuo telefono di rimuoverlo.
- **Fino a 100 membri,** perché l’intero gruppo deve stare nell’unico messaggio che fa entrare qualcuno.
- **Ogni telefono in un gruppo pubblico ha bisogno di questa versione di Erevos.** I gruppi creati dai contatti
  funzionano come prima.

**Perché:** solo il telefono del proprietario cambia il gruppo e fa entrare le persone, così le modifiche non si
accavallano mai e nessun server deve metterle in ordine. Per questo il gruppo continua senza di lui, ma non entra
nessuno di nuovo: cedilo prima di cambiare telefono.

### Che cosa rivela un gruppo pubblico

> Chiunque abbia il link può leggere il gruppo da quando viene fatto entrare, mai quello che è stato detto prima, e il
> link può essere passato ad altri: cambialo per fermare tutto questo.

- **Il link** mostra il nome del gruppo e l’indirizzo del tuo relay a chiunque lo veda.
- **Ogni membro vede di ogni membro** il nome scelto, una chiave creata solo per questo gruppo, l’indirizzo del suo
  relay e l’ID mittente della sua coda. La chiave non dice niente di chi è nelle sue chat, né di quali altri gruppi fa
  parte. La coda è una su cui leggono solo i suoi gruppi pubblici, non quella del suo link di contatto, la stessa in
  ciascuno dei suoi gruppi pubblici (un Erevos precedente alla 2.0.0 indica quella del suo link di contatto).
- **I nomi sono scelti, non verificati:** chiunque può chiamarsi come vuole. L’inizio della chiave di ogni membro
  appare accanto al nome, e il proprietario e gli admin sono segnalati.
- **Qualsiasi cosa venga detta può essere copiata** da chiunque nel gruppo: la crittografia end-to-end tiene fuori i
  relay, non i membri.
- **I relay** non leggono nulla e non sanno chi fa parte del gruppo. Il tuo vede le richieste arrivare alla porta del
  gruppo, quante e quando, non da chi. I membri possono riempire la coda l’uno dell’altro con cose illeggibili, fino a
  quanto accetta il relay.

## Come Erevos sceglie la strada {#paths}

Quando invii un messaggio, Erevos sceglie la strada da solo:

1. **Il suo telefono è vicino** (in cima alla chat c’è scritto **Vicino**): va tramite il collegamento da vicino, e
   anche tramite il relay quando ce n’è uno.
2. **Altrimenti, con un relay:** va tramite il relay, e un messaggio breve va anche ai telefoni con Erevos collegati da
   vicino, così il suo può rispondere da vicino se è uno di loro. Se il relay non è raggiungibile, conta quella copia, e
   quei telefoni la portano anche al relay del tuo contatto, come in [Chat con un telefono vicino](#nearby).
3. **Altrimenti, senza relay,** va ai telefoni con Erevos collegati da vicino, come in 2.
4. **E via LoRa,** quando è impostata una radio e il relay non ha potuto prendere un testo, come in [Con una radio
   LoRa](#lora). Senza nessuna strada, il messaggio aspetta, segnato **In attesa**, e parte da solo appena ce n’è una,
   come in [Inviato, arrivato e letto](#relay); una riga sotto la chat dice perché.

Ogni strada è crittografata end-to-end: nessun relay e nessun telefono nel mezzo può leggere quello che invii.

| Riga sotto la chat | Cosa fare |
| --- | --- |
| **Inviato da vicino, crittografato end-to-end.** | Niente: il suo telefono è vicino e l’ha ricevuto. |
| **Inviato tramite il relay, crittografato end-to-end.** | Niente: è in viaggio. |
| **Inviato ai telefoni con Erevos vicini, crittografato end-to-end, perché il relay non era raggiungibile.** | Arriva solo se uno di loro è il suo: aspetta **✓✓**, o controlla il relay. |
| **… Se il suo non è tra loro, lo consegnano al suo relay appena raggiungono internet, e così fa anche questo telefono.** | Niente: arriva appena uno di loro, o questo telefono, raggiunge internet. Aspetta **✓✓**. |
| **Inviato via LoRa, crittografato end-to-end, perché il relay non era raggiungibile.** | Arriva se il suo Erevos ha una radio sulla stessa mesh, a portata: aspetta **✓✓**, o controlla il relay. |
| **In attesa. Il relay non è raggiungibile (o Non c’è nessun relay), e il suo telefono non è vicino.** | Niente: parte da solo appena il relay o il suo telefono vicino può prenderlo, e allora mostra **✓**. Senza un relay, inserisci il suo indirizzo, come in [Chat tramite un relay](#relay), o avvicinati al suo telefono. |
| **In attesa. È troppo lungo per LoRa.** | Niente: parte appena il relay o il suo telefono vicino può prenderlo. Oppure invialo in parti più brevi. |
| **Non inviato. Il relay non ha più la coda di questo contatto.** | Chiedigli di scriverti, o il suo nuovo link di contatto. |
| **Questa versione non può crittografare, quindi le chat tramite il relay sono disattivate.** | Ricompila l’app: questa versione è più vecchia della sua crittografia. |

## Gestire un relay tuo {#own-relay}

Un relay che gestisci tu stesso è il più sicuro, perché chi gestisce un relay vede chi vi si collega. Il codice
sorgente ha tutto in \`deploy/relay\`.

- **Sulla tua rete:** fai girare il relay su un computer, apri la porta 7879 nel suo firewall, e scrivi
  \`ws://<il suo indirizzo>:7879\` su ogni telefono. Richiudi la porta quando hai finito.
- **Su internet:** un server (VPS) con Debian 12 o Ubuntu 22.04 o successivi, un nome di dominio (o un nome gratuito
  \`sslip.io\`) e le porte 80 e 443 aperte. Un solo comando installa il relay dietro Caddy, con un certificato di
  Let's Encrypt e un token casuale. Ogni telefono usa poi \`wss://<il tuo dominio>\` e quel token. Lo stesso comando
  configura il relay per le chiamate, che richiede aperte anche la porta 3478 e le porte UDP da 50000 a 50999.

Le code e i messaggi in attesa sono conservati sul disco del server, e così i pezzi crittografati di foto e file
finché non vengono presi (al massimo 1024 MB in tutto), quindi un riavvio non fa perdere nulla, e nessuna richiesta
viene registrata.
Anche i messaggi inviati per dopo sono conservati lì fino alla loro ora, al massimo 10.000 o 256 MB: il relay vede
quando deve partire ognuno, non che cosa dice.

**Perché:** quello che il relay conserva ha dei limiti, così i telefoni che lo usano non possono riempire il suo disco
o la sua memoria.

**La sua chiave:** il file della chiave del relay (\`EREVOS_RELAY_KEY\`, che il comando unico configura) è ciò che
dimostra a ogni connessione, così i telefoni lo riconoscono da quella chiave e non dal suo certificato (vedi [La chiave
del relay](#relay)). Conserva quel file, anche nei suoi backup: con uno nuovo, ogni telefono che conosceva la vecchia
chiave rifiuta il relay finché qualcuno non tocca **Ha una chiave nuova** su di esso.

**Inviti:** il relay può dare a ogni telefono un token tutto suo, in un file di token, e poi lasciare che quei telefoni
ne invitino altri, ogni invito per un telefono (vedi [Inviti al relay](#relay)). Attivalo con
\`EREVOS_RELAY_INVITES=on\` accanto a \`EREVOS_RELAY_TOKENS\`; il relay scrive allora da solo in quel file le righe dei
telefoni invitati, con chi li ha invitati e quando, e togliere una riga esclude quel telefono, e i telefoni che ha
invitato. Fa entrare al massimo 100 telefoni su invito (\`EREVOS_RELAY_MAX_INVITED\`). Chi ha invitato chi si basa sul
token, non sul nome: una riga messa al posto di un’altra con un token nuovo esclude i telefoni invitati da quella
vecchia, a meno che
\`erevos-relay free-line NAME\`, eseguito con il relay fermo, non li liberi prima. Un telefono che arriva con il token
del relay (\`EREVOS_RELAY_TOKEN\`) chiede una volta una riga tutta sua, che il relay aggiunge come una delle tue,
indicando che è arrivato con il token del relay e quando, al massimo 50 al giorno: così puoi distribuire quel token,
eliminare la riga di un singolo telefono, e poi cambiare il token senza escludere gli altri.
\`deploy/relay/README.md\` spiega come.

**Accesso:** con un file di token, il relay può anche far accedere i telefoni con un fornitore OpenID Connect, come
Authentik, per un token tutto loro, e controlla ogni account ogni ora, togliendo i suoi telefoni dopo 3 giorni senza
risposta e altri due controlli di ogni telefono falliti a un’ora di distanza (vedi [Accedere al relay](#relay)). Un
browser può avviare 10 accessi al minuto. Con \`EREVOS_RELAY_OIDC_GROUP\`, possono farlo solo gli account di quel
gruppo.
Servono un client presso il fornitore, alcune impostazioni, e \`/signin/\` passato al relay come HTTP semplice:
\`deploy/relay/README.md\` spiega come.

> Non pubblicare mai il token dove altri possono leggerlo. Chi gestisce il server vede gli indirizzi IP che si
> collegano, gli id delle code, e quando e quanto arriva. Non può leggere i messaggi, che sono crittografati
> end-to-end.

## Relay di casa {#home-relay}

In **Impostazioni** → **Relay e reti** → **Relay di casa**, uno spazio può avere un secondo relay con una sua coda:
uno a casa, su un Raspberry Pi o un vecchio computer, o qualsiasi altro relay di cui ti fidi. È facoltativo.

- **Che cosa fa:** il tuo link di contatto e ogni messaggio indicano quella coda accanto al tuo relay. Mentre il tuo
  relay non è raggiungibile, i contatti scrivono lì, ed Erevos prende quello che vi arriva a ogni controllo. Quello che
  invii passa da lì quando il tuo relay è fuori uso.
- **Come configurarlo:** fai girare un relay come in [Gestire un relay tuo](#own-relay), scrivi il suo indirizzo (e il
  token, se ne ha uno) e scegli **Salva**. I contatti lo conoscono dal tuo prossimo messaggio, o dal tuo nuovo link di
  contatto.
- **Che cosa vede:** quello che vede il tuo relay, l’indirizzo di questo telefono quando prende i messaggi, e quando e
  quanto arriva. Le chat nascoste non lo usano.
- **Per le chat nascoste:** ogni posto nascosto può avere un suo relay di casa, in **Per utenti esperti** nella sua
  schermata senza nessuna chat scelta, mentre è aperto. È conservato solo con quel posto, sigillato con il suo PIN,
  così lo spazio non ne sa nulla, e viene controllato mentre il posto è aperto. Usa un relay diverso da quello dello
  spazio: un relay che vedesse entrambe le code potrebbe collegarle tra loro.

## Tramite Tor {#tor}

In **Impostazioni** → **Relay e reti** → **Tor**, **Cosa passa da Tor** sceglie quali richieste di questo spazio ai
suoi relay passano dalla rete Tor. Ogni spazio ha la sua scelta:

| Scelta | Cosa passa da Tor |
| --- | --- |
| **Messaggi** | A meno che tu non la cambi. Quello che scrivi, e quello che dice qualcosa ai tuoi contatti, come il fatto che un messaggio è stato letto. Immagini, file e messaggi vocali vanno direttamente, il che è più veloce: per loro il relay vede l’indirizzo IP del tuo telefono. |
| **Tutto** | Anche i file. Niente va a un relay senza Tor. |
| **Niente** | Il relay vede l’indirizzo IP del tuo telefono per tutto. |

**Perché:** con **Messaggi**, quello che scrivi è nascosto da Tor e non lo aspetta mai, mentre immagini, file e
messaggi vocali, che sono grandi, vanno direttamente e quindi più veloci.

- **Che cosa nasconde:** il relay non vede più l’indirizzo IP del tuo telefono, solo un’uscita Tor (o niente, per un
  relay con un indirizzo \`.onion\`). Il tuo operatore telefonico o la rete Wi-Fi vedono solo che usi Tor, non quale
  relay.
- **Che cosa costa:** quello che passa da Tor va e viene più lentamente, e il primo avvio di Tor richiede un po’ di
  tempo. La schermata mostra a che punto è Tor. Per risparmiare la batteria, Erevos invia il riempimento ridotto che
  Tor ha creato per i telefoni: il traffico di riempimento che Tor invia per nascondere quando parli parte ogni 9–14
  secondi, non ogni pochi, e al telefono non ne arriva.
- **Che cosa non copre:** le chiamate, il cui suono e la cui immagine vanno direttamente tra i telefoni o tramite il
  relay per le chiamate; i telefoni vicini e gli SMS, che non usano internet.
- **Solo su Android:** Erevos su un computer e la web app non hanno ancora Tor, quindi lì tutto va direttamente.

> Con **Messaggi**, un messaggio non aspetta mai Tor: uno che Tor non è riuscito a portare al relay va subito
> direttamente, e così i messaggi mentre Tor si avvia, o per un minuto dopo che non è riuscito a raggiungere il relay;
> poi si riprova Tor. Con **Tutto**, niente va a un relay senza Tor:
> quando Tor non riesce a raggiungere il relay, il messaggio aspetta e si riprova; Erevos non ripiega mai da solo sulla
> tua connessione.

### Bridge

Dove Tor stesso è bloccato, **Bridge** nella stessa schermata permette a Tor di raggiungere la sua rete tramite dei
bridge. È su **Nessun bridge** finché non scegli, ogni spazio ha il suo, e conta solo mentre qualcosa passa da Tor.

| Scelta | Che cos’è |
| --- | --- |
| **obfs4** | I bridge obfs4 inclusi in Tor Browser. A chi osserva la rete, Tor sembra fatto di byte casuali. Un censore che li conosce può bloccarli. |
| **Fiocco di neve** | Tramite i browser di volontari, via WebRTC, come passa una videochiamata. Per trovarne uno, Erevos chiede al broker di Snowflake tramite una CDN, dietro il nome di un altro sito, e dei server STUN dicono al telefono il suo indirizzo: vedono quell’indirizzo, mai i tuoi messaggi. Più lento, e difficile da bloccare. |
| **I miei** | Righe di bridge da bridges.torproject.org, da bridges@torproject.org via email, o da @GetBridgesBot su Telegram, incollate una per riga; poi tocca **Usa questi bridge**. Funzionano i bridge obfs4, Snowflake, WebTunnel, meek e semplici. |

- **Solo tramite loro:** con i bridge, Tor non va mai direttamente ai suoi relay. Quando nessun bridge risponde, con
  **Tutto** i messaggi aspettano, come quando Tor non riesce a raggiungere il relay; con **Messaggi** vanno al relay
  senza Tor finché uno non risponde. Le righe che non sono bridge non vengono accettate, e Tor resta spento.
- **Cambiarli** mentre Tor è in funzione chiude le sue connessioni e le ricrea nel nuovo modo.
- **Solo su Android:** l’app include lyrebird, il programma di Tor per obfs4, Snowflake, WebTunnel e meek. Un
  computer e la web app non hanno ancora Tor, quindi nemmeno i bridge.

## Tramite Nostr {#nostr}

In **Impostazioni** → **Relay e reti** → **Nostr**, **I testi tramite Nostr** è **Attivato** a meno che tu non lo
cambi. Allora quello che scrivi a un contatto il cui Erevos legge anche su Nostr passa da relay Nostr pubblici, tramite
Tor, invece che dal tuo relay. Ogni spazio ha la sua scelta, e i suoi relay Nostr.

- **Come è sigillato:** crittografato end-to-end come sempre, poi sigillato un’altra volta per una chiave che il tuo
  contatto ha dato solo a questa chat, e firmato da una chiave creata per quel solo testo (un gift wrap NIP-59). I relay
  Nostr vedono che qualcuno ha scritto a una chiave che non nomina nessuno, quando, e quanto è grande; non chi l’ha
  scritto, né a chi. Il tuo relay non lo vede affatto.
- **Che cosa possono capire i relay Nostr:** il tuo telefono chiede a ciascuno di loro tutte le sue chiavi insieme,
  tramite Tor: un relay può capire che quelle chiavi vengono lette insieme, mai da dove. Ogni relay viene raggiunto su
  circuiti Tor tutti suoi, così nessuna uscita Tor trasporta quello che va a due di loro, e nessuna può capire che è di
  un unico telefono. Alcuni relay rifiutano alcune uscite Tor, e alcune uscite non riescono a raggiungere un relay: dopo
  un fallimento del genere, il tentativo successivo passa da un’altra uscita.
- **Solo tramite Tor:** con Tor impostato su **Niente**, o mentre Tor si avvia, i testi passano dal tuo relay.
- **I relay:** relay.damus.io, nos.lol e relay.primal.net a meno che tu non li cambi; puoi aggiungere i tuoi, al
  massimo cinque. Ai tuoi contatti vengono comunicati i relay su cui leggi, e ti scrivono lì; basta che uno prenda un
  testo.
- **Che cosa resta sul tuo relay:** immagini, file, messaggi vocali, chiamate, reazioni, e i segni che un messaggio è
  arrivato o è stato letto; e quello che scrivi ai contatti su iPhone o su computer, che non leggono su Nostr.
- **Da che parte è passato:** tieni premuto un messaggio: il suo menu dice **Inviato tramite Nostr** o **Arrivato
  tramite Nostr** quando l’ha preso un relay Nostr. Uno che non dice nulla è passato dal tuo relay, o da vicino. Anche
  la nota sotto i messaggi dice **Inviato
  tramite Nostr**. Due telefoni uno accanto all’altro si danno i testi prima da vicino: per provare Nostr, disattiva il
  Bluetooth e **Trova Erevos sulla stessa rete Wi-Fi** su entrambi.
- **Cosa hanno fatto i relay per ultimo:** la schermata **Nostr** mostra, per ogni relay, se ha preso l’ultimo testo
  che gli è stato dato e quanti secondi dopo, o perché no, e se il tuo telefono legge su di esso. È conservato solo su
  questo telefono, finché Erevos non si chiude. Un relay che ha preso un testo ma non l’ha detto entro 20 secondi conta
  come uno che non l’ha preso: il testo passa allora anche dal tuo relay, e il tuo contatto lo vede una volta sola.
- **Solo su Android,** come Tor.

**Perché:** i relay Nostr sono pubblici, quindi Erevos li raggiunge solo tramite Tor, e non sanno mai dove si trova il
tuo telefono. Lì vanno solo i testi: un testo ha il tuo relay come riserva, se non dovesse arrivare, mentre i segni che
un messaggio è arrivato o è stato letto non ne avrebbero nessuna, e un messaggio inviato per dopo ha bisogno del tuo
relay che lo conservi fino alla sua ora. Immagini e messaggi vocali tramite Nostr arriveranno più avanti.

> Se il telefono del tuo contatto non dice entro cinque minuti che un testo è arrivato, passa anche dal tuo relay, e lo
> vede una volta sola. Quando nessun relay Nostr lo prende, passa subito dal tuo relay.

- **Chat nascoste:** leggono anche su Nostr, mentre sono aperte, e anche da chiuse finché **Ricevere da chiuse** è
  attivo per loro e lo spazio è aperto (vedi [Chat nascoste](#hidden)). Da chiuse, mostrano comunque «New message»:
  con ogni testo tramite Nostr, il tuo contatto manda anche al tuo relay un campanello, un messaggio che non dice nulla,
  che il tuo relay conta come uno, come prima. Senza relay, il loro link di contatto e il codice QR dicono dove leggono
  su Nostr, con una chiave solo di quel posto, e testi, reazioni e i segni che un messaggio è arrivato vanno lì, come
  da un telefono senza relay.

### Senza nessun relay {#nostr-only}

Un telefono senza relay, senza invito e senza account LPHL può comunque iniziare: il suo link di contatto e il suo
codice QR dicono dove legge su Nostr, e basta questo per parlare.

- **Per iniziare:** in **Nuova chat**, tocca **Inizia senza relay**, poi **Mostra il mio codice QR** o **Condividi il
  mio link di contatto**, e dallo a qualcuno che usa Erevos. Chi lo aggiunge ti scrive tramite Nostr, via Tor, e appare
  come richiesta di messaggio, che accetti. Puoi anche aggiungere il suo link o codice QR, allo stesso modo.
- **Che cosa passa:** testi, sticker, reazioni, modifiche, e i segni che un messaggio è arrivato o è stato letto, tutto
  tramite Nostr. Foto, messaggi vocali, file, chiamate e gruppi hanno bisogno di un relay, o dell’altro telefono
  vicino. Anche le chat nascoste funzionano così, solo tramite Nostr (vedi [Chat nascoste](#hidden)).
- **Quando non arriva:** i relay Nostr conservano un testo per due giorni. Finché il telefono del tuo contatto non dice
  che è arrivato, Erevos glielo ridà una volta al giorno, per due settimane.
- **Un relay da solo:** quando il tuo contatto ha un relay che gli permette di invitare, il suo Erevos manda da solo al
  tuo un invito per quel relay, una volta, nella chat, che vi siate conosciuti prima tramite Nostr o da vicino, via
  Bluetooth, Wi-Fi o un codice QR. Il tuo telefono lo prende da solo, e da allora funzionano anche foto, messaggi vocali
  e chiamate, con tutti. Conta come uno dei suoi inviti. Qualcuno di cui non hai accettato la richiesta di messaggio non
  sceglie nessun relay per te: il suo invito aspetta finché non lo accetti, al massimo una settimana.
- **Un Erevos più vecchio** non legge la parte Nostr di un link: ti raggiunge solo da vicino, finché non hai un relay.

**Perché:** Nostr è solo la porta d’ingresso. Nessuno ha bisogno di un invito per iniziare, e appena uno di voi ha un
relay, questo trasporta quello che è troppo grande per Nostr.

## Matrix {#matrix}

In **Impostazioni** → **Relay e reti** → **Matrix**, uno spazio può accedere a un account Matrix, per chattare con
persone che usano Element o un’altra app Matrix. Erevos parla da sé con il server Matrix, come Element: nessun ponte
sta nel mezzo.

- **Accesso:** il tuo ID Matrix, come @nome:matrix.org, e la sua password. Erevos diventa un nuovo dispositivo
  dell’account, chiamato Erevos. L’accesso e le chiavi del dispositivo restano cifrati solo in questo spazio, mai nelle
  sue chat nascoste, e non ancora nei backup.
- **Chat:** **Nuova chat** avvia una chat cifrata con un ID Matrix. Gli inviti compaiono per primi, con **Partecipa** e
  **Rifiuta**.
- **Cifratura:** i messaggi sono cifrati end-to-end con la cifratura di Matrix stesso (Olm e Megolm, tramite
  vodozemac). Una chat non cifrata lo dice.
- **Non anonimo:** il server Matrix vede il tuo account, chi parla con chi, quando, e da dove. In una chat con persone
  su altri server, lo vedono anche quei server.
- **Messaggi di prima:** un messaggio inviato prima che Erevos accedesse, o uno la cui chiave non è ancora arrivata,
  appare bloccato.
- **Foto e file:** **Foto** e **File** li inviano, fino a 50 MB, cifrati sul telefono prima di andare al server
  Matrix, che così tiene solo ciò che non può leggere. Una foto ricevuta si scarica solo toccando **Mostra foto**;
  **Salva** tiene qualsiasi file sul telefono.
- **Verifica con le emoji:** in una chat con una persona, **Verifica con le emoji** mostra a entrambi sette immagini;
  se sono uguali, nello stesso ordine, toccate **Coincidono** su entrambi i telefoni. Così nessuno può stare in
  mezzo senza essere visto, e la chat dice **Verificato con le emoji**. **Verifica questo dispositivo con un altro
  tuo**, nella schermata di Matrix, fa lo stesso con il tuo Element, perché si fidi del dispositivo di Erevos. Anche
  Element può avviare l’una o l’altra.
- **Chiave di sicurezza:** in **Chiave di sicurezza**, nella schermata di Matrix, inserisci la chiave (o frase) di
  sicurezza creata da Element: i messaggi precedenti si aprono dal backup delle chiavi dell’account, le nuove chiavi
  vi entrano, e gli altri tuoi dispositivi si fidano di questo. Un account senza può **Crea una chiave di sicurezza**
  qui; scrivila, perché Erevos non la conserva.
- **Non ancora:** messaggi vocali e chiamate.

**Perché:** le chat di Erevos nascondono chi parla con chi; un server Matrix non può. Così le chat Matrix restano a
parte e segnate, per le persone che altrimenti raggiungeresti solo su Matrix.

## SMS {#sms}

Su Android, Erevos può essere l’app per gli SMS del telefono: in **Impostazioni** → **Telefono e SMS** → **SMS** →
**Erevos come app per gli SMS**, tocca **Rendi Erevos l’app per gli SMS**. La schermata principale mostra allora SMS e
chat Erevos in un unico elenco.

> **Gli SMS e gli MMS non sono crittografati da Erevos.** Viaggiano come ogni SMS, e restano nell’archivio SMS di
> Android, dove qualsiasi app autorizzata a leggere gli SMS li vede e i backup di Android li contengono. Solo le chat
> Erevos sono crittografate end-to-end.

- **Gli SMS di prima:** niente da importare. Erevos mostra gli SMS e gli MMS già sul telefono, dall’archivio di Android
  stesso, dove restano per qualsiasi altra app per gli SMS. Li conserva Android, non sigillati da Erevos, come con ogni
  app per gli SMS.
- **Se Erevos non diventa l’app per gli SMS:** Android 15 e successivi possono impedirlo a un’app installata da un
  browser. In **Impostazioni** → **Telefono e SMS** → **SMS** → **Erevos come app per gli SMS**, tocca **Apri App
  predefinite** → **App per SMS** → Erevos. Se Android lo chiama un’impostazione con restrizioni, apri **Informazioni
  app** di Erevos, tocca **⋮** in alto a destra → **Consenti impostazioni con restrizioni**, e scegli di nuovo Erevos.
- **Quando arriva un SMS:** una notifica dice «New message», senza chi l’ha inviato né cosa dice. Se non arriva
  nessuna notifica, **Erevos come app per gli SMS** mostra **Consenti notifiche** finché Android le blocca.
- **Codici monouso:** un SMS che dice di contenere un codice (di una banca, di un accesso), in una qualsiasi delle
  lingue dell’app, riceve **Copia codice** sotto di sé nella chat, e anche nella sua notifica, senza che lì si veda il
  codice; su Android 12 e successivi il pulsante della notifica chiede prima di sbloccare il telefono. Vengono copiate
  solo le sue 4–8 cifre, mai un numero di telefono, un importo, una data o un’ora, e Android non ne mostra
  un’anteprima. Qualsiasi app che legge gli appunti può leggerle, quindi incolla presto il codice.
- **Se non appare nessun SMS:** Android 15 e successivi negano il permesso per gli SMS a un’app installata da un
  browser. In **Impostazioni** → **Telefono e SMS** → **SMS** → **Erevos come app per gli SMS**, tocca **Consenti
  SMS**. Se Android lo chiama un’impostazione con restrizioni, apri **Informazioni app** di Erevos, tocca **⋮** in
  alto a destra → **Consenti impostazioni con restrizioni**, e consenti gli SMS in **Autorizzazioni**. Le chat inviate
  come RCS («chat» in Google Messaggi) restano in quell’app e non appaiono.
  **Erevos come app per gli SMS** dice quante conversazioni SMS legge Erevos, o perché non ha potuto leggerle.
- **Scrivere a qualcuno con Erevos:** passa da Erevos, crittografato end-to-end, appena il suo numero è collegato al
  suo contatto. Collegalo a mano nella conversazione SMS, o lascia che lo trovi un invito nascosto. Da allora la sua
  conversazione SMS apre la sua chat.
- **I suoi SMS nella chat:** gli SMS e gli MMS con il suo numero, quelli di prima e quelli che arrivano, appaiono tra i
  messaggi della chat in ordine di tempo, ognuno bordato e segnato **SMS (non crittografato)**, con il suo ✓ e le sue
  foto. Tienine premuto uno per copiarlo, inoltrarlo o eliminarlo, come nella conversazione SMS. Restano negli SMS del
  telefono, mai nella cronologia sigillata della chat; appare solo la conversazione con quell’unico numero, non un MMS
  di gruppo, e solo mentre Erevos è l’app per gli SMS o può leggere gli SMS, mai nelle chat nascoste. Appaiono prima
  gli ultimi: **Mostra gli SMS precedenti**, sopra di loro, ne porta altri, e anche la ricerca della chat li trova.
  Aprire la chat li segna tutti come letti, anche quelli precedenti, così nella schermata principale non ne resta
  nessuno contato. Un numero sulla sua scheda contatto fa lo stesso, senza collegarlo.
- **Un SMS normale a lui:** quando non c’è internet, per esempio. **SMS normale** nei **Dettagli** della chat apre la
  sua conversazione SMS per scriverlo lì, e **+** → **Invia come SMS**, o **Come SMS** quando tieni premuta la freccia
  di invio, invia come SMS quello che hai scritto, dopo averlo chiesto. Nella chat appare come SMS. L’operatore
  telefonico può leggerlo. Un SMS non può scomparire né rispondere a un messaggio: con il cronometro attivo, o con un
  messaggio a cui stai rispondendo, Erevos lo dice quando chiede.
- **Inviti nascosti:** con il primo SMS a un numero che non è un contatto, Erevos invia anche un breve invito
  nascosto. Non ne va nessuno al numero di un contatto Erevos, collegato o sulla sua scheda contatto. Un telefono senza
  Erevos non mostra nulla; un telefono con Erevos risponde tramite il relay e i due diventano contatti. Ogni numero
  viene interpellato al massimo una volta al mese, e **Disattiva gli inviti**, in **Impostazioni** → **Telefono e
  SMS** → **SMS** → **Scopri Erevos dietro un numero**, li ferma.

**Perché:** così due telefoni con Erevos si trovano solo da un numero di telefono, senza un server che conosca i
numeri. L’invito è un SMS di dati, che le app di messaggistica non mostrano, quindi un telefono senza Erevos non mostra
nulla.

- **Tutti gli altri:** un SMS normale, segnato SMS. L’operatore telefonico può leggerlo, come legge ogni SMS.
- **✓ e ✓✓✓:** un tuo SMS mostra ✓ appena è partito, e ✓✓✓ appena il rapporto di consegna della rete dice che ha
  raggiunto il suo telefono, oppure «non consegnato». Alcuni operatori telefonici non inviano rapporti di consegna;
  allora resta ✓. Un SMS non può dire se è stato letto.
- **Foto (MMS):** l’immagine prima del campo del messaggio (**Foto**) aggiunge una foto, rimpicciolita per stare in un
  MMS (circa 280 KB), senza nient’altro oltre all’immagine. Le foto che arrivano via MMS appaiono nella conversazione.
  Un MMS è in chiaro come un SMS: l’operatore telefonico può vederlo.
- **MMS di gruppo:** in **Impostazioni** → **Telefono e SMS** → **SMS** → **Nuovo SMS**, scrivi più numeri separati da
  virgole e tocca **Scrivi**. Ogni messaggio va a tutti come un unico MMS, anche il solo testo, e le loro risposte
  arrivano nella stessa conversazione, ognuna con chi l’ha scritta. Tutti vedono il numero di tutti, e l’operatore
  telefonico vede tutto.
- **Due SIM:** la SIM con cui inviare appare sopra il campo del messaggio; tocca **Scegli la SIM** una volta per
  lasciare che Erevos le veda. La tua scelta viene conservata per quel numero; fino ad allora, Erevos risponde con la
  SIM su cui è arrivato l’ultimo messaggio. Ogni messaggio mostra la sua SIM.
- **SMS più tardi:** tieni premuto il pulsante rotondo **Invia** dopo il campo e scegli un’ora, come in una chat. L’SMS
  appare alla fine della conversazione
  segnato **Programmato**; toccalo per annullarlo. Parte a quell’ora, anche con Erevos chiuso e bloccato; se allora il
  telefono è spento, appena è di nuovo acceso e sbloccato. Fino ad allora non è negli SMS del telefono, dove altre app
  lo vedrebbero, e l’operatore telefonico non lo ha. Aspetta bloccato con una chiave del telefono stesso (Android
  Keystore), non con la password del tuo spazio, perché Android deve inviarlo mentre Erevos è bloccato: la protezione
  che ogni SMS ha una volta inviato, perché gli SMS inviati restano negli SMS del telefono. Solo testo, a un numero.
- **Link:** un indirizzo web in un SMS è sottolineato, e si apre come in una chat, dopo che l’hai visto intero.
- **Nomi dai tuoi contatti:** all’inizio disattivato, quindi i numeri degli SMS appaiono come numeri. **Nomi**, sopra
  l’elenco, li sblocca (come fa **Mostra i nomi dai miei contatti** in **Impostazioni** → **Telefono e SMS** → **SMS**
  → **Nomi dai tuoi contatti**): i nomi che i contatti del tuo telefono danno ai numeri degli SMS, e le immagini che
  hanno per loro, oppure quelli dei tuoi contatti salvati solo in Erevos, nell’elenco e nella conversazione. Tocca di
  nuovo **Nomi** per vedere solo i numeri. Erevos li legge solo per mostrarli, e non ne conserva una copia.
- **Mittenti con un nome:** un SMS da un nome invece che da un numero, come quello di una banca, si apre per leggerlo,
  ma non si può rispondere.

### Tenere in ordine gli SMS

- **Tieni premuto:** nell’elenco, tieni premuta una conversazione SMS per quello che puoi fare: **Fissa in alto**,
  **Archivia**, **Segna come spam**, **Blocca** ed **Elimina**, e **Aggiungi ai contatti** per un numero che non è tra
  i tuoi contatti. In una conversazione, **⋮** in alto mostra le stesse cose, e un numero del genere ha **Aggiungi ai
  contatti** anche sotto il suo nome: un nuovo contatto con dentro quel numero.
- **Fissate:** fino a 10 conversazioni SMS restano in cima all’elenco, con una puntina. **Non fissare più** ne
  rimanda una al suo posto.
- **Conversazioni archiviate:** fuori dall’elenco, sotto **Archiviate** in cima alla schermata principale. Una torna
  da sola nell’elenco quando arriva un nuovo SMS da quel numero, o con **Annulla archiviazione**.
- **Cestino:** una conversazione eliminata aspetta nel **Cestino** 30 giorni, poi Erevos la elimina dagli SMS del
  telefono. Fino ad allora **Recupera** la rimette nell’elenco; **Elimina ora** e **Svuota il cestino** eliminano
  subito, per sempre. Un SMS che arriva dopo che è finita nel Cestino la fa riapparire nell’elenco. Solo l’app per gli
  SMS può eliminare gli SMS.
- **Spam:** un filtro che funziona solo sul telefono, con delle regole, e non invia nulla da nessuna parte. Un SMS da
  un numero che non è un contatto e a cui non hai mai risposto va in **Spam** quando ha un link con parole che cercano
  di ingannare, come un pacco in giacenza o un premio, o una delle parole che aggiungi in **Impostazioni** →
  **Telefono e SMS** → **SMS** → **Filtro antispam**. **Segna come spam** e **Non è spam** decidono per sempre per un
  numero. Una notifica dice comunque «New message» quando arriva dello spam, perché appare prima che Erevos venga
  aperto. Ogni conversazione in **Spam**, nella cartella e in cima alla conversazione, dice perché è lì: il numero è
  bloccato, l’hai segnato tu, una tua regola nomina il mittente, un numero dall’estero, una tua parola, o un link e
  quali parole.
- **Regole su chi invia:** in **Filtro antispam**, **Mittenti** accetta il nome di un mittente, come quelli che usano
  negozi e banche (lettere, senza accenti né maiuscole), o un numero, dove \`*\` sta per qualsiasi cosa: \`+4470*\` è
  ogni numero che inizia così, \`1234*\` ogni numero breve che inizia così, e con il prefisso del tuo paese noto,
  \`69*\` è anche ogni numero \`+3069...\`. **In «Spam»** manda lì i loro; **Lascia passare** tiene le regole del
  filtro lontane da loro, come per la tua banca o la tua famiglia, anche se un numero che hai segnato come spam, o
  bloccato, va comunque lì. **Manda in «Spam» i numeri dall’estero** manda lì ogni numero scritto con un prefisso
  diverso da **Il prefisso del tuo paese**, che Erevos prende dai numeri a cui rispondi e che puoi cambiare. Un numero
  scritto senza prefisso è di qui. Tocca una regola per rimuoverla.
- **Blocca:** **Blocca** nel menu di una conversazione, o **Impostazioni** → **Telefono e SMS** → **SMS** → **Numeri
  bloccati**, mette un numero nell’elenco dei numeri bloccati di Android stesso: Android rifiuta i suoi SMS, MMS e
  chiamate, e ogni spazio e l’app Telefono vedono lo stesso elenco. Solo l’app per gli SMS o l’app Telefono possono
  vederlo e cambiarlo.
- **Bozze:** quello che scrivi e non invii resta con quella conversazione, e l’elenco lo mostra come **Bozza**. Anche
  un SMS che non è potuto partire resta lì come bozza.
- **Annullare l’invio di un SMS:** un SMS che invii prima aspetta 5 secondi alla fine della conversazione: toccalo in
  quel momento per riportarlo nel campo del messaggio. **Impostazioni** → **Telefono e SMS** → **SMS** → **Annullare
  l’invio di un SMS** imposta **Disattivato**, 5 o 10 secondi. Quando lasci Erevos, parte subito.
- **Invia di nuovo:** uno dei tuoi che non è partito, o non è stato consegnato, lo dice: toccalo per inviarlo di nuovo.
  Tieni premuto qualsiasi messaggio per **Inoltra**, **Invia di nuovo** ed **Elimina**, con le sue parole da
  selezionare e copiare; un messaggio eliminato ha anche **Annulla**.
- **Inoltra:** tieni premuto un messaggio → **Inoltra**, poi scrivi un numero e tocca **Scrivi**, o scegli un contatto
  sotto **In una chat Erevos**. Si apre in quella conversazione, da leggere e inviare lì. A un numero va anche la sua
  immagine, come MMS; in una chat solo le sue parole.
- **Ogni spazio ha i suoi:** messaggi fissati, conversazioni archiviate, il Cestino, i segni di spam e le bozze
  appartengono allo spazio, sigillati con la sua password. Gli SMS stessi restano negli SMS del telefono: un altro
  spazio li vede così come sono, e uno nel Cestino qui appare lì finché non viene eliminato dal telefono.

## Telefono {#phone}

Su Android, Erevos può essere l’app Telefono del telefono: in **Telefono** nel menu, tocca **Impostazioni** → **Rendi
Erevos l’app Telefono**. Ogni chiamata appare allora sulla schermata di chiamata di Erevos, e i link tel: e il
pulsante di chiamata del telefono aprono il tastierino di Erevos. **Telefono** si apre anche dalla cornetta in cima
alla schermata principale, e ha una sua icona tra le app del telefono, **Telefono**, verde con una cornetta sul
simbolo di Erevos, che apre il tastierino. Ognuno di questi, come un link tel:,
lo apre appena Erevos è sbloccato: con una password, dopo che l’hai inserita, a meno che il Telefono non si apra senza
(vedi La password di Erevos, più sotto). Fino ad allora una scheda in alto dice **Erevos non è l’app Telefono**; su un
telefono piccolo mostra solo quel titolo, e toccarlo apre le **Impostazioni** del Telefono.

- **Cerca nei contatti:** in cima al Telefono, scrivi un nome, un numero o una parte di uno dei due: i contatti con un
  numero appaiono al posto delle schede, ogni numero su una riga a sé. Toccane uno per chiamarlo, o tienilo premuto per
  metterlo sul tastierino. Cerca nei contatti del telefono e, con Erevos sbloccato, in quelli salvati solo in Erevos e
  nei tuoi contatti Erevos con un numero; mai nelle chat nascoste.
- **La schermata di chiamata:** chi chiama, o chi chiami, con il nome e la foto che gli danno i contatti del tuo
  telefono; mentre Erevos è sbloccato, un numero collegato a uno dei tuoi contatti Erevos mostra il nome che gli hai
  dato, e così il numero di un contatto salvato solo in Erevos; quello di un contatto delle chat nascoste aperte, solo
  mentre sono aperte. Appare sulla
  schermata di blocco e non richiede password, perché a una chiamata si deve poter rispondere con Erevos bloccato. Una
  chiamata in arrivo mostra **Answer**, **Decline** e **Message**, e Android squilla con la suoneria propria del
  contatto; i tasti del volume la silenziano. Durante una chiamata: **Mute**, **Keypad** per i toni che chiede un menu,
  **Speaker**, **Hold**, **Add call** ed **End**. Quando lo avvicini all’orecchio lo schermo si spegne.
- **Dove va il suono:** con un dispositivo Bluetooth o delle cuffie, il pulsante accanto a **Keypad** dice dove va il
  suono, e un tocco ti lascia scegliere: il telefono, l’altoparlante, le cuffie o il dispositivo Bluetooth.
- **Una seconda chiamata:** una che arriva durante una chiamata mostra **Hold and answer**, **End and answer** e
  **Decline**. Con una chiamata in attesa, la riga sotto il nome lo dice: toccala, o tocca **Swap**, per parlare con
  l’altra. **Merge** mette le due in un’unica chiamata, quando il tuo operatore telefonico lo permette.
- **Rifiutare con un messaggio:** **Message**, su una chiamata che squilla, la rifiuta con una risposta rapida, o una
  che scrivi, che il tuo telefono invia a chi chiama come SMS; appare tra i tuoi SMS. In **Telefono** →
  **Impostazioni**, **Risposte rapide** le cambia: **Aggiungi una risposta**, **Rimuovi**, **Salva**, e **Usa le
  risposte predefinite**. Sono conservate sul telefono, non sigillate, perché la schermata di chiamata le mostra con
  Erevos bloccato.
- **Il tastierino:** in **Telefono**, scrivi un numero e tocca **Chiama**; tieni premuto **0** per +. Tenuto premuto,
  il campo del numero ne incolla uno. **Add call**, durante una chiamata, lo apre appena Erevos è sbloccato.
- **Due SIM:** sopra **Chiama**, tocca la SIM con cui chiamare; la prima volta, **Scegli la SIM** chiede ad Android di
  lasciare che Erevos le veda. Un numero che chiami senza scegliere chiede **Chiama con** quale. Erevos conserva la SIM
  che hai usato per ogni numero, sigillata nello spazio, e la volta dopo lo chiama con la stessa. La schermata di
  chiamata indica la SIM di ogni chiamata.
- **Le chiamate:** in **Telefono**, **Recenti** elenca la cronologia delle chiamate di Android, dalla più recente,
  sotto ogni giorno: chi, che tipo di chiamata era, con quale SIM, e come. **Tutto**, **Perse**, **In arrivo**, **In
  uscita** e, dopo che una chiamata è stata bloccata, **Bloccate** la filtrano; con due SIM, **SIM 1** o **SIM 2**
  tiene le chiamate di quella SIM. Chiamate una dopo l’altra con lo stesso numero appaiono una volta, con quante sono.
  **☏** richiama; un tocco sulla riga mostra le sue chiamate, quanto è durata ognuna, e **Chiama** (con due SIM, una
  per ciascuna), **Invia un SMS**, **Aggiungi ai contatti** per un numero che non è tra i tuoi contatti, e **Modifica il
  numero prima di chiamare**. Viste lì, le chiamate perse lasciano la notifica di Android, e quella notifica apre
  **Recenti**.
- **Eliminare le chiamate:** nelle chiamate della riga, **Elimina questa chiamata** (o **Elimina queste 3 chiamate**,
  per una riga di più chiamate) le elimina dalla cronologia delle chiamate di Android, **Elimina** accanto a una di più
  chiamate elimina solo quella, ed **Elimina tutte le chiamate con questo numero**, quando ce ne sono altre, le elimina
  tutte, anche quelle più vecchie. Prima appare **Annulla** per qualche secondo; fino ad allora vengono solo nascoste.
- **Preferiti:** i contatti con la stella nei contatti del tuo telefono, con le loro foto. Un tocco chiama il numero
  predefinito del contatto, o chiede quale quando ce ne sono più di uno e nessuno è predefinito; tenuto premuto, li
  mostra tutti.
- **Chiamate Wi-Fi e voce HD:** la schermata di chiamata lo dice sotto il nome quando una chiamata passa via Wi-Fi o
  con la voce HD, e **Recenti** lo dice per ogni chiamata.
- **Blocco chiamate:** in **Telefono** → **Impostazioni**, **Blocca il telemarketing** blocca le chiamate dai numeri
  che alcuni paesi riservano al telemarketing: Francia (01 62, 01 63, 02 70, 02 71, 03 77, 03 78, 04 24, 04 25, 05 68,
  05 69, 09 48, 09 49 e da 09 475 a 09 479, secondo la decisione 2022-1583 dell’ARCEP), Spagna (400, dal 17 ottobre
  2026), Cile (809), India (140) e Brasile (0303, che lì chi chiama può omettere da agosto 2025). Gli altri paesi non
  riservano numeri del genere, o Erevos non ne è sicuro, quindi per loro non si blocca nulla. In **Numeri che iniziano
  con**, scrivi l’inizio di altri numeri da bloccare, con il prefisso del paese (+33 162) o come lo componi qui (0162),
  e tocca **Blocca**; **Rimuovi** ne toglie uno. Questi non bloccano mai un numero tra i contatti del tuo telefono. Una
  chiamata bloccata non squilla e non lascia notifiche; appare in **Recenti**, sotto **Bloccate**. Android chiede una
  volta se Erevos può filtrare le chiamate
  (**Lascia che Erevos filtri le chiamate**): senza, una chiamata bloccata squilla un attimo prima che Erevos la chiuda.
  Quello che è bloccato è lo stesso in ogni spazio, quindi non dice nulla di un altro, ed è conservato sul telefono
  senza nomi.
- **Numeri bloccati:** in **Telefono** → **Impostazioni**, **Numeri bloccati** è l’elenco di Android stesso, lo stesso
  di **Impostazioni** → **Telefono e SMS** → **SMS** → **Numeri bloccati**: scrivi un numero e tocca **Blocca**, o
  toccane uno per sbloccarlo. In **Recenti**, le chiamate di una riga mostrano **Blocca questo numero** o **Sblocca
  questo numero**, con **Annulla**. Android rifiuta le loro chiamate prima che squillino, e i loro SMS e MMS. Ogni
  spazio vede lo stesso elenco.
- **Un gruppo di contatti per un po’:** in **Telefono** → **Impostazioni**, **Blocca un gruppo di contatti** elenca i
  gruppi (le etichette) dei contatti del tuo telefono. **Blocca** accanto a uno blocca le chiamate dei suoi contatti
  **Per un’ora**,
  **Fino a domani mattina** (7:00) o **Finché non lo sblocco**; la riga sotto il gruppo dice fino a quando, e
  **Sblocca** lo termina prima. Una chiamata del genere viene bloccata come le altre: non squilla, e appare in
  **Recenti**, sotto **Bloccate**. Erevos legge solo i gruppi, e conserva l’id del gruppo e l’ora, non il suo nome.
  Mentre un gruppo è bloccato, la schermata **Telefono** lo dice in alto, fino a quando, con **Sblocca**.

**Perché:** una chiamata viene filtrata anche con Erevos bloccato, quindi quello che è bloccato non può essere
sigillato dentro uno spazio; e conservato uguale per ogni spazio, non mostra nulla di nessuno di essi.

- **La password di Erevos:** la schermata **Telefono**, con il tastierino, le chiamate e i preferiti, è dietro di essa
  come il resto di Erevos. Solo la schermata di chiamata non lo è, a meno che tu non lasci aprire il Telefono senza: in
  **Telefono** → **Impostazioni**, **Apri il Telefono senza password** (all’inizio disattivato, e mostrato solo mentre
  Erevos ha una password). Con Erevos bloccato, l’icona del Telefono, un link tel: e la notifica di una chiamata persa
  aprono allora il tastierino, **Recenti** e **Preferiti**, che Android conserva per ogni app Telefono, con i soli nomi
  dei contatti del telefono: mai quelli salvati solo in Erevos o delle chat nascoste, e nessuna SIM conservata per un
  numero. Lì puoi chiamare, niente di più: niente eliminazioni, blocchi, SMS o aggiunte ai contatti. **Apri Erevos** in
  alto mostra la schermata della password, come fa l’icona di Erevos stesso dopo che Erevos è stato in background per
  più di 30 secondi, a meno che una chiamata fatta da lì non l’abbia portato via. **Rimetti il Telefono dietro la
  password** lo disattiva.
- **Se Erevos non diventa l’app Telefono:** come per gli SMS, Android 15 e successivi possono impedirlo a un’app
  installata da un browser. In **Impostazioni**, tocca **Apri App predefinite** → **App Telefono** → Erevos. Se
  Android lo chiama un’impostazione con restrizioni, apri **Informazioni app** di Erevos, tocca **⋮** in alto a
  destra → **Consenti impostazioni con restrizioni**, e scegli di nuovo Erevos. **Consenti chiamate e contatti**
  appare finché Android blocca ancora le chiamate, la cronologia delle chiamate o i contatti.
- **Dopo il riavvio del telefono:** finché non sblocchi il telefono per la prima volta, risponde la schermata di
  chiamata di Android stesso.
- **Che cos’è una chiamata telefonica:** una normale chiamata telefonica, come con ogni app Telefono: la trasporta
  l’operatore telefonico, che può ascoltarla. Le chiamate ai tuoi contatti Erevos da una chat sono un’altra cosa:
  crittografate end-to-end, via internet.

## Contatti {#contacts}

Su Android, **Contatti** nel menu mostra i contatti del telefono: quelli nei contatti di Android stesso, che usano
anche le tue altre app, quindi non c’è niente da importare. Android chiede una volta se Erevos può leggerli e
modificarli (**Consenti i contatti**). Si aprono anche dalla persona in cima alla schermata principale, e hanno una
loro icona tra le app del telefono, **Contatti**, viola con una persona sul simbolo di Erevos, che li apre dietro il
blocco di Erevos: con una password, appena l’hai inserita.

- **Trovare qualcuno:** **Cerca nei contatti** cerca in ogni campo: nomi, numeri (comunque siano scritti, con o senza
  prefisso del paese), email, indirizzi, l’azienda, il compleanno e la nota. **Preferiti** mostra solo i contatti con
  una stella.
- **Un contatto:** toccane uno per vederlo tutto. Tocca un numero per chiamarlo, o **SMS** accanto per scrivergli in
  Erevos; tocca un’email o un indirizzo per aprirlo. **Aggiungi ai preferiti** in alto gli dà una stella, nei contatti
  di Android, così anche l’app Telefono lo elenca tra i preferiti.
- **Nuovo contatto** e **Modifica:** nome e cognome, azienda e qualifica, tutti i numeri, le email e gli indirizzi che
  ti servono, ognuno con il suo tipo (**Cellulare**, **Casa**, **Lavoro**, **Altro**), un compleanno (giorno/mese/anno,
  o giorno/mese) e una nota. Un nuovo contatto viene salvato **Solo su questo telefono**, o in un account con cui il
  telefono sincronizza i contatti (Google), come scegli. Quello che Erevos non mostra di un contatto, come i dettagli
  propri di un’altra app, resta com’era.
- **Foto:** tocca l’immagine in cima a un contatto per **Scegli una foto** dalle foto del telefono, **Scatta foto** con
  la fotocamera, o **Rimuovi la foto**. La ritagli quadrata, ed Erevos la ridisegna, così non resta niente di quello che
  la foto diceva oltre all’immagine (un luogo, un telefono). Viene conservata con il contatto nei contatti di Android,
  dove il telefono la mostra quando chiama.
- **Suoneria:** su un contatto, **Scegli la suoneria** apre il selettore di Android stesso, con i suoni del telefono e
  quelli che hai aggiunto; il telefono squilla con quella quando chiama quel contatto. **Suoneria predefinita** lì
  ridà quella del telefono.
- **File .vcf:** **Importa da un file .vcf** nel menu di Contatti legge un file vCard salvato da un altro telefono o
  da un’altra app (qualsiasi sua versione, anche quella dei vecchi telefoni greci) e salva quelli non ancora sul
  telefono, con le loro foto e i loro gruppi, solo su questo telefono o in un account. **Salva come file .vcf** lì salva
  i contatti mostrati (tutti, i preferiti, un gruppo, o quello che ha trovato la ricerca) come un unico file, in una
  cartella che scegli; su un contatto, salva quello. Il file è fuori da Erevos e non è sigillato: chiunque lo abbia può
  leggere i contatti.
- **Codici QR:** **Codice QR** su un contatto mostra la sua vCard come codice QR, che la fotocamera di un altro
  telefono legge come contatto da aggiungere: il suo nome, i numeri, le email, gli indirizzi e la nota, senza la foto
  (una nota lunga o molti indirizzi vengono esclusi per farlo stare). Chiunque lo veda può leggerlo. **Leggi il codice
  QR di un contatto** nel menu ne legge uno da una foto che scatti o scegli, qui sul telefono, e inizia con esso un
  nuovo contatto, salvato solo quando lo salvi. Il codice QR Erevos di qualcuno ne inizia uno con il suo ID Erevos.
- **Duplicati:** **Trova duplicati** nel menu elenca i contatti che sembrano la stessa persona salvata due volte: lo
  stesso nome (le sue parole in qualsiasi ordine), numero o email. **Unisci** tiene il più completo, con ogni numero,
  email e indirizzo degli altri, le loro note, e la loro foto, suoneria, stella e gruppi quando non li ha, ed elimina
  gli altri; **Unisci tutti** lo fa per ogni gruppo di duplicati. **Non sono uguali** nasconde un gruppo di duplicati
  finché non riapri l’elenco.
- **Compleanni:** l’etichetta **Compleanni** sotto la ricerca elenca i contatti con un compleanno, dal prossimo, con
  quanti giorni mancano e gli anni che compiono. **Promemoria dei compleanni** nel menu (all’inizio disattivato) mette
  una notifica la mattina di ognuno, dalle 9:00, anche con Erevos chiuso; sulla schermata di blocco dice solo che c’è
  un compleanno. Sono solo i compleanni dei contatti del telefono, mai quelli dei contatti salvati solo in Erevos.
- **Contatti della SIM** nel menu legge i contatti sulle schede SIM del telefono e copia quelli non ancora sul telefono
  (all’inizio tutti scelti) nei contatti di Android, solo su questo telefono o in un account. La SIM tiene i suoi.
- **Solo in Erevos:** in **Salvato in**, un nuovo contatto può invece essere salvato **Solo in Erevos**: sigillato in
  questo spazio come le sue chat, mai nei contatti di Android, così nessun’altra app o account lo vede, e le altre app
  mostrano solo il suo numero; la schermata di chiamata di Erevos mostra il suo nome mentre Erevos è sbloccato. Ha un
  lucchetto nell’elenco, e l’etichetta **Solo in
  Erevos** mostra solo questi.
  **Salva solo in Erevos** su un contatto del telefono lo sposta dentro, con la sua foto e la sua stella, e lo elimina
  dai contatti del telefono; **Sposta nei contatti del telefono** lo riporta fuori. La sua foto è sigillata con lui.
  Gruppi, suonerie e promemoria dei compleanni sono di Android, quindi non ne ha. Una chiamata o un SMS a lui passa
  comunque dal telefono, e appare nel registro chiamate e negli SMS del telefono come qualsiasi altro. Un backup di
  Erevos contiene questi contatti, sigillati.
- **Nelle chat nascoste:** **Contatti** in cima alle chat nascoste aperte elenca i loro contatti, salvati solo lì e
  sigillati con loro: non appaiono da nessun’altra parte, nemmeno nei contatti dello spazio, e la schermata non mostra
  nulla appena le chat nascoste si chiudono. Un nuovo contatto lì è sempre uno dei loro. Gli si può dare una foto,
  perché le chat nascoste restano aperte mentre la scegli o la scatti. Il loro menu ha solo quello che è loro:
  **Importa da un file .vcf** tiene i contatti di un file con loro, sigillati, mai nei contatti del telefono; **Salva
  come file .vcf** salva quelli mostrati, o uno sulla sua scheda, in una cartella che scegli (fuori da Erevos e non
  crittografato); **Leggi il codice QR di un contatto** inizia uno dei loro contatti. Un ID Erevos scritto o letto lì
  lo aggiunge alle chat nascoste, mai a quelle dello spazio. Chiamarne uno tramite l’app Telefono chiude le chat
  nascoste appena Erevos resta lontano per più di 30 secondi, e appare nel suo registro chiamate.
- **ID Erevos:** l’ID Erevos di un contatto è il link di contatto che mostra il suo Erevos, sotto **Copia il mio link
  di contatto** o come suo codice QR. Sulla scheda di un contatto, o sotto **ID Erevos** quando ne scrivi uno,
  incollalo, o leggilo con **Fotografa il codice QR** o **Scegli una foto del codice QR**: **Aggiungi a Erevos** (o
  **Salva**) lo aggiunge alle tue chat Erevos, che si aprono con lui, e collega il contatto a lui, e la chat prende il
  nome del contatto se non ne ha uno suo. Un contatto che è un contatto Erevos mostra l’inizio della sua chiave come
  **ID Erevos**.
- **Contatti Erevos:** un contatto che è la stessa persona di uno dei contatti Erevos delle tue chat appare come
  un’unica scheda con esso: da un numero collegato a lui in Erevos, dal suo ID Erevos, o con **Scegli dalle mie chat
  Erevos** sulla sua scheda, un collegamento sigillato nello spazio, mai nei contatti di Android (**Non è questo
  contatto Erevos** lo annulla). La scheda ha allora **Messaggio**, **Chiama** e **Video**, crittografati end-to-end
  tramite Erevos invece che tramite l’operatore telefonico. Un contatto delle chat che non è nessun contatto
  ha una sua scheda, con lo scudo, dove **Aggiungi ai contatti** ne crea uno e **Collega a uno dei miei contatti** lo
  collega a uno che hai, la cui scheda allora lo mostra; l’etichetta **Contatti Erevos** li elenca tutti. Un contatto
  Erevos senza un nome suo prende il nome del contatto collegato a lui, quando vengono collegati o
  quando si apre la scheda di quel contatto; un nome che gli hai dato in Erevos resta, e uno che hai svuotato torna dal
  contatto in quel momento. Nelle chat nascoste, questi sono i contatti delle chat nascoste stesse, e la loro chat si
  apre lì.
- **Cronologia:** la scheda di un contatto elenca le sue ultime chiamate nel registro chiamate del telefono, i suoi SMS
  e i suoi messaggi in Erevos, dai più recenti; toccane uno per richiamare, scrivere un SMS o aprire la chat. Le
  chiamate appaiono appena lasci che Erevos legga il registro chiamate (**Mostra le chiamate**). Erevos le legge solo
  per mostrarle, e non ne conserva una copia.
- **Altre app:** il pulsante **Aggiungi ai contatti** di un’altra app (un numero nell’app Telefono, un’email nella
  posta) può aprirsi in Erevos: un nuovo contatto con quello che ha dato quell’app, o l’elenco per toccare il contatto
  a cui aggiungerlo. Anche un’app che mostra o modifica un contatto può aprirlo in Erevos, dietro il blocco di Erevos.
  Android chiede quale app usare; scegli Erevos. Un’app che ti chiede di scegliere un contatto, o un numero, un’email o
  un indirizzo, riceve solo quello che tocchi, dai contatti del telefono: quelli salvati solo in Erevos non appaiono
  mai lì.
- **Elimina** toglie il contatto dal telefono, da ogni account in cui è salvato; uno salvato solo in Erevos, da Erevos.
- **Gruppi:** **Gruppi** nel menu di Contatti (i tre puntini) elenca i gruppi di Android stesso, come Famiglia o
  Lavoro, con quanti contatti ci sono in ognuno, e ne crea di nuovi. Aprine uno per **Aggiungi contatti**, toglierne
  uno con **×**, **Rinomina** o **Elimina gruppo** (i suoi contatti restano). Su un contatto, **Scegli i gruppi** lo
  mette nei gruppi o lo toglie. Le etichette sotto la ricerca mostrano i contatti di un gruppo. Un gruppo è salvato in
  un account, come i suoi contatti: un contatto ci entra solo se è salvato anche lui in quell’account.

## Blocco con password {#lock}

In **Impostazioni** → **Privacy e sicurezza** → **Blocco e seconda password**, **Blocca all’apertura di Erevos** ha
due scelte: **Nessun blocco** e **Password**.

1. Tocca **Password**, scrivila due volte (almeno 4 caratteri) e tocca **Salva**.
2. Da quel momento Erevos la chiede a ogni apertura, e di nuovo dopo 30 secondi in background.
3. **Cambia password** la cambia, e **Blocca ora** blocca subito Erevos.

- **Bloccato, ma riceve:** quando Erevos si blocca, la schermata della password si mette davanti allo spazio aperto,
  che continua dietro di essa: messaggi e chiamate arrivano comunque, con le loro notifiche, e una chiamata appare sopra
  la schermata della password. Le sue schermate si chiudono, anche le chat nascoste, e la schermata di chiamata non
  mostra più i nomi dei suoi contatti. La sua password lo riapre; la password di un altro spazio prima lo chiude, senza
  che ne resti nulla in memoria.

- **Password sbagliate:** dopo 5 tentativi sbagliati, ognuno dei successivi ti fa aspettare, all’inizio 30 secondi e
  ogni volta il doppio, fino a un’ora. Il conteggio sopravvive a un riavvio.
- **Che cosa è sigillato:** i contatti di ogni spazio, le chiavi delle sue conversazioni, i suoi messaggi, le sue
  impostazioni del relay e il suo aspetto sono conservati sul telefono sigillati con una chiave che solo la sua password
  apre.
- **L’elenco subito:** la schermata principale conserva una copia sigillata delle sue prime righe, così l’elenco appare
  appena lo spazio si apre e poi si aggiorna. Ha sempre la stessa dimensione, quindi non dice a nessuno quante chat ci
  sono o quali spazi sono usati, e non contiene mai quello che diceva un messaggio effimero.

**Perché:** ogni password provata costa di proposito tempo e molta memoria (PBKDF2, poi Argon2id), così chi copia
quello che il telefono conserva non può provare password velocemente; e chi ha in mano il telefono aspetta di più dopo
ogni tentativo sbagliato. Il conteggio è unico per tutto il telefono, mantenuto tra un riavvio e l’altro, perché la
schermata della password viene prima che si apra qualsiasi spazio.

> Non c’è modo di recuperare una password dimenticata: non è conservato niente che possa aprire i dati senza di essa.
> Solo un’impronta o un volto, finché è attivo, apre ancora il primo spazio (vedi più sotto).

### Screenshot

Con il blocco con password attivo, Android tiene Erevos fuori dagli screenshot, dalle registrazioni dello schermo e
dalle app recenti: lì l’ultima schermata di Erevos appare vuota, così chi ha in mano per un momento il telefono
sbloccato non vi vede le tue chat. In
**Impostazioni** → **Privacy e sicurezza** → **Screenshot**, **Disattiva** fa funzionare di nuovo gli screenshot (per
inviarne uno, per esempio), e **Attiva** ripristina la protezione. Le chat
nascoste restano sempre fuori da essi mentre sono aperte, qualunque sia l’impostazione. L’impostazione è del telefono,
la stessa in ogni spazio. Su un computer e nella web app non esiste.

**Perché:** senza, l’ultima schermata di Erevos resta come immagine tra le app recenti finché Erevos non si riapre,
quindi le chat nascoste restano sempre fuori, per non apparire mai lì senza il loro PIN. L’impostazione è la stessa in
ogni spazio così che non dica nulla di quale spazio si è aperto.

### Impronta o volto

Su Android 11 e successivi, con un’impronta o un volto configurati nelle impostazioni del telefono, Erevos può aprirsi
anche così. È disattivato finché non lo attivi.

1. Con il blocco con password attivo, in **Impronta o volto**, tocca **Attiva**.
2. Scrivi la password dello spazio in cui ti trovi, tocca **Attiva**, e tocca il sensore (o guarda il telefono).
3. Da quel momento la schermata della password ha un pulsante **Impronta o volto**. Anche la password funziona sempre,
   e **Disattiva** lo disattiva.

- **Solo lo spazio della prima password:** un’impronta non apre mai lo spazio di una seconda password, né le chat
  nascoste. Attivata nello spazio che apre una seconda password, non apre nulla: la prima volta che viene provata si
  disattiva da sola, e la password apre Erevos. L’impostazione appare uguale in ogni spazio.
- **Sotto costrizione:** qualcuno che ti trattiene può premere il tuo dito sul telefono, o metterlo davanti al tuo
  viso. Se può succedere, tienila disattivata: così serve una password, e puoi dargli la seconda.
- **Come è conservata:** la chiave del primo spazio è sigillata da una chiave nell’hardware sicuro del telefono
  (l’Android Keystore) che funziona solo subito dopo un controllo forte dell’impronta o del volto, una volta per ogni
  uso. Aggiungere o rimuovere un’impronta o un volto fa scartare ad Android quella chiave: allora è disattivata, e la
  riattivi. Niente lascia il telefono.
- **Quale volto:** un volto conta solo dove Android considera forte il suo sblocco con il volto, come sul Pixel 8 e
  successivi; altrove vale l’impronta.
- **Le password sbagliate** vengono contate come prima: un’impronta non cambia il conteggio.
- **Non su computer o sul web:** è offerta solo su Android. Disattivare il blocco disattiva anche questa.

**Perché:** un dito è più facile da forzare di una password, e chiunque abbia un dito o un volto che il telefono
conosce potrebbe usarlo, quindi non apre mai lo spazio di una seconda password o le chat nascoste. Attivata in un altro
spazio, conserva una chiave che non apre nulla, della stessa forma, così quello che è salvato non mostra in quale
spazio è stata attivata.

## Seconda password {#second}

Se qualcuno ti costringe ad aprire Erevos, inserisci la seconda password invece della tua. Apre un Erevos separato e
vuoto, con contatti, relay e aspetto propri. Le tue vere chat restano nascoste, e niente nell’app mostra che
esistono.

1. Con il blocco con password attivo, tocca **Imposta la seconda password**.
2. Scrivila due volte e tocca **Salva**. Deve essere diversa dalla tua password.

- **L’aspetto:** il secondo spazio parte con l’aspetto dello spazio in cui è stato impostato, così non si nota.
- **Una alla volta:** impostare di nuovo una seconda password sostituisce quella precedente. **Rimuovi la seconda
  password** la rimuove.
- **Discrezione:** per privacy, l’app non mostra mai se è impostata una seconda password. Nella web app con le
  notifiche ad app chiusa attive, il numero sull’icona di Erevos resta finché Erevos è chiuso: se non corrisponde allo
  spazio che apri, può lasciarne intuire un altro (**Numero sull’icona** lo disattiva).

## Chat nascoste {#hidden}

Ogni spazio ha 4 posti per chat nascoste, ognuno aperto solo con il suo PIN, e non appaiono mai tra le tue altre
chat. Non c’è nessun pulsante per loro da nessuna parte. Ogni posto può contenere una chat o più, quindi 2 spazi hanno
8 posti.

**Perché:** ogni posto ha già un suo PIN, quindi una chat da sola in un posto ha una sua chiave, e un posto può anche
contenere più chat sotto un unico PIN. Il numero di posti è fisso per due motivi:

- **Perché non si veda niente.** Tutti e 4 i posti esistono dal primo avvio, riempiti di dati casuali finché non sono
  usati. Chi ti costringe ad aprire il telefono, o copia quello che conserva, non può capire se hai chat nascoste, né
  quante. Con una chiave per ogni chat, i file sigillati crescerebbero a ogni nuova chat nascosta, e rivelerebbero
  quante sono.
- **Perché resti veloce.** Un PIN scritto nella ricerca viene provato su ogni posto, e ogni tentativo è lento di
  proposito (Argon2id, che richiede molta memoria e tempo, così i PIN non si possono indovinare velocemente). Con 4
  posti l’apertura resta breve e richiede sempre lo stesso tempo, così nemmeno il tempo dice quanti sono usati.

Il numero si può aumentare in seguito senza perdere nulla, al prezzo di un’apertura un po’ più lenta; diminuirlo
cancellerebbe quello che contengono i posti tolti.

1. Inizia un posto in uno dei due modi: in **Impostazioni** → **Privacy e sicurezza** → **Chat nascoste**, scegli da
   **Posto 1** a **Posto 4**, tocca **Imposta il PIN delle chat nascoste**, scrivilo due volte e tocca **Salva**;
   oppure apri i **Dettagli** di una chat, tocca **Sposta nelle chat nascoste**, scrivi un PIN di 4 o più caratteri,
   tocca **Nuove chat nascoste**, scegli un posto, poi **Crea e sposta**. Ricorda quali posti usi: per privacy, Erevos
   non può dire quali sono liberi.
2. Per aprirle, scrivi il PIN in **Cerca nelle chat** nella schermata principale e premi Invio (il tasto di ricerca
   della tastiera). Oppure tieni premuto **Nuova chat** per un secondo: si apre un campo per il PIN, uguale in ogni
   spazio; scrivilo e tocca **Apri**. Apre solo il posto con quel PIN. Un PIN sbagliato è solo una ricerca, o chiude
   solo il campo: non succede nulla.
3. Si aprono con il titolo **Chat nascoste**, con **Contatti** e **Cambia PIN** in alto, ed elencano le loro chat e i
   loro gruppi come la schermata principale elenca i tuoi: dai più recenti, ognuno con l’ultima cosa detta, quando, e
   quanti messaggi non sono letti. Toccane una per aprirla. La freccia indietro le chiude.
4. Per spostare un’altra chat in un posto, apri i suoi **Dettagli**, tocca **Sposta nelle chat nascoste**, scrivi il
   PIN di quel posto e tocca **Sposta**. La
   chat lascia il tuo elenco con i suoi messaggi, nome, immagine e aspetto, e le chat importate in essa, e il suo codice
   di sicurezza resta lo stesso. Al suo telefono
   viene detto subito di scrivere alle chat nascoste d’ora in poi; un messaggio che invia proprio in quel momento
   potrebbe non arrivare.
5. Per riportare una chat tra le chat dello spazio, aprila nelle chat nascoste, poi i suoi **Dettagli**, tocca
   **Riporta nelle mie chat** e **Sposta**. Va con i suoi messaggi, nome, immagine, aspetto e chat importate, e al suo
   telefono viene detto dove scrivere.

- **Solo relay o Nostr:** le chat nascoste hanno una loro coda sul relay e le loro chiavi, e non usano mai il
  collegamento da vicino. Senza relay, il loro link di contatto dice dove leggono su Nostr, con una chiave solo di quel
  posto, e i testi vanno lì, come da un telefono senza relay; foto, messaggi vocali, chiamate e gruppi hanno bisogno di
  un relay. Mentre sono chiuse, i loro messaggi aspettano sul relay, o su Nostr per due giorni, a meno che **Ricevere
  da chiuse** non sia attivo.
- **Ricevere da chiuse:** un interruttore in cima a ogni posto. Se è attivo, le sue chat nascoste ricevono come le tue
  altre chat mentre lo spazio è aperto, qualunque schermata sia visibile e con Erevos in background: i loro contatti
  vedono subito che un messaggio è arrivato, una notifica dice solo «New message», su Android una chiamata squilla con
  «Incoming call» e senza nome (sulla schermata dello squillo, tocca il piccolo segno, scrivi il PIN e tocca
  **Connetti** per rispondere), e un promemoria della loro Chat con me stesso mostra una notifica che dice solo
  **Reminder**. Allora viene letto anche quello che arriva loro tramite Nostr. Una chiamata che è finita prima che le
  aprissi, o ha squillato troppo a lungo, appare come persa. Niente di loro appare da nessuna parte finché il PIN non le
  apre. Un nuovo posto parte con questo attivo; i posti impostati prima restano com’erano finché non lo attivi. Per
  questo, la chiave del posto è conservata crittografata con lo spazio, tra una chiave casuale per ogni altro posto,
  così aprire lo spazio non mostra quali posti ricevono, o sono impostati. Ma chi apre lo spazio e copia quello che il
  telefono conserva potrebbe aprire anche quel posto, senza PIN: il PIN allora le tiene nascoste a chi ha in mano il
  telefono, non a uno strumento forense. Se è disattivato,
  la loro chiave è solo dietro il PIN, e i loro messaggi aspettano sul relay finché non le apri. I backup conservano
  l’interruttore.
- **Si chiudono da sole** appena Erevos è stato in background per più di 30 secondi, come si riblocca il PIN di una
  chat, ma non durante una chiamata, né mentre scegli una foto o un file per loro o scatti una foto.
- **Mentre sono aperte,** un messaggio che arriva fa sentire il suono dei nuovi messaggi, come nelle tue altre chat.
  Con Erevos in background prima che si chiudano, una notifica dice «New message» solo se **Ricevere da chiuse** o
  **Avvisa quando arriva un messaggio** è attivo per quel posto.
- **Come le tue altre chat:** quello che non può partire ora aspetta, segnato **In attesa**, solo tramite il loro
  relay, o Nostr senza relay (vedi **In attesa** in [Chat tramite un relay](#relay)), **Invia più tardi** funziona come
  lì, e una chat esportata da un’altra app si può importare nei dettagli di una chat nascosta (vedi [Chat
  importate](#import)). Anche lì si può aggiungere un contatto da una foto del suo codice QR, scattata o scelta mentre
  restano aperte. Ogni posto ha la sua **Chat con me stesso**, prima nel suo elenco (vedi **Chat con me stesso e
  promemoria** in [Per iniziare](#start)).
- **Gruppi:** **Nuovo gruppo**, sotto il loro elenco, crea un gruppo con i loro contatti, come nella schermata
  principale (vedi [Chat di gruppo](#groups)), e appare nel loro elenco tra le loro chat. I suoi membri sono solo
  contatti di quel posto, e uno che aggiungi come contatto da lì diventa un contatto di quel posto. Quello che vi si
  scrive passa solo dal relay del posto, a una sua coda lì, mai a un telefono vicino; mentre il posto è chiuso viene
  letto solo con **Ricevere da chiuse** attivo, e **Avvisa quando arriva un messaggio** non lo conta. Le sue chiamate
  squillano solo mentre le chat nascoste sono aperte: una avviata mentre sono chiuse appare come persa. Un gruppo lì
  non ha un PIN suo, e nessuno è pubblico.
- **Le anteprime dei link** hanno un loro interruttore nei dettagli di una chat nascosta, per tutte le chat di quel
  posto, disattivato finché non lo attivi (vedi **Anteprime dei link** in [Chat tramite un relay](#relay)).
- **Avvisa quando arriva un messaggio** (Android): in cima a un posto mentre **Ricevere da chiuse** è disattivato. Se
  lo attivi, mentre il posto è chiuso una notifica dice solo «New message», o quanti ne sono arrivati, come per le
  altre chat, con Erevos in background o visibile, ogni messaggio
  una volta, anche quando Erevos è stato chiuso e riavviato; quello che è arrivato mentre il posto era aperto non ne fa
  nessuna dopo che si chiude. Che un tuo messaggio gli sia arrivato o sia stato letto, la scrittura in corso e le nuove
  chiavi non ne fanno, né una chiamata che ha squillato (vedi **Fai squillare le chiamate quando sono
  chiuse**); una che non ha squillato conta come messaggio. Un messaggio o un’eliminazione che altri telefoni Erevos
  hanno portato al relay (vedi **Trasportati da altri telefoni** in [Chat con un telefono vicino](#nearby)) non può dire
  che cosa porta, perché i telefoni che lo portano non devono saperlo: conta come messaggio, quindi anche
  un’eliminazione mostra «New message», e il primo messaggio di una chat può contare per due; e uno inviato senza suono
  suona come al solito (vedi **Invia senza suono**). Richiede **Ricevi e squilla** e **Avvisa dei nuovi messaggi** in
  **In background**, cosa che l’interruttore dice quando non sono attivi, e un relay che aspetta (dal 18 ottobre 2026
  in poi); uno di prima del 23 ottobre
  2026 può solo dire che qualcosa aspetta, quindi allora appare «New message» anche per questo, una volta finché non
  apri quel posto. Per questo, lo spazio tiene una coda sul relay per ciascuno dei suoi 4 posti, quelle non in uso
  create per niente sullo stesso relay, così aprire lo spazio non mostra né se ci sono chat nascoste impostate né
  quali, purché usino il relay dello spazio; al relay si chiede solo quanti messaggi sono arrivati, perché li conta dal
  byte che ognuno porta (vedi che cosa vede il relay, sopra), mai i messaggi stessi. Chi vede la notifica e non trova
  niente di nuovo nelle tue chat può immaginare che ce ne siano altre. Dopo che hai eliminato o bloccato qualcuno nel
  posto, il primo messaggio di qualcuno di nuovo, dal link di contatto o dal codice QR del posto, non ne fa nessuna:
  si vede quando apri il posto. I backup non lo conservano: riattivalo dopo il ripristino.
- **Fai squillare le chiamate quando sono chiuse** (Android): sotto **Avvisa quando arriva un messaggio**, mentre
  **Ricevere da chiuse** è disattivato. Se lo attivi, mentre il posto è chiuso, con Erevos in background o su qualsiasi
  schermata, una chiamata da uno dei suoi contatti fa squillare il telefono e
  mostrare «Incoming call» senza nome, come una chiamata dalle tue altre chat. Sulla schermata dello squillo, tocca il
  piccolo segno, scrivi il PIN e tocca **Connetti** per rispondere; un semplice **Rispondi** non può collegarla, e
  **Rifiuta** ferma lo squillo. Lo squillo dura circa 45 secondi. Richiede **Ricevi e squilla** in **In background**,
  cosa che l’interruttore dice quando non è attivo, e un relay che aspetta, e usa una sua coda sul relay per ciascuno
  dei 4 posti, quelle che non squillano create per niente sullo stesso relay, come per la notifica dei messaggi qui sopra, così aprire lo spazio non rivela nulla. Chi
  chiama fa solo squillare una coda lì; la chiamata stessa aspetta sulla coda della chat finché il PIN non la apre. Un
  contatto che hai eliminato può ancora farlo squillare, ma la chiamata non può mai collegarsi. Una chiamata fatta da un
  computer collegato squilla solo mentre le chat nascoste sono aperte.
  I backup non lo conservano: riattivalo dopo il ripristino.
- **Un nuovo PIN per un posto** (da **Chat nascoste** in **Impostazioni**, o da **Nuove chat nascoste**) lo fa
  ripartire vuoto e sostituisce quello che conteneva. Per tenere le chat e cambiare solo il PIN, aprile e usa **Cambia
  PIN** lì. Ogni PIN deve essere diverso dagli altri e dalla password che apre Erevos.
- **I PIN sbagliati nella ricerca** vengono contati a parte rispetto a quelli della schermata di blocco: dopo cinque,
  le ricerche smettono di provare per un po’, in silenzio, e la schermata di blocco non aspetta mai per causa loro.
- **Un PIN tiene fuori chi prende in mano il telefono,** non chi copia quello che conserva: con uno strumento forense
  su un telefono sbloccato o con root, i PIN si possono provare senza attesa. Ogni tentativo costa Argon2id (molta
  memoria e tempo), ma un PIN di 4 cifre è solo 10.000 tentativi. Se è questo che temi, usa un PIN più lungo, o qualche
  parola.
- **Discrezione:** ogni spazio ha tutti e 4 i posti dall’inizio, quelli non usati riempiti di dati casuali che
  sembrano usati, e la ricerca prova ogni volta ogni posto. Così niente mostra se ci sono chat nascoste impostate, né
  quante.

### Una chat bloccata con un PIN {#chat-pin}

Una chat o un gruppo può avere un suo PIN, a parte le chat nascoste: resta tra le tue chat, ma si apre solo con il suo
PIN.

1. Apri la chat, tocca **⋮** in alto per i suoi **Dettagli**, poi **Blocca con un PIN** (in un gruppo: il nome del
   gruppo in alto, poi **Blocca con un PIN**).
2. Scrivi due volte un PIN di almeno 4 caratteri, poi **Blocco**.

- **Aprirla:** chiede il PIN. Si riblocca appena la lasci, apri un’altra chat, o Erevos resta lontano per più di
  mezzo minuto (come il blocco con password).
- **Dietro il PIN** non si vede niente della chat: nessuno dei suoi messaggi viene disegnato finché il PIN non viene
  scritto, e con il vetro, uno sfondo o la scena propria di uno stile, la schermata del PIN poggia su una brina densa
  che non lascia passare nulla.
- **Nell’elenco** mostra il suo nome con un lucchetto e **Bloccata con un PIN**, niente dei suoi messaggi, nemmeno
  nella ricerca, in **Messaggi importanti** o in **Chat importate**. La notifica dice solo **New message**, come per
  ogni chat.
- **I PIN sbagliati** vengono contati sul telefono, per tutte le chat insieme e a parte rispetto a quelli della
  schermata di blocco: dopo cinque, il tentativo successivo aspetta, ogni volta di più.
- **PIN dimenticato?** Sotto il PIN, dove lo spazio ha una password, **PIN dimenticato?** lo toglie con la password
  che apre lo spazio. Senza una password, niente può riaprirla: eliminare il contatto è allora l’unico modo.
- **Nelle chat nascoste:** una chat che sposti nelle chat nascoste porta con sé il suo PIN, che lì non chiede nulla,
  perché le protegge il PIN delle chat nascoste stesse. Riportata tra le chat, lo stesso PIN chiede di nuovo.
- **Per toglierlo:** **Dettagli** → di nuovo **Blocca con un PIN**, e scrivi il suo PIN.
- **Lo conosce solo questo telefono,** e ogni dispositivo collegato ha il suo. I backup lo conservano.

**Perché:** alcune chat dovrebbero restare dove sono, ma non aprirsi per chi ha in mano il telefono per un momento. Il
PIN è conservato solo come suo Argon2id, quindi non si può leggere dal telefono, e i tentativi sono lenti. È un blocco
sullo schermo, non una chiave a sé: i messaggi della chat restano crittografati con il resto dello spazio, e chi copia
quello che il telefono conserva mentre lo spazio è aperto potrebbe comunque leggerli. Per una chat che non deve
nemmeno essere vista, usa le chat nascoste.

## Backup {#backup}

Un backup è un unico file con tutto quello che Erevos conserva su questo telefono: ogni spazio, con i suoi contatti, le
chiavi delle sue conversazioni, i suoi messaggi, messaggi vocali, chat importate e chat nascoste, la sua Chat con me
stesso, e il blocco. Al suo interno ogni spazio resta
sigillato con la sua password, e il file è sigillato di nuovo con una sua password. Si trova in **Impostazioni** →
**Dati e dispositivi** → **Backup**.

1. **Crea un backup:** tocca **Crea un backup**, scegli una cartella (sul telefono, su una scheda di memoria, o in
   un’app cloud che vi mostra le sue cartelle; su un computer, qualsiasi cartella), scrivi due volte una password per
   il backup (almeno 12 caratteri, o quattro parole) e tocca **Salva**.
2. **Backup automatici:** scegli **Ogni giorno** o **Ogni settimana**, poi una cartella e una password. Erevos ne fa
   uno quando si apre e l’ultimo è più vecchio di così, e la cartella conserva i 3 più recenti. Sotto ci sono **Fai il
   backup ora**, **Cambia cartella** e **Cambia password**; **Disattivato** li ferma, e quelli fatti restano nella
   cartella.
3. **Anche su un server:** su Android, con i backup automatici attivi, **Aggiungi un server** sotto **Anche su un
   server** invia ognuno anche in una cartella su un server che scegli tu e che parla WebDAV, come il tuo Nextcloud:
   dai l’indirizzo della cartella, un nome utente e, meglio, una password per app solo per Erevos, poi tocca
   **Connetti**. Il server tiene i 3 più recenti; **Smetti di inviare** lo ferma, e quelli che ci sono restano.
4. **Ripristina:** tocca **Ripristina un backup**, scegli il file e scrivi la sua password. Erevos chiede ancora una
   volta, poi mette il backup al posto di tutto quello che c’è sul telefono, e si apre com’era quando il backup è stato
   fatto, con le password di allora.

- **Conserva la password del backup:** niente apre un backup senza di essa, e nessuno può recuperarla. Senza un blocco
  con password, la password del backup è tutto ciò che lo protegge. Chi ha il file può provarci sopra password alla
  velocità del suo computer, senza un telefono che lo rallenti, quindi una password corta non regge: Erevos non ne
  accetta sotto i 12 caratteri.
- **I backup automatici conservano la loro password sul telefono,** così non serve una password ogni volta. Chi apre la
  loro cartella ha comunque bisogno delle password degli spazi per leggere le chat.
- **Su un server:** il backup che va lì è sigillato con la sua password come gli altri, e quella password non lascia
  mai il telefono, quindi il server non può aprirlo. Il suo nome è casuale e il file sembra fatto di byte casuali, di
  una tra poche dimensioni, quindi né l’uno né l’altro dice che è di Erevos né quanto contiene esattamente. Il server
  vede comunque il tuo account, l’indirizzo del telefono, quando ne arriva uno e più o meno quanto è grande. I backup
  ci vanno direttamente, non tramite Tor: finché uno spazio invia **Tutto** tramite Tor, non ne parte nessuno. Per
  ripristinarne uno, scarica il più recente dal server e tocca **Ripristina un backup**; un Erevos precedente a questa
  versione non lo apre. Google Drive è escluso apposta: Google lega il file al tuo nome, ed Erevos avrebbe bisogno
  delle app di Google e di un accesso a Google sul telefono.
- **Le chat proseguite dopo il backup:** il ripristino rimette le chiavi di ogni conversazione com’erano allora. I
  messaggi arrivati dopo il backup e già letti non ci sono, e una chat che è proseguita potrebbe non aprire più i nuovi
  messaggi. Allora chiedi di nuovo al contatto il suo link di contatto. Prima che una chat ripristinata scriva di nuovo,
  le sue conversazioni saltano oltre le chiavi che potrebbero aver usato dopo il backup, così nessuna chiave sigilla
  mai due messaggi: una usata due volte permetterebbe a chi ha conservato entrambi i pacchetti di leggerli insieme.
- **Un telefono alla volta:** un backup ripristinato su un secondo telefono legge le stesse code sul relay del primo, e
  ognuno prende messaggi che l’altro poi non riceve mai. Usalo per passare a un nuovo telefono, non per tenerne due.
- **Discrezione:** ogni spazio mostra la stessa schermata Backup, e un backup contiene ogni spazio, quindi né l’una né
  l’altro dicono quanti spazi ci sono o se ci sono chat nascoste impostate. Il nome del file dice che è un backup di
  Erevos, e la sua dimensione mostra più o meno quanto viene conservato.
- **Gli SMS del telefono:** su Android, **Includi gli SMS nei backup** aggiunge da quel momento a ogni backup gli SMS e
  gli MMS del telefono, con al massimo 32 MB delle loro immagini, mentre Erevos è l’app per gli SMS. Sono sigillati con
  la password del backup come il resto. Il ripristino del backup rimette negli SMS del telefono ogni messaggio che non
  ha ancora, e non ne elimina nessuno; anche allora Erevos deve essere l’app per gli SMS, altrimenti il resto viene
  ripristinato senza di loro. Gli SMS sono del telefono, gli stessi in ogni spazio. Un Erevos più vecchio non apre un
  backup che contiene SMS.
- **Gli SMS in ordine:** i messaggi fissati, le conversazioni archiviate, il Cestino, le bozze, il filtro antispam e i
  segni di ogni spazio, e quanto aspetta un SMS per poter essere annullato, sono in ogni backup, sigillati con la
  password dello spazio come il resto. Gli SMS inviati più tardi (**SMS più tardi**) no, così un backup ripristinato su
  un altro telefono non ne invia mai uno di nuovo; né gli inviti, i nomi dai tuoi contatti e la SIM scelta per ogni
  numero. Un Erevos più vecchio non apre un backup che li contiene; uno fatto da un Erevos più vecchio si ripristina
  come sempre, senza di loro.
- **Non in un backup:** foto e file, non ancora: un backup viene creato nella memoria del telefono, e non ci
  starebbero. Un backup ripristinato sullo stesso telefono li mostra di nuovo; su un altro telefono appaiono come non
  presenti. Restano fuori anche: il conteggio delle password sbagliate, e come sono impostati i backup automatici.
- **I dispositivi collegati** non sono in un backup: un collegamento resta con il telefono e il computer su cui è stato
  fatto. Dopo aver ripristinato un backup su un altro telefono, collega di nuovo il computer: sul computer, tocca
  **Scollega questo dispositivo**, poi collegalo come la prima volta, vedi [Dispositivi collegati](#devices). I
  contatti con questa versione smettono allora di scrivere ai tuoi computer finché non lo fai: il telefono dà loro un
  nuovo elenco dei suoi dispositivi che non ne nomina nessuno. Se l’orologio di questo telefono è indietro rispetto a
  quello perso, quell’elenco parte appena gli scrivono, e i dettagli della loro chat potrebbero dire che è cambiato il
  giorno dopo il ripristino. Il backup di un computer collegato contiene le chat del telefono com’erano, ma
  non il collegamento per scriverci: ripristinate, si possono leggere lì ma non ci si può scrivere, ed Erevos lo dice
  una volta. Per scriverci, collega di nuovo quel computer al telefono: le chat che il telefono ha ancora restano, con
  quello che è arrivato nel frattempo, e le altre se ne vanno. Sul telefono, scollega il dispositivo che era prima. Fai
  i backup sul telefono.
- **Un backup da un Erevos più recente:** Erevos 0.1.8 e successivi lo aprono comunque, e ne ripristinano tutto quello
  che conoscono; quelli precedenti dicono che una parte resta fuori. Aggiorna prima Erevos per ripristinarlo tutto.

## Chat importate {#import}

Le tue vecchie chat da Telegram e WhatsApp possono entrare in Erevos, da leggere, con le loro foto, video, messaggi
vocali e file, e quelle da Viber con le loro parole. Restano su questo telefono, sigillate nello spazio in cui le porti,
e non vengono mai inviate da nessuna parte.

Prima esporta la chat dall’altra app:

- **WhatsApp:** apri la chat, poi **Altro**, **Esporta chat**, **Includi media**, e salva lo .zip sul telefono.
  **Senza media** porta solo le parole.
- **Telegram Desktop:** **Export chat history**, formato **JSON**, con le foto, i video, i messaggi vocali e i file
  che vuoi. Poi fai uno .zip della cartella che ha creato (su Windows: clic destro, **Invia a**, **Cartella
  compressa**) e copia lo .zip sul telefono. **result.json** da solo porta solo le parole.
- **Viber:** Viber stesso non esporta chat. Su Android, l’app **Backup Text for Viber** ne salva una come file .html:
  copialo sul telefono. Entrano solo le parole, con le emoticon di Viber come emoji. I tuoi messaggi lì non hanno
  nessun nome, quindi entrano come **Io**, già scelto come te. I messaggi di un giorno precedente all’esistenza di
  Viber, come il 1970, vengono da un telefono con l’orologio sbagliato: entrano senza ora.

Poi:

1. In Erevos, apri **Impostazioni** → **Dati e dispositivi** → **Chat importate** e tocca **Importa un file**, poi
   scegli il file.
2. Erevos dice che cosa ha trovato, con quante foto e file e quanto sono grandi insieme. Tocca il tuo nome, così i
   tuoi messaggi appaiono a destra, e tocca **Salva**. I file entrano uno dopo l’altro, e dice quanti e quale parte
   ne è entrata. **Annulla** lo ferma in quel momento, e non ne tiene nessuno.
3. Elimina tu stesso il file esportato dal telefono: Erevos conserva una sua copia sigillata, ma il file che hai
   salvato non è sigillato.

Per continuare la conversazione in Erevos, anche l’altra persona ha bisogno di Erevos:

1. Con **Nuova chat**, aggiungila come contatto tramite il relay, come in [Chat tramite un relay](#relay).
2. Apri la chat importata, tocca **Continua in Erevos** e sceglila.
3. La sua chat mostra ora i vecchi messaggi prima di quelli nuovi, come se fossero sempre stati in Erevos: in
   nuvolette, per giorno, con le loro ore, e **Continua in Erevos** tra loro e quelli nuovi. **Apri la chat** ti porta
   lì, e un contatto a cui non hai dato un nome prende il nome della chat importata.

**Dall’interno della chat:** la chat di un contatto ha **Chat importate** nei suoi **Dettagli**, sopra **Privacy**.
**Importa una chat qui** porta un file direttamente in quella chat, senza passare da **Impostazioni**: quando il file
contiene più chat, come un’esportazione di Telegram di tutte le chat, chiede quale continua qui, e propone la più
lunga. Ogni chat importata che continua lì è elencata con tre pulsanti:

- **Solo nella chat** la toglie da **Impostazioni** → **Dati e dispositivi** → **Chat importate**: appare solo in
  quella chat, come se ci fosse sempre stata. Una chat portata dai dettagli della chat è conservata così fin
  dall’inizio. **Mostra anche in Chat importate** la rimette nell’elenco, e lo fa anche l’elenco stesso, quando quel
  contatto non c’è più.
- **Scollega** smette di mostrarla nella chat; resta in **Chat importate**, da leggere o da continuare con qualcun
  altro.
- **Elimina** la elimina dal telefono, con le sue foto e i suoi file, dopo averlo chiesto.

**Perché:** una vecchia chat appartiene alla persona con cui era, quindi viene portata, conservata ed eliminata dove le
parli, e l’elenco in **Impostazioni** tiene solo quello che non ha nessun altro posto dove andare. In entrambi i casi
niente lascia il telefono.

- **Foto, video, messaggi vocali e file** entrano da uno .zip, ognuno sigillato in questo spazio come un file in una
  chat. Le foto appaiono nella chat man mano che ci arrivi scorrendo, e gli sticker come sticker; tocca una foto o un
  file per vederlo da solo e **Salva** per salvarlo. Messaggi vocali e canzoni si riproducono direttamente nella chat
  con un tocco; un video si riproduce nell’app del telefono dopo averlo salvato. Tieni premuto un messaggio importato
  per **Copia** o **Apri** il suo file. **Cerca in questa chat** trova anche i messaggi importati. I file più grandi di
  1 GB, e quelli che l’esportazione non contiene, restano fuori, e la chat dice dove ce n’era uno.
- **Spazio sul telefono:** mentre entra uno .zip, al telefono serve libero circa il doppio della sua dimensione, perché
  Erevos ne legge una copia e conserva i file sigillati. I file importati non sono ancora nei backup, come non lo sono
  gli altri file.
- **Solo su questo telefono, solo da leggere:** i messaggi importati non vengono mai inviati, quindi l’altro telefono
  non li riceve. Erevos non può mostrare chi li ha scritti davvero.
- **Notifiche e chiamate** dell’altra app vengono escluse, e la chat dice quante sono.
- **Anche nelle chat nascoste:** nei **Dettagli** di una chat nascosta, **Importa una chat qui** tiene la chat con
  quel posto, crittografata con la sua chiave, e la mostra solo in quella chat, mai in **Impostazioni** → **Dati e
  dispositivi** → **Chat importate**; lì si può solo eliminare. Una chat spostata nelle chat nascoste porta con sé le
  chat importate in essa, tenute solo lì, e le riporta indietro se torna indietro.
- **Elimina messaggi** in una chat lascia quelli importati: eliminali nei **Dettagli** della chat, sotto **Chat
  importate**, o in **Impostazioni** → **Dati e dispositivi** → **Chat importate**.

> Il file delle chat importate cresce con quello che porti dentro, quindi la sua dimensione dice più o meno quanto è
> stato importato, ma non in quale spazio.

## Aspetto {#appearance}

**Aspetto** segue LPHL FASOULI e il sito LPHL. Si trova in **Impostazioni** → **Aspetto**, in parti che si aprono
ognuna da sola: **Stile e colori** (la finitura, il vetro, lo stile, il tema, i colori e il testo sulle aree colorate
qui sotto, con l’**Anteprima**), **Sfondo**, **Messaggi**, e su Android **Icone del launcher** e **Widget**.

| Impostazione | Scelte |
| --- | --- |
| **Finitura** | **Piatto**, o **Vetro** come su lphl.nekten.eu. Il vetro è di due tipi: **Lastre** (ogni scheda una lastra di vetro sopra lo sfondo) e **Una lastra** (ogni schermata su un’unica lastra smerigliata). |
| **Stile** | **Classic** (lo scuro e oro di Erevos), **Modernist** (Inter Tight), **Nocturne** (sempre scuro, con i suoi colori), **Neon** (LED ciano e magenta che brillano, sopra una griglia che corre verso un sole al tramonto), **Matrix** (verde su nero in monospazio, con codice che piove dietro), **Paper** (blu stilografica su crema, con le grazie, sopra righe con un margine rosso), **Aurora** (viola su un quasi bianco, morbido e arrotondato, sopra pozze di luce menta, lilla e pesca), **Material You** (i colori del telefono, su Android 12 e successivi) e **Personalizzato** (il tuo fondo e il tuo colore d’accento). |
| **Tema** | **Sistema**, **Chiaro** o **Scuro**. Nocturne, Neon e Matrix sono sempre scuri, Paper e Aurora sempre chiari, e Personalizzato è chiaro o scuro a seconda del suo fondo. Material You lo segue. |
| **Colori** | Quelli dello stile, una delle dodici tavolozze di LPHL, o **Il mio colore**. Scegliere una tavolozza con uno stile che ha i suoi colori torna allo stile scelto prima. |
| **Personalizzato** | Con **Personalizzato** scelto: il suo **fondo** (otto chiari, otto scuri) e il suo **accento**. Il testo e le superfici derivano dal fondo, e ogni colore viene controllato perché si legga bene sopra. |
| **Testo sulle aree colorate** | **Bianco**, **Come la tavolozza**, o **Il mio colore**. |
| **Sfondo** | Quello che c’è dietro ogni schermata: **Come lo stile** (la scena o il bagliore propri dello stile), **Tinta unita**, o un motivo disegnato tenue nel colore d’accento: **Puntini**, **Griglia**, **Righe**, **Stelle**, **Luci** (morbidi cerchi di luce) o **Sfumatura**; oppure **Foto**, una tua foto, rimpicciolita, ridisegnata e sigillata, sotto un velo perché il testo si legga (**Cambia foto** ne sceglie un’altra). La schermata della password mostra invece quello dello stile. |
| **Messaggi** | Come una chat disegna i messaggi: nuvolette **Arrotondato**, nuvolette **Squadrato**, o **Linea**, nessuna nuvoletta ma una linea accanto al testo, come un registro. |

Neon, Matrix, Paper e Aurora disegnano una loro scena dietro ogni schermata, Personalizzato tiene il fondo che hai
scelto e Material You i colori del telefono, quindi il **Vetro** aspetta finché sono scelti. La pioggia resta
ferma quando il telefono è impostato per ridurre le animazioni.

L’**Anteprima** mostra alcuni messaggi e pulsanti con l’aspetto che hai scelto. Ogni combinazione viene controllata
perché il testo si legga sempre bene, anche sul vetro.

- **Ogni spazio ha il suo aspetto.**
- **La schermata della password** mostra l’ultimo aspetto usato. Per farlo è conservato fuori dai dati sigillati: non
  dice nulla delle tue chat, ma chi apre il telefono vede quale aspetto usi.
- **Material You** prende i colori che Android ricava dal tuo sfondo (Android 12 e successivi), chiari o scuri come
  dice **Tema**, con pulsanti arrotondati e schede morbidamente arrotondate, nel carattere del telefono. Un nuovo sfondo
  li cambia anche in Erevos, appena torna visibile. Vengono letti sul telefono e non vanno da nessuna parte. Sulle
  versioni di Android più vecchie e su un computer non viene offerto.
- **Icone del launcher** (Android): il colore di ciascuna delle icone di Erevos tra le app del telefono, **Erevos**
  (rossa, apre le chat Erevos, o la chat che hai lasciato aperta), **Telefono** (verde, apre il tastierino), **SMS**
  (blu, apre l’elenco degli SMS) e **Contatti** (viola): rosso, arancione, verde, blu, viola o scuro. Ogni tocco apre
  quello che la sua icona nomina, anche quando Erevos mostrava un’altra di esse. Il colore è del telefono, non di ogni
  spazio, perché le icone appaiono prima che Erevos sia sbloccato. Dopo una modifica alcuni launcher tolgono l’icona
  dalla schermata Home: aggiungila di nuovo dall’elenco delle app.
- **Widget** (Android): l’ordine dei quattro pulsanti del widget, da sinistra a destra, con il widget disegnato come
  apparirà. Tocca ↑ o ↓ per spostare un pulsante; **Ordine iniziale** li rimette a posto.

## Su un computer {#desktop}

Erevos funziona anche su un computer, Linux, macOS o Windows, come app a sé. Chatta tramite un relay, crittografato
end-to-end come sul telefono, e conserva i suoi contatti, messaggi e impostazioni sigillati allo stesso modo.

1. Installalo. Su Linux: il pacchetto per i sistemi basati su Arch (\`erevos-linux-x86_64.pacman\`, con
   \`sudo pacman -U\`) o l’AppImage. Su un Mac: apri l’immagine disco e trascina Erevos in Applicazioni. Non ha una
   firma Apple a pagamento, quindi la prima volta consentilo in
   **Impostazioni di Sistema → Privacy e sicurezza → Apri comunque**. Su Windows 10 o 11: esegui
   \`erevos-windows-x64-setup.exe\`, che installa Erevos solo per te, senza amministratore, e lo mette nel menu
   Start; oppure tieni \`erevos-windows-x64-portable.exe\` dove vuoi ed eseguilo, senza installare nulla. Nessuno dei
   due ha una firma a pagamento, quindi la prima volta Windows dice di aver protetto il tuo PC: tocca
   **Ulteriori informazioni**, poi **Esegui comunque**.
2. Imposta il relay e aggiungi i contatti come sul telefono, vedi [Chat tramite un relay](#relay). **Copia il mio link
   di contatto** copia il tuo link, da incollare dove deve andare.

- **Quello che fa solo il telefono:** Bluetooth, Wi-Fi Aware e LoRa, e i loro test. I contatti sulla stessa rete Wi-Fi
  li raggiunge come fa un telefono, vedi [Chat con un telefono vicino](#nearby). Il resto è uguale: spazi e seconda
  password, chat nascoste, messaggi vocali, chat importate e backup.
- **Dove conserva le cose:** in una sua cartella (su Linux \`~/.config/Erevos\`, su un Mac
  \`~/Library/Application Support/Erevos\`, su Windows \`%APPDATA%\\Erevos\`), sigillate come sul telefono. Il suo
  archivio di chiavi è sigillato con il portachiavi del sistema (su un Mac il Portachiavi, su Windows la chiave del tuo
  account Windows). Su un sistema Linux senza portachiavi (KWallet o GNOME Keyring), o con uno che Erevos non trova,
  Erevos si apre con un avviso e non conserva nulla: avvia il portachiavi, o dai a Erevos
  \`--password-store=gnome-libsecret\`. Avviato con \`--plain-secrets\`, conserva lì il suo archivio di chiavi così
  com’è, leggibile dal tuo utente: allora imposta un blocco con password. L’app portatile per Windows conserva le sue
  cose nella stessa cartella di quella installata, e disinstallarla le lascia lì.

**Perché:** senza un portachiavi, l’archivio di chiavi starebbe sul disco così com’è, leggibile dal tuo utente, quindi
Erevos non conserva nulla lì a meno che tu non lo scelga con \`--plain-secrets\`: nessuno spazio per password resta lì
non sigillato a tua insaputa.

- **Il firewall di Windows** chiede, la prima volta che Erevos si apre, se può usare la rete. Consentilo sulle reti
  private, altrimenti telefoni e computer sulla stessa rete Wi-Fi non possono raggiungerlo; i relay funzionano in
  entrambi i casi.
- **I messaggi vocali** registrati su un computer sono Opus, su un telefono AAC. Entrambi si riproducono su entrambi.
- **Le foto** arrivano dai file del computer; non c’è la fotocamera. **Salva** chiede dove mettere una foto o un file.
- **Un computer e un telefono possono condividere un account:** collega il computer al telefono, ed entrambi hanno le
  stesse chat e gli stessi contatti, vedi [Dispositivi collegati](#devices). Oppure un backup sposta tutto dall’uno
  all’altro, vedi [Backup](#backup), e da quel momento usa solo uno dei due.
- **Nessuna notifica né suono:** Erevos su un computer non mostra notifiche del sistema e non emette suoni. Mentre è in
  funzione, un nuovo messaggio appare solo nella sua finestra, e una chiamata mostra lì la sua schermata senza
  squillare, quindi con la finestra ridotta a icona o dietro un’altra, niente te lo dice. Da chiuso non riceve nulla:
  i messaggi aspettano sul relay, e una chiamata appare come chiamata persa quando si apre.
- **Provato finora** su Linux. Le versioni per Mac e Windows sono compilate e aperte sui computer di GitHub, non ancora
  da una persona.

## Dispositivi collegati {#devices}

Lo stesso account sul telefono e su un computer, o in un browser: le stesse chat, gli stessi contatti e messaggi su
entrambi. Il telefono resta l’account: solo lui aggiunge contatti, e collega e scollega dispositivi. Ogni dispositivo
collegato ha chiavi sue, che il telefono firma in un elenco dei dispositivi dell’account e dà ai suoi contatti. I
contatti con questa versione scrivono allora anche a ogni dispositivo, crittografato end-to-end, così riceve i loro
messaggi anche a telefono spento; per quelli con versioni più vecchie il telefono passa al computer quello che arriva,
e sigilla per loro quello che scrive il computer. I contatti vedono lo stesso account e lo stesso codice di sicurezza,
qualunque versione di Erevos abbiano.

**Perché:** ogni dispositivo ha chiavi sue, mai una copia di quelle dell’account: Erevos non ha un server che possa
escludere un dispositivo perso, quindi un dispositivo non è mai più di una voce in un elenco che il telefono firma, e
scollegarlo basta. L’elenco ha sempre quattro posti, e quelli che nessun dispositivo occupa contengono chiavi create per
niente, così i contatti non possono capire quanti dispositivi hai. E con il telefono come account, i contatti con
qualsiasi Erevos più vecchio ti raggiungono come prima.

Per collegare un computer:

1. Sul computer, in uno spazio senza chat sue (una nuova installazione, uno spazio aperto da una nuova password, o le
   chat di un computer collegato ripristinate dal suo backup), apri **Impostazioni** → **Dati e dispositivi** →
   **Dispositivi collegati**. Inserisci il relay se lo chiede, dai un nome al dispositivo, e tocca **Collega al mio
   telefono**. Mostra un codice QR.
2. Sul telefono, scansiona il codice con la fotocamera: Erevos si apre su **Dispositivi collegati** con quel codice.
   Oppure copia il codice sul computer, incollalo sul telefono sotto **Codice dal computer**, e tocca **Avanti**.
3. Il telefono mostra il nome del computer e un codice di quattro gruppi di cinque cifre. Scegli quanta cronologia
   passa (**Tutti**, **L’ultimo mese**, **L’ultima settimana** o **Nessuno**) e se **Anche foto e file**, poi tocca
   **Collega**.
4. Anche il computer mostra un codice. Se è quello del telefono, tocca **Coincidono**. Se no, tocca **Sono diversi**:
   qualcun altro potrebbe aver letto il suo codice QR, e non gli è arrivato nulla.

Le chat arrivano allora sul computer, e dopo di esse i messaggi scelti.

- **I messaggi** dei contatti arrivano a entrambi, e ognuno li conserva una volta: uno che arriva di nuovo entro 30
  giorni (fino a 2000 da un contatto) non viene conservato di nuovo, anche dopo che è scomparso o è stato eliminato lì.
  Per questo ognuno conserva, per 30 giorni, quali messaggi sono arrivati e in che giorno, non che cosa dicevano, anche
  dopo che sono scomparsi o sono stati eliminati, e in un backup fatto nel frattempo; il telefono lo conserva anche per
  un contatto che ha collegato un dispositivo. Quello che scrivi sul computer va a un contatto con questa versione
  direttamente da lì, una volta che ha scritto al computer, e altrimenti tramite il telefono: il telefono lo mostra
  come tuo, e il contatto lo riceve dall’account. Quello che scrivi sul telefono appare anche sul computer. Segni di
  lettura, reazioni, messaggi fissati, voti, eliminazioni da entrambi i telefoni, nomi, timer, aspetti delle chat e
  immagini, l’apparire offline e l’accettazione delle richieste vanno in entrambe le direzioni. Un messaggio segnato
  come importante, o un’eliminazione su **Questo telefono**, fatti sul telefono vanno anche al computer; fatti sul
  computer, restano lì.
- **A telefono spento**, i contatti con questa versione raggiungono comunque il computer, e il computer loro: quello
  che scrivono, leggono e a cui reagiscono arriva, e quello che scrivi tu parte. Se il telefono resta spento così a
  lungo che la sua coda sul relay si riempie (1000 messaggi), quello che scrivono e leggono raggiunge comunque il
  computer, un lungo messaggio vocale per intero; quello a cui reagiscono, che fissano, votano o eliminano, e le loro
  chiamate, non passano finché il telefono non è di nuovo acceso. Per i contatti con versioni più vecchie, i gruppi,
  le chiamate, l’aggiunta di un contatto e i messaggi inviati per dopo, **il telefono deve essere acceso** e
  raggiungere il relay: quello che il computer scrive nel frattempo aspetta sul relay, e parte appena il telefono
  torna. Due o più dispositivi collegati si raggiungono anche direttamente: a telefono spento, ognuno mostra comunque
  quello che gli altri scrivono, leggono e a cui reagiscono, e le modifiche che fanno ai contatti; uno che ha perso il
  primo messaggio di un altro ne riceve uno nuovo un giorno o più dopo. Un computer rimasto spento più a lungo di
  quanto il relay conservi i messaggi (14 giorni), o che ha perso il primo messaggio di un contatto, riceve comunque
  quello che scrive dopo: il suo Erevos ricomincia con esso un giorno o più dopo, poi sempre meno spesso, finché non
  risponde. Dopo che un contatto ti elimina e ti aggiunge di nuovo, il computer ricomincia anche con i suoi
  dispositivi.
- **Le foto e i file** che arrivano restano sul relay finché sia il telefono sia il computer non li hanno presi; poi il
  telefono li elimina da lì. Uno che il computer non prende mai se ne va quando viene scollegato, o dopo 14 giorni,
  come ogni file non preso.
- **Le chiamate** squillano sul telefono e sul computer. Rispondi su uno dei due: l’altro smette di squillare, e dice
  che si è risposto su un altro dispositivo. Rifiutare una chiamata su uno la rifiuta su entrambi. Anche il computer
  chiama tramite il telefono; la chiamata stessa va poi direttamente tra il computer e il contatto, crittografata tra
  loro, e il telefono deve restare acceso solo per avviarla.
- **I gruppi** sono anche sul computer, con i loro messaggi, foto, file e messaggi vocali. Scrivici, rispondi,
  reagisci, vota, fissa, elimina i tuoi per tutti, aggiungi e rimuovi membri, rinominane uno o lascialo, lì come sul
  telefono: il telefono lo fa per il computer, come se fosse suo. Una foto o un file che il telefono conserva va al
  computer come copia sul relay, eliminata lì appena il computer l’ha presa. Quello che i membri fanno dopo a un
  messaggio (reagire, votare, fissarlo, eliminarlo per tutti) appare anche sul computer, come un messaggio segnato come
  importante o un’eliminazione su **Questo telefono** fatti sul telefono. Un
  messaggio che il telefono non ha potuto inviare al gruppo (uno chiuso nel frattempo, per esempio) appare sul computer
  come **Non inviato dal telefono**. Creare un gruppo, i gruppi pubblici e le chiamate di gruppo restano per ora sul
  telefono.
- **Le chat nascoste e le seconde password** non vengono mai collegate. Le chat nascoste scrivono ai dispositivi di un
  contatto con questa versione come fanno le tue altre chat, così quelli le ricevono a telefono del contatto spento, e
  al contatto sembrano le chat di un telefono che non ha mai collegato un dispositivo. Una chat spostata nelle chat
  nascoste sul telefono lascia il computer.
  Spostata nelle chat nascoste, o da lì nelle tue chat, una chat scrive solo al telefono del contatto, come fa un Erevos
  più vecchio, finché non torna dove è stata creata: al suo Erevos viene detto prima, così i suoi dispositivi smettono
  di scrivere ai tuoi, e da questo può capire che la chat ha smesso di conoscere i dispositivi collegati: se gli aveva
  dato l’elenco dei tuoi dispositivi, che è passata nelle chat nascoste. Uno spazio aperto da una seconda password
  si collega solo dal suo interno, a dispositivi suoi.
- **Trasferisci di nuovo i messaggi**, sul telefono, invia di nuovo un periodo della cronologia, con le sue reazioni,
  i messaggi fissati, i voti e quelli segnati come importanti; quello che il computer ha già non viene conservato due
  volte.
- **Scollega**, sul telefono, esclude subito un dispositivo: non gli arriva più nulla, e niente di quello che invia
  viene preso. Ai contatti con questa versione viene detto la prossima volta che il telefono raggiunge il relay:
  smettono di scrivergli, e non prendono più nulla da lui. È così che si esclude un computer perso. Se è acceso, gli
  viene detto, e le chat dell’account lo lasciano. Sul computer, **Scollega questo dispositivo** fa lo stesso da lì.
- **Fino a quattro** dispositivi si collegano a un telefono. Un backup non porta i collegamenti: dopo averne
  ripristinato uno su un altro telefono, tocca **Scollega questo dispositivo** sul computer e collegalo di nuovo, vedi
  [Backup](#backup).

## Su iPhone, dal browser {#iphone}

Erevos non ha un’app nell’App Store. Su un iPhone funziona come web app, aggiunta alla schermata Home da Safari, senza
account Apple. Chatta tramite un relay, crittografato end-to-end come sul telefono, e conserva i suoi contatti,
messaggi e impostazioni sigillati allo stesso modo, nello spazio di Safari per l’app.

1. Apri in **Safari** l’indirizzo del server Erevos che ti è stato dato. Erevos mostra come aggiungerlo: tocca
   **Condividi** (su iOS 26, sotto **•••**), poi **Aggiungi alla schermata Home**, poi apri Erevos dalla schermata
   Home. Richiede iOS 17 o successivi.
2. In Erevos, apri **Impostazioni** → **Privacy e sicurezza** → **Questa web app** e confronta l’impronta della
   chiave di rilascio con quella che ti è stata data con l’indirizzo, carattere per carattere. Se è diversa, elimina
   l’app e dillo a chi ti ha dato l’indirizzo.
3. Imposta un blocco con password (in Erevos, **Impostazioni** → **Privacy e sicurezza** → **Blocco e seconda
   password**). Sul web conta più che mai: vedi più sotto.
4. Imposta il relay e aggiungi i contatti come sul telefono, vedi [Chat tramite un relay](#relay).

**Come si controlla da sé.** Una web app è codice che invia il server, quindi un server violato, o a cui viene
ordinato, potrebbe inviare codice modificato. Erevos non prende quel codice sulla fiducia:

- La prima volta che si apre, scarica il suo codice con un elenco di ogni file e della sua impronta, firmato con la
  chiave di rilascio, che ha solo la persona che fa le versioni; il server non ce l’ha. Controlla la firma e ogni file,
  li conserva sull’iPhone, e da quel momento esegue solo quelli. Il server non può cambiarli.
- Un aggiornamento viene preso solo se è firmato con la stessa chiave ed è più recente di quello in uso; parte la
  prossima volta che Erevos si apre. Uno non firmato o più vecchio viene rifiutato, ed Erevos lo dice.
- Chi vuole può controllare il server: \`node pwa/release.mjs verify https://<indirizzo>\` controlla la firma e ogni
  file che il server distribuisce, e \`scripts/reproduce-web.sh <versione> https://<indirizzo>\` ricompila quella
  versione dal suo codice sorgente e controlla che ogni file venga uguale.

**Che cosa resta.** Questi sono limiti reali; conoscili:

- **La prima volta** che lo apri, ti fidi del server: è lui che invia la parte che controlla. Il passo 2 è il modo per
  accorgerti di uno sbagliato.
- **La parte che controlla stessa** (il service worker) viene scaricata di nuovo da Safari almeno una volta al giorno,
  e Safari può sostituirla senza chiedere a Erevos. Erevos controlla allora quella nuova rispetto alla versione firmata
  e ti avvisa (**Erevos è stato manomesso**), ma un server che sa come fare potrebbe superare quel controllo. Se vedi
  l’avviso, non aprire più Erevos da quel server finché non viene spiegato. Con un blocco con password le tue chat
  restano sigillate.
- **Niente Bluetooth né collegamento da vicino** e niente SMS: Safari non li permette.
- **Solo mentre è aperto:** iOS ferma le web app in background, quindi i messaggi arrivano quando apri Erevos; fino ad
  allora aspettano sul relay.
- **Le chiamate** squillano mentre Erevos è aperto, con una suoneria sua: due squilli brevi ogni 3 secondi. Safari la
  lascia suonare solo dopo che hai toccato Erevos da quando si è aperto, e non con l’iPhone in silenzioso. Con Erevos
  chiuso una chiamata non squilla: compare solo la notifica «Chiamata», se le notifiche sono attive. Apple non permette
  niente di più a una web app; per squillare come un telefono servirebbe un’app dell’App Store.
- **Le notifiche** mentre Erevos è chiuso sono disattivate finché non le attivi: in Erevos, **Impostazioni** →
  **Notifiche** → **Notifiche ad app chiusa** → **Attiva** (iOS 16.4 o successivi, dalla schermata Home). Quando
  arrivano messaggi, o squilla una chiamata, il tuo relay invia un push tramite Apple, ed Erevos mostra quanti messaggi
  sono arrivati dall’ultima volta che l’hai aperto (**3 nuovi messaggi**), o **Chiamata** quando ha squillato solo una
  chiamata, nella lingua dell’app, niente di più. Il conteggio è crittografato per il tuo iPhone: Apple vede quando
  arriva qualcosa per il tuo iPhone, e che usa Erevos, mai che cosa o da chi. Con un relay o l’Erevos di un mittente
  precedente alla 2.0.0, o un messaggio che altri telefoni hanno portato al relay, non c’è nessun numero: Erevos mostra
  **Nuovo messaggio**, o **Nuovi messaggi** se ne sono arrivati altri, finché non lo apri. Sono per ogni spazio, mai per
  le chat nascoste, e il tuo relay deve essere configurato per inviarle. Arrivano anche per la coda di ogni contatto: il
  tuo relay ha allora un unico indirizzo push per tutte le code dei tuoi contatti, e Apple riceve un push per ogni
  contatto che ha scritto, a 15 secondi di distanza, quindi da una serie del genere può immaginare quanti hanno scritto
  insieme, mai chi. L’icona di Erevos nella schermata Home mostra allora anche un numero: i messaggi non letti nello
  spazio che avevi aperto, che restano una volta chiuso Erevos, e quelli arrivati dopo (ciò che è arrivato senza numero
  conta per uno), mai quelli di una chat nascosta. **Impostazioni** → **Notifiche** → **Numero sull’icona** lo
  disattiva. Le notifiche funzionano tramite il servizio push di Apple, quello di Google (Chrome, ed Edge su Android,
  Brave e Opera), quello di Mozilla (Firefox) e quello di Microsoft (Edge su Windows): un browser che ne usa un altro
  non può attivarle, a meno che chi gestisce il tuo relay non consenta il servizio push di quel browser. Gli spazi su
  relay diversi condividono le notifiche del browser: solo quello aperto per ultimo le riceve. Una richiesta di
  messaggio da qualcuno di nuovo, tramite il tuo link di contatto, potrebbe comparire solo quando Erevos si apre.
- **Autorizzazioni:** in Erevos, **Impostazioni** → **Generali** → **Autorizzazioni** mostra che cosa il browser
  permette a Erevos di fare: se funziona dalla schermata Home, le notifiche ad app chiusa (necessarie una volta che
  questo spazio le ha attivate), il microfono per le chiamate, la fotocamera per le videochiamate, e se il browser
  conserva per sempre i dati di Erevos. Senza questo, Safari potrebbe cancellare i dati quando l’iPhone ha poco spazio,
  quindi un backup è la rete di sicurezza. Ognuna ha il suo perché, e un pulsante con la domanda del browser stesso;
  dove il browser non chiede più, dice dov’è l’impostazione (**Impostazioni
  → Notifiche → Erevos**, o **Impostazioni → App → Safari → Microfono**). Legge solo quello che dice il browser. Un
  browser non lascia leggere a Erevos il risparmio energetico o la modalità Risparmio energetico, quindi non ci sono.
  Dopo ogni nuova versione firmata si apre da sola quando manca qualcosa di cui hanno bisogno i messaggi, le chiamate o
  i dati. In un altro browser (Chrome, Firefox) è lo stesso, con le impostazioni di quel browser.
- **I backup** si fanno a mano: **Crea un backup** salva il file tramite il menu di condivisione (File, iCloud Drive o
  un’altra app). Un browser consegna un file solo dopo un tocco, quindi non ci sono backup automatici.
- **I messaggi vocali** registrati su un iPhone sono AAC; si riproducono ovunque.
- **Apple** fa Safari e potrebbe cambiarlo, come con qualsiasi app su un iPhone.

## Su Sailfish OS {#sailfish}

Su un telefono Sailfish OS Erevos è un’app a sé: la stessa app del browser, mostrata dal motore del browser di Sailfish
dentro una finestra Sailfish, con il suo codice installato con l’app e non scaricato da un server. Chatta tramite un
relay, crittografato end-to-end come sul telefono, e conserva i suoi contatti, messaggi e impostazioni sigillati allo
stesso modo.

1. Consenti le app esterne al Jolla Store: **Impostazioni → Software non attendibile → Consenti software non
   attendibile**.
2. Copia \`erevos-sailfish-aarch64.rpm\` sul telefono (Downloads) e toccalo in **File**, poi **Installa**. Da un
   terminale (modalità sviluppatore) è \`pkcon install-local erevos-sailfish-aarch64.rpm\`. Richiede Sailfish OS 5
   nella sua versione a 64 bit (aarch64).
3. Imposta un blocco con password (in Erevos, **Impostazioni** → **Privacy e sicurezza** → **Blocco e seconda
   password**). Vedi più sotto perché qui conta.
4. Imposta il relay e aggiungi i contatti come sul telefono, vedi [Chat tramite un relay](#relay).

- **Quello che fa solo Android:** il collegamento da vicino (Bluetooth e Wi-Fi Aware), LoRa e gli SMS. Il resto è
  uguale: spazi e seconda password, chat nascoste, messaggi vocali, chat importate e backup.
- **Dove conserva le cose:** in \`~/.local/share/erevos\` sul telefono, sigillate come sul telefono. Sailfish non ha un
  portachiavi per le app, quindi l’archivio di chiavi è conservato lì così com’è, leggibile dal tuo utente, e quindi
  da qualsiasi app che gira come te: è il blocco con password che lo sigilla.
- **I backup** vanno in \`Documents/Erevos\` sul telefono, a mano o ogni giorno; copiali da lì su una scheda di
  memoria o su un altro dispositivo. **Salva** mette una foto o un file in Downloads.
- **Solo mentre è in funzione:** quando Erevos è chiuso, i messaggi aspettano sul relay finché non si apre.
- **Provato finora** sul motore del browser di Sailfish (Gecko 91) su un computer, chattando con un browser tramite un
  relay. Non ancora su un telefono Sailfish.

## Aggiornamenti {#updates}

Erevos chiede gli aggiornamenti a GitHub solo quando tocchi il pulsante, come in LPHL FASOULI: un controllo regolare
direbbe a GitHub, ogni giorno, che questo telefono o computer ha Erevos. Su Android ti dice anche quando esce una nuova
versione, senza chiedere a GitHub, come spiega **Avvisato quando esce una nuova versione** più sotto. Per aggiornare:

1. Apri **Impostazioni** → **Generali** → **Aggiornamenti** (o **Cerca aggiornamenti** in fondo alla prima schermata
   di questa guida).
   Mostra la versione che hai, come **Erevos 2.0.0**.
2. Tocca **Cerca aggiornamenti**. GitHub vede allora l’indirizzo internet di questo dispositivo, nient’altro; su
   Android lo vede anche il server della web app, che contiene la firma dell’aggiornamento fatta dal computer delle
   versioni. Mentre tutto nello
   spazio passa da Tor (**Tutto** in Tor), Erevos non controlla, perché aggirerebbe Tor.
3. Quando c’è una nuova versione: su Android tocca **Installa**. Si scarica, viene controllata rispetto alla versione
   pubblicata (la sua dimensione e lo SHA-256), e si apre il programma di installazione di Android: tocca lì
   **Installa**. Erevos la offre solo dopo che il computer delle versioni, che tiene la sua chiave offline, ha firmato
   quella build e il suo SHA-256: chi prendesse il controllo del solo account GitHub non potrebbe far installare un suo
   APK. Fino ad allora dice che la versione è uscita ma non è ancora firmata. Quando il server della web app non è
   raggiungibile lo dice, con il motivo, e quando la firma lì non corrisponde dice
   questo: in entrambi i casi non si installa nulla. La prima volta, Android chiede di consentire l’installazione
   di app da Erevos. Su un computer e su Sailfish OS, **Apri la pagina di download** apre la pagina delle versioni:
   prendi il file che Erevos indica, quello del pacchetto che hai, e aggiorna come nella tabella qui sotto.

Una versione come **4.0.0-rc.1** è una versione di prova prima della 4.0.0 (una release candidate): si installa e si
aggiorna come ogni altra, e la 4.0.0 arriva dopo.

### Novità {#whats-new}

**Impostazioni** → **Generali** → **Novità** (anche **Novità** in **Aggiornamenti**) dice in breve che cosa ha
cambiato ogni versione, dalla più recente, con il solo numero; la versione che hai dice **Questa versione**. Ogni
versione aggiunge la sua. Il CHANGELOG del codice sorgente racconta ogni modifica per intero.
Ogni versione, lì come qui, dice prima cosa cambia **Per te**, ciò che vedi e usi, poi cosa è cambiato **Sotto il
cofano**: correzioni, velocità, batteria e sicurezza all’interno.

### Avvisato quando esce una nuova versione {#release-notice}

Su Android, una volta al giorno, Erevos chiede al server di LPHL, che gestisce anche il relay, se è uscita una nuova
versione. Quando è uscita,
**Erevos** appare in cima alle chat, fissato, con la sua icona: **È uscito Erevos 3.3.0. Tocca per vedere le novità e
aggiornare.**, segnato finché non lo apri, e anche una notifica dice **Erevos 3.3.0 is out**. Tocca l’uno o l’altra
per **Aggiornamenti**, poi **Cerca aggiornamenti**. Se ne va appena hai quella versione.

- **Solo se firmata:** conta solo dopo che il computer delle versioni ha firmato sia la build sia il suo nome, la
  stessa firma che permette ad **Aggiornamenti** di installarla. Così arriva appena quella versione si può installare,
  e il server da solo non può inventarne una.
- **Solo sul relay di LPHL:** uno spazio chiede solo mentre usa il relay di LPHL e non manda tutto tramite Tor
  (**Tutto** in Tor): il server allora non vede nulla che non veda già. Uno spazio su un altro relay, o senza relay,
  non chiede nulla; lì te lo dice **Cerca aggiornamenti**.
- **Per disattivarlo:** **Impostazioni** → **Generali** → **Aggiornamenti** → **Avvisami quando esce una nuova
  versione**.
- Funziona dalla versione che ce l’ha: quella precedente non dice nulla. Non nella build di F-Droid, che aggiorna
  F-Droid.

**Perché:** così nessuno deve cercare su GitHub, una per una, ogni nuova versione, e GitHub non sa mai quali telefoni
hanno Erevos: il server interpellato è quello con cui il telefono parla già, e quello che dice conta solo con la firma
del computer delle versioni, tenuta offline.

Il resto di questa sezione riguarda l’aggiornamento a mano.

**Dove sono le nuove versioni:** nella pagina delle versioni di Erevos,
\`https://github.com/azzinder/erevos-releases/releases\`. La più recente è in cima, come **Erevos 2.0.0**, con un
file per ogni sistema. Lì restano le cinque più recenti.

**Controlla il file** se puoi, su un computer: ogni versione ha \`SHA256SUMS\`, e nella cartella con i file scaricati
\`sha256sum -c --ignore-missing SHA256SUMS\` deve dire **OK** per ognuno.

**Fai prima un backup** (**Impostazioni** → **Dati e dispositivi** → **Backup** → **Crea un backup**), vedi
[Backup](#backup). Un aggiornamento conserva tutto, ma un backup costa un minuto e copre ogni sorpresa.

| Su | Come aggiornare |
| --- | --- |
| **Android** | **Impostazioni** → **Generali** → **Aggiornamenti** → **Cerca aggiornamenti** → **Installa**, o a mano: apri la pagina delle versioni sul telefono, tocca \`erevos-android.apk\`, poi **Installa**. Si installa sopra quello che hai e conserva tutto. Consenti una volta l’installazione dal browser, quando Android lo chiede. |
| **Linux, basato su Arch** | \`sudo pacman -U erevos-linux-x86_64.pacman\` |
| **Linux, AppImage** | Sostituisci il vecchio \`erevos-linux-x86_64.AppImage\` con quello nuovo e rendilo eseguibile. |
| **macOS** | Apri \`erevos-macos.dmg\` e trascina Erevos in Applicazioni, **Sostituisci**. Poi consentilo di nuovo in **Impostazioni di Sistema → Privacy e sicurezza → Apri comunque**. |
| **Windows, installato** | Chiudi Erevos ed esegui il nuovo \`erevos-windows-x64-setup.exe\`: si installa sopra quello che hai. Windows potrebbe avvisare di nuovo: **Ulteriori informazioni**, poi **Esegui comunque**. |
| **Windows, portatile** | Chiudi Erevos e metti il nuovo \`erevos-windows-x64-portable.exe\` al posto di quello vecchio. |
| **Sailfish OS** | Tocca \`erevos-sailfish-aarch64.rpm\` in **File**, poi **Installa**, o \`pkcon install-local erevos-sailfish-aarch64.rpm\`. |
| **iPhone, browser** | Niente da fare: la web app prende da sola una nuova versione firmata quando si apre, vedi [Su iPhone](#iphone). |

- **Contatti, chat e impostazioni restano** su ogni sistema: vivono nella cartella di Erevos, non nell’app.
- **Android, la prima volta dalla pagina delle versioni:** un Erevos compilato su un computer per i test è firmato con
  un’altra chiave, e Android rifiuta di installarci sopra (**App non installata**). Fai un backup, disinstalla Erevos,
  installa quello della pagina delle versioni e ripristina il backup. Dopo di che, ogni aggiornamento si installa
  sopra.
- **Erevos da F-Droid**, quando ci sarà, viene aggiornato da F-Droid: i suoi **Aggiornamenti** mostrano la versione e
  lo dicono, senza **Cerca aggiornamenti**. F-Droid lo firma con una sua chiave, quindi Android non installa né questo
  sopra l’Erevos della pagina delle versioni né quello sopra questo. Per passare dall’uno all’altro: fai un backup,
  disinstalla Erevos, installa l’altro e ripristina il backup.
- **Mai più vecchio:** non installare una versione più vecchia sopra una più recente. I suoi dati potrebbero essere in
  una forma che quella più vecchia non sa leggere. Ripristina invece un backup fatto con quella versione più vecchia.
- **Una versione a cui manca il tuo sistema** lo dice nelle sue note: quella build non è riuscita, quindi prendi la
  versione precedente.

## Le schermate di test {#tests}

Due schermate in **Impostazioni** → **Per i test** servono a provare i collegamenti, passo per passo.

- **Test radio (Android):** **Autorizzazioni** chiede ad Android quello che serve alla radio, **Avvia** e **Ferma**
  accendono e spengono Bluetooth e Wi-Fi Aware, **Invia ciao** invia un semplice messaggio di prova al Test radio del
  telefono vicino (una chat non lo mostra), e il **Registro** mostra cosa è successo.
- **Test del relay (Wi-Fi):** **Crea coda** crea una coda su un relay e mostra due id. Dai l’**ID mittente** al
  telefono che ti scrive, e tieni privato l’**ID destinatario**. **Invia** e **Ricevi** spostano i messaggi a mano.

> Con un solo telefono puoi comunque provare una chat tramite il relay: le tue chat e le tue **Chat nascoste** hanno
> ognuna la sua coda sul relay e le sue chiavi. Crea entrambe le code sullo stesso relay, tocca **Condividi il mio link
> di contatto** in una e copialo, poi aggiungilo nell’altra, e scrivi in entrambe le direzioni. Il link della chat
> stessa viene rifiutato come contatto.

## Che cosa è protetto oggi {#privacy}

Erevos dice chiaramente che cosa protegge e che cosa non protegge, ancora.

| Che cosa | Oggi | In arrivo |
| --- | --- | --- |
| **Account, numero di telefono, email** | Non servono. I contatti sono coppie di code a senso unico sul relay. | |
| **Contatti e i loro nomi, chiavi, impostazioni del relay, aspetto** | Sigillati sul telefono con la chiave di ogni spazio. | |
| **Messaggi tramite un relay** | Crittografati end-to-end: PQXDH con ML-KEM-768 all’inizio, poi il double ratchet. Il relay non può leggerli, e appena entrambi i telefoni hanno ricevuto un messaggio l’uno dall’altro non può nemmeno distinguerli per conversazione: ognuno è sigillato un’altra volta per il telefono a cui va. Vede quali sono messaggi che qualcuno legge, quali sono comunicazioni tra telefoni, e quali sono chiamate che squillano, come dice ognuno. Non ancora sottoposti ad audit. | Un audit esterno. |
| **Messaggi a un telefono vicino** | Crittografati end-to-end, come tramite il relay. Chi ascolta da vicino può capire che dei telefoni con Erevos sono vicini tra loro, e quando e quanto inviano; sulla stessa rete Wi-Fi, può farlo chiunque vi sia collegato, e via Wi-Fi Direct chiunque entri nella rete Wi-Fi creata dai telefoni. Finché il telefono del tuo contatto non è noto, gli altri telefoni con Erevos collegati da vicino ricevono i tuoi messaggi brevi, sigillati. | |
| **Messaggi trasportati da altri telefoni** | Sigillati due volte: end-to-end per il tuo contatto, e per il suo relay. Un telefono che ne trasporta uno vede a quale relay va, quando, e quanto è grande; non da chi viene o per chi è. Il suo relay vede a quale relay va, e quel relay vede il relay di chi lo trasporta, non il suo telefono. Conservati sigillati sul telefono, al massimo tre giorni: quelli per altri in un file del telefono, la cui dimensione mostra più o meno quanti sono; i tuoi nel tuo spazio, sigillati con la sua chiave. Le chat nascoste non vengono mai trasportate. | |
| **Messaggi via LoRa** | Crittografati end-to-end, come tramite il relay. Chiunque abbia una radio, a chilometri di distanza, può capire che la tua trasmette, quando e quanto, e il suo segnale può essere seguito fino a dove si trova. Erevos impedisce alla tua radio di annunciare il suo nome e dove si trova (ruolo Client hidden, GPS spento, nessuna posizione fissa) a meno che tu non lo permetta; risponde comunque a una radio che chiede il suo nome. Ogni Erevos sulla mesh riceve i tuoi messaggi LoRa, sigillati. | Impostare il nome della radio da Erevos. |
| **Chi parla con chi** | Il relay vede gli indirizzi IP, gli id delle code, e quando e quanto. Con un secondo relay, il tuo relay non vede mai il tuo indirizzo. Da un posto prestato sul relay di un contatto, ogni relay a cui invii lo vede. [Tramite Tor](#tor), che trasporta i messaggi a meno che tu non lo cambi, nessun relay lo vede per quello che scrivi, e con **Tutto** anche per immagini e file; con i bridge, per dove Tor è bloccato, la rete vede solo un bridge. Il broker di Snowflake e i server STUN vedono il tuo indirizzo. | Tor su computer. |
| **La connessione al relay** | TLS e, al suo interno, una volta nota la chiave del relay, un canale verso quella chiave: il relay dimostra di averla a ogni connessione, e il token e ogni richiesta viaggiano crittografati per essa, così qualcuno nel mezzo con un certificato per il nome del relay non può spacciarsi per lui. Un relay che ha dimostrato la sua chiave una volta non viene mai più raggiunto senza di essa. Un relay più vecchio di questa app funziona come prima, e **Come ti colleghi ora** lo dice. La prima chiave arriva dal relay la prima volta che gli viene chiesta, o da un link di contatto: chi è nel mezzo proprio quella prima volta potrebbe darne una sua. [La chiave del relay](#relay). Non sottoposta ad audit. | La chiave del nostro relay integrata nell’app, e negli inviti. |
| **Testi tramite Nostr** | Crittografati end-to-end come tramite un relay, poi avvolti un’altra volta per una chiave che il tuo contatto ha dato solo a quella chat, firmati da una chiave creata solo per quel testo. I relay Nostr vedono quando e quanto è grande, e che una chiave che non nomina nessuno riceve un testo; il tuo telefono legge tutte le sue chiavi su un’unica connessione, tramite Tor, quindi un relay può capire che vengono lette insieme, mai da dove. Il tuo relay li vede solo come riserva, e un campanello per le chat nascoste. [Tramite Nostr](#nostr). | Immagini e messaggi vocali tramite Nostr. |
| **SMS** | Un SMS normale viene letto dall’operatore telefonico, come ogni SMS. A un numero collegato a un contatto Erevos passa invece da Erevos. Un invito nascosto è un SMS breve in più che l’operatore telefonico vede. | |
| **I contatti del telefono** | Nei contatti di Android stesso, non sigillati da Erevos, come con ogni app per i contatti: ogni app autorizzata a leggerli li vede, e un account (Google) può sincronizzarli. Erevos non li invia da nessuna parte. Un file .vcf salvato da questi è fuori da Erevos, non sigillato. Le chiamate e gli SMS di un contatto vengono letti dal registro chiamate e dagli SMS del telefono solo per mostrare la sua cronologia, e non vengono conservati da nessuna parte. | |
| **Contatti salvati solo in Erevos** | Sigillati con la chiave dello spazio, o con quella delle chat nascoste per i loro, in un unico file per tutti gli spazi la cui dimensione mostra più o meno quanti sono in tutto, non di chi sono; le loro foto ognuna in un file a sé. Mai nei contatti di Android. Un file .vcf salvato da questi, anche quelli delle chat nascoste, è fuori da Erevos, non crittografato. Le chiamate e gli SMS verso di loro passano dal telefono, e appaiono nel suo registro chiamate e nei suoi SMS. | |
| **Chiamate telefoniche** | Normali chiamate telefoniche: le trasporta l’operatore telefonico, che può ascoltarle, come con ogni app Telefono. Android conserva la cronologia delle chiamate, non sigillata da Erevos, come per ogni app Telefono; Erevos la legge, insieme ai preferiti, per mostrarli, ne elimina solo le chiamate che elimini tu, e non ne conserva una copia. La SIM scelta per ogni numero è sigillata nello spazio; le risposte rapide, e quello che è bloccato (solo prefissi, id dei gruppi e orari, uguali per ogni spazio), sono conservati sul telefono, non sigillati. | |
| **Chat importate** | Sigillate nello spazio in cui sono state portate, anche le loro foto e i loro file, ognuno nei suoi pezzi come il file di una chat. La dimensione del file, e quanti pezzi ci sono, dicono più o meno quanto è stato importato, non dove. | Foto e file di Viber, e file oltre 1 GB. |
| **Cronologia dei messaggi** | Conservata sul telefono, sigillata nel suo spazio, senza limiti, in pagine della stessa dimensione mescolate per tutti gli spazi. Si vede solo quanto occupa tutto insieme, non a quale spazio appartiene. L’eliminazione su entrambi i telefoni, e i messaggi effimeri, dipendono dall’Erevos dell’altro telefono. | |
| **Messaggi da vicino** | Si aprono solo nello spazio che ha il contatto. Uno per un altro spazio aspetta in memoria, al massimo sei ore, finché quello spazio non si apre. Le chat nascoste non usano mai il collegamento da vicino. | Chat nascoste da vicino. |
| **Messaggi vocali** | Crittografati end-to-end tramite il relay o da vicino, in pezzi: il relay, o chi ascolta da vicino, può capire più o meno quanto dura ognuno. Ogni suono è sigillato in un file a sé; quanti file ci sono, e le loro dimensioni, mostrano più o meno quanti ne sono conservati, non in quale spazio. Dissigillati nella cache solo durante la riproduzione. | File audio tutti della stessa dimensione. |
| **Foto e file** | Crittografati end-to-end, tramite l’archivio di file del relay, in pezzi della stessa dimensione: il relay vede quanti e quando, quindi più o meno quanto sono grandi. Il tuo relay vede il tuo indirizzo, come per i messaggi; il contatto li prende tramite il suo relay. Le foto perdono luogo, telefono e ora, a meno che non vengano inviate come file; un file conserva quello che dice al suo interno. Sigillati sul telefono nei loro pezzi, mostrati dalla memoria. Le copie salvate sono fuori da Erevos. Non ancora nei backup. | Backup che li contengano. |
| **Su un computer** | Sigillato come sul telefono, nella cartella dell’app. Il suo archivio di chiavi è sigillato con il portachiavi del sistema (su Windows, la chiave del tuo account); su un sistema Linux senza portachiavi, Erevos non conserva nulla a meno che non venga avviato con \`--plain-secrets\`, e allora lo conserva così com’è. | |
| **Backup** | Un unico file sigillato con una sua password, che contiene ogni spazio così come è sigillato sul telefono. Il suo nome dice che è un backup di Erevos, e la sua dimensione mostra più o meno quanto viene conservato. I backup automatici conservano la loro password sul telefono. Inviato a un server solo se ne aggiungi uno: byte casuali con un nome casuale, di una dimensione arrotondata; il server vede il tuo account, il tuo indirizzo e quando. | Backup su un server tramite Tor. |
| **Segni ✓✓ e ✓✓✓** | Il telefono del contatto sa quando il tuo ha ricevuto e letto i suoi messaggi, in modo crittografato. Il relay, o chi ascolta da vicino, vede un piccolo messaggio in più. | Un interruttore per non dire più quando leggi. |
| **Impronta o volto (Android)** | Disattivato finché non lo attivi. Apre solo lo spazio della prima password: la sua chiave è sigillata nell’Android Keystore, utilizzabile solo subito dopo un controllo forte dell’impronta o del volto, e scartata quando questi cambiano. Qualcuno che ti trattiene può usare il tuo dito. | |
| **Notifiche (Android)** | In background: «Erevos – Ready for calls and messages» (non sulla schermata di blocco), «Incoming call» o «Incoming video call» – «Open Erevos to answer», e «New message» o quanti ne sono arrivati; quando Android o la password lo fermano, «Closed by Android» o «Locked» – «Open it to receive calls and messages again»; un promemoria, «Reminder» o quanti; una nuova versione, «Erevos X is out». Mai chi o cosa. A telefono bloccato quella dei messaggi dice solo «Erevos». Le chat nascoste a cui è permesso dirlo mostrano la stessa notifica, contata con il resto: chi la vede e non trova niente di nuovo può immaginare che ce ne siano altre. Come app Telefono, la notifica di una chiamata telefonica dice chi chiama, anche sulla schermata di blocco, come fa quella di ogni app Telefono, ma mai con un nome che conoscono solo le chat nascoste: una chiamata da uno dei loro contatti mostra il numero. | |
| **Widget e Telefono (Android)** | Il widget, una volta aggiunto, mostra quante chiamate perse, SMS non letti e nuovi messaggi ci sono, mai chi o cosa. Il Telefono si apre senza password solo se lo permetti: allora chiunque abbia in mano il telefono sbloccato vede le chiamate e i preferiti che Android conserva, con i soli nomi dei contatti del telefono. | |
| **Chiamate** | Crittografate end-to-end (DTLS-SRTP, con la chiave inviata nella chat crittografata). Tramite il relay per le chiamate, nessuno dei due telefoni vede l’indirizzo IP dell’altro; il server che lo fa funzionare li vede entrambi, quando e per quanto tempo, e quanto passa. Senza un relay per le chiamate, solo sulla stessa rete Wi-Fi, ogni telefono vede l’indirizzo dell’altro. I relay vedono quando una chiamata inizia a squillare. | Squillo su computer e nella web app da chiusi. Chiamate via Bluetooth (lì funziona il walkie-talkie). |
| **Chat di gruppo** | Crittografate end-to-end con MLS (RFC 9420); i membri rimossi non leggono più nulla dopo. La copia di ogni membro è sigillata a parte, quindi i relay non possono capire chi fa parte di un gruppo; ogni relay vede comunque un messaggio arrivare a una coda. I membri vedono le chiavi e gli indirizzi dei relay gli uni degli altri. Foto, file e messaggi vocali passano dall’archivio di file del relay di chi invia, come verso un contatto, e restano lì 14 giorni. Non sottoposte ad audit. | |
| **Chiamate di gruppo** | Voce e video, crittografati end-to-end tra ogni coppia di telefoni nella chiamata (DTLS-SRTP, con le chiavi inviate nella crittografia del gruppo). Tramite il relay per le chiamate, nessun telefono vede l’indirizzo IP di un altro; il server che lo fa funzionare vede quello di ogni telefono, quando e per quanto tempo, e quanto passa. Ogni membro, nella chiamata o no, sa chi ne fa parte. I relay vedono quando ne inizia una. | Video con più di quattro persone, tramite un server; più di otto persone. |
| **Gruppi pubblici** | Come le chat di gruppo, e chiunque abbia il link può chiedere di entrare e leggere da quando viene fatto entrare. Le richieste arrivano al relay del proprietario sigillate per il telefono del proprietario: il relay vede quante e quando, non da chi. I membri vedono gli uni degli altri i nomi scelti, le chiavi create solo per quel gruppo, gli indirizzi dei relay e gli ID mittente delle code. Non sottoposti ad audit. | |
| **Anteprime dei link** | Disattivate finché non le attivi. Allora, mentre invii un link, il tuo telefono scarica la sua pagina direttamente dal sito, che vede il tuo indirizzo IP e quando, non per chi è il messaggio. L’anteprima va dentro il messaggio crittografato; il telefono che la riceve non scarica nulla. Nessuna mentre lo spazio passa da Tor; nelle chat nascoste solo con l’interruttore del loro posto. | Anteprime tramite Tor. |

## Trasparenza {#transparency}

Che cosa conserva il server dietro Erevos (lphl.nekten.eu), e che cosa gli è stato chiesto. Questa pagina esce
dentro ogni versione, quindi è firmata con la versione, come l’app.

**Richieste delle autorità.** Alla data di questa versione: nessuna. Nessuna autorità, tribunale o azienda ha chiesto
dati su chi usa Erevos, e a nessuno è stato chiesto di tacere su una richiesta del genere. Se un giorno questo
paragrafo sparisce, o non dice più «nessuna», prendilo come un segnale. **Perché:** una richiesta che arriva con
l’ordine di tacere non si può raccontare, ma una frase che smette di essere scritta si può notare. Funziona solo finché
viene rinnovata: ogni versione la ripete.

Che cosa conserva il relay, e per quanto tempo:

| Che cosa | Per quanto tempo |
| --- | --- |
| **Messaggi in attesa**, crittografati end-to-end | Finché non vengono presi, al massimo 14 giorni. |
| **Foto e file**, crittografati, in pezzi | Come i messaggi: finché non vengono presi, al massimo 14 giorni. |
| **Messaggi inviati per dopo**, crittografati | Finché non arriva la loro ora. |
| **Code**, id casuali senza nome | Finché il loro telefono non le ha usate per 180 giorni. |
| **Righe di accesso**: per ogni telefono, lo SHA-256 del suo token e un nome: quello scritto da chi l’ha invitato, o il nome utente LPHL per chi ha fatto l’accesso con LPHL | Finché la riga non viene tolta, o se ne va la riga che l’ha invitato. |
| **Indirizzi push della web app**, per le notifiche mentre la web app è chiusa | Finché non vengono disattivati nella web app. |

Che cosa non conserva:

- **Nessun elenco delle connessioni.** Il relay non scrive nessun log di chi si è collegato o quando, e il server web
  davanti al relay e alla web app non tiene nessun log degli accessi dal 24 ottobre 2026. Gli errori vengono
  registrati, e un errore può nominare un indirizzo.
- **Nessun contatto, nome o numero di telefono.** Non ne ha nessuno da conservare.

Che cosa vede comunque mentre è in funzione: gli indirizzi IP che si collegano, quando i messaggi arrivano e partono, e
quanto sono grandi, come dice [Che cosa è protetto oggi](#privacy). Durante una chiamata tramite il relay per le
chiamate, gli indirizzi IP dei telefoni che vi partecipano.

**Copie.** La cartella del relay viene copiata in un backup ogni giorno, con i messaggi in attesa ancora crittografati
end-to-end. Le copie contengono quello che elenca la tabella qui sopra, per tutto il tempo in cui vengono conservate.

**Altri che vedono qualcosa:** la società di hosting (Hetzner), che gestisce la macchina e la sua rete; l’accesso di
LPHL (Authentik), che vede ogni accesso con LPHL; e per la web app con le notifiche ad app chiusa, il servizio push
del browser (Apple, Google o Mozilla), che vede che è arrivata una notifica, mai che cosa.

## Cosa arriverà {#coming}

La crittografia end-to-end c’è già, tramite il relay e tramite il collegamento da vicino, e la maggior parte di quello
che segue si basa su di essa.

- **Più modi per restare in contatto:** i bridge di Tor per dove Tor è bloccato ci sono già, vedi [Tramite
  Tor](#tor). Prossimo passo: Tor su computer.
  - **Radio LoRa (Meshtastic):** ci sono già, vedi [Con una radio LoRa](#lora). Prossimo passo: impostare il nome
    della radio da Erevos.
  - **SMS:** Erevos come app per gli SMS c’è già, con le foto MMS, gli MMS di gruppo e due SIM, vedi [SMS](#sms).
  - **Telefono:** Erevos come app Telefono c’è già, con la sua schermata di chiamata, vedi [Telefono](#phone).
  - **Email, codici QR, USB, NFC:** per quando nient’altro riesce a passare.
- **Chiamate:** le chiamate vocali e le videochiamate ci sono già, e su Android squillano in background, vedi [Chat
  tramite un relay](#relay), e c’è anche un walkie-talkie che funziona perfino via Bluetooth.
- **Gruppi:** le chat di gruppo, con foto, file e messaggi vocali, e le chiamate vocali e video di gruppo ci sono già,
  vedi [Chat di gruppo](#groups). Prossimo passo: video con più di quattro persone, tramite un server su cui la
  chiamata si sposta da sola, sempre crittografata end-to-end.
- **Portare le tue chat:** Telegram e WhatsApp entrano già, con le loro foto e i loro file, e Viber con le sue parole,
  vedi [Chat importate](#import). Prossimo passo: le foto e i file di Viber.
- **Più sistemi:** gruppi pubblici e chiamate di gruppo anche sui dispositivi collegati; l’account, le sue chiamate e
  i suoi gruppi sono già su computer, vedi [Dispositivi collegati](#devices). Linux, macOS e Windows ci sono già, vedi
  [Su un computer](#desktop), l’iPhone dal browser, vedi [Su iPhone](#iphone), e Sailfish OS, vedi
  [Su Sailfish OS](#sailfish); e ci sono anche i backup, vedi [Backup](#backup).

## Domande {#faq}

### Ho dimenticato la mia password.

Non c’è modo di recuperarla. Erevos non conserva niente che possa aprire i tuoi dati senza di essa. Solo se lo sblocco
con [impronta o volto](#lock) è attivo apre ancora il primo spazio: imposta lì una nuova password con
**Cambia password**.

### Un contatto vicino non appare mai come «Vicino».

- Scrivigli: i telefoni capiscono chi è chi dal primo messaggio che
  arriva da vicino. Vengono trovati solo i contatti, quindi prima aggiungetevi a vicenda.
- Tieni uno spazio aperto su entrambi i telefoni: Erevos sullo schermo, o in background con **In background** su
  **Ricevi e squilla**.
- Controlla che il Bluetooth sia acceso (e, su Android 12 e precedenti, la posizione), e che Erevos possa trovare i
  dispositivi vicini (impostazioni di Android → App → Erevos → Autorizzazioni).
- Avvicina i telefoni. Se uno dei due non ha Wi-Fi Aware, si incontrano via Bluetooth, che è più lento ad avviarsi.
- Oppure collega entrambi a una stessa rete Wi-Fi, o all’hotspot di un telefono, con **Trova Erevos sulla stessa rete
  Wi-Fi** attivo. Alcune reti Wi-Fi pubbliche tengono separati i dispositivi collegati: lì non può funzionare. Senza
  una rete Wi-Fi in comune, **Crea una rete Wi-Fi con i telefoni vicini** permette loro di crearne una (Android 10 e
  successivi); dagli fino a un minuto o due.

### Via LoRa non arriva niente.

- Entrambe le radio hanno bisogno della stessa regione e dello stesso primo canale (il suo nome e la sua chiave)
  nell’app Meshtastic, e di essere a portata l’una dell’altra, o di radio che stanno in mezzo.
- **Radio LoRa**, in **Impostazioni** → **Relay e reti**, deve dire **Collegato**. Se non lo dice, chiudi l’app
  Meshtastic: una radio si collega a un’app alla volta.
- Partono solo i testi, e solo quando il relay non è raggiungibile e nessun telefono è vicino.
- Nell’UE una radio può trasmettere solo un certo tanto ogni ora: dopo molti messaggi, aspetta.

### Un codice di contatto non è stato aggiunto.

Un contatto su un altro relay ha bisogno di un link con la chiave di quel relay, che hanno i link di un Erevos
aggiornato: la riga sotto la chat nomina quel relay. Un codice di un Erevos più vecchio non ha chiavi e viene
rifiutato: chiedine uno nuovo.

### Il relay può leggere i miei messaggi?

No. I messaggi tramite un relay sono crittografati end-to-end, e solo i due telefoni hanno le chiavi. Il relay vede
comunque quali code vengono usate, e quando e quanto arriva ([Gestire un relay tuo](#own-relay)). Confronta il codice
di sicurezza, come in [Chat tramite un relay](#relay), per essere sicuro che nessuno sia nel mezzo. Niente è stato
ancora sottoposto ad audit.

### Perché Erevos non chiede il mio numero di telefono?

Perché niente ne ha bisogno. Ogni contatto è una coppia di code a senso unico sul relay, quindi nessun server ha un
elenco di chi conosce chi.

### Funziona su iPhone o su un computer?

Su un computer, sì: Linux, macOS e Windows, vedi [Su un computer](#desktop).
Su iPhone, sì, dal browser, come web app, vedi [Su iPhone](#iphone).
`;
