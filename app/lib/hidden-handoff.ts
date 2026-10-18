// The key of hidden chats opened from the home screen's search (lock/hidden.ts searchHidden), held
// in memory only until the chat screen takes it, so it never goes into a route's address.

let held: Uint8Array | null = null;

export function handOverHidden(key: Uint8Array): void {
  held = key;
}

/** The key handed over, once: taking it clears it. */
export function takeHidden(): Uint8Array | null {
  const key = held;
  held = null;
  return key;
}
