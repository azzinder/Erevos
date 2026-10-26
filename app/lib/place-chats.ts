import { History } from '../lock/history';
import { placeQueues } from '../lock/queues-data';
import { hiddenHolder } from '../lock/sealed-file';
import { E2E } from './e2e';
import type { SpaceChats } from './space-chats';
import { VoiceAssembler } from './voice';

// A hidden place's chats, opened once while they are open or receive while closed
// (lib/place-receiver.ts): its account and contacts, its messages and the voice messages still
// coming in parts, the same for the chat screen, the receiver and a chat moved into it, as the
// space's are (lib/space-chats.ts): two copies of a conversation's keys would each move on without
// the other. They are let go of once nothing holds them: as their chats close, unless they
// receive, and all of them when the space closes, so a place that does not receive leaves nothing
// in memory once closed.

type Opened = { key: Uint8Array; chats: Promise<SpaceChats> };

const opened = new Map<string, Opened>();
const at = (space: number, pocket: number) => `${space}.${pocket}`;

const sameKey = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

/** The chats of the hidden place in `pocket` of `space`, open with `key`, opened the first time they are asked for. */
export function placeChats(space: number, pocket: number, key: Uint8Array): Promise<SpaceChats> {
  const was = opened.get(at(space, pocket));
  if (was && sameKey(was.key, key)) return was.chats;
  const chats = (async () => {
    const history = await History.open(hiddenHolder(pocket), space, key);
    const e2e = await E2E.open(hiddenHolder(pocket), space, key);
    // When their queue was made, as the place says it, before anything is sealed.
    const kept = await placeQueues(space, pocket, key).load();
    if (kept.moved > 0) e2e.setQueueAge(kept.moved, kept.now?.queue.senderHex);
    if (kept.now) e2e.setLinkOwn(!kept.link);
    return { e2e, history, voiceParts: new VoiceAssembler() };
  })();
  opened.set(at(space, pocket), { key: key.slice(), chats });
  // Tried again the next time they are asked for.
  chats.catch(() => {
    if (opened.get(at(space, pocket))?.chats === chats) opened.delete(at(space, pocket));
  });
  return chats;
}

const forgets = new Set<(space?: number, pocket?: number) => void>();

/** Has `forget` called each time a place's chats are let go of, or every place's (no `space`), so what is opened with them goes too (lib/place-groups.ts). */
export function onForgetPlaceChats(forget: (space?: number, pocket?: number) => void): void {
  forgets.add(forget);
}

/** Lets go of a place's chats, or of every place's (the space closes), so nothing of them stays in memory. */
export function forgetPlaceChats(space?: number, pocket?: number): void {
  if (space === undefined || pocket === undefined) opened.clear();
  else opened.delete(at(space, pocket));
  forgets.forEach((forget) => forget(space, pocket));
}
