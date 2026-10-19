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
  'Too long to go through the phone.': 'Troppo lungo per passare dal telefono.',
  'Type the relay address in Relay first: linked devices reach this phone through it.':
    'Scrivi prima l’indirizzo del relay in «Relay»: i dispositivi collegati raggiungono questo telefono tramite il relay.',
  '{n} devices are linked already, the most there can be.': 'Sono già collegati {n} dispositivi, il massimo possibile.',

  // The menu, and the chat on a linked device (app/index.tsx, app/chat.tsx).
  'Linked devices': 'Dispositivi collegati',
  'This account on a computer or in a browser too': 'Questo account anche su un computer o in un browser',
  "This chat is the phone's: move it into hidden chats there.": 'Questa chat è del telefono: spostala nelle chat nascoste da lì.',

  // A call answered on another device of the account (components/call-screen.tsx, lib/call-lines.ts).
  'Answered on another device': 'Risposto su un altro dispositivo',
  'answered on another device': 'risposto su un altro dispositivo',

  // Linked devices (app/devices.tsx).
  'All of it': 'Tutti',
  'The last month': 'L’ultimo mese',
  'The last week': 'L’ultima settimana',
  None: 'Nessuno',
  'Web browser': 'Browser',
  'Code copied. Paste it on the phone in Menu → Linked devices.': 'Codice copiato. Incollalo sul telefono in «Menu → Dispositivi collegati».',
  'Linked. The chats come from the phone, and with them the messages it chose to bring over.':
    'Collegato. Le chat arrivano dal telefono, e con loro i messaggi che ha scelto di trasferire.',
  'Not linked. Someone else may have read the code. Make a new one, and link again.':
    'Non collegato. Qualcun altro potrebbe aver letto il codice. Creane uno nuovo e collega di nuovo.',
  'Now the computer shows a code too. If it is {code}, tap They match there.': 'Ora anche il computer mostra un codice. Se è {code}, tocca lì «Coincidono».',
  'Unlink this device': 'Scollega questo dispositivo',
  'Unlink {name}': 'Scollega {name}',
  "The account's chats leave this device, messages and all. The phone keeps them.": 'Le chat dell’account vengono tolte da questo dispositivo, messaggi compresi. Il telefono le conserva.',
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
  'Make or join groups on the phone that holds this account.': 'Crea gruppi o entra nei gruppi dal telefono che ha questo account.',
  'Group calls ring on the phone that holds this account, for now. Call from there.':
    'Per ora le chiamate di gruppo squillano sul telefono che ha questo account. Chiama da lì.',
  'The same account on a computer or in a browser. The phone stays the account: it passes on, end-to-end encrypted, what comes and what the computer writes, so contacts see nothing new. Hidden chats and what a second password opens never go.':
    'Lo stesso account su un computer o in un browser. L’account resta sul telefono: inoltra, crittografato end-to-end, quello che arriva e quello che scrive il computer, così i contatti non vedono niente di nuovo. Le chat nascoste e quello che apre una seconda password non vengono mai trasferiti.',
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
  'Link a computer to this phone': 'Collega un computer a questo telefono',
  "On the computer, open Menu → Linked devices → Link to my phone. Then scan its code with this phone's camera, or copy it there and paste it here.":
    'Sul computer, apri «Menu → Dispositivi collegati → Collega al mio telefono». Poi inquadra il suo codice con la fotocamera di questo telefono, o copialo lì e incollalo qui.',
  'Code from the computer': 'Codice dal computer',
  Next: 'Avanti',
  'Link to my phone': 'Collega al mio telefono',
  'The phone read the code. Does it show this one too?': 'Il telefono ha letto il codice. Mostra anche lui questo?',
  'They match': 'Coincidono',
  'They differ': 'Sono diversi',
  'On the phone that holds the account, scan this code with the camera, or paste it in Menu → Linked devices. This space must have no chats of its own.':
    'Sul telefono che ha l’account, inquadra questo codice con la fotocamera, o incollalo in «Menu → Dispositivi collegati». Questo spazio non deve avere chat sue.',
  'Copy the code': 'Copia il codice',
  'Share the code': 'Condividi il codice',
  'Waiting for the phone. The code works for half an hour.': 'In attesa del telefono. Il codice vale per mezz’ora.',
  'Use this when this device is the computer: its chats become those of the phone that holds the account.':
    'Usalo quando questo dispositivo è il computer: le sue chat diventano quelle del telefono che ha l’account.',
  'Name of this device': 'Nome di questo dispositivo',
};
