import { useEffect, useState } from 'react';

// A hidden contact's call that rings while its hidden chats are closed (lib/hidden-ring-notices.ts):
// the background watcher sets it when a ring comes, and clears it when the ring is answered, turned
// down, or times out. The ring screen (components/hidden-ring-screen.tsx) shows it: "Incoming call"
// with no name, a discreet sign that opens a PIN field, and the right PIN opens the place and
// answers (app/chat.tsx). Held in memory only. We cannot say which pocket, or who, until the PIN
// opens the place — the call offer waits on the place's message queue meanwhile.

/** A hidden call ringing now: which space and pocket, and when it began. */
export type HiddenRinging = { space: number; pocket: number; at: number };

let ringing: HiddenRinging | null = null;
const listeners = new Set<() => void>();

export function setHiddenRinging(state: HiddenRinging | null): void {
  ringing = state;
  for (const listener of listeners) listener();
}

export function hiddenRinging(): HiddenRinging | null {
  return ringing;
}

export function onHiddenRingingChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The hidden call ringing now, or null; the screen shows again when one begins or ends. */
export function useHiddenRinging(): HiddenRinging | null {
  const [state, setState] = useState(ringing);
  useEffect(() => {
    setState(ringing);
    return onHiddenRingingChange(() => setState(ringing));
  }, []);
  return state;
}

// The owner typed the right PIN on the ring screen: the next incoming call the hidden place opens
// is answered at once, as they already chose to by opening it. Held a short while (the call rings
// only so long), then it lapses.
export const HIDDEN_ANSWER_MS = 60_000;
let answer: number | null = null;

/** The right PIN was typed to answer the ringing hidden call: the chat screen takes it to answer. */
export function answerHiddenCall(now = Date.now()): void {
  answer = now;
}

/** Whether the opening hidden place should answer its incoming call at once: taking it clears it. */
export function takeHiddenAnswer(now = Date.now()): boolean {
  const at = answer;
  answer = null;
  return at !== null && now - at <= HIDDEN_ANSWER_MS;
}

/** When the right PIN was typed to answer a ringing hidden call that no call took yet, or null. */
export function hiddenAnswerAt(): number | null {
  return answer;
}

/** Clears the answer typed at `at` if no call took it, and says whether it was still there: a ring that brought no call. */
export function lapseHiddenAnswer(at: number): boolean {
  if (answer !== at) return false;
  answer = null;
  return true;
}
