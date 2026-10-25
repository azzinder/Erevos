// The Italian of a relay proving its own key (lib/relay.ts, Channels; components/relay-key-note.tsx) (i18n/it/index.ts).
export const relayKey: Record<string, string> = {
  "✓ Your relay proved its own key: no one in between can pass for it.": "✓ Il tuo relay ha dimostrato la sua chiave: nessuno nel mezzo può spacciarsi per lui.",
  "Your relay does not prove its own key yet: it is older than this app. It works as before; once its operator updates it, Erevos checks its key every time.": "Il tuo relay non dimostra ancora la sua chiave: è più vecchio di questa app. Funziona come prima; quando il suo gestore lo aggiorna, Erevos controlla la sua chiave ogni volta.",
  "Forget the key kept for this relay?": "Dimenticare la chiave che Erevos tiene per questo relay?",
  "Only when its operator told you it has a new key. Erevos then takes the key the relay gives next, and checks it every time from then on.": "Solo se il suo gestore ti ha detto che ha una chiave nuova. Erevos prende allora la chiave che il relay darà la prossima volta, e la controlla ogni volta da lì in poi.",
  "Forget it": "Dimenticala",
  "Your relay did not prove the key Erevos keeps for it: someone may be in between, or it has a new key. Nothing goes to it until it proves it; your messages wait.": "Il tuo relay non ha dimostrato la chiave che Erevos tiene per lui: qualcuno potrebbe essere nel mezzo, o ha una chiave nuova. Niente gli viene inviato finché non la dimostra; i tuoi messaggi aspettano.",
  "It has a new key": "Ha una chiave nuova",
  "the relay at {url} did not prove its key: someone may be in between, or the relay has a new key": "il relay a {url} non ha dimostrato la sua chiave: qualcuno potrebbe essere nel mezzo, o il relay ha una chiave nuova",
  "the relay sent what its channel does not hold": "il relay ha inviato qualcosa che non appartiene al suo canale",
  "the relay has no channel": "il relay non ha un canale",
};
