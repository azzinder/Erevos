// What the phone plays for the open space's calls as they change (components/call-host.tsx): a
// call of ours starts its sound at once, theirs rings, and the sound stops and Erevos leaves the
// lock screen once a call ends, once for each call. A ring stops only when it is the call this
// rang for that is answered, turned down or gone: a call screen closing, or a group's call
// changing as its members come and go, never stops another's ring. A hidden call that rings
// (lib/hidden-ring.ts) gives way to a call of the space's that comes: one hidden call rings at a
// time, and none while a call is in progress, so it ends first, as a missed one does.

/** What the phone plays, as modules/erevos-call has it. */
export type RingAudio = {
  ring(video: boolean, chat: string): void;
  start(video: boolean): void;
  stopRinging(): void;
  stop(): void;
  showOverLock(on: boolean): void;
};

/** The hidden call ringing, if one is. */
export type HiddenRing = { ringing(): boolean; end(): void };

type Seen = { video: boolean; state: string };

/** Follows the contact's call and the group's call that show, for what `audio` plays. */
export function ringKeeper(audio: RingAudio, hidden: HiddenRing) {
  // For each kind: the call last seen, the one this rang for, and the one whose end was played.
  const kinds = {
    contact: { known: null as Seen | null, rung: null as Seen | null, over: null as Seen | null },
    group: { known: null as Seen | null, rung: null as Seen | null, over: null as Seen | null },
  };
  // `starts`: whether the call, new, starts its sound at once rather than ring.
  const follow = (kind: keyof typeof kinds, call: Seen | null, chat: string, starts: boolean, held: boolean) => {
    const k = kinds[kind];
    if (call && call !== k.known) {
      k.known = call;
      if (call.state !== 'ended') {
        if (hidden.ringing()) hidden.end();
        if (starts) audio.start(call.video);
        else if (call.state === 'incoming') {
          audio.ring(call.video, chat);
          k.rung = call;
        }
      }
    }
    if (held) return;
    if (k.rung && (call !== k.rung || call.state !== 'incoming')) {
      audio.stopRinging();
      k.rung = null;
    }
    if (call?.state === 'ended' && k.over !== call) {
      k.over = call;
      audio.stop();
      audio.showOverLock(false);
    }
  };
  return {
    /** The contact's call that shows, or none; `chat` is whose ringtone it rings with ('' for the phone's). */
    contact(call: (Seen & { outgoing: boolean }) | null, chat: string): void {
      // Ours starts its sound at once; theirs once answered, as the call screen does.
      follow('contact', call, chat, !!call?.outgoing, false);
    },
    /** The group's call that shows, or none; while a contact's call is in progress it plays nothing of its end. */
    group(call: Seen | null, chat: string, contactInProgress: boolean): void {
      follow('group', call, chat, call?.state === 'in', contactInProgress);
    },
  };
}
