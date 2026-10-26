// The Serbo-Croatian of hidden chats that receive while they are closed (lock/hidden-keep.ts,
// lib/place-receiver.ts, the toggle at the top of an open place in app/chat.tsx) (i18n/sh/index.ts).
export const hiddenKeep: Record<string, string> = {
  'Receive while closed': 'Primanje dok su zatvoreni',
  'Closed, these hidden chats receive as your other chats do: their contacts see at once that a message came, a notice says only "New message", and a call rings with no name, answered with the PIN. For it, their key is kept encrypted with the space, so whoever opens the space and copies what the phone keeps could open them too; the PIN still keeps them out of sight.':
    'Dok su zatvoreni, ovi skriveni razgovori primaju kao i ostali vaši razgovori: njihovi kontakti odmah vide da je poruka stigla, obavijest kaže samo „New message“, a poziv zvoni bez imena i javljate se PIN-om. Zato se njihov ključ čuva šifriran uz prostor, pa bi ih i onaj tko otvori prostor i kopira ono što telefon čuva mogao otvoriti; PIN ih i dalje drži skrivenima.',
  'Closed, nothing reads these hidden chats: their key is only behind the PIN, and their messages wait on the relay until you open them.':
    'Dok su zatvoreni, ništa ne čita ove skrivene razgovore: njihov ključ je samo iza PIN-a, a njihove poruke čekaju na relayu dok ih ne otvorite.',
};
