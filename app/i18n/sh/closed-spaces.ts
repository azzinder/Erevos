// The Serbo-Croatian of a closed space that says a message came while another is open (app/security.tsx,
// lib/closed-notices.ts), and of a message that came or went through Nostr (app/chat.tsx) (i18n/sh/index.ts).
export const closedSpaces: Record<string, string> = {
  'Went through Nostr.': 'Poslano preko Nostra.',
  'Came through Nostr.': 'Stiglo preko Nostra.',
  'This space only while open': 'Ovaj prostor samo dok je otvoren',
  'Also while another space is open': 'I dok je otvoren drugi prostor',
  'While another space is open, this one says only "New message", as that one does, never which space; its hidden chats say nothing then. For it the phone keeps the addresses of its queues at its relay outside its password, never its keys, contacts or messages, and its relay may tell that the two spaces are on one phone. Through Tor, if this space goes through Tor, and only while the open one has Tor ready.': 'Dok je otvoren drugi prostor, ovaj kaže samo „Nova poruka“, kao i onaj, nikad koji prostor; njegovi skriveni razgovori tada ne kažu ništa. Zato telefon čuva adrese njegovih redova na njegovom relayu izvan njegove lozinke, nikad njegove ključeve, kontakte ili poruke, a njegov relay može zaključiti da su oba prostora na istom telefonu. Preko Tora, ako ovaj prostor ide preko Tora, i samo dok otvoreni ima Tor spreman.',
  'Closed, this space receives nothing: its messages wait at its relay and come when it opens.': 'Zatvoren, ovaj prostor ne prima ništa: njegove poruke čekaju na njegovom relayu i stižu kad se otvori.',
  'This space has no queue at a relay yet: it can say nothing while closed.': 'Ovaj prostor još nema red na relayu: zatvoren ne može ništa reći.',
  'Tor is not ready.': 'Tor nije spreman.',
};
