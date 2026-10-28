// Srpskohrvatski (latinica, ijekavica) za skrivene razgovore koji zvone na pozive svojih kontakata
// dok su zatvoreni (lock/hidden-ring.ts, components/hidden-ring-screen.tsx, prekidač u app/chat.tsx)
// (i18n/sh/index.ts).
export const hiddenRing: Record<string, string> = {
  'Ring calls when closed': 'Zvonjava poziva kad su zatvoreni',
  'While these hidden chats are closed, with Erevos in the background or on any screen, a call from one of their contacts makes the phone ring and show "Incoming call" with no name. On the ringing screen, tap the small sign and type the PIN to answer. Whoever holds the phone sees a call that is in none of your chats, and may guess there are more.':
    'Dok su ovi skriveni razgovori zatvoreni, a Erevos u pozadini ili na bilo kojem ekranu, poziv od jednog od njihovih kontakata čini da telefon zazvoni i prikaže „Dolazni poziv“ bez imena. Na ekranu poziva dodirnite mali znak i unesite PIN da biste se javili. Osoba koja drži telefon vidi poziv kojeg nema ni u jednom od vaših razgovora i mogla bi pretpostaviti da ih ima još.',
  'Closed, these hidden chats do not ring: a call from their contacts rings only while they are open.':
    'Zatvoreni, ovi skriveni razgovori ne zvone: poziv od njihovih kontakata zvoni samo dok su otvoreni.',
  'Nothing rings for now: it needs Receive and ring, under Settings → Notifications → In the background.':
    'Zasad ništa ne zvoni: potrebno je „Primaj i zvoni“, pod Postavke → Obavijesti → U pozadini.',
  PIN: 'PIN',
  Connect: 'Poveži',
};
