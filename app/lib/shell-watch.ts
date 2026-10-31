// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Door } from '../lock/doors';
import { currentSpace } from '../lock/keys';
import { doorOf } from './closed-notices';
import { onContactQueuesChanged } from './contact-queues';
import { onLangChange, plural, t } from './i18n';
import { onSpaceMoved } from './queue-move';
import { onRelayKey, provenRelayKey, relayHome } from './relay';
import { SHELL, shellFetch } from './shell';

// Erevos on Sailfish OS, while it is not in front or is closed: a helper of its own (sailfish/watch,
// erevos-watch) waits at the relay on the open space's queues, without taking anything, says how
// many messages came, with the same notice as Android's for a closed space ("1 new message", never
// who or what), and rings for a call with the phone's ringtone. The page gives it, through the shell
// (/__watch), the queues the space reads on: its own, its contact link's, its groups' and its
// contacts', each relay's key once the relay proved it (the helper then asks only in a channel to
// it), and the words in the app's language. No key of the space, no token, no name. As they change
// it gives them again; as the space closes it takes them back. Here, as the app's own requests do,
// the helper goes straight, without Tor, whatever the space's Tor way.

// The most contacts' queues given, and how many to one request (crates/erevos-relay MAX_ANY).
const MOST_CONTACTS = 1024;
const MAX_ANY = 64;
// The notice's words for 1 to this many messages; more say the last.
const MOST_WORDS = 999;

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** What the helper is given for the space `space` opens with `key`, as JSON; null when there is nothing for it to wait on. */
export async function watchList(space: number, key: Uint8Array): Promise<string | null> {
  const door = await doorOf(space, key, MOST_CONTACTS);
  return door ? watchListOf(door, provenRelayKey) : null;
}

/** What the helper is given for the queues `door` names, with each relay's key as `keyOf` says it was proven. */
export function watchListOf(door: Door, keyOf: (url: string) => Uint8Array | null): string | null {
  const byRelay = new Map<string, { url: string; queues: string[] }>();
  const add = (url: string, queue: string) => {
    const home = relayHome(url);
    const at = byRelay.get(home) ?? { url: url.trim(), queues: [] };
    if (!at.queues.includes(queue)) at.queues.push(queue);
    byRelay.set(home, at);
  };
  for (const kept of door.queues) add(kept.url, kept.recipientHex);
  for (const q of door.contacts?.queues ?? []) add(door.contacts!.url, q.r);
  const waits: { url: string; key: string; queues: string[] }[] = [];
  for (const { url, queues } of byRelay.values()) {
    const proven = keyOf(url);
    for (let i = 0; i < queues.length; i += MAX_ANY) waits.push({ url, key: proven ? hex(proven) : '', queues: queues.slice(i, i + MAX_ANY) });
  }
  if (waits.length === 0) return null;
  const words = {
    title: 'Erevos',
    messages: Array.from({ length: MOST_WORDS }, (_, i) => plural(i + 1, '{n} new message', '{n} new messages')),
    call: t('Incoming call'),
  };
  return JSON.stringify({ words, waits });
}

/** Gives the helper the open space's queues, and again as they change, until the function it returns is called. Only on Sailfish OS. */
export function startShellWatch(): () => void {
  if (SHELL !== 'sailfish') return () => undefined;
  let open: { space: number; key: Uint8Array };
  try {
    open = currentSpace();
  } catch {
    return () => undefined;
  }
  let stopped = false;
  // One at a time, in order: the last given is what the helper has.
  let giving = Promise.resolve();
  const send = (init: RequestInit) => shellFetch('/__watch', init).then(() => undefined, () => undefined);
  const give = () => {
    giving = giving.then(async () => {
      if (stopped) return;
      const list = await watchList(open.space, open.key).catch(() => null);
      if (stopped) return;
      await send(list ? { method: 'PUT', body: list } : { method: 'DELETE' });
    });
  };
  give();
  const offs = [
    onSpaceMoved(async () => give()),
    onContactQueuesChanged(give),
    onLangChange(give),
    // A relay proved its key: from now on the helper goes to it only in a channel.
    onRelayKey(() => give()),
  ];
  return () => {
    stopped = true;
    offs.forEach((off) => off());
    giving = giving.then(() => send({ method: 'DELETE' }));
  };
}
