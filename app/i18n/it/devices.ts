// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Italian of linked devices: the account on the phone and on a computer (lib/devices.ts, app/devices.tsx; i18n/it/index.ts).
export const devices: Record<string, string> = {
  // Linking and the links (lib/devices.ts).
  Computer: 'Computer',
  'Linked devices could not open.': 'Impossibile aprire i dispositivi collegati.',
  'That device is linked already.': 'Quel dispositivo è già collegato.',
  'That is not a code from Linked devices.': 'Questo non è un codice di «Dispositivi collegati».',
  'The code changed. Compare it again.': 'Il codice è cambiato. Confrontalo di nuovo.',
  'This device is no longer linked to a phone.': 'Questo dispositivo non è più collegato a un telefono.',
  'This is a linked device. Link from the phone that holds the account.': 'Questo è un dispositivo collegato. Collega dal telefono che ha l’account.',
  'This space has chats of its own. Link from a space with none, such as one that opens with a new password.':
    'Questo spazio ha già delle chat sue. Collega da uno spazio senza chat, come uno che si apre con una nuova password.',
  'This space is linked already.': 'Questo spazio è già collegato.',
  'These hidden chats are linked already.': 'Queste chat nascoste sono già collegate.',
  'These hidden chats have chats of their own. Link from hidden chats with none, such as those a new PIN sets.':
    'Queste chat nascoste hanno chat proprie. Collega da chat nascoste senza chat, come quelle che apre un nuovo PIN.',
  'Too long to go through the phone.': 'Troppo lungo per passare dal telefono.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Scrivi prima l’indirizzo del relay in «Relay»: i dispositivi collegati raggiungono questo telefono tramite il relay.',
  '{n} devices are linked already, the most there can be.': 'Sono già collegati {n} dispositivi, il massimo possibile.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Dispositivi collegati',
  'Not sent by the phone': 'Non inviato dal telefono',
  'These chats came from a linked device’s backup: you can read them here, but not write in them. To write, link this device to the phone again, in Linked devices.':
    'Queste chat vengono dal backup di un dispositivo collegato: puoi leggerle qui, ma non scriverci. Per scrivere, collega di nuovo questo dispositivo al telefono, in Dispositivi collegati.',
  'This account on a computer or in a browser too': 'Questo account anche su un computer o in un browser',
  "This chat is the phone's: move it into hidden chats there.": 'Questa chat è del telefono: spostala nelle chat nascoste da lì.',
  'These hidden chats are linked to a phone: move the chat into them there.':
    'Queste chat nascoste sono collegate a un telefono: sposta la chat in esse da lì.',
  "This chat is the phone's: move it out of the hidden chats there.": 'Questa chat è del telefono: toglila dalle chat nascoste da lì.',

  // A call answered on another device of the account (components/call-screen.tsx, lib/call-lines.ts).
  'Answered on another device': 'Risposto su un altro dispositivo',
  'answered on another device': 'risposto su un altro dispositivo',

  // Linked devices (app/devices.tsx).
  'All of it': 'Tutti',
  'The last month': 'L’ultimo mese',
  'The last week': 'L’ultima settimana',
  None: 'Nessuno',
  'Web browser': 'Browser',
  'Code copied. Paste it on the phone in Settings → Data and devices → Linked devices.': 'Codice copiato. Incollalo sul telefono in «Impostazioni → Dati e dispositivi → Dispositivi collegati».',
  'Code copied. Paste it on the phone, in Linked devices of the same hidden chats.':
    'Codice copiato. Incollalo sul telefono, in «Dispositivi collegati» delle stesse chat nascoste.',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Collegato. Le chat arrivano dal telefono, e con loro i messaggi che ha scelto di trasferire.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Non collegato. Qualcun altro potrebbe aver letto il codice. Creane uno nuovo e collega di nuovo.',
  'Now the computer shows a code too. If it is {code}, tap They match there.': 'Ora anche il computer mostra un codice. Se è {code}, tocca lì «Coincidono».',
  'Unlink this device': 'Scollega questo dispositivo',
  'Unlink {name}': 'Scollega {name}',
  "The account's chats leave this device, messages and all, and so do the accounts it brought over from the phone. The phone keeps them.":
    'Le chat dell’account vengono tolte da questo dispositivo, messaggi compresi, come pure gli account che ha trasferito dal telefono. Il telefono li conserva.',
  'Nothing more goes to it, and nothing it sends is taken. What it has stays on it, behind its own lock.':
    'Non gli arriva più nulla, e niente di quello che invia viene accettato. Quello che ha resta lì, dietro il suo blocco.',
  'Unlinked.': 'Scollegato.',
  'Unlinked here. The phone was not told: unlink this device there too.': 'Scollegato qui. Il telefono non è stato avvisato: scollega questo dispositivo anche da lì.',
  'Unlinked. The device was not told, and gets nothing more.': 'Scollegato. Il dispositivo non è stato avvisato, e non riceve più nulla.',
  'The messages go to it now. What it has already is not kept twice.': 'Ora i messaggi vengono trasferiti. Quelli che ha già non vengono salvati due volte.',
  'Messages to bring over': 'Messaggi da trasferire',
  'Photos and files too': 'Anche foto e file',
  'Linked to {name}': 'Collegato a {name}',
  'Since {when}. Last heard from {last}.': 'Dal {when}. Ultimo contatto: {last}.',
  'This device has the chats and groups of the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay. Calls ring here too. New groups, public groups and group calls stay on the phone for now.':
    'Questo dispositivo ha le chat e i gruppi del telefono che ha l’account. Quello che scrivi qui passa dal telefono, che deve essere acceso e raggiungere il relay. Le chiamate squillano anche qui. Per ora i nuovi gruppi, i gruppi pubblici e le chiamate di gruppo restano sul telefono.',
  'These hidden chats have the chats and groups of the same hidden chats on the phone that holds the account. What you write here goes through the phone, which has to be on and reach the relay, with these hidden chats open or receiving while closed there. Calls ring here too. New groups and group calls stay on the phone for now.':
    'Queste chat nascoste hanno le chat e i gruppi delle stesse chat nascoste del telefono che ha l’account. Quello che scrivi qui passa dal telefono, che deve essere acceso e raggiungere il relay, con queste chat nascoste aperte lì o che ricevono da chiuse. Le chiamate squillano anche qui. Per ora i nuovi gruppi e le chiamate di gruppo restano sul telefono.',
  'Make or join groups on the phone that holds this account.': 'Crea gruppi o entra nei gruppi dal telefono che ha questo account.',
  'Group calls ring on the phone that holds this account, for now. Call from there.':
    'Per ora le chiamate di gruppo squillano sul telefono che ha questo account. Chiama da lì.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go with it: each links on its own, from inside it.':
    'Lo stesso account su un computer o in un browser. L’account resta sul telefono: inoltra, crittografato end-to-end, quello che arriva e quello che scrive il computer, così i contatti non vedono niente di nuovo. Le chat nascoste e quello che apre una seconda password non vengono mai trasferiti con esso: ognuno si collega per conto suo, dall’interno.',
  'These hidden chats on a computer or in a browser, linked on their own. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Nothing of it shows in the space, nor goes to its linked devices.':
    'Queste chat nascoste su un computer o in un browser, collegate per conto loro. L’account resta sul telefono: inoltra, crittografato end-to-end, quello che arriva e quello che scrive il computer, così i contatti non vedono niente di nuovo. Niente di tutto questo si vede nello spazio, né va ai suoi dispositivi collegati.',
  'Link {name}': 'Collega {name}',
  'Once you tap Link, the computer shows this code. Link only if it shows the same:': 'Appena tocchi «Collega», il computer mostra questo codice. Collega solo se mostra lo stesso:',
  Link: 'Collega',
  Devices: 'Dispositivi',
  'Linked {when}. Last heard from {last}.': 'Collegato il {when}. Ultimo contatto: {last}.',
  'Linked {when}.': 'Collegato il {when}.',
  'Waiting for They match to be tapped on it.': 'In attesa che lì venga toccato «Coincidono».',
  'Bringing over messages: {n} so far.': 'Trasferimento dei messaggi: {n} finora.',
  'Bring over': 'Trasferisci',
  'Bring over messages again': 'Trasferisci di nuovo i messaggi',
  'Signed in as {name}: this device has a token of its own there. Now tap Link to my phone.':
    'Accesso eseguito come {name}: questo dispositivo ha lì un token tutto suo. Ora tocca «Collega al mio telefono».',
  'Link a computer to this phone': 'Collega un computer a questo telefono',
  "On the computer, open Settings → Data and devices → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'Sul computer, apri «Impostazioni → Dati e dispositivi → Dispositivi collegati → Collega al mio telefono». Poi inquadra il suo codice con la fotocamera di questo telefono, o copialo lì e incollalo qui.',
  "On the computer, open the same hidden chats with their PIN, then Linked devices → Link to my phone in them. Then scan its code with this phone's camera while these hidden chats are open, or copy it there and paste it here.":
    'Sul computer, apri le stesse chat nascoste con il loro PIN, poi al loro interno «Dispositivi collegati → Collega al mio telefono». Poi scansiona il suo codice con la fotocamera di questo telefono mentre queste chat nascoste sono aperte, oppure copialo lì e incollalo qui.',
  'Code from the computer': 'Codice dal computer',
  Next: 'Avanti',
  'Link to my phone': 'Collega al mio telefono',
  'The phone read the code. Does it show this one too?': 'Il telefono ha letto il codice. Mostra anche lui questo?',
  'They match': 'Coincidono',
  'They differ': 'Sono diversi',
  'On the phone that holds the account, scan this code with the camera, or paste it in Settings → Data and devices → Linked devices. This space must have no chats of its own.':
    'Sul telefono che ha l’account, inquadra questo codice con la fotocamera, o incollalo in «Impostazioni → Dati e dispositivi → Dispositivi collegati». Questo spazio non deve avere chat sue.',
  'On the phone that holds the account, open the same hidden chats with their PIN, then scan this code with the camera, or paste it in Linked devices in them. These hidden chats must have no chats of their own.':
    'Sul telefono che ha l’account, apri le stesse chat nascoste con il loro PIN, poi scansiona questo codice con la fotocamera, oppure incollalo nei loro «Dispositivi collegati». Queste chat nascoste non devono avere chat proprie.',
  'Copy the code': 'Copia il codice',
  'Share the code': 'Condividi il codice',
  'Waiting for the phone. The code works for half an hour.': 'In attesa del telefono. Il codice vale per mezz’ora.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Usalo quando questo dispositivo è il computer: le sue chat diventano quelle del telefono che ha l’account.',
  'Use this when this device is the computer: these hidden chats become those of the same hidden chats on the phone that holds the account.':
    'Usalo quando questo dispositivo è il computer: queste chat nascoste diventano le stesse chat nascoste del telefono che ha l’account.',
  'These hidden chats have no relay queue yet: in them, type the relay address under For advanced users, then create their queue.':
    'Queste chat nascoste non hanno ancora una coda sul relay: al loro interno, scrivi l’indirizzo del relay in «Per utenti esperti», poi crea la loro coda.',
  'The phone answers on a queue of this device on a relay: the one the phone uses, or any other. If the relay asks for a token, sign in when it offers that, or type one.':
    'Il telefono risponde su una coda di questo dispositivo su un relay: quello che usa il telefono, o un altro qualsiasi. Se il relay chiede un token, accedi quando lo offre, oppure scrivine uno.',
  'Name of this device': 'Nome di questo dispositivo',
  'Tap Link to my phone, and a QR code for the phone shows here.': 'Tocca «Collega al mio telefono» e qui compare un codice QR per il telefono.',
  'Send the accounts to {name}': 'Invia gli account a {name}',
  "This space's Matrix, XMPP and Nostr accounts go to it, end-to-end encrypted, and it signs in to each as a new device. Once unlinked, it signs out of them.":
    'Gli account Matrix, XMPP e Nostr di questo spazio gli vengono inviati, crittografati end-to-end, e accede a ciascuno come nuovo dispositivo. Una volta scollegato, esce da tutti.',
  "These hidden chats' own Matrix, XMPP and Nostr accounts go to it, end-to-end encrypted, into the same hidden chats there, and it signs in to each as a new device. Once unlinked, it signs out of them.":
    'Gli account Matrix, XMPP e Nostr propri di queste chat nascoste vanno a lui, crittografati end-to-end, nelle stesse chat nascoste di lì, e lui accede a ciascuno come nuovo dispositivo. Una volta scollegato, esce da essi.',
  'Sent to {name}: {accounts}.': 'Inviato a {name}: {accounts}.',
  'Nothing went: this space has no Matrix, XMPP or Nostr account, or too much waits for that device already.':
    'Non è partito nulla: questo spazio non ha nessun account Matrix, XMPP o Nostr, oppure c’è già troppo in attesa per quel dispositivo.',
  'Nothing went: these hidden chats have no Matrix, XMPP or Nostr account of their own, or too much waits for that device already.':
    'Non è partito niente: queste chat nascoste non hanno un account Matrix, XMPP o Nostr proprio, oppure per quel dispositivo aspetta già troppo.',
  'Matrix, XMPP and Nostr accounts too': 'Anche account Matrix, XMPP e Nostr',
  'Accounts from the phone': 'Account dal telefono',
  'Matrix: {id}, signed in here as a new device.': 'Matrix: {id}, accesso eseguito qui come nuovo dispositivo.',
  'Matrix: sign in to {id} here once, with its password. Its keys come from the phone, so no Security Key or check by emoji is needed.':
    'Matrix: accedi qui una volta a {id}, con la sua password. Le sue chiavi arrivano dal telefono, quindi non servono né la chiave di sicurezza né la verifica con le emoji.',
  'Sign in to Matrix': 'Accedi a Matrix',
  'XMPP: {id}, signed in here as a new device.': 'XMPP: {id}, accesso eseguito qui come nuovo dispositivo.',
  'Nostr: the key of the Nostr chats is here too.': 'Nostr: anche la chiave delle chat Nostr è qui.',
  'Not brought over yet: {accounts}. Tried again each time this space opens.':
    'Non ancora trasferito: {accounts}. Si riprova ogni volta che questo spazio si apre.',
  'Not brought over yet: {accounts}. Tried again each time these hidden chats open.':
    'Non ancora trasferito: {accounts}. Si riprova ogni volta che queste chat nascoste si aprono.',
  'Once this device is unlinked, it signs out of the accounts it brought over.':
    'Una volta scollegato questo dispositivo, esce dagli account che ha trasferito dal telefono.',
  'Send the accounts': 'Invia gli account',
  'Same settings on every device': 'Stesse impostazioni su tutti i dispositivi',
  'The language and the look change on the other devices too. A photo behind the screens, passwords, PINs and what is about this device alone stay as they are on each.':
    "La lingua e l'aspetto cambiano anche sugli altri dispositivi. Una foto dietro le schermate, le password, i PIN e ciò che riguarda solo questo dispositivo restano come sono su ciascuno.",
};
