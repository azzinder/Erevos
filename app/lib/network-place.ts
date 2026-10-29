import { useEffect } from 'react';

import { enterHiddenScreen } from './hidden-contacts';

// Which account the screens of Matrix, XMPP and Nostr chats use (app/matrix.tsx, app/xmpp.tsx,
// app/nostr-chats.tsx and their chats): the open space's, or the open hidden place's own
// (lib/place-networks.ts) when the screen was opened from its hidden chats (`hidden=1`). Each
// screen shows its own (matrixNow(where) and the like); what it does goes to the account of the
// screen on top, said as it shows and given back as it goes. Home uses the space's only; a place's
// notices say only "New message", and its calls ring by name only while its hidden chats are open
// (lib/matrix-calls.ts, lib/xmpp-calls.ts), so nothing of a hidden place's accounts ever shows
// outside its hidden chats.

export type NetworkWhere = 'space' | 'place';

const shown: { where: NetworkWhere }[] = [];
const listeners = new Set<() => void>();

/** The account the network screen on top uses: the space's when none is open. */
export function actingWhere(): NetworkWhere {
  return shown[shown.length - 1]?.where ?? 'space';
}

/** Told as the screen on top says another account. */
export function onActingWhere(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const tell = () => listeners.forEach((listener) => listener());

/**
 * For a network screen: the account it shows, the hidden place's when `hidden`. While it shows it
 * is on top, so what is done there goes to that account; one of the hidden chats' screens is counted
 * among theirs, to go with them as they close (lib/hidden-contacts.ts).
 */
export function useNetworkWhere(hidden: boolean): NetworkWhere {
  const where: NetworkWhere = hidden ? 'place' : 'space';
  useEffect(() => {
    const left = where === 'place' ? enterHiddenScreen() : undefined;
    const gone = showWhere(where);
    return () => {
      left?.();
      gone();
    };
  }, [where]);
  return where;
}

/** A screen on top that uses `where`'s account, until what this returns is called. */
export function showWhere(where: NetworkWhere): () => void {
  const entry = { where };
  shown.push(entry);
  tell();
  return () => {
    const at = shown.indexOf(entry);
    if (at < 0) return;
    shown.splice(at, 1);
    tell();
  };
}

/** The route params that open another network screen for the same account. */
export function whereParams(where: NetworkWhere): { hidden?: string } {
  return where === 'place' ? { hidden: '1' } : {};
}
