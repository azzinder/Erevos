// A message passed on from an SMS conversation (app/sms.tsx) to the screen that opens next for it:
// another number's SMS conversation, or an Erevos chat with a contact, which puts it in its message
// field, to be read and sent there. Held in memory only, for a minute at most.

export type Forwarded = { text: string; photo: { bytes: Uint8Array; mime: string } | null };

const FRESH = 60_000;

let held: { to: string; forwarded: Forwarded; until: number } | null = null;

/** Holds a message for the screen of `to`: an SMS address, or `contact:` and a contact's identity. */
export function forwardTo(to: string, forwarded: Forwarded, now = Date.now()): void {
  held = { to, forwarded, until: now + FRESH };
}

/** The message held for `to` (as `same` compares them), once: it is let go right after it is read,
 *  so a screen drawn twice still finds it. */
export function forwardedTo(to: string, same: (a: string, b: string) => boolean = (a, b) => a === b, now = Date.now()): Forwarded | null {
  const kept = held;
  if (!kept || kept.until <= now || !to || !same(kept.to, to)) return null;
  queueMicrotask(() => {
    if (held === kept) held = null;
  });
  return kept.forwarded;
}
