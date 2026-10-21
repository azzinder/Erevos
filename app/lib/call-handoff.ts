// A call to start with a contact as their chat opens, asked for by a tap in Erevos (the Call
// buttons on a contact card), held in memory until the chat screen takes it. A route's address can
// come from outside, from any app or web page (erevos://chat?contact=…), so it never carries a
// call: then opening a link could turn on the camera and microphone towards a contact without a tap.

/** How long a call asked for waits for its chat to open. */
const KEEP_MS = 30_000;

let held: { contact: string; kind: 'voice' | 'video'; at: number } | null = null;

/** Asks for a call with the contact whose identity this is (hex), as their chat opens. */
export function handOverCall(contact: string, kind: 'voice' | 'video', now = Date.now()): void {
  held = { contact, kind, at: now };
}

/** The call asked for with this contact, once: taking it clears it. Null when none was asked for
 *  here, it was for someone else, or it came too long ago. */
export function takeCall(contact: string, now = Date.now()): 'voice' | 'video' | null {
  const call = held;
  held = null;
  return call && call.contact === contact && now - call.at <= KEEP_MS ? call.kind : null;
}
