/** The user guide in German. Its format: lib/guide.ts. The same sections, in the same order and shape, as the English one. */
export const guide = `
## Was Erevos ist {#about}

Erevos ist ein Messenger, der für die Privatsphäre gemacht ist. Du brauchst kein Konto, keine Telefonnummer und keine
E-Mail-Adresse, um ihn zu nutzen, und er soll überall funktionieren, wo du bist: über ein Telefon in der Nähe ganz
ohne Netz, über WLAN oder über das Internet.

- **In der Nähe, ohne Internet:** Zwei Android-Telefone sprechen direkt über Bluetooth, Wi-Fi Aware oder Wi-Fi Direct
  miteinander, Ende-zu-Ende-verschlüsselt, und Telefone und Computer im selben WLAN oder im Hotspot eines Telefons
  ebenso. Mit einem LoRa-Funkgerät gehen Texte kilometerweit.
- **Über ein Relay:** über WLAN oder das Internet, über einen kleinen Server (ein Relay), den du selbst betreiben kannst.
- **Bereiche:** eine Passwortsperre, ein zweites Passwort, das ein separates, leeres Erevos öffnet, und versteckte Chats
  in jedem Bereich.
- **Darstellung:** die Looks von LPHL: Classic, Modernist und Nocturne, zwölf Paletten und Glas wie auf lphl.nekten.eu.

> Nachrichten sind **Ende-zu-Ende-verschlüsselt**, über ein Relay und in der Nähe gleichermaßen, aber nichts davon
> wurde bisher von unabhängigen Fachleuten geprüft. [Was heute geschützt ist](#privacy) sagt genau, was geschützt ist
> und was nicht.

Diese Anleitung öffnet sich über **Anleitung** im Menü des Startbildschirms (die drei Punkte oben). Die Suche oben
darin findet jedes Wort in ihr. Die Anleitung gibt es in jeder Sprache der App, und sie erscheint in der, die du
gewählt hast, siehe [Sprache](#start).

### Wer es macht, und warum

- **Wer:** Erevos wird von derselben Person gemacht, die FASOULI gemacht hat.
- **Wo:** Das spielt keine Rolle. Was zählt, ist, dass das Relay und die App für den Browser auf dem eigenen Server
  dieser Person laufen (lphl.nekten.eu).
- **Für wen:** für alle, die mit ihren Leuten reden wollen, ohne eine Telefonnummer, eine E-Mail-Adresse oder ein Konto
  anzugeben: Freunde, Familien, Gruppen und Menschen, die dort leben, wo das Internet abgeschaltet oder überwacht wird.
  Und für alle, die nichts zu verbergen haben und trotzdem ihren persönlichen Raum privat halten wollen, fern von
  neugierigen Blicken.
- **Warum:** weil die bekannten Apps nach einer Telefonnummer fragen, wissen, wer mit wem redet, und aufhören, wenn das
  Internet ausfällt. Weil uns die „Nutzungsbedingungen“ einiger von ihnen nicht schützen und wir Zweifel haben, wie sie
  unsere Privatsphäre schützen. Weil anderen Funktionen fehlen, die wir brauchen. Erevos verlangt nichts und findet
  einen Weg über das, was gerade da ist: das Internet, WLAN, Bluetooth, ein Telefon in der Nähe.
- **Wer zahlt:** niemand: keine Werbung, keine Investoren, keine Datensammlung. Wer möchte, kann bei den laufenden
  Kosten helfen, etwa für den Server: **Einstellungen** → **Allgemein** → **Erevos unterstützen** zeigt die Wege,
  Liberapay, PayPal, Monero und Bitcoin. Ob du gibst oder nicht, ändert nichts an der App.
  **Warum:** Jeder Weg öffnet sich außerhalb von Erevos, im Browser oder in einer Wallet, und nur, wenn du darauf
  tippst, also sendet Erevos selbst nichts und erfährt nie, wer gegeben hat. PayPal weiß, wer gibt; Monero zeigt weder,
  wer gegeben hat, noch wie viel; Bitcoin zeigt keine Namen, aber was die Adresse erhalten hat, ist öffentlich.

Dieser Teil öffnet sich auch über **Einstellungen** → **Allgemein** → **Über Erevos**.

## Erste Schritte {#start}

Erevos lädst du von seiner Release-Seite herunter, eine Datei für jedes System: Wo, und wie du es aktualisierst, steht
unter [Updates](#updates). Es läuft auf Android, auf einem Computer (Linux, macOS und Windows), unter Sailfish OS und,
im Browser, auf einem iPhone. Wenn du neu bist, beginne mit einer Einladung von jemandem, der es nutzt: ein QR-Code
oder Link, und du bist drin, mit dieser Person als Kontakt (siehe „Jemand Neues einladen“ unter
[Chat über ein Relay](#relay)).

Der Startbildschirm ist die Liste deiner Chats, der zuletzt bewegte oben. Jeder zeigt das Bild des Kontakts, die
letzte Nachricht mit ihren Zeichen, wann sie kam und wie viele seiner Nachrichten du noch nicht gelesen hast. Eine
Uhr daneben bedeutet, dass seine Nachrichten verschwinden. **Chats durchsuchen** findet einen Chat über seinen Namen
oder seine letzte Nachricht und, unter den Chats, die Nachrichten, die das Eingegebene enthalten, in allen Chats des
Bereichs: Tippe auf eine, um ihren Chat an dieser Stelle zu öffnen. In einem Chat haben seine Details
**In diesem Chat suchen**: ▲ und ▼ gehen zu früheren und späteren Treffern. Beide suchen nur auf diesem Telefon: in
dem, was es versiegelt aufbewahrt, und **In diesem Chat suchen** auch in den SMS, die der Chat eines Kontakts zeigt;
versteckte Chats werden nur von innen durchsucht. Ein langer Chat öffnet sich bei seinen neuesten 100 Nachrichten, und
frühere, darunter die aus Telegram oder WhatsApp importierten, kommen von selbst, während du nach oben scrollst
(**Frühere Nachrichten zeigen**, über ihnen, holt sie auch); wenn du zu einer früheren springst (aus der Suche, einer
markierten Nachricht oder der, auf die eine Nachricht antwortet), wird sie ebenfalls geholt.
Ein wenig nach oben gescrollt, erscheinen unten rechts zwei runde Pfeile, in einem Chat, einer Gruppe und einer
SMS-Unterhaltung gleichermaßen: Der obere geht zum Anfang des Chats, der untere zurück zu seinem Ende. Vom Anfang aus
holt **Spätere Nachrichten zeigen**, unter dem Angezeigten, weitere; eine Nachricht schreiben oder der untere Pfeil
führt zurück zum Ende.

**Warum:** Ein langer Chat öffnet sich bei seinen neuesten Nachrichten, damit er sofort aufgeht: Alles auf einmal zu
zeichnen wäre langsam, vor allem auf älteren Telefonen. Versteckte Chats sind von der Suche des Startbildschirms
ausgenommen, damit der Startbildschirm gleich aussieht, ob ein Bereich welche hat oder nicht: Ihre Nachrichten lassen
sich nur lesen, solange ihre PIN sie geöffnet hat.

- **Das Bild** wird aus dem Schlüssel des Kontakts gezeichnet: Derselbe Schlüssel ergibt immer dieselben Farben und
  denselben Mond (in Grüntönen unter Matrix), sodass du einen Chat auf einen Blick erkennst, ohne Foto. Es ist keine
  Prüfung des Schlüssels; das ist die [Sicherheitsnummer](#relay).
- **Die Zeile unter der Suche** sagt, ob ein Relay eingestellt und deine Warteschlange bereit ist. Tippe darauf, um
  eines einzurichten.
- **Chat mit mir selbst**, immer als erster in den Chats, mit einer Nadel, enthält deine Notizen an dich selbst: siehe
  „Chat mit mir selbst und Erinnerungen“ weiter unten.
- **Matrix-Chats** stehen, sobald du dich bei Matrix anmeldest, mit den anderen in der Liste, die neuesten zuerst,
  jeder mit **Matrix** markiert, und eine Einladung steht oben. Der Chip **Matrix** zeigt nur sie, und dort beginnt
  **Neuer Chat** einen Matrix-Chat: siehe [Matrix](#matrix).
- **XMPP-Chats** stehen, sobald du dich bei XMPP anmeldest, auf dieselbe Weise in der Liste, jeder mit **XMPP**
  markiert, und wer dich hinzufügen möchte, steht oben. Der Chip **XMPP** zeigt nur sie, und dort beginnt **Neuer
  Chat** einen XMPP-Chat: siehe [XMPP](#xmpp).
- **Neuer Chat**, unten, öffnet die Relay-Einstellungen und das Hinzufügen eines Kontakts. **Erinnern**, die orange
  Glocke daneben, schreibt eine Erinnerung für dich.
- **Der grüne Hörer und die violette Person** oben, auf Android, öffnen direkt **Telefon** und **Kontakte**, in den
  Farben ihrer Symbole auf dem Startbildschirm des Telefons. Im Menü unter den drei Punkten sind sie nicht noch einmal.
- **Alle**, **SMS** und **Erevos**, über den Chats, sobald es auch SMS-Unterhaltungen gibt, zeigen alle, nur die SMS
  (mit den Chats, deren letzte Nachricht eine SMS war) oder nur die Erevos-Chats, bei jedem Kontakt das, was zuletzt
  kam.
- **Das Widget**, auf Android: Füge Erevos aus den Widgets deines Startbildschirms hinzu. Seine vier Tasten öffnen
  **Telefon**, die **SMS**, die Erevos-**Nachrichten** und **Kontakte**, nach dem Passwort wie jeder Link (das Telefon
  ohne, wenn du es erlaubst). Über den ersten drei zeigt es, wie viele verpasste Anrufe, ungelesene SMS und neue
  Nachrichten es gibt, nie wer oder was; bei verpassten Anrufen öffnet sich **Telefon** in der **Anrufliste**. Eine
  erneut angetippte Taste zeigt ihren Bildschirm wieder, auch nachdem du dort einen anderen Tab gewählt hast. Seine
  Wörter folgen der Sprache von Erevos. **Einstellungen** → **Darstellung** → **Widget** legt die Reihenfolge seiner
  Tasten fest.
- **Das orange Schloss** oben sperrt Erevos sofort, wenn ein Passwort festgelegt ist, oder öffnet sonst die
  Sperreinstellungen.
- **Die drei Punkte** öffnen den Rest:

| Im Menü | Was es öffnet |
| --- | --- |
| **Neue Gruppe** | Einen Gruppenchat mit deinen Kontakten. Siehe [Gruppenchats](#groups). |
| **Öffentliche Gruppen** | Eine Gruppe, um deren Beitritt jeder mit ihrem Link bitten kann, mit einem Inhaber und Admins. Siehe [Öffentliche Gruppen](#public-groups). |
| **Markierte Nachrichten** | Die Nachrichten, die du mit einem Stern markiert hast, in all deinen Chats. Siehe „Das Menü einer Nachricht“ unter „Chat über ein Relay“. |
| **Telefone in der Nähe** | Deine Kontakte über Bluetooth und Wi-Fi Aware oder im selben WLAN, ohne Internet. Siehe [Chat mit einem Telefon in der Nähe](#nearby). |
| **Anleitung** | Diese Anleitung. |
| **Einstellungen · Settings** | Die letzte Zeile, mit einem Zahnrad: alles, was du einstellen kannst, in Gruppen, mit einer Suche. Siehe „Einstellungen“ weiter unten. |

In einem Chat stehen oben sein Name und sein Bild, zusammen mit dem Weg, den er nimmt: **Verschlüsselt** (Ende zu
Ende), **Online**, **In der Nähe**, solange das Telefon des Kontakts per Funk mit deinem verbunden ist, oder
**schreibt…**, mit einer Stoppuhr, wenn die Nachrichten des Chats verschwinden. Daneben startet die blaue Kachel mit
einer Kamera einen Videoanruf und die grüne mit einem Hörer einen Sprachanruf. Tippe auf den Namen oder auf **⋯**
dahinter (**⋮** auf Android), um die **Details** des Chats zu öffnen: sein Bild (tippe darauf, um es zu ändern),
**Anrufen**, **Video**, **Umbenennen** und **Bild**, dann **Verschwindende Nachrichten**, **Offline erscheinen**,
**Chat-Aussehen**, die **Sicherheitsnummer**, **In versteckte Chats verschieben** und **Nachrichten löschen**.
**Fertig** schließt sie.

**Medien, Links und Dateien**, in den Details unter **In diesem Chat suchen**, listet auf, was der Chat enthält, jede
Art unter einem eigenen Tab mit ihrer Anzahl: **Fotos** (in einem Raster), **Videos**, **Sprachnachrichten**,
**Musik**, **Dateien** und **Links**, die neuesten zuerst unter ihren Monaten, auch die aus Telegram oder WhatsApp
importierten. Ein Tippen öffnet ein Foto oder eine Datei zum Ansehen oder Speichern, spielt einen Ton direkt dort ab
oder öffnet einen Link nach einer Rückfrage; gedrückt gehalten bietet jedes **Im Chat zeigen**, was zu seiner
Nachricht führt. Eines, das noch nicht vom Relay geholt wurde, wird im Chat angesteuert, wo ein Tippen es holt. Der
Kalender oben springt zu einem Tag: Die Tage, an denen es etwas von dieser Art gibt, sind markiert. **Zu einem Tag**,
darunter in den Details, macht dasselbe für den Chat selbst: Es springt zur ersten Nachricht dieses Tages.

**Warum:** Die Listen entstehen auf diesem Telefon aus dem, was es ohnehin aufbewahrt, also erfährt kein Server, was
ein Chat enthält; und nur die Fotos auf dem Bildschirm werden gelesen, wie im Chat, sodass ein Chat mit Tausenden davon
so schnell aufgeht wie einer ohne.

Eine gute erste Stunde:

1. Öffne **Einstellungen** → **Datenschutz und Sicherheit** → **Sperre und zweites Passwort** und lege ein Passwort
   fest, damit niemand, der das Telefon in die Hand nimmt, Erevos öffnen kann.
2. Öffne **Telefone in der Nähe** im Menü auf zwei Telefonen, die nah beieinander sind, und erlaube, worum Android
   bittet.
3. Fügt euch gegenseitig mit **Meinen QR-Code zeigen** hinzu, wie in [Chat mit einem Telefon in der Nähe](#nearby), und
   sende eine Nachricht: Sie geht in der Nähe, Ende-zu-Ende-verschlüsselt, ohne Relay und ohne Internet.
4. Um aus größerer Entfernung zu reden, richte ein Relay ein, wie in [Chat über ein Relay](#relay).

### Chat mit mir selbst und Erinnerungen

**Chat mit mir selbst** steht immer oben in den Chats, mit einer Nadel, in jedem Bereich. Es ist ein Chat, in dem
sonst niemand ist: Schreib dir Notizen, Links, Fotos, Dateien und Sprachnachrichten, wie in jedem Chat. Nichts darin
geht irgendwohin: Er bleibt auf diesem Telefon, verschlüsselt im Bereich, und wird nicht an deine verknüpften Geräte
weitergegeben. Ein Backup nimmt seine Notizen und Sprachnachrichten mit, aber nicht seine Fotos und Dateien, wie bei
Chats.

- **Eine Erinnerung:** Tippe auf **Erinnern** (die orange Glocke neben **Neuer Chat**), schreib, woran du erinnert
  werden willst, wähle eine Zeit (**In 1 Stunde**, **Heute Abend 20:00**, **Morgen 09:00** oder einen beliebigen Tag,
  eine Stunde und Minute) und tippe auf **Erinnern**. Sie landet in „Chat mit mir selbst“, mit einer Glocke und ihrer
  Zeit. Im Chat gibt **+** → **Erinnern**, oder das Gedrückthalten des Sendepfeils, auch der Notiz, die du schreibst,
  eine Zeit.
- **Zu ihrer Zeit** zeigt das Telefon auf Android eine Benachrichtigung, **Reminder** (oder **3 reminders**) –
  „Open Chat with myself to read it“, nie den Text der Erinnerung, auch wenn Erevos geschlossen und gesperrt ist;
  angetippt öffnet sie „Chat mit mir selbst“, nach dem Passwort. Bis du den Chat öffnest, erscheint die Erinnerung in
  seiner Zeile oben in den Chats, mit einer Zahl, und im Chat mit einem farbigen Rand; dort gesehen, verschwindet sie
  auch aus der Benachrichtigung. Auf einem Computer, in der Web-App oder mit ausgeschalteten Benachrichtigungen siehst
  du sie dort. Sind **Genaue Uhrzeiten** nicht erlaubt (**Einstellungen** → **Allgemein** → **Berechtigungen**), zeigt
  Android sie vielleicht ein paar Minuten zu spät.
- **Eine Notiz gedrückt halten** bietet **Kopieren**, **Öffnen** (ein Foto oder eine Datei), **Erinnern** oder
  **Erinnerung ändern** und **Keine Erinnerung**, sowie **Löschen**.
- Jeder Bereich hat seinen eigenen „Chat mit mir selbst“, und ebenso jeder Platz versteckter Chats, oben in ihrer
  Liste (siehe [Versteckte Chats](#hidden)). Die Erinnerungen eines versteckten Platzes erscheinen dort, sobald seine
  PIN ihn öffnet; das Telefon meldet sie zu ihrer Zeit nur, solange **Empfangen, wenn geschlossen** für diesen Platz
  an ist, in derselben Benachrichtigung. Eine neue PIN für den Platz, die ihn leer beginnt, oder das Entfernen des
  Platzes nimmt seine Erinnerungen vom Telefon.

**Warum:** Eine Benachrichtigung erscheint auf dem Sperrbildschirm für jeden, der das Telefon in der Hand hat, also
bleibt der Text einer Erinnerung verschlüsselt in ihrem Bereich, und Android erfährt nur ihre Zeit: Die
Benachrichtigung kann niemandem sagen, woran du dich erinnern wolltest, noch in welchem Bereich sie ist. Und die
Notizen gehen an niemanden, nicht einmal an deine anderen Geräte, also trägt kein Relay sie je.

### Mit Wischgesten navigieren

- **Zurück:** Wische irgendwo auf einem Bildschirm nach rechts, um zurückzugehen, wie es der Zurück-Pfeil tut. Links
  kommt ein runder Pfeil heraus; lass los, sobald er ganz ist, oder wische schnell, und du bist zurück. Lässt du früher
  los, bleibst du. In einem Chat macht es, was sein Zurück-Pfeil macht: zurück zur Liste der Chats, oder aus den
  versteckten Chats heraus, wobei sie geschlossen werden. In den **Details** eines Chats schließt es sie.
- **Tabs:** Wische nach links oder rechts, um zum benachbarten Tab zu gehen, wie ein Tippen auf seinen Chip: **Alle**,
  **SMS** und **Erevos** auf dem Startbildschirm, **Wähltasten**, **Anrufliste** und **Favoriten** in **Telefon**, die
  Filter in **Kontakte** und die Sticker-Sätze.
- Auf einem Bildschirm mit Tabs wechselt ein Wischen nur den Tab, auch auf den Zeilen seiner Liste, und über den
  ersten oder letzten Tab hinaus tut es nichts: Geh dorthin mit dem Zurück-Pfeil zurück. Eine SMS-Unterhaltung wird
  archiviert oder gelöscht, indem du sie gedrückt hältst.

### Einstellungen

**Einstellungen · Settings**, die letzte Zeile des Menüs (die drei Punkte), enthält alles, was du in Erevos
einstellen kannst, in Gruppen, so wie die eigenen Einstellungen eines Telefons. In den anderen Sprachen heißt sie in
dieser Sprache und auf Englisch, etwa **Einstellungen · Settings**, damit du sie auch in einer Sprache findest, die du
nicht lesen kannst.

- **Einstellungen durchsuchen,** oben, findet eine Einstellung über den Anfang ihrer Wörter, mit oder ohne Akzente,
  und zeigt, wo sie ist, etwa **Telefon und SMS › SMS**. Tippe darauf, um sie zu öffnen.
- **Sprache · Language,** die Zeile unter der Suche, öffnet die Liste der Sprachen, siehe „Sprache“ weiter unten.
- **Eine Gruppe** öffnet die Liste ihrer Einstellungen, und eine Einstellung öffnet ihren Bildschirm. Eine
  Einstellung mit Teilen, etwa **SMS**, listet sie auf, und jeder Teil öffnet sich einzeln.
- **Nur was hier funktioniert, wird gezeigt:** Auf einem Computer, unter Sailfish OS und in der Web-App gibt es kein
  **Telefon und SMS**, kein Tor, Nostr oder LoRa, und eine Gruppe, in der es hier nichts einzustellen gibt, erscheint
  nicht.

| Gruppe | Was darin ist |
| --- | --- |
| **Allgemein** | **Sprache**, **Updates** und **Berechtigungen** (Android und die Web-App). Siehe „Sprache“ weiter unten, und [Updates](#updates). |
| **Darstellung** | **Stil und Farben** (Look, Glas, Stil, Thema, Farben und Text auf farbigen Flächen, mit der Vorschau), **Hintergrund**, **Nachrichten** (die Form der Blasen), **Startbildschirm-Symbole** (Android) und **Widget** (Android). Siehe [Darstellung](#appearance). |
| **Benachrichtigungen** | **Im Hintergrund** (Android): Empfangen und Klingeln, während Erevos geschlossen ist, und die Benachrichtigung für Nachrichten. **Benachrichtigungen, wenn geschlossen** (die Web-App): Web Push. **Zahl auf dem Symbol**: wie viele Nachrichten ungelesen sind, auf dem Symbol von Erevos. Siehe [Auf einem iPhone](#iphone). |
| **Datenschutz und Sicherheit** | **Sperre und zweites Passwort** (Sperren, wenn Erevos öffnet, das Passwort, Bildschirmschutz, Fingerabdruck oder Gesicht, das zweite Passwort), **Versteckte Chats** (die PINs der 4 Plätze) und **Diese Web-App** (nur die Web-App). Siehe [Passwortsperre](#lock), [Zweites Passwort](#second) und [Versteckte Chats](#hidden). |
| **Relay und Netze** | **Relay** (es öffnet **Neuer Chat** mit geöffnetem **Für Fortgeschrittene**), **Heim-Relay**, **Tor** (Android), **Nostr** (Android), **LoRa-Funk** (Android), **Matrix** und **XMPP**. Siehe [Chat über ein Relay](#relay), [Heim-Relay](#home-relay), [Über Tor](#tor), [Über Nostr](#nostr), [Über LoRa-Funk](#lora), [Matrix](#matrix) und [XMPP](#xmpp). |
| **Telefon und SMS** (Android) | **Telefon**, die Einstellungen der Telefon-App, dieselben wie **Telefon** → **Einstellungen**. **SMS**, in Teilen: **Erevos als SMS-App**, **Erevos hinter einer Nummer finden**, **Namen aus deinen Kontakten**, **Archiv, Spam und Papierkorb**, **Spamfilter**, **Blockierte Nummern**, **SMS zurückholen**, **Zwei SIMs** (nur mit zwei SIMs) und **Neue SMS**. Siehe [Telefon](#phone) und [SMS](#sms). |
| **Daten und Geräte** | **Backups**, **Verknüpfte Geräte** und **Importierte Chats**. Siehe [Backups](#backup), [Verknüpfte Geräte](#devices) und [Importierte Chats](#import). |
| **Zum Testen** | **Relay-Test** und **Funktest** (Android). Siehe [Die Testbildschirme](#tests). |

### Sprache

Erevos gibt es auf Englisch, Griechisch, Deutsch, Französisch, Spanisch, Italienisch, Portugiesisch und
Serbokroatisch. Beim ersten Start folgt es der Sprache des Telefons, wenn sie eine davon ist (ein Telefon auf
Serbisch, Kroatisch, Bosnisch oder Montenegrinisch startet auf Serbokroatisch), und ist sonst auf Englisch. Um sie zu
ändern, öffne das Menü (die drei Punkte), tippe auf **Einstellungen · Settings**, seine letzte Zeile, und dann auf die
erste Zeile dort, **Sprache · Language**. In den anderen Sprachen heißen beide in dieser Sprache und auf Englisch, etwa
**Einstellungen · Settings** und **Sprache · Language**. Tippe dann auf die Sprache, jede in ihren eigenen Worten
benannt: **Ελληνικά**, **English**,
**Deutsch**, **Español**, **Français**, **Italiano**, **Português** oder **Srpskohrvatski**. Die ganze App ändert
sich sofort.

- **Diese Anleitung** gibt es ebenfalls in jeder dieser Sprachen, und sie nennt die Tasten so, wie die App sie in
  deiner zeigt. In den Sprachen außer Englisch und Griechisch kann ein Wort, das neu in der App ist, eine Weile auf
  Englisch erscheinen, bis es übersetzt ist.
- **Auf dem Telefon gespeichert:** Die Wahl wird auf diesem Telefon gespeichert, außerhalb jedes Bereichs, sodass auch
  der Passwortbildschirm in ihr erscheint und sich jeder Bereich in ihr öffnet. Sie ist nicht versiegelt: Wer das
  Telefon in der Hand hat, kann sehen, welche Sprache du gewählt hast.
- **Die Benachrichtigungen von Android** (ein eingehender Anruf, neue Nachrichten, Erevos beim Empfangen im
  Hintergrund) sind auf Griechisch, wenn Erevos es ist, und in jeder anderen Sprache auf Englisch.

## Chat mit einem Telefon in der Nähe {#nearby}

Solange ein Bereich offen ist, auf jedem Bildschirm, sucht Erevos nach anderen Erevos-Telefonen in seiner Umgebung,
über Bluetooth und, wo das Telefon es hat, über Wi-Fi Aware, und im WLAN, in dem es ist, nach Telefonen und Computern
gleichermaßen. Internet, SIM-Karte oder WLAN-Netz sind nicht nötig. Es überbringt Nachrichten an deine Kontakte,
Ende-zu-Ende-verschlüsselt wie die über das Relay.

1. Öffne **Telefone in der Nähe** im Menü auf beiden Telefonen. Beim ersten Mal bittet Android darum, Geräte in der
   Nähe finden zu dürfen (auf Android 12 und älter auch um den Standort); erlaube es, sonst finden sich die Telefone
   nicht.
2. Wenn ihr noch keine Kontakte seid, fügt euch gegenseitig hinzu: Tippe auf einem Telefon auf **Neuer Chat**, dann
   auf **Meinen QR-Code zeigen** (unter **Ohne Relay anfangen**, solange es kein Relay hat), und scanne ihn mit dem
   anderen, wie in [Chat über ein Relay](#relay). Ohne Relay enthält der Code nur eure Schlüssel, und ihr erreicht
   euch nur in der Nähe, bis ihr eines habt.
3. Wähle den Kontakt, tippe in die Nachrichtenleiste unten und tippe auf den Sendepfeil. Sobald das andere Telefon
   antwortet, steht oben im Chat **In der Nähe**.

- **Solange ein Bereich offen ist:** Die Verbindungen starten, wenn ein Bereich sich öffnet, egal welcher Bildschirm
  zu sehen ist, und enden, wenn sich ein anderer Bereich öffnet: Gesperrt läuft der Bereich hinter dem
  Passwortbildschirm weiter. Eine Nachricht aus der Nähe erscheint auf dem Startbildschirm wie eine über das Relay,
  und ein Anruf klingelt auch dort. Auf Android bleiben sie mit Erevos im Hintergrund bestehen, solange
  **Im Hintergrund** auf **Empfangen und klingeln** steht. Um dort den Akku zu schonen, sucht es seltener nach
  Telefonen: Wi-Fi Direct alle zehn Minuten, Wi-Fi Aware eine Minute von jeweils fünf, und im selben WLAN hört es die
  anderen zwanzig Sekunden von jeweils zwei Minuten. Ein Telefon in der Nähe wird daher womöglich ein paar Minuten
  später gefunden; bestehende Verbindungen bleiben bestehen, und sobald Erevos sichtbar ist, sucht es so oft wie zuvor.
- **Reichweite:** ein paar Dutzend Meter im Freien, weniger durch Wände.
- **Wi-Fi Aware:** schneller, aber nicht jedes Telefon hat es. Bluetooth funktioniert auf allen. Um es abzuschalten,
  schalte **Mit Wi-Fi Aware suchen** aus, über **Erevos im selben WLAN finden**.
- **Dasselbe WLAN oder ein Hotspot:** Telefone in einem WLAN oder im Hotspot eines Telefons finden sich und sprechen
  direkt miteinander, auch wenn dieses WLAN kein Internet hat; die Desktop-App ebenso. Wenn Android fragt, ob es in
  einem WLAN ohne Internet bleiben soll, bleib. Jeder in diesem WLAN kann erkennen, dass dort eine Erevos-App ist,
  nicht wessen. Die Firewall eines Computers muss Port 47905 hereinlassen (UDP und TCP). Um es abzuschalten, schalte
  **Erevos im selben WLAN finden** unter **In der Nähe, ohne Internet** in **Neuer Chat** aus.
- **Ein eigenes WLAN (Android 10 und neuer):** Ohne gemeinsames WLAN bauen zwei Erevos-Telefone in der Nähe ein
  kleines eigenes WLAN auf (Wi-Fi Direct) und sprechen darüber wie im selben WLAN: schneller als Bluetooth, und ein
  Anruf geht darüber ohne Internet. Es fragt nichts; jedes Telefon bleibt, wo es kann, auch in seinem eigenen WLAN.
  Jeder in der Nähe kann erkennen, dass dort ein Erevos-Telefon ist, und könnte diesem kleinen WLAN beitreten, bekäme
  aber nur versiegelte Bytes. Es braucht **Erevos im selben WLAN finden** eingeschaltet; um nur es abzuschalten,
  schalte **WLAN mit Telefonen in der Nähe aufbauen** darunter aus.
- **Auf einem Samsung-Telefon** sind **Mit Wi-Fi Aware suchen** und **WLAN mit Telefonen in der Nähe aufbauen** aus,
  bis du sie einschaltest: Solange eine App sie nutzt, bittet Samsung darum, sein eigenes Teilen auszuschalten.
  Bluetooth und dasselbe WLAN funktionieren ohne sie.
- **Andere Telefone in der Nähe** bekommen nur versiegelte Bytes, die sie nicht öffnen können, und nur, bis das
  Telefon deines Kontakts bekannt ist: Ab dann geht, was du sendest, nur noch an dieses. Sprachnachrichten gehen nur an
  einen Kontakt, von dem bekannt ist, dass er in der Nähe ist. Fotos und Dateien brauchen das Relay.
- **Mit zusätzlichem Relay** geht jede Nachricht auch darüber, sodass nichts verloren geht, wenn die Verbindung
  abbricht; die Kopie, die als zweite ankommt, wird nicht noch einmal gezeigt. Ist das Relay nicht erreichbar, zählt
  die Kopie aus der Nähe.
- **Von anderen Telefonen mitgenommen:** Wenn das Relay nicht erreichbar und dein Kontakt nicht in der Nähe ist,
  nehmen die Erevos-Telefone in der Nähe deine Nachricht auch mit, versiegelt für das Relay deines Kontakts. Jedes
  bewahrt sie auf, höchstens drei Tage, gibt sie an höchstens zwei weitere Telefone weiter, denen es begegnet, und
  übergibt sie über sein eigenes Relay an jenes Relay, sobald es kann; deines ebenso. Sie können sie nicht lesen und
  auch nicht erkennen, von wem oder für wen sie ist: Sie sehen nur die Adresse des Relays. Sie bleibt, wenn Erevos
  sich schließt, versiegelt auf dem Telefon. Deine bleiben in deinem Bereich und gehen nur, solange er offen ist. Das
  Mitnehmen für andere ist aus, solange du nicht **Nachrichten für andere mitnehmen** unter
  **In der Nähe, ohne Internet** in **Neuer Chat** einschaltest, und dann nur für Relays im Internet über TLS
  (wss://): Ein Fremder in der Nähe bringt dein Telefon oder dein Relay nie dazu, eines in einem lokalen Netz oder auf
  dem Telefon selbst anzusprechen. Deine eigenen Nachrichten werden von den Telefonen in der Nähe mitgenommen, bei
  denen es eingeschaltet ist.

**Warum:** Ein Paket sagt nicht, für wen es ist, also kann niemand in der Nähe daraus erkennen, wem es gehört. Bis das
Telefon deines Kontakts über eine Verbindung antwortet, kann auch dein Telefon nicht wissen, welches der Telefone in
der Nähe seines ist: Also gehen die kurzen Pakete an alle, jedes probiert sie, und vom ersten, das sie öffnet, ist
diese Verbindung die deines Kontakts. Eine Sprachnachricht, in größeren Stücken, wartet darauf.

> Eine Nachricht aus der Nähe öffnet sich nur in dem Bereich, der diesen Kontakt hat. Eine für einen anderen Bereich
> dieses Telefons wartet im Arbeitsspeicher, höchstens sechs Stunden, bis sich dieser Bereich öffnet. Versteckte Chats
> nutzen die Verbindung in der Nähe nie.

**Warum:** Die Verbindungen in der Nähe gehören dem Telefon, nicht einem Bereich, und nichts darauf nennt einen: Was
ankommt, wird in den Chats des offenen Bereichs probiert und für die anderen eine Weile im Arbeitsspeicher gehalten,
nie auf das Telefon geschrieben. Versteckte Chats nutzen sie noch nicht: Das kommt erst noch (siehe
[Was heute geschützt ist](#privacy)).

## Über LoRa-Funk {#lora}

Mit einem Meshtastic-LoRa-Funkgerät, das per Bluetooth mit dem Telefon verbunden ist, erreicht Erevos ein Erevos mit
einem Funkgerät im selben Mesh, kilometerweit entfernt, ohne Internet: direkt oder über die Meshtastic-Funkgeräte
dazwischen. Es ist aus, solange du kein Funkgerät einstellst, und nur auf Android.

1. Richte das Funkgerät zuerst in der Meshtastic-App ein, vor allem seine **Region**: Ohne sie sendet es nichts.
   Schließe dann die Meshtastic-App oder trenne sie dort: Ein Funkgerät verbindet sich immer nur mit einer App.
2. Öffne **Einstellungen** → **Relay und Netze** → **LoRa-Funk**, tippe auf **Mein Funkgerät finden**, lies, was dort
   steht, und tippe auf dein Funkgerät, wenn es erscheint. Ein noch nicht gekoppeltes Funkgerät fragt nach seiner PIN:
   Sie steht auf dem Bildschirm des Funkgeräts, oder sie ist 123456.
3. Dein Kontakt macht dasselbe mit seinem, im selben Mesh: dieselbe Region und derselbe erste Kanal.
4. Schreib wie immer. Wenn das Relay nicht erreichbar und kein Telefon in der Nähe ist, geht ein Text über LoRa, und
   die Zeile unter dem Chat sagt es.

- **Nur Text, und langsam:** Eine Nachricht geht in Stücken von etwa 220 Bytes, jedes eine oder zwei Sekunden in der
  Luft, und das Gesetz erlaubt einem Funkgerät nur begrenzt Sendezeit (in der EU ein Zehntel jeder Stunde). Deshalb
  nimmt LoRa nur Texte und Löschungen, und nur, wenn nichts anderes es tut. Sprachnachrichten, Fotos und Dateien warten
  im Chat, als **Wartet** markiert, und gehen von selbst, sobald das Relay oder ein Telefon in der Nähe sie annehmen
  kann; auch Anrufe brauchen eines davon. Die erste Nachricht an einen Kontakt dauert länger, weil sie die Schlüssel
  enthält.
- **Zeichen:** **✓✓** kommt mit der nächsten Nachricht des Kontakts, da Zeichen allein nicht über LoRa gehen.
- **An jedes Funkgerät in Reichweite:** Jede Nachricht wird von jedem Funkgerät in der Umgebung gehört und von den
  Meshtastic-Funkgeräten weitergegeben, wie Meshtastic es tut. Jedes Erevos probiert sie; nur das deines Kontakts
  öffnet sie. Über LoRa wird nichts für andere mitgenommen.
- **Sein Name und wo es ist:** Meshtastic-Funkgeräte nennen ab und zu jedem Funkgerät in Reichweite ihren Namen, und
  wo sie sind, wenn sie GPS oder eine feste Position haben, im Klartext. Erevos hält deines davon ab
  (**Verschwiegen**): Es setzt seine Rolle auf Client hidden, schaltet sein GPS aus und entfernt eine feste Position.
  Einem Funkgerät, das nach seinem Namen fragt, antwortet es trotzdem, also gib ihm in der Meshtastic-App einen Namen,
  der nichts über dich sagt. **Allen in Reichweite gesagt** stellt seine Rolle und sein GPS nach einer Warnung wieder
  her; eine feste Position wird in der Meshtastic-App neu gesetzt. Wenn das Funkgerät die Einstellungen nicht behält,
  sagt der LoRa-Bildschirm es.
- **Es bleibt verbunden**, solange Erevos läuft, und verbindet sich von selbst wieder, wenn das Funkgerät wieder in
  Reichweite kommt. **LoRa ausschalten** gibt dem Funkgerät seine Rolle und sein GPS zurück, wenn es verbunden ist,
  trennt es dann und vergisst es. Versteckte Chats gehen nie über LoRa.

**Warum:** Was ein Meshtastic-Funkgerät über sich selbst sagt, geht im Klartext an jeden, der kilometerweit entfernt
zuhört: Sein Name und wo es ist könnten zeigen, wo du bist, und das Funkgerät mit dir in Verbindung bringen, also hält
Erevos es still, solange du nichts anderes wählst. Und da das Gesetz einem Funkgerät nur begrenzt Sendezeit erlaubt,
bleibt LoRa deinen eigenen Texten vorbehalten, wenn nichts anderes sie nehmen kann, nie dem, was andere Telefone es
mitnehmen lassen würden.

> Ein LoRa-Funkgerät ist kilometerweit zu hören, und sein Signal lässt sich bis zu seinem Standort zurückverfolgen,
> ob still oder nicht. Was Erevos sendet, bleibt Ende-zu-Ende-verschlüsselt, aber jeder mit einem Funkgerät kann
> erkennen, dass deines sendet, wann und wie viel. Mit **Allen in Reichweite gesagt** kann außerdem jeder mit einem
> Funkgerät seinen Namen lesen und wo es ist.

## Chat über ein Relay {#relay}

Ein Relay ist ein kleiner Server, der Einweg-Warteschlangen führt: Jedes Telefon hat seine eigene Warteschlange, und
wer seinen **Kontaktlink** hat, kann Nachrichten hineinlegen. Das Relay führt keine Konten, Namen oder
Telefonnummern und kann die Nachrichten nicht lesen: Sie sind Ende-zu-Ende-verschlüsselt, und nur die beiden Telefone
haben die Schlüssel. Jedes Telefon kann ein eigenes Relay nutzen: Eine Nachricht an einen Kontakt auf einem anderen
Relay wird für dessen Relay versiegelt und deinem übergeben, das sie weiterreicht, sodass sein Relay nie die Adresse
deines Telefons sieht. Ein Telefon ohne Relay bekommt einen Platz auf dem seines Kontakts, siehe
**Kein eigenes Relay** weiter unten.

**Warum:** Mit Warteschlangen und ohne Konten führt kein Server eine Liste, wer wen kennt, und niemand braucht deine
Telefonnummer oder E-Mail-Adresse, um dich zu erreichen: Wer deinen Kontaktlink hat, kann in deine Warteschlange
schreiben, und nur du liest sie.

1. Tippe auf dem Startbildschirm auf **Neuer Chat**. Oben sagt **So bist du jetzt verbunden** in einfachen Worten, wie
   deine Kontakte dich erreichen: über dein Relay, über Nostr ohne Relay oder nur in der Nähe. Darunter stehen die
   Wege hinein für ein Telefon, das noch kein Relay hat, oder, mit Relay, **Kontakt hinzufügen** und
   **Dein Kontaktlink**. Die eigenen Einstellungen des Relays sind unter **Für Fortgeschrittene**, ganz unten;
   **Einstellungen** → **Relay und Netze** → **Relay** öffnet „Neuer Chat“ mit ihnen geöffnet.
2. Gib unter **Für Fortgeschrittene** die **Relay-Adresse** ein: \`ws://<Adresse des Computers>:7879\` für ein Relay in
   deinem eigenen Netz oder \`wss://relay.example.org\` für eines im Internet. Füge das **Token** hinzu, wenn das Relay
   eines braucht.
3. Tippe auf **Meine Relay-Warteschlange anlegen**. Erevos sagt **Relay-Warteschlange angelegt**, und
   **So bist du jetzt verbunden** sagt **Über dein Relay**: Alles funktioniert, Texte, Fotos, Sprachnachrichten,
   Anrufe und Gruppen.
4. Tippe unter **Dein Kontaktlink** auf **Meinen QR-Code zeigen**: Er öffnet sich über dem Bildschirm. Lass das andere
   Telefon ihn mit seiner Kamera scannen und dann den Link in Erevos öffnen. Der Bildschirm **Kontakt hinzufügen**
   zeigt, was er enthält: Tippe nur auf **Zum Chat hinzufügen**, wenn du ihn selbst gescannt hast.
   **Hinzufügen und mit einem meiner Kontakte verknüpfen** fügt ihn ebenfalls hinzu, verknüpft mit dem Kontakt, den du
   wählst, dessen Namen der Chat übernimmt.
5. Wenn die Kamera des anderen nur den Text zeigt oder ihr weit voneinander entfernt seid, tippe auf
   **Meinen Kontaktlink teilen** und schick ihn. Dein Kontakt fügt ihn in das Feld unter **Kontakt hinzufügen** ein
   und tippt auf **Hinzufügen**.
6. Oder andersherum: Tippe unter **Kontakt hinzufügen** auf **Foto des QR-Codes aufnehmen**, um den Code auf dem
   Bildschirm des anderen zu fotografieren, oder auf **Foto des QR-Codes auswählen** für einen Screenshot oder ein Foto
   davon, das dir geschickt wurde. Erevos liest ihn und fügt den Kontakt sofort hinzu. Auf einem Computer, unter
   Sailfish OS und in der Web-App gibt es nur **Foto des QR-Codes auswählen**; auf einem iPhone bietet es auch die
   Kamera an. Versteckte Chats haben keines von beiden, da ein Foto Erevos verlässt, was sie schließt: Füge dort den
   Link ein.

Der neue Chat erscheint auf dem Startbildschirm mit dem Namen **Kontakt** und den ersten Zeichen des Schlüssels, bis
er einen Namen hat: **Umbenennen** in seinen Details gibt ihm einen. Direkt nachdem du jemanden hier hinzugefügt hast,
lässt dich **Mit einem meiner Kontakte verknüpfen** unter dem Hinweis, dass er hinzugefügt wurde, stattdessen einen
deiner Kontakte wählen (**Nicht jetzt** lässt es): Der Chat übernimmt den Namen dieses Kontakts, wenn er keinen eigenen
hat, und die Karte des Kontakts zeigt den Chat. Versteckte Chats bieten nur ihre eigenen Kontakte an, nie die des
Telefons. Es genügt, dass ein Telefon das andere hinzufügt: Einen Link hinzuzufügen beginnt eine verschlüsselte
Unterhaltung und sagt dem anderen Telefon, wie es antworten kann, sodass es den Chat anzeigt, wenn es das nächste Mal
in seine Warteschlange schaut, was es alle paar Sekunden tut.

**Was das Relay von einem Chat sieht:** Alle deine Kontakte schreiben in deine eine Warteschlange. Sobald jedes
Telefon eine Nachricht vom anderen bekommen hat, wird jede Nachricht zwischen ihnen noch einmal für das Telefon
versiegelt, an das sie geht, mit einem Schlüssel, den dieses Telefon innerhalb des Chats gegeben hat, sodass jede für
das Relay aus zufälligen Bytes in einer von wenigen Größen besteht und es daraus nicht erkennen kann, zu welcher
Unterhaltung sie gehören. Die erste Nachricht eines Chats und alle, die gesendet werden, bevor die Antwort kommt,
zeigen es noch. Das Relay sieht weiterhin, welche Adresse jede Nachricht hineinlegt, und wann. Und jede sagt dem Relay,
in einem Byte, das es liest, was sie trägt: eine Nachricht, die jemand liest, Mitteilungen zwischen Telefonen (dass
eine Nachricht ankam oder gelesen wurde, Tippen, Online-Sein, Reaktionen, neue Schlüssel) oder einen Anruf, der
klingelt. Das Relay sieht also, was Nachrichten sind und wann ein Anruf beginnt, ob Benachrichtigungen an sind oder
nicht: So kann die Benachrichtigung einer geschlossenen Web-App sie zählen, und die Benachrichtigung geschlossener
versteckter Chats.

### Wege zum Relay

Ein Relay, das ein Token braucht, lässt ein Telefon auf drei Wegen herein. Jeder Weg endet mit einem eigenen Token des
Telefons dort, sodass, wer das Relay betreibt, jedes einzelne Telefon für sich allein herausnehmen kann.

- **Eine Einladung:** ein QR-Code oder Link von einem Telefon, das schon auf dem Relay ist (siehe „Jemand Neues
  einladen“ weiter unten). Nichts einzutippen, und ihr seid sofort Kontakte.
- **Ein Konto:** **Mit LPHL anmelden**, wenn das Relay es anbietet (siehe „Beim Relay anmelden“ weiter unten). Jedes
  LPHL-Konto kann das, auf bis zu 10 Telefonen.
- **Das Token des Relays:** das eine Token für alle, von dem, der das Relay betreibt, eingegeben unter **Token**.
  Erevos tauscht es sofort und von selbst gegen ein eigenes Token des Telefons, dort so benannt, wie du dich in
  Einladungen nennst (\`phone\`, wenn du keinen Namen angegeben hast), sagt das und nutzt von da an nur noch dieses. So
  kann dieses Telefon auch einladen. Es braucht ein Relay, das Einladungen annimmt, ab nach Erevos 3.1.0; mit einem
  älteren oder einem, das keine Einladungen annimmt, behält das Telefon das Token des Relays und kann nicht einladen.
- **Die Grenzen:** Ein Telefon kann 5 Einladungen gleichzeitig offen haben und 10 am Tag machen (der Tag nach UTC);
  jede ist für ein Telefon und hält 7 Tage. Das Relay lässt insgesamt 100 Telefone per Einladung herein, die noch
  offenen Einladungen mitgezählt, sofern sein Betreiber nichts anderes gewählt hat. Telefone, die mit einem Konto oder
  mit dem Token des Relays kamen, zählen nicht zu diesen 100: Das Relay gibt am Tag 50 Telefonen, die mit seinem Token
  kamen, ein eigenes Token, und ein Konto hat 10 Telefone. Das Relay bedient 512 Verbindungen gleichzeitig, egal von
  wem, sofern sein Betreiber nichts anderes gewählt hat.
- **Ein Telefon herausnehmen:** Wer das Relay betreibt, löscht dessen Zeile in der Token-Datei des Relays: Es kann das
  Relay nicht mehr nutzen, und die Telefone, die es eingeladen hat, auch nicht. Hatte es jemals das Token des Relays,
  ändert der Betreiber auch dieses Token, damit es damit nicht zurückkommen kann. Telefone mit eigenen Tokens machen
  weiter wie bisher: Nur ein Telefon, in dem noch das alte Token eingegeben ist (seitdem nicht geöffnet, oder mit
  einem älteren Erevos), braucht das neue.
- **Versteckte Chats** behalten das Token des Relays, das für sie eingegeben ist: Es im selben Moment wie das des
  Bereichs einzutauschen, würde dem Relay zeigen, dass sie zu diesem Telefon gehören. Wenn sich das Token des Relays
  ändert, gib das neue unter ihrem **Für Fortgeschrittene** ein.

**Warum:** Das Relay gibt jeder Verbindung einen eigenen Thread, also bedient es nur begrenzt viele gleichzeitig; und
es fügt am Tag nur begrenzt viele Zeilen für Telefone hinzu, die mit seinem einen Token kamen, sodass ein Token, das
dorthin gelangt ist, wo es nicht hingehört, seine Token-Datei nicht füllen kann.

### Jemand Neues einladen

Ein QR-Code oder Link holt jemand Neues herein: Das Telefon dieser Person tritt Erevos auf deinem Relay bei, mit
eigenem Zugang, ohne etwas einzutippen, und ihr seid sofort gegenseitig Kontakte, ohne Nachrichtenanfrage.

- **Einladen:** Tippe in den Chats, ohne gewählten Kontakt, auf **Jemanden einladen**. Gib ein, für wen sie ist (der
  Name der Person in deinen Chats) und, wenn du willst, **Dein Name, für die Person**, und tippe dann auf
  **Einladung machen**. Ein QR-Code öffnet sich: Sobald Erevos auf dem anderen Telefon ist, scannt die Person ihn mit
  der Kamera und öffnet den Link in Erevos, oder du tippst auf **Einladung teilen** und schickst ihr den Link. Sie gilt
  für eine Person, 7 Tage lang, oder kürzer, wenn die Einladung des Relays früher endet. Wer sie zuerst nimmt, hat sie,
  also gib sie nur dieser Person.
- **Beitreten:** Auf einem Telefon ohne Relay zeigt **Neuer Chat** **Wähle, wie du anfängst**: Tippe auf
  **Ich habe eine Einladung**. Scanne die Einladung mit der Kamera und öffne den Link in Erevos, oder tippe auf
  **Foto der Einladung aufnehmen** oder **Foto der Einladung auswählen**, oder füge den Link ein und tippe auf
  **Beitreten**. Der Link öffnet **… lädt dich zu Erevos ein**: Tippe nur auf **Beitreten**, wenn er von dieser Person
  kam. Erevos nimmt einen eigenen Zugang zu ihrem Relay und eine Warteschlange dort, fügt die Person hinzu und sagt
  **Willkommen bei Erevos**. Seine erste Nachricht sagt es dem Telefon der Person, das dieses sofort als Kontakt
  hinzufügt, so benannt, wie sie es eingegeben hat.
- **Stattdessen mit einem Konto:** **Mit LPHL anmelden**, der zweite Weg hinein, meldet dieses Telefon mit einem
  LPHL-Konto im Browser beim Relay von LPHL an (siehe „Beim Relay anmelden“ weiter unten); füge dann deine Kontakte
  über ihre Einladungen oder Links hinzu. Der dritte, **Ohne Relay anfangen**, steht in „Ganz ohne Relay“ unter „Über
  Nostr“. **Für Fortgeschrittene** hat die Relay-Einstellungen, wie in 1 bis 6 oben.
- **Was dein Relay erlauben muss:** Der eigene Zugang ist eine Einladung zu deinem Relay (siehe „Einladungen zum Relay“
  weiter unten), also kommt er nur von einem Telefon mit eigenem Token auf einem Relay, das Einladungen annimmt. Er
  zählt zu deinen Einladungen, unter dem Namen, den du für die Person eingegeben hast, und geht mit deinen. Ein Telefon
  mit dem einen Token des Relays für alle tauscht es zuerst gegen ein eigenes (siehe „Wege zum Relay“ oben); wo das
  Relay das nicht tut, macht es keine Einladung: Melde dich zuerst beim Relay an (unter dem **Token**, unter
  **Für Fortgeschrittene**) oder nimm eine Einladung dazu an. Wenn dein Relay keine Einladungen annimmt, macht euch
  die Einladung trotzdem zu Kontakten, und das andere Telefon nutzt dein Relay nur so, wie es dein Kontaktlink zulässt,
  wie in „Kein eigenes Relay“ weiter unten.
- **Ein Telefon, das schon ein Relay hat,** behält sein eigenes: Die Einladung fügt nur dich hinzu, und ihr seid
  trotzdem sofort Kontakte.
- **Was gespeichert wird:** Dein Telefon bewahrt das Geheimnis jeder Einladung und den Namen für die Person auf,
  versiegelt im Bereich, bis sie genutzt wird oder ihre 7 Tage enden, höchstens 20 gleichzeitig. Auf dem Relay ist
  davon nichts außer der Einladung zum Relay.
- **Per SMS, an jemanden, der noch kein Erevos hat:** Auf Android hat die Karte eines Kontakts, der nicht in Erevos
  ist, **Per SMS einladen**. Es schreibt eine SMS an seine erste Nummer mit einem kurzen Link, in der SMS-App (der von
  Erevos, wenn sie die SMS-App des Telefons ist), damit du sie sendest oder nicht. Die Seite des Links auf dem
  Webserver von LPHL bietet der Person Erevos an (die Android-App oder auf einem iPhone die Web-App) und öffnet dann
  die Einladung darin; in der Web-App auf einem iPhone fügt sie den Link unter **Ich habe eine Einladung** ein. Sie
  tippt auf **Beitreten**: Ihr Telefon tritt deinem Relay bei wie oben und antwortet deinem darüber, das sie dann
  hinzufügt, verknüpft mit dieser Nummer und so benannt wie auf der Karte. Seine erste Nachricht, die von selbst geht,
  macht dich zu ihrem Kontakt, so benannt, wie du dich in deiner letzten Einladung genannt hast. Die Einladung steht
  hinter dem **#** im Link, das an keinen Webserver geschickt wird, aber die Telefongesellschaft sieht die SMS, wie
  jede SMS: Deshalb gilt sie für eine Person, zwei Tage lang, und wenn die zwei Tage enden, ohne dass ein Telefon sie
  genutzt hat, nimmt dein Telefon seine Einladung zum Relay zurück. Es braucht ein Relay, das dein Telefon einladen
  lässt, wie oben.

### Kein eigenes Relay

Ein Telefon ohne Relay chattet trotzdem über das Internet: Wenn es den Link eines Kontakts hinzufügt, dessen Relay
Plätze verleiht, nimmt es dort einen Platz, ohne Token.

- **Wie:** Füge den Link hinzu wie in 4 und 5, ohne etwas unter **Relay**. Erevos sagt, dass du jetzt einen Platz auf
  dem Relay des Kontakts hast, über seinen Link geliehen, und nutzt ihn von da an als seinen eigenen: Dein eigener
  Link nennt ihn, sodass andere dich auch dort erreichen.
- **Wer verleiht:** Dein Link trägt nur dann ein Ticket für einen Platz auf deinem Relay, wenn du
  **Mit diesem Link einen Platz auf meinem Relay teilen** unter **Dein Kontaktlink** in **Neuer Chat** einschaltest,
  und nur für den Link, der dann gezeigt wird: Das nächste Mal, wenn sich der Chat öffnet, ist es wieder aus. Das
  Relay braucht einen Schlüssel für das Senden über zwei Stationen und verleiht erst, wenn sein Betreiber das
  Verleihen einschaltet; der kann auch die Plätze eines Tickets zurücknehmen. Ein Ticket hält 30 Tage und gibt bis zu
  vier Plätze. Jeder, der einen Link mit Ticket sieht, kann damit einen Platz nehmen, also gib einen solchen Link nur
  denen, für die er gedacht ist.
- **Was ein geliehener Platz nicht tut:** Nachrichten an Kontakte auf anderen Relays gehen direkt an deren Relay, das
  dann die Adresse deines Telefons sieht. Er hebt nichts für später auf (eine später gesendete Nachricht wartet auf dem
  Telefon), gibt kein Anruf-Relay (Anrufe gehen direkt zwischen den Telefonen) und macht höchstens 4 weitere
  Warteschlangen und sendet höchstens 50 MB Dateien am Tag. Dein Link verleiht nichts weiter.
- **Stattdessen dein eigenes Relay:** Gib seine Adresse unter **Relay** ein: Der geliehene Platz wird aufgegeben, und
  Kontakte erfahren den neuen mit deiner nächsten Nachricht.
- **Ein Link ohne Ticket** (von einem älteren Relay oder Erevos): Ein Relay, das kein Token braucht, wird so genutzt,
  wie es ist; sonst erreicht ihr euch nur in der Nähe, bis du ein Relay hast.

**Warum:** Ein Link mit Ticket ist für jeden, der ihn sieht, ein Schlüssel zu deinem Relay, also trägt dein Link nur
dann eines, wenn du es wählst, für den dann gezeigten Link, und das Relay verleiht erst, wenn sein Betreiber es
erlaubt. Die Dateien eines geliehenen Platzes sind auf ein paar Fotos und Sprachnachrichten am Tag beschränkt, sodass
er nie den ganzen Speicher des Relays belegt.

### Einladungen zum Relay

Ein Telefon mit eigenem Token auf einem Relay, das Einladungen annimmt, kann ein weiteres Telefon dieses Relay nutzen
lassen, mit einem eigenen Token dieses Telefons, sodass kein Token eingetippt oder weitergegeben wird.

- **Einladen:** Tippe unter **Für Fortgeschrittene** in **Neuer Chat**, unter dem **Token**, auf
  **Zum Relay einladen**, gib ein, für wen sie ist, und tippe auf **Einladung machen**. Ein QR-Code öffnet sich: Lass
  das andere Telefon ihn mit seiner Kamera scannen und den Link in Erevos öffnen, oder tippe auf **Einladung teilen**
  und schick sie. Sie gilt für ein Telefon 7 Tage lang, und wer sie zuerst nimmt, hat sie, also zeig sie nur der
  richtigen Person.
- **Eine annehmen:** Der Link öffnet **Einladung zu einem Relay**, mit der Adresse des Relays: Tippe nur auf
  **Dieses Relay nutzen**, wenn sie von jemandem kam, den du kennst. In Erevos lesen auch **Foto des QR-Codes
  aufnehmen** und **Foto des QR-Codes auswählen** unter **Kontakt hinzufügen** eine Einladung, und ihr Link lässt sich
  in das Feld dort einfügen. Erevos macht ein Token für dieses Telefon, bewahrt es mit der Adresse des Relays nur in
  diesem Bereich auf, legt dort deine Warteschlange an und sagt den Namen, den das Relay dem Telefon gegeben hat. Nutzt
  das Telefon ein anderes Relay, fragt es zuerst, und Kontakte erfahren deine neue Warteschlange mit deiner nächsten
  Nachricht. Erevos nimmt eine Einladung zu einem wss://-Relay an, oder zu einem ws://-Relay nur in einem Heimnetz
  (etwa \`ws://192.168.1.10:7879\`). Versteckte Chats nehmen keine Einladungen an.
- **Deine Einladungen:** unter der Taste aufgelistet, offen oder in Gebrauch. **Zurücknehmen** nimmt eine noch offene
  zurück oder sperrt das Telefon, das sie genommen hat, sofort aus, samt den Telefonen, die dieses wiederum eingeladen
  hat.
- **So lange wie deines:** Ein Telefon, das du eingeladen hast, nutzt das Relay nur, solange deines es darf. Wenn deine
  Zeile verschwindet, weil das Telefon, das dich eingeladen hat, sie zurückgenommen hat, das Konto, mit dem du dich
  angemeldet hast, das Relay nicht mehr nutzen darf oder sein Betreiber es herausgenommen hat, verschwinden auch die
  Zeilen der Telefone, die du eingeladen hast, und die der Telefone, die diese eingeladen haben. Eine erneute Anmeldung
  auf deinem Telefon erhält sie.
- **Was das Relay aufbewahrt:** den Namen, den du eingegeben hast, in lateinischen Buchstaben (Μαρία wird zu
  \`maria\`), dass du dieses Telefon eingeladen hast, und einen Fingerabdruck seines Tokens, nicht das Token. Wer das
  Relay betreibt, sieht das und kann jedes Telefon davon entfernen. Ein Telefon kann 5 Einladungen gleichzeitig offen
  haben und 10 am Tag machen, und das Relay lässt nur begrenzt viele Telefone per Einladung herein (100, sofern sein
  Betreiber nichts anderes gewählt hat).
- **Wer einladen kann:** ein Telefon mit eigenem Token, auf einem Relay, dessen Betreiber Einladungen eingeschaltet hat
  (siehe [Ein eigenes Relay betreiben](#own-relay)). Ein Telefon mit dem einen Token des Relays für alle tauscht es
  zuerst gegen ein eigenes (siehe „Wege zum Relay“ oben). Mit einem geliehenen Platz gibt es kein
  **Zum Relay einladen**.

**Warum:** Das Relay bewahrt von jedem Token nur einen Fingerabdruck auf, nie das Token, also verrät seine Datei
niemandem, wie man sich verbindet. Und eine Einladung nennt ein wss://-Relay oder ein ws://-Relay zu Hause, sodass sie
die Anfragen deines Telefons nie im Klartext durch das Internet schicken kann.

### Beim Relay anmelden

Ein Relay kann Telefone sich mit einem Konto anmelden lassen, dem sein Betreiber vertraut, etwa LPHL, für ein eigenes
Token, ohne dass in Erevos etwas einzutippen ist.

- **Anmelden:** Gib die Adresse des Relays unter **Relay** ein. Wenn das Relay es anbietet, erscheint
  **Mit LPHL anmelden** unter dem **Token**. Tippe darauf: Der Browser öffnet die Anmeldeseite, auf der du deinen Namen
  und dein Passwort eingibst, die Erevos nie sieht. Die Seite des Relays zeigt dann sechs Ziffern. Zurück in Erevos,
  das dich direkt in **Code von der Seite** setzt, gib sie dort ein und tippe auf **Anmeldung abschließen**: Das
  Telefon bewahrt sein Token mit der Adresse des Relays nur in diesem Bereich auf und legt dort deine Warteschlange an.
  Gib den Code nur in Erevos auf deinem eigenen Telefon ein und gib ihn niemandem, auch nicht auf Nachfrage: Wer ihn
  eingibt, nutzt das Relay als du. Nach 5 falschen Codes ist die Anmeldung vorbei: Melde dich noch mal an. Erevos
  öffnet nur eine Anmeldeseite auf der eigenen Adresse des Relays, über https.
- **Eine erneute Anmeldung** auf demselben Telefon ersetzt seine Zeile auf dem Relay, wenn sein Token das ist, das es
  von diesem Relay bekommen hat. Jedes Telefon bekommt eine eigene Zeile, höchstens 10 für ein Konto.
- **Was das Relay und LPHL sehen:** Das Relay benennt die Zeile des Telefons nach deinem Benutzernamen
  (\`lphl:nekten\`), und jede Stunde fragt es LPHL, ob das Konto es noch nutzen darf: Sobald das Konto geschlossen oder
  deaktiviert ist oder LPHL 3 Tage lang nicht gefragt werden kann, verschwindet die Zeile, und das Telefon kann das
  Relay nicht mehr nutzen, und die Telefone, die es eingeladen hat, auch nicht. LPHL sieht jede Anmeldung und diese
  Prüfungen, aber nichts von deinen Bereichen, Chats oder Kontakten. Wenn du dich aus einem anderen Bereich mit
  demselben Konto anmeldest, zeigt das dem Relay, dass beide dir gehören.
- **Versteckte Chats** melden sich nicht an.

**Warum:** Die Seite zeigt den Code, und du gibst ihn in Erevos ein, nicht andersherum, also bringt ein Anmeldelink,
den dir jemand anderes schickt, diesem nichts: Nur wer sich angemeldet hat, sieht den Code, und fünf falsche beenden
die Anmeldung. Erevos öffnet eine Anmeldeseite nur auf der eigenen Adresse des Relays, über https, also kann nichts,
das an Stelle des Relays antwortet, dich auf eine Seite anderswo schicken. Und ein Anbieter, der eine Weile nicht
gefragt werden kann, sperrt kein Telefon sofort aus: Das tun erst 3 Tage ohne gültige Antwort.

### Der eigene Schlüssel des Relays

Sobald Erevos den Schlüssel deines Relays kennt (es fragt das Relay beim ersten Mal, oder ein Kontaktlink gibt ihn),
beginnt jede Verbindung zu diesem Relay mit einer Prüfung: Das Relay muss beweisen, dass es diesen Schlüssel hat, und
das Token und alles danach gehen verschlüsselt mit diesem Schlüssel, innerhalb der eigenen Verschlüsselung der
Verbindung (TLS). Unter **So bist du jetzt verbunden** sagt Erevos dann, dass dein Relay seinen eigenen Schlüssel
bewiesen hat. Ab dann erreicht dieser Bereich dieses Relay nie ohne die Prüfung.

- Ein Relay, das älter ist als diese App, beweist nichts: Es funktioniert wie bisher, und **So bist du jetzt
  verbunden** sagt, dass es älter ist. Erevos versucht es jede Stunde wieder.
- Ein Relay, das den Schlüssel nicht beweisen kann, den Erevos für es aufbewahrt, bekommt nichts, und deine Nachrichten
  warten; **So bist du jetzt verbunden** sagt es in Rot. Nur wenn sein Betreiber dir gesagt hat, dass es einen neuen
  Schlüssel hat, tippe auf **Es hat einen neuen Schlüssel**: Erevos übernimmt dann den Schlüssel, den das Relay als
  nächsten gibt.

**Warum:** Das Zertifikat der Verbindung sagt nur, dass wer antwortet ein Zertifikat für den Namen des Relays hat, das
eine Firma, die Zertifikate ausstellt, auch jemand anderem geben kann, aus Versehen oder unter Zwang. Der eigene
Schlüssel des Relays liegt nur auf seinem Server, also kann sich niemand dazwischen als es ausgeben, und ein erneuertes
Zertifikat ändert nichts.

### Die Sicherheitsnummer

Öffne den Chat, tippe auf seinen Namen und dann auf **Sicherheitsnummer**. Beide Telefone zeigen dieselben 60 Ziffern
für euch beide. Vergleicht sie persönlich oder bei einem Anruf: Wenn sie übereinstimmen, ist niemand dazwischen. Wenn
sie sich unterscheiden, vertrau diesem Chat nicht und füge den Link erneut hinzu, direkt vom Telefon des Kontakts
gescannt. Sobald der Kontakt ein Gerät verknüpft hat, sagt sie auch, wann sich die Liste seiner Geräte zuletzt
geändert hat: Deine Nachrichten gehen auch an jede Stelle darin, also frag nach, wenn er da keines verknüpft oder
getrennt hat.

### Gesendet, angekommen und gelesen

Unter jeder deiner Nachrichten an einen Kontakt sagt **✓**, dass das Relay oder ein Telefon in der Nähe sie angenommen
hat, **✓✓**, dass sie auf seinem Telefon angekommen ist, und **✓✓✓**, dass er sie gelesen hat. Sein Telefon sagt es
deinem, innerhalb der Verschlüsselung, wenn jedes das nächste Mal beim Relay nachsieht, oder sofort, wenn ihr in der
Nähe seid. Eine Nachricht gilt als gelesen, sobald ihr Chat auf dem Bildschirm erscheint.

- **Wird gesendet…:** In dem Moment, in dem du auf Senden drückst, vibriert das Telefon kurz, das Feld leert sich, und
  die Nachricht erscheint, als **Wird gesendet…** markiert, bis das Relay oder das andere Telefon sie annimmt. Wenn sie
  weder gehen noch warten kann, kommen ihre Worte zurück ins Feld.
- **Wartet:** Eine Nachricht, die nichts annehmen konnte, weil das Relay nicht erreichbar und das andere Telefon nicht
  in der Nähe ist, bleibt im Chat als **Wartet** markiert und geht von selbst, der Reihe nach, sobald das Relay oder
  das andere Telefon in der Nähe sie annehmen kann, solange ein Bereich offen ist; dann zeigt sie **✓**. Ein Text
  wartet sofort. Eine Sprachnachricht, ein Foto oder eine Datei fragt zuerst: **Warten lassen** oder **Löschen**. Eine
  wartende Nachricht wird nur auf diesem Telefon gelöscht. In versteckten Chats wartet sie auch, geht aber nur über
  deren Relay, nie an das Telefon in der Nähe oder über LoRa: solange sie offen sind, oder, mit eingeschaltetem
  **Empfangen, wenn geschlossen**, solange der Bereich offen ist. Wenn die Warteschlange des Kontakts auf dem Relay
  voll ist, geht ein Text, eine Sprachnachricht, ein Foto oder eine Datei trotzdem an seine verknüpften Geräte, falls er
  welche hat, erscheint als gesendet und wird für sein Telefon erneut versucht, solange die versteckten Chats offen
  bleiben: Werden sie geschlossen, bevor sie gegangen ist, bekommt sein Telefon sie nie.
- **Später senden:** Halte den Sendepfeil gedrückt und wähle **Später…**, oder tippe auf **+** und dann auf
  **Später senden**. Wähle eine Zeit mit einem Tippen (**In 1 Stunde**, **Heute Abend 20:00**, **Morgen 09:00**) oder
  den Tag, die Stunde und Minuten, bis zu einem Jahr im Voraus, dann **Später senden**. Die Nachricht bleibt im Chat
  als **Geplant** markiert, mit ihrer Zeit. Sie geht verschlüsselt an das Relay, das sie aufbewahrt und zu dieser Zeit
  sendet, auch wenn dieses Telefon dann aus oder gesperrt ist, und das andere Telefon zeigt sie ab dieser Zeit, nicht
  früher. Ist gerade kein Relay erreichbar, wartet sie auf diesem Telefon und geht an das Relay, sobald eines
  erreichbar ist. Ohne eingegebenen Text gilt die gewählte Zeit für das nächste Foto, die nächste Datei oder
  Sprachnachricht: Ein Foto oder eine Datei geht sofort an dein Relay und bleibt dort, bis der Kontakt sie holt,
  höchstens 14 Tage nach ihrer Zeit. Versteckte Chats haben es auch, auf dieselbe Weise, über ihr Relay. Bis zu ihrer
  Zeit nimmst du sie durch Löschen vom Relay zurück, und sie geht nie. Sollte sich die Relay-Warteschlange des
  Kontakts vorher ändern, hinterlegt Erevos sie erneut für die neue, wenn es das nächste Mal das Relay erreicht.
  Mit einem eigenen Token dieses Telefons geht sie nur, wenn das Telefon dann noch seine Zeile auf diesem Relay hat.
  Eine Nachricht ohne Ton bleibt ohne Ton. Ein Relay von vor dieser Funktion hebt nichts für später auf: Dann wartet
  die Nachricht auf diesem Telefon und geht zu ihrer Zeit, solange Erevos läuft, auch im Hintergrund, solange
  **Im Hintergrund** auf **Empfangen und klingeln** steht (siehe unten), oder wenn Erevos das nächste Mal öffnet.
- **Ohne Ton senden:** Halte den Sendepfeil gedrückt und wähle **Ohne Ton**: Das andere Telefon zeigt die
  Benachrichtigung ohne Ton oder Vibration. Ein Erevos von vor dieser Funktion kennt das nicht und meldet sich wie
  gewohnt, und ebenso Erevos als Web-App, dessen Benachrichtigung vom Browser kommt. Ebenso die Benachrichtigung eines
  geschlossenen Platzes versteckter Chats mit eingeschaltetem **Melden, wenn eine Nachricht kommt** und eines
  geschlossenen Bereichs mit **Auch, wenn ein anderer Bereich offen ist**: Diese fragen das Relay nur, wie viele kamen,
  und es kann eine ohne Ton nicht von einer anderen unterscheiden, da nur die verschlüsselte Nachricht das sagt.
- **Links:** Eine Webadresse in einer Nachricht ist unterstrichen. Tippe darauf, und Erevos zeigt sie vollständig, um
  sie im Browser zu öffnen, nur wenn sie dorthin führt, wo du hinwillst. Vorher wird nichts abgerufen.
- **Aus einer anderen App teilen** (Android): Wähle im **Teilen** einer anderen App, etwa dem des Browsers für eine
  Seite, **Erevos**. Sobald ein Bereich offen ist, listet **Senden an** die Chats, Gruppen und SMS-Unterhaltungen, die
  der Startbildschirm zuletzt zeigte, dann jeden anderen Chat und jede Gruppe, mit einer Suche; nie versteckte Chats.
  Wörter und Links öffnen sich im Nachrichtenfeld des gewählten Chats, um sie dort zu lesen und zu senden; ein Foto oder
  eine Datei (höchstens 100 MB) geht, sobald sich dieser Chat oder diese Gruppe öffnet, ein Foto in der Qualität, die
  du für Fotos gewählt hast, und nie als SMS. Bis dahin wartet die Kopie im eigenen Speicher von Erevos auf dem
  Telefon und verschwindet, sobald sie gesendet ist oder wenn du **Senden an** verlässt.
- **Der Kontakt sieht, wann du liest:** Dein Telefon sagt es seinem, wie seines es deinem sagt, außer dieser Chat
  erscheint offline (siehe unten).
- **Wann Nachrichten kommen:** Erevos schaut alle paar Sekunden beim Relay nach, solange es offen und entsperrt ist, auf
  jedem Bildschirm, und der Startbildschirm schiebt den Chat von selbst nach oben. Auf Android klingt jede neue
  Nachricht, mit einer Benachrichtigung, die nur sagt, wie viele kamen, auch während Erevos sichtbar ist; im Chat oder
  in der Gruppe, die auf dem Bildschirm offen ist, spielt nur der Ton, und das Öffnen eines Chats nimmt, was dort kam,
  aus der Zählung. Tippen und dass eine Nachricht ankam oder gelesen wurde, machen keinen. Auf Android geht es auch
  im Hintergrund weiter, solange **Im
  Hintergrund** auf **Empfangen und klingeln** steht (siehe unten): Dort wartet es beim Relay, bis etwas kommt, jeweils
  eine Minute, statt alle paar Sekunden zu fragen, und fragt nichts weiter, wenn nichts kam, damit der Akku hält, und
  eine Benachrichtigung sagt nur, wie viele Nachrichten kamen. Geschlossen, gesperrt oder sonst lange im Hintergrund
  tut es das nicht: Nachrichten warten auf dem Relay, bis zu 14 Tage, und kommen, sobald Erevos wieder öffnet. Eine
  Frage an das Relay ohne rechtzeitige Antwort (ein Warten dort seine Minute und eine halbe Minute mehr, alles andere
  45 Sekunden, ein Teil einer Datei 2 Minuten) gilt als fehlgeschlagen und wird erneut gestellt, sodass eine
  Verbindung, die unterwegs abgerissen ist, etwa wenn das Netz des Telefons schläft oder wechselt, nichts aufhält.

### Online, und offline erscheinen

Solange der Chat eines Kontakts auf deinem Bildschirm offen ist, fragt Erevos sein Telefon ab und zu, ob es offen ist,
und sagt, dass deines es ist. Wenn seines es ist, sagt der Chat **Online** unter seinem Namen, mit einem grünen Punkt,
und der Startbildschirm zeigt den Punkt auf seinem Bild. Jemandem zu schreiben zeigt dich ihm auch für zwei Minuten
als online. All das geht innerhalb der Verschlüsselung, nur zwischen dir und diesem Kontakt: Das Relay sieht ab und zu
eine Nachricht, wie bei jedem Chat. Es gibt kein „zuletzt online“.

Während du einem Kontakt schreibst, der online erscheint, zeigt sein Chat **schreibt…** unter deinem Namen für ein
paar Sekunden, und deiner unter seinem, wenn er schreibt. Das wird höchstens alle paar Sekunden gesagt, nur solange er
online erscheint, nie an eine Nachrichtenanfrage und nicht in Gruppen.

**Warum:** Online-Sein wird nur zwischen dir und einem Kontakt gesagt, dessen Chat offen ist, innerhalb der
Verschlüsselung, also sieht das Relay nicht mehr als ab und zu eine Nachricht zwischen zwei Leuten, die reden, und
nichts davon wird aufbewahrt: Deshalb gibt es kein „zuletzt online“ zu zeigen. Jemand, der nur deinen Link hat und als
Nachrichtenanfrage schreibt, hört nichts zurück, bis du annimmst: weder dass du liest noch dass du online bist oder
schreibst.

Um es vor einem Kontakt zu verbergen, öffne seinen Chat, tippe auf seinen Namen und dann auf **Offline erscheinen**.
Wenn es an ist:

- **Er sieht dich nicht online** und auch nicht, dass du schreibst, und dein Telefon sendet ihm nichts, während du
  liest.
- **Seine Nachrichten bleiben ✓** auf seinem Telefon, nicht ✓✓ oder ✓✓✓, während du sie liest.
- **Wenn du ihm schreibst**, erscheinst du zwei Minuten lang online, und jede seiner Nachrichten, die du gelesen hast,
  wird sofort ✓✓✓.
- **Du siehst ihn auch nicht online**, da dein Telefon nicht fragt.

Es wird für jeden Chat eingestellt, nur auf diesem Telefon. Schalte es wieder aus, und er sieht, was du gelesen hast,
wenn du das nächste Mal beim Relay nachsiehst.

### Namen und Löschen

Öffne einen Chat, tippe auf seinen Namen und dann auf **Umbenennen**, um ihm einen Namen zu geben. Der Name bleibt auf
diesem Telefon, versiegelt mit dem Chat: Das andere Telefon sieht ihn nicht. Ein leerer Name bringt den Anfang des
Schlüssels zurück, außer einer deiner Kontakte ist mit dem Chat verknüpft: Dann übernimmt er dessen Namen wieder, wenn
sich seine Karte das nächste Mal öffnet, während die Verknüpfung bleibt (siehe [Kontakte](#contacts)).

Tippe auf seinen Namen und dann auf **Bild**, um ihm ein Bild deiner eigenen Wahl zu geben, ein Zeichen auf einer
Farbe, statt des aus seinem Schlüssel gezeichneten. Oder tippe auf **Foto** (oder **Foto aufnehmen**) für ein Foto:
quadratisch zugeschnitten, verkleinert und neu gezeichnet, sodass nichts, was es außer seinem Bild sagte (ein Ort, ein
Telefon), aufbewahrt wird, dann in einer eigenen Datei versiegelt. Auch es bleibt auf diesem Telefon und kommt mit in
Backups; **Bild aus dem Schlüssel** bringt das gezeichnete zurück.

Jeder Chat kann auch sein eigenes Aussehen haben: Tippe auf seinen Namen und dann auf **Chat-Aussehen** für dieselbe
Auswahl wie unter **Darstellung** (Stil, Thema, Farben, Hintergrund, Nachrichten), nur für diesen Chat. Wie der Name
bleibt es auf diesem Telefon, versiegelt mit dem Chat. **Wie die App** gibt ihm wieder das Aussehen der App.

Um einen Chat außerhalb von Erevos aufzubewahren, tippe auf seinen Namen und dann auf **Chat exportieren**: Seine
Nachrichten kommen in eine Textdatei, jeder Tag unter seinem Datum und jede Nachricht mit ihrer Zeit und wer sie
geschrieben hat, gespeichert in dem Ordner, den du wählst (auf einem Computer, wo du willst). Die Datei ist nicht
verschlüsselt: Jeder, der sie hat, oder jede App, die diesen Ordner liest, kann sie lesen. Fotos, Dateien und
Sprachnachrichten werden nur genannt, verschwindende Nachrichten werden weggelassen, und versteckte Chats werden nicht
exportiert, damit keine Datei außerhalb von Erevos zeigt, dass es sie gibt.

**Warum:** Eine verschwindende Nachricht wird weggelassen, und ebenso ein Zitat daraus, da wer sie gesendet hat
wollte, dass sie verschwindet, nicht dass sie in einer Datei bleibt.

Um eine Nachricht zu löschen, halte sie gedrückt und tippe auf **Löschen**. Um alle Nachrichten eines Chats zu
löschen, tippe auf seinen Namen und dann auf **Nachrichten löschen**.
In beiden Fällen fragt Erevos, wo:

- **Dieses Telefon:** nur hier. Das andere Telefon behält seine eigenen.
- **Beide Telefone:** Das andere Telefon löscht sie auch, wenn es das nächste Mal beim Relay nachsieht. Sein Erevos
  tut das, aber eine veränderte App, ein Screenshot oder eine Kopie kann sie trotzdem behalten.

### Einen Kontakt löschen und blockieren

Tippe auf den Namen eines Chats und dann auf **Kontakt löschen**, um ihn zu vergessen: Sein Chat verschwindet von
diesem Telefon, und Erevos gibt dir sofort eine neue Relay-Warteschlange. Deine anderen Kontakte erfahren sie still, in
einer Nachricht ohne Inhalt, und erneut 7, 14 und 21 Tage später, solange sie nicht in die neue geschrieben haben; was
sie inzwischen in die alte geschrieben haben, erscheint noch 14 Tage lang. Der gelöschte Kontakt erfährt nichts, und
nichts, was er dorthin schickt, erscheint. Dein Kontaktlink bleibt, wie er war, also kann er damit weiterhin bitten,
wieder zu reden, als Nachrichtenanfrage, wie jeder, der ihn hat.

**Warum:** Alle deine Kontakte schreiben in deine eine Warteschlange, also weiß jeder, den du löschst, noch, wo sie
ist; sobald sie umzieht, kann er dir dort nicht mehr schreiben, und wer den Müll unten geschickt hat, auch nicht. Dein
Kontaktlink nennt eine eigene Warteschlange, die eine Löschung in Ruhe lässt, also funktioniert jeder Link und QR-Code,
den du gegeben hast, weiter.

**Eine Warteschlange für jeden Kontakt:** Auf einem dafür aktualisierten Relay schreibt jeder Kontakt in eine eigene
Warteschlange, die nur er kennt und die innerhalb deiner verschlüsselten Nachrichten mitgeteilt wird; die Warteschlange
deines Kontaktlinks ist dann nur für erste Nachrichten da. So kann das Relay nicht daran erkennen, wohin Nachrichten
gehen, dass zwei Kontakte an dasselbe Telefon schreiben, und jemanden zu löschen oder zu blockieren löscht nur seine
Warteschlange: Deine eigene zieht nur um, wenn er sie auch kannte, wie Kontakte von vorher sie kennen, und jemand, der
vor ihrem ersten Umzug über deinen Kontaktlink kam. Kontakte von vorher bekommen nach und nach ebenfalls eine eigene,
ein paar auf einmal, still, und auch ein älteres Erevos von ihnen übernimmt sie. Diese Warteschlangen werden ohne
Token gelesen, also verbindet das Token, das dein Telefon nennt, sie nicht miteinander; über Tor acht auf einmal, je
acht über eigene Circuits. Sie werden aber mit dem Token angelegt und gelöscht, also kann ein Relay, das Logs führt,
sie dann miteinander verbinden. Versteckte Chats und verknüpfte Computer behalten vorerst eine Warteschlange für alle.
Die Web-App hat kein Tor, also wartet sie, solange sie offen ist, an allen Warteschlangen deiner Kontakte zusammen, von
einer Adresse aus; mit eingeschalteten Benachrichtigungen, wenn geschlossen, hat dein Relay außerdem eine Push-Adresse
für alle Warteschlangen deiner Kontakte (siehe [Auf einem iPhone](#iphone)).

- **Kontakt blockieren**, darunter, macht dasselbe und verwirft außerdem, was er später schickt, auch eine Anfrage.
  **Blockieren**, neben **Ablehnen**, blockiert eine Nachrichtenanfrage: Eine Anfrage kennt nur deinen Kontaktlink,
  also zieht sie deine Warteschlange nur um, solange der Link noch diese nennt, wie bis zu deinem ersten Umzug. Wen du
  blockiert hast, steht unter **Blockierte Kontakte** in **Neuer Chat**, mit **Blockierung aufheben**. Wenn du ihn
  über seinen Link wieder hinzufügst, wirst du gebeten, zuerst die Blockierung aufzuheben; bis dahin fügt ihn nichts
  hinzu, weder seine Antwort auf eine Einladung per SMS noch sein Kontaktlink in einer Gruppe. Jeder, der dir über
  deinen Kontaktlink schreibt, kann das Telefon einen Ton machen lassen, wie jede Nachricht: **Ablehnen** oder
  **Blockieren** beendet das für diesen einen, **Benachrichtigungen** → **Stumm** in seinem Chat bringt ihn zum
  Schweigen, ohne abzulehnen, und **Neuer Kontaktlink** beendet es für jeden mit dem alten Link, sobald dessen 14 Tage
  vorbei sind.
- **Gruppen:** Jemand in einer deiner Gruppen kann dir dort weiterhin schreiben. Erevos sagt, in wie vielen ihr
  zusammen seid: Verlass sie oder bitte ihren Admin, ihn hinauszunehmen.
- **Wenn das Relay nicht erreichbar ist**, ändert sich die Warteschlange, sobald es antwortet, und bis dahin erscheint
  nichts, was er schickt.
- **Geplante Nachrichten**, die du für ihn hattest, werden vom Relay zurückgenommen, sofort oder sobald es antwortet,
  sodass sie nie gehen.
- **Müll:** Wenn sich deine Warteschlange mit etwas füllt, das für niemanden hier ist, gibt dir Erevos auf dieselbe
  Weise eine neue und sagt es, höchstens einmal am Tag. Wenn Müll die Warteschlange füllt, die dein Kontaktlink nennt,
  bekommst du stattdessen einen neuen Link. Eine Flut erfundener Nachrichtenanfragen zählt auch als Müll, während ein
  Schwung echter trotzdem ankommt.
- **Neuer Kontaktlink**, neben **Meinen Kontaktlink teilen**, gibt dir einen neuen Link: Die Links und QR-Codes, die
  du vorher gegeben hast, funktionieren noch 14 Tage, dann nicht mehr. Deine Kontakte sind nicht betroffen. Sollte das
  Relay die Warteschlange verlieren, die dein Link nennt, bekommst du auf dieselbe Weise einen neuen Link, aber die
  vorher gegebenen funktionieren sofort nicht mehr.
- **Auf einem verknüpften Computer** geht es an das Telefon, das ihn ebenfalls löscht oder blockiert und seine
  Warteschlangen umziehen lässt, auch die des Computers. Das Telefon merkt sich, wer blockiert ist, und sagt es dem
  Computer: Wenn du ihn dort über seinen Link hinzufügst, wirst du auch gebeten, die Blockierung aufzuheben, und
  **Blockierung aufheben** hebt sie auch auf dem Telefon auf.
- **In versteckten Chats** ziehen nur die Warteschlangen dieses Platzes um, seine Klingel-Warteschlange sofort, damit
  der gelöschte Kontakt das Telefon nicht mehr klingeln lassen kann. Nichts vom Bereich oder den anderen Plätzen zieht
  um.

**Löschen** auf der Kontaktkarte (siehe [Kontakte](#contacts)) nimmt nur die Karte weg, nicht den Chat. Ein Backup,
das vor einer Löschung oder Blockierung gemacht wurde, bringt diesen Kontakt zurück: Lösche oder blockiere ihn nach
dem Wiederherstellen erneut. Nach dem Wiederherstellen sagt deine Warteschlange, dass sie neuer ist als jede, die deine
Kontakte kennen, und jeder erfährt sie erneut, damit alle dorthin schreiben, wo du liest.

### Das Menü einer Nachricht

Halte eine Nachricht gedrückt, um ihr Menü zu öffnen: die Reaktionen oben, dann was du mit ihr tun kannst.

- **Reaktionen:** Tippe auf eine, oder auf **+** für mehr. Sie erscheint unter der Nachricht auf beiden Telefonen,
  deine hervorgehoben; tippe erneut darauf, um sie zurückzunehmen. Jeder von euch hat eine Reaktion pro Nachricht. Sie
  geht sofort oder gar nicht: Wenn weder das Relay noch das andere Telefon in der Nähe sie annehmen kann, ändert sich
  nichts.
- **Antworten:** Deine nächste Nachricht antwortet darauf und zeigt sie zitiert über deinen Worten, auf beiden
  Telefonen. Tippe auf das Zitat, um zu der Nachricht zu gehen, auf die sie antwortet; **✕** verwirft es. Ein Erevos
  von vor dieser Funktion zeigt die Antwort ohne das Zitat.
- **Weiterleiten:** sendet eine Kopie davon in einen anderen Chat: Wähle einen Kontakt oder eine Gruppe. Ihre Worte,
  ihr Sticker oder Ort gehen neu, eine Umfrage als neue ohne Antworten, und der Ton einer Sprachnachricht oder die
  Bytes eines Fotos oder einer Datei werden neu gesendet, mit einem neuen Schlüssel verschlüsselt, sodass nichts die
  Kopie mit der Nachricht verbindet, von der sie stammt. Unter der Kopie steht **Weitergeleitet**, nicht woher; ein
  Erevos von vor dieser Funktion zeigt sie ohne das. Eine verschwindende Nachricht
  wird nicht weitergeleitet, und aus versteckten Chats geht eine Nachricht nur in dieselben versteckten Chats.
- **Mit Stern markieren:** markiert sie, nur auf diesem Telefon, um sie wiederzufinden: **Markierte Nachrichten** im
  Menü des Startbildschirms listet sie aus all deinen Chats, und die Details eines Chats listen seine eigenen. Ein
  Tippen geht zur Nachricht. Die markierten Nachrichten versteckter Chats erscheinen nur in den Details ihrer Chats.
- **Anheften:** heftet sie oben im Chat an, auf beiden Telefonen; jeder von euch kann sie mit **Loslösen** lösen. Sind mehrere
  angeheftet, erscheint die neueste; tippe darauf, um zu ihr zu gehen, und die nächste erscheint.
- **Kopieren:** legt ihre Worte in die Zwischenablage, um sie in einer anderen App einzufügen. Auf Android ist die
  Kopie als privat markiert, damit die Benachrichtigung des Telefons darüber die Worte nicht zeigt, aber jede App, die
  die Zwischenablage liest, kann sie lesen.
- **Bearbeiten:** für eine deiner Nachrichten, bis zu einem Tag nach dem Senden. Ihre Worte kommen ins Feld unter
  **Nachricht bearbeiten**: Ändere sie und sende, oder **✕**, um sie zu lassen, wie sie war. Beide Telefone zeigen die
  neuen Worte, mit **Bearbeitet** neben der Uhrzeit. Nur Worte werden bearbeitet, kein Sticker, kein Ort, keine
  Umfrage, keine Sprachnachricht, kein Foto und keine Datei, auch keine Worte, die du weitergeleitet hast. Eine, die
  noch darauf wartet zu gehen, geht mit den neuen Worten, ohne Markierung; eine für später gesendete wird nicht
  bearbeitet. Die Bearbeitung geht sofort oder gar nicht, wie eine Reaktion, und deine verknüpften Geräte zeigen sie
  auch. Ein Erevos von vor dieser Funktion behält die alten Worte.
  **Warum:** Ein Tag ist Zeit genug, um einen Fehler zu berichtigen, und niemand kann ändern, was er vor Tagen gesagt
  hat. Die Markierung zeigt, dass die Worte nicht die ersten sind.
- **Löschen:** auf diesem Telefon oder auf beiden, wie oben.

Reaktionen, Antworten, Anheftungen und Bearbeitungen reisen innerhalb der Verschlüsselung, wie die Nachrichten.

### Verschwindende Nachrichten

Öffne einen Chat, tippe auf seinen Namen und dann auf **Verschwindende Nachrichten**, um zu wählen, wie lange seine
neuen Nachrichten nach dem Lesen bleiben: 5 Minuten, 1 Stunde, 1 Tag oder 1 Woche. Um nur die nächste Nachricht
verschwinden zu lassen, tippe auf die Stoppuhr neben dem Nachrichtenfeld (oder auf **Verschwindende Nachricht** unter
**+**, oder auf **Verschwinden** im Menü des Sendepfeils): **Verschwindet 1 Stunde nach dem Lesen** erscheint über dem
Feld. Tippe auf die Zeit, um eine andere zu wählen, oder auf **✕**, um es auszuschalten. Es gilt für die nächste
Nachricht, die du sendest: Worte, eine Sprachnachricht, ein Foto oder eine Datei, einen Sticker, einen Ort oder eine
Umfrage, jetzt oder später. Eine SMS kann nicht verschwinden: Als SMS gesendet, bleibt sie auf beiden Telefonen
(Erevos sagt das vorher), und die Stoppuhr ist wieder aus. Ihre Zeit beginnt, wenn das andere Telefon sie auf dem
Bildschirm zeigt, und die deiner Kopie, wenn sein Telefon das meldet
(**✓✓✓**). Jede Nachricht sagt, wann sie verschwindet. Das andere Telefon erfährt die Einstellung des Chats, wenn es
das nächste Mal beim Relay nachsieht, und jedes Telefon kann sie ändern: Die spätere Änderung gewinnt. Nachrichten, die
schon im Chat sind, bleiben.

- **Bis sie gelesen ist,** bleibt eine verschwindende Nachricht auf beiden Telefonen, versiegelt wie der Rest. Wenn
  das Erevos des Kontakts nie meldet, dass es sie gelesen hat, bleibt deine Kopie.
- **Solange Erevos geschlossen ist:** Eine Nachricht, deren Zeit gekommen ist, wird gelöscht, wenn sich der Chat das
  nächste Mal öffnet. Bis dahin bleibt sie auf dem Telefon, versiegelt wie der Rest.
- **Keine Garantie:** Das Erevos des Kontakts löscht sie, aber eine veränderte App, ein Screenshot oder eine Kopie kann
  sie trotzdem behalten.

### Benachrichtigungen für diesen Chat

Öffne auf Android einen Chat, tippe auf seinen Namen und dann auf **Benachrichtigungen**; in einer Gruppe tippe auf
ihren Namen (in einer öffentlichen Gruppe auf **⋯**) und dann auf **Benachrichtigungen**. **Stumm** für 8 Stunden,
1 Woche oder **Immer**: Seine Nachrichten machen keinen Ton und zeigen keine Benachrichtigung, also zählt sie auch das
Symbol von Erevos nicht; die Liste zeigt sie weiter, mit einer durchgestrichenen Glocke, und seine Anrufe klingeln
weiter. **Nachrichtenton** und **Klingelton** geben ihm einen eigenen Ton für seine Nachrichten und für seine Anrufe,
aus Androids eigener Liste von Tönen, oder **Ohne Ton**. In den Details eines Chats sagt die Zeile dann **Stumm bis**
und die Uhrzeit, oder **Eigene Töne**.

**Warum:** Ein stummer Chat zählt in der Liste weiter, damit nichts verloren geht, was kam: Nur das Telefon ruft dich
nicht mehr zu ihm. Seine Töne bleiben nur auf diesem Telefon, mit dem Chat in den verschlüsselten Daten des Bereichs,
weil jedes Telefon seine eigenen Töne hat: Ein verknüpftes Gerät behält seine eigenen, und das andere Telefon erfährt
nichts davon.

- **In versteckten Chats** gibt es nur **Stumm**: Ein eigener Ton würde jedem in der Nähe verraten, welcher Chat es ist.
- **Ein geschlossener Bereich, und versteckte Chats, solange sie geschlossen sind,** wissen nicht, in welchem Chat eine
  Nachricht kam, und melden sie so, wie es die Einstellungen der App sagen.
- **Nur auf Android**, vorerst: Die Web-App meldet jeden Chat so, wie es ihre Einstellungen sagen.

### Sprachnachrichten

Halte im Chat eines Kontakts, ohne eingegebenen Text, das Mikrofon am Ende der Nachrichtenleiste gedrückt, während du
sprichst, und lass los, um zu senden; wische vor dem Loslassen nach links, um sie stattdessen zu verwerfen. Ein Druck
von unter einer Sekunde gilt als Versehen und sendet nichts. Nach einer Minute sendet sie sich von selbst. Beim ersten
Mal fragt Android, ob Erevos das Mikrofon nutzen darf: Es nimmt nur auf, solange du es gedrückt hältst. Mit TalkBack
tippst du einmal, um zu beginnen, und noch einmal, um zu senden. Tippe auf eine Sprachnachricht, um sie abzuspielen,
und noch einmal, um sie anzuhalten. Sprachnachrichten haben dieselben Zeichen wie der Rest und folgen der
Verschwinden-Einstellung des Chats.

**Warum:** Auf einem Telefon ist eine Sprachnachricht AAC mit 64 kbit/s, etwa 480 KB pro Minute: so klar, wie Sprache
nur sein kann. Mehr wäre in einer Stimme nicht zu hören, würde aber langsamer gesendet, vor allem über Bluetooth.

- **Über das Relay oder in der Nähe,** Ende-zu-Ende-verschlüsselt wie die Worte, in mehreren Stücken. Niemand
  dazwischen kann sie hören, aber an den Stücken kann das Relay, oder wer in der Nähe mithört, erkennen, dass etwas
  Langes gesendet wurde, und ungefähr wie lang. In der Nähe gehen sie nur an das Telefon eines Kontakts, von dem
  bekannt ist, dass es in der Nähe ist.
- **Auf dem Telefon** wird jeder Ton in einer eigenen Datei aufbewahrt, versiegelt mit einem eigenen Schlüssel, den
  nur der versiegelte Verlauf des Chats enthält. Wenn die Nachricht verschwindet, ob gelöscht, verschwunden oder als
  älteste entfernt, verschwindet auch ihre Datei. Wie viele dieser Dateien es gibt und wie groß sie sind, zeigt
  ungefähr, wie viele Sprachnachrichten das Telefon aufbewahrt, in all seinen Bereichen zusammen, nicht in welchem.
- **Während sie abgespielt wird,** liegt der Ton entsiegelt im Cache von Erevos und wird gelöscht, sobald er endet.
  Wenn Erevos geschlossen wird, während es aufnimmt oder abspielt, verschwindet, was übrig blieb, wenn sich das nächste
  Mal ein Chat öffnet.

### Fotos und Dateien

Tippe im Chat eines Kontakts auf **+** neben dem Nachrichtenfeld, das sich dort öffnet, wo die Tastatur war, dann auf
**Foto**, um eines aus den Fotos des Telefons zu wählen, auf **Kamera**, um eines aufzunehmen, oder auf **Datei** für
alles andere, bis zu 100 MB. Darunter legt **Fotoqualität** fest, wie Fotos gehen, und
Erevos merkt es sich:

- **Original** (die Voreinstellung): das Foto genau so, wie es war, in voller Größe, ohne Qualitätsverlust. Nur, was es
  außer seinem Bild sagt, wird entfernt: wo es aufgenommen wurde, das Telefon, die Zeit, Vorschaubilder. Sein Name ist
  einfach „photo“.
- **90%** und **75%:** ein neues, kleineres Foto, schneller zu senden, das nichts außer seinem Bild sagt.

Fotos und Dateien des Kontakts bis 16 MB kommen von selbst; tippe auf ein größeres, um es zu holen. Tippe auf ein
Foto, um es auf dem ganzen Bildschirm zu sehen, mit seiner Größe: Zwei Finger oder zweimal Tippen zoomen hinein, ein
Finger verschiebt es, solange es gezoomt ist, und einmal Tippen blendet aus oder ein, was darum ist. Tippe auf eine
Datei, um sie zu speichern. Erevos dreht sich mit dem Telefon, solange dort **Automatisch drehen** an ist, und ein
allein gezeigtes Foto dreht sich auch, wenn es aus ist. **Speichern** legt eine Kopie in einen Ordner, den du beim
ersten Mal wählst, und **In anderem Ordner speichern** ändert ihn. Fotos und Dateien haben dieselben Zeichen wie der
Rest und folgen der Verschwinden-Einstellung des Chats.

- **Wie sie reisen:** Jede Datei wird auf dem Telefon mit einem eigenen Schlüssel verschlüsselt, in Stücken gleicher
  Größe, und auf dein Relay gelegt. Nur wo die Stücke sind und der Schlüssel gehen an den Kontakt,
  Ende-zu-Ende-verschlüsselt. Sein Telefon holt die Stücke über sein eigenes Relay, sodass dein Relay nie die Adresse
  seines Telefons sieht, prüft jedes Stück und löscht sie dann vom Relay. Stücke, die niemand holt, werden nach 14
  Tagen gelöscht.
- **Was das Relay sieht:** wie viele Stücke es gibt und wie groß sie sind, also ungefähr wie groß die Datei ist, und
  wann. Nicht, was sie ist oder für wen.
- **Eine Datei geht so, wie sie ist,** mit allem, was sie in sich sagt: der Autor eines Dokuments, oder Ort und Telefon
  eines Fotos, wenn du es mit **Datei** sendest. Sende Fotos mit **Foto**.
- **Auf dem Telefon** wird jede Datei in ihren Stücken aufbewahrt, so wie sie gereist sind, versiegelt mit einem
  eigenen Schlüssel, den nur der versiegelte Verlauf des Chats enthält. Wenn die Nachricht verschwindet, verschwinden
  auch ihre Stücke. Wie viele Stücke es gibt, zeigt ungefähr, wie viel das Telefon aufbewahrt, in all seinen Bereichen
  zusammen, nicht in welchem. Ein Foto wird aus dem Arbeitsspeicher gezeigt, nie entsiegelt herausgeschrieben. Die
  Fotoauswahl des Telefons übergibt eine Kopie im Cache von Erevos, die nach dem Lesen gelöscht wird, und ein hier
  aufgenommenes Foto wird nicht in den Fotos des Telefons aufbewahrt.
- **Gespeicherte** Fotos und Dateien sind außerhalb von Erevos, nicht versiegelt: Jeder mit dem Telefon kann sie
  öffnen.
- **Nur über das Relay:** Dateien brauchen seinen Dateispeicher, auch wenn der Kontakt in der Nähe ist. Ein Relay, das
  älter ist als diese Version, kann keine Dateien annehmen: Aktualisiere es.

### Mehr unter +

Unter **+** gibt es mehr zu senden als Fotos und Dateien (der Smiley am Ende des Nachrichtenfelds öffnet auch die
Sticker):

- **Sticker:** einer der 528 in Erevos eingebauten Sticker, in 22 Sätzen zu 24 (darunter **Monde**, **Hunde**,
  **Griechenland**, **Worte** und **Leckereien**), von jedem Telefon selbst gezeichnet: Nur sein Name reist, also wird
  nie etwas heruntergeladen. Ein Erevos von vor dieser Funktion zeigt stattdessen sein Emoji. Alle außer den Worten und
  den Leckereien bewegen sich ein paar Sekunden lang ein wenig, wenn sie ankommen und wenn man auf sie tippt, dann
  ruhen sie; mit eingeschalteter Bewegungsreduzierung des Telefons bleiben sie still. Die Worte erscheinen in der
  Sprache der App.
- **Meine**, unter den Stickern, enthält die, die du aus Fotos machst. **Neuer Sticker aus einem Foto** schneidet einen
  quadratisch zu, verkleinert ihn (512 mal 512, höchstens etwa 100 KB) und behält nur sein Bild, nichts davon, wo oder
  womit es aufgenommen wurde. Er wird versiegelt im Bereich aufbewahrt, oder in den versteckten Chats, in denen er
  gemacht wurde, und erscheint nur dort, bis zu 100 davon; halte einen gedrückt, um ihn zu löschen. Wie der Rest kommt
  er versiegelt in ein Backup und nie auf die anderen Geräte des Kontos. Er geht, wie ein Foto geht,
  Ende-zu-Ende-verschlüsselt über das Relay, als Sticker markiert, sodass er für sich ohne Blase erscheint; ein Erevos
  von vor dieser Funktion zeigt ihn als Foto. Halte einen Sticker, den dir jemand geschickt hat, gedrückt und tippe auf
  **Zu meinen Stickern hinzufügen**, um ihn zu behalten.
- **Standort** (auf Android): sendet, wo du bist, einmal, als Ort. Beim ersten Mal fragt Android, ob Erevos den Standort
  nutzen darf. Das Telefon sucht auf allen Wegen, die es hat, zugleich: per Satellit, wenn du den genauen Standort erlaubt
  hast, und über seinen Netzwerkstandort, der auf vielen Telefonen Google oder den Hersteller des Telefons fragt. Sofort
  öffnet sich ein Blatt, das sagt, dass es sucht; in Gebäuden, wo die Satelliten schwer zu sehen sind, kann das bis zu
  einer Minute dauern. Kommt nichts rechtzeitig, bietet es den Ort an, den das Telefon in den letzten zehn Minuten
  gefunden hat, und sagt, wie lange das her ist, oder es sagt, warum keiner gefunden wurde, mit **Erneut versuchen** und
  dem Bildschirm des Telefons, der das ändert. Erevos sucht nur, wenn du tippst, zeigt dir den Ort, bevor er geht, und
  folgt dir danach nicht. Die Nachricht enthält nur die Koordinaten, Ende-zu-Ende-verschlüsselt; in Erevos wird keine
  Karte geladen. **In Karten öffnen** übergibt den Ort an deine Karten-App, die ihre Karte aus dem Internet laden kann.
  Ein Erevos von vor dieser Funktion zeigt die Koordinaten als Worte.
- **Umfrage:** eine Frage mit zwei oder mehr Optionen, bis zu 12, und, mit **Mehrere Antworten**, mehr als einer zur
  Wahl. Tippe auf eine Option, um sie zu wählen, noch einmal, um sie zurückzunehmen; jede Option zeigt, wie viele sie
  gewählt haben, und wer. Stimmen reisen innerhalb der Verschlüsselung, wie Reaktionen. Ein Erevos von vor dieser
  Funktion zeigt die Frage und ihre Optionen als Worte, um in Worten zu antworten.

**Warum:** Ein aus dem Internet geholtes Sticker-Paket würde einem Server sagen, dass dieses Telefon Erevos hat, also
sind die Sticker eingebaut und nur ihre Namen reisen. Deine eigenen sind in einem versiegelten Wert gleicher Größe für
jeden Bereich und jeden versteckten Platz aufgelistet, ob genutzt oder nicht, sodass eine Liste in Gebrauch aussieht
wie eine, die es nicht ist: 100 ist, was er fasst. Ein Ort wird nur von Android gesendet: Auf einem Computer oder in
der Web-App würde der Browser einen Dienst von außen fragen, wo er ist.

### Linkvorschauen

Ein Link in einer Nachricht ist unterstrichen und öffnet sich erst, wenn du darauf tippst und es bestätigst. Mit
eingeschalteten **Linkvorschauen**, in den Details eines Chats, geht ein Link, den du sendest, mit seiner Vorschau: Beim
Senden ruft dieses Telefon die Seite ab und nimmt ihren Titel, eine Zeile darüber und ein kleines Bild, und sie gehen
in der Nachricht mit, Ende-zu-Ende-verschlüsselt. Das empfangende Telefon ruft nichts ab: Es zeigt, was ankam. Es ist
aus, solange du es nicht einschaltest, und dann ist es für alle Chats des Bereichs an; jeder Platz versteckter Chats
hat einen eigenen Schalter, in den Details eines Chats dort.

**Warum:** Nur das Telefon des Absenders ruft die Seite ab, sodass das Telefon, das einen Link bekommt, keine Seite
aufruft, die jemand anderes gewählt hat, und dieser Seite nichts von sich zeigt, nicht einmal seine Adresse.

- **Die Seite sieht die Internetadresse dieses Telefons**, und wann, wie sie es von einem Browser sähe, aber nicht, für
  wen die Nachricht ist. Über Tor sendet Erevos nur seine Relay-Anfragen, keine Seiten, also werden, solange alles im
  Bereich über Tor geht (**Alles** unter Tor), überhaupt keine Vorschauen gemacht.
- Erevos auf einem Computer macht keine, zeigt aber die, die ankommen, trotzdem.
- **Über LoRa**, das nur wenig nimmt, geht eine Nachricht lieber ohne ihre Vorschau, als zu warten, und behält hier
  keine.
- Eine Vorschau ist das, was die Seite über sich selbst sagt, ob wahr oder nicht. Ein Erevos von vor dieser Funktion
  zeigt den Link ohne sie.

### Sprach- und Videoanrufe

Tippe im Chat eines Kontakts oben auf den grünen Hörer für einen Sprachanruf oder auf die blaue Kamera daneben für
einen Videoanruf. Beim ersten Mal fragt Android, ob
Erevos das Mikrofon nutzen darf, und für Video die Kamera. Das andere Telefon klingelt, solange Erevos dort offen ist,
auf jedem Bildschirm des Bereichs: Dort tippt man auf **Annehmen** oder **Ablehnen**. Während des Anrufs kannst du das
Mikrofon stummschalten, den Lautsprecher umschalten, deine Kamera ausschalten, zwischen Front- und Rückkamera wechseln
und **Auflegen**. Jeder Anruf hinterlässt eine Zeile im Chat, etwa wie lange er dauerte, oder einen verpassten Anruf.

**Ein normaler Anruf im Mobilfunknetz:** Wenn mit einem Kontakt seine Telefonnummer verknüpft ist oder er mit einem
deiner Kontakte mit Nummer verbunden ist (**Mit einem meiner Kontakte verknüpfen** in seinem Chat, eine Mobilnummer
zuerst), öffnet das orange Tastenfeld oben in seinem Chat, vor der Kamera, ein Tastenfeld mit dieser Nummer
eingegeben, und ebenso das oben in einer SMS-Unterhaltung. Es ist das **Telefon** von Erevos, wenn Erevos die
Telefon-App ist, sonst das eigene des Telefons: Tippe dort auf die Anruftaste. Ein solcher
Anruf geht über das Netz der Telefongesellschaft und ist nicht verschlüsselt, wie eine normale SMS es nicht ist.
Versteckte Chats und Computer haben das nicht.

- **Ende-zu-Ende-verschlüsselt:** Der Anruf wird mit Nachrichten über das Relay aufgebaut, verschlüsselt wie der Rest.
  Diese tragen den Schlüssel, der den Anruf selbst verschlüsselt, sodass niemand dazwischen mithören kann, nicht einmal
  das Anruf-Relay unten.
- **Über das Anruf-Relay:** Ein mit dem Bausatz in \`deploy/relay\` eingerichtetes Relay hat ein Anruf-Relay daneben.
  Der Anruf geht darüber, sodass keines der Telefone die IP-Adresse des anderen erfährt. Über WLAN oder mobile Daten,
  überall.
- **Ohne Anruf-Relay** (zum Beispiel ein Relay auf deinem eigenen Computer) fragt Erevos zuerst: Der Anruf geht dann
  direkt zwischen den Telefonen, funktioniert nur im selben WLAN, und jedes Telefon sieht dort die Adresse des
  anderen.
- **Ohne Internet:** Im selben WLAN, im Hotspot eines Telefons oder in dem WLAN, das zwei Telefone aufbauen (Wi-Fi
  Direct), mit einem offenen Bereich auf beiden, braucht ein Anruf überhaupt kein Relay: Er wird über die Verbindung in
  der Nähe aufgebaut und geht direkt zwischen den Telefonen (oder Computern). Dasselbe gilt für Gruppennachrichten und
  Gruppenanrufe.
- **Im Hintergrund (Android):** Solange ein Bereich offen ist, läuft Erevos weiter, wenn du es verlässt, mit der
  Home-Taste oder indem du es aus den letzten Apps wegwischst, mit einer stillen Benachrichtigung, „Erevos – Ready for
  calls and messages“, die nicht auf dem Sperrbildschirm erscheint. Es wartet beim Relay und an den Verbindungen zu
  Telefonen in der Nähe, damit Nachrichten ankommen: Eine Benachrichtigung sagt nur „New message“ oder wie viele kamen,
  und auf einem gesperrten Telefon nur „Erevos“. Eine Nachrichtenanfrage, von jemandem, der nur deinen Kontaktlink
  hat, macht dieselbe Benachrichtigung und denselben Ton und zählt auf dem Symbol, wie jede Nachricht. Ein Anruf
  klingelt mit dem Klingelton des Telefons und einer Benachrichtigung, „Incoming call“ (oder „Incoming video call“) –
  „Open Erevos to answer“, ohne Namen, auch über dem Sperrbildschirm und dem Bildschirmschoner, und der Bildschirm
  wacht auf. Tippe darauf, um anzunehmen. Mit
  eingeschalteter Passwortsperre erscheint ein klingelnder Anruf vor dem Passwort, und Erevos sperrt sich, sobald er
  endet. Gesperrt läuft der Bereich hinter dem Passwortbildschirm weiter, also kommen Nachrichten und Anrufe trotzdem,
  und ein Anruf erscheint über dem Passwortbildschirm. Nur die Chats und Gruppen dieses Bereichs kommen so an, und
  versteckte Chats mit eingeschaltetem **Empfangen, wenn geschlossen**; andere versteckte Chats sagen nur, dass eine
  Nachricht kam, oder klingeln ohne Namen, wenn du es erlaubst (siehe „Versteckte Chats“). Stell es unter
  **Einstellungen** → **Benachrichtigungen** → **Im Hintergrund** ein: **Empfangen und klingeln** (die Voreinstellung)
  oder **Nur, solange Erevos sichtbar ist**, und **Neue Nachrichten melden** (die Voreinstellung) oder
  **Keine Benachrichtigung**, was auch gilt, solange Erevos sichtbar ist. Dort auch, wenn Android danach fragt,
  **Trotz Akku-Sparen weiterlaufen** und **Anrufe über dem Sperrbildschirm zeigen**.
- **Die Zahl auf dem Symbol:** Mit **Neue Nachrichten melden** bleibt die Meldung, wenn du Erevos mit ungelesenen
  Nachrichten in den Chats und Gruppen des offenen Bereichs verlässt, ohne Ton stehen und sagt, wie viele es sind, mit
  denen, die sie danach meldet; sie geht, solange Erevos sichtbar ist, und kommt wieder, wenn du es verlässt, bis du
  sie gelesen hast. Nachrichten eines stummen Chats zählen nicht (siehe „Benachrichtigungen für diesen Chat“), die
  eines versteckten Chats beim Verlassen auch nicht. Der Launcher von Android zeigt sie am Symbol von Erevos, als Zahl
  oder auf manchen Telefonen, etwa Pixels, als Punkt. **Einstellungen** → **Benachrichtigungen** → **Zahl auf dem
  Symbol** schaltet das aus: Dann meldet die Meldung nur, was gekommen ist, seit du Erevos zuletzt offen hattest, und
  die Zahl des Launchers geht mit ihr. Eine Nachricht, die für alle gelöscht wurde, bevor du sie gelesen hast, oder
  die auf einem verknüpften Computer gelesen wurde, zählt nicht mehr.

  **Warum:** Auf Android kann nur eine Meldung eine Zahl auf das Symbol einer App setzen, also bleibt die Meldung,
  solange Nachrichten warten; sie sagt nicht mehr als wie viele, wie immer schon.
- **Ein Bereich, der geschlossen ist:** Er empfängt nichts, da sein Schlüssel nur im Arbeitsspeicher ist, solange er
  offen ist: Seine Nachrichten warten bei seinem Relay und kommen, wenn du ihn öffnest. Außer du wählst in diesem
  Bereich **Auch, wenn ein anderer Bereich offen ist** unter **Einstellungen** → **Benachrichtigungen** → **Im
  Hintergrund** (die Voreinstellung ist **Dieser Bereich nur, wenn offen**): Dann sagt er, solange ein anderer Bereich
  offen ist und empfängt, nur „New message“ oder wie viele kamen, mit derselben Benachrichtigung wie jener Bereich, nie
  welcher Bereich, und seine versteckten Chats sagen nichts. Was andere Telefone zu seinem Relay mitgenommen haben,
  zählt als Nachricht, auch Löschungen, und eine Nachricht, die ohne Ton an ihn gesendet wurde, meldet sich wie
  gewohnt (siehe **Ohne Ton senden**). Dafür bewahrt das Telefon die Adressen seiner
  Warteschlangen bei seinem Relay außerhalb seines Passworts auf, darunter die, in die jeder seiner Kontakte schreibt,
  für bis zu 64 Kontakte, nie seine Schlüssel, wer seine Kontakte sind, oder seine Nachrichten, und fragt das Relay nur,
  wie viele kamen, nie nach ihnen selbst: Sie bleiben dort, bis sich der Bereich öffnet. Ein Bereich, der über Tor geht
  (**Nachrichten**, die Voreinstellung, oder **Alles**, unter **Was über Tor geht**), wird nur über Tor abgefragt: Solange der
  offene Bereich Tor aus hat oder sein Tor gerade startet oder eben gescheitert ist, sagt der geschlossene Bereich
  nichts, und was kam, wird gemeldet, sobald Tor dort bereit ist.

  **Warum:** Ein Bereich hinter einem zweiten Passwort darf nicht zeigen, dass es ihn gibt, also ist das aus, solange du
  es nicht einschaltest, und dann sagt er nicht mehr, als der offene Bereich sagen würde. Direkt vom Telefon aus
  abgefragt, während ein anderer Bereich offen ist, könnten sein Relay oder jemand, der das Netz beobachtet, die beiden
  Bereiche über die Internetadresse des Telefons miteinander verbinden. Da jeder Kontakt in eine
  eigene Warteschlange schreibt, muss der Bereich auch nach jeder davon fragen, sonst würden ihre Nachrichten nichts
  sagen. Der Preis ist, dass sein Relay erkennen kann, dass die beiden Bereiche auf einem Telefon sind, und jemand, der
  das Telefon mit Werkzeugen untersucht, finden kann, dass ein zweiter Bereich dort Adressen aufbewahrt, und wie viele
  Kontakte er hat.
- **Wo es nicht klingeln kann:** von Android beendet (oder vom Energiesparen des Telefons oder von der eigenen
  Einstellung des Herstellers), nach einem Neustart des Telefons, bis du Erevos und den Bereich einmal öffnest, in
  einem anderen Bereich (er sagt nur, dass eine Nachricht kam, wenn du es erlaubst, wie oben), oder auf einem Computer
  oder in der Web-App,
  solange sie geschlossen sind. Ein Anruf erscheint dort als verpasster Anruf, sobald Erevos öffnet. Wenn Android
  Erevos beim Empfangen schließt und wieder startet, wie es das meist tut, sagt es eine stille Benachrichtigung: Öffne
  Erevos und den Bereich, um wieder zu empfangen. Nach **Beenden erzwingen**, mit einer Akkunutzung, die auf
  Eingeschränkt steht, oder wenn die eigene Einstellung des Herstellers es schließt, startet Android nichts wieder,
  also sagt es keine Benachrichtigung: Die Benachrichtigung „Erevos“ verschwindet einfach, und nichts klingelt, bis du
  Erevos öffnest. **Berechtigungen** (unten) sagt vorher, ob eines davon eingestellt ist. Ebenso sagt es eine
  Benachrichtigung, „Locked“, wenn sich der Bereich, der empfangen hat, schließt (etwa nach dem Wiederherstellen
  eines Backups) und Erevos den Bildschirm mit der Passwortabfrage verlässt. Eine Nachrichtenanfrage kann dich erst
  anrufen, wenn du sie annimmst.
- **Berechtigungen (Android):** **Einstellungen** → **Allgemein** → **Berechtigungen** zeigt, was Android Erevos für
  Anrufe und Nachrichten im Hintergrund erlaubt (Benachrichtigungen, die Anruf-Benachrichtigung und dass sie aufpoppt,
  die Nachrichten-Benachrichtigung, mit ihren Benachrichtigungen „Messages without sound“ und „Messages with a chat's
  own sound“, die auch die Zahl auf dem Symbol halten, Anrufe über dem Sperrbildschirm, Laufen im Akku-Sparmodus,
  Laufen im Hintergrund mit einer Akkunutzung, die nicht auf Eingeschränkt steht, kein Pausieren bei Nichtnutzung,
  mobile Daten im Hintergrund, das Mikrofon) und für anderes (der Ton für neue Nachrichten, Benachrichtigungen auf dem
  Sperrbildschirm, Anrufe trotz Nicht stören, Kamera, Telefone in der Nähe, Kontakte, genaue Zeiten für später
  gesendete SMS und Erinnerungen, die Benachrichtigung, wenn eine Erinnerung kam), jeweils mit dem Grund und einer
  Taste, die Androids eigene Frage oder Einstellung öffnet. Es sagt auch, wenn das Telefon auf lautlos oder Vibration
  steht, wenn der Energiesparmodus an ist und wenn Nicht stören an ist, während Erevos-Anrufe nicht
  durchgelassen werden. Auf Telefonen von Huawei, Honor, Xiaomi, OPPO, realme, OnePlus, vivo, Samsung und ASUS sagt es
  auch, wo die eigene Einstellung des Herstellers ist, die Erevos nicht lesen kann: Tippe auf **Erledigt**, sobald sie
  gesetzt ist. Nach jeder neuen Version, und beim ersten Mal, öffnet es sich von selbst, wenn Anrufe oder Nachrichten
  etwas brauchen. In der Web-App zeigt es, was der Browser erlaubt, siehe [Auf einem iPhone](#iphone).
- **Ein Anruf nach dem anderen.** Ein Anruf geht weiter, während du zwischen Bildschirmen des Bereichs wechselst. Er
  endet, wenn sich der Bereich schließt, und ein Anruf in versteckten Chats, wenn diese sich schließen, was sie während
  eines Anrufs nicht tun. Erevos aus den letzten Apps wegzuwischen beendet einen Anruf ebenfalls.
- Anrufe gehen nicht über ein Telefon in der Nähe oder Bluetooth. Dort macht **Talkie** unter **+** den Chat zu einem
  Walkie-Talkie, und **Talkie ist an** erscheint über dem Feld: Halte das Walkie-Talkie am Ende der Leiste gedrückt,
  während du sprichst, lass los, und es spielt auf dem anderen Telefon ab, während es ankommt, wenn der Chat mit dir
  dort offen ist; wenn nicht, wartet es als Sprachnachricht. Es ist eine kleinere Sprachnachricht (etwa 3 KB pro
  Sekunde), also geht es überall dorthin, wohin eine Nachricht geht, Bluetooth eingeschlossen.

**Warum:** Die Schlüssel, die die Nachrichten eines Bereichs öffnen, sind nur im Arbeitsspeicher, solange er offen ist,
und sonst hinter seinem Passwort versiegelt. Nach einem Neustart des Telefons lässt sich also nichts lesen und nichts
klingelt, bis du Erevos und den Bereich einmal öffnest; und versteckte Chats, deren Schlüssel nur im Arbeitsspeicher
ist, solange sie offen sind, außer **Empfangen, wenn geschlossen** behält ihn beim Bereich, sagen sonst nur, dass eine
Nachricht kam, oder klingeln ohne Namen, wenn du es erlaubst.

> Die Relay-Einstellungen, deine Warteschlange, deine Kontakte und ihre Namen, die Schlüssel deiner Unterhaltungen und
> die Nachrichten werden in diesem Bereich aufbewahrt, versiegelt. Der Verlauf hat keine Grenze: Er wird in
> versiegelten Seiten gleicher Größe aufbewahrt, vermischt mit den Seiten der anderen Bereiche und versteckten Chats,
> sodass nur sichtbar ist, wie viel sie alle zusammen belegen, nicht wem sie gehören. Der Rest wird für jeden Bereich
> und jede Gruppe versteckter Chats in gleicher Größe aufbewahrt, ob genutzt oder nicht; was größer ist, kommt in
> Seiten wie die des Verlaufs, zwischen sie. Gelöschte Nachrichten können eine Weile im Speicher des Telefons bleiben,
> versiegelt wie der Rest, bis etwas darüber geschrieben wird. In der Nähe gesendete oder empfangene Nachrichten werden
> genauso aufbewahrt.

## Gruppenchats {#groups}

Im Menü des Startbildschirms **Neue Gruppe**: Gib ihr einen Namen, hake die Kontakte an, die gefragt werden sollen, und
tippe auf **Gruppe erstellen**. Du bist ihr Admin. Das Telefon jedes Kontakts antwortet von selbst, wenn Erevos dort
das nächste Mal offen ist, und tritt bei: Die Gruppe erscheint dann auf seinem Startbildschirm, mit einem Hinweis, wer
ihn hinzugefügt hat. Ein Telefon tritt nur einer Gruppe bei, deren Admin der Kontakt ist, der es gefragt hat, und ein
Admin lässt einen Kontakt nur als sich selbst herein, nie als jemand anderen. Gruppen gehen über das Relay, also muss
es eingestellt sein.

**Warum:** Nur das Telefon des Admins ändert die Gruppe (wer darin ist, ihren Namen), sodass kein Server die Änderungen
ordnen muss: Jedes Telefon übernimmt sie von diesem einen. Deshalb verlässt ein Mitglied die Gruppe, indem es den Admin
bittet, und nur der Admin fügt Mitglieder hinzu oder nimmt sie heraus.

- **Wer gefragt werden kann:** Kontakte, die du angenommen hast, in diesem Bereich. Mitglieder, die nicht gegenseitig
  Kontakte sind, reden trotzdem in der Gruppe und erscheinen mit dem Anfang ihres Schlüssels.
- **Als Kontakt hinzufügen:** In der Mitgliederliste (**⋯**) fragt **Als Kontakt hinzufügen** unter einem Mitglied,
  das nicht dein Kontakt ist, in einer Nachricht, die nur es bekommt, nach seinem Kontaktlink und gibt ihm deinen. Auf
  seinem Telefon erscheint die Frage einmal, oben in der Gruppe, und es tippt auf **Senden** oder **Nicht senden**;
  tippt es auf **Nicht senden**, erfährst du nichts. Sobald es ihn sendet, seid ihr gegenseitig Kontakte, mit einem
  eigenen Chat, und **Name** gibt ihm einen Namen, wie unter jedem Kontakt, der noch keinen hat. Keine Antwort kann
  bedeuten, dass es die Gruppe noch nicht geöffnet hat, abgelehnt hat, ein älteres Erevos hat oder dich noch als
  Kontakt hat, was ihm nichts zeigt; nach einer Woche kannst du erneut fragen. Sobald ihr gegenseitig Kontakte seid, in
  irgendeiner Gruppe oder über einen Kontaktlink, verschwindet, was in deinen anderen Gruppen gefragt wurde, und seine
  Frage erscheint nicht mehr. Ein aus der Gruppe genommenes Mitglied fragt nichts mehr. Wenn zwei Mitglieder denselben
  Schlüssel zeigen, ist eines davon nicht, wer es vorgibt zu sein, und kein Kontaktlink geht an eines davon oder wird
  von einem davon angenommen. Nicht in öffentlichen Gruppen. Fragen ist Sache des Telefons, das das Konto hat;
  **Name** funktioniert auch auf einem verknüpften Gerät.
- **Ende-zu-Ende-verschlüsselt für die Gruppe:** MLS (RFC 9420). Jede Nachricht wird einmal für die Gruppe
  verschlüsselt und dann für jedes Mitglied noch einmal versiegelt, sodass, was in der Warteschlange jedes Mitglieds
  ankommt, nichts gleicht, was die anderen bekommen, und kein Relay erkennen kann, wer in einer Gruppe ist. Sie geht
  direkt in die Warteschlange jedes Mitglieds, über dein Relay. Jede Woche werden die Schlüssel jedes Telefons in der
  Gruppe erneuert, die des Admins von selbst und die jedes Mitglieds über den Admin, sodass einmal von einem Telefon
  genommene Schlüssel die Gruppe nicht mehr lesen.
- **Mitglieder:** Tippe oben auf den Namen der Gruppe oder auf **⋯** daneben. Der Admin fügt Kontakte hinzu, nimmt
  Mitglieder heraus und benennt die Gruppe um. Ein herausgenommenes Mitglied liest ab dann nichts mehr, was die Gruppe
  sagt, und die Gruppe bleibt auf seinem Telefon, nur lesbar, bis es sie löscht.
- **Verlassen:** **Gruppe verlassen** bittet den Admin, dessen Telefon dich herausnimmt, wenn Erevos dort das nächste
  Mal offen ist. Die eigene Taste des Admins ist **Gruppe schließen**: Sie nimmt jedes Mitglied heraus.
- **Gruppenanrufe:** Der grüne Hörer oben in der Gruppe startet darin einen Sprachanruf und die blaue Kamera daneben
  einen Videoanruf (auch **Videoanruf** unter **⋯**). Während einer läuft, erscheint nur seine eigene Taste, um
  beizutreten. Er klingelt auf den Telefonen der Mitglieder, auf denen Erevos offen ist, und wer annimmt, ist dabei.
  Ein laufender Anruf erscheint oben in der Gruppe, um später beizutreten. Bis zu acht Personen: Jedes Telefon
  verbindet sich mit jedem anderen, über das Anruf-Relay, sodass kein Telefon die IP-Adresse eines anderen sieht; ohne
  Anruf-Relay nur im selben WLAN. Ende-zu-Ende-verschlüsselt zwischen je zwei Telefonen, ihre Schlüssel in der
  Verschlüsselung der Gruppe gesendet. In einem Videoanruf sendet jedes Telefon sein Bild an jedes andere, sodass Bilder
  für bis zu vier Personen erscheinen; bei mehr pausieren sie und der Ton läuft weiter, bis ein Server für größere
  Videoanrufe eingerichtet ist.
- **Fotos, Dateien und Sprachnachrichten:** **+** neben dem Feld sendet ein Foto oder eine Datei, wie im Chat eines
  Kontakts, mit derselben **Fotoqualität**; halte das Mikrofon gedrückt, während du sprichst, und lass los, um zu
  senden. Jedes wird mit einem eigenen Schlüssel verschlüsselt und einmal auf dein Relay gelegt, und nur wo es liegt und
  sein Schlüssel gehen an die Gruppe, in ihrer Verschlüsselung. Das Telefon jedes Mitglieds holt es von dort über sein
  eigenes Relay: bis 16 MB von selbst, solange die Gruppe offen ist, ein größeres nach einem Tippen. Tippe auf ein
  Foto, um es ganz zu sehen, auf eine Datei, um sie zu speichern, auf eine Sprachnachricht, um sie abzuspielen.
  - **Das Relay bewahrt es 14 Tage auf,** verschlüsselt, da es nicht wissen kann, wann jedes Mitglied es geholt hat.
  - **Nur über das Relay,** auch wenn Mitglieder in der Nähe sind.
  - **Ein Mitglied, das später beitritt,** bekommt nicht, was vorher kam, wie bei den Worten. Ein Mitglied, dessen
    Erevos von vor dieser Version ist, sieht nichts davon.
  - **Auf dem Telefon** wird jedes in seinen Stücken aufbewahrt, versiegelt, wie im Chat eines Kontakts. Die Gruppe
    hier zu löschen, löscht sie.
- **Das Menü einer Nachricht,** gedrückt gehalten, wie im Chat eines Kontakts: die Reaktionen, **Antworten**,
  **Weiterleiten**, **Mit Stern markieren**, **Anheften**, **Kopieren**, **Bearbeiten** und **Löschen**. Jedes
  Mitglied hat eine Reaktion pro Nachricht, und eine Umfrage zeigt, wer was gewählt hat. Eine Anheftung gilt für alle,
  und jedes Mitglied kann sie mit **Loslösen** lösen. **Bearbeiten** gibt deinen eigenen Worten neue für jedes
  Mitglied, bis zu einem Tag nach dem Senden, markiert mit **Bearbeitet**. **Löschen** fragt **Dieses Telefon** oder,
  für deine eigene Nachricht, **Für alle**: Das Erevos der Mitglieder löscht sie auch, und ein Foto, eine Datei oder
  eine Sprachnachricht von dir verlässt dein Relay sofort statt nach 14 Tagen. **+** hat auch hier **Sticker**,
  **Standort** und **Umfrage**. Links sind unterstrichen und werden vor dem Öffnen bestätigt, und **Linkvorschauen**
  gehen, wenn eingeschaltet, mit deinen mit. In der Mitgliederliste, oder auf dem eigenen Bildschirm einer
  öffentlichen Gruppe, durchsucht **In diesem Chat suchen** die Nachrichten der Gruppe, und **Chat exportieren**
  schreibt sie heraus; **Markierte Nachrichten** und die Suche des Startbildschirms schließen die Gruppen mit ein. Ein
  Mitglied, dessen Erevos von vor dieser Version ist, sieht die Worte, das Emoji eines Stickers, die Koordinaten eines
  Orts und die Frage einer Umfrage, und nichts von Reaktionen, Anheftungen, Bearbeitungen und Löschen.
- **Noch nicht:** Zeichen, Tippen und verschwindende Nachrichten in Gruppen, und Gruppen über ein Telefon in der Nähe.

## Öffentliche Gruppen {#public-groups}

Eine öffentliche Gruppe ist eine, um deren Beitritt jeder mit ihrem Link oder ihrem QR-Code bitten kann: für einen
Verein, eine Straße oder eine Klasse, wo nicht jeder dein Kontakt ist. Im Menü des Startbildschirms
**Öffentliche Gruppen**: Gib ihr einen Namen und den Namen, unter dem du darin auftrittst, wähle, wer hereinkommt, und
tippe auf **Öffentliche Gruppe erstellen**. Sie gehört dir. Ihre Nachrichten sind mit MLS Ende-zu-Ende-verschlüsselt
und gehen an jedes Mitglied wie in jeder Gruppe, und kein Relay erfährt, wer darin ist.

- **Der Link:** Tippe oben auf den Namen der Gruppe für ihren Link und QR-Code, und auf **Link teilen**. Wer ihn
  öffnet oder den Code mit der Kamera des Telefons scannt, wählt den Namen, den die Gruppe sieht, und tippt auf
  **Beitritt anfragen**. Ein Link lässt sich auch unter **Per Link beitreten** einfügen. Jedes Mitglied hat den Link
  und kann ihn weitergeben.
- **Beitreten, während du weg bist:** Die Anfrage wartet auf deinem Relay, so versiegelt, dass nur dein Telefon sie
  öffnet, bis Erevos auf deinem Telefon offen ist: Es schaut alle paar Sekunden nach, solange Erevos sichtbar ist, und
  etwa jede Minute im Hintergrund. Dann lässt es die Person herein, und die Gruppe erscheint auf ihrem Telefon.
- **Wer hereinkommt:** **Jeder mit dem Link** oder **Ein Admin lässt sie herein**: Dann wartet, wer fragt, unter
  **Beitrittsanfragen**, bis du oder ein Admin auf **Hereinlassen** oder **Abweisen** tippt. Dein Telefon lässt die
  Person trotzdem herein, sobald es davon hört.
- **Admins:** Tippe unter **Mitglieder** neben einem Mitglied auf **Moderieren**, dann auf **Zum Admin machen**.
  Admins schalten Mitglieder stumm, nehmen sie heraus und sperren sie, lassen herein, wer fragt, und löschen eine
  Nachricht für alle; nur du moderierst Admins, und niemand moderiert dich.
  - **Stumm:** Das Telefon des Mitglieds sendet nichts in die Gruppe, und kein Telefon zeigt, was seines trotzdem
    sendet. **Schreiben lassen** macht es rückgängig.
  - **Entfernen:** Es liest ab dann nichts mehr, was die Gruppe sagt, und kann über den Link erneut um Beitritt
    bitten.
  - **Sperren:** herausgenommen, und was sein Telefon danach fragt, wird abgewiesen. **Sperre aufheben**, unter
    **Gesperrt**, macht es rückgängig. Eine Sperre hält dasselbe Telefon auf, nicht jemanden, der mit einer neuen
    Relay-Warteschlange zurückkommt: Wähle dagegen **Ein Admin lässt sie herein** oder ändere den Link.
  - **Für alle löschen:** Die neuesten Nachrichten sind unten aufgelistet; **Löschen** entfernt eine vom Telefon jedes
    Mitglieds. Wer sie schon gelesen hat, kann eine Kopie behalten haben.
- **Link ändern:** Der bisher geteilte Link und QR-Code funktionieren sofort nicht mehr, und jedes Mitglied bekommt
  den neuen. Anfragen, die noch am alten warten, gehen verloren.
- **Gruppe übergeben:** unter **Moderieren** eines Mitglieds. Sein Telefon besitzt sie ab dann und lässt Leute herein,
  also ändert sich der Link zu einem auf seinem Relay; du bleibst Admin. Geht dein Telefon verloren, bevor du sie
  übergibst, kann niemand mehr jemanden hereinlassen, auch wenn die Gruppe für die Mitglieder weiterläuft.
- **Gruppe schließen** nimmt jedes Mitglied heraus. **Gruppe verlassen** eines Mitglieds bittet dein Telefon, es
  herauszunehmen.
- **Bis zu 100 Mitglieder,** da die ganze Gruppe in die eine Nachricht passen muss, die jemanden hereinlässt.
- **Jedes Telefon in einer öffentlichen Gruppe braucht diese Version von Erevos.** Aus Kontakten gemachte Gruppen
  funktionieren wie bisher.

**Warum:** Nur das Telefon des Inhabers ändert die Gruppe und lässt Leute herein, sodass Änderungen nie miteinander
konkurrieren und kein Server sie ordnen muss. Deshalb läuft die Gruppe ohne es weiter, aber niemand Neues kommt
herein: Übergib sie, bevor du das Telefon wechselst.

### Was eine öffentliche Gruppe preisgibt

> Jeder mit dem Link kann die Gruppe ab dem Moment lesen, in dem er hereingelassen wird, nie, was vorher gesagt wurde,
> und der Link kann weitergegeben werden: Ändere ihn, um das zu beenden.

- **Der Link** zeigt jedem, der ihn sieht, den Namen der Gruppe und die Adresse deines Relays.
- **Jedes Mitglied sieht von jedem Mitglied** den gewählten Namen, einen nur für diese Gruppe gemachten Schlüssel, die
  Adresse seines Relays und die Absender-ID seiner Warteschlange. Der Schlüssel sagt nichts darüber, wer es in seinen
  Chats ist, noch in welchen anderen Gruppen es ist. Die Warteschlange ist eine, an der nur seine öffentlichen Gruppen
  lesen, nicht die aus seinem Kontaktlink, dieselbe in jeder seiner öffentlichen Gruppen (ein Erevos vor 2.0.0 nennt
  die aus seinem Kontaktlink).
- **Namen sind gewählt, nicht bewiesen:** Jeder kann sich beliebig nennen. Der Anfang des Schlüssels jedes Mitglieds
  erscheint neben dem Namen, und der Inhaber und die Admins sind markiert.
- **Was gesagt wird, kann kopiert werden,** von jedem in der Gruppe: Ende-zu-Ende-Verschlüsselung hält die Relays
  draußen, nicht die Mitglieder.
- **Die Relays** lesen nichts und erfahren niemanden in der Gruppe. Deines sieht Anfragen an die Tür der Gruppe
  kommen, wie viele und wann, nicht von wem. Mitglieder können die Warteschlange der anderen mit Unlesbarem füllen,
  bis zu dem, was das Relay annimmt.

## Wie Erevos den Weg wählt {#paths}

Wenn du eine Nachricht sendest, wählt Erevos den Weg von selbst:

1. **Das andere Telefon ist in der Nähe** (oben im Chat steht **In der Nähe**): Sie geht über die Verbindung in der
   Nähe, und auch über das Relay, wenn es eines gibt.
2. **Sonst, mit Relay:** Sie geht über das Relay, und eine kurze Nachricht geht auch an die in der Nähe verbundenen
   Erevos-Telefone, damit das des Kontakts in der Nähe antworten kann, wenn es eines davon ist. Ist das Relay nicht
   erreichbar, zählt diese Kopie, und diese Telefone nehmen sie auch zum Relay deines Kontakts mit, wie in
   [Chat mit einem Telefon in der Nähe](#nearby).
3. **Sonst, ohne Relay,** geht sie an die in der Nähe verbundenen Erevos-Telefone, wie in 2.
4. **Und über LoRa,** wenn ein Funkgerät eingestellt ist und das Relay einen Text nicht annehmen konnte, wie in
   [Über LoRa-Funk](#lora). Gibt es gar keinen Weg, wartet die Nachricht, als **Wartet** markiert, und geht von selbst,
   sobald es einen gibt, wie in [Gesendet, angekommen und gelesen](#relay); eine Zeile unter dem Chat sagt, warum.

Jeder Weg ist Ende-zu-Ende-verschlüsselt: Kein Relay und kein Telefon dazwischen kann lesen, was du sendest.

| Zeile unter dem Chat | Was zu tun ist |
| --- | --- |
| **Gesendet: in der Nähe, Ende-zu-Ende-verschlüsselt.** | Nichts: Das andere Telefon ist in der Nähe und hat sie. |
| **Gesendet: über das Relay, Ende-zu-Ende-verschlüsselt.** | Nichts: Sie ist unterwegs. |
| **Gesendet: an die Erevos-Telefone in der Nähe, Ende-zu-Ende-verschlüsselt, weil das Relay nicht erreichbar war.** | Sie kommt nur an, wenn eines davon das des Kontakts ist: Warte auf **✓✓** oder prüfe das Relay. |
| **… Ist das Telefon des Kontakts nicht dabei, geben sie sie an sein Relay weiter, sobald sie ins Internet kommen, und dieses Telefon ebenso.** | Nichts: Sie kommt an, sobald eines davon, oder dieses Telefon, ins Internet kommt. Warte auf **✓✓**. |
| **Gesendet: über LoRa, Ende-zu-Ende-verschlüsselt, weil das Relay nicht erreichbar war.** | Sie kommt an, wenn das Erevos des Kontakts ein Funkgerät im selben Mesh in Reichweite hat: Warte auf **✓✓** oder prüfe das Relay. |
| **Wartet. Das Relay ist nicht erreichbar (oder Es gibt kein Relay), und das Telefon des Kontakts ist nicht in der Nähe.** | Nichts: Sie geht von selbst, sobald das Relay oder das andere Telefon in der Nähe sie annehmen kann, und zeigt dann **✓**. Ohne Relay trage seine Adresse ein, wie in [Chat über ein Relay](#relay), oder geh in die Nähe des anderen Telefons. |
| **Wartet. Sie ist zu lang für LoRa.** | Nichts: Sie geht, sobald das Relay oder das andere Telefon in der Nähe sie annehmen kann. Oder sende sie in kürzeren Teilen. |
| **Nicht gesendet. Das Relay hat die Warteschlange dieses Kontakts nicht mehr.** | Bitte den Kontakt, dir zu schreiben, oder um seinen neuen Kontaktlink. |
| **Diese Version kann nicht verschlüsseln, deshalb sind Chats über das Relay aus.** | Baue die App neu: Diese Version ist älter als ihre Verschlüsselung. |

## Ein eigenes Relay betreiben {#own-relay}

Ein Relay, das du selbst betreibst, ist das sicherste, denn wer ein Relay betreibt, sieht, wer sich damit verbindet.
Der Quellcode hat alles in \`deploy/relay\`.

- **In deinem eigenen Netz:** Lass das Relay auf einem Computer laufen, öffne Port 7879 in seiner Firewall und gib
  \`ws://<seine Adresse>:7879\` auf jedem Telefon ein. Schließe den Port wieder, wenn du fertig bist.
- **Im Internet:** ein Server (VPS) mit Debian 12 oder Ubuntu 22.04 oder neuer, ein Domainname (oder ein kostenloser
  \`sslip.io\`-Name) und offene Ports 80 und 443. Ein einziger Befehl installiert das Relay hinter Caddy, mit einem
  Zertifikat von Let's Encrypt und einem zufälligen Token. Jedes Telefon nutzt dann \`wss://<deine Domain>\` und dieses
  Token. Derselbe Befehl richtet das Anruf-Relay für Anrufe ein, das außerdem Port 3478 und die UDP-Ports 50000 bis
  50999 offen braucht.

Warteschlangen und wartende Nachrichten werden auf der Festplatte des Servers aufbewahrt, ebenso die verschlüsselten
Stücke von Fotos und Dateien, bis sie geholt werden (zusammen höchstens 1024 MB), sodass ein Neustart nichts verliert,
und keine Anfrage wird protokolliert.
Auch Nachrichten, die für später gesendet wurden, werden dort bis zu ihrer Zeit aufbewahrt, höchstens 10.000 oder
256 MB: Das Relay sieht, wann jede gehen soll, nicht, was sie sagt.

**Warum:** Was das Relay aufbewahrt, hat Grenzen, sodass die Telefone, die es nutzen, seine Festplatte oder seinen
Arbeitsspeicher nicht füllen können.

**Sein eigener Schlüssel:** Die Schlüsseldatei des Relays (\`EREVOS_RELAY_KEY\`, die der eine Befehl einrichtet) ist
das, was es bei jeder Verbindung beweist, sodass Telefone es an diesem Schlüssel erkennen statt an seinem Zertifikat
(siehe [Der eigene Schlüssel des Relays](#relay)). Bewahre diese Datei auf, auch in seinen Backups: Mit einer neuen
lehnt jedes Telefon, das den alten Schlüssel kannte, das Relay ab, bis jemand dort auf **Es hat einen neuen
Schlüssel** tippt.

**Einladungen:** Das Relay kann jedem Telefon ein eigenes Token geben, in einer Token-Datei, und diese Telefone dann
weitere einladen lassen, jede Einladung für ein Telefon (siehe [Einladungen zum Relay](#relay)). Schalte es mit
\`EREVOS_RELAY_INVITES=on\` neben \`EREVOS_RELAY_TOKENS\` ein; das Relay schreibt dann die Zeilen eingeladener Telefone
selbst in diese Datei, mit wer sie eingeladen hat und wann, und eine Zeile herauszunehmen sperrt dieses Telefon aus,
samt den Telefonen, die es eingeladen hat. Es lässt höchstens 100 Telefone per Einladung herein
(\`EREVOS_RELAY_MAX_INVITED\`). Wer wen eingeladen hat, richtet sich nach dem Token, nicht nach dem Namen: Eine Zeile,
die an die Stelle einer anderen mit neuem Token gesetzt wird, sperrt die Telefone aus, die die alte eingeladen hat,
außer \`erevos-relay free-line NAME\`, bei angehaltenem Relay ausgeführt, gibt sie vorher frei. Ein Telefon, das mit
dem Token des Relays kommt (\`EREVOS_RELAY_TOKEN\`), bittet einmal um eine eigene Zeile, die das Relay als eine von
deinen hinzufügt, mit dem Vermerk, dass es mit dem Token des Relays kam, und wann, höchstens 50 am Tag: So kannst du
dieses Token verteilen, die Zeile jedes einzelnen Telefons löschen und dann das Token ändern, ohne die anderen
auszusperren. \`deploy/relay/README.md\` sagt, wie.

**Anmelden:** Mit einer Token-Datei kann das Relay Telefone sich auch bei einem OpenID-Connect-Anbieter wie Authentik
anmelden lassen, für ein eigenes Token, und prüft jedes Konto jede Stunde, wobei es seine Telefone nach 3 Tagen ohne
Antwort und zwei weiteren fehlgeschlagenen Prüfungen jedes Telefons im Abstand einer Stunde entfernt (siehe
[Beim Relay anmelden](#relay)). Ein Browser darf 10 Anmeldungen pro Minute starten. Mit \`EREVOS_RELAY_OIDC_GROUP\`
dürfen es nur die Konten in dieser Gruppe.
Es braucht einen Client beim Anbieter, ein paar Einstellungen und \`/signin/\`, als einfaches HTTP an das Relay
weitergereicht: \`deploy/relay/README.md\` sagt, wie.

> Veröffentliche das Token nie dort, wo andere es lesen können. Wer den Server betreibt, sieht die IP-Adressen, die
> sich verbinden, die Warteschlangen-IDs und wann und wie viel ankommt. Die Nachrichten kann er nicht lesen, sie sind
> Ende-zu-Ende-verschlüsselt.

## Heim-Relay {#home-relay}

Unter **Einstellungen** → **Relay und Netze** → **Heim-Relay** kann ein Bereich ein zweites Relay mit einer eigenen
Warteschlange haben: eines zu Hause, auf einem Raspberry Pi oder einem alten Computer, oder ein anderes Relay, dem du
vertraust. Es ist optional.

- **Was es tut:** Dein Kontaktlink und jede Nachricht nennen diese Warteschlange neben deinem Relay. Solange dein
  Relay nicht erreichbar ist, schreiben Kontakte dorthin, und Erevos holt bei jedem Nachsehen, was dort ankommt. Was
  du sendest, geht darüber, wenn dein eigenes Relay ausgefallen ist.
- **Wie du es einrichtest:** Betreibe ein Relay wie in [Ein eigenes Relay betreiben](#own-relay), gib seine Adresse
  ein (und sein Token, falls es eines hat) und wähle **Speichern**. Kontakte erfahren es mit deiner nächsten Nachricht
  an sie oder über deinen neuen Kontaktlink.
- **Was es sieht:** was dein Relay sieht, die Adresse dieses Telefons, wenn es Nachrichten holt, und wann und wie viel
  ankommt. Versteckte Chats nutzen es nicht.
- **Für versteckte Chats:** Jeder versteckte Platz kann ein eigenes Heim-Relay haben, unter **Für Fortgeschrittene**
  auf seinem Bildschirm ohne gewählten Chat, solange er offen ist. Es wird nur bei diesem Platz aufbewahrt, versiegelt
  mit seiner PIN, sodass der Bereich nichts davon weiß, und es wird abgefragt, solange der Platz offen ist. Nutze ein
  anderes Relay als das des Bereichs: Ein Relay, das beide Warteschlangen sieht, würde sie miteinander verbinden.

## Über Tor {#tor}

Unter **Einstellungen** → **Relay und Netze** → **Tor** wählt **Was über Tor geht**, welche Anfragen dieses Bereichs
an seine Relays über das Tor-Netz gehen. Jeder Bereich hat seine eigene Wahl:

| Wahl | Was über Tor geht |
| --- | --- |
| **Nachrichten** | Sofern du es nicht änderst. Was du schreibst, und was deinen Kontakten etwas mitteilt, etwa dass eine Nachricht gelesen wurde. Bilder, Dateien und Sprachnachrichten gehen direkt, was schneller ist: Für sie sieht das Relay die IP-Adresse deines Telefons. |
| **Alles** | Auch Dateien. Nichts geht ohne Tor an ein Relay. |
| **Nichts** | Das Relay sieht bei allem die IP-Adresse deines Telefons. |

**Warum:** Mit **Nachrichten** wird, was du schreibst, von Tor verborgen und wartet nie darauf, während Bilder, Dateien
und Sprachnachrichten, die groß sind, direkt und damit schneller gehen.

- **Was es verbirgt:** Das Relay sieht nicht mehr die IP-Adresse deines Telefons, nur einen Tor-Ausgang (oder nichts,
  bei einem Relay mit \`.onion\`-Adresse). Deine Telefongesellschaft oder das WLAN sieht nur, dass du Tor nutzt, nicht
  welches Relay.
- **Was es kostet:** Was über Tor geht, kommt und geht langsamer, und der erste Start von Tor dauert eine Weile. Der
  Bildschirm zeigt, wie weit Tor ist. Um den Akku zu schonen, sendet Erevos das reduzierte Padding, das Tor für
  Telefone gemacht hat: Das Füllmaterial, das Tor sendet, um zu verbergen, wann du redest, geht alle 9 bis 14
  Sekunden, nicht alle paar, und zum Telefon kommt keines.
- **Was es nicht abdeckt:** Anrufe, deren Ton und Bild direkt zwischen den Telefonen oder über das Anruf-Relay gehen;
  Telefone in der Nähe und SMS, die das Internet nicht nutzen.
- **Nur auf Android:** Erevos auf einem Computer und die Web-App haben noch kein Tor, also geht dort alles direkt.

> Mit **Nachrichten** wartet eine Nachricht nie auf Tor: Eine, die Tor nicht zum Relay bringen konnte, geht sofort
> direkt, und ebenso Nachrichten, während Tor startet, oder eine Minute lang, nachdem es das Relay nicht erreichen
> konnte; dann wird Tor erneut versucht. Mit **Alles** geht nichts ohne Tor an ein Relay:
> Wenn Tor das Relay nicht erreichen kann, wartet die Nachricht und wird erneut versucht; Erevos weicht nie von selbst
> auf deine eigene Verbindung aus.

### Brücken

Wo Tor selbst blockiert ist, lässt **Brücken** auf demselben Bildschirm Tor sein Netz stattdessen über Brücken
erreichen. Es steht auf **Keine Brücken**, solange du nichts wählst, jeder Bereich hat seine eigene Wahl, und es zählt
nur, solange etwas über Tor geht.

| Wahl | Was es ist |
| --- | --- |
| **obfs4** | Die obfs4-Brücken, die der Tor Browser mitbringt. Für jeden, der das Netz beobachtet, sieht Tor wie zufällige Bytes aus. Ein Zensor, der sie kennt, kann sie blockieren. |
| **Snowflake** | Über die Browser von Freiwilligen, über WebRTC, so wie ein Videoanruf geht. Um einen zu finden, fragt Erevos den Broker von Snowflake über ein CDN, hinter dem Namen einer anderen Seite, und STUN-Server sagen dem Telefon seine eigene Adresse: Sie sehen diese Adresse, nie deine Nachrichten. Langsamer und schwer zu blockieren. |
| **Eigene** | Brückenzeilen von bridges.torproject.org, von bridges@torproject.org per E-Mail oder von @GetBridgesBot auf Telegram, eingefügt, eine pro Zeile; tippe dann auf **Diese Brücken nutzen**. obfs4, Snowflake, WebTunnel, meek und einfache Brücken funktionieren. |

- **Nur über sie:** Mit Brücken geht Tor nie direkt zu seinen Relays. Wenn keine Brücke antwortet, warten Nachrichten
  mit **Alles**, wie wenn Tor das Relay nicht erreichen kann; mit **Nachrichten** gehen sie ohne Tor an das Relay, bis
  eine antwortet. Zeilen, die keine Brücken sind, werden nicht angenommen, und Tor bleibt aus.
- **Sie zu ändern**, während Tor läuft, schließt seine Verbindungen und baut sie auf die neue Art wieder auf.
- **Nur auf Android:** Die App bringt lyrebird mit, das eigene Programm von Tor für obfs4, Snowflake, WebTunnel und
  meek. Ein Computer und die Web-App haben noch kein Tor, also auch keine Brücken.

## Über Nostr {#nostr}

Unter **Einstellungen** → **Relay und Netze** → **Nostr** steht **Texte über Nostr** auf **An**, sofern du es nicht
änderst. Dann geht, was du einem Kontakt schreibst, dessen Erevos auch auf Nostr liest, über öffentliche Nostr-Relays,
über Tor, statt über dein Relay. Jeder Bereich hat seine eigene Wahl und seine eigenen Nostr-Relays.

- **Wie es versiegelt wird:** Ende-zu-Ende-verschlüsselt wie immer, dann noch einmal versiegelt für einen Schlüssel,
  den dein Kontakt nur diesem Chat gegeben hat, und signiert mit einem Schlüssel, der nur für diesen einen Text
  gemacht wurde (ein NIP-59 Gift Wrap). Die Nostr-Relays sehen, dass jemand an einen Schlüssel geschrieben hat, der
  niemanden nennt, wann und wie groß; nicht, wer es geschrieben hat, noch an wen. Dein Relay sieht es überhaupt nicht.
- **Was die Nostr-Relays erkennen können:** Dein Telefon fragt jedes von ihnen auf einmal nach all seinen Schlüsseln,
  über Tor: Ein Relay kann erkennen, dass diese Schlüssel zusammen gelesen werden, nie von wo. Jedes Relay wird über
  eigene Tor-Circuits erreicht, sodass kein Tor-Ausgang trägt, was an zwei von ihnen geht, und keines erkennen kann,
  dass es von einem Telefon ist. Manche Relays lehnen manche Tor-Ausgänge ab, und manche Ausgänge können ein Relay
  nicht erreichen: Nach einem solchen Fehlschlag geht der nächste Versuch über einen anderen Ausgang.
- **Nur über Tor:** Mit Tor auf **Nichts**, oder während Tor startet, gehen Texte über dein Relay.
- **Die Relays:** relay.damus.io, nos.lol und relay.primal.net, sofern du sie nicht änderst; du kannst eigene
  hinzufügen, höchstens fünf. Deine Kontakte erfahren die Relays, auf denen du liest, und schreiben dir dort; eines,
  das einen Text annimmt, genügt.
- **Was auf deinem Relay bleibt:** Bilder, Dateien, Sprachnachrichten, Anrufe, Reaktionen und die Zeichen, dass eine
  Nachricht ankam oder gelesen wurde; und was du Kontakten auf einem iPhone oder einem Computer schreibst, die nicht
  auf Nostr lesen.
- **Welchen Weg sie ging:** Halte eine Nachricht gedrückt: Ihr Menü sagt **Über Nostr gesendet** oder
  **Über Nostr gekommen**, wenn ein Nostr-Relay sie angenommen hat. Eine, die nichts sagt, ging über dein Relay oder in
  der Nähe. Der Hinweis unter den Nachrichten sagt auch **Gesendet: über Nostr**. Zwei Telefone nebeneinander geben
  sich Texte zuerst in der Nähe: Um Nostr auszuprobieren, schalte auf beiden Bluetooth und
  **Erevos im selben WLAN finden** aus.
- **Was die Relays zuletzt taten:** Der Bildschirm **Nostr** zeigt für jedes Relay, ob es den letzten Text, den es
  bekam, angenommen hat und wie viele Sekunden danach, oder warum nicht, und ob dein Telefon darauf liest. Das wird nur
  auf diesem Telefon aufbewahrt, bis Erevos sich schließt. Ein Relay, das einen Text angenommen, das aber nicht
  innerhalb von 20 Sekunden gesagt hat, zählt als eines, das es nicht tat: Der Text geht dann auch über dein Relay,
  und dein Kontakt sieht ihn einmal.
- **Nur auf Android,** wie Tor.

**Warum:** Die Nostr-Relays sind öffentlich, also erreicht Erevos sie nur über Tor, und sie erfahren nie, wo dein
Telefon ist. Nur Texte gehen dorthin: Ein Text hat dein Relay als Reserve, falls er nicht ankommt, während die Zeichen,
dass eine Nachricht ankam oder gelesen wurde, keine hätten, und eine für später gesendete Nachricht dein Relay braucht,
das sie bis zu ihrer Zeit aufbewahrt. Bilder und Sprachnachrichten über Nostr kommen erst noch.

> Sollte das Telefon deines Kontakts nicht innerhalb von fünf Minuten sagen, dass ein Text ankam, geht er auch über
> dein Relay, und dein Kontakt sieht ihn einmal. Wenn kein Nostr-Relay ihn annimmt, geht er sofort über dein Relay.

- **Versteckte Chats:** Sie lesen auch auf Nostr, solange sie offen sind, und auch geschlossen, solange
  **Empfangen, wenn geschlossen** für sie an und der Bereich offen ist (siehe [Versteckte Chats](#hidden)).
  Geschlossen zeigen sie trotzdem „New message“: Mit jedem Text über Nostr sendet dein Kontakt deinem Relay auch eine
  Klingel, eine Nachricht, die nichts sagt, die dein Relay wie bisher als eine zählt. Ohne Relay sagen ihr Kontaktlink
  und QR-Code, wo sie auf Nostr lesen, mit einem Schlüssel nur dieses Platzes, und Texte, Reaktionen und die Zeichen,
  dass eine Nachricht ankam, gehen dorthin, wie von einem Telefon ohne Relay.

### Ganz ohne Relay {#nostr-only}

Ein Telefon ohne Relay, ohne Einladung und ohne LPHL-Konto kann trotzdem anfangen: Sein Kontaktlink und QR-Code sagen,
wo es auf Nostr liest, und das genügt, um zu reden.

- **Anfangen:** Tippe in **Neuer Chat** auf **Ohne Relay anfangen**, dann auf **Meinen QR-Code zeigen** oder
  **Meinen Kontaktlink teilen**, und gib ihn jemandem, der Erevos nutzt. Wer ihn hinzufügt, schreibt dir über Nostr,
  über Tor, und erscheint als Nachrichtenanfrage, die du annimmst. Du kannst auch seinen Link oder QR-Code hinzufügen,
  auf dieselbe Weise.
- **Was geht:** Texte, Sticker, Reaktionen, Bearbeitungen und die Zeichen, dass eine Nachricht ankam oder gelesen
  wurde, alles über Nostr. Fotos, Sprachnachrichten, Dateien, Anrufe und Gruppen brauchen ein Relay oder das andere
  Telefon in der Nähe. Versteckte Chats funktionieren auch so, nur über Nostr (siehe [Versteckte Chats](#hidden)).
- **Wenn er nicht ankommt:** Die Nostr-Relays bewahren einen Text zwei Tage auf. Bis das Telefon deines Kontakts sagt,
  dass er ankam, gibt Erevos ihn ihm einmal am Tag erneut, zwei Wochen lang.
- **Ein Relay von selbst:** Wenn dein Kontakt ein Relay hat, das ihn einladen lässt, sendet sein Erevos deinem von
  selbst einmal eine Einladung dazu, im Chat, ob ihr euch zuerst über Nostr oder in der Nähe getroffen habt, über
  Bluetooth, WLAN oder einen QR-Code. Dein Telefon nimmt sie von selbst an, und ab dann funktionieren auch Fotos,
  Sprachnachrichten und Anrufe, mit allen. Sie zählt als eine seiner Einladungen. Jemand, dessen Nachrichtenanfrage du
  nicht angenommen hast, wählt kein Relay für dich: Seine Einladung wartet, bis du ihn annimmst, höchstens eine Woche.
- **Ein älteres Erevos** liest den Nostr-Teil eines Links nicht: Es erreicht dich nur in der Nähe, bis du ein Relay
  hast.

**Warum:** Nostr ist nur der Weg hinein. Niemand braucht eine Einladung, um anzufangen, und sobald einer von euch ein
Relay hat, trägt es, was für Nostr zu groß ist.

## Matrix {#matrix}

Unter **Einstellungen** → **Relay und Netze** → **Matrix** kann sich ein Bereich bei einem Matrix-Konto anmelden, um mit
Menschen zu chatten, die Element oder eine andere Matrix-App nutzen. Erevos spricht selbst mit dem Matrix-Server, wie
Element: Keine Brücke sitzt dazwischen.

- **Anmelden:** deine Matrix-ID, etwa @name:matrix.org, und ihr Passwort. Erevos wird ein neues Gerät des Kontos,
  namens Erevos. Anmeldung und Schlüssel des Geräts bleiben verschlüsselt nur in diesem Bereich, nie in seinen
  versteckten Chats, und noch nicht in Sicherungen.
- **Chats:** **Neuer Chat** beginnt einen verschlüsselten Chat mit einer Matrix-ID. Einladungen stehen oben, mit
  **Beitreten** und **Ablehnen**.
- **Verschlüsselung:** Nachrichten sind Ende-zu-Ende-verschlüsselt, mit Matrix' eigener Verschlüsselung (Olm und
  Megolm, über vodozemac). Ein nicht verschlüsselter Chat sagt es.
- **Nicht anonym:** Der Matrix-Server sieht dein Konto, wer mit wem spricht und wann, und ohne Tor auch, von wo. In
  einem Chat mit Menschen auf anderen Servern sehen es auch diese.
- **Über Tor:** Auf Android folgt Matrix der Wahl dieses Bereichs unter **Einstellungen** → **Relay und Netze** →
  **Tor**. Mit **Nachrichten** geht alles, auch Fotos, über Tor, sobald Tor bereit ist, und direkt, solange Tor
  startet oder wenn es scheitert; mit **Alles** nur über Tor; mit **Nichts** direkt. Der Matrix-Bildschirm sagt,
  welchen Weg es gerade nimmt.
- **Nachrichten von vorher:** Eine Nachricht von bevor Erevos sich anmeldete, oder eine, deren Schlüssel noch nicht
  kam, erscheint gesperrt.
- **Fotos und Dateien:** **Foto** und **Datei** senden sie, bis 50 MB, auf dem Telefon verschlüsselt, bevor sie zum
  Matrix-Server gehen, der so nur behält, was er nicht lesen kann. Ein erhaltenes Foto wird erst geladen, wenn du
  **Foto anzeigen** tippst; **Speichern** legt jede Datei auf dem Telefon ab.
- **Per Emoji prüfen:** In einem Chat mit einer Person zeigt **Per Emoji prüfen** euch beiden sieben Bilder; sind sie
  gleich und in derselben Reihenfolge, tippt auf beiden Telefonen **Stimmen überein**. Dann kann niemand unbemerkt
  dazwischensitzen, und der Chat zeigt **Per Emoji geprüft**. **Dieses Gerät mit einem anderen von dir prüfen**, auf
  dem Matrix-Bildschirm, macht dasselbe mit deinem eigenen Element, damit es dem Gerät von Erevos vertraut. Element
  kann beides auch beginnen.
- **Sicherheitsschlüssel:** Unter **Sicherheitsschlüssel** auf dem Matrix-Bildschirm gibst du den Sicherheitsschlüssel
  (oder die Sicherheitsphrase) ein, den Element erstellt hat: Frühere Nachrichten öffnen sich aus der Schlüsselsicherung
  des Kontos, neue Schlüssel kommen hinein, und deine anderen Geräte vertrauen diesem. Ein Konto ohne kann hier
  **Sicherheitsschlüssel einrichten**; schreib ihn auf, denn Erevos behält ihn nicht.
- **Noch nicht:** Sprachnachrichten und Anrufe.

**Warum:** Erevos' eigene Chats verbergen, wer mit wem spricht; ein Matrix-Server kann das nicht. Darum bleiben
Matrix-Chats getrennt und markiert, für die Menschen, die du sonst nur über Matrix erreichst.

## XMPP {#xmpp}

Unter **Einstellungen** → **Relay und Netze** → **XMPP** kann sich ein Bereich bei einem XMPP-Konto anmelden, um mit
Menschen zu chatten, die Conversations, Monal, Gajim, Dino oder eine andere XMPP-App nutzen. Erevos spricht selbst mit
dem XMPP-Server, wie diese Apps: Keine Brücke sitzt dazwischen.

- **Anmelden:** deine XMPP-Adresse, etwa name@example.org, und ihr Passwort. Erevos findet den Server über die Adresse;
  **Server** brauchst du nur, wenn es ihn nicht findet (ein Name, Name:Port oder eine wss://-Adresse). Erevos wird ein
  neues Gerät des Kontos. Anmeldung und Schlüssel des Geräts bleiben verschlüsselt nur in diesem Bereich, nie in seinen
  versteckten Chats, und noch nicht in Sicherungen.
- **Chats:** **Neuer Chat** nimmt die Adresse in deine Kontakte auf, bittet die Person, dich sehen zu lassen, wann sie
  online ist, wie andere XMPP-Apps es tun, und öffnet den Chat. Wer dich hinzufügen möchte, steht oben in der Liste und
  auf dem XMPP-Bildschirm, mit **Annehmen** und **Ablehnen**. Die Kontakte, die das Konto schon hat, stehen unter
  **Kontakte**.
- **Verschlüsselung:** Nachrichten werden mit OMEMO verschlüsselt (Version 0.3, die Conversations, Monal, Gajim und Dino
  sprechen), für jedes ihrer Geräte und für die anderen Geräte deines Kontos, die mitlesen. Es ist Erevos' eigener
  Code, nicht geprüft, gegen eine andere OMEMO-Bibliothek getestet. Haben ihre Apps kein OMEMO, sagt Erevos es und
  schreibt nur, wenn du für diesen Chat **Ohne Verschlüsselung schreiben** wählst; **Wieder verschlüsseln** geht zurück.
- **Ihre Schlüssel:** unten im Chat stehen die Fingerabdrücke ihrer Geräte. Vergleiche sie auf einem anderen Weg als dem
  Chat mit dem, was ihre App zeigt. Ein Schlüssel, der sich seit dem ersten Sehen geändert hat, sagt es. Der Schlüssel
  dieses Geräts steht auf dem XMPP-Bildschirm.
- **Markierungen:** ein Haken beim Senden, zwei, wenn ihre App sie hat, drei, wenn sie gelesen wurde, wie in Erevos'
  eigenen Chats, bei Apps, die diese Markierungen senden.
- **Nachrichten von vorher:** Was kam, während Erevos geschlossen war, wird beim Verbinden aus dem Archiv des Servers
  geholt, wenn er eines führt. Eine Nachricht von vor der Anmeldung dieses Geräts oder nicht für es bestimmt erscheint
  gesperrt.
- **Anrufe:** Die zwei Kacheln oben im Chat rufen die Person an, mit Sprache oder mit Video, auf demselben
  Anrufbildschirm wie Erevos' eigene Anrufe, und ihre Anrufe klingeln hier genauso, solange dieser Bereich offen ist;
  ein Anruf von jemandem, der nicht in deinen Kontakten ist, zeigt sich nur als verpasst. Es klappt mit Apps, die so
  anrufen wie Conversations (Jingle, geklingelt mit XEP-0353). Der Anruf selbst ist verschlüsselt (DTLS-SRTP), aber der
  Fingerabdruck seines Schlüssels geht so, wie er ist, über die XMPP-Server, nicht Ende-zu-Ende-verschlüsselt, sodass
  sich diese Server dazwischenschalten könnten. Er geht über das Anruf-Relay dieses Bereichs, wenn es eines gibt, sonst
  über den TURN-Server des XMPP-Servers, und nur darüber, sodass die andere Person deine Adresse nicht erfährt; ohne
  beides geht er direkt, und sie erfährt sie. Ein Anruf geht nie über Tor: Das Anruf-Relay oder der TURN-Server sieht
  die Adresse dieses Telefons.
- **Nicht anonym:** Der XMPP-Server sieht dein Konto, deine Kontakte, wer mit wem spricht und wann, und ohne Tor auch,
  von wo. Der Server der anderen Person sieht dasselbe von seinen Chats mit dir.
- **Über Tor:** Auf Android folgt XMPP der Wahl dieses Bereichs unter **Einstellungen** → **Relay und Netze** → **Tor**:
  Mit **Nachrichten** geht es über Tor, sobald Tor bereit ist, und direkt, solange Tor startet oder wenn es scheitert;
  mit **Alles** nur über Tor; mit **Nichts** direkt. Der XMPP-Bildschirm sagt, welchen Weg es gerade nimmt. Wo Erevos
  keine eigene Verbindung öffnen kann (die Web-App, ein Computer), nutzt es den WebSocket des Servers, direkt, und ein
  Server ohne ihn ist dort nicht erreichbar.
- **Noch nicht:** Fotos und Dateien, Gruppenchats und Gruppenanrufe, Video zu einem Sprachanruf hinzufügen und OMEMO 2.

**Warum:** Erevos' eigene Chats verbergen, wer mit wem spricht; ein XMPP-Server kann das nicht. Darum bleiben XMPP-Chats
getrennt und markiert, für die Menschen, die du sonst nur über XMPP erreichst.

## SMS {#sms}

Auf Android kann Erevos die SMS-App des Telefons sein: Tippe unter **Einstellungen** → **Telefon und SMS** → **SMS** →
**Erevos als SMS-App** auf **Erevos zur SMS-App machen**. Der Startbildschirm zeigt dann SMS und Erevos-Chats in einer
Liste.

> **SMS und MMS werden von Erevos nicht verschlüsselt.** Sie reisen wie jede SMS und bleiben im eigenen SMS-Speicher
> von Android, wo jede App, die SMS lesen darf, sie sieht und die Backups von Android sie enthalten. Nur Erevos-Chats
> sind Ende-zu-Ende-verschlüsselt.

- **SMS von vorher:** Nichts zu importieren. Erevos zeigt die SMS und MMS, die schon auf dem Telefon sind, aus dem
  eigenen Speicher von Android, wo sie für jede andere SMS-App bleiben. Android bewahrt sie auf, nicht von Erevos
  versiegelt, wie bei jeder SMS-App.
- **Wenn Erevos nicht zur SMS-App wird:** Android 15 und neuer können das bei einer aus einem Browser installierten App
  zurückhalten. Tippe unter **Einstellungen** → **Telefon und SMS** → **SMS** → **Erevos als SMS-App** auf
  **Standard-Apps öffnen** → **SMS-App** → Erevos. Wenn Android es eine eingeschränkte Einstellung nennt, öffne die
  **App-Info von Erevos**, tippe oben rechts auf **⋮** → **Eingeschränkte Einstellungen zulassen** und wähle Erevos
  erneut.
- **Wenn eine SMS kommt:** Eine Benachrichtigung sagt „New message“, ohne wer sie geschickt hat oder was sie sagt.
  Wenn keine kommt, zeigt **Erevos als SMS-App** **Benachrichtigungen erlauben**, solange Android sie zurückhält.
- **Einmalcodes:** Eine SMS, die sagt, dass sie einen Code enthält (von einer Bank, von einer Anmeldung), in irgendeiner
  der Sprachen der App, bekommt **Code kopieren** darunter im Chat und auch in ihrer Benachrichtigung, ohne dass der
  Code dort erscheint; auf Android 12 und neuer bittet die Taste der Benachrichtigung zuerst darum, das Telefon zu
  entsperren. Nur seine 4 bis 8 Ziffern werden kopiert, nie eine Telefonnummer, ein Betrag, ein Datum oder eine
  Uhrzeit, und Android zeigt keine Vorschau davon. Jede App, die die Zwischenablage liest, kann sie lesen, also füge den
  Code bald ein.
- **Wenn keine SMS erscheinen:** Android 15 und neuer halten die SMS-Berechtigung bei einer aus einem Browser
  installierten App zurück. Tippe unter **Einstellungen** → **Telefon und SMS** → **SMS** → **Erevos als SMS-App** auf
  **SMS erlauben**. Wenn Android es eine eingeschränkte Einstellung nennt, öffne die **App-Info von Erevos**, tippe
  oben rechts auf **⋮** → **Eingeschränkte Einstellungen zulassen** und erlaube SMS unter **Berechtigungen**. Als RCS
  gesendete Chats („Chat“ in Google Messages) bleiben in dieser App und erscheinen nicht.
  **Erevos als SMS-App** sagt, wie viele SMS-Unterhaltungen Erevos liest, oder warum es sie nicht lesen konnte.
- **Jemandem mit Erevos schreiben:** Das geht über Erevos, Ende-zu-Ende-verschlüsselt, sobald seine Nummer mit seinem
  Kontakt verknüpft ist. Verknüpfe sie von Hand in der SMS-Unterhaltung, oder lass eine versteckte Einladung sie
  finden. Ab dann öffnet seine SMS-Unterhaltung seinen Chat.
- **Seine SMS im Chat:** Die SMS und MMS mit seiner Nummer, die von vorher und die, die kommen, erscheinen zwischen den
  Nachrichten des Chats nach Zeit, jede umrandet und als **SMS (nicht verschlüsselt)** markiert, mit ihrem ✓ und ihren
  Fotos. Halte eine gedrückt, um sie zu kopieren, weiterzuleiten oder zu löschen, wie in der SMS-Unterhaltung. Sie
  bleiben in den SMS des Telefons, nie im versiegelten Verlauf des Chats; nur die Unterhaltung mit dieser einen Nummer
  erscheint, keine Gruppen-MMS, und nur, solange Erevos die SMS-App ist oder SMS lesen darf, nie in versteckten Chats.
  Die neuesten erscheinen zuerst: **Frühere SMS zeigen**, über ihnen, holt weitere, und auch die Suche des Chats findet
  sie. Den Chat zu öffnen liest alle seine, auch die früheren, sodass auf dem Startbildschirm keine als ungelesen
  gezählt bleibt. Eine Nummer auf seiner Kontaktkarte macht dasselbe, ohne sie zu verknüpfen.
- **Eine normale SMS an ihn:** zum Beispiel, wenn es kein Internet gibt. **Normale SMS** in den **Details** des Chats
  öffnet seine SMS-Unterhaltung, um sie dort zu schreiben, und **+** → **Als SMS senden**, oder **Als SMS**, wenn du
  den Sendepfeil gedrückt hältst, sendet das Eingegebene als eine, nach einer Rückfrage. Sie erscheint im Chat als SMS.
  Die Telefongesellschaft kann sie lesen. Eine SMS kann weder verschwinden noch auf eine Nachricht antworten: Mit
  eingeschalteter Stoppuhr oder einer Nachricht, auf die geantwortet wird, sagt Erevos das, wenn es fragt.
- **Versteckte Einladungen:** Mit der ersten SMS an eine Nummer, die kein Kontakt ist, sendet Erevos auch eine kurze
  versteckte Einladung. An die Nummer eines Erevos-Kontakts, verknüpft oder auf seiner Kontaktkarte, geht keine. Ein
  Telefon ohne Erevos zeigt nichts; ein Telefon mit Erevos antwortet über das Relay, und die beiden werden Kontakte.
  Jede Nummer wird höchstens einmal im Monat gefragt, und **Einladungen ausschalten**, unter **Einstellungen** →
  **Telefon und SMS** → **SMS** → **Erevos hinter einer Nummer finden**, beendet sie.

**Warum:** Damit sich zwei Erevos-Telefone allein über eine Telefonnummer finden, ohne einen Server, der Nummern kennt.
Die Einladung ist eine Daten-SMS, die Messaging-Apps nicht anzeigen, also zeigt ein Telefon ohne Erevos nichts.

- **Alle anderen:** eine normale SMS, als SMS markiert. Die Telefongesellschaft kann sie lesen, wie sie jede SMS liest.
- **✓ und ✓✓✓:** Eine SMS von dir zeigt ✓, sobald sie gegangen ist, und ✓✓✓, sobald der Zustellbericht des Netzes
  sagt, dass sie auf dem anderen Telefon angekommen ist, oder „nicht zugestellt“. Manche Telefongesellschaften senden
  keine Zustellberichte; dann bleibt sie bei ✓. SMS können nicht sagen, ob sie gelesen wurden.
- **Fotos (MMS):** Das Bild vor dem Nachrichtenfeld (**Foto**) fügt ein Foto hinzu, verkleinert, damit es in eine MMS
  passt (etwa 280 KB), mit nichts darin außer dem Bild. Fotos, die per MMS kommen, erscheinen in der Unterhaltung. Eine
  MMS ist so offen wie eine SMS: Die Telefongesellschaft kann sie sehen.
- **Gruppen-MMS:** Gib unter **Einstellungen** → **Telefon und SMS** → **SMS** → **Neue SMS** mehrere Nummern durch
  Kommas getrennt ein und tippe auf **Schreiben**. Jede Nachricht geht an alle als eine MMS, auch reiner Text, und ihre
  Antworten kommen in dieselbe Unterhaltung, jede mit dem, der sie geschrieben hat. Alle darin sehen die Nummern aller,
  und die Telefongesellschaft sieht alles davon.
- **Zwei SIMs:** Die SIM zum Senden erscheint über dem Nachrichtenfeld; tippe einmal auf **SIM wählen**, damit Erevos
  sie sehen kann. Deine Wahl wird für diese Nummer gespeichert; bis dahin antwortet Erevos über die SIM, auf der die
  letzte Nachricht kam. Jede Nachricht zeigt ihre SIM.
- **SMS später:** Halte das runde **Senden** hinter dem Feld gedrückt und wähle eine Zeit, wie in einem Chat. Die SMS
  erscheint am Ende der Unterhaltung als **Geplant** markiert; tippe darauf, um sie abzubrechen. Sie geht zu dieser
  Zeit, auch wenn Erevos geschlossen und gesperrt ist; ist das Telefon dann aus, sobald es wieder an und entsperrt ist.
  Bis dahin ist sie nicht in den SMS des Telefons, wo andere Apps sie sähen, und die Telefongesellschaft hat sie nicht.
  Sie wartet verschlossen mit einem Schlüssel des Telefons selbst (Android Keystore), nicht mit dem Passwort deines
  Bereichs, da Android sie senden muss, während Erevos gesperrt ist: der Schutz, den jede SMS nach dem Senden hat, da
  gesendete SMS in den SMS des Telefons bleiben. Nur Text, an eine Nummer.
- **Links:** Eine Webadresse in einer SMS ist unterstrichen und öffnet sich wie in einem Chat, sobald du sie
  vollständig gesehen hast.
- **Namen aus deinen Kontakten:** Anfangs aus, sodass SMS-Nummern als Nummern erscheinen. **Namen**, über der Liste,
  schaltet sie frei (wie **Namen aus meinen Kontakten zeigen** unter **Einstellungen** → **Telefon und SMS** → **SMS**
  → **Namen aus deinen Kontakten**): die Namen, die die Kontakte deines Telefons SMS-Nummern geben, und die Bilder, die
  sie für sie haben, oder sonst die deiner nur in Erevos gespeicherten Kontakte, in der Liste und in der Unterhaltung.
  Tippe erneut auf **Namen**, um nur Nummern zu sehen. Erevos liest sie nur, um sie zu zeigen, und behält keine Kopie.
- **Absender mit Namen:** Eine SMS von einem Namen statt einer Nummer, etwa von einer Bank, lässt sich zum Lesen
  öffnen, aber nicht beantworten.

### Die SMS in Ordnung halten

- **Gedrückt halten:** Halte in der Liste eine SMS-Unterhaltung gedrückt, um zu sehen, was sie kann: **Oben anheften**,
  **Archivieren**, **Als Spam markieren**, **Blockieren** und **Löschen**, und **Zu Kontakten hinzufügen** für eine
  Nummer, die keiner deiner Kontakte ist. In einer Unterhaltung zeigt **⋮** oben dasselbe, und eine solche Nummer hat
  **Zu Kontakten hinzufügen** auch unter ihrem Namen: ein neuer Kontakt mit der Nummer darin.
- **Angeheftet:** Bis zu 10 SMS-Unterhaltungen bleiben oben in der Liste, mit einer Nadel. **Loslösen** lässt eine an
  ihren Platz zurück.
- **Archivierte Unterhaltungen:** aus der Liste heraus, unter **Archiviert** oben auf dem Startbildschirm. Eine kommt
  von selbst in die Liste zurück, wenn eine neue SMS von dort kommt, oder mit **Aus dem Archiv holen**.
- **Papierkorb:** Eine gelöschte Unterhaltung wartet 30 Tage im **Papierkorb**, dann löscht Erevos sie aus den SMS des
  Telefons. Bis dahin legt **Zurückholen** sie zurück in die Liste; **Jetzt löschen** und **Papierkorb leeren** löschen
  sofort, endgültig. Eine SMS, die kommt, nachdem die Unterhaltung im Papierkorb gelandet ist, erscheint wieder in der
  Liste. Nur die SMS-App darf SMS löschen.
- **Spam:** ein Filter, der nur auf dem Telefon arbeitet, nach Regeln, und nichts irgendwohin sendet. Eine SMS von einer
  Nummer, die kein Kontakt ist und der du nie geantwortet hast, kommt in **Spam**, wenn sie einen Link mit Worten hat,
  die täuschen wollen, etwa ein zurückgehaltenes Paket oder ein Gewinn, oder eines der Worte, die du unter
  **Einstellungen** → **Telefon und SMS** → **SMS** → **Spamfilter** hinzufügst. **Als Spam markieren** und
  **Kein Spam** entscheiden endgültig für eine Nummer. Eine Benachrichtigung sagt trotzdem „New message“, wenn Spam
  kommt, da sie erscheint, bevor Erevos geöffnet wird. Jede Unterhaltung in **Spam**, im Ordner und oben in der
  Unterhaltung, sagt, warum sie dort ist: Die Nummer ist blockiert, du hast sie markiert, deine Regel nennt den
  Absender, eine Nummer aus dem Ausland, dein Wort oder ein Link und welche Worte.
- **Regeln zu Absendern:** Unter **Spamfilter** nimmt **Absender** den Namen eines Absenders, wie Läden und Banken ihn
  senden (Buchstaben, ohne Akzente oder Groß- und Kleinschreibung), oder eine Nummer, wobei \`*\` für alles steht:
  \`+4470*\` ist jede Nummer, die so beginnt, \`1234*\` jede Kurzwahl, die so beginnt, und mit bekannter Landesvorwahl
  ist \`69*\` auch jede Nummer \`+3069...\`. **In den Spam** schickt ihre dorthin; **Durchlassen** hält die Regeln des
  Filters von ihnen fern, etwa von denen deiner Bank oder deiner Familie, wobei eine Nummer, die du als Spam markiert
  oder blockiert hast, trotzdem dorthin kommt. **Nummern aus dem Ausland in den Spam** schickt jede Nummer dorthin, die
  mit einer anderen Landesvorwahl als **Deine Landesvorwahl** geschrieben ist, die Erevos aus den Nummern übernimmt,
  denen du antwortest, und die du ändern kannst. Eine ohne Vorwahl geschriebene Nummer ist von hier. Tippe auf eine
  Regel, um sie zu entfernen.
- **Blockieren:** **Blockieren** im Menü einer Unterhaltung, oder **Einstellungen** → **Telefon und SMS** → **SMS** →
  **Blockierte Nummern**, setzt eine Nummer auf die eigene Liste blockierter Nummern von Android: Android weist ihre
  SMS, MMS und Anrufe ab, und jeder Bereich und die Telefon-App sehen dieselbe Liste. Nur die SMS-App oder die
  Telefon-App darf sie sehen und ändern.
- **Entwürfe:** Was du eingibst und nicht sendest, bleibt bei dieser Unterhaltung, und die Liste zeigt es als
  **Entwurf**. Eine SMS, die nicht gehen konnte, bleibt dort auch als Entwurf.
- **SMS zurückholen:** Eine SMS, die du sendest, wartet zuerst 5 Sekunden am Ende der Unterhaltung: Tippe dann darauf,
  um sie zurück ins Nachrichtenfeld zu holen. **Einstellungen** → **Telefon und SMS** → **SMS** → **SMS zurückholen**
  stellt **Aus**, 5 oder 10 Sekunden ein. Wenn du Erevos verlässt, geht sie sofort.
- **Erneut senden:** Eine von dir, die nicht gegangen ist oder nicht zugestellt wurde, sagt das: Tippe darauf, um sie
  erneut zu senden. Halte eine beliebige Nachricht gedrückt für **Weiterleiten**, **Erneut senden** und **Löschen**,
  mit ihren Worten zum Auswählen und Kopieren; eine gelöschte Nachricht hat auch **Rückgängig**.
- **Weiterleiten:** Halte eine Nachricht gedrückt → **Weiterleiten**, gib dann eine Nummer ein und tippe auf
  **Schreiben**, oder wähle einen Kontakt unter **In einen Erevos-Chat**. Sie öffnet sich in dieser Unterhaltung, um
  sie dort zu lesen und zu senden. An eine Nummer geht auch ihr Bild mit, als MMS; in einen Chat nur ihre Worte.
- **Jeder Bereich für sich:** Anheftungen, archivierte Unterhaltungen, der Papierkorb, Spam-Markierungen und Entwürfe
  gehören zum Bereich, versiegelt mit seinem Passwort. Die SMS selbst bleiben in den SMS des Telefons: Ein anderer
  Bereich sieht sie, wie sie sind, und eine, die hier im Papierkorb ist, erscheint dort, bis sie vom Telefon gelöscht
  wird.

## Telefon {#phone}

Auf Android kann Erevos die Telefon-App des Telefons sein: Tippe unter **Telefon** im Menü auf **Einstellungen** →
**Erevos zur Telefon-App machen**. Jeder Anruf erscheint dann auf dem eigenen Anrufbildschirm von Erevos, und tel:-Links
und die Anruftaste des Telefons öffnen die Wähltasten von Erevos. **Telefon** öffnet sich auch über den Hörer oben auf
dem Startbildschirm und hat ein eigenes Symbol in den Apps des Telefons, **Telefon**, grün mit einem Hörer auf dem
Zeichen von Erevos, das die Wähltasten öffnet. Jedes davon, wie ein tel:-Link,
öffnet es, sobald Erevos entsperrt ist: mit Passwort, nachdem du es eingegeben hast, außer das Telefon öffnet sich ohne
(siehe „Das Passwort von Erevos“ weiter unten). Bis dahin sagt eine Karte oben **Erevos ist nicht die Telefon-App**;
auf einem kleinen Telefon zeigt sie nur diesen Titel, und ein Tippen darauf öffnet die **Einstellungen** des Telefons.

- **Kontakte durchsuchen:** Gib oben im Telefon einen Namen, eine Nummer oder einen Teil davon ein: Die Kontakte mit
  einer Nummer erscheinen statt der Tabs, jede Nummer in einer eigenen Zeile. Tippe auf eine, um sie anzurufen, oder
  halte sie gedrückt, um sie auf die Wähltasten zu legen. Es sucht in den Kontakten des Telefons und, bei entsperrtem
  Erevos, in den nur in Erevos gespeicherten und deinen Erevos-Kontakten mit Nummer; nie in versteckten Chats.
- **Der Anrufbildschirm:** wer anruft oder wen du anrufst, mit dem Namen und Foto, das die Kontakte deines Telefons
  ihm geben; solange Erevos entsperrt ist, zeigt eine mit einem deiner Erevos-Kontakte verknüpfte Nummer den Namen,
  den du ihm gegeben hast, und ebenso die Nummer eines nur in Erevos gespeicherten Kontakts; die eines Kontakts offener
  versteckter Chats nur, solange sie offen sind. Er erscheint über dem
  Sperrbildschirm und braucht kein Passwort, da ein Anruf bei gesperrtem Erevos angenommen werden muss. Ein
  eingehender Anruf zeigt **Answer**, **Decline** und **Message**, und Android klingelt mit dem eigenen Klingelton des
  Kontakts; die Lautstärketasten machen ihn leise. Im Anruf: **Mute**, **Keypad** für die Töne, nach denen ein Menü
  fragt, **Speaker**, **Hold**, **Add call** und **End**. Am Ohr geht der Bildschirm aus.
- **Wohin der Ton geht:** Mit einem Bluetooth-Gerät oder einem Headset nennt die Taste neben **Keypad**, wohin der Ton
  geht, und ein Tippen lässt dich wählen: das Telefon, der Lautsprecher, das Headset oder das Bluetooth-Gerät.
- **Ein zweiter Anruf:** Einer, der während eines Anrufs kommt, zeigt **Hold and answer**, **End and answer** und
  **Decline**. Mit einem gehaltenen Anruf sagt es die Zeile unter dem Namen: Tippe darauf, oder auf **Swap**, um mit
  dem anderen zu sprechen. **Merge** legt die beiden zu einem Anruf zusammen, wenn deine Telefongesellschaft es
  erlaubt.
- **Mit einer Nachricht ablehnen:** **Message**, bei einem klingelnden Anruf, lehnt ihn mit einer Schnellantwort ab,
  oder mit einer, die du schreibst, die dein Telefon dem Anrufer als SMS schickt; sie erscheint zwischen deinen SMS.
  Unter **Telefon** → **Einstellungen** ändert **Schnellantworten** sie: **Antwort hinzufügen**, **Entfernen**,
  **Speichern** und **Die üblichen Antworten nutzen**. Sie werden auf dem Telefon aufbewahrt, nicht versiegelt, da der
  Anrufbildschirm sie bei gesperrtem Erevos zeigt.
- **Die Wähltasten:** Gib unter **Telefon** eine Nummer ein und tippe auf **Anrufen**; halte **0** für +. Gedrückt
  gehalten, fügt das Nummernfeld eine ein. **Add call**, während eines Anrufs, öffnet sie, sobald Erevos entsperrt ist.
- **Zwei SIMs:** Tippe über **Anrufen** auf die SIM, über die du anrufen willst; beim ersten Mal bittet **SIM wählen**
  Android, Erevos sie sehen zu lassen. Eine Nummer, die du ohne Wahl anrufst, fragt mit **Anrufen über**, welche.
  Erevos merkt sich die SIM, die du für jede Nummer genutzt hast, versiegelt im Bereich, und ruft beim nächsten Mal
  über dieselbe an. Der Anrufbildschirm nennt die SIM jedes Anrufs.
- **Die Anrufe:** Unter **Telefon** listet **Anrufliste** die Anrufliste von Android, die neuesten zuerst, unter jedem
  Tag: wer, was für ein Anruf es war, über welche SIM und wie. **Alle**, **Verpasst**, **Eingehend**, **Ausgehend**
  und, sobald ein Anruf blockiert wurde, **Blockiert** filtern sie; mit zwei SIMs behält **SIM 1** oder **SIM 2** die
  Anrufe dieser SIM. Aufeinanderfolgende Anrufe mit derselben Nummer erscheinen einmal, mit ihrer Anzahl. **☏** ruft
  zurück; ein Tippen auf die Zeile zeigt ihre Anrufe, wie lange jeder dauerte, und **Anrufen** (mit zwei SIMs einmal
  für jede), **SMS senden**, **Zu Kontakten hinzufügen** für eine Nummer, die keiner deiner Kontakte ist, und
  **Nummer vor dem Anrufen ändern**. Dort angesehen, verschwinden verpasste Anrufe aus der Benachrichtigung von Android,
  und diese Benachrichtigung öffnet die **Anrufliste**.
- **Anrufe löschen:** In den Anrufen der Zeile löscht **Diesen Anruf löschen** (oder **Diese 3 Anrufe löschen**, bei
  einer Zeile mit mehreren) sie aus der Anrufliste von Android, **Löschen** neben einem von mehreren löscht nur diesen,
  und **Alle Anrufe mit dieser Nummer löschen**, wenn es mehr gibt, löscht sie alle, auch die älteren. **Rückgängig**
  erscheint vorher für ein paar Sekunden; bis dahin sind sie nur verborgen.
- **Favoriten:** die in den Kontakten deines Telefons mit Stern markierten Kontakte, mit ihren Fotos. Ein Tippen ruft
  die Standardnummer des Kontakts an, oder fragt, welche, wenn es mehrere gibt und keine Standard ist; gedrückt
  gehalten, zeigt es alle.
- **WLAN-Telefonie und HD Voice:** Der Anrufbildschirm sagt es unter dem Namen, wenn ein Anruf über WLAN oder mit HD
  Voice geht, und die **Anrufliste** sagt es für jeden Anruf.
- **Anrufe blockieren:** Unter **Telefon** → **Einstellungen** blockiert **Telemarketing blockieren** Anrufe von den
  Nummern, die manche Länder für Telemarketing vorsehen: Frankreich (01 62, 01 63, 02 70, 02 71, 03 77, 03 78, 04 24,
  04 25, 05 68, 05 69, 09 48, 09 49 und 09 475 bis 09 479, nach der Entscheidung 2022-1583 der ARCEP), Spanien (400,
  seit dem 17. Oktober 2026), Chile (809), Indien (140) und Brasilien (0303, das Anrufer dort seit August 2025
  weglassen dürfen). Andere Länder sehen keine solchen Nummern vor, oder Erevos ist sich nicht sicher, also wird für
  sie nichts blockiert. Gib unter **Nummern, die beginnen mit** den Anfang weiterer zu blockierender Nummern ein, mit
  der Landesvorwahl (+33 162) oder so, wie du sie hier wählst (0162), und tippe auf **Blockieren**; **Entfernen** nimmt
  einen weg. Diese blockieren nie eine Nummer aus den Kontakten deines Telefons. Ein blockierter Anruf klingelt nicht
  und hinterlässt keine Benachrichtigung; er erscheint in der **Anrufliste** unter **Blockiert**. Android fragt
  einmal, ob Erevos Anrufe prüfen darf (**Erevos Anrufe prüfen lassen**): Ohne das klingelt ein blockierter Anruf
  einen Moment, bevor Erevos ihn beendet. Was blockiert ist, ist in jedem Bereich gleich, verrät also nichts über einen
  anderen, und wird auf dem Telefon ohne Namen aufbewahrt.
- **Blockierte Nummern:** Unter **Telefon** → **Einstellungen** ist **Blockierte Nummern** die eigene Liste von
  Android, dieselbe wie unter **Einstellungen** → **Telefon und SMS** → **SMS** → **Blockierte Nummern**: Gib eine
  Nummer ein und tippe auf **Blockieren**, oder tippe auf eine, um die Blockierung aufzuheben. In der **Anrufliste**
  zeigen die Anrufe einer Zeile **Diese Nummer blockieren** oder **Blockierung dieser Nummer aufheben**, mit
  **Rückgängig**. Android weist ihre Anrufe ab, bevor sie klingeln, und ihre SMS und MMS. Jeder Bereich sieht dieselbe
  Liste.
- **Eine Kontaktgruppe für eine Weile:** Unter **Telefon** → **Einstellungen** listet **Eine Kontaktgruppe
  blockieren** die Gruppen (die Labels) der Kontakte deines Telefons auf. **Blockieren** neben einer blockiert die
  Anrufe ihrer Kontakte **Eine Stunde lang**, **Bis morgen früh** (7:00) oder **Bis ich es aufhebe**; die Zeile unter
  der Gruppe sagt, bis wann, und **Aufheben** beendet es früher. Ein solcher Anruf wird wie die anderen blockiert: Er
  klingelt nicht und erscheint in der **Anrufliste** unter **Blockiert**. Erevos liest die Gruppen nur und bewahrt die
  ID der Gruppe und die Zeit auf, nicht ihren Namen. Solange eine Gruppe blockiert ist, sagt es der Bildschirm
  **Telefon** oben, bis wann, mit **Aufheben**.

**Warum:** Ein Anruf wird auch bei gesperrtem Erevos geprüft, also kann, was blockiert ist, nicht in einem Bereich
versiegelt sein; und für jeden Bereich gleich aufbewahrt, verrät es nichts über einen von ihnen.

- **Das Passwort von Erevos:** Der Bildschirm **Telefon**, mit den Wähltasten, den Anrufen und den Favoriten, liegt
  wie der Rest von Erevos dahinter. Nur der Anrufbildschirm nicht, außer du lässt das Telefon ohne Passwort öffnen:
  unter **Telefon** → **Einstellungen**, **Telefon ohne Passwort öffnen** (anfangs aus, und nur gezeigt, solange
  Erevos ein Passwort hat). Bei gesperrtem Erevos öffnen das Symbol des Telefons, ein tel:-Link und die
  Benachrichtigung eines verpassten Anrufs dann die Wähltasten, die **Anrufliste** und die **Favoriten**, die Android
  für jede Telefon-App führt, nur mit den Namen aus den Kontakten des Telefons: nie die nur in Erevos gespeicherten
  oder die versteckter Chats, und keine für eine Nummer gemerkte SIM. Dort kannst du anrufen, mehr nicht: kein Löschen,
  Blockieren, keine SMS und kein Hinzufügen zu Kontakten. **Erevos öffnen** oben zeigt den Passwortbildschirm, ebenso
  das eigene Symbol von Erevos, nachdem Erevos mehr als 30 Sekunden im Hintergrund war, außer ein dort geführter Anruf
  hat es weggebracht. **Telefon wieder hinter das Passwort** schaltet es aus.
- **Wenn Erevos nicht zur Telefon-App wird:** Wie bei SMS können Android 15 und neuer das bei einer aus einem Browser
  installierten App zurückhalten. Tippe unter **Einstellungen** auf **Standard-Apps öffnen** → **Telefon-App** →
  Erevos. Wenn Android es eine eingeschränkte Einstellung nennt, öffne die **App-Info von Erevos**, tippe oben rechts
  auf **⋮** → **Eingeschränkte Einstellungen zulassen** und wähle Erevos erneut. **Anrufe und Kontakte erlauben**
  erscheint, solange Android noch Anrufe, die Anrufliste oder die Kontakte zurückhält.
- **Nach einem Neustart des Telefons:** Bis du das Telefon zum ersten Mal entsperrst, nimmt der eigene
  Anrufbildschirm von Android an.
- **Was ein Telefonanruf ist:** ein normaler Telefonanruf, wie bei jeder Telefon-App: Die Telefongesellschaft
  überträgt ihn und kann mithören. Anrufe an deine Erevos-Kontakte aus einem Chat sind etwas anderes:
  Ende-zu-Ende-verschlüsselt, über das Internet.

## Kontakte {#contacts}

Auf Android zeigt **Kontakte** im Menü die Kontakte des Telefons: die in den eigenen Kontakten von Android, die auch
deine anderen Apps nutzen, also gibt es nichts zu importieren. Android fragt einmal, ob Erevos sie lesen und ändern
darf (**Kontakte erlauben**). Sie öffnen sich auch über die Person oben auf dem Startbildschirm und haben ein eigenes
Symbol in den Apps des Telefons, **Kontakte**, violett mit einer Person auf dem Zeichen von Erevos, das sie hinter der
Sperre von Erevos öffnet: mit Passwort, sobald du es eingibst.

- **Jemanden finden:** **Kontakte durchsuchen** sucht in jedem Feld: Namen, Nummern (wie auch immer geschrieben, mit
  oder ohne Landesvorwahl), E-Mail-Adressen, Adressen, die Firma, der Geburtstag und die Notiz. **Favoriten** zeigt
  nur die Kontakte mit Stern.
- **Ein Kontakt:** Tippe auf einen, um alles davon zu sehen. Tippe auf eine Nummer, um sie anzurufen, oder auf
  **SMS** daneben, um ihr in Erevos zu schreiben; tippe auf eine E-Mail-Adresse oder eine Adresse, um sie zu öffnen.
  **Zu Favoriten hinzufügen** oben gibt ihm einen Stern, in den Kontakten von Android, sodass auch die Telefon-App ihn
  unter den Favoriten aufführt.
- **Neuer Kontakt** und **Bearbeiten:** Vor- und Nachname, Firma und Position, so viele Nummern, E-Mail-Adressen und
  Adressen, wie du brauchst, jede mit ihrer Art (**Mobil**, **Privat**, **Geschäftlich**, **Andere**), ein Geburtstag
  (Tag/Monat/Jahr oder Tag/Monat) und eine Notiz. Ein neuer Kontakt wird **Nur auf diesem Telefon** gespeichert oder in
  einem Konto, mit dem das Telefon Kontakte synchronisiert (Google), wie du wählst. Was Erevos von einem Kontakt nicht
  zeigt, etwa die eigenen Angaben einer anderen App, bleibt, wie es war.
- **Foto:** Tippe auf das Bild oben bei einem Kontakt, um mit **Foto auswählen** eines aus den Fotos des Telefons zu
  wählen, mit **Foto aufnehmen** eines mit der Kamera aufzunehmen oder es mit **Foto entfernen** zu entfernen. Du
  schneidest es quadratisch zu, und Erevos zeichnet es neu, sodass nichts, was das Foto außer seinem Bild sagte (ein Ort, ein
  Telefon), aufbewahrt wird. Es wird mit dem Kontakt in den Kontakten von Android gespeichert, wo das Telefon es zeigt,
  wenn er anruft.
- **Klingelton:** Bei einem Kontakt öffnet **Klingelton wählen** die eigene Auswahl von Android, mit den Tönen des
  Telefons und denen, die du hinzugefügt hast; das Telefon klingelt damit, wenn dieser Kontakt anruft.
  **Standard-Klingelton** dort gibt den des Telefons zurück.
- **.vcf-Dateien:** **Aus einer .vcf-Datei importieren** im Menü der Kontakte liest eine vCard-Datei, die ein anderes
  Telefon oder eine andere App gespeichert hat (jede ihrer Versionen, auch die alter griechischer Telefone), und
  speichert die, die noch nicht auf dem Telefon sind, mit ihren Fotos und Gruppen, nur auf diesem Telefon oder in einem
  Konto. **Als .vcf-Datei speichern** dort speichert die angezeigten Kontakte (alle, die Favoriten, eine Gruppe oder
  was die Suche fand) als eine Datei, in einem Ordner, den du wählst; bei einem Kontakt speichert es diesen einen. Die
  Datei ist außerhalb von Erevos und nicht versiegelt: Jeder, der sie hat, kann die Kontakte lesen.
- **QR-Codes:** **QR-Code** bei einem Kontakt zeigt seine vCard als QR-Code, den die Kamera eines anderen Telefons als
  hinzuzufügenden Kontakt liest: seinen Namen, Nummern, E-Mail-Adressen, Adressen und Notiz, ohne sein Foto (eine lange
  Notiz oder viele Adressen werden weggelassen, damit er passt). Wer ihn sieht, kann ihn lesen.
  **QR-Code eines Kontakts lesen** im Menü liest einen aus einem Foto, das du aufnimmst oder wählst, hier auf dem
  Telefon, und beginnt damit einen neuen Kontakt, der erst gespeichert wird, wenn du ihn speicherst. Der Erevos-QR-Code
  von jemandem beginnt einen mit seiner Erevos-ID.
- **Duplikate:** **Duplikate finden** im Menü listet die Kontakte auf, die aussehen wie dieselbe Person, zweimal
  gespeichert: derselbe Name (seine Wörter in beliebiger Reihenfolge), dieselbe Nummer oder E-Mail-Adresse.
  **Zusammenführen** behält den vollständigsten davon, mit jeder Nummer, E-Mail-Adresse und Adresse der anderen, ihren
  Notizen, und ihrem Foto, Klingelton, Stern und ihren Gruppen, wenn er keine hat, und löscht die anderen;
  **Alle zusammenführen** macht das für jede Gruppe von Duplikaten. **Nicht dieselben** blendet eine Gruppe aus, bis du
  die Liste wieder öffnest.
- **Geburtstage:** Der Chip **Geburtstage** unter der Suche listet die Kontakte mit Geburtstag auf, den nächsten
  zuerst, mit der Anzahl verbleibender Tage und dem Alter, das sie erreichen. **Geburtstagserinnerungen** im Menü
  (anfangs aus) setzt am Morgen jedes Geburtstags eine Benachrichtigung, ab 9:00, auch bei geschlossenem Erevos; auf
  dem Sperrbildschirm sagt sie nur, dass es einen Geburtstag gibt. Es sind nur die Geburtstage der Kontakte des
  Telefons, nie die von nur in Erevos gespeicherten Kontakten.
- **SIM-Kontakte** im Menü liest die Kontakte auf den SIM-Karten des Telefons und kopiert die, die noch nicht auf dem
  Telefon sind (anfangs alle gewählt), in die Kontakte von Android, nur auf diesem Telefon oder in ein Konto. Die SIM
  behält ihre eigenen.
- **Nur in Erevos:** Unter **Gespeichert in** kann ein neuer Kontakt stattdessen **Nur in Erevos** gespeichert werden:
  versiegelt in diesem Bereich wie seine Chats, nie in den Kontakten von Android, sodass keine andere App und kein
  Konto ihn sieht und andere Apps nur seine Nummer zeigen; der Anrufbildschirm von Erevos zeigt seinen Namen, solange
  Erevos entsperrt ist. Er hat ein Schloss in der Liste, und der Chip **Nur in Erevos** zeigt nur diese.
  **Nur in Erevos speichern** bei einem Telefonkontakt holt ihn herein, mit seinem Foto und Stern, und löscht ihn aus
  den Kontakten des Telefons; **In die Kontakte des Telefons verschieben** bringt ihn wieder hinaus. Sein Foto wird mit
  ihm versiegelt. Gruppen, Klingeltöne und Geburtstagserinnerungen gehören zu Android, also hat er keine. Ein Anruf
  oder eine SMS an ihn geht trotzdem über das Telefon und erscheint in der Anrufliste und den SMS des Telefons wie jede
  andere. Ein Erevos-Backup enthält diese Kontakte, versiegelt.
- **In versteckten Chats:** **Kontakte** oben in offenen versteckten Chats listet ihre eigenen Kontakte, nur dort
  gespeichert und mit ihnen versiegelt: Sie erscheinen nirgendwo sonst, nicht einmal in den Kontakten des Bereichs,
  und der Bildschirm zeigt nichts mehr, sobald sich die versteckten Chats schließen. Ein neuer Kontakt dort ist immer
  einer von ihren. Man kann einem ein Foto geben, da versteckte Chats offen bleiben, während du es wählst oder
  aufnimmst. Ihr Menü hat nur, was ihnen gehört: **Aus einer .vcf-Datei importieren** bewahrt die Kontakte einer Datei
  bei ihnen auf, versiegelt, nie in den Kontakten des Telefons; **Als .vcf-Datei speichern** speichert die angezeigten,
  oder einen auf seiner Karte, in einem Ordner, den du wählst (außerhalb von Erevos und nicht verschlüsselt);
  **QR-Code eines Kontakts lesen** beginnt einen ihrer Kontakte. Eine dort eingegebene oder gelesene Erevos-ID fügt ihn
  den versteckten Chats hinzu, nie denen des Bereichs. Einen davon über die Telefon-App anzurufen, schließt die
  versteckten Chats, sobald Erevos mehr als 30 Sekunden weg ist, und der Anruf erscheint in der Anrufliste der
  Telefon-App.
- **Erevos-ID:** Die Erevos-ID eines Kontakts ist der Kontaktlink, den sein Erevos zeigt, unter
  **Meinen Kontaktlink kopieren** oder als sein QR-Code. Füge sie auf der Karte eines Kontakts, oder unter
  **Erevos-ID**, wenn du einen schreibst, ein, oder lies sie mit **Foto des QR-Codes aufnehmen** oder
  **Foto des QR-Codes auswählen**: **Zu Erevos hinzufügen** (oder **Speichern**) fügt ihn deinen Erevos-Chats hinzu,
  die sich mit ihm öffnen, und verknüpft den Kontakt mit ihm, und der Chat übernimmt den Namen des Kontakts, wenn er
  keinen eigenen hat. Ein Kontakt, der ein Erevos-Kontakt ist, zeigt den Anfang seines Schlüssels als **Erevos-ID**.
- **Erevos-Kontakte:** Ein Kontakt, der dieselbe Person ist wie einer der Erevos-Kontakte deiner Chats, erscheint mit
  ihm als eine Karte: über eine in Erevos mit ihm verknüpfte Nummer, über seine Erevos-ID oder mit
  **Aus meinen Erevos-Chats wählen** auf seiner Karte, eine im Bereich versiegelte Verknüpfung, nie in den Kontakten
  von Android (**Nicht dieser Erevos-Kontakt** macht sie rückgängig). Die Karte hat dann **Nachricht**, **Anrufen** und
  **Video**, Ende-zu-Ende-verschlüsselt über Erevos statt über die Telefongesellschaft. Ein Kontakt der Chats, der
  kein Kontakt ist, hat eine eigene Karte, mit dem Schild, wo **Zu Kontakten hinzufügen** einen macht und
  **Mit einem meiner Kontakte verknüpfen** ihn mit einem verknüpft, den du hast, dessen Karte ihn dann zeigt; der Chip
  **Erevos-Kontakte** listet sie alle. Ein Erevos-Kontakt ohne eigenen Namen übernimmt den Namen des mit ihm
  verknüpften Kontakts, wenn sie verknüpft werden oder wenn sich die Karte dieses Kontakts öffnet; ein Name, den du ihm
  in Erevos gegeben hast, bleibt, und einer, den du geleert hast, kommt dann vom Kontakt zurück. In versteckten Chats
  sind das die eigenen Kontakte der versteckten Chats, und ihr Chat öffnet sich dort.
- **Verlauf:** Die Karte eines Kontakts listet seine letzten Anrufe aus der Anrufliste des Telefons, seine SMS und
  seine Nachrichten in Erevos auf, die neuesten zuerst; tippe auf einen Eintrag, um zurückzurufen, eine SMS zu
  schreiben oder den Chat zu öffnen. Die Anrufe erscheinen, sobald du Erevos die Anrufliste lesen lässt
  (**Anrufe zeigen**). Erevos liest sie nur, um sie zu zeigen, und behält keine Kopie.
- **Andere Apps:** **Zu Kontakten hinzufügen** einer anderen App (eine Nummer in der Telefon-App, eine E-Mail-Adresse
  in der Mail-App) kann sich in Erevos öffnen: ein neuer Kontakt mit dem, was diese App übergeben hat, oder die Liste,
  um auf den Kontakt zu tippen, dem es hinzugefügt werden soll. Eine App, die einen Kontakt zeigt oder ändert, kann ihn
  auch in Erevos öffnen, hinter der Sperre von Erevos. Android fragt, welche App es nutzen soll; wähle Erevos. Eine App,
  die dich einen Kontakt oder eine Nummer, E-Mail-Adresse oder Adresse wählen lässt, bekommt nur den Eintrag, auf den
  du tippst, aus den Kontakten des Telefons: Die nur in Erevos gespeicherten erscheinen dort nie.
- **Löschen** nimmt den Kontakt vom Telefon, aus jedem Konto, in dem er gespeichert ist; einen nur in Erevos
  gespeicherten aus Erevos.
- **Gruppen:** **Gruppen** im Menü der Kontakte (die drei Punkte) listet die eigenen Gruppen von Android auf, etwa
  Familie oder Arbeit, mit der Anzahl darin, und macht neue. Öffne eine, um mit **Kontakte hinzufügen** Kontakte
  hinzuzufügen, mit **×** einen herauszunehmen, sie mit **Umbenennen** umzubenennen oder mit **Gruppe löschen** zu
  löschen (ihre Kontakte bleiben). Bei einem Kontakt legt
  **Gruppen wählen** ihn in Gruppen oder nimmt ihn heraus. Die Chips unter der Suche zeigen die Kontakte einer Gruppe.
  Eine Gruppe wird in einem Konto aufbewahrt, wie ihre Kontakte: Ein Kontakt tritt ihr nur bei, wenn er auch in diesem
  Konto gespeichert ist.

## Passwortsperre {#lock}

Unter **Einstellungen** → **Datenschutz und Sicherheit** → **Sperre und zweites Passwort** hat
**Sperren, wenn Erevos öffnet** zwei Möglichkeiten: **Keine Sperre** und **Passwort**.

1. Tippe auf **Passwort**, gib es zweimal ein (mindestens 4 Zeichen) und tippe auf **Speichern**.
2. Ab dann fragt Erevos bei jedem Öffnen danach, und erneut nach 30 Sekunden im Hintergrund.
3. **Passwort ändern** ändert es, und **Jetzt sperren** sperrt Erevos sofort.

- **Gesperrt, und es empfängt weiter:** Wenn Erevos sich sperrt, legt sich der Passwortbildschirm vor den offenen
  Bereich, der dahinter weiterläuft: Nachrichten und Anrufe kommen weiterhin, mit ihren Benachrichtigungen, und ein
  Anruf erscheint über dem Passwortbildschirm. Seine Bildschirme schließen sich, versteckte Chats auch, und der
  Anrufbildschirm zeigt die Namen seiner Kontakte nicht mehr. Sein Passwort öffnet ihn wieder; das Passwort eines
  anderen Bereichs schließt ihn zuerst, ohne dass etwas von ihm im Arbeitsspeicher bleibt.

- **Falsche Passwörter:** Nach 5 falschen Versuchen lässt dich jeder weitere warten, anfangs 30 Sekunden und jedes Mal
  doppelt so lange, bis zu einer Stunde. Die Zählung übersteht einen Neustart.
- **Was versiegelt ist:** Die Kontakte jedes Bereichs, die Schlüssel seiner Unterhaltungen, seine Nachrichten, seine
  Relay-Einstellungen und sein Aussehen werden auf dem Telefon versiegelt aufbewahrt, mit einem Schlüssel, den nur sein
  Passwort öffnet.
- **Die Liste sofort:** Der Startbildschirm bewahrt eine versiegelte Kopie seiner ersten Zeilen auf, sodass die Liste
  erscheint, sobald sich der Bereich öffnet, und sich dann aktualisiert. Sie ist immer gleich groß, verrät also
  niemandem, wie viele Chats es gibt oder welche Bereiche genutzt werden, und sie enthält nie, was eine verschwindende
  Nachricht sagte.

**Warum:** Jedes ausprobierte Passwort kostet absichtlich Zeit und viel Arbeitsspeicher (PBKDF2, dann Argon2id), damit,
wer kopiert, was das Telefon aufbewahrt, nicht schnell Passwörter ausprobieren kann; und wer das Telefon in der Hand
hat, wartet nach jedem falschen Versuch länger. Die Zählung gilt für das ganze Telefon, über Neustarts hinweg, da der
Passwortbildschirm kommt, bevor sich irgendein Bereich öffnet.

> Ein vergessenes Passwort lässt sich nicht wiederherstellen: Es ist nichts gespeichert, was die Daten ohne es öffnen
> könnte. Nur ein Fingerabdruck oder Gesicht, solange eingeschaltet, öffnet den ersten Bereich noch (siehe unten).

### Bildschirmfotos

Mit eingeschalteter Passwortsperre hält Android Erevos aus Screenshots, Bildschirmaufnahmen und den letzten Apps
heraus: Dort erscheint der letzte Bildschirm von Erevos leer, sodass, wer das entsperrte Telefon einen Moment in der
Hand hat, deine Chats darin nicht sieht. Unter **Einstellungen** → **Datenschutz und Sicherheit** →
**Bildschirmfotos** lässt **Ausschalten** Screenshots wieder funktionieren (etwa um einen zu verschicken), und
**Einschalten** stellt den Schutz wieder her. Versteckte
Chats bleiben immer draußen, solange sie offen sind, egal wie die Einstellung ist. Die Einstellung gehört dem Telefon
und ist in jedem Bereich gleich. Auf einem Computer und in der Web-App gibt es sie nicht.

**Warum:** Ohne sie bleibt der letzte Bildschirm von Erevos als Bild unter den letzten Apps, bis Erevos wieder öffnet,
deshalb bleiben versteckte Chats immer draußen, damit sie dort nie ohne ihre PIN erscheinen. Die Einstellung ist in
jedem Bereich gleich, damit sie nichts darüber verrät, welcher Bereich sich geöffnet hat.

### Fingerabdruck oder Gesicht

Auf Android 11 und neuer, mit einem in den Einstellungen des Telefons eingerichteten Fingerabdruck oder Gesicht, kann
sich Erevos auch damit öffnen. Es ist aus, solange du es nicht einschaltest.

1. Tippe bei eingeschalteter Passwortsperre unter **Fingerabdruck oder Gesicht** auf **Einschalten**.
2. Gib das Passwort des Bereichs ein, in dem du bist, tippe auf **Einschalten** und berühre den Sensor (oder schau auf
   das Telefon).
3. Ab dann hat der Passwortbildschirm eine Taste **Fingerabdruck oder Gesicht**. Das Passwort funktioniert auch immer,
   und **Ausschalten** schaltet es aus.

- **Nur der Bereich des ersten Passworts:** Ein Fingerabdruck öffnet nie den Bereich eines zweiten Passworts, und
  auch keine versteckten Chats. In dem Bereich eingeschaltet, den ein zweites Passwort öffnet, öffnet er nichts: Beim
  ersten Versuch schaltet er sich selbst aus, und das Passwort öffnet Erevos. Die Einstellung sieht in jedem Bereich
  gleich aus.
- **Unter Druck:** Jemand, der dich festhält, kann deinen Finger auf das Telefon drücken oder es dir vors Gesicht
  halten. Wenn das passieren kann, lass es aus: Dann braucht er ein Passwort, und du kannst ihm das zweite geben.
- **Wie es aufbewahrt wird:** Der Schlüssel des ersten Bereichs ist mit einem Schlüssel in der sicheren Hardware des
  Telefons (dem Android Keystore) versiegelt, der nur direkt nach einer starken Fingerabdruck- oder Gesichtsprüfung
  funktioniert, einmal für jede Nutzung. Einen Fingerabdruck oder ein Gesicht hinzuzufügen oder zu entfernen, lässt
  Android diesen Schlüssel verwerfen: Es ist dann aus, und du schaltest es wieder ein. Nichts verlässt das Telefon.
- **Welches Gesicht:** Ein Gesicht zählt nur, wo Android seine Gesichtsentsperrung als stark einstuft, etwa auf dem
  Pixel 8 und neuer; anderswo ist es der Fingerabdruck.
- **Falsche Passwörter** werden wie bisher gezählt: Ein Fingerabdruck ändert die Zählung nicht.
- **Nicht auf einem Computer oder im Web:** Es wird nur auf Android angeboten. Die Sperre auszuschalten, schaltet es
  auch aus.

**Warum:** Ein Finger lässt sich leichter erzwingen als ein Passwort, und jeder, dessen Finger oder Gesicht das Telefon
kennt, könnte es nutzen, also öffnet es nie den Bereich eines zweiten Passworts oder versteckte Chats. In einem anderen
Bereich eingeschaltet, bewahrt es einen Schlüssel auf, der nichts öffnet, in derselben Form, sodass das Gespeicherte
nicht zeigt, in welchem Bereich es eingeschaltet wurde.

## Zweites Passwort {#second}

Wenn dich jemand zwingt, Erevos zu öffnen, gib statt deines eigenen das zweite Passwort ein. Es öffnet ein separates,
leeres Erevos mit eigenen Kontakten, eigenem Relay und eigenem Aussehen. Deine echten Chats bleiben verborgen, und
nichts in der App zeigt, dass es sie gibt.

1. Tippe bei eingeschalteter Passwortsperre auf **Zweites Passwort festlegen**.
2. Gib es zweimal ein und tippe auf **Speichern**. Es muss sich von deinem eigenen Passwort unterscheiden.

- **Das Aussehen:** Der zweite Bereich beginnt mit dem Aussehen des Bereichs, in dem es festgelegt wurde, damit er
  nicht auffällt.
- **Eines nach dem anderen:** Ein erneut festgelegtes zweites Passwort ersetzt das vorherige.
  **Zweites Passwort entfernen** entfernt es.
- **Diskretion:** Zum Schutz deiner Privatsphäre zeigt die App nie, ob ein zweites Passwort festgelegt ist. In der
  Web-App mit eingeschalteten Benachrichtigungen, wenn geschlossen, bleibt die Zahl auf dem Symbol von Erevos, solange
  Erevos geschlossen ist: Passt sie nicht zu dem Bereich, den du öffnest, kann sie auf einen anderen hindeuten
  (**Zahl auf dem Symbol** schaltet sie aus).

## Versteckte Chats {#hidden}

Jeder Bereich hat 4 Plätze für versteckte Chats, jeder nur mit seiner eigenen PIN zu öffnen, und sie erscheinen nie
zwischen deinen anderen Chats. Es gibt nirgendwo eine Taste für sie. Jeder Platz kann einen Chat oder mehrere
enthalten, also haben 2 Bereiche 8 Plätze.

**Warum:** Jeder Platz hat schon eine eigene PIN, also hat ein Chat allein auf einem Platz einen eigenen Schlüssel, und
ein Platz kann auch mehrere Chats unter einer PIN enthalten. Die Zahl der Plätze ist aus zwei Gründen fest:

- **Damit nichts sichtbar wird.** Alle 4 Plätze gibt es ab dem ersten Start, ungenutzt mit Zufallsdaten gefüllt. Wer
  dich zwingt, das Telefon zu öffnen, oder kopiert, was es aufbewahrt, kann nicht erkennen, ob du versteckte Chats
  hast, oder wie viele. Mit einem Schlüssel für jeden Chat würden die versiegelten Dateien mit jedem neuen versteckten
  Chat wachsen und verraten, wie viele es gibt.
- **Damit es schnell bleibt.** Eine in die Suche eingegebene PIN wird an jedem Platz ausprobiert, und jeder Versuch ist
  absichtlich langsam (Argon2id, das viel Arbeitsspeicher und Zeit braucht, damit PINs nicht schnell erraten werden
  können). Mit 4 Plätzen bleibt das Öffnen kurz und dauert immer gleich lange, sodass auch die Zeit nicht verrät, wie
  viele genutzt werden.

Die Zahl kann später ohne Verlust erhöht werden, um den Preis eines etwas langsameren Öffnens; sie zu senken, würde
löschen, was die weggenommenen Plätze enthalten.

1. Lege einen Platz auf eine von zwei Arten an: Wähle unter **Einstellungen** → **Datenschutz und Sicherheit** →
   **Versteckte Chats** einen von **Platz 1** bis **Platz 4**, tippe auf **PIN für versteckte Chats festlegen**, gib sie zweimal
   ein und tippe auf **Speichern**; oder öffne die **Details** eines Chats, tippe auf
   **In versteckte Chats verschieben**, gib eine PIN mit 4 oder mehr Zeichen ein, tippe auf **Neue versteckte Chats**,
   wähle einen Platz, dann **Anlegen und verschieben**. Merke dir, welche Plätze du nutzt: Zum Schutz deiner
   Privatsphäre kann Erevos nicht sagen, welche frei sind.
2. Um sie zu öffnen, gib die PIN in **Chats durchsuchen** auf dem Startbildschirm ein und drücke Enter (die Suchtaste
   der Tastatur). Oder halte **Neuer Chat** eine Sekunde gedrückt: Ein Feld für die PIN öffnet sich, in jedem Bereich
   gleich; gib sie ein und tippe auf **Öffnen**. Es öffnet nur den Platz mit dieser PIN. Eine falsche PIN ist nur eine
   Suche oder schließt nur das Feld: Es passiert nichts.
3. Sie öffnen sich mit dem Titel **Versteckte Chats**, mit **Kontakte** und **PIN ändern** oben, und listen ihre Chats
   und Gruppen so auf, wie der Startbildschirm deine auflistet: die neuesten zuerst, jeder mit dem, was zuletzt gesagt
   wurde, wann und wie viele ungelesen sind. Tippe auf einen, um ihn zu öffnen. Der Zurück-Pfeil schließt sie.
4. Um einen weiteren Chat auf einen Platz zu verschieben, öffne seine **Details**, tippe auf
   **In versteckte Chats verschieben**, gib die PIN dieses Platzes ein und tippe auf **Verschieben**. Der
   Chat verlässt deine Liste mit seinen Nachrichten, seinem Namen, Bild und Aussehen und den darin importierten Chats,
   und seine Sicherheitsnummer bleibt gleich. Das Telefon des Kontakts
   erfährt sofort, dass es ab jetzt an die versteckten Chats schreiben soll; eine Nachricht, die es genau in diesem
   Moment sendet, kommt womöglich nicht an.
5. Um einen Chat zurück zu den Chats des Bereichs zu verschieben, öffne ihn in den versteckten Chats, dann seine
   **Details**, tippe auf **Zurück in meine Chats verschieben** und **Verschieben**. Er geht mit seinen Nachrichten,
   seinem Namen, Bild, Aussehen und den importierten Chats, und seinem Telefon wird gesagt, wohin es schreiben soll.

- **Nur Relay oder Nostr:** Versteckte Chats haben ihre eigene Relay-Warteschlange und ihre eigenen Schlüssel und
  nutzen nie die Verbindung in der Nähe. Ohne Relay sagt ihr Kontaktlink, wo sie auf Nostr lesen, mit einem Schlüssel
  nur dieses Platzes, und Texte gehen dorthin, wie von einem Telefon ohne Relay; Fotos, Sprachnachrichten, Anrufe und
  Gruppen brauchen ein Relay. Solange sie geschlossen sind, warten ihre Nachrichten auf dem Relay, oder zwei Tage lang
  auf Nostr, außer **Empfangen, wenn geschlossen** ist an.
- **Empfangen, wenn geschlossen:** ein Schalter oben auf jedem Platz. Eingeschaltet empfangen seine versteckten Chats
  wie deine anderen Chats, solange der Bereich offen ist, egal welcher Bildschirm zu sehen ist und mit Erevos im
  Hintergrund: Ihre Kontakte sehen sofort, dass eine Nachricht ankam, eine Benachrichtigung sagt nur „New message“,
  auf Android klingelt ein Anruf mit „Incoming call“ und ohne Namen (tippe auf dem Klingelbildschirm auf das kleine
  Zeichen, gib die PIN ein und tippe auf **Verbinden**, um anzunehmen), und eine Erinnerung aus ihrem „Chat mit mir
  selbst“ zeigt eine Benachrichtigung, die nur **Reminder** sagt. Was über Nostr zu ihnen kommt, wird dann auch
  gelesen. Ein Anruf, der endete, bevor du sie geöffnet hast, oder zu lange klingelte, erscheint als verpasst. Nichts
  von ihnen erscheint irgendwo, bis die PIN sie öffnet. Ein neuer Platz beginnt mit eingeschaltetem Schalter; vorher
  angelegte Plätze bleiben, wie sie waren, bis du ihn einschaltest. Dafür wird der Schlüssel des Platzes verschlüsselt
  mit dem Bereich aufbewahrt, zwischen einem Zufallsschlüssel für jeden anderen Platz, sodass das Öffnen des Bereichs
  nicht zeigt, welche Plätze empfangen oder angelegt sind. Aber wer den Bereich öffnet und kopiert, was das Telefon
  aufbewahrt, könnte auch diesen Platz öffnen, ohne PIN: Die PIN hält sie dann vor den Blicken dessen verborgen, der das
  Telefon in der Hand hat, nicht vor einem forensischen Werkzeug. Ausgeschaltet ist ihr Schlüssel nur hinter der PIN,
  und ihre Nachrichten warten auf dem Relay, bis du sie öffnest. Backups behalten den Schalter.
- **Sie schließen sich von selbst,** sobald Erevos mehr als 30 Sekunden im Hintergrund war, so wie sich die eigene PIN
  eines Chats wieder sperrt, aber nicht während eines Anrufs und nicht, während du ein Foto oder eine Datei für sie
  wählst oder ein Foto aufnimmst.
- **Solange sie offen sind,** spielt eine ankommende Nachricht den Ton für neue Nachrichten, wie in deinen anderen
  Chats. Mit Erevos im Hintergrund, bevor sie sich schließen, sagt eine Benachrichtigung „New message“ nur, wenn
  **Empfangen, wenn geschlossen** oder **Melden, wenn eine Nachricht kommt** für diesen Platz an ist.
- **Wie deine anderen Chats:** Was jetzt nicht gehen kann, wartet, als **Wartet** markiert, nur über ihr Relay, oder
  über Nostr ohne Relay (siehe **Wartet** unter [Chat über ein Relay](#relay)), **Später senden** funktioniert wie
  dort, und ein aus einer anderen App exportierter Chat kann in den Details eines versteckten Chats importiert werden
  (siehe [Importierte Chats](#import)). Ein Kontakt lässt sich auch dort über ein Foto seines QR-Codes hinzufügen,
  aufgenommen oder ausgewählt, während sie offen bleiben. Jeder Platz hat seinen eigenen **Chat mit mir selbst**, als
  ersten in seiner Liste (siehe **Chat mit mir selbst und Erinnerungen** unter [Erste Schritte](#start)).
- **Gruppen:** **Neue Gruppe**, unter ihrer Liste, macht eine Gruppe mit ihren Kontakten, wie auf dem Startbildschirm
  (siehe [Gruppenchats](#groups)), und sie erscheint in ihrer Liste zwischen ihren Chats. Ihre Mitglieder sind nur
  Kontakte dieses Platzes, und einer, den du daraus als Kontakt hinzufügst, wird ein Kontakt dieses Platzes. Was darin
  geschrieben wird, geht nur über das Relay des Platzes, in eine eigene Warteschlange dort, nie an ein Telefon in der
  Nähe; solange der Platz geschlossen ist, wird sie nur mit eingeschaltetem **Empfangen, wenn geschlossen** gelesen,
  und **Melden, wenn eine Nachricht kommt** zählt sie nicht. Ihre Anrufe klingeln nur, solange die versteckten Chats
  offen sind: Einer, der gestartet wird, während sie geschlossen sind, erscheint als verpasst. Eine Gruppe dort hat
  keine eigene PIN, und keine ist öffentlich.
- **Linkvorschauen** haben einen eigenen Schalter in den Details eines versteckten Chats, für alle Chats dieses
  Platzes, aus, solange du ihn nicht einschaltest (siehe **Linkvorschauen** unter [Chat über ein Relay](#relay)).
- **Melden, wenn eine Nachricht kommt** (Android): oben auf einem Platz, solange **Empfangen, wenn geschlossen** aus
  ist. Eingeschaltet sagt eine Benachrichtigung, solange der Platz geschlossen ist, nur „New message“ oder wie viele
  kamen, wie bei den anderen Chats, mit Erevos im Hintergrund oder sichtbar, jede Nachricht
  einmal, auch wenn Erevos geschlossen war und neu gestartet wurde; was kam, während der Platz offen war, macht keine,
  sobald er sich schließt. Dass eine Nachricht von dir bei ihnen ankam oder gelesen wurde, Tippen und neue Schlüssel
  machen keine, ebenso wenig ein Anruf, der geklingelt hat (siehe **Klingeln bei Anrufen, wenn geschlossen**); einer,
  der nicht geklingelt hat, zählt als Nachricht. Eine Nachricht oder eine Löschung, die andere Erevos-Telefone zum
  Relay mitgenommen haben (siehe **Von anderen Telefonen mitgenommen** in
  [Chat mit einem Telefon in der Nähe](#nearby)), kann nicht sagen, was sie trägt, da die Telefone, die sie tragen, es
  nicht wissen dürfen: Sie zählt als Nachricht, also zeigt auch eine Löschung „New message“, und die erste Nachricht
  eines Chats kann als zwei zählen; und eine ohne Ton gesendete meldet sich wie gewohnt (siehe **Ohne Ton senden**).
  Es braucht **Empfangen und klingeln** und **Neue Nachrichten melden** unter **Im Hintergrund**, was der Schalter
  sagt, wenn sie nicht an sind, und ein Relay, das wartet (ab dem 18. Oktober 2026); eines von vor dem 23. Oktober 2026
  kann nur sagen, dass etwas wartet, also erscheint dann auch dafür „New message“, einmal, bis du diesen Platz öffnest.
  Dafür führt der Bereich eine Relay-Warteschlange für jeden seiner 4 Plätze, die nicht genutzten zum Schein auf
  demselben Relay angelegt, sodass das Öffnen des Bereichs weder zeigt, ob versteckte Chats angelegt sind, noch welche,
  solange sie das Relay des Bereichs nutzen; das Relay wird nur gefragt, wie viele Nachrichten kamen, da es sie an dem
  Byte zählt, das jede trägt (siehe, was das Relay sieht, oben), nie nach ihnen selbst. Wer die Benachrichtigung sieht
  und in deinen Chats nichts Neues findet, kann ahnen, dass es mehr gibt. Nachdem du im Platz jemanden gelöscht oder
  blockiert hast, macht die erste Nachricht von jemand Neuem, über den Kontaktlink oder QR-Code des Platzes, keine:
  Sie zeigt sich, wenn du den Platz öffnest. Backups behalten es nicht: Schalte es nach dem Wiederherstellen erneut
  ein.
- **Klingeln bei Anrufen, wenn geschlossen** (Android): unter **Melden, wenn eine Nachricht kommt**, solange
  **Empfangen, wenn geschlossen** aus ist. Eingeschaltet lässt ein Anruf von einem seiner Kontakte, solange der Platz
  geschlossen ist, mit Erevos im Hintergrund oder auf irgendeinem Bildschirm, das Telefon klingeln und
  „Incoming call“ ohne Namen zeigen, wie ein Anruf aus deinen anderen Chats. Tippe auf dem Klingelbildschirm auf das
  kleine Zeichen, gib die PIN ein und tippe auf **Verbinden**, um anzunehmen; ein einfaches **Annehmen** kann ihn nicht
  verbinden, und **Ablehnen** beendet das Klingeln. Das Klingeln dauert etwa 45 Sekunden. Es braucht
  **Empfangen und klingeln** unter **Im Hintergrund**, was der Schalter sagt, wenn es nicht an ist, und ein Relay, das
  wartet, und nutzt für jeden der 4 Plätze eine
  eigene Relay-Warteschlange, die der nicht klingelnden zum Schein auf demselben Relay angelegt, wie bei der
  Nachrichten-Benachrichtigung oben, sodass das Öffnen des Bereichs nichts verrät. Der Anrufer lässt dort nur eine
  Warteschlange klingeln; der Anruf selbst wartet in der eigenen Warteschlange des Chats, bis die PIN ihn öffnet. Ein
  Kontakt, den du gelöscht hast, kann es trotzdem klingeln lassen, aber der Anruf kann sich nie verbinden. Ein von einem
  verknüpften Computer aus geführter Anruf klingelt nur, solange die versteckten Chats offen sind.
  Backups behalten es nicht: Schalte es nach dem Wiederherstellen erneut ein.
- **Eine neue PIN für einen Platz** (über **Versteckte Chats** in **Einstellungen** oder **Neue versteckte Chats**)
  beginnt ihn leer und ersetzt, was darin war. Um die Chats zu behalten und nur die PIN zu ändern, öffne sie und nutze
  dort **PIN ändern**. Jede PIN muss sich von den anderen und von dem Passwort unterscheiden, das Erevos öffnet.
- **Falsche PINs in der Suche** werden getrennt von denen des Sperrbildschirms gezählt: Nach fünf hören Suchen eine
  Weile auf, es zu versuchen, ohne es zu zeigen, und der Sperrbildschirm wartet nie ihretwegen.
- **Eine PIN hält fern, wer das Telefon in die Hand nimmt,** nicht, wer kopiert, was es aufbewahrt: Mit einem
  forensischen Werkzeug auf einem entsperrten oder gerooteten Telefon lassen sich PINs ohne Wartezeit ausprobieren.
  Jeder Versuch kostet Argon2id (viel Arbeitsspeicher und Zeit), aber eine PIN aus 4 Ziffern sind nur 10.000
  Versuche. Wenn du das fürchtest, nimm eine längere PIN oder ein paar Wörter.
- **Diskretion:** Jeder Bereich hat von Anfang an alle 4 Plätze, die ungenutzten mit Zufallsdaten gefüllt, die wie
  genutzte aussehen, und die Suche probiert jedes Mal jeden Platz. So zeigt nichts, ob versteckte Chats angelegt sind,
  oder wie viele.

### Ein mit PIN gesperrter Chat {#chat-pin}

Ein Chat oder eine Gruppe kann eine eigene PIN haben, unabhängig von versteckten Chats: Er bleibt zwischen deinen
Chats, öffnet sich aber nur mit seiner PIN.

1. Öffne den Chat, tippe oben auf **⋮** für seine **Details**, dann auf **Mit PIN sperren** (in einer Gruppe: oben auf
   den Namen der Gruppe, dann auf **Mit PIN sperren**).
2. Gib zweimal eine PIN mit mindestens 4 Zeichen ein, dann **Sperre**.

- **Ihn öffnen:** Er fragt nach der PIN. Er sperrt sich wieder, sobald du ihn verlässt, einen anderen Chat öffnest
  oder Erevos länger als eine halbe Minute weg ist (wie die Passwortsperre).
- **Hinter der PIN** erscheint nichts vom Chat: Keine seiner Nachrichten wird gezeichnet, bis die PIN eingegeben ist,
  und mit Glas, einem Hintergrund oder der eigenen Szene eines Stils liegt der PIN-Bildschirm auf dichtem Frost, der
  nichts durchlässt.
- **In der Liste** zeigt er seinen Namen mit einem Schloss und **Mit PIN gesperrt**, nichts von seinen Nachrichten,
  auch nicht in der Suche, in **Markierte Nachrichten** oder in **Importierte Chats**. Die Benachrichtigung sagt nur
  **New message**, wie bei jedem Chat.
- **Falsche PINs** werden auf dem Telefon gezählt, für alle Chats zusammen und getrennt von denen des
  Sperrbildschirms: Nach fünf wartet der nächste Versuch, jedes Mal länger.
- **PIN vergessen?** Unter der PIN, wo der Bereich ein Passwort hat, entfernt **PIN vergessen?** sie mit dem Passwort,
  das den Bereich öffnet. Ohne Passwort kann ihn nichts wieder öffnen: Den Kontakt zu löschen ist dann der einzige
  Weg.
- **In versteckte Chats:** Ein Chat, den du in versteckte Chats verschiebst, nimmt seine PIN mit, die dort nichts
  fragt, da die eigene PIN der versteckten Chats sie schützt. Zurück in die Chats verschoben, fragt dieselbe PIN
  wieder.
- **Sie entfernen:** **Details** → erneut **Mit PIN sperren**, und gib seine PIN ein.
- **Nur dieses Telefon kennt sie,** und jedes verknüpfte Gerät hat seine eigene. Backups behalten sie.

**Warum:** Manche Chats sollen bleiben, wo sie sind, aber nicht offen für jeden, der das Telefon einen Moment in der
Hand hat. Die PIN wird nur als ihr Argon2id aufbewahrt, sodass sie sich nicht vom Telefon lesen lässt und Raten
langsam ist. Sie ist eine Sperre auf dem Bildschirm, kein eigener Schlüssel: Die Nachrichten des Chats bleiben mit dem
Rest des Bereichs verschlüsselt, und wer kopiert, was das Telefon aufbewahrt, während der Bereich offen ist, könnte sie
trotzdem lesen. Für einen Chat, der nicht einmal gesehen werden darf, nutze versteckte Chats.

## Backups {#backup}

Ein Backup ist eine Datei, die alles enthält, was Erevos auf diesem Telefon aufbewahrt: jeden Bereich, mit seinen
Kontakten, den Schlüsseln seiner Unterhaltungen, seinen Nachrichten, Sprachnachrichten, importierten Chats und
versteckten Chats, seinem „Chat mit mir selbst“, und die Sperre. Darin bleibt jeder Bereich
mit seinem eigenen Passwort versiegelt, und die Datei wird noch einmal mit einem eigenen Passwort versiegelt. Backups
findest du unter **Einstellungen** → **Daten und Geräte** → **Backups**.

1. **Backup erstellen:** Tippe auf **Backup erstellen**, wähle einen Ordner (auf dem Telefon, einer Speicherkarte oder
   einer Cloud-App, die dort ihre Ordner zeigt; auf einem Computer jeden Ordner), gib zweimal ein Passwort für das
   Backup ein (mindestens 12 Zeichen oder vier Wörter) und tippe auf **Speichern**.
2. **Automatische Backups:** Wähle **Jeden Tag** oder **Jede Woche**, dann einen Ordner und ein Passwort. Erevos macht
   eines, wenn es öffnet und das letzte älter ist, und der Ordner behält die 3 neuesten. Darunter sind
   **Jetzt sichern**, **Ordner ändern** und **Passwort ändern**; **Aus** beendet sie, und die gemachten bleiben im
   Ordner.
3. **Auch auf einen Server:** Auf Android schickt **Server hinzufügen** unter **Auch auf einen Server**, bei
   eingeschalteten automatischen Backups, jedes davon auch in einen Ordner auf einem Server deiner Wahl, der WebDAV
   spricht, etwa deiner eigenen Nextcloud: Gib die Adresse des Ordners, einen Benutzernamen und am besten ein
   App-Passwort nur für Erevos ein, dann tippe auf **Verbinden**. Der Server behält die 3 neuesten; **Nicht mehr
   senden** beendet es, und die dort bleiben.
4. **Wiederherstellen:** Tippe auf **Backup wiederherstellen**, wähle die Datei und gib ihr Passwort ein. Erevos fragt
   noch einmal, setzt dann das Backup an die Stelle von allem auf dem Telefon und öffnet sich so, wie es war, als das
   Backup gemacht wurde, mit den damals genutzten Passwörtern.

- **Bewahre das Passwort des Backups auf:** Nichts öffnet ein Backup ohne es, und niemand kann es wiederherstellen.
  Ohne Passwortsperre ist das Passwort des Backups alles, was es schützt. Wer die Datei hat, kann Passwörter daran so
  schnell ausprobieren, wie sein Computer es schafft, ohne Telefon, das ihn bremst, also hält ein kurzes nicht: Erevos
  nimmt keines unter 12 Zeichen.
- **Automatische Backups bewahren ihr Passwort auf dem Telefon auf,** sodass sie nicht jedes Mal ein Passwort
  brauchen. Wer ihren Ordner öffnet, braucht trotzdem die Passwörter der Bereiche, um die Chats zu lesen.
- **Auf einem Server:** Das Backup, das dorthin geht, ist wie die anderen mit seinem Passwort versiegelt, und dieses
  Passwort verlässt nie das Telefon, also kann der Server es nicht öffnen. Sein Name ist zufällig und die Datei sieht
  aus wie zufällige Bytes, in einer von wenigen Größen, also sagt keines von beiden, dass es von Erevos ist, oder
  genau, wie viel es enthält. Der Server sieht aber dein Konto, die Adresse des Telefons, wann eines kommt und
  ungefähr wie groß es ist. Backups gehen direkt dorthin, nicht über Tor: Solange ein Bereich **Alles** über Tor
  sendet, geht keines. Zum Wiederherstellen lade das neueste vom Server herunter und tippe auf **Backup
  wiederherstellen**; ein Erevos vor dieser Version öffnet es nicht. Google Drive fehlt mit Absicht: Google verbindet
  die Datei mit deinem Namen, und Erevos bräuchte die Apps von Google und eine Google-Anmeldung auf dem Telefon.
- **Chats, die nach dem Backup weitergingen:** Das Wiederherstellen setzt die Schlüssel jeder Unterhaltung so zurück,
  wie sie damals waren. Nachrichten, die nach dem Backup kamen und schon gelesen waren, sind nicht darin, und ein Chat,
  der weiterging, kann aufhören, neue Nachrichten zu öffnen. Bitte den Kontakt dann erneut um seinen Kontaktlink. Bevor
  ein wiederhergestellter Chat wieder schreibt, springen seine Unterhaltungen über die Schlüssel hinaus, die sie seit
  dem Backup genutzt haben könnten, sodass nie ein Schlüssel zwei Nachrichten versiegelt: Einer, der zweimal
  versiegelt, würde jedem, der beide Pakete aufbewahrt hat, erlauben, die beiden zusammen zu lesen.
- **Ein Telefon nach dem anderen:** Ein auf einem zweiten Telefon wiederhergestelltes Backup liest dieselben
  Relay-Warteschlangen wie das erste, und jedes holt Nachrichten, die das andere dann nie bekommt. Nutze es, um auf ein
  neues Telefon umzuziehen, nicht um zwei zu führen.
- **Diskretion:** Jeder Bereich zeigt denselben Backup-Bildschirm, und ein Backup enthält jeden Bereich, also verrät
  keines von beiden, wie viele Bereiche es gibt oder ob versteckte Chats angelegt sind. Der Name der Datei sagt, dass
  sie ein Erevos-Backup ist, und ihre Größe zeigt ungefähr, wie viel aufbewahrt wird.
- **Die SMS des Telefons:** Auf Android fügt **SMS in Backups aufnehmen** ab dann jedem Backup die SMS und MMS des
  Telefons hinzu, mit bis zu 32 MB ihrer Bilder, solange Erevos die SMS-App ist. Sie werden wie der Rest mit dem
  Passwort des Backups versiegelt. Das Wiederherstellen des Backups legt jede Nachricht, die die SMS des Telefons noch
  nicht haben, dorthin zurück und löscht keine; Erevos muss dann auch die SMS-App sein, sonst wird der Rest ohne sie
  wiederhergestellt. Die SMS gehören dem Telefon und sind in jedem Bereich gleich. Ein älteres Erevos öffnet kein
  Backup, das SMS enthält.
- **Die SMS in Ordnung:** Die Anheftungen, archivierten Unterhaltungen, der Papierkorb, die Entwürfe, der Spamfilter
  und die Markierungen jedes Bereichs, und wie lange eine SMS wartet, bevor sie nicht mehr zurückgeholt werden kann,
  sind in jedem Backup, wie der Rest mit dem Passwort des Bereichs versiegelt. Die später gesendeten SMS
  (**SMS später**) nicht, damit ein auf einem anderen Telefon wiederhergestelltes Backup nie eine erneut sendet; auch
  nicht Einladungen, Namen aus deinen Kontakten und die für jede Nummer gewählte SIM. Ein älteres Erevos öffnet kein
  Backup, das sie enthält; eines, das ein älteres Erevos gemacht hat, wird wie immer wiederhergestellt, ohne sie.
- **Nicht in einem Backup:** Fotos und Dateien, noch nicht: Ein Backup wird im Arbeitsspeicher des Telefons gemacht,
  und sie würden nicht hineinpassen. Ein auf demselben Telefon wiederhergestelltes Backup zeigt sie wieder; auf einem
  anderen Telefon erscheinen sie als nicht darauf vorhanden. Ebenfalls weggelassen: die Zählung falscher Passwörter
  und wie automatische Backups eingestellt sind.
- **Verknüpfte Geräte** sind nicht in einem Backup: Eine Verknüpfung bleibt bei dem Telefon und dem Computer, auf
  denen sie gemacht wurde. Nachdem du ein Backup auf einem anderen Telefon wiederhergestellt hast, verknüpfe den
  Computer erneut: Tippe auf dem Computer auf **Dieses Gerät trennen** und verknüpfe ihn dann wie beim ersten Mal,
  siehe [Verknüpfte Geräte](#devices). Kontakte mit dieser Version schreiben dann deinen Computern nicht mehr, bis du
  das tust: Das Telefon gibt ihnen eine neue Liste seiner Geräte, die keines nennt. Geht die Uhr dieses Telefons hinter
  der des verlorenen her, verschwindet diese Liste, sobald sie ihm schreiben, und ihre Chatdetails können sagen, dass
  sie sich am Tag nach deinem Wiederherstellen geändert hat. Das eigene Backup eines verknüpften Computers enthält die
  Chats des Telefons so, wie sie waren, aber
  nicht die Verknüpfung, um darin zu schreiben: Wiederhergestellt lassen sie sich dort lesen, aber nicht darin
  schreiben, und Erevos sagt das einmal. Um darin zu schreiben, verknüpfe diesen Computer erneut mit dem Telefon: Die
  Chats, die das Telefon noch hat, bleiben, mit dem, was seitdem kam, und die anderen verschwinden. Trenne auf dem
  Telefon das Gerät, das er vorher war. Mache die Backups auf dem Telefon.
- **Ein Backup von einem neueren Erevos:** Erevos 0.1.8 und neuer öffnen es auch und stellen alles davon wieder her,
  was sie kennen; ältere sagen, dass ein Teil davon draußen bleibt. Aktualisiere zuerst Erevos, um alles
  wiederherzustellen.

## Importierte Chats {#import}

Deine alten Chats aus Telegram und WhatsApp können in Erevos kommen, zum Lesen, mit ihren Fotos, Videos,
Sprachnachrichten und Dateien, und die aus Viber mit ihren Worten. Sie bleiben auf diesem Telefon, versiegelt in dem
Bereich, in den du sie holst, und werden nie irgendwohin gesendet.

Exportiere den Chat zuerst aus der anderen App:

- **WhatsApp:** Öffne den Chat, dann **Mehr**, **Chat exportieren**, **Medien einbeziehen**, und speichere die .zip
  auf dem Telefon. **Ohne Medien** bringt nur die Worte.
- **Telegram Desktop:** **Chatverlauf exportieren**, Format **JSON**, mit den Fotos, Videos, Sprachnachrichten und
  Dateien, die du willst. Mache dann eine .zip aus dem Ordner, den es angelegt hat (unter Windows: Rechtsklick darauf,
  **Senden an**, **ZIP-komprimierter Ordner**), und kopiere die .zip auf das Telefon. **result.json** allein bringt
  nur die Worte.
- **Viber:** Viber selbst exportiert keine Chats. Auf Android speichert die App **Backup Text for Viber** einen als
  .html-Datei: Kopiere diese auf das Telefon. Nur die Worte kommen herein, mit den Emoticons von Viber als Emoji. Deine
  eigenen Nachrichten tragen dort keinen Namen, also kommen sie als **Ich** herein, schon als du ausgewählt.
  Nachrichten von einem Tag, bevor es Viber gab, etwa 1970, stammen von einem Telefon, dessen Uhr falsch ging: Sie
  kommen ohne Zeit herein.

Dann:

1. Öffne in Erevos **Einstellungen** → **Daten und Geräte** → **Importierte Chats**, tippe auf **Datei importieren**
   und wähle dann die Datei.
2. Erevos sagt, was es gefunden hat, mit wie vielen Fotos und Dateien und wie groß sie zusammen sind. Tippe auf deinen
   eigenen Namen, damit deine Nachrichten rechts erscheinen, und tippe auf **Behalten**. Die Dateien kommen eine nach
   der anderen herein, und es sagt, wie viele und welcher Anteil davon drin ist. **Abbrechen** beendet es dann und
   behält keine davon.
3. Lösche die Exportdatei selbst vom Telefon: Erevos behält eine eigene versiegelte Kopie, aber die Datei, die du
   gespeichert hast, ist nicht versiegelt.

Um die Unterhaltung in Erevos fortzusetzen, braucht die andere Person auch Erevos:

1. Füge sie mit **Neuer Chat** als Kontakt über das Relay hinzu, wie in [Chat über ein Relay](#relay).
2. Öffne den importierten Chat, tippe auf **In Erevos weiterführen** und wähle sie.
3. Ihr Chat zeigt jetzt die alten Nachrichten vor den neuen, als wären sie immer in Erevos gewesen: in Blasen, nach
   Tag, mit ihren Zeiten, und **Weiter in Erevos** zwischen ihnen und den neuen. **Chat öffnen** bringt dich dorthin,
   und ein Kontakt, dem du keinen Namen gegeben hast, übernimmt den Namen des importierten Chats.

**Aus dem Chat heraus:** Der Chat eines Kontakts hat **Importierte Chats** in seinen **Details**, über
**Privatsphäre**. **Chat hierher importieren** holt eine Datei direkt in diesen Chat, ohne den Weg über
**Einstellungen**: Wenn die Datei mehrere Chats enthält, wie ein Telegram-Export aller Chats, fragt es, welcher hier
weitergeht, und bietet den längsten an. Jeder importierte Chat, der dort weitergeht, wird mit drei Tasten aufgeführt:

- **Nur im Chat behalten** nimmt ihn aus **Einstellungen** → **Daten und Geräte** → **Importierte Chats** heraus: Er
  erscheint nur in diesem Chat, als wäre er immer dort gewesen. Ein aus den Details des Chats geholter Chat wird von
  Anfang an so behalten. **Auch in Importierte Chats zeigen** legt ihn zurück in die Liste, und das tut auch die Liste
  selbst, wenn dieser Kontakt nicht mehr da ist.
- **Trennen** sorgt dafür, dass er nicht mehr im Chat erscheint; er bleibt in **Importierte Chats**, zum Lesen oder um
  ihn mit jemand anderem fortzusetzen.
- **Löschen** löscht ihn vom Telefon, mit seinen Fotos und Dateien, nach einer Rückfrage.

**Warum:** Ein alter Chat gehört zu der Person, mit der er war, also wird er dort hereingeholt, aufbewahrt und
gelöscht, wo du mit ihr redest, und die Liste in **Einstellungen** behält nur, was sonst nirgendwohin gehört. Nichts
davon verlässt so oder so das Telefon.

- **Fotos, Videos, Sprachnachrichten und Dateien** kommen aus einer .zip herein, jedes in diesem Bereich versiegelt,
  wie eine Datei in einem Chat. Fotos erscheinen im Chat, wenn du zu ihnen scrollst, und Sticker als Sticker; tippe
  auf ein Foto oder eine Datei, um es für sich zu sehen und mit **Speichern** zu speichern. Sprachnachrichten und Lieder
  spielen mit einem Tippen direkt im Chat; ein Video spielt in der eigenen App des Telefons, sobald es gespeichert ist.
  Halte eine importierte Nachricht gedrückt, um sie mit **Kopieren** zu kopieren oder ihre Datei mit **Öffnen** zu
  öffnen. **In diesem Chat suchen** findet auch die importierten Nachrichten. Dateien über 1 GB, und die, die der
  Export nicht enthält, bleiben zurück, und der Chat sagt, wo eine war.
- **Platz auf dem Telefon:** Während eine .zip hereinkommt, braucht das Telefon etwa ihre doppelte Größe frei, da
  Erevos eine Kopie davon liest und die Dateien versiegelt aufbewahrt. Importierte Dateien sind noch nicht in Backups,
  wie andere Dateien auch nicht.
- **Nur auf diesem Telefon, nur zum Lesen:** Importierte Nachrichten werden nie gesendet, also bekommt das andere
  Telefon sie nicht. Erevos kann nicht zeigen, wer sie wirklich geschrieben hat.
- **Hinweise und Anrufe** aus der anderen App werden weggelassen, und der Chat sagt, wie viele.
- **Auch in versteckten Chats:** In den **Details** eines versteckten Chats bewahrt **Chat hierher importieren** den
  Chat bei diesem Platz auf, mit seinem Schlüssel verschlüsselt, und zeigt ihn nur in diesem Chat, nie in
  **Einstellungen** → **Daten und Geräte** → **Importierte Chats**; dort kann er nur gelöscht werden. Ein in versteckte
  Chats verschobener Chat nimmt die in ihn importierten Chats mit, dort nur in ihm aufbewahrt, und bringt sie zurück,
  wenn er zurückzieht.
- **Nachrichten löschen** in einem Chat lässt die importierten stehen: Lösche diese in den **Details** des Chats, unter
  **Importierte Chats**, oder in **Einstellungen** → **Daten und Geräte** → **Importierte Chats**.

> Die Datei der importierten Chats wächst mit dem, was du hereinholst, also verrät ihre Größe ungefähr, wie viel
> importiert wurde, aber nicht in welchen Bereich.

## Darstellung {#appearance}

**Darstellung** folgt LPHL FASOULI und der LPHL-Website. Sie ist unter **Einstellungen** → **Darstellung**, in Teilen,
die sich jeweils einzeln öffnen: **Stil und Farben** (das Aussehen, Glas, Stil, Design, Farben und Text auf farbigen
Flächen unten, mit der **Vorschau**), **Hintergrund**, **Nachrichten** und auf Android **Startbildschirm-Symbole** und
**Widget**.

| Einstellung | Auswahl |
| --- | --- |
| **Aussehen** | **Flach** oder **Glass** wie auf lphl.nekten.eu. Glas gibt es in zwei Arten: **Scheiben** (jede Karte eine Glasscheibe über dem Hintergrund) und **Eine Scheibe** (jeder Bildschirm auf einer mattierten Scheibe). |
| **Stil** | **Classic** (das Dunkel und Gold von Erevos), **Modernist** (Inter Tight), **Nocturne** (immer dunkel, mit eigenen Farben), **Neon** (Cyan- und Magenta-LEDs, die leuchten, über einem Raster, das zu einer untergehenden Sonne läuft), **Matrix** (Grün auf Schwarz in Monospace, mit Code, der dahinter herabregnet), **Paper** (Füllerblau auf Creme, in einer Serifenschrift, über linierten Zeilen mit rotem Rand), **Aurora** (Violett auf Fast-Weiß, sanft und rund, über Lichtflecken in Minze, Flieder und Pfirsich), **Material You** (die eigenen Farben des Telefons, auf Android 12 und neuer) und **Eigener** (deine eigene Grundfarbe und Akzentfarbe). |
| **Design** | **System**, **Hell** oder **Dunkel**. Nocturne, Neon und Matrix sind immer dunkel, Paper und Aurora immer hell, und „Eigener“ ist hell oder dunkel, je nach seiner Grundfarbe. Material You folgt ihm. |
| **Farben** | Die eigenen des Stils, eine der zwölf LPHL-Paletten oder **Meine Farbe**. Eine Palette unter einem Stil mit eigenen Farben zu wählen, kehrt zum vorher gewählten Stil zurück. |
| **Eigener** | Mit gewähltem **Eigener**: seine **Grundfarbe** (acht helle, acht dunkle) und seine **Akzentfarbe**. Der Text und die Flächen werden aus der Grundfarbe gemacht, und jede Farbe wird geprüft, ob sie darauf lesbar ist. |
| **Text auf farbigen Flächen** | **Weiß**, **Wie die Palette** oder **Meine Farbe**. |
| **Hintergrund** | Was hinter jedem Bildschirm liegt: **Wie der Stil** (die eigene Szene oder das Leuchten des Stils), **Schlicht** oder ein Muster, blass in der Akzentfarbe gezeichnet: **Punkte**, **Raster**, **Streifen**, **Sterne**, **Lichter** (weiche Lichtkreise) oder **Verlauf**; oder **Foto**, ein eigenes Foto, verkleinert, neu gezeichnet und versiegelt, unter einem Schleier, damit der Text lesbar bleibt (**Foto ändern** wählt ein anderes). Der Passwortbildschirm zeigt stattdessen den des Stils. |
| **Nachrichten** | Wie ein Chat Nachrichten zeichnet: **Rund** (runde Blasen), **Eckig** (eckige) oder **Linie**, keine Blase, sondern eine Linie neben dem Text, wie in einem Protokoll. |

Neon, Matrix, Paper und Aurora zeichnen ihre eigene Szene hinter jeden Bildschirm, „Eigener“ behält die gewählte
Grundfarbe und Material You die Farben des Telefons, also wartet **Glass**, solange sie gewählt sind. Der Regen steht
still, wenn das Telefon auf reduzierte Bewegung eingestellt ist.

Die **Vorschau** zeigt ein paar Nachrichten und Tasten im gewählten Aussehen. Jede Kombination wird geprüft, damit der
Text immer gut lesbar ist, auch auf Glas.

- **Jeder Bereich behält sein eigenes Aussehen.**
- **Der Passwortbildschirm** zeigt das zuletzt genutzte Aussehen. Dafür wird es außerhalb der versiegelten Daten
  aufbewahrt: Es sagt nichts über deine Chats, aber wer das Telefon öffnet, sieht, welches Aussehen du nutzt.
- **Material You** übernimmt die Farben, die Android aus deinem Hintergrundbild macht (Android 12 und neuer), hell
  oder dunkel, wie **Design** es sagt, mit runden Tasten und sanft abgerundeten Karten, in der eigenen Schrift des
  Telefons. Ein neues Hintergrundbild ändert sie auch in Erevos, sobald es wieder sichtbar ist. Sie werden auf dem
  Telefon gelesen und gehen nirgendwohin. Auf älterem Android und auf einem Computer wird es nicht angeboten.
- **Startbildschirm-Symbole** (Android): die Farbe jedes Symbols von Erevos unter den Apps des Telefons, **Erevos**
  (rot, es öffnet die Erevos-Chats oder den Chat, den du offen gelassen hast), **Telefon** (grün, es öffnet die
  Wähltasten), **SMS** (blau, es öffnet die SMS-Liste) und **Kontakte** (violett): rot, orange, grün, blau, violett
  oder dunkel. Jedes Tippen öffnet, was sein Symbol nennt, auch wenn Erevos gerade ein anderes davon zeigte. Die Farbe
  gehört dem Telefon, nicht jedem Bereich, da die Symbole erscheinen, bevor Erevos entsperrt ist. Nach einer Änderung
  nehmen manche Launcher das Symbol vom Startbildschirm: Füge es aus der App-Liste wieder hinzu.
- **Widget** (Android): die Reihenfolge der vier Tasten des Widgets, von links nach rechts, mit dem Widget so
  gezeichnet, wie es aussehen wird. Tippe auf ↑ oder ↓, um eine Taste zu verschieben; **Ursprüngliche Reihenfolge**
  stellt sie zurück.

## Auf einem Computer {#desktop}

Erevos läuft auch auf einem Computer, unter Linux, macOS oder Windows, als eigene App. Es chattet über ein Relay,
Ende-zu-Ende-verschlüsselt wie auf dem Telefon, und bewahrt seine Kontakte, Nachrichten und Einstellungen auf dieselbe
Weise versiegelt auf.

1. Installiere es. Unter Linux: das Paket für Arch-basierte Systeme (\`erevos-linux-x86_64.pacman\`, mit
   \`sudo pacman -U\`) oder das AppImage. Auf einem Mac: Öffne das Disk-Image und zieh Erevos in „Programme“. Es hat
   keine bezahlte Apple-Signatur, also erlaube es beim ersten Mal unter
   **Systemeinstellungen → Datenschutz & Sicherheit → Dennoch öffnen**. Unter Windows 10 oder 11: Führe
   \`erevos-windows-x64-setup.exe\` aus, das Erevos nur für dich installiert, ohne Administrator, und es ins Startmenü
   legt; oder lege \`erevos-windows-x64-portable.exe\` ab, wo du willst, und führe es aus, ohne dass etwas installiert
   wird. Keines von beiden hat eine bezahlte Signatur, also sagt Windows beim ersten Mal, dass es deinen PC geschützt
   hat: Tippe auf **Weitere Informationen**, dann auf **Trotzdem ausführen**.
2. Stelle das Relay ein und füge Kontakte hinzu wie auf dem Telefon, siehe [Chat über ein Relay](#relay).
   **Meinen Kontaktlink kopieren** kopiert deinen Link, um ihn dort einzufügen, wo er hin soll.

- **Was nur das Telefon kann:** Bluetooth, Wi-Fi Aware und LoRa, und ihre Tests. Kontakte im selben WLAN erreicht es
  wie ein Telefon, siehe [Chat mit einem Telefon in der Nähe](#nearby). Der Rest ist gleich: Bereiche und das zweite
  Passwort, versteckte Chats, Sprachnachrichten, importierte Chats und Backups.
- **Wo es Dinge aufbewahrt:** in seinem eigenen Ordner (unter Linux \`~/.config/Erevos\`, auf einem Mac
  \`~/Library/Application Support/Erevos\`, unter Windows \`%APPDATA%\\Erevos\`), versiegelt wie auf dem Telefon. Sein
  Schlüsselspeicher ist mit dem Schlüsselbund des Systems versiegelt (auf einem Mac der Schlüsselbund, unter Windows der
  Schlüssel deines Windows-Kontos). Auf einem Linux-System ohne Schlüsselbund (KWallet oder GNOME Keyring), oder mit
  einem, den Erevos nicht findet, öffnet sich Erevos mit einem Hinweis und bewahrt nichts auf: Starte den Schlüsselbund
  oder gib Erevos \`--password-store=gnome-libsecret\` mit. Mit \`--plain-secrets\` gestartet, bewahrt es seinen
  Schlüsselspeicher dort auf, wie er ist, lesbar für deinen Benutzer: Lege dann eine Passwortsperre fest. Die portable
  Windows-App bewahrt ihre Dinge im selben Ordner auf wie die installierte, und eine Deinstallation lässt sie dort.

**Warum:** Ohne Schlüsselbund läge der Schlüsselspeicher so, wie er ist, auf der Festplatte, lesbar für deinen
Benutzer, also bewahrt Erevos dort nichts auf, außer du wählst es mit \`--plain-secrets\`: Kein Passwortplatz liegt
dort überraschend unversiegelt.

- **Die Firewall von Windows** fragt beim ersten Öffnen von Erevos, ob es das Netz nutzen darf. Erlaube es in privaten
  Netzen, sonst können Telefone und Computer im selben WLAN es nicht erreichen; Relays funktionieren so oder so.
- **Sprachnachrichten**, die auf einem Computer aufgenommen werden, sind Opus, auf einem Telefon AAC. Beide spielen auf
  beiden.
- **Fotos** kommen aus den Dateien des Computers; es gibt keine Kamera. **Speichern** fragt, wohin ein Foto oder eine
  Datei soll.
- **Ein Computer und ein Telefon können ein Konto teilen:** Verknüpfe den Computer mit dem Telefon, und beide haben
  dieselben Chats und Kontakte, siehe [Verknüpfte Geräte](#devices). Oder ein Backup bringt alles vom einen zum anderen,
  siehe [Backups](#backup), und nutze ab dann nur noch das eine.
- **Im Hintergrund:** Schließt du sein Fenster, läuft Erevos im Infobereich weiter (auf einem Mac im Dock), außer du
  schaltest es ab: **Einstellungen** → **Benachrichtigungen** → **Im Hintergrund** → **Beim Schließen beenden**. Es
  wartet weiter am Relay: Ein Anruf klingelt, mit einem eigenen Klingeln, und holt das Fenster zurück, und eine
  Benachrichtigung sagt, wie viele Nachrichten ungelesen sind, nie von wem oder was, bis Erevos wieder zu sehen ist. Du
  öffnest es über sein Symbol im Infobereich oder indem du Erevos erneut startest, und beendest es über das Menü dieses
  Symbols (auf einem Mac über sein Menü). Wo der Desktop keinen Infobereich zeigt, etwa GNOME ohne eine Erweiterung
  dafür, holt ein erneuter Start von Erevos das Fenster zurück. Beendet empfängt es nichts: Nachrichten warten am Relay,
  und ein Anruf erscheint als verpasster Anruf, sobald es sich öffnet.
- **Bisher getestet** unter Linux. Die Mac- und Windows-Versionen werden auf den Computern von GitHub gebaut und
  geöffnet, noch nicht von einer Person.

## Verknüpfte Geräte {#devices}

Dasselbe Konto auf dem Telefon und auf einem Computer oder in einem Browser: dieselben Chats, Kontakte und Nachrichten
auf beiden. Das Telefon bleibt das Konto: Nur es fügt Kontakte hinzu und verknüpft und trennt Geräte. Jedes
verknüpfte Gerät hat eigene Schlüssel, die das Telefon in eine Liste der Geräte des Kontos signiert und seinen
Kontakten gibt. Kontakte mit dieser Version schreiben dann auch an jedes Gerät, Ende-zu-Ende-verschlüsselt, sodass es
ihre Nachrichten bei ausgeschaltetem Telefon bekommt; für die mit älteren Versionen reicht das Telefon an den Computer
weiter, was ankommt, und versiegelt für sie, was der Computer schreibt. Kontakte sehen dasselbe Konto und dieselbe
Sicherheitsnummer, egal welche Version von Erevos sie haben.

**Warum:** Jedes Gerät hat eigene Schlüssel, nie eine Kopie der Schlüssel des Kontos: Erevos hat keinen Server, der
ein verlorenes Gerät aussperren könnte, also ist ein Gerät nie mehr als ein Eintrag in einer Liste, die das Telefon
signiert, und es zu trennen genügt. Die Liste hat immer vier Plätze, und die, die kein Gerät belegt, enthalten zum
Schein gemachte Schlüssel, sodass Kontakte nicht erkennen können, wie viele Geräte du hast. Und mit dem Telefon als
Konto erreichen dich Kontakte mit jedem älteren Erevos wie bisher.

So verknüpfst du einen Computer:

1. Öffne auf dem Computer, in einem Bereich ohne eigene Chats (eine neue Installation, ein Bereich, den ein neues
   Passwort öffnet, oder die aus seinem Backup wiederhergestellten Chats eines verknüpften Computers),
   **Einstellungen** → **Daten und Geräte** → **Verknüpfte Geräte**. Trage das Relay ein, wenn danach gefragt wird,
   benenne das Gerät und tippe auf **Mit meinem Telefon verknüpfen**. Es zeigt einen QR-Code.
2. Scanne den Code auf dem Telefon mit der Kamera: Erevos öffnet sich damit bei **Verknüpfte Geräte**. Oder kopiere
   den Code auf dem Computer, füge ihn auf dem Telefon unter **Code vom Computer** ein und tippe auf **Weiter**.
3. Das Telefon zeigt den Namen des Computers und einen Code aus vier Gruppen von fünf Ziffern. Wähle, was vom Verlauf
   übertragen wird (**Alle**, **Den letzten Monat**, **Die letzte Woche** oder **Keine**) und ob
   **Auch Fotos und Dateien**, und tippe dann auf **Verknüpfen**.
4. Der Computer zeigt auch einen Code. Wenn es der des Telefons ist, tippe auf **Stimmen überein**. Wenn nicht, tippe
   auf **Stimmen nicht überein**: Jemand anderes hat vielleicht seinen QR-Code gelesen, und nichts ist an ihn gegangen.

Die Chats kommen dann auf den Computer, und nach ihnen die gewählten Nachrichten.

- **Nachrichten** von Kontakten kommen auf beide, und jedes bewahrt sie einmal auf: Eine, die innerhalb von 30 Tagen
  erneut kommt (bis zu 2000 von einem Kontakt), wird nicht noch einmal aufbewahrt, auch nachdem sie dort verschwunden
  ist oder gelöscht wurde. Dafür merkt sich jedes 30 Tage lang, welche Nachrichten an welchem Tag kamen, nicht was sie
  sagten, auch wenn sie verschwunden sind oder gelöscht wurden, und in einem inzwischen gemachten Backup; das Telefon
  merkt es sich auch für einen Kontakt, der ein Gerät verknüpft hat. Was du auf dem Computer schreibst, geht an einen
  Kontakt mit dieser Version direkt von dort, sobald er an den Computer geschrieben hat, und sonst über das Telefon:
  Das Telefon zeigt es als deines, und der Kontakt bekommt es vom Konto. Was du auf dem Telefon schreibst, erscheint
  auch auf dem Computer. Lesebestätigungen, Reaktionen, Anheftungen, Stimmen, Löschen auf beiden Telefonen, Namen,
  Timer, Chat-Aussehen und Bilder, Offline-Erscheinen und das Annehmen von Anfragen gehen in beide Richtungen. Ein
  Stern oder Löschen auf **Dieses Telefon**, auf dem Telefon gemacht, geht auch an den Computer; auf dem Computer
  gemacht, bleibt es dort.
- **Bei ausgeschaltetem Telefon** erreichen Kontakte mit dieser Version trotzdem den Computer, und der Computer sie:
  Was sie schreiben, lesen und worauf sie reagieren, kommt an, und was du schreibst, geht. Bleibt das Telefon so lange
  aus, dass seine Warteschlange auf dem Relay voll wird (1000 Nachrichten), erreicht, was sie schreiben und lesen,
  trotzdem den Computer, eine lange Sprachnachricht vollständig; worauf sie reagieren, was sie anheften, worüber sie
  abstimmen oder was sie löschen, und ihre Anrufe, kommen erst durch, wenn das Telefon wieder an ist. Für Kontakte mit
  älteren Versionen, Gruppen, Anrufe, das Hinzufügen eines Kontakts und für später gesendete Nachrichten **muss das
  Telefon an sein** und das Relay erreichen: Was der Computer inzwischen schreibt, wartet auf dem Relay und geht,
  sobald das Telefon zurück ist. Zwei oder mehr verknüpfte Geräte erreichen sich auch direkt: Bei ausgeschaltetem
  Telefon zeigt jedes trotzdem, was die anderen schreiben, lesen und worauf sie reagieren, und die Änderungen, die sie
  an Kontakten machen; eines, das die erste Nachricht eines anderen verpasst hat, bekommt einen Tag oder später eine
  neue. Ein Computer, der länger aus war, als das Relay Nachrichten aufbewahrt (14 Tage), oder die erste Nachricht
  eines Kontakts an ihn verpasst hat, bekommt trotzdem, was dieser danach schreibt: Dessen Erevos beginnt einen Tag
  oder später neu damit, dann immer seltener, bis er antwortet. Nachdem ein Kontakt dich gelöscht und wieder
  hinzugefügt hat, beginnt der Computer auch mit dessen Geräten neu.
- **Fotos und Dateien**, die ankommen, bleiben auf dem Relay, bis das Telefon und der Computer sie beide geholt haben;
  dann löscht das Telefon sie dort. Eines, das der Computer nie holt, verschwindet, wenn er getrennt wird, oder nach 14
  Tagen, wie jedes nicht geholte.
- **Anrufe** klingeln auf dem Telefon und auf dem Computer. Nimm auf einem von beiden an: Das andere hört auf zu
  klingeln und sagt, dass auf einem anderen Gerät angenommen wurde. Einen Anruf auf einem abzulehnen, lehnt ihn auf
  beiden ab. Der Computer ruft auch über das Telefon an; der Anruf selbst geht dann direkt zwischen dem Computer und
  dem Kontakt, verschlüsselt zwischen ihnen, und das Telefon muss nur an bleiben, um ihn aufzubauen.
- **Gruppen** sind auch auf dem Computer, mit ihren Nachrichten, Fotos, Dateien und Sprachnachrichten. Schreibe darin,
  antworte, reagiere, stimme ab, hefte an, lösche deine eigenen für alle, füge Mitglieder hinzu und nimm sie heraus,
  benenne eine um oder verlasse sie, dort wie auf dem Telefon: Das Telefon macht es für den Computer, als seines. Ein
  Foto oder eine Datei, die das Telefon aufbewahrt, geht als Kopie auf dem Relay an den Computer und wird dort
  gelöscht, sobald der Computer sie geholt hat. Was die Mitglieder später mit einer Nachricht machen (reagieren,
  abstimmen, anheften, für alle löschen), erscheint auch auf dem Computer, ebenso ein Stern oder Löschen auf
  **Dieses Telefon**, auf dem Telefon gemacht. Eine Nachricht, die das Telefon nicht an die Gruppe senden konnte
  (etwa weil sie inzwischen geschlossen wurde), erscheint auf dem Computer als **Nicht vom Telefon gesendet**. Eine
  Gruppe zu machen, öffentliche Gruppen und Gruppenanrufe bleiben vorerst auf dem Telefon.
- **Versteckte Chats und zweite Passwörter** werden nie verknüpft. Versteckte Chats schreiben an die Geräte eines
  Kontakts mit dieser Version wie deine anderen Chats, sodass diese sie bei ausgeschaltetem Telefon des Kontakts
  bekommen, und für den Kontakt sehen sie aus wie die Chats eines Telefons, das nie ein Gerät verknüpft hat. Ein auf
  dem Telefon in versteckte Chats verschobener Chat verschwindet vom Computer.
  In versteckte Chats verschoben, oder aus ihnen in deine Chats, schreibt ein Chat nur an das Telefon des Kontakts, wie
  ein älteres Erevos, bis er dorthin zurückkehrt, wo er angelegt wurde: Das Erevos des Kontakts erfährt es zuerst,
  damit seine Geräte aufhören, an deine zu schreiben, und er kann daraus erkennen, dass der Chat aufgehört hat, von
  verknüpften Geräten zu wissen: wenn er ihm die Liste deiner Geräte gegeben hat, dass er in versteckte Chats ging. Ein
  Bereich, den ein zweites Passwort öffnet,
  verknüpft nur von innen, mit eigenen Geräten.
- **Nachrichten erneut übertragen**, auf dem Telefon, sendet einen Zeitraum des Verlaufs erneut, mit seinen Reaktionen,
  Anheftungen, Stimmen und Sternen; was der Computer schon hat, wird nicht doppelt aufbewahrt.
- **Trennen**, auf dem Telefon, sperrt ein Gerät sofort aus: Nichts geht mehr an es, und nichts, was es sendet, wird
  angenommen. Kontakte mit dieser Version erfahren es, wenn das Telefon das nächste Mal das Relay erreicht: Sie hören
  auf, an es zu schreiben, und nehmen nichts mehr von ihm an. So sperrst du einen verlorenen Computer aus. Ist er an,
  erfährt er es, und die Chats des Kontos verschwinden von ihm. Auf dem Computer macht **Dieses Gerät trennen**
  dasselbe von dort aus.
- **Bis zu vier** Geräte lassen sich mit einem Telefon verknüpfen. Ein Backup nimmt die Verknüpfungen nicht mit:
  Nachdem du eines auf einem anderen Telefon wiederhergestellt hast, tippe auf dem Computer auf
  **Dieses Gerät trennen** und verknüpfe ihn erneut, siehe [Backups](#backup).

## Auf einem iPhone, im Browser {#iphone}

Erevos hat keine App im App Store. Auf einem iPhone läuft es als Web-App, aus Safari zum Home-Bildschirm hinzugefügt,
ohne Apple-Konto. Es chattet über ein Relay, Ende-zu-Ende-verschlüsselt wie auf dem Telefon, und bewahrt seine
Kontakte, Nachrichten und Einstellungen auf dieselbe Weise versiegelt auf, im Speicher von Safari für die App.

1. Öffne die Adresse des Erevos-Servers, die du bekommen hast, in **Safari**. Erevos zeigt, wie du es hinzufügst:
   Tippe auf **Teilen** (unter iOS 26 unter **•••**), dann auf **Zum Home-Bildschirm**, und öffne Erevos dann vom
   Home-Bildschirm aus. Braucht iOS 17 oder neuer.
2. Öffne in Erevos **Einstellungen** → **Datenschutz und Sicherheit** → **Diese Web-App** und vergleiche den
   Fingerabdruck des Release-Schlüssels Zeichen für Zeichen mit dem, den du mit der Adresse bekommen hast. Wenn er sich
   unterscheidet, lösche die App und sag es dem, der dir die Adresse gegeben hat.
3. Lege eine Passwortsperre fest (in Erevos **Einstellungen** → **Datenschutz und Sicherheit** →
   **Sperre und zweites Passwort**). Im Web ist sie am wichtigsten: siehe unten.
4. Stelle das Relay ein und füge Kontakte hinzu wie auf dem Telefon, siehe [Chat über ein Relay](#relay).

**Wie es sich selbst prüft.** Eine Web-App ist Code, den der Server schickt, also könnte ein Server, in den
eingebrochen wird oder dem es befohlen wird, veränderten Code schicken. Erevos nimmt diesen Code nicht auf Treu und
Glauben:

- Beim ersten Öffnen holt es seinen Code mit einer Liste jeder Datei und ihres Fingerabdrucks, signiert mit dem
  Release-Schlüssel, den nur die Person hat, die die Releases macht; der Server hat ihn nicht. Es prüft die Signatur
  und jede Datei, bewahrt sie auf dem iPhone auf und führt ab dann nur diese aus. Der Server kann sie nicht ändern.
- Ein Update wird nur angenommen, wenn es mit demselben Schlüssel signiert und neuer als das genutzte ist; es startet
  beim nächsten Öffnen von Erevos. Ein unsigniertes oder älteres wird abgelehnt, und Erevos sagt es.
- Wer will, kann den Server prüfen: \`node pwa/release.mjs verify https://<Adresse>\` prüft die Signatur und jede
  Datei, die der Server ausgibt, und \`scripts/reproduce-web.sh <Version> https://<Adresse>\` baut dieses Release aus
  seinem Quellcode erneut und prüft, dass jede Datei gleich herauskommt.

**Was bleibt.** Das sind echte Grenzen; kenne sie:

- **Beim ersten Mal**, wenn du es öffnest, vertraust du dem Server: Er ist es, der den prüfenden Teil schickt.
  Schritt 2 ist, wie du einen falschen erkennst.
- **Den prüfenden Teil selbst** (den Service Worker) holt Safari mindestens einmal am Tag neu, und Safari kann ihn
  ersetzen, ohne Erevos zu fragen. Erevos prüft den neuen dann gegen das signierte Release und warnt dich
  (**Erevos wurde manipuliert**), aber ein Server, der weiß wie, könnte an dieser Prüfung vorbeikommen. Wenn du die
  Warnung siehst, öffne Erevos nicht wieder von diesem Server, bis es geklärt ist. Mit einer Passwortsperre bleiben
  deine Chats versiegelt.
- **Kein Bluetooth und keine Verbindung in der Nähe** und keine SMS: Safari erlaubt sie nicht.
- **Nur solange es offen ist:** iOS hält Web-Apps im Hintergrund an, also kommen Nachrichten, wenn du Erevos öffnest;
  bis dahin warten sie auf dem Relay.
- **Anrufe** klingeln, solange Erevos offen ist, mit einem eigenen Klingeln: zwei kurze alle 3 Sekunden. Safari lässt es
  erst klingen, wenn du Erevos seit dem Öffnen berührt hast, und nicht, wenn das iPhone stumm geschaltet ist. Ist Erevos
  geschlossen, klingelt ein Anruf nicht: Es erscheint nur die Benachrichtigung „Anruf“, wenn Benachrichtigungen an sind.
  Mehr erlaubt Apple einer Web-App nicht; um wie ein Telefon zu klingeln, bräuchte es eine App aus dem App Store.
- **Benachrichtigungen**, während Erevos geschlossen ist, sind aus, solange du sie nicht einschaltest: in Erevos
  **Einstellungen** → **Benachrichtigungen** → **Benachrichtigungen, wenn geschlossen** → **Einschalten** (iOS 16.4
  oder neuer, vom Home-Bildschirm aus). Wenn Nachrichten kommen oder ein Anruf klingelt, schickt dein Relay einen Push
  über Apple, und Erevos zeigt, wie viele Nachrichten seit deinem letzten Öffnen kamen (**3 neue Nachrichten**), oder
  **Anruf**, wenn nur ein Anruf klingelte, in der Sprache der App, mehr nicht. Die Zahl ist für dein iPhone
  verschlüsselt: Apple sieht, wann etwas für dein iPhone kommt und dass es Erevos nutzt, nie was oder von wem. Mit
  einem Relay oder einem Erevos des Absenders älter als 2.0.0, oder einer Nachricht, die andere Telefone zum Relay
  gebracht haben, gibt es keine Zahl: Erevos zeigt **Neue Nachricht**, oder **Neue Nachrichten**, sobald mehr kamen,
  bis du es öffnest. Sie gelten pro Bereich, nie für versteckte Chats, und dein Relay muss eingerichtet sein, sie zu
  senden. Sie kommen auch für die eigene Warteschlange jedes Kontakts: Dein Relay hat dann eine Push-Adresse für alle
  Warteschlangen deiner Kontakte, und Apple bekommt einen Push für jeden Kontakt, der geschrieben hat, im Abstand von
  15 Sekunden, kann also aus einer solchen Folge erraten, wie viele gleichzeitig geschrieben haben, nie wer. Das Symbol
  von Erevos auf dem Home-Bildschirm zeigt dann auch eine Zahl: die ungelesenen Nachrichten des Bereichs, den du offen
  hattest, deren Zahl nach dem Schließen von Erevos bleibt, und die seitdem gekommenen (was ohne Zahl kam, zählt als
  eine), nie die eines versteckten Chats. **Einstellungen** → **Benachrichtigungen** → **Zahl auf dem Symbol** schaltet
  sie aus. Benachrichtigungen laufen über den Push-Dienst von Apple, den von Google (Chrome sowie Edge auf Android,
  Brave und Opera), den von Mozilla (Firefox) und den von Microsoft (Edge auf Windows): Ein Browser, der einen anderen
  nutzt, kann sie nicht einschalten, es sei denn, wer dein Relay betreibt, lässt den Push-Dienst dieses Browsers zu.
  Bereiche auf verschiedenen Relays teilen sich die Benachrichtigungen des Browsers: Nur der zuletzt geöffnete bekommt
  sie. Eine Nachrichtenanfrage von jemand Neuem über deinen Kontaktlink erscheint vielleicht erst, wenn Erevos geöffnet
  wird.
- **Berechtigungen:** In Erevos zeigt **Einstellungen** → **Allgemein** → **Berechtigungen**, was der Browser Erevos
  erlaubt: ob es vom Home-Bildschirm aus läuft, Benachrichtigungen, wenn geschlossen (nötig, sobald dieser Bereich sie
  eingeschaltet hat), das Mikrofon für Anrufe, die Kamera für Videoanrufe und ob der Browser die Daten von Erevos
  dauerhaft behält. Ohne das kann Safari die Daten löschen, wenn auf dem iPhone der Platz knapp wird, also ist ein
  Backup das Sicherheitsnetz. Jedes hat den Grund und eine Taste mit der eigenen Frage des Browsers; wo der Browser
  nicht mehr fragt, sagt es, wo die Einstellung ist (**Einstellungen → Mitteilungen → Erevos** oder
  **Einstellungen → Apps → Safari → Mikrofon**). Es liest nur, was der Browser sagt. Ein Browser lässt Erevos das
  Energiesparen oder den Stromsparmodus nicht lesen, also sind diese nicht dabei. Nach jedem neuen signierten Release
  öffnet es sich von selbst, wenn etwas fehlt, das Nachrichten, Anrufe oder die Daten brauchen. In einem anderen
  Browser (Chrome, Firefox) ist es genauso, mit den Einstellungen dieses Browsers.
- **Backups** werden von Hand gemacht: **Backup erstellen** speichert die Datei über das Teilen-Menü (Dateien, iCloud
  Drive oder eine andere App). Ein Browser gibt eine Datei nur nach einem Tippen heraus, also gibt es keine
  automatischen Backups.
- **Sprachnachrichten**, die auf einem iPhone aufgenommen werden, sind AAC; sie spielen überall.
- **Apple** macht Safari und könnte es ändern, wie bei jeder App auf einem iPhone.

## Unter Sailfish OS {#sailfish}

Auf einem Sailfish-OS-Telefon ist Erevos eine eigene App: dieselbe App wie im Browser, angezeigt von der eigenen
Browser-Engine von Sailfish in einem Sailfish-Fenster, mit ihrem Code mit der App installiert und nicht von einem
Server geholt. Es chattet über ein Relay, Ende-zu-Ende-verschlüsselt wie auf dem Telefon, und bewahrt seine Kontakte,
Nachrichten und Einstellungen auf dieselbe Weise versiegelt auf.

1. Erlaube Apps von außerhalb des Jolla Store:
   **Einstellungen → Nicht vertrauenswürdige Software → Nicht vertrauenswürdige Software zulassen**.
2. Kopiere \`erevos-sailfish-aarch64.rpm\` auf das Telefon (Downloads) und tippe in **Dateien** darauf, dann auf
   **Installieren**. Von einem Terminal aus (Entwicklermodus) ist es
   \`pkcon install-local erevos-sailfish-aarch64.rpm\`. Braucht Sailfish OS 5 in seiner 64-Bit-Version (aarch64).
3. Lege eine Passwortsperre fest (in Erevos **Einstellungen** → **Datenschutz und Sicherheit** →
   **Sperre und zweites Passwort**). Warum sie hier wichtig ist, steht unten.
4. Stelle das Relay ein und füge Kontakte hinzu wie auf dem Telefon, siehe [Chat über ein Relay](#relay).

- **Was nur Android kann:** die Verbindung in der Nähe (Bluetooth und Wi-Fi Aware), LoRa und SMS. Der Rest ist gleich:
  Bereiche und das zweite Passwort, versteckte Chats, Sprachnachrichten, importierte Chats und Backups.
- **Wo es Dinge aufbewahrt:** in \`~/.local/share/erevos\` auf dem Telefon, versiegelt wie auf dem Telefon. Sailfish
  hat keinen Schlüsselbund für Apps, also wird der Schlüsselspeicher dort so aufbewahrt, wie er ist, lesbar für deinen
  Benutzer und damit für jede App, die als du läuft: Die Passwortsperre ist es, die ihn versiegelt.
- **Backups** kommen nach \`Documents/Erevos\` auf dem Telefon, von Hand oder jeden Tag; kopiere sie von dort auf eine
  Speicherkarte oder ein anderes Gerät. **Speichern** legt ein Foto oder eine Datei in Downloads.
- **Während es geschlossen ist:** Mit einem offenen Raum wartet ein kleiner Helfer von Erevos auf dem Relay, solange
  Erevos nicht zu sehen oder geschlossen ist, und nimmt nichts. Eine Mitteilung sagt nur, wie viele Nachrichten kamen,
  nie von wem oder was, und ein Anruf klingelt mit dem Klingelton des Telefons, wie sein Profil ihn einstellt,
  höchstens 45 Sekunden; ein Tippen auf eine der beiden öffnet Erevos. Versteckte Chats sagen dann nichts. Das Sperren
  des Raums beendet es, und nach einem Neustart des Telefons wartet er erst wieder, wenn Erevos den Raum öffnet. Wie
  der Rest von Erevos hier geht er direkt, ohne Tor. Jedes Warten weckt das Telefon etwa einmal pro Minute, wie unter
  Android.
- **Bisher getestet** auf der Browser-Engine von Sailfish (Gecko 91) auf einem Computer, im Chat mit einem Browser über
  ein Relay. Noch nicht auf einem Sailfish-Telefon.

## Updates {#updates}

Erevos fragt GitHub nur dann nach Updates, wenn du auf die Taste tippst, wie in LPHL FASOULI: Eine regelmäßige Prüfung
würde GitHub jeden Tag sagen, dass dieses Telefon oder dieser Computer Erevos hat. Auf Android sagt es dir außerdem,
wenn eine neue Version da ist, ohne GitHub zu fragen, wie **Benachrichtigt, wenn eine neue Version da ist** weiter
unten sagt. Zum Aktualisieren:

1. Öffne **Einstellungen** → **Allgemein** → **Updates** (oder **Nach Updates suchen** unten auf dem ersten
   Bildschirm dieser Anleitung).
   Es zeigt die Version, die du hast, etwa **Erevos 2.0.0**.
2. Tippe auf **Nach Updates suchen**. GitHub sieht dann die Internetadresse dieses Geräts, sonst nichts; auf Android
   ebenso der Server der Web-App, der die Signatur des Release-Computers für das Update bereithält. Solange alles im
   Bereich über Tor geht (**Alles** unter Tor), prüft Erevos nicht, da das an Tor vorbeiginge.
3. Wenn es eine neue Version gibt: Tippe auf Android auf **Installieren**. Sie wird heruntergeladen, gegen das Release
   geprüft (ihre Größe und SHA-256), und das Installationsprogramm von Android öffnet sich: Tippe dort auf
   **Installieren**. Erevos bietet sie erst an, wenn der Release-Computer, der seinen Schlüssel offline aufbewahrt,
   diesen Build und seinen SHA-256 signiert hat: Wer allein das GitHub-Konto übernommen hätte, könnte kein eigenes APK
   installieren lassen. Bis dahin sagt es, dass die Version da, aber noch nicht signiert ist. Wenn der Server der
   Web-App nicht erreichbar ist, sagt es das, mit dem Grund, und wenn die Signatur dort nicht passt, sagt es das: So
   oder so wird nichts installiert. Beim ersten Mal bittet Android darum, das Installieren
   von Apps aus Erevos zu erlauben. Auf einem Computer und unter Sailfish OS öffnet **Download-Seite öffnen** die
   Release-Seite: Nimm die Datei, die Erevos nennt, die des Pakets, das du hast, und aktualisiere wie in der Tabelle
   unten.

Eine Version wie **4.0.0-rc.1** ist eine Testversion vor 4.0.0 (ein Release Candidate): Sie wird wie jede andere
installiert und aktualisiert, und 4.0.0 kommt nach ihr.

### Was ist neu {#whats-new}

**Einstellungen** → **Allgemein** → **Was ist neu** (auch **Was ist neu** in **Updates**) sagt kurz, was jede Version
geändert hat, die neueste zuerst, nur nach ihrer Nummer; die Version, die du hast, sagt **Diese Version**. Jedes
Release fügt seines hinzu. Das CHANGELOG des Quellcodes nennt jede Änderung vollständig.
Jede Version sagt, dort wie hier, zuerst, was sich **Für dich** ändert, was du siehst und nutzt, dann, was sich
**Unter der Haube** geändert hat: Korrekturen, Tempo, Akku und Sicherheit im Inneren.

### Benachrichtigt, wenn eine neue Version da ist {#release-notice}

Auf Android fragt Erevos einmal am Tag den Server von LPHL, auf dem auch das Relay läuft, ob eine neue Version da ist.
Wenn ja, erscheint **Erevos** oben in den Chats, angeheftet, mit seinem Symbol:
**Erevos 3.3.0 ist da. Tippe, um zu sehen, was neu ist, und zu aktualisieren.**, markiert, bis du es öffnest, und eine
Benachrichtigung sagt ebenfalls **Erevos 3.3.0 is out**. Tippe auf eines von beiden für **Updates**, dann auf
**Nach Updates suchen**. Es verschwindet, sobald du diese Version hast.

- **Nur wenn signiert:** Es zählt erst, wenn der Release-Computer sowohl den Build als auch seinen Namen signiert hat,
  dieselbe Signatur, mit der **Updates** ihn installiert. Es kommt also erst, wenn diese Version installiert werden
  kann, und der Server allein kann keine erfinden.
- **Nur auf dem Relay von LPHL:** Ein Bereich fragt nur, solange er das Relay von LPHL nutzt und nicht alles über Tor
  sendet (**Alles** unter Tor): Der Server sieht dann nichts, was er nicht ohnehin sieht. Ein Bereich auf einem
  anderen Relay oder ohne Relay fragt nichts; dort sagt es dir **Nach Updates suchen**.
- **Ausschalten:** **Einstellungen** → **Allgemein** → **Updates** →
  **Sag mir, wenn eine neue Version da ist**.
- Es funktioniert ab der Version, die es hat: Die davor sagt nichts. Nicht im F-Droid-Build, den F-Droid
  aktualisiert.

**Warum:** Damit niemand auf GitHub einzeln nach jeder neuen Version schauen muss und GitHub nie erfährt, welche
Telefone Erevos haben: Der gefragte Server ist der, mit dem das Telefon ohnehin redet, und was er sagt, zählt nur mit
der Signatur des Release-Computers, die offline aufbewahrt wird.

Der Rest dieses Abschnitts ist für das Aktualisieren von Hand.

**Wo neue Versionen sind:** auf der Release-Seite von Erevos,
\`https://github.com/azzinder/erevos-releases/releases\`. Die neueste steht oben, etwa **Erevos 2.0.0**, mit einer
Datei für jedes System. Die fünf neuesten bleiben dort.

**Prüfe die Datei**, wenn du kannst, auf einem Computer: Jedes Release hat \`SHA256SUMS\`, und im Ordner mit den
heruntergeladenen Dateien muss \`sha256sum -c --ignore-missing SHA256SUMS\` für jede **OK** sagen.

**Mache zuerst ein Backup** (**Einstellungen** → **Daten und Geräte** → **Backups** → **Backup erstellen**), siehe
[Backups](#backup). Ein Update behält alles, aber ein Backup kostet eine Minute und deckt jede Überraschung ab.

| Auf | So aktualisierst du |
| --- | --- |
| **Android** | **Einstellungen** → **Allgemein** → **Updates** → **Nach Updates suchen** → **Installieren**, oder von Hand: Öffne die Release-Seite auf dem Telefon, tippe auf \`erevos-android.apk\`, dann auf **Installieren**. Es installiert sich über das vorhandene und behält alles. Erlaube das Installieren aus dem Browser einmal, wenn Android fragt. |
| **Linux, Arch-basiert** | \`sudo pacman -U erevos-linux-x86_64.pacman\` |
| **Linux, AppImage** | Ersetze das alte \`erevos-linux-x86_64.AppImage\` durch das neue und mache es ausführbar. |
| **macOS** | Öffne \`erevos-macos.dmg\` und zieh Erevos in „Programme“, **Ersetzen**. Erlaube es dann erneut unter **Systemeinstellungen → Datenschutz & Sicherheit → Dennoch öffnen**. |
| **Windows, installiert** | Schließe Erevos und führe das neue \`erevos-windows-x64-setup.exe\` aus: Es installiert sich über das vorhandene. Windows warnt vielleicht erneut: **Weitere Informationen**, dann **Trotzdem ausführen**. |
| **Windows, portabel** | Schließe Erevos und lege das neue \`erevos-windows-x64-portable.exe\` an die Stelle des alten. |
| **Sailfish OS** | Tippe in **Dateien** auf \`erevos-sailfish-aarch64.rpm\`, dann auf **Installieren**, oder \`pkcon install-local erevos-sailfish-aarch64.rpm\`. |
| **iPhone, Browser** | Nichts zu tun: Die Web-App übernimmt eine neue signierte Version von selbst, wenn sie öffnet, siehe [Auf einem iPhone](#iphone). |

- **Kontakte, Chats und Einstellungen bleiben** auf jedem System: Sie liegen im eigenen Ordner von Erevos, nicht in
  der App.
- **Android, das erste Mal von der Release-Seite:** Ein auf einem Computer zum Testen gebautes Erevos ist mit einem
  anderen Schlüssel signiert, und Android weigert sich, darüber zu installieren (**App nicht installiert**). Mache ein
  Backup, deinstalliere Erevos, installiere das von der Release-Seite und stelle das Backup wieder her. Danach
  installiert sich jedes Update darüber.
- **Erevos aus F-Droid**, sobald es dort ist, wird von F-Droid aktualisiert: Seine **Updates** zeigen die Version und
  sagen das, ohne **Nach Updates suchen**. F-Droid signiert es mit einem eigenen Schlüssel, also installiert Android
  weder es über das Erevos von der Release-Seite noch jenes darüber. Zum Wechseln: Mache ein Backup, deinstalliere
  Erevos, installiere das andere und stelle das Backup wieder her.
- **Nie älter:** Installiere keine ältere Version über eine neuere. Ihre Daten können in einer Form sein, die die
  ältere nicht lesen kann. Stelle stattdessen ein Backup wieder her, das mit dieser älteren Version gemacht wurde.
- **Ein Release, dem dein System fehlt,** sagt das in seinen Hinweisen: Dieser Build ist fehlgeschlagen, also nimm
  das Release davor.

## Die Testbildschirme {#tests}

Zwei Bildschirme unter **Einstellungen** → **Zum Testen** sind dazu da, die Verbindungen Schritt für Schritt zu
testen.

- **Funktest (Android):** **Berechtigungen** bittet Android um das, was der Funk braucht, **Starten** und **Stoppen**
  schalten Bluetooth und Wi-Fi Aware ein und aus, **Hallo senden** sendet eine einfache Testnachricht an den Funktest
  des Telefons in der Nähe (ein Chat zeigt sie nicht), und das **Protokoll** zeigt, was passiert ist.
- **Relay-Test (WLAN):** **Warteschlange anlegen** legt eine Warteschlange auf einem Relay an und zeigt zwei IDs. Gib
  die **Absender-ID** dem Telefon, das dir schreibt, und behalte die **Empfänger-ID** für dich. **Senden** und
  **Empfangen** bewegen Nachrichten von Hand.

> Mit einem Telefon kannst du trotzdem einen Chat über das Relay ausprobieren: Deine Chats und
> **Versteckte Chats** haben jeweils ihre eigene Relay-Warteschlange und ihre eigenen Schlüssel. Lege beide
> Warteschlangen auf demselben Relay an, tippe in einem auf **Meinen Kontaktlink teilen** und kopiere ihn, füge ihn
> dann im anderen hinzu, und schreibe in beide Richtungen. Der eigene Link eines Chats wird als Kontakt abgelehnt.

## Was heute geschützt ist {#privacy}

Erevos sagt offen, was es schützt und was es noch nicht schützt.

| Was | Heute | Kommt |
| --- | --- | --- |
| **Konto, Telefonnummer, E-Mail-Adresse** | Nicht nötig. Kontakte sind Paare von Einweg-Warteschlangen auf Relays. | |
| **Kontakte und ihre Namen, Schlüssel, Relay-Einstellungen, Aussehen** | Auf dem Telefon mit dem Schlüssel jedes Bereichs versiegelt. | |
| **Nachrichten über ein Relay** | Ende-zu-Ende-verschlüsselt: PQXDH mit ML-KEM-768 zu Beginn, dann der Double Ratchet. Das Relay kann sie nicht lesen, und sobald beide Telefone eine Nachricht voneinander bekommen haben, kann es sie auch nicht nach Unterhaltung unterscheiden: Jede wird noch einmal für das Telefon versiegelt, an das sie geht. Es sieht, welche Nachrichten sind, die jemand liest, welche Mitteilungen zwischen Telefonen und welche Anrufe, die klingeln, wie jede es sagt. Noch nicht geprüft. | Eine Prüfung von außen. |
| **Nachrichten an ein Telefon in der Nähe** | Ende-zu-Ende-verschlüsselt, genauso wie über das Relay. Wer in der Nähe mithört, kann erkennen, dass Erevos-Telefone nah beieinander sind und wann und wie viel sie senden; im selben WLAN kann das jeder darin, und über Wi-Fi Direct jeder, der dem eigenen WLAN der Telefone beitritt. Bis das Telefon deines Kontakts bekannt ist, bekommen die anderen in der Nähe verbundenen Erevos-Telefone deine kurzen Nachrichten, versiegelt. | |
| **Von anderen Telefonen mitgenommene Nachrichten** | Zweimal versiegelt: Ende zu Ende für deinen Kontakt und für sein Relay. Ein Telefon, das eine mitnimmt, sieht, an welches Relay sie geht, wann und wie groß sie ist; nicht, von wem oder für wen sie ist. Sein Relay sieht, an welches Relay sie geht, und jenes Relay sieht das Relay des Überbringers, nicht sein Telefon. Versiegelt auf dem Telefon aufbewahrt, höchstens drei Tage: die für andere in einer Datei des Telefons, deren Größe ungefähr zeigt, wie viele es sind; deine eigenen in deinem Bereich, mit seinem Schlüssel versiegelt. Versteckte Chats werden nie mitgenommen. | |
| **Nachrichten über LoRa** | Ende-zu-Ende-verschlüsselt, genauso wie über das Relay. Jeder mit einem Funkgerät, kilometerweit entfernt, kann erkennen, dass deines sendet, wann und wie viel, und sein Signal lässt sich bis zu seinem Standort zurückverfolgen. Erevos hält dein Funkgerät davon ab, seinen Namen und seinen Standort zu nennen (Rolle Client hidden, GPS aus, keine feste Position), außer du erlaubst es; einem Funkgerät, das nach seinem Namen fragt, antwortet es trotzdem. Jedes Erevos im Mesh bekommt deine LoRa-Nachrichten, versiegelt. | Den Namen des Funkgeräts aus Erevos festlegen. |
| **Wer mit wem redet** | Das Relay sieht IP-Adressen, Warteschlangen-IDs und wann und wie viel. Mit einem zweiten Relay sieht dein Relay nie deine Adresse. Von einem auf dem Relay eines Kontakts geliehenen Platz aus sieht sie jedes Relay, an das du sendest. [Über Tor](#tor), das Nachrichten trägt, sofern du es nicht änderst, sieht kein Relay sie für das, was du schreibst, und mit **Alles** auch für Bilder und Dateien; mit Brücken, für Orte, an denen Tor blockiert ist, sieht das Netz nur eine Brücke. Der Broker von Snowflake und STUN-Server sehen deine Adresse. | Tor auf einem Computer. |
| **Die Verbindung zum Relay** | TLS, und darin, sobald der Schlüssel des Relays bekannt ist, ein Kanal zu diesem Schlüssel: Das Relay beweist bei jeder Verbindung, dass es ihn hat, und das Token und jede Anfrage gehen verschlüsselt an ihn, sodass sich jemand dazwischen mit einem Zertifikat für den Namen des Relays nicht als es ausgeben kann. Ein Relay, das seinen Schlüssel einmal bewiesen hat, wird nie wieder ohne ihn erreicht. Ein Relay, das älter ist als diese App, geht wie bisher, und **So bist du jetzt verbunden** sagt es. Der erste Schlüssel kommt beim ersten Fragen vom Relay oder aus einem Kontaktlink: Wer genau bei diesem allerersten Mal dazwischen ist, könnte einen eigenen geben. [Der eigene Schlüssel des Relays](#relay). Nicht geprüft. | Der Schlüssel unseres Relays fest in der App und in Einladungen. |
| **Texte über Nostr** | Ende-zu-Ende-verschlüsselt wie über ein Relay, dann noch einmal verpackt für einen Schlüssel, den dein Kontakt nur diesem Chat gegeben hat, signiert mit einem nur für diesen Text gemachten Schlüssel. Die Nostr-Relays sehen wann und wie groß, und dass ein Schlüssel, der niemanden nennt, einen Text bekommt; dein Telefon liest all seine Schlüssel über eine Verbindung, über Tor, sodass ein Relay erkennen kann, dass sie zusammen gelesen werden, nie von wo. Dein Relay sieht sie nur als Reserve, und eine Klingel für versteckte Chats. [Über Nostr](#nostr). | Bilder und Sprachnachrichten über Nostr. |
| **SMS** | Eine normale SMS liest die Telefongesellschaft, wie jede SMS. An eine mit einem Erevos-Kontakt verknüpfte Nummer geht sie stattdessen über Erevos. Eine versteckte Einladung ist eine weitere kurze SMS, die die Telefongesellschaft sieht. | |
| **Die Kontakte des Telefons** | In den eigenen Kontakten von Android, nicht von Erevos versiegelt, wie bei jeder Kontakte-App: Jede App, die sie lesen darf, sieht sie, und ein Konto (Google) kann sie synchronisieren. Erevos sendet sie nirgendwohin. Eine daraus gespeicherte .vcf-Datei ist außerhalb von Erevos, nicht versiegelt. Die Anrufe und SMS eines Kontakts werden nur aus der eigenen Anrufliste und den SMS des Telefons gelesen, um seinen Verlauf zu zeigen, und nirgends aufbewahrt. | |
| **Nur in Erevos gespeicherte Kontakte** | Mit dem Schlüssel des Bereichs versiegelt, oder mit dem der versteckten Chats für deren Kontakte, in einer Datei für jeden Bereich, deren Größe ungefähr zeigt, wie viele es insgesamt sind, nicht wem sie gehören; ihre Fotos jeweils in einer eigenen Datei. Nie in den Kontakten von Android. Eine daraus gespeicherte .vcf-Datei, auch aus versteckten Chats, ist außerhalb von Erevos, nicht verschlüsselt. Anrufe und SMS an sie gehen über das Telefon und erscheinen in seiner Anrufliste und seinen SMS. | |
| **Telefonanrufe** | Normale Telefonanrufe: Die Telefongesellschaft überträgt sie und kann mithören, wie bei jeder Telefon-App. Android führt die Anrufliste, nicht von Erevos versiegelt, wie für jede Telefon-App; Erevos liest sie, und die Favoriten, um sie zu zeigen, löscht daraus nur die Anrufe, die du löschst, und behält keine Kopie. Die für jede Nummer gewählte SIM ist im Bereich versiegelt; die Schnellantworten und was blockiert ist (nur Präfixe, Gruppen-IDs und Zeiten, für jeden Bereich gleich) werden auf dem Telefon aufbewahrt, nicht versiegelt. | |
| **Importierte Chats** | Versiegelt in dem Bereich, in den sie geholt wurden, auch ihre Fotos und Dateien, jedes in seinen Stücken wie die Datei eines Chats. Die Größe der Datei, und wie viele Stücke es gibt, verraten ungefähr, wie viel importiert wurde, nicht wohin. | Fotos und Dateien aus Viber, und Dateien über 1 GB. |
| **Nachrichtenverlauf** | Auf dem Telefon aufbewahrt, versiegelt in seinem Bereich, ohne Grenze, in Seiten gleicher Größe, gemischt für alle Bereiche. Nur wie viel alles zusammen belegt, ist sichtbar, nicht zu welchem Bereich es gehört. Löschen auf beiden Telefonen und verschwindende Nachrichten verlassen sich auf das Erevos des anderen Telefons. | |
| **Nachrichten in der Nähe** | Öffnen sich nur in dem Bereich, der den Kontakt hat. Eine für einen anderen Bereich wartet im Arbeitsspeicher, höchstens sechs Stunden, bis sich dieser Bereich öffnet. Versteckte Chats nutzen die Verbindung in der Nähe nie. | Versteckte Chats in der Nähe. |
| **Sprachnachrichten** | Ende-zu-Ende-verschlüsselt über das Relay oder in der Nähe, in Stücken: Das Relay, oder wer in der Nähe mithört, kann ungefähr erkennen, wie lang jede ist. Jeder Ton ist in einer eigenen Datei versiegelt; wie viele Dateien es gibt und wie groß sie sind, zeigt ungefähr, wie viele aufbewahrt werden, nicht in welchem Bereich. Nur während des Abspielens entsiegelt im Cache. | Tondateien alle gleich groß. |
| **Fotos und Dateien** | Ende-zu-Ende-verschlüsselt, über den Dateispeicher des Relays, in Stücken gleicher Größe: Das Relay sieht wie viele und wann, also ungefähr wie groß. Dein Relay sieht deine Adresse, wie bei Nachrichten; der Kontakt holt sie über sein eigenes Relay. Fotos verlieren ihren Ort, ihr Telefon und ihre Zeit, außer sie werden als Datei gesendet; eine Datei behält, was sie in sich sagt. Auf dem Telefon in ihren Stücken versiegelt, aus dem Arbeitsspeicher gezeigt. Gespeicherte Kopien sind außerhalb von Erevos. Noch nicht in Backups. | Backups, die sie enthalten. |
| **Auf einem Computer** | Versiegelt wie auf dem Telefon, im eigenen Ordner der App. Sein Schlüsselspeicher ist mit dem Schlüsselbund des Systems versiegelt (unter Windows mit dem Schlüssel deines Kontos); auf einem Linux-System ohne Schlüsselbund bewahrt Erevos nichts auf, außer es wurde mit \`--plain-secrets\` gestartet, und bewahrt ihn dann so auf, wie er ist. | |
| **Backups** | Eine mit eigenem Passwort versiegelte Datei, die jeden Bereich so enthält, wie er auf dem Telefon versiegelt ist. Ihr Name sagt, dass sie ein Erevos-Backup ist, und ihre Größe zeigt ungefähr, wie viel aufbewahrt wird. Automatische Backups bewahren ihr Passwort auf dem Telefon auf. Geht nur an einen Server, wenn du einen hinzufügst: zufällige Bytes unter einem zufälligen Namen, in aufgerundeter Größe; der Server sieht dein Konto, deine Adresse und wann. | Backups auf einen Server über Tor. |
| **Zeichen ✓✓ und ✓✓✓** | Das Telefon des Kontakts erfährt, verschlüsselt, wann deines seine Nachrichten bekommen und gelesen hat. Das Relay, oder wer in der Nähe mithört, sieht eine weitere kleine Nachricht. | Ein Schalter, um nicht mehr mitzuteilen, wann du liest. |
| **Fingerabdruck oder Gesicht (Android)** | Aus, solange nicht eingeschaltet. Öffnet nur den Bereich des ersten Passworts: sein Schlüssel im Android Keystore versiegelt, nur direkt nach einer starken Fingerabdruck- oder Gesichtsprüfung nutzbar und verworfen, wenn diese sich ändern. Jemand, der dich festhält, kann deinen Finger benutzen. | |
| **Benachrichtigungen (Android)** | Im Hintergrund: „Erevos – Ready for calls and messages“ (nicht auf dem Sperrbildschirm), „Incoming call“ oder „Incoming video call“ – „Open Erevos to answer“, und „New message“ oder wie viele kamen; wenn Android oder das Passwort es beendet, „Closed by Android“ oder „Locked“ – „Open it to receive calls and messages again“; eine Erinnerung, „Reminder“ oder wie viele; eine neue Version, „Erevos X is out“. Nie wer oder was. Auf einem gesperrten Telefon sagt die für Nachrichten nur „Erevos“. Versteckte Chats, die es dürfen, zeigen dieselbe Benachrichtigung, mit dem Rest gezählt: Wer sie sieht und nichts Neues findet, kann ahnen, dass es mehr gibt. Als Telefon-App nennt die Benachrichtigung eines Telefonanrufs, wer anruft, auch über dem Sperrbildschirm, wie die jeder Telefon-App, aber nie mit einem Namen, den nur versteckte Chats kennen: Ein Anruf von einem ihrer Kontakte zeigt die Nummer. | |
| **Widget und Telefon (Android)** | Das Widget zeigt, sobald es hinzugefügt ist, wie viele verpasste Anrufe, ungelesene SMS und neue Nachrichten es gibt, nie wer oder was. Das Telefon öffnet sich nur ohne Passwort, wenn du es erlaubst: Dann sieht jeder, der das entsperrte Telefon in der Hand hat, die Anrufe und Favoriten, die Android führt, nur mit den Namen aus den Kontakten des Telefons. | |
| **Anrufe** | Ende-zu-Ende-verschlüsselt (DTLS-SRTP, sein Schlüssel im verschlüsselten Chat gesendet). Über das Anruf-Relay sieht keines der Telefone die IP-Adresse des anderen; der Server, auf dem es läuft, sieht beide, wann und wie lange, und wie viel durchgeht. Ohne Anruf-Relay, nur im selben WLAN, sieht jedes Telefon die Adresse des anderen. Die Relays sehen, wann ein Anruf zu klingeln beginnt. | Klingeln auf einem Computer und in der Web-App, wenn geschlossen. Anrufe über Bluetooth (das Walkie-Talkie funktioniert dort). |
| **Gruppenchats** | Ende-zu-Ende-verschlüsselt mit MLS (RFC 9420); herausgenommene Mitglieder lesen danach nichts mehr. Die Kopie jedes Mitglieds wird für sich versiegelt, sodass Relays nicht erkennen können, wer in einer Gruppe ist; jedes Relay sieht trotzdem eine Nachricht in einer Warteschlange ankommen. Mitglieder sehen die Schlüssel und Relay-Adressen der anderen. Fotos, Dateien und Sprachnachrichten gehen über den Dateispeicher des Relays des Absenders, wie an einen Kontakt, und bleiben dort 14 Tage. Nicht geprüft. | |
| **Gruppenanrufe** | Sprache und Video, Ende-zu-Ende-verschlüsselt zwischen je zwei Telefonen im Anruf (DTLS-SRTP, seine Schlüssel in der Verschlüsselung der Gruppe gesendet). Über das Anruf-Relay sieht kein Telefon die IP-Adresse eines anderen; der Server, auf dem es läuft, sieht die jedes Telefons, wann und wie lange, und wie viel durchgeht. Jedes Mitglied, im Anruf oder nicht, erfährt, wer darin ist. Die Relays sehen, wann einer beginnt. | Video mit mehr als vier Personen, über einen Server; mehr als acht Personen. |
| **Öffentliche Gruppen** | Wie Gruppenchats, und jeder mit dem Link kann um Beitritt bitten und ab dem Hereinlassen lesen. Anfragen kommen beim Relay des Inhabers an, versiegelt für das Telefon des Inhabers: Das Relay sieht wie viele und wann, nicht von wem. Mitglieder sehen die gewählten Namen der anderen, nur für diese Gruppe gemachte Schlüssel, Relay-Adressen und Absender-IDs der Warteschlangen. Nicht geprüft. | |
| **Linkvorschauen** | Aus, solange nicht eingeschaltet. Dann ruft dein Telefon beim Senden eines Links dessen Seite direkt von der Website ab, die deine IP-Adresse sieht und wann, nicht für wen die Nachricht ist. Die Vorschau geht in der verschlüsselten Nachricht mit; das empfangende Telefon ruft nichts ab. Keine, solange der Bereich über Tor geht; in versteckten Chats nur mit dem eigenen Schalter ihres Platzes. | Vorschauen über Tor. |

## Transparenz {#transparency}

Was der Server hinter Erevos (lphl.nekten.eu) aufbewahrt, und was von ihm verlangt wurde. Diese Seite geht in jedem
Release mit hinaus, ist also mit dem Release signiert, wie die App.

**Anfragen von Behörden.** Stand dieses Releases: keine. Keine Behörde, kein Gericht und kein Unternehmen hat Daten
über jemanden verlangt, der Erevos nutzt, und niemand wurde aufgefordert, über eine solche Anfrage zu schweigen. Wenn
dieser Absatz jemals fehlt oder nicht mehr „keine“ sagt, nimm das als Zeichen. **Warum:** Eine Anfrage, die mit der
Anordnung kommt, zu schweigen, kann nicht erzählt werden, aber ein Satz, der nicht mehr geschrieben wird, kann
auffallen. Das funktioniert nur, solange er erneuert wird: Jedes Release sagt ihn erneut.

Was das Relay aufbewahrt, und wie lange:

| Was | Wie lange |
| --- | --- |
| **Wartende Nachrichten**, Ende zu Ende verschlüsselt | Bis sie geholt werden, höchstens 14 Tage. |
| **Fotos und Dateien**, verschlüsselt, in Stücken | Wie Nachrichten: bis sie geholt werden, höchstens 14 Tage. |
| **Für später gesendete Nachrichten**, verschlüsselt | Bis ihre Zeit kommt. |
| **Warteschlangen**, zufällige IDs ohne Namen | Bis ihr Telefon sie 180 Tage lang nicht genutzt hat. |
| **Zugangszeilen**: für jedes Telefon der SHA-256 seines Tokens und ein Name: der, den der Einladende eingegeben hat, oder der LPHL-Benutzername für die, die sich mit LPHL angemeldet haben | Bis die Zeile herausgenommen wird oder die Zeile verschwindet, die es eingeladen hat. |
| **Push-Adressen der Web-App**, für Benachrichtigungen, während die Web-App geschlossen ist | Bis sie in der Web-App ausgeschaltet werden. |

Was es nicht aufbewahrt:

- **Keine Liste von Verbindungen.** Das Relay schreibt kein Protokoll darüber, wer sich wann verbunden hat, und der
  Webserver vor dem Relay und der Web-App führt seit dem 24. Oktober 2026 kein Zugriffsprotokoll. Fehler werden
  protokolliert, und ein Fehler kann eine Adresse nennen.
- **Keine Kontakte, Namen oder Telefonnummern.** Es hat keine, die es aufbewahren könnte.

Was es trotzdem sieht, während es läuft: die IP-Adressen, die sich verbinden, wann Nachrichten kommen und gehen, und
wie groß sie sind, wie [Was heute geschützt ist](#privacy) sagt. Während eines Anrufs über das Anruf-Relay die
IP-Adressen der Telefone darin.

**Kopien.** Der Ordner des Relays wird jeden Tag gesichert, mit den wartenden Nachrichten weiterhin Ende zu Ende
verschlüsselt. Die Kopien enthalten, was die Tabelle oben aufführt, so lange sie aufbewahrt werden.

**Andere, die etwas sehen:** die Hosting-Firma (Hetzner), die die Maschine und ihr Netz betreibt; die Anmeldung von
LPHL (Authentik), die jede Anmeldung mit LPHL sieht; und für die Web-App mit Benachrichtigungen, wenn geschlossen, der
Push-Dienst des Browsers (Apple, Google oder Mozilla), der sieht, dass eine Benachrichtigung kam, nie was.

## Was kommt {#coming}

Ende-zu-Ende-Verschlüsselung ist da, über das Relay und über die Verbindung in der Nähe, und das meiste, was folgt,
baut darauf auf.

- **Mehr Wege, in Kontakt zu bleiben:** Tor-Brücken für Orte, an denen Tor blockiert ist, sind da, siehe
  [Über Tor](#tor). Als Nächstes: Tor auf einem Computer.
  - **LoRa-Funkgeräte (Meshtastic):** da, siehe [Über LoRa-Funk](#lora). Als Nächstes: den Namen des Funkgeräts aus
    Erevos festlegen.
  - **SMS:** Erevos als SMS-App ist da, mit MMS-Fotos, Gruppen-MMS und zwei SIMs, siehe [SMS](#sms).
  - **Telefon:** Erevos als Telefon-App ist da, mit eigenem Anrufbildschirm, siehe [Telefon](#phone).
  - **E-Mail, QR-Codes, USB, NFC:** für den Fall, dass nichts anderes durchkommt.
- **Anrufe:** Sprach- und Videoanrufe sind da, und auf Android klingeln sie im Hintergrund, siehe
  [Chat über ein Relay](#relay), und ebenso ein Walkie-Talkie, das sogar über Bluetooth funktioniert.
- **Gruppen:** Gruppenchats, mit Fotos, Dateien und Sprachnachrichten, und Sprach- und Videoanrufe in Gruppen sind da,
  siehe [Gruppenchats](#groups). Als Nächstes: Video mit mehr als vier Personen, über einen Server, zu dem der Anruf
  von selbst wechselt, weiterhin Ende zu Ende verschlüsselt.
- **Deine Chats mitbringen:** Telegram und WhatsApp kommen schon herein, mit ihren Fotos und Dateien, und Viber mit
  seinen Worten, siehe [Importierte Chats](#import). Als Nächstes: Fotos und Dateien aus Viber.
- **Mehr Systeme:** öffentliche Gruppen und Gruppenanrufe auch auf verknüpften Geräten; das Konto, seine Anrufe und
  seine Gruppen sind schon auf einem Computer, siehe [Verknüpfte Geräte](#devices). Linux, macOS und Windows sind da,
  siehe [Auf einem Computer](#desktop), das iPhone im Browser, siehe [Auf einem iPhone](#iphone), und Sailfish OS,
  siehe [Unter Sailfish OS](#sailfish); und ebenso Backups, siehe [Backups](#backup).

## Fragen {#faq}

### Ich habe mein Passwort vergessen.

Es lässt sich nicht wiederherstellen. Erevos bewahrt nichts auf, was deine Daten ohne es öffnen könnte. Nur wenn das
Entsperren mit [Fingerabdruck oder Gesicht](#lock) an ist, öffnet es noch den ersten Bereich: Lege dort mit
**Passwort ändern** ein neues Passwort fest.

### Ein Kontakt in der Nähe zeigt nie „In der Nähe“.

- Schreib ihm: Die Telefone erfahren, welches welches ist, aus der ersten Nachricht, die
  in der Nähe ankommt. Nur Kontakte werden gefunden, also fügt euch zuerst gegenseitig hinzu.
- Halte auf beiden Telefonen einen Bereich offen: Erevos auf dem Bildschirm, oder im Hintergrund mit
  **Im Hintergrund** auf **Empfangen und klingeln**.
- Prüfe, dass Bluetooth an ist (und, auf Android 12 und älter, der Standort) und dass Erevos Geräte in der Nähe finden
  darf (Android-Einstellungen → Apps → Erevos → Berechtigungen).
- Bring die Telefone näher zusammen. Wenn eines von ihnen kein Wi-Fi Aware hat, finden sie sich über Bluetooth, was
  langsamer startet.
- Oder verbinde beide mit einem WLAN oder dem Hotspot eines Telefons, mit eingeschaltetem
  **Erevos im selben WLAN finden**. Manche öffentlichen WLANs halten die Geräte darin voneinander getrennt: Dort kann
  es nicht funktionieren. Ohne gemeinsames WLAN lässt **WLAN mit Telefonen in der Nähe aufbauen** sie eines aufbauen
  (Android 10 und neuer); gib ihm bis zu ein, zwei Minuten.

### Über LoRa kommt nichts an.

- Beide Funkgeräte brauchen in der Meshtastic-App dieselbe Region und denselben ersten Kanal (seinen Namen und
  Schlüssel), und sie müssen in Reichweite voneinander sein, oder von Funkgeräten dazwischen.
- **LoRa-Funk**, unter **Einstellungen** → **Relay und Netze**, muss **Verbunden** sagen. Wenn nicht, schließe die
  Meshtastic-App: Ein Funkgerät verbindet sich immer nur mit einer App.
- Nur Texte gehen, und nur wenn das Relay nicht erreichbar und kein Telefon in der Nähe ist.
- In der EU darf ein Funkgerät pro Stunde nur begrenzt senden: Nach vielen Nachrichten wartet es.

### Ein Kontaktcode wurde nicht hinzugefügt.

Ein Kontakt auf einem anderen Relay braucht einen Link mit dem Schlüssel dieses Relays, den Links aus einem aktuellen
Erevos haben: Die Zeile unter dem Chat nennt dieses Relay. Ein Code aus einem älteren Erevos hat keine Schlüssel und
wird abgelehnt: Bitte um einen neuen.

### Kann das Relay meine Nachrichten lesen?

Nein. Nachrichten über ein Relay sind Ende-zu-Ende-verschlüsselt, und nur die beiden Telefone haben die Schlüssel. Das
Relay sieht trotzdem, welche Warteschlangen genutzt werden, und wann und wie viel ankommt
([Ein eigenes Relay betreiben](#own-relay)). Vergleiche die Sicherheitsnummer, wie in [Chat über ein Relay](#relay),
um sicher zu sein, dass niemand dazwischen ist. Nichts davon wurde bisher geprüft.

### Warum fragt Erevos nicht nach meiner Telefonnummer?

Weil nichts sie braucht. Jeder Kontakt ist ein Paar von Einweg-Warteschlangen auf Relays, sodass kein Server eine
Liste führt, wer wen kennt.

### Funktioniert es auf einem iPhone oder einem Computer?

Auf einem Computer ja: Linux, macOS und Windows, siehe [Auf einem Computer](#desktop).
Auf einem iPhone ja, im Browser, als Web-App, siehe [Auf einem iPhone](#iphone).
`;
