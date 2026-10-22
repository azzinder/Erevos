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
// is answered at once, as they already chose to by opening it, if it comes within HIDDEN_ANSWER_MS
// (the call rings only so long). One that brought no call at all within HIDDEN_OFFER_MS, as a slow
// relay or Tor can be late with it, or before its place closed again, is a ring for nothing
// (lib/moves.ts fakeRings), of that place only: which space and pocket it opened is kept with it.
export const HIDDEN_ANSWER_MS = 60_000;
export const HIDDEN_OFFER_MS = 120_000;
let answer: { at: number; space: number; pocket: number } | null = null;

/** The right PIN was typed to answer the ringing hidden call of the place it opened: the chat screen takes it to answer. */
export function answerHiddenCall(space: number, pocket: number, now = Date.now()): void {
  answer = { at: now, space, pocket };
}

/** Whether the opening hidden place should answer its incoming call at once: taking it clears it. */
export function takeHiddenAnswer(now = Date.now()): boolean {
  const at = answer?.at ?? null;
  answer = null;
  return at !== null && now - at <= HIDDEN_ANSWER_MS;
}

/** When the right PIN was typed to answer a ringing call of this hidden place that no call took yet, or null. */
export function hiddenAnswerAt(space: number, pocket: number): number | null {
  return answer && answer.space === space && answer.pocket === pocket ? answer.at : null;
}

/** Once HIDDEN_OFFER_MS went by since the answer typed at `at` and no call took it, or as its place closes (`closing`), clears it and says so: a ring that brought no call. Before, it stays. */
export function lapseHiddenAnswer(at: number, now = Date.now(), closing = false): boolean {
  if (answer?.at !== at || (!closing && now - at < HIDDEN_OFFER_MS)) return false;
  answer = null;
  return true;
}
