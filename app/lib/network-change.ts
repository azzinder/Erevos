// The phone's network changed (Wi-Fi to mobile data, say): a wait at the relay on the network that
// went may hang until its reply timer, a minute and a half (three through Tor), with no error, so
// whoever waits ends it and asks again at once (lib/receiver.ts, lib/place-receiver.ts, and the
// hidden chats' and closed spaces' notices). Nothing is said to the relay but a new ask. Android
// only: lib/background.ts passes on the call module's onNetwork (ErevosCallModule.kt); a network
// that comes and goes in a burst tells once.

const SETTLE_MS = 1000;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** The phone's network changed: those who listen hear it a moment after, once for a burst. */
export function networkChanged(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    listeners.forEach((listener) => listener());
  }, SETTLE_MS);
}

/** Calls `listener` each time the phone's network changed, a moment after, until the function it gives is called. */
export function onNetworkChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
