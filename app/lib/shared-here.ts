// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';

import { forwardedTo } from './forward';
import { readShared, takeShared, type SharedFile } from './share-in';
import { networkOf, readWhole, type NetworkFile } from './share-networks';

// What Send to (app/share.tsx) handed to a Matrix, XMPP or Nostr chat as it opens
// (lib/share-networks.ts): its words, for the message field, and a photo or file, read whole and
// sent at once. Send to never reaches a hidden place, so a chat there takes nothing.

/**
 * The words Send to handed to the chat of `to` (its row's identity, `matrix:` and the room's id,
 * `xmpp:` and an address, `nostr:` and a key; null in a hidden place), for its message field:
 * taken once, as the chat opens.
 */
export function useSharedWords(to: string | null): string {
  const [words] = useState(() => (to ? (forwardedTo(to)?.text ?? '') : ''));
  return words;
}

/**
 * Sends each photo or file Send to handed to the chat of `to` (null in a hidden place, or while the
 * chat is not there yet), one after another, as soon as it opens, with `send`, told to `busy`
 * while it goes; what goes wrong is said with `fail`.
 */
export function useSharedFiles(to: string | null, send: (file: NetworkFile) => Promise<unknown>, fail: (error: unknown) => void, busy: (on: boolean) => void): void {
  const now = useRef({ send, fail, busy });
  now.current = { send, fail, busy };
  useEffect(() => {
    const network = to ? networkOf(to) : null;
    if (!to || !network) return;
    // All taken at once: what waits is let go after a minute.
    const handed: SharedFile[] = [];
    for (let shared = takeShared(to); shared; shared = takeShared(to)) handed.push(shared);
    void (async () => {
      for (const shared of handed) {
        now.current.busy(true);
        try {
          await now.current.send(await readWhole(network, await readShared(shared)));
        } catch (error) {
          now.current.fail(error);
        } finally {
          now.current.busy(false);
        }
      }
    })();
  }, [to]);
}
