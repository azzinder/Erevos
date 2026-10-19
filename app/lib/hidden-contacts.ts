import { useEffect, useState } from 'react';

import type { Message } from '../lock/history';
import type { ErevosPerson } from './contacts';

// The hidden chats open now, lent to the contacts screens (app/contacts.tsx with `hidden`) while
// they are: the chat screen sets them when they open and takes them away when they close (going
// to the background closes them). Held in memory only. The contacts screens show only these then,
// and nothing once they go.

export type OpenHiddenPlace = {
  space: number;
  pocket: number;
  key: Uint8Array;
  /** The hidden chats' contacts, as they are now. */
  erevos(): ErevosPerson[];
  /** Their messages with a contact, the oldest first. */
  messages(identity: string): Message[];
  /** Opens that contact's chat in the hidden chats, and starts a call in it when asked. */
  open(identity: string, call?: 'voice' | 'video'): void;
};

let place: OpenHiddenPlace | null = null;
const listeners = new Set<() => void>();
// How many contacts screens of the hidden chats are over them now.
let screens = 0;

export function setOpenHiddenPlace(open: OpenHiddenPlace | null): void {
  place = open;
  for (const listener of listeners) listener();
}

export function openHiddenPlace(): OpenHiddenPlace | null {
  return place;
}

export function onHiddenPlaceChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The hidden chats open now, or null; the screen shows again when they open or close. */
export function useOpenHiddenPlace(): OpenHiddenPlace | null {
  const [open, setOpen] = useState(place);
  useEffect(() => {
    setOpen(place);
    return onHiddenPlaceChange(() => setOpen(place));
  }, []);
  return open;
}

/** Counts a contacts screen of the hidden chats while it is open. Returns what to call when it goes. */
export function enterHiddenScreen(): () => void {
  screens++;
  let left = false;
  return () => {
    if (left) return;
    left = true;
    screens--;
  };
}

/** How many contacts screens of the hidden chats are open over them: to dismiss, back to them. */
export function hiddenScreens(): number {
  return screens;
}
