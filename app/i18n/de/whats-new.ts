// The German of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/de/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Was ist neu',
  'What each version changed': 'Was jede Version geändert hat',
  'What each version of Erevos changed, the newest first.': 'Was jede Version von Erevos geändert hat, die neueste zuerst.',
  'Not out yet': 'Noch nicht erschienen',
  'This version': 'Diese Version',
  'For you': 'Für dich',
  'Under the hood': 'Unter der Haube',
  // Not out yet.
  '**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).':
    '**Was ist neu, in zwei Teilen**: Jede Version sagt zuerst, was sich für dich ändert, dann, was sich unter der Haube geändert hat: Korrekturen, Tempo, Akku und Sicherheit im Inneren. Siehe [Updates](#updates).',
  '**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.':
    '**Die SMS eines Kontakts zählen nicht mehr weiter als neu**: sein Chat liest beim Öffnen alle, auch die früheren, nicht nur die angezeigten.',
  '**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).':
    '**Eine Nachricht wartet nicht mehr, wenn Tor das Relay nicht erreicht**: mit Tor für Nachrichten geht sie sofort direkt, wie es die Tor-Einstellungen sagen. Siehe [Über Tor](#tor).',
  '**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).':
    '**Hinweise im Hintergrund hören nach einem Netzwechsel nicht mehr auf**: starb die Verbindung eines Wartens am Relay unterwegs (von WLAN zu mobilen Daten, Neustart des Relays), hielt Erevos das Relay für den ganzen Lauf für ein altes, das nicht warten kann: Nachrichten von Kontakten kamen bis zu zehn Minuten später, und versteckte Chats, geschlossene Räume und versteckte Anrufe meldeten nichts mehr, bis Erevos neu gestartet wurde. Siehe [Chat über ein Relay](#relay).',
  '**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).':
    '**Ein sofort aufgelegter Anruf klingelt nicht mehr**: kam das Auflegen im selben Blick wie der Anruf, klingelte das Telefon 45 Sekunden für einen Anruf, in dem niemand war; ebenso bei einem Gruppenanruf, den sein Starter sofort verließ. Siehe [Chat über ein Relay](#relay).',
  '**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).':
    '**Ein versteckter Anruf klingelt einmal**: ein Ort mit Empfangen, wenn geschlossen und einer Klingel-Warteschlange klingelte zweimal für einen Anruf, und ein Anruf, der bei offenen versteckten Chats angenommen wurde, klingelte beim Schließen erneut. Siehe [Versteckte Chats](#hidden).',
  '**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).':
    '**Der Kontaktlink eines Mitglieds meldet keine Neue Nachricht mehr**: die Antwort auf eine Bitte aus einer Gruppe fügt nur den Kontakt hinzu, ohne Hinweis. Siehe [Gruppenchats](#groups).',
  '**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).':
    '**Der Geburtstagshinweis und der eingehende Anruf des Telefons ersetzen einander nicht mehr**: sie hatten dieselbe Hinweisnummer. Siehe [Kontakte](#contacts).',
  '**A closed space tells of its contacts\' messages too**: since each contact writes to a queue of their own, a space that says a message came while another is open told only of group messages and first messages from new contacts. It now asks about its contacts\' queues too, up to 64. See [Chat through a relay](#relay).':
    '**Ein geschlossener Bereich meldet auch die Nachrichten seiner Kontakte**: Da jeder Kontakt in eine eigene Warteschlange schreibt, meldete ein Bereich, der sagt, dass eine Nachricht kam, während ein anderer offen ist, nur Gruppennachrichten und erste Nachrichten neuer Kontakte. Jetzt fragt er auch nach den Warteschlangen seiner Kontakte, bis zu 64. Siehe [Chat über ein Relay](#relay).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**Die Anleitung gibt es in jeder Sprache der App**: Sie erscheint in der, die du gewählt hast, und nennt die Tasten so, wie die App sie zeigt. Siehe [Sprache](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Standort findet dich, auch in Gebäuden**: das Telefon sucht per Satellit und über sein Netzwerk zugleich, ein Blatt sagt, dass es sucht, und wird nichts gefunden, sagt es warum, mit Erneut versuchen. Siehe [Chat über ein Relay](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**Das Symbol der Web-App zählt, was ungelesen ist**: auf einem iPhone, mit eingeschalteten Benachrichtigungen für den Bereich, zeigt das Symbol von Erevos auf dem Home-Bildschirm, wie viele Nachrichten ungelesen sind, nie die eines versteckten Chats, außer du schaltest es unter Einstellungen → Benachrichtigungen → Zahl auf dem Symbol aus. Siehe [Auf einem iPhone](#iphone).',
  "**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).":
    "**Benachrichtigungen für jeden Chat**: Auf Android schalte einen Chat oder eine Gruppe für 8 Stunden, eine Woche oder immer stumm, und gib seinen Nachrichten und Anrufen einen eigenen Ton, oder keinen. Siehe [Chat über ein Relay](#relay).",
  "**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden).":
    "**Ein Chat mit eigener PIN bleibt gesperrt**: Begann das Erevos des Kontakts eine neue Unterhaltung, wie es etwa einmal im Monat geschieht, verlor der Chat seine PIN, und eine öffentliche Gruppe, der du wieder beigetreten bist, verlor ihre. Siehe [Versteckte Chats](#hidden).",
  "**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay).":
    "**Das Symbol von Erevos behält die Zahl ungelesener Nachrichten, auf Android**: Verlässt du Erevos mit ungelesenen Nachrichten, hält eine Meldung ohne Ton fest, wie viele es sind, bis du sie liest, und der Launcher zeigt sie am Symbol, als Zahl oder Punkt. Einstellungen → Benachrichtigungen → Zahl auf dem Symbol schaltet das aus. Siehe [Chat über ein Relay](#relay).",
  "**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone).":
    "**Die Benachrichtigungen der Web-App, verlässlicher**: keine „Neue Nachricht“ über dem offenen Erevos, und ein Push, der zurückgehalten wurde, während das Telefon offline war, zählt keine Nachrichten mehr, die du schon gelesen hast (beides mit aktualisiertem Relay), jeder Hinweis macht in Chrome, Firefox und Edge einen Ton, sie kommen von selbst zurück, wenn der Browser seine Push-Adresse ändert, und „Benachrichtigungen, wenn geschlossen“ sagt, wenn der Browser sie blockiert oder dein Relay noch nicht erfahren hat, dass sie aus sind. Siehe [Auf einem iPhone](#iphone).",
  "**The relay's pushes to the web app, sturdier**: a push the push service could not take just then is sent again, a call goes before the messages waiting their turn, and whoever runs the relay can allow another push service. Your relay needs an update for it.":
    "**Die Pushes des Relays an die Web-App, robuster**: Ein Push, den der Push-Dienst gerade nicht annehmen konnte, wird erneut gesendet, ein Anruf geht vor den Nachrichten, die warten, bis sie an der Reihe sind, und wer das Relay betreibt, kann einen anderen Push-Dienst zulassen. Dein Relay braucht dafür ein Update.",
  // 3.4.2
  '**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.':
    '**Eine Nachricht, die du sendest, während sich ein Chat öffnet, wartet auf ihn**, markiert mit Wird gesendet…, und geht, sobald er offen ist, ohne zu sagen, dass Erevos nicht verschlüsseln kann.',
  '**What you read as a chat opens stays read**: the home screen no longer counts it as new.':
    '**Was du liest, während sich ein Chat öffnet, bleibt gelesen**: Der Startbildschirm zählt es nicht mehr als neu.',
  '**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).':
    '**Keine Frage von Samsung nach seiner Freigabe**: Auf einem Samsung-Telefon bleiben Wi-Fi Aware und das WLAN mit Telefonen in der Nähe aus, bis du sie einschaltest. Siehe [Chat mit einem Telefon in der Nähe](#nearby).',
  '**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.':
    '**Das SMS-Feld behält seine Breite auf einem kleinen Bildschirm**: Foto und Senden daneben sind runde Knöpfe, wie in einem Chat.',
  // 3.4.1
  '**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.':
    '**Senden reagiert sofort**: ein kurzes Vibrieren beim Tippen, das Feld leert sich und die Nachricht erscheint mit „Wird gesendet…“, sodass sie nie zweimal geht.',
  '**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.':
    '**Der Bildschirm bleibt nicht mehr hochgeschoben**, nachdem sich die Tastatur hinter einem Fenster, einem Dialog oder einer anderen App geschlossen hat.',
  '**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).':
    '**Einen Chat mit seinen Fotos zu importieren friert Erevos nicht mehr ein**: Der Bildschirm bleibt bedienbar, während die Dateien kommen, zeigt, welcher Anteil schon da ist, und **Abbrechen** hält es an. Ein in versteckte Chats verschobener Chat nimmt die in ihn importierten Chats mit. Siehe [Importierte Chats](#import).',
  // 3.4.0
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Dein Relay beweist seinen eigenen Schlüssel**: Jede Verbindung dorthin beginnt mit einer Prüfung, die nur das Relay mit diesem Schlüssel bestehen kann, so kann sich niemand dazwischen als es ausgeben. Hat es sie einmal bestanden, verbindet sich Erevos nie mehr ohne die Prüfung damit. Dein Relay braucht dafür ein Update.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Transparenz](#transparency), ein neuer Teil der Anleitung: was der Server hinter Erevos speichert und wie lange, was er nicht speichert und wer sonst etwas sieht.',
  "**What's new**: this list, in Settings → General, by version.": '**Was ist neu**: diese Liste, unter „Einstellungen → Allgemein“, nach Versionen.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Hinter der PIN eines Chats ist nichts zu sehen**: Von einem mit einer PIN gesperrten Chat wird keine Nachricht gezeigt, bevor seine PIN eingegeben ist, und bei Glas, einem Hintergrund oder einem Stil mit eigener Szene ist der PIN-Bildschirm dichtes Milchglas, durch das nichts zu sehen ist.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Ein Gruppen-Videoanruf oben in der Gruppe**: eine blaue Kamera neben dem grünen Hörer, wie im Chat mit einem Kontakt.",
  "**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it.":
    "**Eine Relay-Warteschlange für jeden Kontakt**: Jeder Kontakt schreibt in eine Warteschlange, die nur er kennt. So kann das Relay nicht erkennen, dass zwei Kontakte an dasselbe Telefon schreiben, und Löschen oder Blockieren entfernt nur dessen eigene. Dein Relay braucht dafür ein Update.",
  "**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden).":
    "**Versteckte Chats, mehr wie die anderen**: Sie schließen sich nach 30 Sekunden im Hintergrund, nicht sofort, und nie während eines Anrufs oder während du ein Foto oder eine Datei auswählst; solange sie offen sind, spielt eine Nachricht ihren Ton, und Linkvorschauen haben dort einen eigenen Schalter. Siehe [Versteckte Chats](#hidden).",
  "**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden).":
    "**Versteckte Chats, die geschlossen empfangen**: Ein Schalter oben an jedem Platz, bei neuen Plätzen an, lässt sie wie deine anderen Chats empfangen: Ihre Kontakte sehen sofort, dass eine Nachricht angekommen ist, eine Mitteilung sagt nur „Neue Nachricht“, und ein Anruf klingelt ohne Namen. Siehe [Versteckte Chats](#hidden).",
  "**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden).":
    "**Versteckte Chats warten und importieren auch**: Was jetzt nicht gehen kann, wartet, markiert mit „Wartet“, und geht von selbst über ihr Relay; „Später senden“ funktioniert dort wie in deinen anderen Chats; und ein Chat aus Telegram, WhatsApp oder Viber kann in einen versteckten Chat importiert werden und bleibt nur dort. Siehe [Versteckte Chats](#hidden).",
  "**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden).":
    "**Versteckte Chats als Liste wie deine Chats**: Sie öffnen sich in einer Liste wie auf dem Startbildschirm, mit dem zuletzt Gesagten und wie viele ungelesen sind, und jeder Platz hat oben seinen eigenen Chat mit mir selbst. Siehe [Versteckte Chats](#hidden).",
  "**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden).":
    "**Mehr in versteckten Chats**: Mit „Empfangen, wenn geschlossen“ wird auch gelesen, was über Nostr zu ihnen kommt, während sie geschlossen sind; und dort kann ein Kontakt über ein Foto seines QR-Codes hinzugefügt und einem versteckten Kontakt ein Foto gegeben werden. Siehe [Versteckte Chats](#hidden).",
  "**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden).":
    "**Versteckte Chats ohne Relay**: Wie deine anderen Chats können sie nur über Nostr beginnen: Ihr Kontaktlink und QR-Code sagen, wo sie dort lesen, und Texte und Reaktionen gehen dorthin. Siehe [Versteckte Chats](#hidden).",
  "**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden).":
    "**Gruppen in versteckten Chats**: Unter ihrer Liste macht Neue Gruppe eine Gruppe mit ihren Kontakten; sie steht unter ihren Chats, geht nur über ihr Relay und wird gelesen, während sie geschlossen sind, wenn Empfangen, wenn geschlossen an ist. Siehe [Versteckte Chats](#hidden).",
  "**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy).":
    "**Kein Hinweis auf eine Testversion mehr**: Der Startbildschirm endet nicht mehr mit der Zeile, dies sei eine Testversion. Die Anleitung sagt weiter genau, was geschützt ist, und dass noch nichts geprüft wurde. Siehe [Was heute geschützt ist](#privacy).",
  "**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts).":
    "**Das Kontaktmenü in versteckten Chats**: Ihre Kontakte haben wieder ein Menü, nur mit dem, was ihnen gehört: eine .vcf-Datei in sie importieren, ihre Kontakte als .vcf-Datei speichern und den QR-Code eines Kontakts aus einem Foto lesen. Eine dort eingegebene Erevos-ID fügt die Person den versteckten Chats hinzu. Siehe [Kontakte](#contacts).",
  // 3.3.2
  '**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.':
    '**Die Taste für normale Anrufe bei mehr Kontakten**: Das orangefarbene Tastenfeld oben im Chat eines Kontakts nimmt auch die Nummer des Kontakts, mit dem du ihn verknüpft hast (**Mit einem meiner Kontakte verknüpfen**), zuerst die Mobilnummer.',
  // 3.3.1
  '**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.':
    '**Viber-Chats lassen sich importieren**: aus der HTML-Datei der Android-App Backup Text for Viber, nur der Text.',
  // 3.3.0
  '**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.':
    '**Ohne Relay anfangen, über Nostr**: **Ohne Relay anfangen** unter „Neuer Chat“. Texte, Sticker, Reaktionen, Bearbeitungen und die Zeichen für zugestellt und gelesen gehen über Nostr, über Tor. Fotos, Sprachnachrichten, Dateien und Anrufe brauchen weiterhin ein Relay oder ein Telefon in der Nähe.',
  '**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.':
    '**Das Relay kommt von selbst**: Wer ein Relay hat, das Einladungen erlaubt, schickt einem Kontakt ohne Relay einmal eine Einladung, im Chat, und das andere Telefon nimmt sie von selbst an.',
  '**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.':
    '**Hinweis, wenn eine neue Version da ist** (Android): Einmal am Tag fragt Erevos den Server von LPHL und zeigt dann eine angeheftete Erevos-Zeile und eine Mitteilung, nur für eine Version, die der Release-Computer signiert hat. Abschalten lässt es sich unter „Einstellungen → Allgemein → Updates“.',
  '**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.':
    '**Einen Chat mit einer PIN sperren**: „Details → Mit PIN sperren“, für Chats und Gruppen. Nichts davon erscheint in der Suche, in markierten Nachrichten oder in Importen. In versteckten Chats wird keine PIN abgefragt.',
  '**A new handset** on the green tiles: Phone, and the call in a chat.': '**Ein neuer Hörer** auf den grünen Kacheln: Telefon und der Anruf im Chat.',
  '**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.':
    '**Ein neuer Bildschirm „Neuer Chat“**: „So bist du jetzt verbunden“ ganz oben, drei große Karten für ein Telefon ohne Relay („Ich habe eine Einladung“, „Mit LPHL anmelden“, „Ohne Relay anfangen“) und das Technische unter „Für Fortgeschrittene“.',
  '**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.':
    '**Nostr stabiler über Tor**: Jedes Nostr-Relay hat seinen eigenen Weg durch Tor und versucht nach einem Fehler einen neuen Exit-Knoten. Eine klarere Fehlermeldung auf dem Nostr-Bildschirm.',
  '**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.':
    '**Wenn die Verbindung zum Relay abbricht**, während Erevos darauf wartet, merkt Erevos das und verbindet sich neu, wo es vorher hängen blieb.',
  '**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.':
    '**Per SMS einladen** (Android): auf der Karte eines Telefonkontakts, für eine Person, für 2 Tage. Der Link öffnet eine Seite, die Erevos anbietet (das APK für Android, die Web-App für ein iPhone oder einen Computer), und öffnet dann die Einladung. Der QR-Code und „Einladung teilen“ bleiben, wie sie waren.',
  '**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.':
    '**Korrekturen an der SMS-Einladung**: Auch ein als /i/#… kopierter Link funktioniert, eine ältere Web-App öffnet die Einladung ebenfalls, und in iOS 26 steht dabei, dass „Teilen“ unter ••• liegt.',
  '**A phone call button** in Erevos chats and SMS chats.': '**Eine Taste für Telefonanrufe** in Erevos-Chats und SMS-Chats.',
  // 3.2.1
  '**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.':
    '**Eine gesendete Nachricht bearbeiten**, bis zu einem Tag danach: bei Kontakten, in Gruppen und auf verknüpften Geräten, mit „Bearbeitet“ neben der Uhrzeit.',
  '**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.':
    '**Nostr sagt, was es getan hat**: „Über Nostr gesendet“, und auf dem Nostr-Bildschirm, was jedes Relay zuletzt tat.',
  '**Coloured call buttons** at the top of a chat: video blue, voice green.': '**Farbige Anruftasten** oben im Chat: Videoanruf blau, Sprachanruf grün.',
  // 3.2.0
  'Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.':
    'Pfeile zum Anfang und zum Ende eines Chats; ältere Nachrichten laden von selbst, während du scrollst.',
  'Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.':
    'Aus Telegram und WhatsApp importierte Chats sehen aus wie Erevos-Nachrichten: Sprechblasen, Tage, Fotos, Sprachnachrichten, Suche.',
  'Dogs instead of cats in the stickers.': 'Hunde statt Katzen in den Stickern.',
  'Screenshots: a switch in Settings → Privacy and security.': 'Bildschirmfotos: ein Schalter unter „Einstellungen → Datenschutz und Sicherheit“.',
  'Hidden chats from New chat: hold it for a second.': 'Versteckte Chats über „Neuer Chat“: eine Sekunde lang gedrückt halten.',
  'Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.': 'Farbige Kacheln auf dem Startbildschirm: Telefon grün, Kontakte violett, das Schloss orange.',
  '**Chat with myself**, always first, and **Remind me**, the orange bell.': '**Chat mit mir selbst**, immer ganz oben, und **Erinnern**, die orangefarbene Glocke.',
  '**Media, links and files** in a chat’s Details, with a calendar and Go to a day.':
    '**Medien, Links und Dateien** in den Details eines Chats, mit einem Kalender und „Zu einem Tag“.',
  'Import a chat from inside the chat: Details → Imported chats.': 'Einen Chat direkt im Chat importieren: „Details → Importierte Chats“.',
  'A closed space can say that a message came while another space is open.': 'Ein geschlossener Bereich kann melden, dass eine Nachricht kam, während ein anderer Bereich offen ist.',
  'The message menu says when a message went or came through Nostr.': 'Das Nachrichtenmenü zeigt, wenn eine Nachricht über Nostr gesendet wurde oder kam.',
  '**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.': '**Erevos unterstützen**: Liberapay, PayPal, Monero, Bitcoin.',
  'Who makes Erevos and why, in About Erevos; the guide says why everywhere.': 'Wer Erevos macht und warum, unter „Über Erevos“; die Anleitung sagt überall, warum.',
  // 3.1.2
  '**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.':
    '**Einstellungen in 8 Gruppen**, mit einer Suche: Allgemein, Darstellung, Benachrichtigungen, Datenschutz und Sicherheit, Relay und Netze, Telefon und SMS, Daten und Geräte, Zum Testen. Das ⋯ auf dem Startbildschirm enthält nur noch die Orte und zuletzt die Einstellungen.',
  // 3.1.1
  'Check for updates says what stopped an update.': '„Nach Updates suchen“ sagt, was ein Update verhindert hat.',
  'Invite someone is not made from a token for all; it asks you to sign in to the relay first.':
    '„Jemanden einladen“ entsteht nicht mehr aus einem Token für alle; es bittet dich zuerst, dich beim Relay anzumelden.',
  'The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).':
    'Das Token für alle des Relays wird von selbst zu einem eigenen Token dieses Telefons (das Relay braucht dafür ein Update).',
  'A relay that refuses through Tor says why.': 'Ein Relay, das Verbindungen über Tor ablehnt, sagt, warum.',
  // 3.1.0
  'Less battery in the background: the relay, Tor and the nearby radios.': 'Weniger Akkuverbrauch im Hintergrund: Relay, Tor und die Funkverbindungen zu Telefonen in der Nähe.',
  'Erevos no longer closes when you make a sticker from a photo.': 'Erevos schließt sich nicht mehr, wenn du aus einem Foto einen Sticker machst.',
  'Hidden chats’ notices are right.': 'Die Benachrichtigungen der versteckten Chats stimmen.',
  'Hidden chats by holding New chat.': 'Versteckte Chats durch Gedrückthalten von „Neuer Chat“.',
  'A search for contacts on the Phone.': 'Eine Suche nach Kontakten unter „Telefon“.',
  'New chat shows first how to add a contact.': '„Neuer Chat“ zeigt zuerst, wie du einen Kontakt hinzufügst.',
  'A call shows over the screen saver, and the screen wakes.': 'Ein Anruf erscheint über dem Bildschirmschoner, und der Bildschirm geht an.',
  'Erevos in other apps’ Share.': 'Erevos unter „Teilen“ in anderen Apps.',
  'A sound for every new message, also while Erevos shows.': 'Ein Ton für jede neue Nachricht, auch während Erevos offen ist.',
  'The SMS settings say right what holding does.': 'Die SMS-Einstellungen sagen richtig, was das Gedrückthalten bewirkt.',
  // 3.0.0
  'Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.': 'Jedes Symbol öffnet, was es nennt: Erevos, SMS, Telefon, Kontakte, das Widget.',
  '**Messages through Tor by default**: Messages, Everything or Nothing.': '**Nachrichten standardmäßig über Tor**: Nachrichten, Alles oder Nichts.',
  '**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.':
    '**Texte über Nostr**: drei öffentliche Relays, über Tor, mit deinem eigenen Relay als Reserve nach 5 Minuten.',
  // 2.0.3
  'One invite for everything: the relay and the contact together.': 'Eine Einladung für alles: Relay und Kontakt zusammen.',
  'Spam rules for senders and numbers abroad, with the reason.': 'Spam-Regeln für Absender und Nummern aus dem Ausland, mit Begründung.',
  '480 stickers in 20 sets.': '480 Sticker in 20 Sets.',
  'Lighter chats on older phones; QR codes at once.': 'Leichtere Chats auf älteren Telefonen; QR-Codes sofort.',
  'Copy code for one-time codes in SMS.': '„Code kopieren“ für Einmalcodes in SMS.',
  'Locked, Erevos keeps receiving.': 'Auch gesperrt empfängt Erevos weiter.',
  'Faster contacts; the hidden chats’ notice counts only messages.': 'Schnellere Kontakte; die Benachrichtigung der versteckten Chats zählt nur Nachrichten.',
  'The relay tries every address: push, other relays, the LPHL sign-in.': 'Das Relay versucht jede Adresse: Push, andere Relays, die LPHL-Anmeldung.',
  // 2.0.2
  'Swiping on the tabs only changes the tab.': 'Wischen auf den Tabs wechselt nur den Tab.',
  'The icons fill the launcher’s shape.': 'Die Symbole füllen die Form des Launchers aus.',
  // 2.0.1
  'Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.':
    'Farbige Symbole (Erevos rot, Telefon grün, SMS blau, Kontakte violett) und ein neues SMS-Symbol.',
  'A colour for each icon, and the order of the widget’s buttons.': 'Eine Farbe für jedes Symbol, und die Reihenfolge der Schaltflächen des Widgets.',
  'Swipe to go back, and between tabs.': 'Wischen, um zurückzugehen, und zwischen Tabs.',
  // 2.0.0
  'An update of the WebView no longer closes Erevos.': 'Ein Update der WebView schließt Erevos nicht mehr.',
  'Deleting or blocking a contact gives you a new queue on the relay.': 'Wenn du einen Kontakt löschst oder blockierst, bekommst du eine neue Warteschlange auf dem Relay.',
  'A new contact can take the name of a contact on the phone.': 'Ein neuer Kontakt kann den Namen eines Kontakts auf dem Telefon übernehmen.',
  '**Sign in to the relay with LPHL**, and **invites to the relay**.': '**Beim Relay mit LPHL anmelden**, und **Einladungen zum Relay**.',
  'Permissions in the web app, and more on Android; the web app’s notice says how many came.':
    'Berechtigungen in der Web-App und mehr auf Android; die Benachrichtigung der Web-App sagt, wie viele kamen.',
  'Hidden chats can ring calls while they are closed.': 'Versteckte Chats können Anrufe klingeln lassen, während sie geschlossen sind.',
  'New keys every month in chats, every week in groups.': 'Neue Schlüssel jeden Monat in Chats, jede Woche in Gruppen.',
  'Linked devices work with the phone off.': 'Verknüpfte Geräte funktionieren auch bei ausgeschaltetem Telefon.',
  'A new chat screen; QR codes from a photo; the Phone for small screens.': 'Ein neuer Chat-Bildschirm; QR-Codes aus einem Foto; das Telefon für kleine Bildschirme.',
  'Add as contact inside a group.': '„Als Kontakt hinzufügen“ in einer Gruppe.',
  'Stickers in sets, moving, and your own.': 'Sticker in Sets, animiert, und eigene.',
  'SMS inside the Erevos chat.': 'SMS im Erevos-Chat.',
  'Android updates need the release computer’s signature.': 'Android-Updates brauchen die Signatur des Release-Computers.',
  'An F-Droid build; Serbo-Croatian; new version numbers.': 'Ein Build für F-Droid; Serbokroatisch; neue Versionsnummern.',
  'Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.':
    'Viel für die Sicherheit: Argon2id, Nachrichten auch für das Relay verschlüsselt, ein Token für jedes Telefon, kein Link startet einen Anruf.',
  // 0.1.16
  'Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.': 'Importe aus Telegram und WhatsApp bringen Fotos, Videos, Sprachnachrichten und Dateien mit.',
  'A phone without a relay talks through a place on a contact’s relay.': 'Ein Telefon ohne Relay spricht über einen Platz auf dem Relay eines Kontakts.',
  // 0.1.14
  'Back to my chats, for hidden chats.': '„Zurück in meine Chats verschieben“, für versteckte Chats.',
  'Erevos receives and rings even after you swipe it away from the recent apps.': 'Erevos empfängt und klingelt auch, nachdem du es aus den letzten Apps weggewischt hast.',
  // 0.1.12
  'Hidden chats can say a message came.': 'Versteckte Chats können melden, dass eine Nachricht kam.',
  'Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.': 'Korrekturen: Menüs, QR-Codes aus einem Foto, Bluetooth unter Android 17, lange Listen.',
  // 0.1.11
  'The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.':
    'Das Telefon ohne Passwort, wenn du es erlaubst; ein Widget für den Startbildschirm; ein Filter für SMS und Erevos.',
  // 0.1.10
  'Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.': 'Links warten auf das Passwort; Symbole für Telefon und Kontakte; die Erevos-ID bei einem Kontakt.',
  // 0.1.8
  '61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.':
    '61 neue Funktionen: 5 neue Sprachen, verknüpfte Geräte, öffentliche Gruppen, Antworten, Reaktionen, Umfragen, später senden, Erevos als Telefon- und Kontakte-App, Tor-Brücken, der Fingerabdruck, Windows und mehr.',
  // 0.1.7 to 0.1.2
  'SMS notices in the background.': 'SMS-Benachrichtigungen im Hintergrund.',
  'The web app comes out with every release.': 'Die Web-App erscheint mit jedem Release.',
  'Greek in the whole app.': 'Griechisch in der ganzen App.',
  'Web Push in the web app.': 'Web Push in der Web-App.',
  'The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.':
    'Das erste signierte Android-Release: verschlüsselte Chats, Anrufe, Gruppen, versteckte Chats, Backups, Importe und Telefone in der Nähe ohne Internet.',
  "**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls.":
    "**Zwei neue Sticker-Sets mit 24 Stimmungen**: **Tux**, der Linux-Pinguin, wie er gezeichnet ist, und **Aikido**, ein Aikidoka in Keikogi und weitem Hakama, der sich auch verbeugt, im Seiza sitzt und rollt.",
};
