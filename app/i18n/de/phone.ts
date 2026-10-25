// The German of the Phone and Contacts screens (app/phone.tsx and what goes with it) (i18n/de/index.ts).
export const phone: Record<string, string> = {
  // The Phone screen (app/phone.tsx) and its place in the menu.
  Phone: 'Telefon',
  'This build of Erevos has no phone part yet. It comes with the next build of the app.':
    'Diese Version von Erevos hat noch keinen Telefonteil. Er kommt mit der nächsten Version der App.',
  'Only Android lets another app be the phone app.': 'Nur Android erlaubt einer anderen App, die Telefon-App zu sein.',
  'Erevos may not make calls. Make it the phone app under Settings.': 'Erevos darf keine Anrufe tätigen. Mache es unter „Einstellungen“ zur Telefon-App.',
  'Not called. {error}': 'Nicht angerufen. {error}',
  Contacts: 'Kontakte',
  Settings: 'Einstellungen',
  'Back to the call': 'Zurück zum Anruf',
  'Erevos is not the phone app': 'Erevos ist nicht die Telefon-App',
  "Calls made here show on Android's own call screen until you make Erevos the phone app, under Settings.":
    'Anrufe von hier erscheinen auf dem Anrufbildschirm von Android selbst, bis du Erevos unter „Einstellungen“ zur Telefon-App machst.',
  Number: 'Nummer',
  'Call on': 'Anrufen über',
  "Without that, calls go on the phone's default SIM.": 'Ohne das gehen Anrufe über die Standard-SIM des Telefons.',
  'Erevos keeps this SIM for the number, sealed in this space, and calls it on the same SIM next time.':
    'Erevos merkt sich diese SIM für die Nummer, versiegelt in diesem Bereich, und ruft sie nächstes Mal über dieselbe SIM an.',
  Keypad: 'Wähltasten',
  Recents: 'Anrufliste',
  Favourites: 'Favoriten',

  // The calls (Android's call history) and the favourites, on the Phone screen (lib/phone-log.ts).
  All: 'Alle',
  Missed: 'Verpasst',
  Incoming: 'Eingehend',
  Outgoing: 'Ausgehend',
  Blocked: 'Blockiert',
  'Incoming call': 'Eingehender Anruf',
  'Outgoing call': 'Ausgehender Anruf',
  'Declined call': 'Abgelehnter Anruf',
  'Blocked call': 'Blockierter Anruf',
  'Private number': 'Unterdrückte Nummer',
  Payphone: 'Münztelefon',
  'Unknown number': 'Unbekannte Nummer',
  'Wi-Fi calling': 'WLAN-Telefonie',
  'HD voice': 'HD Voice',
  'Android does not let Erevos read the call history yet.': 'Android lässt Erevos die Anrufliste noch nicht lesen.',
  'Allow the call history': 'Anrufliste erlauben',
  'Android did not allow it. Under Settings, Allow calls and contacts says how to.':
    'Android hat es nicht erlaubt. Unter „Einstellungen“ steht bei „Anrufe und Kontakte erlauben“, wie es geht.',
  'No calls of this kind.': 'Keine Anrufe dieser Art.',
  'No calls yet.': 'Noch keine Anrufe.',
  'Call on {sim}': 'Über {sim} anrufen',
  'Call {name}': '{name} anrufen',
  'Send an SMS': 'SMS senden',
  'Change the number before calling': 'Nummer vor dem Anrufen ändern',
  'Block this number': 'Diese Nummer blockieren',
  'Unblock this number': 'Blockierung dieser Nummer aufheben',
  'Blocked {who}.': '{who} blockiert.',
  'Unblocked {who}.': 'Blockierung von {who} aufgehoben.',
  'Delete this call': 'Diesen Anruf löschen',
  'Delete these {n} calls': 'Diese {n} Anrufe löschen',
  'Delete every call with this number': 'Alle Anrufe mit dieser Nummer löschen',
  'Call deleted.': 'Anruf gelöscht.',
  '{n} calls deleted.': '{n} Anrufe gelöscht.',
  'The calls with {who} were deleted.': 'Die Anrufe mit {who} wurden gelöscht.',
  'The calls were not deleted. {error}': 'Die Anrufe wurden nicht gelöscht. {error}',
  "Android does not let Erevos read the phone's contacts yet.": 'Android lässt Erevos die Kontakte des Telefons noch nicht lesen.',
  'Allow the contacts': 'Kontakte erlauben',
  'No favourites yet. The contacts you star show here, to call at a tap.':
    'Noch keine Favoriten. Die Kontakte, die du mit einem Stern markierst, erscheinen hier und lassen sich mit einem Tippen anrufen.',

  // The phone's settings (app/phone-settings.tsx).
  'Phone settings': 'Telefon-Einstellungen',
  'Erevos is the phone app': 'Erevos ist die Telefon-App',
  "As the phone app, Erevos shows every call on its own screen: who calls, with their photo, over the lock screen too, without unlocking Erevos. Its Phone screen, with the keypad, the calls and the favourites, stays behind Erevos's password, unless you let it open without it, below. Phone calls are plain phone calls: the phone company carries them, as it carries every call.":
    'Als Telefon-App zeigt Erevos jeden Anruf auf seinem eigenen Bildschirm: wer anruft, mit Foto, auch über dem Sperrbildschirm, ohne dass du Erevos entsperrst. Sein Bildschirm „Telefon“ mit Wähltasten, Anrufen und Favoriten bleibt hinter dem Passwort von Erevos, außer du lässt ihn unten ohne Passwort öffnen. Telefonanrufe sind normale Telefonanrufe: Der Mobilfunkanbieter überträgt sie, wie jeden Anruf.',
  'Make Erevos the phone app': 'Erevos zur Telefon-App machen',
  'Android did not make Erevos the phone app': 'Android hat Erevos nicht zur Telefon-App gemacht',
  "Choose Erevos in Android's Default apps → Phone app. If Android says it is a restricted setting, open Erevos's App info, tap ⋮ at the top right → Allow restricted settings, and choose Erevos again.":
    'Wähle Erevos in Android unter „Standard-Apps → Telefon-App“. Sagt Android, es sei eine eingeschränkte Einstellung, öffne die App-Info von Erevos, tippe oben rechts auf ⋮ → „Eingeschränkte Einstellungen zulassen“ und wähle Erevos erneut.',
  "Android did not allow it all. In Erevos's App info, under Permissions, call logs may say Restricted setting: then go back, tap ⋮ at the top right → Allow restricted settings, and allow Phone, Call logs and Contacts under Permissions.":
    'Android hat nicht alles erlaubt. In der App-Info von Erevos steht unter „Berechtigungen“ bei den Anruflisten vielleicht „Eingeschränkte Einstellung“: Geh dann zurück, tippe oben rechts auf ⋮ → „Eingeschränkte Einstellungen zulassen“ und erlaube unter „Berechtigungen“ Telefon, Anruflisten und Kontakte.',
  'Android holds back part of what the phone app needs': 'Android hält einen Teil von dem zurück, was die Telefon-App braucht',
  'Calls, the SIMs, the call history or the names of your contacts may not show. Android holds this back from an app installed from a browser, until you allow it.':
    'Anrufe, die SIMs, die Anrufliste oder die Namen deiner Kontakte erscheinen vielleicht nicht. Android hält das bei einer App, die aus einem Browser installiert wurde, zurück, bis du es erlaubst.',
  'Allow calls and contacts': 'Anrufe und Kontakte erlauben',
  'So a call that comes shows no Answer and Decline outside the call screen.':
    'Deshalb zeigt ein eingehender Anruf außerhalb des Anrufbildschirms kein „Annehmen“ und „Ablehnen“.',
  'Android does not let Erevos show a call that comes over the lock screen: it shows as a notice only.':
    'Android lässt Erevos einen eingehenden Anruf nicht über dem Sperrbildschirm zeigen: Er erscheint nur als Benachrichtigung.',
  'This device has no phone part, so it cannot make calls.': 'Dieses Gerät hat kein Telefonteil und kann deshalb keine Anrufe tätigen.',
  'Quick replies': 'Schnellantworten',
  'Message, on the call screen of a call that rings, declines it with one of these, which the phone sends the caller as an SMS. They are kept on the phone, not sealed, as the call screen shows them with Erevos locked.':
    '„Nachricht“ auf dem Anrufbildschirm eines klingelnden Anrufs lehnt ihn mit einer davon ab, die das Telefon dem Anrufer als SMS sendet. Sie liegen unversiegelt auf dem Telefon, weil der Anrufbildschirm sie bei gesperrtem Erevos zeigt.',
  Remove: 'Entfernen',
  'Add a reply': 'Antwort hinzufügen',
  'Use the usual replies': 'Die üblichen Antworten nutzen',

  // Opening the Phone without the password (app/phone-settings.tsx, lib/phone-open.ts).
  'Open Erevos': 'Erevos öffnen',
  'Open the Phone without the password': 'Telefon ohne Passwort öffnen',
  "With Erevos locked, the Phone's icon, a tel: link and the notice of a missed call then open the keypad, the calls and the favourites, which Android keeps for every phone app. Anyone holding the unlocked phone sees your calls and favourites, with the names of the phone's contacts only, never those kept only in Erevos or in hidden chats. Calls can be made there, nothing changed; everything else stays behind the password.":
    'Bei gesperrtem Erevos öffnen dann das Symbol des Telefons, ein tel:-Link und die Mitteilung über einen verpassten Anruf die Wähltasten, die Anrufe und die Favoriten, die Android für jede Telefon-App aufbewahrt. Wer das entsperrte Handy in der Hand hat, sieht deine Anrufe und Favoriten, nur mit den Namen aus den Kontakten des Handys, nie mit denen, die nur Erevos oder versteckte Chats kennen. Dort lässt sich anrufen, aber nichts ändern; alles andere bleibt hinter dem Passwort.',
  'The Phone opens without the password.': 'Das Telefon öffnet sich ohne Passwort.',
  'Keep the Phone behind the password': 'Telefon wieder hinter das Passwort',

  // Blocking calls (app/phone-settings.tsx, lib/phone-rules.ts).
  Blocking: 'Anrufe blockieren',
  "A blocked call does not ring and leaves no notice; it shows under Blocked in the calls. The telemarketing ranges and your prefixes never block a number in the phone's contacts. What is blocked is the same in every space, and keeps no names.":
    'Ein blockierter Anruf klingelt nicht und hinterlässt keine Benachrichtigung; er erscheint in der Anrufliste unter „Blockiert“. Die Telemarketing-Nummernbereiche und deine Nummernanfänge blockieren nie eine Nummer aus den Kontakten des Telefons. Was blockiert ist, ist in jedem Bereich gleich und speichert keine Namen.',
  'Block telemarketing': 'Telemarketing blockieren',
  'Stop blocking telemarketing': 'Telemarketing nicht mehr blockieren',
  'The numbers these countries keep for telemarketing calls:': 'Die Nummern, die diese Länder für Telemarketing-Anrufe vorsehen:',
  France: 'Frankreich',
  Spain: 'Spanien',
  Chile: 'Chile',
  India: 'Indien',
  Brazil: 'Brasilien',
  'optional for the callers since August 2025': 'seit August 2025 für Anrufer freiwillig',
  'Numbers starting with': 'Nummern, die beginnen mit',
  Block: 'Blockieren',
  'Type the start of the numbers to block, with the country code or as you dial it here: +33 162 or 0162.':
    'Gib den Anfang der zu blockierenden Nummern ein, mit Ländervorwahl oder so, wie du sie hier wählst: +33 162 oder 0162.',
  'Erevos does not screen calls yet, so a blocked call rings a moment before Erevos ends it.':
    'Erevos prüft Anrufe noch nicht vorab, deshalb klingelt ein blockierter Anruf kurz, bevor Erevos ihn beendet.',
  'Let Erevos screen calls': 'Erevos Anrufe prüfen lassen',
  "Android's own blocked numbers, the same list as under SMS: Android rejects their calls before they ring, and their SMS and MMS. Every space sees the same list.":
    'Die blockierten Nummern von Android selbst, dieselbe Liste wie unter „SMS“: Android weist ihre Anrufe ab, bevor sie klingeln, und ihre SMS und MMS. Jeder Bereich sieht dieselbe Liste.',
  'Only the phone app or the SMS app may see them: make Erevos the phone app above.':
    'Nur die Telefon-App oder die SMS-App darf sie sehen: Mache Erevos oben zur Telefon-App.',
  'Block a contact group': 'Eine Kontaktgruppe blockieren',
  "The calls of a group's contacts, as your phone's contacts label them, are blocked for a while: for an hour, until tomorrow morning, or until you lift it.":
    'Die Anrufe der Kontakte einer Gruppe, wie die Kontakte deines Telefons sie einordnen, werden eine Weile blockiert: eine Stunde, bis morgen früh oder bis du es aufhebst.',
  'Your phone has no contact groups yet.': 'Dein Telefon hat noch keine Kontaktgruppen.',
  Lift: 'Aufheben',
  '{n} contact': '{n} Kontakt',
  '{n} contacts': '{n} Kontakte',
  'For an hour': 'Eine Stunde lang',
  'Until tomorrow morning': 'Bis morgen früh',
  'Until I lift it': 'Bis ich es aufhebe',
  'Blocked until you lift it': 'Blockiert, bis du es aufhebst',
  'Blocked until {time}': 'Blockiert bis {time}',
  'Blocked until tomorrow, {time}': 'Blockiert bis morgen, {time}',
  'Calls from the group {group} are blocked': 'Anrufe aus der Gruppe {group} sind blockiert',
  'Calls from a contact group are blocked': 'Anrufe aus einer Kontaktgruppe sind blockiert',
  // The Phone's search for a contact to call.
  'Clear the search': 'Suche löschen',
  'No contact with a number matches.': 'Kein Kontakt mit Nummer passt.',
  // A plain call from the top of a chat or an SMS conversation (components/dial-tile.tsx).
  'Mobile call, not encrypted': 'Mobilfunkanruf, nicht verschlüsselt',
  'This phone has no app to call {number}.': 'Dieses Telefon hat keine App, um {number} anzurufen.',
};
