// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadSpaceData, updateSpaceData } from '../lock/space-data';
import { placeChanged } from './receiver';
import { createQueue, toHex } from './relay';
import { ownToken } from './relay-signin';
import { secureDelete, secureGet, secureSet } from './secure';
import { LPHL_RELAY } from './servers';
import { loadSetupAfter } from './setup-after';

// The server a new phone is on from its first start (#74): with no server of its own yet, its first
// space takes a place on LPHL's open server by itself, typing nothing, as the first start's third
// step says (app/first-steps.tsx): a token of its own there, which only the relay's SHA-256 of it
// knows, and a queue. It is taken once the mode is chosen on that step, never before, so nothing
// leaves the phone until then, and with INVISIBLE only through Tor (lib/relay.ts goes the space's
// Tor way). Wanted from the first start's setup on (wantFirstServer), for its first space, until
// it is taken, or the space has a server some other way (For advanced users, an invite): a start
// with no network, or a server that had no place left, tries again as the space opens next, once
// the first start's steps are done (retryFirstServer), and on the home screen. An invite Erevos was
// first opened with that brings a server of its own takes its place (lib/invite-server.ts).

/** Why the open server gave no place (lib/relay.ts openPlaceRefusal): it gives none, every place is
 *  taken, today's new places are, or this address had its share today. */
export type OpenRefusal = 'off' | 'full' | 'day' | 'address';

/** What the first space's server is, as the first start and the home screen say it. */
export type FirstServer =
  | { kind: 'none' }
  | { kind: 'waiting' }
  | { kind: 'taking' }
  | { kind: 'ready'; url: string; lphl: boolean }
  | { kind: 'refused'; why: OpenRefusal }
  | { kind: 'failed'; error: string };

/** Takes a place on the open server at `url`: a token of the phone's own there, and its name. */
export type OpenTaker = (url: string) => Promise<{ token: string; name: string }>;

/** Tells why `error`, thrown by an OpenTaker, came: a refusal of the server's, or null for another failure. */
export type OpenRefusalOf = (error: unknown) => OpenRefusal | null;

const WANTED = 'erevos.open-place';

let taker: OpenTaker = async () => {
  throw new Error('This build cannot take a place on an open server yet.');
};
let refusalOf: OpenRefusalOf = () => null;
let state: FirstServer = { kind: 'none' };
let taking: Promise<FirstServer> | null = null;
const listeners = new Set<() => void>();

function set(next: FirstServer): FirstServer {
  state = next;
  for (const listener of listeners) listener();
  return next;
}

/** How a place is taken, and its refusals told apart (lib/relay.ts; checks give their own). */
export function setOpenTaker(take: OpenTaker, why: OpenRefusalOf): void {
  taker = take;
  refusalOf = why;
}

/** The first start's setup chose Erevos's own chats: the space `space` (the first, 0, at the first
 *  start) is to take a place on LPHL's server. */
export async function wantFirstServer(space = 0): Promise<void> {
  await secureSet(WANTED, `lphl:${space}`);
}

/** Whether a place is still wanted for the space `space`, the one open now unless said: none is
 *  for another space. */
export async function firstServerWanted(space?: number): Promise<boolean> {
  if (space === undefined) {
    try {
      space = currentSpace().space;
    } catch {
      return false;
    }
  }
  return (await secureGet(WANTED).catch(() => null)) === `lphl:${space}`;
}

/** No place is wanted any more: the space has a server, or it was set up otherwise. */
export async function firstServerDone(): Promise<void> {
  await secureDelete(WANTED).catch(() => undefined);
}

/** What is known now of the first space's server. */
export function firstServer(): FirstServer {
  return state;
}

/** Says when what is known of the first space's server changes. */
export function onFirstServer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether `url` is LPHL's server. */
export function isLphl(url: string): boolean {
  return url.trim().replace(/\/+$/, '') === LPHL_RELAY;
}

/**
 * Takes the place, when it is still wanted and the open space has no server yet: a token on LPHL's
 * open server, then a queue with it, both kept in the space at once, and the receiver told. With a
 * server already there, or another one chosen meanwhile, nothing is taken, and none is wanted from
 * then on; a place taken before whose queue was not made yet only gets its queue. A refusal, or a
 * failure such as no network, keeps it wanted, to try again later. One at a time.
 */
export function takeFirstServer(): Promise<FirstServer> {
  taking ??= (async () => {
    try {
      // The space open as it starts: what is taken is kept there, even if another opens meanwhile.
      const { space, key } = currentSpace();
      const data = await loadSpaceData(space, key);
      const url = data.url.trim();
      if (url && (data.ownQueue || !isLphl(url))) {
        if (await firstServerWanted(space)) await firstServerDone();
        return set({ kind: 'ready', url, lphl: isLphl(url) });
      }
      if (!(await firstServerWanted(space))) return set(url ? { kind: 'ready', url, lphl: isLphl(url) } : { kind: 'none' });
      set({ kind: 'taking' });
      let token = url ? data.token.trim() : '';
      if (!token) {
        try {
          ({ token } = await taker(LPHL_RELAY));
        } catch (error) {
          const why = refusalOf(error);
          return set(why ? { kind: 'refused', why } : { kind: 'failed', error: error instanceof Error ? error.message : String(error) });
        }
        // The token is kept at once: the server has its line now, and a queue made later still finds it.
        await updateSpaceData(space, key, { url: LPHL_RELAY, token, ownToken: ownToken(LPHL_RELAY, token) });
      }
      try {
        const ids = await createQueue({ url: LPHL_RELAY, token });
        await updateSpaceData(space, key, { ownQueue: { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) } });
      } catch (error) {
        return set({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
      }
      await firstServerDone();
      placeChanged();
      return set({ kind: 'ready', url: LPHL_RELAY, lphl: true });
    } catch (error) {
      return set({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  })().finally(() => {
    taking = null;
  });
  return taking;
}

/** As a space opens (app/_layout.tsx): a place still wanted once the first start's steps are done is
 *  taken now. While they are not, the mode step takes it, once the mode is chosen. */
export async function retryFirstServer(): Promise<void> {
  // What was known is of the space open before.
  if (!taking) state = { kind: 'none' };
  if (!(await firstServerWanted())) return;
  if (await loadSetupAfter()) return;
  await takeFirstServer();
}

/** What is known now, read again: the space's server, a place wanted and not taken yet, how the
 *  last try went, or none. */
export async function readFirstServer(): Promise<FirstServer> {
  const data = await loadCurrentSpaceData().catch(() => null);
  const url = data?.url.trim() ?? '';
  if (url && data?.ownQueue) return set({ kind: 'ready', url, lphl: isLphl(url) });
  if (state.kind === 'taking' || state.kind === 'refused' || state.kind === 'failed') return state;
  if (await firstServerWanted()) return set({ kind: 'waiting' });
  return set(url ? { kind: 'ready', url, lphl: isLphl(url) } : { kind: 'none' });
}

/** The open space has no server, and its owner asks for LPHL's (the first home): a place is wanted
 *  for it from now on, and taken now. */
export async function askFirstServer(): Promise<FirstServer> {
  await wantFirstServer(currentSpace().space);
  return takeFirstServer();
}

/** What is known of the first space's server, read once and then as it changes. */
export function useFirstServer(): FirstServer {
  const [now, setNow] = useState(state);
  useEffect(() => {
    const off = onFirstServer(() => setNow(state));
    void readFirstServer().catch(() => undefined);
    return off;
  }, []);
  return now;
}
